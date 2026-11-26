import { NextRequest, NextResponse } from "next/server";
import {
  decodeEntities,
  detectElevarDestinations,
  detectPixels,
  detectShopifyApps,
  extractMeta,
  fetchHtmlSmart,
  fetchTrustpilotRating,
  scrapeShopifyProducts,
} from "@/lib/shop-scraper";
import { synthesizeBrandMemoryFromScrape } from "@/lib/snow-engine";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { url?: string };
    const raw = (body.url || "").trim();
    if (!raw) {
      return NextResponse.json(
        { ok: false, error: "Indtast venligst din shop-URL (f.eks. thenap.dk)." },
        { status: 400 }
      );
    }

    const normalizedInput = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
    let parsed: URL;
    try {
      parsed = new URL(normalizedInput);
    } catch {
      return NextResponse.json(
        { ok: false, error: "Ugyldig webadresse. Prøv f.eks. archandpillar.dk" },
        { status: 400 }
      );
    }

    if (/^(localhost|127\.|10\.|192\.168\.|169\.254\.)/i.test(parsed.hostname)) {
      return NextResponse.json(
        { ok: false, error: "Lokale adresser understøttes ikke." },
        { status: 400 }
      );
    }

    const bareDomain = parsed.hostname.replace(/^www\./i, "").toLowerCase();
    const fetched = await fetchHtmlSmart(parsed.toString(), 9000);
    const finalUrl = fetched.ok ? fetched.url : parsed.toString();
    const finalOrigin = new URL(finalUrl).origin;
    const html = fetched.html || "";

    const ogSiteName = html ? extractMeta(html, "og:site_name") : undefined;
    const rawTitle = html
      ? html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.trim()
      : undefined;
    const cleanedTitle = rawTitle
      ? decodeEntities(rawTitle.replace(/<[^>]+>/g, "")).trim()
      : undefined;
    const brandName =
      ogSiteName ||
      cleanedTitle?.split(/[|\-–—·]/)[0]?.trim() ||
      bareDomain.split(".")[0].replace(/^./, (c) => c.toUpperCase());

    const description = html
      ? extractMeta(html, "og:description") || extractMeta(html, "description")
      : undefined;

    const currencyMatch =
      html.match(/Shopify\.currency\s*=\s*\{[^}]*"active"\s*:\s*"([A-Z]{3})"/i) ||
      html.match(/"active"\s*:\s*"([A-Z]{3})"/i);
    const currency =
      currencyMatch?.[1] ||
      (bareDomain.endsWith(".dk")
        ? "DKK"
        : bareDomain.endsWith(".co.uk")
          ? "GBP"
          : "USD");

    const isShopify = /cdn\.shopify\.com|Shopify\.shop|shopify-section/i.test(html);
    const [productsRes, elevarRes, tpRes] = await Promise.all([
      isShopify || html === ""
        ? scrapeShopifyProducts(finalOrigin, currency).catch(() => ({
            count: 0,
            topProducts: [],
            latestProducts: [],
            categories: [],
          }))
        : Promise.resolve({ count: 0, topProducts: [], latestProducts: [], categories: [] }),
      html
        ? detectElevarDestinations(html).catch(() => ({ pixels: [], apps: [] }))
        : Promise.resolve({ pixels: [], apps: [] }),
      fetchTrustpilotRating(bareDomain).catch(() => null),
    ]);

    const pixels = Array.from(new Set([...detectPixels(html), ...elevarRes.pixels]));
    const apps = Array.from(new Set([...detectShopifyApps(html), ...elevarRes.apps]));

    const category =
      productsRes.categories[0] ||
      (bareDomain.includes("sleep") || /søvn|sleep|pude|dyne/i.test(cleanedTitle || "")
        ? "Sleep & Bedding"
        : /skin|hud|care|beauty|hair/i.test(cleanedTitle || "")
          ? "Beauty & Skincare"
          : "DTC E-commerce");

    const logoCandidate = `https://www.google.com/s2/favicons?domain=${encodeURIComponent(bareDomain)}&sz=128`;

    const memory = synthesizeBrandMemoryFromScrape({
      brandName,
      domain: bareDomain,
      websiteUrl: finalOrigin,
      logoUrl: logoCandidate,
      title: cleanedTitle,
      description,
      html,
      category,
      currency,
      products: productsRes.topProducts.length > 0 ? productsRes.topProducts : productsRes.latestProducts,
      pixels,
      shopifyApps: apps,
      trustpilotScore: tpRes?.score,
      trustpilotReviews: tpRes?.reviews,
    });

    return NextResponse.json({
      ok: true,
      memory,
    });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error:
          err instanceof Error
            ? err.message
            : "Kunne ikke analysere brandets hjemmeside.",
      },
      { status: 500 }
    );
  }
}
