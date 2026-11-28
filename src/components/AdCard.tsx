"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  Bookmark,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  Copy,
  ExternalLink,
  Film,
  Layers,
  MoreHorizontal,
  Play,
  Plus,
  Sparkles,
  Store,
  Users,
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
  assumedCpm?: number;
  onOpen: (ad: Ad) => void;
  onToggleBoard: (adId: string, boardId: string) => void;
  onOpenBrand?: (brandId: string) => void;
  onCloneAd?: (ad: Ad) => void;
  isFollowed?: boolean;
  onToggleFollow?: (brandId: string) => void;
}

const COUNTRY_META: Record<string, { flag: string; name: string }> = {
  US: { flag: "🇺🇸", name: "United States" },
  CA: { flag: "🇨🇦", name: "Canada" },
  GB: { flag: "🇬🇧", name: "United Kingdom" },
  UK: { flag: "🇬🇧", name: "United Kingdom" },
  DE: { flag: "🇩🇪", name: "Germany" },
  FR: { flag: "🇫🇷", name: "France" },
  IT: { flag: "🇮🇹", name: "Italy" },
  ES: { flag: "🇪🇸", name: "Spain" },
  NL: { flag: "🇳🇱", name: "Netherlands" },
  PL: { flag: "🇵🇱", name: "Poland" },
  SE: { flag: "🇸🇪", name: "Sweden" },
  BE: { flag: "🇧🇪", name: "Belgium" },
  IE: { flag: "🇮🇪", name: "Ireland" },
  AT: { flag: "🇦🇹", name: "Austria" },
  DK: { flag: "🇩🇰", name: "Denmark" },
  NO: { flag: "🇳🇴", name: "Norway" },
  FI: { flag: "🇫🇮", name: "Finland" },
  AU: { flag: "🇦🇺", name: "Australia" },
  NZ: { flag: "🇳🇿", name: "New Zealand" },
  EU: { flag: "🇪🇺", name: "Europe" },
  GLOBAL: { flag: "🌍", name: "Global" },
};

function formatVideoDuration(seconds?: number): string {
  if (!seconds || seconds <= 0) return "";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

function formatCompactSpend(amount: number): string {
  if (amount >= 1_000_000) {
    return `$${(amount / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  }
  if (amount >= 1_000) {
    return `$${(amount / 1_000).toFixed(1).replace(/\.0$/, "")}K`;
  }
  return `$${Math.max(1, Math.round(amount))}`;
}

function extractDisplayDomain(url?: string, fallbackHandle?: string): string {
  if (url) {
    try {
      return new URL(url.startsWith("http") ? url : `https://${url}`).hostname
        .replace(/^www\./i, "")
        .toLowerCase();
    } catch {
      // fall through to handle fallback
    }
  }
  const cleanHandle = (fallbackHandle || "").replace(/^@/, "").trim().toLowerCase();
  return cleanHandle ? `${cleanHandle}.com` : "shop.store";
}

function resolvePrimaryCountry(ad: Ad): { flag: string; name: string } {
  const firstTargeted =
    Array.isArray(ad.targeted_countries) && ad.targeted_countries.length > 0
      ? ad.targeted_countries[0].toUpperCase()
      : null;
  if (firstTargeted && COUNTRY_META[firstTargeted]) {
    return COUNTRY_META[firstTargeted];
  }
  if (
    Array.isArray(ad.audience_breakdown) &&
    ad.audience_breakdown.length > 0
  ) {
    const topBreakdown = [...ad.audience_breakdown].sort(
      (a, b) => (b.total_reach || 0) - (a.total_reach || 0)
    )[0];
    const code = topBreakdown?.country?.toUpperCase();
    if (code && COUNTRY_META[code]) return COUNTRY_META[code];
  }
  const marketKey = (ad.market || "US").toUpperCase();
  return COUNTRY_META[marketKey] || { flag: "🌍", name: "Global" };
}

export const AdCard = React.memo(function AdCard({
  ad,
  boards,
  rank,
  compact = false,
  assumedCpm = 9,
  onOpen,
  onToggleBoard,
  onOpenBrand,
  onCloneAd,
  isFollowed = false,
  onToggleFollow,
}: AdCardProps) {
  const [folderMenuOpen, setFolderMenuOpen] = useState(false);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const [copyExpanded, setCopyExpanded] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [avatarFailed, setAvatarFailed] = useState(false);
  const [videoFailed, setVideoFailed] = useState(false);
  const [imgStage, setImgStage] = useState(0);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [naturalRatio, setNaturalRatio] = useState<number | null>(null);
  const [nearViewport, setNearViewport] = useState(false);
  const [slideIdx, setSlideIdx] = useState(0);
  const touchStartXRef = useRef<number | null>(null);
  const didSwipeRef = useRef(false);
  const cardRef = useRef<HTMLElement | null>(null);
  const folderBtnRef = useRef<HTMLButtonElement | null>(null);
  const moreBtnRef = useRef<HTMLButtonElement | null>(null);

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

  // CRITICAL PRESERVATION: robust .mp4 / video detection for Supabase & Meta CDN media
  const isVideoFile =
    /\.(mp4|webm|mov)(\?|$)/i.test(activeMediaUrl) ||
    (activeMediaType === "video" &&
      activeMediaUrl.includes("video") &&
      activeMediaUrl.includes("fbcdn"));

  const rawImgCandidates = activeSlide
    ? [
        activeSlide.thumbnail_url,
        !isVideoFile ? activeSlide.media_url : "",
        ad.thumbnail_url,
        ad.fallback_image_url,
      ]
    : [
        ad.thumbnail_url,
        ad.fallback_image_url,
        !isVideoFile ? ad.media_url : "",
      ];

  const imgCandidates: string[] = [];
  for (const url of rawImgCandidates) {
    if (typeof url === "string" && url.trim() && !imgCandidates.includes(url)) {
      imgCandidates.push(url);
    }
  }
  const primaryImg = imgStage < imgCandidates.length ? imgCandidates[imgStage] : "";

  const stepSlide = (delta: number) => {
    if (!carouselSlides) return;
    setImgStage(0);
    setVideoFailed(false);
    setImgLoaded(false);
    setSlideIdx(
      (prev) => (prev + delta + carouselSlides.length) % carouselSlides.length
    );
  };

  // Predictive lookahead: warm poster + video ~1200px before entering viewport
  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;
    const scrollCandidate = el.closest("[data-scroll-root]") as HTMLElement | null;
    const overflowY = scrollCandidate
      ? window.getComputedStyle(scrollCandidate).overflowY
      : "";
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
  const isInstagram =
    ad.source_type === "instagram" || ad.tags.includes("instagram");

  const activeDays = getActiveDays(ad.started_running_at);
  const inFolders = ad.board_ids.length > 0;
  const savedBoardName = inFolders
    ? boards.find((b) => ad.board_ids.includes(b.id))?.name
    : undefined;

  const rankBadgeStyle =
    rank === 1
      ? "bg-gradient-to-b from-[#FEF08A] via-[#EAB308] to-[#CA8A04] text-[#5C3404] ring-[1.5px] ring-[#854D0E]"
      : rank === 2
        ? "bg-gradient-to-b from-[#FFFFFF] via-[#CBD5E1] to-[#94A3B8] text-[#1E293B] ring-[1.5px] ring-[#475569]"
        : "bg-gradient-to-b from-[#FDE6CE] via-[#D9823B] to-[#A85319] text-[#4A1D06] ring-[1.5px] ring-[#6B2D0B]";

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
  const hasLongCopy = copyText.length > 90;
  const durationLabel = formatVideoDuration(ad.duration_seconds);
  const displayDomain = extractDisplayDomain(ad.landing_page_url, ad.brand_handle);
  const displayHeadline = (ad.headline || "").trim() || ad.brand_name;
  const ctaLabel = (ad.cta_text || "").trim() || "Shop Now";
  const duplicatedCount = ad.duplicated_count ?? 1;
  const primaryCountry = resolvePrimaryCountry(ad);
  const hasReach = typeof ad.eu_reach === "number" && ad.eu_reach > 0;
  const estimatedSpendVal = hasReach
    ? ad.estimated_spend && ad.estimated_spend > 0
      ? ad.estimated_spend
      : Math.round(((ad.eu_reach || 0) / 1000) * assumedCpm)
    : null;

  return (
    <article
      ref={cardRef}
      className="cv-ad-card group relative flex flex-col rounded-[12px] border border-[#ebebf3] bg-white shadow-none transition-colors duration-150 hover:border-[#d6d6e0]"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* 1. ATRIA CARD HEADER: 40x40 Avatar + Bold Brand Name + Green Active Dot & Reuse + Borderless Bookmark / ... */}
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
            {ad.brand_logo_url && !avatarFailed ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={ad.brand_logo_url}
                alt={ad.brand_name}
                onError={() => setAvatarFailed(true)}
                className="h-10 w-10 rounded-full border border-[#ebebf3] bg-black/[0.04] object-contain p-0.5"
              />
            ) : (
              <span
                className="flex h-10 w-10 items-center justify-center rounded-full border border-[#ebebf3] font-display text-[12px] font-bold text-white"
                style={{ backgroundColor: ad.brand_avatar_color || "#0F172A" }}
              >
                {ad.brand_avatar_initials}
              </span>
            )}
            {!isOrganic && rank && rank <= 3 && (
              <span
                className={`absolute -left-1 -top-1 inline-flex h-[17px] w-[17px] shrink-0 items-center justify-center rounded-full font-sans text-[9.5px] font-bold leading-none tabular-nums ${rankBadgeStyle}`}
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
                className="truncate text-left font-sans text-[14.5px] font-bold leading-tight text-[#0F172A] hover:underline"
              >
                {ad.brand_name}
              </button>
            </div>

            <div className="mt-1 flex flex-wrap items-center gap-2">
              {isOrganic ? (
                <span className="inline-flex items-center gap-1 text-[12px] font-medium text-[#64748B]">
                  {isInstagram ? (
                    <>
                      <InstagramColorIcon className="h-3.5 w-3.5 shrink-0" />
                      Reel
                    </>
                  ) : (
                    <>
                      <Film className="h-3.5 w-3.5 shrink-0 text-[#64748B]" />
                      Video
                    </>
                  )}
                </span>
              ) : (
                <span
                  className={`inline-flex items-center gap-1.5 font-mono-num text-[12.5px] font-semibold ${
                    ad.is_active ? "text-[#2e5400]" : "text-[#64748B]"
                  }`}
                >
                  <span
                    className={`h-2 w-2 rounded-full ${
                      ad.is_active
                        ? "bg-[#5daa1e] ring-[3px] ring-[#e7ffd3]"
                        : "bg-[#94A3B8]"
                    }`}
                  />
                  {activeDays}d
                </span>
              )}

              {duplicatedCount > 1 && (
                <span className="inline-flex items-center gap-0.5 font-mono-num text-[12.5px] font-semibold text-[#475569]">
                  <Copy className="h-3 w-3 text-[#64748B]" />
                  &times;{duplicatedCount}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Top-Right Borderless Monochrome Actions: Bookmark + ... Menu */}
        <div
          className="relative flex shrink-0 items-center gap-0.5"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            ref={folderBtnRef}
            type="button"
            data-no-glass="true"
            title={
              inFolders
                ? savedBoardName
                  ? `Saved in ${savedBoardName}`
                  : `Saved in ${ad.board_ids.length} folders`
                : "Save to board"
            }
            aria-label="Save to board"
            onClick={() => {
              setMoreMenuOpen(false);
              setFolderMenuOpen((v) => !v);
            }}
            className="flex h-7 w-7 items-center justify-center rounded-[6px] text-[#64748B] transition-colors hover:bg-black/[0.04] hover:text-[#0F172A]"
          >
            <Bookmark
              className={`h-[18px] w-[18px] ${
                inFolders ? "text-[#0F172A]" : "text-[#64748B]"
              }`}
              fill={inFolders ? "currentColor" : "none"}
            />
          </button>

          <button
            ref={moreBtnRef}
            type="button"
            data-no-glass="true"
            title="More options"
            aria-label="More options"
            onClick={() => {
              setFolderMenuOpen(false);
              setMoreMenuOpen((v) => !v);
            }}
            className="flex h-7 w-7 items-center justify-center rounded-[6px] text-[#64748B] transition-colors hover:bg-black/[0.04] hover:text-[#0F172A]"
          >
            <MoreHorizontal className="h-[18px] w-[18px] text-[#64748B]" />
          </button>

          {/* Save to Board Popover */}
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
              <p className="px-2.5 py-1 text-[10.5px] font-semibold uppercase tracking-wider text-[#64748B]">
                Save to board
              </p>
              {boards.length === 0 ? (
                <p className="px-2.5 py-2 text-xs text-[#94A3B8]">
                  Create a board in the sidebar first.
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
                      className={`flex w-full items-center justify-between rounded-[8px] px-2.5 py-2 text-left text-[12.5px] transition-colors ${
                        selected
                          ? "bg-[#f5f5fa] font-semibold text-[#0F172A]"
                          : "font-medium text-[#0F172A] hover:bg-[#f5f5fa]"
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
                        <Check className="h-3.5 w-3.5 shrink-0 text-[#0F172A]" />
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </FlakePopover>

          {/* More (...) Action Menu */}
          <FlakePopover
            open={moreMenuOpen}
            onOpenChange={setMoreMenuOpen}
            anchorRef={moreBtnRef}
            align="right"
            preferredPlacement="bottom"
            minWidth={196}
            maxHeight={260}
          >
            <div className="p-1.5">
              {onCloneAd && !isOrganic && (
                <button
                  type="button"
                  data-no-glass="true"
                  onClick={() => {
                    setMoreMenuOpen(false);
                    onCloneAd(ad);
                  }}
                  className="flex w-full items-center gap-2 rounded-[8px] px-2.5 py-2 text-left text-[12.5px] font-medium text-[#0F172A] transition-colors hover:bg-[#f5f5fa]"
                >
                  <Sparkles className="h-3.5 w-3.5 text-[#475569]" />
                  <span>Clone ad to Ad Maker</span>
                </button>
              )}

              {onToggleFollow && !isOrganic && (
                <button
                  type="button"
                  data-no-glass="true"
                  onClick={() => {
                    setMoreMenuOpen(false);
                    onToggleFollow(ad.brand_id);
                  }}
                  className="flex w-full items-center gap-2 rounded-[8px] px-2.5 py-2 text-left text-[12.5px] font-medium text-[#0F172A] transition-colors hover:bg-[#f5f5fa]"
                >
                  {isFollowed ? (
                    <Check className="h-3.5 w-3.5 text-[#475569]" />
                  ) : (
                    <Plus className="h-3.5 w-3.5 text-[#475569]" />
                  )}
                  <span>{isFollowed ? "Unfollow brand" : "Follow brand"}</span>
                </button>
              )}

              {onOpenBrand && !isOrganic && (
                <button
                  type="button"
                  data-no-glass="true"
                  onClick={() => {
                    setMoreMenuOpen(false);
                    onOpenBrand(ad.brand_id);
                  }}
                  className="flex w-full items-center gap-2 rounded-[8px] px-2.5 py-2 text-left text-[12.5px] font-medium text-[#0F172A] transition-colors hover:bg-[#f5f5fa]"
                >
                  <Store className="h-3.5 w-3.5 text-[#475569]" />
                  <span>View brand profile</span>
                </button>
              )}

              <button
                type="button"
                data-no-glass="true"
                onClick={() => {
                  setMoreMenuOpen(false);
                  onOpen(ad);
                }}
                className="flex w-full items-center gap-2 rounded-[8px] px-2.5 py-2 text-left text-[12.5px] font-medium text-[#0F172A] transition-colors hover:bg-[#f5f5fa]"
              >
                <ExternalLink className="h-3.5 w-3.5 text-[#475569]" />
                <span>Open ad details</span>
              </button>
            </div>
          </FlakePopover>
        </div>
      </div>

      {/* 2. ATRIA STATS STRIP: Reach + Est. Spend + Country Flag (or Primary Market Country) */}
      <div className="mx-3 mb-1.5 mt-2 flex items-center justify-between gap-2 rounded-[6px] bg-black/[0.025] px-2.5 py-1.5 text-[12px] font-semibold text-[#0F172A]">
        {hasReach ? (
          <>
            <div className="flex min-w-0 items-center gap-3">
              <span className="inline-flex items-center gap-1 font-mono-num">
                <Users className="h-3.5 w-3.5 shrink-0 text-[#475569]" />
                {formatReach(ad.eu_reach)}
              </span>
              {estimatedSpendVal !== null && (
                <span className="inline-flex items-center gap-1 font-mono-num">
                  <CircleDollarSign className="h-3.5 w-3.5 shrink-0 text-[#475569]" />
                  {formatCompactSpend(estimatedSpendVal)}
                </span>
              )}
            </div>
            <span
              title={primaryCountry.name}
              className="flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full text-[13px] leading-none"
            >
              {primaryCountry.flag}
            </span>
          </>
        ) : (
          <div className="flex min-w-0 items-center gap-1.5 truncate">
            <span className="text-[13px] leading-none">
              {primaryCountry.flag}
            </span>
            <span className="truncate font-medium text-[#0F172A]">
              {primaryCountry.name}
            </span>
          </div>
        )}
      </div>

      {/* 3. AD COPY PREVIEW (Atria 2-line clean clamp + subtle expand) */}
      {!compact && copyText && (
        <div className="relative px-3 pb-2.5 pt-0.5">
          <p
            onClick={() => onOpen(ad)}
            className={`cursor-pointer whitespace-pre-line text-[13px] leading-[1.42] text-[#0F172A]/85 ${
              copyExpanded ? "" : "line-clamp-2"
            }`}
          >
            {copyText}
          </p>

          {hasLongCopy && !copyExpanded && (
            <button
              type="button"
              data-no-glass="true"
              onClick={(e) => {
                e.stopPropagation();
                setCopyExpanded(true);
              }}
              className="mt-0.5 text-[11.5px] font-medium text-[#64748B] transition-colors hover:text-[#0F172A]"
            >
              See more
            </button>
          )}

          {hasLongCopy && copyExpanded && (
            <button
              type="button"
              data-no-glass="true"
              onClick={(e) => {
                e.stopPropagation();
                setCopyExpanded(false);
              }}
              className="mt-0.5 text-[11.5px] font-medium text-[#64748B] transition-colors hover:text-[#0F172A]"
            >
              See less
            </button>
          )}
        </div>
      )}

      {/* 4. TRUE-ASPECT FULL-WIDTH CREATIVE MEDIA VIEWPORT (never crops 1:1, 4:5, or 9:16) */}
      <div className={compact || !copyText ? "mt-1" : ""}>
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
          className="relative w-full cursor-pointer overflow-hidden bg-[#f5f5fa]"
        >
          {isVideoFile && (isHovered || !primaryImg) && !videoFailed ? (
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
              onError={() => setVideoFailed(true)}
              className="h-full w-full bg-black object-contain"
            />
          ) : primaryImg ? (
            <>
              {!imgLoaded && (
                <div
                  className="skeleton-shimmer absolute inset-0"
                  aria-hidden="true"
                />
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
                  setImgLoaded(false);
                  setImgStage((prev) => prev + 1);
                }}
                className={`h-full w-full object-contain transition-all duration-300 ease-out group-hover:scale-[1.015] ${
                  imgLoaded ? "opacity-100" : "opacity-0"
                }`}
              />
            </>
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-[#f5f5fa] p-5 text-center">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0F172A] font-display text-xs font-bold text-white">
                {ad.brand_avatar_initials}
              </span>
              <p className="line-clamp-2 max-w-[180px] text-xs font-medium text-[#475569]">
                {ad.headline}
              </p>
            </div>
          )}

          {/* Top-Left Light Frosted Video Duration Pill (Atria exact style, no Clock icon) */}
          {activeMediaType === "video" && (
            <div className="pointer-events-none absolute left-2.5 top-2.5 z-10">
              <span className="inline-flex items-center rounded-[4px] bg-white/85 px-1.5 py-0.5 font-mono-num text-[11px] font-semibold text-[#0F172A] backdrop-blur-sm">
                {durationLabel || "00:24"}
              </span>
            </div>
          )}

          {/* Atria Circular Play Button (52x52, dark -> crisp white on hover) */}
          {activeMediaType === "video" && !isHovered && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <span className="flex h-[52px] w-[52px] items-center justify-center rounded-full bg-black/45 text-white transition-all duration-200 group-hover:bg-white/95 group-hover:text-[#0F172A]">
                <Play className="ml-0.5 h-5 w-5 fill-current" />
              </span>
            </div>
          )}

          {/* Interactive Carousel Controls (Arrows + Slide Counter + Dots) */}
          {carouselSlides && (
            <>
              <div className="pointer-events-none absolute right-2.5 top-2.5">
                <span className="inline-flex items-center gap-1 rounded-[4px] bg-white/85 px-1.5 py-0.5 font-mono-num text-[11px] font-semibold text-[#0F172A] backdrop-blur-sm">
                  <Layers className="h-3 w-3 text-[#475569]" />
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
                className="absolute left-2 top-1/2 z-10 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-[#0F172A] shadow-xs transition-all hover:bg-white sm:opacity-0 sm:group-hover:opacity-100"
              >
                <ChevronLeft className="h-4 w-4 text-[#0F172A]" />
              </button>

              <button
                type="button"
                data-no-glass="true"
                aria-label="Next slide"
                onClick={(e) => {
                  e.stopPropagation();
                  stepSlide(1);
                }}
                className="absolute right-2 top-1/2 z-10 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-[#0F172A] shadow-xs transition-all hover:bg-white sm:opacity-0 sm:group-hover:opacity-100"
              >
                <ChevronRight className="h-4 w-4 text-[#0F172A]" />
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
                      setImgStage(0);
                      setVideoFailed(false);
                      setImgLoaded(false);
                      setSlideIdx(idx);
                    }}
                    className={`h-1.5 rounded-full transition-all ${
                      idx === safeSlideIdx
                        ? "w-4 bg-white shadow-xs"
                        : "w-1.5 bg-white/60 hover:bg-white/90"
                    }`}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* 5. ATRIA BOTTOM DOMAIN + HEADLINE + BORDERLESS NEUTRAL CTA FOOTER */}
      <div
        onClick={() => onOpen(ad)}
        className="flex cursor-pointer items-center justify-between gap-2 rounded-b-[12px] border-t border-[#f1f3f7] bg-white px-3 py-2.5 transition-colors hover:bg-[#FAFBFD]"
      >
        <div className="min-w-0 flex-1">
          <p className="truncate text-[12px] font-normal text-[#64748B]">
            {displayDomain}
          </p>
          <p className="truncate text-[13px] font-semibold text-[#0F172A]">
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
          className="max-w-[110px] shrink-0 truncate rounded-[6px] bg-black/[0.04] px-2.5 py-1.5 text-[12.5px] font-medium text-[#0F172A] transition-colors hover:bg-black/[0.08]"
        >
          {ctaLabel}
        </button>
      </div>
    </article>
  );
});
