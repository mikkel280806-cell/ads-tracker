/**
 * Extracts authentic brand hex colors, real website header/JSON-LD logos,
 * and clean brand descriptions directly from a storefront's HTML/CSS.
 */

function normalizeHex(raw: string): string | null {
  const clean = raw.trim().replace(/^#/, "");
  if (/^[0-9a-fA-F]{6}$/.test(clean)) return `#${clean.toLowerCase()}`;
  if (/^[0-9a-fA-F]{3}$/.test(clean)) {
    const [r, g, b] = clean.toLowerCase().split("");
    return `#${r}${r}${g}${g}${b}${b}`;
  }
  return null;
}

function rgbToHex(r: number, g: number, b: number): string | null {
  if (
    !Number.isFinite(r) ||
    !Number.isFinite(g) ||
    !Number.isFinite(b) ||
    r < 0 ||
    r > 255 ||
    g < 0 ||
    g > 255 ||
    b < 0 ||
    b > 255
  ) {
    return null;
  }
  const toHex = (n: number) => Math.round(n).toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function parseColorToken(value: string): string | null {
  const trimmed = value.trim();
  const hexMatch = trimmed.match(/#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b/);
  if (hexMatch) return normalizeHex(hexMatch[0]);

  // Supports rgb(63 54 32 / 1.0) and rgba(63, 54, 32, 1)
  const rgbMatch = trimmed.match(
    /rgba?\(\s*(\d{1,3})\s*[,\s]\s*(\d{1,3})\s*[,\s]\s*(\d{1,3})(?:\s*[,/]\s*([0-9.]+%?))?\s*\)/i
  );
  if (rgbMatch) {
    const alphaRaw = rgbMatch[4];
    if (alphaRaw !== undefined) {
      const alpha = alphaRaw.endsWith("%")
        ? parseFloat(alphaRaw) / 100
        : parseFloat(alphaRaw);
      if (Number.isFinite(alpha) && alpha < 0.35) return null;
    }
    return rgbToHex(Number(rgbMatch[1]), Number(rgbMatch[2]), Number(rgbMatch[3]));
  }

  // Supports Shopify CSS *-rgb vars like "63 54 32" or "63, 54, 32"
  const bareTriplet = trimmed.match(/^(\d{1,3})\s*[,\s]\s*(\d{1,3})\s*[,\s]\s*(\d{1,3})$/);
  if (bareTriplet) {
    return rgbToHex(
      Number(bareTriplet[1]),
      Number(bareTriplet[2]),
      Number(bareTriplet[3])
    );
  }

  return null;
}

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function colorDistance(a: string, b: string): number {
  const [r1, g1, b1] = hexToRgb(a);
  const [r2, g2, b2] = hexToRgb(b);
  return Math.sqrt((r1 - r2) ** 2 + (g1 - g2) ** 2 + (b1 - b2) ** 2);
}

function isPureNeutralExtreme(hex: string): boolean {
  const [r, g, b] = hexToRgb(hex);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const chroma = max - min;
  const lum = 0.299 * r + 0.587 * g + 0.114 * b;
  // Pure white, pure black, or dead flat grays at extreme brightness/darkness
  if (lum >= 250 || lum <= 12) return true;
  if (chroma <= 6 && (lum > 225 || lum < 30)) return true;
  return false;
}

function isDeadGray(hex: string): boolean {
  const [r, g, b] = hexToRgb(hex);
  return Math.max(r, g, b) - Math.min(r, g, b) <= 10;
}

function saturation(hex: string): number {
  const [r, g, b] = hexToRgb(hex);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  return max === 0 ? 0 : (max - min) / max;
}

const IGNORED_VAR_NAME_RE =
  /error|success|warning|danger|invalid|destructive|instock|outofstock|lowstock|alert|notice|info|disabled|placeholder|shadow|backdrop|overlay|skeleton|tooltip|white|black|transparent|focus-ring|sale-badge|badge-error|badge-success/i;

const IGNORED_CSS_LINE_RE =
  /color-(?:error|success|warning|danger|instock|lowstock|outofstock|invalid|alert)|status-(?:error|success)|--(?:error|success|warning|danger|instock|outofstock|lowstock)/i;

export function extractBrandColorsFromHtml(html: string): string[] {
  if (!html) {
    return ["#0F172A", "#475569", "#CBD5E1", "#0027eb"];
  }

  const chromaticScores = new Map<string, number>();
  const neutralScores = new Map<string, number>();

  const bump = (raw: string, weight: number) => {
    const hex = parseColorToken(raw);
    if (!hex || isPureNeutralExtreme(hex)) return;

    if (isDeadGray(hex)) {
      neutralScores.set(hex, (neutralScores.get(hex) || 0) + weight * 0.45);
      return;
    }

    const sat = saturation(hex);
    const satBoost = sat >= 0.12 ? 1.55 : 1.15;
    chromaticScores.set(hex, (chromaticScores.get(hex) || 0) + weight * satBoost);
  };

  // 1. <meta name="theme-color" content="...">
  const themeMatches = html.matchAll(
    /<meta[^>]+name=["']theme-color["'][^>]+content=["']([^"']+)["']/gi
  );
  for (const m of themeMatches) {
    if (m[1]) bump(m[1], 42);
  }

  // 2. Inline <style> CSS custom properties (filtering out semantic status vars like --color-error / --color-success)
  const styleBlocks = html.match(/<style[^>]*>[\s\S]*?<\/style>/gi) || [];
  const styleJoined = styleBlocks.join("\n").slice(0, 180_000);

  const varDecls = styleJoined.matchAll(/(--[a-z0-9_-]+)\s*:\s*([^;}\n]+)/gi);
  let bgVarSeen = 0;
  for (const m of varDecls) {
    const varName = m[1] || "";
    const varVal = m[2] || "";
    if (!varName || !varVal) continue;
    if (IGNORED_VAR_NAME_RE.test(varName)) continue;

    if (
      /primary-button-background|primary-button-hover-background|brand|accent|theme-color|--primary\b|--color-primary\b|--color-button\b/i.test(
        varName
      )
    ) {
      bump(varVal, 38);
    } else if (/color-background/i.test(varName)) {
      bgVarSeen += 1;
      // Only trust the primary theme background schemes (first 2), not unused scheme-3/4/5 sale banners
      bump(varVal, bgVarSeen <= 2 ? 16 : 3);
    } else if (
      /secondary-button|color-secondary|surface|highlight|tint|badge/i.test(
        varName
      )
    ) {
      bump(varVal, 12);
    } else if (/color/i.test(varName)) {
      bump(varVal, 6);
    }
  }

  // 3. Frequency scan across sanitized inline <style> lines (excluding error/success/stock lines)
  const cleanStyleLines = styleJoined
    .split(/\n|;/)
    .filter((line) => !IGNORED_CSS_LINE_RE.test(line))
    .join("\n");

  for (const m of cleanStyleLines.matchAll(/#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b/g)) {
    if (m[0]) bump(m[0], 3);
  }
  for (const m of cleanStyleLines.matchAll(
    /rgba?\(\s*\d{1,3}\s*[,\s]\s*\d{1,3}\s*[,\s]\s*\d{1,3}(?:\s*[,/]\s*[0-9.]+%?)?\s*\)/gi
  )) {
    if (m[0]) bump(m[0], 3);
  }

  // 4. Fallback scan of raw HTML inline styles if <style> blocks were sparse
  if (chromaticScores.size < 4) {
    const inlineStyleMatches = html
      .slice(0, 180_000)
      .matchAll(/style=["']([^"']+)["']/gi);
    for (const m of inlineStyleMatches) {
      const snippet = m[1] || "";
      if (IGNORED_CSS_LINE_RE.test(snippet)) continue;
      for (const h of snippet.matchAll(/#([0-9a-fA-F]{6})\b/g)) {
        if (h[0]) bump(h[0], 2);
      }
    }
  }

  const rankedChromatic = Array.from(chromaticScores.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([hex]) => hex);
  const rankedNeutral = Array.from(neutralScores.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([hex]) => hex);

  // Pick 4 visually distinct authentic swatches (chromatic brand colors first, then neutrals only if needed)
  const picked: string[] = [];
  const tryAdd = (list: string[], minDist: number) => {
    for (const hex of list) {
      if (picked.length >= 4) break;
      if (picked.every((existing) => colorDistance(existing, hex) >= minDist)) {
        picked.push(hex);
      }
    }
  };

  tryAdd(rankedChromatic, 30);
  if (picked.length < 4) tryAdd(rankedChromatic, 18);
  if (picked.length < 4) tryAdd(rankedNeutral, 32);

  const fallbacks = ["#1E293B", "#475569", "#94A3B8", "#0027eb"];
  tryAdd(fallbacks, 30);

  return picked.slice(0, 4);
}

function resolveAbsoluteUrl(raw: string, baseOrigin: string): string | null {
  const cleaned = raw
    .trim()
    .replace(/\\\//g, "/")
    .replace(/\\u0026/gi, "&")
    .replace(/&amp;/gi, "&");
  if (!cleaned || cleaned.startsWith("data:") || cleaned.startsWith("blob:")) {
    return null;
  }
  try {
    const withProto = cleaned.startsWith("//") ? `https:${cleaned}` : cleaned;
    const url = new URL(withProto, baseOrigin);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return url.toString();
  } catch {
    return null;
  }
}

function isBadLogoUrl(url: string): boolean {
  return /(?:facebook|instagram|tiktok|twitter|youtube|linkedin|pinterest|klarna|visa|mastercard|amex|paypal|apple-pay|google-pay|mobilepay|trustpilot|shopify-pay|flag|country|search|cart|bag|chevron|arrow|close|spinner|loader)/i.test(
    url
  );
}

function extractBestImgUrlFromTag(tag: string, baseOrigin: string): string | null {
  // Prefer high-res entry in srcset (e.g. 2x or width >= 300), else src
  const srcsetMatch = tag.match(/\bsrcset=["']([^"']+)["']/i)?.[1];
  if (srcsetMatch) {
    const entries = srcsetMatch
      .split(",")
      .map((part) => part.trim().split(/\s+/))
      .filter((parts) => parts[0]);
    if (entries.length > 0) {
      // Pick the widest / highest-density candidate (often last or 2x)
      const best = entries[Math.min(entries.length - 1, 2)]?.[0];
      const resolved = best ? resolveAbsoluteUrl(best, baseOrigin) : null;
      if (resolved && !isBadLogoUrl(resolved)) return resolved;
    }
  }

  const srcMatch =
    tag.match(/\bsrc=["']([^"']+)["']/i)?.[1] ||
    tag.match(/\bdata-src=["']([^"']+)["']/i)?.[1];
  if (srcMatch) {
    const resolved = resolveAbsoluteUrl(srcMatch, baseOrigin);
    if (resolved && !isBadLogoUrl(resolved)) return resolved;
  }
  return null;
}

/**
 * Extracts the real storefront brand logo from HTML (JSON-LD Organization logo,
 * <header> logo <img>, site-logo <img>), falling back to apple-touch-icon / favicon
 * only when no real logo image exists on the page.
 */
export function extractWebsiteLogoFromHtml(
  html: string,
  baseOrigin: string,
  bareDomain: string
): string {
  const faviconFallback = `https://www.google.com/s2/favicons?domain=${encodeURIComponent(bareDomain)}&sz=128`;
  if (!html) return faviconFallback;

  // 1. JSON-LD Organization / Brand / Store logo (most accurate on Shopify, Woo, custom sites)
  const ldMatches = html.matchAll(
    /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
  );
  for (const m of ldMatches) {
    const rawJson = m[1]?.trim();
    if (!rawJson) continue;
    try {
      const parsed = JSON.parse(rawJson);
      const nodes = Array.isArray(parsed)
        ? parsed
        : Array.isArray(parsed?.["@graph"])
          ? parsed["@graph"]
          : [parsed];
      for (const node of nodes) {
        const typeStr = Array.isArray(node?.["@type"])
          ? node["@type"].join(" ")
          : String(node?.["@type"] || "");
        if (/organization|brand|store|localbusiness|onlinebusiness|corporation/i.test(typeStr)) {
          const logoVal = node?.logo;
          const logoStr =
            typeof logoVal === "string"
              ? logoVal
              : typeof logoVal?.url === "string"
                ? logoVal.url
                : typeof logoVal?.contentUrl === "string"
                  ? logoVal.contentUrl
                  : null;
          if (logoStr) {
            const resolved = resolveAbsoluteUrl(logoStr, baseOrigin);
            if (resolved && !isBadLogoUrl(resolved)) return resolved;
          }
        }
      }
    } catch {
      // Fallback regex inside malformed JSON-LD
      const regexLogo = rawJson.match(/"logo"\s*:\s*"([^"]+)"/i)?.[1];
      if (regexLogo) {
        const resolved = resolveAbsoluteUrl(regexLogo, baseOrigin);
        if (resolved && !isBadLogoUrl(resolved)) return resolved;
      }
    }
  }

  // 2. <header> logo <img>
  const headerMatch = html.match(/<header\b[\s\S]*?<\/header>/i)?.[0];
  if (headerMatch) {
    const headerImgs = headerMatch.match(/<img\b[^>]+>/gi) || [];
    // Pass A: explicitly marked as logo in class/id/src/alt
    for (const tag of headerImgs) {
      if (/\blogo\b|header-logo|site-logo|brand-logo/i.test(tag)) {
        const url = extractBestImgUrlFromTag(tag, baseOrigin);
        if (url) return url;
      }
    }
    // Pass B: first clean <img> inside <header>
    for (const tag of headerImgs) {
      const widthMatch = tag.match(/\bwidth=["']?(\d+)/i)?.[1];
      if (widthMatch && Number(widthMatch) < 24) continue;
      const url = extractBestImgUrlFromTag(tag, baseOrigin);
      if (url) return url;
    }
  }

  // 3. Any explicit header-logo / site-logo / navbar-brand <img> in top of document
  const topHtml = html.slice(0, 120_000);
  const explicitLogoImgs = topHtml.match(/<img\b[^>]+>/gi) || [];
  for (const tag of explicitLogoImgs) {
    if (/class=["'][^"']*(?:header-logo|site-logo|navbar-logo|brand-logo)[^"']*["']/i.test(tag)) {
      const url = extractBestImgUrlFromTag(tag, baseOrigin);
      if (url) return url;
    }
  }

  // 4. Fallback to apple-touch-icon if present
  const appleTouchMatch = html.match(
    /<link[^>]+rel=["'][^"']*apple-touch-icon[^"']*["'][^>]+href=["']([^"']+)["']/i
  )?.[1];
  if (appleTouchMatch) {
    const resolved = resolveAbsoluteUrl(appleTouchMatch, baseOrigin);
    if (resolved) return resolved;
  }

  return faviconFallback;
}

/**
 * Extracts a meaningful brand/product description from HTML when og:description
 * is missing or merely repeats the brand name.
 */
export function extractCleanDescriptionFromHtml(
  html: string,
  metaDescription: string | undefined,
  brandName: string
): string | undefined {
  const cleanMeta = metaDescription?.replace(/\s+/g, " ").trim();
  const normBrand = brandName.toLowerCase().replace(/[^a-z0-9]/g, "");
  const normMeta = (cleanMeta || "").toLowerCase().replace(/[^a-z0-9]/g, "");

  if (cleanMeta && cleanMeta.length >= 34 && normMeta !== normBrand) {
    return cleanMeta;
  }

  if (!html) return cleanMeta;

  // 1. Check JSON-LD Product or Organization description
  const ldMatches = html.matchAll(
    /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
  );
  for (const m of ldMatches) {
    try {
      const parsed = JSON.parse(m[1] || "");
      const nodes = Array.isArray(parsed)
        ? parsed
        : Array.isArray(parsed?.["@graph"])
          ? parsed["@graph"]
          : [parsed];
      for (const node of nodes) {
        const desc = typeof node?.description === "string" ? node.description.trim() : "";
        if (
          desc.length >= 36 &&
          desc.toLowerCase().replace(/[^a-z0-9]/g, "") !== normBrand
        ) {
          return desc.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 220);
        }
      }
    } catch {
      // ignore invalid JSON-LD
    }
  }

  // 2. Scan main body paragraphs for a real descriptive sentence
  const stripped = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<header[\s\S]*?<\/header>/gi, " ")
    .replace(/<footer[\s\S]*?<\/footer>/gi, " ");
  const pMatches = stripped.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi);
  for (const m of pMatches) {
    const text = (m[1] || "")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/gi, " ")
      .replace(/&amp;/gi, "&")
      .replace(/&quot;/gi, '"')
      .replace(/&#39;/gi, "'")
      .replace(/\s+/g, " ")
      .trim();
    if (
      text.length >= 48 &&
      text.length <= 280 &&
      !/cookie|accept|privacy|newsletter|subscribe|tilmeld|indkøbskurv|levering inden/i.test(
        text
      )
    ) {
      return text;
    }
  }

  return cleanMeta;
}
