"use client";

import React, { useMemo, useState } from "react";
import {
  ArrowUpRight,
  Bookmark,
  Check,
  Globe,
  Loader2,
  Package,
  Plus,
  Search,
  Sparkles,
  Store,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import type { Ad, Board, Brand, MarketCode, TrafficPoint } from "@/lib/types";
import { formatReach } from "@/lib/url-parser";
import {
  MetaInfinityIcon,
  ShopifyBagIcon,
  TechBrandIcon,
} from "./BrandIcons";

interface ShopsTableViewProps {
  brands: Brand[];
  ads: Ad[];
  boards: Board[];
  onOpenShop: (brandId: string) => void;
  onAddBrand: (brand: Brand, discoveredAds?: Ad[]) => void;
  onToggleBrandFolder: (brandId: string, boardId: string) => void;
}

type SortKey = "ads" | "visits" | "products" | "tech";

const QUICK_SUGGESTIONS = [
  "bareen.com",
  "liewood.com",
  "aloyoga.com",
  "carawayhome.com",
];

function MiniSparkline({
  data,
  positive,
}: {
  data?: TrafficPoint[];
  positive: boolean;
}) {
  if (!data || data.length < 2) return null;
  const w = 68;
  const h = 24;
  const vals = data.slice(-7).map((d) => d.visits);
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const span = Math.max(1, max - min);

  const pts = vals
    .map((v, i) => {
      const x = (i / (vals.length - 1)) * w;
      const y = h - 3 - ((v - min) / span) * (h - 6);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  const stroke = positive ? "#0027eb" : "#E11D48";

  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="shrink-0 overflow-visible">
      <polyline
        fill="none"
        stroke={stroke}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={pts}
      />
    </svg>
  );
}

export function ShopsTableView({
  brands,
  ads,
  boards,
  onOpenShop,
  onAddBrand,
  onToggleBrandFolder,
}: ShopsTableViewProps) {
  const [lookupInput, setLookupInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [marketFilter, setMarketFilter] = useState<"ALL" | MarketCode>("ALL");
  const [techFilter, setTechFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<SortKey>("ads");
  const [searchQuery, setSearchQuery] = useState("");
  const [openFolderMenuId, setOpenFolderMenuId] = useState<string | null>(null);

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

  const filteredBrands = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const list = brands.filter((b) => {
      if (marketFilter === "DK" && b.market !== "DK") return false;
      if (marketFilter === "US" && b.market === "DK") return false;
      if (techFilter !== "all") {
        const allTech = [...(b.pixels || []), ...(b.shopify_apps || [])];
        if (!allTech.includes(techFilter)) return false;
      }
      if (q) {
        const hay = [
          b.name,
          b.website_url,
          b.myshopify_domain,
          b.category,
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
  }, [brands, marketFilter, techFilter, searchQuery, sortBy]);

  const totalLiveAdsAcrossIndex = useMemo(
    () =>
      filteredBrands.reduce(
        (sum, b) => sum + (b.active_ads_count || 0),
        0
      ),
    [filteredBrands]
  );

  return (
    <div className="space-y-5">
      {/* HEADER */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="adtrack-icon-badge flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-white">
            <Store className="h-5 w-5" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-display text-[20px] font-bold leading-tight text-[#0F172A]">
                Shops
              </h1>
              <span className="rounded-full bg-[#EEF2FF] px-2.5 py-0.5 font-mono-num text-[11px] font-bold text-[#0027eb]">
                {brands.length} shops
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#ECFDF3] px-2.5 py-0.5 font-mono-num text-[11px] font-bold text-[#15803D]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#16A34A]" />
                {totalLiveAdsAcrossIndex.toLocaleString("en-US")} live Meta ads
              </span>
            </div>
            <p className="mt-0.5 text-[12.5px] text-[#64748B]">
              Danske &amp; amerikanske Shopify-shops med live Meta Ads, trafik, produkter, pixels, apps, hooks og landing pages
            </p>
          </div>
        </div>
      </div>

      {/* 1-FIELD LIVE SHOP SCRAPER BAR */}
      <div className="relative overflow-hidden rounded-2xl border border-[#DCE3F5] bg-gradient-to-br from-[#F8FAFF] via-white to-[#EEF2FF]/60 p-3.5 shadow-[0_2px_12px_rgba(0,39,235,0.05)]">
        <form
          onSubmit={handleSubmit}
          className="flex flex-col gap-2 sm:flex-row sm:items-center"
        >
          <div className="flex min-w-0 flex-1 items-center gap-2.5 rounded-xl border border-[#DCE1EC] bg-white px-3.5 py-2.5 shadow-xs transition-all focus-within:border-[#0027eb] focus-within:ring-4 focus-within:ring-[#0027eb]/10">
            <Globe className="h-4 w-4 shrink-0 text-[#0027eb]" />
            <input
              id="brand-magic-input"
              type="text"
              value={lookupInput}
              onChange={(e) => setLookupInput(e.target.value)}
              placeholder="Scrape ny dansk eller amerikansk shop (skriv brandnavn eller URL — fx bareen.com, aloyoga.com)..."
              className="w-full bg-transparent text-[13.5px] text-[#0F172A] outline-none placeholder:text-[#94A3B8]"
            />
          </div>

          <button
            id="brand-magic-submit"
            type="submit"
            disabled={loading || !lookupInput.trim()}
            className="adtrack-btn-primary inline-flex shrink-0 items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-xs font-semibold text-white transition-all disabled:opacity-45"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Scraper shop &amp; Meta ads...
              </>
            ) : (
              <>
                <Plus className="h-4 w-4" />
                Scrape Shop
              </>
            )}
          </button>
        </form>

        <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 px-0.5 text-[11.5px]">
          <span className="inline-flex items-center gap-1.5 text-[#64748B]">
            <Sparkles className="h-3.5 w-3.5 text-[#0027eb]" />
            Henter live: Shopify produkter, pixels, Shopify apps, månedlig trafik, landing pages, hooks &amp; live Meta Ad Library.
          </span>

          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-medium text-[#94A3B8]">
              Tilføj hurtigt:
            </span>
            {QUICK_SUGGESTIONS.map((domain) => (
              <button
                key={domain}
                type="button"
                disabled={loading}
                onClick={() => runBrandLookup(domain)}
                className="rounded-lg border border-[#DCE1EC] bg-white px-2.5 py-0.5 font-mono-num text-[11px] font-semibold text-[#334155] transition-colors hover:border-[#0027eb] hover:text-[#0027eb] disabled:opacity-40"
              >
                + {domain}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <p className="mt-2.5 rounded-xl border border-[#FECDD3] bg-[#FFF1F2] px-3 py-2 text-xs font-medium text-[#E11D48]">
            {error}
          </p>
        )}
      </div>

      {/* FILTER & MARKET BAR */}
      <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-center">
        {/* Market Segmented Pills (All / DK / US) */}
        <div className="inline-flex w-fit items-center rounded-xl border border-[#E6E9F0] bg-[#F5F7FA] p-1 text-xs font-semibold">
          {[
            { id: "ALL" as const, label: "Alle Markets", count: brands.length },
            { id: "DK" as const, label: "🇩🇰 Danmark", count: dkCount },
            { id: "US" as const, label: "🇺🇸 USA & Global", count: usCount },
          ].map((m) => {
            const active = marketFilter === m.id;
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => setMarketFilter(m.id)}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 transition-all ${
                  active
                    ? "bg-white text-[#0F172A] shadow-xs"
                    : "text-[#64748B] hover:text-[#0F172A]"
                }`}
              >
                <span>{m.label}</span>
                <span
                  className={`rounded-md px-1.5 py-px font-mono-num text-[10px] font-bold ${
                    active
                      ? "bg-[#EEF2FF] text-[#0027eb]"
                      : "bg-[#E9EDF4] text-[#64748B]"
                  }`}
                >
                  {m.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search + Tech Filter + Sort */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[200px] flex-1 sm:w-56 sm:flex-none">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#94A3B8]" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Søg shop, tema, app..."
              className="w-full rounded-xl border border-[#E2E6EF] bg-white py-2 pl-8.5 pr-3 text-xs text-[#0F172A] outline-none transition-colors focus:border-[#0027eb]"
            />
          </div>

          <select
            aria-label="Filtrer efter pixel eller Shopify app"
            value={techFilter}
            onChange={(e) => setTechFilter(e.target.value)}
            className="rounded-xl border border-[#E2E6EF] bg-white px-3 py-2 text-xs font-medium text-[#334155] outline-none focus:border-[#0027eb]"
          >
            <option value="all">Alle Pixels &amp; Apps</option>
            {allTechTools.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>

          <select
            aria-label="Sortér shops"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortKey)}
            className="rounded-xl border border-[#E2E6EF] bg-white px-3 py-2 text-xs font-semibold text-[#0F172A] outline-none focus:border-[#0027eb]"
          >
            <option value="ads">Flest Live Ads</option>
            <option value="visits">Højest Monthly Visits</option>
            <option value="products">Flest Produkter</option>
            <option value="tech">Flest Pixels &amp; Apps</option>
          </select>
        </div>
      </div>

      {/* TRENDTRACK SHOPS DATA TABLE */}
      <div className="adtrack-card overflow-visible rounded-2xl">
        <div className="hidden grid-cols-[2.2fr_1.35fr_1.05fr_1.35fr_1.45fr_0.85fr] items-center gap-4 border-b border-[#EFF2F6] bg-[#FAFBFD] px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-[#64748B] xl:grid">
          <span>Shop &amp; Market</span>
          <span>Monthly Visits</span>
          <span>Live Meta Ads</span>
          <span>Top Products</span>
          <span>Pixels &amp; Shopify Apps</span>
          <span className="text-right">Actions</span>
        </div>

        <div className="divide-y divide-[#F1F4F9]">
          {filteredBrands.map((brand) => {
            const brandAds = ads.filter((a) => a.brand_id === brand.id);
            const domain = brand.website_url
              .replace(/^https?:\/\//, "")
              .replace(/^www\./, "")
              .replace(/\/.*$/, "");
            const products = brand.top_products || [];
            const allTech = [
              ...(brand.pixels || []),
              ...(brand.shopify_apps || []),
            ];
            const growthPositive = (brand.traffic_growth_pct ?? 0) >= 0;
            const marketFlag =
              brand.country_code === "FR"
                ? "🇫🇷"
                : brand.market === "DK"
                  ? "🇩🇰"
                  : brand.market === "EU"
                    ? "🇪🇺"
                    : "🇺🇸";
            const savedInFolder = (brand.folder_ids || []).length > 0;

            return (
              <div
                key={brand.id}
                className="group relative grid grid-cols-1 items-center gap-4 px-5 py-4 transition-colors hover:bg-[#FAFBFD] xl:grid-cols-[2.2fr_1.35fr_1.05fr_1.35fr_1.45fr_0.85fr]"
              >
                {/* 1. BRAND & STOREFRONT */}
                <button
                  type="button"
                  onClick={() => onOpenShop(brand.id)}
                  className="flex min-w-0 items-center gap-3.5 text-left"
                >
                  <div className="relative h-14 w-16 shrink-0 overflow-hidden rounded-xl border border-[#E6E9F0] bg-[#F7F8FB]">
                    {brand.storefront_image_url ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={brand.storefront_image_url}
                        alt={brand.name}
                        loading="lazy"
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center font-display text-xs font-bold text-[#0027eb]">
                        {brand.avatar_initials}
                      </div>
                    )}
                    <span
                      title={brand.market}
                      className="absolute bottom-1 left-1 rounded bg-white/95 px-1 text-[10px] shadow-xs"
                    >
                      {marketFlag}
                    </span>
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      {brand.logo_url && (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={brand.logo_url}
                          alt=""
                          className="h-4 w-4 shrink-0 rounded-full border border-[#E6E9F0] bg-white object-contain"
                        />
                      )}
                      <span className="truncate font-display text-[14.5px] font-bold text-[#0F172A] transition-colors group-hover:text-[#0027eb]">
                        {brand.name}
                      </span>
                      {brand.is_shopify && (
                        <ShopifyBagIcon className="h-3.5 w-3.5 shrink-0" />
                      )}
                    </div>

                    <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11.5px] text-[#64748B]">
                      <span className="truncate font-mono-num">{domain}</span>
                      <span className="text-[#CBD5E1]">·</span>
                      <span className="truncate">{brand.category}</span>
                    </div>

                    {brand.shopify_theme && (
                      <div className="mt-1 flex items-center gap-1.5">
                        <span className="truncate rounded-md bg-[#F1F5F9] px-1.5 py-0.5 font-mono-num text-[10px] font-medium text-[#475569]">
                          {brand.shopify_theme}
                        </span>
                        {brand.currency && (
                          <span className="rounded-md bg-[#F1F5F9] px-1.5 py-0.5 font-mono-num text-[10px] font-semibold text-[#475569]">
                            {brand.currency}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </button>

                {/* 2. MONTHLY VISITS + MINI SPARKLINE */}
                <button
                  type="button"
                  onClick={() => onOpenShop(brand.id)}
                  className="flex items-center justify-between gap-2 text-left xl:justify-start"
                >
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-display text-[15px] font-bold text-[#0F172A]">
                        {formatReach(brand.monthly_visits)}
                      </span>
                      {typeof brand.traffic_growth_pct === "number" && (
                        <span
                          className={`inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 font-mono-num text-[10px] font-bold ${
                            growthPositive
                              ? "bg-[#ECFDF3] text-[#15803D]"
                              : "bg-[#FFF1F2] text-[#E11D48]"
                          }`}
                        >
                          {growthPositive ? (
                            <TrendingUp className="h-2.5 w-2.5" />
                          ) : (
                            <TrendingDown className="h-2.5 w-2.5" />
                          )}
                          {growthPositive ? "+" : ""}
                          {brand.traffic_growth_pct}%
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-[10.5px] text-[#94A3B8]">
                      monthly visits
                    </p>
                  </div>
                  <MiniSparkline
                    data={brand.traffic_history}
                    positive={growthPositive}
                  />
                </button>

                {/* 3. LIVE META ADS */}
                <button
                  type="button"
                  onClick={() => onOpenShop(brand.id)}
                  className="flex flex-col items-start text-left"
                >
                  <div className="flex items-center gap-1.5">
                    <MetaInfinityIcon className="h-4 w-4 shrink-0" />
                    <span className="font-display text-[15px] font-bold text-[#0F172A]">
                      {(brand.active_ads_count ?? brandAds.length).toLocaleString("en-US")}
                    </span>
                    <span className="h-2 w-2 rounded-full bg-[#16A34A]" />
                  </div>
                  <p className="mt-0.5 font-mono-num text-[10.5px] text-[#64748B]">
                    {brandAds.length} scraped i bibliotek
                  </p>
                </button>

                {/* 4. TOP PRODUCTS PREVIEW */}
                <button
                  type="button"
                  onClick={() => onOpenShop(brand.id)}
                  className="flex items-center gap-2 text-left"
                >
                  {products.length > 0 ? (
                    <>
                      <div className="flex items-center gap-1.5">
                        {products.slice(0, 3).map((prod, i) => (
                          <div
                            key={`${prod.title}-${i}`}
                            title={prod.title}
                            className="h-11 w-11 overflow-hidden rounded-lg border border-[#E6E9F0] bg-[#F7F8FB]"
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
                                <Package className="h-3.5 w-3.5" />
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                      <span className="rounded-lg bg-[#F1F5F9] px-2 py-1 font-mono-num text-[11px] font-bold text-[#334155]">
                        {brand.products_count ?? products.length}
                      </span>
                    </>
                  ) : (
                    <span className="text-xs text-[#94A3B8]">—</span>
                  )}
                </button>

                {/* 5. PIXELS & SHOPIFY APPS ICON CLUSTER */}
                <button
                  type="button"
                  onClick={() => onOpenShop(brand.id)}
                  className="flex flex-nowrap items-center gap-1.5 text-left"
                >
                  {allTech.slice(0, 4).map((tool) => (
                    <span
                      key={tool}
                      title={tool}
                      className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-[#E6E9F0] bg-white shadow-2xs transition-transform hover:scale-110"
                    >
                      <TechBrandIcon name={tool} className="h-4.5 w-4.5" />
                    </span>
                  ))}
                  {allTech.length > 4 && (
                    <span className="inline-flex h-7 shrink-0 items-center rounded-lg bg-[#EEF2FF] px-2 font-mono-num text-[10.5px] font-bold text-[#0027eb]">
                      +{allTech.length - 4}
                    </span>
                  )}
                  {allTech.length === 0 && (
                    <span className="text-xs text-[#94A3B8]">—</span>
                  )}
                </button>

                {/* 6. ACTIONS (Save to Folder + Open Analytics) */}
                <div className="flex items-center justify-end gap-1.5">
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() =>
                        setOpenFolderMenuId((cur) =>
                          cur === brand.id ? null : brand.id
                        )
                      }
                      title="Gem i folder"
                      className="flex h-8 w-8 items-center justify-center rounded-xl border transition-colors"
                      style={
                        savedInFolder
                          ? {
                              backgroundColor: "#EEF2FF",
                              borderColor: "rgba(0,39,235,0.28)",
                              color: "#0027eb",
                            }
                          : {
                              backgroundColor: "#FFFFFF",
                              borderColor: "#E2E6EF",
                              color: "#64748B",
                            }
                      }
                    >
                      <Bookmark
                        className="h-3.5 w-3.5"
                        fill={savedInFolder ? "currentColor" : "none"}
                      />
                    </button>

                    {openFolderMenuId === brand.id && (
                      <div className="absolute right-0 top-9 z-40 w-52 rounded-2xl border border-[#E2E6EF] bg-white p-1.5 shadow-xl">
                        <p className="px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-[#64748B]">
                          Gem shop i folder
                        </p>
                        {boards.map((board) => {
                          const active = (brand.folder_ids || []).includes(
                            board.id
                          );
                          return (
                            <button
                              key={board.id}
                              type="button"
                              onClick={() => {
                                onToggleBrandFolder(brand.id, board.id);
                                setOpenFolderMenuId(null);
                              }}
                              className="flex w-full items-center justify-between rounded-xl px-2.5 py-1.5 text-left text-xs font-medium text-[#0F172A] hover:bg-[#F3F5F9]"
                            >
                              <span className="flex min-w-0 items-center gap-2">
                                <span
                                  className="h-2 w-2 shrink-0 rounded-full"
                                  style={{ backgroundColor: board.accent_color }}
                                />
                                <span className="truncate">{board.name}</span>
                              </span>
                              {active && (
                                <Check className="h-3.5 w-3.5 text-[#0027eb]" />
                              )}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => onOpenShop(brand.id)}
                    className="inline-flex items-center gap-1 rounded-xl bg-[#0F172A] px-3 py-2 text-xs font-semibold text-white transition-all hover:bg-[#0027eb]"
                  >
                    Analyse
                    <ArrowUpRight className="h-3.5 w-3.5" />
                  </button>
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
                Ryd søgefeltet eller scrape en ny shop direkte i feltet ovenfor.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
