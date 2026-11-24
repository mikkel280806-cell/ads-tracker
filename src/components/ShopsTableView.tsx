"use client";

import React, { useDeferredValue, useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  ArrowUpDown,
  Bookmark,
  Calendar,
  Check,
  ChevronDown,
  ChevronRight,
  Globe,
  Layers,
  ListFilter,
  Loader2,
  Package,
  Play,
  Plus,
  Search,
  Star,
  Tag,
  Users,
  X,
} from "lucide-react";
import type {
  Ad,
  AdsTimelinePoint,
  Board,
  Brand,
  MarketCode,
  TrafficPoint,
} from "@/lib/types";
import { formatReach } from "@/lib/url-parser";
import {
  estimateShopRevenueSummary,
  summarizeAdsAudience,
} from "@/lib/audience-insights";
import {
  MetaInfinityIcon,
  ShopifyBagIcon,
  TechBrandIcon,
} from "./BrandIcons";
import {
  FlakePopover,
  FlakeSelect,
  type FlakeSelectOption,
} from "./ui/FlakeDropdown";

interface ShopsTableViewProps {
  brands: Brand[];
  ads: Ad[];
  boards: Board[];
  onOpenShop: (brandId: string) => void;
  onAddBrand: (brand: Brand, discoveredAds?: Ad[]) => void;
  onToggleBrandFolder: (brandId: string, boardId: string) => void;
}

type SortKey = "ads" | "visits" | "revenue" | "growth" | "trustpilot" | "products" | "tech";
type MinAdsFilter = "all" | "50" | "250" | "1000" | "5000";
type MinVisitsFilter = "all" | "50k" | "250k" | "1m";
type MinRevenueFilter = "all" | "100k" | "500k" | "1m";
type AudienceGenderFilter = "all" | "Women" | "Men" | "All";
type ProductsRangeFilter = "all" | "small" | "medium" | "large";
type GrowthFilter = "all" | "positive" | "fast";
type TrustpilotFilter = "all" | "4.0" | "4.5";
type PlatformFilter = "all" | "shopify";

const QUICK_SUGGESTIONS = [
  "bareen.com",
  "liewood.com",
  "aloyoga.com",
  "carawayhome.com",
];

function getHomepageScreenshotUrl(
  websiteUrl?: string,
  storedScreenshotUrl?: string
): string | null {
  if (storedScreenshotUrl && storedScreenshotUrl.includes("/ad-media/homepages/")) {
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
  const [lookupInput, setLookupInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mobileScraperOpen, setMobileScraperOpen] = useState(false);

  const [marketFilter, setMarketFilter] = useState<"ALL" | MarketCode>("ALL");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [techFilter, setTechFilter] = useState<string>("all");
  const [minAdsFilter, setMinAdsFilter] = useState<MinAdsFilter>("all");
  const [minVisitsFilter, setMinVisitsFilter] = useState<MinVisitsFilter>("all");
  const [minRevenueFilter, setMinRevenueFilter] = useState<MinRevenueFilter>("all");
  const [audienceGenderFilter, setAudienceGenderFilter] =
    useState<AudienceGenderFilter>("all");
  const [productsRangeFilter, setProductsRangeFilter] =
    useState<ProductsRangeFilter>("all");
  const [bundlesOnly, setBundlesOnly] = useState<boolean>(false);
  const [growthFilter, setGrowthFilter] = useState<GrowthFilter>("all");
  const [trustpilotFilter, setTrustpilotFilter] = useState<TrustpilotFilter>("all");
  const [platformFilter, setPlatformFilter] = useState<PlatformFilter>("all");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const filtersTriggerRef = useRef<HTMLButtonElement | null>(null);
  const [sortBy, setSortBy] = useState<SortKey>("ads");
  const [searchQuery, setSearchQuery] = useState("");
  const deferredSearchQuery = useDeferredValue(searchQuery);

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

  const revenueByBrand = useMemo(() => {
    const map = new Map<string, ReturnType<typeof estimateShopRevenueSummary>>();
    for (const b of brands) {
      map.set(b.id, estimateShopRevenueSummary(b, adsByBrand.get(b.id)));
    }
    return map;
  }, [brands, adsByBrand]);

  const audienceByBrand = useMemo(() => {
    const map = new Map<string, ReturnType<typeof summarizeAdsAudience>>();
    for (const b of brands) {
      map.set(b.id, summarizeAdsAudience(adsByBrand.get(b.id) || []));
    }
    return map;
  }, [brands, adsByBrand]);

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
        throw new Error(data.error || "Kunne ikke scrape shoppen.");
      }
      onAddBrand(data.brand, Array.isArray(data.ads) ? data.ads : []);
      setLookupInput("");
      setMobileScraperOpen(false);
      onOpenShop(data.brand.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Scraping fejlede.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    runBrandLookup(lookupInput);
  };

  const dkCount = useMemo(
    () => brands.filter((b) => b.market === "DK").length,
    [brands]
  );
  const usCount = useMemo(
    () => brands.filter((b) => b.market !== "DK").length,
    [brands]
  );

  const allCategories = useMemo(() => {
    const freq = new Map<string, number>();
    for (const b of brands) {
      const cat = (b.category || "").trim();
      if (cat) freq.set(cat, (freq.get(cat) || 0) + 1);
    }
    return Array.from(freq.entries())
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .map(([name]) => name);
  }, [brands]);

  const categorySelectOptions = useMemo<FlakeSelectOption[]>(
    () => [
      { value: "all", label: "Alle kategorier" },
      ...allCategories.map((c) => ({ value: c, label: c })),
    ],
    [allCategories]
  );

  const allTechTools = useMemo(() => {
    const freq = new Map<string, number>();
    for (const b of brands) {
      for (const t of [...(b.pixels || []), ...(b.shopify_apps || [])]) {
        freq.set(t, (freq.get(t) || 0) + 1);
      }
    }
    return Array.from(freq.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 16)
      .map(([name]) => name);
  }, [brands]);

  const techSelectOptions = useMemo<FlakeSelectOption[]>(
    () => [
      { value: "all", label: "Pixels & apps" },
      ...allTechTools.map((t) => ({
        value: t,
        label: t,
        icon: <TechBrandIcon name={t} className="h-4 w-4" />,
      })),
    ],
    [allTechTools]
  );

  const shopSortOptions = useMemo<FlakeSelectOption[]>(
    () => [
      { value: "ads", label: "Flest Live Ads" },
      { value: "visits", label: "Højest Visits" },
      { value: "revenue", label: "Højest Est. Revenue" },
      { value: "growth", label: "Størst Vækst" },
      { value: "trustpilot", label: "Højest Trustpilot" },
      { value: "products", label: "Flest Produkter" },
      { value: "tech", label: "Flest Apps" },
    ],
    []
  );

  const advancedFilterCount =
    (minAdsFilter !== "all" ? 1 : 0) +
    (minVisitsFilter !== "all" ? 1 : 0) +
    (minRevenueFilter !== "all" ? 1 : 0) +
    (audienceGenderFilter !== "all" ? 1 : 0) +
    (productsRangeFilter !== "all" ? 1 : 0) +
    (bundlesOnly ? 1 : 0) +
    (growthFilter !== "all" ? 1 : 0) +
    (trustpilotFilter !== "all" ? 1 : 0) +
    (platformFilter !== "all" ? 1 : 0);

  const hasAnyShopFilter =
    marketFilter !== "ALL" ||
    categoryFilter !== "all" ||
    techFilter !== "all" ||
    advancedFilterCount > 0 ||
    searchQuery.trim().length > 0;

  const resetAllShopFilters = () => {
    setMarketFilter("ALL");
    setCategoryFilter("all");
    setTechFilter("all");
    setMinAdsFilter("all");
    setMinVisitsFilter("all");
    setMinRevenueFilter("all");
    setAudienceGenderFilter("all");
    setProductsRangeFilter("all");
    setBundlesOnly(false);
    setGrowthFilter("all");
    setTrustpilotFilter("all");
    setPlatformFilter("all");
    setSearchQuery("");
  };

  const filteredBrands = useMemo(() => {
    const q = deferredSearchQuery.trim().toLowerCase();
    const list = brands.filter((b) => {
      if (marketFilter === "DK" && b.market !== "DK") return false;
      if (marketFilter === "US" && b.market === "DK") return false;
      if (categoryFilter !== "all" && (b.category || "").trim() !== categoryFilter) {
        return false;
      }
      if (techFilter !== "all") {
        const allTech = [...(b.pixels || []), ...(b.shopify_apps || [])];
        if (!allTech.includes(techFilter)) return false;
      }
      if (minAdsFilter !== "all") {
        const minAds = Number(minAdsFilter);
        const liveAds = b.active_ads_count ?? (adsByBrand.get(b.id)?.length || 0);
        if (liveAds < minAds) return false;
      }
      if (minVisitsFilter !== "all") {
        const visits = b.monthly_visits || 0;
        const threshold =
          minVisitsFilter === "1m"
            ? 1_000_000
            : minVisitsFilter === "250k"
              ? 250_000
              : 50_000;
        if (visits < threshold) return false;
      }
      if (minRevenueFilter !== "all") {
        const revDkk = revenueByBrand.get(b.id)?.monthlyRevenueDkk || 0;
        const threshold =
          minRevenueFilter === "1m"
            ? 5_000_000
            : minRevenueFilter === "500k"
              ? 2_000_000
              : 500_000;
        if (revDkk < threshold) return false;
      }
      if (audienceGenderFilter !== "all") {
        const aud = audienceByBrand.get(b.id);
        if (!aud || (!aud.hasBreakdown && !aud.targetGender)) return false;
        if (aud.dominantGender !== audienceGenderFilter) return false;
      }
      if (productsRangeFilter !== "all") {
        const count = b.products_count ?? (b.top_products?.length || 0);
        if (productsRangeFilter === "small" && (count < 1 || count > 20)) return false;
        if (productsRangeFilter === "medium" && (count <= 20 || count > 100)) return false;
        if (productsRangeFilter === "large" && count <= 100) return false;
      }
      if (bundlesOnly && !revenueByBrand.get(b.id)?.hasBundles) {
        return false;
      }
      if (growthFilter === "positive" && (b.traffic_growth_pct ?? 0) <= 0) {
        return false;
      }
      if (growthFilter === "fast" && (b.traffic_growth_pct ?? 0) < 15) {
        return false;
      }
      if (trustpilotFilter !== "all") {
        const minScore = Number(trustpilotFilter);
        if ((b.trustpilot_score ?? 0) < minScore) return false;
      }
      if (platformFilter === "shopify" && !b.is_shopify) {
        return false;
      }
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
      if (sortBy === "visits") {
        return (b.monthly_visits || 0) - (a.monthly_visits || 0);
      }
      if (sortBy === "revenue") {
        return (
          (revenueByBrand.get(b.id)?.monthlyRevenueUsd || 0) -
          (revenueByBrand.get(a.id)?.monthlyRevenueUsd || 0)
        );
      }
      if (sortBy === "growth") {
        return (b.traffic_growth_pct ?? -999) - (a.traffic_growth_pct ?? -999);
      }
      if (sortBy === "trustpilot") {
        return (b.trustpilot_score ?? 0) - (a.trustpilot_score ?? 0);
      }
      if (sortBy === "products") {
        return (b.products_count || 0) - (a.products_count || 0);
      }
      if (sortBy === "tech") {
        const ta = (a.pixels?.length || 0) + (a.shopify_apps?.length || 0);
        const tb = (b.pixels?.length || 0) + (b.shopify_apps?.length || 0);
        return tb - ta;
      }
      return (b.active_ads_count || 0) - (a.active_ads_count || 0);
    });
  }, [
    brands,
    adsByBrand,
    revenueByBrand,
    audienceByBrand,
    marketFilter,
    categoryFilter,
    techFilter,
    minAdsFilter,
    minVisitsFilter,
    minRevenueFilter,
    audienceGenderFilter,
    productsRangeFilter,
    bundlesOnly,
    growthFilter,
    trustpilotFilter,
    platformFilter,
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
    <div className="animate-view-in space-y-4 lg:space-y-5">
      {/* HEADER — Title + live count left · Centered top search middle · balanced spacer right */}
      <div className="grid grid-cols-1 items-center gap-3 md:grid-cols-[1fr_minmax(260px,420px)_1fr]">
        <div className="flex items-center gap-3">
          <h1 className="font-display text-[22px] font-bold leading-tight text-[#0F172A]">
            Shops
          </h1>
          <span className="inline-flex items-center rounded-xl border border-[#ECEFF5] bg-white px-2.5 py-1 font-mono-num text-[12.5px] font-semibold text-[#334155] shadow-[0_2px_8px_rgba(15,23,42,0.06)]">
            {filteredBrands.length.toLocaleString("fr-FR")}
          </span>
        </div>

        {/* Centered Top Search Bar */}
        <div className="relative w-full">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94A3B8]" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Søg shop, kategori eller app..."
            className="w-full rounded-xl border border-[#E6E9F0] bg-white py-2 pl-9.5 pr-8 text-[16px] text-[#0F172A] shadow-[0_1px_3px_rgba(15,23,42,0.03)] outline-none transition-all placeholder:text-[#94A3B8] focus:border-[#CBD5E1] focus:shadow-[0_4px_14px_-4px_rgba(15,23,42,0.08)] sm:text-[13px]"
          />
          {searchQuery && (
            <button
              type="button"
              data-no-glass="true"
              onClick={() => setSearchQuery("")}
              aria-label="Ryd søgning"
              className="absolute right-2.5 top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded-full text-[#94A3B8] transition-colors hover:bg-[#F1F5F9] hover:text-[#475569]"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <div className="hidden md:block" />
      </div>

      {/* ADD SHOP POPUP MODAL */}
      {mobileScraperOpen &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            className="flake-modal-backdrop z-[90] flex items-center justify-center bg-[#050811]/55 p-4 backdrop-blur-[2px]"
            onClick={() => {
              if (!loading) setMobileScraperOpen(false);
            }}
          >
            <div
              className="animate-sheet-up max-h-[85dvh] w-full max-w-md overflow-y-auto rounded-2xl border border-[#E6E9F0] bg-white p-5 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
            <div className="mb-3.5 flex items-center justify-between gap-3">
              <div>
                <h2 className="font-display text-[17px] font-bold text-[#0F172A]">
                  Tilføj shop
                </h2>
                <p className="text-xs text-[#64748B]">
                  Indsæt shop-URL eller brandnavn for at scrape live Meta Ads og tech stack.
                </p>
              </div>
              <button
                type="button"
                disabled={loading}
                onClick={() => setMobileScraperOpen(false)}
                aria-label="Luk"
                className="flex h-8 w-8 items-center justify-center rounded-lg text-[#64748B] transition-colors hover:bg-[#F3F5F9] hover:text-[#0F172A] disabled:opacity-40"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="flex items-center gap-2.5 rounded-xl border border-[#E2E6EF] bg-[#F7F8FB] px-3 py-2.5 transition-all focus-within:border-[#0027eb] focus-within:bg-white focus-within:ring-2 focus-within:ring-[#0027eb]/15">
                <Globe className="h-4 w-4 shrink-0 text-[#64748B]" />
                <input
                  id="brand-magic-input"
                  type="text"
                  autoFocus
                  value={lookupInput}
                  onChange={(e) => setLookupInput(e.target.value)}
                  placeholder="fx bareen.com eller https://resilia.shop"
                  className="w-full bg-transparent text-[16px] text-[#0F172A] outline-none placeholder:text-[#94A3B8] sm:text-[13.5px]"
                />
              </div>

              <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                <span className="text-[#94A3B8]">Forslag:</span>
                {QUICK_SUGGESTIONS.map((domain) => (
                  <button
                    key={domain}
                    type="button"
                    disabled={loading}
                    onClick={() => runBrandLookup(domain)}
                    className="rounded-lg bg-[#F5F7FA] px-2 py-0.5 font-mono-num text-[11px] font-medium text-[#475569] transition-colors hover:bg-[#E2E8F0] hover:text-[#0F172A] disabled:opacity-40"
                  >
                    + {domain}
                  </button>
                ))}
              </div>

              {loading && (
                <div className="space-y-2.5 rounded-xl border border-[#ECEFF5] bg-[#FAFBFD] p-3">
                  <div className="flex items-center gap-2.5">
                    <div className="skeleton-shimmer h-9 w-9 shrink-0 rounded-lg" />
                    <div className="flex-1 space-y-1.5">
                      <div className="skeleton-shimmer h-3 w-28 rounded" />
                      <div className="skeleton-shimmer h-2.5 w-40 rounded" />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="skeleton-shimmer h-10 rounded-lg" />
                    <div className="skeleton-shimmer h-10 rounded-lg" />
                    <div className="skeleton-shimmer h-10 rounded-lg" />
                  </div>
                </div>
              )}

              {error && (
                <p className="rounded-xl bg-[#FFF1F2] px-3 py-2 text-xs font-medium text-[#E11D48]">
                  {error}
                </p>
              )}

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => setMobileScraperOpen(false)}
                  className="rounded-xl px-3.5 py-2 text-xs font-semibold text-[#64748B] transition-colors hover:bg-[#F3F5F9] hover:text-[#0F172A] disabled:opacity-40"
                >
                  Annuller
                </button>
                <button
                  id="brand-magic-submit"
                  type="submit"
                  disabled={loading || !lookupInput.trim()}
                  className="adtrack-btn-primary inline-flex items-center justify-center gap-1.5 rounded-xl px-4 py-2 text-xs font-semibold text-white transition-colors disabled:opacity-45"
                >
                  {loading ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Plus className="h-3.5 w-3.5" />
                  )}
                  {loading ? "Scraper..." : "Tilføj shop"}
                </button>
              </div>
            </form>
            </div>
          </div>,
          document.body
        )}

      {/* UNIFIED FILTER BAR — Market left · Category · Tech · Advanced Filters · Sort right */}
      <div className="space-y-2.5 lg:flex lg:items-center lg:justify-between lg:gap-3 lg:space-y-0">
        {/* Clean Segmented Market Control */}
        <div className="grid grid-cols-3 rounded-xl bg-[#EFEFF4] p-1 text-xs font-semibold lg:inline-flex lg:w-fit">
          {[
            { id: "ALL" as const, label: "Alle", count: brands.length },
            { id: "DK" as const, label: "DK", count: dkCount },
            { id: "US" as const, label: "US & Global", count: usCount },
          ].map((m) => {
            const active = marketFilter === m.id;
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => setMarketFilter(m.id)}
                className={`inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-lg px-2.5 py-1.5 transition-all lg:px-3 ${
                  active
                    ? "bg-white text-[#0F172A] shadow-xs"
                    : "text-[#64748B] hover:text-[#0F172A]"
                }`}
              >
                <span>{m.label}</span>
                <span
                  className={`font-mono-num text-[10.5px] font-semibold ${
                    active ? "text-[#475569]" : "text-[#94A3B8]"
                  }`}
                >
                  {m.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Category · Pixels & Apps · Advanced Filters · Sort */}
        <div className="flex flex-wrap items-center gap-1.5">
          <FlakeSelect
            ariaLabel="Filtrer efter kategori"
            value={categoryFilter}
            onChange={(val) => setCategoryFilter(val)}
            options={categorySelectOptions}
            icon={<Tag className="h-3.5 w-3.5 text-[#475569]" />}
            variant="bordered"
            align="left"
            menuWidth={230}
            isActive={categoryFilter !== "all"}
            triggerClassName="w-auto max-w-[175px]"
          />

          <FlakeSelect
            ariaLabel="Filtrer efter pixel eller Shopify app"
            value={techFilter}
            onChange={(val) => setTechFilter(val)}
            options={techSelectOptions}
            icon={<Layers className="h-3.5 w-3.5 text-[#475569]" />}
            variant="bordered"
            align="left"
            menuWidth={240}
            isActive={techFilter !== "all"}
            triggerClassName="w-auto max-w-[170px]"
          />

          {/* Advanced Shop Filters Popover (Live Ads, Visits, Growth, Trustpilot, Platform) */}
          <div className="relative">
            <button
              ref={filtersTriggerRef}
              type="button"
              onClick={() => setFiltersOpen((v) => !v)}
              className={`inline-flex items-center gap-1.5 rounded-xl border bg-white px-3 py-2 text-[13.5px] font-medium transition-colors sm:text-xs ${
                advancedFilterCount > 0 || filtersOpen
                  ? "border-[#CBD5E1] text-[#0F172A]"
                  : "border-[#E6E9F0] text-[#334155] hover:border-[#CBD5E1]"
              }`}
            >
              <ListFilter className="h-3.5 w-3.5 text-[#475569]" />
              <span>Filters</span>
              {advancedFilterCount > 0 && (
                <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-[#0F172A] px-1 font-mono-num text-[10px] font-bold text-white">
                  {advancedFilterCount}
                </span>
              )}
              <ChevronDown
                className={`h-3.5 w-3.5 text-[#64748B] transition-transform duration-150 ${
                  filtersOpen ? "rotate-180" : ""
                }`}
              />
            </button>

            <FlakePopover
              open={filtersOpen}
              onOpenChange={setFiltersOpen}
              anchorRef={filtersTriggerRef}
              align="right"
              width={330}
              maxHeight={480}
            >
              <div className="workspace-scroll space-y-3.5 overflow-y-auto overscroll-contain p-3.5">
                {/* Live Meta Ads */}
                <div>
                  <p className="mb-1.5 text-[10.5px] font-semibold uppercase tracking-wider text-[#64748B]">
                    Live Meta Ads
                  </p>
                  <div className="grid grid-cols-5 gap-1 rounded-xl bg-[#F3F4F6] p-1 text-[11.5px] font-medium">
                    {(
                      [
                        { id: "all", label: "Alle" },
                        { id: "50", label: "50+" },
                        { id: "250", label: "250+" },
                        { id: "1000", label: "1K+" },
                        { id: "5000", label: "5K+" },
                      ] as const
                    ).map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setMinAdsFilter(opt.id)}
                        className={`rounded-lg py-1 transition-all ${
                          minAdsFilter === opt.id
                            ? "bg-white font-semibold text-[#0F172A] shadow-xs"
                            : "text-[#64748B] hover:text-[#0F172A]"
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Monthly Visits */}
                <div>
                  <p className="mb-1.5 text-[10.5px] font-semibold uppercase tracking-wider text-[#64748B]">
                    Månedlige Visits
                  </p>
                  <div className="grid grid-cols-4 gap-1 rounded-xl bg-[#F3F4F6] p-1 text-[11.5px] font-medium">
                    {(
                      [
                        { id: "all", label: "Alle" },
                        { id: "50k", label: "50K+" },
                        { id: "250k", label: "250K+" },
                        { id: "1m", label: "1M+" },
                      ] as const
                    ).map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setMinVisitsFilter(opt.id)}
                        className={`rounded-lg py-1 transition-all ${
                          minVisitsFilter === opt.id
                            ? "bg-white font-semibold text-[#0F172A] shadow-xs"
                            : "text-[#64748B] hover:text-[#0F172A]"
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Traffic Growth */}
                <div>
                  <p className="mb-1.5 text-[10.5px] font-semibold uppercase tracking-wider text-[#64748B]">
                    Trafikvækst
                  </p>
                  <div className="grid grid-cols-3 gap-1.5 text-[11.5px] font-medium">
                    {(
                      [
                        { id: "all", label: "Alle" },
                        { id: "positive", label: "Voksende" },
                        { id: "fast", label: "+15% vækst" },
                      ] as const
                    ).map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setGrowthFilter(opt.id)}
                        className={`rounded-lg border px-2 py-1.5 transition-colors ${
                          growthFilter === opt.id
                            ? "border-[#0F172A] bg-[#0F172A] text-white"
                            : "border-[#E6E9F0] bg-white text-[#475569] hover:bg-[#F8FAFC]"
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Trustpilot + Platform */}
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <p className="mb-1.5 text-[10.5px] font-semibold uppercase tracking-wider text-[#64748B]">
                      Trustpilot
                    </p>
                    <div className="grid grid-cols-3 gap-1 rounded-xl bg-[#F3F4F6] p-1 text-[11.5px] font-medium">
                      {(
                        [
                          { id: "all", label: "Alle" },
                          { id: "4.0", label: "4+" },
                          { id: "4.5", label: "4.5+" },
                        ] as const
                      ).map((opt) => (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => setTrustpilotFilter(opt.id)}
                          className={`inline-flex items-center justify-center gap-0.5 rounded-lg py-1 transition-all ${
                            trustpilotFilter === opt.id
                              ? "bg-white font-semibold text-[#0F172A] shadow-xs"
                              : "text-[#64748B] hover:text-[#0F172A]"
                          }`}
                        >
                          {opt.id !== "all" && (
                            <Star className="h-2.5 w-2.5 fill-[#00B67A] text-[#00B67A]" />
                          )}
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="mb-1.5 text-[10.5px] font-semibold uppercase tracking-wider text-[#64748B]">
                      Platform
                    </p>
                    <div className="grid grid-cols-2 gap-1 rounded-xl bg-[#F3F4F6] p-1 text-[11.5px] font-medium">
                      {(
                        [
                          { id: "all", label: "Alle" },
                          { id: "shopify", label: "Shopify" },
                        ] as const
                      ).map((opt) => (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => setPlatformFilter(opt.id)}
                          className={`rounded-lg py-1 transition-all ${
                            platformFilter === opt.id
                              ? "bg-white font-semibold text-[#0F172A] shadow-xs"
                              : "text-[#64748B] hover:text-[#0F172A]"
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Est. Monthly Revenue (DKK) */}
                <div>
                  <p className="mb-1.5 text-[10.5px] font-semibold uppercase tracking-wider text-[#64748B]">
                    Est. Monthly Revenue (kr.)
                  </p>
                  <div className="grid grid-cols-4 gap-1 rounded-xl bg-[#F3F4F6] p-1 text-[11.5px] font-medium">
                    {(
                      [
                        { id: "all", label: "Alle" },
                        { id: "100k", label: "500K+" },
                        { id: "500k", label: "2M+" },
                        { id: "1m", label: "5M+" },
                      ] as const
                    ).map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setMinRevenueFilter(opt.id)}
                        className={`rounded-lg py-1 transition-all ${
                          minRevenueFilter === opt.id
                            ? "bg-white font-semibold text-[#0F172A] shadow-xs"
                            : "text-[#64748B] hover:text-[#0F172A]"
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Målgruppe (Køn) */}
                <div>
                  <p className="mb-1.5 text-[10.5px] font-semibold uppercase tracking-wider text-[#64748B]">
                    Målgruppe · Køn
                  </p>
                  <div className="grid grid-cols-4 gap-1 rounded-xl bg-[#F3F4F6] p-1 text-[11.5px] font-medium">
                    {(
                      [
                        { id: "all", label: "Alle" },
                        { id: "Women", label: "Kvinder" },
                        { id: "Men", label: "Mænd" },
                        { id: "All", label: "Unisex" },
                      ] as const
                    ).map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setAudienceGenderFilter(opt.id)}
                        className={`rounded-lg py-1 transition-all ${
                          audienceGenderFilter === opt.id
                            ? "bg-white font-semibold text-[#0F172A] shadow-xs"
                            : "text-[#64748B] hover:text-[#0F172A]"
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Antal Produkter */}
                <div>
                  <p className="mb-1.5 text-[10.5px] font-semibold uppercase tracking-wider text-[#64748B]">
                    Antal Produkter
                  </p>
                  <div className="grid grid-cols-4 gap-1 rounded-xl bg-[#F3F4F6] p-1 text-[11.5px] font-medium">
                    {(
                      [
                        { id: "all", label: "Alle" },
                        { id: "small", label: "1–20" },
                        { id: "medium", label: "20–100" },
                        { id: "large", label: "100+" },
                      ] as const
                    ).map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setProductsRangeFilter(opt.id)}
                        className={`rounded-lg py-1 transition-all ${
                          productsRangeFilter === opt.id
                            ? "bg-white font-semibold text-[#0F172A] shadow-xs"
                            : "text-[#64748B] hover:text-[#0F172A]"
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Bundles Toggle */}
                <div className="flex items-center justify-between rounded-xl border border-[#ECEFF5] bg-[#FAFBFD] px-3 py-2">
                  <div>
                    <p className="text-[12px] font-semibold text-[#0F172A]">
                      Kun shops med bundles
                    </p>
                    <p className="text-[10.5px] text-[#64748B]">
                      Bundle-produkter eller bundle-apps
                    </p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={bundlesOnly}
                    onClick={() => setBundlesOnly((v) => !v)}
                    className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${
                      bundlesOnly ? "bg-[#0027eb]" : "bg-[#CBD5E1]"
                    }`}
                  >
                    <span
                      className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow-xs transition-transform ${
                        bundlesOnly ? "translate-x-[18px]" : "translate-x-[3px]"
                      }`}
                    />
                  </button>
                </div>

                {advancedFilterCount > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setMinAdsFilter("all");
                      setMinVisitsFilter("all");
                      setMinRevenueFilter("all");
                      setAudienceGenderFilter("all");
                      setProductsRangeFilter("all");
                      setBundlesOnly(false);
                      setGrowthFilter("all");
                      setTrustpilotFilter("all");
                      setPlatformFilter("all");
                    }}
                    className="w-full rounded-xl border border-[#E6E9F0] py-1.5 text-xs font-semibold text-[#475569] hover:bg-[#F8FAFC] hover:text-[#0F172A]"
                  >
                    Nulstil filtre
                  </button>
                )}
              </div>
            </FlakePopover>
          </div>

          <FlakeSelect
            ariaLabel="Sortér shops"
            value={sortBy}
            onChange={(val) => setSortBy(val as SortKey)}
            options={shopSortOptions}
            icon={<ArrowUpDown className="h-3.5 w-3.5 text-[#475569]" />}
            variant="bordered"
            align="right"
            menuWidth={210}
            isActive={sortBy !== "ads"}
            triggerClassName="w-auto font-semibold text-[#0F172A]"
          />

          {hasAnyShopFilter && (
            <button
              type="button"
              data-no-glass="true"
              onClick={resetAllShopFilters}
              className="inline-flex items-center gap-1 rounded-xl px-2.5 py-2 text-xs font-semibold text-[#64748B] transition-colors hover:bg-[#F1F5F9] hover:text-[#0F172A]"
            >
              <X className="h-3.5 w-3.5" />
              Nulstil
            </button>
          )}
        </div>
      </div>

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
              Ingen shops matcher dit filter
            </p>
            <p className="mt-1 text-xs text-[#64748B]">
              Nulstil dine filtre eller tryk på + øverst for at tilføje en ny shop.
            </p>
            {hasAnyShopFilter && (
              <button
                type="button"
                onClick={resetAllShopFilters}
                className="mt-3.5 inline-flex items-center gap-1.5 rounded-xl border border-[#E2E6EF] bg-white px-3.5 py-2 text-xs font-semibold text-[#0F172A] hover:bg-[#F8FAFC]"
              >
                Nulstil alle filtre
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
        <div className="grid grid-cols-[2.35fr_1.45fr_0.9fr_1.15fr_1.15fr_1.45fr] items-center gap-4 border-b border-[#EFF2F6] bg-[#FAFBFD] px-5 py-3 text-[11.5px] font-medium text-[#64748B]">
          <span>Shop Infos</span>
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
                Ingen shops matcher dit filter
              </p>
              <p className="mt-1 text-xs text-[#64748B]">
                Nulstil dine filtre eller klik på + øverst til højre for at tilføje en ny shop.
              </p>
              {hasAnyShopFilter && (
                <button
                  type="button"
                  onClick={resetAllShopFilters}
                  className="mt-3.5 inline-flex items-center gap-1.5 rounded-xl border border-[#E2E6EF] bg-white px-3.5 py-2 text-xs font-semibold text-[#0F172A] hover:bg-[#F8FAFC]"
                >
                  Nulstil alle filtre
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
