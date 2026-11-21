"use client";

import React, { useState } from "react";
import {
  ArrowLeft,
  ArrowUpRight,
  Bookmark,
  Globe,
  Loader2,
  RefreshCw,
  ShoppingBag,
  Star,
  Users,
} from "lucide-react";
import type { Ad, Board, Brand } from "@/lib/types";
import { formatReach } from "@/lib/url-parser";
import { AdCard } from "./AdCard";

interface ShopAnalyticsViewProps {
  brand: Brand;
  ads: Ad[];
  boards: Board[];
  onBack: () => void;
  onOpenAd: (ad: Ad) => void;
  onToggleFavorite: (adId: string) => void;
  onToggleBoard: (adId: string, boardId: string) => void;
  onUpdateBrand: (brandId: string, patch: Partial<Brand>) => void;
}

function LargeAreaChart({
  data,
  stroke,
  fillTop,
  formatVal,
}: {
  data: { label: string; value: number }[];
  stroke: string;
  fillTop: string;
  formatVal: (v: number) => string;
}) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const w = 520;
  const h = 190;
  const padX = 24;
  const padY = 20;
  const max = Math.max(...data.map((d) => d.value), 1);

  const coords = data.map((d, i) => {
    const x = padX + (i / Math.max(1, data.length - 1)) * (w - padX * 2);
    const y = h - padY - (d.value / max) * (h - padY * 2);
    return { x, y, ...d };
  });

  const linePath = `M ${coords.map((c) => `${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(" L ")}`;
  const areaPath = `${linePath} L ${coords[coords.length - 1]?.x || w},${h - padY} L ${coords[0]?.x || 0},${h - padY} Z`;
  const gradId = `grad-${stroke.replace(/[^a-zA-Z0-9]/g, "")}`;

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${w} ${h + 24}`} className="w-full overflow-visible">
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={fillTop} stopOpacity="0.28" />
            <stop offset="100%" stopColor={fillTop} stopOpacity="0.01" />
          </linearGradient>
        </defs>

        {/* Subtle horizontal gridlines */}
        {[0, 0.33, 0.66, 1].map((ratio, idx) => {
          const y = padY + ratio * (h - padY * 2);
          return (
            <line
              key={idx}
              x1={padX}
              x2={w - padX}
              y1={y}
              y2={y}
              stroke="#F1F3F6"
              strokeWidth="1"
            />
          );
        })}

        <path d={areaPath} fill={`url(#${gradId})`} />
        <path
          d={linePath}
          fill="none"
          stroke={stroke}
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {coords.map((c, idx) => (
          <g
            key={c.label}
            className="cursor-pointer"
            onMouseEnter={() => setHoverIdx(idx)}
            onMouseLeave={() => setHoverIdx(null)}
          >
            <circle
              cx={c.x}
              cy={c.y}
              r={hoverIdx === idx ? 5.5 : 3.5}
              fill="#FFFFFF"
              stroke={stroke}
              strokeWidth="2.2"
            />
            <text
              x={c.x}
              y={h + 10}
              textAnchor="middle"
              className="fill-[#667085] text-[10px] font-medium"
            >
              {c.label}
            </text>
            {(hoverIdx === idx || idx === coords.length - 1) && (
              <text
                x={c.x}
                y={c.y - 10}
                textAnchor="middle"
                className="fill-[#111318] font-mono text-[10px] font-bold"
              >
                {formatVal(c.value)}
              </text>
            )}
          </g>
        ))}
      </svg>
    </div>
  );
}

export function ShopAnalyticsView({
  brand,
  ads,
  boards,
  onBack,
  onOpenAd,
  onToggleFavorite,
  onToggleBoard,
  onUpdateBrand,
}: ShopAnalyticsViewProps) {
  const [activeTab, setActiveTab] = useState<"analytics" | "ads">("analytics");
  const [range, setRange] = useState<"3M" | "6M" | "ALL">("ALL");
  const [loadingTraffic, setLoadingTraffic] = useState(false);
  const [trafficNote, setTrafficNote] = useState<string | null>(null);

  const brandAds = ads.filter((a) => a.brand_id === brand.id);
  const domain = brand.website_url.replace(/^https?:\/\//, "").replace(/^www\./, "");

  const trafficSeries =
    range === "3M" ? brand.traffic_history.slice(-3) : brand.traffic_history;

  const adsSeries = brand.ads_history.map((val, idx) => ({
    label: `U${idx + 1}`,
    value: val,
  }));

  const handleFetchSimilarWeb = async () => {
    setLoadingTraffic(true);
    setTrafficNote(null);
    try {
      const res = await fetch(`/api/traffic?domain=${encodeURIComponent(domain)}`);
      const data = await res.json();
      if (data.ok && data.monthly_visits) {
        onUpdateBrand(brand.id, {
          monthly_visits: data.monthly_visits,
          traffic_growth_pct: data.traffic_growth_pct,
          traffic_history: data.traffic_history || brand.traffic_history,
        });
        setTrafficNote(`Opdateret live fra ${data.provider}!`);
      } else {
        setTrafficNote(data.message || "Tilføj SIMILARWEB_API_KEY eller RAPIDAPI_KEY for live trafik.");
      }
    } catch {
      setTrafficNote("Kunne ikke hente SimilarWeb-data.");
    } finally {
      setLoadingTraffic(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Top Shop Header Bar (Exact TrendTrack Shop Analytics header) */}
      <div className="space-y-3 border-b border-[#EAECEF] pb-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onBack}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#E6E8EC] bg-white text-[#344054] transition-colors hover:bg-[#F5F6F8]"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <span
              className="flex h-10 w-10 items-center justify-center rounded-xl text-sm font-bold text-white"
              style={{ backgroundColor: brand.avatar_color }}
            >
              {brand.avatar_initials}
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-display text-lg font-bold text-[#111318]">
                  {brand.name}
                </h1>
                {brand.is_shopify && (
                  <span className="inline-flex items-center gap-1 rounded-md bg-[#ECFDF3] px-1.5 py-0.5 text-[10px] font-semibold text-[#15803D]">
                    <ShoppingBag className="h-2.5 w-2.5" />
                    Shopify
                  </span>
                )}
              </div>
              <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#667085]">
                <a
                  href={brand.website_url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 font-medium text-[#0027eb] hover:underline"
                >
                  <Globe className="h-3 w-3" />
                  {domain}
                  <ArrowUpRight className="h-3 w-3" />
                </a>
                {brand.founded_date && <span>Startet: {brand.founded_date}</span>}
                {brand.origin_country && <span>{brand.origin_country}</span>}
                {brand.currency && <span>{brand.currency}</span>}
                {brand.shopify_theme && <span>Tema: {brand.shopify_theme}</span>}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleFetchSimilarWeb}
              disabled={loadingTraffic}
              className="inline-flex items-center gap-1.5 rounded-xl border border-[#E2E5EB] bg-white px-3 py-2 text-xs font-semibold text-[#111318] transition-colors hover:border-[#0027eb] hover:text-[#0027eb]"
            >
              {loadingTraffic ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <RefreshCw className="h-3.5 w-3.5" />
              )}
              SimilarWeb Sync
            </button>
            {brand.meta_ad_library_url && (
              <a
                href={brand.meta_ad_library_url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 rounded-xl bg-[#0027eb] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[#001fc2]"
              >
                Meta Ad Library
                <ArrowUpRight className="h-3.5 w-3.5" />
              </a>
            )}
          </div>
        </div>

        {trafficNote && (
          <p className="rounded-xl border border-[#E6E8EC] bg-[#F8F9FB] px-3 py-2 text-xs text-[#475467]">
            {trafficNote}
          </p>
        )}

        {/* TrendTrack Sub-Tabs */}
        <div className="flex items-center gap-2 pt-1">
          <button
            type="button"
            onClick={() => setActiveTab("analytics")}
            className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors"
            style={
              activeTab === "analytics"
                ? { backgroundColor: "#EEF2FF", color: "#0027eb" }
                : { color: "#667085" }
            }
          >
            Shop Analytics
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("ads")}
            className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors"
            style={
              activeTab === "ads"
                ? { backgroundColor: "#EEF2FF", color: "#0027eb" }
                : { color: "#667085" }
            }
          >
            Meta Ads
            <span className="h-1.5 w-1.5 rounded-full bg-[#16A34A]" />
            <span className="font-mono-num">{brand.active_ads_count}</span>
          </button>
        </div>
      </div>

      {activeTab === "analytics" ? (
        <div className="space-y-5">
          {/* Top 3 TrendTrack KPI Cards */}
          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-3">
            <div className="rounded-2xl border border-[#EAECEF] bg-white p-4">
              <p className="text-xs font-medium text-[#667085]">Monthly Visits</p>
              <div className="mt-2 flex items-center gap-2">
                <Users className="h-5 w-5 text-[#111318]" />
                <span className="font-mono-num text-2xl font-bold text-[#111318]">
                  {formatReach(brand.monthly_visits)}
                </span>
                <span
                  className="rounded-md px-2 py-0.5 font-mono-num text-xs font-semibold"
                  style={
                    brand.traffic_growth_pct >= 0
                      ? { backgroundColor: "#ECFDF3", color: "#15803D" }
                      : { backgroundColor: "#FFF1F2", color: "#E11D48" }
                  }
                >
                  {brand.traffic_growth_pct >= 0
                    ? `+${brand.traffic_growth_pct}%`
                    : `${brand.traffic_growth_pct}%`}
                </span>
              </div>
            </div>

            <div className="rounded-2xl border border-[#EAECEF] bg-white p-4">
              <p className="text-xs font-medium text-[#667085]">Trustpilot</p>
              <div className="mt-2 flex items-center gap-2">
                <div className="flex items-center gap-0.5">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <span
                      key={s}
                      className="flex h-5 w-5 items-center justify-center rounded-sm text-white"
                      style={{
                        backgroundColor:
                          s <= Math.round(brand.trustpilot_score || 4.5)
                            ? "#00B67A"
                            : "#E5E7EB",
                      }}
                    >
                      <Star className="h-3 w-3 fill-current" />
                    </span>
                  ))}
                </div>
                <span className="font-mono-num text-base font-bold text-[#111318]">
                  {brand.trustpilot_score || "4.6"}
                </span>
                <span className="text-xs text-[#667085]">
                  {brand.trustpilot_reviews?.toLocaleString("da-DK") || "—"} reviews
                </span>
              </div>
            </div>

            <div className="rounded-2xl border border-[#EAECEF] bg-white p-4">
              <p className="text-xs font-medium text-[#667085]">Socials &amp; Tracking</p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded-lg bg-[#FFF1F2] px-2.5 py-1 font-mono-num text-xs font-bold text-[#E11D48]">
                  IG {formatReach(brand.ig_followers)}
                </span>
                <span className="inline-flex items-center gap-1 rounded-lg bg-[#EEF2FF] px-2.5 py-1 font-mono-num text-xs font-bold text-[#0027eb]">
                  <Bookmark className="h-3 w-3" />
                  {brandAds.length} gemte
                </span>
              </div>
            </div>
          </div>

          {/* 2 Side-by-Side TrendTrack Area Charts */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {/* Traffic Over Time */}
            <div className="rounded-2xl border border-[#EAECEF] bg-white p-5">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="font-display text-sm font-bold text-[#111318]">
                  Traffic Over Time
                </h2>
                <div className="flex items-center rounded-lg bg-[#F3F4F6] p-0.5 text-[11px] font-semibold">
                  {(["3M", "6M", "ALL"] as const).map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setRange(r)}
                      className="rounded-md px-2 py-0.5 transition-colors"
                      style={
                        range === r
                          ? { backgroundColor: "#FFFFFF", color: "#111318" }
                          : { color: "#667085" }
                      }
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>

              <LargeAreaChart
                data={trafficSeries.map((p) => ({ label: p.label, value: p.visits }))}
                stroke="#16A34A"
                fillTop="#16A34A"
                formatVal={(v) => formatReach(v)}
              />

              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-[#F1F3F6] pt-3 text-xs">
                <span className="text-[#667085]">Visitor Countries</span>
                <div className="flex flex-wrap items-center gap-2.5 font-mono-num font-semibold text-[#111318]">
                  {brand.visitor_countries.map((c) => (
                    <span key={c.code}>
                      {c.flag} {c.pct}%
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Live Ads Over Time */}
            <div className="rounded-2xl border border-[#EAECEF] bg-white p-5">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h2 className="font-display text-sm font-bold text-[#111318]">
                    Live Ads Over Time
                  </h2>
                  <span className="inline-flex items-center gap-1 rounded-md bg-[#EEF2FF] px-2 py-0.5 font-mono-num text-xs font-bold text-[#0027eb]">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#16A34A]" />
                    {brand.active_ads_count}
                  </span>
                </div>
                <span className="text-xs text-[#667085]">Meta Ad Library</span>
              </div>

              <LargeAreaChart
                data={adsSeries}
                stroke="#0027eb"
                fillTop="#0027eb"
                formatVal={(v) => String(v)}
              />

              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-[#F1F3F6] pt-3 text-xs">
                <span className="text-[#667085]">Pixels &amp; Tech</span>
                <div className="flex flex-wrap items-center gap-1.5">
                  {(brand.pixels || ["Meta Pixel"]).map((px) => (
                    <span
                      key={px}
                      className="rounded-md bg-[#F2F4F7] px-2 py-0.5 text-[11px] font-medium text-[#344054]"
                    >
                      {px}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Top EU Ads Preview under Analytics */}
          {brandAds.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-base font-bold text-[#111318]">
                  Top Performing Ads ({brandAds.length})
                </h2>
                <button
                  type="button"
                  onClick={() => setActiveTab("ads")}
                  className="text-xs font-semibold text-[#0027eb] hover:underline"
                >
                  Vis alle →
                </button>
              </div>
              <div className="columns-1 gap-4 sm:columns-2 lg:columns-3 xl:columns-4">
                {brandAds.map((ad, idx) => (
                  <AdCard
                    key={ad.id}
                    ad={ad}
                    boards={boards}
                    rank={idx + 1}
                    onOpen={onOpenAd}
                    onToggleFavorite={onToggleFavorite}
                    onToggleBoard={onToggleBoard}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="columns-1 gap-4 sm:columns-2 lg:columns-3 xl:columns-4">
          {brandAds.map((ad, idx) => (
            <AdCard
              key={ad.id}
              ad={ad}
              boards={boards}
              rank={idx + 1}
              onOpen={onOpenAd}
              onToggleFavorite={onToggleFavorite}
              onToggleBoard={onToggleBoard}
            />
          ))}
        </div>
      )}
    </div>
  );
}
