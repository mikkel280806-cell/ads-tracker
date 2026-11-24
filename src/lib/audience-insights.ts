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

export interface ShopRevenueEstimate {
  monthlyRevenue: number;
  monthlyRevenueUsd: number;
  formattedRevenue: string;
  formattedAov: string;
  cvrPct: number;
  hasBundles: boolean;
  bundleProductsCount: number;
  basedOnPrices: number;
  currency: "DKK" | "EUR" | "GBP" | "USD";
}

const BUNDLE_TITLE_RE =
  /\b(bundle|kit|set|pack|duo|trio|combo|system|sæt|pakke|starter|routine|value|multipack|complete|2-pack|3-pack|4-pack)\b/i;
const BUNDLE_APP_RE =
  /rebuy|kaching|wide bundles|vitals|upcart|aftersell|zipify|bundle/i;

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

/**
 * Shared Est. Monthly Revenue model (Monthly Visits × ~2% CVR × Est. AOV from bestsellers & bundles).
 * Used in both ShopAnalyticsView (KPI card) and ShopsTableView (Filters & Sort).
 */
export function estimateShopRevenueSummary(brand: Brand): ShopRevenueEstimate {
  const visits = brand.monthly_visits || 0;
  const bestsellers = (
    brand.top_products && brand.top_products.length > 0
      ? brand.top_products
      : brand.latest_products || []
  ).slice(0, 12);

  const rawCurrency = (
    bestsellers.find((p) => p.currency)?.currency ||
    brand.currency ||
    (brand.market === "DK" ? "DKK" : "USD")
  ).toUpperCase();
  const currency: "DKK" | "EUR" | "GBP" | "USD" =
    rawCurrency === "DKK" || rawCurrency === "KR"
      ? "DKK"
      : rawCurrency === "EUR"
        ? "EUR"
        : rawCurrency === "GBP"
          ? "GBP"
          : "USD";

  const prices = bestsellers
    .map((p) => parseNumericPrice(p.price))
    .filter((n): n is number => n !== null)
    .sort((a, b) => a - b);

  const medianPrice =
    prices.length > 0
      ? prices[Math.floor(prices.length / 2)]
      : currency === "DKK"
        ? 399
        : 58;

  const bundleProductsCount = bestsellers.filter((p) =>
    BUNDLE_TITLE_RE.test(p.title || "")
  ).length;
  const hasBundleApp = (brand.shopify_apps || []).some((app) =>
    BUNDLE_APP_RE.test(app)
  );
  const hasBundles = bundleProductsCount > 0 || hasBundleApp;

  const aovMultiplier = bundleProductsCount >= 2 ? 1.32 : hasBundles ? 1.24 : 1.12;
  const estAov = Math.round(medianPrice * aovMultiplier);

  const aovUsd =
    currency === "DKK"
      ? estAov / 6.9
      : currency === "EUR"
        ? estAov * 1.08
        : currency === "GBP"
          ? estAov * 1.27
          : estAov;

  let cvrPct = 2.0;
  if (aovUsd >= 600) cvrPct = 1.2;
  else if (aovUsd >= 250) cvrPct = 1.6;
  else if (aovUsd <= 35) cvrPct = 2.4;
  if (hasBundles && aovUsd < 250) cvrPct = Number((cvrPct + 0.1).toFixed(1));

  const monthlyRevenue = Math.round(visits * (cvrPct / 100) * estAov);
  const monthlyRevenueUsd = Math.round(visits * (cvrPct / 100) * aovUsd);

  const formatCompactMoney = (val: number) => {
    const abs = Math.abs(val);
    let numStr: string;
    if (abs >= 1_000_000) numStr = `${(val / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
    else if (abs >= 1_000) numStr = `${Math.round(val / 1_000)}K`;
    else numStr = `${Math.round(val)}`;
    if (currency === "DKK") return `${numStr.replace(".", ",")} kr.`;
    if (currency === "EUR") return `€${numStr}`;
    if (currency === "GBP") return `£${numStr}`;
    return `$${numStr}`;
  };

  const formatAov = (val: number) => {
    if (currency === "DKK") return `${val.toLocaleString("da-DK")} kr.`;
    if (currency === "EUR") return `€${val.toLocaleString("en-US")}`;
    if (currency === "GBP") return `£${val.toLocaleString("en-US")}`;
    return `$${val.toLocaleString("en-US")}`;
  };

  return {
    monthlyRevenue,
    monthlyRevenueUsd,
    formattedRevenue: visits > 0 ? formatCompactMoney(monthlyRevenue) : "—",
    formattedAov: formatAov(estAov),
    cvrPct,
    hasBundles,
    bundleProductsCount,
    basedOnPrices: prices.length,
    currency,
  };
}
