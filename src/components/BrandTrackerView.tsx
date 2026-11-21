"use client";

import React, { useMemo, useState } from "react";
import {
  ArrowUpRight,
  Check,
  Flame,
  Plus,
  RefreshCw,
  Search,
  ShoppingBag,
  TrendingUp,
} from "lucide-react";
import type { Ad, Brand } from "@/lib/types";
import { formatReach, getActiveDays } from "@/lib/url-parser";
import { Badge } from "@/components/reui/badge";
import { Frame, FramePanel } from "@/components/reui/frame";

interface BrandTrackerViewProps {
  brands: Brand[];
  ads: Ad[];
  onSelectBrand: (brandId: string) => void;
  onOpenAd: (ad: Ad) => void;
  onAddBrand: (brand: Brand) => void;
  onSyncBrand: (brandId: string) => void;
}

type BrandSort = "active_ads" | "reach" | "longest";

/**
 * Deterministic subtle 7-day ad velocity bars for TrendTrack visual momentum.
 */
function getVelocityBars(seed: number, activeCount: number): number[] {
  const base = Math.max(20, Math.min(85, activeCount));
  return [0, 1, 2, 3, 4, 5, 6].map((i) => {
    const wave = ((seed * (i + 3) * 17) % 30) - 10;
    const trend = i * 4;
    return Math.max(18, Math.min(100, Math.round(base * 0.75 + wave + trend)));
  });
}

export function BrandTrackerView({
  brands,
  ads,
  onSelectBrand,
  onOpenAd,
  onAddBrand,
  onSyncBrand,
}: BrandTrackerViewProps) {
  const [query, setQuery] = useState("");
  const [sortBy, setSortBy] = useState<BrandSort>("active_ads");
  const [showAddForm, setShowAddForm] = useState(false);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [syncedId, setSyncedId] = useState<string | null>(null);

  // Add brand form state
  const [name, setName] = useState("");
  const [handle, setHandle] = useState("");
  const [website, setWebsite] = useState("");
  const [metaUrl, setMetaUrl] = useState("");
  const [category, setCategory] = useState("E-commerce");
  const [isShopify, setIsShopify] = useState(true);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = brands.filter((b) => {
      if (!q) return true;
      return (
        b.name.toLowerCase().includes(q) ||
        b.handle.toLowerCase().includes(q) ||
        b.category.toLowerCase().includes(q)
      );
    });

    return [...list].sort((a, b) => {
      if (sortBy === "reach") {
        return b.estimated_monthly_reach - a.estimated_monthly_reach;
      }
      if (sortBy === "longest") {
        const aMax = ads
          .filter((ad) => ad.brand_id === a.id)
          .reduce((m, ad) => Math.max(m, getActiveDays(ad.started_running_at)), 0);
        const bMax = ads
          .filter((ad) => ad.brand_id === b.id)
          .reduce((m, ad) => Math.max(m, getActiveDays(ad.started_running_at)), 0);
        return bMax - aMax;
      }
      return b.active_ads_count - a.active_ads_count;
    });
  }, [brands, ads, query, sortBy]);

  const totalActiveAds = brands.reduce((sum, b) => sum + b.active_ads_count, 0);
  const totalReach = brands.reduce((sum, b) => sum + b.estimated_monthly_reach, 0);
  const winnersCount = ads.filter(
    (a) => a.is_active && getActiveDays(a.started_running_at) >= 30
  ).length;

  const handleSync = (brandId: string) => {
    setSyncingId(brandId);
    setTimeout(() => {
      onSyncBrand(brandId);
      setSyncingId(null);
      setSyncedId(brandId);
      setTimeout(() => setSyncedId(null), 1600);
    }, 600);
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    const initials = name
      .trim()
      .split(/\s+/)
      .map((w) => w[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();

    const colors = ["#0F766E", "#1D4ED8", "#B45309", "#15803D", "#BE123C", "#334155"];
    const brand: Brand = {
      id: `brand-${Date.now()}`,
      name: name.trim(),
      handle: handle.trim() || `@${name.trim().toLowerCase().replace(/\s+/g, "")}`,
      avatar_initials: initials || "BR",
      avatar_color: colors[brands.length % colors.length],
      website_url: website.trim() || "https://example.com",
      meta_ad_library_url: metaUrl.trim() || undefined,
      category: category.trim() || "E-commerce",
      is_shopify: isShopify,
      is_tracked: true,
      active_ads_count: 1,
      estimated_monthly_reach: 0,
      last_synced_at: new Date().toISOString(),
    };

    onAddBrand(brand);
    setName("");
    setHandle("");
    setWebsite("");
    setMetaUrl("");
    setShowAddForm(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight">
            Brand Tracker
          </h1>
          <p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>
            Overvåg konkurrenters aktive Meta-annoncer, scaling-tempo, EU-reach og bedste kreativer.
          </p>
        </div>

        <button
          id="btn-add-brand"
          type="button"
          onClick={() => setShowAddForm((v) => !v)}
          className="inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-opacity hover:opacity-90"
          style={{
            backgroundColor: "var(--btn-primary-bg)",
            color: "var(--btn-primary-fg)",
          }}
        >
          <Plus className="h-4 w-4" />
          Følg nyt brand
        </button>
      </div>

      {/* Add Brand Inline Form inside ReUI Frame */}
      {showAddForm && (
        <Frame className="animate-sheet-up">
          <FramePanel>
            <form
              onSubmit={handleCreate}
              className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3"
            >
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Brandnavn (fx Barebells)"
                className="rounded-xl border px-3 py-2 text-sm outline-none"
                style={{
                  backgroundColor: "var(--bg-elevated)",
                  borderColor: "var(--border-subtle)",
                }}
              />
              <input
                type="text"
                value={handle}
                onChange={(e) => setHandle(e.target.value)}
                placeholder="Instagram handle (@brand)"
                className="rounded-xl border px-3 py-2 text-sm outline-none"
                style={{
                  backgroundColor: "var(--bg-elevated)",
                  borderColor: "var(--border-subtle)",
                }}
              />
              <input
                type="text"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="Kategori (fx Hudpleje)"
                className="rounded-xl border px-3 py-2 text-sm outline-none"
                style={{
                  backgroundColor: "var(--bg-elevated)",
                  borderColor: "var(--border-subtle)",
                }}
              />
              <input
                type="url"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                placeholder="Webshop URL (https://...)"
                className="rounded-xl border px-3 py-2 text-sm outline-none"
                style={{
                  backgroundColor: "var(--bg-elevated)",
                  borderColor: "var(--border-subtle)",
                }}
              />
              <input
                type="url"
                value={metaUrl}
                onChange={(e) => setMetaUrl(e.target.value)}
                placeholder="Meta Ad Library URL (valgfrit)"
                className="rounded-xl border px-3 py-2 text-sm outline-none"
                style={{
                  backgroundColor: "var(--bg-elevated)",
                  borderColor: "var(--border-subtle)",
                }}
              />
              <div className="flex items-center justify-between gap-3">
                <label className="flex cursor-pointer items-center gap-2 text-xs">
                  <input
                    type="checkbox"
                    checked={isShopify}
                    onChange={(e) => setIsShopify(e.target.checked)}
                    className="rounded"
                  />
                  Shopify-shop
                </label>
                <button
                  type="submit"
                  className="rounded-xl px-4 py-2 text-xs font-semibold"
                  style={{
                    backgroundColor: "var(--btn-primary-bg)",
                    color: "var(--btn-primary-fg)",
                  }}
                >
                  Tilføj brand
                </button>
              </div>
            </form>
          </FramePanel>
        </Frame>
      )}

      {/* ReUI Concentric KPI Strip */}
      <Frame spacing="sm">
        <div className="grid grid-cols-2 gap-1.5 lg:grid-cols-4">
          {[
            { label: "Fulgte brands", value: String(brands.length), sub: "Opdateret i dag" },
            { label: "Aktive Meta-ads", value: String(totalActiveAds), sub: "På tværs af fulgte" },
            { label: "Est. månedlig EU-reach", value: formatReach(totalReach), sub: "Meta Transparency" },
            { label: "Gemte vindere (30d+)", value: String(winnersCount), sub: "Kører 30+ dage" },
          ].map((stat) => (
            <FramePanel key={stat.label}>
              <p className="text-[11px] font-medium" style={{ color: "var(--text-muted)" }}>
                {stat.label}
              </p>
              <p className="font-mono-num mt-1 text-2xl font-semibold tracking-tight">
                {stat.value}
              </p>
              <p className="mt-0.5 text-[11px]" style={{ color: "var(--text-muted)" }}>
                {stat.sub}
              </p>
            </FramePanel>
          ))}
        </div>
      </Frame>

      {/* Search + Sort Controls */}
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div className="relative max-w-md flex-1">
          <Search
            className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2"
            style={{ color: "var(--text-muted)" }}
          />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Søg i brands, handles eller kategorier..."
            className="w-full rounded-xl border py-2.5 pl-10 pr-4 text-sm outline-none"
            style={{
              backgroundColor: "var(--bg-surface)",
              borderColor: "var(--border-subtle)",
            }}
          />
        </div>

        <div className="no-scrollbar flex items-center gap-1.5 overflow-x-auto">
          {[
            { id: "active_ads" as const, label: "Flest aktive ads" },
            { id: "reach" as const, label: "Højeste EU Reach" },
            { id: "longest" as const, label: "Længste vinder" },
          ].map((opt) => {
            const active = sortBy === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => setSortBy(opt.id)}
                className="shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors"
                style={{
                  backgroundColor: active ? "var(--btn-primary-bg)" : "var(--bg-surface)",
                  color: active ? "var(--btn-primary-fg)" : "var(--text-secondary)",
                  borderColor: active ? "transparent" : "var(--border-subtle)",
                }}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Brand Intelligence Cards inside ReUI Frames */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {filtered.map((brand, idx) => {
          const brandAds = ads.filter((a) => a.brand_id === brand.id);
          const longestDays = brandAds.reduce(
            (max, a) => Math.max(max, getActiveDays(a.started_running_at)),
            0
          );
          const bars = getVelocityBars(idx + 2, brand.active_ads_count);

          return (
            <Frame key={brand.id} spacing="sm">
              <FramePanel className="flex flex-col justify-between gap-4">
                {/* Brand Row Header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-sm font-bold text-white ring-1 ring-white/10"
                      style={{ backgroundColor: brand.avatar_color }}
                    >
                      {brand.avatar_initials}
                    </span>
                    <div>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <h2 className="font-display text-sm font-semibold">
                          {brand.name}
                        </h2>
                        {brand.is_shopify && (
                          <Badge size="xs" variant="success-light" radius="full">
                            <ShoppingBag className="h-2.5 w-2.5" />
                            Shopify
                          </Badge>
                        )}
                        <Badge size="xs" variant="outline">
                          {brand.category}
                        </Badge>
                      </div>
                      <p className="mt-0.5 text-xs" style={{ color: "var(--text-muted)" }}>
                        {brand.handle}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleSync(brand.id)}
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors hover:bg-muted"
                    style={{
                      borderColor: "var(--border-subtle)",
                      color: "var(--text-secondary)",
                    }}
                  >
                    {syncedId === brand.id ? (
                      <>
                        <Check
                          className="h-3.5 w-3.5"
                          style={{ color: "var(--accent-live)" }}
                        />
                        Synkroniseret
                      </>
                    ) : (
                      <>
                        <RefreshCw
                          className={`h-3.5 w-3.5 ${syncingId === brand.id ? "animate-spin" : ""}`}
                        />
                        Sync
                      </>
                    )}
                  </button>
                </div>

                {/* Metrics + 7d Scaling Sparkline */}
                <div
                  className="grid grid-cols-4 items-end gap-2 rounded-xl p-3"
                  style={{ backgroundColor: "var(--bg-elevated)" }}
                >
                  <div>
                    <p className="text-[10px] uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
                      Aktive ads
                    </p>
                    <p className="font-mono-num mt-1 flex items-center gap-1.5 text-sm font-semibold">
                      <span
                        className="h-1.5 w-1.5 rounded-full"
                        style={{ backgroundColor: "var(--accent-live)" }}
                      />
                      {brand.active_ads_count}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
                      EU Reach
                    </p>
                    <p className="font-mono-num mt-1 flex items-center gap-1 text-sm font-semibold">
                      <TrendingUp
                        className="h-3.5 w-3.5"
                        style={{ color: "var(--accent-meta)" }}
                      />
                      {formatReach(brand.estimated_monthly_reach)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
                      Længste ad
                    </p>
                    <p className="font-mono-num mt-1 flex items-center gap-1 text-sm font-semibold">
                      <Flame
                        className="h-3.5 w-3.5"
                        style={{ color: "var(--accent-winner)" }}
                      />
                      {longestDays > 0 ? `${longestDays}d` : "—"}
                    </p>
                  </div>
                  <div className="flex flex-col items-end">
                    <p className="text-[10px] uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
                      Scaling 7d
                    </p>
                    <div className="mt-1.5 flex h-6 items-end gap-1">
                      {bars.map((h, i) => (
                        <span
                          key={i}
                          className="w-1.5 rounded-full"
                          style={{
                            height: `${Math.max(22, h)}%`,
                            backgroundColor:
                              i >= 5 ? "var(--accent-live)" : "var(--border-strong)",
                          }}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                {/* Inline Top Creatives Preview Strip */}
                {brandAds.length > 0 && (
                  <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
                    {brandAds.slice(0, 4).map((ad) => (
                      <button
                        key={ad.id}
                        type="button"
                        onClick={() => onOpenAd(ad)}
                        className="group/thumb relative h-16 w-14 shrink-0 overflow-hidden rounded-xl border transition-transform hover:scale-105"
                        style={{ borderColor: "var(--border-subtle)" }}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={ad.thumbnail_url || ad.media_url}
                          alt={ad.headline}
                          className="h-full w-full object-cover"
                        />
                      </button>
                    ))}
                    <div className="min-w-0 pl-1">
                      <p className="truncate text-xs font-medium">
                        {brandAds[0].headline}
                      </p>
                      <p
                        className="line-clamp-1 text-[11px]"
                        style={{ color: "var(--text-muted)" }}
                      >
                        {brandAds[0].ai_hook_verbal || brandAds[0].primary_text}
                      </p>
                    </div>
                  </div>
                )}

                {/* Footer Actions */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5">
                  <button
                    type="button"
                    onClick={() => onSelectBrand(brand.id)}
                    className="rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-opacity hover:opacity-90"
                    style={{
                      backgroundColor: "var(--btn-primary-bg)",
                      color: "var(--btn-primary-fg)",
                    }}
                  >
                    Åbn {brandAds.length} gemte ads
                  </button>

                  <div className="flex items-center gap-1.5">
                    {brand.meta_ad_library_url && (
                      <a
                        href={brand.meta_ad_library_url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors hover:bg-muted"
                        style={{
                          borderColor: "var(--border-subtle)",
                          color: "var(--text-secondary)",
                        }}
                      >
                        Ad Library
                        <ArrowUpRight className="h-3 w-3" />
                      </a>
                    )}
                    <a
                      href={brand.website_url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors hover:bg-muted"
                      style={{
                        borderColor: "var(--border-subtle)",
                        color: "var(--text-secondary)",
                      }}
                    >
                      Webshop
                      <ArrowUpRight className="h-3 w-3" />
                    </a>
                  </div>
                </div>
              </FramePanel>
            </Frame>
          );
        })}
      </div>
    </div>
  );
}
