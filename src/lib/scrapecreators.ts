import type { Ad, MediaType } from "./types";

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

export async function searchCompanyMetaPage(query: string): Promise<MetaCompanyMatch | null> {
  const apiKey = getApiKey();
  if (!apiKey || !query.trim()) return null;

  try {
    const res = await fetch(
      `${SC_BASE}/v1/facebook/adLibrary/search/companies?query=${encodeURIComponent(query.trim())}`,
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

    // Prefer non-deleted page with highest IG followers or FB likes
    const active = list.filter((item) => !(item as { page_is_deleted?: boolean }).page_is_deleted);
    const pool = active.length > 0 ? active : list;
    pool.sort((a, b) => (b.ig_followers || b.likes || 0) - (a.ig_followers || a.likes || 0));
    return pool[0] || null;
  } catch (err) {
    console.error("ScrapeCreators searchCompanyMetaPage failed:", err);
    return null;
  }
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
  }
): Ad {
  const snap = raw?.snapshot || {};
  const firstCard = Array.isArray(snap.cards) && snap.cards.length > 0 ? snap.cards[0] : null;
  const firstVideo =
    Array.isArray(snap.videos) && snap.videos.length > 0 ? snap.videos[0] : null;
  const firstImage =
    Array.isArray(snap.images) && snap.images.length > 0 ? snap.images[0] : null;

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
    : Array.isArray(snap.cards) && snap.cards.length > 1
      ? "carousel"
      : "image";

  const archiveId = String(raw?.ad_archive_id || raw?.id || crypto.randomUUID());
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
    Math.floor((Date.now() - new Date(startedAt).getTime()) / (1000 * 60 * 60 * 24))
  );

  // TrendTrack-style CPM estimate ONLY when real EU reach is reported
  const estimatedSpend = euReach ? Math.round((euReach / 1000) * 9) : undefined;
  const dailySpend = estimatedSpend ? Math.max(1, Math.round(estimatedSpend / activeDays)) : undefined;

  const primaryText =
    snap?.body?.text ||
    firstCard?.body ||
    snap?.body?.markup?.__html?.replace(/<[^>]+>/g, " ").trim() ||
    "";

  const headline =
    snap?.title ||
    firstCard?.title ||
    snap?.link_description ||
    firstCard?.link_description ||
    pageName;

  const ctaText = snap?.cta_text || firstCard?.cta_text || "Shop now";
  const landingUrl = snap?.link_url || firstCard?.link_url || "";
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
    source_type: "meta_ad_library",
    source_url: `https://www.facebook.com/ads/library/?id=${archiveId}`,
    external_ad_id: archiveId,
    media_type: mediaType,
    media_url: videoUrl || imageUrl,
    thumbnail_url: imageUrl || videoUrl,
    aspect_ratio: mediaType === "video" ? "3:4" : "1:1",
    primary_text: primaryText,
    headline,
    cta_text: ctaText,
    landing_page_url: landingUrl,
    is_active: raw?.is_active ?? true,
    started_running_at: startedAt,
    eu_reach: euReach,
    estimated_spend: estimatedSpend,
    daily_spend: dailySpend,
    duplicated_count: duplicatedCount,
    platforms,
    status: "ready",
    ai_format: mediaType === "video" ? "Meta Video" : mediaType === "carousel" ? "Carousel" : "Static",
    tags: ["meta-ad-library", ...(duplicatedCount && duplicatedCount >= 3 ? ["skaleret"] : [])],
    board_ids: [],
    user_notes: "",
    is_favorite: false,
    created_at: new Date().toISOString(),
  };
}
/* eslint-enable @typescript-eslint/no-explicit-any */

export async function fetchCompanyActiveAds(
  pageId: string,
  brandId: string,
  fallbackBrand: {
    name: string;
    handle: string;
    initials: string;
    color: string;
    logoUrl?: string;
  },
  limit = 16
): Promise<{ totalActiveAds?: number; ads: Ad[] }> {
  const apiKey = getApiKey();
  if (!apiKey || !pageId) return { ads: [] };

  try {
    const res = await fetch(
      `${SC_BASE}/v1/facebook/adLibrary/company/ads?pageId=${encodeURIComponent(pageId)}&status=ACTIVE&trim=true`,
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

    const ads = rawResults.slice(0, limit).map((item: unknown) =>
      mapScrapeCreatorsAd(item, brandId, {
        ...fallbackBrand,
        liveAdsCount: totalActiveAds,
      })
    );

    return { totalActiveAds, ads };
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
