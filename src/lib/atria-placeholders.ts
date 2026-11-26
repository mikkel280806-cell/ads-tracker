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
  adClone: "https://cdn.tryatria.com/video/ad-clone.mp4",
  iterateAds: "https://cdn.tryatria.com/video/radar-to-image-flat.mp4",
  rayaHeroClip1: "https://cdn.tryatria.com/promo/20261029-creativefactory-video-audio-policy-no-background-ff52ce6b.mp4",
  rayaHeroClip2: "https://cdn.tryatria.com/promo/20261029-creativefactory-zoom-in-4dafd35d.mp4",
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
    thumbnailUrl:
      "https://cdn.tryatria.com/_images/w:1920/q:75/plain/adfiles/collection_c4cf7f4de3bd40a7a8986e53acfae5da_image.jpeg",
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
    thumbnailUrl:
      "https://cdn.tryatria.com/_images/w:1920/q:75/plain/adfiles/collection_38dfc99018fc45618d27d3f31e269e5d_image.jpeg",
    badge: "ROAS Leader",
  },
  {
    id: "tp-3",
    title: "BFCM & Seasonal Offer Winners",
    adCount: 68,
    templateCount: 68,
    category: "Promotion",
    description:
      "Urgency-driven bundle offers, tiered savings layouts, and clean price-anchor callouts ready to adapt.",
    thumbnailUrl:
      "https://cdn.tryatria.com/_images/w:1920/q:75/plain/adfiles/collection_47799170c38d4bf38b130850d84fd944_image.jpeg",
  },
  {
    id: "tp-4",
    title: "Health, Wellness & Supplement Frames",
    adCount: 49,
    templateCount: 49,
    category: "Health & Wellness",
    description:
      "Ingredient breakdowns, daily routine timelines, and doctor/customer quote formats proven on Meta.",
    thumbnailUrl:
      "https://cdn.tryatria.com/_images/w:1920/q:75/plain/adfiles/collection_ea299e4a551845ec8533df56ac73a147_image.jpeg",
  },
  {
    id: "tp-5",
    title: "Native Notes, iMessage & Ugly Ads",
    adCount: 38,
    templateCount: 38,
    category: "Native Organic",
    description:
      "Pattern-interrupt lo-fi formats disguised as Apple Notes, Post-Its, and text screenshots with high CTR.",
    thumbnailUrl:
      "https://cdn.tryatria.com/_images/w:1920/q:75/plain/adfiles/collection_f094526a840b4fcaaea83d1832734071_image.jpeg",
  },
  {
    id: "tp-6",
    title: "Beauty, Skincare & Before/After",
    adCount: 61,
    templateCount: 61,
    category: "Beauty",
    description:
      "Texture close-ups, 14-day progress split cards, and dermatologist-style proof callouts.",
    thumbnailUrl:
      "https://cdn.tryatria.com/_images/w:1920/q:75/plain/adfiles/collection_f1aadada546b473f9d0da39743222096_image.jpeg",
  },
  {
    id: "tp-7",
    title: "Apparel & Editorial Lookbook Static",
    adCount: 44,
    templateCount: 44,
    category: "Fashion",
    description:
      "Minimalist typography overlays and fit/fabric detail zoom grids built for cold traffic prospecting.",
    thumbnailUrl:
      "https://cdn.tryatria.com/_images/w:1920/q:75/plain/adfiles/collection_a3de8c09a0b74edf805ae2f1d6523ca4_image.jpeg",
  },
  {
    id: "tp-8",
    title: "Press, Reviews & 5-Star Social Proof",
    adCount: 51,
    templateCount: 51,
    category: "Social Proof",
    description:
      "Trustpilot & verified customer review stacks paired with lifestyle product photography.",
    thumbnailUrl:
      "https://cdn.tryatria.com/_images/w:1920/q:75/plain/adfiles/collection_8f331929eb414c0a8a38a555f140c30f_image.jpeg",
  },
  {
    id: "tp-9",
    title: "3-Reasons Why & Problem/Solution",
    adCount: 47,
    templateCount: 47,
    category: "Direct Response",
    description:
      "Numbered listicle creatives that pre-handle objections before the user ever clicks to the landing page.",
    thumbnailUrl:
      "https://cdn.tryatria.com/_images/w:1920/q:75/plain/adfiles/collection_4a6b368a2f99497b8f62b9fb84a848cf_image.jpeg",
  },
  {
    id: "tp-10",
    title: "Home, Ergonomics & Lifestyle Upgrades",
    adCount: 39,
    templateCount: 39,
    category: "Home & Living",
    description:
      "Warm interior shots with clean architectural annotations highlighting comfort and build quality.",
    thumbnailUrl:
      "https://cdn.tryatria.com/_images/w:1920/q:75/plain/adfiles/collection_52e0824e1b8c4f39aa2428cc751a2d31_image.jpeg",
  },
  {
    id: "tp-11",
    title: "Unboxing, Bundle & Starter Kit Cards",
    adCount: 33,
    templateCount: 33,
    category: "Bundles",
    description:
      "Flat-lay kit visualizations that boost AOV by showing every item included in the bundle.",
    thumbnailUrl:
      "https://cdn.tryatria.com/_images/w:1920/q:75/plain/adfiles/collection_9d1271687cb04f698e95510bdcf68c_image.jpeg",
  },
  {
    id: "tp-12",
    title: "Founder Memo & Manifesto Ads",
    adCount: 29,
    templateCount: 29,
    category: "Founder",
    description:
      "High-trust editorial letter formats telling the real 'why we built this' story for colder audiences.",
    thumbnailUrl:
      "https://cdn.tryatria.com/_images/w:1920/q:75/plain/adfiles/collection_8dc0a450066747db81d57bf601904d10_image.jpeg",
  },
];

export const ATRIA_ADVERTISERS_PLACEHOLDERS: AtriaAdvertiserPlaceholder[] = [
  {
    id: "adv-meshki",
    name: "Meshki",
    domain: "meshki.com",
    industry: "Apparel & Accessories",
    avatarUrl:
      "https://cdn.tryatria.com/_images/w:1920/q:75/plain/adfiles/brand_m1399309633614041_5YtCD-qsY9E.jpeg",
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
    avatarUrl:
      "https://cdn.tryatria.com/_images/w:1920/q:75/plain/adfiles/brand_m532567963605592_A1049ztq2Cw.jpeg",
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
    avatarUrl:
      "https://cdn.tryatria.com/_images/w:1920/q:75/plain/adfiles/brand_m822932334247182_0PkMzG6ZIn8.jpeg",
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
    avatarUrl:
      "https://cdn.tryatria.com/_images/w:1920/q:75/plain/adfiles/brand_m299266634324735_94tSYHD7byI.jpeg",
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
    avatarUrl:
      "https://cdn.tryatria.com/_images/w:1920/q:75/plain/adfiles/brand_m105396194411046_7CJLhLx6gg8.jpeg",
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
    brandAvatarUrl:
      "https://cdn.tryatria.com/_images/w:1920/q:75/plain/adfiles/m1728430598258373_Q146J4iB4yo.jpeg",
    thumbnailUrl:
      "https://cdn.tryatria.com/_images/w:1920/q:75/plain/adfiles/m2200870263862030_Iw4tWWLAWig.jpeg",
    durationLabel: "00:24",
    activeDays: 68,
    industry: "Fitness, Sports & Outdoors",
    styleTag: "UGC / handheld",
    hookLine: "3 things I wish I knew before switching my daily setup.",
    presetId: "iphone_ugc",
  },
  {
    id: "tv-2",
    brandName: "BYLT Basics",
    brandAvatarUrl:
      "https://cdn.tryatria.com/_images/w:1920/q:75/plain/adfiles/m1779961569778067_UuptTMvykJ4.jpeg",
    thumbnailUrl:
      "https://cdn.tryatria.com/_images/w:1920/q:75/plain/adfiles/m1457224572408658_DFK6VGDzc5A.jpeg",
    durationLabel: "00:31",
    activeDays: 54,
    industry: "Apparel & Accessories",
    styleTag: "Studio",
    hookLine: "Look at the fit test after 100 washes — zero sag.",
    presetId: "founder_authority",
  },
  {
    id: "tv-3",
    brandName: "JSHealth",
    brandAvatarUrl:
      "https://cdn.tryatria.com/_images/w:1920/q:75/plain/adfiles/m4300075613460119_xONPwMp67J4.jpeg",
    thumbnailUrl:
      "https://cdn.tryatria.com/_images/w:1920/q:75/plain/adfiles/m2805634163211169_TwFzsmhXJwk.jpeg",
    durationLabel: "00:21",
    activeDays: 82,
    industry: "Health & Wellness",
    styleTag: "Realistic",
    hookLine: "Stop buying random fixes — here is what actually worked on week 2.",
    presetId: "iphone_ugc",
  },
  {
    id: "tv-4",
    brandName: "Emma",
    brandAvatarUrl:
      "https://cdn.tryatria.com/_images/w:1920/q:75/plain/adfiles/m1565013542339609_MpUnZFgPZ-g.jpeg",
    thumbnailUrl:
      "https://cdn.tryatria.com/_images/w:1920/q:75/plain/adfiles/m1653381479674062_mPyiJo3gIpM.jpeg",
    durationLabel: "00:19",
    activeDays: 47,
    industry: "Home & Electronics",
    styleTag: "Cinematic",
    hookLine: "Why your posture drops every afternoon at 2 PM — visual MOA.",
    presetId: "cinema_macro",
  },
  {
    id: "tv-5",
    brandName: "Gatorade",
    brandAvatarUrl:
      "https://cdn.tryatria.com/_images/w:1920/q:75/plain/adfiles/m2330464661102260_r3oSJe8v5hk.jpeg",
    thumbnailUrl:
      "https://cdn.tryatria.com/_images/w:1920/q:75/plain/adfiles/m2330464661102260_BkHBAKBsor8.jpeg",
    durationLabel: "00:26",
    activeDays: 39,
    industry: "Food & Beverage",
    styleTag: "3D / cartoon",
    hookLine: "Wait — watch what happens inside the body in 3 seconds.",
    presetId: "pixar_story",
  },
  {
    id: "tv-6",
    brandName: "Emma Lab",
    brandAvatarUrl:
      "https://cdn.tryatria.com/_images/w:1920/q:75/plain/adfiles/m1565013542339609_MpUnZFgPZ-g.jpeg",
    thumbnailUrl:
      "https://cdn.tryatria.com/_images/w:1920/q:75/plain/adfiles/m1565013542339609_7_Sx3HBMkeU.jpeg",
    durationLabel: "00:20",
    activeDays: 63,
    industry: "Health & Wellness",
    styleTag: "Claymation / stop motion",
    hookLine: "Stop-motion breakdown of stiffness vs active sitting support.",
    presetId: "claymation_moa",
  },
  {
    id: "tv-7",
    brandName: "On Studio",
    brandAvatarUrl:
      "https://cdn.tryatria.com/_images/w:1920/q:75/plain/adfiles/m1728430598258373_Q146J4iB4yo.jpeg",
    thumbnailUrl:
      "https://cdn.tryatria.com/_images/w:1920/q:75/plain/adfiles/m1728430598258373_0IoWN70AXvc.jpeg",
    durationLabel: "00:25",
    activeDays: 44,
    industry: "Apparel & Accessories",
    styleTag: "Motion graphics",
    hookLine: "Side-by-side durability test — creator skeptical at first.",
    presetId: "mini_drama",
  },
  {
    id: "tv-8",
    brandName: "BYLT Crew",
    brandAvatarUrl:
      "https://cdn.tryatria.com/_images/w:1920/q:75/plain/adfiles/m1779961569778067_UuptTMvykJ4.jpeg",
    thumbnailUrl:
      "https://cdn.tryatria.com/_images/w:1920/q:75/plain/adfiles/m1779961569778067_fMTU48mvMF0.jpeg",
    durationLabel: "00:28",
    activeDays: 71,
    industry: "Apparel & Accessories",
    styleTag: "2D animation",
    hookLine: "The 3-second texture reveal everyone in the office asked about.",
    presetId: "pixar_story",
  },
];

export const ATRIA_IMAGE_TEMPLATES: AtriaImageTemplatePlaceholder[] = [
  {
    id: "tpl-1",
    title: "3 Feature Pointers Hero",
    category: "Feature Highlight",
    brandName: "Flake Template",
    thumbnailUrl:
      "https://cdn.tryatria.com/_images/w:1920/q:75/plain/adfiles/m1335638612072013_eUn0D5ST62g.jpeg",
    layoutId: "callout_pointers",
  },
  {
    id: "tpl-2",
    title: "Us vs. Them Split Card",
    category: "Problem/Solution",
    brandName: "Flake Template",
    thumbnailUrl:
      "https://cdn.tryatria.com/_images/w:1920/q:75/plain/adfiles/m27690321097275518_a0AA91zkQuE.jpeg",
    layoutId: "us_vs_them",
  },
  {
    id: "tpl-3",
    title: "Creator UGC Overlay Quote",
    category: "UGC/Testimonial",
    brandName: "Flake Template",
    thumbnailUrl:
      "https://cdn.tryatria.com/_images/w:1920/q:75/plain/adfiles/m1888317939240621_eH3jGaJAuvk.jpeg",
    layoutId: "founder_quote",
  },
  {
    id: "tpl-4",
    title: "Trending Seasonal Offer",
    category: "Discount/Promotion",
    brandName: "Flake Template",
    thumbnailUrl:
      "https://cdn.tryatria.com/_images/w:1920/q:75/plain/adfiles/m1360507625918026_VHOEUBTkgQY.jpeg",
    layoutId: "callout_pointers",
  },
  {
    id: "tpl-5",
    title: "14-Day Transformation Split",
    category: "Before/After",
    brandName: "Flake Template",
    thumbnailUrl:
      "https://cdn.tryatria.com/_images/w:1920/q:75/plain/adfiles/m4243083519237126_MvQA0Hb-574.jpeg",
    layoutId: "before_after",
  },
  {
    id: "tpl-6",
    title: "Sticky Note Pattern Interrupt",
    category: "Trending",
    brandName: "Flake Template",
    thumbnailUrl:
      "https://cdn.tryatria.com/_images/w:1920/q:75/plain/adfiles/m2008860406649270_NorovItBYS4.jpeg",
    layoutId: "ugly_postit",
  },
  {
    id: "tpl-7",
    title: "Daily Routine Lifestyle Demo",
    category: "Lifestyle",
    brandName: "Flake Template",
    thumbnailUrl:
      "https://cdn.tryatria.com/_images/w:1920/q:75/plain/adfiles/m1287050216268218_Fx_ZZq1qj6k.jpeg",
    layoutId: "callout_pointers",
  },
  {
    id: "tpl-8",
    title: "Close-Up Product Benefit Callout",
    category: "Product Demo",
    brandName: "Flake Template",
    thumbnailUrl:
      "https://cdn.tryatria.com/_images/w:1920/q:75/plain/adfiles/m4373518106270164_S9AeoISZjNc.jpeg",
    layoutId: "callout_pointers",
  },
];

export const ATRIA_BRAND_SCENARIOS = [
  {
    id: "scn-1",
    title: "Work-from-Home Posture Upgrade",
    summary:
      "Replacing a rigid office chair for 6+ hours of daily deep work without lower-back stiffness.",
    imageUrl:
      "https://cdn.tryatria.com/_images/w:1920/q:75/plain/brands_v2/016b35e5c904443b89cda406894cf789/0061e599ddae49038ec807439625dc04/4596042a8fc4474ca6804accb7063412.jpg",
    hookAngle: "Problem -> Active Posture Demo",
  },
  {
    id: "scn-2",
    title: "Minimalist Scandinavian Interior",
    summary:
      "Functional ergonomic design that blends into a curated living room instead of looking like gym gear.",
    imageUrl:
      "https://cdn.tryatria.com/_images/w:1920/q:75/plain/brands_v2/016b35e5c904443b89cda406894cf789/0061e599ddae49038ec807439625dc04/bcc35e84afe844e3b5cfc14eee174304.jpg",
    hookAngle: "Aesthetic Proof -> Tactile Material",
  },
  {
    id: "scn-3",
    title: "Afternoon Energy & Focus Slump",
    summary:
      "Micro-movement while taking calls keeps core engaged and eliminates 3 PM sluggishness.",
    imageUrl:
      "https://cdn.tryatria.com/_images/w:1920/q:75/plain/brands_v2/016b35e5c904443b89cda406894cf789/0061e599ddae49038ec807439625dc04/e5e7da43159042c58e9ce381919be51a.jpg",
    hookAngle: "3-Second Relatable Hook -> Benefit",
  },
];

export const ATRIA_BRAND_PERSONAS = [
  {
    id: "per-1",
    name: "Freja, 31 — Design-Conscious Founder",
    role: "Studio & Home Office",
    desire: "Wants posture support that still matches Nordic oak & linen decor.",
    avatarUrl:
      "https://cdn.tryatria.com/_images/w:1920/q:75/plain/brands_v2/016b35e5c904443b89cda406894cf789/0061e599ddae49038ec807439625dc04/36f63cecd5ef455a9d1af15631f019d0.jpg",
  },
  {
    id: "per-2",
    name: "Henrik, 39 — Remote Tech Lead",
    role: "8h Desk Routine",
    desire: "Needs lower-back relief and sharper afternoon energy without gym time.",
    avatarUrl:
      "https://cdn.tryatria.com/_images/w:1920/q:75/plain/brands_v2/016b35e5c904443b89cda406894cf789/0061e599ddae49038ec807439625dc04/40bd13a6bfbb4b03a9da0b9d5d92a4da.jpg",
  },
  {
    id: "per-3",
    name: "Maja, 27 — Wellness & Pilates Enthusiast",
    role: "Daily Core Stability",
    desire: "Loves clean tactile products backed by real functional benefits.",
    avatarUrl:
      "https://cdn.tryatria.com/_images/w:1920/q:75/plain/brands_v2/016b35e5c904443b89cda406894cf789/0061e599ddae49038ec807439625dc04/eb7463c6f71a48a1bd0682f3981c621d.jpg",
  },
];

export const DEFAULT_DEMO_BRAND_MEMORY: BrandMemory = {
  brandName: "Arch & Pillar",
  domain: "archandpillar.dk",
  websiteUrl: "https://archandpillar.dk",
  logoUrl:
    "https://cdn.tryatria.com/_images/w:1920/q:75/plain/brands_v2/016b35e5c904443b89cda406894cf789/0061e599ddae49038ec807439625dc04/af8c6b16cbc64cceb2b0c0a8fd560543.png",
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
      image_url:
        "https://cdn.tryatria.com/_images/w:1920/q:75/plain/brands_v2/016b35e5c904443b89cda406894cf789/0061e599ddae49038ec807439625dc04/fd109056cd3f4c4c8852298c5fada5da.jpg",
      url: "https://archandpillar.dk/products/archball",
    },
  ],
  brandColors: ["#504429", "#3F3620", "#A7A376", "#EBBF20"],
  pixels: ["Meta Pixel", "Google Analytics"],
  shopifyApps: ["Shopify Markets", "Klaviyo"],
  scrapedAt: "2026-11-26T12:00:00.000Z",
};
