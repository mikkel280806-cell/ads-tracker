"use client";

import React, { useState } from "react";
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

interface BrandTrackerViewProps {
  brands: Brand[];
  ads: Ad[];
  onSelectBrand: (brandId: string) => void;
  onAddBrand: (brand: Brand) => void;
  onSyncBrand: (brandId: string) => void;
}

export function BrandTrackerView({
  brands,
  ads,
  onSelectBrand,
  onAddBrand,
  onSyncBrand,
}: BrandTrackerViewProps) {
  const [query, setQuery] = useState("");
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

  const filtered = brands.filter((b) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return (
      b.name.toLowerCase().includes(q) ||
      b.handle.toLowerCase().includes(q) ||
      b.category.toLowerCase().includes(q)
    );
  });

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
    }, 650);
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
            Overvåg konkurrenters aktive Meta-annoncer, EU-reach og længst kørende vindere.
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

      {/* Add Brand Inline Form */}
      {showAddForm && (
        <form
          onSubmit={handleCreate}
          className="animate-sheet-up grid grid-cols-1 gap-3 rounded-2xl border p-4 sm:grid-cols-2 lg:grid-cols-3"
          style={{
            backgroundColor: "var(--bg-surface)",
            borderColor: "var(--border-strong)",
          }}
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
              Tilføj
            </button>
          </div>
        </form>
      )}

      {/* Compact Metric Strip */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: "Fulgte brands", value: String(brands.length) },
          { label: "Aktive Meta-ads", value: String(totalActiveAds) },
          { label: "Samlet EU-reach", value: formatReach(totalReach) },
          { label: "Gemte vindere (30d+)", value: String(winnersCount) },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-2xl border px-4 py-3.5"
            style={{
              backgroundColor: "var(--bg-surface)",
              borderColor: "var(--border-subtle)",
            }}
          >
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              {stat.label}
            </p>
            <p className="font-mono-num mt-1 text-2xl font-semibold tracking-tight">
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search
          className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2"
          style={{ color: "var(--text-muted)" }}
        />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Søg i brands eller kategorier..."
          className="w-full rounded-xl border py-2.5 pl-10 pr-4 text-sm outline-none"
          style={{
            backgroundColor: "var(--bg-surface)",
            borderColor: "var(--border-subtle)",
          }}
        />
      </div>

      {/* Brand Cards */}
      <div className="grid grid-cols-1 gap-3.5 md:grid-cols-2">
        {filtered.map((brand) => {
          const brandAds = ads.filter((a) => a.brand_id === brand.id);
          const longestDays = brandAds.reduce(
            (max, a) => Math.max(max, getActiveDays(a.started_running_at)),
            0
          );

          return (
            <div
              key={brand.id}
              className="flex flex-col justify-between gap-4 rounded-2xl border p-4 transition-colors"
              style={{
                backgroundColor: "var(--bg-surface)",
                borderColor: "var(--border-subtle)",
              }}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-sm font-bold text-white"
                    style={{ backgroundColor: brand.avatar_color }}
                  >
                    {brand.avatar_initials}
                  </span>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="font-display text-sm font-semibold">
                        {brand.name}
                      </h2>
                      {brand.is_shopify && (
                        <span
                          className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-medium"
                          style={{
                            backgroundColor: "var(--accent-live-soft)",
                            color: "var(--accent-live)",
                          }}
                        >
                          <ShoppingBag className="h-2.5 w-2.5" />
                          Shopify
                        </span>
                      )}
                    </div>
                    <p
                      className="text-xs"
                      style={{ color: "var(--text-muted)" }}
                    >
                      {brand.handle} · {brand.category}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleSync(brand.id)}
                  className="inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors hover:bg-white/5"
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
                      Opdateret
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

              {/* Metrics */}
              <div
                className="grid grid-cols-3 gap-2 rounded-xl p-2.5"
                style={{ backgroundColor: "var(--bg-elevated)" }}
              >
                <div>
                  <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>
                    Aktive ads
                  </p>
                  <p className="font-mono-num mt-0.5 flex items-center gap-1 text-sm font-semibold">
                    <span
                      className="h-1.5 w-1.5 rounded-full"
                      style={{ backgroundColor: "var(--accent-live)" }}
                    />
                    {brand.active_ads_count}
                  </p>
                </div>
                <div>
                  <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>
                    Est. EU Reach
                  </p>
                  <p className="font-mono-num mt-0.5 flex items-center gap-1 text-sm font-semibold">
                    <TrendingUp
                      className="h-3.5 w-3.5"
                      style={{ color: "var(--accent-meta)" }}
                    />
                    {formatReach(brand.estimated_monthly_reach)}
                  </p>
                </div>
                <div>
                  <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>
                    Længste ad
                  </p>
                  <p className="font-mono-num mt-0.5 flex items-center gap-1 text-sm font-semibold">
                    <Flame
                      className="h-3.5 w-3.5"
                      style={{ color: "var(--accent-winner)" }}
                    />
                    {longestDays > 0 ? `${longestDays}d` : "—"}
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => onSelectBrand(brand.id)}
                  className="rounded-xl px-3 py-1.5 text-xs font-semibold transition-colors"
                  style={{
                    backgroundColor: "var(--btn-primary-bg)",
                    color: "var(--btn-primary-fg)",
                  }}
                >
                  Se {brandAds.length} gemte ads
                </button>

                <div className="flex items-center gap-2">
                  {brand.meta_ad_library_url && (
                    <a
                      href={brand.meta_ad_library_url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors hover:bg-white/5"
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
                    className="inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors hover:bg-white/5"
                    style={{
                      borderColor: "var(--border-subtle)",
                      color: "var(--text-secondary)",
                    }}
                  >
                    Shop
                    <ArrowUpRight className="h-3 w-3" />
                  </a>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
