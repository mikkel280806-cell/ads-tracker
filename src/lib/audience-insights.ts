import type { Ad, Brand, CountryReachBreakdown } from "./types";

export interface CountryDisplay {
  code: string;
  flag: string;
  name: string;
}

export const COUNTRY_META: Record<string, { flag: string; name: string }> = {
  DK: { flag: "🇩🇰", name: "Danmark" },
  SE: { flag: "🇸🇪", name: "Sverige" },
  NO: { flag: "🇳🇴", name: "Norge" },
  DE: { flag: "🇩🇪", name: "Tyskland" },
  FR: { flag: "🇫🇷", name: "Frankrig" },
  NL: { flag: "🇳🇱", name: "Holland" },
  BE: { flag: "🇧🇪", name: "Belgien" },
  AT: { flag: "🇦🇹", name: "Østrig" },
  CH: { flag: "🇨🇭", name: "Schweiz" },
  ES: { flag: "🇪🇸", name: "Spanien" },
  IT: { flag: "🇮🇹", name: "Italien" },
  PL: { flag: "🇵🇱", name: "Polen" },
  FI: { flag: "🇫🇮", name: "Finland" },
  IE: { flag: "🇮🇪", name: "Irland" },
  PT: { flag: "🇵🇹", name: "Portugal" },
  CZ: { flag: "🇨🇿", name: "Tjekkiet" },
  RO: { flag: "🇷🇴", name: "Rumænien" },
  HU: { flag: "🇭🇺", name: "Ungarn" },
  GR: { flag: "🇬🇷", name: "Grækenland" },
  GB: { flag: "🇬🇧", name: "UK" },
  US: { flag: "🇺🇸", name: "USA" },
  CA: { flag: "🇨🇦", name: "Canada" },
  AU: { flag: "🇦🇺", name: "Australien" },
};

export function getCountryDisplay(rawCode: string): CountryDisplay {
  const code = String(rawCode || "").trim().toUpperCase();
  const known = COUNTRY_META[code];
  if (known) return { code, ...known };
  if (/^[A-Z]{2}$/.test(code)) {
    const flag = String.fromCodePoint(
      ...[...code].map((ch) => 127397 + ch.charCodeAt(0))
    );
    return { code, flag, name: code };
  }
  return { code, flag: "🌍", name: code || "Global" };
}

const AGE_ORDER = ["18-24", "25-34", "35-44", "45-54", "55-64", "65+"] as const;

export interface AudienceAgeBand {
  ageRange: string;
  male: number;
  female: number;
  unknown: number;
  total: number;
  pct: number;
}

export interface AudienceCountrySummary {
  code: string;
  flag: string;
  name: string;
  reach: number;
  pct: number;
}

export interface AudienceSummary {
  hasData: boolean;
  hasBreakdown: boolean;
  totalReach: number;
  adsWithReach: number;
  maleReach: number;
  femaleReach: number;
  unknownReach: number;
  malePct: number;
  femalePct: number;
  dominantGender: "Women" | "Men" | "All";
  ageBands: AudienceAgeBand[];
  peakAgeRange: string | null;
  coreAgeSpan: string | null;
  countries: AudienceCountrySummary[];
  headline: string;
  targetAgeMin?: number;
  targetAgeMax?: number;
  targetGender?: string;
}

function buildAudienceSummary(
  breakdowns: CountryReachBreakdown[],
  totalReachSum: number,
  adsWithReach: number,
  fallbackCountries: string[],
  fallbackGender?: string,
  targetAgeMin?: number,
  targetAgeMax?: number
): AudienceSummary {
  const ageMap = new Map<string, { male: number; female: number; unknown: number }>();
  const countryMap = new Map<string, number>();

  let maleReach = 0;
  let femaleReach = 0;
  let unknownReach = 0;

  for (const countryEntry of breakdowns) {
    const cCode = String(countryEntry.country || "").toUpperCase();
    let countrySum = 0;
    for (const row of countryEntry.age_gender_breakdowns || []) {
      const m = Number(row.male) || 0;
      const f = Number(row.female) || 0;
      const u = Number(row.unknown) || 0;
      const sum = m + f + u;
      if (sum <= 0) continue;

      maleReach += m;
      femaleReach += f;
      unknownReach += u;
      countrySum += sum;

      const range = String(row.age_range || "Unknown");
      if (range !== "Unknown") {
        const cur = ageMap.get(range) || { male: 0, female: 0, unknown: 0 };
        cur.male += m;
        cur.female += f;
        cur.unknown += u;
        ageMap.set(range, cur);
      }
    }
    if (cCode && countrySum > 0) {
      countryMap.set(cCode, (countryMap.get(cCode) || 0) + countrySum);
    }
  }

  const breakdownTotal = maleReach + femaleReach + unknownReach;
  const knownGenderTotal = maleReach + femaleReach;
  const hasBreakdown = breakdownTotal > 0;

  let malePct = 0;
  let femalePct = 0;
  if (knownGenderTotal > 0) {
    femalePct = Math.round((femaleReach / knownGenderTotal) * 100);
    malePct = 100 - femalePct;
  } else if (fallbackGender) {
    const g = fallbackGender.toLowerCase();
    if (g.includes("women") || g.includes("female")) {
      femalePct = 100;
      malePct = 0;
    } else if (g.includes("men") && !g.includes("women")) {
      malePct = 100;
      femalePct = 0;
    } else {
      femalePct = 50;
      malePct = 50;
    }
  }

  let dominantGender: "Women" | "Men" | "All" = "All";
  if (knownGenderTotal > 0) {
    if (femalePct >= 62) dominantGender = "Women";
    else if (malePct >= 62) dominantGender = "Men";
    else dominantGender = "All";
  } else if (fallbackGender) {
    const g = fallbackGender.toLowerCase();
    if (g.includes("women") || g.includes("female")) dominantGender = "Women";
    else if (g.includes("men") && !g.includes("women")) dominantGender = "Men";
  }

  const ageTotal = Array.from(ageMap.values()).reduce(
    (s, v) => s + v.male + v.female + v.unknown,
    0
  );

  const ageBands: AudienceAgeBand[] = AGE_ORDER.map((ageRange) => {
    const entry = ageMap.get(ageRange) || { male: 0, female: 0, unknown: 0 };
    const total = entry.male + entry.female + entry.unknown;
    return {
      ageRange,
      male: entry.male,
      female: entry.female,
      unknown: entry.unknown,
      total,
      pct: ageTotal > 0 ? Math.round((total / ageTotal) * 100) : 0,
    };
  });

  const nonZeroAges = ageBands.filter((b) => b.total > 0);
  const peakBand =
    nonZeroAges.length > 0
      ? [...nonZeroAges].sort((a, b) => b.total - a.total)[0]
      : null;
  const peakAgeRange = peakBand ? peakBand.ageRange : null;

  // Compute smart core age span (top 1-2 adjacent bands covering >= 50% of reach)
  let coreAgeSpan: string | null = null;
  if (peakBand && ageTotal > 0) {
    const peakIdx = AGE_ORDER.indexOf(peakBand.ageRange as (typeof AGE_ORDER)[number]);
    const prevBand = peakIdx > 0 ? ageBands[peakIdx - 1] : null;
    const nextBand = peakIdx < ageBands.length - 1 ? ageBands[peakIdx + 1] : null;

    if (peakBand.pct >= 48) {
      coreAgeSpan = peakBand.ageRange;
    } else if (prevBand || nextBand) {
      const neighbor =
        (nextBand?.total || 0) >= (prevBand?.total || 0) ? nextBand : prevBand;
      if (neighbor && neighbor.pct >= 18) {
        const pair = [peakBand.ageRange, neighbor.ageRange].sort(
          (a, b) =>
            AGE_ORDER.indexOf(a as (typeof AGE_ORDER)[number]) -
            AGE_ORDER.indexOf(b as (typeof AGE_ORDER)[number])
        );
        const start = pair[0].split("-")[0].replace("+", "");
        const end = pair[1].includes("+") ? "65+" : pair[1].split("-")[1];
        coreAgeSpan = `${start}–${end}`;
      } else {
        coreAgeSpan = peakBand.ageRange;
      }
    }
  } else if (typeof targetAgeMin === "number" && typeof targetAgeMax === "number") {
    coreAgeSpan = `${targetAgeMin}–${targetAgeMax >= 65 ? "65+" : targetAgeMax}`;
  }

  // Country summary
  const countriesTotal = Array.from(countryMap.values()).reduce((s, n) => s + n, 0);
  let countries: AudienceCountrySummary[] = Array.from(countryMap.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([code, reach]) => {
      const disp = getCountryDisplay(code);
      return {
        ...disp,
        reach,
        pct: countriesTotal > 0 ? Math.max(1, Math.round((reach / countriesTotal) * 100)) : 0,
      };
    });

  if (countries.length === 0 && fallbackCountries.length > 0) {
    const uniqueCodes = Array.from(new Set(fallbackCountries.map((c) => c.toUpperCase())));
    countries = uniqueCodes.map((code) => ({
      ...getCountryDisplay(code),
      reach: 0,
      pct: 0,
    }));
  }

  // Build smart Danish summary headline
  const genderLabel =
    dominantGender === "Women"
      ? knownGenderTotal > 0
        ? `Kvinder (${femalePct}%)`
        : "Kvinder"
      : dominantGender === "Men"
        ? knownGenderTotal > 0
          ? `Mænd (${malePct}%)`
          : "Mænd"
        : "Kvinder & Mænd";

  const ageLabel = coreAgeSpan ? `${coreAgeSpan} år` : "";
  const topCountry = countries[0];
  const countryLabel = topCountry ? `${topCountry.flag} ${topCountry.name}` : "";

  const parts = [
    [genderLabel, ageLabel].filter(Boolean).join(" "),
    countryLabel,
  ].filter(Boolean);

  const hasData =
    hasBreakdown ||
    totalReachSum > 0 ||
    countries.length > 0 ||
    Boolean(fallbackGender);

  return {
    hasData,
    hasBreakdown,
    totalReach: totalReachSum || breakdownTotal,
    adsWithReach,
    maleReach,
    femaleReach,
    unknownReach,
    malePct,
    femalePct,
    dominantGender,
    ageBands,
    peakAgeRange,
    coreAgeSpan,
    countries,
    headline: parts.join(" · "),
    targetAgeMin,
    targetAgeMax,
    targetGender: fallbackGender,
  };
}

export function summarizeAdAudience(ad: Ad): AudienceSummary {
  const reach = typeof ad.eu_reach === "number" && ad.eu_reach > 0 ? ad.eu_reach : 0;
  return buildAudienceSummary(
    ad.audience_breakdown || [],
    reach,
    reach > 0 ? 1 : 0,
    ad.targeted_countries || [],
    ad.gender_audience,
    ad.age_min,
    ad.age_max
  );
}

export function summarizeAdsAudience(ads: Ad[]): AudienceSummary {
  const allBreakdowns: CountryReachBreakdown[] = [];
  const fallbackCountries: string[] = [];
  let totalReach = 0;
  let adsWithReach = 0;
  let fallbackGender: string | undefined;

  for (const ad of ads) {
    if (typeof ad.eu_reach === "number" && ad.eu_reach > 0) {
      totalReach += ad.eu_reach;
      adsWithReach++;
    }
    if (Array.isArray(ad.audience_breakdown) && ad.audience_breakdown.length > 0) {
      for (const b of ad.audience_breakdown) allBreakdowns.push(b);
    }
    if (Array.isArray(ad.targeted_countries)) {
      for (const c of ad.targeted_countries) fallbackCountries.push(c);
    }
    if (!fallbackGender && ad.gender_audience) {
      fallbackGender = ad.gender_audience;
    }
  }

  return buildAudienceSummary(
    allBreakdowns,
    totalReach,
    adsWithReach,
    fallbackCountries,
    fallbackGender
  );
}

/**
 * Matches an ad against an age filter bucket (e.g. "18-24", "25-34", "35-44", "45-54", "55+").
 * Checks peak age range or significant share (>= 25% of ad's reach in that age bracket).
 */
export function adMatchesAgeBucket(ad: Ad, bucket: string): boolean {
  if (!bucket || bucket === "all") return true;
  const summary = summarizeAdAudience(ad);
  if (!summary.hasBreakdown) return false;
  if (bucket === "55+") {
    const pct55 =
      (summary.ageBands.find((b) => b.ageRange === "55-64")?.pct || 0) +
      (summary.ageBands.find((b) => b.ageRange === "65+")?.pct || 0);
    return (
      summary.peakAgeRange === "55-64" ||
      summary.peakAgeRange === "65+" ||
      pct55 >= 30
    );
  }
  const band = summary.ageBands.find((b) => b.ageRange === bucket);
  return summary.peakAgeRange === bucket || (band ? band.pct >= 28 : false);
}

export const FX_TO_DKK: Record<string, number> = {
  DKK: 1,
  KR: 1,
  USD: 6.95,
  EUR: 7.46,
  GBP: 8.85,
  AUD: 4.55,
  CAD: 4.95,
  SEK: 0.65,
  NOK: 0.63,
};

export function convertToDkk(amount: number, rawCurrency?: string): number {
  const cur = (rawCurrency || "USD").trim().toUpperCase();
  const rate = FX_TO_DKK[cur] ?? FX_TO_DKK.USD;
  return amount * rate;
}

export function formatProductPriceDkk(
  rawPrice?: string,
  rawCurrency?: string
): string {
  if (!rawPrice) return "";
  const trimmed = rawPrice.trim();
  if (!trimmed) return "";

  const num = parseNumericPrice(trimmed);
  if (num === null) return trimmed;

  let cur = (rawCurrency || "").trim().toUpperCase();
  if (!cur) {
    if (trimmed.startsWith("$") || /\bUSD\b/i.test(trimmed)) cur = "USD";
    else if (trimmed.startsWith("€") || /\bEUR\b/i.test(trimmed)) cur = "EUR";
    else if (trimmed.startsWith("£") || /\bGBP\b/i.test(trimmed)) cur = "GBP";
    else if (/\bAUD\b|A\$/i.test(trimmed)) cur = "AUD";
    else if (/\bCAD\b|CA\$/i.test(trimmed)) cur = "CAD";
    else if (/\bSEK\b/i.test(trimmed)) cur = "SEK";
    else if (/\bNOK\b/i.test(trimmed)) cur = "NOK";
    else if (/\bDKK\b|kr\.?$/i.test(trimmed)) cur = "DKK";
    else cur = "USD";
  }

  const dkk = Math.round(convertToDkk(num, cur));
  return `${dkk.toLocaleString("da-DK")} kr.`;
}

export interface ShopRevenueEstimate {
  monthlyRevenue: number;
  monthlyRevenueDkk: number;
  monthlyRevenueUsd: number;
  formattedRevenue: string;
  formattedAov: string;
  cvrPct: number;
  hasBundles: boolean;
  bundleProductsCount: number;
  basedOnPrices: number;
  currency: "DKK";
  aovSource: "firecrawl" | "estimated";
  aovNote?: string;
}

const BUNDLE_TITLE_RE =
  /\b(bundle|kit|set|pack|duo|trio|combo|system|sæt|pakke|starter|routine|value|multipack|complete|2-pack|3-pack|4-pack)\b/i;
const BUNDLE_APP_RE =
  /rebuy|kaching|wide bundles|vitals|upcart|aftersell|zipify|bundle/i;
const FILLER_ACCESSORY_RE =
  /\b(shipping protection|ekstra fyld|kopholder|beskyttelses|replacement filter|pillowcase|pillow case|travel bag|refresh set|gift card|gavekort|add-on|refill|spare|extra cover|betræk|etui|cover only|case only)\b/i;

function parseNumericPrice(raw?: string): number | null {
  if (!raw) return null;
  const cleaned = raw.replace(/[^0-9.,]/g, "").trim();
  if (!cleaned) return null;
  let normalized = cleaned;
  if (cleaned.includes(",") && cleaned.includes(".")) {
    normalized =
      cleaned.lastIndexOf(",") > cleaned.lastIndexOf(".")
        ? cleaned.replace(/\./g, "").replace(",", ".")
        : cleaned.replace(/,/g, "");
  } else if (cleaned.includes(",")) {
    const parts = cleaned.split(",");
    normalized =
      parts[parts.length - 1].length <= 2
        ? cleaned.replace(",", ".")
        : cleaned.replace(/,/g, "");
  }
  const n = Number(normalized);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function normalizeCurrency(
  rawCurrency?: string,
  market?: Brand["market"]
): string {
  const c = (rawCurrency || (market === "DK" ? "DKK" : "USD")).toUpperCase();
  if (c === "KR") return "DKK";
  if (FX_TO_DKK[c]) return c;
  return "USD";
}

/**
 * Shared Est. Monthly Revenue model:
 * 1) Uses Firecrawl-verified review-weighted & in-page bundle AOV when stored on Brand
 * 2) Otherwise weights hero bestsellers by review counts + Meta Ad LP hits + Pareto rank decay
 *    (filtering out low-price filler accessories like pillowcases / shipping protection).
 */
export function estimateShopRevenueSummary(
  brand: Brand,
  brandAds?: Ad[]
): ShopRevenueEstimate {
  const visits = brand.monthly_visits || 0;
  const bestsellers = (
    brand.top_products && brand.top_products.length > 0
      ? brand.top_products
      : brand.latest_products || []
  ).slice(0, 12);

  const bundleProductsCount = bestsellers.filter(
    (p) =>
      BUNDLE_TITLE_RE.test(p.title || "") ||
      (Array.isArray(p.bundle_tiers) && p.bundle_tiers.length >= 2)
  ).length;
  const hasBundleApp = (brand.shopify_apps || []).some((app) =>
    BUNDLE_APP_RE.test(app)
  );
  const hasBundles = Boolean(
    brand.aov_has_bundles || bundleProductsCount > 0 || hasBundleApp
  );

  // Build Meta Ad landing-page hits per product handle (if ads provided)
  const lpHitsByHandle = new Map<string, number>();
  if (Array.isArray(brandAds)) {
    for (const ad of brandAds) {
      const lp = String(ad.landing_page_path || ad.landing_page_url || "");
      const m = lp.match(/\/products\/([^/?#]+)/i);
      if (m) {
        const h = m[1].toLowerCase();
        lpHitsByHandle.set(h, (lpHitsByHandle.get(h) || 0) + (ad.duplicated_count || 1));
      }
    }
  }

  let currency: string;
  let estAov: number;
  let aovSource: "firecrawl" | "estimated" = "estimated";
  let basedOnPrices = 0;

  if (typeof brand.estimated_aov === "number" && brand.estimated_aov > 0) {
    currency = normalizeCurrency(
      brand.estimated_aov_currency || brand.currency,
      brand.market
    );
    estAov = Math.round(brand.estimated_aov);
    aovSource = brand.aov_source || "firecrawl";
    basedOnPrices = bestsellers.length;
  } else {
    currency = normalizeCurrency(
      bestsellers.find((p) => p.currency)?.currency || brand.currency,
      brand.market
    );

    const parsedProducts = bestsellers
      .map((p, idx) => {
        const unitPrice = parseNumericPrice(p.price);
        const effPrice =
          typeof p.effective_aov === "number" && p.effective_aov > 0
            ? p.effective_aov
            : unitPrice;
        const handle = (
          p.handle ||
          (p.url || "").match(/\/products\/([^/?#]+)/i)?.[1] ||
          ""
        ).toLowerCase();
        const adHits = handle ? lpHitsByHandle.get(handle) || 0 : 0;
        const isFiller = FILLER_ACCESSORY_RE.test(p.title || "");
        return {
          idx,
          price: effPrice,
          hasEffective: typeof p.effective_aov === "number" && p.effective_aov > 0,
          reviews: typeof p.review_count === "number" && p.review_count > 0 ? p.review_count : 0,
          adHits,
          isFiller,
        };
      })
      .filter((x): x is typeof x & { price: number } => x.price !== null);

    basedOnPrices = parsedProducts.length;
    const nonFillers = parsedProducts.filter((p) => !p.isFiller);
    const pool = nonFillers.length > 0 ? nonFillers : parsedProducts;

    if (pool.length > 0) {
      const anyReviews = pool.some((p) => p.reviews > 0);
      let weightedSum = 0;
      let totalWeight = 0;

      for (let i = 0; i < pool.length; i++) {
        const item = pool[i];
        const adBoost = 1 + Math.min(1.4, item.adHits * 0.14);
        const weight = anyReviews
          ? (item.reviews > 0 ? item.reviews : 35) * adBoost
          : (1 / Math.pow(i + 1, 1.45)) * adBoost;
        const itemMult = item.hasEffective
          ? 1
          : bundleProductsCount >= 2
            ? 1.3
            : hasBundles
              ? 1.24
              : 1.14;
        weightedSum += item.price * itemMult * weight;
        totalWeight += weight;
      }

      estAov = Math.round(weightedSum / Math.max(0.001, totalWeight));
    } else {
      estAov = currency === "DKK" ? 449 : 68;
    }
  }

  const aovDkk = Math.round(convertToDkk(estAov, currency));
  const aovUsd = aovDkk / FX_TO_DKK.USD;

  let cvrPct = 2.0;
  if (aovUsd >= 600) cvrPct = 1.2;
  else if (aovUsd >= 250) cvrPct = 1.6;
  else if (aovUsd <= 35) cvrPct = 2.3;
  if (hasBundles && aovUsd < 250) cvrPct = Number((cvrPct + 0.1).toFixed(1));

  const monthlyRevenueDkk = Math.round(visits * (cvrPct / 100) * aovDkk);
  const monthlyRevenueUsd = Math.round(visits * (cvrPct / 100) * aovUsd);

  const formatCompactDkk = (val: number) => {
    const abs = Math.abs(val);
    let numStr: string;
    if (abs >= 1_000_000) numStr = `${(val / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
    else if (abs >= 1_000) numStr = `${Math.round(val / 1_000)}K`;
    else numStr = `${Math.round(val)}`;
    return `${numStr.replace(".", ",")} kr.`;
  };

  return {
    monthlyRevenue: monthlyRevenueDkk,
    monthlyRevenueDkk,
    monthlyRevenueUsd,
    formattedRevenue: visits > 0 ? formatCompactDkk(monthlyRevenueDkk) : "—",
    formattedAov: `${aovDkk.toLocaleString("da-DK")} kr.`,
    cvrPct,
    hasBundles,
    bundleProductsCount,
    basedOnPrices,
    currency: "DKK",
    aovSource,
    aovNote: brand.aov_note,
  };
}

const formatCompactDkkValue = (val: number) => {
  const abs = Math.abs(val);
  let numStr: string;
  if (abs >= 1_000_000) numStr = `${(val / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  else if (abs >= 1_000) numStr = `${Math.round(val / 1_000)}K`;
  else numStr = `${Math.round(val)}`;
  return `${numStr.replace(".", ",")} kr.`;
};

/**
 * Returns estimated total & daily ad spend in DKK for any paid Meta Ad.
 * Uses scraper-provided `estimated_spend` (USD) or computes from `eu_reach`
 * using a realistic EU Meta CPM (~62 kr. / $9 per 1,000 reach).
 */
export function getAdSpendDkk(
  ad: Pick<Ad, "eu_reach" | "estimated_spend" | "daily_spend">,
  activeDays: number
): {
  totalDkk: number;
  dailyDkk: number;
  formattedTotal: string;
  formattedDaily: string;
} | null {
  const days = Math.max(1, activeDays || 1);
  let totalDkk = 0;

  if (typeof ad.estimated_spend === "number" && ad.estimated_spend > 0) {
    totalDkk = Math.round(convertToDkk(ad.estimated_spend, "USD"));
  } else if (typeof ad.eu_reach === "number" && ad.eu_reach > 0) {
    totalDkk = Math.max(10, Math.round((ad.eu_reach / 1000) * 62));
  }

  if (totalDkk <= 0) return null;

  const dailyDkk = Math.max(1, Math.round(totalDkk / days));
  return {
    totalDkk,
    dailyDkk,
    formattedTotal: formatCompactDkkValue(totalDkk),
    formattedDaily: formatCompactDkkValue(dailyDkk),
  };
}

export type OfferLeverId =
  | "discount"
  | "bundles"
  | "free_gift"
  | "subscription"
  | "guarantee"
  | "shipping"
  | "urgency"
  | "funnel";

export interface OfferLever {
  id: OfferLeverId;
  label: string;
  detail: string;
  adCount: number;
  adPct: number;
  storeSignal: boolean;
  sampleAd?: Ad;
}

export interface TestedOfferClaim {
  text: string;
  tag: string;
  ad: Ad;
}

export interface ShopOfferStrategy {
  levers: OfferLever[];
  testedClaims: TestedOfferClaim[];
  primaryStack: string;
  totalAdsAnalyzed: number;
}

/**
 * Analyzes a shop's real DTC E-commerce Offer Strategy across all live Meta Ads
 * (primary copy, headlines, descriptions, landing pages) + Shopify storefront signals
 * (compare-at discounts, bundle tiers, bundle/subscription apps).
 */
export function analyzeShopOfferStrategy(
  brand: Brand,
  brandAds: Ad[]
): ShopOfferStrategy {
  const totalAds = brandAds.length;
  const apps = (brand.shopify_apps || []).map((a) => a.toLowerCase());
  const topProds = brand.top_products || [];

  const getAdText = (ad: Ad) =>
    `${ad.headline || ""}\n${ad.primary_text || ""}\n${ad.link_description || ""}`;

  // 1. Discount / Sale (% off in ads OR compare_at_price on products)
  let maxAdPct = 0;
  const discountAds: Ad[] = [];
  for (const ad of brandAds) {
    const txt = getAdText(ad);
    const pcts = Array.from(
      txt.matchAll(
        /(?:up to|op til|save|spar|get|få|extra|ekstra)?\s*(\d{1,2})\s*%\s*(?:off|rabat|discount|tilbud|besparelse)?/gi
      )
    )
      .map((m) => parseInt(m[1], 10))
      .filter((n) => n >= 10 && n <= 85);
    const hasSaleWord =
      /\b(black friday|cyber monday|flash sale|udsalg|tilbud|rabatkode|promo code|discount code|halv pris|50% off)\b/i.test(
        txt
      );
    if (pcts.length > 0 || hasSaleWord) {
      discountAds.push(ad);
      for (const n of pcts) if (n > maxAdPct) maxAdPct = n;
    }
  }
  let maxProductPct = 0;
  for (const p of topProds) {
    const price = parseNumericPrice(p.price);
    const cmp = parseNumericPrice(p.compare_at_price);
    if (price && cmp && cmp > price) {
      const pct = Math.round(((cmp - price) / cmp) * 100);
      if (pct >= 8 && pct <= 85 && pct > maxProductPct) maxProductPct = pct;
    }
  }
  const bestPct = Math.max(maxAdPct, maxProductPct);

  // 2. Bundles & Volume / Tiered Pricing
  const bundleRe =
    /\b(bundle|starter\s*kit|value\s*pack|family\s*pack|multi[\s-]?pack|[234][\s-]?pack|buy\s*[234]|køb\s*[234]|pakketilbud|sæt|komplet\s*sæt|combo|bogo|buy\s*\d+\s*get\s*\d+|køb\s*\d+\s*få\s*\d+)\b/i;
  const bundleAds = brandAds.filter((ad) => bundleRe.test(getAdText(ad)));
  const detectedBundleApp = (brand.shopify_apps || []).find((a) =>
    /rebuy|kaching|wide bundles|aftersell|zipify|vitals|bundle/i.test(a)
  );
  const maxTiers = topProds.reduce(
    (max, p) => Math.max(max, p.bundle_tiers?.length || 0),
    0
  );
  const hasStoreBundles = Boolean(
    brand.aov_has_bundles ||
      maxTiers >= 2 ||
      detectedBundleApp ||
      topProds.some((p) => BUNDLE_TITLE_RE.test(p.title || ""))
  );

  // 3. Free Gift / GWP / BOGO
  const giftRe =
    /\b(free\s+gift|gratis\s+gave|gratis\s+med|free\s+[a-z]+\s+(?:included|worth|value)|gratis\s+[a-zæøå]+\s+(?:med|værdi)|bogo|buy\s*\d+\s*get\s*\d+\s*free|køb\s*\d+\s*få\s*\d+\s*gratis|\+\s*free\s+[a-z]+|\+\s*gratis\s+[a-zæøå]+)\b/i;
  const giftAds = brandAds.filter((ad) => giftRe.test(getAdText(ad)));
  const hasTitleGift = topProds.some((p) =>
    /\+\s*(?:free|gratis)\b/i.test(p.title || "")
  );

  // 4. Subscription / Subscribe & Save
  const subRe =
    /\b(subscribe\s*&?\s*save|subscription|abonnement|monthly\s*delivery|cancel\s*anytime|opsig\s*når\s*som\s*helst|pause\s*or\s*cancel|levering\s*hver\s*måned)\b/i;
  const subAds = brandAds.filter((ad) => subRe.test(getAdText(ad)));
  const detectedSubApp = (brand.shopify_apps || []).find((a) =>
    /recharge|skio|appstle|seal|loop\s*sub/i.test(a)
  );

  // 5. Risk Reversal: Trial & Guarantee
  const trialRe =
    /\b((\d{2,3})[\s-]*(?:day|days|dages|night|nights|nætters)\s*(?:trial|prøve|prøveperiode|sleep|søvn|garanti|guarantee|risk[\s-]?free)|money[\s-]?back|pengene\s*tilbage|tilfredshedsgaranti|risk[\s-]?free|prøv\s*(?:den|det|risikofrit))\b/i;
  let bestTrialDays = 0;
  const trialAds: Ad[] = [];
  for (const ad of brandAds) {
    const txt = getAdText(ad);
    const m = txt.match(trialRe);
    if (m) {
      trialAds.push(ad);
      const days = parseInt(m[2] || "0", 10);
      if (days >= 14 && days <= 365 && days > bestTrialDays) bestTrialDays = days;
    }
  }

  // 6. Free Shipping / Fast Delivery
  const shipRe =
    /\b(free\s*(?:express\s*|standard\s*)?shipping|fri\s*fragt|gratis\s*(?:fragt|levering)|dag[\s-]?til[\s-]?dag\s*levering|next[\s-]?day\s*delivery)\b/i;
  const shipAds = brandAds.filter((ad) => shipRe.test(getAdText(ad)));

  // 7. Urgency / Scarcity
  const urgencyRe =
    /\b(limited\s*(?:stock|time|edition|offer)|selling\s*(?:fast|out)|almost\s*sold\s*out|ends\s*(?:tonight|soon|today)|kun\s*i\s*dag|begrænset\s*(?:antal|tid)|få\s*på\s*lager|sidste\s*chance|snart\s*udsolgt)\b/i;
  const urgencyAds = brandAds.filter((ad) => urgencyRe.test(getAdText(ad)));

  // 8. Dedicated Funnel / Listicle / Quiz LPs
  const funnelAds = brandAds.filter((ad) => {
    const p = (ad.landing_page_path || "").toLowerCase();
    return (
      p.startsWith("/pages/") ||
      p.includes("/quiz") ||
      p.includes("/offer") ||
      p.includes("/lp") ||
      p.includes("/am/")
    );
  });

  const makePct = (count: number) =>
    totalAds > 0 ? Math.round((count / totalAds) * 100) : 0;

  const levers: OfferLever[] = [];

  if (discountAds.length > 0 || maxProductPct >= 10) {
    levers.push({
      id: "discount",
      label: "Rabat & Tilbud",
      detail: bestPct > 0 ? `Op til ${bestPct}% rabat` : "Aktiv kampagne / rabat",
      adCount: discountAds.length,
      adPct: makePct(discountAds.length),
      storeSignal: maxProductPct >= 10,
      sampleAd: discountAds[0],
    });
  }

  if (bundleAds.length > 0 || hasStoreBundles) {
    const detail =
      maxTiers >= 2
        ? `${maxTiers} bundle-tiers på produktside`
        : detectedBundleApp
          ? `Bundles via ${detectedBundleApp}`
          : bundleAds.length > 0
            ? "Pakketilbud & mængderabat"
            : "Bundle-produkter i katalog";
    levers.push({
      id: "bundles",
      label: "Bundles & Pakker",
      detail,
      adCount: bundleAds.length,
      adPct: makePct(bundleAds.length),
      storeSignal: hasStoreBundles,
      sampleAd: bundleAds[0],
    });
  }

  if (giftAds.length > 0 || hasTitleGift) {
    levers.push({
      id: "free_gift",
      label: "Gratis gave",
      detail:
        giftAds.length > 0
          ? "Free gift / BOGO i annoncer"
          : "Gratis tilbehør inkl. i køb",
      adCount: giftAds.length,
      adPct: makePct(giftAds.length),
      storeSignal: hasTitleGift,
      sampleAd: giftAds[0],
    });
  }

  if (subAds.length > 0 || Boolean(detectedSubApp)) {
    levers.push({
      id: "subscription",
      label: "Abonnement",
      detail: detectedSubApp
        ? `Subscribe & Save (${detectedSubApp})`
        : "Subscribe & Save i annoncer",
      adCount: subAds.length,
      adPct: makePct(subAds.length),
      storeSignal: Boolean(detectedSubApp),
      sampleAd: subAds[0],
    });
  }

  if (trialAds.length > 0) {
    levers.push({
      id: "guarantee",
      label: "Prøve & Garanti",
      detail:
        bestTrialDays > 0
          ? `${bestTrialDays} dages prøveperiode`
          : "Tilfredsheds- / pengene tilbage",
      adCount: trialAds.length,
      adPct: makePct(trialAds.length),
      storeSignal: false,
      sampleAd: trialAds[0],
    });
  }

  if (shipAds.length > 0) {
    levers.push({
      id: "shipping",
      label: "Fri fragt",
      detail: "Gratis levering fremhævet",
      adCount: shipAds.length,
      adPct: makePct(shipAds.length),
      storeSignal: false,
      sampleAd: shipAds[0],
    });
  }

  if (funnelAds.length >= 2) {
    levers.push({
      id: "funnel",
      label: "Dedicated Funnels",
      detail: `${funnelAds.length} ads → LP / advertorial`,
      adCount: funnelAds.length,
      adPct: makePct(funnelAds.length),
      storeSignal: false,
      sampleAd: funnelAds[0],
    });
  }

  if (urgencyAds.length >= 2) {
    levers.push({
      id: "urgency",
      label: "Urgency & Knaphed",
      detail: "Begrænset lager / tidsfrist",
      adCount: urgencyAds.length,
      adPct: makePct(urgencyAds.length),
      storeSignal: false,
      sampleAd: urgencyAds[0],
    });
  }

  // Also check Klarna/Anyday BNPL if few levers detected
  if (levers.length < 2 && apps.some((a) => a.includes("klarna") || a.includes("anyday"))) {
    levers.push({
      id: "discount",
      label: "Delbetaling",
      detail: "Klarna / Anyday i checkout",
      adCount: 0,
      adPct: 0,
      storeSignal: true,
    });
  }

  // Sort by live ad volume first, then storefront signal
  levers.sort(
    (a, b) =>
      b.adCount - a.adCount || (b.storeSignal ? 1 : 0) - (a.storeSignal ? 1 : 0)
  );

  // Extract up to 3 crisp, distinct live offer headlines/claims from their ads
  const testedClaims: TestedOfferClaim[] = [];
  const seenClaims = new Set<string>();
  const OFFER_LINE_RE =
    /(\d{1,2}\s*%\s*(?:off|rabat)|free\s+gift|gratis\s+(?:gave|fragt|med)|bogo|buy\s*\d+\s*get|køb\s*\d+\s*(?:få|spar)|subscribe\s*&?\s*save|abonnement|\d{2,3}[\s-]*(?:day|dages|night|nætters)\s*(?:trial|prøve|garanti)|bundle|starter\s*kit|black\s*friday|flash\s*sale)/i;

  for (const ad of brandAds) {
    if (testedClaims.length >= 3) break;
    const candidates = [ad.headline, ad.link_description, ad.extracted_hook]
      .map((s) => (s || "").replace(/\s+/g, " ").trim())
      .filter((s) => s.length >= 8 && s.length <= 72);

    for (const cand of candidates) {
      if (!OFFER_LINE_RE.test(cand)) continue;
      const key = cand.toLowerCase().replace(/[^a-z0-9æøå%]/g, "").slice(0, 32);
      if (!key || seenClaims.has(key)) continue;
      seenClaims.add(key);

      let tag = "Offer";
      if (/\d{1,2}\s*%/i.test(cand)) tag = "Rabat";
      else if (/gift|gratis\s+(?:gave|med)|bogo/i.test(cand)) tag = "Gave";
      else if (/bundle|kit|pack|køb\s*[234]/i.test(cand)) tag = "Bundle";
      else if (/subscrib|abonnement/i.test(cand)) tag = "Abo";
      else if (/trial|prøve|garanti/i.test(cand)) tag = "Garanti";
      else if (/fragt|shipping/i.test(cand)) tag = "Fragt";

      testedClaims.push({ text: cand, tag, ad });
      break;
    }
  }

  const primaryStack =
    levers.length > 0
      ? levers
          .slice(0, 3)
          .map((l) => l.label)
          .join(" · ")
      : "Fokus på produktværdi & brand";

  return {
    levers: levers.slice(0, 6),
    testedClaims,
    primaryStack,
    totalAdsAnalyzed: totalAds,
  };
}
