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
  Gauge,
  Globe,
  Image as ImageIcon,
  Layers,
  Link2,
  Loader2,
  MousePointerClick,
  Search,
  ShieldCheck,
  StickyNote,
  Tag,
  X,
} from "lucide-react";
import type { Ad, Board } from "@/lib/types";
import {
  analyzeAdLocally,
  type LiveLandingPageAudit,
} from "@/lib/ad-analyzer";
import { formatReach } from "@/lib/url-parser";
import { FacebookColorIcon, MetaInfinityIcon } from "./BrandIcons";

interface AdDetailSheetProps {
  ad: Ad | null;
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
  const [detailsSubTab, setDetailsSubTab] = useState<"ad" | "lp">("ad");
  const [failedAdId, setFailedAdId] = useState<string | null>(null);

  // Zero-cost Live Landing Page Inspector state (keyed by ad.id)
  const [inspectingLp, setInspectingLp] = useState(false);
  const [lpAuditByAdId, setLpAuditByAdId] = useState<
    Record<string, LiveLandingPageAudit>
  >({});
  const [lpErrorByAdId, setLpErrorByAdId] = useState<Record<string, string>>({});

  // Video transcription state (Deepgram Nova-2 — automatic on video open)
  const [transcribing, setTranscribing] = useState(false);
  const [transcribeErrorByAdId, setTranscribeErrorByAdId] = useState<
    Record<string, string>
  >({});
  const autoTranscribedRef = useRef<Set<string>>(new Set());

  const localAnalysis = useMemo(
    () => (ad ? analyzeAdLocally(ad) : null),
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

  if (!ad || !localAnalysis) return null;

  const mediaFailed = failedAdId === ad.id;
  const lpAudit = lpAuditByAdId[ad.id] || null;
  const lpError = lpErrorByAdId[ad.id] || null;
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

  const handleInspectLandingPage = async () => {
    if (!ad.landing_page_url || inspectingLp) return;
    setInspectingLp(true);
    setLpErrorByAdId((prev) => {
      const next = { ...prev };
      delete next[ad.id];
      return next;
    });
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: ad.landing_page_url }),
      });
      const data = await res.json();
      if (!data.ok || !data.audit) {
        setLpErrorByAdId((prev) => ({
          ...prev,
          [ad.id]: data.message || "Kunne ikke inspicere landing page.",
        }));
        return;
      }
      setLpAuditByAdId((prev) => ({ ...prev, [ad.id]: data.audit }));
    } catch {
      setLpErrorByAdId((prev) => ({
        ...prev,
        [ad.id]: "Netværksfejl ved inspektion af landing page.",
      }));
    } finally {
      setInspectingLp(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-[#050811]/55 p-0 backdrop-blur-[4px] lg:items-center lg:p-5"
      onClick={onClose}
    >
      <div
        className="animate-sheet-up flex h-[94dvh] w-full max-w-[1140px] flex-col overflow-hidden rounded-t-[24px] border border-[#E6E9F0] bg-white text-[#0F172A] shadow-[0_24px_70px_rgba(5,8,17,0.3)] lg:h-[88vh] lg:flex-row lg:rounded-[20px]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ===================================================================
            LEFT PANE: TRENDTRACK-STYLE AD PREVIEW STAGE
           =================================================================== */}
        <div className="flex min-h-0 flex-1 flex-col bg-[#F7F8FB] lg:w-[58%] lg:border-r lg:border-[#ECEFF5]">
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
          <div className="flex-1 overflow-y-auto px-4 py-5">
            <div className="mx-auto w-full max-w-[396px] overflow-hidden rounded-2xl border border-[#E6E9F0] bg-white shadow-[0_2px_12px_rgba(15,23,42,0.05)]">
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
                    {localAnalysis.activeDays} days
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
                    className="max-h-[460px] w-full bg-black object-contain"
                  />
                ) : displayImage ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={displayImage}
                    alt={ad.headline || ad.brand_name}
                    onError={() => {
                      if (!mediaFailed) setFailedAdId(ad.id);
                    }}
                    className="max-h-[480px] w-full bg-[#F3F5F9] object-cover"
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
        <div className="flex min-h-0 flex-col bg-white lg:w-[42%]">
          {/* Top Tabs (Details | Script & Notes) + Desktop Close Button */}
          <div className="flex shrink-0 items-center justify-between border-b border-[#ECEFF5] px-5">
            <div className="flex items-center gap-6">
              <button
                type="button"
                onClick={() => setRightTab("details")}
                className={`border-b-2 py-3 text-[13px] font-semibold transition-colors ${
                  rightTab === "details"
                    ? "border-[#0F172A] text-[#0F172A]"
                    : "border-transparent text-[#64748B] hover:text-[#0F172A]"
                }`}
              >
                Details
              </button>
              <button
                type="button"
                onClick={() => setRightTab("script")}
                className={`inline-flex items-center gap-1.5 border-b-2 py-3 text-[13px] font-semibold transition-colors ${
                  rightTab === "script"
                    ? "border-[#0F172A] text-[#0F172A]"
                    : "border-transparent text-[#64748B] hover:text-[#0F172A]"
                }`}
              >
                <span>Script &amp; Notes</span>
                {(ad.ai_transcript || ad.user_notes) && (
                  <span className="h-1.5 w-1.5 rounded-full bg-[#16A34A]" />
                )}
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="Luk"
              className="hidden h-8 w-8 items-center justify-center rounded-lg text-[#64748B] transition-colors hover:bg-[#F3F5F9] hover:text-[#0F172A] lg:flex"
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
              <>
                {/* Segmented Sub-Tab: Ad Details | Landing Page */}
                <div className="grid grid-cols-2 rounded-xl bg-[#F3F5F9] p-1 text-xs font-semibold">
                  <button
                    type="button"
                    onClick={() => setDetailsSubTab("ad")}
                    className={`rounded-lg py-1.5 transition-all ${
                      detailsSubTab === "ad"
                        ? "bg-white text-[#0F172A] shadow-xs"
                        : "text-[#64748B] hover:text-[#0F172A]"
                    }`}
                  >
                    Ad Details
                  </button>
                  <button
                    type="button"
                    onClick={() => setDetailsSubTab("lp")}
                    className={`rounded-lg py-1.5 transition-all ${
                      detailsSubTab === "lp"
                        ? "bg-white text-[#0F172A] shadow-xs"
                        : "text-[#64748B] hover:text-[#0F172A]"
                    }`}
                  >
                    Landing Page
                  </button>
                </div>

                {detailsSubTab === "ad" && (
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
                          className="flex min-w-0 items-center gap-2 font-semibold text-[#0F172A] hover:text-[#0027eb]"
                        >
                          {ad.brand_logo_url ? (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img
                              src={ad.brand_logo_url}
                              alt=""
                              className="h-5 w-5 shrink-0 rounded-full border border-[#E6E9F0] bg-white object-contain p-0.5"
                            />
                          ) : (
                            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#0027eb] text-[9px] font-bold text-white">
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
                          {localAnalysis.activeDays} Days
                        </span>
                      </div>

                      {/* Active Since */}
                      <div className="grid grid-cols-[118px_1fr] items-center gap-3 py-2.5">
                        <span className="text-[#64748B]">Started</span>
                        <span className="font-mono-num text-[#334155]">
                          {formatIsoDate(ad.started_running_at)}
                        </span>
                      </div>

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

                      {/* Hook */}
                      {localAnalysis.hook && (
                        <div className="grid grid-cols-[118px_1fr] items-start gap-3 py-2.5">
                          <span className="pt-0.5 text-[#64748B]">Hook</span>
                          <div className="min-w-0">
                            <p className="text-[12px] font-medium leading-snug text-[#0F172A]">
                              &ldquo;{localAnalysis.hook}&rdquo;
                            </p>
                            <span className="mt-1 inline-block text-[10.5px] text-[#64748B]">
                              {localAnalysis.hookCategory}
                            </span>
                          </div>
                        </div>
                      )}

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

                    {/* Video Script Card inside Details — clean "Se hele scriptet" button, zero manual transcribe button */}
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

                {detailsSubTab === "lp" && (
                  <div className="rounded-2xl border border-[#ECEFF5] bg-white p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Globe className="h-4 w-4 text-[#64748B]" />
                        <h3 className="font-display text-[14px] font-bold text-[#0F172A]">
                          Landing Page Inspector
                        </h3>
                      </div>

                      {ad.landing_page_url && (
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={handleInspectLandingPage}
                            disabled={inspectingLp}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-[#E2E6EF] bg-white px-2.5 py-1.5 text-xs font-semibold text-[#0F172A] transition-colors hover:border-[#CBD5E1] hover:bg-[#F8FAFC] disabled:opacity-50"
                          >
                            {inspectingLp ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin text-[#475569]" />
                            ) : (
                              <Search className="h-3.5 w-3.5" />
                            )}
                            {inspectingLp
                              ? "Scanner..."
                              : lpAudit
                                ? "Opdatér"
                                : "Inspicér LP"}
                          </button>

                          <a
                            href={ad.landing_page_url}
                            target="_blank"
                            rel="noreferrer"
                            className="adtrack-btn-primary inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold text-white"
                          >
                            Åbn
                            <ArrowUpRight className="h-3.5 w-3.5" />
                          </a>
                        </div>
                      )}
                    </div>

                    {ad.landing_page_url ? (
                      <>
                        <p className="mt-2 truncate font-mono-num text-[11.5px] text-[#64748B]">
                          {ad.landing_page_url}
                        </p>

                        <div className="mt-3 flex flex-wrap gap-1.5">
                          <span className="rounded-md bg-[#F3F5F9] px-2.5 py-1 text-[11px] font-medium text-[#334155]">
                            {lpAudit?.funnelType || localAnalysis.funnelType}
                          </span>
                          {localAnalysis.offers.map((offer) => (
                            <span
                              key={offer}
                              className="inline-flex items-center gap-1 rounded-md bg-[#F1F5F9] px-2.5 py-1 text-[11px] font-medium text-[#334155]"
                            >
                              <Tag className="h-3 w-3 text-[#64748B]" />
                              {offer}
                            </span>
                          ))}
                          {localAnalysis.socialProof.map((proof) => (
                            <span
                              key={proof}
                              className="inline-flex items-center gap-1 rounded-md bg-[#F0FDF4] px-2.5 py-1 text-[11px] font-medium text-[#15803D]"
                            >
                              <ShieldCheck className="h-3 w-3" />
                              {proof}
                            </span>
                          ))}
                        </div>

                        {inspectingLp && (
                          <div className="mt-4 space-y-2.5 border-t border-[#F1F4F9] pt-3">
                            <div className="skeleton-shimmer h-4 w-3/4 rounded" />
                            <div className="skeleton-shimmer h-3 w-full rounded" />
                            <div className="skeleton-shimmer h-3 w-2/3 rounded" />
                          </div>
                        )}

                        {lpError && (
                          <p className="mt-3 rounded-xl bg-[#FFF1F2] px-3 py-2 text-xs text-[#9F1239]">
                            {lpError}
                          </p>
                        )}

                        {!inspectingLp && lpAudit && (
                          <div className="mt-4 space-y-3 border-t border-[#F1F4F9] pt-3 text-xs">
                            {(lpAudit.title || lpAudit.h1) && (
                              <div className="rounded-xl bg-[#FAFBFD] p-3">
                                <p className="font-semibold text-[#0F172A]">
                                  {lpAudit.h1 || lpAudit.title}
                                </p>
                                {lpAudit.description && (
                                  <p className="mt-1 line-clamp-3 text-[11.5px] text-[#64748B]">
                                    {lpAudit.description}
                                  </p>
                                )}
                                <div className="mt-2 flex flex-wrap items-center gap-3 font-mono-num text-[11px] text-[#475569]">
                                  {lpAudit.price && (
                                    <span className="font-semibold text-[#0F172A]">
                                      Pris: {lpAudit.price} {lpAudit.currency || ""}
                                    </span>
                                  )}
                                  <span className="inline-flex items-center gap-1">
                                    <Gauge className="h-3 w-3 text-[#16A34A]" />
                                    {lpAudit.responseMs} ms
                                  </span>
                                </div>
                              </div>
                            )}

                            {lpAudit.conversionSignals.length > 0 && (
                              <div className="flex flex-wrap gap-1.5">
                                {lpAudit.conversionSignals.map((sig) => (
                                  <span
                                    key={sig}
                                    className="inline-flex items-center gap-1 rounded-full border border-[#E6E9F0] bg-white px-2.5 py-0.5 text-[11px] font-medium text-[#334155]"
                                  >
                                    <Check className="h-3 w-3 text-[#16A34A]" />
                                    {sig}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </>
                    ) : (
                      <p className="mt-2 text-xs text-[#64748B]">
                        Ingen landing page URL fundet for denne annonce.
                      </p>
                    )}
                  </div>
                )}
              </>
            )}

            {rightTab === "script" && (
              <div className="space-y-4">
                {/* Video Script / Automatic Deepgram Transcription */}
                {ad.media_type === "video" && (
                  <div className="rounded-2xl border border-[#ECEFF5] bg-white p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Captions className="h-4 w-4 text-[#64748B]" />
                        <h3 className="font-display text-[13.5px] font-bold text-[#0F172A]">
                          Video Transcript
                        </h3>
                        {ad.duration_seconds ? (
                          <span className="font-mono-num text-[11px] text-[#64748B]">
                            {ad.duration_seconds}s
                          </span>
                        ) : null}
                      </div>

                      <div className="flex items-center gap-1.5">
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
                    </div>

                    {transcribing && !ad.ai_transcript && (
                      <div className="mt-3 space-y-2.5">
                        <div className="skeleton-shimmer h-14 w-full rounded-xl" />
                        <div className="skeleton-shimmer h-3.5 w-full rounded" />
                        <div className="skeleton-shimmer h-3.5 w-5/6 rounded" />
                        <div className="skeleton-shimmer h-3.5 w-3/4 rounded" />
                      </div>
                    )}

                    {ad.ai_hook_verbal && ad.ai_transcript && (
                      <div className="mt-3 rounded-xl bg-[#F8FAFC] p-3">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-[#64748B]">
                          Spoken Hook (0–3 sek.)
                        </p>
                        <p className="mt-1 text-[13px] font-medium text-[#0F172A]">
                          &ldquo;{ad.ai_hook_verbal}&rdquo;
                        </p>
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
