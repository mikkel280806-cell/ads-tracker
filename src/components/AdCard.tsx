"use client";

import React, { useState } from "react";
import {
  Bookmark,
  ChevronDown,
  Play,
  PlusSquare,
  Sparkles,
} from "lucide-react";
import type { Ad, Board } from "@/lib/types";
import { formatDuration, formatReach, getActiveDays } from "@/lib/url-parser";

interface AdCardProps {
  ad: Ad;
  boards: Board[];
  compact?: boolean;
  onOpen: (ad: Ad) => void;
  onToggleFavorite: (adId: string) => void;
  onToggleBoard: (adId: string, boardId: string) => void;
  onOpenBrand?: (brandId: string) => void;
}

export function AdCard({
  ad,
  boards,
  compact = false,
  onOpen,
  onToggleFavorite,
  onToggleBoard,
  onOpenBrand,
}: AdCardProps) {
  const [boardMenuOpen, setBoardMenuOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const activeDays = getActiveDays(ad.started_running_at);
  const isSaved = ad.is_favorite || ad.board_ids.length > 0;
  const hasLongCopy = (ad.primary_text?.length || 0) > 105;
  const isVideoFile =
    ad.media_type === "video" && /\.(mp4|webm|mov)(\?|$)/i.test(ad.media_url);

  const aspectClass =
    ad.aspect_ratio === "1:1"
      ? "aspect-square"
      : ad.aspect_ratio === "9:16"
        ? "aspect-[9/15]"
        : "aspect-[3/4]";

  return (
    <article
      className="group relative mb-4 break-inside-avoid rounded-[18px] border border-[#ECEEF2] bg-white transition-all duration-200 hover:border-[#D7DCE5]"
      style={{ boxShadow: isHovered ? "var(--shadow-card-hover)" : "var(--shadow-card)" }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false);
        setBoardMenuOpen(false);
      }}
    >
      {/* 1. CLEAN BRAND HEADER + ACTIVE DAYS PILL (Konvert Explore Signature) */}
      <div className="flex items-center justify-between gap-2 px-3.5 pb-2 pt-3">
        <button
          type="button"
          onClick={() => (onOpenBrand ? onOpenBrand(ad.brand_id) : onOpen(ad))}
          className="flex min-w-0 items-center gap-2 text-left"
        >
          {ad.brand_logo_url ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={ad.brand_logo_url}
              alt={ad.brand_name}
              className="h-7 w-7 shrink-0 rounded-full border border-[#EAECF0] bg-white object-cover"
            />
          ) : (
            <span
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white"
              style={{ backgroundColor: ad.brand_avatar_color || "#0027eb" }}
            >
              {ad.brand_avatar_initials}
            </span>
          )}
          <span className="truncate text-[13px] font-semibold tracking-[-0.015em] text-[#101828] transition-colors group-hover:text-[#0027eb]">
            {ad.brand_name}
          </span>
        </button>

        {/* Crisp pill badge: ● 2 D */}
        <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-[#EAECF0] bg-white px-2.5 py-0.5 font-mono-num text-[11px] font-medium text-[#344054]">
          <span
            className="h-1.5 w-1.5 rounded-full"
            style={{ backgroundColor: ad.is_active ? "#16A34A" : "#98A2B3" }}
          />
          {activeDays} D
        </span>
      </div>

      {/* 2. AIRY AD COPY WITH FLOATING "See more" PILL */}
      {!compact && ad.primary_text && (
        <button
          type="button"
          onClick={() => onOpen(ad)}
          className="relative mb-2.5 block w-full px-3.5 text-left"
        >
          <p className="line-clamp-3 text-[12.5px] leading-[1.48] text-[#475467]">
            {ad.primary_text}
          </p>
          {hasLongCopy && (
            <div className="pointer-events-none absolute inset-x-3.5 bottom-0 flex justify-center bg-gradient-to-t from-white via-white/90 to-transparent pt-3">
              <span className="rounded-full border border-[#EAECF0] bg-white px-2.5 py-0.5 text-[11px] font-medium text-[#344054] shadow-[0_1px_2px_rgba(16,24,40,0.05)]">
                See more
              </span>
            </div>
          )}
        </button>
      )}

      {/* 3. INSET ROUNDED CREATIVE MEDIA + FROSTED PLAY CIRCLE */}
      <div className="px-2">
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
          className={`relative w-full cursor-pointer overflow-hidden rounded-[13px] bg-[#F4F5F7] ${aspectClass}`}
        >
          {isVideoFile && isHovered ? (
            <video
              src={ad.media_url}
              poster={ad.thumbnail_url}
              autoPlay
              muted
              loop
              playsInline
              className="h-full w-full object-cover"
            />
          ) : ad.thumbnail_url || ad.media_url ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={ad.thumbnail_url || ad.media_url}
              alt={`${ad.brand_name} — ${ad.headline}`}
              loading="lazy"
              className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.025]"
            />
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center gap-2 p-6 text-center">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#EEF2FF] text-xs font-bold text-[#0027eb]">
                {ad.brand_avatar_initials}
              </span>
              <p className="text-xs font-semibold text-[#101828]">{ad.brand_name}</p>
              <p className="max-w-[180px] text-[11px] text-[#667085]">
                Klik for at åbne linket eller uploade medie
              </p>
            </div>
          )}

          {/* Frosted Glass Translucent Play Button (Exact Konvert aesthetic) */}
          {ad.media_type === "video" && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <span className="flex h-11 w-11 items-center justify-center rounded-full border border-white/40 bg-black/25 text-white backdrop-blur-md transition-transform duration-200 group-hover:scale-110 group-hover:bg-[#0027eb]/80">
                <Play className="ml-0.5 h-4 w-4 fill-current" />
              </span>
            </div>
          )}

          {/* Clean Hover-Only Telemetry Chips (Keeps default view 100% clutter-free!) */}
          <div className="pointer-events-none absolute inset-x-2 bottom-2 flex items-center justify-between gap-1.5 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
            <div className="flex items-center gap-1">
              {ad.eu_reach ? (
                <span className="rounded-full bg-black/65 px-2 py-0.5 font-mono-num text-[10px] font-medium text-white backdrop-blur-md">
                  {formatReach(ad.eu_reach)} EU
                </span>
              ) : null}
              {ad.duplicated_count && ad.duplicated_count > 1 ? (
                <span className="rounded-full bg-black/65 px-2 py-0.5 font-mono-num text-[10px] font-medium text-white backdrop-blur-md">
                  ×{ad.duplicated_count}
                </span>
              ) : null}
              {ad.ai_angle ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-[#0027eb]/85 px-2 py-0.5 text-[10px] font-medium text-white backdrop-blur-md">
                  <Sparkles className="h-2.5 w-2.5" />
                  {ad.ai_angle}
                </span>
              ) : null}
            </div>

            {ad.duration_seconds ? (
              <span className="rounded-full bg-black/65 px-2 py-0.5 font-mono-num text-[10px] font-medium text-white backdrop-blur-md">
                {formatDuration(ad.duration_seconds)}
              </span>
            ) : null}
          </div>
        </div>
      </div>

      {/* 4. ULTRA-CLEAN "Save to collection" FOOTER (Konvert Explore Signature) */}
      <div className="relative px-2 py-2" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between rounded-xl px-1.5 py-1 transition-colors hover:bg-[#F7F8FA]">
          <button
            type="button"
            onClick={() => onToggleFavorite(ad.id)}
            className="flex min-w-0 flex-1 items-center gap-2 text-left text-[12.5px] font-medium transition-colors"
            style={{ color: isSaved ? "#0027eb" : "#344054" }}
          >
            {isSaved ? (
              <Bookmark className="h-4 w-4 shrink-0 fill-current text-[#0027eb]" />
            ) : (
              <PlusSquare className="h-4 w-4 shrink-0 text-[#667085]" />
            )}
            <span className="truncate">
              {ad.board_ids.length > 0
                ? `Saved in ${ad.board_ids.length} collection${ad.board_ids.length > 1 ? "s" : ""}`
                : ad.is_favorite
                  ? "Saved"
                  : "Save to collection"}
            </span>
          </button>

          <button
            type="button"
            aria-label="Vælg collection"
            onClick={() => setBoardMenuOpen((v) => !v)}
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-[#667085] transition-colors hover:bg-[#ECEEF2] hover:text-[#101828]"
          >
            <ChevronDown className="h-3.5 w-3.5" />
          </button>
        </div>

        {boardMenuOpen && (
          <div className="absolute bottom-11 right-2 z-30 w-56 rounded-xl border border-[#E6E8EC] bg-white p-1.5 shadow-xl">
            <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-[#667085]">
              Gem i collection
            </p>
            {boards.map((board) => {
              const selected = ad.board_ids.includes(board.id);
              return (
                <button
                  key={board.id}
                  type="button"
                  onClick={() => onToggleBoard(ad.id, board.id)}
                  className="flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-left text-xs font-medium text-[#101828] transition-colors hover:bg-[#F4F5F7]"
                >
                  <span className="flex items-center gap-2 truncate">
                    <span
                      className="h-2 w-2 shrink-0 rounded-full"
                      style={{ backgroundColor: board.accent_color }}
                    />
                    <span className="truncate">{board.name}</span>
                  </span>
                  {selected && (
                    <span className="text-[11px] font-bold text-[#0027eb]">✓</span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </article>
  );
}
