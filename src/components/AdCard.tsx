"use client";

import React, { useState } from "react";
import {
  Bookmark,
  ExternalLink,
  Flame,
  Heart,
  Play,
  Sparkles,
  Image as ImageIcon,
} from "lucide-react";
import type { Ad, Board } from "@/lib/types";
import { formatDuration, formatReach, getActiveDays } from "@/lib/url-parser";

interface AdCardProps {
  ad: Ad;
  boards: Board[];
  onOpen: (ad: Ad) => void;
  onToggleFavorite: (adId: string) => void;
  onToggleBoard: (adId: string, boardId: string) => void;
}

export function AdCard({
  ad,
  boards,
  onOpen,
  onToggleFavorite,
  onToggleBoard,
}: AdCardProps) {
  const [boardMenuOpen, setBoardMenuOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const activeDays = getActiveDays(ad.started_running_at);
  const isWinner = ad.is_active && activeDays >= 30;
  const isVideoFile =
    ad.media_type === "video" && /\.(mp4|webm|mov)(\?|$)/i.test(ad.media_url);

  const sourceLabel =
    ad.source_type === "meta_ad_library"
      ? "Meta"
      : ad.source_type === "instagram"
        ? "IG"
        : "Upload";

  const sourceStyle =
    ad.source_type === "meta_ad_library"
      ? { background: "var(--accent-meta-soft)", color: "var(--accent-meta)" }
      : ad.source_type === "instagram"
        ? { background: "var(--accent-ig-soft)", color: "var(--accent-ig)" }
        : { background: "var(--bg-elevated)", color: "var(--text-secondary)" };

  return (
    <article
      className="group relative flex flex-col overflow-hidden rounded-2xl border transition-all duration-200 hover:-translate-y-0.5"
      style={{
        backgroundColor: "var(--bg-surface)",
        borderColor: "var(--border-subtle)",
        boxShadow: "var(--shadow-card)",
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false);
        setBoardMenuOpen(false);
      }}
    >
      {/* Creative Media Frame */}
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
        className={`relative w-full cursor-pointer overflow-hidden bg-black/30 ${
          ad.aspect_ratio === "1:1" ? "aspect-square" : "aspect-[3/4]"
        }`}
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
        ) : (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={ad.thumbnail_url || ad.media_url}
            alt={`${ad.brand_name} — ${ad.headline}`}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03]"
          />
        )}

        {/* Subtle bottom scrim for legibility */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/75 via-black/25 to-transparent" />

        {/* Top-left: Live Active Days / Winner Badge */}
        <div className="absolute left-2.5 top-2.5 flex items-center gap-1.5">
          <span
            className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium backdrop-blur-md"
            style={{
              backgroundColor: "rgba(10, 11, 13, 0.72)",
              color: "#F4F5F6",
              border: "1px solid rgba(255,255,255,0.12)",
            }}
          >
            <span
              className="h-1.5 w-1.5 rounded-full"
              style={{
                backgroundColor: ad.is_active ? "var(--accent-live)" : "#6B7280",
              }}
            />
            <span className="font-mono-num">
              {ad.is_active ? `${activeDays}d` : "Pauset"}
            </span>
          </span>

          {isWinner && (
            <span
              title="Kørt aktivt i 30+ dage (stærkt vinder-signal)"
              className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-medium backdrop-blur-md"
              style={{
                backgroundColor: "rgba(10, 11, 13, 0.72)",
                color: "var(--accent-winner)",
                border: "1px solid rgba(245, 158, 11, 0.25)",
              }}
            >
              <Flame className="h-3 w-3" />
              <span className="hidden sm:inline">Vinder</span>
            </span>
          )}
        </div>

        {/* Top-right: Quick Favorite & Board Save */}
        <div
          className="absolute right-2.5 top-2.5 flex items-center gap-1.5"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            aria-label={ad.is_favorite ? "Fjern fra favoritter" : "Tilføj til favoritter"}
            onClick={() => onToggleFavorite(ad.id)}
            className="flex h-8 w-8 items-center justify-center rounded-full backdrop-blur-md transition-transform active:scale-90"
            style={{
              backgroundColor: "rgba(10, 11, 13, 0.7)",
              color: ad.is_favorite ? "#FB7185" : "#F4F5F6",
              border: "1px solid rgba(255,255,255,0.12)",
            }}
          >
            <Heart
              className="h-3.5 w-3.5"
              fill={ad.is_favorite ? "currentColor" : "none"}
            />
          </button>

          <div className="relative">
            <button
              type="button"
              aria-label="Gem til board"
              onClick={() => setBoardMenuOpen((v) => !v)}
              className="flex h-8 w-8 items-center justify-center rounded-full backdrop-blur-md transition-transform active:scale-90"
              style={{
                backgroundColor: "rgba(10, 11, 13, 0.7)",
                color: ad.board_ids.length > 0 ? "#10B981" : "#F4F5F6",
                border: "1px solid rgba(255,255,255,0.12)",
              }}
            >
              <Bookmark
                className="h-3.5 w-3.5"
                fill={ad.board_ids.length > 0 ? "currentColor" : "none"}
              />
            </button>

            {boardMenuOpen && (
              <div
                className="absolute right-0 top-10 z-30 w-52 rounded-xl border p-1.5 shadow-2xl"
                style={{
                  backgroundColor: "var(--bg-surface)",
                  borderColor: "var(--border-strong)",
                }}
              >
                <p
                  className="px-2 py-1 text-[11px] font-medium uppercase tracking-wider"
                  style={{ color: "var(--text-muted)" }}
                >
                  Gem til board
                </p>
                {boards.map((board) => {
                  const selected = ad.board_ids.includes(board.id);
                  return (
                    <button
                      key={board.id}
                      type="button"
                      onClick={() => onToggleBoard(ad.id, board.id)}
                      className="flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-left text-xs transition-colors hover:bg-white/5"
                      style={{ color: "var(--text-primary)" }}
                    >
                      <span className="flex items-center gap-2 truncate">
                        <span
                          className="h-2 w-2 shrink-0 rounded-full"
                          style={{ backgroundColor: board.accent_color }}
                        />
                        <span className="truncate">{board.name}</span>
                      </span>
                      {selected && (
                        <span
                          className="text-[11px] font-semibold"
                          style={{ color: "var(--accent-live)" }}
                        >
                          ✓
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Bottom media bar: Video/Static badge + EU Reach */}
        <div className="pointer-events-none absolute inset-x-2.5 bottom-2.5 flex items-center justify-between gap-2">
          <span
            className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium backdrop-blur-md"
            style={{
              backgroundColor: "rgba(10, 11, 13, 0.72)",
              color: "#F4F5F6",
            }}
          >
            {ad.media_type === "video" ? (
              <>
                <Play className="h-2.5 w-2.5 fill-current" />
                <span className="font-mono-num">
                  {ad.duration_seconds ? formatDuration(ad.duration_seconds) : "Video"}
                </span>
              </>
            ) : (
              <>
                <ImageIcon className="h-2.5 w-2.5" />
                <span>Static</span>
              </>
            )}
          </span>

          {ad.eu_reach ? (
            <span
              className="font-mono-num rounded-full px-2 py-0.5 text-[11px] font-medium backdrop-blur-md"
              style={{
                backgroundColor: "rgba(10, 11, 13, 0.72)",
                color: "#E5E7EB",
              }}
            >
              {formatReach(ad.eu_reach)} EU
            </span>
          ) : null}
        </div>
      </div>

      {/* Clean Card Footer */}
      <div className="flex flex-1 flex-col gap-2 p-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <span
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold text-white"
              style={{ backgroundColor: ad.brand_avatar_color }}
            >
              {ad.brand_avatar_initials}
            </span>
            <div className="min-w-0">
              <p
                className="truncate text-xs font-semibold leading-tight"
                style={{ color: "var(--text-primary)" }}
              >
                {ad.brand_name}
              </p>
              <p
                className="truncate text-[11px] leading-tight"
                style={{ color: "var(--text-muted)" }}
              >
                {ad.brand_handle}
              </p>
            </div>
          </div>

          <span
            className="shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-semibold tracking-wide"
            style={sourceStyle}
          >
            {sourceLabel}
          </span>
        </div>

        {/* Hook or Headline preview */}
        <button
          type="button"
          onClick={() => onOpen(ad)}
          className="line-clamp-2 text-left text-xs leading-relaxed transition-opacity hover:opacity-80"
          style={{ color: "var(--text-secondary)" }}
        >
          {ad.ai_hook_verbal || ad.headline || ad.primary_text}
        </button>

        {/* Bottom metadata pills */}
        <div className="mt-auto flex items-center justify-between gap-2 pt-1">
          <div className="flex min-w-0 items-center gap-1.5">
            {ad.ai_angle && (
              <span
                className="inline-flex items-center gap-1 truncate rounded-md px-2 py-0.5 text-[10px] font-medium"
                style={{
                  backgroundColor: "var(--bg-elevated)",
                  color: "var(--text-secondary)",
                }}
              >
                <Sparkles className="h-2.5 w-2.5 shrink-0 opacity-75" />
                <span className="truncate">{ad.ai_angle}</span>
              </span>
            )}
          </div>

          {ad.landing_page_url && (
            <a
              href={ad.landing_page_url}
              target="_blank"
              rel="noreferrer"
              aria-label="Åbn landingsside"
              onClick={(e) => e.stopPropagation()}
              className="rounded-md p-1 transition-colors hover:bg-white/5"
              style={{ color: "var(--text-muted)" }}
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          )}
        </div>
      </div>
    </article>
  );
}
