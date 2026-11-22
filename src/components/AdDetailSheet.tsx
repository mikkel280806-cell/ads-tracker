"use client";

import React, { useMemo, useState } from "react";
import {
  ArrowUpRight,
  Bookmark,
  Captions,
  Check,
  ChevronDown,
  ChevronUp,
  Clock,
  Copy,
  Download,
  ExternalLink,
  Film,
  Flame,
  Gauge,
  Globe,
  Image as ImageIcon,
  Layers,
  Loader2,
  Search,
  ShieldCheck,
  StickyNote,
  Store,
  Tag,
  TrendingUp,
  X,
} from "lucide-react";
import type { Ad, Board } from "@/lib/types";
import {
  analyzeAdLocally,
  type LiveLandingPageAudit,
} from "@/lib/ad-analyzer";

interface AdDetailSheetProps {
  ad: Ad | null;
  boards: Board[];
  onClose: () => void;
  onUpdateAd: (adId: string, patch: Partial<Ad>) => void;
  onToggleBoard: (adId: string, boardId: string) => void;
  onOpenBrand?: (brandId: string) => void;
}

export function AdDetailSheet({
  ad,
  boards,
  onClose,
  onUpdateAd,
  onToggleBoard,
  onOpenBrand,
}: AdDetailSheetProps) {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [copyExpanded, setCopyExpanded] = useState(false);
  const [notesOpen, setNotesOpen] = useState(false);
  const [mediaFailed, setMediaFailed] = useState(false);

  // Zero-cost Live Landing Page Inspector state (keyed by ad.id)
  const [inspectingLp, setInspectingLp] = useState(false);
  const [lpAuditByAdId, setLpAuditByAdId] = useState<
    Record<string, LiveLandingPageAudit>
  >({});
  const [lpErrorByAdId, setLpErrorByAdId] = useState<Record<string, string>>({});

  // Video transcription state (Groq Whisper / Deepgram API)
  const [transcribing, setTranscribing] = useState(false);
  const [transcribeErrorByAdId, setTranscribeErrorByAdId] = useState<
    Record<string, string>
  >({});

  const localAnalysis = useMemo(
    () => (ad ? analyzeAdLocally(ad) : null),
    [ad]
  );

  if (!ad || !localAnalysis) return null;

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

  const copyText = async (key: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 1800);
    } catch {
      // ignore
    }
  };

  const handleTranscribeVideo = async () => {
    if (!ad.media_url || transcribing) return;
    setTranscribing(true);
    setTranscribeErrorByAdId((prev) => {
      const next = { ...prev };
      delete next[ad.id];
      return next;
    });
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
      if (!data.ok || !data.transcript) {
        setTranscribeErrorByAdId((prev) => ({
          ...prev,
          [ad.id]: data.message || "Kunne ikke transskribere videoen.",
        }));
        return;
      }
      onUpdateAd(ad.id, {
        ai_transcript: data.transcript,
        ai_hook_verbal: data.hook || ad.ai_hook_verbal,
        duration_seconds: data.durationSec || ad.duration_seconds,
      });
    } catch {
      setTranscribeErrorByAdId((prev) => ({
        ...prev,
        [ad.id]: "Netværksfejl ved video-transskription.",
      }));
    } finally {
      setTranscribing(false);
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

  const tierBadgeClass =
    localAnalysis.scalingTier === "Scaling Winner"
      ? "bg-[#ECFDF3] text-[#15803D]"
      : localAnalysis.scalingTier === "Proven"
        ? "bg-[#EEF2FF] text-[#0027eb]"
        : "bg-[#F1F5F9] text-[#475569]";

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-[#05060B]/55 p-0 backdrop-blur-[4px] lg:items-center lg:p-6"
      onClick={onClose}
    >
      <div
        className="animate-sheet-up flex h-[92dvh] w-full max-w-[960px] flex-col overflow-hidden rounded-t-[26px] border border-[#E6E9F0] bg-white text-[#0F172A] shadow-[0_24px_70px_rgba(5,6,11,0.28)] lg:h-[84vh] lg:flex-row lg:rounded-[22px]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* iOS Drag Handle */}
        <div className="flex justify-center pb-1 pt-2.5 lg:hidden">
          <span className="h-1 w-9 rounded-full bg-[#D4DAE6]" />
        </div>

        {/* ===================================================================
            LEFT COLUMN: PURE CREATIVE STAGE
           =================================================================== */}
        <div className="flex shrink-0 flex-col bg-[#F5F7FA] lg:w-[44%] lg:border-r lg:border-[#ECEFF5]">
          {/* Mobile Compact Header */}
          <div className="flex items-center justify-between gap-2 bg-white px-4 pb-3 pt-1 lg:hidden">
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
                  className="h-8 w-8 shrink-0 rounded-full border border-[#E6E9F0] bg-white object-contain p-0.5"
                />
              ) : (
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#0027eb] font-display text-xs font-bold text-white">
                  {ad.brand_avatar_initials}
                </span>
              )}
              <div className="min-w-0">
                <p className="truncate font-display text-[14px] font-semibold leading-tight text-[#0F172A]">
                  {ad.brand_name}
                </p>
                <p className="text-[11px] text-[#64748B]">
                  {localAnalysis.activeDays}d live · {ad.market}
                </p>
              </div>
            </button>

            <button
              type="button"
              onClick={onClose}
              aria-label="Luk"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#F1F5F9] text-[#475569] transition-colors active:bg-[#E2E8F0]"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Media Viewport */}
          <div className="relative flex max-h-[34dvh] flex-1 items-center justify-center overflow-hidden p-4 lg:max-h-none lg:p-6">
            {isVideoFile ? (
              <video
                src={ad.media_url}
                poster={displayImage}
                controls
                playsInline
                onError={() => setMediaFailed(true)}
                className="max-h-full w-full rounded-2xl bg-black object-contain shadow-[0_8px_24px_rgba(15,23,42,0.12)]"
              />
            ) : displayImage ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={displayImage}
                alt={ad.headline}
                onError={() => {
                  if (!mediaFailed) setMediaFailed(true);
                }}
                className="max-h-full max-w-full rounded-2xl border border-[#E6E9F0] bg-white object-contain shadow-[0_8px_24px_rgba(15,23,42,0.08)]"
              />
            ) : (
              <div className="flex flex-col items-center justify-center gap-2 p-8 text-center">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#0027eb] font-display text-sm font-bold text-white">
                  {ad.brand_avatar_initials}
                </span>
                <p className="text-xs text-[#64748B]">Medie utilgængeligt</p>
              </div>
            )}
          </div>

          {/* Minimal Bottom Telemetry & Media Actions */}
          <div className="flex items-center justify-between gap-2 border-t border-[#ECEFF5] bg-white/90 px-4 py-3 text-xs text-[#475569]">
            <div className="flex items-center gap-3 font-mono-num">
              <span className="inline-flex items-center gap-1.5 font-semibold text-[#0F172A]">
                <Clock className="h-3.5 w-3.5 text-[#16A34A]" />
                {localAnalysis.activeDays}d
              </span>
              {ad.duplicated_count && ad.duplicated_count > 1 && (
                <span className="inline-flex items-center gap-1 font-semibold text-[#0F172A]">
                  <Layers className="h-3.5 w-3.5 text-[#0027eb]" />
                  ×{ad.duplicated_count}
                </span>
              )}
              <span className="inline-flex items-center gap-1 text-[#64748B]">
                {ad.media_type === "video" ? (
                  <Film className="h-3.5 w-3.5" />
                ) : (
                  <ImageIcon className="h-3.5 w-3.5" />
                )}
                {ad.display_format || ad.media_type}
              </span>
            </div>

            <div className="flex items-center gap-1">
              {downloadUrl && (
                <a
                  href={downloadUrl}
                  target="_blank"
                  rel="noreferrer"
                  download
                  title="Åbn / download medie"
                  className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11.5px] font-medium text-[#475569] transition-colors hover:bg-[#F1F5F9] hover:text-[#0027eb]"
                >
                  <Download className="h-3.5 w-3.5" />
                </a>
              )}
              {ad.source_url && (
                <a
                  href={ad.source_url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11.5px] font-medium text-[#475569] transition-colors hover:bg-[#F1F5F9] hover:text-[#0027eb]"
                >
                  Meta Library
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>
          </div>
        </div>

        {/* ===================================================================
            RIGHT COLUMN: TRENDTRACK-STYLE DETERMINISTIC AD VIEWER (0 AI KEYS)
           =================================================================== */}
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-white">
          {/* Desktop Minimal Header */}
          <div className="hidden items-center justify-between gap-3 border-b border-[#ECEFF5] px-6 py-4 lg:flex">
            <button
              type="button"
              onClick={() => {
                if (onOpenBrand) {
                  onOpenBrand(ad.brand_id);
                  onClose();
                }
              }}
              className="group flex min-w-0 items-center gap-3 text-left"
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
                <div className="flex items-center gap-2">
                  <p className="truncate font-display text-[15px] font-semibold text-[#0F172A] transition-colors group-hover:text-[#0027eb]">
                    {ad.brand_name}
                  </p>
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10.5px] font-semibold ${tierBadgeClass}`}
                  >
                    {localAnalysis.scalingTier === "Scaling Winner" ? (
                      <Flame className="h-3 w-3" />
                    ) : (
                      <TrendingUp className="h-3 w-3" />
                    )}
                    {localAnalysis.scalingTier}
                  </span>
                </div>
                <p className="flex items-center gap-1 text-xs text-[#64748B]">
                  <Store className="h-3 w-3" />
                  Åbn shop-analyse · {localAnalysis.scalingReason}
                </p>
              </div>
            </button>

            <button
              type="button"
              onClick={onClose}
              aria-label="Luk"
              className="flex h-8 w-8 items-center justify-center rounded-full text-[#64748B] transition-colors hover:bg-[#F3F5F9] hover:text-[#0F172A]"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Single Calm Scroll Area */}
          <div className="pb-safe flex-1 space-y-5 overflow-y-auto px-4 py-4 lg:px-6 lg:py-5">
            {/* 1. OPENING HOOK + INSTANT SIGNALS */}
            <section className="space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[#64748B]">
                      {localAnalysis.hookCategory}
                    </span>
                    <span className="text-[#CBD5E1]">·</span>
                    <span className="font-mono-num text-[11px] text-[#64748B]">
                      {localAnalysis.copyStyle} ({localAnalysis.wordCount} ord)
                    </span>
                  </div>
                  <h2 className="mt-1 font-display text-[16px] font-semibold leading-snug text-[#0F172A]">
                    &ldquo;{localAnalysis.hook}&rdquo;
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => copyText("hook", localAnalysis.hook)}
                  title="Kopiér hook"
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[#E6E9F0] text-[#64748B] transition-colors hover:border-[#0027eb] hover:text-[#0027eb]"
                >
                  {copiedKey === "hook" ? (
                    <Check className="h-3.5 w-3.5 text-[#16A34A]" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                </button>
              </div>

              {/* Instant Detected Signals (Offers, Social Proof, Funnel) — 0ms, 0 API keys */}
              {(localAnalysis.offers.length > 0 ||
                localAnalysis.socialProof.length > 0) && (
                <div className="flex flex-wrap gap-1.5">
                  {localAnalysis.offers.map((offer) => (
                    <span
                      key={offer}
                      className="inline-flex items-center gap-1 rounded-full border border-[#DCE3F5] bg-[#F5F8FF] px-2.5 py-0.5 text-[11px] font-medium text-[#0027eb]"
                    >
                      <Tag className="h-3 w-3" />
                      {offer}
                    </span>
                  ))}
                  {localAnalysis.socialProof.map((proof) => (
                    <span
                      key={proof}
                      className="inline-flex items-center gap-1 rounded-full border border-[#DCFCE7] bg-[#F0FDF4] px-2.5 py-0.5 text-[11px] font-medium text-[#15803D]"
                    >
                      <ShieldCheck className="h-3 w-3" />
                      {proof}
                    </span>
                  ))}
                </div>
              )}

              {/* Collapsible Primary Copy */}
              {ad.primary_text && (
                <div className="rounded-xl bg-[#F8F9FC] p-3.5">
                  <p
                    className={`whitespace-pre-wrap text-[13px] leading-relaxed text-[#334155] ${
                      copyExpanded ? "" : "line-clamp-3"
                    }`}
                  >
                    {ad.primary_text}
                  </p>
                  <div className="mt-2 flex items-center justify-between gap-2">
                    {ad.primary_text.length > 140 ? (
                      <button
                        type="button"
                        onClick={() => setCopyExpanded((v) => !v)}
                        className="inline-flex items-center gap-1 text-[11.5px] font-semibold text-[#64748B] hover:text-[#0F172A]"
                      >
                        {copyExpanded ? (
                          <>
                            Vis mindre <ChevronUp className="h-3.5 w-3.5" />
                          </>
                        ) : (
                          <>
                            Læs hele teksten{" "}
                            <ChevronDown className="h-3.5 w-3.5" />
                          </>
                        )}
                      </button>
                    ) : (
                      <span />
                    )}

                    <button
                      type="button"
                      onClick={() => copyText("copy", ad.primary_text)}
                      className="inline-flex items-center gap-1 text-[11.5px] font-medium text-[#64748B] hover:text-[#0027eb]"
                    >
                      {copiedKey === "copy" ? (
                        <>
                          <Check className="h-3 w-3 text-[#16A34A]" /> Kopieret
                        </>
                      ) : (
                        <>
                          <Copy className="h-3 w-3" /> Kopiér tekst
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </section>

            {/* 1B. VIDEO SCRIPT & SPOKEN HOOK (Groq Whisper / Deepgram Speech-to-Text) */}
            {ad.media_type === "video" && (
              <section className="rounded-2xl border border-[#E6E9F0] bg-[#FAFBFD] p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Captions className="h-4 w-4 text-[#0027eb]" />
                    <h3 className="font-display text-[13.5px] font-semibold text-[#0F172A]">
                      Video Script
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
                        className="inline-flex items-center gap-1 rounded-lg border border-[#E2E6EF] bg-white px-2.5 py-1.5 text-[11.5px] font-medium text-[#475569] hover:text-[#0027eb]"
                      >
                        {copiedKey === "transcript" ? (
                          <Check className="h-3.5 w-3.5 text-[#16A34A]" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                        Kopiér script
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={handleTranscribeVideo}
                      disabled={transcribing}
                      className="adtrack-btn-primary inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-white transition-all disabled:opacity-55"
                    >
                      {transcribing ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Captions className="h-3.5 w-3.5" />
                      )}
                      {transcribing
                        ? "Transskriberer..."
                        : ad.ai_transcript
                          ? "Opdatér"
                          : "Transskribér video"}
                    </button>
                  </div>
                </div>

                {ad.ai_hook_verbal && ad.ai_transcript && (
                  <div className="mt-3 rounded-xl border border-[#DCE3F5] bg-white p-3">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-[#0027eb]">
                      Spoken Hook (0–3 sek.)
                    </p>
                    <p className="mt-1 text-[13px] font-medium text-[#0F172A]">
                      &ldquo;{ad.ai_hook_verbal}&rdquo;
                    </p>
                  </div>
                )}

                {ad.ai_transcript && (
                  <p className="mt-2.5 whitespace-pre-wrap rounded-xl border border-[#ECEFF5] bg-white p-3 text-[12.5px] leading-relaxed text-[#334155]">
                    {ad.ai_transcript}
                  </p>
                )}

                {transcribeError && (
                  <p className="mt-2.5 rounded-xl bg-[#FFF1F2] px-3 py-2 text-xs text-[#9F1239]">
                    {transcribeError}
                  </p>
                )}
              </section>
            )}

            {/* 2. LANDING PAGE & LIVE FUNNEL INSPECTOR (100% Free Tool — 0 AI Keys) */}
            {ad.landing_page_url && (
              <section className="rounded-2xl border border-[#E6E9F0] bg-[#FAFBFD] p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <Globe className="h-4 w-4 shrink-0 text-[#0027eb]" />
                    <h3 className="font-display text-[13.5px] font-semibold text-[#0F172A]">
                      Landing Page
                    </h3>
                    <span className="rounded-md bg-white px-2 py-0.5 text-[10.5px] font-medium text-[#475569] ring-1 ring-[#E6E9F0]">
                      {lpAudit?.funnelType || localAnalysis.funnelType}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={handleInspectLandingPage}
                      disabled={inspectingLp}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-[#E2E6EF] bg-white px-2.5 py-1.5 text-xs font-semibold text-[#0F172A] transition-colors hover:border-[#0027eb] hover:text-[#0027eb] disabled:opacity-50"
                    >
                      {inspectingLp ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin text-[#0027eb]" />
                      ) : (
                        <Search className="h-3.5 w-3.5" />
                      )}
                      {inspectingLp
                        ? "Scanner..."
                        : lpAudit
                          ? "Opdatér LP"
                          : "Inspicér LP"}
                    </button>

                    <a
                      href={ad.landing_page_url}
                      target="_blank"
                      rel="noreferrer"
                      className="adtrack-btn-primary inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold text-white"
                    >
                      {ad.cta_text || "Åbn LP"}
                      <ArrowUpRight className="h-3.5 w-3.5" />
                    </a>
                  </div>
                </div>

                <p className="mt-2 truncate font-mono-num text-[11.5px] text-[#64748B]">
                  {ad.landing_page_url.replace(/^https?:\/\/(www\.)?/, "")}
                </p>

                {lpError && (
                  <p className="mt-2.5 rounded-xl bg-[#FFF1F2] px-3 py-2 text-xs text-[#9F1239]">
                    {lpError}
                  </p>
                )}

                {lpAudit && (
                  <div className="mt-3 space-y-2.5 border-t border-[#E6E9F0] pt-3 text-xs">
                    {(lpAudit.title || lpAudit.h1) && (
                      <div className="rounded-xl border border-[#ECEFF5] bg-white p-3">
                        <p className="font-semibold text-[#0F172A]">
                          {lpAudit.h1 || lpAudit.title}
                        </p>
                        {lpAudit.description && (
                          <p className="mt-1 line-clamp-2 text-[11.5px] text-[#64748B]">
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
              </section>
            )}

            {/* 3. FOLDERS & QUICK NOTE */}
            <section className="space-y-3 border-t border-[#ECEFF5] pt-4">
              <div className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#475569]">
                  <Bookmark className="h-3.5 w-3.5" />
                  Folders
                </span>
                <button
                  type="button"
                  onClick={() => setNotesOpen((v) => !v)}
                  className="inline-flex items-center gap-1 text-xs font-medium text-[#64748B] hover:text-[#0F172A]"
                >
                  <StickyNote className="h-3.5 w-3.5" />
                  {ad.user_notes ? "Redigér note" : "Tilføj note"}
                </button>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {boards.map((board) => {
                  const active = ad.board_ids.includes(board.id);
                  return (
                    <button
                      key={board.id}
                      type="button"
                      onClick={() => onToggleBoard(ad.id, board.id)}
                      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-all ${
                        active
                          ? "border-[#0027eb] bg-[#0027eb] text-white"
                          : "border-[#E6E9F0] bg-white text-[#334155] hover:border-[#CBD5E1]"
                      }`}
                    >
                      <span
                        className="h-1.5 w-1.5 rounded-full"
                        style={{
                          backgroundColor: active
                            ? "#FFFFFF"
                            : board.accent_color,
                        }}
                      />
                      {board.name}
                    </button>
                  );
                })}
              </div>

              {(notesOpen || ad.user_notes) && (
                <textarea
                  rows={2}
                  value={ad.user_notes}
                  onChange={(e) =>
                    onUpdateAd(ad.id, { user_notes: e.target.value })
                  }
                  placeholder="Kort note om vinkel, hook eller testidé..."
                  className="w-full rounded-xl border border-[#E2E6EF] bg-[#FAFBFD] px-3 py-2 text-[16px] leading-relaxed text-[#0F172A] outline-none transition-colors focus:border-[#0027eb] focus:bg-white sm:text-xs"
                />
              )}
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
