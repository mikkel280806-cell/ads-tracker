"use client";

import React, { useMemo, useState } from "react";
import {
  Bookmark,
  ChevronDown,
  Flame,
  Globe,
  Play,
  Plus,
  Search,
  ShoppingBag,
  SlidersHorizontal,
  TrendingUp,
} from "lucide-react";
import type { Ad, Brand } from "@/lib/types";
import { formatReach } from "@/lib/url-parser";

interface ShopsTableViewProps {
  brands: Brand[];
  ads: Ad[];
  onOpenShop: (brandId: string) => void;
  onOpenAd: (ad: Ad) => void;
  onAddBrand: (brand: Brand) => void;
}

type PresetTab = "all" | "scaling" | "leaders" | "ad_peak";
type ShopSort = "visits" | "ads" | "growth";

function MiniAreaChart({
  values,
  positive = true,
  color,
}: {
  values: number[];
  positive?: boolean;
  color?: string;
}) {
  if (values.length < 2) return null;
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const range = Math.max(1, max - min);
  const w = 110;
  const h = 32;

  const pts = values.map((v, i) => {
    const x = (i / (values.length - 1)) * w;
    const y = h - 4 - ((v - min) / range) * (h - 8);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });

  const linePath = `M ${pts.join(" L ")}`;
  const areaPath = `${linePath} L ${w},${h} L 0,${h} Z`;
  const stroke = color || (positive ? "#16A34A" : "#E11D48");
  const fill = color
    ? "rgba(0, 39, 235, 0.14)"
    : positive
      ? "rgba(22, 163, 74, 0.14)"
      : "rgba(225, 29, 72, 0.13)";

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-8 w-[110px] overflow-visible">
      <path d={areaPath} fill={fill} />
      <path
        d={linePath}
        fill="none"
        stroke={stroke}
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function ShopsTableView({
  brands,
  ads,
  onOpenShop,
  onOpenAd,
  onAddBrand,
}: ShopsTableViewProps) {
  const [query, setQuery] = useState("");
  const [preset, setPreset] = useState<PresetTab>("all");
  const [sortBy, setSortBy] = useState<ShopSort>("visits");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [showAddForm, setShowAddForm] = useState(false);

  // Add brand fields
  const [name, setName] = useState("");
  const [website, setWebsite] = useState("");
  const [category, setCategory] = useState("E-commerce");
  const [metaUrl, setMetaUrl] = useState("");

  const categories = useMemo(
    () => Array.from(new Set(brands.map((b) => b.category))),
    [brands]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = brands.filter((b) => {
      if (preset === "scaling" && b.traffic_growth_pct < 80) return false;
      if (preset === "leaders" && b.monthly_visits < 300000) return false;
      if (preset === "ad_peak" && b.active_ads_count < 70) return false;
      if (categoryFilter !== "all" && b.category !== categoryFilter) return false;
      if (q) {
        const hay = `${b.name} ${b.handle} ${b.website_url} ${b.category}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });

    return [...list].sort((a, b) => {
      if (sortBy === "ads") return b.active_ads_count - a.active_ads_count;
      if (sortBy === "growth") return b.traffic_growth_pct - a.traffic_growth_pct;
      return b.monthly_visits - a.monthly_visits;
    });
  }, [brands, preset, categoryFilter, query, sortBy]);

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    const initials = name
      .trim()
      .split(/\s+/)
      .map((w) => w[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();

    const newBrand: Brand = {
      id: `brand-${Date.now()}`,
      name: name.trim(),
      handle: `@${name.trim().toLowerCase().replace(/\s+/g, "")}`,
      avatar_initials: initials || "SH",
      avatar_color: "#0027eb",
      website_url: website.trim() || "https://example.com",
      meta_ad_library_url: metaUrl.trim() || undefined,
      category: category.trim() || "E-commerce",
      is_shopify: true,
      shopify_theme: "Dawn",
      founded_date: new Date().toLocaleDateString("en-GB"),
      origin_country: "🇩🇰 DK",
      currency: "DKK",
      products_count: 12,
      is_tracked: true,
      active_ads_count: 15,
      estimated_monthly_reach: 120000,
      monthly_visits: 64000,
      traffic_growth_pct: 42,
      traffic_history: [
        { label: "jun", visits: 28000 },
        { label: "jul", visits: 34000 },
        { label: "aug", visits: 41000 },
        { label: "sep", visits: 48000 },
        { label: "okt", visits: 55000 },
        { label: "nov", visits: 64000 },
      ],
      ads_history: [4, 6, 7, 9, 11, 12, 13, 14, 15, 15],
      visitor_countries: [{ code: "DK", flag: "🇩🇰", pct: 100 }],
      trustpilot_score: 4.5,
      trustpilot_reviews: 120,
      ig_followers: 8400,
      pixels: ["Meta Pixel", "Google Analytics 4"],
      last_synced_at: new Date().toISOString(),
    };

    onAddBrand(newBrand);
    setName("");
    setWebsite("");
    setMetaUrl("");
    setShowAddForm(false);
  };

  return (
    <div className="space-y-5">
      {/* Top TrendTrack Header: Title + Count + Centered Search + Add Shop */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-2.5">
          <h1 className="font-display text-2xl font-bold tracking-tight text-[#111318]">
            Shops &amp; Brandtracker
          </h1>
          <span className="rounded-md bg-[#F2F4F7] px-2 py-0.5 font-mono-num text-xs font-semibold text-[#475467]">
            {filtered.length}
          </span>
        </div>

        <div className="flex flex-1 items-center gap-2 md:max-w-md">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#98A2B3]" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Søg shops, domæner eller nicher..."
              className="w-full rounded-xl border border-[#E6E8EC] bg-[#F8F9FB] py-2 pl-9 pr-3 text-sm text-[#111318] outline-none transition-colors focus:border-[#0027eb] focus:bg-white"
            />
          </div>

          <button
            type="button"
            onClick={() => setShowAddForm((v) => !v)}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-[#0027eb] px-3.5 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#001fc2]"
          >
            <Plus className="h-4 w-4" />
            Tilføj shop
          </button>
        </div>
      </div>

      {/* Add Shop Form */}
      {showAddForm && (
        <form
          onSubmit={handleAdd}
          className="animate-sheet-up grid grid-cols-1 gap-3 rounded-2xl border border-[#E6E8EC] bg-[#FAFBFD] p-4 sm:grid-cols-2 lg:grid-cols-4"
        >
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Shop navn (fx Loop Earplugs)"
            className="rounded-xl border border-[#E2E5EB] bg-white px-3 py-2 text-sm outline-none focus:border-[#0027eb]"
          />
          <input
            type="url"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            placeholder="https://shop.dk"
            className="rounded-xl border border-[#E2E5EB] bg-white px-3 py-2 text-sm outline-none focus:border-[#0027eb]"
          />
          <input
            type="text"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="Kategori (fx Hudpleje)"
            className="rounded-xl border border-[#E2E5EB] bg-white px-3 py-2 text-sm outline-none focus:border-[#0027eb]"
          />
          <div className="flex gap-2">
            <input
              type="url"
              value={metaUrl}
              onChange={(e) => setMetaUrl(e.target.value)}
              placeholder="Meta Ad Library URL"
              className="min-w-0 flex-1 rounded-xl border border-[#E2E5EB] bg-white px-3 py-2 text-sm outline-none focus:border-[#0027eb]"
            />
            <button
              type="submit"
              className="shrink-0 rounded-xl bg-[#0027eb] px-4 py-2 text-xs font-semibold text-white hover:bg-[#001fc2]"
            >
              Gem
            </button>
          </div>
        </form>
      )}

      {/* TrendTrack Preset Tabs (Primary #0027eb active pill) */}
      <div className="no-scrollbar flex items-center gap-2 overflow-x-auto pb-0.5">
        {[
          { id: "all" as const, label: "All Shops", icon: Globe },
          { id: "scaling" as const, label: "Top Scaling (+80%)", icon: TrendingUp },
          { id: "leaders" as const, label: "Market Leaders & DTC", icon: ShoppingBag },
          { id: "ad_peak" as const, label: "Shop's Ad Peak (70+ Ads)", icon: Flame },
        ].map((item) => {
          const Icon = item.icon;
          const active = preset === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setPreset(item.id)}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all"
              style={
                active
                  ? { backgroundColor: "#0027eb", color: "#FFFFFF" }
                  : { backgroundColor: "#F3F4F6", color: "#475467" }
              }
            >
              <Icon className="h-3.5 w-3.5" />
              {item.label}
            </button>
          );
        })}
      </div>

      {/* TrendTrack Filter Bar Card */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 rounded-2xl border border-[#EAECEF] bg-[#F9FAFB] px-3.5 py-2.5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[#667085]">
            Filters
          </span>
          <select
            aria-label="Filtrer kategori"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="rounded-lg border border-[#E2E5EB] bg-white px-2.5 py-1.5 text-xs font-medium text-[#344054] outline-none"
          >
            <option value="all">Alle kategorier</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <SlidersHorizontal className="h-3.5 w-3.5 text-[#667085]" />
          <div className="relative">
            <select
              aria-label="Sortér shops"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as ShopSort)}
              className="appearance-none rounded-lg border border-[#E2E5EB] bg-white py-1.5 pl-2.5 pr-7 text-xs font-semibold text-[#111318] outline-none"
            >
              <option value="visits">Monthly Visits (SimilarWeb)</option>
              <option value="ads">Flest aktive Meta Ads</option>
              <option value="growth">Højeste trafikvækst (%)</option>
            </select>
            <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#667085]" />
          </div>
        </div>
      </div>

      {/* TRENDTRACK SHOPS DATA TABLE (Desktop) + STACKED CARDS (Mobile) */}
      <div className="overflow-hidden rounded-2xl border border-[#E6E8EC] bg-white">
        {/* Table Header (Desktop) */}
        <div className="hidden grid-cols-[2.1fr_1.1fr_1.3fr_1.3fr_1.4fr] items-center gap-4 border-b border-[#EAECEF] bg-[#FAFBFD] px-4 py-2.5 text-[11px] font-semibold text-[#667085] lg:grid">
          <span>Shop Infos</span>
          <span>Category</span>
          <span>Monthly Visits</span>
          <span>Meta Ads</span>
          <span>Top Ads</span>
        </div>

        <div className="divide-y divide-[#F1F3F6]">
          {filtered.map((brand) => {
            const brandAds = ads.filter((a) => a.brand_id === brand.id);
            const domain = brand.website_url.replace(/^https?:\/\//, "").replace(/^www\./, "");
            const visitsGrowing = brand.traffic_growth_pct >= 0;

            return (
              <div
                key={brand.id}
                className="grid grid-cols-1 items-center gap-4 px-4 py-3.5 transition-colors hover:bg-[#FAFBFD] lg:grid-cols-[2.1fr_1.1fr_1.3fr_1.3fr_1.4fr]"
              >
                {/* 1. Shop Infos */}
                <button
                  type="button"
                  onClick={() => onOpenShop(brand.id)}
                  className="flex items-center gap-3 text-left"
                >
                  {/* Mini Storefront Preview Tile */}
                  <div className="relative h-14 w-20 shrink-0 overflow-hidden rounded-xl border border-[#E6E8EC] bg-[#111318]">
                    {brandAds[0] ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={brandAds[0].thumbnail_url}
                        alt={brand.name}
                        className="h-full w-full object-cover opacity-85"
                      />
                    ) : (
                      <div
                        className="flex h-full w-full items-center justify-center text-sm font-bold text-white"
                        style={{ backgroundColor: brand.avatar_color }}
                      >
                        {brand.avatar_initials}
                      </div>
                    )}
                    <span className="absolute bottom-1 left-1 rounded bg-black/75 px-1.5 py-0.5 text-[9px] font-semibold text-white">
                      Analytics
                    </span>
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="truncate text-sm font-bold text-[#111318] hover:text-[#0027eb]">
                        {brand.name}
                      </span>
                      <Bookmark className="h-3.5 w-3.5 text-[#98A2B3]" />
                    </div>
                    <div className="mt-0.5 flex items-center gap-1.5 text-xs text-[#667085]">
                      <span className="truncate">{domain}</span>
                      {brand.is_shopify && (
                        <span
                          title="Shopify Store"
                          className="inline-flex h-4 w-4 items-center justify-center rounded bg-[#ECFDF3] text-[#15803D]"
                        >
                          <ShoppingBag className="h-2.5 w-2.5" />
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-[11px] text-[#98A2B3]">
                      {brand.origin_country} · {brand.founded_date} · {brand.products_count} produkter
                    </p>
                  </div>
                </button>

                {/* 2. Category Pill */}
                <div className="flex items-center justify-between lg:block">
                  <span className="text-[11px] font-medium text-[#667085] lg:hidden">
                    Kategori
                  </span>
                  <span className="inline-flex rounded-lg bg-[#F2F4F7] px-2.5 py-1 text-xs font-medium text-[#344054]">
                    {brand.category}
                  </span>
                </div>

                {/* 3. Monthly Visits (SimilarWeb Style + Area Chart) */}
                <button
                  type="button"
                  onClick={() => onOpenShop(brand.id)}
                  className="flex items-center justify-between gap-2 text-left lg:flex-col lg:items-start"
                >
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono-num text-sm font-bold text-[#111318]">
                        {formatReach(brand.monthly_visits)}
                      </span>
                      <span
                        className="rounded px-1.5 py-0.5 font-mono-num text-[10px] font-semibold"
                        style={
                          visitsGrowing
                            ? { backgroundColor: "#ECFDF3", color: "#15803D" }
                            : { backgroundColor: "#FFF1F2", color: "#E11D48" }
                        }
                      >
                        {visitsGrowing ? `+${brand.traffic_growth_pct}%` : `${brand.traffic_growth_pct}%`}
                      </span>
                      <span className="text-xs">
                        {brand.visitor_countries.slice(0, 3).map((c) => c.flag).join(" ")}
                      </span>
                    </div>
                  </div>
                  <MiniAreaChart
                    values={brand.traffic_history.map((p) => p.visits)}
                    positive={visitsGrowing}
                  />
                </button>

                {/* 4. Meta Ads Active + Sparkline */}
                <button
                  type="button"
                  onClick={() => onOpenShop(brand.id)}
                  className="flex items-center justify-between gap-2 text-left lg:flex-col lg:items-start"
                >
                  <div className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-[#16A34A]" />
                    <span className="font-mono-num text-sm font-bold text-[#111318]">
                      {brand.active_ads_count}
                    </span>
                    <span className="text-xs text-[#667085]">live ads</span>
                  </div>
                  <MiniAreaChart values={brand.ads_history} color="#0027eb" />
                </button>

                {/* 5. Top 3 Ad Thumbnails */}
                <div className="flex items-center gap-1.5">
                  {brandAds.slice(0, 3).map((ad) => (
                    <button
                      key={ad.id}
                      type="button"
                      onClick={() => onOpenAd(ad)}
                      className="group/t relative h-14 w-12 overflow-hidden rounded-lg border border-[#E6E8EC] bg-[#F3F4F6] transition-transform hover:scale-105"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={ad.thumbnail_url}
                        alt={ad.headline}
                        className="h-full w-full object-cover"
                      />
                      {ad.media_type === "video" && (
                        <span className="absolute inset-0 flex items-center justify-center bg-black/15">
                          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/95 text-[#111318]">
                            <Play className="ml-0.5 h-2.5 w-2.5 fill-current" />
                          </span>
                        </span>
                      )}
                    </button>
                  ))}

                  <button
                    type="button"
                    onClick={() => onOpenShop(brand.id)}
                    className="ml-auto rounded-lg border border-[#E2E5EB] bg-white px-2.5 py-1.5 text-[11px] font-semibold text-[#111318] transition-colors hover:border-[#0027eb] hover:text-[#0027eb]"
                  >
                    Åbn →
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
