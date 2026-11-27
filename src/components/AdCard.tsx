"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  Bookmark,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  Film,
  Layers,
  Play,
  Plus,
  Sparkles,
} from "lucide-react";
import type { Ad, Board } from "@/lib/types";
import { formatReach, getActiveDays } from "@/lib/url-parser";
import { preloadImage, preloadVideo } from "@/lib/media-preloader";
import { InstagramColorIcon } from "./BrandIcons";
import { FlakePopover } from "./ui/FlakeDropdown";

interface AdCardProps {
  ad: Ad;
  boards: Board[];
  rank?: number;
  compact?: boolean;
  onOpen: (ad: Ad) => void;
  onToggleBoard: (adId: string, boardId: string) => void;
  onOpenBrand?: (brandId: string) => void;
  onCloneAd?: (ad: Ad) => void;
  isFollowed?: boolean;
  onToggleFollow?: (brandId: string) => void;
}

function formatVideoDuration(seconds?: number): string {
  if (!seconds || seconds <= 0) return "";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

function extractDisplayDomain(url?: string, fallbackHandle?: string): string {
  if (url) {
    try {
      return new URL(url.startsWith("http") ? url : `https://${url}`).hostname.replace(
        /^www\./i,
        ""
      );
    } catch {
      // fall through to handle fallback
    }
  }
  const cleanHandle = (fallbackHandle || "").replace(/^@/, "").trim();
  return cleanHandle ? `${cleanHandle}.com` : "shop.store";
}

export const AdCard = React.memo(function AdCard({
  ad,
  boards,
  rank,
  compact = false,
  onOpen,
  onToggleBoard,
  onOpenBrand,
  onCloneAd,
  isFollowed = false,
  onToggleFollow,
}: AdCardProps) {
  const [folderMenuOpen, setFolderMenuOpen] = useState(false);
  const [copyExpanded, setCopyExpanded] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [imgFailed, setImgFailed] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [naturalRatio, setNaturalRatio] = useState<number | null>(null);
  const [nearViewport, setNearViewport] = useState(false);
  const [slideIdx, setSlideIdx] = useState(0);
  const touchStartXRef = useRef<number | null>(null);
  const didSwipeRef = useRef(false);
  const cardRef = useRef<HTMLElement | null>(null);
  const folderBtnRef = useRef<HTMLButtonElement | null>(null);

  const carouselSlides =
    Array.isArray(ad.carousel_cards) && ad.carousel_cards.length >= 2
      ? ad.carousel_cards
      : null;
  const safeSlideIdx = carouselSlides
    ? Math.min(slideIdx, carouselSlides.length - 1)
    : 0;
  const activeSlide = carouselSlides ? carouselSlides[safeSlideIdx] : null;

  const activeMediaUrl = activeSlide ? activeSlide.media_url : ad.media_url;
  const activeMediaType = activeSlide ? activeSlide.media_type : ad.media_type;

  const isVideoFile =
    /\.(mp4|webm|mov)(\?|$)/i.test(activeMediaUrl) ||
    (activeMediaType === "video" && activeMediaUrl.includes("video") && activeMediaUrl.includes("fbcdn"));

  const primaryImg = imgFailed
    ? ad.fallback_image_url || ""
    : activeSlide
      ? activeSlide.thumbnail_url || (!isVideoFile ? activeSlide.media_url : "") || ad.thumbnail_url || ""
      : ad.thumbnail_url || ad.fallback_image_url || (!isVideoFile ? ad.media_url : "") || "";

  const stepSlide = (delta: number) => {
    if (!carouselSlides) return;
    setImgFailed(false);
    setSlideIdx((prev) => (prev + delta + carouselSlides.length) % carouselSlides.length);
  };

  // Instagram/TikTok-style predictive lookahead: warm poster + video ~1200px before entering viewport
  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;
    const scrollCandidate = el.closest("[data-scroll-root]") as HTMLElement | null;
    const overflowY = scrollCandidate ? window.getComputedStyle(scrollCandidate).overflowY : "";
    const scrollRoot =
      scrollCandidate && (overflowY === "auto" || overflowY === "scroll")
        ? scrollCandidate
        : null;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setNearViewport(true);
          if (primaryImg) preloadImage(primaryImg);
          if (isVideoFile && ad.media_url) preloadVideo(ad.media_url);
          observer.disconnect();
        }
      },
      { root: scrollRoot, rootMargin: "1200px 0px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [ad.media_url, isVideoFile, primaryImg]);

  const isOrganic =
    ad.source_type === "instagram" ||
    ad.source_type === "manual" ||
    ad.tags.includes("custom-import") ||
    ad.tags.includes("custom-upload");
  const isInstagram = ad.source_type === "instagram" || ad.tags.includes("instagram");

  const activeDays = getActiveDays(ad.started_running_at);
  const inFolders = ad.board_ids.length > 0;
  const savedBoardName = inFolders
    ? boards.find((b) => ad.board_ids.includes(b.id))?.name
    : undefined;

  const rankBadgeStyle =
    rank === 1
      ? "bg-gradient-to-b from-[#FEF08A] via-[#EAB308] to-[#CA8A04] text-[#5C3404] ring-[1.5px] ring-[#854D0E] shadow-[inset_0_1px_1px_rgba(255,255,255,0.85),0_1px_2px_rgba(133,77,14,0.28)]"
      : rank === 2
        ? "bg-gradient-to-b from-[#FFFFFF] via-[#CBD5E1] to-[#94A3B8] text-[#1E293B] ring-[1.5px] ring-[#475569] shadow-[inset_0_1px_1px_rgba(255,255,255,0.95),0_1px_2px_rgba(71,85,105,0.24)]"
        : "bg-gradient-to-b from-[#FDE6CE] via-[#D9823B] to-[#A85319] text-[#4A1D06] ring-[1.5px] ring-[#6B2D0B] shadow-[inset_0_1px_1px_rgba(255,255,255,0.65),0_1px_2px_rgba(107,45,11,0.28)]";

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
  const durationLabel = formatVideoDuration(ad.duration_seconds);
  const displayDomain = extractDisplayDomain(ad.landing_page_url, ad.brand_handle);
  const displayHeadline = (ad.headline || "").trim() || ad.brand_name;
  const ctaLabel = (ad.cta_text || "").trim() || "Shop Now";
  const duplicatedCount = ad.duplicated_count ?? 1;
  const formatLabel =
    ad.media_type === "carousel"
      ? "Carousel"
      : ad.media_type === "video"
        ? "Video"
        : "Image";
  const metaSummaryParts = [
    formatLabel,
    ad.eu_reach ? `Reach ${formatReach(ad.eu_reach)}` : "",
    ad.ai_angle || ad.hook_category || ad.platforms[0] || "",
  ].filter(Boolean);

  return (
    <article
      ref={cardRef}
      className="cv-ad-card group relative flex flex-col rounded-[14px] border border-[#EAECEF] bg-white shadow-[0_1px_2px_rgba(15,23,42,0.03)] transition-colors duration-150 hover:border-[#D8DEE9] hover:shadow-[0_10px_28px_-8px_rgba(15,23,42,0.09)]"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false);
      }}
    >
      {/* 1. ATRIA DISCOVERY CARD HEADER: 32x32 Avatar + Brand Name + Active Days + Reuse + Quick Actions */}
      <div className="flex items-start justify-between gap-2 px-3 pt-3">
        <div className="flex min-w-0 flex-1 items-center gap-2.5">
          <button
            type="button"
            data-no-glass="true"
            onClick={() =>
              !isOrganic && onOpenBrand ? onOpenBrand(ad.brand_id) : onOpen(ad)
            }
            className="relative shrink-0"
          >
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
                style={{ backgroundColor: ad.brand_avatar_color || "#0F172A" }}
              >
                {ad.brand_avatar_initials}
              </span>
            )}
            {!isOrganic && rank && rank <= 3 && (
              <span
                className={`absolute -left-1.5 -top-1.5 inline-flex h-[18px] w-[18px] shrink-0 aspect-square items-center justify-center rounded-full text-center font-sans text-[10px] font-bold leading-none tabular-nums ${rankBadgeStyle}`}
              >
                {rank}
              </span>
            )}
          </button>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                data-no-glass="true"
                onClick={() =>
                  !isOrganic && onOpenBrand ? onOpenBrand(ad.brand_id) : onOpen(ad)
                }
                className="truncate text-left font-display text-[13px] font-semibold leading-tight text-[#0F172A] hover:text-[#0027eb]"
              >
                {ad.brand_name}
              </button>

              {onToggleFollow && !isOrganic && (
                <button
                  type="button"
                  data-no-glass="true"
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleFollow(ad.brand_id);
                  }}
                  title={isFollowed ? "Unfollow brand" : "Follow brand"}
                  className={`inline-flex shrink-0 items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold transition-colors ${
                    isFollowed
                      ? "bg-[#EEF2FF] text-[#0027eb]"
                      : "bg-[#F7F8FB] text-[#64748B] hover:bg-[#EEF2FF] hover:text-[#0027eb]"
                  }`}
                >
                  {isFollowed ? (
                    <Check className="h-2.5 w-2.5" />
                  ) : (
                    <Plus className="h-2.5 w-2.5" />
                  )}
                  {isFollowed ? "Following" : "Follow"}
                </button>
              )}
            </div>

            <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
              {isOrganic ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[#64748B]">
                  {isInstagram ? (
                    <>
                      <InstagramColorIcon className="h-3 w-3 shrink-0" />
                      Reel
                    </>
                  ) : (
                    <>
                      <Film className="h-3 w-3 shrink-0 text-[#64748B]" />
                      Video
                    </>
                  )}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 font-mono-num text-[11px] font-medium text-[#475569]">
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      ad.is_active ? "bg-[#22C55E]" : "bg-[#94A3B8]"
                    }`}
                  />
                  {activeDays}d
                </span>
              )}

              {duplicatedCount > 1 && (
                <span className="inline-flex items-center rounded bg-[#EEF2FF] px-1.5 py-0.2 font-mono-num text-[10.5px] font-semibold text-[#0027eb]">
                  &times;{duplicatedCount}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Top-Right Quick Actions: Clone (Sparkles) + Bookmark */}
        <div
          className="relative flex shrink-0 items-center gap-1"
          onClick={(e) => e.stopPropagation()}
        >
          {onCloneAd && !isOrganic && (
            <button
              type="button"
              data-no-glass="true"
              title="Clone ad to Studio"
              aria-label="Clone ad to Studio"
              onClick={() => onCloneAd(ad)}
              className="flex h-7 w-7 items-center justify-center rounded-lg border border-[#EAECEF] bg-white text-[#475569] transition-colors hover:border-[#0027eb] hover:bg-[#EEF2FF] hover:text-[#0027eb]"
            >
              <Sparkles className="h-3.5 w-3.5" />
            </button>
          )}

          <button
            ref={folderBtnRef}
            type="button"
            data-no-glass="true"
            title={
              inFolders
                ? savedBoardName
                  ? `Saved in ${savedBoardName}`
                  : `Saved in ${ad.board_ids.length} folders`
                : "Save to folder"
            }
            aria-label="Save to folder"
            onClick={() => setFolderMenuOpen((v) => !v)}
            className={`flex h-7 w-7 items-center justify-center rounded-lg border transition-colors ${
              inFolders
                ? "border-[#0027eb]/30 bg-[#EEF2FF] text-[#0027eb]"
                : "border-[#EAECEF] bg-white text-[#475569] hover:border-[#CBD5E1] hover:text-[#0F172A]"
            }`}
          >
            <Bookmark
              className="h-3.5 w-3.5"
              fill={inFolders ? "currentColor" : "none"}
            />
          </button>

          <FlakePopover
            open={folderMenuOpen}
            onOpenChange={setFolderMenuOpen}
            anchorRef={folderBtnRef}
            align="right"
            preferredPlacement="bottom"
            minWidth={210}
            maxHeight={260}
          >
            <div className="workspace-scroll overflow-y-auto overscroll-contain p-1.5">
              <p className="px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-[#64748B]">
                Save to folder
              </p>
              {boards.length === 0 ? (
                <p className="px-2.5 py-2 text-xs text-[#94A3B8]">
                  Create a folder in the sidebar first.
                </p>
              ) : (
                boards.map((board) => {
                  const selected = ad.board_ids.includes(board.id);
                  return (
                    <button
                      key={board.id}
                      type="button"
                      data-no-glass="true"
                      onClick={() => onToggleBoard(ad.id, board.id)}
                      className={`flex w-full items-center justify-between rounded-xl px-2.5 py-2 text-left text-xs transition-colors ${
                        selected
                          ? "bg-[#0027eb]/[0.08] font-semibold text-[#0027eb] hover:bg-[#0027eb]/[0.12]"
                          : "font-medium text-[#0F172A] hover:bg-[#F3F5F9]"
                      }`}
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
                })
              )}
            </div>
          </FlakePopover>
        </div>
      </div>

      {/* Clean Meta Pill */}
      <div className="px-3">
        <div className="mt-1.5 truncate rounded-md bg-[#F7F8FB] px-2.5 py-1 text-[11px] font-medium text-[#475569]">
          {metaSummaryParts.join(" · ")}
        </div>
      </div>

      {/* 2. AD COPY PREVIEW WITH GRADIENT FADE + FLOATING "See more" PILL */}
      {!compact && copyText && (
        <div className="relative px-3 pb-2.5 pt-2">
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
      <div className={`px-2 ${compact || !copyText ? "pt-2" : ""}`}>
        <div
          role="button"
          tabIndex={0}
          onClick={() => {
            if (didSwipeRef.current) {
              didSwipeRef.current = false;
              return;
            }
            onOpen(ad);
          }}
          onTouchStart={
            carouselSlides
              ? (e) => {
                  touchStartXRef.current = e.touches[0]?.clientX ?? null;
                  didSwipeRef.current = false;
                }
              : undefined
          }
          onTouchEnd={
            carouselSlides
              ? (e) => {
                  const startX = touchStartXRef.current;
                  touchStartXRef.current = null;
                  if (startX === null) return;
                  const endX = e.changedTouches[0]?.clientX ?? startX;
                  const dx = endX - startX;
                  if (Math.abs(dx) >= 34) {
                    didSwipeRef.current = true;
                    stepSlide(dx < 0 ? 1 : -1);
                  }
                }
              : undefined
          }
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onOpen(ad);
            }
          }}
          style={{
            aspectRatio:
              primaryImg || isVideoFile
                ? String(clampedRatio ?? fallbackRatio)
                : "1 / 1",
          }}
          className="relative w-full cursor-pointer overflow-hidden rounded-[10px] bg-[#F3F5F9]"
        >
          {isVideoFile && (isHovered || !primaryImg) && !imgFailed ? (
            <video
              key={activeMediaUrl}
              src={activeMediaUrl}
              poster={primaryImg || undefined}
              autoPlay={isHovered}
              muted
              loop
              playsInline
              preload={nearViewport ? "auto" : "metadata"}
              onLoadedMetadata={(e) => {
                const v = e.currentTarget;
                if (v.videoWidth > 0 && v.videoHeight > 0) {
                  setNaturalRatio(v.videoWidth / v.videoHeight);
                }
              }}
              onError={() => setImgFailed(true)}
              className="h-full w-full bg-black object-contain"
            />
          ) : primaryImg ? (
            <>
              {!imgLoaded && (
                <div className="skeleton-shimmer absolute inset-0" aria-hidden="true" />
              )}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={primaryImg}
                alt={`${ad.brand_name} — ${activeSlide?.headline || ad.headline}`}
                loading={nearViewport ? "eager" : "lazy"}
                decoding="async"
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

          {/* Top-Left Video Duration Pill */}
          {activeMediaType === "video" && (
            <div className="pointer-events-none absolute left-2 top-2 z-10">
              <span className="inline-flex items-center gap-1 rounded-full border border-white/25 bg-[#050811]/70 px-2 py-0.5 font-mono-num text-[10.5px] font-semibold text-white shadow-sm backdrop-blur-md">
                <Clock className="h-2.5 w-2.5" />
                {durationLabel || "00:24"}
              </span>
            </div>
          )}

          {/* Frosted Translucent Circular Play Button */}
          {activeMediaType === "video" && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <span className="flex h-11 w-11 items-center justify-center rounded-full border border-white/35 bg-black/35 text-white shadow-md backdrop-blur-md transition-transform duration-200 group-hover:scale-110 group-hover:bg-black/55">
                <Play className="ml-0.5 h-4 w-4 fill-current" />
              </span>
            </div>
          )}

          {/* Interactive Carousel Controls (Arrows + Slide Counter + Dots) */}
          {carouselSlides && (
            <>
              <div className="pointer-events-none absolute right-2 top-2">
                <span className="inline-flex items-center gap-1 rounded-full border border-white/30 bg-black/55 px-2 py-0.5 font-mono-num text-[10.5px] font-semibold text-white shadow-sm backdrop-blur-md">
                  <Layers className="h-3 w-3" />
                  {safeSlideIdx + 1}/{carouselSlides.length}
                </span>
              </div>

              <button
                type="button"
                data-no-glass="true"
                aria-label="Previous slide"
                onClick={(e) => {
                  e.stopPropagation();
                  stepSlide(-1);
                }}
                className="absolute left-2 top-1/2 z-10 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full border border-white/30 bg-black/50 text-white shadow-sm backdrop-blur-md transition-all hover:bg-black/75 sm:opacity-0 sm:group-hover:opacity-100"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>

              <button
                type="button"
                data-no-glass="true"
                aria-label="Next slide"
                onClick={(e) => {
                  e.stopPropagation();
                  stepSlide(1);
                }}
                className="absolute right-2 top-1/2 z-10 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full border border-white/30 bg-black/50 text-white shadow-sm backdrop-blur-md transition-all hover:bg-black/75 sm:opacity-0 sm:group-hover:opacity-100"
              >
                <ChevronRight className="h-4 w-4" />
              </button>

              <div
                className="absolute inset-x-0 bottom-2 z-10 flex items-center justify-center gap-1"
                onClick={(e) => e.stopPropagation()}
              >
                {carouselSlides.slice(0, 8).map((_, idx) => (
                  <button
                    key={idx}
                    type="button"
                    data-no-glass="true"
                    aria-label={`Slide ${idx + 1}`}
                    onClick={() => {
                      setImgFailed(false);
                      setSlideIdx(idx);
                    }}
                    className={`h-1.5 rounded-full transition-all ${
                      idx === safeSlideIdx
                        ? "w-4 bg-white shadow-xs"
                        : "w-1.5 bg-white/55 hover:bg-white/85"
                    }`}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* 4. BOTTOM DOMAIN + HEADLINE + CTA FOOTER STRIP */}
      <div
        onClick={() => onOpen(ad)}
        className="mt-2 flex cursor-pointer items-center justify-between gap-2.5 rounded-b-[14px] border-t border-[#EAECEF] bg-[#F7F8FB]/80 px-3 py-2.5 transition-colors hover:bg-[#F1F4F9]"
      >
        <div className="min-w-0 flex-1">
          <p className="truncate text-[10.5px] font-medium uppercase tracking-wide text-[#64748B]">
            {displayDomain}
          </p>
          <p className="truncate text-[12px] font-semibold text-[#0F172A]">
            {displayHeadline}
          </p>
        </div>

        <button
          type="button"
          data-no-glass="true"
          onClick={(e) => {
            e.stopPropagation();
            onOpen(ad);
          }}
          className="shrink-0 rounded-lg border border-[#E2E8F0] bg-white px-2.5 py-1.5 text-[11px] font-semibold text-[#0F172A] transition-colors hover:border-[#0027eb] hover:text-[#0027eb]"
        >
          {ctaLabel}
        </button>
      </div>
    </article>
  );
});
