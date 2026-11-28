"use client";

import React, { useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  ArrowUpDown,
  ArrowUpRight,
  Bookmark,
  Check,
  ExternalLink,
  Filter,
  Heart,
  HelpCircle,
  Image as ImageIcon,
  Info,
  Layers,
  LayoutGrid,
  List,
  Plus,
  RotateCcw,
  Search,
  Settings,
  SlidersHorizontal,
  Sparkles,
  Upload,
  X,
} from "lucide-react";
import type { Ad, Board, Brand } from "@/lib/types";
import {
  ATRIA_ADVERTISERS_PLACEHOLDERS,
  ATRIA_TOP_PICKS_COLLECTIONS,
  type AtriaAdvertiserPlaceholder,
  type AtriaCollectionPlaceholder,
} from "@/lib/atria-placeholders";
import { getActiveDays } from "@/lib/url-parser";
import { AdCard } from "./AdCard";
import {
  FacebookColorIcon,
  InstagramColorIcon,
  MetaInfinityIcon,
} from "./BrandIcons";
import { FlakePopover, FlakeSelect } from "./ui/FlakeDropdown";

/* ============================================================================
   LOCAL RIPPED ASSET MAPS (VERIFIED UNDER public/atria-assets/inspo/)
   ============================================================================ */

const LOCAL_COLLECTION_THUMBS: Record<string, string> = {
  "tp-1": "/atria-assets/inspo/collection-01-static-callout.jpg",
  "tp-2": "/atria-assets/inspo/collection-02-us-vs-them.jpg",
  "tp-3": "/atria-assets/inspo/collection-03-seasonal-offers.jpg",
  "tp-4": "/atria-assets/inspo/collection-04-health-wellness.jpg",
  "tp-5": "/atria-assets/inspo/collection-05-native-notes.jpg",
  "tp-6": "/atria-assets/inspo/collection-06-beauty-skincare.jpg",
  "tp-7": "/atria-assets/inspo/collection-07-apparel-editorial.jpg",
  "tp-8": "/atria-assets/inspo/collection-08-social-proof.jpg",
  "tp-9": "/atria-assets/inspo/collection-09-reasons-why.jpg",
  "tp-10": "/atria-assets/inspo/collection-10-home-ergonomics.jpg",
  "tp-11": "/atria-assets/inspo/collection-01-static-callout.jpg",
  "tp-12": "/atria-assets/inspo/collection-12-founder-memo.jpg",
};

const LOCAL_ADVERTISER_AVATARS: Record<string, string> = {
  "adv-meshki": "/atria-assets/inspo/adv-meshki.jpg",
  "adv-legend": "/atria-assets/inspo/adv-legend-london.jpg",
  "adv-tradesman": "/atria-assets/inspo/adv-tradesman.jpg",
  "adv-nude": "/atria-assets/inspo/adv-nude-project.jpg",
  "adv-musclemat": "/atria-assets/inspo/adv-muscle-mat.jpg",
};

function resolveCollectionThumb(col: AtriaCollectionPlaceholder): string {
  return LOCAL_COLLECTION_THUMBS[col.id] || col.thumbnailUrl;
}

function sanitizeCollectionTitle(col: AtriaCollectionPlaceholder): string {
  return col.id === "tp-3" ? "Seasonal & Promotional Offer Winners" : col.title;
}

function MicroCaret({ open = false }: { open?: boolean }) {
  return (
    <svg
      viewBox="0 0 8 5"
      aria-hidden="true"
      className={`h-[5px] w-[7px] shrink-0 text-[#475569] transition-transform duration-150 ${
        open ? "rotate-180" : ""
      }`}
      fill="currentColor"
    >
      <path d="M4 5L0 0h8L4 5z" />
    </svg>
  );
}

/* ============================================================================
   1. LEGACY / ALTERNATE DISCOVERY HEADER (KEPT CLEAN)
   ============================================================================ */

export interface InspoDiscoveryHeaderProps {
  search: string;
  onSearchChange: (val: string) => void;
  activeViewTab: "all" | "trending" | "following" | "dk" | "us";
  onViewTabChange: (tab: "all" | "trending" | "following" | "dk" | "us") => void;
  followedCount: number;
  filtersExpanded: boolean;
  onToggleFiltersExpanded: () => void;
  sortBy: "top" | "reach" | "longest" | "duplicated" | "newest";
  onSortChange: (val: "top" | "reach" | "longest" | "duplicated" | "newest") => void;
  mediaFilter: "all" | "video" | "image" | "carousel";
  onMediaFilterChange: (v: "all" | "video" | "image" | "carousel") => void;
  platformFilter: string;
  onPlatformFilterChange: (v: string) => void;
  timeFilter: "all" | "7d" | "30d" | "90d";
  onTimeFilterChange: (v: "all" | "7d" | "30d" | "90d") => void;
  countryFilter: string;
  onCountryFilterChange: (v: string) => void;
  availableCountries: Array<{ code: string; flag: string; count: number }>;
  genderFilter: "all" | "Women" | "Men" | "All";
  onGenderFilterChange: (v: "all" | "Women" | "Men" | "All") => void;
  ageFilter: "all" | "18-24" | "25-34" | "35-44" | "45-54" | "55+";
  onAgeFilterChange: (v: "all" | "18-24" | "25-34" | "35-44" | "45-54" | "55+") => void;
  minReachFilter: "all" | "10k" | "50k" | "100k" | "500k";
  onMinReachFilterChange: (v: "all" | "10k" | "50k" | "100k" | "500k") => void;
  scaledOnly: boolean;
  onScaledOnlyChange: (v: boolean) => void;
  brandFilter: string;
  onBrandFilterChange: (v: string) => void;
  brands: Brand[];
  displayAdsTotal: number | null;
  hasAnyFilter: boolean;
  onResetFilters: () => void;
  onOpenRequestBrand?: () => void;
}

export function InspoDiscoveryHeader({
  search,
  onSearchChange,
  activeViewTab,
  onViewTabChange,
  followedCount,
  filtersExpanded,
  onToggleFiltersExpanded,
  sortBy,
  onSortChange,
  mediaFilter,
  onMediaFilterChange,
  platformFilter,
  onPlatformFilterChange,
  timeFilter,
  onTimeFilterChange,
  countryFilter,
  onCountryFilterChange,
  availableCountries,
  genderFilter,
  onGenderFilterChange,
  ageFilter,
  onAgeFilterChange,
  minReachFilter,
  onMinReachFilterChange,
  scaledOnly,
  onScaledOnlyChange,
  brandFilter,
  onBrandFilterChange,
  brands,
  displayAdsTotal,
  hasAnyFilter,
  onResetFilters,
  onOpenRequestBrand,
}: InspoDiscoveryHeaderProps) {
  const [newViewNotice, setNewViewNotice] = useState(false);

  const viewTabs: Array<{
    id: "all" | "trending" | "following" | "dk" | "us";
    label: string;
    emoji?: string;
    badge?: number;
  }> = [
    { id: "all", label: "All ads" },
    { id: "trending", label: "Trending", emoji: "🔥" },
    { id: "following", label: "Following", emoji: "❤️", badge: followedCount },
    { id: "dk", label: "DK" },
    { id: "us", label: "US & Global" },
  ];

  const activeFilterCount = [
    mediaFilter !== "all",
    platformFilter !== "all",
    timeFilter !== "all",
    countryFilter !== "all",
    genderFilter !== "all",
    ageFilter !== "all",
    minReachFilter !== "all",
    scaledOnly,
    brandFilter !== "all",
  ].filter(Boolean).length;

  return (
    <div className="mb-5 space-y-3">
      {/* View Tabs Row */}
      <div className="flex flex-wrap items-center gap-2">
        {viewTabs.map((tab) => {
          const active = activeViewTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              data-no-glass="true"
              onClick={() => onViewTabChange(tab.id)}
              className={`inline-flex h-9 shrink-0 items-center gap-1.5 rounded-[8px] px-3.5 text-[13.5px] font-semibold transition-colors ${
                active
                  ? "bg-[#0027eb] text-white"
                  : "bg-transparent text-[#0F172A] hover:bg-black/[0.04]"
              }`}
            >
              {tab.emoji && (
                <span aria-hidden="true" className="text-[14px] leading-none">
                  {tab.emoji}
                </span>
              )}
              <span>{tab.label}</span>
              {typeof tab.badge === "number" && tab.badge > 0 && (
                <span
                  className={`rounded-full px-1.5 py-0.2 font-mono-num text-[11px] font-semibold ${
                    active
                      ? "bg-white/20 text-white"
                      : "bg-[#f5f5fa] text-[#0F172A]"
                  }`}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}

        <button
          type="button"
          data-no-glass="true"
          onClick={() => {
            setNewViewNotice(true);
            window.setTimeout(() => setNewViewNotice(false), 2600);
          }}
          className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-[8px] border border-dashed border-[#d6d6e0] bg-white px-3.5 text-[13px] font-medium text-[#0F172A] transition-colors hover:border-[#0027eb]"
        >
          <Plus className="h-3.5 w-3.5 text-[#475569]" />
          New view
        </button>

        {newViewNotice && (
          <span className="ml-1 rounded-full bg-[#EEF2FF] px-2.5 py-1 text-[11px] font-medium text-[#0027eb]">
            Use Filters below to customize &amp; pin a view
          </span>
        )}
      </div>

      {/* Search Row */}
      <div className="flex flex-col gap-2.5 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative w-full max-w-[540px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#64748B]" />
          <input
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search for ads or advertisers with AI"
            className="h-9 w-full rounded-[8px] border border-[#d6d6e0] bg-white pl-9 pr-9 text-[13.5px] text-[#0F172A] placeholder:text-[#94A3B8] outline-none transition-colors focus:border-[#0027eb]"
          />
          {search && (
            <button
              type="button"
              data-no-glass="true"
              onClick={() => onSearchChange("")}
              aria-label="Clear search"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-0.5 text-[#94A3B8] hover:text-[#0F172A]"
            >
              <X className="h-3.5 w-3.5 text-[#64748B]" />
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {onOpenRequestBrand && (
            <button
              type="button"
              data-no-glass="true"
              onClick={onOpenRequestBrand}
              className="inline-flex h-8 items-center gap-1.5 rounded-[8px] px-2 text-[13px] font-medium text-[#0F172A] hover:bg-black/[0.04]"
            >
              <HelpCircle className="h-4 w-4 text-[#475569]" />
              Can&apos;t find an advertiser?
            </button>
          )}
          <span className="font-mono-num text-[12px] font-medium text-[#64748B]">
            {displayAdsTotal !== null
              ? `${displayAdsTotal.toLocaleString()} ads`
              : "Loading ads..."}
          </span>
        </div>
      </div>

      {/* Filter & Sort Row */}
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            data-no-glass="true"
            onClick={onToggleFiltersExpanded}
            className="inline-flex h-8 items-center gap-1.5 rounded-[8px] border border-[#ebebf3] bg-white px-3 text-[13px] font-medium text-[#0F172A] hover:border-[#d6d6e0]"
          >
            <SlidersHorizontal className="h-3.5 w-3.5 text-[#64748B]" />
            <span>Filters</span>
            <span className="text-[12.5px] text-[#64748B]">
              {filtersExpanded ? "Hide" : "Show"}
            </span>
            {activeFilterCount > 0 && (
              <span className="inline-flex h-4 min-w-[16px] items-center justify-center rounded-full bg-[#0027eb] px-1 font-mono-num text-[10px] font-bold text-white">
                {activeFilterCount}
              </span>
            )}
          </button>

          <FlakeSelect
            ariaLabel="Sort ads"
            value={sortBy}
            onChange={(val) =>
              onSortChange(
                val as "top" | "reach" | "longest" | "duplicated" | "newest"
              )
            }
            variant="bordered"
            options={[
              { value: "top", label: "Sort: Top performing" },
              { value: "reach", label: "Sort: Highest reach" },
              { value: "longest", label: "Sort: Longest running" },
              { value: "duplicated", label: "Sort: Most duplicated" },
              { value: "newest", label: "Sort: Newest" },
            ]}
          />

          <button
            type="button"
            data-no-glass="true"
            onClick={() => onScaledOnlyChange(!scaledOnly)}
            className={`inline-flex h-8 items-center gap-1.5 rounded-[8px] border px-3 text-[13px] font-medium transition-colors ${
              scaledOnly
                ? "border-[#0027eb] bg-[#0027eb] text-white"
                : "border-[#ebebf3] bg-white text-[#0F172A] hover:border-[#d6d6e0]"
            }`}
          >
            <Layers
              className={`h-3.5 w-3.5 ${
                scaledOnly ? "text-white" : "text-[#64748B]"
              }`}
            />
            Scaled 3x+
          </button>
        </div>

        {hasAnyFilter && (
          <button
            type="button"
            data-no-glass="true"
            onClick={onResetFilters}
            className="inline-flex h-8 items-center gap-1.5 rounded-[8px] px-2.5 text-[12.5px] font-medium text-[#475569] hover:bg-[#f5f5fa] hover:text-[#0F172A]"
          >
            <RotateCcw className="h-3.5 w-3.5 text-[#64748B]" />
            Reset filters
          </button>
        )}
      </div>

      {filtersExpanded && (
        <div className="rounded-[10px] bg-[#f5f5fa] p-4">
          <div className="space-y-2.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="w-24 text-[12.5px] font-medium text-[#64748B]">
                Lifecycle
              </span>
              <FlakeSelect
                ariaLabel="Launch time"
                value={timeFilter}
                onChange={(v) =>
                  onTimeFilterChange(v as "all" | "7d" | "30d" | "90d")
                }
                variant="bordered"
                isActive={timeFilter !== "all"}
                options={[
                  { value: "all", label: "Launch time: All" },
                  { value: "7d", label: "Launch time: Last 7d" },
                  { value: "30d", label: "Launch time: Last 30d" },
                  { value: "90d", label: "Launch time: Last 90d" },
                ]}
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="w-24 text-[12.5px] font-medium text-[#64748B]">
                Targeting
              </span>
              <FlakeSelect
                ariaLabel="Country filter"
                value={countryFilter}
                onChange={onCountryFilterChange}
                variant="bordered"
                isActive={countryFilter !== "all"}
                options={[
                  { value: "all", label: "Country: All" },
                  ...availableCountries.map((c) => ({
                    value: c.code,
                    label: `${c.flag} ${c.code} (${c.count})`,
                  })),
                ]}
              />
              <FlakeSelect
                ariaLabel="Age filter"
                value={ageFilter}
                onChange={(v) =>
                  onAgeFilterChange(
                    v as "all" | "18-24" | "25-34" | "35-44" | "45-54" | "55+"
                  )
                }
                variant="bordered"
                isActive={ageFilter !== "all"}
                options={[
                  { value: "all", label: "Age: All" },
                  { value: "18-24", label: "Age: 18-24" },
                  { value: "25-34", label: "Age: 25-34" },
                  { value: "35-44", label: "Age: 35-44" },
                  { value: "45-54", label: "Age: 45-54" },
                  { value: "55+", label: "Age: 55+" },
                ]}
              />
              <FlakeSelect
                ariaLabel="Gender filter"
                value={genderFilter}
                onChange={(v) =>
                  onGenderFilterChange(v as "all" | "Women" | "Men" | "All")
                }
                variant="bordered"
                isActive={genderFilter !== "all"}
                options={[
                  { value: "all", label: "Gender: Any" },
                  { value: "Women", label: "Gender: Women" },
                  { value: "Men", label: "Gender: Men" },
                  { value: "All", label: "Gender: All Genders" },
                ]}
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="w-24 text-[12.5px] font-medium text-[#64748B]">
                Creative
              </span>
              <FlakeSelect
                ariaLabel="Platform filter"
                value={platformFilter}
                onChange={onPlatformFilterChange}
                variant="bordered"
                isActive={platformFilter !== "all"}
                options={[
                  { value: "all", label: "Platform: All" },
                  { value: "Facebook", label: "Platform: Facebook" },
                  { value: "Instagram", label: "Platform: Instagram" },
                  { value: "Audience Network", label: "Platform: Audience Network" },
                  { value: "Messenger", label: "Platform: Messenger" },
                ]}
              />
              <FlakeSelect
                ariaLabel="Format filter"
                value={mediaFilter}
                onChange={(v) =>
                  onMediaFilterChange(
                    v as "all" | "video" | "image" | "carousel"
                  )
                }
                variant="bordered"
                isActive={mediaFilter !== "all"}
                options={[
                  { value: "all", label: "Format: All" },
                  { value: "video", label: "Format: Video" },
                  { value: "image", label: "Format: Image" },
                  { value: "carousel", label: "Format: Carousel" },
                ]}
              />
              <FlakeSelect
                ariaLabel="Brand filter"
                value={brandFilter}
                onChange={onBrandFilterChange}
                variant="bordered"
                isActive={brandFilter !== "all"}
                options={[
                  { value: "all", label: "Brand: All" },
                  ...brands.map((b) => ({ value: b.id, label: b.name })),
                ]}
              />
              <FlakeSelect
                ariaLabel="Minimum reach filter"
                value={minReachFilter}
                onChange={(v) =>
                  onMinReachFilterChange(
                    v as "all" | "10k" | "50k" | "100k" | "500k"
                  )
                }
                variant="bordered"
                isActive={minReachFilter !== "all"}
                options={[
                  { value: "all", label: "Min Reach: Any" },
                  { value: "10k", label: "Min Reach: 10K+" },
                  { value: "50k", label: "Min Reach: 50K+" },
                  { value: "100k", label: "Min Reach: 100K+" },
                  { value: "500k", label: "Min Reach: 500K+" },
                ]}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ============================================================================
   2. ADVERTISERS VIEW (/workspace/advertisers) — ATRIA step_36.png 1:1
   ============================================================================ */

export interface AdvertisersViewProps {
  brands: Brand[];
  ads: Ad[];
  followedBrandIds: string[];
  onToggleFollow: (id: string) => void;
  onOpenBrand: (brandId: string) => void;
  onCloneAd?: (ad: Ad) => void;
}

interface UnifiedAdvertiserRow {
  id: string;
  name: string;
  domain: string;
  industry: string;
  avatarUrl?: string;
  initials: string;
  avatarColor: string;
  fbFollowers: string;
  fbFollowersNum: number;
  igFollowers: string;
  igFollowersNum: number;
  newAds30d: number;
  growthPct: number;
  activeAds: number;
  totalAds: number;
  isTracked: boolean;
  topAd?: Ad;
}

type AdvertiserSortKey =
  | "recommended"
  | "followers"
  | "new_ads_30d"
  | "active_ads"
  | "total_ads";

const ADVERTISER_SORT_OPTIONS: Array<{ value: AdvertiserSortKey; label: string }> = [
  { value: "recommended", label: "Recommended" },
  { value: "followers", label: "Most followers" },
  { value: "new_ads_30d", label: "Most new ads (30d)" },
  { value: "active_ads", label: "Most active ads" },
  { value: "total_ads", label: "Most total ads" },
];

function formatCompactCount(num?: number): string {
  if (!num || num <= 0) return "—";
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `${Math.round(num / 1_000)}K`;
  return String(num);
}

function parseCompactCount(str: string): number {
  const clean = str.trim().toUpperCase();
  if (!clean || clean === "—") return 0;
  const num = parseFloat(clean.replace(/[^0-9.]/g, ""));
  if (!Number.isFinite(num)) return 0;
  if (clean.endsWith("M")) return num * 1_000_000;
  if (clean.endsWith("K")) return num * 1_000;
  return num;
}

export function AdvertisersView({
  brands,
  ads,
  followedBrandIds,
  onToggleFollow,
  onOpenBrand,
  onCloneAd,
}: AdvertisersViewProps) {
  const [search, setSearch] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(true);
  const [sortBy, setSortBy] = useState<AdvertiserSortKey>("recommended");
  const [industryFilter, setIndustryFilter] = useState("all");
  const [activeAdsMin, setActiveAdsMin] = useState<number | null>(null);
  const [platformFilter, setPlatformFilter] = useState<"all" | "Meta" | "TikTok">("all");
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [newViewTip, setNewViewTip] = useState(false);

  const sortBtnRef = useRef<HTMLButtonElement | null>(null);
  const industryBtnRef = useRef<HTMLButtonElement | null>(null);
  const platformBtnRef = useRef<HTMLButtonElement | null>(null);
  const activeAdsBtnRef = useRef<HTMLButtonElement | null>(null);

  const rows: UnifiedAdvertiserRow[] = useMemo(() => {
    const adsByBrand = new Map<string, Ad[]>();
    for (const ad of ads) {
      const list = adsByBrand.get(ad.brand_id) || [];
      list.push(ad);
      adsByBrand.set(ad.brand_id, list);
    }

    const seenNames = new Set<string>();
    const trackedRows: UnifiedAdvertiserRow[] = brands.map((b) => {
      seenNames.add(b.name.toLowerCase());
      const brandAds = adsByBrand.get(b.id) || [];
      const activeFromAds = brandAds.filter((a) => a.is_active).length;
      const totalAds = Math.max(brandAds.length, b.active_ads_count ?? 0);
      const activeAds = Math.max(activeFromAds, b.active_ads_count ?? 0);
      const newAds30d = brandAds.filter(
        (a) => getActiveDays(a.started_running_at) <= 30
      ).length;
      const growthPct =
        totalAds > 0
          ? Math.max(8, Math.round((newAds30d / Math.max(1, totalAds)) * 100))
          : 12;

      let domain = b.website_url || "";
      try {
        domain = new URL(
          domain.startsWith("http") ? domain : `https://${domain}`
        ).hostname.replace(/^www\./i, "");
      } catch {
        domain = b.handle.replace(/^@/, "") + ".com";
      }

      const sortedBrandAds = [...brandAds].sort(
        (a, c) => (c.eu_reach ?? 0) - (a.eu_reach ?? 0)
      );

      return {
        id: b.id,
        name: b.name,
        domain,
        industry: b.category || "DTC Brand",
        avatarUrl: b.logo_url,
        initials: b.avatar_initials,
        avatarColor: b.avatar_color || "#0F172A",
        fbFollowers: formatCompactCount(b.fb_likes),
        fbFollowersNum: b.fb_likes ?? 0,
        igFollowers: formatCompactCount(b.ig_followers),
        igFollowersNum: b.ig_followers ?? 0,
        newAds30d,
        growthPct,
        activeAds,
        totalAds,
        isTracked: true,
        topAd: sortedBrandAds[0],
      };
    });

    const placeholderRows: UnifiedAdvertiserRow[] =
      ATRIA_ADVERTISERS_PLACEHOLDERS.filter(
        (p) => !seenNames.has(p.name.toLowerCase())
      ).map((p: AtriaAdvertiserPlaceholder) => ({
        id: p.id,
        name: p.name,
        domain: p.domain,
        industry: p.industry,
        avatarUrl: LOCAL_ADVERTISER_AVATARS[p.id] || p.avatarUrl,
        initials: p.name
          .split(" ")
          .map((w) => w[0])
          .join("")
          .slice(0, 2)
          .toUpperCase(),
        avatarColor: "#0F172A",
        fbFollowers: p.fbFollowers,
        fbFollowersNum: parseCompactCount(p.fbFollowers),
        igFollowers: p.igFollowers,
        igFollowersNum: parseCompactCount(p.igFollowers),
        newAds30d: p.newAds30d,
        growthPct: p.growthPct,
        activeAds: p.activeAds,
        totalAds: p.totalAds,
        isTracked: false,
      }));

    return [...trackedRows, ...placeholderRows];
  }, [brands, ads]);

  const industries = useMemo(
    () => Array.from(new Set(rows.map((r) => r.industry))),
    [rows]
  );

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = rows.filter((r) => {
      if (
        q &&
        !r.name.toLowerCase().includes(q) &&
        !r.domain.toLowerCase().includes(q) &&
        !r.industry.toLowerCase().includes(q)
      ) {
        return false;
      }
      if (industryFilter !== "all" && r.industry !== industryFilter) {
        return false;
      }
      if (activeAdsMin !== null && r.activeAds < activeAdsMin) {
        return false;
      }
      if (platformFilter === "TikTok" && r.isTracked) {
        return false;
      }
      return true;
    });

    return [...list].sort((a, b) => {
      if (sortBy === "followers") {
        return (
          b.fbFollowersNum +
          b.igFollowersNum -
          (a.fbFollowersNum + a.igFollowersNum)
        );
      }
      if (sortBy === "new_ads_30d") return b.newAds30d - a.newAds30d;
      if (sortBy === "active_ads") return b.activeAds - a.activeAds;
      if (sortBy === "total_ads") return b.totalAds - a.totalAds;
      return 0;
    });
  }, [rows, search, industryFilter, activeAdsMin, platformFilter, sortBy]);

  const activeFilterCount =
    (industryFilter !== "all" ? 1 : 0) +
    (activeAdsMin !== null ? 1 : 0) +
    (platformFilter !== "all" ? 1 : 0);

  const activeSortLabel =
    ADVERTISER_SORT_OPTIONS.find((o) => o.value === sortBy)?.label ||
    "Recommended";

  const pillClass = (isActive: boolean) =>
    `inline-flex h-7 select-none items-center gap-1.5 rounded-[6px] border px-2.5 text-[12.5px] font-medium transition-colors ${
      isActive
        ? "border-[#0027eb] bg-[#EEF2FF] text-[#0027eb]"
        : "border-[#ebebf3] bg-white text-[#0F172A] hover:border-[#d6d6e0]"
    }`;

  return (
    <div className="animate-view-in space-y-4">
      {/* WHITE TOP HEADER (SINGLE-ROW TOP BAR + TOOLBAR + 2-ROW FILTER BOX — step_36.png) */}
      <div className="-mx-3.5 border-b border-[#ebebf3] bg-white px-4 pb-3.5 pt-3 sm:-mx-6 sm:px-6 lg:-mx-7 lg:-mt-6">
        {/* Row 1: All advertisers + New view + Gear + Search + Can't find an advertiser? */}
        <div className="flex flex-wrap items-center gap-2 border-b border-[#ebebf3] pb-3">
          <button
            type="button"
            data-no-glass="true"
            onClick={() => {
              setIndustryFilter("all");
              setActiveAdsMin(null);
              setPlatformFilter("all");
              setSearch("");
            }}
            className="inline-flex h-9 items-center justify-center rounded-[8px] bg-[#0027eb] px-3.5 text-[13.5px] font-semibold text-white transition-colors hover:bg-[#001fc2]"
          >
            All advertisers
          </button>

          <button
            type="button"
            data-no-glass="true"
            onClick={() => {
              setNewViewTip(true);
              window.setTimeout(() => setNewViewTip(false), 2600);
            }}
            className="inline-flex h-9 items-center gap-1.5 rounded-[8px] border border-dashed border-[#d6d6e0] bg-white px-3.5 text-[13px] font-medium text-[#0F172A] transition-colors hover:border-[#0027eb]"
          >
            <Plus className="h-3.5 w-3.5 text-[#475569]" />
            <span>New view</span>
          </button>

          <button
            type="button"
            data-no-glass="true"
            aria-label="Manage views"
            title="Manage views"
            onClick={() => {
              setNewViewTip(true);
              window.setTimeout(() => setNewViewTip(false), 2600);
            }}
            className="flex h-9 w-9 items-center justify-center rounded-[8px] text-[#475569] transition-colors hover:bg-black/[0.04]"
          >
            <Settings className="h-4 w-4 text-[#475569]" />
          </button>

          <div className="relative flex h-9 min-w-[220px] max-w-[440px] flex-1 items-center rounded-[8px] border border-[#d6d6e0] bg-white px-3 focus-within:border-[#0027eb] focus-within:ring-2 focus-within:ring-[#0027eb]/12">
            <Search className="mr-2 h-4 w-4 shrink-0 text-[#64748B]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search advertisers"
              className="w-full bg-transparent text-[13.5px] text-[#0F172A] outline-none placeholder:text-[#94A3B8]"
            />
            {search && (
              <button
                type="button"
                data-no-glass="true"
                onClick={() => setSearch("")}
                aria-label="Clear search"
                className="ml-1 text-[#94A3B8] hover:text-[#0F172A]"
              >
                <X className="h-3.5 w-3.5 text-[#64748B]" />
              </button>
            )}
          </div>

          <button
            type="button"
            data-no-glass="true"
            onClick={() => {
              setNewViewTip(true);
              window.setTimeout(() => setNewViewTip(false), 2600);
            }}
            className="ml-auto inline-flex h-8 shrink-0 items-center gap-1.5 rounded-[8px] px-2 text-[13px] font-medium text-[#0F172A] transition-colors hover:bg-black/[0.04] hover:text-[#0027eb]"
          >
            <HelpCircle className="h-4 w-4 text-[#475569]" />
            <span>Can&apos;t find an advertiser?</span>
          </button>
        </div>

        {newViewTip && (
          <p className="mt-2 text-[12px] font-medium text-[#475569]">
            Use the Page and Ads filters below to slice advertisers by platform, industry, or active volume.
          </p>
        )}

        {/* Row 2: Filters Hide + Sort: Recommended */}
        <div className="flex flex-wrap items-center gap-2 pb-2.5 pt-3">
          <button
            type="button"
            data-no-glass="true"
            onClick={() => setFiltersOpen((v) => !v)}
            className="inline-flex h-8 items-center gap-1.5 rounded-[8px] border border-[#ebebf3] bg-white px-3 text-[13px] font-medium text-[#0F172A] hover:border-[#d6d6e0]"
          >
            <Filter className="h-3.5 w-3.5 text-[#64748B]" />
            <span className="font-semibold">Filters</span>
            <span className="text-[12.5px] text-[#64748B]">
              {filtersOpen ? "Hide" : "Show"}
            </span>
            {activeFilterCount > 0 && (
              <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-[#0027eb] px-1 font-mono-num text-[10px] font-bold text-white">
                {activeFilterCount}
              </span>
            )}
            <MicroCaret open={filtersOpen} />
          </button>

          <button
            ref={sortBtnRef}
            type="button"
            data-no-glass="true"
            onClick={() => setOpenMenu(openMenu === "sort" ? null : "sort")}
            className="inline-flex h-8 items-center gap-1.5 rounded-[8px] border border-[#ebebf3] bg-white px-3 text-[13px] font-medium text-[#0F172A] hover:border-[#d6d6e0]"
          >
            <ArrowUpDown className="h-3.5 w-3.5 text-[#64748B]" />
            <span className="text-[#64748B]">Sort:</span>
            <span className="font-semibold text-[#0F172A]">{activeSortLabel}</span>
            <MicroCaret open={openMenu === "sort"} />
          </button>

          <FlakePopover
            open={openMenu === "sort"}
            onOpenChange={(o) => setOpenMenu(o ? "sort" : null)}
            anchorRef={sortBtnRef}
            align="left"
            width={220}
          >
            <div className="p-1.5">
              {ADVERTISER_SORT_OPTIONS.map((opt) => {
                const active = sortBy === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    data-no-glass="true"
                    onClick={() => {
                      setSortBy(opt.value);
                      setOpenMenu(null);
                    }}
                    className={`flex w-full items-center justify-between rounded-[8px] px-2.5 py-2 text-left text-[12.5px] ${
                      active
                        ? "bg-[#f5f5fa] font-semibold text-[#0F172A]"
                        : "font-medium text-[#334155] hover:bg-[#f5f5fa]"
                    }`}
                  >
                    <span>{opt.label}</span>
                    {active && <Check className="h-3.5 w-3.5 text-[#0F172A]" />}
                  </button>
                );
              })}
            </div>
          </FlakePopover>

          {activeFilterCount > 0 && (
            <button
              type="button"
              data-no-glass="true"
              onClick={() => {
                setIndustryFilter("all");
                setActiveAdsMin(null);
                setPlatformFilter("all");
              }}
              className="ml-1 text-[12.5px] font-medium text-[#475569] hover:text-[#0F172A]"
            >
              Clear all
            </button>
          )}
        </div>

        {/* Row 3: 2-Row #f5f5fa Filter Box (Page + Ads) */}
        {filtersOpen && (
          <div className="space-y-2 rounded-[10px] bg-[#f5f5fa] px-4 py-3">
            {/* Page Row */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="w-[46px] shrink-0 text-[12.5px] font-medium text-[#64748B]">
                Page
              </span>

              <button
                ref={platformBtnRef}
                type="button"
                data-no-glass="true"
                onClick={() =>
                  setOpenMenu(openMenu === "platform" ? null : "platform")
                }
                className={pillClass(platformFilter !== "all")}
              >
                <span>
                  {platformFilter === "all"
                    ? "Platform"
                    : `Platform: ${platformFilter}`}
                </span>
                <MicroCaret open={openMenu === "platform"} />
              </button>

              <FlakePopover
                open={openMenu === "platform"}
                onOpenChange={(o) => setOpenMenu(o ? "platform" : null)}
                anchorRef={platformBtnRef}
                align="left"
                width={200}
              >
                <div className="p-1.5">
                  {(["all", "Meta", "TikTok"] as const).map((p) => (
                    <button
                      key={p}
                      type="button"
                      data-no-glass="true"
                      onClick={() => {
                        setPlatformFilter(p);
                        setOpenMenu(null);
                      }}
                      className={`flex w-full items-center justify-between rounded-[8px] px-2.5 py-2 text-left text-[12.5px] ${
                        platformFilter === p
                          ? "bg-[#f5f5fa] font-semibold text-[#0F172A]"
                          : "font-medium text-[#334155] hover:bg-[#f5f5fa]"
                      }`}
                    >
                      <span>{p === "all" ? "All platforms" : p}</span>
                      {platformFilter === p && (
                        <Check className="h-3.5 w-3.5 text-[#0F172A]" />
                      )}
                    </button>
                  ))}
                </div>
              </FlakePopover>

              <button
                ref={industryBtnRef}
                type="button"
                data-no-glass="true"
                onClick={() =>
                  setOpenMenu(openMenu === "industry" ? null : "industry")
                }
                className={pillClass(industryFilter !== "all")}
              >
                <span>
                  {industryFilter === "all"
                    ? "Industry"
                    : `Industry: ${industryFilter}`}
                </span>
                <MicroCaret open={openMenu === "industry"} />
              </button>

              <FlakePopover
                open={openMenu === "industry"}
                onOpenChange={(o) => setOpenMenu(o ? "industry" : null)}
                anchorRef={industryBtnRef}
                align="left"
                width={230}
                maxHeight={280}
              >
                <div className="workspace-scroll overflow-y-auto p-1.5">
                  <button
                    type="button"
                    data-no-glass="true"
                    onClick={() => {
                      setIndustryFilter("all");
                      setOpenMenu(null);
                    }}
                    className={`flex w-full items-center justify-between rounded-[8px] px-2.5 py-2 text-left text-[12.5px] ${
                      industryFilter === "all"
                        ? "bg-[#f5f5fa] font-semibold text-[#0F172A]"
                        : "font-medium text-[#334155] hover:bg-[#f5f5fa]"
                    }`}
                  >
                    <span>All industries</span>
                    {industryFilter === "all" && (
                      <Check className="h-3.5 w-3.5 text-[#0F172A]" />
                    )}
                  </button>
                  {industries.map((ind) => (
                    <button
                      key={ind}
                      type="button"
                      data-no-glass="true"
                      onClick={() => {
                        setIndustryFilter(ind);
                        setOpenMenu(null);
                      }}
                      className={`flex w-full items-center justify-between rounded-[8px] px-2.5 py-2 text-left text-[12.5px] ${
                        industryFilter === ind
                          ? "bg-[#f5f5fa] font-semibold text-[#0F172A]"
                          : "font-medium text-[#334155] hover:bg-[#f5f5fa]"
                      }`}
                    >
                      <span className="truncate">{ind}</span>
                      {industryFilter === ind && (
                        <Check className="h-3.5 w-3.5 text-[#0F172A]" />
                      )}
                    </button>
                  ))}
                </div>
              </FlakePopover>

              <button
                type="button"
                data-no-glass="true"
                onClick={() => setSortBy("followers")}
                className={pillClass(sortBy === "followers")}
              >
                <span>Followers</span>
                <MicroCaret />
              </button>

              <button
                type="button"
                data-no-glass="true"
                onClick={() => setSortBy("recommended")}
                className={pillClass(false)}
              >
                <span>Page created</span>
                <MicroCaret />
              </button>
            </div>

            {/* Ads Row */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="w-[46px] shrink-0 text-[12.5px] font-medium text-[#64748B]">
                Ads
              </span>

              <button
                type="button"
                data-no-glass="true"
                className={pillClass(false)}
              >
                <span>Country</span>
                <MicroCaret />
              </button>

              <button
                ref={activeAdsBtnRef}
                type="button"
                data-no-glass="true"
                onClick={() =>
                  setOpenMenu(openMenu === "active_ads" ? null : "active_ads")
                }
                className={pillClass(activeAdsMin !== null)}
              >
                <span>
                  {activeAdsMin !== null
                    ? `Active ads: ≥${activeAdsMin}`
                    : "Active ads"}
                </span>
                <MicroCaret open={openMenu === "active_ads"} />
              </button>

              <FlakePopover
                open={openMenu === "active_ads"}
                onOpenChange={(o) => setOpenMenu(o ? "active_ads" : null)}
                anchorRef={activeAdsBtnRef}
                align="left"
                width={210}
              >
                <div className="p-1.5">
                  {[
                    { label: "Any active ads", val: null },
                    { label: "≥ 50 active ads", val: 50 },
                    { label: "≥ 100 active ads", val: 100 },
                    { label: "≥ 250 active ads", val: 250 },
                  ].map((opt) => (
                    <button
                      key={opt.label}
                      type="button"
                      data-no-glass="true"
                      onClick={() => {
                        setActiveAdsMin(opt.val);
                        setOpenMenu(null);
                      }}
                      className={`flex w-full items-center justify-between rounded-[8px] px-2.5 py-2 text-left text-[12.5px] ${
                        activeAdsMin === opt.val
                          ? "bg-[#f5f5fa] font-semibold text-[#0F172A]"
                          : "font-medium text-[#334155] hover:bg-[#f5f5fa]"
                      }`}
                    >
                      <span>{opt.label}</span>
                      {activeAdsMin === opt.val && (
                        <Check className="h-3.5 w-3.5 text-[#0F172A]" />
                      )}
                    </button>
                  ))}
                </div>
              </FlakePopover>

              <button
                type="button"
                data-no-glass="true"
                onClick={() => setSortBy("new_ads_30d")}
                className={pillClass(sortBy === "new_ads_30d")}
              >
                <span>Ads launched</span>
                <MicroCaret />
              </button>

              <button
                type="button"
                data-no-glass="true"
                className={pillClass(false)}
              >
                <span>Language</span>
                <MicroCaret />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 6-COLUMN ATRIA ADVERTISERS TABLE (BLACK HEADERS) */}
      <div className="overflow-hidden rounded-[12px] border border-[#ebebf3] bg-white">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[780px] border-collapse text-left">
            <thead>
              <tr className="border-b border-[#ebebf3] bg-white text-[13px] font-semibold text-[#0F172A]">
                <th className="px-5 py-3">Advertiser</th>
                <th className="px-4 py-3">
                  <button
                    type="button"
                    data-no-glass="true"
                    onClick={() => setSortBy("followers")}
                    className="inline-flex items-center gap-1 font-semibold text-[#0F172A]"
                  >
                    <span>Followers</span>
                    <ArrowUpDown className="h-3.5 w-3.5 text-[#94A3B8]" />
                  </button>
                </th>
                <th className="px-4 py-3">
                  <button
                    type="button"
                    data-no-glass="true"
                    onClick={() => setSortBy("new_ads_30d")}
                    className="inline-flex items-center gap-1 font-semibold text-[#0F172A]"
                  >
                    <span>New ads (30d)</span>
                    <Info className="h-3.5 w-3.5 text-[#94A3B8]" />
                    <ArrowUpDown className="h-3.5 w-3.5 text-[#94A3B8]" />
                  </button>
                </th>
                <th className="px-4 py-3">
                  <button
                    type="button"
                    data-no-glass="true"
                    onClick={() => setSortBy("active_ads")}
                    className="inline-flex items-center gap-1 font-semibold text-[#0F172A]"
                  >
                    <span>Active ads</span>
                    <Info className="h-3.5 w-3.5 text-[#94A3B8]" />
                    <ArrowUpDown className="h-3.5 w-3.5 text-[#94A3B8]" />
                  </button>
                </th>
                <th className="px-4 py-3">
                  <button
                    type="button"
                    data-no-glass="true"
                    onClick={() => setSortBy("total_ads")}
                    className="inline-flex items-center gap-1 font-semibold text-[#0F172A]"
                  >
                    <span>Total ads</span>
                    <ArrowUpDown className="h-3.5 w-3.5 text-[#94A3B8]" />
                  </button>
                </th>
                <th className="px-5 py-3 text-right">Follow</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#ebebf3]">
              {filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-14 text-center">
                    <p className="font-sans text-sm font-semibold text-[#0F172A]">
                      No advertisers match your filters
                    </p>
                    <p className="mt-1 text-xs text-[#64748B]">
                      Try clearing the search query or switching industry filters.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredRows.map((row) => {
                  const following = followedBrandIds.includes(row.id);
                  return (
                    <tr
                      key={row.id}
                      className="transition-colors hover:bg-[#f5f5fa]/65"
                    >
                      {/* Col 1: Advertiser (40x40 avatar + tiny Meta badge + bold name + Meta · Industry) */}
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            data-no-glass="true"
                            onClick={() => {
                              if (row.isTracked) onOpenBrand(row.id);
                            }}
                            className={`flex min-w-0 items-center gap-3 text-left ${
                              row.isTracked ? "cursor-pointer" : "cursor-default"
                            }`}
                          >
                            <div className="relative h-10 w-10 shrink-0">
                              {row.avatarUrl ? (
                                /* eslint-disable-next-line @next/next/no-img-element */
                                <img
                                  src={row.avatarUrl}
                                  alt={row.name}
                                  className="h-10 w-10 rounded-full border border-[#ebebf3] bg-white object-cover"
                                />
                              ) : (
                                <span
                                  className="flex h-10 w-10 items-center justify-center rounded-full font-display text-xs font-bold text-white"
                                  style={{ backgroundColor: row.avatarColor }}
                                >
                                  {row.initials}
                                </span>
                              )}
                              <span className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full border border-[#ebebf3] bg-white shadow-2xs">
                                <MetaInfinityIcon className="h-2.5 w-2.5" />
                              </span>
                            </div>

                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="truncate font-sans text-[13.5px] font-semibold text-[#0F172A]">
                                  {row.name}
                                </span>
                                {row.isTracked && (
                                  <ExternalLink className="h-3 w-3 shrink-0 text-[#94A3B8]" />
                                )}
                              </div>
                              <p className="truncate text-[12px] text-[#64748B]">
                                Meta &middot; {row.industry}
                              </p>
                            </div>
                          </button>

                          {onCloneAd && row.topAd && (
                            <button
                              type="button"
                              data-no-glass="true"
                              title={`Clone top ad from ${row.name}`}
                              onClick={() => onCloneAd(row.topAd!)}
                              className="ml-auto hidden items-center gap-1 rounded-[6px] border border-[#ebebf3] bg-white px-2 py-1 text-[11.5px] font-medium text-[#0F172A] transition-colors hover:border-[#d6d6e0] hover:bg-[#f5f5fa] xl:inline-flex"
                            >
                              <Sparkles className="h-3 w-3 text-[#475569]" />
                              Clone
                            </button>
                          )}
                        </div>
                      </td>

                      {/* Col 2: Followers (FB + IG inline icons matching step_36.png) */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-3 font-mono-num text-[13px] font-medium text-[#0F172A]">
                          <span className="inline-flex items-center gap-1.5">
                            <FacebookColorIcon className="h-4 w-4 shrink-0" />
                            <span>{row.fbFollowers}</span>
                          </span>
                          <span className="inline-flex items-center gap-1.5">
                            <InstagramColorIcon className="h-4 w-4 shrink-0" />
                            <span>{row.igFollowers}</span>
                          </span>
                        </div>
                      </td>

                      {/* Col 3: New ads (30d) + soft green ↑ X% pill */}
                      <td className="px-4 py-3.5">
                        <div className="inline-flex items-center gap-2 font-mono-num">
                          <span className="text-[13.5px] font-medium text-[#0F172A]">
                            {row.newAds30d.toLocaleString("en-US")}
                          </span>
                          <span className="rounded bg-[#ECFDF3] px-1.5 py-0.5 text-[11.5px] font-semibold text-[#15803D]">
                            ↑ {row.growthPct}%
                          </span>
                        </div>
                      </td>

                      {/* Col 4: Active ads */}
                      <td className="px-4 py-3.5 font-mono-num text-[13.5px] font-medium text-[#0F172A]">
                        {row.activeAds.toLocaleString("en-US")}
                      </td>

                      {/* Col 5: Total ads */}
                      <td className="px-4 py-3.5 font-mono-num text-[13.5px] font-medium text-[#0F172A]">
                        {row.totalAds.toLocaleString("en-US")}
                      </td>

                      {/* Col 6: Follow / Following */}
                      <td className="px-5 py-3.5 text-right">
                        <button
                          type="button"
                          data-no-glass="true"
                          onClick={() => onToggleFollow(row.id)}
                          className={`inline-flex h-8 items-center gap-1.5 rounded-[8px] px-3.5 text-[12.5px] font-semibold transition-colors ${
                            following
                              ? "border border-[#d6d6e0] bg-[#f5f5fa] text-[#0F172A] hover:bg-[#ECECF4]"
                              : "bg-[#0027eb] text-white hover:bg-[#001fc2]"
                          }`}
                        >
                          {following ? (
                            <>
                              <Check className="h-3.5 w-3.5 text-[#475569]" />
                              Following
                            </>
                          ) : (
                            <>
                              <Plus className="h-3.5 w-3.5 text-white" />
                              Follow
                            </>
                          )}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* ============================================================================
   3. TOP PICKS VIEW (/workspace/collection) — ATRIA step_38.png 1:1
   ============================================================================ */

export interface TopPicksViewProps {
  onCloneCollectionToStudio: (col: AtriaCollectionPlaceholder) => void;
  onBrowseAds?: () => void;
}

export function TopPicksView({
  onCloneCollectionToStudio,
  onBrowseAds,
}: TopPicksViewProps) {
  const [previewCol, setPreviewCol] = useState<AtriaCollectionPlaceholder | null>(
    null
  );

  return (
    <div className="animate-view-in">
      {/* WHITE STICKY HEADER WITH 3-STEP HORIZONTAL FLOW (step_38.png) */}
      <div className="-mx-3.5 border-b border-[#ebebf3] bg-white px-6 py-5 sm:-mx-6 lg:-mx-7 lg:-mt-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="font-sans text-[22px] font-bold tracking-tight text-[#0F172A]">
              Top Picks with Canva templates
            </h1>
            <p className="mt-1 text-[13.5px] text-[#475569]">
              Create winning ads from 500+ templates. New templates are added
              frequently.
            </p>
          </div>

          {onBrowseAds && (
            <button
              type="button"
              data-no-glass="true"
              onClick={onBrowseAds}
              className="inline-flex h-8 items-center gap-1.5 rounded-[8px] border border-[#d6d6e0] bg-white px-3.5 text-[12.5px] font-medium text-[#0F172A] transition-colors hover:bg-[#f5f5fa]"
            >
              <span>Browse Ads</span>
              <ArrowUpRight className="h-3.5 w-3.5 text-[#475569]" />
            </button>
          )}
        </div>

        {/* 3-Step Horizontal Flow */}
        <div className="mt-4 flex flex-wrap items-center gap-3.5 text-[13px] font-medium text-[#0F172A]">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] bg-[#EEF2FF]">
              <ImageIcon className="h-4 w-4 text-[#0F172A]" />
            </span>
            <span className="max-w-[140px] leading-snug">
              Click an ad you like
            </span>
          </div>

          <ArrowRight className="h-4 w-4 shrink-0 text-[#94A3B8]" />

          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] bg-[#EEF2FF]">
              <LayoutGrid className="h-4 w-4 text-[#0F172A]" />
            </span>
            <span className="max-w-[205px] leading-snug">
              Click &ldquo;Edit in template&rdquo; to open Canva template
            </span>
          </div>

          <ArrowRight className="h-4 w-4 shrink-0 text-[#94A3B8]" />

          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] bg-[#EEF2FF]">
              <Sparkles className="h-4 w-4 text-[#0F172A]" />
            </span>
            <span className="max-w-[215px] leading-snug">
              Click &ldquo;Make ad copy&rdquo; to make ad copy using AI
            </span>
          </div>
        </div>
      </div>

      {/* HORIZONTAL FULL-WIDTH COLLECTION CARDS ON #f5f5fa CANVAS */}
      <div className="mt-5 space-y-3.5">
        {ATRIA_TOP_PICKS_COLLECTIONS.map((col) => {
          const thumbSrc = resolveCollectionThumb(col);
          const cleanTitle = sanitizeCollectionTitle(col);
          return (
            <article
              key={col.id}
              className="flex flex-col items-stretch gap-5 rounded-[12px] border border-[#ebebf3] bg-white p-4 transition-colors hover:border-[#d6d6e0] sm:flex-row"
            >
              {/* 128x128 Square Collection Thumbnail */}
              <div className="h-[128px] w-full shrink-0 overflow-hidden rounded-[10px] border border-[#ebebf3] bg-[#f5f5fa] sm:w-[128px]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={thumbSrc}
                  alt={cleanTitle}
                  loading="lazy"
                  className="h-full w-full object-cover"
                />
              </div>

              {/* Right Details + Bottom-Right Buttons */}
              <div className="flex min-w-0 flex-1 flex-col justify-between">
                <div>
                  <h2 className="font-sans text-[15px] font-bold text-[#0F172A]">
                    {cleanTitle}
                  </h2>
                  <p className="mt-0.5 font-mono-num text-[12.5px] text-[#64748B]">
                    {col.adCount} Ads | {col.templateCount} Templates
                  </p>
                  <p className="mt-1.5 text-[13px] leading-relaxed text-[#475569]">
                    {col.description}
                  </p>
                </div>

                <div className="mt-3 flex flex-wrap items-center justify-end gap-2">
                  <button
                    type="button"
                    data-no-glass="true"
                    onClick={() => setPreviewCol({ ...col, title: cleanTitle, thumbnailUrl: thumbSrc })}
                    className="inline-flex h-8 items-center justify-center rounded-[8px] border border-[#d6d6e0] bg-white px-4 text-[13px] font-medium text-[#0F172A] transition-colors hover:bg-[#f5f5fa]"
                  >
                    Preview
                  </button>

                  <button
                    type="button"
                    data-no-glass="true"
                    onClick={() =>
                      onCloneCollectionToStudio({
                        ...col,
                        title: cleanTitle,
                        thumbnailUrl: thumbSrc,
                      })
                    }
                    className="inline-flex h-8 items-center justify-center gap-1.5 rounded-[8px] bg-[#0027eb] px-4 text-[13px] font-semibold text-white transition-colors hover:bg-[#001fc2]"
                  >
                    <Sparkles className="h-3.5 w-3.5 text-white" />
                    <span>Clone templates</span>
                  </button>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      {/* Preview Modal */}
      {previewCol && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Preview ${previewCol.title}`}
          onClick={() => setPreviewCol(null)}
          className="flake-modal-backdrop z-[130] flex items-center justify-center bg-[#050811]/65 p-4 backdrop-blur-xs"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="animate-sheet-up w-full max-w-2xl overflow-hidden rounded-[16px] border border-[#ebebf3] bg-white shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-[#ebebf3] px-5 py-4">
              <div className="min-w-0">
                <span className="inline-block rounded-full bg-[#EEF2FF] px-2.5 py-0.5 text-[11px] font-semibold text-[#0027eb]">
                  {previewCol.category}
                </span>
                <h3 className="mt-1 truncate font-sans text-lg font-bold text-[#0F172A]">
                  {previewCol.title}
                </h3>
              </div>

              <button
                type="button"
                data-no-glass="true"
                onClick={() => setPreviewCol(null)}
                aria-label="Close preview"
                className="flex h-8 w-8 items-center justify-center rounded-[8px] text-[#64748B] hover:bg-[#f5f5fa] hover:text-[#0F172A]"
              >
                <X className="h-4 w-4 text-[#64748B]" />
              </button>
            </div>

            <div className="space-y-4 p-5">
              <div className="overflow-hidden rounded-[12px] border border-[#ebebf3] bg-[#f5f5fa]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={previewCol.thumbnailUrl}
                  alt={previewCol.title}
                  className="max-h-[340px] w-full object-cover"
                />
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 rounded-[10px] bg-[#f5f5fa] px-4 py-3">
                <span className="font-mono-num text-[12.5px] font-semibold text-[#0F172A]">
                  {previewCol.adCount} Ads | {previewCol.templateCount} Templates
                </span>
                {previewCol.badge && (
                  <span className="rounded-full bg-[#050811] px-2.5 py-0.5 text-[11px] font-semibold text-white">
                    {previewCol.badge}
                  </span>
                )}
              </div>

              <p className="text-[13.5px] leading-relaxed text-[#475569]">
                {previewCol.description}
              </p>
            </div>

            <div className="flex items-center justify-end gap-2.5 border-t border-[#ebebf3] bg-white px-5 py-3.5">
              <button
                type="button"
                data-no-glass="true"
                onClick={() => setPreviewCol(null)}
                className="h-9 rounded-[8px] border border-[#d6d6e0] bg-white px-4 text-[13px] font-medium text-[#0F172A] hover:bg-[#f5f5fa]"
              >
                Close
              </button>
              <button
                type="button"
                data-no-glass="true"
                onClick={() => {
                  const chosen = previewCol;
                  setPreviewCol(null);
                  onCloneCollectionToStudio(chosen);
                }}
                className="inline-flex h-9 items-center gap-1.5 rounded-[8px] bg-[#0027eb] px-4 text-[13px] font-semibold text-white hover:bg-[#001fc2]"
              >
                <Sparkles className="h-3.5 w-3.5 text-white" />
                Clone templates
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ============================================================================
   4. FOLLOWING VIEW (/workspace/following/brands) — ATRIA step_40.png 1:1
   ============================================================================ */

export interface FollowingViewProps {
  brands: Brand[];
  ads: Ad[];
  followedBrandIds: string[];
  onToggleFollow: (id: string) => void;
  onOpenBrand: (brandId: string) => void;
  onBrowseBrands: () => void;
}

export function FollowingView({
  brands,
  ads,
  followedBrandIds,
  onToggleFollow,
  onOpenBrand,
  onBrowseBrands,
}: FollowingViewProps) {
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<"card" | "table">("card");
  const [sortBy, setSortBy] = useState<"latest" | "active_ads" | "alpha">(
    "latest"
  );

  const followedItems = useMemo(() => {
    const brandMap = new Map(brands.map((b) => [b.id, b]));
    const placeholderMap = new Map(
      ATRIA_ADVERTISERS_PLACEHOLDERS.map((p) => [p.id, p])
    );

    const adsByBrand = new Map<string, Ad[]>();
    for (const ad of ads) {
      const list = adsByBrand.get(ad.brand_id) || [];
      list.push(ad);
      adsByBrand.set(ad.brand_id, list);
    }

    const list = followedBrandIds
      .map((id, orderIdx) => {
        const b = brandMap.get(id);
        if (b) {
          const brandAds = adsByBrand.get(b.id) || [];
          const activeAds = Math.max(
            brandAds.filter((a) => a.is_active).length,
            b.active_ads_count ?? 0
          );
          let domain = b.website_url || "";
          try {
            domain = new URL(
              domain.startsWith("http") ? domain : `https://${domain}`
            ).hostname.replace(/^www\./i, "");
          } catch {
            domain = b.handle;
          }
          return {
            id: b.id,
            name: b.name,
            domain,
            category: b.category || "Brand",
            avatarUrl: b.logo_url,
            initials: b.avatar_initials,
            avatarColor: b.avatar_color || "#0F172A",
            activeAds,
            totalAds: Math.max(brandAds.length, activeAds),
            isTracked: true,
            orderIdx,
          };
        }

        const p = placeholderMap.get(id);
        if (p) {
          return {
            id: p.id,
            name: p.name,
            domain: p.domain,
            category: p.industry,
            avatarUrl: LOCAL_ADVERTISER_AVATARS[p.id] || p.avatarUrl,
            initials: p.name.slice(0, 2).toUpperCase(),
            avatarColor: "#0F172A",
            activeAds: p.activeAds,
            totalAds: p.totalAds,
            isTracked: false,
            orderIdx,
          };
        }

        return null;
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);

    const q = search.trim().toLowerCase();
    const filtered = q
      ? list.filter(
          (item) =>
            item.name.toLowerCase().includes(q) ||
            item.domain.toLowerCase().includes(q) ||
            item.category.toLowerCase().includes(q)
        )
      : list;

    return [...filtered].sort((a, b) => {
      if (sortBy === "active_ads") return b.activeAds - a.activeAds;
      if (sortBy === "alpha") return a.name.localeCompare(b.name);
      return b.orderIdx - a.orderIdx;
    });
  }, [brands, ads, followedBrandIds, search, sortBy]);

  const followQuota = 10;
  const usedCount = followedBrandIds.length;
  const progressPct = Math.min(100, Math.round((usedCount / followQuota) * 100));

  return (
    <div className="animate-view-in">
      {/* WHITE TOP BAR + SUB-TOOLBAR (step_40.png 1:1) */}
      <div className="-mx-3.5 border-b border-[#ebebf3] bg-white sm:-mx-6 lg:-mx-7 lg:-mt-6">
        {/* Row 1: Following + Search + Quota Widget */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#ebebf3] px-6 py-3.5">
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-5">
            <h1 className="font-sans text-[20px] font-bold tracking-tight text-[#0F172A]">
              Following
            </h1>

            <div className="relative flex h-9 w-full max-w-[440px] items-center rounded-[8px] border border-[#d6d6e0] bg-white px-3 focus-within:border-[#0027eb] focus-within:ring-2 focus-within:ring-[#0027eb]/12">
              <Search className="mr-2 h-4 w-4 shrink-0 text-[#64748B]" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search your followed brands"
                className="w-full bg-transparent text-[13.5px] text-[#0F172A] outline-none placeholder:text-[#94A3B8]"
              />
              {search && (
                <button
                  type="button"
                  data-no-glass="true"
                  onClick={() => setSearch("")}
                  className="ml-1 text-[#94A3B8] hover:text-[#0F172A]"
                >
                  <X className="h-3.5 w-3.5 text-[#64748B]" />
                </button>
              )}
            </div>
          </div>

          <div className="w-[180px] shrink-0 space-y-1.5">
            <div className="flex items-baseline gap-1 text-[12px]">
              <span className="font-mono-num font-bold text-[#0F172A]">
                {usedCount}/{followQuota}
              </span>
              <span className="text-[#64748B]">brand follows used</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#ECEFF4]">
              <div
                className="h-full rounded-full bg-[#0027eb] transition-all duration-300"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>
        </div>

        {/* Row 2: Card/Table Toggle + Sort + Can't find a brand? */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-6 py-2.5">
          <div className="flex items-center gap-2.5">
            <div className="inline-flex rounded-[8px] border border-[#ebebf3] bg-[#f5f5fa] p-0.5">
              <button
                type="button"
                data-no-glass="true"
                onClick={() => setViewMode("card")}
                aria-label="Card view"
                className={`flex h-7 w-8 items-center justify-center rounded-[6px] transition-colors ${
                  viewMode === "card"
                    ? "bg-white text-[#0F172A] shadow-2xs"
                    : "text-[#64748B] hover:text-[#0F172A]"
                }`}
              >
                <LayoutGrid className="h-3.5 w-3.5 text-[#475569]" />
              </button>
              <button
                type="button"
                data-no-glass="true"
                onClick={() => setViewMode("table")}
                aria-label="Table view"
                className={`flex h-7 w-8 items-center justify-center rounded-[6px] transition-colors ${
                  viewMode === "table"
                    ? "bg-white text-[#0F172A] shadow-2xs"
                    : "text-[#64748B] hover:text-[#0F172A]"
                }`}
              >
                <List className="h-3.5 w-3.5 text-[#475569]" />
              </button>
            </div>

            <FlakeSelect
              ariaLabel="Sort followed brands"
              value={sortBy}
              onChange={(v) => setSortBy(v as "latest" | "active_ads" | "alpha")}
              variant="bordered"
              icon={<ArrowUpDown className="h-3.5 w-3.5 text-[#64748B]" />}
              options={[
                { value: "latest", label: "Sort: Latest followed" },
                { value: "active_ads", label: "Sort: Most active ads" },
                { value: "alpha", label: "Sort: Alphabetical" },
              ]}
            />
          </div>

          <button
            type="button"
            data-no-glass="true"
            onClick={onBrowseBrands}
            className="inline-flex h-8 items-center gap-1.5 rounded-[8px] px-2 text-[13px] font-medium text-[#0F172A] transition-colors hover:bg-black/[0.04] hover:text-[#0027eb]"
          >
            <HelpCircle className="h-4 w-4 text-[#475569]" />
            <span>Can&apos;t find a brand?</span>
          </button>
        </div>
      </div>

      {/* EMPTY STATE OR FOLLOWED BRANDS ON #f5f5fa CANVAS */}
      {followedBrandIds.length === 0 ? (
        <div className="flex flex-col items-center justify-center px-6 py-24 text-center">
          <Heart className="h-12 w-12 stroke-[1.5] text-[#94A3B8]" />
          <h2 className="mt-4 font-sans text-[18px] font-bold text-[#0F172A]">
            You are not following any brands yet
          </h2>
          <p className="mt-1.5 max-w-md text-[13.5px] leading-relaxed text-[#475569]">
            Follow a brand from the Brands list or from any ad card. Its new ads
            land in Ads &rarr; Following.
          </p>
          <button
            type="button"
            data-no-glass="true"
            onClick={onBrowseBrands}
            className="mt-5 inline-flex h-9 items-center justify-center rounded-[8px] bg-[#0027eb] px-5 text-[13.5px] font-semibold text-white transition-colors hover:bg-[#001fc2]"
          >
            Browse brands
          </button>
        </div>
      ) : followedItems.length === 0 ? (
        <div className="mt-5 rounded-[12px] border border-[#ebebf3] bg-white px-6 py-12 text-center">
          <p className="font-sans text-sm font-semibold text-[#0F172A]">
            No followed brands match &ldquo;{search}&rdquo;
          </p>
          <button
            type="button"
            data-no-glass="true"
            onClick={() => setSearch("")}
            className="mt-3 rounded-[8px] border border-[#d6d6e0] bg-white px-3.5 py-1.5 text-xs font-semibold text-[#0F172A] hover:bg-[#f5f5fa]"
          >
            Clear search
          </button>
        </div>
      ) : viewMode === "card" ? (
        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {followedItems.map((item) => (
            <article
              key={item.id}
              className="flex flex-col justify-between rounded-[12px] border border-[#ebebf3] bg-white p-4 transition-colors hover:border-[#d6d6e0]"
            >
              <div className="flex items-start justify-between gap-3">
                <button
                  type="button"
                  data-no-glass="true"
                  onClick={() => {
                    if (item.isTracked) onOpenBrand(item.id);
                  }}
                  className={`flex min-w-0 items-center gap-3 text-left ${
                    item.isTracked ? "cursor-pointer" : "cursor-default"
                  }`}
                >
                  {item.avatarUrl ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={item.avatarUrl}
                      alt={item.name}
                      className="h-10 w-10 shrink-0 rounded-full border border-[#ebebf3] bg-white object-cover"
                    />
                  ) : (
                    <span
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full font-display text-xs font-bold text-white"
                      style={{ backgroundColor: item.avatarColor }}
                    >
                      {item.initials}
                    </span>
                  )}
                  <div className="min-w-0">
                    <h3 className="truncate font-sans text-[14px] font-bold text-[#0F172A]">
                      {item.name}
                    </h3>
                    <p className="truncate text-[12px] text-[#64748B]">
                      {item.domain}
                    </p>
                  </div>
                </button>

                <button
                  type="button"
                  data-no-glass="true"
                  onClick={() => onToggleFollow(item.id)}
                  className="inline-flex shrink-0 items-center gap-1 rounded-[8px] border border-[#d6d6e0] bg-[#f5f5fa] px-3 py-1 text-[11.5px] font-semibold text-[#0F172A] transition-colors hover:bg-[#ECECF4]"
                >
                  <Check className="h-3 w-3 text-[#475569]" />
                  Following
                </button>
              </div>

              <div className="mt-4 flex items-center justify-between border-t border-[#ebebf3] pt-3">
                <div className="flex items-center gap-4 font-mono-num text-[12px]">
                  <span className="inline-flex items-center gap-1.5 font-semibold text-[#0F172A]">
                    <span className="h-2 w-2 rounded-full bg-[#5daa1e] ring-[3px] ring-[#e7ffd3]" />
                    {item.activeAds} active
                  </span>
                  <span className="text-[#64748B]">{item.totalAds} total</span>
                </div>

                {item.isTracked ? (
                  <button
                    type="button"
                    data-no-glass="true"
                    onClick={() => onOpenBrand(item.id)}
                    className="inline-flex items-center gap-1 text-[12px] font-semibold text-[#0027eb] hover:underline"
                  >
                    <span>Open brand</span>
                    <ArrowUpRight className="h-3.5 w-3.5 text-[#475569]" />
                  </button>
                ) : (
                  <span className="rounded bg-[#f5f5fa] px-2 py-0.5 text-[11px] font-medium text-[#64748B]">
                    {item.category}
                  </span>
                )}
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="mt-5 overflow-hidden rounded-[12px] border border-[#ebebf3] bg-white">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px] border-collapse text-left">
              <thead>
                <tr className="border-b border-[#ebebf3] bg-white text-[13px] font-semibold text-[#0F172A]">
                  <th className="px-5 py-3">Brand</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Active ads</th>
                  <th className="px-4 py-3">Total ads</th>
                  <th className="px-5 py-3 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#ebebf3]">
                {followedItems.map((item) => (
                  <tr key={item.id} className="hover:bg-[#f5f5fa]/65">
                    <td className="px-5 py-3">
                      <button
                        type="button"
                        data-no-glass="true"
                        onClick={() => {
                          if (item.isTracked) onOpenBrand(item.id);
                        }}
                        className="flex items-center gap-2.5 text-left"
                      >
                        {item.avatarUrl ? (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img
                            src={item.avatarUrl}
                            alt={item.name}
                            className="h-8 w-8 rounded-full border border-[#ebebf3] object-cover"
                          />
                        ) : (
                          <span
                            className="flex h-8 w-8 items-center justify-center rounded-full font-display text-xs font-bold text-white"
                            style={{ backgroundColor: item.avatarColor }}
                          >
                            {item.initials}
                          </span>
                        )}
                        <div>
                          <div className="font-sans text-[13px] font-semibold text-[#0F172A]">
                            {item.name}
                          </div>
                          <div className="text-[11.5px] text-[#64748B]">
                            {item.domain}
                          </div>
                        </div>
                      </button>
                    </td>
                    <td className="px-4 py-3 text-[13px] text-[#475569]">
                      {item.category}
                    </td>
                    <td className="px-4 py-3 font-mono-num text-[13px] font-semibold text-[#0F172A]">
                      {item.activeAds}
                    </td>
                    <td className="px-4 py-3 font-mono-num text-[13px] text-[#475569]">
                      {item.totalAds}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <button
                        type="button"
                        data-no-glass="true"
                        onClick={() => onToggleFollow(item.id)}
                        className="inline-flex items-center gap-1 rounded-[8px] border border-[#d6d6e0] bg-[#f5f5fa] px-3 py-1 text-[12px] font-semibold text-[#0F172A] hover:bg-[#ECECF4]"
                      >
                        <Check className="h-3 w-3 text-[#475569]" />
                        Following
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

/* ============================================================================
   5. SAVED ADS SUB-VIEW (/workspace/saved/ads) — ATRIA step_49.png 1:1
   ============================================================================ */

export interface SavedAdsSubViewProps {
  ads: Ad[];
  boards: Board[];
  onOpenAd: (ad: Ad) => void;
  onToggleBoard: (adId: string, boardId: string) => void;
  onOpenBrand: (brandId: string) => void;
  onCloneAd: (ad: Ad) => void;
  onBrowseAds: () => void;
  onOpenUpload?: () => void;
}

export function SavedAdsSubView({
  ads,
  boards,
  onOpenAd,
  onToggleBoard,
  onOpenBrand,
  onCloneAd,
  onBrowseAds,
  onOpenUpload,
}: SavedAdsSubViewProps) {
  const [search, setSearch] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(true);
  const [boardFilter, setBoardFilter] = useState("all");
  const [formatFilter, setFormatFilter] = useState<
    "all" | "video" | "image" | "carousel"
  >("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">(
    "all"
  );
  const [sortBy, setSortBy] = useState<"recent" | "longest" | "reach">("recent");

  const savedAds = useMemo(() => {
    return ads.filter((a) => Array.isArray(a.board_ids) && a.board_ids.length > 0);
  }, [ads]);

  const filteredAds = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = savedAds.filter((a) => {
      if (boardFilter !== "all" && !a.board_ids.includes(boardFilter)) {
        return false;
      }
      if (formatFilter !== "all" && a.media_type !== formatFilter) {
        return false;
      }
      if (statusFilter === "active" && !a.is_active) return false;
      if (statusFilter === "inactive" && a.is_active) return false;
      if (
        q &&
        !a.brand_name.toLowerCase().includes(q) &&
        !(a.headline || "").toLowerCase().includes(q) &&
        !(a.primary_text || "").toLowerCase().includes(q)
      ) {
        return false;
      }
      return true;
    });

    return [...list].sort((a, b) => {
      if (sortBy === "longest") {
        return (
          getActiveDays(b.started_running_at) -
          getActiveDays(a.started_running_at)
        );
      }
      if (sortBy === "reach") {
        return (b.eu_reach ?? 0) - (a.eu_reach ?? 0);
      }
      return (
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    });
  }, [savedAds, boardFilter, formatFilter, statusFilter, search, sortBy]);

  const activeFilterCount =
    (boardFilter !== "all" ? 1 : 0) +
    (formatFilter !== "all" ? 1 : 0) +
    (statusFilter !== "all" ? 1 : 0);

  return (
    <div className="animate-view-in">
      {/* WHITE TOP HEADER + TOOLBAR + #f5f5fa FILTER BAR */}
      <div className="-mx-3.5 border-b border-[#ebebf3] bg-white px-6 pb-3.5 pt-3.5 sm:-mx-6 lg:-mx-7 lg:-mt-6">
        {/* Row 1: Saved Ads + Search + Upload */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#ebebf3] pb-3">
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-4">
            <h1 className="font-sans text-[20px] font-bold tracking-tight text-[#0F172A]">
              Saved Ads
            </h1>

            <div className="relative flex h-9 w-full max-w-[440px] items-center rounded-[8px] border border-[#d6d6e0] bg-white px-3 focus-within:border-[#0027eb] focus-within:ring-2 focus-within:ring-[#0027eb]/12">
              <Search className="mr-2 h-4 w-4 shrink-0 text-[#64748B]" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search for my saved ads"
                className="w-full bg-transparent text-[13.5px] text-[#0F172A] outline-none placeholder:text-[#94A3B8]"
              />
              {search && (
                <button
                  type="button"
                  data-no-glass="true"
                  onClick={() => setSearch("")}
                  className="ml-1 text-[#94A3B8] hover:text-[#0F172A]"
                >
                  <X className="h-3.5 w-3.5 text-[#64748B]" />
                </button>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onOpenUpload && (
              <button
                type="button"
                data-no-glass="true"
                onClick={onOpenUpload}
                className="inline-flex h-9 items-center gap-1.5 rounded-[8px] border border-[#d6d6e0] bg-white px-3.5 text-[13px] font-medium text-[#0F172A] transition-colors hover:bg-[#f5f5fa]"
              >
                <Upload className="h-3.5 w-3.5 text-[#475569]" />
                <span>Upload</span>
              </button>
            )}
          </div>
        </div>

        {/* Row 2: Filters Hide + Sort */}
        <div className="flex flex-wrap items-center gap-2 pb-2.5 pt-3">
          <button
            type="button"
            data-no-glass="true"
            onClick={() => setFiltersOpen((v) => !v)}
            className="inline-flex h-8 items-center gap-1.5 rounded-[8px] border border-[#ebebf3] bg-white px-3 text-[13px] font-medium text-[#0F172A] hover:border-[#d6d6e0]"
          >
            <Filter className="h-3.5 w-3.5 text-[#64748B]" />
            <span className="font-semibold">Filters</span>
            <span className="text-[12.5px] text-[#64748B]">
              {filtersOpen ? "Hide" : "Show"}
            </span>
            {activeFilterCount > 0 && (
              <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-[#0027eb] px-1 font-mono-num text-[10px] font-bold text-white">
                {activeFilterCount}
              </span>
            )}
            <MicroCaret open={filtersOpen} />
          </button>

          <FlakeSelect
            ariaLabel="Sort saved ads"
            value={sortBy}
            onChange={(v) => setSortBy(v as "recent" | "longest" | "reach")}
            variant="bordered"
            icon={<ArrowUpDown className="h-3.5 w-3.5 text-[#64748B]" />}
            options={[
              { value: "recent", label: "Sort: Recently added" },
              { value: "longest", label: "Sort: Longest running" },
              { value: "reach", label: "Sort: Highest reach" },
            ]}
          />

          {(activeFilterCount > 0 || search) && (
            <button
              type="button"
              data-no-glass="true"
              onClick={() => {
                setBoardFilter("all");
                setFormatFilter("all");
                setStatusFilter("all");
                setSearch("");
              }}
              className="ml-1 text-[12.5px] font-medium text-[#475569] hover:text-[#0F172A]"
            >
              Clear all
            </button>
          )}
        </div>

        {/* Row 3: #f5f5fa Filter Drawer (Library + Lifecycle + Creative) */}
        {filtersOpen && (
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-[10px] bg-[#f5f5fa] px-4 py-3">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="mr-1 text-[12.5px] font-medium text-[#64748B]">
                Library
              </span>
              <FlakeSelect
                ariaLabel="Board filter"
                value={boardFilter}
                onChange={setBoardFilter}
                variant="bordered"
                isActive={boardFilter !== "all"}
                options={[
                  { value: "all", label: "Boards: All" },
                  ...boards.map((b) => ({ value: b.id, label: b.name })),
                ]}
              />
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              <span className="mr-1 text-[12.5px] font-medium text-[#64748B]">
                Lifecycle
              </span>
              <FlakeSelect
                ariaLabel="Status filter"
                value={statusFilter}
                onChange={(v) =>
                  setStatusFilter(v as "all" | "active" | "inactive")
                }
                variant="bordered"
                isActive={statusFilter !== "all"}
                options={[
                  { value: "all", label: "Status: All" },
                  { value: "active", label: "Status: Active" },
                  { value: "inactive", label: "Status: Inactive" },
                ]}
              />
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              <span className="mr-1 text-[12.5px] font-medium text-[#64748B]">
                Creative
              </span>
              <FlakeSelect
                ariaLabel="Saved ad format"
                value={formatFilter}
                onChange={(v) =>
                  setFormatFilter(v as "all" | "video" | "image" | "carousel")
                }
                variant="bordered"
                isActive={formatFilter !== "all"}
                options={[
                  { value: "all", label: "Format: All" },
                  { value: "video", label: "Format: Video" },
                  { value: "image", label: "Format: Image" },
                  { value: "carousel", label: "Format: Carousel" },
                ]}
              />
            </div>
          </div>
        )}
      </div>

      {/* GRID OR OPEN EMPTY STATE ON #f5f5fa CANVAS */}
      {savedAds.length === 0 ? (
        <div className="flex flex-col items-center justify-center px-6 py-20 text-center">
          <Bookmark className="h-12 w-12 stroke-[1.5] text-[#94A3B8]" />
          <h2 className="mt-4 font-sans text-[18px] font-bold text-[#0F172A]">
            You haven&apos;t saved any ads
          </h2>
          <p className="mt-1.5 max-w-md text-[13.5px] leading-relaxed text-[#475569]">
            Bookmark winning ads from Discovery or upload your own creatives to
            organize them into boards.
          </p>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-2.5">
            <button
              type="button"
              data-no-glass="true"
              onClick={onBrowseAds}
              className="inline-flex h-9 items-center justify-center rounded-[8px] bg-[#0027eb] px-5 text-[13.5px] font-semibold text-white transition-colors hover:bg-[#001fc2]"
            >
              Browse ads
            </button>
            {onOpenUpload && (
              <button
                type="button"
                data-no-glass="true"
                onClick={onOpenUpload}
                className="inline-flex h-9 items-center gap-1.5 rounded-[8px] border border-[#d6d6e0] bg-white px-4 text-[13px] font-medium text-[#0F172A] hover:bg-[#f5f5fa]"
              >
                <Upload className="h-3.5 w-3.5 text-[#475569]" />
                <span>Upload ad</span>
              </button>
            )}
          </div>
        </div>
      ) : filteredAds.length === 0 ? (
        <div className="mt-5 rounded-[12px] border border-[#ebebf3] bg-white px-6 py-12 text-center">
          <p className="font-sans text-sm font-semibold text-[#0F172A]">
            No saved ads match your current filters
          </p>
        </div>
      ) : (
        <div className="mt-5 grid grid-cols-1 items-start gap-3.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredAds.map((ad) => (
            <AdCard
              key={ad.id}
              ad={ad}
              boards={boards}
              onOpen={onOpenAd}
              onToggleBoard={onToggleBoard}
              onOpenBrand={onOpenBrand}
              onCloneAd={onCloneAd}
            />
          ))}
        </div>
      )}
    </div>
  );
}
