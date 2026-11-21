"use client";

import React, { useState } from "react";
import { FolderKanban, Plus, Trash2 } from "lucide-react";
import type { Ad, Board } from "@/lib/types";

interface CollectionsViewProps {
  boards: Board[];
  ads: Ad[];
  onSelectBoard: (boardId: string) => void;
  onCreateBoard: (name: string) => void;
  onDeleteBoard: (boardId: string) => void;
}

export function CollectionsView({
  boards,
  ads,
  onSelectBoard,
  onCreateBoard,
  onDeleteBoard,
}: CollectionsViewProps) {
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onCreateBoard(name.trim());
    setName("");
    setCreating(false);
  };

  return (
    <div className="space-y-6">
      {/* KONVERT COLLECTIONS HEADER */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="adtrack-icon-badge flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white">
            <FolderKanban className="h-5 w-5" />
          </div>
          <div>
            <h1 className="font-display text-[17px] font-bold leading-tight text-[#101828]">
              Collections
            </h1>
            <p className="mt-0.5 text-[12.5px] text-[#667085]">
              Organisér dine bedste hooks, statics og konkurrent-kollektioner
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setCreating((v) => !v)}
          className="inline-flex items-center gap-1.5 rounded-xl bg-[#101828] px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#0027eb]"
        >
          <Plus className="h-3.5 w-3.5" />
          New Collection
        </button>
      </div>

      {creating && (
        <form
          onSubmit={handleSubmit}
          className="animate-sheet-up flex flex-wrap items-center gap-2 rounded-2xl border border-[#EAECF0] bg-[#FAFBFD] p-3 sm:flex-nowrap"
        >
          <input
            type="text"
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Navn på din nye collection (fx Q4 Winning Hooks)..."
            className="min-w-0 flex-1 rounded-xl border border-[#E2E5EB] bg-white px-3.5 py-2 text-sm text-[#101828] outline-none focus:border-[#0027eb]"
          />
          <button
            type="submit"
            className="rounded-xl bg-[#0027eb] px-4 py-2 text-xs font-semibold text-white hover:bg-[#001fc2]"
          >
            Opret
          </button>
        </form>
      )}

      {/* ASYMMETRIC 3-PHOTO BENTO COLLAGE GRID (Exact Konvert image_3.png!) */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {boards.map((board) => {
          const boardAds = ads.filter((a) => a.board_ids.includes(board.id));
          const leftAd = boardAds[0];
          const topRightAd = boardAds[1];
          const bottomRightAd = boardAds[2];

          return (
            <div
              key={board.id}
              className="group relative flex flex-col overflow-hidden rounded-[18px] border border-[#ECEEF2] bg-white p-2.5 transition-all duration-200 hover:-translate-y-0.5 hover:border-[#D7DCE5]"
              style={{ boxShadow: "var(--shadow-card)" }}
            >
              {/* Asymmetric 1 tall left + 2 stacked right collage */}
              <button
                type="button"
                onClick={() => onSelectBoard(board.id)}
                className="grid h-[216px] w-full grid-cols-[1.15fr_1fr] grid-rows-2 gap-1.5 overflow-hidden rounded-[12px]"
              >
                {/* Left tall slot */}
                <div className="row-span-2 overflow-hidden bg-[#F4F5F7]">
                  {leftAd?.thumbnail_url || leftAd?.media_url ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={leftAd.thumbnail_url || leftAd.media_url}
                      alt={leftAd.headline}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                    />
                  ) : (
                    <div
                      className="flex h-full w-full flex-col items-center justify-center p-4 text-center"
                      style={{
                        background: `linear-gradient(155deg, ${board.accent_color}14 0%, #F4F5F7 100%)`,
                      }}
                    >
                      <span
                        className="h-3 w-3 rounded-full"
                        style={{ backgroundColor: board.accent_color }}
                      />
                    </div>
                  )}
                </div>

                {/* Top-right slot */}
                <div className="overflow-hidden bg-[#F4F5F7]">
                  {topRightAd?.thumbnail_url || topRightAd?.media_url ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={topRightAd.thumbnail_url || topRightAd.media_url}
                      alt={topRightAd.headline}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                    />
                  ) : (
                    <div className="h-full w-full bg-[#F6F7F9]" />
                  )}
                </div>

                {/* Bottom-right slot */}
                <div className="overflow-hidden bg-[#F4F5F7]">
                  {bottomRightAd?.thumbnail_url || bottomRightAd?.media_url ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={bottomRightAd.thumbnail_url || bottomRightAd.media_url}
                      alt={bottomRightAd.headline}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                    />
                  ) : (
                    <div className="h-full w-full bg-[#F2F4F7]" />
                  )}
                </div>
              </button>

              {/* Single-line clean title + item count */}
              <div className="flex items-center justify-between gap-2 px-1.5 pb-1 pt-3">
                <button
                  type="button"
                  onClick={() => onSelectBoard(board.id)}
                  className="flex min-w-0 items-center gap-1.5 text-left"
                >
                  <span className="truncate text-[13.5px] font-semibold text-[#101828] group-hover:text-[#0027eb]">
                    {board.name}
                  </span>
                  <span className="text-[#98A2B3]">·</span>
                  <span className="shrink-0 font-mono-num text-[12.5px] text-[#667085]">
                    {boardAds.length} {boardAds.length === 1 ? "Item" : "Items"}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => onDeleteBoard(board.id)}
                  aria-label={`Slet ${board.name}`}
                  className="rounded-lg p-1 text-[#98A2B3] opacity-0 transition-all hover:bg-[#FFF1F2] hover:text-[#E11D48] group-hover:opacity-100"
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
