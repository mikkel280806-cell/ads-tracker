"use client";

import React, { useState } from "react";
import {
  ArrowLeft,
  ArrowUpRight,
  FolderKanban,
  Plus,
  Store,
  Trash2,
} from "lucide-react";
import type { Ad, Board, Brand } from "@/lib/types";
import { formatReach } from "@/lib/url-parser";
import { AdCard } from "./AdCard";
import { MetaInfinityIcon, ShopifyBagIcon } from "./BrandIcons";

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
}: CollectionsViewProps) {
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [folderTab, setFolderTab] = useState<"all" | "shops" | "ads">("all");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onCreateBoard(name.trim());
    setName("");
    setCreating(false);
  };

  const activeFolder = boards.find((b) => b.id === selectedFolderId) || null;

  // FOLDER DETAIL VIEW (Shows saved Shops AND saved Ads inside this folder)
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
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#E2E6EF] bg-white text-[#475569] hover:border-[#0027eb] hover:text-[#0027eb]"
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
                {folderBrands.length} shops · {folderAds.length} Meta ads
              </p>
            </div>
          </div>

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
        </div>

        {/* Saved Shops inside Folder */}
        {(folderTab === "all" || folderTab === "shops") && folderBrands.length > 0 && (
          <div className="space-y-3">
            <h2 className="flex items-center gap-2 font-display text-sm font-bold text-[#0F172A]">
              <Store className="h-4 w-4 text-[#0027eb]" />
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
                        <div className="flex h-full w-full items-center justify-center font-display text-xs font-bold text-[#0027eb]">
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
                          <MetaInfinityIcon className="h-3 w-3" />
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

        {/* Saved Ads inside Folder */}
        {(folderTab === "all" || folderTab === "ads") && folderAds.length > 0 && (
          <div className="space-y-3">
            <h2 className="flex items-center gap-2 font-display text-sm font-bold text-[#0F172A]">
              <MetaInfinityIcon className="h-4 w-4" />
              Gemte Meta Ads ({folderAds.length})
            </h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {folderAds.map((ad) => (
                <AdCard
                  key={ad.id}
                  ad={ad}
                  boards={boards}
                  onOpen={onOpenAd}
                  onToggleBoard={onToggleBoard}
                  onOpenBrand={onOpenShop}
                />
              ))}
            </div>
          </div>
        )}

        {folderBrands.length === 0 && folderAds.length === 0 && (
          <div className="rounded-2xl border border-dashed border-[#D6DCE8] bg-[#FAFBFD] px-6 py-14 text-center">
            <p className="font-display text-sm font-bold text-[#0F172A]">
              Denne folder er tom endnu
            </p>
            <p className="mt-1 text-xs text-[#64748B]">
              Klik på bogmærke-ikonet på enhver shop under <strong>Shops</strong> eller enhver annonce under <strong>Explore</strong> for at gemme den her.
            </p>
          </div>
        )}
      </div>
    );
  }

  // FOLDERS OVERVIEW GRID
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="adtrack-icon-badge flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-white">
            <FolderKanban className="h-5 w-5" />
          </div>
          <div>
            <h1 className="font-display text-[20px] font-bold leading-tight text-[#0F172A]">
              Folders
            </h1>
            <p className="mt-0.5 text-[12.5px] text-[#64748B]">
              Organisér dine foretrukne danske og amerikanske shops, vindende ads og hooks i mapper
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setCreating((v) => !v)}
          className="adtrack-btn-primary inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-semibold text-white transition-all"
        >
          <Plus className="h-3.5 w-3.5" />
          New Folder
        </button>
      </div>

      {creating && (
        <form
          onSubmit={handleSubmit}
          className="animate-sheet-up flex flex-wrap items-center gap-2 rounded-2xl border border-[#DCE3F5] bg-[#FAFBFD] p-3 sm:flex-nowrap"
        >
          <input
            type="text"
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Navn på din nye folder (fx DK Activewear, Q4 Winning Hooks)..."
            className="min-w-0 flex-1 rounded-xl border border-[#DCE1EC] bg-white px-3.5 py-2 text-sm text-[#0F172A] outline-none focus:border-[#0027eb]"
          />
          <button
            type="submit"
            className="adtrack-btn-primary rounded-xl px-4 py-2 text-xs font-semibold text-white"
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
                    <span className="truncate font-display text-[14.5px] font-bold text-[#0F172A] group-hover:text-[#0027eb]">
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
