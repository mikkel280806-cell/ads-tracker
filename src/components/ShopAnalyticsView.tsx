"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowUpRight,
  Bookmark,
  Calendar,
  Check,
  Copy,
  ExternalLink,
  Film,
  Globe,
  Hash,
  Image as ImageIcon,
  Layers,
  LineChart,
  Link2,
  Package,
  Search,
  Sparkles,
  Tag,
  TrendingDown,
  TrendingUp,
  Users,
  Zap,
} from "lucide-react";
import type { Ad, AdsTimelinePoint, Board, Brand, TrafficPoint } from "@/lib/types";
import { getTechMeta } from "@/lib/tech-catalog";
import { dedupeAds, formatReach, getActiveDays, isDedicatedLandingPage } from "@/lib/url-parser";
import { AdCard } from "./AdCard";
import {
  FacebookColorIcon,
  InstagramColorIcon,
  MetaInfinityIcon,
  ShopifyBagIcon,
  TechBrandIcon,
  TikTokColorIcon,
  YouTubeColorIcon,
} from "./BrandIcons";

interface ShopAnalyticsViewProps {
  brand: Brand;
  ads: Ad[];
  boards: Board[];
  onBack: () => void;
  onOpenAd: (ad: Ad) => void;
  onToggleBoard: (adId: string, boardId: string) => void;
  onToggleBrandFolder: (brandId: string, boardId: string) => void;
  onUpdateBrand: (brandId: string, patch: Partial<Brand>, freshAds?: Ad[]) => void;
}

type MainTab = "analytics" | "meta_ads" | "products";
type MetaSubTab = "library" | "creatives" | "copies" | "headlines" | "hooks" | "lp";

function formatShortDate(iso?: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatMonthYear(iso?: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const months = d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
  const years = Math.max(
    1,
    Math.round((Date.UTC(2026, 10, 21) - d.getTime()) / (1000 * 60 * 60 * 24 * 365))
  );
  return `${months} (${years}y)`;
}

function buildSmoothPath(pts: { x: number; y: number }[]): string {
  if (pts.length < 2) return "";
  let d = `M ${pts[0].x.toFixed(1)},${pts[0].y.toFixed(1)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i];
    const p1 = pts[i + 1];
    const cx = ((p0.x + p1.x) / 2).toFixed(1);
    d += ` C ${cx},${p0.y.toFixed(1)} ${cx},${p1.y.toFixed(1)} ${p1.x.toFixed(1)},${p1.y.toFixed(1)}`;
  }
  return d;
}

function InteractiveAreaChart({
  points,
  color,
  gradientId,
  valuePrefix = "",
  formatVal,
}: {
  points: { label: string; value: number }[];
  color: string;
  gradientId: string;
  valuePrefix?: string;
  formatVal: (v: number) => string;
}) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(560);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => {
      const next = Math.round(el.getBoundingClientRect().width);
      if (next > 0) setContainerWidth(next);
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  if (points.length < 2) {
    return (
      <div className="flex h-[200px] items-center justify-center text-xs text-[#94A3B8]">
        Ingen historiske datapunkter endnu
      </div>
    );
  }

  const w = Math.max(280, containerWidth);
  const h = 205;
  const padL = 36;
  const padR = 10;
  const padT = 18;
  const padB = 24;

  const maxVal = Math.max(...points.map((p) => p.value), 1) * 1.15;

  const coords = points.map((p, i) => {
    const x = padL + (i / (points.length - 1)) * (w - padL - padR);
    const y = h - padB - (p.value / maxVal) * (h - padT - padB);
    return { x, y, ...p };
  });

  const linePath = buildSmoothPath(coords);
  const areaPath = `${linePath} L ${coords[coords.length - 1].x.toFixed(1)},${h - padB} L ${coords[0].x.toFixed(1)},${h - padB} Z`;

  const gridLines = [0, 0.33, 0.66, 1].map((r) => ({
    y: h - padB - r * (h - padT - padB),
    val: Math.round(maxVal * r),
  }));

  const activePt = hoveredIdx !== null ? coords[hoveredIdx] : null;
  const hitBand = Math.max(24, (w - padL - padR) / Math.max(points.length - 1, 1));

  return (
    <div ref={containerRef} className="relative w-full select-none">
      <svg
        width={w}
        height={h}
        viewBox={`0 0 ${w} ${h}`}
        className="block h-[205px] w-full overflow-visible"
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.24" />
            <stop offset="65%" stopColor={color} stopOpacity="0.06" />
            <stop offset="100%" stopColor={color} stopOpacity="0.0" />
          </linearGradient>
        </defs>

        {/* Subtle horizontal dashed grid */}
        {gridLines.map((g, i) => (
          <g key={i}>
            <line
              x1={padL}
              x2={w - padR}
              y1={g.y}
              y2={g.y}
              stroke="#EFF2F6"
              strokeDasharray={i === 0 ? undefined : "3 3"}
              strokeWidth="1"
            />
            <text
              x={padL - 8}
              y={g.y + 3}
              textAnchor="end"
              className="fill-[#94A3B8] font-mono text-[9.5px]"
            >
              {formatVal(g.val)}
            </text>
          </g>
        ))}

        {/* Area + Smooth Line */}
        <path d={areaPath} fill={`url(#${gradientId})`} />
        <path
          d={linePath}
          fill="none"
          stroke={color}
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Hover vertical crosshair */}
        {activePt && (
          <line
            x1={activePt.x}
            x2={activePt.x}
            y1={padT - 4}
            y2={h - padB}
            stroke={color}
            strokeOpacity="0.35"
            strokeDasharray="3 3"
            strokeWidth="1.2"
          />
        )}

        {/* Data points & X-axis labels */}
        {coords.map((c, idx) => {
          const isActive = hoveredIdx === idx;
          return (
            <g
              key={`${c.label}-${idx}`}
              onMouseEnter={() => setHoveredIdx(idx)}
              onMouseLeave={() => setHoveredIdx(null)}
              onClick={() => setHoveredIdx(idx)}
              onTouchStart={() => setHoveredIdx(idx)}
              className="cursor-pointer"
            >
              {/* Invisible generous hit target */}
              <rect
                x={c.x - hitBand / 2}
                y={padT - 10}
                width={hitBand}
                height={h - padT}
                fill="transparent"
              />
              <circle
                cx={c.x}
                cy={c.y}
                r={isActive ? 5 : 3.2}
                fill="#FFFFFF"
                stroke={color}
                strokeWidth={isActive ? 2.6 : 2}
              />
              <text
                x={c.x}
                y={h - 6}
                textAnchor="middle"
                className={`text-[10px] ${
                  isActive ? "fill-[#0F172A] font-semibold" : "fill-[#94A3B8]"
                }`}
              >
                {c.label}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Crisp Floating Tooltip Card (Exact Trendtrack style!) */}
      {activePt && (
        <div
          className="pointer-events-none absolute top-2 z-20 -translate-x-1/2 rounded-xl border border-[#E2E6EF] bg-white px-3 py-1.5 shadow-[0_10px_24px_rgba(15,23,42,0.12)]"
          style={{
            left: `${Math.min(82, Math.max(18, (activePt.x / w) * 100))}%`,
          }}
        >
          <p className="text-[10px] font-medium text-[#64748B]">{activePt.label}</p>
          <p className="mt-0.5 flex items-center gap-1.5 font-mono-num text-xs font-bold text-[#0F172A]">
            <span
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: color }}
            />
            {valuePrefix}
            {activePt.value.toLocaleString("en-US")}
          </p>
        </div>
      )}
    </div>
  );
}

export function ShopAnalyticsView({
  brand,
  ads,
  boards,
  onBack,
  onOpenAd,
  onToggleBoard,
  onToggleBrandFolder,
  onUpdateBrand: _onUpdateBrand,
}: ShopAnalyticsViewProps) {
  void _onUpdateBrand;
  const [mainTab, setMainTab] = useState<MainTab>("analytics");
  const [metaSubTab, setMetaSubTab] = useState<MetaSubTab>("library");
  const [metaSort, setMetaSort] = useState<"top" | "longest" | "duplicated">("top");
  const [creativeFormat, setCreativeFormat] = useState<"all" | "video" | "image" | "carousel">("all");
  const [hookCategoryFilter, setHookCategoryFilter] = useState<string>("all");

  const [trafficRange, setTrafficRange] = useState<"3M" | "6M" | "ALL">("ALL");
  const [adsRange, setAdsRange] = useState<"3M" | "6M" | "ALL">("ALL");
  const [productSort, setProductSort] = useState<"best" | "latest">("best");
  const [techTab, setTechTab] = useState<"pixels" | "apps">("pixels");
  const [productSearch, setProductSearch] = useState("");

  const [folderMenuOpen, setFolderMenuOpen] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [tabTransitioning, setTabTransitioning] = useState(false);

  const switchMainTab = (next: MainTab) => {
    if (next === mainTab) return;
    setTabTransitioning(true);
    setMainTab(next);
    setTimeout(() => setTabTransitioning(false), 160);
  };

  const brandAds = useMemo(
    () => dedupeAds(ads.filter((a) => a.brand_id === brand.id)),
    [ads, brand.id]
  );

  const domain = brand.website_url
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/\/.*$/, "");

  const topProducts = useMemo(
    () =>
      (brand.top_products || []).filter((p) => {
        if (!p.price) return false;
        const normalized = p.price.replace(/[^0-9.,]/g, "").replace(",", ".");
        const num = parseFloat(normalized);
        return Number.isFinite(num) && num > 0;
      }),
    [brand.top_products]
  );
  const latestProducts = useMemo(
    () =>
      brand.latest_products && brand.latest_products.length > 0
        ? brand.latest_products
        : topProducts,
    [brand.latest_products, topProducts]
  );
  const shownProducts = productSort === "best" ? topProducts : latestProducts;

  const pixels = brand.pixels || [];
  const shopifyApps = brand.shopify_apps || [];
  const savedInFolders = (brand.folder_ids || []).length > 0;

  // Compute Media Mix (Videos, Images, DCO, Carousel)
  const mediaMix = useMemo(() => {
    const counts = { VIDEO: 0, IMAGE: 0, DCO: 0, CAROUSEL: 0 };
    for (const ad of brandAds) {
      if (ad.display_format === "DCO") counts.DCO++;
      else if (ad.media_type === "video") counts.VIDEO++;
      else if (ad.media_type === "carousel") counts.CAROUSEL++;
      else counts.IMAGE++;
    }
    const total = Math.max(1, brandAds.length);
    return [
      { key: "Videos", count: counts.VIDEO, pct: Math.round((counts.VIDEO / total) * 100), icon: Film, color: "#0027eb" },
      { key: "Images", count: counts.IMAGE, pct: Math.round((counts.IMAGE / total) * 100), icon: ImageIcon, color: "#16A34A" },
      { key: "DCO", count: counts.DCO, pct: Math.round((counts.DCO / total) * 100), icon: Zap, color: "#0EA5E9" },
      { key: "Carousel", count: counts.CAROUSEL, pct: Math.round((counts.CAROUSEL / total) * 100), icon: Layers, color: "#D97706" },
    ];
  }, [brandAds]);

  // Compute Top Landing Pages across all scraped ads
  const landingPages = useMemo(() => {
    const map = new Map<
      string,
      { path: string; url: string; count: number; ads: Ad[] }
    >();
    for (const ad of brandAds) {
      if (!ad.landing_page_url) continue;
      if (!isDedicatedLandingPage(ad.landing_page_path, ad.landing_page_url)) continue;
      const p = ad.landing_page_path || "/";
      const existing = map.get(p);
      if (existing) {
        existing.count++;
        existing.ads.push(ad);
      } else {
        map.set(p, { path: p, url: ad.landing_page_url, count: 1, ads: [ad] });
      }
    }
    const total = Math.max(1, brandAds.length);
    return Array.from(map.values())
      .sort((a, b) => b.count - a.count)
      .map((entry) => ({
        ...entry,
        pct: Math.max(1, Math.round((entry.count / total) * 100)),
      }));
  }, [brandAds]);

  // Deduplicated Ad Copies
  const uniqueCopies = useMemo(() => {
    const map = new Map<
      string,
      { text: string; count: number; maxDays: number; ad: Ad }
    >();
    for (const ad of brandAds) {
      const text = (ad.primary_text || "").trim();
      if (text.length < 10) continue;
      const key = text.slice(0, 180).toLowerCase();
      const days = getActiveDays(ad.started_running_at);
      const ex = map.get(key);
      if (ex) {
        ex.count += ad.duplicated_count || 1;
        if (days > ex.maxDays) {
          ex.maxDays = days;
          ex.ad = ad;
        }
      } else {
        map.set(key, {
          text,
          count: ad.duplicated_count || 1,
          maxDays: days,
          ad,
        });
      }
    }
    return Array.from(map.values()).sort(
      (a, b) => b.count - a.count || b.maxDays - a.maxDays
    );
  }, [brandAds]);

  // Deduplicated Headlines
  const uniqueHeadlines = useMemo(() => {
    const map = new Map<
      string,
      { headline: string; cta: string; count: number; maxDays: number; ad: Ad }
    >();
    for (const ad of brandAds) {
      const hl = (ad.headline || "").trim();
      if (!hl) continue;
      const key = hl.toLowerCase();
      const days = getActiveDays(ad.started_running_at);
      const ex = map.get(key);
      if (ex) {
        ex.count += ad.duplicated_count || 1;
        ex.maxDays = Math.max(ex.maxDays, days);
      } else {
        map.set(key, {
          headline: hl,
          cta: ad.cta_text || "Shop now",
          count: ad.duplicated_count || 1,
          maxDays: days,
          ad,
        });
      }
    }
    return Array.from(map.values()).sort((a, b) => b.count - a.count);
  }, [brandAds]);

  // Extracted Hooks
  const uniqueHooks = useMemo(() => {
    const map = new Map<
      string,
      {
        hook: string;
        category: string;
        count: number;
        maxDays: number;
        ad: Ad;
      }
    >();
    for (const ad of brandAds) {
      const hook = (ad.extracted_hook || ad.ai_hook_verbal || "").trim();
      if (hook.length < 6) continue;
      const key = hook.toLowerCase();
      const days = getActiveDays(ad.started_running_at);
      const ex = map.get(key);
      if (ex) {
        ex.count += ad.duplicated_count || 1;
        ex.maxDays = Math.max(ex.maxDays, days);
      } else {
        map.set(key, {
          hook,
          category: ad.hook_category || "Product Benefit",
          count: ad.duplicated_count || 1,
          maxDays: days,
          ad,
        });
      }
    }
    return Array.from(map.values()).sort(
      (a, b) => b.maxDays - a.maxDays || b.count - a.count
    );
  }, [brandAds]);

  const hookCategories = useMemo(
    () => Array.from(new Set(uniqueHooks.map((h) => h.category))),
    [uniqueHooks]
  );

  // Sorted Meta Ads for Ad Library tab
  const sortedMetaAds = useMemo(() => {
    return [...brandAds].sort((a, b) => {
      if (metaSort === "longest") {
        return getActiveDays(b.started_running_at) - getActiveDays(a.started_running_at);
      }
      if (metaSort === "duplicated") {
        return (b.duplicated_count || 1) - (a.duplicated_count || 1);
      }
      // Top Performing = weighted score of longevity + duplication
      const scoreA = getActiveDays(a.started_running_at) * 1.2 + (a.duplicated_count || 1) * 18;
      const scoreB = getActiveDays(b.started_running_at) * 1.2 + (b.duplicated_count || 1) * 18;
      return scoreB - scoreA;
    });
  }, [brandAds, metaSort]);

  const filteredCreatives = useMemo(() => {
    if (creativeFormat === "all") return sortedMetaAds;
    return sortedMetaAds.filter((a) => a.media_type === creativeFormat);
  }, [sortedMetaAds, creativeFormat]);

  // Slice chart points by range
  const trafficPoints = useMemo(() => {
    const raw: TrafficPoint[] = brand.traffic_history || [];
    const sliced =
      trafficRange === "3M" ? raw.slice(-3) : trafficRange === "6M" ? raw.slice(-6) : raw;
    return sliced.map((p) => ({ label: p.label, value: p.visits }));
  }, [brand.traffic_history, trafficRange]);

  const adsTimelinePoints = useMemo(() => {
    const raw: AdsTimelinePoint[] = brand.ads_timeline || [];
    const sliced =
      adsRange === "3M" ? raw.slice(-3) : adsRange === "6M" ? raw.slice(-6) : raw;
    return sliced.map((p) => ({ label: p.label, value: p.count }));
  }, [brand.ads_timeline, adsRange]);

  const copyText = async (key: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 1600);
    } catch {
      // ignore
    }
  };

  const marketFlag =
    brand.country_code === "FR"
      ? "🇫🇷"
      : brand.market === "DK"
        ? "🇩🇰"
        : brand.market === "EU"
          ? "🇪🇺"
          : "🇺🇸";

  return (
    <div className="animate-view-in space-y-5">
      {/* =====================================================================
          TRENDTRACK SHOP HEADER + METADATA STRIP
         ===================================================================== */}
      <div className="space-y-3.5 border-b border-[#E6E9F0] pb-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onBack}
              aria-label="Tilbage til Shops"
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#E2E6EF] bg-white text-[#475569] shadow-xs transition-colors hover:border-[#CBD5E1] hover:text-[#0F172A]"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>

            <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-xl border border-[#E2E6EF] bg-white shadow-xs">
              {brand.logo_url ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={brand.logo_url}
                  alt={brand.name}
                  className="h-7 w-7 object-contain"
                />
              ) : (
                <span className="font-display text-sm font-bold text-[#334155]">
                  {brand.avatar_initials}
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-display text-[21px] font-bold tracking-[-0.03em] text-[#0F172A]">
                {brand.name}
              </h1>

              {brand.is_shopify && (
                <span
                  title="Shopify Store"
                  className="inline-flex items-center gap-1 rounded-lg border border-[#DCFCE7] bg-[#F0FDF4] px-2 py-0.5 text-[11px] font-semibold text-[#15803D]"
                >
                  <ShopifyBagIcon className="h-3.5 w-3.5" />
                  Shopify
                </span>
              )}

              {/* Bookmark / Folder Toggle */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setFolderMenuOpen((v) => !v)}
                  title="Gem shop i folder"
                  className="flex h-8 w-8 items-center justify-center rounded-lg border transition-colors"
                  style={
                    savedInFolders
                      ? {
                          backgroundColor: "#F1F5F9",
                          borderColor: "#CBD5E1",
                          color: "#0F172A",
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
                    fill={savedInFolders ? "currentColor" : "none"}
                  />
                </button>

                {folderMenuOpen && (
                  <div className="absolute left-0 top-9 z-40 w-52 rounded-2xl border border-[#E2E6EF] bg-white p-1.5 shadow-xl">
                    <p className="px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-[#64748B]">
                      Gem shop i folder
                    </p>
                    {boards.map((board) => {
                      const active = (brand.folder_ids || []).includes(board.id);
                      return (
                        <button
                          key={board.id}
                          type="button"
                          onClick={() => onToggleBrandFolder(brand.id, board.id)}
                          className="flex w-full items-center justify-between rounded-xl px-2.5 py-1.5 text-left text-xs font-medium text-[#0F172A] hover:bg-[#F3F5F9]"
                        >
                          <span className="flex min-w-0 items-center gap-2">
                            <span
                              className="h-2 w-2 shrink-0 rounded-full"
                              style={{ backgroundColor: board.accent_color }}
                            />
                            <span className="truncate">{board.name}</span>
                          </span>
                          {active && <Check className="h-3.5 w-3.5 text-[#0F172A]" />}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={() => copyText("domain", brand.website_url)}
                title="Kopiér URL"
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#E2E6EF] bg-white text-[#64748B] transition-colors hover:border-[#CBD5E1] hover:text-[#0F172A]"
              >
                {copiedKey === "domain" ? (
                  <Check className="h-3.5 w-3.5 text-[#16A34A]" />
                ) : (
                  <Link2 className="h-3.5 w-3.5" />
                )}
              </button>
            </div>
          </div>

          {/* Right Action Controls */}
          <div className="flex flex-wrap items-center gap-2">
            {brand.meta_ad_library_url && (
              <a
                href={brand.meta_ad_library_url}
                target="_blank"
                rel="noreferrer"
                className="adtrack-btn-primary inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold text-white transition-all"
              >
                Meta Ad Library
                <ArrowUpRight className="h-3.5 w-3.5" />
              </a>
            )}
          </div>
        </div>

        {/* METADATA STRIP (Single swipeable strip on iPhone, wrapped on desktop) */}
        <div className="no-scrollbar flex flex-nowrap items-center gap-x-4 gap-y-2 overflow-x-auto rounded-xl border border-[#EDF0F6] bg-white px-3.5 py-2 text-[12px] text-[#475569] sm:flex-wrap lg:bg-[#FAFBFD]">
          <a
            href={brand.website_url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex shrink-0 items-center gap-1.5 font-semibold text-[#0F172A] hover:underline"
          >
            <Globe className="h-3.5 w-3.5 text-[#64748B]" />
            {domain}
            <ExternalLink className="h-3 w-3 text-[#94A3B8]" />
          </a>

          {brand.myshopify_domain && (
            <span className="inline-flex shrink-0 items-center gap-1.5 font-mono-num text-[11.5px] text-[#64748B]">
              <ShopifyBagIcon className="h-3.5 w-3.5" />
              {brand.myshopify_domain}
            </span>
          )}

          {brand.founded_date && (
            <span className="inline-flex shrink-0 items-center gap-1.5 text-[#475569]">
              <Calendar className="h-3.5 w-3.5 text-[#94A3B8]" />
              {formatMonthYear(brand.founded_date)}
            </span>
          )}

          <span className="inline-flex shrink-0 items-center gap-1 font-medium text-[#0F172A]">
            <span>{brand.country_code || brand.market}</span>
            <span>{marketFlag}</span>
          </span>

          {brand.language && (
            <span className="inline-flex shrink-0 items-center gap-1 text-[#475569]">
              {brand.language}
            </span>
          )}

          {brand.currency && (
            <span className="inline-flex shrink-0 items-center gap-1 rounded-md bg-[#F7F8FB] px-2 py-0.5 font-mono-num text-[11px] font-semibold text-[#334155] ring-1 ring-[#E6E9F0]">
              {brand.currency}
            </span>
          )}

          <span className="inline-flex shrink-0 items-center gap-1 text-[#475569]">
            <Tag className="h-3.5 w-3.5 text-[#94A3B8]" />
            {brand.category}
            {brand.sub_categories && brand.sub_categories.length > 0
              ? ` +${brand.sub_categories.length}`
              : ""}
          </span>

          {brand.shopify_theme && (
            <span className="inline-flex shrink-0 items-center gap-1 rounded-md bg-[#F1F5F9] px-2 py-0.5 font-mono-num text-[11px] font-semibold text-[#334155]">
              {brand.shopify_theme}
            </span>
          )}
        </div>

        {/* PRIMARY SHOP TABS (Clean iOS 3-col bar on mobile, inline on desktop) */}
        <div className="grid grid-cols-3 gap-1 rounded-xl border border-[#E6E9F0] bg-[#EFEFF4] p-1 sm:flex sm:w-fit sm:items-center sm:border-0 sm:bg-transparent sm:p-0 sm:pt-1">
          {[
            {
              id: "analytics" as MainTab,
              short: "Analytics",
              label: "Shop Analytics",
              icon: <LineChart className="h-3.5 w-3.5 sm:h-4 sm:w-4" />,
              badge: null,
            },
            {
              id: "meta_ads" as MainTab,
              short: "Ads",
              label: "Meta Ads",
              icon: <MetaInfinityIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />,
              badge: (
                <span className="inline-flex items-center gap-1 rounded-full bg-[#ECFDF3] px-1.5 py-0.5 font-mono-num text-[10px] font-bold text-[#15803D] sm:px-2 sm:text-[11px]">
                  <span className="hidden h-1.5 w-1.5 rounded-full bg-[#16A34A] sm:inline-block" />
                  {(brand.active_ads_count ?? brandAds.length).toLocaleString("en-US")}
                </span>
              ),
            },
            {
              id: "products" as MainTab,
              short: "Prod.",
              label: "Products",
              icon: <Package className="h-3.5 w-3.5 sm:h-4 sm:w-4" />,
              badge: (
                <span className="rounded-full bg-black/[0.06] px-1.5 py-0.5 font-mono-num text-[10px] font-semibold text-[#475569] sm:bg-[#F1F5F9] sm:px-2 sm:text-[11px]">
                  {brand.products_count ?? topProducts.length}
                </span>
              ),
            },
          ].map((tabItem) => {
            const active = mainTab === tabItem.id;
            return (
              <button
                key={tabItem.id}
                type="button"
                onClick={() => switchMainTab(tabItem.id)}
                className={`inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-lg px-2 py-2 font-display text-[12px] font-semibold transition-all sm:rounded-xl sm:px-3.5 sm:text-[13px] ${
                  active
                    ? "bg-white text-[#0F172A] shadow-xs sm:bg-[#F1F5F9] sm:text-[#0F172A] sm:ring-1 sm:ring-[#E2E8F0]"
                    : "text-[#64748B] hover:text-[#0F172A] sm:hover:bg-[#F7F8FB]"
                }`}
              >
                {tabItem.icon}
                <span className="sm:hidden">{tabItem.short}</span>
                <span className="hidden sm:inline">{tabItem.label}</span>
                {tabItem.badge}
              </button>
            );
          })}
        </div>
      </div>

      {/* UNIFIED TAB SKELETON TRANSITION */}
      {tabTransitioning && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="skeleton-shimmer h-24 rounded-2xl" />
            <div className="skeleton-shimmer h-24 rounded-2xl" />
            <div className="skeleton-shimmer h-24 rounded-2xl" />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="skeleton-shimmer aspect-[4/5] rounded-2xl" />
            <div className="skeleton-shimmer aspect-[4/5] rounded-2xl" />
            <div className="skeleton-shimmer aspect-[4/5] rounded-2xl" />
            <div className="skeleton-shimmer aspect-[4/5] rounded-2xl" />
          </div>
        </div>
      )}

      {/* =====================================================================
          TAB 1: SHOP ANALYTICS (EXACT TRENDTRACK DASHBOARD)
         ===================================================================== */}
      {!tabTransitioning && mainTab === "analytics" && (
        <div className="animate-view-in space-y-5">
          {/* TOP 3 KPI CARDS */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {/* 1. Monthly Visits */}
            <div className="adtrack-kpi-card rounded-2xl p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-[#64748B]">
                  Monthly Visits
                </span>
                <span className="rounded-md bg-[#F1F5F9] px-1.5 py-0.5 font-mono-num text-[10px] font-medium text-[#64748B]">
                  {brand.traffic_source === "similarweb"
                    ? "Live"
                    : brand.tranco_rank
                      ? `Tranco #${formatReach(brand.tranco_rank)}`
                      : "Est."}
                </span>
              </div>
              <div className="mt-2.5 flex items-center gap-2.5">
                <Users className="h-5 w-5 text-[#475569]" />
                <span className="font-display text-[26px] font-bold leading-none tracking-[-0.03em] text-[#0F172A]">
                  {formatReach(brand.monthly_visits)}
                </span>
                {typeof brand.traffic_growth_pct === "number" && (
                  <span
                    className={`inline-flex items-center gap-0.5 rounded-md px-2 py-0.5 font-mono-num text-[11px] font-bold ${
                      brand.traffic_growth_pct >= 0
                        ? "bg-[#ECFDF3] text-[#15803D]"
                        : "bg-[#FFF1F2] text-[#E11D48]"
                    }`}
                  >
                    {brand.traffic_growth_pct >= 0 ? (
                      <TrendingUp className="h-3 w-3" />
                    ) : (
                      <TrendingDown className="h-3 w-3" />
                    )}
                    {brand.traffic_growth_pct >= 0 ? "+" : ""}
                    {brand.traffic_growth_pct}%
                  </span>
                )}
              </div>
            </div>

            {/* 2. Live Meta Ads & Media Mix */}
            <div className="adtrack-kpi-card rounded-2xl p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-[#64748B]">
                  Live Meta Ads
                </span>
                <button
                  type="button"
                  onClick={() => switchMainTab("meta_ads")}
                  className="text-[11px] font-semibold text-[#475569] hover:text-[#0F172A]"
                >
                  Open Ad Library →
                </button>
              </div>
              <div className="mt-2.5 flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2">
                  <MetaInfinityIcon className="h-5 w-5" />
                  <span className="font-display text-[26px] font-bold leading-none tracking-[-0.03em] text-[#0F172A]">
                    {(brand.active_ads_count ?? brandAds.length).toLocaleString("en-US")}
                  </span>
                  <span className="h-2.5 w-2.5 rounded-full bg-[#16A34A] ring-4 ring-[#16A34A]/15" />
                </div>
                <div className="flex items-center gap-1.5 text-[11px] text-[#64748B]">
                  <span>{mediaMix[0].count} vid</span>
                  <span>·</span>
                  <span>{mediaMix[1].count} img</span>
                  {mediaMix[2].count > 0 && (
                    <>
                      <span>·</span>
                      <span>{mediaMix[2].count} DCO</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* 3. Socials */}
            <div className="adtrack-kpi-card rounded-2xl p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-[#64748B]">Socials</span>
                <span className="font-mono-num text-[10.5px] font-medium text-[#94A3B8]">
                  {brand.handle}
                </span>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2.5">
                {brand.tiktok_url && (
                  <a
                    href={brand.tiktok_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-lg border border-[#E6E9F0] bg-white px-2.5 py-1 text-xs font-semibold text-[#0F172A] transition-colors hover:border-[#0027eb]"
                  >
                    <TikTokColorIcon className="h-4 w-4" />
                    TikTok
                  </a>
                )}
                {brand.youtube_url && (
                  <a
                    href={brand.youtube_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-lg border border-[#E6E9F0] bg-white px-2.5 py-1 text-xs font-semibold text-[#0F172A] transition-colors hover:border-[#0027eb]"
                  >
                    <YouTubeColorIcon className="h-4 w-4" />
                    YouTube
                  </a>
                )}
                {(brand.facebook_url || brand.fb_likes) && (
                  <a
                    href={brand.facebook_url || brand.meta_ad_library_url || "#"}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-lg border border-[#E6E9F0] bg-white px-2.5 py-1 font-mono-num text-xs font-semibold text-[#0F172A] transition-colors hover:border-[#0027eb]"
                  >
                    <FacebookColorIcon className="h-4 w-4" />
                    {brand.fb_likes ? formatReach(brand.fb_likes) : "Facebook"}
                  </a>
                )}
                {brand.instagram_url && (
                  <a
                    href={brand.instagram_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-lg border border-[#E6E9F0] bg-white px-2.5 py-1 font-mono-num text-xs font-semibold text-[#0F172A] transition-colors hover:border-[#0027eb]"
                  >
                    <InstagramColorIcon className="h-4 w-4" />
                    {brand.ig_followers ? formatReach(brand.ig_followers) : brand.handle}
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* 2-COLUMN INTERACTIVE CHARTS (Traffic Over Time + Live Ads Over Time) */}
          <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
            {/* Traffic Over Time */}
            <div className="adtrack-card rounded-2xl p-5">
              <div className="mb-3 flex items-center justify-between gap-2">
                <div>
                  <h2 className="font-display text-[15px] font-bold text-[#0F172A]">
                    Traffic Over Time
                  </h2>
                  <p className="text-[11.5px] text-[#64748B]">
                    Estimerede månedlige besøg baseret på Tranco &amp; markedssignaler
                  </p>
                </div>
                <div className="inline-flex rounded-xl border border-[#E6E9F0] bg-[#F7F8FB] p-0.5 text-[11px] font-semibold">
                  {(["3M", "6M", "ALL"] as const).map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setTrafficRange(r)}
                      className={`rounded-lg px-2.5 py-1 transition-all ${
                        trafficRange === r
                          ? "bg-white text-[#0F172A] shadow-xs"
                          : "text-[#64748B] hover:text-[#0F172A]"
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>

              <InteractiveAreaChart
                points={trafficPoints}
                color="#0027eb"
                gradientId="adtrackTrafficGrad"
                valuePrefix="Visitors: "
                formatVal={(v) => formatReach(v)}
              />

              {/* Visitor Countries Strip */}
              {brand.visitor_countries && brand.visitor_countries.length > 0 && (
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-[#EFF2F6] pt-3 text-xs">
                  <span className="font-medium text-[#64748B]">Visitor Countries</span>
                  <div className="flex flex-wrap items-center gap-3">
                    {brand.visitor_countries.map((c) => (
                      <span
                        key={c.code}
                        className="inline-flex items-center gap-1 font-mono-num text-[11.5px] font-semibold text-[#0F172A]"
                      >
                        <span>{c.flag}</span>
                        <span>{c.pct}%</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Live Ads Over Time */}
            <div className="adtrack-card rounded-2xl p-5">
              <div className="mb-3 flex items-center justify-between gap-2">
                <div>
                  <h2 className="font-display text-[15px] font-bold text-[#0F172A]">
                    Live Ads Over Time
                  </h2>
                  <div className="mt-0.5 flex items-center gap-1.5">
                    <span className="font-mono-num text-sm font-bold text-[#0F172A]">
                      {(brand.active_ads_count ?? brandAds.length).toLocaleString("en-US")}
                    </span>
                    <span className="h-2 w-2 rounded-full bg-[#16A34A]" />
                    <span className="text-[11.5px] text-[#64748B]">
                      aktive Meta-annoncer
                    </span>
                  </div>
                </div>

                <div className="inline-flex rounded-xl border border-[#E6E9F0] bg-[#F7F8FB] p-0.5 text-[11px] font-semibold">
                  {(["3M", "6M", "ALL"] as const).map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setAdsRange(r)}
                      className={`rounded-lg px-2.5 py-1 transition-all ${
                        adsRange === r
                          ? "bg-white text-[#0F172A] shadow-xs"
                          : "text-[#64748B] hover:text-[#0F172A]"
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>

              <InteractiveAreaChart
                points={adsTimelinePoints}
                color="#16A34A"
                gradientId="adtrackAdsGrad"
                valuePrefix="Live Ads: "
                formatVal={(v) => formatReach(v)}
              />

              {/* Targeted Countries Strip */}
              {brand.targeted_countries && brand.targeted_countries.length > 0 && (
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-[#EFF2F6] pt-3 text-xs">
                  <span className="font-medium text-[#64748B]">Targeted Countries</span>
                  <div className="flex flex-wrap items-center gap-3">
                    {brand.targeted_countries.map((c) => (
                      <span
                        key={c.code}
                        className="inline-flex items-center gap-1 font-mono-num text-[11.5px] font-semibold text-[#0F172A]"
                      >
                        <span>{c.flag}</span>
                        <span>{c.pct}%</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 2-COLUMN PRODUCTS + PIXELS / SHOPIFY APPS ROW (Exact Trendtrack Layout!) */}
          <div className="grid grid-cols-1 gap-5 xl:grid-cols-12">
            {/* Products Card (7 cols) */}
            <div className="adtrack-card rounded-2xl p-5 xl:col-span-7">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-medium text-[#64748B]">Products:</p>
                  <p className="font-display text-2xl font-bold leading-tight text-[#0F172A]">
                    {(brand.products_count ?? topProducts.length).toLocaleString("en-US")}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <div className="inline-flex rounded-xl border border-[#E6E9F0] bg-[#F7F8FB] p-0.5 text-xs font-semibold">
                    <button
                      type="button"
                      onClick={() => setProductSort("best")}
                      className={`rounded-lg px-3 py-1.5 transition-all ${
                        productSort === "best"
                          ? "bg-white text-[#0F172A] shadow-xs"
                          : "text-[#64748B] hover:text-[#0F172A]"
                      }`}
                    >
                      Best Seller
                    </button>
                    <button
                      type="button"
                      onClick={() => setProductSort("latest")}
                      className={`rounded-lg px-3 py-1.5 transition-all ${
                        productSort === "latest"
                          ? "bg-white text-[#0F172A] shadow-xs"
                          : "text-[#64748B] hover:text-[#0F172A]"
                      }`}
                    >
                      Last published
                    </button>
                  </div>
                </div>
              </div>

              {shownProducts.length === 0 ? (
                <div className="flex h-44 items-center justify-center text-xs text-[#64748B]">
                  Ingen offentlige Shopify-produkter fundet på denne shop.
                </div>
              ) : (
                <div className="flex gap-3 overflow-x-auto pb-2">
                  {shownProducts.slice(0, 10).map((prod, idx) => (
                    <a
                      key={`${prod.title}-${idx}`}
                      href={prod.url || brand.website_url}
                      target="_blank"
                      rel="noreferrer"
                      className="group w-[144px] shrink-0 overflow-hidden rounded-xl border border-[#E6E9F0] bg-white transition-all hover:-translate-y-0.5 hover:border-[#0027eb]/40 hover:shadow-md"
                    >
                      <div className="relative aspect-square w-full overflow-hidden bg-[#F7F8FB]">
                        {prod.image_url ? (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img
                            src={prod.image_url}
                            alt={prod.title}
                            loading="lazy"
                            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-[#94A3B8]">
                            <Package className="h-6 w-6" />
                          </div>
                        )}
                        <span className="absolute right-2 top-2 rounded-md bg-white/95 px-1.5 py-0.5 font-mono-num text-[10px] font-bold text-[#0F172A] shadow-xs">
                          #{idx + 1}
                        </span>
                      </div>
                      <div className="p-2.5">
                        <p className="truncate font-display text-[12px] font-semibold text-[#0F172A] group-hover:text-[#0027eb]">
                          {prod.title}
                        </p>
                        {prod.price && (
                          <p className="mt-0.5 font-mono-num text-[12px] font-bold text-[#0F172A]">
                            {prod.price} {prod.currency || brand.currency || ""}
                          </p>
                        )}
                        {prod.created_at && (
                          <p className="mt-1 truncate text-[10px] text-[#94A3B8]">
                            Created: {formatShortDate(prod.created_at)}
                          </p>
                        )}
                      </div>
                    </a>
                  ))}
                </div>
              )}
            </div>

            {/* Pixels | Shopify Apps Segmented Card (5 cols — EXACT Screenshot 19.50.29!) */}
            <div className="adtrack-card flex flex-col rounded-2xl p-5 xl:col-span-5">
              <div className="mb-4 grid grid-cols-2 rounded-xl border border-[#E6E9F0] bg-[#F5F7FA] p-1 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setTechTab("pixels")}
                  className={`flex items-center justify-center gap-1.5 rounded-lg py-2 transition-all ${
                    techTab === "pixels"
                      ? "bg-white text-[#0F172A] shadow-xs"
                      : "text-[#64748B] hover:text-[#0F172A]"
                  }`}
                >
                  <span>Pixels</span>
                  <span className="rounded-md bg-[#F1F5F9] px-1.5 py-0.5 font-mono-num text-[10px] font-bold text-[#475569]">
                    {pixels.length}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setTechTab("apps")}
                  className={`flex items-center justify-center gap-1.5 rounded-lg py-2 transition-all ${
                    techTab === "apps"
                      ? "bg-white text-[#0F172A] shadow-xs"
                      : "text-[#64748B] hover:text-[#0F172A]"
                  }`}
                >
                  <span>Shopify Apps</span>
                  <span className="rounded-md bg-[#ECFDF3] px-1.5 py-0.5 font-mono-num text-[10px] font-bold text-[#15803D]">
                    {shopifyApps.length}
                  </span>
                </button>
              </div>

              <div className="grid max-h-[340px] flex-1 grid-cols-1 content-start gap-2 overflow-y-auto pr-0.5 sm:grid-cols-2">
                {(techTab === "pixels" ? pixels : shopifyApps).length === 0 ? (
                  <div className="col-span-full flex h-36 items-center justify-center text-xs text-[#94A3B8]">
                    Ingen {techTab === "pixels" ? "pixels" : "Shopify apps"} detekteret i HTML
                  </div>
                ) : (
                  (techTab === "pixels" ? pixels : shopifyApps).map((tool) => {
                    const meta = getTechMeta(tool);
                    return (
                      <div
                        key={tool}
                        title={meta?.domain ? `${tool} (${meta.domain})` : tool}
                        className="flex items-center gap-2.5 rounded-xl border border-[#ECEFF5] bg-[#FAFBFD] px-2.5 py-2 transition-colors hover:border-[#CFD7E8] hover:bg-white"
                      >
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[#EAEFF6] bg-white p-1 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
                          <TechBrandIcon name={tool} className="h-5 w-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[12.5px] font-semibold leading-tight text-[#0F172A]">
                            {tool}
                          </p>
                          {meta?.category && (
                            <p className="mt-0.5 truncate text-[10.5px] text-[#64748B]">
                              {meta.category}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* BOTTOM SECTION: LAST ADS */}
          <div className="space-y-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h2 className="font-display text-base font-bold text-[#0F172A]">
                  Last Ads
                </h2>
                <span className="rounded-full bg-[#F1F5F9] px-2.5 py-0.5 font-mono-num text-[11px] font-semibold text-[#475569]">
                  {brandAds.length} scraped
                </span>
              </div>
              <button
                type="button"
                onClick={() => switchMainTab("meta_ads")}
                className="inline-flex items-center gap-1 rounded-xl border border-[#E2E6EF] bg-white px-3 py-1.5 text-xs font-semibold text-[#334155] transition-colors hover:border-[#CBD5E1] hover:text-[#0F172A]"
              >
                See more
                <ArrowUpRight className="h-3.5 w-3.5" />
              </button>
            </div>

            {brandAds.length === 0 ? (
              <div className="p-10 text-center text-xs text-[#64748B]">
                Ingen live Meta Ads hentet for denne shop endnu.
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {sortedMetaAds.slice(0, 8).map((ad, idx) => (
                  <AdCard
                    key={ad.id}
                    ad={ad}
                    boards={boards}
                    rank={idx + 1}
                    onOpen={onOpenAd}
                    onToggleBoard={onToggleBoard}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* =====================================================================
          TAB 2: META ADS DEEP DIVE
          Ad Library | Creatives | Ad Copies | Headlines | Hooks & Scripts | LP
         ===================================================================== */}
      {!tabTransitioning && mainTab === "meta_ads" && (
        <div className="animate-view-in space-y-5">
          {/* Sub-Navigation Bar */}
          <div className="no-scrollbar flex items-center gap-1 overflow-x-auto border-b border-[#E6E9F0]">
            {[
              { id: "library" as MetaSubTab, label: "Ad Library", count: brandAds.length },
              { id: "creatives" as MetaSubTab, label: "Creatives", count: brandAds.length },
              { id: "copies" as MetaSubTab, label: "Ad Copies", count: uniqueCopies.length },
              { id: "headlines" as MetaSubTab, label: "Headlines", count: uniqueHeadlines.length },
              { id: "hooks" as MetaSubTab, label: "Hooks & Scripts", count: uniqueHooks.length },
              { id: "lp" as MetaSubTab, label: "LP", count: landingPages.length },
            ].map((st) => {
              const active = metaSubTab === st.id;
              return (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => setMetaSubTab(st.id)}
                  className={`inline-flex shrink-0 items-center gap-1.5 border-b-2 px-3.5 py-2.5 font-display text-[13px] font-semibold transition-colors ${
                    active
                      ? "border-[#0F172A] text-[#0F172A]"
                      : "border-transparent text-[#64748B] hover:text-[#0F172A]"
                  }`}
                >
                  {st.label}
                  <span
                    className={`rounded-md px-1.5 py-0.5 font-mono-num text-[10px] font-bold ${
                      active
                        ? "bg-[#0F172A] text-white"
                        : "bg-[#F1F5F9] text-[#64748B]"
                    }`}
                  >
                    {st.count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* SUB-TAB 1: AD LIBRARY */}
          {metaSubTab === "library" && (
            <div className="space-y-5">
              {/* Top Insights Bento Row (Historic Chart + Media Mix + Top Landing Pages) */}
              <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
                <div className="adtrack-card rounded-2xl p-5 xl:col-span-8">
                  <div className="mb-3 flex items-center justify-between">
                    <div>
                      <h2 className="font-display text-[15px] font-bold text-[#0F172A]">
                        Historic of Live Ads{" "}
                        <span className="font-mono-num text-[#475569]">
                          {formatReach(brand.active_ads_count ?? brandAds.length)}
                        </span>
                      </h2>
                      <p className="text-[11.5px] text-[#64748B]">
                        Udvikling i aktive Meta-annoncer for {brand.name}
                      </p>
                    </div>
                    <div className="inline-flex rounded-xl border border-[#E6E9F0] bg-[#F7F8FB] p-0.5 text-[11px] font-semibold">
                      {(["3M", "6M", "ALL"] as const).map((r) => (
                        <button
                          key={r}
                          type="button"
                          onClick={() => setAdsRange(r)}
                          className={`rounded-lg px-2.5 py-1 ${
                            adsRange === r
                              ? "bg-white text-[#0F172A] shadow-xs"
                              : "text-[#64748B]"
                          }`}
                        >
                          {r}
                        </button>
                      ))}
                    </div>
                  </div>
                  <InteractiveAreaChart
                    points={adsTimelinePoints}
                    color="#16A34A"
                    gradientId="adtrackHistoricAdsGrad"
                    valuePrefix="Active Ads: "
                    formatVal={(v) => formatReach(v)}
                  />
                </div>

                {/* Right Stacked Cards: Ads - Media Mix & Top Landing Pages */}
                <div className="flex flex-col gap-4 xl:col-span-4">
                  {/* Ads - Media Mix */}
                  <div className="adtrack-card rounded-2xl p-4">
                    <div className="mb-3 flex items-center justify-between">
                      <h3 className="font-display text-[13.5px] font-bold text-[#0F172A]">
                        Ads - Media Mix
                      </h3>
                      <span className="font-mono-num text-[11px] font-semibold text-[#64748B]">
                        {brandAds.length} Scraped
                      </span>
                    </div>
                    <div className="space-y-2">
                      {mediaMix.map((row) => {
                        const Icon = row.icon;
                        return (
                          <div
                            key={row.key}
                            className="relative overflow-hidden rounded-xl border border-[#EFF2F6] bg-[#FAFBFD] px-3 py-2"
                          >
                            <div
                              className="pointer-events-none absolute inset-y-0 left-0 opacity-[0.12]"
                              style={{
                                width: `${row.pct}%`,
                                backgroundColor: row.color,
                              }}
                            />
                            <div className="relative flex items-center justify-between text-xs">
                              <span className="flex items-center gap-2 font-medium text-[#0F172A]">
                                <Icon className="h-3.5 w-3.5 text-[#64748B]" />
                                {row.key}
                              </span>
                              <span className="flex items-center gap-2 font-mono-num">
                                <span className="font-bold text-[#0F172A]">
                                  {row.count}
                                </span>
                                <span className="w-10 text-right text-[11px] text-[#64748B]">
                                  {row.pct}%
                                </span>
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Top Landing Pages */}
                  <div className="adtrack-card flex-1 rounded-2xl p-4">
                    <div className="mb-3 flex items-center justify-between">
                      <h3 className="font-display text-[13.5px] font-bold text-[#0F172A]">
                        Top Landing Pages
                      </h3>
                      <button
                        type="button"
                        onClick={() => setMetaSubTab("lp")}
                        className="text-[11px] font-semibold text-[#475569] hover:text-[#0F172A]"
                      >
                        Alle ({landingPages.length}) ↗
                      </button>
                    </div>
                    <div className="space-y-1.5">
                      {landingPages.slice(0, 5).map((lp) => (
                        <a
                          key={lp.path}
                          href={lp.url}
                          target="_blank"
                          rel="noreferrer"
                          className="group flex items-center justify-between gap-2 rounded-xl border border-[#EFF2F6] bg-[#FAFBFD] px-3 py-2 text-xs transition-colors hover:border-[#CBD5E1] hover:bg-white"
                        >
                          <span className="flex min-w-0 items-center gap-2">
                            <ShopifyBagIcon className="h-3.5 w-3.5 shrink-0" />
                            <span className="truncate font-mono-num text-[11.5px] font-medium text-[#0F172A]">
                              {lp.path}
                            </span>
                          </span>
                          <span className="flex shrink-0 items-center gap-2 font-mono-num text-[11px]">
                            <span className="font-bold text-[#0F172A]">
                              {lp.count}
                            </span>
                            <span className="rounded bg-[#F1F5F9] px-1.5 py-0.5 text-[10px] font-semibold text-[#475569]">
                              {lp.pct}%
                            </span>
                          </span>
                        </a>
                      ))}
                      {landingPages.length === 0 && (
                        <p className="py-4 text-center text-xs text-[#94A3B8]">
                          Ingen landing pages fundet
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Ranked Sort Strip + Ad Grid */}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="inline-flex rounded-xl border border-[#E6E9F0] bg-[#F5F7FA] p-1 text-xs font-semibold">
                  {[
                    { id: "top" as const, label: "Top Performing" },
                    { id: "longest" as const, label: "Longest Active" },
                    { id: "duplicated" as const, label: "Most Duplicated" },
                  ].map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setMetaSort(s.id)}
                      className={`rounded-lg px-3 py-1.5 transition-all ${
                        metaSort === s.id
                          ? "bg-white text-[#0F172A] shadow-xs"
                          : "text-[#64748B] hover:text-[#0F172A]"
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
                <span className="font-mono-num text-xs text-[#64748B]">
                  Viser {sortedMetaAds.length} live Meta-annoncer
                </span>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {sortedMetaAds.map((ad, idx) => (
                  <AdCard
                    key={ad.id}
                    ad={ad}
                    boards={boards}
                    rank={idx + 1}
                    onOpen={onOpenAd}
                    onToggleBoard={onToggleBoard}
                  />
                ))}
              </div>
            </div>
          )}

          {/* SUB-TAB 2: CREATIVES */}
          {metaSubTab === "creatives" && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                {(["all", "video", "image", "carousel"] as const).map((fmt) => (
                  <button
                    key={fmt}
                    type="button"
                    onClick={() => setCreativeFormat(fmt)}
                    className={`rounded-xl border px-3.5 py-1.5 text-xs font-semibold capitalize transition-all ${
                      creativeFormat === fmt
                        ? "border-[#0F172A] bg-[#0F172A] text-white"
                        : "border-[#E6E9F0] bg-white text-[#475569] hover:border-[#CBD5E1]"
                    }`}
                  >
                    {fmt === "all" ? `All Creatives (${brandAds.length})` : fmt}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                {filteredCreatives.map((ad) => (
                  <AdCard
                    key={ad.id}
                    ad={ad}
                    boards={boards}
                    compact
                    onOpen={onOpenAd}
                    onToggleBoard={onToggleBoard}
                  />
                ))}
              </div>
            </div>
          )}

          {/* SUB-TAB 3: AD COPIES */}
          {metaSubTab === "copies" && (
            <div className="space-y-3">
              {uniqueCopies.map((item, idx) => (
                <div
                  key={idx}
                  className="adtrack-card flex flex-col justify-between gap-4 rounded-2xl p-4 sm:flex-row sm:items-start"
                >
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="flex flex-wrap items-center gap-2 text-[11px]">
                      <span className="rounded-md bg-[#F1F5F9] px-2 py-0.5 font-mono-num font-bold text-[#334155]">
                        #{idx + 1}
                      </span>
                      <span className="rounded-md bg-[#ECFDF3] px-2 py-0.5 font-mono-num font-semibold text-[#15803D]">
                        {item.maxDays}d live
                      </span>
                      <span className="rounded-md bg-[#F1F5F9] px-2 py-0.5 font-mono-num font-semibold text-[#475569]">
                        Used in {item.count} ad{item.count > 1 ? "s" : ""}
                      </span>
                    </div>
                    <p className="whitespace-pre-wrap text-[13px] leading-relaxed text-[#1E293B]">
                      {item.text}
                    </p>
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    <button
                      type="button"
                      onClick={() => copyText(`copy-${idx}`, item.text)}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-[#DCE1EC] bg-white px-3 py-1.5 text-xs font-semibold text-[#334155] hover:border-[#0027eb] hover:text-[#0027eb]"
                    >
                      {copiedKey === `copy-${idx}` ? (
                        <>
                          <Check className="h-3.5 w-3.5 text-[#16A34A]" />
                          Kopieret
                        </>
                      ) : (
                        <>
                          <Copy className="h-3.5 w-3.5" />
                          Kopiér copy
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => onOpenAd(item.ad)}
                      className="rounded-xl bg-[#0F172A] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#0027eb]"
                    >
                      Se ad
                    </button>
                  </div>
                </div>
              ))}
              {uniqueCopies.length === 0 && (
                <p className="py-10 text-center text-xs text-[#94A3B8]">
                  Ingen ad copies fundet for dette brand endnu.
                </p>
              )}
            </div>
          )}

          {/* SUB-TAB 4: HEADLINES */}
          {metaSubTab === "headlines" && (
            <div className="adtrack-card overflow-hidden rounded-2xl">
              <div className="grid grid-cols-[1fr_auto_auto_auto] gap-4 border-b border-[#EFF2F6] bg-[#FAFBFD] px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">
                <span>Headline</span>
                <span>CTA</span>
                <span>Longevity / Ads</span>
                <span className="text-right">Action</span>
              </div>
              <div className="divide-y divide-[#F1F5F9]">
                {uniqueHeadlines.map((item, idx) => (
                  <div
                    key={idx}
                    className="grid grid-cols-1 items-center gap-3 px-4 py-3 hover:bg-[#FAFBFD] sm:grid-cols-[1fr_auto_auto_auto]"
                  >
                    <div className="flex items-center gap-2.5">
                      <Hash className="h-3.5 w-3.5 shrink-0 text-[#94A3B8]" />
                      <span className="font-display text-[13.5px] font-semibold text-[#0F172A]">
                        {item.headline}
                      </span>
                    </div>
                    <span className="w-fit rounded-lg border border-[#E6E9F0] bg-white px-2.5 py-1 text-[11px] font-semibold text-[#334155]">
                      {item.cta}
                    </span>
                    <div className="flex items-center gap-2 font-mono-num text-[11.5px]">
                      <span className="rounded-md bg-[#ECFDF3] px-2 py-0.5 font-semibold text-[#15803D]">
                        {item.maxDays}d
                      </span>
                      <span className="text-[#64748B]">×{item.count}</span>
                    </div>
                    <div className="flex justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => copyText(`hl-${idx}`, item.headline)}
                        className="rounded-lg border border-[#E2E6EF] bg-white p-1.5 text-[#475569] hover:border-[#0027eb] hover:text-[#0027eb]"
                        title="Kopiér headline"
                      >
                        {copiedKey === `hl-${idx}` ? (
                          <Check className="h-3.5 w-3.5 text-[#16A34A]" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => onOpenAd(item.ad)}
                        className="rounded-lg bg-[#0F172A] px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-[#0027eb]"
                      >
                        Åbn
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* SUB-TAB 5: HOOKS & SCRIPTS */}
          {metaSubTab === "hooks" && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setHookCategoryFilter("all")}
                  className={`rounded-xl border px-3 py-1.5 text-xs font-semibold transition-all ${
                    hookCategoryFilter === "all"
                      ? "border-[#0F172A] bg-[#0F172A] text-white"
                      : "border-[#E6E9F0] bg-white text-[#475569]"
                  }`}
                >
                  Alle hooks ({uniqueHooks.length})
                </button>
                {hookCategories.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setHookCategoryFilter(cat)}
                    className={`rounded-xl border px-3 py-1.5 text-xs font-semibold transition-all ${
                      hookCategoryFilter === cat
                        ? "border-[#0F172A] bg-[#0F172A] text-white"
                        : "border-[#E6E9F0] bg-white text-[#475569]"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-1 gap-3.5 md:grid-cols-2">
                {uniqueHooks
                  .filter(
                    (h) =>
                      hookCategoryFilter === "all" ||
                      h.category === hookCategoryFilter
                  )
                  .map((item, idx) => (
                    <div
                      key={idx}
                      className="adtrack-card-interactive flex flex-col justify-between gap-3 rounded-2xl p-4"
                    >
                      <div className="space-y-2.5">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="inline-flex items-center gap-1 rounded-full bg-[#F1F5F9] px-2.5 py-0.5 text-[11px] font-semibold text-[#334155]">
                            <Sparkles className="h-3 w-3 text-[#64748B]" />
                            {item.category}
                          </span>
                          <div className="flex items-center gap-1.5 font-mono-num text-[11px]">
                            <span className="rounded-md bg-[#ECFDF3] px-2 py-0.5 font-semibold text-[#15803D]">
                              {item.maxDays}d live
                            </span>
                            <span className="rounded-md bg-[#F1F5F9] px-2 py-0.5 font-medium text-[#475569]">
                              {item.ad.media_type.toUpperCase()}
                            </span>
                          </div>
                        </div>

                        <p className="font-display text-[15px] font-semibold leading-snug text-[#0F172A]">
                          &ldquo;{item.hook}&rdquo;
                        </p>
                      </div>

                      <div className="flex items-center justify-between border-t border-[#EFF2F6] pt-3">
                        <span className="truncate text-[11px] text-[#64748B]">
                          {item.ad.landing_page_path || "/"} · {item.ad.cta_text}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => copyText(`hook-${idx}`, item.hook)}
                            className="inline-flex items-center gap-1 rounded-lg border border-[#DCE1EC] bg-white px-2.5 py-1 text-[11px] font-semibold text-[#334155] hover:border-[#0027eb] hover:text-[#0027eb]"
                          >
                            {copiedKey === `hook-${idx}` ? (
                              <Check className="h-3 w-3 text-[#16A34A]" />
                            ) : (
                              <Copy className="h-3 w-3" />
                            )}
                            Kopiér
                          </button>
                          <button
                            type="button"
                            onClick={() => onOpenAd(item.ad)}
                            className="rounded-lg bg-[#0F172A] px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-[#0027eb]"
                          >
                            Inspect
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* SUB-TAB 6: LANDING PAGES (LP) */}
          {metaSubTab === "lp" && (
            <div className="space-y-3">
              {landingPages.map((lp) => (
                <div
                  key={lp.path}
                  className="adtrack-card flex flex-col justify-between gap-4 rounded-2xl p-4 sm:flex-row sm:items-center"
                >
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <div className="flex items-center gap-2">
                      <ShopifyBagIcon className="h-4 w-4 shrink-0" />
                      <a
                        href={lp.url}
                        target="_blank"
                        rel="noreferrer"
                        className="truncate font-display text-[14.5px] font-bold text-[#0F172A] hover:text-[#0027eb]"
                      >
                        {lp.path}
                      </a>
                      <span className="rounded-full bg-[#F1F5F9] px-2 py-0.5 font-mono-num text-[11px] font-semibold text-[#334155]">
                        {lp.count} ads ({lp.pct}%)
                      </span>
                    </div>
                    <p className="truncate font-mono-num text-[11.5px] text-[#64748B]">
                      {lp.url}
                    </p>
                    <div className="h-1.5 w-full max-w-md overflow-hidden rounded-full bg-[#EFF2F6]">
                      <div
                        className="h-full rounded-full bg-[#0F172A]"
                        style={{ width: `${lp.pct}%` }}
                      />
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-3">
                    <div className="flex -space-x-2">
                      {lp.ads.slice(0, 3).map((ad) => (
                        <button
                          key={ad.id}
                          type="button"
                          onClick={() => onOpenAd(ad)}
                          className="h-10 w-10 overflow-hidden rounded-lg border-2 border-white bg-[#F3F5F9] shadow-xs"
                        >
                          {(ad.thumbnail_url || ad.fallback_image_url) && (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img
                              src={ad.fallback_image_url || ad.thumbnail_url}
                              alt=""
                              className="h-full w-full object-cover"
                            />
                          )}
                        </button>
                      ))}
                    </div>

                    <a
                      href={lp.url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-xl border border-[#DCE1EC] bg-white px-3 py-2 text-xs font-semibold text-[#0F172A] transition-colors hover:border-[#0027eb] hover:text-[#0027eb]"
                    >
                      Åbn LP
                      <ArrowUpRight className="h-3.5 w-3.5" />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* =====================================================================
          TAB 3: FULL PRODUCTS CATALOG
         ===================================================================== */}
      {!tabTransitioning && mainTab === "products" && (
        <div className="animate-view-in space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="relative w-full sm:w-72">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94A3B8]" />
              <input
                type="search"
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                placeholder="Søg produkter..."
                className="w-full rounded-xl border border-[#E2E6EF] bg-white py-2 pl-9 pr-3 text-xs text-[#0F172A] outline-none focus:border-[#94A3B8]"
              />
            </div>

            <div className="inline-flex rounded-xl border border-[#E6E9F0] bg-[#F5F7FA] p-1 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setProductSort("best")}
                className={`rounded-lg px-3 py-1.5 ${
                  productSort === "best"
                    ? "bg-white text-[#0F172A] shadow-xs"
                    : "text-[#64748B]"
                }`}
              >
                Best Seller
              </button>
              <button
                type="button"
                onClick={() => setProductSort("latest")}
                className={`rounded-lg px-3 py-1.5 ${
                  productSort === "latest"
                    ? "bg-white text-[#0F172A] shadow-xs"
                    : "text-[#64748B]"
                }`}
              >
                Last published
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {shownProducts
              .filter((p) =>
                productSearch.trim()
                  ? p.title.toLowerCase().includes(productSearch.toLowerCase())
                  : true
              )
              .map((prod, idx) => (
                <a
                  key={`${prod.title}-${idx}`}
                  href={prod.url || brand.website_url}
                  target="_blank"
                  rel="noreferrer"
                  className="adtrack-card-interactive group overflow-hidden rounded-2xl"
                >
                  <div className="skeleton-shimmer relative aspect-square w-full overflow-hidden">
                    {prod.image_url ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={prod.image_url}
                        alt={prod.title}
                        loading="lazy"
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-[#F7F8FB] text-[#94A3B8]">
                        <Package className="h-8 w-8" />
                      </div>
                    )}
                    <span className="absolute right-2.5 top-2.5 rounded-lg bg-white/95 px-2 py-0.5 font-mono-num text-[10.5px] font-bold text-[#0F172A] shadow-xs">
                      #{idx + 1}
                    </span>
                  </div>
                  <div className="p-3">
                    <p className="line-clamp-2 font-display text-[13px] font-semibold text-[#0F172A]">
                      {prod.title}
                    </p>
                    <div className="mt-1.5 flex items-center justify-between gap-2">
                      {prod.price && (
                        <span className="font-mono-num text-xs font-bold text-[#0F172A]">
                          {prod.price} {prod.currency || brand.currency || ""}
                        </span>
                      )}
                      {prod.created_at && (
                        <span className="text-[10px] text-[#94A3B8]">
                          {formatShortDate(prod.created_at)}
                        </span>
                      )}
                    </div>
                  </div>
                </a>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
