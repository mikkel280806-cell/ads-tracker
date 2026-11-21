"use client";

import React, { useMemo, useState } from "react";
import {
  Bookmark,
  Clock,
  Film,
  Image as ImageIcon,
  LayoutGrid,
  Play,
  Plus,
  SlidersHorizontal,
  Sparkles,
} from "lucide-react";
import type { Ad } from "@/lib/types";
import { getActiveDays } from "@/lib/url-parser";

interface TemplatesGridViewProps {
  ads: Ad[];
  onOpenAd: (ad: Ad) => void;
  onToggleFavorite: (adId: string) => void;
  onOpenImport: () => void;
  onQuickScout: (domain: string) => void;
  scouting: boolean;
}

export function TemplatesGridView({
  ads,
  onOpenAd,
  onToggleFavorite,
  onOpenImport,
  onQuickScout,
  scouting,
}: TemplatesGridViewProps) {
  const [scope, setScope] = useState<"all" | "saved">("all");
  const [formatTab, setFormatTab] = useState<"all" | "image" | "video">("all");
  const [sortBy, setSortBy] = useState<"newest" | "longest">("newest");

  const savedCount = ads.filter((a) => a.is_favorite || a.board_ids.length > 0).length;

  const visible = useMemo(() => {
    const list = ads.filter((ad) => {
      if (scope === "saved" && !ad.is_favorite && ad.board_ids.length === 0) return false;
      if (formatTab === "image" && ad.media_type !== "image") return false;
      if (formatTab === "video" && ad.media_type !== "video") return false;
      return true;
    });

    return [...list].sort((a, b) => {
      if (sortBy === "longest") {
        return getActiveDays(b.started_running_at) - getActiveDays(a.started_running_at);
      }
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [ads, scope, formatTab, sortBy]);

  return (
    <div className="space-y-5">
      {/* KONVERT SIGNATURE PAGE HEADER */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="adtrack-icon-badge flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white">
            <LayoutGrid className="h-5 w-5" />
          </div>
          <div>
            <h1 className="font-display text-[17px] font-bold leading-tight text-[#101828]">
              Templates
            </h1>
            <p className="mt-0.5 text-[12.5px] text-[#667085]">
              Visuelt kreativ-galleri til dine højkonverterende statics og video-ads
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onOpenImport}
          className="inline-flex items-center gap-1.5 rounded-xl bg-[#101828] px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#0027eb]"
        >
          <Plus className="h-3.5 w-3.5" />
          Importér Ad
        </button>
      </div>

      {/* KONVERT SUB-HEADER BAR: Left Segmented Pill · Center Underline Tabs · Right Sort */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#EAECF0] pb-0">
        {/* Left: All / Saved segmented toggle */}
        <div className="mb-2.5 flex items-center rounded-xl bg-[#F4F5F7] p-0.5">
          <button
            type="button"
            onClick={() => setScope("all")}
            className="rounded-[9px] px-3 py-1.5 text-xs font-semibold transition-all"
            style={
              scope === "all"
                ? {
                    backgroundColor: "#FFFFFF",
                    color: "#101828",
                    boxShadow: "0 1px 2px rgba(16,24,40,0.06)",
                  }
                : { color: "#667085" }
            }
          >
            All Creatives
          </button>
          <button
            type="button"
            onClick={() => setScope("saved")}
            className="inline-flex items-center gap-1.5 rounded-[9px] px-3 py-1.5 text-xs font-semibold transition-all"
            style={
              scope === "saved"
                ? {
                    backgroundColor: "#FFFFFF",
                    color: "#101828",
                    boxShadow: "0 1px 2px rgba(16,24,40,0.06)",
                  }
                : { color: "#667085" }
            }
          >
            Saved
            <span className="rounded-md bg-[#EAECEF] px-1.5 py-0.2 font-mono-num text-[10px] font-semibold text-[#344054]">
              {savedCount}
            </span>
          </button>
        </div>

        {/* Center: Clean Underline Tabs (Exact Konvert image.png) */}
        <div className="flex items-center gap-5">
          {[
            { id: "all" as const, label: "Digital Ads", icon: Sparkles },
            { id: "image" as const, label: "Static Ads", icon: ImageIcon },
            { id: "video" as const, label: "Video & Reels", icon: Film },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = formatTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFormatTab(tab.id)}
                className="inline-flex items-center gap-1.5 border-b-2 pb-3 text-[13px] font-semibold transition-colors"
                style={{
                  borderColor: active ? "#0027eb" : "transparent",
                  color: active ? "#101828" : "#667085",
                }}
              >
                <Icon className="h-3.5 w-3.5" style={{ color: active ? "#0027eb" : "#98A2B3" }} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Right: Minimal Sort Controls */}
        <div className="mb-2.5 flex items-center gap-3 text-xs font-medium text-[#475467]">
          <button
            type="button"
            onClick={() => setSortBy((s) => (s === "newest" ? "longest" : "newest"))}
            className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 hover:bg-[#F4F5F7]"
          >
            <Clock className="h-3.5 w-3.5 text-[#667085]" />
            {sortBy === "newest" ? "Newest" : "Longest active"}
          </button>
          <span className="inline-flex items-center gap-1.5 text-[#98A2B3]">
            <SlidersHorizontal className="h-3.5 w-3.5" />
            <span className="font-mono-num">{visible.length}</span>
          </span>
        </div>
      </div>

      {/* PURE VISUAL 4-COLUMN CREATIVE WALL */}
      {visible.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[#D8DCE3] bg-[#FAFBFD] px-6 py-16 text-center">
          <div className="adtrack-icon-badge mb-3.5 flex h-11 w-11 items-center justify-center rounded-xl text-white">
            <LayoutGrid className="h-5 w-5" />
          </div>
          <h2 className="font-display text-base font-bold text-[#101828]">
            Dit visuelle galleri er klar
          </h2>
          <p className="mt-1 max-w-md text-xs leading-relaxed text-[#667085]">
            Importér et Instagram- eller Meta Ad Library-link, eller hent rigtige live annoncer fra
            et brand med ét klik herunder.
          </p>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
            {["loopearplugs.com", "ridge.com", "gymshark.com"].map((domain) => (
              <button
                key={domain}
                type="button"
                disabled={scouting}
                onClick={() => onQuickScout(domain)}
                className="rounded-xl border border-[#E2E5EB] bg-white px-3.5 py-2 text-xs font-semibold text-[#101828] transition-colors hover:border-[#0027eb] hover:text-[#0027eb] disabled:opacity-40"
              >
                Hent live ads: {domain}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 lg:grid-cols-4">
          {visible.map((ad) => {
            const isSaved = ad.is_favorite || ad.board_ids.length > 0;
            return (
              <div
                key={ad.id}
                role="button"
                tabIndex={0}
                onClick={() => onOpenAd(ad)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onOpenAd(ad);
                  }
                }}
                className="group relative aspect-square cursor-pointer overflow-hidden rounded-2xl border border-[#ECEEF2] bg-[#F4F5F7] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg"
              >
                {ad.thumbnail_url || ad.media_url ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={ad.thumbnail_url || ad.media_url}
                    alt={ad.headline}
                    loading="lazy"
                    className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03]"
                  />
                ) : (
                  <div className="flex h-full w-full flex-col items-center justify-center p-4 text-center">
                    <span className="text-xs font-bold text-[#101828]">{ad.brand_name}</span>
                    <span className="mt-1 line-clamp-2 text-[11px] text-[#667085]">
                      {ad.headline}
                    </span>
                  </div>
                )}

                {ad.media_type === "video" && (
                  <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                    <span className="flex h-10 w-10 items-center justify-center rounded-full border border-white/40 bg-black/25 text-white backdrop-blur-md transition-transform group-hover:scale-110">
                      <Play className="ml-0.5 h-4 w-4 fill-current" />
                    </span>
                  </div>
                )}

                {/* Hover Overlay: Brand + Quick Save */}
                <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 bg-gradient-to-t from-black/75 via-black/35 to-transparent p-3 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                  <div className="min-w-0">
                    <p className="truncate text-xs font-semibold text-white">
                      {ad.brand_name}
                    </p>
                    <p className="truncate text-[10px] text-white/75">
                      {ad.headline}
                    </p>
                  </div>
                  <button
                    type="button"
                    aria-label="Gem kreativ"
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleFavorite(ad.id);
                    }}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/95 text-[#101828] shadow-sm transition-colors hover:bg-[#0027eb] hover:text-white"
                  >
                    <Bookmark
                      className="h-3.5 w-3.5"
                      fill={isSaved ? "currentColor" : "none"}
                    />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
