import type {
  Ad,
  CarouselCard,
  CountryReachBreakdown,
  DisplayFormat,
  MarketCode,
  MediaType,
} from "./types";
import type { CompanyAdsResponse } from "./scrapecreators";
import { dedupeAds } from "./url-parser";
import {
  cleanLandingUrl,
  extractHookAndCategory,
  normalizeLandingPath,
} from "./shop-scraper";

const APIFY_ACTOR_ID = "curious_coder~facebook-ads-library-scraper";

interface CuriousVideo {
  video_hd_url?: string;
  video_sd_url?: string;
  video_preview_image_url?: string;
  watermarked_video_hd_url?: string;
  watermarked_video_sd_url?: string;
}

interface CuriousImage {
  original_image_url?: string;
  resized_image_url?: string;
  watermarked_resized_image_url?: string;
}

interface CuriousCard {
  body?: string;
  title?: string;
  caption?: string;
  link_description?: string;
  cta_text?: string;
  link_url?: string;
  original_image_url?: string;
  resized_image_url?: string;
  video_hd_url?: string;
  video_sd_url?: string;
  video_preview_image_url?: string;
}

interface CuriousAaaInfo {
  eu_total_reach?: number;
  gender_audience?: string;
  age_audience?: {
    min?: number;
    max?: number;
  };
  location_audience?: Array<{
    name?: string;
    type?: string;
    excluded?: boolean;
  }>;
  age_country_gender_reach_breakdown?: Array<{
    country?: string;
    age_gender_breakdowns?: Array<{
      age_range?: string;
      male?: number | null;
      female?: number | null;
      unknown?: number | null;
    }>;
  }>;
  payer_beneficiary_data?: Array<{
    payer?: string;
    beneficiary?: string;
  }>;
}

export interface CuriousCoderMetaAdItem {
  error?: string;
  errorCode?: string;
  ad_archive_id?: string;
  ad_id?: string;
  page_id?: string;
  page_name?: string;
  is_active?: boolean;
  start_date?: number | string;
  start_date_formatted?: string;
  end_date?: number | string;
  total_active_time?: number;
  collation_count?: number;
  collation_id?: string;
  total?: number;
  ads_count?: number;
  ad_library_url?: string;
  publisher_platform?: string[];
  targeted_or_reached_countries?: string[];
  eu_total_reach?: number;
  reach_estimate?: number | string | null;
  aaa_info?: CuriousAaaInfo;
  transparency_by_location?: {
    eu_transparency?: CuriousAaaInfo;
  };
  impressions_with_index?: {
    impressions_text?: string | null;
    impressions_index?: number;
  };
  snapshot?: {
    page_name?: string;
    page_profile_picture_url?: string;
    page_profile_uri?: string;
    page_like_count?: number;
    display_format?: string;
    title?: string;
    caption?: string;
    link_description?: string;
    cta_text?: string;
    link_url?: string;
    body?: { text?: string } | string;
    videos?: CuriousVideo[];
    images?: CuriousImage[];
    cards?: CuriousCard[];
  };
}

function getApifyToken(): string | null {
  return process.env.APIFY_API_TOKEN || null;
}

function parseStartDate(rawStart?: number | string, formatted?: string): string {
  if (typeof rawStart === "number" && rawStart > 1_000_000_000) {
    const ms = rawStart > 1e12 ? rawStart : rawStart * 1000;
    const d = new Date(ms);
    if (!Number.isNaN(d.getTime())) return d.toISOString();
  }
  const candidate = formatted || (typeof rawStart === "string" ? rawStart : "");
  if (candidate) {
    const parsed = new Date(candidate);
    if (!Number.isNaN(parsed.getTime())) return parsed.toISOString();
  }
  return new Date().toISOString();
}

const COUNTRY_NAME_TO_CODE: Record<string, string> = {
  denmark: "DK",
  sweden: "SE",
  norway: "NO",
  germany: "DE",
  france: "FR",
  netherlands: "NL",
  belgium: "BE",
  austria: "AT",
  switzerland: "CH",
  spain: "ES",
  italy: "IT",
  poland: "PL",
  finland: "FI",
  ireland: "IE",
  portugal: "PT",
  "united kingdom": "GB",
  "united states": "US",
  canada: "CA",
  australia: "AU",
};

function formatPlatformName(raw: string): string {
  const upper = raw.toUpperCase();
  if (upper === "FACEBOOK") return "Facebook";
  if (upper === "INSTAGRAM") return "Instagram";
  if (upper === "MESSENGER") return "Messenger";
  if (upper === "AUDIENCE_NETWORK") return "Audience Network";
  if (upper === "THREADS") return "Threads";
  return raw;
}

export function mapApifyMetaAd(
  raw: CuriousCoderMetaAdItem,
  brandId: string,
  fallbackBrand: {
    name: string;
    handle: string;
    initials: string;
    color: string;
    logoUrl?: string;
    liveAdsCount?: number;
    market?: MarketCode;
    productImagesByHandle?: Record<string, string>;
    defaultFallbackImage?: string;
  }
): Ad {
  const snap = raw.snapshot || {};
  const cards = Array.isArray(snap.cards) ? snap.cards : [];
  const firstCard = cards[0];
  const videos = Array.isArray(snap.videos) ? snap.videos : [];
  const images = Array.isArray(snap.images) ? snap.images : [];
  const firstVideo = videos[0];
  const firstImage = images[0];

  const videoUrl =
    firstVideo?.video_hd_url ||
    firstVideo?.video_sd_url ||
    firstCard?.video_hd_url ||
    firstCard?.video_sd_url ||
    "";

  const imageUrl =
    firstVideo?.video_preview_image_url ||
    firstCard?.video_preview_image_url ||
    firstImage?.original_image_url ||
    firstImage?.resized_image_url ||
    firstCard?.original_image_url ||
    firstCard?.resized_image_url ||
    "";

  const fmt = (snap.display_format || "").toUpperCase();
  const isCarouselFormat =
    fmt === "CAROUSEL" || fmt === "MULTI_IMAGES" || fmt === "DPA";

  const seenCardMedia = new Set<string>();
  const extractedCarouselCards: CarouselCard[] = [];
  if (isCarouselFormat && cards.length >= 2) {
    for (const c of cards) {
      const cVid = c.video_hd_url || c.video_sd_url || "";
      const cImg =
        c.original_image_url ||
        c.resized_image_url ||
        c.video_preview_image_url ||
        "";
      const primary = cVid || cImg;
      if (!primary || seenCardMedia.has(primary)) continue;
      seenCardMedia.add(primary);
      extractedCarouselCards.push({
        media_type: cVid ? "video" : "image",
        media_url: primary,
        thumbnail_url: cImg || primary,
        headline: (c.title || "").replace(/\{\{[^}]+\}\}/g, "").trim() || undefined,
        body: (c.body || "").replace(/\{\{[^}]+\}\}/g, "").trim() || undefined,
        link_description:
          (c.link_description || c.caption || "")
            .replace(/\{\{[^}]+\}\}/g, "")
            .trim() || undefined,
        cta_text: (c.cta_text || "").trim() || undefined,
        landing_page_url: c.link_url ? cleanLandingUrl(c.link_url) || c.link_url : undefined,
      });
      if (extractedCarouselCards.length >= 10) break;
    }
  }

  const carouselCards =
    extractedCarouselCards.length >= 2 ? extractedCarouselCards : undefined;

  let mediaType: MediaType = "image";
  let displayFormat: DisplayFormat = "IMAGE";
  if (carouselCards) {
    mediaType = "carousel";
    displayFormat = "CAROUSEL";
  } else if (videoUrl || fmt === "VIDEO") {
    mediaType = "video";
    displayFormat = fmt === "DCO" || fmt === "DPA" ? "DCO" : "VIDEO";
  } else if (fmt === "DCO" || fmt === "DPA") {
    mediaType = "image";
    displayFormat = "DCO";
  }

  const archiveId = String(
    raw.ad_archive_id ||
      raw.ad_id ||
      `apify-${Math.random().toString(36).slice(2, 10)}`
  );

  const rawBody =
    typeof snap.body === "string"
      ? snap.body
      : snap.body?.text || firstCard?.body || "";
  const primaryText = rawBody.replace(/\{\{[^}]+\}\}/g, "").trim();

  const rawTitle = snap.title || firstCard?.title || "";
  const cleanedTitle = rawTitle.replace(/\{\{[^}]+\}\}/g, "").trim();
  const headline = cleanedTitle || raw.page_name || fallbackBrand.name;

  const linkDescription = (
    snap.link_description ||
    firstCard?.link_description ||
    snap.caption ||
    firstCard?.caption ||
    ""
  )
    .replace(/\{\{[^}]+\}\}/g, "")
    .trim();

  const ctaText = (snap.cta_text || firstCard?.cta_text || "Shop Now").trim();
  const rawLanding = snap.link_url || firstCard?.link_url || "";
  const landingUrl = cleanLandingUrl(rawLanding) || rawLanding;
  const landingPath = normalizeLandingPath(landingUrl);

  const { hook, category: hookCategory } = extractHookAndCategory(
    primaryText || headline
  );
  const startedAt = parseStartDate(raw.start_date, raw.start_date_formatted);

  const duplicatedCount =
    typeof raw.collation_count === "number" && raw.collation_count > 1
      ? raw.collation_count
      : undefined;

  const platforms =
    Array.isArray(raw.publisher_platform) && raw.publisher_platform.length > 0
      ? raw.publisher_platform.map(formatPlatformName)
      : ["Facebook", "Instagram"];

  const productHandleMatch = landingPath.match(/\/products\/([^/?#]+)/i);
  const matchedFallback =
    (productHandleMatch &&
      fallbackBrand.productImagesByHandle?.[
        productHandleMatch[1].toLowerCase()
      ]) ||
    fallbackBrand.defaultFallbackImage ||
    "";

  const aaa = raw.aaa_info || raw.transparency_by_location?.eu_transparency;
  const euReach =
    typeof aaa?.eu_total_reach === "number" && aaa.eu_total_reach > 0
      ? aaa.eu_total_reach
      : typeof raw.eu_total_reach === "number" && raw.eu_total_reach > 0
        ? raw.eu_total_reach
        : undefined;

  const audienceBreakdown: CountryReachBreakdown[] = (
    Array.isArray(aaa?.age_country_gender_reach_breakdown)
      ? aaa.age_country_gender_reach_breakdown
      : []
  )
    .map((entry) => {
      const rows = (
        Array.isArray(entry.age_gender_breakdowns)
          ? entry.age_gender_breakdowns
          : []
      )
        .map((r) => ({
          age_range: String(r.age_range || "Unknown"),
          male: Number(r.male) || 0,
          female: Number(r.female) || 0,
          unknown: Number(r.unknown) || 0,
        }))
        .filter((r) => r.male + r.female + r.unknown > 0);
      const totalReach = rows.reduce(
        (sum, r) => sum + r.male + r.female + r.unknown,
        0
      );
      return {
        country: String(entry.country || "").toUpperCase(),
        total_reach: totalReach,
        age_gender_breakdowns: rows,
      };
    })
    .filter((c) => Boolean(c.country) && c.total_reach > 0)
    .sort((a, b) => b.total_reach - a.total_reach);

  const countrySet = new Set<string>();
  for (const c of audienceBreakdown) countrySet.add(c.country);
  if (Array.isArray(raw.targeted_or_reached_countries)) {
    for (const c of raw.targeted_or_reached_countries) {
      const code = String(c || "").trim().toUpperCase();
      if (code.length === 2) countrySet.add(code);
    }
  }
  if (Array.isArray(aaa?.location_audience)) {
    for (const loc of aaa.location_audience) {
      if (loc?.excluded) continue;
      const mapped =
        COUNTRY_NAME_TO_CODE[String(loc?.name || "").trim().toLowerCase()];
      if (mapped) countrySet.add(mapped);
    }
  }

  const payerName =
    aaa?.payer_beneficiary_data?.[0]?.payer ||
    aaa?.payer_beneficiary_data?.[0]?.beneficiary ||
    undefined;

  return {
    id: `meta-${archiveId}`,
    brand_id: brandId,
    brand_name: (fallbackBrand.name || raw.page_name || "").trim(),
    brand_handle: fallbackBrand.handle,
    brand_avatar_initials: fallbackBrand.initials,
    brand_avatar_color: fallbackBrand.color,
    brand_logo_url: fallbackBrand.logoUrl || snap.page_profile_picture_url,
    brand_live_ads:
      raw.total || raw.ads_count || fallbackBrand.liveAdsCount,
    market: fallbackBrand.market || "US",
    source_type: "meta_ad_library",
    source_url:
      raw.ad_library_url ||
      `https://www.facebook.com/ads/library/?id=${archiveId}`,
    external_ad_id: archiveId,
    media_type: mediaType,
    display_format: displayFormat,
    media_url: videoUrl || imageUrl || matchedFallback,
    thumbnail_url: imageUrl || matchedFallback || videoUrl,
    fallback_image_url: matchedFallback,
    carousel_cards: carouselCards,
    aspect_ratio: mediaType === "video" ? "3:4" : "1:1",
    primary_text: primaryText,
    extracted_hook: hook,
    hook_category: hookCategory,
    headline,
    link_description: linkDescription,
    cta_text: ctaText,
    landing_page_url: landingUrl,
    landing_page_path: landingPath,
    is_active: raw.is_active ?? true,
    started_running_at: startedAt,
    eu_reach: euReach,
    gender_audience: aaa?.gender_audience || undefined,
    age_min:
      typeof aaa?.age_audience?.min === "number"
        ? aaa.age_audience.min
        : undefined,
    age_max:
      typeof aaa?.age_audience?.max === "number"
        ? aaa.age_audience.max
        : undefined,
    targeted_countries:
      countrySet.size > 0 ? Array.from(countrySet) : undefined,
    audience_breakdown:
      audienceBreakdown.length > 0 ? audienceBreakdown : undefined,
    payer_name: payerName,
    duplicated_count: duplicatedCount,
    platforms,
    status: "ready",
    ai_hook_verbal: hook || undefined,
    ai_angle: hookCategory,
    ai_format:
      displayFormat === "DCO"
        ? "DCO / Dynamic"
        : mediaType === "video"
          ? "Meta Video"
          : mediaType === "carousel"
            ? "Carousel"
            : "Static",
    tags: [
      "meta-ad-library",
      "apify",
      ...(duplicatedCount && duplicatedCount >= 3 ? ["scaled"] : []),
      ...(hookCategory
        ? [hookCategory.toLowerCase().replace(/\s+&\s+/g, "-")]
        : []),
    ],
    board_ids: [],
    user_notes: "",
    is_favorite: false,
    created_at: new Date().toISOString(),
  };
}

export async function fetchCompanyActiveAdsViaApify(opts: {
  pageId?: string;
  companyName?: string;
  brandId: string;
  fallbackBrand: {
    name: string;
    handle: string;
    initials: string;
    color: string;
    logoUrl?: string;
    market?: MarketCode;
    productImagesByHandle?: Record<string, string>;
    defaultFallbackImage?: string;
  };
  limit?: number;
}): Promise<CompanyAdsResponse> {
  const token = getApifyToken();
  if (!token) return { ads: [] };
  if (!opts.pageId && !opts.companyName) return { ads: [] };

  const maxAds = Math.min(opts.limit ?? 50, 500);
  const isEuOrDk =
    opts.fallbackBrand.market === "DK" || opts.fallbackBrand.market === "EU";

  const libraryUrl = opts.pageId
    ? `https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=ALL&media_type=all&search_type=page&view_all_page_id=${encodeURIComponent(
        opts.pageId
      )}`
    : `https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=ALL&media_type=all&q=${encodeURIComponent(
        opts.companyName || ""
      )}&search_type=keyword_unordered`;

  const actorInput: Record<string, unknown> = {
    urls: [{ url: libraryUrl }],
    limitPerSource: maxAds,
    count: maxAds,
    scrapeAdDetails: isEuOrDk,
    "scrapePageAds.activeStatus": "active",
    "scrapePageAds.sortBy": "impressions_desc",
    "scrapePageAds.countryCode": "ALL",
  };

  try {
    const res = await fetch(
      `https://api.apify.com/v2/acts/${APIFY_ACTOR_ID}/run-sync-get-dataset-items?token=${encodeURIComponent(
        token
      )}&timeout=55`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(actorInput),
        cache: "no-store",
      }
    );

    if (!res.ok) {
      console.error(
        "Apify curious_coder meta-ad-scraper failed:",
        res.status,
        await res.text().catch(() => "")
      );
      return { ads: [] };
    }

    const rawItems: CuriousCoderMetaAdItem[] = await res.json();
    if (!Array.isArray(rawItems) || rawItems.length === 0) return { ads: [] };

    const validItems = rawItems.filter(
      (it) => !it.error && Boolean(it.ad_archive_id || it.ad_id)
    );
    if (validItems.length === 0) return { ads: [] };

    const first = validItems[0];
    const totalActive =
      first.total || first.ads_count || validItems.length;

    const rawMapped = validItems.slice(0, maxAds).map((item) =>
      mapApifyMetaAd(item, opts.brandId, {
        ...opts.fallbackBrand,
        liveAdsCount: totalActive,
      })
    );
    const ads = dedupeAds(
      rawMapped.filter((a) =>
        Boolean(a.media_url || a.thumbnail_url || a.fallback_image_url)
      )
    );

    return {
      totalActiveAds: totalActive,
      pageId: first.page_id || opts.pageId,
      pageName: first.page_name || opts.fallbackBrand.name,
      pageLikes: first.snapshot?.page_like_count,
      pageProfilePicture:
        first.snapshot?.page_profile_picture_url || opts.fallbackBrand.logoUrl,
      ads,
    };
  } catch (err) {
    console.error("Apify fetchCompanyActiveAdsViaApify error:", err);
    return { ads: [] };
  }
}
