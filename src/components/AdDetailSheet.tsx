"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowUpRight,
  Bookmark,
  Captions,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Copy,
  Download,
  ExternalLink,
  Eye,
  Film,
  Globe,
  Image as ImageIcon,
  Layers,
  Link2,
  Loader2,
  MousePointerClick,
  Pencil,
  Sparkles,
  StickyNote,
  Trash2,
  Upload,
  Users,
  VolumeX,
  X,
} from "lucide-react";
import type { Ad, Board } from "@/lib/types";
import type { AdRankingMeta } from "@/lib/ad-ranking";
import { getAdSpendDkk, summarizeAdAudience } from "@/lib/audience-insights";
import { formatReach, getActiveDays } from "@/lib/url-parser";
import { preloadImage, preloadVideo } from "@/lib/media-preloader";
import {
  FacebookColorIcon,
  InstagramColorIcon,
  MetaInfinityIcon,
} from "./BrandIcons";
import { FlakePopover } from "./ui/FlakeDropdown";

interface AdDetailSheetProps {
  ad: Ad | null;
  rankMeta?: AdRankingMeta;
  adsList?: Ad[];
  boards: Board[];
  onClose: () => void;
  onSelectAd?: (adId: string) => void;
  onUpdateAd: (adId: string, patch: Partial<Ad>) => void;
  onDeleteAd?: (adId: string) => void;
  onToggleBoard: (adId: string, boardId: string) => void;
  onOpenBrand?: (brandId: string) => void;
  onCloneAd?: (ad: Ad) => void;
  onAskSnow?: (ad: Ad) => void;
}

function formatIsoDate(iso?: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toISOString().slice(0, 10);
}

function formatReadableDate(iso?: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function AdDetailSheet({
  ad,
  rankMeta,
  adsList = [],
  boards,
  onClose,
  onSelectAd,
  onUpdateAd,
  onDeleteAd,
  onToggleBoard,
  onOpenBrand,
  onCloneAd,
  onAskSnow,
}: AdDetailSheetProps) {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [copyExpanded, setCopyExpanded] = useState(false);
  const [folderMenuOpen, setFolderMenuOpen] = useState(false);
  const folderBtnRef = useRef<HTMLButtonElement | null>(null);
  const [rightTab, setRightTab] = useState<"details" | "script">("details");
  const [failedAdId, setFailedAdId] = useState<string | null>(null);
  const [carouselIdx, setCarouselIdx] = useState(0);
  const touchStartXRef = useRef<number | null>(null);

  // Inline edit state for uploaded / imported organic media
  const [editingMedia, setEditingMedia] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editHandle, setEditHandle] = useState("");
  const [editCaption, setEditCaption] = useState("");
  const [editSourceUrl, setEditSourceUrl] = useState("");
  const [editThumbUrl, setEditThumbUrl] = useState("");
  const [editMediaUrl, setEditMediaUrl] = useState("");
  const [editMediaType, setEditMediaType] = useState<"video" | "image">("video");
  const [uploadingAsset, setUploadingAsset] = useState<"thumb" | "media" | null>(null);
  const [editError, setEditError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const thumbFileRef = useRef<HTMLInputElement | null>(null);
  const mediaFileRef = useRef<HTMLInputElement | null>(null);

  // Reset inline edit & carousel slide state when switching ads
  useEffect(() => {
    setEditingMedia(false);
    setConfirmDelete(false);
    setEditError(null);
    setUploadingAsset(null);
    setCarouselIdx(0);
  }, [ad?.id]);

  const startEditMedia = () => {
    if (!ad) return;
    setEditTitle(ad.brand_name || ad.headline || "");
    setEditHandle(ad.brand_handle || "");
    setEditCaption(ad.primary_text || "");
    setEditSourceUrl(ad.source_url || "");
    setEditThumbUrl(ad.thumbnail_url || "");
    setEditMediaUrl(ad.media_url || "");
    setEditMediaType(ad.media_type === "video" ? "video" : "image");
    setEditError(null);
    setConfirmDelete(false);
    setEditingMedia(true);
  };

  const uploadReplacementAsset = async (
    file: File,
    kind: "thumb" | "media"
  ) => {
    if (file.size > 50 * 1024 * 1024) {
      setEditError("Filen er over 50 MB grænsen.");
      return;
    }
    setUploadingAsset(kind);
    setEditError(null);
    try {
      const signRes = await fetch("/api/folder-video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "sign_upload",
          filename: file.name || (kind === "thumb" ? "cover.jpg" : "media.mp4"),
          contentType: file.type || (kind === "thumb" ? "image/jpeg" : "video/mp4"),
        }),
      });
      const signData = await signRes.json();
      if (!signRes.ok || !signData.ok || !signData.uploadUrl || !signData.publicUrl) {
        throw new Error(signData.error || "Kunne ikke klargøre upload.");
      }
      const fd = new FormData();
      fd.append("cacheControl", "3600");
      fd.append("", file, file.name || (kind === "thumb" ? "cover.jpg" : "media.mp4"));
      const putRes = await fetch(signData.uploadUrl, {
        method: "PUT",
        body: fd,
      });
      if (!putRes.ok) {
        throw new Error(`Upload fejlede (HTTP ${putRes.status}).`);
      }
      if (kind === "thumb") {
        setEditThumbUrl(signData.publicUrl);
      } else {
        const isImg =
          file.type.startsWith("image/") ||
          /\.(jpg|jpeg|png|webp|gif|heic)$/i.test(file.name);
        setEditMediaUrl(signData.publicUrl);
        setEditMediaType(isImg ? "image" : "video");
        if (isImg) setEditThumbUrl(signData.publicUrl);
      }
    } catch (err) {
      setEditError(err instanceof Error ? err.message : "Upload fejlede.");
    } finally {
      setUploadingAsset(null);
    }
  };

  const saveEditMedia = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ad) return;
    const cleanTitle = editTitle.trim() || ad.brand_name || "Upload";
    const cleanHandle = editHandle.trim();
    const cleanCaption = editCaption.trim();
    const cleanSource = editSourceUrl.trim();
    const initials = cleanTitle
      .replace(/^@/, "")
      .split(/\s+/)
      .map((w) => w[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "UP";

    const nextMediaUrl = editMediaUrl || ad.media_url;
    const nextThumbUrl = editThumbUrl || ad.thumbnail_url || nextMediaUrl;

    onUpdateAd(ad.id, {
      brand_name: cleanTitle,
      headline: cleanTitle,
      brand_handle: cleanHandle || ad.brand_handle,
      brand_avatar_initials: initials,
      primary_text: cleanCaption,
      extracted_hook: cleanCaption.split(/[.!?\n]/)[0]?.slice(0, 110) || cleanTitle,
      source_url: cleanSource || ad.source_url,
      media_url: nextMediaUrl,
      thumbnail_url: nextThumbUrl,
      media_type: editMediaType,
      display_format: editMediaType === "video" ? "VIDEO" : "IMAGE",
      ai_format: editMediaType === "video" ? "Organic Video" : "Organic Image",
    });
    setFailedAdId(null);
    setEditingMedia(false);
  };

  // Video transcription state (Deepgram Nova-2 — automatic on video open)
  const [transcribing, setTranscribing] = useState(false);
  const [transcribeErrorByAdId, setTranscribeErrorByAdId] = useState<
    Record<string, string>
  >({});
  const autoTranscribedRef = useRef<Set<string>>(new Set());
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [autoplayMuted, setAutoplayMuted] = useState(false);

  const isOrganic = Boolean(
    ad &&
      (ad.source_type === "instagram" ||
        ad.source_type === "manual" ||
        ad.tags.includes("custom-import") ||
        ad.tags.includes("custom-upload"))
  );
  const isInstagram = Boolean(
    ad && (ad.source_type === "instagram" || ad.tags.includes("instagram"))
  );

  const activeDays = useMemo(
    () => (ad ? getActiveDays(ad.started_running_at) : 0),
    [ad]
  );

  const audience = useMemo(
    () => (ad && !isOrganic ? summarizeAdAudience(ad) : null),
    [ad, isOrganic]
  );

  const spendInfo = useMemo(
    () => (ad && !isOrganic ? getAdSpendDkk(ad, activeDays) : null),
    [ad, isOrganic, activeDays]
  );

  // Stop any synced audio element when switching or closing video
  useEffect(() => {
    const audioEl = audioRef.current;
    return () => {
      if (audioEl) {
        audioEl.pause();
        audioEl.currentTime = 0;
      }
    };
  }, [ad?.id]);

  // Smart autoplay on desktop & iPhone: try with sound first, instantly fall back to muted inline autoplay if iOS/browser blocks unmuted
  useEffect(() => {
    if (!ad) return;
    const isVid =
      ad.media_type === "video" && /\.(mp4|webm|mov)(\?|$)/i.test(ad.media_url);
    if (!isVid) return;

    let cancelled = false;
    setAutoplayMuted(false);

    const startPlayback = async () => {
      const videoEl = videoRef.current;
      if (!videoEl || cancelled) return;
      try {
        videoEl.muted = false;
        await videoEl.play();
        if (!cancelled) setAutoplayMuted(false);
      } catch {
        if (cancelled || !videoRef.current) return;
        try {
          videoRef.current.muted = true;
          await videoRef.current.play();
          if (!cancelled) setAutoplayMuted(true);
        } catch {
          // Browser blocked even muted autoplay; user can tap play manually
        }
      }
    };

    const raf = requestAnimationFrame(() => {
      void startPlayback();
    });
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
    };
  }, [ad]);

  // Automatically transcribe video ads/organic videos via Deepgram when opened
  useEffect(() => {
    if (!ad) return;
    if (ad.media_type !== "video") return;
    const transcribeTarget = ad.audio_url || ad.media_url;
    if (!transcribeTarget || !/^https?:\/\//i.test(transcribeTarget)) return;
    if (ad.ai_transcript) return;
    if (autoTranscribedRef.current.has(ad.id)) return;

    autoTranscribedRef.current.add(ad.id);
    let cancelled = false;

    const runAutoTranscribe = async () => {
      setTranscribing(true);
      try {
        const res = await fetch("/api/transcribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ad,
            adId: ad.id,
            videoUrl: transcribeTarget,
            market: ad.market,
          }),
        });
        const data = await res.json();
        if (cancelled) return;
        if (data.ok && data.transcript) {
          onUpdateAd(ad.id, {
            ai_transcript: data.transcript,
            ai_hook_verbal: data.hook || ad.ai_hook_verbal,
            duration_seconds: data.durationSec || ad.duration_seconds,
          });
        } else if (data.message) {
          setTranscribeErrorByAdId((prev) => ({
            ...prev,
            [ad.id]: data.message,
          }));
        }
      } catch {
        if (!cancelled) {
          setTranscribeErrorByAdId((prev) => ({
            ...prev,
            [ad.id]: "Netværksfejl ved automatisk transskription.",
          }));
        }
      } finally {
        if (!cancelled) setTranscribing(false);
      }
    };

    runAutoTranscribe();
    return () => {
      cancelled = true;
    };
  }, [ad, onUpdateAd]);

  const currentIdx = useMemo(() => {
    if (!ad || adsList.length === 0) return -1;
    return adsList.findIndex((item) => item.id === ad.id);
  }, [ad, adsList]);

  const hasPrev = currentIdx > 0 && Boolean(onSelectAd);
  const hasNext =
    currentIdx >= 0 && currentIdx < adsList.length - 1 && Boolean(onSelectAd);

  // Preload adjacent ads (+1, +2, -1) so prev/next navigation plays instantaneously
  useEffect(() => {
    if (!ad || currentIdx < 0) return;
    const neighbors = [
      adsList[currentIdx + 1],
      adsList[currentIdx + 2],
      adsList[currentIdx - 1],
    ].filter(Boolean);
    for (const n of neighbors) {
      preloadImage(n.thumbnail_url || n.fallback_image_url || n.media_url);
      if (n.media_type === "video" && n.media_url) {
        preloadVideo(n.media_url);
      }
    }
  }, [ad, adsList, currentIdx]);

  // Keyboard shortcuts: Escape to close, Left/Right to cycle ads
  useEffect(() => {
    if (!ad) return;
    const onKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "TEXTAREA" || tag === "INPUT") return;
      if (e.key === "Escape") {
        onClose();
      } else if (e.key === "ArrowLeft" && hasPrev && onSelectAd) {
        onSelectAd(adsList[currentIdx - 1].id);
      } else if (e.key === "ArrowRight" && hasNext && onSelectAd) {
        onSelectAd(adsList[currentIdx + 1].id);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [ad, adsList, currentIdx, hasNext, hasPrev, onClose, onSelectAd]);

  if (!ad) return null;

  const mediaFailed = failedAdId === ad.id;
  const transcribeError = transcribeErrorByAdId[ad.id] || null;

  const carouselSlides =
    Array.isArray(ad.carousel_cards) && ad.carousel_cards.length >= 2
      ? ad.carousel_cards
      : null;
  const safeSlideIdx = carouselSlides
    ? Math.min(carouselIdx, carouselSlides.length - 1)
    : 0;
  const activeSlide = carouselSlides ? carouselSlides[safeSlideIdx] : null;

  const activeMediaUrl = activeSlide ? activeSlide.media_url : ad.media_url;
  const activeMediaType = activeSlide ? activeSlide.media_type : ad.media_type;

  const isVideoFile =
    !mediaFailed &&
    activeMediaType === "video" &&
    /\.(mp4|webm|mov)(\?|$)/i.test(activeMediaUrl);

  const displayImage = mediaFailed
    ? ad.fallback_image_url || ""
    : activeSlide
      ? activeSlide.thumbnail_url ||
        (!isVideoFile ? activeSlide.media_url : "") ||
        ad.thumbnail_url ||
        ""
      : ad.thumbnail_url || ad.fallback_image_url || ad.media_url || "";

  const downloadUrl = isVideoFile ? activeMediaUrl : displayImage;
  const activeLandingUrl = activeSlide?.landing_page_url || ad.landing_page_url;
  const activeHeadline = activeSlide?.headline || ad.headline || ad.brand_name;
  const activeLinkDescription =
    activeSlide?.link_description || ad.link_description;
  const activeCtaText = activeSlide?.cta_text || ad.cta_text || "Learn more";

  const domain = activeLandingUrl
    ? activeLandingUrl.replace(/^https?:\/\/(www\.)?/, "").replace(/\/.*$/, "")
    : "";

  const stepCarousel = (delta: number) => {
    if (!carouselSlides) return;
    setFailedAdId(null);
    setCarouselIdx(
      (prev) => (prev + delta + carouselSlides.length) % carouselSlides.length
    );
  };

  const savedFoldersCount = ad.board_ids.length;
  const formatLabel = carouselSlides
    ? `Carousel (${carouselSlides.length})`
    : ad.display_format === "VIDEO" || ad.media_type === "video"
      ? "Video"
      : ad.display_format === "CAROUSEL" || ad.media_type === "carousel"
        ? "Carousel"
        : ad.display_format === "DCO"
          ? "DCO"
          : "Image";

  const copyText = async (key: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 1800);
    } catch {
      // ignore
    }
  };

  return (
    <div
      className="flake-modal-backdrop z-[80] flex items-end justify-center bg-[#050811]/60 p-0 pt-[max(0.75rem,env(safe-area-inset-top))] backdrop-blur-[2px] lg:pt-14"
      onClick={onClose}
    >
      <div
        className="animate-sheet-up flex h-full w-full flex-col overflow-hidden rounded-t-[18px] border-t border-[#E6E9F0] bg-white text-[#0F172A] shadow-[0_-12px_50px_rgba(5,8,17,0.28)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ===================================================================
            PINNED MOBILE TOP BAR (always visible so user can easily close/nav)
           =================================================================== */}
        <div className="flex shrink-0 items-center justify-between gap-2 border-b border-[#ECEFF5] bg-white px-3.5 py-2.5 lg:hidden">
          <div className="flex min-w-0 items-center gap-2">
            {adsList.length > 1 && currentIdx >= 0 && onSelectAd && (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  disabled={!hasPrev}
                  onClick={() =>
                    hasPrev && onSelectAd(adsList[currentIdx - 1].id)
                  }
                  aria-label="Forrige annonce"
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#E6E9F0] bg-white text-[#475569] active:bg-[#F5F7FA] disabled:opacity-35"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="px-1 font-mono-num text-[11.5px] font-medium text-[#64748B]">
                  {currentIdx + 1}/{adsList.length}
                </span>
                <button
                  type="button"
                  disabled={!hasNext}
                  onClick={() =>
                    hasNext && onSelectAd(adsList[currentIdx + 1].id)
                  }
                  aria-label="Næste annonce"
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#E6E9F0] bg-white text-[#475569] active:bg-[#F5F7FA] disabled:opacity-35"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            )}
            <span className="inline-flex min-w-0 items-center gap-1.5 truncate rounded-lg bg-[#F5F7FA] px-2.5 py-1 text-[11.5px] font-medium text-[#334155]">
              {isInstagram ? (
                <InstagramColorIcon className="h-3.5 w-3.5 shrink-0" />
              ) : isOrganic ? (
                <Film className="h-3.5 w-3.5 shrink-0 text-[#64748B]" />
              ) : (
                <FacebookColorIcon className="h-3.5 w-3.5 shrink-0" />
              )}
              <span className="truncate">
                {isInstagram
                  ? ad.media_type === "video"
                    ? "Instagram Reel"
                    : "Instagram"
                  : isOrganic
                    ? "Upload"
                    : formatLabel}
              </span>
            </span>
          </div>

          <div className="flex shrink-0 items-center gap-1.5">
            {downloadUrl && (
              <a
                href={downloadUrl}
                target="_blank"
                rel="noreferrer"
                download
                title="Download medie"
                className="flex h-8 w-8 items-center justify-center rounded-lg text-[#475569] active:bg-[#F3F5F9]"
              >
                <Download className="h-4 w-4" />
              </a>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label="Luk"
              className="inline-flex h-8 items-center gap-1 rounded-full bg-[#F1F5F9] px-3 text-[12px] font-semibold text-[#0F172A] active:bg-[#E2E8F0]"
            >
              <X className="h-3.5 w-3.5" />
              Luk
            </button>
          </div>
        </div>

        {/* ===================================================================
            BODY: SINGLE VERTICAL SCROLL ON MOBILE · 60/40 SPLIT ON DESKTOP
           =================================================================== */}
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain lg:flex-row lg:overflow-hidden">
        {/* ===================================================================
            LEFT PANE: FULL-HEIGHT TRENDTRACK-STYLE AD PREVIEW STAGE
           =================================================================== */}
        <div className="flex shrink-0 flex-col bg-[#FAFBFD] lg:min-h-0 lg:w-[60%] lg:shrink lg:border-r lg:border-[#ECEFF5]">
          {/* Desktop Top Toolbar (Prev/Next + Platform Pill + Shop Action + Quick Icons) */}
          <div className="hidden shrink-0 items-center justify-between gap-2 border-b border-[#ECEFF5] bg-white px-4 py-2.5 lg:flex">
            <div className="flex min-w-0 items-center gap-2">
              {adsList.length > 1 && currentIdx >= 0 && onSelectAd && (
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    disabled={!hasPrev}
                    onClick={() =>
                      hasPrev && onSelectAd(adsList[currentIdx - 1].id)
                    }
                    aria-label="Forrige annonce"
                    className="flex h-7 w-7 items-center justify-center rounded-lg border border-[#E6E9F0] bg-white text-[#475569] transition-colors hover:bg-[#F5F7FA] hover:text-[#0F172A] disabled:opacity-35"
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                  </button>
                  <span className="px-1 font-mono-num text-[11.5px] font-medium text-[#64748B]">
                    {currentIdx + 1} / {adsList.length}
                  </span>
                  <button
                    type="button"
                    disabled={!hasNext}
                    onClick={() =>
                      hasNext && onSelectAd(adsList[currentIdx + 1].id)
                    }
                    aria-label="Næste annonce"
                    className="flex h-7 w-7 items-center justify-center rounded-lg border border-[#E6E9F0] bg-white text-[#475569] transition-colors hover:bg-[#F5F7FA] hover:text-[#0F172A] disabled:opacity-35"
                  >
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}

              <span className="inline-flex items-center gap-1.5 rounded-lg bg-[#F5F7FA] px-2.5 py-1 text-[11.5px] font-medium text-[#334155]">
                {isInstagram ? (
                  <>
                    <InstagramColorIcon className="h-3.5 w-3.5 shrink-0" />
                    <span>Instagram</span>
                    <span className="text-[#CBD5E1]">·</span>
                    <span className="text-[#64748B]">
                      {ad.media_type === "video" ? "Reel" : "Post"}
                    </span>
                  </>
                ) : isOrganic ? (
                  <>
                    <Film className="h-3.5 w-3.5 shrink-0 text-[#64748B]" />
                    <span>Upload</span>
                    <span className="text-[#CBD5E1]">·</span>
                    <span className="text-[#64748B]">{formatLabel}</span>
                  </>
                ) : (
                  <>
                    <FacebookColorIcon className="h-3.5 w-3.5 shrink-0" />
                    <span>Facebook</span>
                    <span className="text-[#CBD5E1]">·</span>
                    <span className="text-[#64748B]">{formatLabel}</span>
                  </>
                )}
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              {!isOrganic && onOpenBrand && (
                <button
                  type="button"
                  onClick={() => {
                    onOpenBrand(ad.brand_id);
                    onClose();
                  }}
                  className="hidden items-center gap-1.5 rounded-lg bg-[#0F172A] px-3 py-1.5 text-[11.5px] font-semibold text-white transition-colors hover:bg-[#0027eb] sm:inline-flex"
                >
                  <Eye className="h-3.5 w-3.5" />
                  Open Shop Analytics
                </button>
              )}

              {ad.source_url && (
                <button
                  type="button"
                  onClick={() => copyText("link", ad.source_url || "")}
                  title="Kopiér annonce-link"
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-[#475569] transition-colors hover:bg-[#F3F5F9] hover:text-[#0F172A]"
                >
                  {copiedKey === "link" ? (
                    <Check className="h-3.5 w-3.5 text-[#16A34A]" />
                  ) : (
                    <Link2 className="h-3.5 w-3.5" />
                  )}
                </button>
              )}

              {ad.primary_text && (
                <button
                  type="button"
                  onClick={() => copyText("copy_top", ad.primary_text)}
                  title="Kopiér annoncetekst"
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-[#475569] transition-colors hover:bg-[#F3F5F9] hover:text-[#0F172A]"
                >
                  {copiedKey === "copy_top" ? (
                    <Check className="h-3.5 w-3.5 text-[#16A34A]" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                </button>
              )}

              {downloadUrl && (
                <a
                  href={downloadUrl}
                  target="_blank"
                  rel="noreferrer"
                  download
                  title="Download medie"
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-[#475569] transition-colors hover:bg-[#F3F5F9] hover:text-[#0F172A]"
                >
                  <Download className="h-3.5 w-3.5" />
                </a>
              )}

              <button
                type="button"
                onClick={onClose}
                aria-label="Luk"
                className="flex h-8 w-8 items-center justify-center rounded-lg text-[#475569] transition-colors hover:bg-[#F3F5F9] hover:text-[#0F172A] lg:hidden"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Scrollable Centered Authentic Meta Ad Card */}
          <div className="px-3.5 py-4 lg:flex-1 lg:overflow-y-auto lg:px-8 lg:py-6">
            <div className="mx-auto w-full max-w-[490px] overflow-hidden rounded-2xl border border-[#E6E9F0] bg-white shadow-[0_4px_18px_rgba(15,23,42,0.06)]">
              {/* Optional Telemetry Pill Bar (Only for paid Meta Ads) */}
              {!isOrganic && (ad.eu_reach || spendInfo) && (
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#F1F4F9] bg-[#FAFBFD] px-3.5 py-2 font-mono-num text-[11px] font-semibold text-[#334155]">
                  <span className="inline-flex items-center gap-1 text-[#0F172A]">
                    <MetaInfinityIcon className="h-3.5 w-3.5" />
                    Meta Ad
                  </span>
                  <div className="flex items-center gap-1.5">
                    {ad.eu_reach ? (
                      <span className="rounded-md border border-[#E6E9F0] bg-white px-2 py-0.5">
                        {formatReach(ad.eu_reach)} reach
                      </span>
                    ) : null}
                    {spendInfo ? (
                      <>
                        <span className="rounded-md border border-[#E6E9F0] bg-white px-2 py-0.5">
                          ~{spendInfo.formattedTotal}
                        </span>
                        <span className="rounded-md border border-[#E6E9F0] bg-white px-2 py-0.5">
                          ~{spendInfo.formattedDaily}/dag
                        </span>
                      </>
                    ) : null}
                  </div>
                </div>
              )}

              {/* Card Header (Clean Organic Creator Header OR Meta Ad Header) */}
              <div className="px-3.5 pb-2.5 pt-3">
                <div className="flex items-center justify-between gap-2">
                  {isOrganic ? (
                    <div className="flex min-w-0 items-center gap-2.5">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#0F172A] font-display text-xs font-bold text-white">
                        {ad.brand_avatar_initials}
                      </span>
                      <div className="min-w-0">
                        <p className="flex items-center gap-1.5 truncate font-display text-[13.5px] font-bold text-[#0F172A]">
                          {isInstagram && (
                            <InstagramColorIcon className="h-3.5 w-3.5 shrink-0" />
                          )}
                          <span className="truncate">{ad.brand_name}</span>
                        </p>
                        <p className="font-mono-num text-[11px] text-[#64748B]">
                          {isInstagram
                            ? ad.brand_handle
                            : formatReadableDate(ad.created_at) || "Uploaded video"}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        if (onOpenBrand) {
                          onOpenBrand(ad.brand_id);
                          onClose();
                        }
                      }}
                      className="flex min-w-0 items-center gap-2.5 text-left"
                    >
                      {ad.brand_logo_url ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={ad.brand_logo_url}
                          alt={ad.brand_name}
                          className="h-9 w-9 shrink-0 rounded-full border border-[#E6E9F0] bg-white object-contain p-0.5"
                        />
                      ) : (
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#0027eb] font-display text-xs font-bold text-white">
                          {ad.brand_avatar_initials}
                        </span>
                      )}
                      <div className="min-w-0">
                        <p className="flex items-center gap-1.5 truncate font-display text-[13.5px] font-bold text-[#0F172A]">
                          <MetaInfinityIcon className="h-3.5 w-3.5 shrink-0" />
                          <span className="truncate">{ad.brand_name}</span>
                        </p>
                        <p className="font-mono-num text-[11px] text-[#64748B]">
                          {ad.brand_live_ads
                            ? `${ad.brand_live_ads.toLocaleString("en-US")} Live Ads`
                            : ad.brand_handle}
                        </p>
                      </div>
                    </button>
                  )}

                  {!isOrganic && ad.duplicated_count && ad.duplicated_count > 1 && (
                    <span className="inline-flex shrink-0 items-center gap-1 rounded-md bg-[#ECFDF3] px-2 py-0.5 font-mono-num text-[11px] font-semibold text-[#15803D]">
                      <Layers className="h-3 w-3" />
                      {ad.duplicated_count} Duplicated
                    </span>
                  )}
                </div>

                {/* Running status + start date (Only for paid Meta Ads) */}
                {!isOrganic && (
                  <div className="mt-2 flex items-center gap-2 text-[11.5px] text-[#64748B]">
                    {ad.is_active ? (
                      <span className="relative flex h-2 w-2">
                        <span
                          className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#16A34A] opacity-40"
                          style={{ animationDuration: "2.4s" }}
                        />
                        <span className="relative inline-flex h-2 w-2 rounded-full bg-[#16A34A]" />
                      </span>
                    ) : (
                      <span className="h-2 w-2 rounded-full bg-[#94A3B8]" />
                    )}
                    <span className="font-medium text-[#334155]">
                      {activeDays} days
                    </span>
                    {ad.started_running_at && (
                      <>
                        <span className="text-[#CBD5E1]">·</span>
                        <span>{formatReadableDate(ad.started_running_at)}</span>
                      </>
                    )}
                  </div>
                )}

                {/* Primary Ad Copy / Instagram Caption */}
                {ad.primary_text && (
                  <div className="mt-2.5">
                    <p
                      className={`whitespace-pre-wrap text-[12.5px] leading-[1.45] text-[#1E293B] ${
                        copyExpanded ? "" : "line-clamp-3"
                      }`}
                    >
                      {ad.primary_text}
                    </p>
                    {ad.primary_text.length > 130 && (
                      <button
                        type="button"
                        onClick={() => setCopyExpanded((v) => !v)}
                        className="mt-1 text-[11.5px] font-semibold text-[#64748B] hover:text-[#0F172A]"
                      >
                        {copyExpanded ? "See less" : "See more"}
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Creative Media (Swipeable Carousel / Video with synced DASH audio / Image) */}
              <div
                className="relative bg-[#0B0F19]"
                onTouchStart={
                  carouselSlides
                    ? (e) => {
                        touchStartXRef.current = e.touches[0]?.clientX ?? null;
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
                        if (Math.abs(dx) >= 36) {
                          stepCarousel(dx < 0 ? 1 : -1);
                        }
                      }
                    : undefined
                }
              >
                {isVideoFile ? (
                  <>
                    <video
                      ref={videoRef}
                      key={`${ad.id}-${safeSlideIdx}-${activeMediaUrl}`}
                      src={activeMediaUrl}
                      poster={displayImage}
                      autoPlay
                      loop
                      controls
                      playsInline
                      preload="auto"
                      onPlay={(e) => {
                        const a = audioRef.current;
                        if (!a) return;
                        a.currentTime = e.currentTarget.currentTime;
                        a.muted = e.currentTarget.muted;
                        a.volume = e.currentTarget.volume;
                        a.playbackRate = e.currentTarget.playbackRate;
                        a.play().catch(() => {});
                      }}
                      onPause={() => {
                        audioRef.current?.pause();
                      }}
                      onSeeked={(e) => {
                        const a = audioRef.current;
                        if (a) a.currentTime = e.currentTarget.currentTime;
                      }}
                      onVolumeChange={(e) => {
                        if (!e.currentTarget.muted) setAutoplayMuted(false);
                        const a = audioRef.current;
                        if (!a) return;
                        a.muted = e.currentTarget.muted;
                        a.volume = e.currentTarget.volume;
                      }}
                      onRateChange={(e) => {
                        const a = audioRef.current;
                        if (a) a.playbackRate = e.currentTarget.playbackRate;
                      }}
                      onWaiting={() => {
                        audioRef.current?.pause();
                      }}
                      onPlaying={(e) => {
                        const a = audioRef.current;
                        if (!a) return;
                        a.currentTime = e.currentTarget.currentTime;
                        a.play().catch(() => {});
                      }}
                      onEnded={() => {
                        const a = audioRef.current;
                        if (a) {
                          a.pause();
                          a.currentTime = 0;
                        }
                      }}
                      onTimeUpdate={(e) => {
                        const a = audioRef.current;
                        if (!a || e.currentTarget.paused) return;
                        if (Math.abs(a.currentTime - e.currentTarget.currentTime) > 0.18) {
                          a.currentTime = e.currentTarget.currentTime;
                        }
                      }}
                      onError={() => setFailedAdId(ad.id)}
                      className="max-h-[58vh] w-full bg-black object-contain lg:max-h-[68vh]"
                    />
                    {autoplayMuted && (
                      <button
                        type="button"
                        data-no-glass="true"
                        onClick={() => {
                          const v = videoRef.current;
                          const a = audioRef.current;
                          if (v) {
                            v.muted = false;
                            v.volume = 1;
                            v.play().catch(() => {});
                          }
                          if (a) {
                            a.muted = false;
                            a.volume = 1;
                            if (v) a.currentTime = v.currentTime;
                            a.play().catch(() => {});
                          }
                          setAutoplayMuted(false);
                        }}
                        className="absolute right-3 top-3 z-10 inline-flex items-center gap-1.5 rounded-full bg-black/70 px-3 py-1.5 text-[11.5px] font-semibold text-white backdrop-blur-md transition-transform active:scale-95"
                      >
                        <VolumeX className="h-3.5 w-3.5" />
                        Slå lyd til
                      </button>
                    )}
                    {!carouselSlides && ad.audio_url && (
                      <audio
                        ref={audioRef}
                        key={`${ad.id}-audio`}
                        src={ad.audio_url}
                        preload="auto"
                        className="hidden"
                      />
                    )}
                  </>
                ) : displayImage ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={displayImage}
                    alt={activeHeadline}
                    onError={() => {
                      if (!mediaFailed) setFailedAdId(ad.id);
                    }}
                    className="max-h-[58vh] w-full bg-[#F3F5F9] object-contain lg:max-h-[68vh]"
                  />
                ) : (
                  <div className="flex h-64 flex-col items-center justify-center gap-2 bg-[#F5F7FA] text-center">
                    <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#0027eb] font-display text-xs font-bold text-white">
                      {ad.brand_avatar_initials}
                    </span>
                    <p className="text-xs text-[#64748B]">Medie utilgængeligt</p>
                  </div>
                )}

                {/* Carousel Left/Right Arrows & Slide Counter */}
                {carouselSlides && (
                  <>
                    <span className="pointer-events-none absolute right-3 top-3 z-10 inline-flex items-center gap-1 rounded-full border border-white/25 bg-black/60 px-2.5 py-1 font-mono-num text-[11px] font-semibold text-white backdrop-blur-md">
                      <Layers className="h-3 w-3" />
                      {safeSlideIdx + 1} / {carouselSlides.length}
                    </span>

                    <button
                      type="button"
                      data-no-glass="true"
                      onClick={() => stepCarousel(-1)}
                      aria-label="Forrige slide"
                      className="absolute left-3 top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-white/30 bg-black/55 text-white shadow-md backdrop-blur-md transition-all hover:bg-black/80 active:scale-95"
                    >
                      <ChevronLeft className="h-5 w-5" />
                    </button>

                    <button
                      type="button"
                      data-no-glass="true"
                      onClick={() => stepCarousel(1)}
                      aria-label="Næste slide"
                      className="absolute right-3 top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-white/30 bg-black/55 text-white shadow-md backdrop-blur-md transition-all hover:bg-black/80 active:scale-95"
                    >
                      <ChevronRight className="h-5 w-5" />
                    </button>
                  </>
                )}
              </div>

              {/* Clickable Carousel Slide Thumbnail Strip */}
              {carouselSlides && (
                <div className="no-scrollbar flex items-center gap-2 overflow-x-auto border-t border-[#ECEFF5] bg-white px-3 py-2">
                  {carouselSlides.map((slide, idx) => {
                    const active = idx === safeSlideIdx;
                    return (
                      <button
                        key={`${idx}-${slide.thumbnail_url}`}
                        type="button"
                        data-no-glass="true"
                        onClick={() => {
                          setFailedAdId(null);
                          setCarouselIdx(idx);
                        }}
                        aria-label={`Vis slide ${idx + 1}`}
                        className={`relative h-12 w-12 shrink-0 overflow-hidden rounded-lg border-2 transition-all ${
                          active
                            ? "border-[#0027eb] ring-2 ring-[#0027eb]/20"
                            : "border-transparent opacity-65 hover:opacity-100"
                        }`}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={slide.thumbnail_url || slide.media_url}
                          alt={`Slide ${idx + 1}`}
                          className="h-full w-full bg-[#F3F5F9] object-cover"
                        />
                        <span className="absolute bottom-0.5 right-0.5 rounded bg-black/65 px-1 font-mono-num text-[9px] font-bold text-white">
                          {idx + 1}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Facebook Bottom CTA Footer (Only for paid Meta Ads — updates per carousel slide!) */}
              {!isOrganic && (
                <div className="flex items-center justify-between gap-3 border-t border-[#ECEFF5] bg-[#F8F9FC] px-3.5 py-2.5">
                  <div className="min-w-0 flex-1">
                    {domain && (
                      <p className="truncate font-mono-num text-[10.5px] text-[#64748B]">
                        {domain}
                      </p>
                    )}
                    <p className="truncate text-[12.5px] font-bold text-[#0F172A]">
                      {activeHeadline}
                    </p>
                    {activeLinkDescription && (
                      <p className="truncate text-[11px] text-[#64748B]">
                        {activeLinkDescription}
                      </p>
                    )}
                  </div>

                  {activeLandingUrl && (
                    <a
                      href={activeLandingUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="shrink-0 rounded-lg border border-[#DCE1EC] bg-white px-3 py-1.5 text-[11.5px] font-semibold text-[#0F172A] transition-colors hover:border-[#0027eb] hover:text-[#0027eb]"
                    >
                      {activeCtaText}
                    </a>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ===================================================================
            RIGHT PANE: CLEAN DETAILS & SCRIPT INSPECTOR
           =================================================================== */}
        <div className="flex shrink-0 flex-col border-t border-[#ECEFF5] bg-white lg:min-h-0 lg:w-[40%] lg:shrink lg:border-t-0">
          {/* Top 2 Big Equal Tabs + Desktop Close Button */}
          <div className="flex shrink-0 items-center border-b border-[#ECEFF5]">
            <div className="grid flex-1 grid-cols-2">
              <button
                type="button"
                onClick={() => setRightTab("details")}
                className={`border-b-2 py-3.5 text-center font-display text-[13.5px] font-semibold transition-colors ${
                  rightTab === "details"
                    ? "border-[#0F172A] text-[#0F172A]"
                    : "border-transparent text-[#64748B] hover:text-[#0F172A]"
                }`}
              >
                {isOrganic ? "Video Details" : "Ad Details"}
              </button>
              <button
                type="button"
                onClick={() => setRightTab("script")}
                className={`inline-flex items-center justify-center gap-1.5 border-b-2 py-3.5 font-display text-[13.5px] font-semibold transition-colors ${
                  rightTab === "script"
                    ? "border-[#0F172A] text-[#0F172A]"
                    : "border-transparent text-[#64748B] hover:text-[#0F172A]"
                }`}
              >
                <span>{isOrganic ? "Script & Notes" : "Copy & Notes"}</span>
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="Luk"
              className="mr-3 hidden h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[#64748B] transition-colors hover:bg-[#F3F5F9] hover:text-[#0F172A] lg:flex"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Scrollable Right Inspector Content */}
          <div className="pb-safe space-y-4 p-4 lg:flex-1 lg:overflow-y-auto lg:p-5">
            {/* Full-Width "Save to Folder" Button + Animated Clamped Popover */}
            <div className="relative">
              <button
                ref={folderBtnRef}
                type="button"
                onClick={() => setFolderMenuOpen((v) => !v)}
                className={`flex w-full items-center justify-between rounded-xl border px-3.5 py-2.5 text-[13px] font-semibold transition-colors ${
                  savedFoldersCount > 0
                    ? "border-[#0027eb]/25 bg-[#0027eb]/[0.08] text-[#0027eb] hover:bg-[#0027eb]/[0.12]"
                    : "border-[#E6E9F0] bg-white text-[#0F172A] hover:bg-[#FAFBFD]"
                }`}
              >
                <Bookmark
                  className="h-4 w-4 shrink-0"
                  fill={savedFoldersCount > 0 ? "currentColor" : "none"}
                />
                <span>
                  {savedFoldersCount > 0
                    ? `Saved in ${savedFoldersCount} folder${savedFoldersCount > 1 ? "s" : ""}`
                    : "Save to Folder"}
                </span>
                <ChevronDown
                  className={`h-4 w-4 shrink-0 transition-transform duration-150 ${
                    folderMenuOpen ? "rotate-180" : ""
                  }`}
                />
              </button>

              <FlakePopover
                open={folderMenuOpen}
                onOpenChange={setFolderMenuOpen}
                anchorRef={folderBtnRef}
                align="match"
                preferredPlacement="bottom"
                maxHeight={260}
              >
                <div className="workspace-scroll overflow-y-auto overscroll-contain p-1.5">
                  {boards.length === 0 ? (
                    <p className="px-3 py-2 text-xs text-[#64748B]">
                      Opret en folder i sidebaren for at gemme annoncer.
                    </p>
                  ) : (
                    boards.map((board) => {
                      const active = ad.board_ids.includes(board.id);
                      return (
                        <button
                          key={board.id}
                          type="button"
                          data-no-glass="true"
                          onClick={() => onToggleBoard(ad.id, board.id)}
                          className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-xs transition-colors ${
                            active
                              ? "bg-[#0027eb]/[0.08] font-semibold text-[#0027eb] hover:bg-[#0027eb]/[0.12]"
                              : "font-medium text-[#0F172A] hover:bg-[#F5F7FA]"
                          }`}
                        >
                          <span className="flex min-w-0 items-center gap-2">
                            <span
                              className="h-2 w-2 shrink-0 rounded-full"
                              style={{ backgroundColor: board.accent_color }}
                            />
                            <span className="truncate">{board.name}</span>
                          </span>
                          {active && <Check className="h-3.5 w-3.5 text-[#0027eb]" />}
                        </button>
                      );
                    })
                  )}
                </div>
              </FlakePopover>
            </div>

            {!isOrganic && (onCloneAd || onAskSnow) && (
              <div className="grid grid-cols-2 gap-2">
                {onCloneAd && (
                  <button
                    type="button"
                    onClick={() => {
                      onCloneAd(ad);
                      onClose();
                    }}
                    className="adtrack-btn-primary inline-flex items-center justify-center gap-1.5 rounded-xl px-3 py-2.5 text-xs font-semibold text-white"
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    Clone til mit brand
                  </button>
                )}
                {onAskSnow && (
                  <button
                    type="button"
                    onClick={() => {
                      onAskSnow(ad);
                      onClose();
                    }}
                    className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-[#E6E9F0] bg-white px-3 py-2.5 text-xs font-semibold text-[#0F172A] transition-colors hover:border-[#0027eb] hover:text-[#0027eb]"
                  >
                    Spørg Snow
                  </button>
                )}
              </div>
            )}

            {rightTab === "details" && (
              <div className="rounded-2xl border border-[#ECEFF5] bg-white p-4">
                <div className="mb-3.5 flex items-center justify-between gap-2">
                  <h3 className="font-display text-[14px] font-bold text-[#0F172A]">
                    {isOrganic ? "Video Details" : "Details"}
                  </h3>
                  {isOrganic && !editingMedia && (
                    <button
                      type="button"
                      onClick={startEditMedia}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-[#E6E9F0] bg-white px-2.5 py-1 text-[11.5px] font-semibold text-[#334155] transition-colors hover:border-[#CBD5E1] hover:text-[#0F172A]"
                    >
                      <Pencil className="h-3 w-3" />
                      Rediger
                    </button>
                  )}
                </div>

                {isOrganic && editingMedia ? (
                  <form onSubmit={saveEditMedia} className="space-y-3 text-xs">
                    <div>
                      <label className="mb-1 block text-[11px] font-semibold text-[#475569]">
                        {isInstagram ? "Creator / Titel" : "Titel"}
                      </label>
                      <input
                        type="text"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        placeholder="Navn eller titel..."
                        className="w-full rounded-xl border border-[#E2E6EF] bg-[#F8FAFC] px-3 py-2 text-[16px] text-[#0F172A] outline-none focus:border-[#0027eb] focus:bg-white sm:text-xs"
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-[11px] font-semibold text-[#475569]">
                        Handle / Tag
                      </label>
                      <input
                        type="text"
                        value={editHandle}
                        onChange={(e) => setEditHandle(e.target.value)}
                        placeholder="@creator eller kategori..."
                        className="w-full rounded-xl border border-[#E2E6EF] bg-[#F8FAFC] px-3 py-2 text-[16px] text-[#0F172A] outline-none focus:border-[#0027eb] focus:bg-white sm:text-xs"
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-[11px] font-semibold text-[#475569]">
                        Beskrivelse / Caption
                      </label>
                      <textarea
                        rows={3}
                        value={editCaption}
                        onChange={(e) => setEditCaption(e.target.value)}
                        placeholder="Tilføj beskrivelse, hook eller kontekst..."
                        className="w-full resize-none rounded-xl border border-[#E2E6EF] bg-[#F8FAFC] px-3 py-2 text-[16px] leading-relaxed text-[#0F172A] outline-none focus:border-[#0027eb] focus:bg-white sm:text-xs"
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-[11px] font-semibold text-[#475569]">
                        Kildelink (valgfrit)
                      </label>
                      <input
                        type="url"
                        value={editSourceUrl}
                        onChange={(e) => setEditSourceUrl(e.target.value)}
                        placeholder="https://..."
                        className="w-full rounded-xl border border-[#E2E6EF] bg-[#F8FAFC] px-3 py-2 text-[16px] text-[#0F172A] outline-none focus:border-[#0027eb] focus:bg-white sm:text-xs"
                      />
                    </div>

                    {/* Replace Media File or Cover Thumbnail */}
                    <div className="grid grid-cols-2 gap-2 pt-0.5">
                      <input
                        ref={thumbFileRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) void uploadReplacementAsset(f, "thumb");
                          e.target.value = "";
                        }}
                      />
                      <button
                        type="button"
                        disabled={uploadingAsset !== null}
                        onClick={() => thumbFileRef.current?.click()}
                        className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-[#E2E6EF] bg-white px-2.5 py-2 text-[11.5px] font-semibold text-[#334155] transition-colors hover:border-[#CBD5E1] hover:text-[#0F172A] disabled:opacity-50"
                      >
                        {uploadingAsset === "thumb" ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <ImageIcon className="h-3.5 w-3.5" />
                        )}
                        Skift cover
                      </button>

                      <input
                        ref={mediaFileRef}
                        type="file"
                        accept="video/*,image/*"
                        className="hidden"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) void uploadReplacementAsset(f, "media");
                          e.target.value = "";
                        }}
                      />
                      <button
                        type="button"
                        disabled={uploadingAsset !== null}
                        onClick={() => mediaFileRef.current?.click()}
                        className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-[#E2E6EF] bg-white px-2.5 py-2 text-[11.5px] font-semibold text-[#334155] transition-colors hover:border-[#CBD5E1] hover:text-[#0F172A] disabled:opacity-50"
                      >
                        {uploadingAsset === "media" ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Upload className="h-3.5 w-3.5" />
                        )}
                        Udskift fil
                      </button>
                    </div>

                    {editError && (
                      <p className="rounded-xl bg-[#FFF1F2] px-3 py-2 text-[11.5px] font-medium text-[#E11D48]">
                        {editError}
                      </p>
                    )}

                    <div className="flex items-center justify-between gap-2 border-t border-[#F1F5F9] pt-3">
                      {onDeleteAd ? (
                        confirmDelete ? (
                          <button
                            type="button"
                            onClick={() => onDeleteAd(ad.id)}
                            className="inline-flex items-center gap-1 rounded-xl bg-[#E11D48] px-3 py-1.5 text-[11.5px] font-semibold text-white"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            Bekræft slet
                          </button>
                        ) : (
                          <button
                            type="button"
                            data-no-glass="true"
                            onClick={() => setConfirmDelete(true)}
                            className="inline-flex items-center gap-1 rounded-xl px-2 py-1.5 text-[11.5px] font-semibold text-[#E11D48] hover:bg-[#FFF1F2]"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            Slet
                          </button>
                        )
                      ) : (
                        <span />
                      )}

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingMedia(false);
                            setConfirmDelete(false);
                            setEditError(null);
                          }}
                          className="rounded-xl px-3 py-1.5 text-[11.5px] font-semibold text-[#64748B] hover:bg-[#F3F5F9] hover:text-[#0F172A]"
                        >
                          Annuller
                        </button>
                        <button
                          type="submit"
                          disabled={uploadingAsset !== null}
                          className="adtrack-btn-primary inline-flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-[11.5px] font-semibold text-white disabled:opacity-50"
                        >
                          <Check className="h-3.5 w-3.5" />
                          Gem
                        </button>
                      </div>
                    </div>
                  </form>
                ) : isOrganic ? (
                  <div className="divide-y divide-[#F3F5F9] text-[12.5px]">
                    {/* Source */}
                    <div className="grid grid-cols-[118px_1fr] items-center gap-3 py-2.5">
                      <span className="text-[#64748B]">Kilde</span>
                      <span className="inline-flex items-center gap-1.5 font-semibold text-[#0F172A]">
                        {isInstagram ? (
                          <>
                            <InstagramColorIcon className="h-3.5 w-3.5 shrink-0" />
                            Instagram {ad.media_type === "video" ? "Reel" : "Post"}
                          </>
                        ) : (
                          <>
                            <Film className="h-3.5 w-3.5 shrink-0 text-[#64748B]" />
                            Lokal upload
                          </>
                        )}
                      </span>
                    </div>

                    {/* Creator / Title */}
                    <div className="grid grid-cols-[118px_1fr] items-center gap-3 py-2.5">
                      <span className="text-[#64748B]">
                        {isInstagram ? "Creator" : "Titel"}
                      </span>
                      <span className="truncate font-semibold text-[#0F172A]">
                        {ad.brand_name}
                        {isInstagram &&
                        ad.brand_handle &&
                        ad.brand_handle !== ad.brand_name
                          ? ` (${ad.brand_handle})`
                          : ""}
                      </span>
                    </div>

                    {/* Format */}
                    <div className="grid grid-cols-[118px_1fr] items-center gap-3 py-2.5">
                      <span className="text-[#64748B]">Format</span>
                      <div>
                        <span className="inline-flex items-center gap-1.5 rounded-lg border border-[#E6E9F0] bg-[#FAFBFD] px-2.5 py-1 text-[11.5px] font-medium text-[#0F172A]">
                          {ad.media_type === "video" ? (
                            <Film className="h-3 w-3 text-[#64748B]" />
                          ) : (
                            <ImageIcon className="h-3 w-3 text-[#64748B]" />
                          )}
                          {formatLabel}
                        </span>
                      </div>
                    </div>

                    {/* Duration */}
                    {ad.duration_seconds ? (
                      <div className="grid grid-cols-[118px_1fr] items-center gap-3 py-2.5">
                        <span className="text-[#64748B]">Varighed</span>
                        <span className="font-mono-num font-semibold text-[#0F172A]">
                          {ad.duration_seconds}s
                        </span>
                      </div>
                    ) : null}

                    {/* Posted / Uploaded Date */}
                    <div className="grid grid-cols-[118px_1fr] items-center gap-3 py-2.5">
                      <span className="text-[#64748B]">
                        {isInstagram ? "Opslået" : "Tilføjet"}
                      </span>
                      <span className="font-mono-num text-[#334155]">
                        {formatIsoDate(ad.started_running_at || ad.created_at)}
                      </span>
                    </div>

                    {/* Original Instagram Link */}
                    {isInstagram && ad.source_url && (
                      <div className="grid grid-cols-[118px_1fr] items-center gap-3 py-2.5">
                        <span className="text-[#64748B]">Original</span>
                        <div>
                          <a
                            href={ad.source_url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1.5 rounded-lg border border-[#E6E9F0] bg-white px-3 py-1.5 text-[11.5px] font-semibold text-[#0F172A] transition-colors hover:border-[#CBD5E1] hover:bg-[#F8FAFC]"
                          >
                            <ExternalLink className="h-3 w-3" />
                            Åbn på Instagram
                          </a>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                <div className="divide-y divide-[#F3F5F9] text-[12.5px]">
                  {/* Brand */}
                  <div className="grid grid-cols-[118px_1fr] items-center gap-3 py-2.5">
                    <span className="text-[#64748B]">Brand</span>
                    <button
                      type="button"
                      onClick={() => {
                        if (onOpenBrand) {
                          onOpenBrand(ad.brand_id);
                          onClose();
                        }
                      }}
                      className="flex min-w-0 items-center gap-2 font-semibold text-[#0F172A] hover:underline"
                    >
                      {ad.brand_logo_url ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={ad.brand_logo_url}
                          alt=""
                          className="h-5 w-5 shrink-0 rounded-full border border-[#E6E9F0] bg-white object-contain p-0.5"
                        />
                      ) : (
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#0F172A] text-[9px] font-bold text-white">
                          {ad.brand_avatar_initials}
                        </span>
                      )}
                      <span className="truncate">{ad.brand_name}</span>
                    </button>
                  </div>

                  {/* Status */}
                  <div className="grid grid-cols-[118px_1fr] items-center gap-3 py-2.5">
                    <span className="text-[#64748B]">Status</span>
                    <span className="inline-flex items-center gap-1.5 font-medium text-[#0F172A]">
                      {ad.is_active ? (
                        <span className="relative flex h-2 w-2">
                          <span
                            className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#16A34A] opacity-40"
                            style={{ animationDuration: "2.4s" }}
                          />
                          <span className="relative inline-flex h-2 w-2 rounded-full bg-[#16A34A]" />
                        </span>
                      ) : (
                        <span className="h-2 w-2 rounded-full bg-[#94A3B8]" />
                      )}
                      {ad.is_active ? "Running" : "Not Running"}
                    </span>
                  </div>

                  {/* Time Running */}
                  <div className="grid grid-cols-[118px_1fr] items-center gap-3 py-2.5">
                    <span className="text-[#64748B]">Time Running</span>
                    <span className="font-mono-num font-semibold text-[#0F172A]">
                      {activeDays} Days
                    </span>
                  </div>

                  {/* Active Since */}
                  <div className="grid grid-cols-[118px_1fr] items-center gap-3 py-2.5">
                    <span className="text-[#64748B]">Started</span>
                    <span className="font-mono-num text-[#334155]">
                      {formatIsoDate(ad.started_running_at)}
                    </span>
                  </div>

                  {/* Real Meta Reach (only shown when real scraper reach data exists — no fake Est. impressions) */}
                  {typeof ad.eu_reach === "number" && ad.eu_reach > 0 && (
                    <div className="grid grid-cols-[118px_1fr] items-center gap-3 py-2.5">
                      <span className="text-[#64748B]">Reach</span>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="font-mono-num font-semibold text-[#0F172A]">
                          {formatReach(ad.eu_reach)}
                        </span>
                        <span className="font-mono-num text-[11px] text-[#64748B]">
                          ({formatReach(Math.max(1, Math.round(ad.eu_reach / Math.max(1, activeDays))))}/dag)
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Estimated Ad Spend (DKK) */}
                  {spendInfo && (
                    <div className="grid grid-cols-[118px_1fr] items-center gap-3 py-2.5">
                      <span className="text-[#64748B]">Est. Spend</span>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="font-mono-num font-semibold text-[#0F172A]">
                          ~{spendInfo.formattedTotal}
                        </span>
                        <span className="font-mono-num text-[11px] text-[#64748B]">
                          ({spendInfo.formattedDaily}/dag)
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Countries */}
                  {audience && audience.countries.length > 0 && (
                    <div className="grid grid-cols-[118px_1fr] items-start gap-3 py-2.5">
                      <span className="pt-0.5 text-[#64748B]">Lande</span>
                      <div className="flex flex-wrap items-center gap-1.5">
                        {audience.countries.slice(0, 6).map((c) => (
                          <span
                            key={c.code}
                            title={`${c.name}${c.reach > 0 ? ` — ${formatReach(c.reach)} reach (${c.pct}%)` : ""}`}
                            className="inline-flex items-center gap-1 rounded-lg border border-[#E6E9F0] bg-[#FAFBFD] px-2 py-0.5 font-mono-num text-[11px] font-medium text-[#0F172A]"
                          >
                            <span>{c.flag}</span>
                            <span>{c.code}</span>
                            {c.pct > 0 && audience.countries.length > 1 && (
                              <span className="text-[#64748B]">{c.pct}%</span>
                            )}
                          </span>
                        ))}
                        {audience.countries.length > 6 && (
                          <span className="rounded-lg bg-[#F1F5F9] px-1.5 py-0.5 font-mono-num text-[10.5px] font-semibold text-[#64748B]">
                            +{audience.countries.length - 6}
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Platforms */}
                  {ad.platforms && ad.platforms.length > 0 && (
                    <div className="grid grid-cols-[118px_1fr] items-start gap-3 py-2.5">
                      <span className="pt-0.5 text-[#64748B]">Platforms</span>
                      <div className="flex flex-wrap items-center gap-1.5">
                        {ad.platforms.map((plat) => (
                          <span
                            key={plat}
                            className="inline-flex items-center rounded-lg border border-[#E6E9F0] bg-[#FAFBFD] px-2 py-0.5 text-[11px] font-medium text-[#334155]"
                          >
                            {plat}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Brand Ad Rank */}
                  {rankMeta && (
                    <div className="grid grid-cols-[118px_1fr] items-center gap-3 py-2.5">
                      <span className="text-[#64748B]">Ad Rank</span>
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          title={`Rank #${rankMeta.brandRank} of ${rankMeta.brandTotalAds}`}
                          className={`inline-flex shrink-0 aspect-square items-center justify-center rounded-full font-sans font-bold leading-none tabular-nums ${
                            rankMeta.brandRank >= 100
                              ? "h-6 w-6 text-[9.5px]"
                              : "h-5 w-5 text-[10px]"
                          } ${
                            rankMeta.brandRank === 1
                              ? "bg-gradient-to-b from-[#FEF08A] via-[#EAB308] to-[#CA8A04] text-[#5C3404] ring-[1.25px] ring-[#854D0E] shadow-[inset_0_1px_1px_rgba(255,255,255,0.85),0_1px_2px_rgba(133,77,14,0.24)]"
                              : rankMeta.brandRank === 2
                                ? "bg-gradient-to-b from-[#FFFFFF] via-[#CBD5E1] to-[#94A3B8] text-[#1E293B] ring-[1.25px] ring-[#475569] shadow-[inset_0_1px_1px_rgba(255,255,255,0.95),0_1px_2px_rgba(71,85,105,0.2)]"
                                : rankMeta.brandRank === 3
                                  ? "bg-gradient-to-b from-[#FDE6CE] via-[#D9823B] to-[#A85319] text-[#4A1D06] ring-[1.25px] ring-[#6B2D0B] shadow-[inset_0_1px_1px_rgba(255,255,255,0.65),0_1px_2px_rgba(107,45,11,0.24)]"
                                  : "bg-[#F1F5F9] text-[#0F172A] ring-1 ring-[#CBD5E1]/70"
                          }`}
                        >
                          {rankMeta.brandRank}
                        </span>
                        <span className="text-[11.5px] text-[#64748B]">
                          of {rankMeta.brandTotalAds} in {ad.brand_name}
                        </span>
                        {rankMeta.tier !== "Active" && (
                          <span className="rounded-md bg-[#ECFDF3] px-1.5 py-0.5 text-[10px] font-semibold text-[#15803D]">
                            {rankMeta.tier}
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* CTA */}
                  {ad.cta_text && (
                    <div className="grid grid-cols-[118px_1fr] items-center gap-3 py-2.5">
                      <span className="text-[#64748B]">CTA</span>
                      <div>
                        <span className="inline-flex items-center gap-1.5 rounded-lg border border-[#E6E9F0] bg-[#FAFBFD] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-[#0F172A]">
                          <MousePointerClick className="h-3 w-3 text-[#64748B]" />
                          {ad.cta_text}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Format */}
                  <div className="grid grid-cols-[118px_1fr] items-center gap-3 py-2.5">
                    <span className="text-[#64748B]">Format</span>
                    <div>
                      <span className="inline-flex items-center gap-1.5 rounded-lg border border-[#E6E9F0] bg-[#FAFBFD] px-2.5 py-1 text-[11.5px] font-medium text-[#0F172A]">
                        {ad.media_type === "video" ? (
                          <Film className="h-3 w-3 text-[#64748B]" />
                        ) : (
                          <ImageIcon className="h-3 w-3 text-[#64748B]" />
                        )}
                        {formatLabel}
                      </span>
                    </div>
                  </div>

                  {/* Landing Page */}
                  {ad.landing_page_url && (
                    <div className="grid grid-cols-[118px_1fr] items-center gap-3 py-2.5">
                      <span className="text-[#64748B]">Landing Page</span>
                      <a
                        href={ad.landing_page_url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex min-w-0 items-center gap-1.5 truncate rounded-lg bg-[#F1F5F9] px-2.5 py-1.5 font-mono-num text-[11.5px] font-medium text-[#0F172A] transition-colors hover:bg-[#E2E8F0]"
                      >
                        <ExternalLink className="h-3 w-3 shrink-0 text-[#64748B]" />
                        <span className="truncate">{ad.landing_page_url}</span>
                      </a>
                    </div>
                  )}

                  {/* Original Ad */}
                  {ad.source_url && (
                    <div className="grid grid-cols-[118px_1fr] items-center gap-3 py-2.5">
                      <span className="text-[#64748B]">Original Ad</span>
                      <div>
                        <a
                          href={ad.source_url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 rounded-lg border border-[#E6E9F0] bg-white px-3 py-1.5 text-[11.5px] font-semibold text-[#0F172A] transition-colors hover:border-[#CBD5E1] hover:bg-[#F8FAFC]"
                        >
                          <ExternalLink className="h-3 w-3" />
                          Open in Facebook
                        </a>
                      </div>
                    </div>
                  )}
                </div>
                )}
              </div>
            )}

            {/* SMART MÅLGRUPPE / AUDIENCE INTELLIGENCE CARD (Paid Meta Ads with real breakdown/targeting) */}
            {rightTab === "details" && !isOrganic && audience && audience.hasData && (
              <div className="rounded-2xl border border-[#ECEFF5] bg-white p-4 space-y-3.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <Users className="h-4 w-4 text-[#64748B]" />
                    <h3 className="font-display text-[14px] font-bold text-[#0F172A]">
                      Målgruppe
                    </h3>
                  </div>
                  {audience.totalReach > 0 && (
                    <span className="rounded-lg bg-[#F1F5F9] px-2 py-0.5 font-mono-num text-[11px] font-semibold text-[#334155]">
                      {formatReach(audience.totalReach)} reach
                    </span>
                  )}
                </div>

                {/* Smart Danish Audience Headline */}
                {audience.headline && (
                  <div className="rounded-xl border border-[#E6ECFF] bg-[#F5F8FF] px-3 py-2 text-[12px] font-semibold text-[#0F172A]">
                    {audience.headline}
                  </div>
                )}

                {/* Gender Split Bar */}
                {(audience.hasBreakdown || audience.targetGender) && (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-[11.5px]">
                      <span className="inline-flex items-center gap-1.5 font-medium text-[#334155]">
                        <span className="h-2 w-2 rounded-full bg-[#E5A9B8]" />
                        Kvinder{" "}
                        <span className="font-mono-num font-bold text-[#0F172A]">
                          {audience.femalePct}%
                        </span>
                        {audience.femaleReach > 0 && (
                          <span className="font-mono-num text-[10.5px] text-[#94A3B8]">
                            ({formatReach(audience.femaleReach)})
                          </span>
                        )}
                      </span>
                      <span className="inline-flex items-center gap-1.5 font-medium text-[#334155]">
                        <span className="h-2 w-2 rounded-full bg-[#93B4D8]" />
                        Mænd{" "}
                        <span className="font-mono-num font-bold text-[#0F172A]">
                          {audience.malePct}%
                        </span>
                        {audience.maleReach > 0 && (
                          <span className="font-mono-num text-[10.5px] text-[#94A3B8]">
                            ({formatReach(audience.maleReach)})
                          </span>
                        )}
                      </span>
                    </div>
                    <div className="flex h-2 w-full overflow-hidden rounded-full bg-[#EEF2F6]">
                      {audience.femalePct > 0 && (
                        <div
                          className="h-full bg-[#E5A9B8] transition-all duration-300"
                          style={{ width: `${audience.femalePct}%` }}
                        />
                      )}
                      {audience.malePct > 0 && (
                        <div
                          className="h-full bg-[#93B4D8] transition-all duration-300"
                          style={{ width: `${audience.malePct}%` }}
                        />
                      )}
                    </div>
                  </div>
                )}

                {/* Age Distribution Bars */}
                {audience.hasBreakdown && (
                  <div className="space-y-1.5 pt-0.5">
                    <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">
                      <span>Aldersfordeling</span>
                    </div>
                    <div className="space-y-1.5">
                      {audience.ageBands.map((band) => {
                        const isPeak = band.ageRange === audience.peakAgeRange && band.total > 0;
                        return (
                          <div
                            key={band.ageRange}
                            className="grid grid-cols-[44px_1fr_68px] items-center gap-2 text-[11.5px]"
                          >
                            <span
                              className={`font-mono-num ${
                                isPeak
                                  ? "font-bold text-[#0F172A]"
                                  : "font-medium text-[#64748B]"
                              }`}
                            >
                              {band.ageRange}
                            </span>
                            <div className="h-2 w-full overflow-hidden rounded-full bg-[#F1F5F9]">
                              <div
                                className="h-full rounded-full transition-all duration-300"
                                style={{
                                  width: `${Math.max(band.total > 0 ? 3 : 0, band.pct)}%`,
                                  backgroundColor: isPeak ? "#0027eb" : "#CBD5E1",
                                }}
                              />
                            </div>
                            <span className="text-right font-mono-num text-[11px] text-[#475569]">
                              <strong className={isPeak ? "text-[#0F172A]" : "font-semibold text-[#334155]"}>
                                {band.pct}%
                              </strong>
                              {band.total > 0 ? ` · ${formatReach(band.total)}` : ""}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Multi-Country Reach Breakdown */}
                {audience.countries.length > 1 && audience.countries[0].reach > 0 && (
                  <div className="space-y-1.5 border-t border-[#F1F5F9] pt-3">
                    <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">
                      <Globe className="h-3 w-3" />
                      <span>Top lande (Reach)</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {audience.countries.slice(0, 6).map((c) => (
                        <span
                          key={c.code}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-[#ECEFF5] bg-[#FAFBFD] px-2 py-1 font-mono-num text-[11px] text-[#334155]"
                        >
                          <span>{c.flag}</span>
                          <span className="font-semibold text-[#0F172A]">{c.name}</span>
                          <span className="text-[#64748B]">
                            {c.pct}% ({formatReach(c.reach)})
                          </span>
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Payer / Beneficiary Transparency Footer */}
                {ad.payer_name && (
                  <div className="flex items-center justify-between gap-2 border-t border-[#F1F5F9] pt-2.5 text-[11px] text-[#64748B]">
                    <span>Annoncør / Betaler</span>
                    <span className="truncate font-medium text-[#334155]">
                      {ad.payer_name}
                    </span>
                  </div>
                )}
              </div>
            )}

            {rightTab === "script" && (
              <div className="space-y-4">
                {/* Clean Raw Video Script (no hook analysis box) */}
                {ad.media_type === "video" && (
                  <div className="rounded-2xl border border-[#ECEFF5] bg-white p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Captions className="h-4 w-4 text-[#64748B]" />
                        <h3 className="font-display text-[13.5px] font-bold text-[#0F172A]">
                          Video Script
                        </h3>
                        {ad.duration_seconds ? (
                          <span className="font-mono-num text-[11px] text-[#64748B]">
                            {ad.duration_seconds}s
                          </span>
                        ) : null}
                      </div>

                      {ad.ai_transcript && (
                        <button
                          type="button"
                          onClick={() =>
                            copyText("transcript", ad.ai_transcript || "")
                          }
                          className="inline-flex items-center gap-1 rounded-lg border border-[#E2E6EF] bg-white px-2.5 py-1.5 text-[11.5px] font-medium text-[#475569] hover:text-[#0F172A]"
                        >
                          {copiedKey === "transcript" ? (
                            <Check className="h-3.5 w-3.5 text-[#16A34A]" />
                          ) : (
                            <Copy className="h-3.5 w-3.5" />
                          )}
                          Kopiér
                        </button>
                      )}
                    </div>

                    {transcribing && !ad.ai_transcript && (
                      <div className="mt-3 space-y-2.5">
                        <div className="skeleton-shimmer h-3.5 w-full rounded" />
                        <div className="skeleton-shimmer h-3.5 w-5/6 rounded" />
                        <div className="skeleton-shimmer h-3.5 w-3/4 rounded" />
                      </div>
                    )}

                    {ad.ai_transcript ? (
                      <p className="mt-3 whitespace-pre-wrap rounded-xl bg-[#FAFBFD] p-3 text-[12.5px] leading-relaxed text-[#334155]">
                        {ad.ai_transcript}
                      </p>
                    ) : !transcribing ? (
                      <p className="mt-2.5 text-xs text-[#94A3B8]">
                        {transcribeError || "Ingen tale fundet i denne video (kun musik eller tekst)."}
                      </p>
                    ) : null}
                  </div>
                )}

                {/* Primary Ad Copy */}
                {ad.primary_text && (
                  <div className="rounded-2xl border border-[#ECEFF5] bg-white p-4">
                    <div className="mb-2 flex items-center justify-between">
                      <h3 className="font-display text-[13.5px] font-bold text-[#0F172A]">
                        {isInstagram ? "Caption" : "Ad Copy"}
                      </h3>
                      <button
                        type="button"
                        onClick={() => copyText("copy_tab", ad.primary_text)}
                        className="inline-flex items-center gap-1 text-xs font-medium text-[#64748B] hover:text-[#0027eb]"
                      >
                        {copiedKey === "copy_tab" ? (
                          <>
                            <Check className="h-3.5 w-3.5 text-[#16A34A]" />{" "}
                            Kopieret
                          </>
                        ) : (
                          <>
                            <Copy className="h-3.5 w-3.5" /> Kopiér
                          </>
                        )}
                      </button>
                    </div>
                    <p className="whitespace-pre-wrap text-[12.5px] leading-relaxed text-[#334155]">
                      {ad.primary_text}
                    </p>
                  </div>
                )}

                {/* Personal Notes */}
                <div className="rounded-2xl border border-[#ECEFF5] bg-white p-4">
                  <label className="mb-2 flex items-center gap-1.5 font-display text-[13.5px] font-bold text-[#0F172A]">
                    <StickyNote className="h-4 w-4 text-[#64748B]" />
                    Notes
                  </label>
                  <textarea
                    rows={4}
                    value={ad.user_notes}
                    onChange={(e) =>
                      onUpdateAd(ad.id, { user_notes: e.target.value })
                    }
                    placeholder="Skriv noter om vinkel, hook eller testidé..."
                    className="w-full rounded-xl border border-[#E2E6EF] bg-[#FAFBFD] px-3 py-2.5 text-[16px] leading-relaxed text-[#0F172A] outline-none transition-colors focus:border-[#0027eb] focus:bg-white sm:text-xs"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
        </div>
      </div>
    </div>
  );
}
