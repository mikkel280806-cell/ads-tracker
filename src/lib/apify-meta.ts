import type { Ad, DisplayFormat, MarketCode, MediaType } from "./types";
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
  eu_total_reach?: number;
  reach_estimate?: number | string | null;
  aaa_info?: {
    eu_total_reach?: number;
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
  const distinctCardMedia = new Set(
    cards
      .map(
        (c) =>
          c.original_image_url ||
          c.resized_image_url ||
          c.video_hd_url ||
          c.video_sd_url ||
          ""
      )
      .filter(Boolean)
  ).size;

  let mediaType: MediaType = "image";
  let displayFormat: DisplayFormat = "IMAGE";
  if (videoUrl || fmt === "VIDEO") {
    mediaType = "video";
    displayFormat = fmt === "DCO" || fmt === "DPA" ? "DCO" : "VIDEO";
  } else if (fmt === "DCO" || fmt === "DPA") {
    mediaType = "image";
    displayFormat = "DCO";
  } else if (
    fmt === "CAROUSEL" ||
    fmt === "MULTI_IMAGES" ||
    (cards.length > 1 && distinctCardMedia > 1)
  ) {
    mediaType = "carousel";
    displayFormat = "CAROUSEL";
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

  const euReach =
    typeof raw.aaa_info?.eu_total_reach === "number" &&
    raw.aaa_info.eu_total_reach > 0
      ? raw.aaa_info.eu_total_reach
      : typeof raw.eu_total_reach === "number" && raw.eu_total_reach > 0
        ? raw.eu_total_reach
        : undefined;

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
