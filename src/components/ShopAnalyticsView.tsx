"use client";

import React, { useState } from "react";
import {
  ArrowLeft,
  ArrowUpRight,
  BarChart3,
  Globe,
  Loader2,
  Package,
  RefreshCw,
  ShoppingBag,
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

function TrafficAreaChart({
  data,
}: {
  data: { label: string; visits: number }[];
}) {
  if (data.length < 2) return null;
  const w = 520;
  const h = 180;
  const padX = 28;
  const padY = 20;
  const max = Math.max(...data.map((d) => d.visits), 1);

  const coords = data.map((d, i) => {
    const x = padX + (i / (data.length - 1)) * (w - padX * 2);
    const y = h - padY - (d.visits / max) * (h - padY * 2);
    return { x, y, ...d };
  });

  const linePath = `M ${coords.map((c) => `${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(" L ")}`;
  const areaPath = `${linePath} L ${coords[coords.length - 1].x},${h - padY} L ${coords[0].x},${h - padY} Z`;

  return (
    <svg viewBox={`0 0 ${w} ${h + 24}`} className="w-full overflow-visible">
      <defs>
        <linearGradient id="swGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0027eb" stopOpacity="0.24" />
          <stop offset="100%" stopColor="#0027eb" stopOpacity="0.01" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill="url(#swGrad)" />
      <path
        d={linePath}
        fill="none"
        stroke="#0027eb"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {coords.map((c) => (
        <g key={c.label}>
          <circle cx={c.x} cy={c.y} r="3.5" fill="#FFFFFF" stroke="#0027eb" strokeWidth="2.2" />
          <text x={c.x} y={h + 10} textAnchor="middle" className="fill-[#667085] text-[10px]">
            {c.label}
          </text>
          <text
            x={c.x}
            y={c.y - 9}
            textAnchor="middle"
            className="fill-[#111318] font-mono text-[10px] font-bold"
          >
            {formatReach(c.visits)}
          </text>
        </g>
      ))}
    </svg>
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
  const [loadingTraffic, setLoadingTraffic] = useState(false);
  const [rescanning, setRescanning] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  const brandAds = ads.filter((a) => a.brand_id === brand.id);
  const domain = brand.website_url.replace(/^https?:\/\//, "").replace(/^www\./, "");
  const products = brand.top_products || [];

  const handleFetchSimilarWeb = async () => {
    setLoadingTraffic(true);
    setStatusMsg(null);
    try {
      const res = await fetch(`/api/traffic?domain=${encodeURIComponent(domain)}`);
      const data = await res.json();
      if (data.ok && data.monthly_visits) {
        onUpdateBrand(brand.id, {
          monthly_visits: data.monthly_visits,
          traffic_growth_pct: data.traffic_growth_pct,
          traffic_history: data.traffic_history,
        });
        setStatusMsg(`Live trafik opdateret fra ${data.provider}!`);
      } else {
        setStatusMsg(
          data.message || "Tilføj SIMILARWEB_API_KEY eller RAPIDAPI_KEY i Connectors for live trafik."
        );
      }
    } catch {
      setStatusMsg("Kunne ikke hente SimilarWeb-data.");
    } finally {
      setLoadingTraffic(false);
    }
  };

  const handleRescanBrand = async () => {
    setRescanning(true);
    setStatusMsg(null);
    try {
      const res = await fetch("/api/brand-lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: brand.website_url }),
      });
      const data = await res.json();
      if (res.ok && data.ok && data.brand) {
        onUpdateBrand(brand.id, {
          ...data.brand,
          id: brand.id,
        });
        setStatusMsg("Shop, produkter og pixels opdateret live!");
      }
    } finally {
      setRescanning(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-3 border-b border-[#EAECEF] pb-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onBack}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#E6E8EC] bg-white text-[#344054] hover:bg-[#F5F6F8]"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-xl border border-[#E6E8EC] bg-[#F8F9FB]">
              {brand.logo_url ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={brand.logo_url} alt={brand.name} className="h-8 w-8 object-contain" />
              ) : (
                <span className="text-sm font-bold text-[#0027eb]">
                  {brand.avatar_initials}
                </span>
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-display text-xl font-bold text-[#111318]">
                  {brand.name}
                </h1>
                {brand.is_shopify && (
                  <span className="inline-flex items-center gap-1 rounded-md bg-[#ECFDF3] px-2 py-0.5 text-[11px] font-semibold text-[#15803D]">
                    <ShoppingBag className="h-3 w-3" />
                    Shopify
                  </span>
                )}
              </div>
              <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#667085]">
                <a
                  href={brand.website_url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 font-semibold text-[#0027eb] hover:underline"
                >
                  <Globe className="h-3 w-3" />
                  {domain}
                  <ArrowUpRight className="h-3 w-3" />
                </a>
                {brand.instagram_url && (
                  <a
                    href={brand.instagram_url}
                    target="_blank"
                    rel="noreferrer"
                    className="font-medium text-[#E11D48] hover:underline"
                  >
                    {brand.handle}
                  </a>
                )}
                {brand.shopify_theme && <span>Tema: {brand.shopify_theme}</span>}
                {brand.currency && <span>Valuta: {brand.currency}</span>}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleRescanBrand}
              disabled={rescanning}
              className="inline-flex items-center gap-1.5 rounded-xl border border-[#E2E5EB] bg-white px-3 py-2 text-xs font-semibold text-[#344054] hover:border-[#0027eb] hover:text-[#0027eb]"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${rescanning ? "animate-spin" : ""}`} />
              Opdatér shop
            </button>
            <button
              type="button"
              onClick={handleFetchSimilarWeb}
              disabled={loadingTraffic}
              className="inline-flex items-center gap-1.5 rounded-xl border border-[#E2E5EB] bg-white px-3 py-2 text-xs font-semibold text-[#344054] hover:border-[#0027eb] hover:text-[#0027eb]"
            >
              {loadingTraffic ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <BarChart3 className="h-3.5 w-3.5" />
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
                Åbn Meta Ad Library
                <ArrowUpRight className="h-3.5 w-3.5" />
              </a>
            )}
          </div>
        </div>

        {brand.description && (
          <p className="max-w-3xl text-xs leading-relaxed text-[#475467]">
            {brand.description}
          </p>
        )}

        {statusMsg && (
          <p className="rounded-xl border border-[#E6E8EC] bg-[#F8F9FB] px-3 py-2 text-xs font-medium text-[#344054]">
            {statusMsg}
          </p>
        )}
      </div>

      {/* Real KPI Row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-[#EAECEF] bg-white p-4">
          <p className="text-xs font-medium text-[#667085]">Live Meta Ads &amp; IG</p>
          <div className="mt-2 flex flex-wrap items-center gap-2.5">
            <span className="inline-flex items-center gap-1.5 font-mono-num text-2xl font-bold text-[#111318]">
              <span className="h-2.5 w-2.5 rounded-full bg-[#16A34A]" />
              {brand.active_ads_count ?? brandAds.length}
            </span>
            {brand.ig_followers ? (
              <span className="rounded-md bg-[#FFF1F2] px-2 py-0.5 font-mono-num text-xs font-bold text-[#E11D48]">
                IG {formatReach(brand.ig_followers)}
              </span>
            ) : null}
            {brand.monthly_visits ? (
              <span className="rounded-md bg-[#EEF2FF] px-2 py-0.5 font-mono-num text-xs font-bold text-[#0027eb]">
                <Users className="mr-1 inline h-3 w-3" />
                {formatReach(brand.monthly_visits)}/md
              </span>
            ) : null}
          </div>
        </div>

        <div className="rounded-2xl border border-[#EAECEF] bg-white p-4">
          <p className="text-xs font-medium text-[#667085]">Fundne Produkter (Live)</p>
          <div className="mt-2 flex items-center gap-2">
            <Package className="h-5 w-5 text-[#16A34A]" />
            <span className="font-mono-num text-2xl font-bold text-[#111318]">
              {brand.products_count ?? products.length}
            </span>
            <span className="text-xs text-[#667085]">
              {brand.is_shopify ? "fra /products.json" : ""}
            </span>
          </div>
        </div>

        <div className="rounded-2xl border border-[#EAECEF] bg-white p-4">
          <p className="text-xs font-medium text-[#667085]">Detekterede Pixels &amp; Apps</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {(brand.pixels || []).length > 0 ? (
              brand.pixels!.map((px) => (
                <span
                  key={px}
                  className="rounded-md bg-[#EEF2FF] px-2 py-0.5 text-[11px] font-semibold text-[#0027eb]"
                >
                  {px}
                </span>
              ))
            ) : (
              <span className="text-xs text-[#98A2B3]">Ingen pixels fundet</span>
            )}
          </div>
        </div>
      </div>

      {/* Traffic Chart (only shown when REAL SimilarWeb data exists) */}
      {brand.traffic_history && brand.traffic_history.length >= 2 && (
        <div className="rounded-2xl border border-[#EAECEF] bg-white p-5">
          <h2 className="mb-3 font-display text-sm font-bold text-[#111318]">
            Traffic Over Time (Live SimilarWeb)
          </h2>
          <TrafficAreaChart data={brand.traffic_history} />
        </div>
      )}

      {/* REAL Best-Selling Products Grid */}
      {products.length > 0 && (
        <div className="space-y-3">
          <h2 className="font-display text-base font-bold text-[#111318]">
            Best-Selling Products ({brand.products_count ?? products.length})
          </h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {products.map((prod, idx) => (
              <a
                key={`${prod.title}-${idx}`}
                href={prod.url || brand.website_url}
                target="_blank"
                rel="noreferrer"
                className="group overflow-hidden rounded-2xl border border-[#E6E8EC] bg-white transition-all hover:border-[#0027eb]/40 hover:shadow-md"
              >
                <div className="relative aspect-square w-full overflow-hidden bg-[#F8F9FB]">
                  {prod.image_url ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={prod.image_url}
                      alt={prod.title}
                      loading="lazy"
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-[#98A2B3]">
                      <Package className="h-8 w-8" />
                    </div>
                  )}
                  <span className="absolute left-2 top-2 rounded-md bg-white/90 px-1.5 py-0.5 font-mono-num text-[10px] font-bold text-[#111318]">
                    #{idx + 1}
                  </span>
                </div>
                <div className="p-3">
                  <p className="line-clamp-2 text-xs font-semibold text-[#111318]">
                    {prod.title}
                  </p>
                  {prod.price && (
                    <p className="mt-1 font-mono-num text-xs font-bold text-[#0027eb]">
                      {prod.price} {prod.currency || brand.currency || ""}
                    </p>
                  )}
                </div>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Brand's Saved Ads */}
      <div className="space-y-3">
        <h2 className="font-display text-base font-bold text-[#111318]">
          Gemte Ads fra {brand.name} ({brandAds.length})
        </h2>
        {brandAds.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[#D0D5DD] bg-[#FAFBFD] p-8 text-center">
            <p className="text-xs text-[#667085]">
              Du har ikke gemt nogen ads fra {brand.name} endnu. Klik{" "}
              <strong>Åbn Meta Ad Library</strong> ovenfor, kopiér linket på deres bedste annoncer,
              og indsæt dem under <strong>Ads</strong>.
            </p>
          </div>
        ) : (
          <div className="columns-1 gap-4 sm:columns-2 lg:columns-3 xl:columns-4">
            {brandAds.map((ad) => (
              <AdCard
                key={ad.id}
                ad={ad}
                boards={boards}
                onOpen={onOpenAd}
                onToggleFavorite={onToggleFavorite}
                onToggleBoard={onToggleBoard}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
