import type { BrandMemory } from "./studio-types";

export type InspoSubView =
  | "explore"
  | "shops"
  | "advertisers"
  | "top_picks"
  | "following"
  | "folders";

export type SnowSubView =
  | "home"
  | "new_task"
  | "connectors"
  | "automations"
  | "skills";

export type StudioSubTab =
  | "video"
  | "video_projects"
  | "media"
  | "static"
  | "image_projects"
  | "miner"
  | "assets";

export type BrandsSubView =
  | "list"
  | "overview"
  | "audience"
  | "products"
  | "competitors";

export type McpSubView = "overview" | "prompts" | "skills";

export interface AtriaCollectionPlaceholder {
  id: string;
  title: string;
  adCount: number;
  templateCount: number;
  category: string;
  description: string;
  thumbnailUrl: string;
  badge?: string;
}

export interface AtriaAdvertiserPlaceholder {
  id: string;
  name: string;
  domain: string;
  industry: string;
  avatarUrl: string;
  fbFollowers: string;
  igFollowers: string;
  newAds30d: number;
  growthPct: number;
  activeAds: number;
  totalAds: number;
}

export interface AtriaTrendingVideoPlaceholder {
  id: string;
  brandName: string;
  brandAvatarUrl: string;
  thumbnailUrl: string;
  durationLabel: string;
  activeDays: number;
  industry: string;
  styleTag: string;
  hookLine: string;
  presetId:
    | "iphone_ugc"
    | "claymation_moa"
    | "pixar_story"
    | "mini_drama"
    | "founder_authority"
    | "cinema_macro";
}

export interface AtriaImageTemplatePlaceholder {
  id: string;
  title: string;
  category: string;
  brandName: string;
  thumbnailUrl: string;
  layoutId:
    | "callout_pointers"
    | "us_vs_them"
    | "ugly_postit"
    | "founder_quote"
    | "before_after";
}

export const ATRIA_PROMO_VIDEOS = {
  adClone: "/atria-assets/studio/ad-maker-clone.mp4",
  iterateAds: "/atria-assets/studio/ad-maker-iterate.mp4",
  rayaHeroClip1: "/atria-assets/studio/snow-hero-clip-1.mp4",
  rayaHeroClip2: "/atria-assets/studio/snow-hero-clip-2.mp4",
  rayaHeroClip3: "/atria-assets/studio/snow-hero-clip-3.mp4",
  rayaHeroClip4: "/atria-assets/studio/snow-hero-clip-4.mp4",
};

export const ATRIA_TOP_PICKS_COLLECTIONS: AtriaCollectionPlaceholder[] = [
  {
    id: "tp-1",
    title: "High-Converting Static Callout Ads",
    adCount: 54,
    templateCount: 54,
    category: "Static & Pointers",
    description:
      "Clean product hero frames with crisp benefit arrows, social proof badges, and instant hook hierarchy.",
    thumbnailUrl: "/atria-assets/inspo/collection-01-static-callout.jpg",
    badge: "Most Cloned",
  },
  {
    id: "tp-2",
    title: "Us vs. Them & Comparison Matrices",
    adCount: 42,
    templateCount: 42,
    category: "Comparison",
    description:
      "Split-screen positioning layouts contrasting your hero product against generic alternatives without noise.",
    thumbnailUrl: "/atria-assets/inspo/collection-02-us-vs-them.jpg",
    badge: "ROAS Leader",
  },
  {
    id: "tp-3",
    title: "Seasonal & Promotional Offer Winners",
    adCount: 68,
    templateCount: 68,
    category: "Promotion",
    description:
      "Urgency-driven bundle offers, tiered savings layouts, and clean price-anchor callouts ready to adapt.",
    thumbnailUrl: "/atria-assets/inspo/collection-03-seasonal-offers.jpg",
  },
  {
    id: "tp-4",
    title: "Health, Wellness & Supplement Frames",
    adCount: 49,
    templateCount: 49,
    category: "Health & Wellness",
    description:
      "Ingredient breakdowns, daily routine timelines, and doctor/customer quote formats proven on Meta.",
    thumbnailUrl: "/atria-assets/inspo/collection-04-health-wellness.jpg",
  },
  {
    id: "tp-5",
    title: "Native Notes, iMessage & Ugly Ads",
    adCount: 38,
    templateCount: 38,
    category: "Native Organic",
    description:
      "Pattern-interrupt lo-fi formats disguised as Apple Notes, Post-Its, and text screenshots with high CTR.",
    thumbnailUrl: "/atria-assets/inspo/collection-05-native-notes.jpg",
  },
  {
    id: "tp-6",
    title: "Beauty, Skincare & Before/After",
    adCount: 61,
    templateCount: 61,
    category: "Beauty",
    description:
      "Texture close-ups, 14-day progress split cards, and dermatologist-style proof callouts.",
    thumbnailUrl: "/atria-assets/inspo/collection-06-beauty-skincare.jpg",
  },
  {
    id: "tp-7",
    title: "Apparel & Editorial Lookbook Static",
    adCount: 44,
    templateCount: 44,
    category: "Fashion",
    description:
      "Minimalist typography overlays and fit/fabric detail zoom grids built for cold traffic prospecting.",
    thumbnailUrl: "/atria-assets/inspo/collection-07-apparel-editorial.jpg",
  },
  {
    id: "tp-8",
    title: "Press, Reviews & 5-Star Social Proof",
    adCount: 51,
    templateCount: 51,
    category: "Social Proof",
    description:
      "Trustpilot & verified customer review stacks paired with lifestyle product photography.",
    thumbnailUrl: "/atria-assets/inspo/collection-08-social-proof.jpg",
  },
  {
    id: "tp-9",
    title: "3-Reasons Why & Problem/Solution",
    adCount: 47,
    templateCount: 47,
    category: "Direct Response",
    description:
      "Numbered listicle creatives that pre-handle objections before the user ever clicks to the landing page.",
    thumbnailUrl: "/atria-assets/inspo/collection-09-reasons-why.jpg",
  },
  {
    id: "tp-10",
    title: "Home, Ergonomics & Lifestyle Upgrades",
    adCount: 39,
    templateCount: 39,
    category: "Home & Living",
    description:
      "Warm interior shots with clean architectural annotations highlighting comfort and build quality.",
    thumbnailUrl: "/atria-assets/inspo/collection-10-home-ergonomics.jpg",
  },
  {
    id: "tp-11",
    title: "Unboxing, Bundle & Starter Kit Cards",
    adCount: 33,
    templateCount: 33,
    category: "Bundles",
    description:
      "Flat-lay kit visualizations that boost AOV by showing every item included in the bundle.",
    thumbnailUrl: "/atria-assets/inspo/collection-01-static-callout.jpg",
  },
  {
    id: "tp-12",
    title: "Founder Memo & Manifesto Ads",
    adCount: 29,
    templateCount: 29,
    category: "Founder",
    description:
      "High-trust editorial letter formats telling the real 'why we built this' story for colder audiences.",
    thumbnailUrl: "/atria-assets/inspo/collection-12-founder-memo.jpg",
  },
];

export const ATRIA_ADVERTISERS_PLACEHOLDERS: AtriaAdvertiserPlaceholder[] = [
  {
    id: "adv-meshki",
    name: "Meshki",
    domain: "meshki.com",
    industry: "Apparel & Accessories",
    avatarUrl: "/atria-assets/inspo/adv-meshki.jpg",
    fbFollowers: "412K",
    igFollowers: "2.6M",
    newAds30d: 148,
    growthPct: 24,
    activeAds: 390,
    totalAds: 1840,
  },
  {
    id: "adv-legend",
    name: "Legend London",
    domain: "legendlondon.co",
    industry: "Menswear",
    avatarUrl: "/atria-assets/inspo/adv-legend-london.jpg",
    fbFollowers: "184K",
    igFollowers: "690K",
    newAds30d: 96,
    growthPct: 18,
    activeAds: 215,
    totalAds: 1120,
  },
  {
    id: "adv-tradesman",
    name: "Tradesman Nutrition",
    domain: "tradesmannutrition.com",
    industry: "Health & Wellness",
    avatarUrl: "/atria-assets/inspo/adv-tradesman.jpg",
    fbFollowers: "62K",
    igFollowers: "145K",
    newAds30d: 74,
    growthPct: 31,
    activeAds: 164,
    totalAds: 580,
  },
  {
    id: "adv-nude",
    name: "Nude Project",
    domain: "nude-project.com",
    industry: "Streetwear",
    avatarUrl: "/atria-assets/inspo/adv-nude-project.jpg",
    fbFollowers: "94K",
    igFollowers: "1.3M",
    newAds30d: 112,
    growthPct: 29,
    activeAds: 240,
    totalAds: 940,
  },
  {
    id: "adv-musclemat",
    name: "Muscle Mat",
    domain: "musclemat.com",
    industry: "Home & Wellness",
    avatarUrl: "/atria-assets/inspo/adv-muscle-mat.jpg",
    fbFollowers: "118K",
    igFollowers: "210K",
    newAds30d: 64,
    growthPct: 15,
    activeAds: 128,
    totalAds: 710,
  },
];

export const ATRIA_TRENDING_VIDEOS: AtriaTrendingVideoPlaceholder[] = [
  {
    id: "tv-1",
    brandName: "On",
    brandAvatarUrl: "/atria-assets/studio/brand-avatar-04.jpg",
    thumbnailUrl: "/atria-assets/studio/trending-video-01.jpg",
    durationLabel: "00:31",
    activeDays: 6,
    industry: "Fitness, Sports & Outdoors",
    styleTag: "2D animation",
    hookLine: "3 things I wish I knew before switching my daily setup.",
    presetId: "pixar_story",
  },
  {
    id: "tv-2",
    brandName: "BYLT Basics",
    brandAvatarUrl: "/atria-assets/inspo/adv-legend-london.jpg",
    thumbnailUrl: "/atria-assets/studio/trending-video-04.jpg",
    durationLabel: "01:53",
    activeDays: 11,
    industry: "Apparel & Accessories",
    styleTag: "UGC / handheld",
    hookLine: "Look at the fit test after 100 washes — zero sag.",
    presetId: "iphone_ugc",
  },
  {
    id: "tv-3",
    brandName: "JSHealth",
    brandAvatarUrl: "/atria-assets/inspo/adv-tradesman.jpg",
    thumbnailUrl: "/atria-assets/studio/trending-video-05.jpg",
    durationLabel: "02:42",
    activeDays: 4,
    industry: "Health & Wellness",
    styleTag: "3D / cartoon",
    hookLine: "Stop buying random fixes — here is what actually worked on week 2.",
    presetId: "pixar_story",
  },
  {
    id: "tv-4",
    brandName: "Emma",
    brandAvatarUrl: "/atria-assets/inspo/adv-muscle-mat.jpg",
    thumbnailUrl: "/atria-assets/studio/trending-video-09.jpg",
    durationLabel: "00:51",
    activeDays: 16,
    industry: "Home & Electronics",
    styleTag: "Cinematic",
    hookLine: "Why your posture drops every afternoon at 2 PM — visual MOA.",
    presetId: "cinema_macro",
  },
  {
    id: "tv-5",
    brandName: "Gatorade",
    brandAvatarUrl: "/atria-assets/inspo/adv-nude-project.jpg",
    thumbnailUrl: "/atria-assets/studio/trending-video-06.jpg",
    durationLabel: "01:56",
    activeDays: 39,
    industry: "Food & Beverage",
    styleTag: "Claymation / stop motion",
    hookLine: "Wait — watch what happens inside the body in 3 seconds.",
    presetId: "claymation_moa",
  },
  {
    id: "tv-6",
    brandName: "Emma Lab",
    brandAvatarUrl: "/atria-assets/studio/brand-avatar-04.jpg",
    thumbnailUrl: "/atria-assets/studio/trending-video-07.jpg",
    durationLabel: "03:37",
    activeDays: 63,
    industry: "Health & Wellness",
    styleTag: "Motion graphics",
    hookLine: "Stop-motion breakdown of stiffness vs active sitting support.",
    presetId: "mini_drama",
  },
  {
    id: "tv-7",
    brandName: "On Studio",
    brandAvatarUrl: "/atria-assets/inspo/adv-meshki.jpg",
    thumbnailUrl: "/atria-assets/studio/trending-video-08.jpg",
    durationLabel: "00:33",
    activeDays: 44,
    industry: "Apparel & Accessories",
    styleTag: "Studio",
    hookLine: "Side-by-side durability test — creator skeptical at first.",
    presetId: "founder_authority",
  },
  {
    id: "tv-8",
    brandName: "BYLT Crew",
    brandAvatarUrl: "/atria-assets/inspo/adv-legend-london.jpg",
    thumbnailUrl: "/atria-assets/studio/trending-video-02.jpg",
    durationLabel: "00:10",
    activeDays: 71,
    industry: "Apparel & Accessories",
    styleTag: "Realistic",
    hookLine: "The 3-second texture reveal everyone in the office asked about.",
    presetId: "iphone_ugc",
  },
];

export const ATRIA_IMAGE_TEMPLATES: AtriaImageTemplatePlaceholder[] = [
  {
    id: "tpl-1",
    title: "3 Feature Pointers Hero",
    category: "Feature Highlight",
    brandName: "Flake Template",
    thumbnailUrl: "/atria-assets/studio/image-template-01.jpg",
    layoutId: "callout_pointers",
  },
  {
    id: "tpl-2",
    title: "Us vs. Them Split Card",
    category: "Problem/Solution",
    brandName: "Flake Template",
    thumbnailUrl: "/atria-assets/studio/image-template-02.jpg",
    layoutId: "us_vs_them",
  },
  {
    id: "tpl-3",
    title: "Creator UGC Overlay Quote",
    category: "UGC/Testimonial",
    brandName: "Flake Template",
    thumbnailUrl: "/atria-assets/studio/image-template-03.jpg",
    layoutId: "founder_quote",
  },
  {
    id: "tpl-4",
    title: "Trending Seasonal Offer",
    category: "Discount/Promotion",
    brandName: "Flake Template",
    thumbnailUrl: "/atria-assets/studio/image-template-04.jpg",
    layoutId: "callout_pointers",
  },
  {
    id: "tpl-5",
    title: "14-Day Transformation Split",
    category: "Before/After",
    brandName: "Flake Template",
    thumbnailUrl: "/atria-assets/studio/image-template-05.jpg",
    layoutId: "before_after",
  },
  {
    id: "tpl-6",
    title: "Sticky Note Pattern Interrupt",
    category: "Trending",
    brandName: "Flake Template",
    thumbnailUrl: "/atria-assets/studio/image-template-06.jpg",
    layoutId: "ugly_postit",
  },
  {
    id: "tpl-7",
    title: "Daily Routine Lifestyle Demo",
    category: "Lifestyle",
    brandName: "Flake Template",
    thumbnailUrl: "/atria-assets/studio/image-template-07.jpg",
    layoutId: "callout_pointers",
  },
  {
    id: "tpl-8",
    title: "Close-Up Product Benefit Callout",
    category: "Product Demo",
    brandName: "Flake Template",
    thumbnailUrl: "/atria-assets/studio/image-template-08.jpg",
    layoutId: "callout_pointers",
  },
];

export const ATRIA_BRAND_SCENARIOS = [
  {
    id: "scn-1",
    title: "Work-from-Home Posture Upgrade",
    summary:
      "Replacing a rigid office chair for 6+ hours of daily deep work without lower-back stiffness.",
    imageUrl: "/atria-assets/inspo/collection-10-home-ergonomics.jpg",
    hookAngle: "Problem -> Active Posture Demo",
  },
  {
    id: "scn-2",
    title: "Minimalist Scandinavian Interior",
    summary:
      "Functional ergonomic design that blends into a curated living room instead of looking like gym gear.",
    imageUrl: "/atria-assets/studio/image-template-07.jpg",
    hookAngle: "Aesthetic Proof -> Tactile Material",
  },
  {
    id: "scn-3",
    title: "Afternoon Energy & Focus Slump",
    summary:
      "Micro-movement while taking calls keeps core engaged and eliminates 3 PM sluggishness.",
    imageUrl: "/atria-assets/studio/image-template-08.jpg",
    hookAngle: "3-Second Relatable Hook -> Benefit",
  },
];

export const ATRIA_BRAND_PERSONAS = [
  {
    id: "per-1",
    name: "Freja, 31 — Design-Conscious Founder",
    role: "Studio & Home Office",
    desire: "Wants posture support that still matches Nordic oak & linen decor.",
    avatarUrl: "/atria-assets/inspo/adv-meshki.jpg",
  },
  {
    id: "per-2",
    name: "Henrik, 39 — Remote Tech Lead",
    role: "8h Desk Routine",
    desire: "Needs lower-back relief and sharper afternoon energy without gym time.",
    avatarUrl: "/atria-assets/inspo/adv-legend-london.jpg",
  },
  {
    id: "per-3",
    name: "Maja, 27 — Wellness & Pilates Enthusiast",
    role: "Daily Core Stability",
    desire: "Loves clean tactile products backed by real functional benefits.",
    avatarUrl: "/atria-assets/inspo/adv-nude-project.jpg",
  },
];

export const DEFAULT_DEMO_BRAND_MEMORY: BrandMemory = {
  brandName: "Arch & Pillar",
  domain: "archandpillar.dk",
  websiteUrl: "https://archandpillar.dk",
  logoUrl: "/atria-assets/studio/brand-avatar-04.jpg",
  tagline: "Design-led active sitting & posture support",
  description:
    "Arch Ball is a design-led seating ball intended to encourage active sitting, support posture, and help relieve or prevent back pain.",
  category: "Home & Ergonomics",
  currency: "DKK",
  toneOfVoice: "Nordic, clean, trustworthy & benefit-led",
  targetAudience:
    "Design-conscious professionals & remote workers experiencing desk stiffness",
  primaryOffer: "30-day risk-free trial & fast shipping",
  usps: [
    "Encourages natural active sitting",
    "Scandinavian woven texture & oak strap",
    "Weighted anti-roll base for everyday desks",
  ],
  painPoints: [
    "Lower-back stiffness after hours in standard office chairs",
    "Ugly plastic fitness balls ruining minimalist interiors",
  ],
  desires: [
    "Effortless posture & core engagement while working",
    "Timeless Nordic design piece that belongs in the living room",
  ],
  objections: [
    "Does it roll away when I stand up?",
    "Will it fit under my standard desk height?",
  ],
  customerReviews: [
    "Finally something ergonomic I actually want visible in my studio.",
  ],
  products: [
    {
      title: "Arch Ball - Oat",
      price: "799",
      currency: "DKK",
      image_url: "/atria-assets/inspo/collection-10-home-ergonomics.jpg",
      url: "https://archandpillar.dk/products/archball",
    },
  ],
  brandColors: ["#504429", "#3F3620", "#A7A376", "#EBBF20"],
  pixels: ["Meta Pixel", "Google Analytics"],
  shopifyApps: ["Shopify Markets", "Klaviyo"],
  scrapedAt: "2026-11-26T12:00:00.000Z",
};
