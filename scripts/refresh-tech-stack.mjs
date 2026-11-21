import fs from "node:fs";
import path from "node:path";
import {
  BROWSER_UA,
  detectElevarDestinations,
  detectPixels,
  detectShopifyApps,
  extractShopifyWebPixels,
} from "../src/lib/shop-scraper.ts";
import { getTechMeta } from "../src/lib/tech-catalog.ts";

const CATALOG_PATH = path.resolve(process.cwd(), "src/lib/scraped-catalog.json");

async function fetchHtml(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 11000);
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": BROWSER_UA,
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "Accept-Language": "da-DK,da;q=0.9,en-US;q=0.8,en;q=0.7",
      },
      redirect: "follow",
      signal: controller.signal,
    });
    if (!res.ok) return { ok: false, status: res.status, html: "" };
    const html = await res.text();
    return { ok: true, status: res.status, html };
  } catch (err) {
    return { ok: false, status: 0, html: "", error: String(err) };
  } finally {
    clearTimeout(timer);
  }
}

async function main() {
  const raw = fs.readFileSync(CATALOG_PATH, "utf8");
  const catalog = JSON.parse(raw);
  const brands = catalog.brands || [];

  let totalPixelsBefore = 0;
  let totalPixelsAfter = 0;
  let totalAppsBefore = 0;
  let totalAppsAfter = 0;

  const missingMeta = new Set();
  const seenApiClients = new Map();

  // Process in batches of 6
  const BATCH = 6;
  for (let i = 0; i < brands.length; i += BATCH) {
    const slice = brands.slice(i, i + BATCH);
    await Promise.all(
      slice.map(async (brand) => {
        const oldPixels = Array.isArray(brand.pixels) ? brand.pixels : [];
        const oldApps = Array.isArray(brand.shopify_apps) ? brand.shopify_apps : [];
        totalPixelsBefore += oldPixels.length;
        totalAppsBefore += oldApps.length;

        const url = brand.website_url;
        let result = await fetchHtml(url);
        if (!result.ok && url && !url.includes("://www.")) {
          const withWww = url.replace("://", "://www.");
          const retry = await fetchHtml(withWww);
          if (retry.ok) result = retry;
        }

        if (!result.ok || result.html.length < 1500) {
          console.log(
            `[WARN] ${brand.name.padEnd(22)} HTTP ${result.status} (kept ${oldPixels.length}px / ${oldApps.length} apps)`
          );
          totalPixelsAfter += oldPixels.length;
          totalAppsAfter += oldApps.length;
          return;
        }

        const elevar = await detectElevarDestinations(result.html);
        const newPixels = Array.from(
          new Set([...detectPixels(result.html), ...elevar.pixels])
        );
        const newApps = Array.from(
          new Set([...detectShopifyApps(result.html), ...elevar.apps])
        );

        // Log web pixel client IDs for auditing
        for (const wp of extractShopifyWebPixels(result.html)) {
          const cid = String(wp.apiClientId || "");
          if (cid) {
            seenApiClients.set(cid, (seenApiClients.get(cid) || 0) + 1);
          }
        }

        // If fresh scan succeeded with non-empty data, trust fresh 5-layer detection;
        // otherwise merge so we never zero out a Cloudflare-challenged storefront
        const finalPixels = newPixels.length > 0 ? newPixels : oldPixels;
        const finalApps = newApps.length > 0 ? newApps : oldApps;

        brand.pixels = finalPixels;
        brand.shopify_apps = finalApps;

        // Also update is_shopify if clearly detected
        if (
          /cdn\.shopify\.com|shopify\.theme|webPixelsConfigList/i.test(result.html)
        ) {
          brand.is_shopify = true;
        }

        for (const t of [...finalPixels, ...finalApps]) {
          if (!getTechMeta(t)) missingMeta.add(t);
        }

        totalPixelsAfter += finalPixels.length;
        totalAppsAfter += finalApps.length;

        console.log(
          `[OK]   ${brand.name.padEnd(22)} Pixels: ${String(oldPixels.length).padStart(2)} -> ${String(finalPixels.length).padStart(2)} | Apps: ${String(oldApps.length).padStart(2)} -> ${String(finalApps.length).padStart(2)} | ${finalApps.slice(0, 6).join(", ")}`
        );
      })
    );
  }

  fs.writeFileSync(CATALOG_PATH, JSON.stringify(catalog, null, 2) + "\n", "utf8");

  console.log("\n=== SUMMARY ===");
  console.log(`Brands scanned: ${brands.length}`);
  console.log(`Total Pixels:   ${totalPixelsBefore} -> ${totalPixelsAfter}`);
  console.log(`Total Apps:     ${totalAppsBefore} -> ${totalAppsAfter}`);
  if (missingMeta.size > 0) {
    console.log("Missing from TECH_CATALOG:", Array.from(missingMeta));
  } else {
    console.log("TECH_CATALOG coverage: 100% (0 missing tools!)");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
