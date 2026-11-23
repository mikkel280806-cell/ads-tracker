import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 60;
import type { Ad, Brand, MarketCode } from "@/lib/types";
import {
  fetchCompanyActiveAds,
  searchCompanyMetaPage,
} from "@/lib/scrapecreators";
import {
  buildAdsTimeline,
  buildTrafficProfile,
  decodeEntities,
  detectElevarDestinations,
  detectMarketFromStore,
  detectPixels,
  detectShopifyApps,
  extractMeta,
  fetchHtmlSmart,
  fetchTrancoRank,
  fetchTrustpilotRating,
  fetchWithTimeout,
  scrapeShopifyProducts,
} from "@/lib/shop-scraper";

async function resolveBrandUrl(
  input: string
): Promise<{ url: string; html: string } | null> {
  const trimmed = input.trim();
  if (!trimmed) return null;

  if (trimmed.includes(".") && !trimmed.includes(" ")) {
    const candidate = trimmed.startsWith("http")
      ? trimmed
      : `https://${trimmed}`;
    const direct = await fetchHtmlSmart(candidate, 8000);
    if (direct.ok) {
      return { url: direct.url, html: direct.html };
    }
    if (!candidate.includes("://www.")) {
      const wwwCandidate = candidate.replace("://", "://www.");
      const wwwRes = await fetchHtmlSmart(wwwCandidate, 8000);
      if (wwwRes.ok) {
        return { url: wwwRes.url, html: wwwRes.html };
      }
    }
    return null;
  }

  const slug = trimmed.toLowerCase().replace(/[^a-z0-9]/g, "");
  const hyphenSlug = trimmed
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  const candidates = Array.from(
    new Set([
      `https://www.${slug}.com`,
      `https://${slug}.dk`,
      `https://www.${slug}.dk`,
      `https://${slug}.eu`,
      `https://${slug}.co`,
      ...(hyphenSlug !== slug
        ? [`https://${hyphenSlug}.com`, `https://${hyphenSlug}.dk`]
        : []),
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

function resolveAbsoluteUrl(
  base: string,
  maybeRelative?: string
): string | undefined {
  if (!maybeRelative) return undefined;
  try {
    return new URL(maybeRelative, base).toString();
  } catch {
    return undefined;
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      query?: string;
      fetchAds?: boolean;
      market?: MarketCode;
      companyNameOverride?: string;
    };
    const query = body.query?.trim() || "";
    const shouldFetchAds = body.fetchAds !== false;

    if (!query) {
      return NextResponse.json(
        { ok: false, error: "Skriv et brandnavn eller en shop-URL." },
        { status: 400 }
      );
    }

    const resolved = await resolveBrandUrl(query);

    const guessedDomain = query
      .replace(/^https?:\/\//, "")
      .replace(/^www\./, "")
      .split("/")[0];

    const finalUrl = resolved?.url || `https://${guessedDomain}`;
    const html = resolved?.html || "";
    const parsedUrl = new URL(finalUrl);
    const origin = parsedUrl.origin;
    const bareDomain = parsedUrl.hostname.replace(/^www\./, "");

    const ogSiteName = html ? extractMeta(html, "og:site_name") : undefined;
    const rawTitle = html
      ? html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]?.trim()
      : undefined;
    const cleanedTitle = rawTitle
      ? decodeEntities(rawTitle).split(/[|\-–—·]/)[0].trim()
      : undefined;

    const brandName =
      body.companyNameOverride ||
      ogSiteName ||
      cleanedTitle ||
      bareDomain.split(".")[0];

    const description = html
      ? extractMeta(html, "og:description") || extractMeta(html, "description")
      : undefined;

    const storefrontImage = html
      ? resolveAbsoluteUrl(
          origin,
          extractMeta(html, "og:image") || extractMeta(html, "twitter:image")
        )
      : undefined;

    const igMatch = html.match(
      /https?:\/\/(?:www\.)?instagram\.com\/([a-zA-Z0-9._]{2,30})\/?/i
    );
    const fbMatch = html.match(
      /https?:\/\/(?:www\.)?facebook\.com\/([a-zA-Z0-9._-]{2,50})\/?/i
    );
    const tiktokMatch = html.match(
      /https?:\/\/(?:www\.)?tiktok\.com\/@([a-zA-Z0-9._-]{2,35})\/?/i
    );
    const youtubeMatch = html.match(
      /https?:\/\/(?:www\.)?youtube\.com\/(?:@|channel\/|c\/|user\/)([a-zA-Z0-9._-]{2,50})\/?/i
    );

    const detectedIgUser =
      igMatch?.[1] &&
      !["p", "reel", "reels", "explore", "share"].includes(
        igMatch[1].toLowerCase()
      )
        ? igMatch[1]
        : undefined;

    const igHandle = detectedIgUser
      ? `@${detectedIgUser}`
      : `@${bareDomain.split(".")[0]}`;
    const igUrl = detectedIgUser
      ? `https://www.instagram.com/${detectedIgUser}/`
      : undefined;
    const fbUrl =
      fbMatch?.[1] &&
      !["sharer", "tr", "dialog", "plugins"].includes(fbMatch[1].toLowerCase())
        ? `https://www.facebook.com/${fbMatch[1]}/`
        : undefined;
    const tiktokUrl = tiktokMatch?.[1]
      ? `https://www.tiktok.com/@${tiktokMatch[1]}`
      : undefined;
    const youtubeUrl = youtubeMatch?.[0];

    const isShopify = /cdn\.shopify\.com|Shopify\.shop|shopify-section/i.test(
      html
    );
    const myshopifyMatch = html.match(/Shopify\.shop\s*=\s*["']([^"']+)["']/i);
    const themeMatch = html.match(
      /Shopify\.theme\s*=\s*\{[^}]*"name"\s*:\s*"([^"]+)"/i
    );
    const currencyMatch =
      html.match(/"active"\s*:\s*"([A-Z]{3})"/i) ||
      html.match(/Shopify\.currency\s*=\s*\{[^}]*"active"\s*:\s*"([A-Z]{3})"/i);
    const detectedCurrency =
      currencyMatch?.[1] || (bareDomain.endsWith(".dk") ? "DKK" : "USD");

    const basePixels = html ? detectPixels(html) : [];
    const baseShopifyApps = html ? detectShopifyApps(html) : [];
    const marketInfo = detectMarketFromStore({
      domain: bareDomain,
      html,
      currency: detectedCurrency,
      overrideMarket: body.market,
    });

    const brandId = `brand-${bareDomain.replace(/[^a-z0-9]+/g, "-")}`;
    const initials = brandName
      .split(/\s+/)
      .map((w: string) => w[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();

    const defaultFavicon = `https://www.google.com/s2/favicons?domain=${encodeURIComponent(
      bareDomain
    )}&sz=128`;

    // 1. Scrape Shopify products + Elevar server-side destinations + Tranco rank + Trustpilot + optional SimilarWeb in parallel
    const [
      productsResult,
      elevarResult,
      trancoRank,
      trustpilotResult,
      similarWebTraffic,
    ] = await Promise.all([
      isShopify
        ? scrapeShopifyProducts(origin, detectedCurrency)
        : Promise.resolve({
            count: 0,
            topProducts: [],
            latestProducts: [],
            foundedDate: undefined,
            categories: [],
          }),
      html
        ? detectElevarDestinations(html)
        : Promise.resolve({ pixels: [], apps: [] }),
      fetchTrancoRank(bareDomain),
      fetchTrustpilotRating(bareDomain),
        (async () => {
          if (!process.env.SIMILARWEB_API_KEY && !process.env.RAPIDAPI_KEY) {
            return null;
          }
          try {
            const res = await fetchWithTimeout(
              `${request.nextUrl.origin}/api/traffic?domain=${encodeURIComponent(
                bareDomain
              )}`,
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

    const pixels = Array.from(
      new Set([...basePixels, ...elevarResult.pixels])
    );
    const shopifyApps = Array.from(
      new Set([...baseShopifyApps, ...elevarResult.apps])
    );

    const productImagesByHandle: Record<string, string> = {};
    for (const p of [
      ...productsResult.topProducts,
      ...productsResult.latestProducts,
    ]) {
      if (p.handle && p.image_url) {
        productImagesByHandle[p.handle.toLowerCase()] = p.image_url;
      }
    }
    const defaultFallbackImage =
      productsResult.topProducts[0]?.image_url || storefrontImage;

    // 2. Fetch live Meta Ad Library ads via 1-credit companyName endpoint (fallback to search+pageId only if empty)
    let companyAdsResult = shouldFetchAds
      ? await fetchCompanyActiveAds({
          companyName: brandName,
          brandId,
          fallbackBrand: {
            name: brandName,
            handle: igHandle,
            initials: initials || "AD",
            color: "#0027eb",
            logoUrl: defaultFavicon,
            market: marketInfo.market,
            productImagesByHandle,
            defaultFallbackImage,
          },
          limit: 300,
        })
      : { ads: [] as Ad[] };

    let igFollowers: number | undefined;
    let metaPageId = companyAdsResult.pageId;
    let fbLikes = companyAdsResult.pageLikes;

    const domainRoot = bareDomain.split(".")[0].toLowerCase();
    const adsMatchDomain =
      companyAdsResult.ads.length > 0 &&
      companyAdsResult.ads.some((a) => {
        try {
          const h = new URL(a.landing_page_url).hostname.toLowerCase();
          return h.includes(domainRoot);
        } catch {
          return false;
        }
      });

    if (shouldFetchAds && (companyAdsResult.ads.length === 0 || (resolved && !adsMatchDomain))) {
      const fbAlias =
        fbMatch?.[1] && !["sharer", "tr", "dialog", "plugins"].includes(fbMatch[1].toLowerCase())
          ? fbMatch[1]
          : undefined;
      const metaMatch = await searchCompanyMetaPage(
        brandName || domainRoot,
        { igUsername: detectedIgUser, fbAlias, domainSlug: domainRoot }
      );
      if (metaMatch?.page_id && metaMatch.page_id !== metaPageId) {
        metaPageId = metaMatch.page_id;
        igFollowers = metaMatch.ig_followers;
        fbLikes = metaMatch.likes || fbLikes;
        companyAdsResult = await fetchCompanyActiveAds({
          pageId: metaMatch.page_id,
          brandId,
          fallbackBrand: {
            name: metaMatch.name || brandName,
            handle: metaMatch.ig_username
              ? `@${metaMatch.ig_username}`
              : igHandle,
            initials: initials || "AD",
            color: "#0027eb",
            logoUrl: metaMatch.image_uri || defaultFavicon,
            market: marketInfo.market,
            productImagesByHandle,
            defaultFallbackImage,
          },
          limit: 300,
        });
      }
    }

    if (!resolved && companyAdsResult.ads.length === 0 && !metaPageId) {
      return NextResponse.json(
        {
          ok: false,
          error: `Kunne ikke finde en aktiv shop eller Meta-annoncør for "${query}". Prøv domænet (fx shapingnewtomorrow.com eller stepprs.com).`,
        },
        { status: 404 }
      );
    }

    const activeAdsCount =
      companyAdsResult.totalActiveAds ?? companyAdsResult.ads.length;

    const calibratedTraffic = buildTrafficProfile({
      domain: bareDomain,
      market: marketInfo.market,
      trancoRank,
      activeAdsCount,
      igFollowers,
      fbLikes,
    });

    const adsTimeline = buildAdsTimeline(companyAdsResult.ads, activeAdsCount);

    const metaLibraryUrl = metaPageId
      ? `https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=ALL&view_all_page_id=${metaPageId}`
      : `https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=ALL&q=${encodeURIComponent(
          brandName
        )}`;

    const brand: Brand = {
      id: brandId,
      name: companyAdsResult.pageName || brandName,
      handle: igHandle,
      avatar_initials: initials || "AD",
      avatar_color: "#0027eb",
      logo_url: defaultFavicon,
      storefront_image_url:
        storefrontImage ||
        productsResult.topProducts[0]?.image_url ||
        companyAdsResult.ads[0]?.thumbnail_url,
      description,
      website_url: origin,
      myshopify_domain: myshopifyMatch?.[1],
      instagram_url: igUrl,
      facebook_url: fbUrl || companyAdsResult.pageProfileUri,
      tiktok_url: tiktokUrl,
      youtube_url: youtubeUrl,
      meta_page_id: metaPageId,
      meta_ad_library_url: metaLibraryUrl,
      category:
        productsResult.categories[0] ||
        companyAdsResult.pageCategory ||
        (isShopify ? "Shopify E-commerce" : "E-commerce"),
      sub_categories: productsResult.categories.slice(1),
      market: marketInfo.market,
      language: marketInfo.language,
      is_shopify: isShopify,
      shopify_theme: themeMatch?.[1]?.replace(/\\\//g, "/"),
      founded_date: productsResult.foundedDate,
      origin_country: marketInfo.originCountry,
      country_code: marketInfo.countryCode,
      currency: detectedCurrency,
      products_count: productsResult.count || undefined,
      top_products: productsResult.topProducts,
      latest_products: productsResult.latestProducts,
      is_tracked: true,
      folder_ids: [],
      active_ads_count: activeAdsCount,
      monthly_visits:
        similarWebTraffic?.monthly_visits ?? calibratedTraffic.monthly_visits,
      traffic_source: similarWebTraffic?.monthly_visits
        ? "similarweb"
        : "tranco_estimate",
      tranco_rank: trancoRank || undefined,
      trustpilot_score: trustpilotResult?.score,
      trustpilot_reviews: trustpilotResult?.reviews,
      traffic_growth_pct:
        similarWebTraffic?.traffic_growth_pct ??
        calibratedTraffic.traffic_growth_pct,
      traffic_history:
        similarWebTraffic?.traffic_history ?? calibratedTraffic.traffic_history,
      ads_timeline: adsTimeline,
      visitor_countries: calibratedTraffic.visitor_countries,
      targeted_countries: calibratedTraffic.targeted_countries,
      ig_followers: igFollowers,
      fb_likes: fbLikes,
      pixels,
      shopify_apps: shopifyApps,
      last_synced_at: new Date().toISOString(),
    };

    return NextResponse.json({
      ok: true,
      brand,
      ads: companyAdsResult.ads,
      discovered: {
        isShopify,
        productsFound: productsResult.count,
        pixelsFound: pixels.length,
        shopifyAppsFound: shopifyApps.length,
        metaPageId: metaPageId || null,
        activeAdsCount,
        adsImported: companyAdsResult.ads.length,
        trancoRank,
      },
    });
  } catch (err) {
    console.error("/api/brand-lookup error:", err);
    return NextResponse.json(
      { ok: false, error: "Kunne ikke scrape shoppen lige nu." },
      { status: 500 }
    );
  }
}
