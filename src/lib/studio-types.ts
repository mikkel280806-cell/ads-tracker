import type { Ad, ProductPreview } from "./types";

export interface BrandMemory {
  brandName: string;
  domain: string;
  websiteUrl: string;
  logoUrl?: string;
  tagline?: string;
  description?: string;
  category: string;
  currency: string;
  toneOfVoice: string;
  targetAudience: string;
  primaryOffer: string;
  usps: string[];
  painPoints: string[];
  desires: string[];
  objections: string[];
  customerReviews: string[];
  products: ProductPreview[];
  brandColors: string[];
  pixels?: string[];
  shopifyApps?: string[];
  trustpilotScore?: number;
  trustpilotReviews?: number;
  scrapedAt: string;
}

export type VideoStylePresetId =
  | "iphone_ugc"
  | "claymation_moa"
  | "pixar_story"
  | "mini_drama"
  | "founder_authority"
  | "cinema_macro";

export interface VideoStylePreset {
  id: VideoStylePresetId;
  name: string;
  subtitle: string;
  badge: string;
  description: string;
  whyItWorks: string;
  defaultDurationSec: number;
  cameraRecipe: string;
  filterCss: string;
}

export interface HookVariant {
  id: string;
  label: string;
  framework: string;
  spokenHook: string;
  onScreenText: string;
  predictedThumbstopPct: number;
}

export interface StudioScene {
  id: string;
  sceneNumber: number;
  phase: string;
  timeRange: string;
  durationSec: number;
  spokenLine: string;
  onScreenCaption: string;
  visualDirection: string;
  cameraMotion: string;
  hiddenPrompt: string;
}

export type StaticCloneLayoutId =
  | "callout_pointers"
  | "us_vs_them"
  | "ugly_postit"
  | "founder_quote"
  | "before_after";

export interface ClonedSourceAd {
  id: string;
  brandName: string;
  headline: string;
  primaryText: string;
  mediaUrl: string;
  thumbnailUrl: string;
  activeDays: number;
  euReach?: number;
}

export interface CreativeProject {
  id: string;
  title: string;
  createdAt: string;
  mode: "video" | "static_clone" | "url_miner";
  stylePresetId: VideoStylePresetId;
  staticLayoutId: StaticCloneLayoutId;
  aspectRatio: "9:16" | "4:5" | "1:1";
  language: "da" | "en";
  creatorPersona: string;
  brandName: string;
  productTitle: string;
  productImageUrl?: string;
  productPriceDkk?: string;
  productUrl?: string;
  angle: string;
  clonedFromAd?: ClonedSourceAd;
  hooks: HookVariant[];
  selectedHookId: string;
  scenes: StudioScene[];
  callouts: string[];
  usPoints: string[];
  themPoints: string[];
  primaryText: string;
  headline: string;
  ctaText: string;
  landingPageUrl: string;
  status: "draft" | "ready" | "queued" | "live";
  campaignName?: string;
  dailyBudgetDkk?: number;
}

export interface MinedUrlInsights {
  url: string;
  title: string;
  productImageUrl?: string;
  priceText?: string;
  painPoints: string[];
  desires: string[];
  objections: string[];
  usps: string[];
  reviewSnippets: string[];
  recommendedAngles: Array<{
    title: string;
    hook: string;
    presetId: VideoStylePresetId;
    why: string;
  }>;
}

export type SnowActionCard =
  | {
      type: "swipe_picks";
      title: string;
      subtitle: string;
      picks: Array<{
        adId: string;
        brandName: string;
        hook: string;
        activeDays: number;
        euReach?: number;
        thumbnailUrl: string;
        whyItWins: string;
      }>;
    }
  | {
      type: "creative_brief";
      title: string;
      angle: string;
      stylePresetId: VideoStylePresetId;
      productTitle: string;
      hooks: HookVariant[];
      scenes: StudioScene[];
      primaryText: string;
      headline: string;
      clonedFromAd?: ClonedSourceAd;
    }
  | {
      type: "mined_url";
      insights: MinedUrlInsights;
    }
  | {
      type: "winner_scale";
      title: string;
      diagnosis: string;
      metricSummary: string;
      recommendedAction: string;
      iterations: Array<{
        label: string;
        stylePresetId: VideoStylePresetId;
        hook: string;
        why: string;
      }>;
    };

export interface SnowAttachment {
  type: "ad" | "product" | "url";
  label: string;
  sublabel?: string;
  imageUrl?: string;
  refId?: string;
}

export interface SnowMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
  attachments?: SnowAttachment[];
  actionCards?: SnowActionCard[];
}

export interface OwnAdMetricRow {
  id: string;
  name: string;
  format:
    | "AI UGC"
    | "Claymation MOA"
    | "Pixar 3D"
    | "Mini-Drama"
    | "Static Callout"
    | "Founder Story";
  stylePresetId: VideoStylePresetId;
  angle: string;
  hookText: string;
  thumbnailUrl?: string;
  status: "Scaling Winner" | "Hook Winner" | "Fatigue" | "Testing";
  spendDkk: number;
  revenueDkk: number;
  roas: number;
  cpaDkk: number;
  aovDkk: number;
  purchases: number;
  impressions: number;
  ctrPct: number;
  thumbstopPct: number;
  holdPct: number;
  retentionCurve: number[];
  daysActive: number;
  cpaDeltaPct: number;
}

export function buildClonedSourceFromAd(ad: Ad, activeDays: number): ClonedSourceAd {
  return {
    id: ad.id,
    brandName: ad.brand_name,
    headline: ad.headline || ad.brand_name,
    primaryText: ad.primary_text || "",
    mediaUrl: ad.media_url,
    thumbnailUrl: ad.fallback_image_url || ad.thumbnail_url || ad.media_url,
    activeDays,
    euReach: ad.eu_reach,
  };
}
