"use client";

import React, { useState } from "react";
import {
  Bookmark,
  Check,
  Copy,
  Download,
  ExternalLink,
  Eye,
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
  onOpenBrand?: (brandId: string) => void;
}

export function AdDetailSheet({
  ad,
  boards,
  onClose,
  onUpdateAd,
  onDeleteAd,
  onToggleBoard,
  onOpenBrand,
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
      `${ad.ai_hook_visual || "Tæt produktfokus i naturligt dagslys med hurtig bevægelse i sekund 1."}`,
      "",
      `2. VERBAL HOOK (0–3 sek.):`,
      `Tilpas til ${product}: "${ad.ai_hook_verbal ? ad.ai_hook_verbal.replace(/"/g, "") : "Jeg troede bare det var normalt — indtil jeg prøvede dette."}"`,
      "",
      `3. KROP & MEKANISME (3–18 sek.):`,
      `- Vis ${product} i brug med fokus på: ${usp}.`,
      `- Hold klippene hurtige (maks. 2–3 sek. pr. klip).`,
      "",
      `4. SOCIAL PROOF & CTA (18–25 sek.):`,
      `- Vis resultat/reaktion + klar CTA ("Prøv ${product} risikofrit i dag").`,
      "",
      `Reference: ${ad.source_url || "Gemt i Adtrack"}`,
    ].join("\n");
    setGeneratedBrief(brief);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/55 p-0 backdrop-blur-[2px] lg:items-center lg:p-6"
      onClick={onClose}
    >
      <div
        className="animate-sheet-up flex h-[94dvh] w-full max-w-5xl flex-col overflow-hidden rounded-t-3xl border border-[#E6E8EC] bg-white text-[#111318] shadow-2xl lg:h-[86vh] lg:flex-row lg:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Mobile header */}
        <div className="flex items-center justify-between border-b border-[#EAECEF] px-4 py-3 lg:hidden">
          <div className="flex items-center gap-2.5">
            <span
              className="flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-bold text-white"
              style={{ backgroundColor: ad.brand_avatar_color }}
            >
              {ad.brand_avatar_initials}
            </span>
            <div>
              <p className="text-xs font-bold leading-tight">{ad.brand_name}</p>
              <p className="text-[11px] text-[#667085]">{ad.brand_handle}</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => onUpdateAd(ad.id, { is_favorite: !ad.is_favorite })}
              className="rounded-lg p-2"
              style={{ color: ad.is_favorite ? "#0027eb" : "#667085" }}
            >
              <Heart className="h-4 w-4" fill={ad.is_favorite ? "currentColor" : "none"} />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-2 text-[#667085]"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* LEFT COLUMN: TrendTrack Action Strip + Full Creative + Telemetry */}
        <div className="flex shrink-0 flex-col border-b border-[#EAECEF] bg-[#F8F9FB] lg:w-[44%] lg:border-b-0 lg:border-r">
          {/* TrendTrack-style Top Action Bar ("Follow in Brandtracker" + Link + Copy + Download) */}
          <div className="hidden items-center justify-between border-b border-[#EAECEF] bg-white px-4 py-2.5 lg:flex">
            <button
              type="button"
              onClick={() => {
                if (onOpenBrand) {
                  onOpenBrand(ad.brand_id);
                  onClose();
                }
              }}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#111318] px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-[#0027eb]"
            >
              <Eye className="h-3.5 w-3.5" />
              Åbn i Brandtracker
            </button>

            <div className="flex items-center gap-1">
              {ad.source_url && (
                <a
                  href={ad.source_url}
                  target="_blank"
                  rel="noreferrer"
                  title="Åbn original annonce"
                  className="rounded-lg p-1.5 text-[#475467] hover:bg-[#F2F4F7]"
                >
                  <ExternalLink className="h-4 w-4" />
                </a>
              )}
              <button
                type="button"
                title="Kopiér link"
                onClick={() => copyText("url", ad.source_url || ad.landing_page_url)}
                className="rounded-lg p-1.5 text-[#475467] hover:bg-[#F2F4F7]"
              >
                {copiedKey === "url" ? (
                  <Check className="h-4 w-4 text-[#16A34A]" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </button>
              <a
                href={ad.media_url}
                download
                title="Download kreativ"
                className="rounded-lg p-1.5 text-[#475467] hover:bg-[#F2F4F7]"
              >
                <Download className="h-4 w-4" />
              </a>
            </div>
          </div>

          <div className="relative flex max-h-[36dvh] flex-1 items-center justify-center overflow-hidden p-4 lg:max-h-none">
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
                className="max-h-full max-w-full rounded-xl border border-[#E6E8EC] object-contain shadow-sm"
              />
            )}
          </div>

          {/* Metrics Footer */}
          <div className="grid grid-cols-3 gap-2 border-t border-[#EAECEF] bg-white px-4 py-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[#667085]">
                Status
              </p>
              <p className="mt-0.5 flex items-center gap-1.5 font-mono-num text-xs font-bold text-[#111318]">
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: ad.is_active ? "#16A34A" : "#9CA3AF" }}
                />
                {ad.is_active ? `${activeDays}d live` : "Pauset"}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[#667085]">
                EU Reach
              </p>
              <p className="mt-0.5 font-mono-num text-xs font-bold text-[#111318]">
                {formatReach(ad.eu_reach)}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[#667085]">
                Est. Spend
              </p>
              <p className="mt-0.5 font-mono-num text-xs font-bold text-[#111318]">
                {ad.estimated_spend ? `$${(ad.estimated_spend / 1000).toFixed(1)}K` : "—"}
              </p>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: TrendTrack Details + Foreplay AI Hooks & Briefs */}
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-white">
          {/* Desktop Header */}
          <div className="hidden items-center justify-between border-b border-[#EAECEF] px-6 py-3.5 lg:flex">
            <div className="flex items-center gap-3">
              <span
                className="flex h-9 w-9 items-center justify-center rounded-xl text-xs font-bold text-white"
                style={{ backgroundColor: ad.brand_avatar_color }}
              >
                {ad.brand_avatar_initials}
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-display text-sm font-bold text-[#111318]">
                    {ad.brand_name}
                  </h2>
                  {activeDays >= 30 && ad.is_active && (
                    <span className="inline-flex items-center gap-1 rounded-md bg-[#ECFDF3] px-1.5 py-0.5 text-[10px] font-semibold text-[#15803D]">
                      <Flame className="h-3 w-3" />
                      Still Running · {activeDays}d
                    </span>
                  )}
                </div>
                <p className="text-xs text-[#667085]">
                  {ad.brand_handle} · {ad.platforms.join(", ")}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => onUpdateAd(ad.id, { is_favorite: !ad.is_favorite })}
                className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors"
                style={
                  ad.is_favorite
                    ? {
                        backgroundColor: "#EEF2FF",
                        borderColor: "rgba(0,39,235,0.25)",
                        color: "#0027eb",
                      }
                    : {
                        backgroundColor: "#FFFFFF",
                        borderColor: "#E6E8EC",
                        color: "#344054",
                      }
                }
              >
                <Bookmark className="h-3.5 w-3.5" fill={ad.is_favorite ? "currentColor" : "none"} />
                {ad.is_favorite ? "Saved" : "Save to Favorites"}
              </button>
              <button
                type="button"
                onClick={() => {
                  onDeleteAd(ad.id);
                  onClose();
                }}
                aria-label="Slet annonce"
                className="rounded-lg border border-[#E6E8EC] p-2 text-[#667085] hover:bg-[#FFF1F2] hover:text-[#E11D48]"
              >
                <Trash2 className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={onClose}
                aria-label="Luk"
                className="rounded-lg border border-[#E6E8EC] p-2 text-[#667085] hover:bg-[#F5F6F8]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Tab Strip */}
          <div className="flex items-center gap-1 border-b border-[#EAECEF] px-4 pt-1 lg:px-6">
            {[
              { id: "ai", label: "Ad Details & AI Hooks", icon: Sparkles },
              { id: "copy", label: "Copy & Transskription", icon: FileText },
              { id: "notes", label: "Boards, Noter & Brief", icon: Bookmark },
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
                    borderColor: active ? "#0027eb" : "transparent",
                    color: active ? "#0027eb" : "#667085",
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
                    className="inline-flex items-center gap-1.5 rounded-xl bg-[#0027eb] px-3.5 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#001fc2] disabled:opacity-50"
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
                    className="inline-flex items-center gap-1.5 rounded-xl border border-[#E2E5EB] bg-white px-3 py-2 text-xs font-semibold text-[#111318] transition-colors hover:bg-[#F5F6F8]"
                  >
                    {copiedKey === "gemini" ? (
                      <>
                        <Check className="h-3.5 w-3.5 text-[#16A34A]" />
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
                    className="inline-flex items-center gap-1.5 rounded-xl border border-[#E6E8EC] bg-[#F8F9FB] px-3 py-2 text-xs font-medium text-[#475467] hover:bg-[#F2F4F7]"
                  >
                    Indsæt Gemini JSON
                  </button>
                </div>

                {analyzeStatus && (
                  <p className="rounded-xl border border-[#E6E8EC] bg-[#F8F9FB] px-3 py-2 text-xs text-[#344054]">
                    {analyzeStatus}
                  </p>
                )}

                {showPasteJson && (
                  <div className="space-y-2 rounded-xl border border-[#E2E5EB] bg-[#FAFBFD] p-3">
                    <textarea
                      rows={4}
                      value={pastedJson}
                      onChange={(e) => setPastedJson(e.target.value)}
                      placeholder="Klistr JSON-svaret fra din Gemini-chat ind her..."
                      className="w-full rounded-lg border border-[#E2E5EB] bg-white p-2.5 font-mono text-xs outline-none focus:border-[#0027eb]"
                    />
                    {jsonError && <p className="text-xs text-[#E11D48]">{jsonError}</p>}
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setShowPasteJson(false)}
                        className="rounded-lg px-3 py-1.5 text-xs text-[#667085]"
                      >
                        Annuller
                      </button>
                      <button
                        type="button"
                        onClick={handleApplyGeminiJson}
                        className="rounded-lg bg-[#0027eb] px-3 py-1.5 text-xs font-semibold text-white"
                      >
                        Gem analyse
                      </button>
                    </div>
                  </div>
                )}

                {/* Hooks */}
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-[#E6E8EC] bg-[#FAFBFD] p-3.5">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-[#0027eb]">
                      Verbal Hook (0–3s)
                    </p>
                    <p className="mt-1.5 text-sm leading-relaxed text-[#111318]">
                      {ad.ai_hook_verbal || "Ikke analyseret endnu."}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-[#E6E8EC] bg-[#FAFBFD] p-3.5">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-[#16A34A]">
                      Visuel Hook (0–3s)
                    </p>
                    <p className="mt-1.5 text-sm leading-relaxed text-[#111318]">
                      {ad.ai_hook_visual || "Ikke analyseret endnu."}
                    </p>
                  </div>
                </div>

                {/* Details Key-Value Table (just like TrendTrack Details) */}
                <div className="divide-y divide-[#F1F3F6] rounded-2xl border border-[#EAECEF]">
                  {[
                    { k: "Angle / Vinkel", v: ad.ai_angle || "—" },
                    { k: "Format", v: ad.ai_format || ad.media_type },
                    {
                      k: "Duplicated",
                      v: ad.duplicated_count ? `${ad.duplicated_count} aktive varianter` : "1",
                    },
                    {
                      k: "Landing Page",
                      v: ad.landing_page_url ? (
                        <a
                          href={ad.landing_page_url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 font-medium text-[#0027eb] hover:underline"
                        >
                          {ad.landing_page_url.replace(/^https?:\/\//, "")}
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      ) : (
                        "—"
                      ),
                    },
                  ].map((row) => (
                    <div
                      key={row.k}
                      className="flex items-center justify-between gap-4 px-4 py-2.5 text-xs"
                    >
                      <span className="font-medium text-[#667085]">{row.k}</span>
                      <span className="truncate font-semibold text-[#111318]">{row.v}</span>
                    </div>
                  ))}
                </div>

                {/* Script Breakdown */}
                {ad.ai_script_breakdown && (
                  <div className="space-y-2">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-[#667085]">
                      Script-nedbrydning
                    </h3>
                    <div className="divide-y divide-[#F1F3F6] rounded-2xl border border-[#EAECEF] bg-[#FAFBFD]">
                      {[
                        { label: "Hook", val: ad.ai_script_breakdown.hook },
                        { label: "Body", val: ad.ai_script_breakdown.body },
                        { label: "Social Proof", val: ad.ai_script_breakdown.social_proof },
                        { label: "CTA", val: ad.ai_script_breakdown.cta },
                      ].map((row) => (
                        <div
                          key={row.label}
                          className="flex flex-col gap-1 px-4 py-2.5 sm:flex-row sm:gap-4"
                        >
                          <span className="w-24 shrink-0 text-xs font-bold text-[#475467]">
                            {row.label}
                          </span>
                          <span className="text-xs leading-relaxed text-[#344054]">
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
                <div className="rounded-2xl border border-[#EAECEF] bg-[#FAFBFD] p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-[#667085]">
                      Headline &amp; CTA
                    </p>
                    <span className="rounded-md bg-[#EEF2FF] px-2 py-0.5 text-[11px] font-semibold text-[#0027eb]">
                      {ad.cta_text || "Shop now"}
                    </span>
                  </div>
                  <p className="mt-1.5 text-sm font-bold text-[#111318]">{ad.headline}</p>
                </div>

                <div className="rounded-2xl border border-[#EAECEF] bg-[#FAFBFD] p-4">
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-[#667085]">
                      Primær Annoncetekst
                    </p>
                    <button
                      type="button"
                      onClick={() => copyText("copy", ad.primary_text)}
                      className="inline-flex items-center gap-1 text-xs font-medium text-[#0027eb]"
                    >
                      {copiedKey === "copy" ? (
                        <Check className="h-3.5 w-3.5 text-[#16A34A]" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                      Kopiér
                    </button>
                  </div>
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-[#344054]">
                    {ad.primary_text || "Ingen annoncetekst gemt."}
                  </p>
                </div>

                <div className="rounded-2xl border border-[#EAECEF] bg-[#FAFBFD] p-4">
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-[#667085]">
                      Video-transskription (Søgbar)
                    </p>
                    {ad.ai_transcript && (
                      <button
                        type="button"
                        onClick={() => copyText("transcript", ad.ai_transcript || "")}
                        className="inline-flex items-center gap-1 text-xs font-medium text-[#0027eb]"
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
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-[#344054]">
                    {ad.ai_transcript ||
                      "Ingen transskription endnu — tryk 'Analyser med InstaBox' for lokal Whisper-transskription."}
                  </p>
                </div>
              </div>
            )}

            {tab === "notes" && (
              <div className="space-y-5">
                <div>
                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-[#667085]">
                    Dine noter
                  </label>
                  <textarea
                    rows={3}
                    value={ad.user_notes}
                    onChange={(e) => onUpdateAd(ad.id, { user_notes: e.target.value })}
                    placeholder="Skriv hvorfor du gemte den, og hvad I vil teste..."
                    className="w-full rounded-xl border border-[#E2E5EB] bg-[#FAFBFD] p-3 text-sm leading-relaxed outline-none focus:border-[#0027eb] focus:bg-white"
                  />
                </div>

                <div>
                  <p className="mb-2 text-xs font-bold uppercase tracking-wider text-[#667085]">
                    Boards / Mapper
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
                                  backgroundColor: "#F8F9FB",
                                  color: "#344054",
                                  borderColor: "#E6E8EC",
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
                  <p className="mb-2 text-xs font-bold uppercase tracking-wider text-[#667085]">
                    Tags
                  </p>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {ad.tags.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center gap-1 rounded-lg border border-[#E6E8EC] bg-[#F8F9FB] px-2.5 py-1 text-xs text-[#344054]"
                      >
                        <TagIcon className="h-3 w-3 text-[#667085]" />
                        {tag}
                        <button
                          type="button"
                          onClick={() =>
                            onUpdateAd(ad.id, {
                              tags: ad.tags.filter((t) => t !== tag),
                            })
                          }
                          className="ml-0.5 text-[#98A2B3] hover:text-[#111318]"
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
                        className="w-28 rounded-lg border border-[#E2E5EB] bg-white px-2.5 py-1 text-xs outline-none focus:border-[#0027eb]"
                      />
                      <button
                        type="submit"
                        className="ml-1 rounded-lg p-1 text-[#475467] hover:bg-[#F2F4F7]"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </form>
                  </div>
                </div>

                {/* 1-Click Creator Brief Generator */}
                <div className="space-y-3 rounded-2xl border border-[#E6E8EC] bg-[#FAFBFD] p-4">
                  <div className="flex items-center gap-2">
                    <Wand2 className="h-4 w-4 text-[#0027eb]" />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-[#111318]">
                      Generér UGC Creator Brief
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <input
                      type="text"
                      value={myProduct}
                      onChange={(e) => setMyProduct(e.target.value)}
                      placeholder="Dit produkt (fx Glow Serum)"
                      className="rounded-xl border border-[#E2E5EB] bg-white px-3 py-2 text-xs outline-none focus:border-[#0027eb]"
                    />
                    <input
                      type="text"
                      value={myUsp}
                      onChange={(e) => setMyUsp(e.target.value)}
                      placeholder="Vigtigste fordel / tilbud"
                      className="rounded-xl border border-[#E2E5EB] bg-white px-3 py-2 text-xs outline-none focus:border-[#0027eb]"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={handleGenerateBrief}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-[#0027eb] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[#001fc2]"
                  >
                    Lav Creator Brief
                  </button>

                  {generatedBrief && (
                    <div className="space-y-2 pt-1">
                      <pre className="max-h-52 overflow-y-auto whitespace-pre-wrap rounded-xl border border-[#E6E8EC] bg-white p-3 font-sans text-xs leading-relaxed text-[#344054]">
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
