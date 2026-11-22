"use client";

import React, { useState } from "react";
import {
  ArrowUpRight,
  Bookmark,
  Check,
  ChevronDown,
  ChevronUp,
  Clock,
  Copy,
  ExternalLink,
  Film,
  Globe,
  Image as ImageIcon,
  Layers,
  Loader2,
  RefreshCw,
  Send,
  Sparkles,
  StickyNote,
  Store,
  X,
} from "lucide-react";
import type { Ad, Board } from "@/lib/types";
import { buildGeminiPrompt, getActiveDays } from "@/lib/url-parser";

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
  const [transcriptOpen, setTranscriptOpen] = useState(false);
  const [notesOpen, setNotesOpen] = useState(false);
  const [mediaFailed, setMediaFailed] = useState(false);

  // Live Gemini via official `agy acp`
  const [analyzing, setAnalyzing] = useState(false);
  const [asking, setAsking] = useState(false);
  const [question, setQuestion] = useState("");
  const [qaReply, setQaReply] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [statusError, setStatusError] = useState(false);

  if (!ad) return null;

  const activeDays = getActiveDays(ad.started_running_at);
  const isVideoFile =
    !mediaFailed &&
    ad.media_type === "video" &&
    /\.(mp4|webm|mov)(\?|$)/i.test(ad.media_url);

  const displayImage = mediaFailed
    ? ad.fallback_image_url || ""
    : ad.thumbnail_url || ad.fallback_image_url || ad.media_url || "";

  const hasTeardown = Boolean(
    ad.ai_hook_verbal ||
      ad.ai_hook_visual ||
      ad.ai_script_breakdown ||
      (ad.ai_why_it_works && ad.ai_why_it_works.length > 0)
  );

  const copyText = async (key: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 1800);
    } catch {
      // ignore
    }
  };

  const runGeminiTeardown = async () => {
    setAnalyzing(true);
    setStatusMessage(null);
    setStatusError(false);
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ad }),
      });
      const data = await res.json();

      if (!data.ok) {
        setStatusError(true);
        setStatusMessage(
          data.message || "Kunne ikke køre Gemini via agy acp."
        );
        return;
      }

      if (data.mode === "teardown" && data.analysis) {
        onUpdateAd(ad.id, {
          status: "ready",
          ...data.analysis,
        });
        setStatusMessage(null);
      } else if (data.mode === "answer" && data.answer) {
        setQaReply(data.answer);
      } else if (data.message) {
        setStatusMessage(data.message);
      }
    } catch {
      setStatusError(true);
      setStatusMessage("Netværksfejl ved opkald til /api/analyze.");
    } finally {
      setAnalyzing(false);
    }
  };

  const handleAskGemini = async (e: React.FormEvent) => {
    e.preventDefault();
    const q = question.trim();
    if (!q || asking) return;
    setAsking(true);
    setStatusMessage(null);
    setStatusError(false);
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ad, question: q }),
      });
      const data = await res.json();
      if (!data.ok) {
        setStatusError(true);
        setStatusMessage(data.message || "agy acp kunne ikke svare.");
        return;
      }
      if (data.answer) {
        setQaReply(data.answer);
        setQuestion("");
      } else if (data.message) {
        setStatusMessage(data.message);
      }
    } catch {
      setStatusError(true);
      setStatusMessage("Netværksfejl ved opkald til /api/analyze.");
    } finally {
      setAsking(false);
    }
  };

  const formatBreakdownForCopy = () => {
    const sb = ad.ai_script_breakdown;
    return [
      `${ad.brand_name} — Gemini Creative Breakdown`,
      ad.ai_angle ? `Angle: ${ad.ai_angle}` : "",
      ad.ai_hook_verbal ? `Verbal Hook: ${ad.ai_hook_verbal}` : "",
      ad.ai_hook_visual ? `Visual Hook: ${ad.ai_hook_visual}` : "",
      ad.ai_why_it_works?.length
        ? `\nWhy it works:\n${ad.ai_why_it_works.map((w) => `- ${w}`).join("\n")}`
        : "",
      sb
        ? `\nScript:\n- Hook: ${sb.hook}\n- Body: ${sb.body}\n- Proof: ${sb.social_proof}\n- CTA: ${sb.cta}`
        : "",
    ]
      .filter(Boolean)
      .join("\n");
  };

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
          {/* Mobile Compact Top Bar */}
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
                  {activeDays}d live · {ad.market}
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

          {/* Minimal Bottom Telemetry Strip */}
          <div className="flex items-center justify-between gap-2 border-t border-[#ECEFF5] bg-white/90 px-4 py-3 text-xs text-[#475569]">
            <div className="flex items-center gap-3 font-mono-num">
              <span className="inline-flex items-center gap-1.5 font-semibold text-[#0F172A]">
                <Clock className="h-3.5 w-3.5 text-[#16A34A]" />
                {activeDays}d
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

        {/* ===================================================================
            RIGHT COLUMN: SINGLE CALM READING FLOW (KISS — ZERO HIDDEN TABS)
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
                <p className="truncate font-display text-[15px] font-semibold text-[#0F172A] transition-colors group-hover:text-[#0027eb]">
                  {ad.brand_name}
                </p>
                <p className="flex items-center gap-1 text-xs text-[#64748B]">
                  <Store className="h-3 w-3" />
                  Åbn shop-analyse
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
            {/* 1. OPENING HOOK + AD COPY + LANDING PAGE */}
            <section className="space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[#64748B]">
                    {ad.hook_category || "Opening Hook"}
                  </p>
                  <h2 className="mt-1 font-display text-[16px] font-semibold leading-snug text-[#0F172A]">
                    &ldquo;{ad.extracted_hook || ad.headline}&rdquo;
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    copyText("hook", ad.extracted_hook || ad.headline || "")
                  }
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

              {/* Compact Landing Page & CTA Row */}
              {ad.landing_page_url && (
                <a
                  href={ad.landing_page_url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-between gap-3 rounded-xl border border-[#ECEFF5] px-3.5 py-2.5 transition-colors hover:border-[#0027eb]/40 hover:bg-[#FAFBFD]"
                >
                  <span className="flex min-w-0 items-center gap-2 text-xs">
                    <Globe className="h-3.5 w-3.5 shrink-0 text-[#64748B]" />
                    <span className="truncate font-mono-num text-[#334155]">
                      {ad.landing_page_path && ad.landing_page_path !== "/"
                        ? ad.landing_page_path
                        : ad.landing_page_url.replace(/^https?:\/\/(www\.)?/, "")}
                    </span>
                  </span>
                  <span className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-[#0027eb]">
                    {ad.cta_text || "Shop now"}
                    <ArrowUpRight className="h-3.5 w-3.5" />
                  </span>
                </a>
              )}
            </section>

            {/* 2. GEMINI AI ANALYSIS (VIA OFFICIAL AGY ACP SUBSCRIPTION) */}
            <section className="rounded-2xl border border-[#E6E9F0] bg-[#FAFBFD] p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-[#0027eb]" />
                  <h3 className="font-display text-[13.5px] font-semibold text-[#0F172A]">
                    Gemini Analyse
                  </h3>
                  <span className="rounded-md bg-[#EEF2FF] px-1.5 py-0.5 font-mono-num text-[10px] font-semibold text-[#0027eb]">
                    agy acp
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  {hasTeardown && (
                    <button
                      type="button"
                      onClick={() =>
                        copyText("breakdown", formatBreakdownForCopy())
                      }
                      title="Kopiér analyse"
                      className="inline-flex items-center gap-1 rounded-lg border border-[#E2E6EF] bg-white px-2.5 py-1.5 text-[11.5px] font-medium text-[#475569] hover:text-[#0027eb]"
                    >
                      {copiedKey === "breakdown" ? (
                        <Check className="h-3.5 w-3.5 text-[#16A34A]" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                      Kopiér
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={runGeminiTeardown}
                    disabled={analyzing}
                    className="adtrack-btn-primary inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-white transition-all disabled:opacity-55"
                  >
                    {analyzing ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : hasTeardown ? (
                      <RefreshCw className="h-3.5 w-3.5" />
                    ) : (
                      <Sparkles className="h-3.5 w-3.5" />
                    )}
                    {analyzing
                      ? "Analyserer..."
                      : hasTeardown
                        ? "Opdatér"
                        : "Analysér med Gemini"}
                  </button>
                </div>
              </div>

              {/* Structured Teardown Result */}
              {hasTeardown && (
                <div className="mt-3.5 space-y-3 border-t border-[#E6E9F0] pt-3.5 text-[12.5px]">
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {ad.ai_hook_verbal && (
                      <div className="rounded-xl border border-[#ECEFF5] bg-white p-3">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-[#64748B]">
                          Verbal Hook
                        </p>
                        <p className="mt-1 font-medium text-[#0F172A]">
                          {ad.ai_hook_verbal}
                        </p>
                      </div>
                    )}
                    {ad.ai_hook_visual && (
                      <div className="rounded-xl border border-[#ECEFF5] bg-white p-3">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-[#64748B]">
                          Visual Hook
                        </p>
                        <p className="mt-1 font-medium text-[#0F172A]">
                          {ad.ai_hook_visual}
                        </p>
                      </div>
                    )}
                  </div>

                  {ad.ai_why_it_works && ad.ai_why_it_works.length > 0 && (
                    <div className="rounded-xl border border-[#ECEFF5] bg-white p-3">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-[#64748B]">
                        Hvorfor den virker {ad.ai_angle ? `· ${ad.ai_angle}` : ""}
                      </p>
                      <ul className="mt-1.5 space-y-1 text-[#334155]">
                        {ad.ai_why_it_works.map((point, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-[#0027eb]" />
                            <span>{point}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {ad.ai_script_breakdown && (
                    <div className="grid grid-cols-1 gap-2 rounded-xl border border-[#ECEFF5] bg-white p-3 sm:grid-cols-2">
                      {[
                        { k: "1. Hook", v: ad.ai_script_breakdown.hook },
                        { k: "2. Body", v: ad.ai_script_breakdown.body },
                        {
                          k: "3. Social Proof",
                          v: ad.ai_script_breakdown.social_proof,
                        },
                        { k: "4. CTA", v: ad.ai_script_breakdown.cta },
                      ]
                        .filter((r) => r.v)
                        .map((row) => (
                          <div key={row.k}>
                            <p className="text-[10px] font-semibold uppercase tracking-wider text-[#64748B]">
                              {row.k}
                            </p>
                            <p className="mt-0.5 text-[#334155]">{row.v}</p>
                          </div>
                        ))}
                    </div>
                  )}

                  {ad.ai_transcript && (
                    <div>
                      <button
                        type="button"
                        onClick={() => setTranscriptOpen((v) => !v)}
                        className="inline-flex items-center gap-1 text-[11.5px] font-semibold text-[#64748B] hover:text-[#0F172A]"
                      >
                        {transcriptOpen ? (
                          <>
                            Skjul transskription{" "}
                            <ChevronUp className="h-3.5 w-3.5" />
                          </>
                        ) : (
                          <>
                            Vis transskription{" "}
                            <ChevronDown className="h-3.5 w-3.5" />
                          </>
                        )}
                      </button>
                      {transcriptOpen && (
                        <p className="mt-2 whitespace-pre-wrap rounded-xl border border-[#ECEFF5] bg-white p-3 text-xs leading-relaxed text-[#475569]">
                          {ad.ai_transcript}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Interactive Follow-Up Ask Bar (single-user interactive agy acp) */}
              <form
                onSubmit={handleAskGemini}
                className="mt-3 flex items-center gap-2"
              >
                <input
                  type="text"
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder="Spørg Gemini om annoncen (fx omskriv hook til dit brand)..."
                  className="min-w-0 flex-1 rounded-xl border border-[#E2E6EF] bg-white px-3 py-2 text-[16px] text-[#0F172A] outline-none transition-colors placeholder:text-[#94A3B8] focus:border-[#0027eb] sm:text-xs"
                />
                <button
                  type="submit"
                  disabled={asking || !question.trim()}
                  aria-label="Send spørgsmål til Gemini"
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[#E2E6EF] bg-white text-[#0027eb] transition-colors hover:border-[#0027eb] hover:bg-[#EEF2FF] disabled:opacity-40"
                >
                  {asking ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </button>
              </form>

              {qaReply && (
                <div className="mt-3 rounded-xl border border-[#DCE3F5] bg-white p-3 text-[12.5px] leading-relaxed text-[#1E293B]">
                  <div className="mb-1.5 flex items-center justify-between">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-[#0027eb]">
                      Gemini svar
                    </span>
                    <button
                      type="button"
                      onClick={() => copyText("qa", qaReply)}
                      className="inline-flex items-center gap-1 text-[11px] font-medium text-[#64748B] hover:text-[#0027eb]"
                    >
                      {copiedKey === "qa" ? (
                        <Check className="h-3 w-3 text-[#16A34A]" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                      Kopiér
                    </button>
                  </div>
                  <p className="whitespace-pre-wrap">{qaReply}</p>
                </div>
              )}

              {statusMessage && (
                <div
                  className={`mt-3 flex items-center justify-between gap-2 rounded-xl border px-3 py-2 text-xs ${
                    statusError
                      ? "border-[#FECDD3] bg-[#FFF1F2] text-[#9F1239]"
                      : "border-[#E6E9F0] bg-white text-[#475569]"
                  }`}
                >
                  <span className="leading-snug">{statusMessage}</span>
                  <button
                    type="button"
                    onClick={() => copyText("prompt", buildGeminiPrompt(ad))}
                    className="shrink-0 font-semibold text-[#0027eb] hover:underline"
                  >
                    {copiedKey === "prompt" ? "Kopieret!" : "Kopiér prompt"}
                  </button>
                </div>
              )}
            </section>

            {/* 3. FOLDERS & QUICK NOTE (Inline — No extra tab) */}
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
