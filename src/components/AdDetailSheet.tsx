"use client";

import React, { useState } from "react";
import {
  ArrowUpRight,
  Bookmark,
  Check,
  Copy,
  ExternalLink,
  FileText,
  Flame,
  Layers,
  Loader2,
  Sparkles,
  Store,
  Wand2,
  X,
  Zap,
} from "lucide-react";
import type { Ad, Board } from "@/lib/types";
import {
  buildGeminiPrompt,
  formatReach,
  getActiveDays,
} from "@/lib/url-parser";
import { MetaInfinityIcon } from "./BrandIcons";

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
  const [tab, setTab] = useState<"details" | "copy" | "folders">("details");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeStatus, setAnalyzeStatus] = useState<string | null>(null);
  const [mediaFailed, setMediaFailed] = useState(false);

  const [myProduct, setMyProduct] = useState("");
  const [myUsp, setMyUsp] = useState("");
  const [generatedBrief, setGeneratedBrief] = useState("");

  if (!ad) return null;

  const activeDays = getActiveDays(ad.started_running_at);
  const isVideoFile =
    !mediaFailed &&
    ad.media_type === "video" &&
    /\.(mp4|webm|mov)(\?|$)/i.test(ad.media_url);

  const displayImage = mediaFailed
    ? ad.fallback_image_url || ""
    : ad.thumbnail_url || ad.fallback_image_url || ad.media_url || "";

  const copyText = async (key: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 1800);
    } catch {
      // ignore
    }
  };

  const handleTriggerInstaBox = async () => {
    setAnalyzing(true);
    setAnalyzeStatus(null);
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adId: ad.id }),
      });
      const data = await res.json();
      setAnalyzeStatus(data.message || "Forespørgsel sendt til InstaBox.");
      if (data.ok) {
        onUpdateAd(ad.id, { status: "pending_ai" });
      }
    } catch {
      setAnalyzeStatus("Kunne ikke kontakte /api/analyze.");
    } finally {
      setAnalyzing(false);
    }
  };

  const handleGenerateBrief = () => {
    const product = myProduct.trim() || "[Dit Produkt]";
    const usp = myUsp.trim() || "hurtig synlig effekt + tilfredshedsgaranti";
    const hookText =
      ad.extracted_hook ||
      ad.ai_hook_verbal ||
      ad.headline ||
      "Stop scroll-åbning med tydeligt problem/løsning.";

    const brief = [
      `CREATOR BRIEF — Inspireret af ${ad.brand_name} (${ad.hook_category || ad.ai_angle || "Vinder-vinkel"})`,
      `Format: ${ad.ai_format || ad.media_type} · Live i ${activeDays} dage`,
      "",
      `1. OPENING HOOK (0–3 sek.):`,
      `Tilpas til ${product}: "${hookText}"`,
      "",
      `2. BODY & DEMO (3–18 sek.):`,
      `- Vis ${product} i brug med fokus på: ${usp}.`,
      `- Hurtige klip (maks. 2–3 sek. pr. scene) + tekst-overlay.`,
      "",
      `3. LANDING PAGE & CTA (18–25 sek.):`,
      `- CTA: "${ad.cta_text || "Shop now"}"`,
      `- Reference LP: ${ad.landing_page_url || "N/A"}`,
      `- Meta Ad Library: ${ad.source_url || "N/A"}`,
    ].join("\n");
    setGeneratedBrief(brief);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-[#05060B]/60 p-0 backdrop-blur-[3px] lg:items-center lg:p-6"
      onClick={onClose}
    >
      <div
        className="animate-sheet-up flex h-[93dvh] w-full max-w-5xl flex-col overflow-hidden rounded-t-3xl border border-[#E2E6EF] bg-white text-[#0F172A] shadow-2xl lg:h-[86vh] lg:flex-row lg:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Mobile Header */}
        <div className="flex items-center justify-between border-b border-[#E6E9F0] px-4 py-3 lg:hidden">
          <button
            type="button"
            onClick={() => {
              if (onOpenBrand) {
                onOpenBrand(ad.brand_id);
                onClose();
              }
            }}
            className="flex items-center gap-2.5 text-left"
          >
            {ad.brand_logo_url ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={ad.brand_logo_url}
                alt={ad.brand_name}
                className="h-8 w-8 rounded-full border border-[#E6E9F0] bg-white object-contain p-0.5"
              />
            ) : (
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#0027eb] text-xs font-bold text-white">
                {ad.brand_avatar_initials}
              </span>
            )}
            <div>
              <p className="font-display text-xs font-bold leading-tight">
                {ad.brand_name}
              </p>
              <p className="text-[11px] text-[#64748B]">Åbn shop-analyse →</p>
            </div>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-[#64748B]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* LEFT COLUMN: Creative Preview + Telemetry */}
        <div className="flex shrink-0 flex-col border-b border-[#E6E9F0] bg-[#F7F8FB] lg:w-[44%] lg:border-b-0 lg:border-r">
          <div className="hidden items-center justify-between border-b border-[#E6E9F0] bg-white px-4 py-2.5 lg:flex">
            <button
              type="button"
              onClick={() => {
                if (onOpenBrand) {
                  onOpenBrand(ad.brand_id);
                  onClose();
                }
              }}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#0F172A] px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-[#0027eb]"
            >
              <Store className="h-3.5 w-3.5" />
              Åbn Shop Analytics
            </button>

            <div className="flex items-center gap-1">
              {ad.source_url && (
                <a
                  href={ad.source_url}
                  target="_blank"
                  rel="noreferrer"
                  title="Åbn i Meta Ad Library"
                  className="inline-flex items-center gap-1 rounded-lg border border-[#E2E6EF] bg-white px-2.5 py-1.5 text-[11px] font-semibold text-[#334155] hover:border-[#0027eb] hover:text-[#0027eb]"
                >
                  <MetaInfinityIcon className="h-3.5 w-3.5" />
                  Meta Library
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>
          </div>

          <div className="relative flex max-h-[36dvh] flex-1 items-center justify-center overflow-hidden p-4 lg:max-h-none">
            {isVideoFile ? (
              <video
                src={ad.media_url}
                poster={displayImage}
                controls
                playsInline
                onError={() => setMediaFailed(true)}
                className="max-h-full w-full rounded-xl bg-black object-contain shadow-sm"
              />
            ) : displayImage ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={displayImage}
                alt={ad.headline}
                onError={() => {
                  if (!mediaFailed) setMediaFailed(true);
                }}
                className="max-h-full max-w-full rounded-xl border border-[#E2E6EF] bg-white object-contain shadow-sm"
              />
            ) : (
              <div className="flex flex-col items-center justify-center gap-2 p-8 text-center">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#0027eb] font-display text-sm font-bold text-white">
                  {ad.brand_avatar_initials}
                </span>
                <p className="text-xs text-[#64748B]">Medie ikke tilgængeligt</p>
              </div>
            )}
          </div>

          {/* Metrics Strip */}
          <div className="grid grid-cols-3 gap-2 border-t border-[#E6E9F0] bg-white px-4 py-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[#64748B]">
                Live Status
              </p>
              <p className="mt-0.5 flex items-center gap-1.5 font-mono-num text-xs font-bold text-[#0F172A]">
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: ad.is_active ? "#16A34A" : "#94A3B8" }}
                />
                {activeDays}d live
              </p>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[#64748B]">
                Duplicated
              </p>
              <p className="mt-0.5 flex items-center gap-1 font-mono-num text-xs font-bold text-[#0F172A]">
                <Layers className="h-3.5 w-3.5 text-[#0027eb]" />
                {ad.duplicated_count ? `×${ad.duplicated_count}` : "×1"}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[#64748B]">
                Format
              </p>
              <p className="mt-0.5 font-mono-num text-xs font-bold text-[#0F172A]">
                {ad.display_format || ad.media_type.toUpperCase()}
              </p>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Hook, Copy, Landing Page, Folders & Creator Brief */}
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-white">
          <div className="hidden items-center justify-between border-b border-[#E6E9F0] px-6 py-3.5 lg:flex">
            <div className="flex items-center gap-3">
              {ad.brand_logo_url ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={ad.brand_logo_url}
                  alt={ad.brand_name}
                  className="h-9 w-9 rounded-xl border border-[#E6E9F0] bg-white object-contain p-1"
                />
              ) : (
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#0027eb] font-display text-xs font-bold text-white">
                  {ad.brand_avatar_initials}
                </span>
              )}
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-display text-sm font-bold text-[#0F172A]">
                    {ad.brand_name}
                  </h2>
                  {activeDays >= 30 && ad.is_active && (
                    <span className="inline-flex items-center gap-1 rounded-md bg-[#ECFDF3] px-1.5 py-0.5 text-[10px] font-semibold text-[#15803D]">
                      <Flame className="h-3 w-3" />
                      Winner · {activeDays}d
                    </span>
                  )}
                </div>
                <p className="text-xs text-[#64748B]">
                  {ad.brand_handle} · {ad.platforms.join(", ")}
                  {ad.eu_reach ? ` · ${formatReach(ad.eu_reach)} EU reach` : ""}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="Luk"
              className="rounded-xl border border-[#E2E6EF] p-2 text-[#64748B] hover:bg-[#F3F5F9]"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Tab Strip */}
          <div className="flex items-center gap-1 border-b border-[#E6E9F0] px-4 pt-1 lg:px-6">
            {[
              { id: "details" as const, label: "Hook & Landing Page", icon: Sparkles },
              { id: "copy" as const, label: "Ad Copy & Brief", icon: FileText },
              { id: "folders" as const, label: "Folders & Noter", icon: Bookmark },
            ].map((item) => {
              const Icon = item.icon;
              const active = tab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setTab(item.id)}
                  className={`inline-flex items-center gap-1.5 border-b-2 px-3 py-2.5 font-display text-xs font-semibold transition-colors ${
                    active
                      ? "border-[#0027eb] text-[#0027eb]"
                      : "border-transparent text-[#64748B] hover:text-[#0F172A]"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {item.label}
                </button>
              );
            })}
          </div>

          {/* Scrollable Body */}
          <div className="flex-1 space-y-5 overflow-y-auto px-4 py-4 pb-safe lg:px-6">
            {tab === "details" && (
              <>
                {/* Extracted Opening Hook */}
                <div className="rounded-2xl border border-[#DCE3F5] bg-gradient-to-br from-[#F8FAFF] to-[#EEF2FF]/60 p-4">
                  <div className="flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[#0027eb]">
                      <Sparkles className="h-3.5 w-3.5" />
                      Extracted Hook · {ad.hook_category || "Opening Line"}
                    </span>
                    {ad.extracted_hook && (
                      <button
                        type="button"
                        onClick={() => copyText("hook", ad.extracted_hook || "")}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-[#0027eb]"
                      >
                        {copiedKey === "hook" ? (
                          <Check className="h-3.5 w-3.5 text-[#16A34A]" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                        Kopiér
                      </button>
                    )}
                  </div>
                  <p className="mt-2 font-display text-[15px] font-semibold leading-snug text-[#0F172A]">
                    &ldquo;{ad.extracted_hook || ad.headline}&rdquo;
                  </p>
                </div>

                {/* Details Key-Value Table */}
                <div className="divide-y divide-[#EFF2F6] rounded-2xl border border-[#E6E9F0]">
                  {[
                    { k: "Headline", v: ad.headline || "—" },
                    { k: "CTA Button", v: ad.cta_text || "Shop now" },
                    { k: "Hook Angle", v: ad.hook_category || ad.ai_angle || "—" },
                    {
                      k: "Landing Page",
                      v: ad.landing_page_url ? (
                        <a
                          href={ad.landing_page_url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 font-mono-num text-[#0027eb] hover:underline"
                        >
                          {ad.landing_page_path || ad.landing_page_url}
                          <ArrowUpRight className="h-3 w-3" />
                        </a>
                      ) : (
                        "—"
                      ),
                    },
                    { k: "Platforms", v: ad.platforms.join(", ") },
                  ].map((row) => (
                    <div
                      key={row.k}
                      className="flex items-center justify-between gap-4 px-4 py-2.5 text-xs"
                    >
                      <span className="font-medium text-[#64748B]">{row.k}</span>
                      <span className="truncate font-semibold text-[#0F172A]">
                        {row.v}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Optional InstaBox / Gemini Action Bar */}
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={handleTriggerInstaBox}
                    disabled={analyzing}
                    className="adtrack-btn-primary inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold text-white disabled:opacity-50"
                  >
                    {analyzing ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Zap className="h-3.5 w-3.5" />
                    )}
                    Transskribér med InstaBox
                  </button>

                  <button
                    type="button"
                    onClick={() => copyText("gemini", buildGeminiPrompt(ad))}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-[#DCE1EC] bg-white px-3 py-2 text-xs font-semibold text-[#0F172A] hover:border-[#0027eb] hover:text-[#0027eb]"
                  >
                    {copiedKey === "gemini" ? (
                      <>
                        <Check className="h-3.5 w-3.5 text-[#16A34A]" />
                        Prompt kopieret!
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5" />
                        Kopiér AI-analyse prompt
                      </>
                    )}
                  </button>
                </div>

                {analyzeStatus && (
                  <p className="rounded-xl border border-[#E6E9F0] bg-[#FAFBFD] px-3 py-2 text-xs text-[#334155]">
                    {analyzeStatus}
                  </p>
                )}
              </>
            )}

            {tab === "copy" && (
              <div className="space-y-4">
                <div className="rounded-2xl border border-[#E6E9F0] bg-[#FAFBFD] p-4">
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-[#64748B]">
                      Fuld Annoncetekst (Primary Copy)
                    </p>
                    <button
                      type="button"
                      onClick={() => copyText("copy", ad.primary_text)}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-[#0027eb]"
                    >
                      {copiedKey === "copy" ? (
                        <Check className="h-3.5 w-3.5 text-[#16A34A]" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                      Kopiér
                    </button>
                  </div>
                  <p className="whitespace-pre-wrap text-[13px] leading-relaxed text-[#1E293B]">
                    {ad.primary_text || "Ingen primær annoncetekst på denne annonce."}
                  </p>
                </div>

                {/* 1-Click Creator Brief Generator */}
                <div className="space-y-3 rounded-2xl border border-[#E6E9F0] bg-[#FAFBFD] p-4">
                  <div className="flex items-center gap-2">
                    <Wand2 className="h-4 w-4 text-[#0027eb]" />
                    <h3 className="font-display text-xs font-bold uppercase tracking-wider text-[#0F172A]">
                      Generér Creator Brief fra denne annonce
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <input
                      type="text"
                      value={myProduct}
                      onChange={(e) => setMyProduct(e.target.value)}
                      placeholder="Dit produkt (fx Comfort Bukser)"
                      className="rounded-xl border border-[#DCE1EC] bg-white px-3 py-2 text-xs outline-none focus:border-[#0027eb]"
                    />
                    <input
                      type="text"
                      value={myUsp}
                      onChange={(e) => setMyUsp(e.target.value)}
                      placeholder="Vigtigste USP / tilbud"
                      className="rounded-xl border border-[#DCE1EC] bg-white px-3 py-2 text-xs outline-none focus:border-[#0027eb]"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={handleGenerateBrief}
                    className="adtrack-btn-primary inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold text-white"
                  >
                    Lav Creator Brief
                  </button>

                  {generatedBrief && (
                    <div className="space-y-2 pt-1">
                      <pre className="max-h-52 overflow-y-auto whitespace-pre-wrap rounded-xl border border-[#E6E9F0] bg-white p-3 font-sans text-xs leading-relaxed text-[#334155]">
                        {generatedBrief}
                      </pre>
                      <button
                        type="button"
                        onClick={() => copyText("brief", generatedBrief)}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#0027eb]"
                      >
                        {copiedKey === "brief" ? (
                          <>
                            <Check className="h-3.5 w-3.5 text-[#16A34A]" /> Brief kopieret!
                          </>
                        ) : (
                          <>
                            <Copy className="h-3.5 w-3.5" /> Kopiér brief
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {tab === "folders" && (
              <div className="space-y-5">
                <div>
                  <p className="mb-2 text-xs font-bold uppercase tracking-wider text-[#64748B]">
                    Gem i Folders
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {boards.map((board) => {
                      const active = ad.board_ids.includes(board.id);
                      return (
                        <button
                          key={board.id}
                          type="button"
                          onClick={() => onToggleBoard(ad.id, board.id)}
                          className="inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition-all"
                          style={
                            active
                              ? {
                                  backgroundColor: "#0027eb",
                                  color: "#FFFFFF",
                                  borderColor: "#0027eb",
                                }
                              : {
                                  backgroundColor: "#F8FAFC",
                                  color: "#334155",
                                  borderColor: "#E2E6EF",
                                }
                          }
                        >
                          <span
                            className="h-2 w-2 rounded-full"
                            style={{
                              backgroundColor: active ? "#FFFFFF" : board.accent_color,
                            }}
                          />
                          {board.name}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-[#64748B]">
                    Dine noter
                  </label>
                  <textarea
                    rows={4}
                    value={ad.user_notes}
                    onChange={(e) =>
                      onUpdateAd(ad.id, { user_notes: e.target.value })
                    }
                    placeholder="Noter om hook, vinkel, landing page eller hvad I vil teste..."
                    className="w-full rounded-xl border border-[#DCE1EC] bg-[#FAFBFD] p-3 text-sm leading-relaxed outline-none focus:border-[#0027eb] focus:bg-white"
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
