import type { Ad, DisplayFormat, MarketCode, MediaType } from "./types";
import {
  cleanLandingUrl,
  extractHookAndCategory,
  normalizeLandingPath,
} from "./shop-scraper";

const SC_BASE = "https://api.scrapecreators.com";

function getApiKey(): string | null {
  return process.env.SCRAPECREATORS_API_KEY || null;
}

export interface MetaCompanyMatch {
  page_id: string;
  name: string;
  category?: string;
  image_uri?: string;
  likes?: number;
  ig_username?: string;
  ig_followers?: number;
  page_alias?: string;
}

export interface CompanyAdsResponse {
  totalActiveAds?: number;
  pageId?: string;
  pageName?: string;
  pageLikes?: number;
  pageProfilePicture?: string;
  pageProfileUri?: string;
  pageCategory?: string;
  ads: Ad[];
}

export async function searchCompanyMetaPage(
  query: string
): Promise<MetaCompanyMatch | null> {
  const apiKey = getApiKey();
  if (!apiKey || !query.trim()) return null;

  try {
    const res = await fetch(
      `${SC_BASE}/v1/facebook/adLibrary/search/companies?query=${encodeURIComponent(
        query.trim()
      )}`,
      {
        headers: { "x-api-key": apiKey },
        cache: "no-store",
      }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const list: MetaCompanyMatch[] = Array.isArray(data?.searchResults)
      ? data.searchResults
      : [];
    if (list.length === 0) return null;

    const active = list.filter(
      (item) => !(item as { page_is_deleted?: boolean }).page_is_deleted
    );
    const pool = active.length > 0 ? active : list;
    pool.sort(
      (a, b) =>
        (b.ig_followers || b.likes || 0) - (a.ig_followers || a.likes || 0)
    );
    return pool[0] || null;
  } catch (err) {
    console.error("ScrapeCreators searchCompanyMetaPage failed:", err);
    return null;
  }
}

function mapDisplayFormat(
  rawFormat: unknown,
  mediaType: MediaType,
  cardsCount: number
): DisplayFormat {
  const upper = typeof rawFormat === "string" ? rawFormat.toUpperCase() : "";
  if (upper === "DCO" || upper === "DPA") return "DCO";
  if (upper === "VIDEO") return "VIDEO";
  if (upper === "IMAGE") return "IMAGE";
  if (upper === "CAROUSEL" || upper === "MULTI_IMAGES" || cardsCount > 1)
    return "CAROUSEL";
  if (mediaType === "video") return "VIDEO";
  if (mediaType === "carousel") return "CAROUSEL";
  if (mediaType === "image") return "IMAGE";
  return "OTHER";
}

/* eslint-disable @typescript-eslint/no-explicit-any */
export function mapScrapeCreatorsAd(
  raw: any,
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
  const snap = raw?.snapshot || {};
  const cards = Array.isArray(snap.cards) ? snap.cards : [];
  const firstCard = cards.length > 0 ? cards[0] : null;
  const firstVideo =
    Array.isArray(snap.videos) && snap.videos.length > 0
      ? snap.videos[0]
      : null;
  const firstImage =
    Array.isArray(snap.images) && snap.images.length > 0
      ? snap.images[0]
      : null;

  const videoUrl: string =
    firstVideo?.video_hd_url ||
    firstVideo?.video_sd_url ||
    firstCard?.video_hd_url ||
    firstCard?.video_sd_url ||
    "";

  const imageUrl: string =
    firstVideo?.video_preview_image_url ||
    firstCard?.video_preview_image_url ||
    firstImage?.original_image_url ||
    firstImage?.resized_image_url ||
    firstCard?.original_image_url ||
    firstCard?.resized_image_url ||
    "";

  const mediaType: MediaType = videoUrl
    ? "video"
    : cards.length > 1
      ? "carousel"
      : "image";

  const displayFormat = mapDisplayFormat(
    snap.display_format,
    mediaType,
    cards.length
  );

  const archiveId = String(
    raw?.ad_archive_id || raw?.id || crypto.randomUUID()
  );
  const pageName = snap.page_name || raw?.page_name || fallbackBrand.name;
  const startUnix = raw?.start_date;
  const startedAt =
    typeof startUnix === "number"
      ? new Date(startUnix * 1000).toISOString()
      : typeof startUnix === "string" && startUnix
        ? new Date(startUnix).toISOString()
        : new Date().toISOString();

  const euReach: number | undefined =
    raw?.aaa_info?.eu_total_reach ||
    raw?.eu_total_reach ||
    (typeof raw?.reach_estimate === "number" ? raw.reach_estimate : undefined);

  const activeDays = Math.max(
    1,
    Math.floor(
      (Date.now() - new Date(startedAt).getTime()) / (1000 * 60 * 60 * 24)
    )
  );

  const estimatedSpend = euReach ? Math.round((euReach / 1000) * 9) : undefined;
  const dailySpend = estimatedSpend
    ? Math.max(1, Math.round(estimatedSpend / activeDays))
    : undefined;

  const rawBody: string =
    snap?.body?.text ||
    firstCard?.body ||
    snap?.body?.markup?.__html?.replace(/<[^>]+>/g, " ").trim() ||
    "";
  const primaryText = rawBody.replace(/\{\{product\.[^}]+\}\}/gi, "").trim();

  const rawHeadline: string =
    snap?.title ||
    firstCard?.title ||
    snap?.link_description ||
    firstCard?.link_description ||
    pageName;
  const headline =
    rawHeadline.replace(/\{\{product\.[^}]+\}\}/gi, "").trim() || pageName;

  const linkDescription: string | undefined =
    (snap?.link_description || firstCard?.link_description || "")
      .replace(/\{\{product\.[^}]+\}\}/gi, "")
      .trim() || undefined;

  const ctaText = snap?.cta_text || firstCard?.cta_text || "Shop now";
  const rawLandingUrl = snap?.link_url || firstCard?.link_url || "";
  const landingUrl = cleanLandingUrl(rawLandingUrl);
  const landingPath = normalizeLandingPath(landingUrl);

  // Match permanent Shopify product image as resilient fallback
  let matchedFallback = fallbackBrand.defaultFallbackImage;
  const handleMatch = landingPath.match(/\/products\/([^/?#]+)/i);
  if (handleMatch?.[1] && fallbackBrand.productImagesByHandle) {
    const slug = handleMatch[1].toLowerCase();
    if (fallbackBrand.productImagesByHandle[slug]) {
      matchedFallback = fallbackBrand.productImagesByHandle[slug];
    }
  }

  const { hook, category: hookCategory } = extractHookAndCategory(
    primaryText || headline
  );

  const platformsRaw: string[] = Array.isArray(raw?.publisher_platform)
    ? raw.publisher_platform
    : ["Facebook", "Instagram"];
  const platforms = platformsRaw.map(
    (p) => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase()
  );

  const duplicatedCount =
    typeof raw?.collation_count === "number" && raw.collation_count > 1
      ? raw.collation_count
      : undefined;

  return {
    id: `meta-${archiveId}`,
    brand_id: brandId,
    brand_name: pageName,
    brand_handle: fallbackBrand.handle,
    brand_avatar_initials: fallbackBrand.initials,
    brand_avatar_color: fallbackBrand.color,
    brand_logo_url: snap.page_profile_picture_url || fallbackBrand.logoUrl,
    brand_live_ads: fallbackBrand.liveAdsCount,
    market: fallbackBrand.market || "US",
    source_type: "meta_ad_library",
    source_url: `https://www.facebook.com/ads/library/?id=${archiveId}`,
    external_ad_id: archiveId,
    media_type: mediaType,
    display_format: displayFormat,
    media_url: videoUrl || imageUrl || matchedFallback || "",
    thumbnail_url: imageUrl || matchedFallback || videoUrl || "",
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
    is_active: raw?.is_active ?? true,
    started_running_at: startedAt,
    eu_reach: euReach,
    estimated_spend: estimatedSpend,
    daily_spend: dailySpend,
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
      ...(duplicatedCount && duplicatedCount >= 3 ? ["scaled"] : []),
      ...(hookCategory ? [hookCategory.toLowerCase().replace(/\s+&\s+/g, "-")] : []),
    ],
    board_ids: [],
    user_notes: "",
    is_favorite: false,
    created_at: new Date().toISOString(),
  };
}
/* eslint-enable @typescript-eslint/no-explicit-any */

export async function fetchCompanyActiveAds(
  opts: {
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
  }
): Promise<CompanyAdsResponse> {
  const apiKey = getApiKey();
  if (!apiKey) return { ads: [] };

  const queryParam = opts.pageId
    ? `pageId=${encodeURIComponent(opts.pageId)}`
    : opts.companyName
      ? `companyName=${encodeURIComponent(opts.companyName)}`
      : null;

  if (!queryParam) return { ads: [] };

  try {
    const res = await fetch(
      `${SC_BASE}/v1/facebook/adLibrary/company/ads?${queryParam}&status=ACTIVE&trim=true`,
      {
        headers: { "x-api-key": apiKey },
        cache: "no-store",
      }
    );
    if (!res.ok) return { ads: [] };
    const data = await res.json();
    const rawResults = Array.isArray(data?.results) ? data.results : [];
    const totalActiveAds =
      typeof data?.searchResultsCount === "number"
        ? data.searchResultsCount
        : rawResults.length || undefined;

    const first = rawResults[0];
    const snap = first?.snapshot || {};
    const limit = opts.limit ?? 24;

    const ads = rawResults.slice(0, limit).map((item: unknown) =>
      mapScrapeCreatorsAd(item, opts.brandId, {
        ...opts.fallbackBrand,
        liveAdsCount: totalActiveAds,
      })
    );

    return {
      totalActiveAds,
      pageId: first?.page_id ? String(first.page_id) : opts.pageId,
      pageName: snap?.page_name || first?.page_name,
      pageLikes:
        typeof snap?.page_like_count === "number"
          ? snap.page_like_count
          : undefined,
      pageProfilePicture: snap?.page_profile_picture_url,
      pageProfileUri: snap?.page_profile_uri,
      pageCategory: Array.isArray(snap?.page_categories)
        ? snap.page_categories[0]
        : undefined,
      ads,
    };
  } catch (err) {
    console.error("ScrapeCreators fetchCompanyActiveAds failed:", err);
    return { ads: [] };
  }
}

export async function fetchSingleMetaAd(adId: string) {
  const apiKey = getApiKey();
  if (!apiKey || !adId) return null;

  try {
    const res = await fetch(
      `${SC_BASE}/v1/facebook/adLibrary/ad?id=${encodeURIComponent(adId)}`,
      { headers: { "x-api-key": apiKey }, cache: "no-store" }
    );
    if (!res.ok) return null;
    const data = await res.json();
    return data?.ad || data;
  } catch (err) {
    console.error("ScrapeCreators fetchSingleMetaAd failed:", err);
    return null;
  }
}

export async function fetchInstagramPost(url: string) {
  const apiKey = getApiKey();
  if (!apiKey || !url) return null;

  try {
    const res = await fetch(
      `${SC_BASE}/v1/instagram/post?url=${encodeURIComponent(url)}`,
      { headers: { "x-api-key": apiKey }, cache: "no-store" }
    );
    if (!res.ok) return null;
    const data = await res.json();
    return data?.data?.xdt_shortcode_media || data?.data || data;
  } catch (err) {
    console.error("ScrapeCreators fetchInstagramPost failed:", err);
    return null;
  }
}
