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
        setRawLinks((prev) =>
          prev.trim() ? `${prev.trim()}\n${text.trim()}` : text.trim()
        );
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
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/55 p-0 backdrop-blur-[2px] sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="animate-sheet-up flex max-h-[92dvh] w-full max-w-xl flex-col overflow-hidden rounded-t-3xl border border-[#E6E8EC] bg-white text-[#111318] shadow-2xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-center pt-2.5 sm:hidden">
          <div className="h-1 w-10 rounded-full bg-[#D0D5DD]" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#EAECEF] px-5 py-4">
          <div>
            <h2 className="font-display text-base font-bold text-[#111318]">
              Importér til Adtrack
            </h2>
            <p className="text-xs text-[#667085]">
              Indsæt Instagram- eller Meta Ad Library-links (enkeltvis eller bulk), eller upload fil
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Luk"
            className="rounded-lg p-2 text-[#667085] hover:bg-[#F5F6F8]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Mode Switcher */}
        <div className="px-5 pt-4">
          <div className="grid grid-cols-2 rounded-xl bg-[#F2F4F7] p-1">
            <button
              type="button"
              onClick={() => {
                setTab("links");
                setError(null);
              }}
              className="flex items-center justify-center gap-2 rounded-lg py-2 text-xs font-semibold transition-all"
              style={
                tab === "links"
                  ? { backgroundColor: "#FFFFFF", color: "#0027eb", boxShadow: "0 1px 2px rgba(0,0,0,0.06)" }
                  : { color: "#667085" }
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
                  ? { backgroundColor: "#FFFFFF", color: "#0027eb", boxShadow: "0 1px 2px rgba(0,0,0,0.06)" }
                  : { color: "#667085" }
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
                    className="text-xs font-semibold text-[#344054]"
                  >
                    Indsæt 1 eller flere links (ét pr. linje)
                  </label>
                  <button
                    type="button"
                    onClick={handlePasteClipboard}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-[#E2E5EB] bg-white px-2.5 py-1 text-xs font-semibold text-[#111318] hover:border-[#0027eb] hover:text-[#0027eb]"
                  >
                    {clipboardFeedback ? (
                      <>
                        <Check className="h-3.5 w-3.5 text-[#16A34A]" />
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
                  className="w-full rounded-xl border border-[#E2E5EB] bg-[#FAFBFD] px-3.5 py-3 text-sm text-[#111318] outline-none focus:border-[#0027eb] focus:bg-white"
                />

                {parsedLinks.length > 0 && (
                  <div className="mt-2.5 flex flex-wrap gap-1.5">
                    {parsedLinks.map((item, idx) => (
                      <span
                        key={`${item.rawUrl}-${idx}`}
                        className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-semibold"
                        style={
                          item.sourceType === "meta_ad_library"
                            ? { backgroundColor: "#EEF2FF", color: "#0027eb" }
                            : item.sourceType === "instagram"
                              ? { backgroundColor: "#FFF1F2", color: "#E11D48" }
                              : { backgroundColor: "#F2F4F7", color: "#475467" }
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

              <div>
                <p className="mb-2 text-xs font-semibold text-[#344054]">
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
                        className="inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition-all"
                        style={
                          active
                            ? { backgroundColor: "#0027eb", color: "#FFFFFF", borderColor: "#0027eb" }
                            : { backgroundColor: "#F8F9FB", color: "#344054", borderColor: "#E6E8EC" }
                        }
                      >
                        <span
                          className="h-2 w-2 rounded-full"
                          style={{ backgroundColor: active ? "#FFFFFF" : board.accent_color }}
                        />
                        {board.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              {error && (
                <p className="rounded-xl bg-[#FFF1F2] px-3 py-2 text-xs font-medium text-[#E11D48]">
                  {error}
                </p>
              )}

              <button
                id="submit-import-links"
                type="submit"
                disabled={loading || parsedLinks.length === 0}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#0027eb] py-3 text-sm font-semibold text-white transition-colors hover:bg-[#001fc2] disabled:opacity-40"
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
                      : "annonce i Adtrack"}
                  </>
                )}
              </button>
            </form>
          ) : (
            <form onSubmit={handleSubmitManual} className="space-y-3.5">
              <label className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-[#D0D5DD] bg-[#FAFBFD] p-5 text-center transition-colors hover:border-[#0027eb]">
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
                    <Upload className="mb-2 h-5 w-5 text-[#0027eb]" />
                    <span className="text-xs font-semibold text-[#111318]">
                      Vælg video eller billede fra telefon / computer
                    </span>
                    <span className="mt-0.5 text-[11px] text-[#667085]">
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
                  <label className="mb-1 block text-xs font-semibold text-[#344054]">
                    Brand *
                  </label>
                  <input
                    type="text"
                    value={brandName}
                    onChange={(e) => setBrandName(e.target.value)}
                    placeholder="Fx Nordic Glow"
                    className="w-full rounded-xl border border-[#E2E5EB] bg-[#FAFBFD] px-3 py-2 text-sm outline-none focus:border-[#0027eb] focus:bg-white"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-[#344054]">
                    Vinkel (Angle)
                  </label>
                  <select
                    value={angle}
                    onChange={(e) => setAngle(e.target.value)}
                    className="w-full rounded-xl border border-[#E2E5EB] bg-[#FAFBFD] px-3 py-2 text-sm outline-none focus:border-[#0027eb] focus:bg-white"
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
                <label className="mb-1 block text-xs font-semibold text-[#344054]">
                  Headline / Hook
                </label>
                <input
                  type="text"
                  value={headline}
                  onChange={(e) => setHeadline(e.target.value)}
                  placeholder="Fx Skift 3 trin ud med 1 serum"
                  className="w-full rounded-xl border border-[#E2E5EB] bg-[#FAFBFD] px-3 py-2 text-sm outline-none focus:border-[#0027eb] focus:bg-white"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-[#344054]">
                  Annoncetekst / Egne noter
                </label>
                <textarea
                  rows={2}
                  value={primaryText}
                  onChange={(e) => setPrimaryText(e.target.value)}
                  placeholder="Indsæt primær tekst eller hvorfor annoncen virker..."
                  className="w-full rounded-xl border border-[#E2E5EB] bg-[#FAFBFD] px-3 py-2 text-sm outline-none focus:border-[#0027eb] focus:bg-white"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-[#344054]">
                  Landingsside URL
                </label>
                <input
                  type="url"
                  value={landingUrl}
                  onChange={(e) => setLandingUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full rounded-xl border border-[#E2E5EB] bg-[#FAFBFD] px-3 py-2 text-sm outline-none focus:border-[#0027eb] focus:bg-white"
                />
              </div>

              {error && (
                <p className="rounded-xl bg-[#FFF1F2] px-3 py-2 text-xs font-medium text-[#E11D48]">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#0027eb] py-3 text-sm font-semibold text-white hover:bg-[#001fc2]"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Gem i Adtrack"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
