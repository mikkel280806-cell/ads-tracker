import type { Ad, SourceType } from "./types";

export interface ParsedAdLink {
  rawUrl: string;
  sourceType: SourceType;
  externalId?: string;
  handleGuess?: string;
  isValid: boolean;
}

/**
 * Recognizes Meta Ad Library links and Instagram Post/Reel links.
 */
export function parseAdLink(input: string): ParsedAdLink {
  const trimmed = input.trim();
  if (!trimmed) {
    return { rawUrl: "", sourceType: "manual", isValid: false };
  }

  let url: URL;
  try {
    url = new URL(trimmed.startsWith("http") ? trimmed : `https://${trimmed}`);
  } catch {
    return { rawUrl: trimmed, sourceType: "manual", isValid: false };
  }

  const host = url.hostname.toLowerCase();

  // Meta Ad Library: facebook.com/ads/library/?id=123456789
  if (host.includes("facebook.com") || host.includes("fb.com") || host.includes("meta.com")) {
    const adId = url.searchParams.get("id") || url.searchParams.get("view_all_page_id") || undefined;
    return {
      rawUrl: url.toString(),
      sourceType: "meta_ad_library",
      externalId: adId,
      isValid: true,
    };
  }

  // Instagram: instagram.com/reel/CODE or instagram.com/p/CODE or instagram.com/HANDLE/reel/CODE
  if (host.includes("instagram.com") || host.includes("instagr.am")) {
    const parts = url.pathname.split("/").filter(Boolean);
    const reelIdx = parts.findIndex((p) => p === "reel" || p === "reels" || p === "p" || p === "tv");
    const externalId = reelIdx >= 0 ? parts[reelIdx + 1] : undefined;
    const handleGuess = reelIdx === 1 ? parts[0] : undefined;

    return {
      rawUrl: url.toString(),
      sourceType: "instagram",
      externalId,
      handleGuess,
      isValid: true,
    };
  }

  return {
    rawUrl: url.toString(),
    sourceType: "manual",
    isValid: true,
  };
}

const DEFAULT_NOW_MS = Date.UTC(2026, 10, 21, 16, 0, 0);

export function getActiveDays(startedAt?: string, nowMs: number = DEFAULT_NOW_MS): number {
  if (!startedAt) return 1;
  const start = new Date(startedAt).getTime();
  if (Number.isNaN(start)) return 1;
  const diff = Math.max(1, Math.floor((nowMs - start) / (1000 * 60 * 60 * 24)));
  return diff;
}

export function formatReach(reach?: number): string {
  if (!reach) return "—";
  if (reach >= 1_000_000) return `${(reach / 1_000_000).toFixed(1).replace(".", ",")}M`;
  if (reach >= 1_000) return `${Math.round(reach / 1_000)}K`;
  return String(reach);
}

export function formatDuration(seconds?: number): string {
  if (!seconds) return "";
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

/**
 * Returns true ONLY for dedicated landing pages (listicles, advertorials, quizzes,
 * /pages/..., /lp/..., /offer/..., custom funnels) — excluding standard Homepages (/),
 * Product Pages (/products/...), Collection Pages (/collections/...), and Cart/Checkout.
 */
export function isDedicatedLandingPage(
  pathOrUrl?: string,
  fallbackUrl?: string
): boolean {
  let pathname = (pathOrUrl || "").trim();
  if (!pathname && fallbackUrl) {
    try {
      pathname = new URL(fallbackUrl).pathname;
    } catch {
      pathname = "";
    }
  } else if (pathname.startsWith("http")) {
    try {
      pathname = new URL(pathname).pathname;
    } catch {
      // keep as-is
    }
  }

  pathname = pathname.split("?")[0].split("#")[0].replace(/\/+$/, "").toLowerCase();

  // Strip optional leading locale segment (e.g. /en, /da, /en-us, /de-de, /fr-fr)
  pathname = pathname.replace(/^\/[a-z]{2}(?:-[a-z]{2})?(?=\/|$)/, "");

  if (!pathname || pathname === "/") return false;

  if (
    /^\/(products?|produkt(?:er)?|collections?|kategorier?|category|categories|shop|store|cart|checkout|account|search)(\/|$)/.test(
      pathname
    )
  ) {
    return false;
  }

  return true;
}

function normalizeMediaFingerprint(url?: string): string {
  if (!url) return "";
  try {
    const u = new URL(url);
    // Facebook/Instagram CDN URLs rotate query tokens (oh, oe, _nc_*) while pathname file ID stays stable
    return u.pathname.toLowerCase().replace(/\/+$/, "");
  } catch {
    return url.split("?")[0].toLowerCase().trim();
  }
}

/**
 * Deduplicates ads per brand by creative media fingerprint or identical copy+headline,
 * keeping the longest-running/richest ad and combining duplicated_count & saved folders.
 */
export function dedupeAds(ads: Ad[]): Ad[] {
  const byKey = new Map<string, Ad>();

  for (const ad of ads) {
    const mediaFp =
      normalizeMediaFingerprint(ad.media_url) ||
      normalizeMediaFingerprint(ad.thumbnail_url);
    const copyFp = `${(ad.headline || "").trim().toLowerCase()}|${(ad.primary_text || "")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, " ")
      .slice(0, 140)}`;

    const key = mediaFp
      ? `${ad.brand_id}|m|${mediaFp}`
      : copyFp.length > 5
        ? `${ad.brand_id}|c|${copyFp}`
        : ad.id;

    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, ad);
      continue;
    }

    const existingDays = getActiveDays(existing.started_running_at);
    const nextDays = getActiveDays(ad.started_running_at);
    const keepNext =
      nextDays > existingDays ||
      (!existing.ai_transcript && Boolean(ad.ai_transcript)) ||
      (!existing.media_url && Boolean(ad.media_url));

    const primary = keepNext ? ad : existing;
    const secondary = keepNext ? existing : ad;

    const mergedBoards = Array.from(
      new Set([...(primary.board_ids || []), ...(secondary.board_ids || [])])
    );
    const combinedCount =
      (primary.duplicated_count || 1) + (secondary.duplicated_count || 1);

    byKey.set(key, {
      ...primary,
      duplicated_count: combinedCount > 1 ? combinedCount : undefined,
      board_ids: mergedBoards,
      ai_transcript: primary.ai_transcript || secondary.ai_transcript,
      ai_hook_verbal: primary.ai_hook_verbal || secondary.ai_hook_verbal,
      user_notes: primary.user_notes || secondary.user_notes,
    });
  }

  return Array.from(byKey.values());
}

export function buildGeminiPrompt(ad: Ad): string {
  return [
    "Analyser denne e-commerce annonce som en senior performance creative strategist.",
    "Svar KUN med valid JSON i dette nøjagtige format, så jeg kan klistre det direkte ind i min Ads Tracker:",
    "",
    "{",
    '  "ai_hook_verbal": "De første 3 sekunders talte hook eller overskrift",',
    '  "ai_hook_visual": "Hvad der fanger øjet visuelt i de første 3 sekunder",',
    '  "ai_angle": "Fx Problem/Solution, Social Proof, Us vs. Them, Founder Story, Offer",',
    '  "ai_format": "Fx UGC Talking Head, Static Offer, B-Roll + Voiceover, Unboxing",',
    '  "ai_transcript": "Fuld transskription hvis video",',
    '  "ai_script_breakdown": {',
    '    "hook": "0-3s hook",',
    '    "body": "Problem + produktdemo",',
    '    "social_proof": "Bevis / anmeldelse / resultat",',
    '    "cta": "Afsluttende call to action"',
    "  },",
    '  "tags": ["tag1", "tag2", "tag3"]',
    "}",
    "",
    "--- ANNONCE DATA ---",
    `Brand: ${ad.brand_name} (${ad.brand_handle})`,
    `Kilde: ${ad.source_type === "meta_ad_library" ? "Meta Ad Library" : ad.source_type === "instagram" ? "Instagram" : "Manuel"}`,
    `Link: ${ad.source_url || "N/A"}`,
    `Format: ${ad.media_type}`,
    `Headline: ${ad.headline || "N/A"}`,
    `Annoncetekst: ${ad.primary_text || "N/A"}`,
    `CTA: ${ad.cta_text || "N/A"}`,
    `Landing page: ${ad.landing_page_url || "N/A"}`,
    ad.ai_transcript ? `Eksisterende transskription: ${ad.ai_transcript}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}
