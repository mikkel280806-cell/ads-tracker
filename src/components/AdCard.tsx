"use client";

import React, { useState } from "react";
import {
  Bookmark,
  BookmarkPlus,
  Check,
  ChevronDown,
  Play,
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
  const [copyExpanded, setCopyExpanded] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [imgFailed, setImgFailed] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [naturalRatio, setNaturalRatio] = useState<number | null>(null);

  const activeDays = getActiveDays(ad.started_running_at);
  const inFolders = ad.board_ids.length > 0;
  const savedBoardName = inFolders
    ? boards.find((b) => ad.board_ids.includes(b.id))?.name
    : undefined;

  const rankBadgeStyle =
    rank === 1
      ? "bg-gradient-to-b from-[#FDE047] via-[#EAB308] to-[#CA8A04] text-[#422006] shadow-[inset_0_1px_0_rgba(255,255,255,0.7),0_1px_2px_rgba(15,23,42,0.18)]"
      : rank === 2
        ? "bg-gradient-to-b from-[#F8FAFC] via-[#CBD5E1] to-[#94A3B8] text-[#0F172A] shadow-[inset_0_1px_0_rgba(255,255,255,0.85),0_1px_2px_rgba(15,23,42,0.18)]"
        : "bg-gradient-to-b from-[#FDBA74] via-[#D97706] to-[#9A3412] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.45),0_1px_2px_rgba(15,23,42,0.18)]";

  const isVideoFile =
    ad.media_type === "video" && /\.(mp4|webm|mov)(\?|$)/i.test(ad.media_url);

  const primaryImg = imgFailed
    ? ad.fallback_image_url || ""
    : ad.thumbnail_url || ad.fallback_image_url || ad.media_url || "";

  // Clamp extreme outlier banners only; 9:16 (0.56), 4:5 (0.8), 1:1 (1.0), 16:9 (1.78) all show 100% uncropped
  const clampedRatio = naturalRatio
    ? Math.min(1.85, Math.max(0.54, naturalRatio))
    : null;

  const fallbackRatio =
    ad.aspect_ratio === "1:1"
      ? 1
      : ad.media_type === "video"
        ? 0.72
        : 0.85;

  const copyText = (ad.primary_text || "").trim();
  const hasLongCopy = copyText.length > 105;

  return (
    <article
      className="group relative flex flex-col rounded-[14px] border border-[#EAECEF] bg-white shadow-[0_1px_2px_rgba(15,23,42,0.03)] transition-all duration-200 hover:border-[#D8DEE9] hover:shadow-[0_10px_28px_-8px_rgba(15,23,42,0.09)]"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false);
        setFolderMenuOpen(false);
      }}
    >
      {/* 1. CLEAN KONVERT CARD HEADER: Avatar + Brand Name + [● 2 D] */}
      <div className="flex items-center justify-between gap-2 px-3 pb-2 pt-3">
        <button
          type="button"
          onClick={() => (onOpenBrand ? onOpenBrand(ad.brand_id) : onOpen(ad))}
          className="flex min-w-0 items-center gap-2 text-left"
        >
          <div className="relative shrink-0">
            {ad.brand_logo_url ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={ad.brand_logo_url}
                alt={ad.brand_name}
                className="h-7 w-7 rounded-full border border-[#ECEFF5] bg-white object-contain p-0.5"
              />
            ) : (
              <span
                className="flex h-7 w-7 items-center justify-center rounded-full font-display text-[10.5px] font-bold text-white"
                style={{ backgroundColor: ad.brand_avatar_color || "#0F172A" }}
              >
                {ad.brand_avatar_initials}
              </span>
            )}
            {rank && rank <= 3 && (
              <span
                className={`absolute -left-1.5 -top-1.5 inline-flex h-[18px] w-[18px] items-center justify-center rounded-full text-center font-sans text-[10px] font-bold leading-none tabular-nums ring-2 ring-white ${rankBadgeStyle}`}
              >
                {rank}
              </span>
            )}
          </div>

          <span className="truncate font-display text-[13px] font-semibold leading-tight text-[#0F172A]">
            {ad.brand_name}
          </span>
        </button>

        {/* Crisp Green-Dot Days Running Pill */}
        <span className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-[#EAECEF] bg-white px-2 py-0.5 font-mono-num text-[11px] font-medium text-[#334155]">
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              ad.is_active ? "bg-[#22C55E]" : "bg-[#94A3B8]"
            }`}
          />
          {activeDays} D
        </span>
      </div>

      {/* 2. AD COPY PREVIEW WITH GRADIENT FADE + FLOATING "See more" PILL */}
      {!compact && copyText && (
        <div className="relative px-3 pb-2.5">
          <p
            onClick={() => onOpen(ad)}
            className={`cursor-pointer whitespace-pre-line text-[12.5px] leading-[1.45] text-[#334155] ${
              copyExpanded ? "" : "line-clamp-3"
            }`}
          >
            {copyText}
          </p>

          {hasLongCopy && !copyExpanded && (
            <div className="pointer-events-none absolute inset-x-3 bottom-1.5 flex items-end justify-center bg-gradient-to-t from-white via-white/90 to-transparent pt-5">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setCopyExpanded(true);
                }}
                className="pointer-events-auto rounded-full border border-[#E6E9F0] bg-white px-2.5 py-0.5 text-[11px] font-medium text-[#0F172A] shadow-[0_1px_3px_rgba(15,23,42,0.06)] transition-colors hover:bg-[#F8FAFC]"
              >
                See more
              </button>
            </div>
          )}

          {hasLongCopy && copyExpanded && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setCopyExpanded(false);
              }}
              className="mt-1 text-[11px] font-medium text-[#64748B] hover:text-[#0F172A]"
            >
              See less
            </button>
          )}
        </div>
      )}

      {/* 3. TRUE-ASPECT CREATIVE MEDIA VIEWPORT (never crops 1:1, 4:5, or 9:16) */}
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
          style={{
            aspectRatio: primaryImg
              ? String(clampedRatio ?? fallbackRatio)
              : "1 / 1",
          }}
          className="relative w-full cursor-pointer overflow-hidden rounded-[10px] bg-[#F3F5F9]"
        >
          {isVideoFile && isHovered && !imgFailed ? (
            <video
              src={ad.media_url}
              poster={primaryImg}
              autoPlay
              muted
              loop
              playsInline
              onLoadedMetadata={(e) => {
                const v = e.currentTarget;
                if (v.videoWidth > 0 && v.videoHeight > 0) {
                  setNaturalRatio(v.videoWidth / v.videoHeight);
                }
              }}
              onError={() => setImgFailed(true)}
              className="h-full w-full object-contain bg-black"
            />
          ) : primaryImg ? (
            <>
              {!imgLoaded && (
                <div className="skeleton-shimmer absolute inset-0" aria-hidden="true" />
              )}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={primaryImg}
                alt={`${ad.brand_name} — ${ad.headline}`}
                loading="lazy"
                onLoad={(e) => {
                  const img = e.currentTarget;
                  if (img.naturalWidth > 0 && img.naturalHeight > 0) {
                    setNaturalRatio(img.naturalWidth / img.naturalHeight);
                  }
                  setImgLoaded(true);
                }}
                onError={() => {
                  setImgLoaded(true);
                  if (!imgFailed) setImgFailed(true);
                }}
                className={`h-full w-full object-contain transition-all duration-300 ease-out group-hover:scale-[1.02] ${
                  imgLoaded ? "opacity-100" : "opacity-0"
                }`}
              />
            </>
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-[#F5F7FA] p-5 text-center">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0F172A] font-display text-xs font-bold text-white">
                {ad.brand_avatar_initials}
              </span>
              <p className="line-clamp-2 max-w-[180px] text-xs font-medium text-[#475569]">
                {ad.headline}
              </p>
            </div>
          )}

          {/* Frosted Translucent Circular Play Button */}
          {ad.media_type === "video" && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <span className="flex h-11 w-11 items-center justify-center rounded-full border border-white/35 bg-black/35 text-white shadow-md backdrop-blur-md transition-transform duration-200 group-hover:scale-110 group-hover:bg-black/55">
                <Play className="ml-0.5 h-4 w-4 fill-current" />
              </span>
            </div>
          )}
        </div>
      </div>

      {/* 4. FULL-WIDTH "Save to collection" FOOTER BAR */}
      <div
        className="relative mt-2 border-t border-[#F1F3F7]"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={() => setFolderMenuOpen((v) => !v)}
          className="flex w-full items-center justify-between gap-2 rounded-b-[14px] px-3 py-2.5 text-[12px] font-medium text-[#334155] transition-colors hover:bg-[#FAFBFD] hover:text-[#0F172A]"
        >
          <span className="flex min-w-0 items-center gap-2">
            {inFolders ? (
              <Bookmark className="h-3.5 w-3.5 shrink-0 fill-[#0F172A] text-[#0F172A]" />
            ) : (
              <BookmarkPlus className="h-3.5 w-3.5 shrink-0 text-[#64748B]" />
            )}
            <span className="truncate">
              {inFolders
                ? ad.board_ids.length > 1
                  ? `Saved in ${ad.board_ids.length} collections`
                  : savedBoardName || "Saved to collection"
                : "Save to collection"}
            </span>
          </span>
          <ChevronDown
            className={`h-3.5 w-3.5 shrink-0 text-[#94A3B8] transition-transform ${
              folderMenuOpen ? "rotate-180" : ""
            }`}
          />
        </button>

        {folderMenuOpen && (
          <div className="absolute bottom-full left-2 right-2 z-40 mb-1.5 rounded-xl border border-[#E6E9F0] bg-white p-1.5 shadow-[0_14px_34px_rgba(15,23,42,0.14)]">
            <p className="px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-[#64748B]">
              Gem i folder
            </p>
            {boards.length === 0 ? (
              <p className="px-2.5 py-2 text-xs text-[#94A3B8]">
                Opret en folder i sidebaren først.
              </p>
            ) : (
              boards.map((board) => {
                const selected = ad.board_ids.includes(board.id);
                return (
                  <button
                    key={board.id}
                    type="button"
                    onClick={() => onToggleBoard(ad.id, board.id)}
                    className="flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-left text-xs font-medium text-[#0F172A] transition-colors hover:bg-[#F3F5F9]"
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      <span
                        className="h-2 w-2 shrink-0 rounded-full"
                        style={{ backgroundColor: board.accent_color }}
                      />
                      <span className="truncate">{board.name}</span>
                    </span>
                    {selected && (
                      <Check className="h-3.5 w-3.5 shrink-0 text-[#0F172A]" />
                    )}
                  </button>
                );
              })
            )}
          </div>
        )}
      </div>
    </article>
  );
}
