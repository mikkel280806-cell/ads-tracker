export type SourceType = "meta_ad_library" | "instagram" | "manual";
export type MediaType = "video" | "image" | "carousel";
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

export interface ProductPreview {
  title: string;
  price?: string;
  currency?: string;
  image_url?: string;
  url?: string;
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
  instagram_url?: string;
  facebook_url?: string;
  meta_page_id?: string;
  meta_ad_library_url?: string;
  category: string;
  is_shopify: boolean;
  shopify_theme?: string;
  founded_date?: string;
  origin_country?: string;
  currency?: string;
  products_count?: number;
  top_products?: ProductPreview[];
  is_tracked: boolean;
  active_ads_count?: number;
  estimated_monthly_reach?: number;
  monthly_visits?: number;
  traffic_growth_pct?: number;
  traffic_history?: TrafficPoint[];
  ads_history?: number[];
  visitor_countries?: CountryShare[];
  trustpilot_score?: number;
  trustpilot_reviews?: number;
  ig_followers?: number;
  pixels?: string[];
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
  source_type: SourceType;
  source_url: string;
  external_ad_id?: string;
  media_type: MediaType;
  media_url: string;
  thumbnail_url: string;
  aspect_ratio: "3:4" | "1:1" | "9:16";
  duration_seconds?: number;
  primary_text: string;
  headline: string;
  cta_text: string;
  landing_page_url: string;
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
  instabox: boolean;
  groq: boolean;
  gemini: boolean;
  passcodeLock: boolean;
  mode: "live" | "demo";
}
