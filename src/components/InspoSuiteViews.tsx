"use client";

import React, { useMemo, useState } from "react";
import {
  ArrowUpRight,
  Bookmark,
  Check,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Flame,
  Heart,
  Layers,
  LayoutGrid,
  List,
  Plus,
  RotateCcw,
  Search,
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
import { FlakeSelect } from "./ui/FlakeDropdown";

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
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [newViewNotice, setNewViewNotice] = useState(false);

  const heroCards = ATRIA_TOP_PICKS_COLLECTIONS.slice(0, 3);

  const viewTabs: Array<{
    id: "all" | "trending" | "following" | "dk" | "us";
    label: string;
    icon?: React.ReactNode;
    badge?: number;
  }> = [
    { id: "all", label: "All ads" },
    { id: "trending", label: "Trending", icon: <Flame className="h-3.5 w-3.5" /> },
    {
      id: "following",
      label: "Following",
      icon: <Heart className="h-3.5 w-3.5" />,
      badge: followedCount,
    },
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
    <div className="mb-5 space-y-3.5">
      {/* 1. Dismissible Deep Obsidian Seasonal Hero Banner */}
      {!bannerDismissed && (
        <section className="relative overflow-hidden rounded-2xl border border-[#1E293B]/60 bg-[#050811] px-5 py-5 text-white shadow-[0_14px_36px_-12px_rgba(5,8,17,0.55)] sm:px-7 sm:py-6">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full opacity-40 blur-3xl"
            style={{
              background:
                "radial-gradient(circle, rgba(59,102,255,0.55) 0%, rgba(0,39,235,0.2) 50%, transparent 75%)",
            }}
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-28 left-1/3 h-64 w-64 rounded-full opacity-25 blur-3xl"
            style={{
              background:
                "radial-gradient(circle, rgba(0,39,235,0.5) 0%, transparent 70%)",
            }}
          />

          <div className="relative z-10 flex flex-col justify-between gap-6 lg:flex-row lg:items-center">
            <div className="max-w-xl space-y-2.5">
              <div className="inline-flex items-center gap-2 rounded-full border border-[#3B66FF]/35 bg-[#0027eb]/20 px-3 py-1 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-[#EEF2FF]">
                <Sparkles className="h-3 w-3 text-[#3B66FF]" />
                BLACK FRIDAY &amp; Q4 WINNERS
              </div>

              <h2 className="font-display text-xl font-bold tracking-tight text-white sm:text-2xl">
                See what winning brands are scaling right now.
              </h2>

              <p className="text-[13px] leading-relaxed text-slate-300 sm:text-sm">
                The offers that convert, and the creatives behind them.
              </p>

              <div className="flex flex-wrap items-center gap-2.5 pt-1.5">
                <button
                  type="button"
                  onClick={() => {
                    onViewTabChange("trending");
                    onScaledOnlyChange(true);
                  }}
                  className="adtrack-btn-primary inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold text-white"
                >
                  Explore Winners
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </button>

                <button
                  type="button"
                  data-no-glass="true"
                  onClick={() => setBannerDismissed(true)}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/[0.06] px-3.5 py-2 text-xs font-medium text-slate-300 transition-colors hover:bg-white/[0.12] hover:text-white"
                >
                  Dismiss
                </button>
              </div>
            </div>

            {/* 3 Tilted Preview Thumbnail Cards */}
            <div className="hidden items-center justify-end pr-2 sm:flex">
              <div className="flex items-center -space-x-5">
                {heroCards.map((col, idx) => {
                  const tiltClass =
                    idx === 0
                      ? "-rotate-6 translate-y-2"
                      : idx === 1
                        ? "rotate-0 -translate-y-1 z-10 scale-105"
                        : "rotate-6 translate-y-2";
                  return (
                    <button
                      key={col.id}
                      type="button"
                      data-no-glass="true"
                      onClick={() => onViewTabChange("trending")}
                      title={col.title}
                      className={`group relative h-32 w-24 overflow-hidden rounded-xl border border-white/20 bg-[#0F172A] shadow-xl transition-transform duration-200 hover:z-20 hover:scale-105 ${tiltClass}`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={col.thumbnailUrl}
                        alt={col.title}
                        className="h-full w-full object-cover opacity-90 transition-opacity group-hover:opacity-100"
                      />
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#050811]/95 via-[#050811]/55 to-transparent p-1.5 text-left">
                        <span className="block truncate text-[9px] font-semibold text-white">
                          {col.category}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* 2. View Tabs Row */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="no-scrollbar flex items-center gap-1.5 overflow-x-auto pb-0.5">
          {viewTabs.map((tab) => {
            const active = activeViewTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                data-no-glass="true"
                onClick={() => onViewTabChange(tab.id)}
                className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                  active
                    ? "border-[#0027eb] bg-[#0027eb] text-white shadow-xs"
                    : "border-[#E6E9F0] bg-white text-[#334155] hover:border-[#CBD5E1] hover:bg-[#F7F8FB] hover:text-[#0F172A]"
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
                {typeof tab.badge === "number" && (
                  <span
                    className={`rounded-full px-1.5 py-0.2 font-mono-num text-[10.5px] font-bold ${
                      active
                        ? "bg-white/20 text-white"
                        : "bg-[#EEF2FF] text-[#0027eb]"
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
            className="inline-flex shrink-0 items-center gap-1 rounded-full border border-dashed border-[#CBD5E1] bg-[#F7F8FB] px-3 py-1.5 text-xs font-medium text-[#475569] transition-colors hover:border-[#0027eb] hover:bg-[#EEF2FF] hover:text-[#0027eb]"
          >
            <Plus className="h-3.5 w-3.5" />
            New view
          </button>

          {newViewNotice && (
            <span className="ml-1 rounded-full bg-[#EEF2FF] px-2.5 py-1 text-[11px] font-medium text-[#0027eb]">
              Use Filters below to customize &amp; pin a view
            </span>
          )}
        </div>
      </div>

      {/* 3. Full-width AI Search Bar + Right Advertiser Action & Live Count */}
      <div className="flex flex-col gap-2.5 lg:flex-row lg:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#64748B]" />
          <input
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search for ads or advertisers with AI"
            className="h-11 w-full rounded-xl border border-[#E6E9F0] bg-white pl-10 pr-24 text-[13.5px] text-[#0F172A] placeholder:text-[#94A3B8] shadow-[0_1px_2px_rgba(15,23,42,0.03)] outline-none transition-colors focus:border-[#0027eb] focus:ring-2 focus:ring-[#0027eb]/15"
          />
          <div className="absolute right-2.5 top-1/2 flex -translate-y-1/2 items-center gap-1.5">
            {search && (
              <button
                type="button"
                data-no-glass="true"
                onClick={() => onSearchChange("")}
                aria-label="Clear search"
                className="rounded-lg p-1 text-[#94A3B8] hover:bg-[#F3F5F9] hover:text-[#0F172A]"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
            <span className="hidden items-center gap-1 rounded-lg bg-[#EEF2FF] px-2 py-1 text-[10.5px] font-semibold text-[#0027eb] sm:inline-flex">
              <Sparkles className="h-3 w-3" />
              AI
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 lg:justify-end">
          {onOpenRequestBrand && (
            <button
              type="button"
              data-no-glass="true"
              onClick={onOpenRequestBrand}
              className="inline-flex h-11 items-center gap-1.5 rounded-xl border border-[#E6E9F0] bg-white px-3.5 text-xs font-medium text-[#334155] transition-colors hover:border-[#CBD5E1] hover:bg-[#F7F8FB] hover:text-[#0F172A]"
            >
              Can&apos;t find an advertiser?
            </button>
          )}

          <div className="inline-flex h-11 items-center gap-2 rounded-xl border border-[#E6E9F0] bg-[#F7F8FB] px-3.5 font-mono-num text-xs font-semibold text-[#0F172A]">
            <span className="h-2 w-2 rounded-full bg-[#22C55E]" />
            {displayAdsTotal !== null
              ? `${displayAdsTotal.toLocaleString()} ads`
              : "Loading ads..."}
          </div>
        </div>
      </div>

      {/* 4. Filter & Sort Row */}
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            data-no-glass="true"
            onClick={onToggleFiltersExpanded}
            className={`inline-flex items-center gap-2 rounded-xl border px-3.5 py-2 text-xs font-semibold transition-colors ${
              filtersExpanded || activeFilterCount > 0
                ? "border-[#0027eb]/30 bg-[#EEF2FF] text-[#0027eb]"
                : "border-[#E6E9F0] bg-white text-[#0F172A] hover:bg-[#F7F8FB]"
            }`}
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            <span>Filters</span>
            <span className="rounded-md bg-white/80 px-1.5 py-0.5 text-[10.5px] font-semibold text-[#334155]">
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
            className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold transition-colors ${
              scaledOnly
                ? "border-[#0027eb] bg-[#0027eb] text-white"
                : "border-[#E6E9F0] bg-white text-[#334155] hover:border-[#CBD5E1] hover:bg-[#F7F8FB]"
            }`}
          >
            <Layers className="h-3.5 w-3.5" />
            Scaled 3x+
          </button>
        </div>

        {hasAnyFilter && (
          <button
            type="button"
            data-no-glass="true"
            onClick={onResetFilters}
            className="inline-flex items-center gap-1.5 rounded-xl border border-[#E6E9F0] bg-white px-3 py-2 text-xs font-medium text-[#475569] transition-colors hover:border-[#CBD5E1] hover:text-[#0F172A]"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Reset filters
          </button>
        )}
      </div>

      {/* 5. Expanded 4-Row Grouped Filter Panel (Lifecycle / Targeting / Creative / Performance) */}
      {filtersExpanded && (
        <div className="rounded-2xl border border-[#E6E9F0] bg-white p-4 shadow-[0_6px_20px_-8px_rgba(15,23,42,0.08)]">
          <div className="divide-y divide-[#F1F4F9]">
            {/* Row 1: Lifecycle */}
            <div className="flex flex-col gap-2.5 pb-3 sm:flex-row sm:items-center">
              <span className="w-28 shrink-0 text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">
                Lifecycle
              </span>
              <div className="flex flex-wrap items-center gap-2">
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

                <FlakeSelect
                  ariaLabel="Days / Active"
                  value={sortBy === "longest" ? "longest" : timeFilter}
                  onChange={(v) => {
                    if (v === "longest") {
                      onSortChange("longest");
                    } else {
                      onTimeFilterChange(v as "all" | "7d" | "30d" | "90d");
                    }
                  }}
                  variant="bordered"
                  isActive={sortBy === "longest" || timeFilter !== "all"}
                  options={[
                    { value: "all", label: "Days / Active: Any" },
                    { value: "longest", label: "Days / Active: Longest (30d+)" },
                    { value: "7d", label: "Days / Active: Newest (7d)" },
                    { value: "30d", label: "Days / Active: Within 30d" },
                  ]}
                />
              </div>
            </div>

            {/* Row 2: Targeting */}
            <div className="flex flex-col gap-2.5 py-3 sm:flex-row sm:items-center">
              <span className="w-28 shrink-0 text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">
                Targeting
              </span>
              <div className="flex flex-wrap items-center gap-2">
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
            </div>

            {/* Row 3: Creative */}
            <div className="flex flex-col gap-2.5 py-3 sm:flex-row sm:items-center">
              <span className="w-28 shrink-0 text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">
                Creative
              </span>
              <div className="flex flex-wrap items-center gap-2">
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
                    ...brands.map((b) => ({
                      value: b.id,
                      label: b.name,
                    })),
                  ]}
                />

                <button
                  type="button"
                  data-no-glass="true"
                  onClick={() => onScaledOnlyChange(!scaledOnly)}
                  className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-medium transition-colors ${
                    scaledOnly
                      ? "border-[#0027eb] bg-[#EEF2FF] font-semibold text-[#0027eb]"
                      : "border-[#E6E9F0] bg-white text-[#334155] hover:border-[#CBD5E1]"
                  }`}
                >
                  Creative reuse: {scaledOnly ? "3x+ Scaled" : "All"}
                </button>
              </div>
            </div>

            {/* Row 4: Performance */}
            <div className="flex flex-col gap-2.5 pt-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
                <span className="w-28 shrink-0 text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">
                  Performance
                </span>
                <div className="flex flex-wrap items-center gap-2">
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

              <button
                type="button"
                data-no-glass="true"
                disabled={!hasAnyFilter}
                onClick={onResetFilters}
                className="inline-flex items-center gap-1.5 self-start rounded-xl border border-[#E6E9F0] bg-[#F7F8FB] px-3 py-2 text-xs font-semibold text-[#334155] transition-colors hover:border-[#CBD5E1] hover:text-[#0F172A] disabled:cursor-not-allowed disabled:opacity-45 sm:self-auto"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Reset filters
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ============================================================================
   2. ADVERTISERS VIEW (/workspace/advertisers)
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
  igFollowers: string;
  newAds30d: number;
  growthPct: number;
  activeAds: number;
  totalAds: number;
  isTracked: boolean;
  topAd?: Ad;
}

function formatCompactCount(num?: number): string {
  if (!num || num <= 0) return "—";
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `${Math.round(num / 1_000)}K`;
  return String(num);
}

export function AdvertisersView({
  brands,
  ads,
  followedBrandIds,
  onToggleFollow,
  onOpenBrand,
  onCloneAd,
}: AdvertisersViewProps) {
  const [activeTab, setActiveTab] = useState<"all" | "following">("all");
  const [search, setSearch] = useState("");
  const [industryFilter, setIndustryFilter] = useState("all");
  const [adsScopeFilter, setAdsScopeFilter] = useState<"all" | "tracked" | "high_velocity">("all");
  const [newViewTip, setNewViewTip] = useState(false);

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
        totalAds > 0 ? Math.max(8, Math.round((newAds30d / Math.max(1, totalAds)) * 100)) : 12;

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
        igFollowers: formatCompactCount(b.ig_followers),
        newAds30d,
        growthPct,
        activeAds,
        totalAds,
        isTracked: true,
        topAd: sortedBrandAds[0],
      };
    });

    const placeholderRows: UnifiedAdvertiserRow[] = ATRIA_ADVERTISERS_PLACEHOLDERS.filter(
      (p) => !seenNames.has(p.name.toLowerCase())
    ).map((p: AtriaAdvertiserPlaceholder) => ({
      id: p.id,
      name: p.name,
      domain: p.domain,
      industry: p.industry,
      avatarUrl: p.avatarUrl,
      initials: p.name
        .split(" ")
        .map((w) => w[0])
        .join("")
        .slice(0, 2)
        .toUpperCase(),
      avatarColor: "#0F172A",
      fbFollowers: p.fbFollowers,
      igFollowers: p.igFollowers,
      newAds30d: p.newAds30d,
      growthPct: p.growthPct,
      activeAds: p.activeAds,
      totalAds: p.totalAds,
      isTracked: false,
    }));

    return [...trackedRows, ...placeholderRows];
  }, [brands, ads]);

  const industries = useMemo(() => {
    return Array.from(new Set(rows.map((r) => r.industry))).slice(0, 6);
  }, [rows]);

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (activeTab === "following" && !followedBrandIds.includes(r.id)) {
        return false;
      }
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
      if (adsScopeFilter === "tracked" && !r.isTracked) return false;
      if (adsScopeFilter === "high_velocity" && r.growthPct < 20) return false;
      return true;
    });
  }, [rows, activeTab, followedBrandIds, search, industryFilter, adsScopeFilter]);

  return (
    <div className="animate-view-in space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-[#0F172A]">
            Advertisers
          </h1>
          <p className="mt-1 text-sm text-[#64748B]">
            Track creative velocity, active ad volume, and social reach across top DTC brands.
          </p>
        </div>
        <span className="inline-flex items-center gap-2 self-start rounded-full border border-[#E6E9F0] bg-[#F7F8FB] px-3 py-1 font-mono-num text-xs font-semibold text-[#334155]">
          {filteredRows.length} advertisers
        </span>
      </div>

      {/* Tabs row */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          data-no-glass="true"
          onClick={() => setActiveTab("all")}
          className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors ${
            activeTab === "all"
              ? "border-[#0027eb] bg-[#0027eb] text-white"
              : "border-[#E6E9F0] bg-white text-[#334155] hover:bg-[#F7F8FB]"
          }`}
        >
          All advertisers
        </button>

        <button
          type="button"
          data-no-glass="true"
          onClick={() => setActiveTab("following")}
          className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors ${
            activeTab === "following"
              ? "border-[#0027eb] bg-[#0027eb] text-white"
              : "border-[#E6E9F0] bg-white text-[#334155] hover:bg-[#F7F8FB]"
          }`}
        >
          <Heart className="h-3.5 w-3.5" />
          Following ({followedBrandIds.length})
        </button>

        <button
          type="button"
          data-no-glass="true"
          onClick={() => {
            setNewViewTip(true);
            window.setTimeout(() => setNewViewTip(false), 2600);
          }}
          className="inline-flex items-center gap-1 rounded-full border border-dashed border-[#CBD5E1] bg-[#F7F8FB] px-3 py-1.5 text-xs font-medium text-[#475569] transition-colors hover:border-[#0027eb] hover:bg-[#EEF2FF] hover:text-[#0027eb]"
        >
          <Plus className="h-3.5 w-3.5" />
          New view
        </button>

        {newViewTip && (
          <span className="text-xs font-medium text-[#0027eb]">
            Filter by industry or velocity below to narrow this view.
          </span>
        )}
      </div>

      {/* Search + Page/Ads Filter Bar Chips */}
      <div className="flex flex-col gap-3 rounded-2xl border border-[#E6E9F0] bg-white p-3.5 shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
        <div className="flex flex-col gap-2.5 md:flex-row md:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#64748B]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search advertisers"
              className="h-10 w-full rounded-xl border border-[#E6E9F0] bg-[#F7F8FB] pl-9 pr-9 text-sm text-[#0F172A] placeholder:text-[#94A3B8] outline-none transition-colors focus:border-[#0027eb] focus:bg-white"
            />
            {search && (
              <button
                type="button"
                data-no-glass="true"
                onClick={() => setSearch("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-[#0F172A]"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <span className="px-1 text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">
              Ads:
            </span>
            {(
              [
                { id: "all", label: "All" },
                { id: "tracked", label: "Tracked shops" },
                { id: "high_velocity", label: "High velocity (+20%)" },
              ] as const
            ).map((chip) => {
              const active = adsScopeFilter === chip.id;
              return (
                <button
                  key={chip.id}
                  type="button"
                  data-no-glass="true"
                  onClick={() => setAdsScopeFilter(chip.id)}
                  className={`rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors ${
                    active
                      ? "border-[#0027eb] bg-[#EEF2FF] font-semibold text-[#0027eb]"
                      : "border-[#E6E9F0] bg-white text-[#475569] hover:bg-[#F7F8FB]"
                  }`}
                >
                  {chip.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Page / Industry Chips */}
        <div className="no-scrollbar flex items-center gap-1.5 overflow-x-auto border-t border-[#F1F4F9] pt-2.5">
          <span className="shrink-0 pr-1 text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">
            Page:
          </span>
          <button
            type="button"
            data-no-glass="true"
            onClick={() => setIndustryFilter("all")}
            className={`shrink-0 rounded-full border px-2.5 py-1 text-[11.5px] font-medium transition-colors ${
              industryFilter === "all"
                ? "border-[#0F172A] bg-[#0F172A] text-white"
                : "border-[#E6E9F0] bg-[#F7F8FB] text-[#475569] hover:text-[#0F172A]"
            }`}
          >
            All industries
          </button>
          {industries.map((ind) => {
            const active = industryFilter === ind;
            return (
              <button
                key={ind}
                type="button"
                data-no-glass="true"
                onClick={() => setIndustryFilter(active ? "all" : ind)}
                className={`shrink-0 rounded-full border px-2.5 py-1 text-[11.5px] font-medium transition-colors ${
                  active
                    ? "border-[#0F172A] bg-[#0F172A] text-white"
                    : "border-[#E6E9F0] bg-[#F7F8FB] text-[#475569] hover:text-[#0F172A]"
                }`}
              >
                {ind}
              </button>
            );
          })}
        </div>
      </div>

      {/* 6-Column Advertisers Table */}
      <div className="overflow-hidden rounded-2xl border border-[#E6E9F0] bg-white shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[780px] border-collapse text-left">
            <thead>
              <tr className="border-b border-[#EAECEF] bg-[#F7F8FB] text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">
                <th className="px-4 py-3">Advertiser</th>
                <th className="px-4 py-3">Followers</th>
                <th className="px-4 py-3">New ads (30d)</th>
                <th className="px-4 py-3">Active ads</th>
                <th className="px-4 py-3">Total ads</th>
                <th className="px-4 py-3 text-right">Follow</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F1F4F9]">
              {filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-14 text-center">
                    <p className="font-display text-sm font-semibold text-[#0F172A]">
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
                      className="transition-colors hover:bg-[#F7F8FB]/75"
                    >
                      {/* Col 1: Advertiser */}
                      <td className="px-4 py-3.5">
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
                            {row.avatarUrl ? (
                              /* eslint-disable-next-line @next/next/no-img-element */
                              <img
                                src={row.avatarUrl}
                                alt={row.name}
                                className="h-9 w-9 shrink-0 rounded-full border border-[#E6E9F0] bg-white object-cover"
                              />
                            ) : (
                              <span
                                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full font-display text-xs font-bold text-white"
                                style={{ backgroundColor: row.avatarColor }}
                              >
                                {row.initials}
                              </span>
                            )}
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="truncate font-display text-[13.5px] font-semibold text-[#0F172A]">
                                  {row.name}
                                </span>
                                {row.isTracked && (
                                  <ExternalLink className="h-3 w-3 shrink-0 text-[#94A3B8]" />
                                )}
                              </div>
                              <div className="flex items-center gap-2 text-[11.5px] text-[#64748B]">
                                <span className="truncate">{row.domain}</span>
                                <span className="rounded-md bg-[#F3F5F9] px-1.5 py-0.5 text-[10px] font-medium text-[#475569]">
                                  {row.industry}
                                </span>
                              </div>
                            </div>
                          </button>

                          {onCloneAd && row.topAd && (
                            <button
                              type="button"
                              data-no-glass="true"
                              title={`Clone top ad from ${row.name}`}
                              onClick={() => onCloneAd(row.topAd!)}
                              className="ml-auto hidden items-center gap-1 rounded-lg border border-[#E6E9F0] bg-white px-2 py-1 text-[11px] font-semibold text-[#334155] transition-colors hover:border-[#0027eb] hover:text-[#0027eb] xl:inline-flex"
                            >
                              <Sparkles className="h-3 w-3" />
                              Clone
                            </button>
                          )}
                        </div>
                      </td>

                      {/* Col 2: Followers FB + IG */}
                      <td className="px-4 py-3.5 font-mono-num text-xs text-[#334155]">
                        <div className="flex flex-col gap-0.5">
                          <span>
                            <span className="font-semibold text-[#64748B]">FB</span>{" "}
                            {row.fbFollowers}
                          </span>
                          <span>
                            <span className="font-semibold text-[#64748B]">IG</span>{" "}
                            {row.igFollowers}
                          </span>
                        </div>
                      </td>

                      {/* Col 3: New ads (30d) + green +X% badge */}
                      <td className="px-4 py-3.5">
                        <div className="inline-flex items-center gap-2 font-mono-num">
                          <span className="text-sm font-semibold text-[#0F172A]">
                            {row.newAds30d}
                          </span>
                          <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                            +{row.growthPct}%
                          </span>
                        </div>
                      </td>

                      {/* Col 4: Active ads */}
                      <td className="px-4 py-3.5 font-mono-num text-sm font-semibold text-[#0F172A]">
                        <span className="inline-flex items-center gap-1.5">
                          <span className="h-1.5 w-1.5 rounded-full bg-[#22C55E]" />
                          {row.activeAds.toLocaleString()}
                        </span>
                      </td>

                      {/* Col 5: Total ads */}
                      <td className="px-4 py-3.5 font-mono-num text-sm font-medium text-[#475569]">
                        {row.totalAds.toLocaleString()}
                      </td>

                      {/* Col 6: Follow / Following Cobalt pill */}
                      <td className="px-4 py-3.5 text-right">
                        <button
                          type="button"
                          data-no-glass="true"
                          onClick={() => onToggleFollow(row.id)}
                          className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                            following
                              ? "border border-[#0027eb]/30 bg-[#EEF2FF] text-[#0027eb] hover:bg-[#dde5ff]"
                              : "adtrack-btn-primary text-white"
                          }`}
                        >
                          {following ? (
                            <>
                              <Check className="h-3.5 w-3.5" />
                              Following
                            </>
                          ) : (
                            <>
                              <Plus className="h-3.5 w-3.5" />
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
   3. TOP PICKS VIEW (/workspace/collection)
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

  const steps = [
    {
      num: "1.",
      title: "Browse winning formats",
      desc: "Curated static & video collections from top-scaling DTC brands.",
    },
    {
      num: "2.",
      title: "Preview examples",
      desc: "Inspect creative hierarchy, hook callouts, and template structure.",
    },
    {
      num: "3.",
      title: "Clone directly in Ad Maker",
      desc: "Adapt any winning format to your own product memory in one click.",
    },
  ];

  return (
    <div className="animate-view-in space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-[#0F172A]">
            Top Picks with Studio &amp; Canva templates
          </h1>
          <p className="mt-1 text-sm text-[#64748B]">
            Create winning ads from proven creative formats. New templates added regularly.
          </p>
        </div>

        {onBrowseAds && (
          <button
            type="button"
            data-no-glass="true"
            onClick={onBrowseAds}
            className="inline-flex items-center gap-1.5 self-start rounded-xl border border-[#E6E9F0] bg-white px-3.5 py-2 text-xs font-semibold text-[#0F172A] transition-colors hover:bg-[#F7F8FB]"
          >
            Browse Discovery feed
            <ArrowUpRight className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* 3-Step Horizontal Instruction Strip */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        {steps.map((step) => (
          <div
            key={step.num}
            className="flex items-start gap-3 rounded-2xl border border-[#E6E9F0] bg-[#F7F8FB] px-4 py-3.5"
          >
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#0027eb] font-mono-num text-xs font-bold text-white">
              {step.num}
            </span>
            <div className="min-w-0">
              <p className="font-display text-[13px] font-semibold text-[#0F172A]">
                {step.num} {step.title}
              </p>
              <p className="mt-0.5 text-xs leading-relaxed text-[#64748B]">
                {step.desc}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* 12 Stacked Horizontal Collection Cards */}
      <div className="space-y-3">
        {ATRIA_TOP_PICKS_COLLECTIONS.map((col) => (
          <article
            key={col.id}
            className="flex flex-col justify-between gap-4 rounded-2xl border border-[#E6E9F0] bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.03)] transition-all hover:border-[#CBD5E1] hover:shadow-[0_10px_28px_-10px_rgba(15,23,42,0.09)] md:flex-row md:items-center"
          >
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              {/* Thumbnail Left */}
              <div className="relative h-32 w-full shrink-0 overflow-hidden rounded-xl border border-[#EAECEF] bg-[#F7F8FB] sm:h-28 sm:w-44">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={col.thumbnailUrl}
                  alt={col.title}
                  loading="lazy"
                  className="h-full w-full object-cover"
                />
                {col.badge && (
                  <span className="absolute left-2 top-2 rounded-md bg-[#050811]/85 px-2 py-0.5 text-[10px] font-semibold text-white backdrop-blur-xs">
                    {col.badge}
                  </span>
                )}
              </div>

              {/* Middle Details */}
              <div className="min-w-0 space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-[#EEF2FF] px-2.5 py-0.5 text-[11px] font-semibold text-[#0027eb]">
                    {col.category}
                  </span>
                  <span className="font-mono-num text-xs font-medium text-[#64748B]">
                    {col.adCount} Ads | {col.templateCount} Templates
                  </span>
                </div>

                <h2 className="font-display text-base font-bold text-[#0F172A]">
                  {col.title}
                </h2>

                <p className="max-w-2xl text-[13px] leading-relaxed text-[#475569]">
                  {col.description}
                </p>
              </div>
            </div>

            {/* Right Actions */}
            <div className="flex shrink-0 flex-wrap items-center gap-2 md:flex-col md:items-stretch lg:flex-row lg:items-center">
              <button
                type="button"
                data-no-glass="true"
                onClick={() => setPreviewCol(col)}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-[#E6E9F0] bg-white px-4 py-2.5 text-xs font-semibold text-[#0F172A] transition-colors hover:border-[#CBD5E1] hover:bg-[#F7F8FB]"
              >
                Preview
              </button>

              <button
                type="button"
                onClick={() => onCloneCollectionToStudio(col)}
                className="adtrack-btn-primary inline-flex items-center justify-center gap-1.5 rounded-xl px-4 py-2.5 text-xs font-semibold text-white"
              >
                <Sparkles className="h-3.5 w-3.5" />
                Clone in Ad Maker
              </button>
            </div>
          </article>
        ))}
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
            className="animate-sheet-up w-full max-w-2xl overflow-hidden rounded-2xl border border-[#E6E9F0] bg-white shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-[#EAECEF] px-5 py-4">
              <div className="min-w-0">
                <span className="inline-block rounded-full bg-[#EEF2FF] px-2.5 py-0.5 text-[10.5px] font-semibold text-[#0027eb]">
                  {previewCol.category}
                </span>
                <h3 className="mt-1 truncate font-display text-lg font-bold text-[#0F172A]">
                  {previewCol.title}
                </h3>
              </div>

              <button
                type="button"
                data-no-glass="true"
                onClick={() => setPreviewCol(null)}
                aria-label="Close preview"
                className="rounded-xl border border-[#E6E9F0] bg-white p-2 text-[#64748B] hover:text-[#0F172A]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4 p-5">
              <div className="overflow-hidden rounded-xl border border-[#EAECEF] bg-[#F7F8FB]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={previewCol.thumbnailUrl}
                  alt={previewCol.title}
                  className="max-h-[340px] w-full object-cover"
                />
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-[#F7F8FB] px-4 py-3">
                <span className="font-mono-num text-xs font-semibold text-[#0F172A]">
                  {previewCol.adCount} Ads | {previewCol.templateCount} Templates
                </span>
                {previewCol.badge && (
                  <span className="rounded-full bg-[#050811] px-2.5 py-0.5 text-[11px] font-semibold text-white">
                    {previewCol.badge}
                  </span>
                )}
              </div>

              <p className="text-sm leading-relaxed text-[#475569]">
                {previewCol.description}
              </p>
            </div>

            <div className="flex items-center justify-end gap-2.5 border-t border-[#EAECEF] bg-[#F7F8FB] px-5 py-3.5">
              <button
                type="button"
                data-no-glass="true"
                onClick={() => setPreviewCol(null)}
                className="rounded-xl border border-[#E6E9F0] bg-white px-4 py-2 text-xs font-semibold text-[#334155] hover:bg-[#F3F5F9]"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  const chosen = previewCol;
                  setPreviewCol(null);
                  onCloneCollectionToStudio(chosen);
                }}
                className="adtrack-btn-primary inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-semibold text-white"
              >
                <Sparkles className="h-3.5 w-3.5" />
                Clone in Ad Maker
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ============================================================================
   4. FOLLOWING VIEW (/workspace/following/brands)
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
  const [sortBy, setSortBy] = useState<"latest" | "active_ads" | "alpha">("latest");

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
            avatarUrl: p.avatarUrl,
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
    <div className="animate-view-in space-y-5">
      {/* Header + Cobalt Follow Quota Progress */}
      <div className="flex flex-col gap-4 rounded-2xl border border-[#E6E9F0] bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.03)] sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-[#0F172A]">
            Following
          </h1>
          <p className="mt-1 text-sm text-[#64748B]">
            Monitor new ad launches and active creative volume from your followed brands.
          </p>
        </div>

        <div className="w-full max-w-xs space-y-1.5">
          <div className="flex items-center justify-between text-xs font-semibold">
            <span className="text-[#334155]">Brand follows</span>
            <span className="font-mono-num text-[#0027eb]">
              {usedCount}/{followQuota} brand follows used
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-[#EEF2FF]">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#0027eb] to-[#3B66FF] transition-all duration-300"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
      </div>

      {/* Controls Bar */}
      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 sm:max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#64748B]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search your followed brands"
            className="h-10 w-full rounded-xl border border-[#E6E9F0] bg-white pl-9 pr-8 text-sm text-[#0F172A] placeholder:text-[#94A3B8] outline-none transition-colors focus:border-[#0027eb]"
          />
          {search && (
            <button
              type="button"
              data-no-glass="true"
              onClick={() => setSearch("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-[#0F172A]"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <FlakeSelect
            ariaLabel="Sort followed brands"
            value={sortBy}
            onChange={(v) => setSortBy(v as "latest" | "active_ads" | "alpha")}
            variant="bordered"
            options={[
              { value: "latest", label: "Sort: Latest followed" },
              { value: "active_ads", label: "Sort: Most active ads" },
              { value: "alpha", label: "Sort: Alphabetical" },
            ]}
          />

          {/* Card / Table Segmented Toggle */}
          <div className="inline-flex rounded-xl border border-[#E6E9F0] bg-[#F7F8FB] p-0.5">
            <button
              type="button"
              data-no-glass="true"
              onClick={() => setViewMode("card")}
              aria-label="Card view"
              className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors ${
                viewMode === "card"
                  ? "bg-white text-[#0F172A] shadow-xs"
                  : "text-[#64748B] hover:text-[#0F172A]"
              }`}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              Card
            </button>
            <button
              type="button"
              data-no-glass="true"
              onClick={() => setViewMode("table")}
              aria-label="Table view"
              className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors ${
                viewMode === "table"
                  ? "bg-white text-[#0F172A] shadow-xs"
                  : "text-[#64748B] hover:text-[#0F172A]"
              }`}
            >
              <List className="h-3.5 w-3.5" />
              Table
            </button>
          </div>
        </div>
      </div>

      {/* Empty State or Followed Brands */}
      {followedBrandIds.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[#CBD5E1] bg-white px-6 py-16 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#EEF2FF] text-[#0027eb]">
            <Heart className="h-6 w-6" />
          </div>
          <h2 className="mt-4 font-display text-lg font-bold text-[#0F172A]">
            You are not following any brands yet
          </h2>
          <p className="mt-1 max-w-md text-sm text-[#64748B]">
            Follow top advertisers to track their newest Meta ad launches and scaling creatives in one place.
          </p>
          <button
            type="button"
            onClick={onBrowseBrands}
            className="adtrack-btn-primary mt-5 inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-xs font-semibold text-white"
          >
            Browse brands
            <ArrowUpRight className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : followedItems.length === 0 ? (
        <div className="rounded-2xl border border-[#E6E9F0] bg-white px-6 py-12 text-center">
          <p className="font-display text-sm font-semibold text-[#0F172A]">
            No followed brands match &ldquo;{search}&rdquo;
          </p>
          <button
            type="button"
            data-no-glass="true"
            onClick={() => setSearch("")}
            className="mt-3 rounded-xl border border-[#E6E9F0] bg-[#F7F8FB] px-3.5 py-1.5 text-xs font-semibold text-[#334155]"
          >
            Clear search
          </button>
        </div>
      ) : viewMode === "card" ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {followedItems.map((item) => (
            <article
              key={item.id}
              className="flex flex-col justify-between rounded-2xl border border-[#E6E9F0] bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.03)] transition-all hover:border-[#CBD5E1] hover:shadow-[0_10px_24px_-10px_rgba(15,23,42,0.08)]"
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
                      className="h-11 w-11 shrink-0 rounded-full border border-[#E6E9F0] bg-white object-cover"
                    />
                  ) : (
                    <span
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full font-display text-sm font-bold text-white"
                      style={{ backgroundColor: item.avatarColor }}
                    >
                      {item.initials}
                    </span>
                  )}
                  <div className="min-w-0">
                    <h3 className="truncate font-display text-sm font-bold text-[#0F172A]">
                      {item.name}
                    </h3>
                    <p className="truncate text-xs text-[#64748B]">{item.domain}</p>
                  </div>
                </button>

                <button
                  type="button"
                  data-no-glass="true"
                  onClick={() => onToggleFollow(item.id)}
                  className="inline-flex shrink-0 items-center gap-1 rounded-full border border-[#0027eb]/30 bg-[#EEF2FF] px-3 py-1 text-[11px] font-semibold text-[#0027eb] transition-colors hover:bg-[#dde5ff]"
                >
                  <Check className="h-3 w-3" />
                  Following
                </button>
              </div>

              <div className="mt-4 flex items-center justify-between border-t border-[#F1F4F9] pt-3">
                <div className="flex items-center gap-4 font-mono-num text-xs">
                  <span className="inline-flex items-center gap-1.5 font-semibold text-[#0F172A]">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#22C55E]" />
                    {item.activeAds} active
                  </span>
                  <span className="text-[#64748B]">{item.totalAds} total</span>
                </div>

                {item.isTracked ? (
                  <button
                    type="button"
                    data-no-glass="true"
                    onClick={() => onOpenBrand(item.id)}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-[#0027eb] hover:underline"
                  >
                    Open brand
                    <ArrowUpRight className="h-3.5 w-3.5" />
                  </button>
                ) : (
                  <span className="rounded-md bg-[#F7F8FB] px-2 py-0.5 text-[11px] font-medium text-[#64748B]">
                    {item.category}
                  </span>
                )}
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-[#E6E9F0] bg-white">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px] border-collapse text-left">
              <thead>
                <tr className="border-b border-[#EAECEF] bg-[#F7F8FB] text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">
                  <th className="px-4 py-3">Brand</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Active ads</th>
                  <th className="px-4 py-3">Total ads</th>
                  <th className="px-4 py-3 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F4F9]">
                {followedItems.map((item) => (
                  <tr key={item.id} className="hover:bg-[#F7F8FB]/75">
                    <td className="px-4 py-3">
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
                            className="h-8 w-8 rounded-full border border-[#E6E9F0] object-cover"
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
                          <div className="font-display text-xs font-semibold text-[#0F172A]">
                            {item.name}
                          </div>
                          <div className="text-[11px] text-[#64748B]">
                            {item.domain}
                          </div>
                        </div>
                      </button>
                    </td>
                    <td className="px-4 py-3 text-xs text-[#475569]">
                      {item.category}
                    </td>
                    <td className="px-4 py-3 font-mono-num text-xs font-semibold text-[#0F172A]">
                      {item.activeAds}
                    </td>
                    <td className="px-4 py-3 font-mono-num text-xs text-[#475569]">
                      {item.totalAds}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        data-no-glass="true"
                        onClick={() => onToggleFollow(item.id)}
                        className="inline-flex items-center gap-1 rounded-full border border-[#0027eb]/30 bg-[#EEF2FF] px-3 py-1 text-xs font-semibold text-[#0027eb]"
                      >
                        <Check className="h-3 w-3" />
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
   5. SAVED ADS SUB-VIEW (/workspace/saved/ads)
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
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [boardFilter, setBoardFilter] = useState("all");
  const [formatFilter, setFormatFilter] = useState<
    "all" | "video" | "image" | "carousel"
  >("all");
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
  }, [savedAds, boardFilter, formatFilter, search, sortBy]);

  return (
    <div className="animate-view-in space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-[#0F172A]">
            Saved Ads
          </h1>
          <p className="mt-1 text-sm text-[#64748B]">
            Your bookmarked creatives organized across folders for inspiration and cloning.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="rounded-full border border-[#E6E9F0] bg-[#F7F8FB] px-3 py-1 font-mono-num text-xs font-semibold text-[#334155]">
            {savedAds.length} saved
          </span>
          {onOpenUpload && (
            <button
              type="button"
              data-no-glass="true"
              onClick={onOpenUpload}
              className="inline-flex items-center gap-1.5 rounded-xl border border-[#E6E9F0] bg-white px-3.5 py-2 text-xs font-semibold text-[#0F172A] transition-colors hover:border-[#CBD5E1] hover:bg-[#F7F8FB]"
            >
              <Upload className="h-3.5 w-3.5" />
              Upload
            </button>
          )}
        </div>
      </div>

      {/* Search + Filters + Sort Bar */}
      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#64748B]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search for my saved ads"
            className="h-10 w-full rounded-xl border border-[#E6E9F0] bg-white pl-10 pr-8 text-sm text-[#0F172A] placeholder:text-[#94A3B8] outline-none transition-colors focus:border-[#0027eb]"
          />
          {search && (
            <button
              type="button"
              data-no-glass="true"
              onClick={() => setSearch("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-[#0F172A]"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            data-no-glass="true"
            onClick={() => setFiltersOpen((v) => !v)}
            className={`inline-flex items-center gap-1.5 rounded-xl border px-3.5 py-2 text-xs font-semibold transition-colors ${
              filtersOpen || boardFilter !== "all" || formatFilter !== "all"
                ? "border-[#0027eb]/30 bg-[#EEF2FF] text-[#0027eb]"
                : "border-[#E6E9F0] bg-white text-[#0F172A] hover:bg-[#F7F8FB]"
            }`}
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            Filters
            {filtersOpen ? (
              <ChevronUp className="h-3.5 w-3.5" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5" />
            )}
          </button>

          <FlakeSelect
            ariaLabel="Sort saved ads"
            value={sortBy}
            onChange={(v) => setSortBy(v as "recent" | "longest" | "reach")}
            variant="bordered"
            options={[
              { value: "recent", label: "Sort: Recently added" },
              { value: "longest", label: "Sort: Longest running" },
              { value: "reach", label: "Sort: Highest reach" },
            ]}
          />
        </div>
      </div>

      {/* Collapsible Filters Panel */}
      {filtersOpen && (
        <div className="flex flex-wrap items-center gap-2.5 rounded-2xl border border-[#E6E9F0] bg-white p-3.5">
          <FlakeSelect
            ariaLabel="Folder filter"
            value={boardFilter}
            onChange={setBoardFilter}
            variant="bordered"
            isActive={boardFilter !== "all"}
            options={[
              { value: "all", label: "Folder: All folders" },
              ...boards.map((b) => ({ value: b.id, label: b.name })),
            ]}
          />

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

          {(boardFilter !== "all" || formatFilter !== "all" || search) && (
            <button
              type="button"
              data-no-glass="true"
              onClick={() => {
                setBoardFilter("all");
                setFormatFilter("all");
                setSearch("");
              }}
              className="inline-flex items-center gap-1 rounded-xl border border-[#E6E9F0] bg-[#F7F8FB] px-3 py-2 text-xs font-medium text-[#475569] hover:text-[#0F172A]"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Reset
            </button>
          )}
        </div>
      )}

      {/* Grid or Empty State */}
      {savedAds.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[#CBD5E1] bg-white px-6 py-16 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#EEF2FF] text-[#0027eb]">
            <Bookmark className="h-6 w-6" />
          </div>
          <h2 className="mt-4 font-display text-lg font-bold text-[#0F172A]">
            You haven&apos;t saved any ads
          </h2>
          <p className="mt-1 max-w-md text-sm text-[#64748B]">
            Bookmark winning ads from Discovery or upload your own creatives to build swipe folders.
          </p>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-2.5">
            <button
              type="button"
              onClick={onBrowseAds}
              className="adtrack-btn-primary inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-xs font-semibold text-white"
            >
              Browse ads
              <ArrowUpRight className="h-3.5 w-3.5" />
            </button>
            {onOpenUpload && (
              <button
                type="button"
                data-no-glass="true"
                onClick={onOpenUpload}
                className="inline-flex items-center gap-1.5 rounded-xl border border-[#E6E9F0] bg-white px-4 py-2.5 text-xs font-semibold text-[#0F172A] hover:bg-[#F7F8FB]"
              >
                <Upload className="h-3.5 w-3.5" />
                Upload ad
              </button>
            )}
          </div>
        </div>
      ) : filteredAds.length === 0 ? (
        <div className="rounded-2xl border border-[#E6E9F0] bg-white px-6 py-12 text-center">
          <p className="font-display text-sm font-semibold text-[#0F172A]">
            No saved ads match your current filters
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 items-start gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
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
