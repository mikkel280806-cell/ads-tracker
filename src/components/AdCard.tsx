"use client";

import React, { useState } from "react";
import {
  ArrowUpRight,
  Bookmark,
  Check,
  Clock,
  Film,
  Image as ImageIcon,
  Layers,
  Play,
  Sparkles,
} from "lucide-react";
import type { Ad, Board } from "@/lib/types";
import { getActiveDays } from "@/lib/url-parser";

interface AdCardProps {
  ad: Ad;
  boards: Board[];
  rank?: number;
  compact?: boolean;
  onOpen: (ad: Ad) => void;
  onToggleBoard: (adId: string, boardId: string) => void;
  onOpenBrand?: (brandId: string) => void;
}

function getDomainDisplay(url?: string, path?: string): string {
  if (!url) return "";
  try {
    const host = new URL(url).hostname.replace(/^www\./, "");
    if (path && path !== "/") {
      const shortPath = path.length > 22 ? `${path.slice(0, 22)}…` : path;
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
  const hasAi = Boolean(ad.ai_hook_verbal || ad.ai_script_breakdown);

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

  return (
    <article
      className="adtrack-card-interactive group relative flex flex-col overflow-hidden rounded-[18px]"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false);
        setFolderMenuOpen(false);
      }}
    >
      {/* 1. CLEAN BRAND HEADER (KISS: Avatar, Name, Market, Bookmark) */}
      <div className="flex items-center justify-between gap-2 px-3.5 pb-2 pt-3">
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
                className="h-8 w-8 rounded-full border border-[#ECEFF5] bg-white object-contain p-0.5"
              />
            ) : (
              <span
                className="flex h-8 w-8 items-center justify-center rounded-full font-display text-[11px] font-bold text-white"
                style={{ backgroundColor: ad.brand_avatar_color || "#0027eb" }}
              >
                {ad.brand_avatar_initials}
              </span>
            )}
            {rank && rank <= 3 && (
              <span className="absolute -left-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#0F172A] px-1 font-mono-num text-[9px] font-bold text-white ring-2 ring-white">
                {rank}
              </span>
            )}
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="truncate font-display text-[13.5px] font-semibold leading-tight text-[#0F172A] transition-colors group-hover:text-[#0027eb]">
                {ad.brand_name}
              </span>
              <span className="shrink-0 rounded bg-[#F1F5F9] px-1.5 py-px font-mono-num text-[9.5px] font-semibold text-[#64748B]">
                {ad.market}
              </span>
            </div>
            <div className="mt-0.5 flex items-center gap-2 font-mono-num text-[11px] text-[#64748B]">
              <span className="inline-flex items-center gap-1 font-medium text-[#15803D]">
                <Clock className="h-3 w-3" />
                {activeDays}d
              </span>
              {ad.duplicated_count && ad.duplicated_count > 1 && (
                <span className="inline-flex items-center gap-0.5 font-medium text-[#334155]">
                  <Layers className="h-3 w-3 text-[#0027eb]" />
                  ×{ad.duplicated_count}
                </span>
              )}
              <span className="inline-flex items-center gap-0.5">
                {ad.media_type === "video" ? (
                  <Film className="h-3 w-3" />
                ) : (
                  <ImageIcon className="h-3 w-3" />
                )}
              </span>
            </div>
          </div>
        </button>

        {/* Save to Folder Bookmark */}
        <div className="relative shrink-0" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            onClick={() => setFolderMenuOpen((v) => !v)}
            title="Gem i folder"
            className={`flex h-8 w-8 items-center justify-center rounded-full transition-colors ${
              inFolders
                ? "bg-[#EEF2FF] text-[#0027eb]"
                : "text-[#94A3B8] hover:bg-[#F3F5F9] hover:text-[#0F172A]"
            }`}
          >
            <Bookmark
              className="h-4 w-4"
              fill={inFolders ? "currentColor" : "none"}
            />
          </button>

          {folderMenuOpen && (
            <div className="absolute right-0 top-9 z-40 w-48 rounded-2xl border border-[#E6E9F0] bg-white p-1.5 shadow-[0_14px_34px_rgba(15,23,42,0.12)]">
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

      {/* 2. SCANNABLE 2-LINE COPY PREVIEW */}
      {!compact && ad.primary_text && (
        <button
          type="button"
          onClick={() => onOpen(ad)}
          className="mb-2.5 block w-full px-3.5 text-left"
        >
          <p className="line-clamp-2 text-[12.5px] leading-[1.48] text-[#475569]">
            {ad.primary_text}
          </p>
        </button>
      )}

      {/* 3. CREATIVE MEDIA VIEWPORT */}
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
          className={`relative w-full cursor-pointer overflow-hidden rounded-[13px] bg-[#F3F5F9] ${aspectClass}`}
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
            <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-[#F5F7FA] p-5 text-center">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0027eb] font-display text-xs font-bold text-white">
                {ad.brand_avatar_initials}
              </span>
              <p className="line-clamp-2 max-w-[180px] text-xs font-medium text-[#475569]">
                {ad.headline}
              </p>
            </div>
          )}

          {/* Frosted Glass Play Button */}
          {ad.media_type === "video" && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <span className="flex h-10 w-10 items-center justify-center rounded-full border border-white/40 bg-[#05060B]/45 text-white shadow-md backdrop-blur-md transition-transform duration-200 group-hover:scale-110 group-hover:bg-[#0027eb]/90">
                <Play className="ml-0.5 h-4 w-4 fill-current" />
              </span>
            </div>
          )}

          {hasAi && (
            <span className="pointer-events-none absolute right-2 top-2 inline-flex items-center gap-1 rounded-full bg-[#05060B]/70 px-2 py-0.5 text-[10px] font-semibold text-white backdrop-blur-md">
              <Sparkles className="h-2.5 w-2.5 text-[#7BA2FF]" />
              Gemini
            </span>
          )}
        </div>
      </div>

      {/* 4. MINIMAL FOOTER */}
      <div className="mt-2.5 flex items-center justify-between gap-2 px-3.5 pb-3 pt-0.5">
        <button
          type="button"
          onClick={() => onOpen(ad)}
          className="min-w-0 flex-1 text-left"
        >
          <p className="truncate font-display text-[12.5px] font-semibold text-[#0F172A]">
            {ad.headline}
          </p>
          {ad.landing_page_url && (
            <p className="mt-0.5 truncate font-mono-num text-[10.5px] text-[#94A3B8]">
              {getDomainDisplay(ad.landing_page_url, ad.landing_page_path)}
            </p>
          )}
        </button>

        {ad.landing_page_url && (
          <a
            href={ad.landing_page_url}
            target="_blank"
            rel="noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-[#E6E9F0] bg-[#FAFBFD] px-2.5 py-1.5 text-[11px] font-semibold text-[#334155] transition-colors hover:border-[#0027eb] hover:bg-[#EEF2FF] hover:text-[#0027eb]"
          >
            {ad.cta_text || "Shop"}
            <ArrowUpRight className="h-3 w-3" />
          </a>
        )}
      </div>
    </article>
  );
}
