"use client";

import React, { useRef, useState } from "react";
import {
  ArrowLeft,
  Check,
  Film,
  FolderKanban,
  Layers,
  Link2,
  Loader2,
  Pencil,
  Plus,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import type { Ad, Board, Brand } from "@/lib/types";
import { AdCard } from "./AdCard";
import { MasonryGrid } from "./MasonryGrid";
import { InstagramColorIcon } from "./BrandIcons";

interface PendingFolderItem {
  id: string;
  folderId: string;
  mode: "instagram" | "upload";
  label: string;
  status: string;
  progress?: number;
  error?: string;
}

/**
 * Official Supabase Storage signed-upload via FormData PUT + XMLHttpRequest
 * for real-time upload % progress and full iOS Safari (.MOV / video/quicktime) compatibility.
 */
function uploadToSignedUrl(
  uploadUrl: string,
  fileOrBlob: File | Blob,
  filename: string,
  onProgress?: (pct: number) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    const fd = new FormData();
    fd.append("cacheControl", "3600");
    fd.append("", fileOrBlob, filename);

    const xhr = new XMLHttpRequest();
    xhr.open("PUT", uploadUrl, true);

    xhr.upload.onprogress = (ev) => {
      if (ev.lengthComputable && ev.total > 0 && onProgress) {
        onProgress(Math.min(99, Math.round((ev.loaded / ev.total) * 100)));
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress?.(100);
        resolve();
      } else {
        let detail = "";
        try {
          const parsed = JSON.parse(xhr.responseText);
          detail = parsed?.message || parsed?.error || "";
        } catch {
          detail = (xhr.responseText || "").slice(0, 120);
        }
        reject(
          new Error(
            detail
              ? `Upload fejlede (HTTP ${xhr.status}): ${detail}`
              : `Upload fejlede (HTTP ${xhr.status}).`
          )
        );
      }
    };

    xhr.onerror = () => {
      reject(new Error("Netværksfejl under upload. Prøv igen."));
    };

    xhr.send(fd);
  });
}

const FOLDER_COLORS = [
  "#0027eb",
  "#0284c7",
  "#0ea5e9",
  "#0d9488",
  "#16a34a",
  "#65a30d",
  "#d97706",
  "#ea580c",
  "#e11d48",
  "#0f172a",
];

interface CollectionsViewProps {
  boards: Board[];
  ads: Ad[];
  brands: Brand[];
  selectedFolderId: string | null;
  onSelectFolder: (folderId: string | null) => void;
  onCreateBoard: (name: string, accentColor?: string) => void;
  onUpdateBoard: (boardId: string, patch: { name: string; accent_color: string }) => void;
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
  brands: _brands,
  selectedFolderId,
  onSelectFolder,
  onCreateBoard,
  onUpdateBoard,
  onDeleteBoard,
  onOpenShop,
  onOpenAd,
  onToggleBoard,
  onAddCustomAd,
}: CollectionsViewProps) {
  void _brands;
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [newColor, setNewColor] = useState(FOLDER_COLORS[0]);

  // Edit Folder Modal state
  const [editingBoard, setEditingBoard] = useState<Board | null>(null);
  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState(FOLDER_COLORS[0]);

  const openEditModal = (board: Board) => {
    setEditingBoard(board);
    setEditName(board.name);
    setEditColor(board.accent_color || FOLDER_COLORS[0]);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBoard || !editName.trim()) return;
    onUpdateBoard(editingBoard.id, {
      name: editName.trim(),
      accent_color: editColor,
    });
    setEditingBoard(null);
  };

  const editFolderModal = editingBoard ? (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-[#050811]/50 p-0 backdrop-blur-xs sm:items-center sm:p-4"
      onClick={() => setEditingBoard(null)}
    >
      <div
        className="animate-sheet-up w-full max-w-md rounded-t-2xl border border-[#E6E9F0] bg-white p-5 shadow-2xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white shadow-sm transition-colors"
              style={{ backgroundColor: editColor }}
            >
              <FolderKanban className="h-4.5 w-4.5" />
            </span>
            <div>
              <h2 className="font-display text-[16.5px] font-bold text-[#0F172A]">
                Rediger folder
              </h2>
              <p className="text-xs text-[#64748B]">
                Skift navn og farve på din folder.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setEditingBoard(null)}
            aria-label="Luk"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-[#64748B] hover:bg-[#F3F5F9] hover:text-[#0F172A]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSaveEdit} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-[11.5px] font-semibold text-[#334155]">
              Navn
            </label>
            <input
              type="text"
              autoFocus
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              placeholder="Folder-navn..."
              className="w-full rounded-xl border border-[#E2E6EF] bg-[#F7F8FB] px-3 py-2.5 text-[16px] text-[#0F172A] outline-none focus:border-[#0027eb] focus:bg-white sm:text-[13.5px]"
            />
          </div>

          <div>
            <label className="mb-2 block text-[11.5px] font-semibold text-[#334155]">
              Farve
            </label>
            <div className="flex flex-wrap items-center gap-2">
              {FOLDER_COLORS.map((hex) => {
                const selected = editColor.toLowerCase() === hex.toLowerCase();
                return (
                  <button
                    key={hex}
                    type="button"
                    onClick={() => setEditColor(hex)}
                    aria-label={`Vælg farve ${hex}`}
                    className={`flex h-8 w-8 items-center justify-center rounded-full transition-transform hover:scale-105 ${
                      selected ? "ring-2 ring-[#0F172A] ring-offset-2" : ""
                    }`}
                    style={{ backgroundColor: hex }}
                  >
                    {selected && <Check className="h-3.5 w-3.5 text-white" />}
                  </button>
                );
              })}

              <label
                title="Vælg egen farve"
                className="relative flex h-8 w-8 cursor-pointer items-center justify-center overflow-hidden rounded-full border border-dashed border-[#CBD5E1] bg-[#F8FAFC] text-[10px] font-bold text-[#64748B] transition-colors hover:border-[#94A3B8] hover:text-[#0F172A]"
              >
                <span>+</span>
                <input
                  type="color"
                  value={editColor}
                  onChange={(e) => setEditColor(e.target.value)}
                  className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                />
              </label>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setEditingBoard(null)}
              className="rounded-xl px-3.5 py-2 text-xs font-semibold text-[#64748B] hover:bg-[#F3F5F9] hover:text-[#0F172A]"
            >
              Annuller
            </button>
            <button
              type="submit"
              disabled={!editName.trim()}
              className="adtrack-btn-primary inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-semibold text-white disabled:opacity-50"
            >
              Gem ændringer
            </button>
          </div>
        </form>
      </div>
    </div>
  ) : null;

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
  const [pendingItems, setPendingItems] = useState<PendingFolderItem[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const updatePending = (id: string, patch: Partial<PendingFolderItem>) => {
    setPendingItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...patch } : item))
    );
  };

  const removePending = (id: string) => {
    setPendingItems((prev) => prev.filter((item) => item.id !== id));
  };

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
    onCreateBoard(name.trim(), newColor);
    setName("");
    setNewColor(FOLDER_COLORS[(boards.length + 1) % FOLDER_COLORS.length]);
    setCreating(false);
  };

  const handleImportInstagram = async (
    e: React.FormEvent,
    folderId: string
  ) => {
    e.preventDefault();
    const trimmedUrl = igUrl.trim();
    if (!trimmedUrl) return;

    if (!/instagram\.com\/(reel|reels|p|tv)\//i.test(trimmedUrl)) {
      setModalError(
        "Indsæt et gyldigt Instagram Reel- eller opslagslink (fx instagram.com/reel/...)."
      );
      return;
    }

    const titleSnapshot = customTitle.trim();
    const notesSnapshot = customNotes.trim();
    const pendingId = `pending-ig-${Date.now().toString(36)}`;

    // Close modal IMMEDIATELY and show live loading card right inside the folder!
    resetAddModal();
    setAddModalOpen(false);
    setPendingItems((prev) => [
      {
        id: pendingId,
        folderId,
        mode: "instagram",
        label: titleSnapshot || "Instagram Reel",
        status: "Henter video & lyd fra Instagram...",
      },
      ...prev,
    ]);

    try {
      const res = await fetch("/api/folder-video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "import_instagram",
          url: trimmedUrl,
          folderId,
          title: titleSnapshot || undefined,
          notes: notesSnapshot || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok || !data.ad) {
        throw new Error(data.error || "Kunne ikke importere Instagram-videoen.");
      }
      removePending(pendingId);
      onAddCustomAd?.(data.ad);
    } catch (err) {
      updatePending(pendingId, {
        status: "Import fejlede",
        error:
          err instanceof Error ? err.message : "Instagram-import fejlede.",
      });
    }
  };

  const handleUploadLocalFile = async (
    e: React.FormEvent,
    folderId: string
  ) => {
    e.preventDefault();
    if (!selectedFile) return;

    // Supabase Free Tier single-object limit is 50 MB
    if (selectedFile.size > 50 * 1024 * 1024) {
      const mb = (selectedFile.size / (1024 * 1024)).toFixed(1);
      setModalError(
        `Filen er ${mb} MB (maks 50 MB). Trim videoen en smule eller vælg en kortere fil.`
      );
      return;
    }

    const fileSnapshot = selectedFile;
    const titleSnapshot = customTitle.trim();
    const notesSnapshot = customNotes.trim();
    const cleanTitle =
      titleSnapshot ||
      fileSnapshot.name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ") ||
      "Video upload";
    const pendingId = `pending-up-${Date.now().toString(36)}`;

    // Close modal IMMEDIATELY and render live upload card with real-time % inside folder!
    resetAddModal();
    setAddModalOpen(false);
    setPendingItems((prev) => [
      {
        id: pendingId,
        folderId,
        mode: "upload",
        label: cleanTitle,
        status: "Klargør upload...",
        progress: 5,
      },
      ...prev,
    ]);

    try {
      const isVideo =
        fileSnapshot.type.startsWith("video/") ||
        /\.(mp4|mov|webm|m4v)$/i.test(fileSnapshot.name);
      const contentType =
        fileSnapshot.type || (isVideo ? "video/mp4" : "image/jpeg");

      // 1. Request signed direct upload URL (bypasses Vercel 4.5MB body cap)
      const signRes = await fetch("/api/folder-video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "sign_upload",
          filename: fileSnapshot.name || (isVideo ? "video.mov" : "image.jpg"),
          contentType,
        }),
      });
      const signData = await signRes.json();
      if (!signRes.ok || !signData.ok || !signData.uploadUrl) {
        throw new Error(signData.error || "Kunne ikke starte upload.");
      }

      // 2. Upload via official Supabase FormData PUT with live progress %
      updatePending(pendingId, { status: "Uploader video...", progress: 10 });
      await uploadToSignedUrl(
        signData.uploadUrl,
        fileSnapshot,
        fileSnapshot.name || (isVideo ? "video.mov" : "image.jpg"),
        (pct) => {
          updatePending(pendingId, {
            status: `Uploader (${pct}%)...`,
            progress: pct,
          });
        }
      );

      // 3. For videos, extract & upload a sharp JPEG poster frame via Canvas
      let thumbPublicUrl: string = isVideo ? "" : signData.publicUrl;
      if (isVideo) {
        updatePending(pendingId, {
          status: "Genererer forhåndsvisning...",
          progress: 96,
        });
        const posterBlob = await extractVideoPosterBlob(fileSnapshot);
        if (posterBlob) {
          const thumbSignRes = await fetch("/api/folder-video", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "sign_upload",
              filename: `${(fileSnapshot.name || "video").replace(/\.[^.]+$/, "")}-poster.jpg`,
              contentType: "image/jpeg",
            }),
          });
          const thumbSign = await thumbSignRes.json().catch(() => null);
          if (thumbSign?.ok && thumbSign.uploadUrl && thumbSign.publicUrl) {
            await uploadToSignedUrl(
              thumbSign.uploadUrl,
              posterBlob,
              "poster.jpg"
            ).catch(() => {});
            thumbPublicUrl = thumbSign.publicUrl;
          }
        }
      }

      const initials = cleanTitle.slice(0, 2).toUpperCase() || "UP";

      const uploadedAd: Ad = {
        id: `upload-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
        brand_id: "custom-upload",
        brand_name: cleanTitle,
        brand_handle: "@upload",
        brand_avatar_initials: initials,
        brand_avatar_color: "#0F172A",
        market: "DK",
        source_type: "manual",
        source_url: "",
        media_type: isVideo ? "video" : "image",
        display_format: isVideo ? "VIDEO" : "IMAGE",
        media_url: signData.publicUrl,
        thumbnail_url: thumbPublicUrl || signData.publicUrl,
        fallback_image_url: thumbPublicUrl || undefined,
        aspect_ratio: isVideo ? "9:16" : "3:4",
        primary_text: notesSnapshot,
        headline: cleanTitle,
        cta_text: "",
        landing_page_url: "",
        landing_page_path: "",
        is_active: true,
        started_running_at: new Date().toISOString(),
        platforms: ["Upload"],
        status: "ready",
        tags: ["custom-upload"],
        board_ids: [folderId],
        user_notes: notesSnapshot,
        is_favorite: false,
        created_at: new Date().toISOString(),
      };

      removePending(pendingId);
      onAddCustomAd?.(uploadedAd);
    } catch (err) {
      updatePending(pendingId, {
        status: "Upload fejlede",
        error: err instanceof Error ? err.message : "Upload fejlede.",
      });
    }
  };

  const activeFolder = boards.find((b) => b.id === selectedFolderId) || null;

  // FOLDER DETAIL VIEW (Shows saved Ads & custom Videos inside this folder)
  if (activeFolder) {
    const folderAds = ads.filter((a) => a.board_ids.includes(activeFolder.id));
    const folderPending = pendingItems.filter(
      (p) => p.folderId === activeFolder.id
    );
    type FolderGridEntry =
      | { kind: "pending"; item: PendingFolderItem }
      | { kind: "ad"; ad: Ad };
    const folderEntries: FolderGridEntry[] = [
      ...folderPending.map((item) => ({ kind: "pending" as const, item })),
      ...folderAds.map((ad) => ({ kind: "ad" as const, ad })),
    ];

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
                {folderAds.length} videoer &amp; ads
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => openEditModal(activeFolder)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-[#E2E6EF] bg-white px-3 py-2 text-xs font-semibold text-[#334155] transition-colors hover:border-[#CBD5E1] hover:bg-[#F8FAFC] hover:text-[#0F172A]"
            >
              <Pencil className="h-3.5 w-3.5" />
              Rediger
            </button>
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

        {editFolderModal}

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

        {/* Saved Ads, Custom Videos & Live Loading Cards inside Folder */}
        {folderEntries.length > 0 && (
          <div className="space-y-3">
            <h2 className="flex items-center gap-2 font-display text-sm font-bold text-[#0F172A]">
              <Layers className="h-4 w-4 text-[#64748B]" />
              Gemte Videoer &amp; Ads ({folderAds.length}
              {folderPending.length > 0 ? ` + ${folderPending.length} henter` : ""})
            </h2>
            <MasonryGrid
              items={folderEntries}
              getKey={(entry) =>
                entry.kind === "pending" ? entry.item.id : entry.ad.id
              }
              renderItem={(entry) =>
                entry.kind === "pending" ? (
                  <article className="relative flex flex-col overflow-hidden rounded-[14px] border border-[#EAECEF] bg-white shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
                    {/* Card Header */}
                    <div className="flex items-center justify-between gap-2 px-3 pb-2 pt-3">
                      <div className="flex min-w-0 items-center gap-2">
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#F1F5F9]">
                          {entry.item.mode === "instagram" ? (
                            <InstagramColorIcon className="h-3.5 w-3.5" />
                          ) : (
                            <Film className="h-3.5 w-3.5 text-[#475569]" />
                          )}
                        </span>
                        <span className="truncate font-display text-[13px] font-semibold text-[#0F172A]">
                          {entry.item.label}
                        </span>
                      </div>
                      {entry.item.error ? (
                        <button
                          type="button"
                          onClick={() => removePending(entry.item.id)}
                          aria-label="Fjern"
                          className="flex h-6 w-6 items-center justify-center rounded-md text-[#94A3B8] hover:bg-[#FFF1F2] hover:text-[#E11D48]"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      ) : (
                        <span className="inline-flex shrink-0 items-center gap-1 rounded-md border border-[#E2E6EF] bg-[#FAFBFD] px-2 py-0.5 text-[10.5px] font-semibold text-[#475569]">
                          <Loader2 className="h-3 w-3 animate-spin text-[#0027eb]" />
                          Henter
                        </span>
                      )}
                    </div>

                    {/* Shimmer / Error Media Frame */}
                    <div className="px-2 pb-2.5">
                      <div
                        className={`relative flex aspect-[4/5] w-full flex-col items-center justify-center gap-3 overflow-hidden rounded-[10px] p-5 text-center ${
                          entry.item.error
                            ? "bg-[#FFF1F2]"
                            : "skeleton-shimmer bg-[#F3F5F9]"
                        }`}
                      >
                        {entry.item.error ? (
                          <>
                            <p className="font-display text-xs font-bold text-[#9F1239]">
                              Kunne ikke hente video
                            </p>
                            <p className="text-[11.5px] leading-relaxed text-[#E11D48]">
                              {entry.item.error}
                            </p>
                            <button
                              type="button"
                              onClick={() => removePending(entry.item.id)}
                              className="mt-1 rounded-lg border border-[#FECDD3] bg-white px-3 py-1.5 text-[11px] font-semibold text-[#9F1239] hover:bg-[#FFF1F2]"
                            >
                              Luk kort
                            </button>
                          </>
                        ) : (
                          <>
                            <span className="flex h-11 w-11 items-center justify-center rounded-full border border-white/80 bg-white/90 shadow-sm">
                              <Loader2 className="h-5 w-5 animate-spin text-[#0027eb]" />
                            </span>
                            <div className="w-full max-w-[200px] space-y-2">
                              <p className="text-[12px] font-semibold text-[#0F172A]">
                                {entry.item.status}
                              </p>
                              {typeof entry.item.progress === "number" && (
                                <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/80">
                                  <div
                                    className="h-full rounded-full bg-[#0027eb] transition-all duration-200"
                                    style={{ width: `${entry.item.progress}%` }}
                                  />
                                </div>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </article>
                ) : (
                  <AdCard
                    ad={entry.ad}
                    boards={boards}
                    onOpen={onOpenAd}
                    onToggleBoard={onToggleBoard}
                    onOpenBrand={onOpenShop}
                  />
                )
              }
            />
          </div>
        )}

        {folderEntries.length === 0 && (
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
          className="animate-sheet-up space-y-3 rounded-2xl border border-[#DCE3F5] bg-white p-3.5"
        >
          <div className="flex items-center gap-2">
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
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            {FOLDER_COLORS.map((hex) => {
              const selected = newColor.toLowerCase() === hex.toLowerCase();
              return (
                <button
                  key={hex}
                  type="button"
                  onClick={() => setNewColor(hex)}
                  aria-label={`Vælg farve ${hex}`}
                  className={`flex h-6 w-6 items-center justify-center rounded-full transition-transform hover:scale-105 ${
                    selected ? "ring-2 ring-[#0F172A] ring-offset-2" : ""
                  }`}
                  style={{ backgroundColor: hex }}
                >
                  {selected && <Check className="h-3 w-3 text-white" />}
                </button>
              );
            })}
          </div>
        </form>
      )}

      {/* ASYMMETRIC 3-PHOTO BENTO COLLAGE CARDS */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {boards.map((board) => {
          const folderAds = ads.filter((a) => a.board_ids.includes(board.id));

          const previewImages: string[] = folderAds
            .map((a) => a.fallback_image_url || a.thumbnail_url)
            .filter(Boolean);

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
                    {folderAds.length} videoer &amp; ads
                  </p>
                </button>

                <div className="flex items-center gap-0.5">
                  <button
                    type="button"
                    onClick={() => openEditModal(board)}
                    aria-label={`Rediger ${board.name}`}
                    title="Rediger navn & farve"
                    className="rounded-lg p-1.5 text-[#94A3B8] transition-all hover:bg-[#F1F5F9] hover:text-[#0F172A] sm:opacity-0 sm:group-hover:opacity-100"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onDeleteBoard(board.id)}
                    aria-label={`Slet ${board.name}`}
                    title="Slet folder"
                    className="rounded-lg p-1.5 text-[#94A3B8] transition-all hover:bg-[#FFF1F2] hover:text-[#E11D48] sm:opacity-0 sm:group-hover:opacity-100"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {editFolderModal}
    </div>
  );
}
