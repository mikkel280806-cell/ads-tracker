import type { Ad, DisplayFormat, MarketCode, MediaType } from "./types";
import type { CompanyAdsResponse } from "./scrapecreators";
import {
  cleanLandingUrl,
  extractHookAndCategory,
  normalizeLandingPath,
} from "./shop-scraper";

const APIFY_ACTOR_ID = "whoareyouanas~meta-ad-scraper";

export interface ApifyMetaAdItem {
  libraryID?: string;
  brand?: string;
  brandLogo?: string;
  pageId?: string;
  adLibraryUrl?: string;
  active?: boolean;
  platforms?: string[];
  similarAdCount?: number;
  multipleVersions?: boolean;
  body?: string;
  linkTitle?: string;
  linkUrl?: string;
  linkDescription?: string;
  ctaText?: string;
  ctaUrl?: string;
  images?: { url?: string }[];
  videos?: { url?: string; poster?: string; duration?: number | null }[];
  cards?: {
    body?: string;
    title?: string;
    description?: string;
    ctaText?: string;
    linkUrl?: string;
    images?: { url?: string }[];
    videos?: { url?: string; poster?: string; duration?: number | null }[];
  }[];
  startDate?: string;
  endDate?: string;
  runningTAT?: number;
  format?: string;
}

function getApifyToken(): string | null {
  return process.env.APIFY_API_TOKEN || null;
}

function parseStartDate(raw?: string, runningTAT?: number): string {
  if (raw) {
    const parsed = new Date(raw);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toISOString();
    }
  }
  if (typeof runningTAT === "number" && runningTAT > 0) {
    return new Date(Date.now() - runningTAT * 86_400_000).toISOString();
  }
  return new Date().toISOString();
}

export function mapApifyMetaAd(
  raw: ApifyMetaAdItem,
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
  const cards = Array.isArray(raw.cards) ? raw.cards : [];
  const firstCard = cards[0];
  const firstVideo =
    (Array.isArray(raw.videos) && raw.videos[0]) ||
    (Array.isArray(firstCard?.videos) && firstCard.videos[0]) ||
    undefined;
  const firstImage =
    (Array.isArray(raw.images) && raw.images[0]) ||
    (Array.isArray(firstCard?.images) && firstCard.images[0]) ||
    undefined;

  const videoUrl = firstVideo?.url || "";
  const imageUrl = firstVideo?.poster || firstImage?.url || "";
  const fmt = (raw.format || "").toLowerCase();

  let mediaType: MediaType = "image";
  let displayFormat: DisplayFormat = "IMAGE";
  if (videoUrl || fmt === "video") {
    mediaType = "video";
    displayFormat = "VIDEO";
  } else if (cards.length > 1 || fmt === "carousel" || fmt === "dco") {
    mediaType = "carousel";
    displayFormat = fmt === "dco" ? "DCO" : "CAROUSEL";
  }

  const archiveId = String(raw.libraryID || `apify-${Math.random().toString(36).slice(2, 10)}`);
  const primaryText = (raw.body || firstCard?.body || "").trim();
  const headline = (raw.linkTitle || firstCard?.title || raw.brand || fallbackBrand.name).trim();
  const linkDescription = (raw.linkDescription || firstCard?.description || "").trim();
  const ctaText = (raw.ctaText || firstCard?.ctaText || "Shop Now").trim();
  const rawLanding = raw.linkUrl || raw.ctaUrl || firstCard?.linkUrl || "";
  const landingUrl = cleanLandingUrl(rawLanding) || rawLanding;
  const landingPath = normalizeLandingPath(landingUrl);

  const { hook, category: hookCategory } = extractHookAndCategory(
    primaryText || headline
  );
  const startedAt = parseStartDate(raw.startDate, raw.runningTAT);
  const duplicatedCount =
    typeof raw.similarAdCount === "number" && raw.similarAdCount > 0
      ? raw.similarAdCount + 1
      : raw.multipleVersions
        ? 2
        : undefined;

  const platforms =
    Array.isArray(raw.platforms) && raw.platforms.length > 0
      ? raw.platforms
      : ["Facebook", "Instagram"];

  const productHandleMatch = landingPath.match(/\/products\/([^/?#]+)/i);
  const matchedFallback =
    (productHandleMatch &&
      fallbackBrand.productImagesByHandle?.[productHandleMatch[1].toLowerCase()]) ||
    fallbackBrand.defaultFallbackImage ||
    "";

  return {
    id: `meta-${archiveId}`,
    brand_id: brandId,
    brand_name: (raw.brand || fallbackBrand.name).trim(),
    brand_handle: fallbackBrand.handle,
    brand_avatar_initials: fallbackBrand.initials,
    brand_avatar_color: fallbackBrand.color,
    brand_logo_url: raw.brandLogo || fallbackBrand.logoUrl,
    brand_live_ads: fallbackBrand.liveAdsCount,
    market: fallbackBrand.market || "US",
    source_type: "meta_ad_library",
    source_url: raw.adLibraryUrl || `https://www.facebook.com/ads/library/?id=${archiveId}`,
    external_ad_id: archiveId,
    media_type: mediaType,
    display_format: displayFormat,
    media_url: videoUrl || imageUrl || matchedFallback,
    thumbnail_url: imageUrl || matchedFallback || videoUrl,
    fallback_image_url: matchedFallback,
    aspect_ratio: mediaType === "video" ? "3:4" : "1:1",
    duration_seconds:
      typeof firstVideo?.duration === "number" && firstVideo.duration > 0
        ? Math.round(firstVideo.duration)
        : undefined,
    primary_text: primaryText,
    extracted_hook: hook,
    hook_category: hookCategory,
    headline,
    link_description: linkDescription,
    cta_text: ctaText,
    landing_page_url: landingUrl,
    landing_page_path: landingPath,
    is_active: raw.active ?? true,
    started_running_at: startedAt,
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
      ...(hookCategory ? [hookCategory.toLowerCase().replace(/\s+&\s+/g, "-")] : []),
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

  const country = opts.fallbackBrand.market === "DK" ? "DK" : "US";
  const maxAds = Math.min(opts.limit ?? 100, 500);

  const actorInput: Record<string, unknown> = {
    country,
    isTargetedCountry: false,
    activeStatus: "active",
    adType: "all",
    mediaType: "all",
    sortMode: "total_impressions",
    sortDirection: "desc",
    maxConcurrency: 1,
    maxAds,
    requestHandlerTimeoutSecs: 300,
    ...(opts.pageId
      ? { pageId: opts.pageId, searchQuery: "" }
      : { searchQuery: opts.companyName || "", pageId: "" }),
  };

  try {
    const res = await fetch(
      `https://api.apify.com/v2/acts/${APIFY_ACTOR_ID}/run-sync-get-dataset-items?token=${encodeURIComponent(token)}&timeout=55`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(actorInput),
        cache: "no-store",
      }
    );

    if (!res.ok) {
      console.error("Apify meta-ad-scraper failed:", res.status, await res.text().catch(() => ""));
      return { ads: [] };
    }

    const items: ApifyMetaAdItem[] = await res.json();
    if (!Array.isArray(items) || items.length === 0) return { ads: [] };

    const first = items[0];
    const ads = items.slice(0, maxAds).map((item) =>
      mapApifyMetaAd(item, opts.brandId, {
        ...opts.fallbackBrand,
        liveAdsCount: items.length,
      })
    );

    return {
      totalActiveAds: items.length,
      pageId: first.pageId || opts.pageId,
      pageName: first.brand || opts.fallbackBrand.name,
      pageProfilePicture: first.brandLogo || opts.fallbackBrand.logoUrl,
      ads,
    };
  } catch (err) {
    console.error("Apify fetchCompanyActiveAdsViaApify error:", err);
    return { ads: [] };
  }
}
