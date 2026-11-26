"use client";

import React, { useDeferredValue, useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  ArrowUpDown,
  Calendar,
  Check,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  ExternalLink,
  Globe,
  Heart,
  HelpCircle,
  ListFilter,
  Loader2,
  Package,
  Play,
  Plus,
  Search,
  Settings,
  Users,
  X,
} from "lucide-react";
import type {
  Ad,
  AdsTimelinePoint,
  Board,
  Brand,
  TrafficPoint,
} from "@/lib/types";
import { formatReach } from "@/lib/url-parser";
import {
  FacebookColorIcon,
  InstagramColorIcon,
  MetaInfinityIcon,
  ShopifyBagIcon,
  TechBrandIcon,
  TikTokColorIcon,
  YouTubeColorIcon,
} from "./BrandIcons";
import { FlakePopover } from "./ui/FlakeDropdown";
import {
  ATRIA_COUNTRIES,
  ATRIA_COUNTRY_QUICK_GROUPS,
  AtriaCreateViewModal,
  AtriaFilterPill,
  AtriaGrowthFilterPopover,
  AtriaIndustryPopover,
  AtriaManageViewsModal,
  AtriaPopoverHeader,
  AtriaRangeFilterPopover,
  type GrowthFilterValue,
  type RangeFilterValue,
  type SavedCustomView,
} from "./AtriaFilterPrimitives";

interface ShopsTableViewProps {
  brands: Brand[];
  ads: Ad[];
  boards: Board[];
  onOpenShop: (brandId: string) => void;
  onAddBrand: (brand: Brand, discoveredAds?: Ad[]) => void;
  onToggleBrandFolder: (brandId: string, boardId: string) => void;
}

type BrandSortKey =
  | "recommended"
  | "most_traffic"
  | "most_traffic_growth"
  | "most_active_ads"
  | "most_new_ads_30d"
  | "most_new_ads_growth_30d"
  | "most_ads"
  | "name_az";

type SocialPlatform =
  | "Instagram"
  | "Facebook"
  | "TikTok"
  | "YouTube"
  | "X"
  | "LinkedIn"
  | "Pinterest";

type BrandPopoverKey =
  | "sort"
  | "industry"
  | "socials"
  | "traffic"
  | "traffic_growth"
  | "visitor_country"
  | "active_ads"
  | "ads_launched"
  | "technology"
  | "product_count"
  | "new_launches";

interface BrandFilterSnapshot {
  industries: string[];
  socials: SocialPlatform[];
  traffic: RangeFilterValue;
  trafficGrowth: GrowthFilterValue;
  visitorCountries: string[];
  activeAds: RangeFilterValue;
  adsLaunched: RangeFilterValue;
  technologies: string[];
  productCount: RangeFilterValue;
  newLaunches: RangeFilterValue;
  searchQuery: string;
}

interface SavedBrandView extends SavedCustomView {
  sortBy: BrandSortKey;
  filters: BrandFilterSnapshot;
}

const BRAND_SORT_OPTIONS: Array<{ value: BrandSortKey; label: string }> = [
  { value: "recommended", label: "Recommended" },
  { value: "most_traffic", label: "Most traffic" },
  { value: "most_traffic_growth", label: "Most traffic growth" },
  { value: "most_active_ads", label: "Most active ads" },
  { value: "most_new_ads_30d", label: "Most new ads (last 30D)" },
  { value: "most_new_ads_growth_30d", label: "Most new ads growth (last 30D)" },
  { value: "most_ads", label: "Most ads" },
  { value: "name_az", label: "Name A→Z" },
];

const SOCIAL_PLATFORMS: SocialPlatform[] = [
  "Instagram",
  "Facebook",
  "TikTok",
  "YouTube",
  "X",
  "LinkedIn",
  "Pinterest",
];

const ECOMMERCE_PLATFORMS: string[] = [
  "Shopify",
  "Magento",
  "Salesforce Commerce",
  "BigCommerce",
  "Shopware",
  "PrestaShop",
  "VTEX",
  "Shoptet",
  "Fermat",
  "Square Online",
];

const SITE_BUILDERS_CMS: string[] = [
  "Wix",
  "Squarespace",
  "Webflow",
  "Framer",
  "Duda",
  "HubSpot CMS",
  "WordPress",
];

const INDUSTRY_KEYWORD_MAP: Record<string, string[]> = {
  "apparel & accessories": [
    "apparel",
    "fashion",
    "clothing",
    "wear",
    "shoe",
    "footwear",
    "jewelry",
    "watch",
    "bag",
    "luggage",
    "eyewear",
    "accessories",
    "hat",
    "lingerie",
    "underwear",
    "sportswear",
    "swimwear",
    "textile",
    "menswear",
    "womenswear",
  ],
  "electronics & appliances": [
    "electronic",
    "appliance",
    "audio",
    "headphone",
    "smart home",
    "wearable",
    "mobile",
    "lighting",
    "gadget",
    "tech",
  ],
  "arts, media & entertainment": ["art", "media", "entertainment", "photo", "music", "print", "poster"],
  "baby, kids & maternity": ["baby", "kid", "child", "nursery", "maternity", "toddler", "family"],
  "beauty & personal care": [
    "beauty",
    "skincare",
    "skin",
    "hair",
    "makeup",
    "cosmetic",
    "fragrance",
    "perfume",
    "oral",
    "grooming",
    "body care",
    "personal care",
  ],
  "book/publishing": ["book", "publish", "journal", "planner", "magazine"],
  "business services": ["b2b", "saas", "agency", "logistics", "consulting", "business"],
  "charity, nfp & ngo": ["charity", "nonprofit", "ngo", "environmental"],
  "e-commerce": ["ecommerce", "e-commerce", "dtc", "marketplace", "subscription", "gift"],
  education: ["education", "course", "learning", "coaching"],
  event: ["event", "ticket", "workshop", "festival"],
  "financial services": ["fintech", "finance", "bank", "insurance", "invest"],
  "fitness, sports & outdoors": [
    "fitness",
    "sport",
    "outdoor",
    "gym",
    "activewear",
    "athleisure",
    "running",
    "training",
    "recovery",
    "camping",
    "athletic",
    "workout",
  ],
  "food & beverage": [
    "food",
    "beverage",
    "drink",
    "coffee",
    "matcha",
    "snack",
    "bar",
    "meal",
    "pantry",
    "condiment",
    "tea",
    "chocolate",
    "grocery",
  ],
  "games & toys": ["game", "toy", "puzzle", "collectible"],
  government: ["government", "public", "civic"],
  "health & medical": [
    "health",
    "medical",
    "wellness",
    "supplement",
    "vitamin",
    "sleep",
    "ergonomic",
    "posture",
    "mental",
    "telehealth",
    "nutrition",
    "pain",
    "recovery",
  ],
  "home & garden": [
    "home",
    "garden",
    "living",
    "bedding",
    "furniture",
    "decor",
    "interior",
    "kitchen",
    "dining",
    "cookware",
    "cleaning",
    "patio",
    "sleep",
    "mattress",
  ],
  "life services": ["life", "studio", "service"],
  pets: ["pet", "dog", "cat", "vet"],
  "technology & software": ["software", "ai ", "app", "vpn", "saas", "creator", "productivity"],
  "travel & hospitality": ["travel", "luggage", "hotel", "suitcase", "hospitality"],
  "vehicle & transportation": ["vehicle", "bike", "e-bike", "auto", "car", "mobility"],
};

const QUICK_SUGGESTIONS = [
  "bareen.com",
  "liewood.com",
  "aloyoga.com",
  "carawayhome.com",
];

function createEmptyFilterSnapshot(): BrandFilterSnapshot {
  return {
    industries: [],
    socials: [],
    traffic: { min: null, max: null },
    trafficGrowth: { direction: null, minPct: null },
    visitorCountries: [],
    activeAds: { min: null, max: null },
    adsLaunched: { min: null, max: null, window: "30 days" },
    technologies: [],
    productCount: { min: null, max: null },
    newLaunches: { min: null, max: null, window: "30 days" },
    searchQuery: "",
  };
}

function parseWindowDays(windowStr?: string, fallback = 30): number {
  if (!windowStr) return fallback;
  const match = windowStr.match(/(\d+)/);
  return match ? Math.max(1, Number(match[1])) : fallback;
}

function formatCompactCount(val: number): string {
  if (val >= 1_000_000) {
    const num = val / 1_000_000;
    return `${Number.isInteger(num) ? num : num.toFixed(1)}M`;
  }
  if (val >= 1_000) {
    const num = val / 1_000;
    return `${Number.isInteger(num) ? num : num.toFixed(1)}K`;
  }
  return val.toLocaleString("en-US");
}

function formatRangeActiveLabel(
  val: RangeFilterValue,
  unitSuffix = "",
  includeWindow = false
): string | null {
  if (val.min === null && val.max === null) return null;
  let core = "";
  if (val.min !== null && val.max !== null) {
    core = `${formatCompactCount(val.min)}–${formatCompactCount(val.max)}${unitSuffix}`;
  } else if (val.min !== null) {
    core = `≥${formatCompactCount(val.min)}${unitSuffix}`;
  } else if (val.max !== null) {
    core = `≤${formatCompactCount(val.max)}${unitSuffix}`;
  }
  if (includeWindow && val.window) {
    const days = parseWindowDays(val.window, 30);
    return `${core} (${days}d)`;
  }
  return core;
}

function SocialChipIcon({ platform }: { platform: SocialPlatform }) {
  switch (platform) {
    case "Instagram":
      return <InstagramColorIcon className="h-3.5 w-3.5 shrink-0" />;
    case "Facebook":
      return <FacebookColorIcon className="h-3.5 w-3.5 shrink-0" />;
    case "TikTok":
      return <TikTokColorIcon className="h-3.5 w-3.5 shrink-0" />;
    case "YouTube":
      return <YouTubeColorIcon className="h-3.5 w-3.5 shrink-0" />;
    case "X":
      return (
        <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5 shrink-0" aria-hidden="true">
          <rect x="2" y="2" width="20" height="20" rx="5" fill="#0F172A" />
          <path
            d="M13.3 10.9L17.9 5.6h-1.1l-4 4.6L9.6 5.6H5.9l4.8 7-4.8 5.6h1.1l4.2-4.9 3.4 4.9h3.7l-5-7.3zm-1.5 1.7l-.5-.7-3.9-5.5h1.7l3.1 4.5.5.7 4 5.8h-1.7l-3.2-4.8z"
            fill="#FFFFFF"
          />
        </svg>
      );
    case "LinkedIn":
      return (
        <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5 shrink-0" aria-hidden="true">
          <rect x="2" y="2" width="20" height="20" rx="4.5" fill="#0A66C2" />
          <path
            d="M8.2 10.1v7.2H5.8v-7.2h2.4zM7 6.3a1.35 1.35 0 1 1 0 2.7 1.35 1.35 0 0 1 0-2.7zm5.1 3.8v1c.55-.78 1.4-1.2 2.55-1.2 1.85 0 3.25 1.22 3.25 3.84v3.56h-2.4v-3.22c0-1.15-.45-1.88-1.45-1.88-.88 0-1.55.62-1.55 1.78v3.32H10.1v-7.2h2z"
            fill="#FFFFFF"
          />
        </svg>
      );
    case "Pinterest":
      return (
        <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5 shrink-0" aria-hidden="true">
          <circle cx="12" cy="12" r="10" fill="#E60023" />
          <path
            d="M12.2 6.8c-3 0-4.7 2-4.7 4.2 0 1 .55 2.2 1.4 2.6.13.06.2.03.23-.09l.2-.82c.03-.1 0-.16-.06-.24-.28-.34-.5-.95-.5-1.52 0-1.47 1.12-2.9 3.03-2.9 1.65 0 2.8 1.12 2.8 2.72 0 1.82-.92 3.08-2.12 3.08-.66 0-1.16-.54-1-1.22.19-.8.56-1.67.56-2.25 0-.52-.28-.95-.85-.95-.68 0-1.22.7-1.22 1.64 0 .6.2 1 .2 1l-.82 3.48c-.21.9-.03 2.02-.01 2.13.01.07.09.09.13.04.06-.07.76-.96 1-1.85l.4-1.54c.21.4.82.74 1.48.74 1.95 0 3.35-1.8 3.35-4.04 0-2.14-1.76-3.77-4.4-3.77z"
            fill="#FFFFFF"
          />
        </svg>
      );
  }
}

function brandMatchesIndustry(brand: Brand, selectedIndustries: string[]): boolean {
  if (selectedIndustries.length === 0) return true;
  const hay = [
    brand.category || "",
    ...(brand.sub_categories || []),
    brand.description || "",
  ]
    .join(" ")
    .toLowerCase();

  return selectedIndustries.some((sel) => {
    const key = sel.toLowerCase().trim();
    if (!key) return false;
    if (hay.includes(key)) return true;

    const mapped = INDUSTRY_KEYWORD_MAP[key];
    if (mapped && mapped.some((kw) => hay.includes(kw))) return true;

    const tokens = key
      .split(/[\s&/,()'-]+/)
      .map((t) => t.trim())
      .filter((t) => t.length >= 4 && !["care", "gear", "wear", "other", "brand"].includes(t));
    if (tokens.some((t) => hay.includes(t))) return true;

    return false;
  });
}

function brandHasSocial(brand: Brand, social: SocialPlatform): boolean {
  const pixelsLower = (brand.pixels || []).map((p) => p.toLowerCase());
  const appsLower = (brand.shopify_apps || []).map((a) => a.toLowerCase());
  switch (social) {
    case "Instagram":
      return Boolean(brand.instagram_url) || (brand.ig_followers ?? 0) > 0;
    case "Facebook":
      return (
        Boolean(brand.facebook_url || brand.meta_page_id || brand.meta_ad_library_url) ||
        (brand.fb_likes ?? 0) > 0 ||
        (brand.active_ads_count ?? 0) > 0 ||
        pixelsLower.some((p) => p.includes("meta") || p.includes("facebook"))
      );
    case "TikTok":
      return (
        Boolean(brand.tiktok_url) ||
        pixelsLower.some((p) => p.includes("tiktok")) ||
        appsLower.some((a) => a.includes("tiktok"))
      );
    case "YouTube":
      return Boolean(brand.youtube_url);
    case "X":
      return pixelsLower.some((p) => p.includes("twitter") || p === "x" || p.includes("x pixel"));
    case "LinkedIn":
      return pixelsLower.some((p) => p.includes("linkedin"));
    case "Pinterest":
      return pixelsLower.some((p) => p.includes("pinterest"));
  }
}

function getBrandVisitorCountryCodes(brand: Brand): Set<string> {
  const codes = new Set<string>();
  const normalize = (code?: string) => {
    if (!code) return null;
    const upper = code.trim().toUpperCase();
    return upper === "UK" ? "GB" : upper;
  };
  for (const vc of brand.visitor_countries || []) {
    const n = normalize(vc.code);
    if (n) codes.add(n);
  }
  const direct = normalize(brand.country_code);
  if (direct) codes.add(direct);

  if (codes.size === 0) {
    if (brand.market === "DK") codes.add("DK");
    else if (brand.market === "US") codes.add("US");
    else if (brand.market === "EU") {
      ["DE", "FR", "NL", "DK", "SE"].forEach((c) => codes.add(c));
    } else {
      codes.add("US");
    }
  }
  return codes;
}

function brandHasTechnology(brand: Brand, tech: string): boolean {
  const key = tech.toLowerCase();
  if (key === "shopify") {
    return Boolean(brand.is_shopify || brand.myshopify_domain || brand.shopify_theme);
  }
  const hay = [
    ...(brand.pixels || []),
    ...(brand.shopify_apps || []),
    brand.shopify_theme || "",
    brand.website_url || "",
  ]
    .join(" ")
    .toLowerCase();
  return hay.includes(key);
}

function getHomepageScreenshotUrl(
  websiteUrl?: string,
  storedScreenshotUrl?: string
): string | null {
  if (
    storedScreenshotUrl &&
    (storedScreenshotUrl.includes("/ad-media/homepages/") ||
      storedScreenshotUrl.includes("/homepages/") ||
      storedScreenshotUrl.includes(".r2.dev/"))
  ) {
    return storedScreenshotUrl;
  }
  if (!websiteUrl) return null;
  const clean = websiteUrl.trim().startsWith("http")
    ? websiteUrl.trim()
    : `https://${websiteUrl.trim()}`;
  return `https://image.thum.io/get/width/600/crop/380/noanimate/${clean}`;
}

function hasPositivePrice(price?: string): boolean {
  if (!price) return false;
  const normalized = price.replace(/[^0-9.,]/g, "").replace(",", ".");
  const num = parseFloat(normalized);
  return Number.isFinite(num) && num > 0;
}

function formatFoundedAge(iso?: string): { date: string; age: string } | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const yyyy = d.getFullYear();
  const monthsDiff = Math.max(
    1,
    Math.round((Date.UTC(2026, 10, 23) - d.getTime()) / (1000 * 60 * 60 * 24 * 30.44))
  );
  const years = Math.floor(monthsDiff / 12);
  const remMonths = monthsDiff % 12;
  const age =
    years >= 2
      ? `${years} years`
      : years === 1
        ? remMonths > 0
          ? `1 year ${remMonths}m`
          : "1 year"
        : `${monthsDiff} months`;
  return { date: `${mm}/${dd}/${yyyy}`, age };
}

function AreaSparkline({
  values,
  positive = true,
  width = 112,
  height = 34,
}: {
  values: number[];
  positive?: boolean;
  width?: number;
  height?: number;
}) {
  const gradId = useId();
  if (values.length < 2) return null;

  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = Math.max(1, max - min);
  const padY = 4;

  const coords = values.map((v, i) => ({
    x: (i / (values.length - 1)) * width,
    y: height - padY - ((v - min) / span) * (height - padY * 2),
  }));

  let line = `M ${coords[0].x.toFixed(1)},${coords[0].y.toFixed(1)}`;
  for (let i = 0; i < coords.length - 1; i++) {
    const p0 = coords[i];
    const p1 = coords[i + 1];
    const cx = ((p0.x + p1.x) / 2).toFixed(1);
    line += ` C ${cx},${p0.y.toFixed(1)} ${cx},${p1.y.toFixed(1)} ${p1.x.toFixed(1)},${p1.y.toFixed(1)}`;
  }
  const area = `${line} L ${width},${height} L 0,${height} Z`;
  const stroke = positive ? "#16A34A" : "#EF4444";

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className="block w-full overflow-visible"
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={stroke} stopOpacity="0.22" />
          <stop offset="100%" stopColor={stroke} stopOpacity="0.0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gradId})`} />
      <path
        d={line}
        fill="none"
        stroke={stroke}
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function MiniSparkline({
  data,
  positive,
}: {
  data?: TrafficPoint[];
  positive: boolean;
}) {
  if (!data || data.length < 2) return null;
  return (
    <div className="w-[62px] shrink-0">
      <AreaSparkline
        values={data.slice(-7).map((d) => d.visits)}
        positive={positive}
        width={62}
        height={24}
      />
    </div>
  );
}

export const ShopsTableView = React.memo(function ShopsTableView({
  brands,
  ads,
  boards: _boards,
  onOpenShop,
  onAddBrand,
  onToggleBrandFolder: _onToggleBrandFolder,
}: ShopsTableViewProps) {
  void _boards;
  void _onToggleBrandFolder;

  // Request a brand modal state (wired to live runBrandLookup)
  const [lookupInput, setLookupInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [requestModalOpen, setRequestModalOpen] = useState(false);

  // Views management state
  const [activeViewId, setActiveViewId] = useState<string>("all");
  const [customViews, setCustomViews] = useState<SavedBrandView[]>([]);
  const [createViewOpen, setCreateViewOpen] = useState(false);
  const [manageViewsOpen, setManageViewsOpen] = useState(false);

  // Top bar search, sort & panel toggle (expanded by default just like Atria)
  const [searchQuery, setSearchQuery] = useState("");
  const deferredSearchQuery = useDeferredValue(searchQuery);
  const [sortBy, setSortBy] = useState<BrandSortKey>("recommended");
  const [filtersPanelOpen, setFiltersPanelOpen] = useState(true);
  const [openPopover, setOpenPopover] = useState<BrandPopoverKey | null>(null);

  // 10 Brand filter states
  const [selectedIndustries, setSelectedIndustries] = useState<string[]>([]);
  const [selectedSocials, setSelectedSocials] = useState<SocialPlatform[]>([]);
  const [trafficRange, setTrafficRange] = useState<RangeFilterValue>({ min: null, max: null });
  const [trafficGrowth, setTrafficGrowth] = useState<GrowthFilterValue>({
    direction: null,
    minPct: null,
  });
  const [selectedCountries, setSelectedCountries] = useState<string[]>([]);
  const [countrySearch, setCountrySearch] = useState("");
  const [activeAdsRange, setActiveAdsRange] = useState<RangeFilterValue>({ min: null, max: null });
  const [adsLaunchedRange, setAdsLaunchedRange] = useState<RangeFilterValue>({
    min: null,
    max: null,
    window: "30 days",
  });
  const [selectedTechs, setSelectedTechs] = useState<string[]>([]);
  const [techSearch, setTechSearch] = useState("");
  const [productCountRange, setProductCountRange] = useState<RangeFilterValue>({
    min: null,
    max: null,
  });
  const [newLaunchesRange, setNewLaunchesRange] = useState<RangeFilterValue>({
    min: null,
    max: null,
    window: "30 days",
  });

  // Trigger refs for all popovers
  const sortTriggerRef = useRef<HTMLButtonElement | null>(null);
  const industryTriggerRef = useRef<HTMLButtonElement | null>(null);
  const socialsTriggerRef = useRef<HTMLButtonElement | null>(null);
  const trafficTriggerRef = useRef<HTMLButtonElement | null>(null);
  const trafficGrowthTriggerRef = useRef<HTMLButtonElement | null>(null);
  const countryTriggerRef = useRef<HTMLButtonElement | null>(null);
  const activeAdsTriggerRef = useRef<HTMLButtonElement | null>(null);
  const adsLaunchedTriggerRef = useRef<HTMLButtonElement | null>(null);
  const techTriggerRef = useRef<HTMLButtonElement | null>(null);
  const productCountTriggerRef = useRef<HTMLButtonElement | null>(null);
  const newLaunchesTriggerRef = useRef<HTMLButtonElement | null>(null);

  // Mount ONLY the active layout (desktop table OR mobile cards) to cut DOM & decoded images in half
  const [isDesktopTable, setIsDesktopTable] = useState<boolean>(() =>
    typeof window !== "undefined" ? window.innerWidth >= 1280 : true
  );

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1280px)");
    const update = () => setIsDesktopTable(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  // O(1) brand -> ads lookup index instead of filtering 878+ ads per row
  const adsByBrand = useMemo(() => {
    const map = new Map<string, Ad[]>();
    for (const ad of ads) {
      const list = map.get(ad.brand_id);
      if (list) list.push(ad);
      else map.set(ad.brand_id, [ad]);
    }
    return map;
  }, [ads]);

  // Reference timestamp anchored to the latest ad in the catalog so window filters behave consistently
  const catalogNowMs = useMemo(() => {
    let latest = 0;
    for (const ad of ads) {
      const ts = Date.parse(ad.started_running_at || ad.created_at || "");
      if (Number.isFinite(ts) && ts > latest) latest = ts;
    }
    for (const b of brands) {
      for (const p of b.latest_products || []) {
        const ts = Date.parse(p.created_at || "");
        if (Number.isFinite(ts) && ts > latest) latest = ts;
      }
    }
    return latest > 0 ? latest : Date.UTC(2026, 10, 26);
  }, [ads, brands]);

  // Precomputed per-brand ad velocity & product launch metrics for fast filtering & sorting
  const brandMetrics = useMemo(() => {
    const DAY_MS = 86_400_000;
    const map = new Map<
      string,
      {
        activeAds: number;
        totalAds: number;
        launchedByDays: Record<number, number>;
        newAdsGrowth30d: number;
        productCount: number;
        newLaunchesByDays: Record<number, number>;
      }
    >();

    for (const b of brands) {
      const brandAds = adsByBrand.get(b.id) || [];
      const activeAds = b.active_ads_count ?? brandAds.length;
      const timelineMax = (b.ads_timeline || []).reduce((m, p) => Math.max(m, p.count), 0);
      const historyMax = (b.ads_history || []).reduce((m, c) => Math.max(m, c), 0);
      const totalAds = Math.max(activeAds, brandAds.length, timelineMax, historyMax);

      const scale =
        brandAds.length > 0 && activeAds > brandAds.length
          ? activeAds / brandAds.length
          : 1;

      const countAdsInDays = (days: number, offsetDays = 0) => {
        const end = catalogNowMs - offsetDays * DAY_MS;
        const start = end - days * DAY_MS;
        let raw = 0;
        for (const ad of brandAds) {
          const ts = Date.parse(ad.started_running_at || ad.created_at || "");
          if (Number.isFinite(ts) && ts >= start && ts <= end) raw++;
        }
        return Math.round(raw * scale);
      };

      const launched1 = countAdsInDays(1);
      const launched7 = countAdsInDays(7);
      const launched14 = countAdsInDays(14);
      const launched30 = countAdsInDays(30);
      const launched90 = countAdsInDays(90);
      const prev30 = countAdsInDays(30, 30);

      let newAdsGrowth30d = 0;
      if (prev30 > 0) {
        newAdsGrowth30d = Math.round(((launched30 - prev30) / prev30) * 100);
      } else if (b.ads_timeline && b.ads_timeline.length >= 2) {
        const first = b.ads_timeline[0].count || 1;
        const last = b.ads_timeline[b.ads_timeline.length - 1].count || 0;
        newAdsGrowth30d = Math.round(((last - first) / first) * 100);
      } else if (launched30 > 0) {
        newAdsGrowth30d = 100;
      }

      const productCount = b.products_count ?? (b.top_products?.length || 0);
      const allProds = [...(b.latest_products || []), ...(b.top_products || [])];
      const seenProd = new Set<string>();
      const dedupProds = allProds.filter((p) => {
        const k = p.id || p.handle || p.title;
        if (seenProd.has(k)) return false;
        seenProd.add(k);
        return true;
      });

      const countNewProds = (days: number) => {
        const cutoff = catalogNowMs - days * DAY_MS;
        let datedMatches = 0;
        let hasAnyDate = false;
        for (const p of dedupProds) {
          if (p.created_at) {
            const ts = Date.parse(p.created_at);
            if (Number.isFinite(ts)) {
              hasAnyDate = true;
              if (ts >= cutoff) datedMatches++;
            }
          }
        }
        if (hasAnyDate) return datedMatches;
        return b.latest_products?.length || 0;
      };

      map.set(b.id, {
        activeAds,
        totalAds,
        launchedByDays: {
          1: launched1,
          7: launched7,
          14: launched14,
          30: launched30,
          90: launched90,
        },
        newAdsGrowth30d,
        productCount,
        newLaunchesByDays: {
          30: countNewProds(30),
          60: countNewProds(60),
          90: countNewProds(90),
        },
      });
    }
    return map;
  }, [brands, adsByBrand, catalogNowMs]);

  const runBrandLookup = async (rawQuery: string) => {
    const q = rawQuery.trim();
    if (!q) return;
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/brand-lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: q }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok || !data.brand) {
        throw new Error(data.error || "Could not scrape this brand.");
      }
      onAddBrand(data.brand, Array.isArray(data.ads) ? data.ads : []);
      setLookupInput("");
      setRequestModalOpen(false);
      onOpenShop(data.brand.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Scraping failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleRequestSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    runBrandLookup(lookupInput);
  };

  const togglePopover = (key: BrandPopoverKey) => {
    setOpenPopover((prev) => (prev === key ? null : key));
  };

  // Active filter count across the 10 brand filters
  const activeFilterCount =
    (selectedIndustries.length > 0 ? 1 : 0) +
    (selectedSocials.length > 0 ? 1 : 0) +
    (trafficRange.min !== null || trafficRange.max !== null ? 1 : 0) +
    (trafficGrowth.direction !== null || trafficGrowth.minPct !== null ? 1 : 0) +
    (selectedCountries.length > 0 ? 1 : 0) +
    (activeAdsRange.min !== null || activeAdsRange.max !== null ? 1 : 0) +
    (adsLaunchedRange.min !== null || adsLaunchedRange.max !== null ? 1 : 0) +
    (selectedTechs.length > 0 ? 1 : 0) +
    (productCountRange.min !== null || productCountRange.max !== null ? 1 : 0) +
    (newLaunchesRange.min !== null || newLaunchesRange.max !== null ? 1 : 0);

  const hasAnyBrandFilter =
    activeFilterCount > 0 || searchQuery.trim().length > 0;

  const resetAllBrandFilters = () => {
    const empty = createEmptyFilterSnapshot();
    setSelectedIndustries(empty.industries);
    setSelectedSocials(empty.socials);
    setTrafficRange(empty.traffic);
    setTrafficGrowth(empty.trafficGrowth);
    setSelectedCountries(empty.visitorCountries);
    setActiveAdsRange(empty.activeAds);
    setAdsLaunchedRange(empty.adsLaunched);
    setSelectedTechs(empty.technologies);
    setProductCountRange(empty.productCount);
    setNewLaunchesRange(empty.newLaunches);
    setSearchQuery(empty.searchQuery);
    setActiveViewId("all");
  };

  const applyFilterSnapshot = (snapshot: BrandFilterSnapshot, nextSort: BrandSortKey) => {
    setSelectedIndustries(snapshot.industries);
    setSelectedSocials(snapshot.socials);
    setTrafficRange(snapshot.traffic);
    setTrafficGrowth(snapshot.trafficGrowth);
    setSelectedCountries(snapshot.visitorCountries);
    setActiveAdsRange(snapshot.activeAds);
    setAdsLaunchedRange(snapshot.adsLaunched);
    setSelectedTechs(snapshot.technologies);
    setProductCountRange(snapshot.productCount);
    setNewLaunchesRange(snapshot.newLaunches);
    setSearchQuery(snapshot.searchQuery);
    setSortBy(nextSort);
  };

  const activeSortLabel =
    BRAND_SORT_OPTIONS.find((opt) => opt.value === sortBy)?.label || "Recommended";

  // Active pill labels
  const industryActiveLabel =
    selectedIndustries.length === 1
      ? selectedIndustries[0]
      : selectedIndustries.length > 1
        ? `${selectedIndustries.length} selected`
        : null;

  const socialsActiveLabel =
    selectedSocials.length === 1
      ? selectedSocials[0]
      : selectedSocials.length > 1
        ? `${selectedSocials.length} selected`
        : null;

  const trafficActiveLabel = formatRangeActiveLabel(trafficRange);

  const trafficGrowthActiveLabel =
    trafficGrowth.direction || trafficGrowth.minPct !== null
      ? `${trafficGrowth.direction === "falling" ? "Falling" : "Rising"}${
          trafficGrowth.minPct !== null ? ` ≥${trafficGrowth.minPct}%` : ""
        }`
      : null;

  const countryActiveLabel =
    selectedCountries.length === 1
      ? selectedCountries[0]
      : selectedCountries.length > 1
        ? `${selectedCountries.length} selected`
        : null;

  const activeAdsActiveLabel = formatRangeActiveLabel(activeAdsRange);
  const adsLaunchedActiveLabel = formatRangeActiveLabel(adsLaunchedRange, "", true);

  const techActiveLabel =
    selectedTechs.length === 1
      ? selectedTechs[0]
      : selectedTechs.length > 1
        ? `${selectedTechs.length} selected`
        : null;

  const productCountActiveLabel = formatRangeActiveLabel(productCountRange);
  const newLaunchesActiveLabel = formatRangeActiveLabel(newLaunchesRange, "", true);

  const activeSummaryBadges = useMemo(() => {
    const badges: string[] = [];
    if (industryActiveLabel) badges.push(`Industry: ${industryActiveLabel}`);
    if (socialsActiveLabel) badges.push(`Socials: ${socialsActiveLabel}`);
    if (trafficActiveLabel) badges.push(`Traffic: ${trafficActiveLabel}`);
    if (trafficGrowthActiveLabel) badges.push(`Traffic growth: ${trafficGrowthActiveLabel}`);
    if (countryActiveLabel) badges.push(`Visitor country: ${countryActiveLabel}`);
    if (activeAdsActiveLabel) badges.push(`Active ads: ${activeAdsActiveLabel}`);
    if (adsLaunchedActiveLabel) badges.push(`Ads launched: ${adsLaunchedActiveLabel}`);
    if (techActiveLabel) badges.push(`Technology: ${techActiveLabel}`);
    if (productCountActiveLabel) badges.push(`Product count: ${productCountActiveLabel}`);
    if (newLaunchesActiveLabel) badges.push(`New launches: ${newLaunchesActiveLabel}`);
    if (searchQuery.trim()) badges.push(`Search: "${searchQuery.trim()}"`);
    return badges;
  }, [
    industryActiveLabel,
    socialsActiveLabel,
    trafficActiveLabel,
    trafficGrowthActiveLabel,
    countryActiveLabel,
    activeAdsActiveLabel,
    adsLaunchedActiveLabel,
    techActiveLabel,
    productCountActiveLabel,
    newLaunchesActiveLabel,
    searchQuery,
  ]);

  const handleCreateView = (name: string) => {
    const id = `brand-view-${Date.now()}`;
    const newView: SavedBrandView = {
      id,
      name,
      sortLabel: activeSortLabel,
      summaryBadges: activeSummaryBadges,
      sortBy,
      filters: {
        industries: [...selectedIndustries],
        socials: [...selectedSocials],
        traffic: { ...trafficRange },
        trafficGrowth: { ...trafficGrowth },
        visitorCountries: [...selectedCountries],
        activeAds: { ...activeAdsRange },
        adsLaunched: { ...adsLaunchedRange },
        technologies: [...selectedTechs],
        productCount: { ...productCountRange },
        newLaunches: { ...newLaunchesRange },
        searchQuery,
      },
    };
    setCustomViews((prev) => [...prev, newView]);
    setActiveViewId(id);
  };

  const handleDeleteView = (id: string) => {
    setCustomViews((prev) => prev.filter((v) => v.id !== id));
    if (activeViewId === id) {
      setActiveViewId("all");
    }
  };

  // Filtered country list inside Visitor country popover
  const filteredCountries = useMemo(() => {
    const q = countrySearch.trim().toLowerCase();
    if (!q) return ATRIA_COUNTRIES;
    return ATRIA_COUNTRIES.filter(
      (c) =>
        c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q)
    );
  }, [countrySearch]);

  // Filtered platform lists inside Technology popover
  const filteredEcommercePlatforms = useMemo(() => {
    const q = techSearch.trim().toLowerCase();
    if (!q) return ECOMMERCE_PLATFORMS;
    return ECOMMERCE_PLATFORMS.filter((p) => p.toLowerCase().includes(q));
  }, [techSearch]);

  const filteredSiteBuilders = useMemo(() => {
    const q = techSearch.trim().toLowerCase();
    if (!q) return SITE_BUILDERS_CMS;
    return SITE_BUILDERS_CMS.filter((p) => p.toLowerCase().includes(q));
  }, [techSearch]);

  const filteredBrands = useMemo(() => {
    const q = deferredSearchQuery.trim().toLowerCase();
    const adsWindowDays = parseWindowDays(adsLaunchedRange.window, 30);
    const launchWindowDays = parseWindowDays(newLaunchesRange.window, 30);

    const list = brands.filter((b) => {
      const m = brandMetrics.get(b.id);
      const visits = b.monthly_visits || 0;
      const growth = b.traffic_growth_pct ?? 0;
      const activeAds = m?.activeAds ?? (b.active_ads_count || 0);
      const launchedAds = m?.launchedByDays[adsWindowDays] ?? 0;
      const prodCount = m?.productCount ?? (b.products_count || 0);
      const newLaunches = m?.newLaunchesByDays[launchWindowDays] ?? 0;

      // 1. Industry
      if (selectedIndustries.length > 0 && !brandMatchesIndustry(b, selectedIndustries)) {
        return false;
      }

      // 2. Socials
      if (selectedSocials.length > 0 && !selectedSocials.every((s) => brandHasSocial(b, s))) {
        return false;
      }

      // 3. Traffic
      if (trafficRange.min !== null && visits < trafficRange.min) return false;
      if (trafficRange.max !== null && visits > trafficRange.max) return false;

      // 4. Traffic growth
      if (trafficGrowth.direction === "rising") {
        const minPct = trafficGrowth.minPct ?? 0;
        if (growth <= 0 || growth < minPct) return false;
      } else if (trafficGrowth.direction === "falling") {
        const minPct = trafficGrowth.minPct ?? 0;
        if (growth >= 0 || Math.abs(growth) < minPct) return false;
      } else if (trafficGrowth.minPct !== null) {
        if (Math.abs(growth) < trafficGrowth.minPct) return false;
      }

      // 5. Visitor country
      if (selectedCountries.length > 0) {
        const brandCodes = getBrandVisitorCountryCodes(b);
        if (!selectedCountries.some((c) => brandCodes.has(c))) return false;
      }

      // 6. Active ads
      if (activeAdsRange.min !== null && activeAds < activeAdsRange.min) return false;
      if (activeAdsRange.max !== null && activeAds > activeAdsRange.max) return false;

      // 7. Ads launched
      if (adsLaunchedRange.min !== null && launchedAds < adsLaunchedRange.min) return false;
      if (adsLaunchedRange.max !== null && launchedAds > adsLaunchedRange.max) return false;

      // 8. Technology
      if (selectedTechs.length > 0 && !selectedTechs.some((t) => brandHasTechnology(b, t))) {
        return false;
      }

      // 9. Product count
      if (productCountRange.min !== null && prodCount < productCountRange.min) return false;
      if (productCountRange.max !== null && prodCount > productCountRange.max) return false;

      // 10. New launches
      if (newLaunchesRange.min !== null && newLaunches < newLaunchesRange.min) return false;
      if (newLaunchesRange.max !== null && newLaunches > newLaunchesRange.max) return false;

      // Search query
      if (q) {
        const hay = [
          b.name,
          b.website_url,
          b.myshopify_domain,
          b.category,
          ...(b.sub_categories || []),
          b.shopify_theme,
          ...(b.pixels || []),
          ...(b.shopify_apps || []),
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }

      return true;
    });

    return [...list].sort((a, b) => {
      const ma = brandMetrics.get(a.id);
      const mb = brandMetrics.get(b.id);
      switch (sortBy) {
        case "most_traffic":
          return (b.monthly_visits || 0) - (a.monthly_visits || 0);
        case "most_traffic_growth":
          return (b.traffic_growth_pct ?? -999) - (a.traffic_growth_pct ?? -999);
        case "most_active_ads":
          return (mb?.activeAds || 0) - (ma?.activeAds || 0);
        case "most_new_ads_30d":
          return (mb?.launchedByDays[30] || 0) - (ma?.launchedByDays[30] || 0);
        case "most_new_ads_growth_30d":
          return (mb?.newAdsGrowth30d ?? -999) - (ma?.newAdsGrowth30d ?? -999);
        case "most_ads":
          return (mb?.totalAds || 0) - (ma?.totalAds || 0);
        case "name_az":
          return a.name.localeCompare(b.name);
        case "recommended":
        default: {
          const score = (brand: Brand, met?: typeof ma) => {
            const adsScore = Math.log10((met?.activeAds || 0) + 1) * 42;
            const visitScore = Math.log10((brand.monthly_visits || 0) + 1) * 16;
            const growthScore = Math.max(-15, Math.min(35, brand.traffic_growth_pct ?? 0));
            return adsScore + visitScore + growthScore;
          };
          return score(b, mb) - score(a, ma);
        }
      }
    });
  }, [
    brands,
    brandMetrics,
    selectedIndustries,
    selectedSocials,
    trafficRange,
    trafficGrowth,
    selectedCountries,
    activeAdsRange,
    adsLaunchedRange,
    selectedTechs,
    productCountRange,
    newLaunchesRange,
    deferredSearchQuery,
    sortBy,
  ]);

  const getFlag = (brand: Brand) =>
    brand.country_code === "FR"
      ? "🇫🇷"
      : brand.market === "DK"
        ? "🇩🇰"
        : brand.market === "EU"
          ? "🇪🇺"
          : "🇺🇸";

  return (
    <div className="animate-view-in space-y-2.5">
      {/* =====================================================================
          ROW 1: VIEW TABS + SEARCH BAR + "Can't find a brand?" (SINGLE ROW)
         ===================================================================== */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap items-center gap-1">
          <button
            type="button"
            data-no-glass="true"
            onClick={() => {
              setActiveViewId("all");
              resetAllBrandFilters();
              setSortBy("recommended");
            }}
            className={`inline-flex h-8 min-w-[78px] items-center justify-center rounded-md px-3 text-[13px] font-semibold transition-colors ${
              activeViewId === "all"
                ? "bg-[#0027eb] text-white"
                : "bg-transparent text-[#0F172A] hover:bg-[#F3F5F9]"
            }`}
          >
            All brands
          </button>

          {customViews.map((cv) => {
            const isActive = activeViewId === cv.id;
            return (
              <button
                key={cv.id}
                type="button"
                data-no-glass="true"
                onClick={() => {
                  setActiveViewId(cv.id);
                  applyFilterSnapshot(cv.filters, cv.sortBy);
                }}
                className={`inline-flex h-8 max-w-[180px] items-center justify-center truncate rounded-md px-2.5 text-[13px] font-semibold transition-colors ${
                  isActive
                    ? "bg-[#0027eb] text-white"
                    : "bg-transparent text-[#0F172A] hover:bg-[#F3F5F9]"
                }`}
              >
                <span className="truncate">{cv.name}</span>
              </button>
            );
          })}

          <button
            type="button"
            data-no-glass="true"
            onClick={() => setCreateViewOpen(true)}
            className="ml-1 inline-flex h-8 items-center gap-1 rounded-md border border-[#E2E6EF] bg-white px-2.5 text-[12.5px] font-medium text-[#334155] transition-colors hover:border-[#CBD5E1] hover:bg-[#F7F8FB] hover:text-[#0F172A]"
          >
            <Plus className="h-3.5 w-3.5 text-[#64748B]" />
            New view
          </button>

          <button
            type="button"
            data-no-glass="true"
            onClick={() => setManageViewsOpen(true)}
            aria-label="Manage views"
            title="Manage views"
            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-[#64748B] transition-colors hover:bg-[#F3F5F9] hover:text-[#0F172A]"
          >
            <Settings className="h-4 w-4" />
          </button>
        </div>

        {/* Inline Search Input */}
        <div className="relative h-9 min-w-[220px] max-w-[460px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#64748B]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search brands"
            className="h-9 w-full rounded-lg border border-[#E2E6EF] bg-white pl-9 pr-8 text-[13px] text-[#0F172A] outline-none transition-all placeholder:text-[#94A3B8] focus:border-[#0027eb] focus:ring-2 focus:ring-[#0027eb]/15"
          />
          {searchQuery && (
            <button
              type="button"
              data-no-glass="true"
              onClick={() => setSearchQuery("")}
              aria-label="Clear search"
              className="absolute right-2.5 top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded-full text-[#94A3B8] transition-colors hover:bg-[#F1F5F9] hover:text-[#0F172A]"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <button
          type="button"
          data-no-glass="true"
          onClick={() => {
            setError(null);
            setRequestModalOpen(true);
          }}
          className="ml-auto inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md px-2 text-[12.5px] font-medium text-[#334155] transition-colors hover:bg-[#F3F5F9] hover:text-[#0F172A]"
        >
          <HelpCircle className="h-4 w-4 text-[#64748B]" />
          <span>Can&apos;t find a brand?</span>
        </button>
      </div>

      {/* =====================================================================
          ROW 2: FILTER CONTROL ROW (Filters Hide/Show + Sort + Clear all)
         ===================================================================== */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          {/* Filters Hide / Show button */}
          <button
            type="button"
            data-no-glass="true"
            onClick={() => setFiltersPanelOpen((v) => !v)}
            className={`inline-flex h-8 items-center gap-1.5 rounded-md border px-2.5 text-[12.5px] font-medium transition-colors ${
              filtersPanelOpen || activeFilterCount > 0
                ? "border-[#CBD5E1] bg-white text-[#0F172A]"
                : "border-[#E2E6EF] bg-white text-[#334155] hover:border-[#CBD5E1] hover:bg-[#F7F8FB]"
            }`}
          >
            <ListFilter className="h-3.5 w-3.5 text-[#475569]" />
            <span>Filters</span>
            <span className="text-[#64748B]">
              {filtersPanelOpen ? "Hide" : "Show"}
            </span>
            {activeFilterCount > 0 && (
              <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-[#0027eb] px-1 font-mono-num text-[10px] font-bold text-white">
                {activeFilterCount}
              </span>
            )}
            {filtersPanelOpen ? (
              <ChevronUp className="h-3.5 w-3.5 text-[#64748B]" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5 text-[#64748B]" />
            )}
          </button>

          {/* Sort dropdown button + Atria 8-option popover */}
          <button
            ref={sortTriggerRef}
            type="button"
            data-no-glass="true"
            onClick={() => togglePopover("sort")}
            className={`inline-flex h-8 items-center gap-1.5 rounded-md border px-2.5 text-[12.5px] font-medium transition-colors ${
              openPopover === "sort" || sortBy !== "recommended"
                ? "border-[#CBD5E1] bg-white text-[#0F172A]"
                : "border-[#E2E6EF] bg-white text-[#334155] hover:border-[#CBD5E1] hover:bg-[#F7F8FB]"
            }`}
          >
            <ArrowUpDown className="h-3.5 w-3.5 text-[#64748B]" />
            <span className="text-[#64748B]">Sort:</span>
            <span className="font-semibold text-[#0F172A]">{activeSortLabel}</span>
            <ChevronDown
              className={`h-3.5 w-3.5 text-[#64748B] transition-transform duration-150 ${
                openPopover === "sort" ? "rotate-180" : ""
              }`}
            />
          </button>

          <FlakePopover
            open={openPopover === "sort"}
            onOpenChange={(o) => setOpenPopover(o ? "sort" : null)}
            anchorRef={sortTriggerRef}
            align="left"
            width={255}
            maxHeight={360}
          >
            <div className="p-1.5" role="listbox" aria-label="Sort brands">
              {BRAND_SORT_OPTIONS.map((opt) => {
                const active = sortBy === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    role="option"
                    aria-selected={active}
                    data-no-glass="true"
                    onClick={() => {
                      setSortBy(opt.value);
                      setOpenPopover(null);
                    }}
                    className={`flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-left text-[12.5px] transition-colors ${
                      active
                        ? "bg-[#EFEFF2] font-semibold text-[#0F172A]"
                        : "font-medium text-[#334155] hover:bg-[#F7F8FB] hover:text-[#0F172A]"
                    }`}
                  >
                    <span className="truncate">{opt.label}</span>
                    {active && <Check className="h-3.5 w-3.5 shrink-0 text-[#0F172A]" />}
                  </button>
                );
              })}
            </div>
          </FlakePopover>

          {hasAnyBrandFilter && (
            <button
              type="button"
              data-no-glass="true"
              onClick={resetAllBrandFilters}
              className="inline-flex h-8 items-center gap-1 rounded-md px-2 text-[12px] font-medium text-[#0027eb] transition-colors hover:bg-[#EEF2FF] hover:text-[#001fc2]"
            >
              Clear all
            </button>
          )}
        </div>

        <span className="font-mono-num text-[12px] font-medium text-[#64748B]">
          {filteredBrands.length.toLocaleString("en-US")}{" "}
          {filteredBrands.length === 1 ? "brand" : "brands"}
        </span>
      </div>

      {/* =====================================================================
          ROW 4: EXPANDED 5-GROUP FILTER PANEL (10 EXACT BRAND FILTER PILLS)
         ===================================================================== */}
      {filtersPanelOpen && (
        <div className="space-y-2.5 rounded-xl border border-[#ECEFF5] bg-[#F7F8FB] px-4 py-3">
          {/* Group Row A: Brand (2) · Domain (3) */}
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            {/* Group 1: Brand */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="mr-1 text-[11px] font-semibold text-[#64748B]">
                Brand
              </span>
              <AtriaFilterPill
                label="Industry"
                activeLabel={industryActiveLabel}
                active={selectedIndustries.length > 0}
                open={openPopover === "industry"}
                onToggle={() => togglePopover("industry")}
                triggerRef={industryTriggerRef}
              />
              <AtriaFilterPill
                label="Socials"
                activeLabel={socialsActiveLabel}
                active={selectedSocials.length > 0}
                open={openPopover === "socials"}
                onToggle={() => togglePopover("socials")}
                triggerRef={socialsTriggerRef}
              />
            </div>

            <span className="hidden h-4 w-px bg-[#E2E6EF] md:inline-block" />

            {/* Group 2: Domain */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="mr-1 text-[11px] font-semibold text-[#64748B]">
                Domain
              </span>
              <AtriaFilterPill
                label="Traffic"
                activeLabel={trafficActiveLabel}
                active={trafficRange.min !== null || trafficRange.max !== null}
                open={openPopover === "traffic"}
                onToggle={() => togglePopover("traffic")}
                triggerRef={trafficTriggerRef}
              />
              <AtriaFilterPill
                label="Traffic growth"
                activeLabel={trafficGrowthActiveLabel}
                active={
                  trafficGrowth.direction !== null ||
                  trafficGrowth.minPct !== null
                }
                open={openPopover === "traffic_growth"}
                onToggle={() => togglePopover("traffic_growth")}
                triggerRef={trafficGrowthTriggerRef}
              />
              <AtriaFilterPill
                label="Visitor country"
                activeLabel={countryActiveLabel}
                active={selectedCountries.length > 0}
                open={openPopover === "visitor_country"}
                onToggle={() => togglePopover("visitor_country")}
                triggerRef={countryTriggerRef}
              />
            </div>
          </div>

          {/* Group Row B: Ads (2) · Shop (1) · Products (2) */}
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            {/* Group 3: Ads */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="mr-1 text-[11px] font-semibold text-[#64748B]">
                Ads
              </span>
              <AtriaFilterPill
                label="Active ads"
                activeLabel={activeAdsActiveLabel}
                active={activeAdsRange.min !== null || activeAdsRange.max !== null}
                open={openPopover === "active_ads"}
                onToggle={() => togglePopover("active_ads")}
                triggerRef={activeAdsTriggerRef}
              />
              <AtriaFilterPill
                label="Ads launched"
                activeLabel={adsLaunchedActiveLabel}
                active={
                  adsLaunchedRange.min !== null || adsLaunchedRange.max !== null
                }
                open={openPopover === "ads_launched"}
                onToggle={() => togglePopover("ads_launched")}
                triggerRef={adsLaunchedTriggerRef}
              />
            </div>

            <span className="hidden h-4 w-px bg-[#E2E6EF] md:inline-block" />

            {/* Group 4: Shop */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="mr-1 text-[11px] font-semibold text-[#64748B]">
                Shop
              </span>
              <AtriaFilterPill
                label="Technology"
                activeLabel={techActiveLabel}
                active={selectedTechs.length > 0}
                open={openPopover === "technology"}
                onToggle={() => togglePopover("technology")}
                triggerRef={techTriggerRef}
              />
            </div>

            <span className="hidden h-4 w-px bg-[#E2E6EF] md:inline-block" />

            {/* Group 5: Products */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="mr-1 text-[11px] font-semibold text-[#64748B]">
                Products
              </span>
              <AtriaFilterPill
                label="Product count"
                activeLabel={productCountActiveLabel}
                active={
                  productCountRange.min !== null ||
                  productCountRange.max !== null
                }
                open={openPopover === "product_count"}
                onToggle={() => togglePopover("product_count")}
                triggerRef={productCountTriggerRef}
              />
              <AtriaFilterPill
                label="New launches"
                activeLabel={newLaunchesActiveLabel}
                active={
                  newLaunchesRange.min !== null || newLaunchesRange.max !== null
                }
                open={openPopover === "new_launches"}
                onToggle={() => togglePopover("new_launches")}
                triggerRef={newLaunchesTriggerRef}
              />
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          ALL 10 BRAND FILTER POPOVERS
         ===================================================================== */}

      {/* 1. Industry Popover */}
      <AtriaIndustryPopover
        open={openPopover === "industry"}
        onOpenChange={(o) => setOpenPopover(o ? "industry" : null)}
        anchorRef={industryTriggerRef}
        selected={selectedIndustries}
        onApply={setSelectedIndustries}
      />

      {/* 2. Socials Popover */}
      <FlakePopover
        open={openPopover === "socials"}
        onOpenChange={(o) => setOpenPopover(o ? "socials" : null)}
        anchorRef={socialsTriggerRef}
        align="left"
        width={340}
        maxHeight={360}
      >
        <AtriaPopoverHeader
          title="Socials"
          hasValue={selectedSocials.length > 0}
          onClear={() => setSelectedSocials([])}
        />
        <div className="flex flex-wrap gap-2 p-4">
          {SOCIAL_PLATFORMS.map((platform) => {
            const active = selectedSocials.includes(platform);
            return (
              <button
                key={platform}
                type="button"
                data-no-glass="true"
                onClick={() =>
                  setSelectedSocials((prev) =>
                    prev.includes(platform)
                      ? prev.filter((x) => x !== platform)
                      : [...prev, platform]
                  )
                }
                className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[12px] font-medium transition-colors ${
                  active
                    ? "border-[#0027eb] bg-[#EEF2FF] text-[#0027eb]"
                    : "border-[#E2E6EF] bg-white text-[#334155] hover:border-[#CBD5E1] hover:bg-[#F7F8FB] hover:text-[#0F172A]"
                }`}
              >
                <SocialChipIcon platform={platform} />
                <span>{platform}</span>
              </button>
            );
          })}
        </div>
        <div className="border-t border-[#F1F4F9] bg-[#FAFBFD] px-4 py-2.5">
          <p className="text-[11px] leading-snug text-[#64748B]">
            Accounts the brand&apos;s sites link to, plus its official
            advertisers&apos; own. Refreshed hourly.
          </p>
        </div>
      </FlakePopover>

      {/* 3. Traffic Popover */}
      <AtriaRangeFilterPopover
        open={openPopover === "traffic"}
        onOpenChange={(o) => setOpenPopover(o ? "traffic" : null)}
        anchorRef={trafficTriggerRef}
        title="Traffic"
        subtitle="Match brands by last month's visits to their busiest domain"
        minBound={0}
        maxBound={5_000_000}
        step={50_000}
        ticks={["0", "1M", "2M", "3M", "4M", "No limit"]}
        unitSuffix="visits"
        value={trafficRange}
        onChange={setTrafficRange}
        quickRanges={[
          { label: "≥100K visits", min: 100_000, max: null },
          { label: "≥1M visits", min: 1_000_000, max: null },
          { label: "≥5M visits", min: 5_000_000, max: null },
        ]}
      />

      {/* 4. Traffic growth Popover */}
      <AtriaGrowthFilterPopover
        open={openPopover === "traffic_growth"}
        onOpenChange={(o) => setOpenPopover(o ? "traffic_growth" : null)}
        anchorRef={trafficGrowthTriggerRef}
        title="Traffic growth"
        subtitle="Match brands by how their busiest domain's traffic moved last month"
        value={trafficGrowth}
        onChange={setTrafficGrowth}
      />

      {/* 5. Visitor country Popover */}
      <FlakePopover
        open={openPopover === "visitor_country"}
        onOpenChange={(o) => setOpenPopover(o ? "visitor_country" : null)}
        anchorRef={countryTriggerRef}
        align="left"
        width={360}
        maxHeight={470}
      >
        <AtriaPopoverHeader
          title="Visitor country"
          subtitle="Match brands by where their website visitors come from"
          hasValue={selectedCountries.length > 0}
          onClear={() => setSelectedCountries([])}
        />
        <div className="border-b border-[#F1F4F9] p-2.5">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#94A3B8]" />
            <input
              type="text"
              value={countrySearch}
              onChange={(e) => setCountrySearch(e.target.value)}
              placeholder="Search for countries"
              className="w-full rounded-lg border border-[#E2E6EF] bg-[#FAFBFD] py-1.5 pl-8 pr-2.5 text-[12px] text-[#0F172A] outline-none placeholder:text-[#94A3B8] focus:border-[#0027eb] focus:bg-white"
            />
          </div>
        </div>
        <div className="workspace-scroll max-h-[235px] overflow-y-auto p-2.5">
          <div className="flex flex-wrap gap-1.5">
            {filteredCountries.map((country) => {
              const active = selectedCountries.includes(country.code);
              return (
                <button
                  key={country.code}
                  type="button"
                  data-no-glass="true"
                  onClick={() =>
                    setSelectedCountries((prev) =>
                      prev.includes(country.code)
                        ? prev.filter((x) => x !== country.code)
                        : [...prev, country.code]
                    )
                  }
                  className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-[11.5px] font-medium transition-colors ${
                    active
                      ? "border-[#0027eb] bg-[#EEF2FF] text-[#0027eb]"
                      : "border-[#E2E6EF] bg-white text-[#334155] hover:border-[#CBD5E1] hover:bg-[#F7F8FB]"
                  }`}
                >
                  <span>{country.flag}</span>
                  <span>{country.name}</span>
                </button>
              );
            })}
            {filteredCountries.length === 0 && (
              <p className="w-full py-5 text-center text-xs text-[#94A3B8]">
                No countries found
              </p>
            )}
          </div>
        </div>
        <div className="border-t border-[#F1F4F9] bg-[#FAFBFD] px-3 py-2.5">
          <p className="mb-1.5 text-[11px] font-medium text-[#64748B]">
            Quick select
          </p>
          <div className="flex flex-wrap gap-1.5">
            {ATRIA_COUNTRY_QUICK_GROUPS.map((grp) => {
              const groupCodes = ATRIA_COUNTRIES.filter((c) =>
                c.regions.includes(grp.id)
              ).map((c) => c.code);
              const allIn = groupCodes.every((code) =>
                selectedCountries.includes(code)
              );
              return (
                <button
                  key={grp.id}
                  type="button"
                  data-no-glass="true"
                  onClick={() => {
                    if (allIn) {
                      setSelectedCountries((prev) =>
                        prev.filter((c) => !groupCodes.includes(c))
                      );
                    } else {
                      setSelectedCountries((prev) =>
                        Array.from(new Set([...prev, ...groupCodes]))
                      );
                    }
                  }}
                  className={`rounded-md border px-2 py-1 text-[11px] font-medium transition-colors ${
                    allIn
                      ? "border-[#0027eb] bg-[#EEF2FF] text-[#0027eb]"
                      : "border-[#E2E6EF] bg-white text-[#334155] hover:border-[#CBD5E1] hover:bg-[#F7F8FB]"
                  }`}
                >
                  {grp.label} ({grp.count})
                </button>
              );
            })}
          </div>
        </div>
      </FlakePopover>

      {/* 6. Active ads Popover */}
      <AtriaRangeFilterPopover
        open={openPopover === "active_ads"}
        onOpenChange={(o) => setOpenPopover(o ? "active_ads" : null)}
        anchorRef={activeAdsTriggerRef}
        title="Active ads"
        subtitle="Match brands by their current active ad count"
        minBound={0}
        maxBound={2000}
        step={10}
        ticks={["0", "500", "1,000", "1,500", "No limit"]}
        unitSuffix="ads"
        value={activeAdsRange}
        onChange={setActiveAdsRange}
        quickRanges={[
          { label: "≥100 ads", min: 100, max: null },
          { label: "≥500 ads", min: 500, max: null },
          { label: "≥1,000 ads", min: 1000, max: null },
        ]}
      />

      {/* 7. Ads launched Popover */}
      <AtriaRangeFilterPopover
        open={openPopover === "ads_launched"}
        onOpenChange={(o) => setOpenPopover(o ? "ads_launched" : null)}
        anchorRef={adsLaunchedTriggerRef}
        title="Ads launched"
        subtitle="Match brands by how many new ads they launched"
        minBound={0}
        maxBound={1000}
        step={5}
        ticks={["0", "250", "500", "750", "No limit"]}
        unitSuffix="ads"
        value={adsLaunchedRange}
        onChange={setAdsLaunchedRange}
        windowLabel="Time window"
        windowOptions={["1 day", "7 days", "14 days", "30 days", "90 days"]}
        quickRanges={[
          { label: "≥50 ads", min: 50, max: null },
          { label: "≥100 ads", min: 100, max: null },
          { label: "≥500 ads", min: 500, max: null },
        ]}
      />

      {/* 8. Technology Popover */}
      <FlakePopover
        open={openPopover === "technology"}
        onOpenChange={(o) => setOpenPopover(o ? "technology" : null)}
        anchorRef={techTriggerRef}
        align="left"
        width={370}
        maxHeight={450}
      >
        <AtriaPopoverHeader
          title="Technology"
          subtitle="Match brands by ecommerce platform, site builder, or CMS"
          hasValue={selectedTechs.length > 0}
          onClear={() => setSelectedTechs([])}
        />
        <div className="border-b border-[#F1F4F9] p-2.5">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#94A3B8]" />
            <input
              type="text"
              value={techSearch}
              onChange={(e) => setTechSearch(e.target.value)}
              placeholder="Search for platforms"
              className="w-full rounded-lg border border-[#E2E6EF] bg-[#FAFBFD] py-1.5 pl-8 pr-2.5 text-[12px] text-[#0F172A] outline-none placeholder:text-[#94A3B8] focus:border-[#0027eb] focus:bg-white"
            />
          </div>
        </div>
        <div className="workspace-scroll max-h-[300px] space-y-3.5 overflow-y-auto p-3.5">
          {filteredEcommercePlatforms.length > 0 && (
            <div>
              <p className="mb-2 text-[11px] font-semibold text-[#64748B]">
                Ecommerce platforms
              </p>
              <div className="flex flex-wrap gap-1.5">
                {filteredEcommercePlatforms.map((platform) => {
                  const active = selectedTechs.includes(platform);
                  return (
                    <button
                      key={platform}
                      type="button"
                      data-no-glass="true"
                      onClick={() =>
                        setSelectedTechs((prev) =>
                          prev.includes(platform)
                            ? prev.filter((x) => x !== platform)
                            : [...prev, platform]
                        )
                      }
                      className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-[12px] font-medium transition-colors ${
                        active
                          ? "border-[#0027eb] bg-[#EEF2FF] text-[#0027eb]"
                          : "border-[#E2E6EF] bg-white text-[#334155] hover:border-[#CBD5E1] hover:bg-[#F7F8FB]"
                      }`}
                    >
                      {platform === "Shopify" && (
                        <ShopifyBagIcon className="h-3.5 w-3.5 shrink-0" />
                      )}
                      <span>{platform}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {filteredSiteBuilders.length > 0 && (
            <div>
              <p className="mb-2 text-[11px] font-semibold text-[#64748B]">
                Site builders and CMS
              </p>
              <div className="flex flex-wrap gap-1.5">
                {filteredSiteBuilders.map((platform) => {
                  const active = selectedTechs.includes(platform);
                  return (
                    <button
                      key={platform}
                      type="button"
                      data-no-glass="true"
                      onClick={() =>
                        setSelectedTechs((prev) =>
                          prev.includes(platform)
                            ? prev.filter((x) => x !== platform)
                            : [...prev, platform]
                        )
                      }
                      className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-[12px] font-medium transition-colors ${
                        active
                          ? "border-[#0027eb] bg-[#EEF2FF] text-[#0027eb]"
                          : "border-[#E2E6EF] bg-white text-[#334155] hover:border-[#CBD5E1] hover:bg-[#F7F8FB]"
                      }`}
                    >
                      <span>{platform}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {filteredEcommercePlatforms.length === 0 &&
            filteredSiteBuilders.length === 0 && (
              <p className="py-5 text-center text-xs text-[#94A3B8]">
                No platforms found
              </p>
            )}
        </div>
      </FlakePopover>

      {/* 9. Product count Popover */}
      <AtriaRangeFilterPopover
        open={openPopover === "product_count"}
        onOpenChange={(o) => setOpenPopover(o ? "product_count" : null)}
        anchorRef={productCountTriggerRef}
        title="Product count"
        subtitle="Match brands by total number of products in their catalog"
        minBound={0}
        maxBound={2000}
        step={10}
        ticks={["0", "500", "1,000", "1,500", "No limit"]}
        unitSuffix="products"
        value={productCountRange}
        onChange={setProductCountRange}
        quickRanges={[
          { label: "≥1 products", min: 1, max: null },
          { label: "≥100 products", min: 100, max: null },
          { label: "≥1,000 products", min: 1000, max: null },
        ]}
      />

      {/* 10. New launches Popover */}
      <AtriaRangeFilterPopover
        open={openPopover === "new_launches"}
        onOpenChange={(o) => setOpenPopover(o ? "new_launches" : null)}
        anchorRef={newLaunchesTriggerRef}
        title="New launches"
        subtitle="Match brands by how many new products they recently launched"
        minBound={0}
        maxBound={100}
        step={1}
        ticks={["0", "25", "50", "75", "No limit"]}
        unitSuffix="products"
        value={newLaunchesRange}
        onChange={setNewLaunchesRange}
        windowLabel="Time window"
        windowOptions={["30 days", "60 days", "90 days"]}
        quickRanges={[
          { label: "≥1 products", min: 1, max: null },
          { label: "≥5 products", min: 5, max: null },
          { label: "≥20 products", min: 20, max: null },
        ]}
      />

      {/* =====================================================================
          CREATE VIEW & MANAGE VIEWS MODALS
         ===================================================================== */}
      <AtriaCreateViewModal
        open={createViewOpen}
        onClose={() => setCreateViewOpen(false)}
        sortLabel={activeSortLabel}
        activeSummaryBadges={activeSummaryBadges}
        onCreate={handleCreateView}
      />

      <AtriaManageViewsModal
        open={manageViewsOpen}
        onClose={() => setManageViewsOpen(false)}
        systemViews={["All"]}
        customViews={customViews}
        onDeleteView={handleDeleteView}
        onOpenCreateView={() => setCreateViewOpen(true)}
      />

      {/* =====================================================================
          ATRIA "REQUEST A BRAND" MODAL (WIRED TO LIVE runBrandLookup)
         ===================================================================== */}
      {requestModalOpen &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            className="flake-modal-backdrop z-[130] flex items-center justify-center bg-[#050811]/55 p-4 backdrop-blur-[2px]"
            onClick={() => {
              if (!loading) setRequestModalOpen(false);
            }}
          >
            <div
              className="animate-sheet-up max-h-[88dvh] w-full max-w-[490px] overflow-y-auto rounded-2xl border border-[#E6E9F0] bg-white p-5 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Title + Close */}
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-display text-[17px] font-bold text-[#0F172A]">
                    Request a brand
                  </h2>
                  <p className="mt-1 text-[12.5px] leading-relaxed text-[#64748B]">
                    We add a brand through one of its advertisers — a page that
                    runs its ads. Paste the advertiser&apos;s URL or store
                    domain, and we&apos;ll scrape its live Meta Ads and tech
                    stack.
                  </p>
                </div>
                <button
                  type="button"
                  data-no-glass="true"
                  disabled={loading}
                  onClick={() => setRequestModalOpen(false)}
                  aria-label="Close"
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[#64748B] transition-colors hover:bg-[#F3F5F9] hover:text-[#0F172A] disabled:opacity-40"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Platform Badge Row */}
              <div className="mt-3.5 inline-flex items-center gap-2 rounded-lg border border-[#E6E9F0] bg-[#F7F8FB] px-2.5 py-1.5 text-[12px] font-medium text-[#334155]">
                <MetaInfinityIcon className="h-4 w-4 shrink-0" />
                <span>Meta and TikTok advertisers</span>
              </div>

              <form onSubmit={handleRequestSubmit} className="mt-3.5 space-y-3.5">
                {/* Inner Card Container */}
                <div className="space-y-2.5 rounded-xl border border-[#E6E9F0] bg-[#FAFBFD] p-3.5">
                  <label
                    htmlFor="brand-magic-input"
                    className="block text-[12px] font-semibold text-[#0F172A]"
                  >
                    Ad Library page URL or brand website
                  </label>

                  <div className="flex items-center gap-2 rounded-lg border border-[#0027eb]/45 bg-white px-3 py-2 transition-all focus-within:border-[#0027eb] focus-within:ring-2 focus-within:ring-[#0027eb]/15">
                    <Globe className="h-4 w-4 shrink-0 text-[#64748B]" />
                    <input
                      id="brand-magic-input"
                      type="text"
                      autoFocus
                      value={lookupInput}
                      onChange={(e) => setLookupInput(e.target.value)}
                      placeholder="Paste a brand domain or Meta Ad Library URL (e.g. bareen.com)"
                      className="w-full bg-transparent text-[13px] text-[#0F172A] outline-none placeholder:text-[#94A3B8]"
                    />
                  </div>

                  {/* Helper row: Quick suggestions + Open Meta Ad Library */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5 text-[11px]">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-[#94A3B8]">Try:</span>
                      {QUICK_SUGGESTIONS.map((domain) => (
                        <button
                          key={domain}
                          type="button"
                          data-no-glass="true"
                          disabled={loading}
                          onClick={() => runBrandLookup(domain)}
                          className="rounded-md border border-[#E2E6EF] bg-white px-2 py-0.5 font-mono-num text-[11px] font-medium text-[#475569] transition-colors hover:border-[#0027eb]/40 hover:bg-[#EEF2FF] hover:text-[#0027eb] disabled:opacity-40"
                        >
                          {domain}
                        </button>
                      ))}
                    </div>

                    <a
                      href="https://www.facebook.com/ads/library/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 font-medium text-[#0027eb] hover:text-[#001fc2]"
                    >
                      <span>Open Meta Ad Library</span>
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>

                  {loading && (
                    <div className="space-y-2.5 rounded-xl border border-[#ECEFF5] bg-white p-3">
                      <div className="flex items-center gap-2.5">
                        <div className="skeleton-shimmer h-9 w-9 shrink-0 rounded-lg" />
                        <div className="flex-1 space-y-1.5">
                          <div className="skeleton-shimmer h-3 w-28 rounded" />
                          <div className="skeleton-shimmer h-2.5 w-44 rounded" />
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <div className="skeleton-shimmer h-9 rounded-lg" />
                        <div className="skeleton-shimmer h-9 rounded-lg" />
                        <div className="skeleton-shimmer h-9 rounded-lg" />
                      </div>
                    </div>
                  )}

                  {error && (
                    <p className="rounded-lg border border-[#FECACA] bg-[#FEF2F2] px-3 py-2 text-xs font-medium text-[#DC2626]">
                      {error}
                    </p>
                  )}
                </div>

                {/* Footer Note */}
                <div className="flex items-center gap-2 text-[12px] text-[#475569]">
                  <Heart className="h-3.5 w-3.5 shrink-0 text-[#0027eb]" />
                  <span>
                    You&apos;ll follow this brand — that&apos;s what keeps its
                    ads up to date.
                  </span>
                </div>

                {/* Footer Actions */}
                <div className="flex items-center justify-end gap-2 border-t border-[#F1F4F9] pt-3">
                  <button
                    type="button"
                    data-no-glass="true"
                    disabled={loading}
                    onClick={() => setRequestModalOpen(false)}
                    className="rounded-lg border border-[#E2E6EF] bg-white px-4 py-1.5 text-[12.5px] font-medium text-[#334155] transition-colors hover:bg-[#F7F8FB] hover:text-[#0F172A] disabled:opacity-40"
                  >
                    Cancel
                  </button>
                  <button
                    id="brand-magic-submit"
                    type="submit"
                    disabled={loading || !lookupInput.trim()}
                    className="adtrack-btn-primary inline-flex items-center justify-center gap-1.5 rounded-lg px-4 py-1.5 text-[12.5px] font-semibold text-white transition-colors disabled:opacity-45"
                  >
                    {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                    {loading ? "Scraping..." : "Request & follow"}
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}

      {/* =====================================================================
          MOBILE / IPHONE NATIVE APP CARDS (< xl) — only mounted below xl
         ===================================================================== */}
      {!isDesktopTable && (
      <div className="space-y-3 xl:hidden">
        {filteredBrands.map((brand) => {
          const brandAds = adsByBrand.get(brand.id) || [];
          const domain = brand.website_url
            .replace(/^https?:\/\//, "")
            .replace(/^www\./, "")
            .replace(/\/.*$/, "");
          const products = (brand.top_products || []).filter((p) =>
            hasPositivePrice(p.price)
          );
          const allTech = [...(brand.pixels || []), ...(brand.shopify_apps || [])];
          const growthPositive = (brand.traffic_growth_pct ?? 0) >= 0;
          const marketFlag = getFlag(brand);

          return (
            <div
              key={brand.id}
              className="cv-shop-row relative rounded-2xl border border-[#E6E9F0] bg-white p-3.5 shadow-[0_1px_3px_rgba(15,23,42,0.04)] active:scale-[0.995] transition-transform"
            >
              {/* Row 1: Thumbnail + Brand Title */}
              <div className="flex items-center justify-between gap-2.5">
                <button
                  type="button"
                  onClick={() => onOpenShop(brand.id)}
                  className="flex min-w-0 flex-1 items-center gap-3 text-left"
                >
                  <div className="relative h-[52px] w-[84px] shrink-0 overflow-hidden rounded-xl border border-[#E6E9F0] bg-[#F3F5F9]">
                    {getHomepageScreenshotUrl(brand.website_url, brand.storefront_image_url) || brand.storefront_image_url ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={
                          getHomepageScreenshotUrl(brand.website_url, brand.storefront_image_url) ||
                          brand.storefront_image_url ||
                          ""
                        }
                        alt={brand.name}
                        loading="lazy"
                        decoding="async"
                        onError={(e) => {
                          const img = e.currentTarget;
                          if (
                            brand.storefront_image_url &&
                            img.src !== brand.storefront_image_url
                          ) {
                            img.src = brand.storefront_image_url;
                          }
                        }}
                        className="h-full w-full object-cover object-top"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-[#F7F8FB] font-display text-xs font-bold text-[#334155]">
                        {brand.avatar_initials}
                      </div>
                    )}
                    <span className="absolute bottom-0.5 right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-white text-[10px] shadow-xs ring-1 ring-black/5">
                      {marketFlag}
                    </span>
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="truncate font-display text-[15px] font-bold text-[#0F172A]">
                        {brand.name}
                      </span>
                      {brand.is_shopify && (
                        <ShopifyBagIcon className="h-3.5 w-3.5 shrink-0" />
                      )}
                    </div>
                    <p className="truncate font-mono-num text-[11.5px] text-[#64748B]">
                      {domain} · {brand.category}
                    </p>
                  </div>
                </button>
              </div>

              {/* Row 2: Clean 2-Column KPI Pills */}
              <button
                type="button"
                onClick={() => onOpenShop(brand.id)}
                className="mt-3 grid w-full grid-cols-2 gap-2 text-left"
              >
                <div className="flex items-center justify-between gap-1.5 rounded-xl bg-[#F7F8FB] px-3 py-2">
                  <div className="min-w-0">
                    <p className="text-[10px] font-medium text-[#64748B]">Visits/md</p>
                    <div className="mt-0.5 flex items-center gap-1">
                      <span className="font-display text-[14px] font-bold text-[#0F172A]">
                        {formatReach(brand.monthly_visits)}
                      </span>
                      {typeof brand.traffic_growth_pct === "number" && (
                        <span
                          className={`font-mono-num text-[10px] font-bold ${
                            growthPositive ? "text-[#15803D]" : "text-[#E11D48]"
                          }`}
                        >
                          {growthPositive ? "+" : ""}
                          {brand.traffic_growth_pct}%
                        </span>
                      )}
                    </div>
                  </div>
                  <MiniSparkline data={brand.traffic_history} positive={growthPositive} />
                </div>

                <div className="flex items-center justify-between rounded-xl bg-[#F7F8FB] px-3 py-2">
                  <div>
                    <p className="text-[10px] font-medium text-[#64748B]">Live Meta Ads</p>
                    <div className="mt-0.5 flex items-center gap-1.5">
                      <MetaInfinityIcon className="h-3.5 w-3.5 shrink-0" />
                      <span className="font-display text-[14px] font-bold text-[#0F172A]">
                        {(brand.active_ads_count ?? brandAds.length).toLocaleString("en-US")}
                      </span>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-[#94A3B8]" />
                </div>
              </button>

              {/* Row 3: Mini Products + Tech Icons Footer */}
              {(products.length > 0 || allTech.length > 0) && (
                <button
                  type="button"
                  onClick={() => onOpenShop(brand.id)}
                  className="mt-2.5 flex w-full items-center justify-between gap-2 border-t border-[#F1F4F9] pt-2.5 text-left"
                >
                  <div className="flex items-center gap-1.5">
                    {products.slice(0, 3).map((prod, i) => (
                      <div
                        key={`${prod.title}-${i}`}
                        className="h-8 w-8 overflow-hidden rounded-lg border border-[#E6E9F0] bg-[#F7F8FB]"
                      >
                        {prod.image_url ? (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img
                            src={prod.image_url}
                            alt=""
                            loading="lazy"
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-[#94A3B8]">
                            <Package className="h-3 w-3" />
                          </div>
                        )}
                      </div>
                    ))}
                    {brand.products_count ? (
                      <span className="font-mono-num text-[10.5px] font-semibold text-[#64748B]">
                        {brand.products_count} prod.
                      </span>
                    ) : products.length === 0 ? (
                      <span className="text-[11px] font-medium text-[#94A3B8]">
                        Pixels &amp; Tech
                      </span>
                    ) : null}
                  </div>

                  <div className="flex items-center gap-1">
                    {allTech.slice(0, 3).map((tool) => (
                      <span
                        key={tool}
                        className="inline-flex h-6 w-6 items-center justify-center rounded-md border border-[#E6E9F0] bg-white"
                      >
                        <TechBrandIcon name={tool} className="h-3.5 w-3.5" />
                      </span>
                    ))}
                    {allTech.length > 3 && (
                      <span className="rounded-md bg-[#F1F5F9] px-1.5 py-0.5 font-mono-num text-[10px] font-semibold text-[#475569]">
                        +{allTech.length - 3}
                      </span>
                    )}
                  </div>
                </button>
              )}
            </div>
          );
        })}

        {filteredBrands.length === 0 && (
          <div className="px-6 py-12 text-center">
            <p className="font-display text-sm font-semibold text-[#0F172A]">
              No brands match your filters
            </p>
            <p className="mt-1 text-xs text-[#64748B]">
              Clear your filters or click &quot;Can&apos;t find a brand?&quot; to request a new brand.
            </p>
            {hasAnyBrandFilter && (
              <button
                type="button"
                data-no-glass="true"
                onClick={resetAllBrandFilters}
                className="mt-3.5 inline-flex items-center gap-1.5 rounded-xl border border-[#E2E6EF] bg-white px-3.5 py-2 text-xs font-semibold text-[#0F172A] hover:bg-[#F8FAFC]"
              >
                Clear all filters
              </button>
            )}
          </div>
        )}
      </div>
      )}

      {/* =====================================================================
          DESKTOP TRENDTRACK 6-COLUMN TABLE (xl+) — only mounted at xl+
         ===================================================================== */}
      {isDesktopTable && (
      <div className="adtrack-card hidden overflow-visible rounded-2xl xl:block">
        <div className="grid grid-cols-[2.35fr_1.45fr_0.9fr_1.15fr_1.15fr_1.45fr] items-center gap-4 border-b border-[#EFF2F6] bg-[#FAFBFD] px-5 py-3 text-[12px] font-semibold text-[#0F172A]">
          <span>Brand</span>
          <span>Best-Selling Products</span>
          <span className="text-center">Category</span>
          <span>Monthly Visits</span>
          <span>Meta Ads</span>
          <span>Ads</span>
        </div>

        <div className="divide-y divide-[#F1F4F9]">
          {filteredBrands.map((brand) => {
            const brandAds = adsByBrand.get(brand.id) || [];
            const domain = brand.website_url
              .replace(/^https?:\/\//, "")
              .replace(/^www\./, "")
              .replace(/\/.*$/, "");
            const products = (brand.top_products || []).filter((p) =>
              hasPositivePrice(p.price)
            );
            const growthPositive = (brand.traffic_growth_pct ?? 0) >= 0;
            const marketFlag = getFlag(brand);
            const homepageShot = getHomepageScreenshotUrl(
              brand.website_url,
              brand.storefront_image_url
            );
            const founded = formatFoundedAge(brand.founded_date);

            const visitSeries =
              brand.traffic_history && brand.traffic_history.length >= 2
                ? brand.traffic_history.slice(-8).map((p) => p.visits)
                : [
                    Math.round((brand.monthly_visits || 10000) * 0.82),
                    Math.round((brand.monthly_visits || 10000) * 0.91),
                    Math.round((brand.monthly_visits || 10000) * 0.87),
                    Math.round((brand.monthly_visits || 10000) * 0.96),
                    brand.monthly_visits || 10000,
                  ];

            const adsSeries =
              brand.ads_timeline && brand.ads_timeline.length >= 2
                ? brand.ads_timeline.slice(-8).map((p: AdsTimelinePoint) => p.count)
                : [
                    Math.max(1, Math.round((brand.active_ads_count || 10) * 0.55)),
                    Math.max(1, Math.round((brand.active_ads_count || 10) * 0.7)),
                    Math.max(1, Math.round((brand.active_ads_count || 10) * 0.62)),
                    Math.max(1, Math.round((brand.active_ads_count || 10) * 0.85)),
                    brand.active_ads_count || brandAds.length || 1,
                  ];

            const visitorFlags =
              brand.visitor_countries && brand.visitor_countries.length > 0
                ? brand.visitor_countries.slice(0, 3).map((c) => c.flag)
                : [marketFlag];

            const targetedFlags =
              brand.targeted_countries && brand.targeted_countries.length > 0
                ? brand.targeted_countries.slice(0, 3).map((c) => c.flag)
                : [marketFlag];

            return (
              <div
                key={brand.id}
                role="button"
                tabIndex={0}
                onClick={() => onOpenShop(brand.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onOpenShop(brand.id);
                  }
                }}
                className="cv-shop-row group relative grid cursor-pointer grid-cols-[2.35fr_1.45fr_0.9fr_1.15fr_1.15fr_1.45fr] items-center gap-4 px-5 py-3.5 transition-colors hover:bg-[#F5F7FA]"
              >
                {/* 1. SHOP INFOS (Wide Homepage Screenshot + Name + Domain + Founded Date) */}
                <div className="flex min-w-0 items-center gap-3.5">
                  <div className="relative h-[68px] w-[108px] shrink-0 overflow-hidden rounded-xl border border-[#E2E6EF] bg-[#F3F5F9] text-left shadow-2xs">
                    {homepageShot || brand.storefront_image_url ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={homepageShot || brand.storefront_image_url || ""}
                        alt={`${brand.name} homepage`}
                        loading="lazy"
                        decoding="async"
                        onError={(e) => {
                          const img = e.currentTarget;
                          if (
                            brand.storefront_image_url &&
                            img.src !== brand.storefront_image_url
                          ) {
                            img.src = brand.storefront_image_url;
                          }
                        }}
                        className="h-full w-full object-cover object-top transition-transform duration-300 group-hover:scale-[1.03]"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-[#F7F8FB] font-display text-xs font-bold text-[#334155]">
                        {brand.avatar_initials}
                      </div>
                    )}
                    <span
                      title={brand.market}
                      className="absolute bottom-1 right-1 flex h-4.5 w-4.5 items-center justify-center rounded-full bg-white text-[11px] shadow-xs ring-1 ring-black/10"
                    >
                      {marketFlag}
                    </span>
                  </div>

                  <div className="min-w-0 flex-1 space-y-1">
                    {/* Line 1: Brand Name */}
                    <div className="flex items-center gap-1.5">
                      <span className="truncate font-display text-[14.5px] font-bold text-[#0F172A] transition-colors group-hover:text-[#0027eb]">
                        {brand.name}
                      </span>
                    </div>

                    {/* Line 2: Globe + Domain + Shopify Icon */}
                    <div className="flex max-w-full items-center gap-1.5 text-[12px] text-[#64748B]">
                      <Globe className="h-3.5 w-3.5 shrink-0 text-[#94A3B8]" />
                      <span className="truncate font-mono-num">{domain}</span>
                      {brand.is_shopify && (
                        <ShopifyBagIcon className="h-3.5 w-3.5 shrink-0" />
                      )}
                    </div>

                    {/* Line 3: Founded Date & Age */}
                    <div className="flex max-w-full items-center gap-1.5 text-[11.5px] text-[#64748B]">
                      <Calendar className="h-3 w-3 shrink-0 text-[#94A3B8]" />
                      {founded ? (
                        <span className="truncate font-mono-num">
                          <span className="text-[#475569]">{founded.date}</span>{" "}
                          <span className="text-[#94A3B8]">{founded.age}</span>
                        </span>
                      ) : (
                        <span className="truncate text-[#94A3B8]">
                          {brand.shopify_theme || brand.currency || "Active Store"}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* 2. BEST-SELLING PRODUCTS (3 Square Thumbnails + Package Count Below) */}
                <div className="flex flex-col items-center gap-1.5 text-left">
                  {products.length > 0 ? (
                    <>
                      <div className="flex items-center gap-1.5">
                        {products.slice(0, 3).map((prod, i) => (
                          <div
                            key={`${prod.title}-${i}`}
                            title={prod.title}
                            className="h-14 w-14 overflow-hidden rounded-lg border border-[#E6E9F0] bg-[#F7F8FB]"
                          >
                            {prod.image_url ? (
                              /* eslint-disable-next-line @next/next/no-img-element */
                              <img
                                src={prod.image_url}
                                alt={prod.title}
                                loading="lazy"
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center text-[#94A3B8]">
                                <Package className="h-4 w-4" />
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                      <span className="inline-flex items-center gap-1 font-mono-num text-[11.5px] font-semibold text-[#334155]">
                        <Package className="h-3.5 w-3.5 text-[#64748B]" />
                        {(brand.products_count ?? products.length).toLocaleString("en-US")}
                      </span>
                    </>
                  ) : (
                    <span className="inline-flex items-center gap-1 font-mono-num text-xs text-[#94A3B8]">
                      <Package className="h-3.5 w-3.5" />
                      {brand.products_count || "—"}
                    </span>
                  )}
                </div>

                {/* 3. CATEGORY PILL */}
                <div className="flex justify-center">
                  <span className="max-w-full truncate rounded-full bg-[#F3F5F9] px-3 py-1 text-[11.5px] font-medium text-[#475569] transition-colors group-hover:bg-[#E2E8F0] group-hover:text-[#0F172A]">
                    {brand.category}
                  </span>
                </div>

                {/* 4. MONTHLY VISITS + FLAGS + AREA SPARKLINE */}
                <div className="flex flex-col gap-1.5 text-left">
                  <div className="flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1 font-display text-[13.5px] font-bold text-[#0F172A]">
                      <Users className="h-3.5 w-3.5 text-[#64748B]" />
                      {formatReach(brand.monthly_visits)}
                    </span>
                    <span className="flex items-center gap-0.5 text-[11px]">
                      {visitorFlags.map((flag, idx) => (
                        <span key={`${flag}-${idx}`}>{flag}</span>
                      ))}
                    </span>
                  </div>
                  <AreaSparkline
                    values={visitSeries}
                    positive={growthPositive}
                    width={126}
                    height={34}
                  />
                </div>

                {/* 5. META ADS + FLAGS + AREA SPARKLINE */}
                <div className="flex flex-col gap-1.5 text-left">
                  <div className="flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1.5 font-display text-[13.5px] font-bold text-[#0F172A]">
                      <MetaInfinityIcon className="h-3.5 w-3.5 shrink-0" />
                      {(brand.active_ads_count ?? brandAds.length).toLocaleString("en-US")}
                    </span>
                    <span className="flex items-center gap-0.5 text-[11px]">
                      {targetedFlags.map((flag, idx) => (
                        <span key={`${flag}-${idx}`}>{flag}</span>
                      ))}
                    </span>
                  </div>
                  <AreaSparkline
                    values={adsSeries}
                    positive={true}
                    width={126}
                    height={34}
                  />
                </div>

                {/* 6. ADS CREATIVES PREVIEW (3 Square Ad Thumbnails with Video Play Icon) */}
                <div className="flex items-center justify-end gap-1.5">
                  {brandAds.slice(0, 3).map((ad) => {
                    const thumb =
                      ad.thumbnail_url ||
                      ad.fallback_image_url ||
                      (ad.media_type === "image" ? ad.media_url : "");
                    return (
                      <div
                        key={ad.id}
                        className="relative h-14 w-14 overflow-hidden rounded-lg border border-[#E6E9F0] bg-[#0F172A]/5"
                      >
                        {thumb ? (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img
                            src={thumb}
                            alt={ad.headline || brand.name}
                            loading="lazy"
                            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center bg-[#F3F5F9] text-[10px] font-semibold text-[#94A3B8]">
                            Ad
                          </div>
                        )}
                        {ad.media_type === "video" && (
                          <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
                            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/85 text-[#0F172A] shadow-xs backdrop-blur-xs">
                              <Play className="ml-0.5 h-3 w-3 fill-current" />
                            </span>
                          </span>
                        )}
                      </div>
                    );
                  })}
                  {brandAds.length === 0 && (
                    <span className="text-xs text-[#94A3B8]">—</span>
                  )}
                </div>
              </div>
            );
          })}

          {filteredBrands.length === 0 && (
            <div className="px-6 py-14 text-center">
              <p className="font-display text-sm font-semibold text-[#0F172A]">
                No brands match your filters
              </p>
              <p className="mt-1 text-xs text-[#64748B]">
                Clear your filters or click &quot;Can&apos;t find a brand?&quot; to request a new brand.
              </p>
              {hasAnyBrandFilter && (
                <button
                  type="button"
                  data-no-glass="true"
                  onClick={resetAllBrandFilters}
                  className="mt-3.5 inline-flex items-center gap-1.5 rounded-xl border border-[#E2E6EF] bg-white px-3.5 py-2 text-xs font-semibold text-[#0F172A] hover:bg-[#F8FAFC]"
                >
                  Clear all filters
                </button>
              )}
            </div>
          )}
        </div>
      </div>
      )}
    </div>
  );
});
