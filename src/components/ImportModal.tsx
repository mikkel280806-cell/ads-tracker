"use client";

import React, { useMemo, useState } from "react";
import {
  Check,
  ClipboardPaste,
  Link2,
  Loader2,
  Upload,
  X,
} from "lucide-react";
import type { Ad, Board, MediaType } from "@/lib/types";
import { parseAdLink } from "@/lib/url-parser";

interface ImportModalProps {
  open: boolean;
  initialUrl?: string;
  boards: Board[];
  onClose: () => void;
  onImported: (ads: Ad[]) => void;
}

export function ImportModal({
  open,
  initialUrl = "",
  boards,
  onClose,
  onImported,
}: ImportModalProps) {
  const [tab, setTab] = useState<"links" | "manual">("links");
  const [rawLinks, setRawLinks] = useState(initialUrl);
  const [selectedBoards, setSelectedBoards] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [clipboardFeedback, setClipboardFeedback] = useState(false);

  // Manual upload state
  const [brandName, setBrandName] = useState("");
  const [headline, setHeadline] = useState("");
  const [primaryText, setPrimaryText] = useState("");
  const [landingUrl, setLandingUrl] = useState("");
  const [angle, setAngle] = useState("Problem/Solution");
  const [mediaType, setMediaType] = useState<MediaType>("image");
  const [previewDataUrl, setPreviewDataUrl] = useState<string>("");
  const [notes, setNotes] = useState("");

  const parsedLinks = useMemo(() => {
    return rawLinks
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map(parseAdLink);
  }, [rawLinks]);

  if (!open) return null;

  const toggleBoard = (id: string) => {
    setSelectedBoards((prev) =>
      prev.includes(id) ? prev.filter((b) => b !== id) : [...prev, id]
    );
  };

  const handlePasteClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text?.trim()) {
        setRawLinks((prev) => (prev.trim() ? `${prev.trim()}\n${text.trim()}` : text.trim()));
        setClipboardFeedback(true);
        setTimeout(() => setClipboardFeedback(false), 1800);
      }
    } catch {
      setError("Kunne ikke læse udklipsholder — indsæt linket manuelt i feltet.");
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setMediaType(file.type.startsWith("video/") ? "video" : "image");
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setPreviewDataUrl(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmitLinks = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const validUrls = parsedLinks.filter((p) => p.isValid).map((p) => p.rawUrl);
    if (validUrls.length === 0) {
      setError("Indsæt mindst ét gyldigt Instagram- eller Meta Ad Library-link.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ urls: validUrls, board_ids: selectedBoards }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Import fejlede");
      }
      onImported(data.ads);
      setRawLinks("");
      setSelectedBoards([]);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Noget gik galt ved import.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitManual = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!brandName.trim()) {
      setError("Indtast et brandnavn.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          board_ids: selectedBoards,
          manual: {
            brand_name: brandName,
            headline,
            primary_text: primaryText,
            landing_page_url: landingUrl,
            media_type: mediaType,
            media_url: previewDataUrl || "/creatives/coffee-static.jpg",
            ai_angle: angle,
            user_notes: notes,
          },
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Kunne ikke gemme ad");
      }
      onImported(data.ads);
      setBrandName("");
      setHeadline("");
      setPrimaryText("");
      setLandingUrl("");
      setPreviewDataUrl("");
      setNotes("");
      setSelectedBoards([]);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kunne ikke gemme ad.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="animate-sheet-up flex max-h-[92dvh] w-full max-w-xl flex-col overflow-hidden rounded-t-3xl border sm:rounded-2xl"
        style={{
          backgroundColor: "var(--bg-surface)",
          borderColor: "var(--border-strong)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Mobile grab handle */}
        <div className="flex justify-center pt-2.5 sm:hidden">
          <div
            className="h-1 w-10 rounded-full"
            style={{ backgroundColor: "var(--border-strong)" }}
          />
        </div>

        {/* Header */}
        <div
          className="flex items-center justify-between border-b px-5 py-4"
          style={{ borderColor: "var(--border-subtle)" }}
        >
          <div>
            <h2 className="font-display text-base font-semibold">
              Gem ny annonce
            </h2>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              Indsæt Instagram- eller Meta Ad Library-links, eller upload selv
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Luk"
            className="rounded-xl p-2 transition-colors hover:bg-white/5"
            style={{ color: "var(--text-secondary)" }}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Mode Switcher */}
        <div className="px-5 pt-4">
          <div
            className="grid grid-cols-2 rounded-xl p-1"
            style={{ backgroundColor: "var(--bg-elevated)" }}
          >
            <button
              type="button"
              onClick={() => {
                setTab("links");
                setError(null);
              }}
              className="flex items-center justify-center gap-2 rounded-lg py-2 text-xs font-semibold transition-all"
              style={
                tab === "links"
                  ? {
                      backgroundColor: "var(--bg-surface)",
                      color: "var(--text-primary)",
                    }
                  : { color: "var(--text-muted)" }
              }
            >
              <Link2 className="h-3.5 w-3.5" />
              Instagram / Meta Link
            </button>
            <button
              type="button"
              onClick={() => {
                setTab("manual");
                setError(null);
              }}
              className="flex items-center justify-center gap-2 rounded-lg py-2 text-xs font-semibold transition-all"
              style={
                tab === "manual"
                  ? {
                      backgroundColor: "var(--bg-surface)",
                      color: "var(--text-primary)",
                    }
                  : { color: "var(--text-muted)" }
              }
            >
              <Upload className="h-3.5 w-3.5" />
              Manuel Upload
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 py-4 pb-safe">
          {tab === "links" ? (
            <form onSubmit={handleSubmitLinks} className="space-y-4">
              <div>
                <div className="mb-2 flex items-center justify-between gap-2">
                  <label
                    htmlFor="import-links-input"
                    className="text-xs font-medium"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    Indsæt 1 eller flere links (ét link pr. linje)
                  </label>
                  <button
                    type="button"
                    onClick={handlePasteClipboard}
                    className="inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors hover:bg-white/5"
                    style={{
                      borderColor: "var(--border-strong)",
                      color: "var(--text-primary)",
                    }}
                  >
                    {clipboardFeedback ? (
                      <>
                        <Check
                          className="h-3.5 w-3.5"
                          style={{ color: "var(--accent-live)" }}
                        />
                        Indsat!
                      </>
                    ) : (
                      <>
                        <ClipboardPaste className="h-3.5 w-3.5" />
                        Indsæt fra udklipsholder
                      </>
                    )}
                  </button>
                </div>

                <textarea
                  id="import-links-input"
                  rows={4}
                  value={rawLinks}
                  onChange={(e) => setRawLinks(e.target.value)}
                  placeholder={
                    "https://www.facebook.com/ads/library/?id=984127364512\nhttps://www.instagram.com/reel/C9xK2pL8mQw/"
                  }
                  className="w-full rounded-xl border px-3.5 py-3 text-sm outline-none transition-colors focus:border-white/30"
                  style={{
                    backgroundColor: "var(--bg-elevated)",
                    borderColor: "var(--border-subtle)",
                    color: "var(--text-primary)",
                  }}
                />

                {/* Live detected links preview */}
                {parsedLinks.length > 0 && (
                  <div className="mt-2.5 flex flex-wrap gap-1.5">
                    {parsedLinks.map((item, idx) => (
                      <span
                        key={`${item.rawUrl}-${idx}`}
                        className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-medium"
                        style={
                          item.sourceType === "meta_ad_library"
                            ? {
                                backgroundColor: "var(--accent-meta-soft)",
                                color: "var(--accent-meta)",
                              }
                            : item.sourceType === "instagram"
                              ? {
                                  backgroundColor: "var(--accent-ig-soft)",
                                  color: "var(--accent-ig)",
                                }
                              : {
                                  backgroundColor: "var(--bg-elevated)",
                                  color: "var(--text-secondary)",
                                }
                        }
                      >
                        {item.sourceType === "meta_ad_library"
                          ? `Meta Ad Library${item.externalId ? ` #${item.externalId.slice(0, 8)}` : ""}`
                          : item.sourceType === "instagram"
                            ? `Instagram${item.externalId ? ` (${item.externalId.slice(0, 8)})` : ""}`
                            : "Web-link"}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Board selection */}
              <div>
                <p
                  className="mb-2 text-xs font-medium"
                  style={{ color: "var(--text-secondary)" }}
                >
                  Gem direkte i board (valgfrit)
                </p>
                <div className="flex flex-wrap gap-2">
                  {boards.map((board) => {
                    const active = selectedBoards.includes(board.id);
                    return (
                      <button
                        key={board.id}
                        type="button"
                        onClick={() => toggleBoard(board.id)}
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

              {error && (
                <p className="rounded-xl bg-rose-500/10 px-3 py-2 text-xs text-rose-400">
                  {error}
                </p>
              )}

              <button
                id="submit-import-links"
                type="submit"
                disabled={loading || parsedLinks.length === 0}
                className="flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold transition-opacity disabled:opacity-40"
                style={{
                  backgroundColor: "var(--btn-primary-bg)",
                  color: "var(--btn-primary-fg)",
                }}
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Importerer...
                  </>
                ) : (
                  <>
                    Gem{" "}
                    {parsedLinks.length > 1
                      ? `${parsedLinks.length} annoncer`
                      : "annonce i biblioteket"}
                  </>
                )}
              </button>
            </form>
          ) : (
            <form onSubmit={handleSubmitManual} className="space-y-3.5">
              {/* File picker */}
              <label
                className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed p-5 text-center transition-colors hover:bg-white/5"
                style={{ borderColor: "var(--border-strong)" }}
              >
                {previewDataUrl ? (
                  mediaType === "video" ? (
                    <video
                      src={previewDataUrl}
                      className="max-h-40 rounded-xl object-cover"
                      controls
                    />
                  ) : (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={previewDataUrl}
                      alt="Preview"
                      className="max-h-40 rounded-xl object-cover"
                    />
                  )
                ) : (
                  <>
                    <Upload
                      className="mb-2 h-5 w-5"
                      style={{ color: "var(--text-muted)" }}
                    />
                    <span className="text-xs font-medium">
                      Vælg video eller billede fra telefon / computer
                    </span>
                    <span
                      className="mt-0.5 text-[11px]"
                      style={{ color: "var(--text-muted)" }}
                    >
                      MP4, MOV, JPG eller PNG
                    </span>
                  </>
                )}
                <input
                  type="file"
                  accept="image/*,video/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label
                    className="mb-1 block text-xs font-medium"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    Brand *
                  </label>
                  <input
                    type="text"
                    value={brandName}
                    onChange={(e) => setBrandName(e.target.value)}
                    placeholder="Fx Nordic Glow"
                    className="w-full rounded-xl border px-3 py-2 text-sm outline-none"
                    style={{
                      backgroundColor: "var(--bg-elevated)",
                      borderColor: "var(--border-subtle)",
                    }}
                  />
                </div>
                <div>
                  <label
                    className="mb-1 block text-xs font-medium"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    Vinkel (Angle)
                  </label>
                  <select
                    value={angle}
                    onChange={(e) => setAngle(e.target.value)}
                    className="w-full rounded-xl border px-3 py-2 text-sm outline-none"
                    style={{
                      backgroundColor: "var(--bg-elevated)",
                      borderColor: "var(--border-subtle)",
                    }}
                  >
                    <option>Problem/Solution</option>
                    <option>Social Proof</option>
                    <option>Us vs. Them</option>
                    <option>Offer / Cost Saving</option>
                    <option>Founder Story</option>
                    <option>Routine / Lifestyle</option>
                  </select>
                </div>
              </div>

              <div>
                <label
                  className="mb-1 block text-xs font-medium"
                  style={{ color: "var(--text-secondary)" }}
                >
                  Headline / Hook
                </label>
                <input
                  type="text"
                  value={headline}
                  onChange={(e) => setHeadline(e.target.value)}
                  placeholder="Fx Skift 3 trin ud med 1 serum"
                  className="w-full rounded-xl border px-3 py-2 text-sm outline-none"
                  style={{
                    backgroundColor: "var(--bg-elevated)",
                    borderColor: "var(--border-subtle)",
                  }}
                />
              </div>

              <div>
                <label
                  className="mb-1 block text-xs font-medium"
                  style={{ color: "var(--text-secondary)" }}
                >
                  Annoncetekst / Egne noter
                </label>
                <textarea
                  rows={2}
                  value={primaryText}
                  onChange={(e) => setPrimaryText(e.target.value)}
                  placeholder="Indsæt primær tekst eller hvorfor annoncen virker..."
                  className="w-full rounded-xl border px-3 py-2 text-sm outline-none"
                  style={{
                    backgroundColor: "var(--bg-elevated)",
                    borderColor: "var(--border-subtle)",
                  }}
                />
              </div>

              <div>
                <label
                  className="mb-1 block text-xs font-medium"
                  style={{ color: "var(--text-secondary)" }}
                >
                  Landingsside URL
                </label>
                <input
                  type="url"
                  value={landingUrl}
                  onChange={(e) => setLandingUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full rounded-xl border px-3 py-2 text-sm outline-none"
                  style={{
                    backgroundColor: "var(--bg-elevated)",
                    borderColor: "var(--border-subtle)",
                  }}
                />
              </div>

              {error && (
                <p className="rounded-xl bg-rose-500/10 px-3 py-2 text-xs text-rose-400">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold"
                style={{
                  backgroundColor: "var(--btn-primary-bg)",
                  color: "var(--btn-primary-fg)",
                }}
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Gem i bibliotek"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
