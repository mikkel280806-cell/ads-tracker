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
  Image as ImageIcon,
  Layers,
  Link2,
  MousePointerClick,
  StickyNote,
  X,
} from "lucide-react";
import type { Ad, Board } from "@/lib/types";
import type { AdRankingMeta } from "@/lib/ad-ranking";
import { formatReach, getActiveDays } from "@/lib/url-parser";
import { FacebookColorIcon, MetaInfinityIcon } from "./BrandIcons";

interface AdDetailSheetProps {
  ad: Ad | null;
  rankMeta?: AdRankingMeta;
  adsList?: Ad[];
  boards: Board[];
  onClose: () => void;
  onSelectAd?: (adId: string) => void;
  onUpdateAd: (adId: string, patch: Partial<Ad>) => void;
  onToggleBoard: (adId: string, boardId: string) => void;
  onOpenBrand?: (brandId: string) => void;
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
  onToggleBoard,
  onOpenBrand,
}: AdDetailSheetProps) {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [copyExpanded, setCopyExpanded] = useState(false);
  const [folderMenuOpen, setFolderMenuOpen] = useState(false);
  const [rightTab, setRightTab] = useState<"details" | "script">("details");
  const [failedAdId, setFailedAdId] = useState<string | null>(null);

  // Video transcription state (Deepgram Nova-2 — automatic on video open)
  const [transcribing, setTranscribing] = useState(false);
  const [transcribeErrorByAdId, setTranscribeErrorByAdId] = useState<
    Record<string, string>
  >({});
  const autoTranscribedRef = useRef<Set<string>>(new Set());

  const activeDays = useMemo(
    () => (ad ? getActiveDays(ad.started_running_at) : 0),
    [ad]
  );

  // Automatically transcribe video ads via Deepgram when opened (no button click needed)
  useEffect(() => {
    if (!ad) return;
    if (ad.media_type !== "video") return;
    if (!ad.media_url || !/\.(mp4|webm|mov)(\?|$)/i.test(ad.media_url)) return;
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
            videoUrl: ad.media_url,
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

  const isVideoFile =
    !mediaFailed &&
    ad.media_type === "video" &&
    /\.(mp4|webm|mov)(\?|$)/i.test(ad.media_url);

  const displayImage = mediaFailed
    ? ad.fallback_image_url || ""
    : ad.thumbnail_url || ad.fallback_image_url || ad.media_url || "";

  const downloadUrl = isVideoFile ? ad.media_url : displayImage;
  const domain = ad.landing_page_url
    ? ad.landing_page_url.replace(/^https?:\/\/(www\.)?/, "").replace(/\/.*$/, "")
    : "";

  const savedFoldersCount = ad.board_ids.length;
  const formatLabel =
    ad.display_format === "VIDEO" || ad.media_type === "video"
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
      className="fixed inset-0 z-50 flex items-end justify-center bg-[#050811]/60 p-0 pt-10 backdrop-blur-[2px] lg:pt-14"
      onClick={onClose}
    >
      <div
        className="animate-sheet-up flex h-full w-full flex-col overflow-hidden rounded-t-[18px] border-t border-[#E6E9F0] bg-white text-[#0F172A] shadow-[0_-12px_50px_rgba(5,8,17,0.28)] lg:flex-row"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ===================================================================
            LEFT PANE: FULL-HEIGHT TRENDTRACK-STYLE AD PREVIEW STAGE
           =================================================================== */}
        <div className="flex min-h-0 flex-1 flex-col bg-[#FAFBFD] lg:w-[60%] lg:border-r lg:border-[#ECEFF5]">
          {/* Top Toolbar (Prev/Next + Platform Pill + Shop Action + Quick Icons) */}
          <div className="flex shrink-0 items-center justify-between gap-2 border-b border-[#ECEFF5] bg-white px-4 py-2.5">
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
                <FacebookColorIcon className="h-3.5 w-3.5 shrink-0" />
                <span>Facebook</span>
                <span className="text-[#CBD5E1]">·</span>
                <span className="text-[#64748B]">{formatLabel}</span>
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              {onOpenBrand && (
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
          <div className="flex-1 overflow-y-auto px-4 py-6 lg:px-8">
            <div className="mx-auto w-full max-w-[490px] overflow-hidden rounded-2xl border border-[#E6E9F0] bg-white shadow-[0_4px_18px_rgba(15,23,42,0.06)]">
              {/* Optional Telemetry Pill Bar (Reach / Est. Spend / Daily Spend) */}
              {(ad.eu_reach || ad.estimated_spend || ad.daily_spend) && (
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
                    {ad.estimated_spend ? (
                      <span className="rounded-md border border-[#E6E9F0] bg-white px-2 py-0.5">
                        ${formatReach(ad.estimated_spend)}
                      </span>
                    ) : null}
                    {ad.daily_spend ? (
                      <span className="rounded-md border border-[#E6E9F0] bg-white px-2 py-0.5">
                        ${formatReach(ad.daily_spend)}/d
                      </span>
                    ) : null}
                  </div>
                </div>
              )}

              {/* Meta Card Header */}
              <div className="px-3.5 pb-2.5 pt-3">
                <div className="flex items-center justify-between gap-2">
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

                  {ad.duplicated_count && ad.duplicated_count > 1 && (
                    <span className="inline-flex shrink-0 items-center gap-1 rounded-md bg-[#ECFDF3] px-2 py-0.5 font-mono-num text-[11px] font-semibold text-[#15803D]">
                      <Layers className="h-3 w-3" />
                      {ad.duplicated_count} Duplicated
                    </span>
                  )}
                </div>

                {/* Running status + start date */}
                <div className="mt-2 flex items-center gap-2 text-[11.5px] text-[#64748B]">
                  <span
                    className={`h-2 w-2 rounded-full ${
                      ad.is_active ? "bg-[#16A34A]" : "bg-[#94A3B8]"
                    }`}
                  />
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

                {/* Primary Ad Copy */}
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

              {/* Creative Media (Video / Image) */}
              <div className="relative bg-[#0B0F19]">
                {isVideoFile ? (
                  <video
                    key={ad.id}
                    src={ad.media_url}
                    poster={displayImage}
                    controls
                    playsInline
                    onError={() => setFailedAdId(ad.id)}
                    className="max-h-[68vh] w-full bg-black object-contain"
                  />
                ) : displayImage ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={displayImage}
                    alt={ad.headline || ad.brand_name}
                    onError={() => {
                      if (!mediaFailed) setFailedAdId(ad.id);
                    }}
                    className="max-h-[68vh] w-full bg-[#F3F5F9] object-contain"
                  />
                ) : (
                  <div className="flex h-64 flex-col items-center justify-center gap-2 bg-[#F5F7FA] text-center">
                    <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#0027eb] font-display text-xs font-bold text-white">
                      {ad.brand_avatar_initials}
                    </span>
                    <p className="text-xs text-[#64748B]">Medie utilgængeligt</p>
                  </div>
                )}
              </div>

              {/* Facebook Bottom CTA Footer */}
              <div className="flex items-center justify-between gap-3 border-t border-[#ECEFF5] bg-[#F8F9FC] px-3.5 py-2.5">
                <div className="min-w-0 flex-1">
                  {domain && (
                    <p className="truncate font-mono-num text-[10.5px] text-[#64748B]">
                      {domain}
                    </p>
                  )}
                  <p className="truncate text-[12.5px] font-bold text-[#0F172A]">
                    {ad.headline || ad.brand_name}
                  </p>
                  {ad.link_description && (
                    <p className="truncate text-[11px] text-[#64748B]">
                      {ad.link_description}
                    </p>
                  )}
                </div>

                {ad.landing_page_url && (
                  <a
                    href={ad.landing_page_url}
                    target="_blank"
                    rel="noreferrer"
                    className="shrink-0 rounded-lg border border-[#DCE1EC] bg-white px-3 py-1.5 text-[11.5px] font-semibold text-[#0F172A] transition-colors hover:border-[#0027eb] hover:text-[#0027eb]"
                  >
                    {ad.cta_text || "Learn more"}
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ===================================================================
            RIGHT PANE: CLEAN TRENDTRACK DETAILS & SCRIPT INSPECTOR
           =================================================================== */}
        <div className="flex min-h-0 flex-col bg-white lg:w-[40%]">
          {/* Top 2 Big Equal Tabs (Ad Details | Copy & Notes) + Desktop Close Button */}
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
                Ad Details
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
                <span>Copy &amp; Notes</span>
                {(ad.ai_transcript || ad.user_notes) && (
                  <span className="h-1.5 w-1.5 rounded-full bg-[#16A34A]" />
                )}
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
          <div className="pb-safe flex-1 space-y-4 overflow-y-auto p-5">
            {/* Full-Width "Save to Folder" Button + Inline Selector */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setFolderMenuOpen((v) => !v)}
                className={`flex w-full items-center justify-between rounded-xl border px-3.5 py-2.5 text-[13px] font-semibold transition-colors ${
                  savedFoldersCount > 0
                    ? "border-[#CBD5E1] bg-[#F1F5F9] text-[#0F172A]"
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
                  className={`h-4 w-4 shrink-0 transition-transform ${
                    folderMenuOpen ? "rotate-180" : ""
                  }`}
                />
              </button>

              {folderMenuOpen && (
                <div className="mt-2 rounded-xl border border-[#E6E9F0] bg-white p-1.5 shadow-lg">
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
                          onClick={() => onToggleBoard(ad.id, board.id)}
                          className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-xs font-medium text-[#0F172A] transition-colors hover:bg-[#F5F7FA]"
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
              )}
            </div>

            {rightTab === "details" && (
              <div className="rounded-2xl border border-[#ECEFF5] bg-white p-4">
                <h3 className="mb-3.5 font-display text-[14px] font-bold text-[#0F172A]">
                  Details
                </h3>

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
                      <span
                        className={`h-2 w-2 rounded-full ${
                          ad.is_active ? "bg-[#16A34A]" : "bg-[#94A3B8]"
                        }`}
                      />
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

                  {/* Impressions */}
                  {rankMeta && (
                    <div className="grid grid-cols-[118px_1fr] items-center gap-3 py-2.5">
                      <span className="text-[#64748B]">Impressions</span>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="font-mono-num font-semibold text-[#0F172A]">
                          {formatReach(rankMeta.impressions)}
                        </span>
                        <span className="font-mono-num text-[11px] text-[#64748B]">
                          (~{formatReach(rankMeta.dailyImpressions)}/day)
                        </span>
                        <span className="rounded-md bg-[#F1F5F9] px-1.5 py-0.5 text-[10px] font-semibold text-[#64748B]">
                          {rankMeta.impressionsSource === "meta_eu" ? "EU" : "Est."}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Brand Ad Rank */}
                  {rankMeta && (
                    <div className="grid grid-cols-[118px_1fr] items-center gap-3 py-2.5">
                      <span className="text-[#64748B]">Ad Rank</span>
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`inline-flex items-center justify-center rounded-full px-2 py-0.5 font-mono-num text-[11px] font-bold leading-none ${
                            rankMeta.brandRank === 1
                              ? "bg-gradient-to-b from-[#FDE047] via-[#EAB308] to-[#CA8A04] text-[#422006]"
                              : rankMeta.brandRank === 2
                                ? "bg-gradient-to-b from-[#F8FAFC] via-[#CBD5E1] to-[#94A3B8] text-[#0F172A]"
                                : rankMeta.brandRank === 3
                                  ? "bg-gradient-to-b from-[#FDBA74] via-[#D97706] to-[#9A3412] text-white"
                                  : "bg-[#F1F5F9] text-[#0F172A]"
                          }`}
                        >
                          #{rankMeta.brandRank}
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

                {/* Video Script Preview inside Details */}
                {ad.media_type === "video" && (ad.ai_transcript || transcribing) && (
                  <div className="mt-4 border-t border-[#F1F4F9] pt-3.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#0F172A]">
                        <Captions className="h-3.5 w-3.5 text-[#64748B]" />
                        Video Script
                      </span>
                      {ad.ai_transcript && (
                        <button
                          type="button"
                          onClick={() => setRightTab("script")}
                          className="inline-flex items-center gap-1 rounded-lg border border-[#E2E6EF] bg-white px-2.5 py-1 text-[11.5px] font-semibold text-[#0F172A] transition-colors hover:border-[#CBD5E1] hover:bg-[#F8FAFC]"
                        >
                          Se hele scriptet
                          <ArrowUpRight className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                    {transcribing && !ad.ai_transcript ? (
                      <div className="mt-2.5 space-y-2">
                        <div className="skeleton-shimmer h-3 w-full rounded" />
                        <div className="skeleton-shimmer h-3 w-4/5 rounded" />
                      </div>
                    ) : ad.ai_transcript ? (
                      <p className="mt-2 line-clamp-3 rounded-xl bg-[#FAFBFD] p-2.5 text-[12px] leading-relaxed text-[#334155]">
                        {ad.ai_transcript}
                      </p>
                    ) : null}
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
                        Ad Copy
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
  );
}
