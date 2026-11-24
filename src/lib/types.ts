export type SourceType = "meta_ad_library" | "instagram" | "manual";
export type MediaType = "video" | "image" | "carousel";
export type DisplayFormat = "VIDEO" | "IMAGE" | "DCO" | "CAROUSEL" | "OTHER";
export type MarketCode = "DK" | "US" | "EU" | "GLOBAL";
export type AdStatus = "processing" | "pending_ai" | "ready" | "failed";

export interface ScriptBreakdown {
  hook: string;
  body: string;
  social_proof: string;
  cta: string;
}

export interface CountryShare {
  code: string;
  flag: string;
  pct: number;
}

export interface TrafficPoint {
  label: string;
  visits: number;
}

export interface AdsTimelinePoint {
  label: string;
  count: number;
  dateIso: string;
}

export interface ProductPreview {
  id?: string;
  title: string;
  handle?: string;
  price?: string;
  compare_at_price?: string;
  currency?: string;
  image_url?: string;
  url?: string;
  created_at?: string;
  product_type?: string;
  vendor?: string;
}

export interface Brand {
  id: string;
  name: string;
  handle: string;
  avatar_initials: string;
  avatar_color: string;
  logo_url?: string;
  storefront_image_url?: string;
  description?: string;
  website_url: string;
  myshopify_domain?: string;
  instagram_url?: string;
  facebook_url?: string;
  tiktok_url?: string;
  youtube_url?: string;
  meta_page_id?: string;
  meta_ad_library_url?: string;
  category: string;
  sub_categories?: string[];
  market: MarketCode;
  language?: string;
  is_shopify: boolean;
  shopify_theme?: string;
  founded_date?: string;
  origin_country?: string;
  country_code?: string;
  currency?: string;
  products_count?: number;
  top_products?: ProductPreview[];
  latest_products?: ProductPreview[];
  is_tracked: boolean;
  folder_ids?: string[];
  active_ads_count?: number;
  estimated_monthly_reach?: number;
  monthly_visits?: number;
  traffic_source?: "similarweb" | "tranco_estimate";
  tranco_rank?: number;
  traffic_growth_pct?: number;
  traffic_history?: TrafficPoint[];
  ads_timeline?: AdsTimelinePoint[];
  ads_history?: number[];
  visitor_countries?: CountryShare[];
  targeted_countries?: CountryShare[];
  trustpilot_score?: number;
  trustpilot_reviews?: number;
  ig_followers?: number;
  fb_likes?: number;
  pixels?: string[];
  shopify_apps?: string[];
  last_synced_at: string;
}

export interface Board {
  id: string;
  name: string;
  description: string;
  accent_color: string;
  created_at: string;
}

export interface Ad {
  id: string;
  brand_id: string;
  brand_name: string;
  brand_handle: string;
  brand_avatar_initials: string;
  brand_avatar_color: string;
  brand_logo_url?: string;
  brand_live_ads?: number;
  market: MarketCode;
  source_type: SourceType;
  source_url: string;
  external_ad_id?: string;
  media_type: MediaType;
  display_format?: DisplayFormat;
  media_url: string;
  audio_url?: string;
  thumbnail_url: string;
  fallback_image_url?: string;
  aspect_ratio: "3:4" | "1:1" | "9:16";
  duration_seconds?: number;
  primary_text: string;
  extracted_hook?: string;
  hook_category?: string;
  headline: string;
  link_description?: string;
  cta_text: string;
  landing_page_url: string;
  landing_page_path?: string;
  is_active: boolean;
  started_running_at: string;
  eu_reach?: number;
  estimated_spend?: number;
  daily_spend?: number;
  duplicated_count?: number;
  platforms: string[];
  status: AdStatus;
  ai_hook_verbal?: string;
  ai_hook_visual?: string;
  ai_angle?: string;
  ai_format?: string;
  ai_transcript?: string;
  ai_script_breakdown?: ScriptBreakdown;
  ai_why_it_works?: string[];
  ai_provider?: string;
  ai_analyzed_at?: string;
  tags: string[];
  board_ids: string[];
  user_notes: string;
  is_favorite: boolean;
  created_at: string;
}

export interface ConnectorStatus {
  supabase: boolean;
  scrapeCreators: boolean;
  apify: boolean;
  similarweb: boolean;
  firecrawl: boolean;
  transcription: boolean;
  passcodeLock: boolean;
  mode: "live" | "demo";
}
