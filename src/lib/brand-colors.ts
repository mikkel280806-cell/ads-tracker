/**
 * Extracts 4 visually distinct brand hex colors directly from a storefront's HTML/CSS.
 * Prioritizes <meta name="theme-color">, brand CSS variables, and dominant non-neutral hex tokens.
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

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function colorDistance(a: string, b: string): number {
  const [r1, g1, b1] = hexToRgb(a);
  const [r2, g2, b2] = hexToRgb(b);
  return Math.sqrt((r1 - r2) ** 2 + (g1 - g2) ** 2 + (b1 - b2) ** 2);
}

function isNearWhiteOrBlack(hex: string): boolean {
  const [r, g, b] = hexToRgb(hex);
  const lum = 0.299 * r + 0.587 * g + 0.114 * b;
  return lum > 246 || lum < 14;
}

function saturation(hex: string): number {
  const [r, g, b] = hexToRgb(hex);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  return max === 0 ? 0 : (max - min) / max;
}

export function extractBrandColorsFromHtml(html: string): string[] {
  if (!html) {
    return ["#0F172A", "#475569", "#CBD5E1", "#0027eb"];
  }

  const scores = new Map<string, number>();

  const bump = (raw: string, weight: number) => {
    const hex = normalizeHex(raw);
    if (!hex || isNearWhiteOrBlack(hex)) return;
    // Ignore default browser / tailwind placeholder grays unless few colors exist
    const satBoost = saturation(hex) > 0.18 ? 1.6 : 1;
    scores.set(hex, (scores.get(hex) || 0) + weight * satBoost);
  };

  // 1. <meta name="theme-color" content="#...">
  const themeMatches = html.matchAll(
    /<meta[^>]+name=["']theme-color["'][^>]+content=["']([^"']+)["']/gi
  );
  for (const m of themeMatches) {
    if (m[1]) bump(m[1], 40);
  }

  // 2. Named CSS custom properties (--color-*, --brand*, --accent*, --primary*, --button*)
  const cssVarMatches = html.matchAll(
    /--(?:color|brand|accent|primary|secondary|button|bg|background|text)[a-z0-9_-]*\s*:\s*(#[0-9a-fA-F]{3,6})\b/gi
  );
  for (const m of cssVarMatches) {
    if (m[1]) bump(m[1], 18);
  }

  // 3. Inline <style> hex frequencies
  const styleBlocks = html.match(/<style[^>]*>[\s\S]*?<\/style>/gi) || [];
  const styleJoined = styleBlocks.join("\n").slice(0, 120_000);
  const hexMatches = styleJoined.matchAll(/#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b/g);
  for (const m of hexMatches) {
    if (m[0]) bump(m[0], 2);
  }

  // 4. Fallback scan of raw HTML for hex codes if inline <style> was sparse
  if (scores.size < 4) {
    const rawMatches = html.slice(0, 140_000).matchAll(/#([0-9a-fA-F]{6})\b/g);
    for (const m of rawMatches) {
      if (m[0]) bump(m[0], 1);
    }
  }

  const ranked = Array.from(scores.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([hex]) => hex);

  // Pick 4 visually distinct swatches (min Euclidean RGB distance >= 42)
  const picked: string[] = [];
  for (const hex of ranked) {
    if (picked.every((existing) => colorDistance(existing, hex) >= 42)) {
      picked.push(hex);
      if (picked.length === 4) break;
    }
  }

  const fallbacks = ["#1E293B", "#475569", "#94A3B8", "#0027eb"];
  for (const fb of fallbacks) {
    if (picked.length >= 4) break;
    if (picked.every((existing) => colorDistance(existing, fb) >= 35)) {
      picked.push(fb);
    }
  }

  return picked.slice(0, 4);
}
