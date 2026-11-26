import { NextRequest } from "next/server";
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
import {
  extractBrandColorsFromHtml,
  extractCleanDescriptionFromHtml,
  extractWebsiteLogoFromHtml,
} from "@/lib/brand-colors";
import { synthesizeBrandMemoryFromScrape } from "@/lib/snow-engine";

export async function POST(request: NextRequest) {
  let rawUrl = "";
  try {
    const body = (await request.json()) as { url?: string };
    rawUrl = (body.url || "").trim();
  } catch {
    return new Response(
      JSON.stringify({ ok: false, error: "Invalid request." }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  if (!rawUrl) {
    return new Response(
      JSON.stringify({ ok: false, error: "Please enter your store URL." }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const normalizedInput = /^https?:\/\//i.test(rawUrl)
    ? rawUrl
    : `https://${rawUrl}`;
  let parsed: URL;
  try {
    parsed = new URL(normalizedInput);
  } catch {
    return new Response(
      JSON.stringify({
        ok: false,
        error: "Invalid website URL. Try e.g. archandpillar.dk",
      }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  if (/^(localhost|127\.|10\.|192\.168\.|169\.254\.)/i.test(parsed.hostname)) {
    return new Response(
      JSON.stringify({ ok: false, error: "Local addresses are not supported." }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const encoder = new TextEncoder();
  const bareDomain = parsed.hostname.replace(/^www\./i, "").toLowerCase();

  const stream = new ReadableStream({
    async start(controller) {
      const emit = (payload: Record<string, unknown>) => {
        controller.enqueue(encoder.encode(`${JSON.stringify(payload)}\n`));
      };

      try {
        emit({
          type: "init",
          domain: bareDomain,
          websiteUrl: parsed.origin,
          progress: 14,
        });

        // Start HTML fetch & Trustpilot in parallel
        const htmlPromise = fetchHtmlSmart(parsed.toString(), 9000);
        const tpPromise = fetchTrustpilotRating(bareDomain).catch(() => null);

        const fetched = await htmlPromise;
        const finalUrl = fetched.ok ? fetched.url : parsed.toString();
        const finalOrigin = new URL(finalUrl).origin;
        const html = fetched.html || "";

        const ogImage = html ? extractMeta(html, "og:image") : undefined;
        const logoCandidate = extractWebsiteLogoFromHtml(
          html,
          finalOrigin,
          bareDomain
        );

        const brandColors = extractBrandColorsFromHtml(html);

        // Emit logo + real scraped brand colors as soon as HTML arrives!
        emit({
          type: "logo_colors",
          logoUrl: logoCandidate,
          fallbackLogoUrl: `https://www.google.com/s2/favicons?domain=${encodeURIComponent(bareDomain)}&sz=128`,
          brandColors,
          progress: 42,
        });

        const currencyMatch =
          html.match(
            /Shopify\.currency\s*=\s*\{[^}]*"active"\s*:\s*"([A-Z]{3})"/i
          ) || html.match(/"active"\s*:\s*"([A-Z]{3})"/i);
        const currency =
          currencyMatch?.[1] ||
          (bareDomain.endsWith(".dk")
            ? "DKK"
            : bareDomain.endsWith(".co.uk")
              ? "GBP"
              : "USD");

        const isShopify =
          /cdn\.shopify\.com|Shopify\.shop|shopify-section/i.test(html);

        const [productsRes, elevarRes, tpRes] = await Promise.all([
          isShopify || html === ""
            ? scrapeShopifyProducts(finalOrigin, currency).catch(() => ({
                count: 0,
                topProducts: [],
                latestProducts: [],
                categories: [],
              }))
            : Promise.resolve({
                count: 0,
                topProducts: [],
                latestProducts: [],
                categories: [],
              }),
          html
            ? detectElevarDestinations(html).catch(() => ({
                pixels: [],
                apps: [],
              }))
            : Promise.resolve({ pixels: [], apps: [] }),
          tpPromise,
        ]);

        const products =
          productsRes.topProducts.length > 0
            ? productsRes.topProducts
            : productsRes.latestProducts;

        // Emit products right away as catalog resolves!
        emit({
          type: "products",
          products: products.slice(0, 6),
          fallbackImageUrl: ogImage,
          progress: 74,
        });

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

        const rawDescription = html
          ? extractMeta(html, "og:description") ||
            extractMeta(html, "description")
          : undefined;
        const description = extractCleanDescriptionFromHtml(
          html,
          rawDescription,
          brandName
        );

        const category =
          productsRes.categories[0] ||
          (bareDomain.includes("sleep") ||
          /søvn|sleep|pude|dyne/i.test(cleanedTitle || "")
            ? "Sleep & Bedding"
            : /skin|hud|care|beauty|hair/i.test(cleanedTitle || "")
              ? "Beauty & Skincare"
              : "DTC E-commerce");

        const pixels = Array.from(
          new Set([...detectPixels(html), ...elevarRes.pixels])
        );
        const apps = Array.from(
          new Set([...detectShopifyApps(html), ...elevarRes.apps])
        );

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
          products,
          brandColors,
          pixels,
          shopifyApps: apps,
          trustpilotScore: tpRes?.score,
          trustpilotReviews: tpRes?.reviews,
        });

        emit({
          type: "brand_info",
          brandName: memory.brandName,
          description: memory.description,
          category: memory.category,
          progress: 94,
        });

        emit({
          type: "complete",
          memory,
          progress: 100,
        });
      } catch (err) {
        emit({
          type: "error",
          error:
            err instanceof Error
              ? err.message
              : "Kunne ikke analysere brandets hjemmeside.",
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
    },
  });
}
