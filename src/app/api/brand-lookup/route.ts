import { NextRequest, NextResponse } from "next/server";
import type { Ad, Brand, ProductPreview } from "@/lib/types";
import { fetchCompanyActiveAds, searchCompanyMetaPage } from "@/lib/scrapecreators";

const BROWSER_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36";

function extractMeta(html: string, key: string): string | undefined {
  const patterns = [
    new RegExp(
      `<meta[^>]+(?:property|name)=["']${key}["'][^>]+content=["']([^"']+)["']`,
      "i"
    ),
    new RegExp(
      `<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${key}["']`,
      "i"
    ),
  ];
  for (const re of patterns) {
    const m = html.match(re);
    if (m?.[1]) return decodeEntities(m[1].trim());
  }
  return undefined;
}

function decodeEntities(str: string): string {
  return str
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ");
}

async function fetchWithTimeout(url: string, timeoutMs = 7000): Promise<Response | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": BROWSER_UA, Accept: "text/html,application/json,*/*" },
      redirect: "follow",
      signal: controller.signal,
      cache: "no-store",
    });
    return res;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function resolveBrandUrl(input: string): Promise<{ url: string; html: string } | null> {
  const trimmed = input.trim();
  if (!trimmed) return null;

  if (trimmed.includes(".") && !trimmed.includes(" ")) {
    const candidate = trimmed.startsWith("http") ? trimmed : `https://${trimmed}`;
    const res = await fetchWithTimeout(candidate, 8000);
    if (res && res.ok) {
      return { url: res.url || candidate, html: await res.text() };
    }
    if (!candidate.includes("://www.")) {
      const wwwCandidate = candidate.replace("://", "://www.");
      const resWww = await fetchWithTimeout(wwwCandidate, 8000);
      if (resWww && resWww.ok) {
        return { url: resWww.url || wwwCandidate, html: await resWww.text() };
      }
    }
    return null;
  }

  const slug = trimmed.toLowerCase().replace(/[^a-z0-9]/g, "");
  const hyphenSlug = trimmed.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const candidates = Array.from(
    new Set([
      `https://www.${slug}.com`,
      `https://${slug}.dk`,
      `https://www.${slug}.dk`,
      `https://${slug}.eu`,
      `https://${slug}.co`,
      ...(hyphenSlug !== slug ? [`https://${hyphenSlug}.com`, `https://${hyphenSlug}.dk`] : []),
    ])
  );

  const checks = await Promise.all(
    candidates.map(async (url) => {
      const res = await fetchWithTimeout(url, 5500);
      if (!res || !res.ok) return null;
      const contentType = res.headers.get("content-type") || "";
      if (!contentType.includes("text/html")) return null;
      const html = await res.text();
      if (html.length < 400) return null;
      return { url: res.url || url, html };
    })
  );

  return checks.find(Boolean) || null;
}

function detectPixelsAndTech(html: string): string[] {
  const found: string[] = [];
  const lower = html.toLowerCase();
  if (
    lower.includes("fbevents.js") ||
    lower.includes("fbq(") ||
    lower.includes("facebook-domain-verification")
  ) {
    found.push("Meta Pixel");
  }
  if (lower.includes("googletagmanager.com") || lower.includes("gtag(")) {
    found.push("Google Analytics / Tag");
  }
  if (lower.includes("analytics.tiktok.com") || lower.includes("ttq.")) {
    found.push("TikTok Pixel");
  }
  if (lower.includes("klaviyo")) found.push("Klaviyo");
  if (lower.includes("pintrk(") || lower.includes("pinimg.com/ct")) found.push("Pinterest Tag");
  if (lower.includes("triplewhale")) found.push("Triple Whale");
  if (lower.includes("rechargepayments") || lower.includes("rechargeapps")) found.push("Recharge");
  if (lower.includes("gorgias")) found.push("Gorgias");
  if (lower.includes("judge.me")) found.push("Judge.me");
  if (lower.includes("yotpo")) found.push("Yotpo");
  if (lower.includes("trustpilot")) found.push("Trustpilot");
  if (lower.includes("snaptr(") || lower.includes("sc-static.net")) found.push("Snapchat Pixel");
  return found;
}

function resolveAbsoluteUrl(base: string, maybeRelative?: string): string | undefined {
  if (!maybeRelative) return undefined;
  try {
    return new URL(maybeRelative, base).toString();
  } catch {
    return undefined;
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { query?: string; fetchAds?: boolean };
    const query = body.query?.trim() || "";
    const shouldFetchAds = body.fetchAds !== false;

    if (!query) {
      return NextResponse.json(
        { ok: false, error: "Skriv et brandnavn eller en website-URL." },
        { status: 400 }
      );
    }

    // Run website resolution + Meta Company search in parallel
    const [resolved, metaCompanyInitial] = await Promise.all([
      resolveBrandUrl(query),
      searchCompanyMetaPage(query.replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0].split(".")[0]),
    ]);

    if (!resolved && !metaCompanyInitial) {
      return NextResponse.json(
        {
          ok: false,
          error: `Kunne ikke finde en aktiv webshop eller Meta-annoncør for "${query}". Prøv med hele domænet (fx brand.dk eller brand.com).`,
        },
        { status: 404 }
      );
    }

    const finalUrl = resolved?.url || `https://${query.replace(/^https?:\/\//, "").split("/")[0]}`;
    const html = resolved?.html || "";
    const parsedUrl = new URL(finalUrl);
    const origin = parsedUrl.origin;
    const bareDomain = parsedUrl.hostname.replace(/^www\./, "");

    const ogSiteName = html ? extractMeta(html, "og:site_name") : undefined;
    const rawTitle = html ? html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]?.trim() : undefined;
    const cleanedTitle = rawTitle
      ? decodeEntities(rawTitle).split(/[|\-–—·]/)[0].trim()
      : undefined;

    const brandName = ogSiteName || metaCompanyInitial?.name || cleanedTitle || bareDomain.split(".")[0];
    const description = html
      ? extractMeta(html, "og:description") || extractMeta(html, "description")
      : undefined;
    const storefrontImage = html
      ? resolveAbsoluteUrl(
          origin,
          extractMeta(html, "og:image") || extractMeta(html, "twitter:image")
        )
      : undefined;

    const igMatch = html.match(/https?:\/\/(?:www\.)?instagram\.com\/([a-zA-Z0-9._]{2,30})\/?/i);
    const fbMatch = html.match(/https?:\/\/(?:www\.)?facebook\.com\/([a-zA-Z0-9._-]{2,50})\/?/i);

    const detectedIgUser =
      metaCompanyInitial?.ig_username ||
      (igMatch?.[1] && !["p", "reel", "reels", "explore", "share"].includes(igMatch[1].toLowerCase())
        ? igMatch[1]
        : undefined);

    const igHandle = detectedIgUser ? `@${detectedIgUser}` : `@${bareDomain.split(".")[0]}`;
    const igUrl = detectedIgUser ? `https://www.instagram.com/${detectedIgUser}/` : undefined;
    const fbUrl =
      fbMatch?.[1] && !["sharer", "tr", "dialog", "plugins"].includes(fbMatch[1].toLowerCase())
        ? `https://www.facebook.com/${fbMatch[1]}/`
        : metaCompanyInitial?.page_alias
          ? `https://www.facebook.com/${metaCompanyInitial.page_alias}/`
          : undefined;

    const isShopify = /cdn\.shopify\.com|Shopify\.shop|shopify-section/i.test(html);
    const themeMatch = html.match(/Shopify\.theme\s*=\s*\{[^}]*"name"\s*:\s*"([^"]+)"/i);
    const currencyMatch =
      html.match(/"active"\s*:\s*"([A-Z]{3})"/i) ||
      html.match(/Shopify\.currency\s*=\s*\{[^}]*"active"\s*:\s*"([A-Z]{3})"/i);
    const detectedCurrency = currencyMatch?.[1] || (bareDomain.endsWith(".dk") ? "DKK" : "EUR");
    const pixels = html ? detectPixelsAndTech(html) : [];

    const brandId = `brand-${bareDomain.replace(/[^a-z0-9]+/g, "-")}`;
    const initials = brandName
      .split(/\s+/)
      .map((w: string) => w[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();

    const logoUrl =
      metaCompanyInitial?.image_uri ||
      `https://www.google.com/s2/favicons?domain=${encodeURIComponent(bareDomain)}&sz=128`;

    // Fetch real Shopify products + real Meta Ad Library company ads + optional SimilarWeb traffic in parallel!
    const [productsResult, companyAdsResult, trafficResult] = await Promise.all([
      (async (): Promise<{ count?: number; products: ProductPreview[] }> => {
        if (!isShopify) return { products: [] };
        const res = await fetchWithTimeout(`${origin}/products.json?limit=250`, 6000);
        if (!res || !res.ok) return { products: [] };
        try {
          const data = await res.json();
          const list = Array.isArray(data?.products) ? data.products : [];
          const top: ProductPreview[] = list.slice(0, 8).map(
            (p: {
              title?: string;
              handle?: string;
              images?: { src?: string }[];
              variants?: { price?: string }[];
            }) => ({
              title: p.title || "Produkt",
              price: p.variants?.[0]?.price,
              currency: detectedCurrency,
              image_url: p.images?.[0]?.src,
              url: p.handle ? `${origin}/products/${p.handle}` : origin,
            })
          );
          return { count: list.length, products: top };
        } catch {
          return { products: [] };
        }
      })(),

      (async (): Promise<{ totalActiveAds?: number; ads: Ad[] }> => {
        if (!shouldFetchAds || !metaCompanyInitial?.page_id) return { ads: [] };
        return fetchCompanyActiveAds(
          metaCompanyInitial.page_id,
          brandId,
          {
            name: brandName,
            handle: igHandle,
            initials: initials || "BR",
            color: "#0027eb",
            logoUrl,
          },
          16
        );
      })(),

      (async () => {
        if (!process.env.SIMILARWEB_API_KEY && !process.env.RAPIDAPI_KEY) return null;
        try {
          const res = await fetchWithTimeout(
            `${request.nextUrl.origin}/api/traffic?domain=${encodeURIComponent(bareDomain)}`,
            6000
          );
          if (res && res.ok) {
            const d = await res.json();
            if (d.ok) return d;
          }
        } catch {
          // ignore
        }
        return null;
      })(),
    ]);

    const originCountry = bareDomain.endsWith(".dk")
      ? "🇩🇰 DK"
      : bareDomain.endsWith(".se")
        ? "🇸🇪 SE"
        : bareDomain.endsWith(".no")
          ? "🇳🇴 NO"
          : bareDomain.endsWith(".de")
            ? "🇩🇪 DE"
            : bareDomain.endsWith(".co.uk")
              ? "🇬🇧 UK"
              : "🌍 Global";

    const metaLibraryUrl = metaCompanyInitial?.page_id
      ? `https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=ALL&view_all_page_id=${metaCompanyInitial.page_id}`
      : `https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=ALL&q=${encodeURIComponent(brandName)}`;

    const brand: Brand = {
      id: brandId,
      name: brandName,
      handle: igHandle,
      avatar_initials: initials || "BR",
      avatar_color: "#0027eb",
      logo_url: logoUrl,
      storefront_image_url:
        storefrontImage ||
        productsResult.products[0]?.image_url ||
        companyAdsResult.ads[0]?.thumbnail_url,
      description,
      website_url: origin,
      instagram_url: igUrl,
      facebook_url: fbUrl,
      meta_page_id: metaCompanyInitial?.page_id,
      meta_ad_library_url: metaLibraryUrl,
      category: metaCompanyInitial?.category || (isShopify ? "Shopify E-commerce" : "E-commerce"),
      is_shopify: isShopify,
      shopify_theme: themeMatch?.[1],
      origin_country: originCountry,
      currency: detectedCurrency,
      products_count: productsResult.count,
      top_products: productsResult.products,
      is_tracked: true,
      active_ads_count: companyAdsResult.totalActiveAds,
      ig_followers: metaCompanyInitial?.ig_followers,
      monthly_visits: trafficResult?.monthly_visits,
      traffic_growth_pct: trafficResult?.traffic_growth_pct,
      traffic_history: trafficResult?.traffic_history,
      pixels,
      last_synced_at: new Date().toISOString(),
    };

    return NextResponse.json({
      ok: true,
      brand,
      ads: companyAdsResult.ads,
      discovered: {
        isShopify,
        productsFound: productsResult.products.length,
        pixelsFound: pixels.length,
        metaPageId: metaCompanyInitial?.page_id || null,
        activeAdsCount: companyAdsResult.totalActiveAds || 0,
        adsImported: companyAdsResult.ads.length,
      },
    });
  } catch (err) {
    console.error("/api/brand-lookup error:", err);
    return NextResponse.json(
      { ok: false, error: "Kunne ikke slå brandet op lige nu." },
      { status: 500 }
    );
  }
}
