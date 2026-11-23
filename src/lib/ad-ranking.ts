import type { Ad, Brand } from "./types";
import { getActiveDays, isDedicatedLandingPage } from "./url-parser";

export interface AdRankingMeta {
  adId: string;
  brandId: string;
  /** 1 = top performing ad within its brand (lower rank = better performing) */
  brandRank: number;
  /** Total deduplicated ads analyzed for this brand */
  brandTotalAds: number;
  /** Estimated (or verified EU) cumulative impressions */
  impressions: number;
  /** Estimated daily impressions velocity */
  dailyImpressions: number;
  /** Whether impressions come directly from Meta EU transparency or our multi-signal model */
  impressionsSource: "meta_eu" | "estimated";
  /** 0-100 intelligent copyability & winner score */
  winnerScore: number;
  /** Human-readable performance tier */
  tier: "Breakout Winner" | "Proven Winner" | "Top Performer" | "Active";
}

function stableHashUnit(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 1000) / 1000; // 0..0.999
}

function computeCreativeSignals(ad: Ad) {
  const days = Math.max(1, getActiveDays(ad.started_running_at));
  const dups = Math.max(1, ad.duplicated_count || 1);
  const isDco =
    ad.display_format === "DCO" ||
    (ad.primary_text || "").trim().length < 15;
  const hasSpokenScript = Boolean(ad.ai_transcript && ad.ai_transcript.trim().length > 20);
  const hasDedicatedLp = isDedicatedLandingPage(
    ad.landing_page_path,
    ad.landing_page_url
  );
  const isVideo = ad.media_type === "video";

  // 1. Scaling / Duplication multiplier (strongest real proxy for Meta ad spend)
  const scalingMult = 1 + 1.9 * Math.pow(dups - 1, 0.82);

  // 2. Survival / Longevity curve (rewards proven 14-180d winners, tapers ancient catalog zombies)
  let longevityMult: number;
  if (days <= 7) {
    longevityMult = 0.4 + days * 0.085;
  } else if (days <= 90) {
    longevityMult = 1.0 + Math.log1p(days - 6) * 0.85;
  } else if (days <= 300) {
    longevityMult = 4.78 + Math.log1p((days - 90) / 15) * 0.45;
  } else {
    longevityMult = 5.95 + Math.log1p((days - 300) / 60) * 0.15;
  }

  // 3. Breakout velocity bonus: freshly launched (4-35d) AND already scaling (dups >= 2)
  const isBreakout = days >= 3 && days <= 35 && dups >= 2;
  const breakoutMult = isBreakout ? 1.48 : 1.0;

  // 4. Copyability & Creative Craft multiplier (elevates ads worth modeling, penalizes automated DCO catalog tiles)
  let craftMult = 1.0;
  if (isDco) {
    craftMult = 0.42;
  } else if (isVideo && hasSpokenScript) {
    craftMult = 1.38;
  } else if (isVideo) {
    craftMult = 1.18;
  } else if ((ad.primary_text || "").trim().length >= 50) {
    craftMult = 1.12;
  }

  // 5. High-intent funnel signal (brands route heavy paid budget to dedicated LPs / listicles)
  const funnelMult = hasDedicatedLp ? 1.3 : 1.0;

  // Deterministic +/- 4% jitter for clean ordering without hydration instability
  const jitter = 0.96 + stableHashUnit(ad.id) * 0.08;

  const impressionWeight =
    scalingMult * longevityMult * breakoutMult * craftMult * funnelMult * jitter;

  return {
    days,
    dups,
    isDco,
    hasSpokenScript,
    hasDedicatedLp,
    isBreakout,
    impressionWeight,
  };
}

/**
 * Builds a complete, brand-relative Ad Rank & Impressions index for all ads.
 *
 * Within each brand, ads are ranked 1..N by impressions/performance ("the lower the rank,
 * the better the ad is performing"). Verified EU reach is used whenever present; otherwise
 * impressions are modeled from brand traffic scale, Pareto spend concentration, scaling
 * duplication velocity, longevity survival, dedicated funnel routing, and creative craft.
 */
export function buildAdRankIndex(
  ads: Ad[],
  brands: Brand[]
): Map<string, AdRankingMeta> {
  const brandById = new Map(brands.map((b) => [b.id, b]));
  const adsByBrand = new Map<string, Ad[]>();

  for (const ad of ads) {
    const list = adsByBrand.get(ad.brand_id);
    if (list) list.push(ad);
    else adsByBrand.set(ad.brand_id, [ad]);
  }

  const index = new Map<string, AdRankingMeta>();

  for (const [brandId, brandAds] of adsByBrand.entries()) {
    const brand = brandById.get(brandId);
    const monthlyVisits = Math.max(12_000, brand?.monthly_visits || 65_000);
    const liveAdsCount = Math.max(
      brandAds.length,
      brand?.active_ads_count || brandAds.length
    );

    // Estimate brand's monthly paid Meta impression pool from site traffic (~42% paid Meta, ~1.35% CTR)
    // Scaled gently by active ad velocity so mega-spenders reflect realistic volume
    const brandMonthlyImpressions = Math.min(
      85_000_000,
      Math.max(
        140_000,
        monthlyVisits * 28 + liveAdsCount * 4_200
      )
    );

    // Sampled ads represent the highest-impression slice of the account (Pareto top share)
    const sampledCoverage = Math.min(
      1,
      Math.pow(brandAds.length / Math.max(1, liveAdsCount), 0.38)
    );
    const sampledMonthlyPool = brandMonthlyImpressions * sampledCoverage;

    const evaluated = brandAds.map((ad) => {
      const sig = computeCreativeSignals(ad);
      return { ad, sig };
    });

    const totalWeight = evaluated.reduce(
      (sum, item) => sum + item.sig.impressionWeight,
      0
    );

    // Compute cumulative impressions per ad
    const withImpressions = evaluated.map(({ ad, sig }) => {
      const hasRealEu = typeof ad.eu_reach === "number" && ad.eu_reach > 0;
      let impressions: number;
      let impressionsSource: "meta_eu" | "estimated";

      if (hasRealEu) {
        impressions = Math.round(ad.eu_reach!);
        impressionsSource = "meta_eu";
      } else {
        const weightShare = sig.impressionWeight / Math.max(0.001, totalWeight);
        // Active duration factor (capped at 6 months of cumulative delivery)
        const durationMonths = Math.max(0.25, Math.min(6, sig.days / 30));
        const rawImp = sampledMonthlyPool * weightShare * durationMonths;
        // Round cleanly to human-friendly significant figures
        impressions = Math.max(1_200, Math.round(rawImp / 100) * 100);
        impressionsSource = "estimated";
      }

      const dailyImpressions = Math.max(
        100,
        Math.round(impressions / Math.max(1, sig.days))
      );

      return {
        ad,
        sig,
        impressions,
        dailyImpressions,
        impressionsSource,
      };
    });

    // Rank within brand: #1 = highest impressions / strongest copyable winner
    withImpressions.sort((a, b) => {
      const scoreA =
        Math.log10(a.impressions + 10) * 42 +
        Math.log10(a.dailyImpressions + 10) * 24 +
        (a.sig.isBreakout ? 14 : 0) +
        (a.sig.hasSpokenScript ? 8 : 0) +
        (a.sig.hasDedicatedLp ? 7 : 0) -
        (a.sig.isDco ? 22 : 0);
      const scoreB =
        Math.log10(b.impressions + 10) * 42 +
        Math.log10(b.dailyImpressions + 10) * 24 +
        (b.sig.isBreakout ? 14 : 0) +
        (b.sig.hasSpokenScript ? 8 : 0) +
        (b.sig.hasDedicatedLp ? 7 : 0) -
        (b.sig.isDco ? 22 : 0);
      return scoreB - scoreA || b.impressions - a.impressions;
    });

    const totalInBrand = withImpressions.length;
    withImpressions.forEach((item, idx) => {
      const brandRank = idx + 1;
      const percentile =
        totalInBrand > 1 ? 1 - idx / (totalInBrand - 1) : 1;

      // 0-100 composite score used for global Explore discovery
      const winnerScore = Math.round(
        Math.min(
          99,
          Math.max(
            18,
            percentile * 46 +
              Math.min(22, Math.log10(item.impressions + 10) * 3.4) +
              Math.min(14, Math.log1p(item.sig.dups - 1) * 7.5) +
              (item.sig.isBreakout ? 10 : 0) +
              (item.sig.hasSpokenScript ? 6 : 0) +
              (item.sig.hasDedicatedLp ? 5 : 0) -
              (item.sig.isDco ? 18 : 0)
          )
        )
      );

      let tier: AdRankingMeta["tier"] = "Active";
      if (item.sig.isBreakout && brandRank <= 5) {
        tier = "Breakout Winner";
      } else if (brandRank <= 3 || (item.sig.days >= 30 && item.sig.dups >= 2)) {
        tier = "Proven Winner";
      } else if (brandRank <= Math.max(5, Math.ceil(totalInBrand * 0.25))) {
        tier = "Top Performer";
      }

      index.set(item.ad.id, {
        adId: item.ad.id,
        brandId,
        brandRank,
        brandTotalAds: totalInBrand,
        impressions: item.impressions,
        dailyImpressions: item.dailyImpressions,
        impressionsSource: item.impressionsSource,
        winnerScore,
        tier,
      });
    });
  }

  return index;
}

/**
 * Globally orders Explore ads so the highest-performing, most copyable winners
 * across all brands surface first, with smooth per-brand diversity interleaving.
 */
export function sortAdsForExplore(
  ads: Ad[],
  rankIndex: Map<string, AdRankingMeta>,
  singleBrandMode: boolean
): Ad[] {
  const scored = ads
    .map((ad) => {
      const meta = rankIndex.get(ad.id);
      const brandRank = meta?.brandRank ?? 99;
      const winnerScore = meta?.winnerScore ?? 40;
      const impBonus = Math.log10((meta?.impressions || 1000) + 10) * 6;
      // Strong boost for #1, #2, #3 within each brand
      const rankBoost =
        brandRank === 1
          ? 26
          : brandRank === 2
            ? 18
            : brandRank === 3
              ? 12
              : Math.max(0, 10 - Math.log2(brandRank) * 2.5);
      return {
        ad,
        raw: winnerScore + impBonus + rankBoost,
        brandRank,
      };
    })
    .sort((a, b) => b.raw - a.raw || a.brandRank - b.brandRank);

  if (singleBrandMode) {
    return scored
      .sort((a, b) => a.brandRank - b.brandRank || b.raw - a.raw)
      .map((s) => s.ad);
  }

  // Smooth per-brand diversity interleaving so Explore showcases the #1-#2 winners from many brands first
  const seenPerBrand = new Map<string, number>();
  return scored
    .map((item) => {
      const depth = seenPerBrand.get(item.ad.brand_id) || 0;
      seenPerBrand.set(item.ad.brand_id, depth + 1);
      return {
        ad: item.ad,
        finalScore: item.raw - depth * 24,
      };
    })
    .sort((a, b) => b.finalScore - a.finalScore)
    .map((s) => s.ad);
}
