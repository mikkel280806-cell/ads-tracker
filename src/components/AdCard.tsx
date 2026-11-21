"use client";

import React, { useState } from "react";
import {
  Bookmark,
  Calendar,
  ChevronDown,
  Copy as CopyIcon,
  DollarSign,
  Eye,
  Heart,
  MoreHorizontal,
  Play,
  Sparkles,
} from "lucide-react";
import type { Ad, Board } from "@/lib/types";
import { formatDuration, formatReach, getActiveDays } from "@/lib/url-parser";

interface AdCardProps {
  ad: Ad;
  boards: Board[];
  rank?: number;
  compact?: boolean;
  onOpen: (ad: Ad) => void;
  onToggleFavorite: (adId: string) => void;
  onToggleBoard: (adId: string, boardId: string) => void;
  onOpenBrand?: (brandId: string) => void;
}

function getDomain(url?: string): string {
  if (!url) return "";
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

function formatDateShort(iso?: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatMoney(amount?: number): string {
  if (!amount) return "—";
  if (amount >= 1000) return `$${(amount / 1000).toFixed(1)}K`;
  return `$${amount}`;
}

export function AdCard({
  ad,
  boards,
  rank,
  compact = false,
  onOpen,
  onToggleFavorite,
  onToggleBoard,
  onOpenBrand,
}: AdCardProps) {
  const [boardMenuOpen, setBoardMenuOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const activeDays = getActiveDays(ad.started_running_at);
  const domain = getDomain(ad.landing_page_url);
  const isSaved = ad.is_favorite || ad.board_ids.length > 0;
  const isVideoFile =
    ad.media_type === "video" && /\.(mp4|webm|mov)(\?|$)/i.test(ad.media_url);

  const aspectClass =
    ad.aspect_ratio === "1:1"
      ? "aspect-square"
      : ad.aspect_ratio === "9:16"
        ? "aspect-[9/14]"
        : "aspect-[3/4]";

  return (
    <article
      className="group relative mb-4 break-inside-avoid rounded-2xl border border-[#E6E8EC] bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)] transition-all duration-150 hover:border-[#0027eb]/35 hover:shadow-[0_6px_20px_rgba(0,39,235,0.07)]"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false);
        setBoardMenuOpen(false);
      }}
    >
      {rank !== undefined && (
        <div className="border-b border-[#F1F3F6] py-1 text-center font-mono-num text-[11px] font-semibold text-[#667085]">
          #{rank}
        </div>
      )}

      {/* 1. TRENDTRACK TOP EU + SPEND + DAILY TELEMETRY BAR */}
      <div className="flex items-center justify-between gap-1.5 border-b border-[#F1F3F6] px-3 py-2">
        <span className="inline-flex h-5 items-center rounded-full bg-[#EEF2FF] px-2 text-[10px] font-semibold text-[#0027eb]">
          {ad.source_type === "instagram" ? "IG" : "EU"}
        </span>

        <div className="flex items-center gap-1 overflow-hidden">
          <span className="inline-flex items-center gap-1 rounded-md border border-[#EAECEF] bg-[#FAFBFD] px-1.5 py-0.5 font-mono-num text-[10px] font-semibold text-[#1D2432]">
            <Eye className="h-2.5 w-2.5 text-[#667085]" />
            {formatReach(ad.eu_reach)}
          </span>
          {!compact && ad.estimated_spend ? (
            <span className="inline-flex items-center gap-0.5 rounded-md border border-[#EAECEF] bg-[#FAFBFD] px-1.5 py-0.5 font-mono-num text-[10px] font-semibold text-[#1D2432]">
              <DollarSign className="h-2.5 w-2.5 text-[#667085]" />
              {formatMoney(ad.estimated_spend).replace("$", "")}
            </span>
          ) : null}
          {!compact && ad.daily_spend ? (
            <span className="inline-flex items-center gap-0.5 rounded-md border border-[#EAECEF] bg-[#FAFBFD] px-1.5 py-0.5 font-mono-num text-[10px] font-semibold text-[#1D2432]">
              <Calendar className="h-2.5 w-2.5 text-[#667085]" />
              ${ad.daily_spend}
            </span>
          ) : null}
        </div>
      </div>

      {/* 2. BRAND HEADER + LIVE ADS + DAYS + DUPLICATED */}
      <div className="px-3 pb-2 pt-2.5">
        <div className="flex items-start justify-between gap-2">
          <button
            type="button"
            onClick={() => (onOpenBrand ? onOpenBrand(ad.brand_id) : onOpen(ad))}
            className="flex min-w-0 items-center gap-2 text-left"
          >
            <span
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white"
              style={{ backgroundColor: ad.brand_avatar_color }}
            >
              {ad.brand_avatar_initials}
            </span>
            <div className="min-w-0">
              <div className="flex items-center gap-1">
                <span className="text-[11px] font-bold text-[#0027eb]">
                  {ad.source_type === "instagram" ? "◎" : "∞"}
                </span>
                <p className="truncate text-[13px] font-semibold leading-tight text-[#111318] hover:text-[#0027eb]">
                  {ad.brand_name}
                </p>
              </div>
              <p className="mt-0.5 truncate font-mono-num text-[11px] text-[#667085]">
                {ad.brand_live_ads || 1} Live Ads · {formatReach(ad.eu_reach)}
              </p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => onOpen(ad)}
            aria-label="Åbn annonce-detaljer"
            className="rounded-lg p-1 text-[#8A909E] transition-colors hover:bg-[#F3F4F6] hover:text-[#111318]"
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>
        </div>

        {/* Active days + Duplicated badge */}
        <div className="mt-2 flex items-center justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold">
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: ad.is_active ? "#16A34A" : "#9CA3AF" }}
              />
              <span className={ad.is_active ? "text-[#16A34A]" : "text-[#6B7280]"}>
                {ad.is_active ? `${activeDays} days` : "Inactive"}
              </span>
            </div>
            {!compact && (
              <p className="truncate text-[10px] text-[#8A909E]">
                {formatDateShort(ad.started_running_at)} – {ad.is_active ? "Today" : "Ended"}
              </p>
            )}
          </div>

          {ad.duplicated_count && ad.duplicated_count > 1 ? (
            <span className="inline-flex shrink-0 items-center gap-1 rounded-md bg-[#ECFDF3] px-1.5 py-0.5 text-[10px] font-semibold text-[#15803D]">
              <CopyIcon className="h-2.5 w-2.5" />
              {ad.duplicated_count} Duplicated
            </span>
          ) : null}
        </div>

        {/* Primary Ad Copy */}
        {!compact && ad.primary_text && (
          <button
            type="button"
            onClick={() => onOpen(ad)}
            className="mt-2 block w-full text-left"
          >
            <p className="line-clamp-2 text-[12px] leading-[1.45] text-[#344054]">
              {ad.primary_text}
            </p>
            <span className="text-[11px] font-medium text-[#0027eb]">
              Se AI hook &amp; script
            </span>
          </button>
        )}
      </div>

      {/* 3. FULL-BLEED CREATIVE MEDIA + CENTER PLAY BUTTON */}
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
        className={`relative w-full cursor-pointer overflow-hidden bg-[#F3F4F6] ${aspectClass}`}
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
            className="h-full w-full object-cover transition-transform duration-300 ease-out group-hover:scale-[1.02]"
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-[#F8F9FB] p-6 text-center">
            {ad.brand_logo_url ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={ad.brand_logo_url}
                alt={ad.brand_name}
                className="h-10 w-10 rounded-xl shadow-sm"
              />
            ) : null}
            <p className="text-xs font-bold text-[#111318]">{ad.brand_name}</p>
            <p className="max-w-[200px] text-[11px] leading-relaxed text-[#667085]">
              Gemt link — tilføj ScrapeCreators for auto-video eller upload selv.
            </p>
          </div>
        )}

        {/* Signature TrendTrack Centered White Play Circle for Videos */}
        {ad.media_type === "video" && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white/95 text-[#111318] shadow-lg transition-transform duration-200 group-hover:scale-110">
              <Play className="ml-0.5 h-5 w-5 fill-current" />
            </span>
          </div>
        )}

        {/* Duration / AI Hook subtle bottom pill */}
        <div className="pointer-events-none absolute bottom-2 left-2 right-2 flex items-center justify-between gap-1.5">
          {ad.ai_angle ? (
            <span className="inline-flex max-w-[70%] items-center gap-1 truncate rounded-md bg-black/70 px-2 py-0.5 text-[10px] font-medium text-white backdrop-blur-sm">
              <Sparkles className="h-2.5 w-2.5 shrink-0 text-[#93C5FD]" />
              <span className="truncate">{ad.ai_angle}</span>
            </span>
          ) : (
            <span />
          )}

          {ad.duration_seconds ? (
            <span className="rounded-md bg-black/70 px-1.5 py-0.5 font-mono-num text-[10px] font-medium text-white backdrop-blur-sm">
              {formatDuration(ad.duration_seconds)}
            </span>
          ) : null}
        </div>
      </div>

      {/* 4. META-STYLE DOMAIN + HEADLINE + CTA BAR */}
      <div className="flex items-center justify-between gap-2 border-b border-[#F1F3F6] bg-[#FAFBFD] px-3 py-2.5">
        <button
          type="button"
          onClick={() => onOpen(ad)}
          className="min-w-0 flex-1 text-left"
        >
          {domain && (
            <p className="truncate text-[10px] text-[#667085]">{domain}</p>
          )}
          <p className="truncate text-[12px] font-semibold text-[#111318]">
            {ad.headline}
          </p>
        </button>

        {!compact && ad.landing_page_url && (
          <a
            href={ad.landing_page_url}
            target="_blank"
            rel="noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="shrink-0 rounded-lg border border-[#E2E5EB] bg-[#F2F4F7] px-2.5 py-1 text-[11px] font-semibold text-[#1D2432] transition-colors hover:bg-[#E5E8EE]"
          >
            {ad.cta_text || "Shop now"}
          </a>
        )}
      </div>

      {/* 5. TRENDTRACK "SAVE TO FAVORITES" BOTTOM BAR + BOARD PICKER */}
      <div className="relative p-2" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onToggleFavorite(ad.id)}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition-colors"
            style={
              isSaved
                ? {
                    backgroundColor: "rgba(0, 39, 235, 0.08)",
                    borderColor: "rgba(0, 39, 235, 0.25)",
                    color: "#0027eb",
                  }
                : {
                    backgroundColor: "#FFFFFF",
                    borderColor: "#E6E8EC",
                    color: "#344054",
                  }
            }
          >
            {ad.is_favorite ? (
              <Heart className="h-3.5 w-3.5 fill-current" />
            ) : (
              <Bookmark className="h-3.5 w-3.5" fill={ad.board_ids.length > 0 ? "currentColor" : "none"} />
            )}
            <span>
              {ad.board_ids.length > 0
                ? `Gemt i ${ad.board_ids.length} board${ad.board_ids.length > 1 ? "s" : ""}`
                : ad.is_favorite
                  ? "Gemt i Favoritter"
                  : "Save to Favorites"}
            </span>
          </button>

          <button
            type="button"
            aria-label="Vælg board"
            onClick={() => setBoardMenuOpen((v) => !v)}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[#E6E8EC] bg-white text-[#475467] transition-colors hover:bg-[#F5F6F8]"
          >
            <ChevronDown className="h-3.5 w-3.5" />
          </button>
        </div>

        {boardMenuOpen && (
          <div className="absolute bottom-12 right-2 z-30 w-56 rounded-xl border border-[#E2E5EB] bg-white p-1.5 shadow-xl">
            <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-[#667085]">
              Gem i mappe / board
            </p>
            {boards.map((board) => {
              const selected = ad.board_ids.includes(board.id);
              return (
                <button
                  key={board.id}
                  type="button"
                  onClick={() => onToggleBoard(ad.id, board.id)}
                  className="flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-left text-xs text-[#111318] transition-colors hover:bg-[#F5F6F8]"
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
