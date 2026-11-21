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
