"use client";

import React, { useState } from "react";
import {
  ArrowUpRight,
  Bookmark,
  Flame,
  Heart,
  Image as ImageIcon,
  Play,
  Sparkles,
} from "lucide-react";
import type { Ad, Board } from "@/lib/types";
import { formatDuration, formatReach, getActiveDays } from "@/lib/url-parser";
import { Badge } from "@/components/reui/badge";
import { Frame, FramePanel } from "@/components/reui/frame";

interface AdCardProps {
  ad: Ad;
  boards: Board[];
  compact?: boolean;
  onOpen: (ad: Ad) => void;
  onToggleFavorite: (adId: string) => void;
  onToggleBoard: (adId: string, boardId: string) => void;
}

function getDomain(url?: string): string {
  if (!url) return "";
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

export function AdCard({
  ad,
  boards,
  compact = false,
  onOpen,
  onToggleFavorite,
  onToggleBoard,
}: AdCardProps) {
  const [boardMenuOpen, setBoardMenuOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const activeDays = getActiveDays(ad.started_running_at);
  const isWinner = ad.is_active && activeDays >= 30;
  const domain = getDomain(ad.landing_page_url);
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
      className="group mb-4 break-inside-avoid"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false);
        setBoardMenuOpen(false);
      }}
    >
      <Frame
        dense
        className="transition-all duration-200 hover:border-foreground/20"
        style={{ boxShadow: "var(--shadow-card)" }}
      >
        {/* TOP BAR: Authentic Foreplay / Meta Ad Header */}
        <div
          className="flex items-center justify-between gap-2 px-3 py-2.5"
          style={{ backgroundColor: "var(--bg-surface)" }}
        >
          <button
            type="button"
            onClick={() => onOpen(ad)}
            className="flex min-w-0 items-center gap-2 text-left"
          >
            <span
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white ring-1 ring-white/15"
              style={{ backgroundColor: ad.brand_avatar_color }}
            >
              {ad.brand_avatar_initials}
            </span>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <p
                  className="truncate text-xs font-semibold leading-tight"
                  style={{ color: "var(--text-primary)" }}
                >
                  {ad.brand_name}
                </p>
                <Badge
                  size="xs"
                  radius="full"
                  variant={
                    ad.source_type === "meta_ad_library"
                      ? "info-light"
                      : ad.source_type === "instagram"
                        ? "destructive-light"
                        : "secondary"
                  }
                >
                  {ad.source_type === "meta_ad_library"
                    ? "Meta"
                    : ad.source_type === "instagram"
                      ? "IG"
                      : "Upload"}
                </Badge>
              </div>
              <div className="mt-0.5 flex items-center gap-1.5 text-[11px]">
                <span
                  className="h-1.5 w-1.5 rounded-full"
                  style={{
                    backgroundColor: ad.is_active ? "var(--accent-live)" : "#6B7280",
                  }}
                />
                <span
                  className="font-mono-num font-medium"
                  style={{
                    color: ad.is_active ? "var(--accent-live)" : "var(--text-muted)",
                  }}
                >
                  {ad.is_active ? `Aktiv · ${activeDays}d` : "Pauset"}
                </span>
              </div>
            </div>
          </button>

          {/* Quick Favorite & Save to Board */}
          <div
            className="relative flex shrink-0 items-center gap-0.5"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              aria-label={ad.is_favorite ? "Fjern fra favoritter" : "Tilføj til favoritter"}
              onClick={() => onToggleFavorite(ad.id)}
              className="flex h-7 w-7 items-center justify-center rounded-lg transition-colors hover:bg-muted"
              style={{
                color: ad.is_favorite ? "#FB7185" : "var(--text-muted)",
              }}
            >
              <Heart
                className="h-3.5 w-3.5"
                fill={ad.is_favorite ? "currentColor" : "none"}
              />
            </button>

            <button
              type="button"
              aria-label="Gem til board"
              onClick={() => setBoardMenuOpen((v) => !v)}
              className="flex h-7 w-7 items-center justify-center rounded-lg transition-colors hover:bg-muted"
              style={{
                color: ad.board_ids.length > 0 ? "var(--accent-live)" : "var(--text-muted)",
              }}
            >
              <Bookmark
                className="h-3.5 w-3.5"
                fill={ad.board_ids.length > 0 ? "currentColor" : "none"}
              />
            </button>

            {boardMenuOpen && (
              <div
                className="absolute right-0 top-9 z-30 w-52 rounded-xl border p-1.5 shadow-2xl"
                style={{
                  backgroundColor: "var(--bg-surface)",
                  borderColor: "var(--border-strong)",
                }}
              >
                <p
                  className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider"
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
                      className="flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-left text-xs transition-colors hover:bg-muted"
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

        {/* PRIMARY AD COPY PREVIEW (Foreplay signature — scannable above media) */}
        {!compact && ad.primary_text && (
          <button
            type="button"
            onClick={() => onOpen(ad)}
            className="w-full px-3 pb-2.5 text-left"
            style={{ backgroundColor: "var(--bg-surface)" }}
          >
            <p
              className="line-clamp-2 text-[12px] leading-[1.45]"
              style={{ color: "var(--text-secondary)" }}
            >
              {ad.primary_text}
            </p>
          </button>
        )}

        {/* FULL-BLEED CREATIVE MEDIA */}
        <FramePanel className="!rounded-none !border-x-0 !p-0">
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
            className={`relative w-full cursor-pointer overflow-hidden bg-black/40 ${aspectClass}`}
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

            {/* Soft vignette for floating pills */}
            <div className="pointer-events-none absolute inset-x-0 top-0 h-14 bg-gradient-to-b from-black/45 to-transparent" />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />

            {/* Top-left: Winner signal pill */}
            {isWinner && (
              <div className="absolute left-2.5 top-2.5">
                <span
                  className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold backdrop-blur-md"
                  style={{
                    backgroundColor: "rgba(10, 11, 13, 0.72)",
                    color: "var(--accent-winner)",
                    border: "1px solid rgba(245, 158, 11, 0.3)",
                  }}
                >
                  <Flame className="h-3 w-3" />
                  Vinder
                </span>
              </div>
            )}

            {/* Bottom overlay: Video duration / Static + EU Reach */}
            <div className="pointer-events-none absolute inset-x-2.5 bottom-2.5 flex items-center justify-between gap-2">
              <span
                className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium backdrop-blur-md"
                style={{
                  backgroundColor: "rgba(10, 11, 13, 0.75)",
                  color: "#F4F5F6",
                  border: "1px solid rgba(255,255,255,0.12)",
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
                  className="font-mono-num rounded-full px-2 py-0.5 text-[10px] font-medium backdrop-blur-md"
                  style={{
                    backgroundColor: "rgba(10, 11, 13, 0.75)",
                    color: "#E5E7EB",
                    border: "1px solid rgba(255,255,255,0.12)",
                  }}
                >
                  {formatReach(ad.eu_reach)} EU
                </span>
              ) : null}
            </div>
          </div>
        </FramePanel>

        {/* META-STYLE HEADLINE + CTA BAR */}
        <div
          className="flex items-center justify-between gap-2.5 border-b px-3 py-2.5"
          style={{
            backgroundColor: "var(--bg-elevated)",
            borderColor: "var(--border-subtle)",
          }}
        >
          <button
            type="button"
            onClick={() => onOpen(ad)}
            className="min-w-0 flex-1 text-left"
          >
            {domain && (
              <p
                className="truncate text-[10px] uppercase tracking-wider"
                style={{ color: "var(--text-muted)" }}
              >
                {domain}
              </p>
            )}
            <p
              className="truncate text-xs font-semibold leading-snug"
              style={{ color: "var(--text-primary)" }}
            >
              {ad.headline}
            </p>
          </button>

          {!compact && ad.landing_page_url && (
            <a
              href={ad.landing_page_url}
              target="_blank"
              rel="noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="inline-flex shrink-0 items-center gap-1 rounded-lg border px-2.5 py-1 text-[11px] font-semibold transition-colors hover:bg-muted"
              style={{
                backgroundColor: "var(--bg-surface)",
                borderColor: "var(--border-strong)",
                color: "var(--text-primary)",
              }}
            >
              <span>{ad.cta_text || "Se mere"}</span>
              <ArrowUpRight className="h-3 w-3 opacity-60" />
            </a>
          )}
        </div>

        {/* SMART AI METADATA FOOTER */}
        <button
          type="button"
          onClick={() => onOpen(ad)}
          className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left transition-colors hover:bg-muted/60"
          style={{ backgroundColor: "var(--bg-surface)" }}
        >
          <div className="flex min-w-0 items-center gap-1.5">
            <Sparkles
              className="h-3 w-3 shrink-0"
              style={{ color: "var(--accent-live)" }}
            />
            <span
              className="truncate text-[11px] font-medium"
              style={{ color: "var(--text-secondary)" }}
            >
              {ad.ai_angle || "Ikke analyseret"}
            </span>
          </div>

          {ad.ai_format && !compact && (
            <Badge size="xs" variant="outline" className="shrink-0">
              {ad.ai_format}
            </Badge>
          )}
        </button>
      </Frame>
    </article>
  );
}
