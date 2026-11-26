"use client";

import React, { useMemo, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import {
  ArrowRight,
  ArrowUpDown,
  Calendar,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ChevronUp,
  Coins,
  ExternalLink,
  Filter,
  Globe,
  HelpCircle,
  Image as ImageIcon,
  Layers,
  Minus,
  Plus,
  RotateCcw,
  Search,
  Settings,
  Star,
  Video,
  X,
} from "lucide-react";
import type { Ad } from "../lib/types";
import {
  type AdRankingMeta,
  sortAdsForExplore,
} from "../lib/ad-ranking";
import { summarizeAdAudience } from "../lib/audience-insights";
import { getActiveDays } from "../lib/url-parser";
import { FlakePopover } from "./ui/FlakeDropdown";
import {
  ATRIA_COUNTRIES,
  ATRIA_COUNTRY_QUICK_GROUPS,
  ATRIA_CTAS,
  ATRIA_INDUSTRY_TREE,
  ATRIA_LANGUAGES,
  ATRIA_THEMES,
  ATRIA_VISUAL_STYLES,
  AtriaCreateViewModal,
  AtriaFilterPill,
  AtriaGrowthFilterPopover,
  AtriaIndustryPopover,
  AtriaManageViewsModal,
  AtriaPopoverHeader,
  AtriaRangeFilterPopover,
  AtriaSearchCheckboxPopover,
  type GrowthFilterValue,
  type RangeFilterValue,
  type SavedCustomView,
} from "./AtriaFilterPrimitives";

/* ============================================================================
   PUBLIC TYPES & DEFAULTS
   ============================================================================ */

export type DiscoverySortOption =
  | "recommended"
  | "most_saved"
  | "most_recent"
  | "impressions"
  | "most_reach"
  | "longest_running";

export type CountryFilterState = "main" | "among" | "exclude";

export interface DiscoveryFiltersState {
  launchPreset: string | null;
  launchStartDate: string;
  launchEndDate: string;
  status: "all" | "active" | "inactive";
  daysRunning: RangeFilterValue;
  countries: Record<string, CountryFilterState>;
  age: RangeFilterValue;
  gender: "all" | "Male" | "Female";
  formats: Array<"Image" | "Video" | "Carousel">;
  videoLength: RangeFilterValue;
  industries: string[];
  platforms: string[];
  creativeReuse: RangeFilterValue;
  themes: string[];
  visualStyles: string[];
  ctas: string[];
  adCopyLength: RangeFilterValue;
  languages: string[];
  partnerAdsOnly: boolean;
  impressionRankTop: number | null;
  impressionRankMode: "percent" | "ads";
  impressionRankPeriod: "Current" | "All time";
  impressionGrowth: GrowthFilterValue;
  reach: RangeFilterValue;
  reachGrowth: GrowthFilterValue;
  adSpend: RangeFilterValue;
}

export const DEFAULT_DISCOVERY_FILTERS: DiscoveryFiltersState = {
  launchPreset: null,
  launchStartDate: "",
  launchEndDate: "",
  status: "all",
  daysRunning: { min: null, max: null },
  countries: {},
  age: { min: null, max: null },
  gender: "all",
  formats: [],
  videoLength: { min: null, max: null },
  industries: [],
  platforms: [],
  creativeReuse: { min: null, max: null },
  themes: [],
  visualStyles: [],
  ctas: [],
  adCopyLength: { min: null, max: null },
  languages: [],
  partnerAdsOnly: false,
  impressionRankTop: null,
  impressionRankMode: "percent",
  impressionRankPeriod: "Current",
  impressionGrowth: { direction: null, minPct: null, period: "7 days" },
  reach: { min: null, max: null, window: "All time" },
  reachGrowth: { direction: null, minPct: null, period: "7 days" },
  adSpend: { min: null, max: null, window: "All time" },
};

const DEFAULT_ASSUMED_CPM = 10;

const SORT_OPTIONS: Array<{
  value: DiscoverySortOption;
  label: string;
  sublabel?: string;
}> = [
  { value: "recommended", label: "Recommended" },
  { value: "most_saved", label: "Most saved" },
  { value: "most_recent", label: "Most recent" },
  { value: "impressions", label: "Impression", sublabel: "(Meta/TikTok ads)" },
  {
    value: "most_reach",
    label: "Most reach",
    sublabel: "(Meta/TikTok EU/UK ads)",
  },
  { value: "longest_running", label: "Longest running" },
];

const META_CHILD_PLATFORMS = [
  "Facebook",
  "Instagram",
  "Messenger",
  "Audience Network",
] as const;

/* ============================================================================
   FILTER COUNTING, MATCHING & SORTING HELPERS
   ============================================================================ */

export function countActiveDiscoveryFilters(f: DiscoveryFiltersState): number {
  let count = 0;
  if (f.launchPreset || f.launchStartDate || f.launchEndDate) count++;
  if (f.status !== "all") count++;
  if (f.daysRunning.min !== null || f.daysRunning.max !== null) count++;
  if (Object.keys(f.countries).length > 0) count++;
  if (f.age.min !== null || f.age.max !== null) count++;
  if (f.gender !== "all") count++;
  if (f.formats.length > 0) count++;
  if (f.videoLength.min !== null || f.videoLength.max !== null) count++;
  if (f.industries.length > 0) count++;
  if (f.platforms.length > 0) count++;
  if (f.creativeReuse.min !== null || f.creativeReuse.max !== null) count++;
  if (f.themes.length > 0) count++;
  if (f.visualStyles.length > 0) count++;
  if (f.ctas.length > 0) count++;
  if (f.adCopyLength.min !== null || f.adCopyLength.max !== null) count++;
  if (f.languages.length > 0) count++;
  if (f.partnerAdsOnly) count++;
  if (f.impressionRankTop !== null) count++;
  if (
    f.impressionGrowth.direction !== null ||
    f.impressionGrowth.minPct !== null
  ) {
    count++;
  }
  if (f.reach.min !== null || f.reach.max !== null) count++;
  if (f.reachGrowth.direction !== null || f.reachGrowth.minPct !== null) {
    count++;
  }
  if (f.adSpend.min !== null || f.adSpend.max !== null) count++;
  return count;
}

function parseAgeBandBounds(ageRange: string): [number, number] | null {
  if (ageRange.includes("+")) {
    const low = parseInt(ageRange.replace("+", ""), 10);
    return Number.isFinite(low) ? [low, 100] : null;
  }
  const parts = ageRange.split("-").map((p) => parseInt(p.trim(), 10));
  if (parts.length === 2 && Number.isFinite(parts[0]) && Number.isFinite(parts[1])) {
    return [parts[0], parts[1]];
  }
  return null;
}

function normalizeIndustryTokens(input: string): string[] {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .split(" ")
    .filter((w) => w.length >= 3 && w !== "and" && w !== "the");
}

function matchesIndustrySelection(
  brandCategory: string,
  ad: Ad,
  selectedIndustries: string[]
): boolean {
  const haystack = [
    brandCategory,
    ...(ad.tags || []),
    ad.brand_name,
    ad.headline,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (!haystack) return false;

  for (const sel of selectedIndustries) {
    const selLower = sel.toLowerCase();
    if (haystack.includes(selLower)) return true;

    const parentEntry = ATRIA_INDUSTRY_TREE.find(
      (p) => p.name.toLowerCase() === selLower
    );
    if (parentEntry) {
      if (
        parentEntry.children.some((c) => haystack.includes(c.toLowerCase()))
      ) {
        return true;
      }
    }

    const tokens = normalizeIndustryTokens(sel);
    if (tokens.some((tok) => haystack.includes(tok))) {
      return true;
    }
  }
  return false;
}

function matchesThemeSelection(ad: Ad, selectedThemes: string[]): boolean {
  const haystack = [
    ad.ai_angle,
    ad.hook_category,
    ad.ai_format,
    ad.ai_hook_verbal,
    ad.headline,
    ad.primary_text,
    ...(ad.tags || []),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  const themeKeywordMap: Record<string, RegExp> = {
    "before & after": /before|after|før|efter|transform|result/,
    "problem & solution": /problem|solution|løsning|fix|stop|tired of|træt af/,
    "promotion/discount": /% off|discount|sale|rabat|tilbud|save|spar|code|promo/,
    "social proof": /review|stars|customers|kunder|anmeld|trustpilot|loved by|sold/,
    testimonial: /testimonial|review|i tried|changed my|love this|best/,
    ugc: /ugc|talking head|creator|tiktok|unboxing|selfie|review/,
    "us vs them": /vs\.?|unlike|other brands|instead of|compare/,
    comparison: /compare|vs\.?|better than|difference|sammenlign/,
    scarcity: /limited|selling fast|almost gone|stock|hurry|ends soon|få på lager/,
    "founder's story": /founder|started|story|why we built|our mission/,
    unboxing: /unbox|inside the box|package|first look/,
    "features/benefits": /feature|benefit|designed|built|made with|comfort|quality/,
    question: /\?|ever wondered|did you know|why do|har du/,
    statistics: /\d+%|studies show|clinically|tested|proven/,
    "x reasons why": /\d+\s*(reasons|grunde|ting|ways)/,
    meme: /meme|pov:|when you/,
    quote: /"|“|”|said/,
    "case study": /case study|how [a-z]+ achieved|results in/,
    announcement: /introducing|new arrival|just dropped|launch|nyhed/,
    showcase: /showcase|discover|meet the|shop the|collection/,
  };

  for (const theme of selectedThemes) {
    const lower = theme.toLowerCase();
    if (haystack.includes(lower)) return true;
    const mapped = themeKeywordMap[lower];
    if (mapped && mapped.test(haystack)) return true;
    const tokens = normalizeIndustryTokens(theme);
    if (tokens.length > 0 && tokens.every((t) => haystack.includes(t))) {
      return true;
    }
  }
  return false;
}

function detectAdLanguages(ad: Ad): string[] {
  const txt = `${ad.primary_text || ""} ${ad.headline || ""}`.toLowerCase();
  const detected: string[] = [];

  if (
    /[æøå]/.test(txt) ||
    /\b(og|med|til|fra|på|det|den|ikke|få|køb|rabat|fri fragt)\b/.test(txt)
  ) {
    detected.push("Danish (dansk)");
  }
  if (
    /[äöüß]/.test(txt) ||
    /\b(und|für|mit|jetzt|kaufen|kostenlos|nicht|dein)\b/.test(txt)
  ) {
    detected.push("German (Deutsch)");
  }
  if (/\b(och|för|med|köp|frakt|rabatt|inte|dina)\b/.test(txt)) {
    detected.push("Swedish (svenska)");
  }
  if (/\b(et|pour|avec|livraison|achetez|votre|découvrez)\b/.test(txt)) {
    detected.push("French (français)");
  }
  if (/\b(para|con|envío|compra|ahora|descubre|tu)\b/.test(txt)) {
    detected.push("Spanish (español)");
  }
  if (/\b(voor|met|gratis|verzending|koop|nu|jouw)\b/.test(txt)) {
    detected.push("Dutch (Nederlands)");
  }
  if (
    /\b(the|and|your|with|shop|free|shipping|get|save|now|for|you)\b/.test(txt)
  ) {
    detected.push("English");
  }

  if (detected.length === 0) {
    if (ad.market === "DK") detected.push("Danish (dansk)");
    else detected.push("English");
  }

  return detected;
}

function computeDerivedGrowthPct(
  ad: Ad,
  rankMeta: AdRankingMeta | undefined
): number {
  const days = getActiveDays(ad.started_running_at);
  const dups = Math.max(1, ad.duplicated_count || 1);
  if (!ad.is_active) {
    return -Math.min(85, 25 + Math.round(days * 0.25));
  }
  if (days <= 30 && dups >= 2) {
    return Math.min(240, 35 + dups * 28 + (rankMeta?.winnerScore || 50) * 0.5);
  }
  if (rankMeta && rankMeta.winnerScore >= 70) {
    return Math.round(15 + (rankMeta.winnerScore - 65) * 1.8);
  }
  if (days > 120 && dups === 1) {
    return -Math.min(50, Math.round((days - 100) * 0.18));
  }
  return Math.round((dups - 1) * 14 + (rankMeta ? (rankMeta.winnerScore - 50) * 0.6 : 0));
}

function resolveWindowedMetric(
  totalValue: number,
  activeDays: number,
  window?: string
): number {
  const days = Math.max(1, activeDays);
  if (!window || window === "All time") return totalValue;
  if (window === "Today") return Math.round(totalValue / days);
  if (window === "7d avg") {
    return Math.round((totalValue / days) * Math.min(7, days));
  }
  if (window === "30d avg") {
    return Math.round((totalValue / days) * Math.min(30, days));
  }
  return totalValue;
}

export function matchesDiscoveryFilters(
  ad: Ad,
  filters: DiscoveryFiltersState,
  brandCategoryMap: Map<string, string>,
  rankMeta: AdRankingMeta | undefined,
  assumedCpm: number
): boolean {
  const activeDays = getActiveDays(ad.started_running_at);

  // 1. Status
  if (filters.status === "active" && !ad.is_active) return false;
  if (filters.status === "inactive" && ad.is_active) return false;

  // 2. Launch time (preset or explicit start/end dates)
  if (filters.launchPreset) {
    const presetDaysMap: Record<string, number> = {
      last_7: 7,
      last_30: 30,
      last_90: 90,
      last_180: 180,
      last_365: 365,
    };
    const presetLimit = presetDaysMap[filters.launchPreset];
    if (presetLimit !== undefined) {
      if (activeDays > presetLimit) return false;
    }
  }
  if (filters.launchStartDate || filters.launchEndDate) {
    const adTime = new Date(ad.started_running_at || ad.created_at).getTime();
    if (Number.isNaN(adTime)) return false;
    if (filters.launchStartDate) {
      const startMs = new Date(`${filters.launchStartDate}T00:00:00Z`).getTime();
      if (!Number.isNaN(startMs) && adTime < startMs) return false;
    }
    if (filters.launchEndDate) {
      const endMs = new Date(`${filters.launchEndDate}T23:59:59Z`).getTime();
      if (!Number.isNaN(endMs) && adTime > endMs) return false;
    }
  }

  // 3. Days running
  if (filters.daysRunning.min !== null && activeDays < filters.daysRunning.min) {
    return false;
  }
  if (filters.daysRunning.max !== null && activeDays > filters.daysRunning.max) {
    return false;
  }

  // Compute audience summary lazily only when needed
  const needsAudience =
    Object.keys(filters.countries).length > 0 ||
    filters.age.min !== null ||
    filters.age.max !== null ||
    filters.gender !== "all";
  const audienceSummary = needsAudience ? summarizeAdAudience(ad) : null;

  // 4. Countries (main / among / exclude)
  const countryEntries = Object.entries(filters.countries);
  if (countryEntries.length > 0) {
    const adCodes: string[] = [];
    if (audienceSummary && audienceSummary.countries.length > 0) {
      for (const c of audienceSummary.countries) {
        adCodes.push(c.code.toUpperCase());
      }
    } else if (Array.isArray(ad.targeted_countries) && ad.targeted_countries.length > 0) {
      for (const c of ad.targeted_countries) {
        adCodes.push(c.toUpperCase());
      }
    } else if (ad.market && ad.market !== "EU" && ad.market !== "GLOBAL") {
      adCodes.push(ad.market.toUpperCase());
    }

    const mainWanted = countryEntries
      .filter(([, st]) => st === "main")
      .map(([code]) => code.toUpperCase());
    const amongWanted = countryEntries
      .filter(([, st]) => st === "among")
      .map(([code]) => code.toUpperCase());
    const excluded = countryEntries
      .filter(([, st]) => st === "exclude")
      .map(([code]) => code.toUpperCase());

    if (excluded.length > 0 && adCodes.some((c) => excluded.includes(c))) {
      return false;
    }
    if (mainWanted.length > 0) {
      const primaryCode = adCodes[0];
      if (!primaryCode || !mainWanted.includes(primaryCode)) return false;
    }
    if (amongWanted.length > 0) {
      if (!adCodes.some((c) => amongWanted.includes(c))) return false;
    }
  }

  // 5. Age range
  if (filters.age.min !== null || filters.age.max !== null) {
    let adMinAge: number | null =
      typeof ad.age_min === "number" ? ad.age_min : null;
    let adMaxAge: number | null =
      typeof ad.age_max === "number" ? ad.age_max : null;

    if (
      (adMinAge === null || adMaxAge === null) &&
      audienceSummary &&
      audienceSummary.hasBreakdown
    ) {
      const significant = audienceSummary.ageBands.filter((b) => b.pct >= 12);
      const pool =
        significant.length > 0
          ? significant
          : audienceSummary.ageBands.filter((b) => b.total > 0);
      for (const b of pool) {
        const bounds = parseAgeBandBounds(b.ageRange);
        if (!bounds) continue;
        adMinAge = adMinAge === null ? bounds[0] : Math.min(adMinAge, bounds[0]);
        adMaxAge = adMaxAge === null ? bounds[1] : Math.max(adMaxAge, bounds[1]);
      }
    }

    if (adMinAge === null && adMaxAge === null) return false;
    const effMin = adMinAge ?? 13;
    const effMax = adMaxAge ?? 100;
    if (filters.age.min !== null && effMax < filters.age.min) return false;
    if (filters.age.max !== null && effMin > filters.age.max) return false;
  }

  // 6. Gender
  if (filters.gender !== "all") {
    const gRaw = (ad.gender_audience || "").toLowerCase();
    if (filters.gender === "Female") {
      const isFemale =
        audienceSummary?.dominantGender === "Women" ||
        (audienceSummary?.femalePct ?? 0) >= 55 ||
        gRaw.includes("women") ||
        gRaw.includes("female");
      if (!isFemale) return false;
    } else if (filters.gender === "Male") {
      const isMale =
        audienceSummary?.dominantGender === "Men" ||
        (audienceSummary?.malePct ?? 0) >= 55 ||
        ((gRaw.includes("men") || gRaw.includes("male")) &&
          !gRaw.includes("women") &&
          !gRaw.includes("female"));
      if (!isMale) return false;
    }
  }

  // 7. Format
  if (filters.formats.length > 0) {
    const isCarousel =
      ad.media_type === "carousel" ||
      ad.display_format === "CAROUSEL" ||
      (Array.isArray(ad.carousel_cards) && ad.carousel_cards.length > 1);
    const isVideo = ad.media_type === "video" || ad.display_format === "VIDEO";
    const isImage = !isCarousel && !isVideo;

    const matched = filters.formats.some((fmt) => {
      if (fmt === "Video") return isVideo;
      if (fmt === "Carousel") return isCarousel;
      return isImage;
    });
    if (!matched) return false;
  }

  // 8. Video length
  if (filters.videoLength.min !== null || filters.videoLength.max !== null) {
    if (ad.media_type !== "video") return false;
    const dur = ad.duration_seconds;
    if (typeof dur !== "number" || dur <= 0) return false;
    if (filters.videoLength.min !== null && dur < filters.videoLength.min) {
      return false;
    }
    if (filters.videoLength.max !== null && dur > filters.videoLength.max) {
      return false;
    }
  }

  // 9. Industries
  if (filters.industries.length > 0) {
    const brandCategory = brandCategoryMap.get(ad.brand_id) || "";
    if (!matchesIndustrySelection(brandCategory, ad, filters.industries)) {
      return false;
    }
  }

  // 10. Platforms
  if (filters.platforms.length > 0) {
    const adPlatforms = (ad.platforms || []).map((p) => p.toLowerCase());
    const matched = filters.platforms.some((sel) => {
      const selLow = sel.toLowerCase();
      return adPlatforms.some(
        (ap) => ap === selLow || ap.includes(selLow) || selLow.includes(ap)
      );
    });
    if (!matched) return false;
  }

  // 11. Creative reuse
  if (filters.creativeReuse.min !== null || filters.creativeReuse.max !== null) {
    const reuseCount = Math.max(1, ad.duplicated_count || 1);
    if (
      filters.creativeReuse.min !== null &&
      reuseCount < filters.creativeReuse.min
    ) {
      return false;
    }
    if (
      filters.creativeReuse.max !== null &&
      reuseCount > filters.creativeReuse.max
    ) {
      return false;
    }
  }

  // 12. Themes
  if (filters.themes.length > 0) {
    if (!matchesThemeSelection(ad, filters.themes)) return false;
  }

  // 13. Visual styles (Video only)
  if (filters.visualStyles.length > 0) {
    if (ad.media_type !== "video") return false;
    const styleHaystack = [
      ad.ai_format,
      ad.ai_hook_visual,
      ...(ad.tags || []),
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    const matched = filters.visualStyles.some((st) => {
      const tokens = normalizeIndustryTokens(st);
      return (
        styleHaystack.includes(st.toLowerCase()) ||
        tokens.some((t) => styleHaystack.includes(t))
      );
    });
    if (!matched) return false;
  }

  // 14. CTA
  if (filters.ctas.length > 0) {
    const adCta = (ad.cta_text || "").trim().toLowerCase();
    const knownCtas = new Set(
      ATRIA_CTAS.filter((c) => c !== "No button" && c !== "Others").map((c) =>
        c.toLowerCase()
      )
    );
    const matched = filters.ctas.some((sel) => {
      if (sel === "No button") return !adCta;
      if (sel === "Others") return Boolean(adCta) && !knownCtas.has(adCta);
      const selLow = sel.toLowerCase();
      return adCta === selLow || adCta.includes(selLow);
    });
    if (!matched) return false;
  }

  // 15. Ad copy length
  if (filters.adCopyLength.min !== null || filters.adCopyLength.max !== null) {
    const len = (ad.primary_text || "").trim().length;
    if (filters.adCopyLength.min !== null && len < filters.adCopyLength.min) {
      return false;
    }
    if (filters.adCopyLength.max !== null && len > filters.adCopyLength.max) {
      return false;
    }
  }

  // 16. Language
  if (filters.languages.length > 0) {
    const adLangs = detectAdLanguages(ad);
    if (!filters.languages.some((lang) => adLangs.includes(lang))) {
      return false;
    }
  }

  // 17. Partner ads only
  if (filters.partnerAdsOnly) {
    const hasDistinctPayer = Boolean(
      ad.payer_name &&
        ad.payer_name.trim() &&
        ad.payer_name.toLowerCase() !== (ad.brand_name || "").toLowerCase()
    );
    const hasPartnerSignal =
      hasDistinctPayer ||
      /partnership|paid partnership|collab|creator/i.test(
        `${ad.primary_text || ""} ${(ad.tags || []).join(" ")}`
      );
    if (!hasPartnerSignal) return false;
  }

  // 18. Impression rank
  if (filters.impressionRankTop !== null) {
    if (!rankMeta) return false;
    if (filters.impressionRankMode === "percent") {
      const pct = (rankMeta.brandRank / Math.max(1, rankMeta.brandTotalAds)) * 100;
      if (pct > filters.impressionRankTop && rankMeta.brandRank > 1) {
        return false;
      }
    } else {
      if (rankMeta.brandRank > filters.impressionRankTop) return false;
    }
  }

  // 19. Impression growth
  if (
    filters.impressionGrowth.direction !== null ||
    filters.impressionGrowth.minPct !== null
  ) {
    const growthPct = computeDerivedGrowthPct(ad, rankMeta);
    const minReq = filters.impressionGrowth.minPct ?? 0;
    if (filters.impressionGrowth.direction === "falling") {
      if (growthPct >= 0 || Math.abs(growthPct) < minReq) return false;
    } else {
      if (growthPct < minReq || growthPct <= 0) return false;
    }
  }

  // 20. Reach
  if (filters.reach.min !== null || filters.reach.max !== null) {
    const rawReach = typeof ad.eu_reach === "number" ? ad.eu_reach : 0;
    const reachVal = resolveWindowedMetric(
      rawReach,
      activeDays,
      filters.reach.window
    );
    if (filters.reach.min !== null && reachVal < filters.reach.min) {
      return false;
    }
    if (filters.reach.max !== null && reachVal > filters.reach.max) {
      return false;
    }
  }

  // 21. Reach growth
  if (
    filters.reachGrowth.direction !== null ||
    filters.reachGrowth.minPct !== null
  ) {
    if (!ad.eu_reach || ad.eu_reach <= 0) return false;
    const growthPct = computeDerivedGrowthPct(ad, rankMeta);
    const minReq = filters.reachGrowth.minPct ?? 0;
    if (filters.reachGrowth.direction === "falling") {
      if (growthPct >= 0 || Math.abs(growthPct) < minReq) return false;
    } else {
      if (growthPct < minReq || growthPct <= 0) return false;
    }
  }

  // 22. Ad spend
  if (filters.adSpend.min !== null || filters.adSpend.max !== null) {
    const totalSpend = ((ad.eu_reach || 0) / 1000) * assumedCpm;
    const spendVal = resolveWindowedMetric(
      totalSpend,
      activeDays,
      filters.adSpend.window
    );
    if (filters.adSpend.min !== null && spendVal < filters.adSpend.min) {
      return false;
    }
    if (filters.adSpend.max !== null && spendVal > filters.adSpend.max) {
      return false;
    }
  }

  return true;
}

export function sortDiscoveryAds(
  ads: Ad[],
  sortBy: DiscoverySortOption,
  adRankIndex: Map<string, AdRankingMeta>
): Ad[] {
  if (sortBy === "recommended") {
    return sortAdsForExplore(ads, adRankIndex, false);
  }

  const copy = [...ads];

  if (sortBy === "most_saved") {
    return copy.sort((a, b) => {
      const scoreA =
        (a.board_ids?.length || 0) * 3 +
        (a.is_favorite ? 4 : 0) +
        (a.duplicated_count || 1);
      const scoreB =
        (b.board_ids?.length || 0) * 3 +
        (b.is_favorite ? 4 : 0) +
        (b.duplicated_count || 1);
      if (scoreB !== scoreA) return scoreB - scoreA;
      return (
        (adRankIndex.get(b.id)?.winnerScore ?? 0) -
        (adRankIndex.get(a.id)?.winnerScore ?? 0)
      );
    });
  }

  if (sortBy === "most_recent") {
    return copy.sort((a, b) => {
      const tA = new Date(a.started_running_at || a.created_at).getTime() || 0;
      const tB = new Date(b.started_running_at || b.created_at).getTime() || 0;
      return tB - tA;
    });
  }

  if (sortBy === "impressions") {
    return copy.sort((a, b) => {
      const impA = adRankIndex.get(a.id)?.impressions ?? a.eu_reach ?? 0;
      const impB = adRankIndex.get(b.id)?.impressions ?? b.eu_reach ?? 0;
      return impB - impA;
    });
  }

  if (sortBy === "most_reach") {
    return copy.sort((a, b) => {
      const rA = a.eu_reach ?? 0;
      const rB = b.eu_reach ?? 0;
      if (rB !== rA) return rB - rA;
      return (
        (adRankIndex.get(b.id)?.impressions ?? 0) -
        (adRankIndex.get(a.id)?.impressions ?? 0)
      );
    });
  }

  if (sortBy === "longest_running") {
    return copy.sort(
      (a, b) =>
        getActiveDays(b.started_running_at) -
        getActiveDays(a.started_running_at)
    );
  }

  return copy;
}

/* ============================================================================
   SAVED VIEWS STORE (HYDRATION-SAFE LOCALSTORAGE VIA useSyncExternalStore)
   ============================================================================ */

interface StoredDiscoveryView extends SavedCustomView {
  sortBy: DiscoverySortOption;
  filters: DiscoveryFiltersState;
}

const VIEWS_STORAGE_KEY = "flake_discovery_custom_views_v1";
const EMPTY_VIEWS: StoredDiscoveryView[] = [];
let cachedRawViews: string | null = null;
let cachedParsedViews: StoredDiscoveryView[] = EMPTY_VIEWS;
const viewListeners = new Set<() => void>();

function subscribeCustomViews(listener: () => void) {
  viewListeners.add(listener);
  return () => {
    viewListeners.delete(listener);
  };
}

function getCustomViewsSnapshot(): StoredDiscoveryView[] {
  if (typeof window === "undefined") return EMPTY_VIEWS;
  try {
    const raw = window.localStorage.getItem(VIEWS_STORAGE_KEY);
    if (raw === cachedRawViews) return cachedParsedViews;
    cachedRawViews = raw;
    if (!raw) {
      cachedParsedViews = EMPTY_VIEWS;
      return cachedParsedViews;
    }
    const parsed = JSON.parse(raw);
    cachedParsedViews = Array.isArray(parsed) ? parsed : EMPTY_VIEWS;
    return cachedParsedViews;
  } catch {
    return EMPTY_VIEWS;
  }
}

function getServerViewsSnapshot(): StoredDiscoveryView[] {
  return EMPTY_VIEWS;
}

function writeCustomViews(next: StoredDiscoveryView[]) {
  if (typeof window === "undefined") return;
  try {
    const serialized = JSON.stringify(next);
    window.localStorage.setItem(VIEWS_STORAGE_KEY, serialized);
    cachedRawViews = serialized;
    cachedParsedViews = next;
  } catch {
    // ignore storage quota errors
  }
  viewListeners.forEach((fn) => fn());
}

/* ============================================================================
   SMALL DISPLAY HELPERS
   ============================================================================ */

function formatCompactNumber(val: number): string {
  if (val >= 1_000_000) {
    return `${(val / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  }
  if (val >= 1_000) {
    return `${(val / 1_000).toFixed(1).replace(/\.0$/, "")}K`;
  }
  return String(val);
}

function formatRangeBadge(
  r: RangeFilterValue,
  unit = "",
  prefix = ""
): string | null {
  if (r.min === null && r.max === null) return null;
  const fmt = (n: number) => `${prefix}${formatCompactNumber(n)}${unit}`;
  if (r.min !== null && r.max !== null) {
    if (r.min === r.max) return fmt(r.min);
    return `${fmt(r.min)}–${fmt(r.max)}`;
  }
  if (r.min !== null) return `≥${fmt(r.min)}`;
  return `≤${fmt(r.max!)}`;
}

function formatGrowthBadge(g: GrowthFilterValue): string | null {
  if (!g.direction && g.minPct === null) return null;
  const dir = g.direction === "falling" ? "Falling" : "Rising";
  if (g.minPct !== null) return `${dir} ≥${g.minPct}%`;
  return dir;
}

function formatShortIsoDate(iso: string): string {
  if (!iso) return "";
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  return `${months[m - 1]} ${d}`;
}

function toIsoDate(year: number, monthIndex: number, day: number): string {
  const m = String(monthIndex + 1).padStart(2, "0");
  const d = String(day).padStart(2, "0");
  return `${year}-${m}-${d}`;
}

function buildActiveSummaryBadges(f: DiscoveryFiltersState): string[] {
  const badges: string[] = [];
  if (f.launchPreset) {
    const labelMap: Record<string, string> = {
      last_7: "Last 7 days",
      last_30: "Last 30 days",
      last_90: "Last 90 days",
      last_180: "Last 180 days",
      last_365: "Last 365 days",
    };
    badges.push(`Launch: ${labelMap[f.launchPreset] || f.launchPreset}`);
  } else if (f.launchStartDate || f.launchEndDate) {
    badges.push(
      `Launch: ${formatShortIsoDate(f.launchStartDate) || "Any"} – ${formatShortIsoDate(f.launchEndDate) || "Now"}`
    );
  }
  if (f.status !== "all") badges.push(`Status: ${f.status}`);
  const dr = formatRangeBadge(f.daysRunning, "d");
  if (dr) badges.push(`Days: ${dr}`);
  const countryKeys = Object.keys(f.countries);
  if (countryKeys.length > 0) badges.push(`Countries: ${countryKeys.length}`);
  const ageB = formatRangeBadge(f.age);
  if (ageB) badges.push(`Age: ${ageB}`);
  if (f.gender !== "all") badges.push(`Gender: ${f.gender}`);
  if (f.formats.length > 0) badges.push(`Format: ${f.formats.join(", ")}`);
  const vl = formatRangeBadge(f.videoLength, "s");
  if (vl) badges.push(`Video: ${vl}`);
  if (f.industries.length > 0) badges.push(`Industry: ${f.industries.length}`);
  if (f.platforms.length > 0) badges.push(`Platform: ${f.platforms.length}`);
  const cr = formatRangeBadge(f.creativeReuse);
  if (cr) badges.push(`Reuse: ${cr}`);
  if (f.themes.length > 0) badges.push(`Theme: ${f.themes.length}`);
  if (f.visualStyles.length > 0) badges.push(`Style: ${f.visualStyles.length}`);
  if (f.ctas.length > 0) badges.push(`CTA: ${f.ctas.length}`);
  const acl = formatRangeBadge(f.adCopyLength);
  if (acl) badges.push(`Copy: ${acl}`);
  if (f.languages.length > 0) badges.push(`Lang: ${f.languages.length}`);
  if (f.partnerAdsOnly) badges.push("Partner ads");
  if (f.impressionRankTop !== null) {
    badges.push(
      f.impressionRankMode === "percent"
        ? `Top ${f.impressionRankTop}%`
        : `Top ${f.impressionRankTop} ads`
    );
  }
  const ig = formatGrowthBadge(f.impressionGrowth);
  if (ig) badges.push(`Imp growth: ${ig}`);
  const rch = formatRangeBadge(f.reach);
  if (rch) badges.push(`Reach: ${rch}`);
  const rg = formatGrowthBadge(f.reachGrowth);
  if (rg) badges.push(`Reach growth: ${rg}`);
  const sp = formatRangeBadge(f.adSpend, "", "$");
  if (sp) badges.push(`Spend: ${sp}`);
  return badges;
}

/* ============================================================================
   FILTER 1: LAUNCH TIME (DUAL-PANE DATE RANGE PICKER)
   ============================================================================ */

const LAUNCH_QUICK_PRESETS = [
  { id: "last_7", label: "Last 7 days" },
  { id: "last_30", label: "Last 30 days" },
  { id: "last_90", label: "Last 90 days" },
  { id: "last_180", label: "Last 180 days" },
  { id: "last_365", label: "Last 365 days" },
] as const;

const RECENT_MONTH_PRESETS = [
  { label: "November 2026", start: "2026-11-01", end: "2026-11-30" },
  { label: "October 2026", start: "2026-10-01", end: "2026-10-31" },
  { label: "September 2026", start: "2026-09-01", end: "2026-09-30" },
  { label: "August 2026", start: "2026-08-01", end: "2026-08-31" },
  { label: "July 2026", start: "2026-07-01", end: "2026-07-31" },
  { label: "June 2026", start: "2026-06-01", end: "2026-06-30" },
];

const QUARTER_PRESETS = [
  { label: "Q4 2026", start: "2026-10-01", end: "2026-12-31" },
  { label: "Q3 2026", start: "2026-07-01", end: "2026-09-30" },
  { label: "Q2 2026", start: "2026-04-01", end: "2026-06-30" },
  { label: "Q1 2026", start: "2026-01-01", end: "2026-03-31" },
];

const YEAR_PRESETS = [
  { label: "2026", start: "2026-01-01", end: "2026-12-31" },
  { label: "2025", start: "2025-01-01", end: "2025-12-31" },
  { label: "2024", start: "2024-01-01", end: "2024-12-31" },
];

const SEASONAL_PRESETS = [
  { label: "New Year", start: "2026-01-01", end: "2026-01-15" },
  { label: "Valentine's Day", start: "2026-02-01", end: "2026-02-14" },
  { label: "Spring Launch", start: "2026-03-15", end: "2026-04-15" },
  { label: "Summer Sale", start: "2026-06-15", end: "2026-07-15" },
  { label: "Back to School", start: "2026-08-01", end: "2026-09-05" },
  { label: "Holiday Season", start: "2026-12-01", end: "2026-12-26" },
];

const SHORT_MONTH_NAMES = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

function formatLongIsoDate(iso: string): string {
  if (!iso) return "";
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  return `${SHORT_MONTH_NAMES[m - 1]} ${d}, ${y}`;
}

function getTodayIso(): string {
  const now = new Date();
  return toIsoDate(now.getFullYear(), now.getMonth(), now.getDate());
}

const WEEKDAY_HEADERS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

function CalendarMonthGrid({
  year,
  month,
  startDate,
  endDate,
  todayIso,
  onSelectIso,
}: {
  year: number;
  month: number;
  startDate: string;
  endDate: string;
  todayIso: string;
  onSelectIso: (iso: string) => void;
}) {
  const firstDayOfWeek = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const prevMonthDays = new Date(year, month, 0).getDate();
  const prevMonthYear = month === 0 ? year - 1 : year;
  const prevMonthIdx = month === 0 ? 11 : month - 1;
  const nextMonthYear = month === 11 ? year + 1 : year;
  const nextMonthIdx = month === 11 ? 0 : month + 1;

  const cells: Array<{
    day: number;
    iso: string;
    outside: boolean;
  }> = [];

  for (let i = firstDayOfWeek - 1; i >= 0; i--) {
    const d = prevMonthDays - i;
    cells.push({
      day: d,
      iso: toIsoDate(prevMonthYear, prevMonthIdx, d),
      outside: true,
    });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({
      day: d,
      iso: toIsoDate(year, month, d),
      outside: false,
    });
  }
  let trailingDay = 1;
  while (cells.length < 42) {
    cells.push({
      day: trailingDay,
      iso: toIsoDate(nextMonthYear, nextMonthIdx, trailingDay),
      outside: true,
    });
    trailingDay++;
  }

  return (
    <div className="w-full">
      <div className="mb-2 grid grid-cols-7 text-center text-[12.5px] font-medium text-[#0F172A]">
        {WEEKDAY_HEADERS.map((wd) => (
          <span key={wd} className="py-1">
            {wd}
          </span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-y-1 text-center">
        {cells.map((cell) => {
          const isFuture = cell.iso > todayIso;
          const isToday = !cell.outside && cell.iso === todayIso;
          const isStart = !cell.outside && startDate === cell.iso;
          const isEnd = !cell.outside && endDate === cell.iso;
          const isInRange =
            !cell.outside &&
            Boolean(startDate) &&
            Boolean(endDate) &&
            cell.iso > startDate &&
            cell.iso < endDate;

          return (
            <button
              key={cell.iso}
              type="button"
              data-no-glass="true"
              disabled={isFuture}
              onClick={() => {
                if (!isFuture) onSelectIso(cell.iso);
              }}
              className={`mx-auto flex h-8 w-8 items-center justify-center font-mono-num text-[12.5px] transition-colors ${
                isStart || isEnd
                  ? "rounded-lg bg-[#0027eb] font-semibold text-white"
                  : isInRange
                    ? "w-full rounded-none bg-[#EEF2FF] font-medium text-[#0F172A]"
                    : isToday
                      ? "rounded-lg border border-[#0027eb] font-medium text-[#0F172A] hover:bg-[#EEF2FF]/60"
                      : isFuture
                        ? "w-full cursor-not-allowed rounded-none bg-[#F3F4F6] text-[#B4BAC5]"
                        : cell.outside
                          ? "rounded-lg text-[#B4BAC5] hover:bg-[#F7F8FB]"
                          : "rounded-lg text-[#0F172A] hover:bg-[#F1F5F9]"
              }`}
            >
              {cell.day}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function LaunchTimeFilter({
  open,
  onOpenChange,
  filters,
  onChange,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  filters: DiscoveryFiltersState;
  onChange: (patch: Partial<DiscoveryFiltersState>) => void;
}) {
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const todayIso = useMemo(() => getTodayIso(), []);
  const [viewYear, setViewYear] = useState(() => {
    const now = new Date();
    const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    return prev.getFullYear();
  });
  const [viewMonth, setViewMonth] = useState(() => {
    const now = new Date();
    const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    return prev.getMonth();
  });
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);

  const hasValue = Boolean(
    filters.launchPreset || filters.launchStartDate || filters.launchEndDate
  );

  const activeLabel = useMemo(() => {
    if (filters.launchPreset) {
      const found = LAUNCH_QUICK_PRESETS.find(
        (p) => p.id === filters.launchPreset
      );
      return found ? found.label : filters.launchPreset;
    }
    if (filters.launchStartDate && filters.launchEndDate) {
      return `${formatShortIsoDate(filters.launchStartDate)}–${formatShortIsoDate(filters.launchEndDate)}`;
    }
    if (filters.launchStartDate) {
      return `From ${formatShortIsoDate(filters.launchStartDate)}`;
    }
    if (filters.launchEndDate) {
      return `Until ${formatShortIsoDate(filters.launchEndDate)}`;
    }
    return null;
  }, [filters.launchPreset, filters.launchStartDate, filters.launchEndDate]);

  const nextMonthYear = viewMonth === 11 ? viewYear + 1 : viewYear;
  const nextMonthIndex = (viewMonth + 1) % 12;

  const shiftMonths = (delta: number) => {
    const d = new Date(viewYear, viewMonth + delta, 1);
    setViewYear(d.getFullYear());
    setViewMonth(d.getMonth());
  };

  const handleDayClick = (iso: string) => {
    if (
      !filters.launchStartDate ||
      (filters.launchStartDate && filters.launchEndDate)
    ) {
      onChange({
        launchPreset: null,
        launchStartDate: iso,
        launchEndDate: "",
      });
    } else if (iso < filters.launchStartDate) {
      onChange({
        launchPreset: null,
        launchStartDate: iso,
        launchEndDate: filters.launchStartDate,
      });
    } else {
      onChange({
        launchPreset: null,
        launchEndDate: iso,
      });
    }
  };

  const applyDateSpan = (label: string, start: string, end: string) => {
    onChange({
      launchPreset: label,
      launchStartDate: start,
      launchEndDate: end,
    });
    const [sy, sm] = start.split("-").map(Number);
    if (sy && sm) {
      setViewYear(sy);
      setViewMonth(sm - 1);
    }
  };

  const collapsibleGroups = [
    { id: "months", title: "Recent months", items: RECENT_MONTH_PRESETS },
    { id: "quarters", title: "Quarters", items: QUARTER_PRESETS },
    { id: "years", title: "Years", items: YEAR_PRESETS },
    {
      id: "seasonal",
      title: "Seasonal events 🎉",
      items: SEASONAL_PRESETS,
    },
  ];

  return (
    <>
      <AtriaFilterPill
        label="Launch time"
        activeLabel={activeLabel}
        active={hasValue}
        open={open}
        onToggle={() => onOpenChange(!open)}
        triggerRef={triggerRef}
      />
      <FlakePopover
        open={open}
        onOpenChange={onOpenChange}
        anchorRef={triggerRef}
        align="left"
        width={716}
        maxHeight={500}
      >
        {/* Top Header Bar: Title + Subtitle left | Single Range Box + Clear right */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#EEF0F4] px-6 py-4">
          <div className="min-w-0">
            <h4 className="font-display text-[15px] font-bold tracking-[-0.01em] text-[#0F172A]">
              Launch time
            </h4>
            <p className="mt-0.5 text-[12.5px] text-[#64748B]">
              Show ads that were live between the selected time range
            </p>
          </div>

          <div className="flex items-center gap-3.5">
            <div className="flex h-9 min-w-[274px] items-center rounded-lg border border-[#D8DDE6] bg-white px-3 text-[13px]">
              <span
                className={`min-w-[84px] ${
                  filters.launchStartDate
                    ? "font-medium text-[#475569]"
                    : "text-[#9CA3AF]"
                }`}
              >
                {filters.launchStartDate
                  ? formatLongIsoDate(filters.launchStartDate)
                  : "Start date"}
              </span>
              <span className="mx-3 text-[#9CA3AF]">→</span>
              <span
                className={`min-w-[84px] ${
                  filters.launchEndDate
                    ? "font-medium text-[#475569]"
                    : "text-[#9CA3AF]"
                }`}
              >
                {filters.launchEndDate
                  ? formatLongIsoDate(filters.launchEndDate)
                  : "End date"}
              </span>
              <Calendar className="ml-auto h-4 w-4 shrink-0 text-[#9CA3AF]" />
            </div>

            <button
              type="button"
              data-no-glass="true"
              onClick={() =>
                onChange({
                  launchPreset: null,
                  launchStartDate: "",
                  launchEndDate: "",
                })
              }
              className={`text-[13px] font-medium transition-colors ${
                hasValue
                  ? "text-[#0F172A] hover:text-[#475569]"
                  : "text-[#9CA3AF] hover:text-[#64748B]"
              }`}
            >
              Clear
            </button>
          </div>
        </div>

        {/* Dual-Pane Body */}
        <div className="grid grid-cols-[204px_1fr] divide-x divide-[#EEF0F4]">
          {/* Left Preset Sidebar */}
          <div className="workspace-scroll max-h-[385px] overflow-y-auto px-4 py-3">
            <div className="space-y-0.5">
              {LAUNCH_QUICK_PRESETS.map((preset) => {
                const active = filters.launchPreset === preset.id;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    data-no-glass="true"
                    onClick={() =>
                      onChange({
                        launchPreset: active ? null : preset.id,
                        launchStartDate: "",
                        launchEndDate: "",
                      })
                    }
                    className={`flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-[13.5px] transition-colors ${
                      active
                        ? "bg-[#EFEFF2] font-semibold text-[#0F172A]"
                        : "font-normal text-[#0F172A] hover:bg-[#F7F8FB]"
                    }`}
                  >
                    <span>{preset.label}</span>
                    {active && <Check className="h-3.5 w-3.5 text-[#0F172A]" />}
                  </button>
                );
              })}
            </div>

            <div className="my-2.5 border-t border-[#EEF0F4]" />

            <div className="space-y-0.5">
              {collapsibleGroups.map((grp) => {
                const isOpen = expandedGroup === grp.id;
                return (
                  <div key={grp.id}>
                    <button
                      type="button"
                      data-no-glass="true"
                      onClick={() =>
                        setExpandedGroup(isOpen ? null : grp.id)
                      }
                      className="flex w-full items-center gap-2 rounded-lg px-1.5 py-2 text-left text-[13.5px] font-normal text-[#334155] transition-colors hover:bg-[#F7F8FB] hover:text-[#0F172A]"
                    >
                      <span className="inline-block w-3 text-center text-[10px] text-[#64748B]">
                        {isOpen ? "▾" : "▸"}
                      </span>
                      <span>{grp.title}</span>
                    </button>
                    {isOpen && (
                      <div className="ml-4 mt-0.5 space-y-0.5 border-l border-[#E6E9F0] pl-2.5">
                        {grp.items.map((item) => {
                          const isSelected =
                            filters.launchStartDate === item.start &&
                            filters.launchEndDate === item.end;
                          return (
                            <button
                              key={item.label}
                              type="button"
                              data-no-glass="true"
                              onClick={() =>
                                applyDateSpan(item.label, item.start, item.end)
                              }
                              className={`block w-full rounded-md px-2 py-1.5 text-left text-[12.5px] transition-colors ${
                                isSelected
                                  ? "bg-[#EFEFF2] font-semibold text-[#0F172A]"
                                  : "text-[#475569] hover:bg-[#F7F8FB] hover:text-[#0F172A]"
                              }`}
                            >
                              {item.label}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Dual-Month Calendar */}
          <div className="px-5 py-3">
            {/* Dual Month Nav Bar */}
            <div className="mb-3 flex items-center justify-between border-b border-[#EEF0F4] pb-3">
              <div className="flex items-center gap-0.5">
                <button
                  type="button"
                  data-no-glass="true"
                  onClick={() => shiftMonths(-12)}
                  aria-label="Previous year"
                  className="flex h-7 w-7 items-center justify-center rounded-md text-[#64748B] transition-colors hover:bg-[#F3F5F9] hover:text-[#0F172A]"
                >
                  <ChevronsLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  data-no-glass="true"
                  onClick={() => shiftMonths(-1)}
                  aria-label="Previous month"
                  className="flex h-7 w-7 items-center justify-center rounded-md text-[#64748B] transition-colors hover:bg-[#F3F5F9] hover:text-[#0F172A]"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
              </div>

              <div className="grid flex-1 grid-cols-2 gap-6 text-center text-[14px] font-bold text-[#0F172A]">
                <span>
                  {SHORT_MONTH_NAMES[viewMonth]} {viewYear}
                </span>
                <span>
                  {SHORT_MONTH_NAMES[nextMonthIndex]} {nextMonthYear}
                </span>
              </div>

              <div className="flex items-center gap-0.5">
                <button
                  type="button"
                  data-no-glass="true"
                  onClick={() => shiftMonths(1)}
                  aria-label="Next month"
                  className="flex h-7 w-7 items-center justify-center rounded-md text-[#64748B] transition-colors hover:bg-[#F3F5F9] hover:text-[#0F172A]"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  data-no-glass="true"
                  onClick={() => shiftMonths(12)}
                  aria-label="Next year"
                  className="flex h-7 w-7 items-center justify-center rounded-md text-[#64748B] transition-colors hover:bg-[#F3F5F9] hover:text-[#0F172A]"
                >
                  <ChevronsRight className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <CalendarMonthGrid
                year={viewYear}
                month={viewMonth}
                startDate={filters.launchStartDate}
                endDate={filters.launchEndDate}
                todayIso={todayIso}
                onSelectIso={handleDayClick}
              />
              <CalendarMonthGrid
                year={nextMonthYear}
                month={nextMonthIndex}
                startDate={filters.launchStartDate}
                endDate={filters.launchEndDate}
                todayIso={todayIso}
                onSelectIso={handleDayClick}
              />
            </div>
          </div>
        </div>
      </FlakePopover>
    </>
  );
}

/* ============================================================================
   FILTER 2: STATUS
   ============================================================================ */

function StatusFilter({
  open,
  onOpenChange,
  value,
  onChange,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  value: "all" | "active" | "inactive";
  onChange: (next: "all" | "active" | "inactive") => void;
}) {
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const activeLabel =
    value === "active" ? "Active" : value === "inactive" ? "Inactive" : null;

  return (
    <>
      <AtriaFilterPill
        label="Status"
        activeLabel={activeLabel}
        active={value !== "all"}
        open={open}
        onToggle={() => onOpenChange(!open)}
        triggerRef={triggerRef}
      />
      <FlakePopover
        open={open}
        onOpenChange={onOpenChange}
        anchorRef={triggerRef}
        align="left"
        width={284}
      >
        <AtriaPopoverHeader
          title="Status"
          subtitle="Filter by ad delivery status"
          hasValue={value !== "all"}
          onClear={() => onChange("all")}
        />
        <div className="grid grid-cols-2 gap-2 px-5 pb-5 pt-2.5">
          {(
            [
              { id: "active", label: "Active" },
              { id: "inactive", label: "Inactive" },
            ] as const
          ).map((opt) => {
            const active = value === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                data-no-glass="true"
                onClick={() => onChange(active ? "all" : opt.id)}
                className={`flex items-center justify-center rounded-full border py-2 text-[13px] transition-colors ${
                  active
                    ? "border-transparent bg-[#EFEFF2] font-semibold text-[#0F172A]"
                    : "border-[#D8DDE6] bg-white font-medium text-[#0F172A] hover:border-[#CBD5E1] hover:bg-[#F7F8FB]"
                }`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </FlakePopover>
    </>
  );
}

/* ============================================================================
   FILTER 4: COUNTRY (3-STATE MATRIX: MAIN / AMONG / EXCLUDE)
   ============================================================================ */

function CountryFilter({
  open,
  onOpenChange,
  value,
  onChange,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  value: Record<string, CountryFilterState>;
  onChange: (next: Record<string, CountryFilterState>) => void;
}) {
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const [query, setQuery] = useState("");

  const selectedKeys = Object.keys(value);
  const activeLabel =
    selectedKeys.length === 0
      ? null
      : selectedKeys.length === 1
        ? selectedKeys[0]
        : `${selectedKeys[0]} +${selectedKeys.length - 1}`;

  const filteredCountries = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return ATRIA_COUNTRIES;
    return ATRIA_COUNTRIES.filter(
      (c) =>
        c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q)
    );
  }, [query]);

  const setCountryState = (code: string, state: CountryFilterState) => {
    const next = { ...value };
    if (next[code] === state) {
      delete next[code];
    } else {
      next[code] = state;
    }
    onChange(next);
  };

  const applyQuickGroup = (regionId: "na" | "top_eu" | "eu_uk" | "english") => {
    const matchingCodes = ATRIA_COUNTRIES.filter((c) =>
      c.regions.includes(regionId)
    ).map((c) => c.code);
    const allAlreadySelected = matchingCodes.every((c) => value[c] === "among");
    const next = { ...value };
    if (allAlreadySelected) {
      for (const c of matchingCodes) delete next[c];
    } else {
      for (const c of matchingCodes) next[c] = "among";
    }
    onChange(next);
  };

  return (
    <>
      <AtriaFilterPill
        label="Country"
        activeLabel={activeLabel}
        active={selectedKeys.length > 0}
        open={open}
        onToggle={() => onOpenChange(!open)}
        triggerRef={triggerRef}
      />
      <FlakePopover
        open={open}
        onOpenChange={onOpenChange}
        anchorRef={triggerRef}
        align="left"
        width={420}
        maxHeight={500}
      >
        <AtriaPopoverHeader
          title="Country"
          subtitle="Filter by primary target country, included markets, or exclusions"
          hasValue={selectedKeys.length > 0}
          onClear={() => onChange({})}
        />

        {/* Search */}
        <div className="border-b border-[#F1F4F9] p-2.5">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#94A3B8]" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search for countries"
              className="w-full rounded-lg border border-[#E2E6EF] bg-[#FAFBFD] py-1.5 pl-8 pr-2.5 text-[12px] text-[#0F172A] outline-none placeholder:text-[#94A3B8] focus:border-[#0027eb] focus:bg-white"
            />
          </div>
        </div>

        {/* Matrix Header */}
        <div className="grid grid-cols-[1fr_54px_54px_54px] items-center border-b border-[#F1F4F9] bg-[#FAFBFD] px-3 py-1.5 text-[10.5px] font-semibold uppercase tracking-wide text-[#64748B]">
          <span>Country</span>
          <span className="text-center">Main</span>
          <span className="text-center">Among</span>
          <span className="text-center">Exclude</span>
        </div>

        {/* Country Rows */}
        <div className="workspace-scroll max-h-[240px] overflow-y-auto px-2 py-1">
          {filteredCountries.map((c) => {
            const state = value[c.code];
            return (
              <div
                key={c.code}
                className="grid grid-cols-[1fr_54px_54px_54px] items-center rounded-lg px-1.5 py-1.5 text-[12px] hover:bg-[#F7F8FB]"
              >
                <div className="flex min-w-0 items-center gap-2">
                  <span className="text-sm leading-none">{c.flag}</span>
                  <span className="truncate font-medium text-[#1E293B]">
                    {c.name}
                  </span>
                </div>

                {/* Main (Star) */}
                <div className="flex justify-center">
                  <button
                    type="button"
                    data-no-glass="true"
                    aria-label={`Set ${c.name} as Main`}
                    onClick={() => setCountryState(c.code, "main")}
                    className={`flex h-6 w-6 items-center justify-center rounded-md border transition-colors ${
                      state === "main"
                        ? "border-[#0027eb] bg-[#EEF2FF] text-[#0027eb]"
                        : "border-[#E2E6EF] bg-white text-[#94A3B8] hover:border-[#CBD5E1] hover:text-[#475569]"
                    }`}
                  >
                    <Star
                      className={`h-3 w-3 ${
                        state === "main" ? "fill-[#0027eb]" : ""
                      }`}
                    />
                  </button>
                </div>

                {/* Among (Check) */}
                <div className="flex justify-center">
                  <button
                    type="button"
                    data-no-glass="true"
                    aria-label={`Include ${c.name}`}
                    onClick={() => setCountryState(c.code, "among")}
                    className={`flex h-6 w-6 items-center justify-center rounded-md border transition-colors ${
                      state === "among"
                        ? "border-[#0027eb] bg-[#0027eb] text-white"
                        : "border-[#E2E6EF] bg-white text-[#94A3B8] hover:border-[#CBD5E1] hover:text-[#475569]"
                    }`}
                  >
                    <Check className="h-3 w-3 stroke-[2.5]" />
                  </button>
                </div>

                {/* Exclude (X) */}
                <div className="flex justify-center">
                  <button
                    type="button"
                    data-no-glass="true"
                    aria-label={`Exclude ${c.name}`}
                    onClick={() => setCountryState(c.code, "exclude")}
                    className={`flex h-6 w-6 items-center justify-center rounded-md border transition-colors ${
                      state === "exclude"
                        ? "border-[#0F172A] bg-[#0F172A] text-white"
                        : "border-[#E2E6EF] bg-white text-[#94A3B8] hover:border-[#CBD5E1] hover:text-[#475569]"
                    }`}
                  >
                    <X className="h-3 w-3 stroke-[2.5]" />
                  </button>
                </div>
              </div>
            );
          })}

          {filteredCountries.length === 0 && (
            <p className="py-5 text-center text-xs text-[#94A3B8]">
              No countries found
            </p>
          )}
        </div>

        {/* Quick Select Region Pills */}
        <div className="border-t border-[#F1F4F9] bg-[#FAFBFD] px-3 py-2.5">
          <p className="mb-1.5 text-[11px] font-medium text-[#64748B]">
            Quick select
          </p>
          <div className="flex flex-wrap gap-1.5">
            {ATRIA_COUNTRY_QUICK_GROUPS.map((grp) => {
              const codes = ATRIA_COUNTRIES.filter((c) =>
                c.regions.includes(grp.id)
              ).map((c) => c.code);
              const allActive =
                codes.length > 0 && codes.every((c) => value[c] === "among");
              return (
                <button
                  key={grp.id}
                  type="button"
                  data-no-glass="true"
                  onClick={() => applyQuickGroup(grp.id)}
                  className={`rounded-md border px-2 py-1 text-[11px] font-medium transition-colors ${
                    allActive
                      ? "border-[#0027eb] bg-[#EEF2FF] text-[#0027eb]"
                      : "border-[#E2E6EF] bg-white text-[#334155] hover:border-[#CBD5E1] hover:bg-[#F7F8FB]"
                  }`}
                >
                  {grp.label} ({grp.count})
                </button>
              );
            })}
          </div>
        </div>
      </FlakePopover>
    </>
  );
}

/* ============================================================================
   FILTER 6: GENDER
   ============================================================================ */

function GenderFilter({
  open,
  onOpenChange,
  value,
  onChange,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  value: "all" | "Male" | "Female";
  onChange: (next: "all" | "Male" | "Female") => void;
}) {
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  return (
    <>
      <AtriaFilterPill
        label="Gender"
        activeLabel={value === "all" ? null : value}
        active={value !== "all"}
        open={open}
        onToggle={() => onOpenChange(!open)}
        triggerRef={triggerRef}
      />
      <FlakePopover
        open={open}
        onOpenChange={onOpenChange}
        anchorRef={triggerRef}
        align="left"
        width={220}
      >
        <AtriaPopoverHeader
          title="Gender"
          subtitle="Filter by dominant audience gender"
          hasValue={value !== "all"}
          onClear={() => onChange("all")}
        />
        <div className="space-y-1 p-2">
          {(
            [
              { id: "Male", label: "Male only" },
              { id: "Female", label: "Female only" },
            ] as const
          ).map((opt) => {
            const active = value === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                data-no-glass="true"
                onClick={() => onChange(active ? "all" : opt.id)}
                className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-[12.5px] transition-colors ${
                  active
                    ? "bg-[#EFEFF2] font-semibold text-[#0F172A]"
                    : "font-medium text-[#334155] hover:bg-[#F7F8FB]"
                }`}
              >
                <span>{opt.label}</span>
                {active && <Check className="h-3.5 w-3.5 text-[#0F172A]" />}
              </button>
            );
          })}
        </div>
      </FlakePopover>
    </>
  );
}

/* ============================================================================
   FILTER 7: FORMAT
   ============================================================================ */

function FormatFilter({
  open,
  onOpenChange,
  value,
  onChange,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  value: Array<"Image" | "Video" | "Carousel">;
  onChange: (next: Array<"Image" | "Video" | "Carousel">) => void;
}) {
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const activeLabel =
    value.length === 0
      ? null
      : value.length === 1
        ? value[0]
        : `${value.length} selected`;

  const toggle = (fmt: "Image" | "Video" | "Carousel") => {
    if (value.includes(fmt)) onChange(value.filter((x) => x !== fmt));
    else onChange([...value, fmt]);
  };

  return (
    <>
      <AtriaFilterPill
        label="Format"
        activeLabel={activeLabel}
        active={value.length > 0}
        open={open}
        onToggle={() => onOpenChange(!open)}
        triggerRef={triggerRef}
      />
      <FlakePopover
        open={open}
        onOpenChange={onOpenChange}
        anchorRef={triggerRef}
        align="left"
        width={300}
      >
        <AtriaPopoverHeader
          title="Format"
          subtitle="Select one or more creative formats"
          hasValue={value.length > 0}
          onClear={() => onChange([])}
        />
        <div className="grid grid-cols-3 gap-2 p-3">
          {(
            [
              { id: "Image", label: "Image", icon: ImageIcon },
              { id: "Video", label: "Video", icon: Video },
              { id: "Carousel", label: "Carousel", icon: Layers },
            ] as const
          ).map((opt) => {
            const Icon = opt.icon;
            const active = value.includes(opt.id);
            return (
              <button
                key={opt.id}
                type="button"
                data-no-glass="true"
                onClick={() => toggle(opt.id)}
                className={`flex flex-col items-center justify-center gap-1.5 rounded-xl border py-3 text-[12px] font-semibold transition-colors ${
                  active
                    ? "border-transparent bg-[#EFEFF2] text-[#0F172A]"
                    : "border-[#D8DDE6] bg-white text-[#334155] hover:border-[#CBD5E1] hover:bg-[#F7F8FB]"
                }`}
              >
                <Icon className="h-4 w-4 text-[#475569]" />
                <span>{opt.label}</span>
              </button>
            );
          })}
        </div>
      </FlakePopover>
    </>
  );
}

/* ============================================================================
   FILTER 10: PLATFORM (NESTED META + TIKTOK)
   ============================================================================ */

function PlatformFilter({
  open,
  onOpenChange,
  value,
  onChange,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  value: string[];
  onChange: (next: string[]) => void;
}) {
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const allMetaChecked = META_CHILD_PLATFORMS.every((p) => value.includes(p));
  const someMetaChecked =
    !allMetaChecked && META_CHILD_PLATFORMS.some((p) => value.includes(p));

  const activeLabel =
    value.length === 0
      ? null
      : value.length === 1
        ? value[0]
        : `${value.length} platforms`;

  const toggleSingle = (platform: string) => {
    if (value.includes(platform)) onChange(value.filter((p) => p !== platform));
    else onChange([...value, platform]);
  };

  const toggleMetaGroup = () => {
    if (allMetaChecked) {
      onChange(
        value.filter(
          (p) =>
            !(META_CHILD_PLATFORMS as readonly string[]).includes(p)
        )
      );
    } else {
      onChange(Array.from(new Set([...value, ...META_CHILD_PLATFORMS])));
    }
  };

  return (
    <>
      <AtriaFilterPill
        label="Platform"
        activeLabel={activeLabel}
        active={value.length > 0}
        open={open}
        onToggle={() => onOpenChange(!open)}
        triggerRef={triggerRef}
      />
      <FlakePopover
        open={open}
        onOpenChange={onOpenChange}
        anchorRef={triggerRef}
        align="left"
        width={268}
      >
        <AtriaPopoverHeader
          title="Platform"
          subtitle="Filter by ad placement networks"
          hasValue={value.length > 0}
          onClear={() => onChange([])}
        />
        <div className="space-y-1 p-2.5">
          {/* Meta Parent */}
          <button
            type="button"
            data-no-glass="true"
            onClick={toggleMetaGroup}
            className="flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left text-[12.5px] font-semibold text-[#0F172A] hover:bg-[#F7F8FB]"
          >
            <span
              className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors ${
                allMetaChecked || someMetaChecked
                  ? "border-[#0027eb] bg-[#0027eb] text-white"
                  : "border-[#CBD5E1] bg-white"
              }`}
            >
              {allMetaChecked && <Check className="h-3 w-3 stroke-[3]" />}
              {someMetaChecked && <Minus className="h-3 w-3 stroke-[3]" />}
            </span>
            <span>Meta</span>
          </button>

          {/* Meta Children */}
          <div className="ml-5 space-y-0.5 border-l border-[#ECEFF5] pl-2.5">
            {META_CHILD_PLATFORMS.map((child) => {
              const checked = value.includes(child);
              return (
                <button
                  key={child}
                  type="button"
                  data-no-glass="true"
                  onClick={() => toggleSingle(child)}
                  className="flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left text-[12px] text-[#334155] hover:bg-[#F7F8FB]"
                >
                  <span
                    className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors ${
                      checked
                        ? "border-[#0027eb] bg-[#0027eb] text-white"
                        : "border-[#CBD5E1] bg-white"
                    }`}
                  >
                    {checked && <Check className="h-3 w-3 stroke-[3]" />}
                  </span>
                  <span>{child}</span>
                </button>
              );
            })}
          </div>

          <div className="my-1.5 border-t border-[#F1F4F9]" />

          {/* TikTok */}
          <button
            type="button"
            data-no-glass="true"
            onClick={() => toggleSingle("TikTok")}
            className="flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left text-[12.5px] font-semibold text-[#0F172A] hover:bg-[#F7F8FB]"
          >
            <span
              className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors ${
                value.includes("TikTok")
                  ? "border-[#0027eb] bg-[#0027eb] text-white"
                  : "border-[#CBD5E1] bg-white"
              }`}
            >
              {value.includes("TikTok") && (
                <Check className="h-3 w-3 stroke-[3]" />
              )}
            </span>
            <span>TikTok</span>
          </button>
        </div>
      </FlakePopover>
    </>
  );
}

/* ============================================================================
   FILTER 17: PARTNER ADS
   ============================================================================ */

function PartnerAdsFilter({
  open,
  onOpenChange,
  value,
  onChange,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  value: boolean;
  onChange: (next: boolean) => void;
}) {
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  return (
    <>
      <AtriaFilterPill
        label="Partner ads"
        activeLabel={value ? "Only" : null}
        active={value}
        open={open}
        onToggle={() => onOpenChange(!open)}
        triggerRef={triggerRef}
      />
      <FlakePopover
        open={open}
        onOpenChange={onOpenChange}
        anchorRef={triggerRef}
        align="left"
        width={290}
      >
        <AtriaPopoverHeader
          title="Partner ads"
          hasValue={value}
          onClear={() => onChange(false)}
        />
        <div className="space-y-2.5 p-4">
          <div className="flex items-center justify-between gap-3">
            <span className="text-[13px] font-semibold text-[#0F172A]">
              Only partner ads
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={value}
              data-no-glass="true"
              onClick={() => onChange(!value)}
              className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${
                value ? "bg-[#0027eb]" : "bg-[#CBD5E1]"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-xs transition-transform ${
                  value ? "translate-x-[18px]" : "translate-x-[2px]"
                }`}
              />
            </button>
          </div>
          <p className="text-[11.5px] leading-relaxed text-[#64748B]">
            Show only creator-whitelisted and paid partnership ads running
            through partner handles.
          </p>
        </div>
      </FlakePopover>
    </>
  );
}

/* ============================================================================
   FILTER 18: IMPRESSION RANK
   ============================================================================ */

function ImpressionRankFilter({
  open,
  onOpenChange,
  top,
  mode,
  period,
  onChange,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  top: number | null;
  mode: "percent" | "ads";
  period: "Current" | "All time";
  onChange: (patch: Partial<DiscoveryFiltersState>) => void;
}) {
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const hasValue = top !== null;
  const activeLabel =
    top === null
      ? null
      : mode === "percent"
        ? `Top ${top}%`
        : `Top ${top} ads`;

  const maxSlider = mode === "percent" ? 100 : 50;
  const sliderVal = top ?? maxSlider;
  const ticks =
    mode === "percent" ? ["1%", "25%", "50%", "All"] : ["1", "10", "25", "All"];

  return (
    <>
      <AtriaFilterPill
        label="Impression rank"
        activeLabel={activeLabel}
        active={hasValue}
        open={open}
        onToggle={() => onOpenChange(!open)}
        triggerRef={triggerRef}
      />
      <FlakePopover
        open={open}
        onOpenChange={onOpenChange}
        anchorRef={triggerRef}
        align="left"
        width={344}
      >
        <AtriaPopoverHeader
          title="Impression rank"
          subtitle="Filter to top-performing ads within each advertiser"
          hasValue={hasValue}
          onClear={() =>
            onChange({
              impressionRankTop: null,
              impressionRankMode: "percent",
              impressionRankPeriod: "Current",
            })
          }
        />

        <div className="space-y-3.5 p-4">
          {/* Inline Top [All] [Percent | Ads] */}
          <div className="flex items-center gap-2">
            <span className="text-[12px] font-medium text-[#475569]">Top</span>
            <input
              type="number"
              min={1}
              max={mode === "percent" ? 100 : 500}
              value={top ?? ""}
              onChange={(e) => {
                const raw = e.target.value.trim();
                onChange({
                  impressionRankTop:
                    raw === "" ? null : Math.max(1, Number(raw)),
                });
              }}
              placeholder="All"
              className="w-20 rounded-lg border border-[#E2E6EF] bg-white px-2.5 py-1.5 font-mono-num text-[12.5px] text-[#0F172A] outline-none placeholder:text-[#94A3B8] focus:border-[#0027eb] focus:ring-2 focus:ring-[#0027eb]/15"
            />
            <div className="ml-auto flex rounded-lg bg-[#F3F5F9] p-0.5">
              {(
                [
                  { id: "percent", label: "Percent" },
                  { id: "ads", label: "Ads" },
                ] as const
              ).map((m) => {
                const active = mode === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    data-no-glass="true"
                    onClick={() =>
                      onChange({
                        impressionRankMode: m.id,
                        impressionRankTop:
                          top !== null
                            ? m.id === "percent"
                              ? Math.min(100, top)
                              : Math.min(50, top)
                            : null,
                      })
                    }
                    className={`rounded-md px-2.5 py-1 text-[11.5px] font-medium transition-all ${
                      active
                        ? "bg-white font-semibold text-[#0F172A] shadow-xs"
                        : "text-[#64748B] hover:text-[#0F172A]"
                    }`}
                  >
                    {m.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Slider */}
          <div>
            <input
              type="range"
              min={1}
              max={maxSlider}
              step={1}
              value={Math.min(maxSlider, Math.max(1, sliderVal))}
              onChange={(e) => {
                const num = Number(e.target.value);
                onChange({
                  impressionRankTop: num >= maxSlider ? null : num,
                });
              }}
              className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-[#E2E8F0] accent-[#0027eb]"
            />
            <div className="mt-1.5 flex items-center justify-between font-mono-num text-[10.5px] text-[#94A3B8]">
              {ticks.map((t) => (
                <span key={t}>{t}</span>
              ))}
            </div>
          </div>

          {/* Time period */}
          <div>
            <p className="mb-1.5 text-[11px] font-medium text-[#64748B]">
              Time period
            </p>
            <div className="grid grid-cols-2 gap-1 rounded-lg bg-[#F3F5F9] p-1">
              {(["Current", "All time"] as const).map((p) => {
                const active = period === p;
                return (
                  <button
                    key={p}
                    type="button"
                    data-no-glass="true"
                    onClick={() => onChange({ impressionRankPeriod: p })}
                    className={`rounded-md py-1 text-[11.5px] font-medium transition-all ${
                      active
                        ? "bg-white font-semibold text-[#0F172A] shadow-xs"
                        : "text-[#64748B] hover:text-[#0F172A]"
                    }`}
                  >
                    {p}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Quick ranges */}
          <div>
            <p className="mb-1.5 text-[11px] font-medium text-[#64748B]">
              Quick ranges
            </p>
            <div className="flex flex-wrap gap-1.5">
              {[10, 25, 50].map((pct) => {
                const isSelected = mode === "percent" && top === pct;
                return (
                  <button
                    key={pct}
                    type="button"
                    data-no-glass="true"
                    onClick={() =>
                      onChange({
                        impressionRankMode: "percent",
                        impressionRankTop: isSelected ? null : pct,
                      })
                    }
                    className={`rounded-md border px-2.5 py-1 text-[11.5px] font-medium transition-colors ${
                      isSelected
                        ? "border-[#0027eb] bg-[#EEF2FF] text-[#0027eb]"
                        : "border-[#E2E6EF] bg-white text-[#334155] hover:border-[#CBD5E1] hover:bg-[#F7F8FB]"
                    }`}
                  >
                    Top {pct}%
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </FlakePopover>
    </>
  );
}

/* ============================================================================
   GENERIC WRAPPER COMPONENTS FOR RANGE / GROWTH / SEARCH / INDUSTRY PILLS
   (Each owns its own ref to guarantee zero react-hooks/refs issues)
   ============================================================================ */

function RangeFilterSlot({
  pillLabel,
  activeLabel,
  open,
  onOpenChange,
  title,
  subtitle,
  badge,
  minBound,
  maxBound,
  step,
  ticks,
  value,
  onChange,
  minLabel,
  maxLabel,
  minPlaceholder,
  maxPlaceholder,
  quickRanges,
  quickTitle,
  windowOptions,
  windowLabel,
  prefix,
  unitSuffix,
  extraContent,
  width,
}: {
  pillLabel: string;
  activeLabel: string | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  title: string;
  subtitle: string;
  badge?: React.ReactNode;
  minBound?: number;
  maxBound?: number;
  step?: number;
  ticks: string[];
  value: RangeFilterValue;
  onChange: (next: RangeFilterValue) => void;
  minLabel?: string;
  maxLabel?: string;
  minPlaceholder?: string;
  maxPlaceholder?: string;
  quickRanges?: Array<{ label: string; min: number | null; max: number | null }>;
  quickTitle?: string;
  windowOptions?: string[];
  windowLabel?: string;
  prefix?: string;
  unitSuffix?: string;
  extraContent?: React.ReactNode;
  width?: number;
}) {
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  return (
    <>
      <AtriaFilterPill
        label={pillLabel}
        activeLabel={activeLabel}
        active={value.min !== null || value.max !== null}
        open={open}
        onToggle={() => onOpenChange(!open)}
        triggerRef={triggerRef}
      />
      <AtriaRangeFilterPopover
        open={open}
        onOpenChange={onOpenChange}
        anchorRef={triggerRef}
        title={title}
        subtitle={subtitle}
        badge={badge}
        minBound={minBound}
        maxBound={maxBound}
        step={step}
        ticks={ticks}
        value={value}
        onChange={onChange}
        minLabel={minLabel}
        maxLabel={maxLabel}
        minPlaceholder={minPlaceholder}
        maxPlaceholder={maxPlaceholder}
        quickRanges={quickRanges}
        quickTitle={quickTitle}
        windowOptions={windowOptions}
        windowLabel={windowLabel}
        prefix={prefix}
        unitSuffix={unitSuffix}
        extraContent={extraContent}
        width={width}
      />
    </>
  );
}

function GrowthFilterSlot({
  pillLabel,
  open,
  onOpenChange,
  title,
  subtitle,
  value,
  onChange,
  periods,
}: {
  pillLabel: string;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  title: string;
  subtitle: string;
  value: GrowthFilterValue;
  onChange: (next: GrowthFilterValue) => void;
  periods?: string[];
}) {
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const badge = formatGrowthBadge(value);
  return (
    <>
      <AtriaFilterPill
        label={pillLabel}
        activeLabel={badge}
        active={badge !== null}
        open={open}
        onToggle={() => onOpenChange(!open)}
        triggerRef={triggerRef}
      />
      <AtriaGrowthFilterPopover
        open={open}
        onOpenChange={onOpenChange}
        anchorRef={triggerRef}
        title={title}
        subtitle={subtitle}
        value={value}
        onChange={onChange}
        periods={periods}
      />
    </>
  );
}

function SearchCheckboxFilterSlot({
  pillLabel,
  open,
  onOpenChange,
  title,
  subtitle,
  badge,
  searchPlaceholder,
  options,
  selected,
  onChange,
}: {
  pillLabel: string;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  title: string;
  subtitle?: string;
  badge?: React.ReactNode;
  searchPlaceholder: string;
  options: string[];
  selected: string[];
  onChange: (next: string[]) => void;
}) {
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const activeLabel =
    selected.length === 0
      ? null
      : selected.length === 1
        ? selected[0]
        : `${selected.length} selected`;

  return (
    <>
      <AtriaFilterPill
        label={pillLabel}
        activeLabel={activeLabel}
        active={selected.length > 0}
        open={open}
        onToggle={() => onOpenChange(!open)}
        triggerRef={triggerRef}
      />
      <AtriaSearchCheckboxPopover
        open={open}
        onOpenChange={onOpenChange}
        anchorRef={triggerRef}
        title={title}
        subtitle={subtitle}
        badge={badge}
        searchPlaceholder={searchPlaceholder}
        options={options}
        selected={selected}
        onChange={onChange}
      />
    </>
  );
}

function IndustryFilterSlot({
  open,
  onOpenChange,
  selected,
  onApply,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  selected: string[];
  onApply: (next: string[]) => void;
}) {
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const activeLabel =
    selected.length === 0
      ? null
      : selected.length === 1
        ? selected[0]
        : `${selected.length} selected`;

  return (
    <>
      <AtriaFilterPill
        label="Industry"
        activeLabel={activeLabel}
        active={selected.length > 0}
        open={open}
        onToggle={() => onOpenChange(!open)}
        triggerRef={triggerRef}
      />
      <AtriaIndustryPopover
        open={open}
        onOpenChange={onOpenChange}
        anchorRef={triggerRef}
        selected={selected}
        onApply={onApply}
      />
    </>
  );
}

/* ============================================================================
   "CAN'T FIND AN ADVERTISER?" 2-COLUMN MODAL
   ============================================================================ */

const EXTENSION_WORKS_ON = [
  { label: "Meta Ad Library", href: "https://www.facebook.com/ads/library/" },
  { label: "Instagram", href: "https://www.instagram.com/" },
  { label: "TikTok Ad Library", href: "https://library.tiktok.com/" },
  {
    label: "TikTok Creative Center",
    href: "https://ads.tiktok.com/business/creativecenter/",
  },
  { label: "TikTok", href: "https://www.tiktok.com/" },
];

function CantFindAdvertiserModal({
  open,
  onClose,
  onRequestAdvertiser,
}: {
  open: boolean;
  onClose: () => void;
  onRequestAdvertiser: () => void;
}) {
  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="flake-modal-backdrop fixed inset-0 z-[130] flex items-center justify-center bg-[#050811]/55 p-4 backdrop-blur-[2px]"
      onClick={onClose}
    >
      <div
        className="animate-sheet-up w-full max-w-[680px] rounded-2xl border border-[#E6E9F0] bg-white p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="font-display text-[18px] font-bold text-[#0F172A]">
              Can&apos;t find an advertiser?
            </h3>
            <p className="mt-1 text-[13px] text-[#64748B]">
              Two ways to get its ads into Flake.
            </p>
          </div>
          <button
            type="button"
            data-no-glass="true"
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-[#64748B] hover:bg-[#F3F5F9] hover:text-[#0F172A]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* 2-Column Options */}
        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {/* Left Card: Chrome Extension */}
          <div className="flex flex-col justify-between rounded-xl border border-[#E6E9F0] bg-[#FAFBFD] p-5">
            <div>
              {/* Chrome-inspired geometric badge in Flake Obsidian & Cobalt */}
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl border border-[#E2E6EF] bg-white shadow-xs">
                <svg
                  viewBox="0 0 24 24"
                  className="h-6 w-6"
                  fill="none"
                  aria-hidden="true"
                >
                  <circle
                    cx="12"
                    cy="12"
                    r="9.5"
                    stroke="#0F172A"
                    strokeWidth="1.75"
                  />
                  <circle cx="12" cy="12" r="4" fill="#0027eb" />
                  <path
                    d="M12 8H20.6"
                    stroke="#0F172A"
                    strokeWidth="1.75"
                    strokeLinecap="round"
                  />
                  <path
                    d="M8.5 14L4.2 6.6"
                    stroke="#3B66FF"
                    strokeWidth="1.75"
                    strokeLinecap="round"
                  />
                  <path
                    d="M15.5 14L11.2 21.3"
                    stroke="#64748B"
                    strokeWidth="1.75"
                    strokeLinecap="round"
                  />
                </svg>
              </div>

              <h4 className="font-display text-[15px] font-bold text-[#0F172A]">
                Save ads with the Chrome extension
              </h4>
              <p className="mt-1.5 text-[12.5px] leading-relaxed text-[#64748B]">
                Pick the ads you want. They land in Saved ads right away.
              </p>

              <div className="mt-4">
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-[#94A3B8]">
                  Works on
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {EXTENSION_WORKS_ON.map((site) => (
                    <a
                      key={site.label}
                      href={site.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      data-no-glass="true"
                      className="inline-flex items-center gap-1 rounded-md border border-[#E2E6EF] bg-white px-2 py-1 text-[11.5px] font-medium text-[#334155] transition-colors hover:border-[#0027eb]/40 hover:text-[#0027eb]"
                    >
                      <span>{site.label}</span>
                      <ExternalLink className="h-2.5 w-2.5 opacity-60" />
                    </a>
                  ))}
                </div>
              </div>
            </div>

            <a
              href="https://chromewebstore.google.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="adtrack-btn-primary mt-5 inline-flex w-full items-center justify-center gap-1.5 rounded-xl px-4 py-2.5 text-[13px] font-semibold text-white"
            >
              <span>Get the Chrome extension</span>
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>

          {/* Right Card: Request Advertiser */}
          <div className="flex flex-col justify-between rounded-xl border border-[#E6E9F0] bg-[#FAFBFD] p-5">
            <div>
              {/* Overlapping brand avatar stack (Obsidian / Cobalt / Slate) */}
              <div className="mb-4 flex items-center -space-x-2">
                {[
                  { initials: "NR", bg: "bg-[#050811] text-white" },
                  { initials: "FL", bg: "bg-[#0027eb] text-white" },
                  { initials: "SK", bg: "bg-[#3B66FF] text-white" },
                  { initials: "AL", bg: "bg-[#1E293B] text-white" },
                ].map((av) => (
                  <span
                    key={av.initials}
                    className={`flex h-10 w-10 items-center justify-center rounded-full border-2 border-white text-[11px] font-bold shadow-xs ${av.bg}`}
                  >
                    {av.initials}
                  </span>
                ))}
              </div>

              <h4 className="font-display text-[15px] font-bold text-[#0F172A]">
                Have us add the advertiser
              </h4>
              <p className="mt-1.5 text-[12.5px] leading-relaxed text-[#64748B]">
                We add all its ads for you.
              </p>

              <ul className="mt-4 space-y-2.5 text-[12.5px] text-[#334155]">
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[#ECEFF4] text-[#0F172A]">
                    <Check className="h-2.5 w-2.5 stroke-[3]" />
                  </span>
                  <span>Meta and TikTok advertisers</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[#ECEFF4] text-[#0F172A]">
                    <Check className="h-2.5 w-2.5 stroke-[3]" />
                  </span>
                  <span>
                    You&apos;ll follow its brand, which keeps the
                    advertiser&apos;s ads up to date.
                  </span>
                </li>
              </ul>
            </div>

            <button
              type="button"
              onClick={() => {
                onClose();
                onRequestAdvertiser();
              }}
              className="adtrack-btn-primary mt-5 inline-flex w-full items-center justify-center gap-1.5 rounded-xl px-4 py-2.5 text-[13px] font-semibold text-white"
            >
              <span>Request an advertiser</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

/* ============================================================================
   MAIN EXPORTED COMPONENT: AtriaDiscoveryBar
   ============================================================================ */

export interface AtriaDiscoveryBarProps {
  search: string;
  onSearchChange: (val: string) => void;
  activeViewTab: "all" | "trending" | "following" | string;
  onViewTabChange: (tab: string) => void;
  followedCount: number;
  sortBy: DiscoverySortOption;
  onSortChange: (val: DiscoverySortOption) => void;
  assumedCpm: number;
  onAssumedCpmChange: (cpm: number) => void;
  filters: DiscoveryFiltersState;
  onFiltersChange: (next: DiscoveryFiltersState) => void;
  onResetFilters: () => void;
  onOpenRequestBrand: () => void;
}

export function AtriaDiscoveryBar({
  search,
  onSearchChange,
  activeViewTab,
  onViewTabChange,
  followedCount,
  sortBy,
  onSortChange,
  assumedCpm,
  onAssumedCpmChange,
  filters,
  onFiltersChange,
  onResetFilters,
  onOpenRequestBrand,
}: AtriaDiscoveryBarProps) {
  const [filtersExpanded, setFiltersExpanded] = useState(true);
  const [openPopover, setOpenPopover] = useState<string | null>(null);
  const [createViewOpen, setCreateViewOpen] = useState(false);
  const [manageViewsOpen, setManageViewsOpen] = useState(false);
  const [cantFindOpen, setCantFindOpen] = useState(false);

  const sortTriggerRef = useRef<HTMLButtonElement | null>(null);
  const spendTriggerRef = useRef<HTMLButtonElement | null>(null);

  const customViews = useSyncExternalStore(
    subscribeCustomViews,
    getCustomViewsSnapshot,
    getServerViewsSnapshot
  );

  const activeFilterCount = useMemo(
    () => countActiveDiscoveryFilters(filters),
    [filters]
  );

  const activeSummaryBadges = useMemo(
    () => buildActiveSummaryBadges(filters),
    [filters]
  );

  const currentSortMeta =
    SORT_OPTIONS.find((s) => s.value === sortBy) || SORT_OPTIONS[0];

  const patchFilters = (patch: Partial<DiscoveryFiltersState>) => {
    onFiltersChange({ ...filters, ...patch });
  };

  const setPopoverFor = (id: string) => (isOpen: boolean) => {
    setOpenPopover(isOpen ? id : null);
  };

  const handleCreateCustomView = (name: string) => {
    const newView: StoredDiscoveryView = {
      id: `view_${Date.now()}`,
      name,
      sortBy,
      sortLabel: currentSortMeta.label,
      summaryBadges: activeSummaryBadges,
      filters,
    };
    writeCustomViews([...customViews, newView]);
    onViewTabChange(newView.id);
  };

  const handleDeleteCustomView = (id: string) => {
    const remaining = customViews.filter((v) => v.id !== id);
    writeCustomViews(remaining);
    if (activeViewTab === id) {
      onViewTabChange("all");
    }
  };

  const handleSelectCustomView = (view: StoredDiscoveryView) => {
    onSortChange(view.sortBy);
    onFiltersChange(view.filters);
    onViewTabChange(view.id);
  };

  const sampleEstSpendK = ((199.8 * assumedCpm) / 1000).toFixed(1);

  return (
    <div className="space-y-2.5">
      {/* ====================================================================
          ROW 1: VIEW TABS + SEARCH BAR + "Can't find an advertiser?" (SINGLE ROW)
         ==================================================================== */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap items-center gap-1">
          <button
            type="button"
            data-no-glass="true"
            onClick={() => onViewTabChange("all")}
            className={`inline-flex h-8 min-w-[66px] items-center justify-center rounded-md px-3 text-[13px] font-semibold transition-colors ${
              activeViewTab === "all"
                ? "bg-[#0027eb] text-white"
                : "bg-transparent text-[#0F172A] hover:bg-[#F3F5F9]"
            }`}
          >
            All ads
          </button>

          <button
            type="button"
            data-no-glass="true"
            onClick={() => onViewTabChange("trending")}
            className={`inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-[13px] font-semibold transition-colors ${
              activeViewTab === "trending"
                ? "bg-[#0027eb] text-white"
                : "bg-transparent text-[#0F172A] hover:bg-[#F3F5F9]"
            }`}
          >
            <span aria-hidden="true" className="text-[14px] leading-none">
              🔥
            </span>
            <span>Trending</span>
          </button>

          <button
            type="button"
            data-no-glass="true"
            onClick={() => onViewTabChange("following")}
            className={`inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-[13px] font-semibold transition-colors ${
              activeViewTab === "following"
                ? "bg-[#0027eb] text-white"
                : "bg-transparent text-[#0F172A] hover:bg-[#F3F5F9]"
            }`}
          >
            <span aria-hidden="true" className="text-[14px] leading-none">
              ❤️
            </span>
            <span>Following</span>
            {followedCount > 0 && (
              <span
                className={`ml-0.5 rounded-full px-1.5 py-0.2 font-mono-num text-[11px] font-semibold ${
                  activeViewTab === "following"
                    ? "bg-white/20 text-white"
                    : "bg-[#ECEFF4] text-[#0F172A]"
                }`}
              >
                {followedCount}
              </span>
            )}
          </button>

          {/* User-saved custom views */}
          {customViews.map((cv) => {
            const active = activeViewTab === cv.id;
            return (
              <button
                key={cv.id}
                type="button"
                data-no-glass="true"
                onClick={() => handleSelectCustomView(cv)}
                className={`inline-flex h-8 max-w-[160px] items-center rounded-md px-2.5 text-[13px] font-semibold transition-colors ${
                  active
                    ? "bg-[#0027eb] text-white"
                    : "bg-transparent text-[#0F172A] hover:bg-[#F3F5F9]"
                }`}
              >
                <span className="truncate">{cv.name}</span>
              </button>
            );
          })}

          {/* + New view */}
          <button
            type="button"
            data-no-glass="true"
            onClick={() => setCreateViewOpen(true)}
            className="ml-1 inline-flex h-8 items-center gap-1 rounded-md border border-[#E2E6EF] bg-white px-2.5 text-[12.5px] font-medium text-[#334155] transition-colors hover:border-[#CBD5E1] hover:bg-[#F7F8FB] hover:text-[#0F172A]"
          >
            <Plus className="h-3.5 w-3.5 text-[#64748B]" />
            <span>New view</span>
          </button>

          {/* Gear (Manage views) */}
          <button
            type="button"
            data-no-glass="true"
            onClick={() => setManageViewsOpen(true)}
            aria-label="Manage views"
            title="Manage views"
            className="flex h-8 w-8 items-center justify-center rounded-md text-[#64748B] transition-colors hover:bg-[#F3F5F9] hover:text-[#0F172A]"
          >
            <Settings className="h-4 w-4" />
          </button>
        </div>

        {/* Inline Search Input */}
        <div className="relative flex h-9 min-w-[220px] max-w-[460px] flex-1 items-center rounded-lg border border-[#E2E6EF] bg-white px-3 transition-all focus-within:border-[#0027eb] focus-within:ring-2 focus-within:ring-[#0027eb]/15">
          <Search className="mr-2 h-4 w-4 shrink-0 text-[#64748B]" />
          <input
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search for ads or advertisers with AI"
            className="w-full bg-transparent text-[13px] text-[#0F172A] outline-none placeholder:text-[#94A3B8]"
          />
          {search.length > 0 && (
            <button
              type="button"
              data-no-glass="true"
              onClick={() => onSearchChange("")}
              aria-label="Clear search"
              className="ml-2 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[#94A3B8] hover:bg-[#F3F5F9] hover:text-[#0F172A]"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Right: Can't find an advertiser? */}
        <button
          type="button"
          data-no-glass="true"
          onClick={() => setCantFindOpen(true)}
          className="ml-auto inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md px-2 text-[12.5px] font-medium text-[#334155] transition-colors hover:bg-[#F3F5F9] hover:text-[#0F172A]"
        >
          <HelpCircle className="h-4 w-4 text-[#64748B]" />
          <span>Can&apos;t find an advertiser?</span>
        </button>
      </div>

      {/* ====================================================================
          ROW 2: FILTER CONTROL ROW (Filters Hide/Show · Sort · Spend CPM)
         ==================================================================== */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Filters Hide / Show */}
        <button
          type="button"
          data-no-glass="true"
          onClick={() => setFiltersExpanded((prev) => !prev)}
          className={`inline-flex h-8 items-center gap-1.5 rounded-md border px-2.5 text-[12.5px] font-medium transition-colors ${
            filtersExpanded
              ? "border-[#E2E6EF] bg-white text-[#0F172A] hover:border-[#CBD5E1]"
              : "border-[#E2E6EF] bg-white text-[#334155] hover:border-[#CBD5E1] hover:bg-[#F8FAFC]"
          }`}
        >
          <Filter className="h-3.5 w-3.5 text-[#475569]" />
          <span className="font-semibold text-[#0F172A]">Filters</span>
          <span className="text-[#64748B]">
            {filtersExpanded ? "Hide" : "Show"}
          </span>
          {activeFilterCount > 0 && (
            <span className="flex h-4 min-w-[16px] items-center justify-center rounded-full bg-[#0027eb] px-1 font-mono-num text-[10px] font-semibold text-white">
              {activeFilterCount}
            </span>
          )}
          {filtersExpanded ? (
            <ChevronUp className="h-3.5 w-3.5 text-[#475569]" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5 text-[#475569]" />
          )}
        </button>

        {/* Sort: <label> */}
        <button
          ref={sortTriggerRef}
          type="button"
          data-no-glass="true"
          onClick={() =>
            setOpenPopover(openPopover === "sort" ? null : "sort")
          }
          className={`inline-flex h-8 items-center gap-1.5 rounded-md border px-2.5 text-[12.5px] font-medium transition-colors ${
            openPopover === "sort"
              ? "border-[#CBD5E1] bg-[#F1F5F9] text-[#0F172A]"
              : "border-[#E2E6EF] bg-white text-[#334155] hover:border-[#CBD5E1] hover:bg-[#F8FAFC]"
          }`}
        >
          <ArrowUpDown className="h-3.5 w-3.5 text-[#64748B]" />
          <span className="text-[#64748B]">Sort:</span>
          <span className="font-semibold text-[#0F172A]">
            {currentSortMeta.label}
          </span>
          <ChevronDown className="h-3.5 w-3.5 text-[#475569]" />
        </button>

        <FlakePopover
          open={openPopover === "sort"}
          onOpenChange={setPopoverFor("sort")}
          anchorRef={sortTriggerRef}
          align="left"
          width={290}
        >
          <div className="p-1.5">
            {SORT_OPTIONS.map((opt) => {
              const active = opt.value === sortBy;
              return (
                <button
                  key={opt.value}
                  type="button"
                  data-no-glass="true"
                  onClick={() => {
                    onSortChange(opt.value);
                    setOpenPopover(null);
                  }}
                  className={`flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2 text-left text-[12.5px] transition-colors ${
                    active
                      ? "bg-[#EFEFF2] font-semibold text-[#0F172A]"
                      : "font-medium text-[#334155] hover:bg-[#F7F8FB] hover:text-[#0F172A]"
                  }`}
                >
                  <span className="flex flex-col">
                    <span>{opt.label}</span>
                    {opt.sublabel && (
                      <span className="text-[10.5px] font-normal text-[#64748B]">
                        {opt.sublabel}
                      </span>
                    )}
                  </span>
                  {active && (
                    <Check className="h-3.5 w-3.5 shrink-0 text-[#0F172A]" />
                  )}
                </button>
              );
            })}
          </div>
        </FlakePopover>

        {/* Spend: $${assumedCpm} CPM */}
        <button
          ref={spendTriggerRef}
          type="button"
          data-no-glass="true"
          onClick={() =>
            setOpenPopover(openPopover === "spend_cpm" ? null : "spend_cpm")
          }
          className={`inline-flex h-8 items-center gap-1.5 rounded-md border px-2.5 text-[12.5px] font-medium transition-colors ${
            openPopover === "spend_cpm"
              ? "border-[#CBD5E1] bg-[#F1F5F9] text-[#0F172A]"
              : "border-[#E2E6EF] bg-white text-[#334155] hover:border-[#CBD5E1] hover:bg-[#F8FAFC]"
          }`}
        >
          <Coins className="h-3.5 w-3.5 text-[#64748B]" />
          <span className="text-[#64748B]">Spend:</span>
          <span className="font-mono-num font-semibold text-[#0F172A]">
            ${assumedCpm} CPM
          </span>
          <ChevronDown className="h-3.5 w-3.5 text-[#475569]" />
        </button>

        <FlakePopover
          open={openPopover === "spend_cpm"}
          onOpenChange={setPopoverFor("spend_cpm")}
          anchorRef={spendTriggerRef}
          align="left"
          width={344}
        >
          <AtriaPopoverHeader
            title="Est. ad spend"
            subtitle="Estimated ad spend = Reach ÷ 1,000 × CPM"
            badge={
              <span className="rounded border border-[#E2E6EF] bg-[#F3F5F9] px-1.5 py-0.5 text-[10px] font-semibold text-[#475569]">
                EU/UK
              </span>
            }
          />
          <div className="space-y-3.5 px-5 pb-5 pt-2.5">
            {/* Assumed CPM Input + Reset */}
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label className="text-[12px] font-medium text-[#475569]">
                  Assumed CPM
                </label>
                <button
                  type="button"
                  data-no-glass="true"
                  onClick={() => onAssumedCpmChange(DEFAULT_ASSUMED_CPM)}
                  className="inline-flex items-center gap-1 text-[12px] font-medium text-[#475569] hover:text-[#0F172A]"
                >
                  <RotateCcw className="h-3 w-3 text-[#64748B]" />
                  Reset
                </button>
              </div>
              <div className="flex h-10 items-center rounded-xl border border-[#D8DDE6] bg-white px-3 focus-within:border-[#0027eb] focus-within:ring-2 focus-within:ring-[#0027eb]/15">
                <span className="mr-1.5 text-xs font-semibold text-[#64748B]">
                  $
                </span>
                <input
                  type="number"
                  min={1}
                  max={250}
                  step={1}
                  value={assumedCpm}
                  onChange={(e) => {
                    const next = Number(e.target.value);
                    if (Number.isFinite(next) && next > 0) {
                      onAssumedCpmChange(next);
                    }
                  }}
                  className="w-full bg-transparent font-mono-num text-[13.5px] font-semibold text-[#0F172A] outline-none"
                />
                <span className="ml-1.5 shrink-0 text-[11.5px] font-medium text-[#64748B]">
                  per 1K reach
                </span>
              </div>
            </div>

            {/* Crisp Visual Sample Card */}
            <div className="rounded-xl border border-[#E6E9F0] bg-[#F7F8FB] p-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex-1 rounded-lg border border-[#E2E6EF] bg-white px-2.5 py-2 text-center">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-[#94A3B8]">
                    EU/UK Reach
                  </p>
                  <p className="mt-0.5 font-mono-num text-[14px] font-bold text-[#0F172A]">
                    199.8K
                  </p>
                </div>
                <ArrowRight className="h-4 w-4 shrink-0 text-[#64748B]" />
                <div className="flex-1 rounded-lg border border-[#D8DDE6] bg-white px-2.5 py-2 text-center">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-[#64748B]">
                    Est. spend
                  </p>
                  <p className="mt-0.5 font-mono-num text-[14px] font-bold text-[#0F172A]">
                    ${sampleEstSpendK}K
                  </p>
                </div>
              </div>
            </div>

            {/* Explanation */}
            <div className="space-y-1">
              <p className="text-[12px] font-semibold text-[#0F172A]">
                Every ad card with reach data shows it, at the CPM above.
              </p>
              <p className="text-[11.5px] leading-relaxed text-[#64748B]">
                Adjust your assumed CPM to match your niche or market. Spend
                estimates and the Ad spend filter recalculate instantly across
                all EU &amp; UK Meta and TikTok ads.
              </p>
            </div>
          </div>
        </FlakePopover>

        {/* Clear all */}
        {activeFilterCount > 0 && (
          <button
            type="button"
            data-no-glass="true"
            onClick={onResetFilters}
            className="ml-1 text-[12.5px] font-medium text-[#475569] transition-colors hover:text-[#0F172A]"
          >
            Clear all
          </button>
        )}
      </div>

      {/* ====================================================================
          ROW 3: EXPANDED 3-LINE COMPACT FILTER PANEL (ALL 22 FILTERS)
         ==================================================================== */}
      {filtersExpanded && (
        <div className="space-y-2 rounded-xl border border-[#ECEFF5] bg-[#F7F8FB] px-3.5 py-2.5">
          {/* LINE 1: LIFECYCLE (3) + TARGETING (3) SIDE-BY-SIDE */}
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="w-[74px] shrink-0 text-[11.5px] font-medium text-[#64748B]">
                Lifecycle
              </span>

              {/* 1. Launch time */}
              <LaunchTimeFilter
                open={openPopover === "launch_time"}
                onOpenChange={setPopoverFor("launch_time")}
                filters={filters}
                onChange={patchFilters}
              />

              {/* 2. Status */}
              <StatusFilter
                open={openPopover === "status"}
                onOpenChange={setPopoverFor("status")}
                value={filters.status}
                onChange={(status) => patchFilters({ status })}
              />

              {/* 3. Days running */}
              <RangeFilterSlot
                pillLabel="Days running"
                activeLabel={formatRangeBadge(filters.daysRunning, " days")}
                open={openPopover === "days_running"}
                onOpenChange={setPopoverFor("days_running")}
                title="Days running"
                subtitle="Filter by how long an ad has been live"
                minBound={0}
                maxBound={60}
                step={1}
                ticks={["0", "15", "30", "45", "No limit"]}
                unitSuffix="days"
                value={filters.daysRunning}
                onChange={(daysRunning) => patchFilters({ daysRunning })}
                quickRanges={[
                  { label: "≥7 days", min: 7, max: null },
                  { label: "≥14 days", min: 14, max: null },
                  { label: "≥30 days", min: 30, max: null },
                ]}
              />
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              <span className="mr-1 text-[11.5px] font-medium text-[#64748B]">
                Targeting
              </span>

              {/* 4. Country */}
              <CountryFilter
                open={openPopover === "country"}
                onOpenChange={setPopoverFor("country")}
                value={filters.countries}
                onChange={(countries) => patchFilters({ countries })}
              />

              {/* 5. Age */}
              <RangeFilterSlot
                pillLabel="Age"
                activeLabel={formatRangeBadge(filters.age)}
                open={openPopover === "age"}
                onOpenChange={setPopoverFor("age")}
                title="Age"
                subtitle="Filter by targeted audience age range"
                minBound={13}
                maxBound={65}
                step={1}
                ticks={["13", "25", "35", "45", "65+"]}
                minLabel="Minimum"
                maxLabel="Maximum"
                minPlaceholder="Any"
                maxPlaceholder="Any"
                value={filters.age}
                onChange={(age) => patchFilters({ age })}
                quickTitle="Quick age ranges"
                quickRanges={[
                  { label: "13–17", min: 13, max: 17 },
                  { label: "18–24", min: 18, max: 24 },
                  { label: "25–34", min: 25, max: 34 },
                  { label: "35–44", min: 35, max: 44 },
                  { label: "45–54", min: 45, max: 54 },
                  { label: "55+", min: 55, max: null },
                ]}
              />

              {/* 6. Gender */}
              <GenderFilter
                open={openPopover === "gender"}
                onOpenChange={setPopoverFor("gender")}
                value={filters.gender}
                onChange={(gender) => patchFilters({ gender })}
              />
            </div>
          </div>

          {/* LINE 2: CREATIVE (11) WITH SUBTLE HAIRLINE DIVIDERS */}
          <div className="flex flex-col gap-1.5 sm:flex-row sm:items-start sm:gap-0">
            <span className="w-[80px] shrink-0 text-[11.5px] font-medium text-[#64748B] sm:pt-1">
              Creative
            </span>
            <div className="flex flex-wrap items-center gap-1.5">
              {/* 7. Format */}
              <FormatFilter
                open={openPopover === "format"}
                onOpenChange={setPopoverFor("format")}
                value={filters.formats}
                onChange={(formats) => patchFilters({ formats })}
              />

              {/* 8. Video length */}
              <RangeFilterSlot
                pillLabel="Video length"
                activeLabel={formatRangeBadge(filters.videoLength, "s")}
                open={openPopover === "video_length"}
                onOpenChange={setPopoverFor("video_length")}
                title="Video length"
                subtitle="Filter video creatives by duration in seconds"
                minBound={0}
                maxBound={150}
                step={5}
                ticks={["0s", "30s", "1m", "2m", "No limit"]}
                unitSuffix="sec"
                value={filters.videoLength}
                onChange={(videoLength) => patchFilters({ videoLength })}
                quickRanges={[
                  { label: "0–15 sec", min: 0, max: 15 },
                  { label: "15–30 sec", min: 15, max: 30 },
                  { label: "30–60 sec", min: 30, max: 60 },
                  { label: "60–90 sec", min: 60, max: 90 },
                  { label: "90–120 sec", min: 90, max: 120 },
                  { label: "120 sec+", min: 120, max: null },
                ]}
              />

              {/* 9. Industry */}
              <IndustryFilterSlot
                open={openPopover === "industry"}
                onOpenChange={setPopoverFor("industry")}
                selected={filters.industries}
                onApply={(industries) => patchFilters({ industries })}
              />

              {/* 10. Platform */}
              <PlatformFilter
                open={openPopover === "platform"}
                onOpenChange={setPopoverFor("platform")}
                value={filters.platforms}
                onChange={(platforms) => patchFilters({ platforms })}
              />

              {/* 11. Creative reuse */}
              <RangeFilterSlot
                pillLabel="Creative reuse"
                activeLabel={formatRangeBadge(filters.creativeReuse)}
                open={openPopover === "creative_reuse"}
                onOpenChange={setPopoverFor("creative_reuse")}
                title="Creative reuse"
                subtitle="Number of active ad variations sharing this creative"
                minBound={1}
                maxBound={30}
                step={1}
                ticks={["1", "10", "25", "No limit"]}
                unitSuffix="ads"
                value={filters.creativeReuse}
                onChange={(creativeReuse) => patchFilters({ creativeReuse })}
                quickRanges={[
                  { label: "Unique (1)", min: 1, max: 1 },
                  { label: "Reused (5+)", min: 5, max: null },
                  { label: "Scaled (20+)", min: 20, max: null },
                ]}
              />

              <span className="mx-0.5 hidden h-4 w-px bg-[#E2E6EF] sm:inline-block" />

              {/* 12. Theme */}
              <SearchCheckboxFilterSlot
                pillLabel="Theme"
                open={openPopover === "theme"}
                onOpenChange={setPopoverFor("theme")}
                title="Theme"
                subtitle="Filter by creative concept or messaging angle"
                searchPlaceholder="Search themes"
                options={ATRIA_THEMES}
                selected={filters.themes}
                onChange={(themes) => patchFilters({ themes })}
              />

              {/* 13. Visual styles */}
              <SearchCheckboxFilterSlot
                pillLabel="Visual styles"
                open={openPopover === "visual_styles"}
                onOpenChange={setPopoverFor("visual_styles")}
                title="Visual styles"
                subtitle="Filter video ads by production aesthetic"
                badge={
                  <span className="rounded border border-[#E2E6EF] bg-[#F3F5F9] px-1.5 py-0.5 text-[10px] font-semibold text-[#475569]">
                    Video only
                  </span>
                }
                searchPlaceholder="Search visual styles"
                options={ATRIA_VISUAL_STYLES}
                selected={filters.visualStyles}
                onChange={(visualStyles) => patchFilters({ visualStyles })}
              />

              {/* 14. CTA */}
              <SearchCheckboxFilterSlot
                pillLabel="CTA"
                open={openPopover === "cta"}
                onOpenChange={setPopoverFor("cta")}
                title="CTA"
                subtitle="Filter by call-to-action button label"
                searchPlaceholder="Search CTAs"
                options={ATRIA_CTAS}
                selected={filters.ctas}
                onChange={(ctas) => patchFilters({ ctas })}
              />

              {/* 15. Ad copy length */}
              <RangeFilterSlot
                pillLabel="Ad copy length"
                activeLabel={formatRangeBadge(filters.adCopyLength)}
                open={openPopover === "ad_copy_length"}
                onOpenChange={setPopoverFor("ad_copy_length")}
                title="Ad copy length"
                subtitle="Filter by character count of primary ad text"
                minBound={0}
                maxBound={1000}
                step={25}
                ticks={["0", "250", "500", "750", "No limit"]}
                unitSuffix="chars"
                value={filters.adCopyLength}
                onChange={(adCopyLength) => patchFilters({ adCopyLength })}
                quickTitle="Quick sizes"
                quickRanges={[
                  { label: "Short (≤150)", min: 0, max: 150 },
                  { label: "Medium (150–500)", min: 150, max: 500 },
                  { label: "Long (≥500)", min: 500, max: null },
                ]}
              />

              {/* 16. Language */}
              <SearchCheckboxFilterSlot
                pillLabel="Language"
                open={openPopover === "language"}
                onOpenChange={setPopoverFor("language")}
                title="Language"
                subtitle="Filter by ad copy language"
                searchPlaceholder="Search languages"
                options={ATRIA_LANGUAGES}
                selected={filters.languages}
                onChange={(languages) => patchFilters({ languages })}
              />

              <span className="mx-0.5 hidden h-4 w-px bg-[#E2E6EF] sm:inline-block" />

              {/* 17. Partner ads */}
              <PartnerAdsFilter
                open={openPopover === "partner_ads"}
                onOpenChange={setPopoverFor("partner_ads")}
                value={filters.partnerAdsOnly}
                onChange={(partnerAdsOnly) => patchFilters({ partnerAdsOnly })}
              />
            </div>
          </div>

          {/* LINE 3: PERFORMANCE (5) */}
          <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-0">
            <span className="w-[80px] shrink-0 text-[11.5px] font-medium text-[#64748B]">
              Performance
            </span>
            <div className="flex flex-wrap items-center gap-1.5">
              {/* 18. Impression rank */}
              <ImpressionRankFilter
                open={openPopover === "impression_rank"}
                onOpenChange={setPopoverFor("impression_rank")}
                top={filters.impressionRankTop}
                mode={filters.impressionRankMode}
                period={filters.impressionRankPeriod}
                onChange={patchFilters}
              />

              {/* 19. Impression growth */}
              <GrowthFilterSlot
                pillLabel="Impression growth"
                open={openPopover === "impression_growth"}
                onOpenChange={setPopoverFor("impression_growth")}
                title="Impression growth"
                subtitle="Find ads gaining or losing impression momentum"
                value={filters.impressionGrowth}
                onChange={(impressionGrowth) =>
                  patchFilters({ impressionGrowth })
                }
                periods={["7 days", "14 days", "1 month"]}
              />

              {/* 20. Reach */}
              <RangeFilterSlot
                pillLabel="Reach"
                activeLabel={formatRangeBadge(filters.reach)}
                open={openPopover === "reach"}
                onOpenChange={setPopoverFor("reach")}
                title="Reach"
                subtitle="Filter Meta & TikTok EU/UK ads by reach"
                minBound={0}
                maxBound={2_000_000}
                step={50_000}
                ticks={["0", "500K", "1M", "1.5M", "No limit"]}
                value={filters.reach}
                onChange={(reach) => patchFilters({ reach })}
                windowOptions={["Today", "7d avg", "30d avg", "All time"]}
                windowLabel="Time period"
                quickRanges={[
                  { label: "≤500K", min: null, max: 500_000 },
                  { label: "500K–1M", min: 500_000, max: 1_000_000 },
                  { label: "1M–2M", min: 1_000_000, max: 2_000_000 },
                  { label: "≥2M", min: 2_000_000, max: null },
                ]}
              />

              {/* 21. Reach growth */}
              <GrowthFilterSlot
                pillLabel="Reach growth"
                open={openPopover === "reach_growth"}
                onOpenChange={setPopoverFor("reach_growth")}
                title="Reach growth"
                subtitle="Filter EU/UK ads by recent reach trend"
                value={filters.reachGrowth}
                onChange={(reachGrowth) => patchFilters({ reachGrowth })}
                periods={["7 days", "14 days", "1 month"]}
              />

              {/* 22. Ad spend */}
              <RangeFilterSlot
                pillLabel="Ad spend"
                activeLabel={formatRangeBadge(filters.adSpend, "", "$")}
                open={openPopover === "ad_spend"}
                onOpenChange={setPopoverFor("ad_spend")}
                title="Est. ad spend"
                subtitle="Estimated ad spend = Reach ÷ 1,000 × CPM"
                badge={
                  <span className="inline-flex items-center gap-1 rounded border border-[#E2E6EF] bg-[#F3F5F9] px-1.5 py-0.5 text-[10px] font-semibold text-[#475569]">
                    <Globe className="h-2.5 w-2.5 text-[#64748B]" />
                    EU/UK
                  </span>
                }
                prefix="$"
                minBound={0}
                maxBound={50_000}
                step={500}
                ticks={["$0", "$10K", "$25K", "$40K", "No limit"]}
                value={filters.adSpend}
                onChange={(adSpend) => patchFilters({ adSpend })}
                windowOptions={["Today", "7d avg", "30d avg", "All time"]}
                windowLabel="Time period"
                extraContent={
                  <div className="rounded-xl border border-[#ECEFF5] bg-[#FAFBFD] px-3 py-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11.5px] font-medium text-[#64748B]">
                        Assumed CPM
                      </span>
                      <div className="flex items-center gap-2">
                        <div className="flex w-20 items-center rounded-lg border border-[#D8DDE6] bg-white px-2 py-1 focus-within:border-[#0027eb]">
                          <span className="mr-1 text-[11px] text-[#94A3B8]">
                            $
                          </span>
                          <input
                            type="number"
                            min={1}
                            max={250}
                            value={assumedCpm}
                            onChange={(e) => {
                              const next = Number(e.target.value);
                              if (Number.isFinite(next) && next > 0) {
                                onAssumedCpmChange(next);
                              }
                            }}
                            aria-label="Assumed CPM"
                            className="w-full bg-transparent font-mono-num text-[12px] font-semibold text-[#0F172A] outline-none"
                          />
                        </div>
                        <button
                          type="button"
                          data-no-glass="true"
                          onClick={() =>
                            onAssumedCpmChange(DEFAULT_ASSUMED_CPM)
                          }
                          className="text-[11.5px] font-medium text-[#475569] hover:text-[#0F172A]"
                        >
                          Reset
                        </button>
                      </div>
                    </div>
                  </div>
                }
                quickRanges={[
                  { label: "≥$1K", min: 1_000, max: null },
                  { label: "≥$5K", min: 5_000, max: null },
                  { label: "≥$15K", min: 15_000, max: null },
                ]}
                width={380}
              />
            </div>
          </div>
        </div>
      )}

      {/* ====================================================================
          MODALS: CREATE VIEW · MANAGE VIEWS · CAN'T FIND AN ADVERTISER
         ==================================================================== */}
      <AtriaCreateViewModal
        open={createViewOpen}
        onClose={() => setCreateViewOpen(false)}
        sortLabel={currentSortMeta.label}
        activeSummaryBadges={activeSummaryBadges}
        onCreate={handleCreateCustomView}
      />

      <AtriaManageViewsModal
        open={manageViewsOpen}
        onClose={() => setManageViewsOpen(false)}
        systemViews={["Trending", "Following", "All ads"]}
        customViews={customViews}
        onDeleteView={handleDeleteCustomView}
        onOpenCreateView={() => setCreateViewOpen(true)}
      />

      <CantFindAdvertiserModal
        open={cantFindOpen}
        onClose={() => setCantFindOpen(false)}
        onRequestAdvertiser={onOpenRequestBrand}
      />
    </div>
  );
}
