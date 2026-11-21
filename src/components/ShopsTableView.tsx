"use client";

import React, { useMemo, useState } from "react";
import {
  ArrowUpRight,
  Globe,
  Loader2,
  Package,
  Plus,
  Search,
  ShoppingBag,
  Sparkles,
  Trash2,
} from "lucide-react";
import type { Ad, Brand } from "@/lib/types";
import { formatReach } from "@/lib/url-parser";

interface ShopsTableViewProps {
  brands: Brand[];
  ads: Ad[];
  onOpenShop: (brandId: string) => void;
  onOpenAd: (ad: Ad) => void;
  onAddBrand: (brand: Brand, discoveredAds?: Ad[]) => void;
  onDeleteBrand: (brandId: string) => void;
}

const QUICK_REAL_BRANDS = ["loopearplugs.com", "ridge.com", "gymshark.com"];

export function ShopsTableView({
  brands,
  ads,
  onOpenShop,
  onAddBrand,
  onDeleteBrand,
}: ShopsTableViewProps) {
  const [lookupInput, setLookupInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filterQuery, setFilterQuery] = useState("");

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
        throw new Error(data.error || "Kunne ikke finde brandet.");
      }
      onAddBrand(data.brand, Array.isArray(data.ads) ? data.ads : []);
      setLookupInput("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Opslag fejlede.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    runBrandLookup(lookupInput);
  };

  const filtered = useMemo(() => {
    const q = filterQuery.trim().toLowerCase();
    if (!q) return brands;
    return brands.filter((b) =>
      `${b.name} ${b.handle} ${b.website_url} ${b.category} ${(b.pixels || []).join(" ")}`
        .toLowerCase()
        .includes(q)
    );
  }, [brands, filterQuery]);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-2.5">
          <h1 className="font-display text-2xl font-bold tracking-tight text-[#111318]">
            Brandtracker &amp; Shops
          </h1>
          <span className="rounded-md bg-[#F2F4F7] px-2 py-0.5 font-mono-num text-xs font-semibold text-[#475467]">
            {brands.length}
          </span>
        </div>

        {brands.length > 0 && (
          <div className="relative md:w-72">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#98A2B3]" />
            <input
              type="search"
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              placeholder="Filtrer dine fulgte shops..."
              className="w-full rounded-xl border border-[#E6E8EC] bg-[#F8F9FB] py-2 pl-9 pr-3 text-xs text-[#111318] outline-none focus:border-[#0027eb] focus:bg-white"
            />
          </div>
        )}
      </div>

      {/* 1-FIELD MAGIC AUTO-DISCOVERY BAR */}
      <div className="rounded-2xl border border-[#E2E5EB] bg-[#FAFBFD] p-3">
        <form
          onSubmit={handleSubmit}
          className="flex flex-col gap-2 sm:flex-row sm:items-center"
        >
          <div className="flex min-w-0 flex-1 items-center gap-2.5 rounded-xl border border-[#E2E5EB] bg-white px-3.5 py-2.5 focus-within:border-[#0027eb]">
            <Globe className="h-4 w-4 shrink-0 text-[#0027eb]" />
            <input
              id="brand-magic-input"
              type="text"
              value={lookupInput}
              onChange={(e) => setLookupInput(e.target.value)}
              placeholder="Skriv blot et brandnavn eller en URL (fx loopearplugs.com, gymshark, shaped.dk)..."
              className="w-full bg-transparent text-sm text-[#111318] outline-none placeholder:text-[#98A2B3]"
            />
          </div>

          <button
            id="brand-magic-submit"
            type="submit"
            disabled={loading || !lookupInput.trim()}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-[#0027eb] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#001fc2] disabled:opacity-45"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Scanner brand...
              </>
            ) : (
              <>
                <Plus className="h-4 w-4" />
                Find &amp; Spor Brand
              </>
            )}
          </button>
        </form>

        <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 px-1 text-xs">
          <div className="flex flex-wrap items-center gap-1.5 text-[#667085]">
            <Sparkles className="h-3.5 w-3.5 text-[#0027eb]" />
            <span>Finder automatisk logo, Shopify-produkter, tema, pixels, Instagram &amp; Ad Library.</span>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] text-[#98A2B3]">Prøv live:</span>
            {QUICK_REAL_BRANDS.map((domain) => (
              <button
                key={domain}
                type="button"
                disabled={loading}
                onClick={() => runBrandLookup(domain)}
                className="rounded-lg border border-[#E2E5EB] bg-white px-2 py-0.5 text-[11px] font-semibold text-[#344054] transition-colors hover:border-[#0027eb] hover:text-[#0027eb] disabled:opacity-40"
              >
                {domain}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <p className="mt-2.5 rounded-xl bg-[#FFF1F2] px-3 py-2 text-xs font-medium text-[#E11D48]">
            {error}
          </p>
        )}
      </div>

      {/* EMPTY STATE — ZERO FAKE PLACEHOLDERS */}
      {brands.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[#D0D5DD] bg-[#FAFBFD] px-6 py-16 text-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#EEF2FF] text-[#0027eb]">
            <ShoppingBag className="h-6 w-6" />
          </div>
          <h2 className="font-display text-base font-bold text-[#111318]">
            Ingen brands sporet endnu
          </h2>
          <p className="mt-1 max-w-md text-xs leading-relaxed text-[#667085]">
            Skriv navnet eller hjemmesiden på en konkurrent i feltet ovenfor — så henter Adtrack
            automatisk rigtige produkter, Shopify-opsætning, pixels, Instagram og Meta Ad Library-link.
          </p>
        </div>
      ) : (
        /* TRENDTRACK REAL SHOPS TABLE */
        <div className="overflow-hidden rounded-2xl border border-[#E6E8EC] bg-white">
          <div className="hidden grid-cols-[2.2fr_1.6fr_1.2fr_1fr_0.9fr] items-center gap-4 border-b border-[#EAECEF] bg-[#FAFBFD] px-4 py-2.5 text-[11px] font-semibold text-[#667085] lg:grid">
            <span>Shop Infos</span>
            <span>Best-Selling Products (Live)</span>
            <span>Pixels &amp; Tech</span>
            <span>Traffic / Ads</span>
            <span className="text-right">Handling</span>
          </div>

          <div className="divide-y divide-[#F1F3F6]">
            {filtered.map((brand) => {
              const brandAds = ads.filter((a) => a.brand_id === brand.id);
              const domain = brand.website_url
                .replace(/^https?:\/\//, "")
                .replace(/^www\./, "");
              const products = brand.top_products || [];

              return (
                <div
                  key={brand.id}
                  className="grid grid-cols-1 items-center gap-4 px-4 py-3.5 transition-colors hover:bg-[#FAFBFD] lg:grid-cols-[2.2fr_1.6fr_1.2fr_1fr_0.9fr]"
                >
                  {/* 1. Real Shop Info */}
                  <button
                    type="button"
                    onClick={() => onOpenShop(brand.id)}
                    className="flex items-center gap-3 text-left"
                  >
                    <div className="relative flex h-14 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-[#E6E8EC] bg-[#F8F9FB]">
                      {brand.storefront_image_url ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={brand.storefront_image_url}
                          alt={brand.name}
                          className="h-full w-full object-cover"
                        />
                      ) : brand.logo_url ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={brand.logo_url}
                          alt={brand.name}
                          className="h-8 w-8 rounded-lg object-contain"
                        />
                      ) : (
                        <span className="text-sm font-bold text-[#0027eb]">
                          {brand.avatar_initials}
                        </span>
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        {brand.logo_url && (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img
                            src={brand.logo_url}
                            alt=""
                            className="h-4 w-4 shrink-0 rounded"
                          />
                        )}
                        <span className="truncate text-sm font-bold text-[#111318] hover:text-[#0027eb]">
                          {brand.name}
                        </span>
                      </div>
                      <div className="mt-0.5 flex items-center gap-1.5 text-xs text-[#667085]">
                        <span className="truncate">{domain}</span>
                        {brand.is_shopify && (
                          <span className="inline-flex items-center gap-0.5 rounded bg-[#ECFDF3] px-1.5 py-0.5 text-[10px] font-semibold text-[#15803D]">
                            <ShoppingBag className="h-2.5 w-2.5" />
                            Shopify
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 truncate text-[11px] text-[#98A2B3]">
                        {brand.handle}
                        {brand.shopify_theme ? ` · Tema: ${brand.shopify_theme}` : ""}
                        {brand.currency ? ` · ${brand.currency}` : ""}
                      </p>
                    </div>
                  </button>

                  {/* 2. Real Best-Selling Products from /products.json */}
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
                              className="h-12 w-12 overflow-hidden rounded-lg border border-[#E6E8EC] bg-[#F8F9FB]"
                            >
                              {prod.image_url ? (
                                /* eslint-disable-next-line @next/next/no-img-element */
                                <img
                                  src={prod.image_url}
                                  alt={prod.title}
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center text-[#98A2B3]">
                                  <Package className="h-4 w-4" />
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                        <span className="inline-flex items-center gap-1 rounded-md bg-[#F2F4F7] px-2 py-0.5 font-mono-num text-[11px] font-semibold text-[#344054]">
                          <Package className="h-3 w-3 text-[#667085]" />
                          {brand.products_count ?? products.length}
                        </span>
                      </>
                    ) : (
                      <span className="text-xs text-[#98A2B3]">
                        {brand.is_shopify ? "Skjult produktfeed" : "Ikke Shopify-feed"}
                      </span>
                    )}
                  </button>

                  {/* 3. Real Detected Pixels */}
                  <div className="flex flex-wrap gap-1">
                    {(brand.pixels || []).length > 0 ? (
                      brand.pixels!.slice(0, 4).map((px) => (
                        <span
                          key={px}
                          className="rounded-md bg-[#F2F4F7] px-2 py-0.5 text-[10px] font-semibold text-[#344054]"
                        >
                          {px}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-[#98A2B3]">Ingen fundet</span>
                    )}
                  </div>

                  {/* 4. Real Live Meta Ads / IG / Traffic */}
                  <div className="space-y-1 text-xs">
                    <div className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-[#16A34A]" />
                      <span className="font-mono-num font-bold text-[#111318]">
                        {brand.active_ads_count ?? brandAds.length}
                      </span>
                      <span className="text-[#667085]">live ads</span>
                    </div>
                    {brand.ig_followers ? (
                      <div className="flex items-center gap-1.5">
                        <span className="text-[#667085]">IG:</span>
                        <span className="font-mono-num font-semibold text-[#111318]">
                          {formatReach(brand.ig_followers)}
                        </span>
                      </div>
                    ) : null}
                    {brand.monthly_visits ? (
                      <div className="flex items-center gap-1.5">
                        <span className="text-[#667085]">Visits:</span>
                        <span className="font-mono-num font-semibold text-[#0027eb]">
                          {formatReach(brand.monthly_visits)}
                        </span>
                      </div>
                    ) : null}
                  </div>

                  {/* 5. Actions */}
                  <div className="flex items-center justify-end gap-1.5">
                    {brand.meta_ad_library_url && (
                      <a
                        href={brand.meta_ad_library_url}
                        target="_blank"
                        rel="noreferrer"
                        title="Åbn i Meta Ad Library"
                        className="inline-flex items-center gap-1 rounded-lg border border-[#E2E5EB] bg-white px-2.5 py-1.5 text-[11px] font-semibold text-[#344054] hover:border-[#0027eb] hover:text-[#0027eb]"
                      >
                        Ads
                        <ArrowUpRight className="h-3 w-3" />
                      </a>
                    )}
                    <button
                      type="button"
                      onClick={() => onOpenShop(brand.id)}
                      className="rounded-lg bg-[#0027eb] px-2.5 py-1.5 text-[11px] font-semibold text-white hover:bg-[#001fc2]"
                    >
                      Åbn
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteBrand(brand.id)}
                      aria-label="Fjern brand"
                      className="rounded-lg p-1.5 text-[#98A2B3] hover:bg-[#FFF1F2] hover:text-[#E11D48]"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
