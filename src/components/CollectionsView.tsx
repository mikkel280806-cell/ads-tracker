"use client";

import React, { useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowUpRight,
  Film,
  FolderKanban,
  Layers,
  Link2,
  Loader2,
  Plus,
  Store,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import type { Ad, Board, Brand } from "@/lib/types";
import { formatReach } from "@/lib/url-parser";
import { AdCard } from "./AdCard";
import { MasonryGrid } from "./MasonryGrid";
import { ShopifyBagIcon } from "./BrandIcons";

interface CollectionsViewProps {
  boards: Board[];
  ads: Ad[];
  brands: Brand[];
  selectedFolderId: string | null;
  onSelectFolder: (folderId: string | null) => void;
  onCreateBoard: (name: string) => void;
  onDeleteBoard: (boardId: string) => void;
  onOpenShop: (brandId: string) => void;
  onOpenAd: (ad: Ad) => void;
  onToggleBoard: (adId: string, boardId: string) => void;
  onAddCustomAd?: (ad: Ad) => void;
}

/**
 * Extracts a crisp JPEG poster frame from a local video File using HTMLVideoElement + Canvas
 * so uploaded iPhone/desktop videos immediately display a sharp thumbnail card.
 */
async function extractVideoPosterBlob(file: File): Promise<Blob | null> {
  if (!file.type.startsWith("video/")) return null;
  return new Promise((resolve) => {
    const objectUrl = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.muted = true;
    video.playsInline = true;
    video.preload = "metadata";
    video.src = objectUrl;

    let settled = false;
    const finish = (blob: Blob | null) => {
      if (settled) return;
      settled = true;
      URL.revokeObjectURL(objectUrl);
      resolve(blob);
    };

    const timer = window.setTimeout(() => finish(null), 5000);

    video.onloadeddata = () => {
      try {
        video.currentTime = Math.min(0.4, (video.duration || 1) / 4);
      } catch {
        // capture frame 0
      }
    };

    video.onseeked = () => {
      window.clearTimeout(timer);
      try {
        const w = video.videoWidth || 720;
        const h = video.videoHeight || 1280;
        const scale = Math.min(1, 720 / Math.max(w, h));
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(w * scale);
        canvas.height = Math.round(h * scale);
        const ctx = canvas.getContext("2d");
        if (!ctx) return finish(null);
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        canvas.toBlob((b) => finish(b), "image/jpeg", 0.84);
      } catch {
        finish(null);
      }
    };

    video.onerror = () => {
      window.clearTimeout(timer);
      finish(null);
    };
  });
}

export function CollectionsView({
  boards,
  ads,
  brands,
  selectedFolderId,
  onSelectFolder,
  onCreateBoard,
  onDeleteBoard,
  onOpenShop,
  onOpenAd,
  onToggleBoard,
  onAddCustomAd,
}: CollectionsViewProps) {
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [folderTab, setFolderTab] = useState<"all" | "shops" | "ads">("all");

  // Add Video Modal state (Instagram link or local file / iPhone Photos upload)
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [addMode, setAddMode] = useState<"instagram" | "upload">("instagram");
  const [igUrl, setIgUrl] = useState("");
  const [customTitle, setCustomTitle] = useState("");
  const [customNotes, setCustomNotes] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const [modalError, setModalError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const resetAddModal = () => {
    setIgUrl("");
    setCustomTitle("");
    setCustomNotes("");
    setSelectedFile(null);
    setUploadStatus(null);
    setModalError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onCreateBoard(name.trim());
    setName("");
    setCreating(false);
  };

  const handleImportInstagram = async (
    e: React.FormEvent,
    folderId: string
  ) => {
    e.preventDefault();
    if (!igUrl.trim() || submitting) return;
    setModalError(null);
    setSubmitting(true);
    setUploadStatus("Henter video fra Instagram...");
    try {
      const res = await fetch("/api/folder-video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "import_instagram",
          url: igUrl.trim(),
          folderId,
          title: customTitle.trim() || undefined,
          notes: customNotes.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok || !data.ad) {
        throw new Error(data.error || "Kunne ikke importere Instagram-videoen.");
      }
      onAddCustomAd?.(data.ad);
      resetAddModal();
      setAddModalOpen(false);
    } catch (err) {
      setModalError(
        err instanceof Error ? err.message : "Instagram-import fejlede."
      );
    } finally {
      setSubmitting(false);
      setUploadStatus(null);
    }
  };

  const handleUploadLocalFile = async (
    e: React.FormEvent,
    folderId: string
  ) => {
    e.preventDefault();
    if (!selectedFile || submitting) return;
    setModalError(null);
    setSubmitting(true);

    try {
      const isVideo = selectedFile.type.startsWith("video/");
      const contentType =
        selectedFile.type || (isVideo ? "video/mp4" : "image/jpeg");

      // 1. Request signed direct upload URL (bypasses Vercel 4.5MB body cap -> supports 50MB+ iPhone videos!)
      setUploadStatus("Klargør upload...");
      const signRes = await fetch("/api/folder-video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "sign_upload",
          filename: selectedFile.name,
          contentType,
        }),
      });
      const signData = await signRes.json();
      if (!signRes.ok || !signData.ok || !signData.uploadUrl) {
        throw new Error(signData.error || "Kunne ikke starte upload.");
      }

      // 2. Upload video/image directly from device to Supabase Storage
      setUploadStatus("Uploader til skyen...");
      const putRes = await fetch(signData.uploadUrl, {
        method: "PUT",
        headers: {
          "Content-Type": contentType,
          "x-upsert": "true",
        },
        body: selectedFile,
      });
      if (!putRes.ok) {
        throw new Error(`Upload fejlede (HTTP ${putRes.status}).`);
      }

      // 3. For videos, generate & upload a sharp poster thumbnail frame via Canvas
      let thumbPublicUrl: string = isVideo ? "" : signData.publicUrl;
      if (isVideo) {
        setUploadStatus("Genererer forhåndsvisning...");
        const posterBlob = await extractVideoPosterBlob(selectedFile);
        if (posterBlob) {
          const thumbSignRes = await fetch("/api/folder-video", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "sign_upload",
              filename: `${selectedFile.name.replace(/\.[^.]+$/, "")}-poster.jpg`,
              contentType: "image/jpeg",
            }),
          });
          const thumbSign = await thumbSignRes.json().catch(() => null);
          if (thumbSign?.ok && thumbSign.uploadUrl) {
            const thumbPut = await fetch(thumbSign.uploadUrl, {
              method: "PUT",
              headers: {
                "Content-Type": "image/jpeg",
                "x-upsert": "true",
              },
              body: posterBlob,
            });
            if (thumbPut.ok && thumbSign.publicUrl) {
              thumbPublicUrl = thumbSign.publicUrl;
            }
          }
        }
      }

      const cleanTitle =
        customTitle.trim() ||
        selectedFile.name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ");
      const initials = cleanTitle.slice(0, 2).toUpperCase() || "UP";

      const uploadedAd: Ad = {
        id: `upload-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
        brand_id: "custom-upload",
        brand_name: cleanTitle,
        brand_handle: "@upload",
        brand_avatar_initials: initials,
        brand_avatar_color: "#0F172A",
        market: "DK",
        source_type: "manual_upload",
        media_type: isVideo ? "video" : "image",
        display_format: isVideo ? "VIDEO" : "IMAGE",
        media_url: signData.publicUrl,
        thumbnail_url: thumbPublicUrl || signData.publicUrl,
        fallback_image_url: thumbPublicUrl || undefined,
        aspect_ratio: isVideo ? "9:16" : "4:5",
        primary_text: customNotes.trim(),
        headline: cleanTitle,
        cta_text: "Uploaded",
        landing_page_url: "",
        landing_page_path: "/",
        is_active: true,
        started_running_at: new Date().toISOString(),
        platforms: ["Upload"],
        status: "ready",
        tags: ["custom-upload"],
        board_ids: [folderId],
        user_notes: customNotes.trim(),
        is_favorite: false,
        created_at: new Date().toISOString(),
      };

      onAddCustomAd?.(uploadedAd);
      resetAddModal();
      setAddModalOpen(false);
    } catch (err) {
      setModalError(err instanceof Error ? err.message : "Upload fejlede.");
    } finally {
      setSubmitting(false);
      setUploadStatus(null);
    }
  };

  const activeFolder = boards.find((b) => b.id === selectedFolderId) || null;

  // FOLDER DETAIL VIEW (Shows saved Shops AND saved Ads/Videos inside this folder)
  if (activeFolder) {
    const folderBrands = brands.filter((b) =>
      (b.folder_ids || []).includes(activeFolder.id)
    );
    const folderAds = ads.filter((a) => a.board_ids.includes(activeFolder.id));

    return (
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#E6E9F0] pb-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => onSelectFolder(null)}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#E2E6EF] bg-white text-[#475569] hover:border-[#CBD5E1] hover:text-[#0F172A]"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <span
              className="flex h-10 w-10 items-center justify-center rounded-xl text-white shadow-sm"
              style={{ backgroundColor: activeFolder.accent_color }}
            >
              <FolderKanban className="h-5 w-5" />
            </span>
            <div>
              <h1 className="font-display text-[19px] font-bold text-[#0F172A]">
                {activeFolder.name}
              </h1>
              <p className="text-xs text-[#64748B]">
                {folderBrands.length} shops · {folderAds.length} videoer &amp; ads
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <div className="inline-flex rounded-xl border border-[#E6E9F0] bg-[#F5F7FA] p-1 text-xs font-semibold">
              {[
                { id: "all" as const, label: `Alle (${folderBrands.length + folderAds.length})` },
                { id: "shops" as const, label: `Shops (${folderBrands.length})` },
                { id: "ads" as const, label: `Ads (${folderAds.length})` },
              ].map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setFolderTab(t.id)}
                  className={`rounded-lg px-3 py-1.5 transition-all ${
                    folderTab === t.id
                      ? "bg-white text-[#0F172A] shadow-xs"
                      : "text-[#64748B]"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => {
                resetAddModal();
                setAddModalOpen(true);
              }}
              className="adtrack-btn-primary inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold text-white transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
              Tilføj video
            </button>
          </div>
        </div>

        {/* ADD VIDEO MODAL (Instagram Link OR Local File / iPhone Photo Library) */}
        {addModalOpen && (
          <div
            className="fixed inset-0 z-50 flex items-end justify-center bg-[#050811]/50 p-0 backdrop-blur-xs sm:items-center sm:p-4"
            onClick={() => {
              if (!submitting) setAddModalOpen(false);
            }}
          >
            <div
              className="animate-sheet-up w-full max-w-md rounded-t-2xl border border-[#E6E9F0] bg-white p-5 shadow-2xl sm:rounded-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <h2 className="font-display text-[17px] font-bold text-[#0F172A]">
                    Tilføj video til {activeFolder.name}
                  </h2>
                  <p className="text-xs text-[#64748B]">
                    Importér fra et Instagram-link eller upload direkte fra telefon/computer.
                  </p>
                </div>
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => setAddModalOpen(false)}
                  aria-label="Luk"
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-[#64748B] hover:bg-[#F3F5F9] hover:text-[#0F172A] disabled:opacity-40"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* 2-Tab Mode Switcher */}
              <div className="mb-4 grid grid-cols-2 rounded-xl bg-[#F3F4F6] p-1 text-xs font-semibold">
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => {
                    setAddMode("instagram");
                    setModalError(null);
                  }}
                  className={`inline-flex items-center justify-center gap-1.5 rounded-lg py-2 transition-all ${
                    addMode === "instagram"
                      ? "bg-white text-[#0F172A] shadow-xs"
                      : "text-[#64748B] hover:text-[#0F172A]"
                  }`}
                >
                  <Link2 className="h-3.5 w-3.5" />
                  Instagram link
                </button>
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => {
                    setAddMode("upload");
                    setModalError(null);
                  }}
                  className={`inline-flex items-center justify-center gap-1.5 rounded-lg py-2 transition-all ${
                    addMode === "upload"
                      ? "bg-white text-[#0F172A] shadow-xs"
                      : "text-[#64748B] hover:text-[#0F172A]"
                  }`}
                >
                  <Upload className="h-3.5 w-3.5" />
                  Upload / Fotos
                </button>
              </div>

              {addMode === "instagram" ? (
                <form
                  onSubmit={(e) => handleImportInstagram(e, activeFolder.id)}
                  className="space-y-3"
                >
                  <div>
                    <label className="mb-1 block text-[11.5px] font-semibold text-[#334155]">
                      Instagram Reel eller opslagslink
                    </label>
                    <input
                      type="url"
                      required
                      autoFocus
                      value={igUrl}
                      onChange={(e) => setIgUrl(e.target.value)}
                      placeholder="https://www.instagram.com/reel/..."
                      className="w-full rounded-xl border border-[#E2E6EF] bg-[#FAFBFD] px-3 py-2.5 text-[16px] text-[#0F172A] outline-none focus:border-[#0F172A] focus:bg-white sm:text-xs"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-[11.5px] font-semibold text-[#334155]">
                      Titel / Brand (valgfrit)
                    </label>
                    <input
                      type="text"
                      value={customTitle}
                      onChange={(e) => setCustomTitle(e.target.value)}
                      placeholder="fx UGC hook inspiration"
                      className="w-full rounded-xl border border-[#E2E6EF] bg-[#FAFBFD] px-3 py-2 text-[16px] text-[#0F172A] outline-none focus:border-[#0F172A] focus:bg-white sm:text-xs"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-[11.5px] font-semibold text-[#334155]">
                      Note (valgfrit)
                    </label>
                    <textarea
                      rows={2}
                      value={customNotes}
                      onChange={(e) => setCustomNotes(e.target.value)}
                      placeholder="Hvad vil du kopiere fra denne video?"
                      className="w-full rounded-xl border border-[#E2E6EF] bg-[#FAFBFD] px-3 py-2 text-[16px] text-[#0F172A] outline-none focus:border-[#0F172A] focus:bg-white sm:text-xs"
                    />
                  </div>

                  {modalError && (
                    <p className="rounded-xl bg-[#FFF1F2] px-3 py-2 text-xs font-medium text-[#E11D48]">
                      {modalError}
                    </p>
                  )}

                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                      type="button"
                      disabled={submitting}
                      onClick={() => setAddModalOpen(false)}
                      className="rounded-xl px-3.5 py-2 text-xs font-semibold text-[#64748B] hover:bg-[#F3F5F9] hover:text-[#0F172A] disabled:opacity-40"
                    >
                      Annuller
                    </button>
                    <button
                      type="submit"
                      disabled={submitting || !igUrl.trim()}
                      className="adtrack-btn-primary inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-semibold text-white disabled:opacity-50"
                    >
                      {submitting ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Plus className="h-3.5 w-3.5" />
                      )}
                      {submitting ? uploadStatus || "Importerer..." : "Importér video"}
                    </button>
                  </div>
                </form>
              ) : (
                <form
                  onSubmit={(e) => handleUploadLocalFile(e, activeFolder.id)}
                  className="space-y-3"
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="video/*,image/*"
                    onChange={(e) => {
                      const f = e.target.files?.[0] || null;
                      setSelectedFile(f);
                      setModalError(null);
                    }}
                    className="hidden"
                  />

                  <button
                    type="button"
                    disabled={submitting}
                    onClick={() => fileInputRef.current?.click()}
                    className="flex w-full flex-col items-center justify-center gap-2 rounded-2xl border border-[#DCE1EC] bg-[#FAFBFD] px-4 py-7 text-center transition-colors hover:border-[#94A3B8] hover:bg-[#F3F5F9]"
                  >
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-[#0F172A] shadow-xs ring-1 ring-[#E6E9F0]">
                      {selectedFile ? (
                        <Film className="h-5 w-5" />
                      ) : (
                        <Upload className="h-5 w-5" />
                      )}
                    </span>
                    {selectedFile ? (
                      <div>
                        <p className="max-w-[260px] truncate text-xs font-semibold text-[#0F172A]">
                          {selectedFile.name}
                        </p>
                        <p className="mt-0.5 font-mono-num text-[11px] text-[#64748B]">
                          {(selectedFile.size / (1024 * 1024)).toFixed(1)} MB · Tryk for at skifte
                        </p>
                      </div>
                    ) : (
                      <div>
                        <p className="text-xs font-semibold text-[#0F172A]">
                          Vælg video eller billede fra Fotos / Filer
                        </p>
                        <p className="mt-0.5 text-[11px] text-[#64748B]">
                          MP4, MOV, WebM eller billede direkte fra telefon eller Mac
                        </p>
                      </div>
                    )}
                  </button>

                  <div>
                    <label className="mb-1 block text-[11.5px] font-semibold text-[#334155]">
                      Titel (valgfrit)
                    </label>
                    <input
                      type="text"
                      value={customTitle}
                      onChange={(e) => setCustomTitle(e.target.value)}
                      placeholder="fx Raw UGC koncept #1"
                      className="w-full rounded-xl border border-[#E2E6EF] bg-[#FAFBFD] px-3 py-2 text-[16px] text-[#0F172A] outline-none focus:border-[#0F172A] focus:bg-white sm:text-xs"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-[11.5px] font-semibold text-[#334155]">
                      Note (valgfrit)
                    </label>
                    <textarea
                      rows={2}
                      value={customNotes}
                      onChange={(e) => setCustomNotes(e.target.value)}
                      placeholder="Skriv noter om vinkel eller hook..."
                      className="w-full rounded-xl border border-[#E2E6EF] bg-[#FAFBFD] px-3 py-2 text-[16px] text-[#0F172A] outline-none focus:border-[#0F172A] focus:bg-white sm:text-xs"
                    />
                  </div>

                  {modalError && (
                    <p className="rounded-xl bg-[#FFF1F2] px-3 py-2 text-xs font-medium text-[#E11D48]">
                      {modalError}
                    </p>
                  )}

                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                      type="button"
                      disabled={submitting}
                      onClick={() => setAddModalOpen(false)}
                      className="rounded-xl px-3.5 py-2 text-xs font-semibold text-[#64748B] hover:bg-[#F3F5F9] hover:text-[#0F172A] disabled:opacity-40"
                    >
                      Annuller
                    </button>
                    <button
                      type="submit"
                      disabled={submitting || !selectedFile}
                      className="adtrack-btn-primary inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-semibold text-white disabled:opacity-50"
                    >
                      {submitting ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Upload className="h-3.5 w-3.5" />
                      )}
                      {submitting ? uploadStatus || "Uploader..." : "Upload til folder"}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}

        {/* Saved Shops inside Folder */}
        {(folderTab === "all" || folderTab === "shops") && folderBrands.length > 0 && (
          <div className="space-y-3">
            <h2 className="flex items-center gap-2 font-display text-sm font-bold text-[#0F172A]">
              <Store className="h-4 w-4 text-[#64748B]" />
              Gemte Shops ({folderBrands.length})
            </h2>
            <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
              {folderBrands.map((b) => (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => onOpenShop(b.id)}
                  className="adtrack-card-interactive flex items-center justify-between gap-3 rounded-2xl p-3.5 text-left"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-[#E6E9F0] bg-[#F7F8FB]">
                      {b.storefront_image_url ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={b.storefront_image_url}
                          alt={b.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center font-display text-xs font-bold text-[#334155]">
                          {b.avatar_initials}
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="truncate font-display text-sm font-bold text-[#0F172A]">
                          {b.name}
                        </span>
                        {b.is_shopify && <ShopifyBagIcon className="h-3.5 w-3.5" />}
                      </div>
                      <div className="mt-0.5 flex items-center gap-2 font-mono-num text-[11px] text-[#64748B]">
                        <span>{formatReach(b.monthly_visits)} visits</span>
                        <span>·</span>
                        <span className="inline-flex items-center gap-1 text-[#15803D]">
                          <Layers className="h-3 w-3" />
                          {b.active_ads_count ?? 0}
                        </span>
                      </div>
                    </div>
                  </div>
                  <ArrowUpRight className="h-4 w-4 shrink-0 text-[#94A3B8]" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Saved Ads & Custom Videos inside Folder */}
        {(folderTab === "all" || folderTab === "ads") && folderAds.length > 0 && (
          <div className="space-y-3">
            <h2 className="flex items-center gap-2 font-display text-sm font-bold text-[#0F172A]">
              <Layers className="h-4 w-4 text-[#64748B]" />
              Gemte Videoer &amp; Ads ({folderAds.length})
            </h2>
            <MasonryGrid
              items={folderAds}
              getKey={(ad) => ad.id}
              renderItem={(ad) => (
                <AdCard
                  ad={ad}
                  boards={boards}
                  onOpen={onOpenAd}
                  onToggleBoard={onToggleBoard}
                  onOpenBrand={onOpenShop}
                />
              )}
            />
          </div>
        )}

        {folderBrands.length === 0 && folderAds.length === 0 && (
          <div className="px-6 py-14 text-center">
            <p className="font-display text-sm font-bold text-[#0F172A]">
              Denne folder er tom endnu
            </p>
            <p className="mt-1 text-xs text-[#64748B]">
              Klik på <strong>+ Tilføj video</strong> øverst for at uploade fra Fotos/Filer eller importere et Instagram-link – eller gem ads fra <strong>Explore</strong>.
            </p>
          </div>
        )}
      </div>
    );
  }

  // FOLDERS OVERVIEW GRID — Clean Header
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <h1 className="font-display text-[22px] font-bold leading-tight text-[#0F172A]">
          Folders
        </h1>

        <button
          type="button"
          onClick={() => setCreating((v) => !v)}
          className="adtrack-btn-primary inline-flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-semibold text-white transition-all sm:rounded-xl sm:px-4"
        >
          <Plus className="h-3.5 w-3.5" />
          Ny folder
        </button>
      </div>

      {creating && (
        <form
          onSubmit={handleSubmit}
          className="animate-sheet-up flex items-center gap-2 rounded-2xl border border-[#DCE3F5] bg-white p-3"
        >
          <input
            type="text"
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Navn på ny folder (fx DK Winners)..."
            className="min-w-0 flex-1 rounded-xl border border-[#DCE1EC] bg-[#FAFBFD] px-3.5 py-2 text-[16px] text-[#0F172A] outline-none focus:border-[#0027eb] focus:bg-white sm:text-sm"
          />
          <button
            type="submit"
            className="adtrack-btn-primary shrink-0 rounded-xl px-4 py-2.5 text-xs font-semibold text-white sm:py-2"
          >
            Opret Folder
          </button>
        </form>
      )}

      {/* ASYMMETRIC 3-PHOTO BENTO COLLAGE CARDS */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {boards.map((board) => {
          const folderAds = ads.filter((a) => a.board_ids.includes(board.id));
          const folderBrands = brands.filter((b) =>
            (b.folder_ids || []).includes(board.id)
          );

          const previewImages: string[] = [
            ...folderAds.map((a) => a.fallback_image_url || a.thumbnail_url),
            ...folderBrands.map(
              (b) => b.storefront_image_url || b.top_products?.[0]?.image_url || ""
            ),
          ].filter(Boolean);

          const leftImg = previewImages[0];
          const topRightImg = previewImages[1];
          const bottomRightImg = previewImages[2];

          return (
            <div
              key={board.id}
              className="adtrack-card-interactive group relative flex flex-col overflow-hidden rounded-[20px] p-2.5"
            >
              <button
                type="button"
                onClick={() => onSelectFolder(board.id)}
                className="grid h-[210px] w-full grid-cols-[1.15fr_1fr] grid-rows-2 gap-1.5 overflow-hidden rounded-[14px]"
              >
                <div className="row-span-2 overflow-hidden bg-[#F3F5F9]">
                  {leftImg ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={leftImg}
                      alt={board.name}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                    />
                  ) : (
                    <div
                      className="flex h-full w-full flex-col items-center justify-center p-4"
                      style={{
                        background: `linear-gradient(155deg, ${board.accent_color}18 0%, #F3F5F9 100%)`,
                      }}
                    >
                      <span
                        className="flex h-9 w-9 items-center justify-center rounded-xl text-white shadow-sm"
                        style={{ backgroundColor: board.accent_color }}
                      >
                        <FolderKanban className="h-4 w-4" />
                      </span>
                    </div>
                  )}
                </div>

                <div className="overflow-hidden bg-[#F5F7FB]">
                  {topRightImg ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={topRightImg}
                      alt=""
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                    />
                  ) : (
                    <div className="h-full w-full bg-[#F5F7FB]" />
                  )}
                </div>

                <div className="overflow-hidden bg-[#F1F4F9]">
                  {bottomRightImg ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={bottomRightImg}
                      alt=""
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                    />
                  ) : (
                    <div className="h-full w-full bg-[#EFF2F7]" />
                  )}
                </div>
              </button>

              <div className="flex items-center justify-between gap-2 px-1.5 pb-1 pt-3">
                <button
                  type="button"
                  onClick={() => onSelectFolder(board.id)}
                  className="min-w-0 flex-1 text-left"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: board.accent_color }}
                    />
                    <span className="truncate font-display text-[14.5px] font-bold text-[#0F172A]">
                      {board.name}
                    </span>
                  </div>
                  <p className="mt-0.5 pl-4.5 font-mono-num text-[11.5px] text-[#64748B]">
                    {folderBrands.length} shops · {folderAds.length} ads
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => onDeleteBoard(board.id)}
                  aria-label={`Slet ${board.name}`}
                  className="rounded-lg p-1.5 text-[#94A3B8] opacity-0 transition-all hover:bg-[#FFF1F2] hover:text-[#E11D48] group-hover:opacity-100"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
