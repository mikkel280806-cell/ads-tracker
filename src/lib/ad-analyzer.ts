import type { Ad } from "./types";
import { getActiveDays } from "./url-parser";

export interface LocalAdAnalysis {
  activeDays: number;
  scalingTier: "Scaling Winner" | "Proven" | "Testing";
  scalingReason: string;
  hook: string;
  hookCategory: string;
  funnelType: string;
  offers: string[];
  socialProof: string[];
  wordCount: number;
  copyStyle: "Short Punch" | "Mid-Form" | "Long-Form Story";
  hasBullets: boolean;
}

export interface LiveLandingPageAudit {
  url: string;
  finalUrl: string;
  httpStatus: number;
  responseMs: number;
  title?: string;
  h1?: string;
  description?: string;
  price?: string;
  currency?: string;
  funnelType: string;
  conversionSignals: string[];
}

export function classifyFunnelType(url?: string, path?: string): string {
  const full = `${url || ""} ${path || ""}`.toLowerCase();
  if (/\/(quiz|test|find-your|velg|vaelg)/i.test(full)) return "Quiz Funnel";
  if (
    /\/(blogs|articles|news|reasons|why-|listicle|advertorial|pages\/.*(reasons|why|vs|review|story|guide))/i.test(
      full
    )
  ) {
    return "Advertorial / Listicle";
  }
  if (/\/(bundle|pack|kit|offer|promo|deal|lp|landing|sale|tilbud|pakke)/i.test(full)) {
    return "Offer / Bundle LP";
  }
  if (/\/(products?|produkt|shop\/[^/]+|p\/)/i.test(full)) return "Product Page";
  if (/\/(collections?|kategori|category|shop\/?$)/i.test(full)) {
    return "Collection Page";
  }
  return "Homepage";
}

function uniqueClean(items: string[], max = 4): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of items) {
    const clean = raw.replace(/\s+/g, " ").trim();
    if (!clean) continue;
    const key = clean.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(clean);
    if (out.length >= max) break;
  }
  return out;
}

/**
 * 100% deterministic, zero-cost Trendtrack-style ad breakdown.
 * Runs instantly (0ms) with zero AI API keys.
 */
export function analyzeAdLocally(ad: Ad): LocalAdAnalysis {
  const activeDays = getActiveDays(ad.started_running_at);
  const dup = ad.duplicated_count || 1;
  const fullText = `${ad.headline || ""}\n${ad.primary_text || ""}\n${ad.link_description || ""}`;

  // 1. Scaling / Winner classification
  let scalingTier: LocalAdAnalysis["scalingTier"] = "Testing";
  let scalingReason = `${activeDays}d live`;
  if ((activeDays >= 30 && dup >= 2) || activeDays >= 60 || dup >= 6) {
    scalingTier = "Scaling Winner";
    scalingReason =
      dup > 1
        ? `${activeDays}d live · skaleret i ×${dup} aktive varianter`
        : `Kørt uafbrudt i ${activeDays} dage`;
  } else if (activeDays >= 14 || dup >= 3) {
    scalingTier = "Proven";
    scalingReason =
      dup > 1
        ? `${activeDays}d live · ×${dup} varianter`
        : `${activeDays}d kontinuerlig spend`;
  } else {
    scalingReason = `Ny test (${activeDays}d live)`;
  }

  // 2. Offer / Promo signals (DK + EN)
  const offerMatches: string[] = [];
  const pctMatch = fullText.match(
    /(?:spar|save|up to|op til|få|get)?\s*\d{1,2}\s*%\s*(?:off|rabat|discount)?/i
  );
  if (pctMatch?.[0] && /\d{1,2}\s*%/.test(pctMatch[0])) {
    offerMatches.push(pctMatch[0].trim());
  }
  if (/(gratis fragt|fri fragt|free shipping|free delivery)/i.test(fullText)) {
    offerMatches.push("Fri fragt");
  }
  if (
    /(dages?\s*(prøve|garanti|retur)|money[\s-]?back|day\s*(trial|guarantee|return)|tilfredshedsgaranti)/i.test(
      fullText
    )
  ) {
    offerMatches.push("Garanti / Prøveperiode");
  }
  if (/(bundle|pakketilbud|køb\s*\d|buy\s*\d\s*get|2\s*for\s*1|starter\s*kit)/i.test(fullText)) {
    offerMatches.push("Bundle / Mængderabat");
  }
  if (/(kode|code|rabatkode|kupon)\s*[:\-]?\s*[A-Z0-9]{3,16}/i.test(fullText)) {
    offerMatches.push("Rabatkode");
  }
  if (/(kun i dag|begrænset|limited|udsalg|sale ends|sidste chance|last chance)/i.test(fullText)) {
    offerMatches.push("Urgency / Tilbud");
  }

  // 3. Social Proof signals (DK + EN)
  const proofMatches: string[] = [];
  const countProof = fullText.match(
    /\b\d{1,3}(?:[.,]\d{3})*\+?\s*(?:k\b|million|tusind|kunder|customers|reviews|anmeldelser|solgte|sold|danskere|kvinder|mænd|people)/i
  );
  if (countProof?.[0]) {
    proofMatches.push(countProof[0].trim());
  }
  const starProof = fullText.match(
    /\b[45][.,]\d\s*(?:\/\s*5|★|⭐|stjerner|stars)/i
  );
  if (starProof?.[0]) {
    proofMatches.push(starProof[0].trim());
  }
  if (/trustpilot/i.test(fullText)) {
    proofMatches.push("Trustpilot");
  }
  if (/(bedst i test|#1\b|award|prisvindende|klinisk|clinically|dermatologist|læge)/i.test(fullText)) {
    proofMatches.push("Autoritet / Test");
  }

  // 4. Copy structure stats
  const body = (ad.primary_text || "").trim();
  const words = body ? body.split(/\s+/).filter(Boolean) : [];
  const wordCount = words.length;
  const copyStyle: LocalAdAnalysis["copyStyle"] =
    wordCount <= 28 ? "Short Punch" : wordCount <= 85 ? "Mid-Form" : "Long-Form Story";
  const hasBullets = /(?:^|\n)\s*(?:[-•✓✔✅👉🔹⚡*]|\d+\.)\s+/m.test(body);

  return {
    activeDays,
    scalingTier,
    scalingReason,
    hook: ad.extracted_hook || ad.headline || "",
    hookCategory: ad.hook_category || "Direct Benefit",
    funnelType: classifyFunnelType(ad.landing_page_url, ad.landing_page_path),
    offers: uniqueClean(offerMatches, 4),
    socialProof: uniqueClean(proofMatches, 3),
    wordCount,
    copyStyle,
    hasBullets,
  };
}
