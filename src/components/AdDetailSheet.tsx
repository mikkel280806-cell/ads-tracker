"use client";

import React, { useState } from "react";
import {
  Bookmark,
  Check,
  Copy,
  Download,
  ExternalLink,
  FileText,
  Flame,
  Heart,
  Loader2,
  Plus,
  Sparkles,
  Tag as TagIcon,
  Trash2,
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

interface AdDetailSheetProps {
  ad: Ad | null;
  boards: Board[];
  onClose: () => void;
  onUpdateAd: (adId: string, patch: Partial<Ad>) => void;
  onDeleteAd: (adId: string) => void;
  onToggleBoard: (adId: string, boardId: string) => void;
}

export function AdDetailSheet({
  ad,
  boards,
  onClose,
  onUpdateAd,
  onDeleteAd,
  onToggleBoard,
}: AdDetailSheetProps) {
  const [tab, setTab] = useState<"ai" | "copy" | "notes">("ai");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeStatus, setAnalyzeStatus] = useState<string | null>(null);
  const [showPasteJson, setShowPasteJson] = useState(false);
  const [pastedJson, setPastedJson] = useState("");
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [newTag, setNewTag] = useState("");

  // Creator brief generator state
  const [myProduct, setMyProduct] = useState("");
  const [myUsp, setMyUsp] = useState("");
  const [generatedBrief, setGeneratedBrief] = useState("");

  if (!ad) return null;

  const activeDays = getActiveDays(ad.started_running_at);
  const isVideoFile =
    ad.media_type === "video" && /\.(mp4|webm|mov)(\?|$)/i.test(ad.media_url);

  const copyText = async (key: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 1800);
    } catch {
      // Fallback ignored
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
      setAnalyzeStatus(data.message || "Forespørgsel sendt.");
      if (data.ok) {
        onUpdateAd(ad.id, { status: "pending_ai" });
      }
    } catch {
      setAnalyzeStatus("Kunne ikke kontakte /api/analyze.");
    } finally {
      setAnalyzing(false);
    }
  };

  const handleApplyGeminiJson = () => {
    setJsonError(null);
    try {
      const match = pastedJson.match(/\{[\s\S]*\}/);
      if (!match) throw new Error("Fandt ingen gyldig JSON-blok.");
      const parsed = JSON.parse(match[0]);
      onUpdateAd(ad.id, {
        status: "ready",
        ai_hook_verbal: parsed.ai_hook_verbal || ad.ai_hook_verbal,
        ai_hook_visual: parsed.ai_hook_visual || ad.ai_hook_visual,
        ai_angle: parsed.ai_angle || ad.ai_angle,
        ai_format: parsed.ai_format || ad.ai_format,
        ai_transcript: parsed.ai_transcript || ad.ai_transcript,
        ai_script_breakdown: parsed.ai_script_breakdown || ad.ai_script_breakdown,
        tags: Array.isArray(parsed.tags)
          ? Array.from(new Set([...ad.tags, ...parsed.tags.map(String)]))
          : ad.tags,
      });
      setPastedJson("");
      setShowPasteJson(false);
    } catch (err) {
      setJsonError(
        err instanceof Error ? err.message : "Ugyldig JSON — kopiér hele JSON-svaret fra Gemini."
      );
    }
  };

  const handleAddTag = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = newTag.trim().toLowerCase().replace(/^#/, "");
    if (!cleaned || ad.tags.includes(cleaned)) return;
    onUpdateAd(ad.id, { tags: [...ad.tags, cleaned] });
    setNewTag("");
  };

  const handleGenerateBrief = () => {
    const product = myProduct.trim() || "[Dit Produkt]";
    const usp = myUsp.trim() || "hurtig synlig effekt + 60 dages garanti";
    const brief = [
      `CREATOR BRIEF — Inspireret af ${ad.brand_name} (${ad.ai_angle || "Vinder-vinkel"})`,
      `Format: ${ad.ai_format || "UGC 9:16 Video"} · Målsætning: Stop scroll inden 2 sek.`,
      "",
      `1. VISUEL HOOK (0–3 sek.):`,
      `Genskab kompositionen fra referencen: ${ad.ai_hook_visual || "Tæt produktfokus i naturligt dagslys med hurtig bevægelse i sekund 1."}`,
      "",
      `2. VERBAL HOOK (0–3 sek.):`,
      `Tilpas denne vinkel til ${product}: "${ad.ai_hook_verbal ? ad.ai_hook_verbal.replace(/"/g, "") : "Jeg troede bare det var normalt — indtil jeg prøvede dette."}"`,
      "",
      `3. KROP & MEKANISME (3–18 sek.):`,
      `- Vis ${product} i brug med fokus på hovedfordelen: ${usp}.`,
      `- Hold klippene hurtige (maks. 2–3 sek. pr. klip) ligesom referencen.`,
      "",
      `4. SOCIAL PROOF & CTA (18–25 sek.):`,
      `- Vis resultat/reaktion + slut af med klar opfordring ("Klik herunder og prøv ${product} risikofrit").`,
      "",
      `Reference-link: ${ad.source_url || "Gemt i AdVault"}`,
    ].join("\n");
    setGeneratedBrief(brief);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/75 p-0 backdrop-blur-sm lg:items-center lg:p-6"
      onClick={onClose}
    >
      <div
        className="animate-sheet-up flex h-[94dvh] w-full max-w-5xl flex-col overflow-hidden rounded-t-3xl border lg:h-[86vh] lg:flex-row lg:rounded-2xl"
        style={{
          backgroundColor: "var(--bg-surface)",
          borderColor: "var(--border-strong)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Mobile top header bar */}
        <div
          className="flex items-center justify-between border-b px-4 py-3 lg:hidden"
          style={{ borderColor: "var(--border-subtle)" }}
        >
          <div className="flex items-center gap-2.5">
            <span
              className="flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-bold text-white"
              style={{ backgroundColor: ad.brand_avatar_color }}
            >
              {ad.brand_avatar_initials}
            </span>
            <div>
              <p className="text-xs font-semibold leading-tight">{ad.brand_name}</p>
              <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>
                {ad.brand_handle}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => onUpdateAd(ad.id, { is_favorite: !ad.is_favorite })}
              className="rounded-xl p-2"
              style={{ color: ad.is_favorite ? "#FB7185" : "var(--text-secondary)" }}
            >
              <Heart className="h-4 w-4" fill={ad.is_favorite ? "currentColor" : "none"} />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl p-2"
              style={{ color: "var(--text-secondary)" }}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* LEFT COLUMN: Creative Media + TrendTrack Live Signals */}
        <div
          className="flex shrink-0 flex-col border-b lg:w-[44%] lg:border-b-0 lg:border-r"
          style={{
            borderColor: "var(--border-subtle)",
            backgroundColor: "var(--bg-canvas)",
          }}
        >
          <div className="relative flex max-h-[38dvh] flex-1 items-center justify-center overflow-hidden p-4 lg:max-h-none">
            {isVideoFile ? (
              <video
                src={ad.media_url}
                poster={ad.thumbnail_url}
                controls
                playsInline
                className="max-h-full w-full rounded-xl object-contain"
              />
            ) : (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={ad.media_url || ad.thumbnail_url}
                alt={ad.headline}
                className="max-h-full max-w-full rounded-xl object-contain shadow-2xl"
              />
            )}
          </div>

          {/* TrendTrack Metrics Strip */}
          <div
            className="grid grid-cols-3 gap-2 border-t px-4 py-3"
            style={{
              borderColor: "var(--border-subtle)",
              backgroundColor: "var(--bg-surface)",
            }}
          >
            <div>
              <p className="text-[10px] uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
                Status
              </p>
              <p className="font-mono-num mt-0.5 flex items-center gap-1.5 text-xs font-semibold">
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: ad.is_active ? "var(--accent-live)" : "#6B7280" }}
                />
                {ad.is_active ? `${activeDays} dage` : "Pauset"}
              </p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
                EU Reach
              </p>
              <p className="font-mono-num mt-0.5 text-xs font-semibold">
                {formatReach(ad.eu_reach)}
              </p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
                Format
              </p>
              <p className="mt-0.5 truncate text-xs font-semibold">
                {ad.ai_format || ad.media_type}
              </p>
            </div>
          </div>

          {/* Quick Media Actions */}
          <div
            className="flex flex-wrap items-center gap-2 border-t px-4 py-2.5"
            style={{
              borderColor: "var(--border-subtle)",
              backgroundColor: "var(--bg-surface)",
            }}
          >
            <a
              href={ad.media_url}
              download
              className="inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors hover:bg-white/5"
              style={{
                borderColor: "var(--border-subtle)",
                color: "var(--text-secondary)",
              }}
            >
              <Download className="h-3.5 w-3.5" />
              Download
            </a>
            {ad.source_url && (
              <a
                href={ad.source_url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors hover:bg-white/5"
                style={{
                  borderColor: "var(--border-subtle)",
                  color: "var(--text-secondary)",
                }}
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Original
              </a>
            )}
            {ad.landing_page_url && (
              <a
                href={ad.landing_page_url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors hover:bg-white/5"
                style={{
                  borderColor: "var(--border-subtle)",
                  color: "var(--text-secondary)",
                }}
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Landing Page
              </a>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Foreplay AI Intelligence, Copy, Notes & Brief */}
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          {/* Desktop Header */}
          <div
            className="hidden items-center justify-between border-b px-6 py-4 lg:flex"
            style={{ borderColor: "var(--border-subtle)" }}
          >
            <div className="flex items-center gap-3">
              <span
                className="flex h-9 w-9 items-center justify-center rounded-xl text-xs font-bold text-white"
                style={{ backgroundColor: ad.brand_avatar_color }}
              >
                {ad.brand_avatar_initials}
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-display text-sm font-semibold">
                    {ad.brand_name}
                  </h2>
                  {activeDays >= 30 && ad.is_active && (
                    <span
                      className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-semibold"
                      style={{
                        backgroundColor: "var(--accent-winner-soft)",
                        color: "var(--accent-winner)",
                      }}
                    >
                      <Flame className="h-3 w-3" />
                      30d+ Vinder
                    </span>
                  )}
                </div>
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                  {ad.brand_handle} · {ad.platforms.join(", ")}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => onUpdateAd(ad.id, { is_favorite: !ad.is_favorite })}
                aria-label="Favorit"
                className="rounded-xl border p-2 transition-colors hover:bg-white/5"
                style={{
                  borderColor: "var(--border-subtle)",
                  color: ad.is_favorite ? "#FB7185" : "var(--text-secondary)",
                }}
              >
                <Heart className="h-4 w-4" fill={ad.is_favorite ? "currentColor" : "none"} />
              </button>
              <button
                type="button"
                onClick={() => {
                  onDeleteAd(ad.id);
                  onClose();
                }}
                aria-label="Slet annonce"
                className="rounded-xl border p-2 transition-colors hover:bg-rose-500/10 hover:text-rose-400"
                style={{
                  borderColor: "var(--border-subtle)",
                  color: "var(--text-muted)",
                }}
              >
                <Trash2 className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={onClose}
                aria-label="Luk"
                className="rounded-xl border p-2 transition-colors hover:bg-white/5"
                style={{
                  borderColor: "var(--border-subtle)",
                  color: "var(--text-secondary)",
                }}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Tab Strip */}
          <div
            className="flex items-center gap-1 border-b px-4 pt-2 lg:px-6"
            style={{ borderColor: "var(--border-subtle)" }}
          >
            {[
              { id: "ai", label: "AI Indsigt", icon: Sparkles },
              { id: "copy", label: "Copy & Script", icon: FileText },
              { id: "notes", label: "Noter & Brief", icon: Bookmark },
            ].map((item) => {
              const Icon = item.icon;
              const active = tab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setTab(item.id as "ai" | "copy" | "notes")}
                  className="inline-flex items-center gap-1.5 border-b-2 px-3 py-2.5 text-xs font-semibold transition-colors"
                  style={{
                    borderColor: active ? "var(--text-primary)" : "transparent",
                    color: active ? "var(--text-primary)" : "var(--text-muted)",
                  }}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {item.label}
                </button>
              );
            })}
          </div>

          {/* Scrollable Tab Body */}
          <div className="flex-1 space-y-5 overflow-y-auto px-4 py-4 pb-safe lg:px-6">
            {tab === "ai" && (
              <>
                {/* AI Action Bar: InstaBox Auto-Wake + Copy to Gemini */}
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={handleTriggerInstaBox}
                    disabled={analyzing}
                    className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition-opacity disabled:opacity-50"
                    style={{
                      backgroundColor: "var(--btn-primary-bg)",
                      color: "var(--btn-primary-fg)",
                    }}
                  >
                    {analyzing ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Zap className="h-3.5 w-3.5" />
                    )}
                    Analyser med InstaBox
                  </button>

                  <button
                    type="button"
                    onClick={() => copyText("gemini", buildGeminiPrompt(ad))}
                    className="inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-medium transition-colors hover:bg-white/5"
                    style={{
                      borderColor: "var(--border-strong)",
                      color: "var(--text-primary)",
                    }}
                  >
                    {copiedKey === "gemini" ? (
                      <>
                        <Check
                          className="h-3.5 w-3.5"
                          style={{ color: "var(--accent-live)" }}
                        />
                        Prompt kopieret!
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5" />
                        Kopiér til Gemini
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowPasteJson((v) => !v)}
                    className="inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-medium transition-colors hover:bg-white/5"
                    style={{
                      borderColor: "var(--border-subtle)",
                      color: "var(--text-secondary)",
                    }}
                  >
                    Indsæt Gemini JSON
                  </button>
                </div>

                {analyzeStatus && (
                  <p
                    className="rounded-xl border px-3 py-2 text-xs"
                    style={{
                      backgroundColor: "var(--bg-elevated)",
                      borderColor: "var(--border-subtle)",
                      color: "var(--text-secondary)",
                    }}
                  >
                    {analyzeStatus}
                  </p>
                )}

                {showPasteJson && (
                  <div
                    className="space-y-2 rounded-xl border p-3"
                    style={{
                      backgroundColor: "var(--bg-elevated)",
                      borderColor: "var(--border-strong)",
                    }}
                  >
                    <textarea
                      rows={4}
                      value={pastedJson}
                      onChange={(e) => setPastedJson(e.target.value)}
                      placeholder='Klistr JSON-svaret fra din Gemini-chat ind her...'
                      className="w-full rounded-lg border bg-transparent p-2.5 font-mono text-xs outline-none"
                      style={{ borderColor: "var(--border-subtle)" }}
                    />
                    {jsonError && (
                      <p className="text-xs text-rose-400">{jsonError}</p>
                    )}
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setShowPasteJson(false)}
                        className="rounded-lg px-3 py-1.5 text-xs"
                        style={{ color: "var(--text-muted)" }}
                      >
                        Annuller
                      </button>
                      <button
                        type="button"
                        onClick={handleApplyGeminiJson}
                        className="rounded-lg px-3 py-1.5 text-xs font-semibold"
                        style={{
                          backgroundColor: "var(--btn-primary-bg)",
                          color: "var(--btn-primary-fg)",
                        }}
                      >
                        Gem analyse
                      </button>
                    </div>
                  </div>
                )}

                {/* Hooks */}
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div
                    className="rounded-2xl border p-3.5"
                    style={{
                      backgroundColor: "var(--bg-elevated)",
                      borderColor: "var(--border-subtle)",
                    }}
                  >
                    <p
                      className="text-[11px] font-semibold uppercase tracking-wider"
                      style={{ color: "var(--accent-live)" }}
                    >
                      Verbal Hook (0–3s)
                    </p>
                    <p className="mt-1.5 text-sm leading-relaxed">
                      {ad.ai_hook_verbal || "Ikke analyseret endnu."}
                    </p>
                  </div>

                  <div
                    className="rounded-2xl border p-3.5"
                    style={{
                      backgroundColor: "var(--bg-elevated)",
                      borderColor: "var(--border-subtle)",
                    }}
                  >
                    <p
                      className="text-[11px] font-semibold uppercase tracking-wider"
                      style={{ color: "var(--accent-winner)" }}
                    >
                      Visuel Hook (0–3s)
                    </p>
                    <p className="mt-1.5 text-sm leading-relaxed">
                      {ad.ai_hook_visual || "Ikke analyseret endnu."}
                    </p>
                  </div>
                </div>

                {/* Angle & Format Badges */}
                <div className="flex flex-wrap gap-2">
                  {ad.ai_angle && (
                    <span
                      className="rounded-lg border px-2.5 py-1 text-xs font-medium"
                      style={{
                        backgroundColor: "var(--bg-elevated)",
                        borderColor: "var(--border-subtle)",
                      }}
                    >
                      Vinkel: <strong>{ad.ai_angle}</strong>
                    </span>
                  )}
                  {ad.ai_format && (
                    <span
                      className="rounded-lg border px-2.5 py-1 text-xs font-medium"
                      style={{
                        backgroundColor: "var(--bg-elevated)",
                        borderColor: "var(--border-subtle)",
                      }}
                    >
                      Format: <strong>{ad.ai_format}</strong>
                    </span>
                  )}
                </div>

                {/* Script Breakdown */}
                {ad.ai_script_breakdown && (
                  <div className="space-y-2">
                    <h3
                      className="text-xs font-semibold uppercase tracking-wider"
                      style={{ color: "var(--text-muted)" }}
                    >
                      Script-struktur
                    </h3>
                    <div
                      className="divide-y rounded-2xl border"
                      style={{
                        backgroundColor: "var(--bg-elevated)",
                        borderColor: "var(--border-subtle)",
                      }}
                    >
                      {[
                        { label: "Hook", val: ad.ai_script_breakdown.hook },
                        { label: "Body", val: ad.ai_script_breakdown.body },
                        { label: "Social Proof", val: ad.ai_script_breakdown.social_proof },
                        { label: "CTA", val: ad.ai_script_breakdown.cta },
                      ].map((row) => (
                        <div
                          key={row.label}
                          className="flex flex-col gap-1 px-4 py-2.5 sm:flex-row sm:gap-4"
                          style={{ borderColor: "var(--border-subtle)" }}
                        >
                          <span
                            className="w-24 shrink-0 text-xs font-semibold"
                            style={{ color: "var(--text-muted)" }}
                          >
                            {row.label}
                          </span>
                          <span className="text-xs leading-relaxed">
                            {row.val}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}

            {tab === "copy" && (
              <div className="space-y-4">
                {/* Headline + CTA */}
                <div
                  className="rounded-2xl border p-4"
                  style={{
                    backgroundColor: "var(--bg-elevated)",
                    borderColor: "var(--border-subtle)",
                  }}
                >
                  <div className="flex items-center justify-between">
                    <p
                      className="text-[11px] font-semibold uppercase tracking-wider"
                      style={{ color: "var(--text-muted)" }}
                    >
                      Headline & CTA
                    </p>
                    <span
                      className="rounded-md px-2 py-0.5 text-[11px] font-semibold"
                      style={{
                        backgroundColor: "var(--bg-surface)",
                        color: "var(--text-primary)",
                      }}
                    >
                      {ad.cta_text || "Køb nu"}
                    </span>
                  </div>
                  <p className="mt-1.5 text-sm font-semibold">{ad.headline}</p>
                </div>

                {/* Primary Text */}
                <div
                  className="rounded-2xl border p-4"
                  style={{
                    backgroundColor: "var(--bg-elevated)",
                    borderColor: "var(--border-subtle)",
                  }}
                >
                  <div className="mb-2 flex items-center justify-between">
                    <p
                      className="text-[11px] font-semibold uppercase tracking-wider"
                      style={{ color: "var(--text-muted)" }}
                    >
                      Primær Annoncetekst
                    </p>
                    <button
                      type="button"
                      onClick={() => copyText("copy", ad.primary_text)}
                      className="inline-flex items-center gap-1 text-xs"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      {copiedKey === "copy" ? (
                        <Check className="h-3.5 w-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                      Kopiér
                    </button>
                  </div>
                  <p
                    className="whitespace-pre-wrap text-sm leading-relaxed"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    {ad.primary_text || "Ingen annoncetekst gemt."}
                  </p>
                </div>

                {/* Transcript */}
                <div
                  className="rounded-2xl border p-4"
                  style={{
                    backgroundColor: "var(--bg-elevated)",
                    borderColor: "var(--border-subtle)",
                  }}
                >
                  <div className="mb-2 flex items-center justify-between">
                    <p
                      className="text-[11px] font-semibold uppercase tracking-wider"
                      style={{ color: "var(--text-muted)" }}
                    >
                      Video-transskription (Søgbar)
                    </p>
                    {ad.ai_transcript && (
                      <button
                        type="button"
                        onClick={() => copyText("transcript", ad.ai_transcript || "")}
                        className="inline-flex items-center gap-1 text-xs"
                        style={{ color: "var(--text-secondary)" }}
                      >
                        {copiedKey === "transcript" ? (
                          <Check className="h-3.5 w-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                        Kopiér
                      </button>
                    )}
                  </div>
                  <p
                    className="whitespace-pre-wrap text-sm leading-relaxed"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    {ad.ai_transcript ||
                      "Ingen transskription endnu — tryk 'Analyser med InstaBox' for lokal Whisper-transskription."}
                  </p>
                </div>
              </div>
            )}

            {tab === "notes" && (
              <div className="space-y-5">
                {/* Personal Notes */}
                <div>
                  <label
                    className="mb-1.5 block text-xs font-semibold uppercase tracking-wider"
                    style={{ color: "var(--text-muted)" }}
                  >
                    Dine noter
                  </label>
                  <textarea
                    rows={3}
                    value={ad.user_notes}
                    onChange={(e) => onUpdateAd(ad.id, { user_notes: e.target.value })}
                    placeholder="Skriv hvorfor du gemte den, og hvad I vil teste i jeres egne ads..."
                    className="w-full rounded-xl border p-3 text-sm leading-relaxed outline-none"
                    style={{
                      backgroundColor: "var(--bg-elevated)",
                      borderColor: "var(--border-subtle)",
                    }}
                  />
                </div>

                {/* Boards */}
                <div>
                  <p
                    className="mb-2 text-xs font-semibold uppercase tracking-wider"
                    style={{ color: "var(--text-muted)" }}
                  >
                    Boards
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {boards.map((board) => {
                      const active = ad.board_ids.includes(board.id);
                      return (
                        <button
                          key={board.id}
                          type="button"
                          onClick={() => onToggleBoard(ad.id, board.id)}
                          className="inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-medium transition-all"
                          style={{
                            backgroundColor: active
                              ? "var(--btn-primary-bg)"
                              : "var(--bg-elevated)",
                            color: active
                              ? "var(--btn-primary-fg)"
                              : "var(--text-secondary)",
                            borderColor: active
                              ? "transparent"
                              : "var(--border-subtle)",
                          }}
                        >
                          <span
                            className="h-2 w-2 rounded-full"
                            style={{ backgroundColor: board.accent_color }}
                          />
                          {board.name}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Tags */}
                <div>
                  <p
                    className="mb-2 text-xs font-semibold uppercase tracking-wider"
                    style={{ color: "var(--text-muted)" }}
                  >
                    Tags
                  </p>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {ad.tags.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-xs"
                        style={{
                          backgroundColor: "var(--bg-elevated)",
                          borderColor: "var(--border-subtle)",
                          color: "var(--text-secondary)",
                        }}
                      >
                        <TagIcon className="h-3 w-3 opacity-60" />
                        {tag}
                        <button
                          type="button"
                          onClick={() =>
                            onUpdateAd(ad.id, {
                              tags: ad.tags.filter((t) => t !== tag),
                            })
                          }
                          className="ml-0.5 opacity-60 hover:opacity-100"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                    <form onSubmit={handleAddTag} className="inline-flex items-center">
                      <input
                        type="text"
                        value={newTag}
                        onChange={(e) => setNewTag(e.target.value)}
                        placeholder="+ Nyt tag"
                        className="w-28 rounded-lg border bg-transparent px-2.5 py-1 text-xs outline-none"
                        style={{ borderColor: "var(--border-subtle)" }}
                      />
                      <button type="submit" className="ml-1 rounded-lg p-1 hover:bg-white/5">
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </form>
                  </div>
                </div>

                {/* 1-Click Creator Brief Generator */}
                <div
                  className="space-y-3 rounded-2xl border p-4"
                  style={{
                    backgroundColor: "var(--bg-elevated)",
                    borderColor: "var(--border-subtle)",
                  }}
                >
                  <div className="flex items-center gap-2">
                    <Wand2 className="h-4 w-4" style={{ color: "var(--accent-live)" }} />
                    <h3 className="text-xs font-semibold uppercase tracking-wider">
                      Lav Creator Brief ud fra denne ad
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <input
                      type="text"
                      value={myProduct}
                      onChange={(e) => setMyProduct(e.target.value)}
                      placeholder="Dit produkt (fx Glow Serum)"
                      className="rounded-xl border px-3 py-2 text-xs outline-none"
                      style={{
                        backgroundColor: "var(--bg-surface)",
                        borderColor: "var(--border-subtle)",
                      }}
                    />
                    <input
                      type="text"
                      value={myUsp}
                      onChange={(e) => setMyUsp(e.target.value)}
                      placeholder="Din vigtigste fordel / tilbud"
                      className="rounded-xl border px-3 py-2 text-xs outline-none"
                      style={{
                        backgroundColor: "var(--bg-surface)",
                        borderColor: "var(--border-subtle)",
                      }}
                    />
                  </div>

                  <button
                    type="button"
                    onClick={handleGenerateBrief}
                    className="inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold"
                    style={{
                      backgroundColor: "var(--btn-primary-bg)",
                      color: "var(--btn-primary-fg)",
                    }}
                  >
                    Generér UGC Brief
                  </button>

                  {generatedBrief && (
                    <div className="space-y-2 pt-1">
                      <pre
                        className="max-h-52 overflow-y-auto whitespace-pre-wrap rounded-xl border p-3 font-sans text-xs leading-relaxed"
                        style={{
                          backgroundColor: "var(--bg-surface)",
                          borderColor: "var(--border-subtle)",
                          color: "var(--text-secondary)",
                        }}
                      >
                        {generatedBrief}
                      </pre>
                      <button
                        type="button"
                        onClick={() => copyText("brief", generatedBrief)}
                        className="inline-flex items-center gap-1.5 text-xs font-medium"
                        style={{ color: "var(--accent-live)" }}
                      >
                        {copiedKey === "brief" ? (
                          <>
                            <Check className="h-3.5 w-3.5" /> Brief kopieret!
                          </>
                        ) : (
                          <>
                            <Copy className="h-3.5 w-3.5" /> Kopiér brief til creator
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
