export type SourceType = "meta_ad_library" | "instagram" | "manual";
export type MediaType = "video" | "image" | "carousel";
export type AdStatus = "processing" | "pending_ai" | "ready" | "failed";

export interface ScriptBreakdown {
  hook: string;
  body: string;
  social_proof: string;
  cta: string;
}

export interface Brand {
  id: string;
  name: string;
  handle: string;
  avatar_initials: string;
  avatar_color: string;
  website_url: string;
  meta_page_id?: string;
  meta_ad_library_url?: string;
  category: string;
  is_shopify: boolean;
  is_tracked: boolean;
  active_ads_count: number;
  estimated_monthly_reach: number;
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
  instabox: boolean;
  groq: boolean;
  gemini: boolean;
  passcodeLock: boolean;
  mode: "live" | "demo";
}
