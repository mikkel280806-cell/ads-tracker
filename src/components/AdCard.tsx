"use client";

import React, { useState } from "react";
import {
  ArrowUpRight,
  Bookmark,
  Check,
  Copy,
  Layers,
  Play,
  Sparkles,
} from "lucide-react";
import type { Ad, Board } from "@/lib/types";
import { formatReach, getActiveDays } from "@/lib/url-parser";
import { MetaInfinityIcon } from "./BrandIcons";

interface AdCardProps {
  ad: Ad;
  boards: Board[];
  rank?: number;
  compact?: boolean;
  onOpen: (ad: Ad) => void;
  onToggleBoard: (adId: string, boardId: string) => void;
  onOpenBrand?: (brandId: string) => void;
}

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

function getDomainDisplay(url?: string, path?: string): string {
  if (!url) return "";
  try {
    const host = new URL(url).hostname.replace(/^www\./, "");
    if (path && path !== "/") {
      const shortPath = path.length > 26 ? `${path.slice(0, 26)}…` : path;
      return `${host}${shortPath}`;
    }
    return host;
  } catch {
    return url;
  }
}

export function AdCard({
  ad,
  boards,
  rank,
  compact = false,
  onOpen,
  onToggleBoard,
  onOpenBrand,
}: AdCardProps) {
  const [folderMenuOpen, setFolderMenuOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [imgFailed, setImgFailed] = useState(false);

  const activeDays = getActiveDays(ad.started_running_at);
  const inFolders = ad.board_ids.length > 0;
  const hasLongCopy = (ad.primary_text?.length || 0) > 105;

  const isVideoFile =
    ad.media_type === "video" && /\.(mp4|webm|mov)(\?|$)/i.test(ad.media_url);

  const primaryImg = imgFailed
    ? ad.fallback_image_url || ""
    : ad.thumbnail_url || ad.fallback_image_url || ad.media_url || "";

  const aspectClass =
    ad.aspect_ratio === "1:1"
      ? "aspect-square"
      : ad.aspect_ratio === "9:16"
        ? "aspect-[9/14]"
        : "aspect-[4/5]";

  const marketFlag = ad.market === "DK" ? "🇩🇰" : ad.market === "EU" ? "🇪🇺" : "🇺🇸";

  const rankStyle =
    rank === 1
      ? "bg-gradient-to-b from-[#FDE68A] to-[#F59E0B] text-[#78350F] shadow-sm"
      : rank === 2
        ? "bg-gradient-to-b from-[#F1F5F9] to-[#CBD5E1] text-[#334155] shadow-sm"
        : rank === 3
          ? "bg-gradient-to-b from-[#FED7AA] to-[#D97706] text-white shadow-sm"
          : "bg-[#F1F5F9] text-[#475569]";

  return (
    <article
      className="adtrack-card-interactive group relative flex flex-col overflow-hidden rounded-[18px]"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false);
        setFolderMenuOpen(false);
      }}
    >
      {/* 1. TRENDTRACK META AD HEADER */}
      <div className="flex items-start justify-between gap-2 px-3.5 pb-2 pt-3">
        <button
          type="button"
          onClick={() => (onOpenBrand ? onOpenBrand(ad.brand_id) : onOpen(ad))}
          className="flex min-w-0 items-center gap-2.5 text-left"
        >
          <div className="relative shrink-0">
            {ad.brand_logo_url ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={ad.brand_logo_url}
                alt={ad.brand_name}
                className="h-9 w-9 rounded-full border border-[#E6E9F0] bg-white object-contain p-0.5"
              />
            ) : (
              <span
                className="flex h-9 w-9 items-center justify-center rounded-full font-display text-[11px] font-bold text-white"
                style={{ backgroundColor: ad.brand_avatar_color || "#0027eb" }}
              >
                {ad.brand_avatar_initials}
              </span>
            )}
            {rank && rank <= 10 && (
              <span
                className={`absolute -left-1.5 -top-1.5 flex h-4.5 min-w-4.5 items-center justify-center rounded-md px-1 font-mono-num text-[9.5px] font-bold ${rankStyle}`}
              >
                {rank}
              </span>
            )}
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <MetaInfinityIcon className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate font-display text-[13.5px] font-semibold leading-tight text-[#0F172A] transition-colors group-hover:text-[#0027eb]">
                {ad.brand_name}
              </span>
              <span className="text-[11px]" title={ad.market}>
                {marketFlag}
              </span>
            </div>
            <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-[#64748B]">
              {ad.brand_live_ads ? (
                <span className="font-mono-num font-medium text-[#475569]">
                  {ad.brand_live_ads.toLocaleString("en-US")} Live Ads
                </span>
              ) : null}
              {ad.display_format && (
                <>
                  <span className="text-[#CBD5E1]">·</span>
                  <span className="rounded bg-[#F1F5F9] px-1.5 py-px font-mono-num text-[9.5px] font-semibold text-[#475569]">
                    {ad.display_format}
                  </span>
                </>
              )}
            </div>
          </div>
        </button>

        {/* Save to Folder Bookmark Button */}
        <div className="relative shrink-0" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            onClick={() => setFolderMenuOpen((v) => !v)}
            title="Gem i folder"
            className="flex h-8 w-8 items-center justify-center rounded-xl border transition-all"
            style={
              inFolders
                ? {
                    backgroundColor: "#EEF2FF",
                    borderColor: "rgba(0,39,235,0.28)",
                    color: "#0027eb",
                  }
                : {
                    backgroundColor: "#FFFFFF",
                    borderColor: "#E6E9F0",
                    color: "#64748B",
                  }
            }
          >
            <Bookmark
              className="h-3.5 w-3.5"
              fill={inFolders ? "currentColor" : "none"}
            />
          </button>

          {folderMenuOpen && (
            <div className="absolute right-0 top-9 z-40 w-52 rounded-2xl border border-[#E2E6EF] bg-white p-1.5 shadow-[0_14px_34px_rgba(15,23,42,0.14)]">
              <p className="px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-[#64748B]">
                Gem i folder
              </p>
              {boards.map((board) => {
                const selected = ad.board_ids.includes(board.id);
                return (
                  <button
                    key={board.id}
                    type="button"
                    onClick={() => onToggleBoard(ad.id, board.id)}
                    className="flex w-full items-center justify-between rounded-xl px-2.5 py-1.5 text-left text-xs font-medium text-[#0F172A] transition-colors hover:bg-[#F3F5F9]"
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      <span
                        className="h-2 w-2 shrink-0 rounded-full"
                        style={{ backgroundColor: board.accent_color }}
                      />
                      <span className="truncate">{board.name}</span>
                    </span>
                    {selected && (
                      <Check className="h-3.5 w-3.5 shrink-0 text-[#0027eb]" />
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* 2. ACTIVE STATUS + LAUNCH DATE + DUPLICATED COUNT BAR */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-3.5 pb-2 text-[11px]">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#ECFDF3] px-2 py-0.5 font-mono-num font-semibold text-[#15803D]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#16A34A]" />
            {activeDays}d
          </span>
          <span className="text-[#64748B]">
            {formatShortDate(ad.started_running_at)} – Today
          </span>
        </div>

        {ad.duplicated_count && ad.duplicated_count > 1 && (
          <span className="inline-flex items-center gap-1 rounded-full border border-[#E6E9F0] bg-[#F8FAFC] px-2 py-0.5 font-mono-num text-[10.5px] font-semibold text-[#334155]">
            <Layers className="h-3 w-3 text-[#0027eb]" />
            {ad.duplicated_count} Duplicated
          </span>
        )}
      </div>

      {/* 3. AD COPY PREVIEW WITH CLEAN "See more" PILL */}
      {!compact && ad.primary_text && (
        <button
          type="button"
          onClick={() => onOpen(ad)}
          className="relative mb-2.5 block w-full px-3.5 text-left"
        >
          <p className="line-clamp-3 text-[12.5px] leading-[1.48] text-[#334155]">
            {ad.primary_text}
          </p>
          {hasLongCopy && (
            <div className="pointer-events-none absolute inset-x-3.5 bottom-0 flex justify-end bg-gradient-to-t from-white via-white/95 to-transparent pt-3">
              <span className="rounded-full border border-[#E6E9F0] bg-white px-2 py-0.5 text-[10.5px] font-semibold text-[#0027eb] shadow-xs">
                See more
              </span>
            </div>
          )}
        </button>
      )}

      {/* 4. CREATIVE MEDIA VIEWPORT */}
      <div className="px-2.5">
        <div
          role="button"
          tabIndex={0}
          onClick={() => onOpen(ad)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onOpen(ad);
            }
          }}
          className={`relative w-full cursor-pointer overflow-hidden rounded-[13px] border border-[#EDF0F5] bg-[#F3F5F9] ${aspectClass}`}
        >
          {isVideoFile && isHovered && !imgFailed ? (
            <video
              src={ad.media_url}
              poster={primaryImg}
              autoPlay
              muted
              loop
              playsInline
              onError={() => setImgFailed(true)}
              className="h-full w-full object-cover"
            />
          ) : primaryImg ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={primaryImg}
              alt={`${ad.brand_name} — ${ad.headline}`}
              loading="lazy"
              onError={() => {
                if (!imgFailed) setImgFailed(true);
              }}
              className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03]"
            />
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-gradient-to-br from-[#F3F5F9] to-[#E8EEFF] p-5 text-center">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#0027eb] font-display text-xs font-bold text-white shadow-md">
                {ad.brand_avatar_initials}
              </span>
              <p className="font-display text-xs font-semibold text-[#0F172A]">
                {ad.brand_name}
              </p>
              <p className="line-clamp-2 max-w-[190px] text-[11px] text-[#64748B]">
                {ad.headline}
              </p>
            </div>
          )}

          {/* Frosted Glass Play Button for Videos */}
          {ad.media_type === "video" && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <span className="flex h-11 w-11 items-center justify-center rounded-full border border-white/50 bg-[#05060B]/45 text-white shadow-lg backdrop-blur-md transition-all duration-200 group-hover:scale-110 group-hover:border-[#4D6BFF] group-hover:bg-[#0027eb]/90">
                <Play className="ml-0.5 h-4 w-4 fill-current" />
              </span>
            </div>
          )}

          {/* Top-right subtle format & hook badge on hover */}
          <div className="pointer-events-none absolute inset-x-2 bottom-2 flex items-center justify-between gap-1.5 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
            {ad.hook_category ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-[#05060B]/75 px-2.5 py-0.5 text-[10px] font-semibold text-white backdrop-blur-md">
                <Sparkles className="h-2.5 w-2.5 text-[#7BA2FF]" />
                {ad.hook_category}
              </span>
            ) : (
              <span />
            )}

            {ad.eu_reach ? (
              <span className="rounded-full bg-[#05060B]/75 px-2 py-0.5 font-mono-num text-[10px] font-medium text-white backdrop-blur-md">
                {formatReach(ad.eu_reach)} reach
              </span>
            ) : null}
          </div>
        </div>
      </div>

      {/* 5. TRENDTRACK LANDING PAGE + HEADLINE + CTA FOOTER */}
      <div className="mt-2.5 flex items-center justify-between gap-2.5 border-t border-[#EFF2F6] bg-[#FAFBFD] px-3.5 py-2.5">
        <div className="min-w-0 flex-1">
          {ad.landing_page_url && (
            <p className="truncate font-mono-num text-[10.5px] font-medium text-[#64748B]">
              {getDomainDisplay(ad.landing_page_url, ad.landing_page_path)}
            </p>
          )}
          <p className="mt-0.5 truncate font-display text-[12.5px] font-semibold text-[#0F172A]">
            {ad.headline}
          </p>
          {ad.link_description && ad.link_description !== ad.headline && (
            <p className="truncate text-[11px] text-[#64748B]">
              {ad.link_description}
            </p>
          )}
        </div>

        {ad.landing_page_url ? (
          <a
            href={ad.landing_page_url}
            target="_blank"
            rel="noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-[#DCE1EC] bg-white px-2.5 py-1.5 text-[11px] font-semibold text-[#0F172A] shadow-xs transition-all hover:border-[#0027eb] hover:bg-[#EEF2FF] hover:text-[#0027eb]"
          >
            {ad.cta_text || "Shop now"}
            <ArrowUpRight className="h-3 w-3" />
          </a>
        ) : (
          <button
            type="button"
            onClick={() => onOpen(ad)}
            className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-[#DCE1EC] bg-white px-2.5 py-1.5 text-[11px] font-semibold text-[#0F172A] hover:border-[#0027eb] hover:text-[#0027eb]"
          >
            <Copy className="h-3 w-3" />
            Inspect
          </button>
        )}
      </div>
    </article>
  );
}
