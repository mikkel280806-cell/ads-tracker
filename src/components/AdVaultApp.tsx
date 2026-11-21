"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  Bookmark,
  Check,
  ClipboardPaste,
  Columns2,
  Flame,
  Folder,
  FolderPlus,
  Heart,
  LayoutGrid,
  Link2,
  Loader2,
  Plus,
  Radar,
  Search,
  Settings2,
  SlidersHorizontal,
  Square,
  Store,
  Upload,
  X,
} from "lucide-react";
import type { Ad, Board, Brand, ConnectorStatus } from "@/lib/types";
import { SEED_ADS, SEED_BOARDS, SEED_BRANDS } from "@/lib/seed-data";
import { getActiveDays, parseAdLink } from "@/lib/url-parser";
import { AdCard } from "./AdCard";
import { AdDetailSheet } from "./AdDetailSheet";
import { ImportModal } from "./ImportModal";
import { ShopsTableView } from "./ShopsTableView";
import { ShopAnalyticsView } from "./ShopAnalyticsView";
import { ConnectorsView } from "./ConnectorsView";

type ActiveView = "ads" | "shops" | "brandtracker" | "favorites" | "boards" | "connectors";
type SortOption = "newest" | "longest" | "reach" | "spend";

const STORAGE_KEYS = {
  ads: "adtrack_ads_v4",
  brands: "adtrack_brands_v4",
  boards: "adtrack_boards_v4",
};

interface AdVaultAppProps {
  initialStatus: ConnectorStatus;
}

export function AdVaultApp({ initialStatus }: AdVaultAppProps) {
  const [ads, setAds] = useState<Ad[]>(SEED_ADS);
  const [brands, setBrands] = useState<Brand[]>(SEED_BRANDS);
  const [boards, setBoards] = useState<Board[]>(SEED_BOARDS);
  const [connectorStatus, setConnectorStatus] = useState<ConnectorStatus>(initialStatus);
  const [hydrated, setHydrated] = useState(false);

  const [view, setView] = useState<ActiveView>("shops");
  const [selectedBoardId, setSelectedBoardId] = useState<string | null>(null);
  const [selectedShopId, setSelectedShopId] = useState<string | null>(null);
  const [mobileCols, setMobileCols] = useState<1 | 2>(1);

  // Quick-paste Foreplay bar
  const [quickLink, setQuickLink] = useState("");
  const [quickImporting, setQuickImporting] = useState(false);
  const [quickToast, setQuickToast] = useState<string | null>(null);

  // Search & filters
  const [search, setSearch] = useState("");
  const [sourceFilter, setSourceFilter] = useState<"all" | "meta_ad_library" | "instagram">("all");
  const [mediaFilter, setMediaFilter] = useState<"all" | "video" | "image">("all");
  const [winnersOnly, setWinnersOnly] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>("newest");

  // Modals / Sheets
  const [activeAdId, setActiveAdId] = useState<string | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [sharedUrl, setSharedUrl] = useState("");
  const [newBoardOpen, setNewBoardOpen] = useState(false);
  const [newBoardName, setNewBoardName] = useState("");

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }

    let cancelled = false;

    fetch("/api/status", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled && data) setConnectorStatus(data);
      })
      .catch(() => {});

    Promise.resolve().then(() => {
      if (cancelled) return;
      try {
        const savedAds = localStorage.getItem(STORAGE_KEYS.ads);
        const savedBrands = localStorage.getItem(STORAGE_KEYS.brands);
        const savedBoards = localStorage.getItem(STORAGE_KEYS.boards);

        if (savedAds) setAds(JSON.parse(savedAds));
        if (savedBrands) setBrands(JSON.parse(savedBrands));
        if (savedBoards) setBoards(JSON.parse(savedBoards));
      } catch {
        // fallback to seed
      }
      setHydrated(true);

      const params = new URLSearchParams(window.location.search);
      const incomingUrl = params.get("url") || params.get("text") || "";
      if (
        params.get("share") === "1" ||
        incomingUrl.includes("instagram.com") ||
        incomingUrl.includes("facebook.com/ads")
      ) {
        const urlMatch = incomingUrl.match(/https?:\/\/\S+/);
        setSharedUrl(urlMatch ? urlMatch[0] : incomingUrl);
        setImportOpen(true);
        window.history.replaceState({}, "", "/");
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEYS.ads, JSON.stringify(ads));
      localStorage.setItem(STORAGE_KEYS.brands, JSON.stringify(brands));
      localStorage.setItem(STORAGE_KEYS.boards, JSON.stringify(boards));
    } catch {
      // ignore
    }
  }, [ads, brands, boards, hydrated]);

  const handleToggleFavorite = (adId: string) => {
    setAds((prev) =>
      prev.map((a) => (a.id === adId ? { ...a, is_favorite: !a.is_favorite } : a))
    );
  };

  const handleToggleBoard = (adId: string, boardId: string) => {
    setAds((prev) =>
      prev.map((a) => {
        if (a.id !== adId) return a;
        const exists = a.board_ids.includes(boardId);
        return {
          ...a,
          board_ids: exists
            ? a.board_ids.filter((id) => id !== boardId)
            : [...a.board_ids, boardId],
        };
      })
    );
  };

  const handleUpdateAd = (adId: string, patch: Partial<Ad>) => {
    setAds((prev) => prev.map((a) => (a.id === adId ? { ...a, ...patch } : a)));
  };

  const handleUpdateBrand = (brandId: string, patch: Partial<Brand>) => {
    setBrands((prev) => prev.map((b) => (b.id === brandId ? { ...b, ...patch } : b)));
  };

  const handleDeleteAd = (adId: string) => {
    setAds((prev) => prev.filter((a) => a.id !== adId));
  };

  const handleDeleteBrand = (brandId: string) => {
    setBrands((prev) => prev.filter((b) => b.id !== brandId));
    if (selectedShopId === brandId) setSelectedShopId(null);
  };

  const handleImportedAds = (newAds: Ad[]) => {
    setAds((prev) => [...newAds, ...prev]);
    setBrands((prev) => {
      const existingIds = new Set(prev.map((b) => b.id));
      const added: Brand[] = [];
      for (const ad of newAds) {
        if (!existingIds.has(ad.brand_id)) {
          existingIds.add(ad.brand_id);
          added.push({
            id: ad.brand_id,
            name: ad.brand_name,
            handle: ad.brand_handle,
            avatar_initials: ad.brand_avatar_initials,
            avatar_color: ad.brand_avatar_color,
            logo_url: ad.brand_logo_url,
            website_url: ad.landing_page_url || ad.source_url || "",
            meta_ad_library_url:
              ad.source_type === "meta_ad_library" ? ad.source_url : undefined,
            category: "Importeret",
            is_shopify: false,
            is_tracked: true,
            estimated_monthly_reach: ad.eu_reach,
            last_synced_at: new Date().toISOString(),
          });
        }
      }
      return added.length > 0 ? [...added, ...prev] : prev;
    });
    setView("ads");
    setSelectedBoardId(null);
    setSelectedShopId(null);
  };

  const parsedQuickLink = useMemo(() => parseAdLink(quickLink), [quickLink]);

  const handleQuickImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!parsedQuickLink.isValid) return;
    setQuickImporting(true);
    try {
      const res = await fetch("/api/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: parsedQuickLink.rawUrl,
          board_ids: selectedBoardId ? [selectedBoardId] : [],
        }),
      });
      const data = await res.json();
      if (res.ok && data.ok && data.ads?.length) {
        handleImportedAds(data.ads);
        setQuickLink("");
        setQuickToast("Annonce gemt i Adtrack!");
        setTimeout(() => setQuickToast(null), 2600);
      }
    } finally {
      setQuickImporting(false);
    }
  };

  const handleQuickClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text?.trim()) setQuickLink(text.trim());
    } catch {
      setImportOpen(true);
    }
  };

  const handleCreateBoard = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBoardName.trim()) return;
    const palette = ["#0027eb", "#16a34a", "#d97706", "#e11d48", "#0284c7"];
    const board: Board = {
      id: `board-${Date.now()}`,
      name: newBoardName.trim(),
      description: "Eget kurateret board",
      accent_color: palette[boards.length % palette.length],
      created_at: new Date().toISOString(),
    };
    setBoards((prev) => [...prev, board]);
    setNewBoardName("");
    setNewBoardOpen(false);
    setSelectedBoardId(board.id);
    setSelectedShopId(null);
    setView("ads");
  };

  const openShopAnalytics = (brandId: string) => {
    setSelectedShopId(brandId);
    setView("shops");
  };

  const visibleAds = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = ads.filter((ad) => {
      if (view === "favorites" && !ad.is_favorite) return false;
      if (selectedBoardId && !ad.board_ids.includes(selectedBoardId)) return false;
      if (sourceFilter !== "all" && ad.source_type !== sourceFilter) return false;
      if (mediaFilter !== "all" && ad.media_type !== mediaFilter) return false;
      if (winnersOnly && (!ad.is_active || getActiveDays(ad.started_running_at) < 30)) {
        return false;
      }
      if (q) {
        const haystack = [
          ad.brand_name,
          ad.brand_handle,
          ad.headline,
          ad.primary_text,
          ad.ai_hook_verbal,
          ad.ai_hook_visual,
          ad.ai_angle,
          ad.ai_format,
          ad.ai_transcript,
          ad.user_notes,
          ...ad.tags,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });

    return [...list].sort((a, b) => {
      if (sortBy === "longest") {
        return getActiveDays(b.started_running_at) - getActiveDays(a.started_running_at);
      }
      if (sortBy === "reach" || view === "brandtracker") {
        return (b.eu_reach || 0) - (a.eu_reach || 0);
      }
      if (sortBy === "spend") {
        return (b.estimated_spend || 0) - (a.estimated_spend || 0);
      }
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [ads, view, selectedBoardId, sourceFilter, mediaFilter, winnersOnly, search, sortBy]);

  const activeAd = useMemo(
    () => ads.find((a) => a.id === activeAdId) || null,
    [ads, activeAdId]
  );

  const selectedShop = useMemo(
    () => brands.find((b) => b.id === selectedShopId) || null,
    [brands, selectedShopId]
  );

  const activeBoard = boards.find((b) => b.id === selectedBoardId);
  const favoriteCount = ads.filter((a) => a.is_favorite).length;

  const pageTitle =
    view === "favorites"
      ? "Favorite Ads"
      : view === "brandtracker"
        ? "Brandtracker · Top EU Ads"
        : activeBoard
          ? activeBoard.name
          : "Ads";

  return (
    <div className="flex min-h-dvh w-full bg-[#08090B]">
      {/* ICONIC TRENDTRACK JET-BLACK LEFT SIDEBAR */}
      <aside className="sticky top-0 hidden h-dvh w-[236px] shrink-0 flex-col bg-[#08090B] px-3 py-4 text-[#F3F4F6] lg:flex">
        {/* Adtrack Logo */}
        <button
          type="button"
          onClick={() => {
            setView("ads");
            setSelectedBoardId(null);
            setSelectedShopId(null);
          }}
          className="mb-5 flex items-center gap-2.5 px-2 text-left"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/icons/logo.png"
            alt="Adtrack"
            className="h-8 w-8 rounded-lg shadow-md"
          />
          <span className="font-display text-lg font-extrabold tracking-tight text-white">
            Adtrack
          </span>
        </button>

        {/* Quick Import CTA in #0027eb */}
        <button
          id="desktop-new-ad-btn"
          type="button"
          onClick={() => {
            setSharedUrl("");
            setImportOpen(true);
          }}
          className="mb-5 flex w-full items-center justify-center gap-2 rounded-xl bg-[#0027eb] py-2.5 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-[#001fc2]"
        >
          <Plus className="h-4 w-4" />
          Importér Link / Ad
        </button>

        {/* Analyse Section */}
        <div className="space-y-1">
          <p className="px-2.5 pb-1 text-[10px] font-semibold uppercase tracking-wider text-[#667085]">
            Analyse
          </p>
          {[
            {
              id: "shops" as const,
              label: "Shops",
              icon: Store,
              count: brands.length,
              active: view === "shops",
              onClick: () => {
                setView("shops");
                setSelectedShopId(null);
                setSelectedBoardId(null);
              },
            },
            {
              id: "ads" as const,
              label: "Ads",
              icon: LayoutGrid,
              count: ads.length,
              active: view === "ads" && !selectedBoardId,
              onClick: () => {
                setView("ads");
                setSelectedBoardId(null);
                setSelectedShopId(null);
              },
            },
            {
              id: "brandtracker" as const,
              label: "Brandtracker",
              icon: Radar,
              count: null,
              active: view === "brandtracker",
              onClick: () => {
                setView("brandtracker");
                setSelectedBoardId(null);
                setSelectedShopId(null);
              },
            },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                onClick={item.onClick}
                className="flex w-full items-center justify-between rounded-xl px-2.5 py-2 text-[13px] font-medium transition-colors"
                style={
                  item.active
                    ? { backgroundColor: "#1B1E26", color: "#FFFFFF" }
                    : { color: "#98A2B3" }
                }
              >
                <span className="flex items-center gap-2.5">
                  <Icon className="h-4 w-4" />
                  {item.label}
                </span>
                {item.count !== null && (
                  <span className="font-mono-num text-[11px] text-[#667085]">
                    {item.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Favorites & Boards Section */}
        <div className="mt-6 flex-1 overflow-y-auto">
          <div className="mb-1 flex items-center justify-between px-2.5">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-[#667085]">
              Favorites &amp; Boards
            </span>
            <button
              type="button"
              onClick={() => setNewBoardOpen((v) => !v)}
              aria-label="Opret nyt board"
              className="rounded p-1 text-[#8A909E] hover:bg-white/10 hover:text-white"
            >
              <FolderPlus className="h-3.5 w-3.5" />
            </button>
          </div>

          <button
            type="button"
            onClick={() => {
              setView("favorites");
              setSelectedBoardId(null);
              setSelectedShopId(null);
            }}
            className="mb-1 flex w-full items-center justify-between rounded-xl px-2.5 py-2 text-[13px] font-medium transition-colors"
            style={
              view === "favorites"
                ? { backgroundColor: "#1B1E26", color: "#FFFFFF" }
                : { color: "#98A2B3" }
            }
          >
            <span className="flex items-center gap-2.5">
              <Heart className="h-4 w-4" />
              Saved Ads
            </span>
            <span className="font-mono-num text-[11px] text-[#667085]">
              {favoriteCount}
            </span>
          </button>

          {newBoardOpen && (
            <form onSubmit={handleCreateBoard} className="mb-2 px-1">
              <div className="flex gap-1.5">
                <input
                  type="text"
                  autoFocus
                  value={newBoardName}
                  onChange={(e) => setNewBoardName(e.target.value)}
                  placeholder="Navn på board..."
                  className="min-w-0 flex-1 rounded-lg border border-white/15 bg-[#15171C] px-2.5 py-1.5 text-xs text-white outline-none focus:border-[#0027eb]"
                />
                <button
                  type="submit"
                  className="rounded-lg bg-[#0027eb] px-2.5 py-1.5 text-xs font-semibold text-white"
                >
                  Gem
                </button>
              </div>
            </form>
          )}

          <div className="space-y-0.5">
            {boards.map((board) => {
              const count = ads.filter((a) => a.board_ids.includes(board.id)).length;
              const active = view === "ads" && selectedBoardId === board.id;
              return (
                <button
                  key={board.id}
                  type="button"
                  onClick={() => {
                    setView("ads");
                    setSelectedBoardId(board.id);
                    setSelectedShopId(null);
                  }}
                  className="flex w-full items-center justify-between rounded-xl px-2.5 py-1.5 text-left text-[12px] font-medium transition-colors"
                  style={
                    active
                      ? { backgroundColor: "#1B1E26", color: "#FFFFFF" }
                      : { color: "#98A2B3" }
                  }
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <Folder
                      className="h-3.5 w-3.5 shrink-0"
                      style={{ color: board.accent_color }}
                    />
                    <span className="truncate">{board.name}</span>
                  </span>
                  <span className="font-mono-num shrink-0 text-[11px] text-[#667085]">
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Sidebar Bottom: Connectors & InstaBox Status */}
        <div className="mt-4 border-t border-white/10 pt-3">
          <button
            type="button"
            onClick={() => {
              setView("connectors");
              setSelectedShopId(null);
            }}
            className="flex w-full items-center justify-between rounded-xl px-2.5 py-2 text-xs font-medium transition-colors"
            style={
              view === "connectors"
                ? { backgroundColor: "#1B1E26", color: "#FFFFFF" }
                : { color: "#98A2B3" }
            }
          >
            <span className="flex items-center gap-2">
              <Settings2 className="h-4 w-4" />
              Connectors &amp; PWA
            </span>
            <span
              className="h-2 w-2 rounded-full"
              style={{
                backgroundColor: connectorStatus.instabox ? "#16A34A" : "#F59E0B",
              }}
            />
          </button>
        </div>
      </aside>

      {/* RIGHT MAIN WORKSPACE (Crisp White Rounded TrendTrack Canvas) */}
      <div className="flex min-w-0 flex-1 flex-col lg:p-2.5 lg:pl-0">
        {/* MOBILE TOP BAR (Jet-black header with Adtrack logo) */}
        <header className="pt-safe sticky top-0 z-30 flex items-center justify-between bg-[#08090B] px-4 py-3 text-white lg:hidden">
          <button
            type="button"
            onClick={() => {
              setView("ads");
              setSelectedBoardId(null);
              setSelectedShopId(null);
            }}
            className="flex items-center gap-2"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icons/logo.png" alt="Adtrack" className="h-7 w-7 rounded-lg" />
            <span className="font-display text-base font-extrabold tracking-tight">
              Adtrack
            </span>
          </button>

          <div className="flex items-center gap-1.5">
            {(view === "ads" || view === "favorites" || view === "brandtracker") && (
              <button
                type="button"
                onClick={() => setMobileCols((c) => (c === 1 ? 2 : 1))}
                aria-label="Skift kolonne-visning"
                className="rounded-lg bg-white/10 p-2 text-white"
              >
                {mobileCols === 1 ? (
                  <Columns2 className="h-4 w-4" />
                ) : (
                  <Square className="h-4 w-4" />
                )}
              </button>
            )}
          </div>
        </header>

        {/* CRISP WHITE MAIN PANEL */}
        <main className="flex-1 bg-white px-3.5 py-5 pb-28 text-[#111318] sm:px-6 lg:rounded-2xl lg:px-7 lg:py-6 lg:pb-10">
          {view === "shops" && selectedShop && (
            <ShopAnalyticsView
              brand={selectedShop}
              ads={ads}
              boards={boards}
              onBack={() => setSelectedShopId(null)}
              onOpenAd={(ad) => setActiveAdId(ad.id)}
              onToggleFavorite={handleToggleFavorite}
              onToggleBoard={handleToggleBoard}
              onUpdateBrand={handleUpdateBrand}
            />
          )}

          {view === "shops" && !selectedShop && (
            <ShopsTableView
              brands={brands}
              ads={ads}
              onOpenShop={(brandId) => setSelectedShopId(brandId)}
              onOpenAd={(ad) => setActiveAdId(ad.id)}
              onAddBrand={(brand) =>
                setBrands((prev) => [brand, ...prev.filter((b) => b.id !== brand.id)])
              }
              onDeleteBrand={handleDeleteBrand}
            />
          )}

          {view === "connectors" && <ConnectorsView status={connectorStatus} />}

          {view === "boards" && (
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="font-display text-2xl font-bold tracking-tight text-[#111318]">
                    Boards &amp; Mapper
                  </h1>
                  <p className="mt-0.5 text-sm text-[#667085]">
                    Dine gemte samlinger til hooks, statics og konkurrenter.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setNewBoardOpen((v) => !v)}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-[#0027eb] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[#001fc2]"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Nyt board
                </button>
              </div>

              {newBoardOpen && (
                <form onSubmit={handleCreateBoard} className="flex gap-2">
                  <input
                    type="text"
                    autoFocus
                    value={newBoardName}
                    onChange={(e) => setNewBoardName(e.target.value)}
                    placeholder="Navn på nyt board..."
                    className="flex-1 rounded-xl border border-[#E2E5EB] bg-[#FAFBFD] px-3.5 py-2.5 text-sm outline-none focus:border-[#0027eb] focus:bg-white"
                  />
                  <button
                    type="submit"
                    className="rounded-xl bg-[#0027eb] px-4 py-2.5 text-sm font-semibold text-white"
                  >
                    Opret
                  </button>
                </form>
              )}

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {boards.map((board) => {
                  const boardAds = ads.filter((a) => a.board_ids.includes(board.id));
                  return (
                    <button
                      key={board.id}
                      type="button"
                      onClick={() => {
                        setSelectedBoardId(board.id);
                        setView("ads");
                      }}
                      className="flex flex-col gap-3 rounded-2xl border border-[#E6E8EC] bg-white p-4 text-left transition-all hover:border-[#0027eb]/40 hover:shadow-md"
                    >
                      <div className="grid h-28 grid-cols-3 gap-1.5 overflow-hidden rounded-xl">
                        {[0, 1, 2].map((i) => {
                          const thumbAd = boardAds[i];
                          return thumbAd ? (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img
                              key={thumbAd.id}
                              src={thumbAd.thumbnail_url || thumbAd.media_url}
                              alt={thumbAd.headline}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div key={i} className="h-full w-full bg-[#F3F4F6]" />
                          );
                        })}
                      </div>

                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span
                              className="h-2.5 w-2.5 rounded-full"
                              style={{ backgroundColor: board.accent_color }}
                            />
                            <h2 className="font-display text-sm font-bold text-[#111318]">
                              {board.name}
                            </h2>
                          </div>
                          <p className="mt-1 line-clamp-2 text-xs text-[#667085]">
                            {board.description}
                          </p>
                        </div>
                        <span className="rounded-md bg-[#F2F4F7] px-2 py-0.5 font-mono-num text-xs font-semibold text-[#344054]">
                          {boardAds.length}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {(view === "ads" || view === "favorites" || view === "brandtracker") && (
            <div className="space-y-5">
              {/* TRENDTRACK TOP HEADER: Title + Count + Centered Search */}
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div className="flex items-center gap-2.5">
                  {activeBoard && (
                    <span
                      className="h-3 w-3 rounded-full"
                      style={{ backgroundColor: activeBoard.accent_color }}
                    />
                  )}
                  <h1 className="font-display text-2xl font-bold tracking-tight text-[#111318]">
                    {pageTitle}
                  </h1>
                  <span className="rounded-md bg-[#F2F4F7] px-2 py-0.5 font-mono-num text-xs font-semibold text-[#475467]">
                    {visibleAds.length}
                  </span>
                  {selectedBoardId && (
                    <button
                      type="button"
                      onClick={() => setSelectedBoardId(null)}
                      className="inline-flex items-center gap-1 rounded-lg border border-[#E6E8EC] px-2 py-1 text-xs font-medium text-[#475467] hover:bg-[#F5F6F8]"
                    >
                      <X className="h-3 w-3" />
                      Alle ads
                    </button>
                  )}
                </div>

                {/* Centered TrendTrack Search Input */}
                <div className="relative flex-1 md:max-w-md">
                  <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#98A2B3]" />
                  <input
                    id="swipe-search-input"
                    type="search"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Søg i ads, hooks, transskription, brands..."
                    className="w-full rounded-xl border border-[#E6E8EC] bg-[#F8F9FB] py-2 pl-9 pr-4 text-sm text-[#111318] outline-none transition-colors focus:border-[#0027eb] focus:bg-white"
                  />
                </div>
              </div>

              {/* FOREPLAY INSTANT LINK-DROP BAR */}
              <form
                onSubmit={handleQuickImport}
                className="flex flex-wrap items-center gap-2 rounded-2xl border border-[#E2E5EB] bg-[#FAFBFD] p-1.5 transition-colors focus-within:border-[#0027eb] focus-within:bg-white sm:flex-nowrap"
              >
                <div className="flex min-w-0 flex-1 items-center gap-2.5 px-2.5">
                  <Link2 className="h-4 w-4 shrink-0 text-[#0027eb]" />
                  <input
                    id="quick-import-input"
                    type="url"
                    value={quickLink}
                    onChange={(e) => setQuickLink(e.target.value)}
                    placeholder="Indsæt Instagram Reel eller Meta Ad Library link for at gemme permanent..."
                    className="w-full bg-transparent py-1.5 text-sm text-[#111318] outline-none placeholder:text-[#98A2B3]"
                  />
                  {quickLink.trim() && parsedQuickLink.isValid && (
                    <span className="hidden shrink-0 rounded-full bg-[#EEF2FF] px-2.5 py-0.5 text-[11px] font-semibold text-[#0027eb] sm:inline-flex">
                      {parsedQuickLink.sourceType === "meta_ad_library"
                        ? "Meta Ad Library"
                        : parsedQuickLink.sourceType === "instagram"
                          ? "Instagram"
                          : "Link"}
                    </span>
                  )}
                </div>

                <div className="flex w-full items-center justify-end gap-1.5 sm:w-auto">
                  {!quickLink.trim() && (
                    <button
                      type="button"
                      onClick={handleQuickClipboard}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-[#E2E5EB] bg-white px-2.5 py-2 text-xs font-semibold text-[#344054] hover:border-[#0027eb] hover:text-[#0027eb]"
                    >
                      <ClipboardPaste className="h-3.5 w-3.5" />
                      Indsæt
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      setSharedUrl(quickLink);
                      setImportOpen(true);
                    }}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-[#E2E5EB] bg-white px-2.5 py-2 text-xs font-semibold text-[#344054] hover:bg-[#F5F6F8]"
                  >
                    <Upload className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Bulk / Fil</span>
                  </button>

                  <button
                    type="submit"
                    disabled={!parsedQuickLink.isValid || quickImporting}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-[#0027eb] px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#001fc2] disabled:opacity-40"
                  >
                    {quickImporting ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Plus className="h-3.5 w-3.5" />
                    )}
                    Gem Ad
                  </button>
                </div>
              </form>

              {quickToast && (
                <div className="inline-flex items-center gap-2 rounded-xl bg-[#ECFDF3] px-3 py-2 text-xs font-semibold text-[#15803D]">
                  <Check className="h-3.5 w-3.5" />
                  {quickToast}
                </div>
              )}

              {/* TRENDTRACK FILTER & SORT BAR */}
              <div className="flex flex-wrap items-center justify-between gap-2.5">
                <div className="no-scrollbar flex items-center gap-2 overflow-x-auto pb-0.5">
                  {[
                    { id: "all", label: "All Ads" },
                    { id: "meta_ad_library", label: "Meta Ad Library" },
                    { id: "instagram", label: "Instagram" },
                  ].map((pill) => {
                    const active = sourceFilter === pill.id;
                    return (
                      <button
                        key={pill.id}
                        type="button"
                        onClick={() =>
                          setSourceFilter(
                            pill.id as "all" | "meta_ad_library" | "instagram"
                          )
                        }
                        className="shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors"
                        style={
                          active
                            ? { backgroundColor: "#0027eb", color: "#FFFFFF" }
                            : { backgroundColor: "#F3F4F6", color: "#475467" }
                        }
                      >
                        {pill.label}
                      </button>
                    );
                  })}

                  <span className="h-4 w-px shrink-0 bg-[#E6E8EC]" />

                  {[
                    { id: "all", label: "Alle formater" },
                    { id: "video", label: "Video / Reels" },
                    { id: "image", label: "Static" },
                  ].map((pill) => {
                    const active = mediaFilter === pill.id;
                    return (
                      <button
                        key={pill.id}
                        type="button"
                        onClick={() =>
                          setMediaFilter(pill.id as "all" | "video" | "image")
                        }
                        className="shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors"
                        style={
                          active
                            ? {
                                backgroundColor: "#EEF2FF",
                                borderColor: "rgba(0,39,235,0.28)",
                                color: "#0027eb",
                              }
                            : {
                                backgroundColor: "#FFFFFF",
                                borderColor: "#E6E8EC",
                                color: "#475467",
                              }
                        }
                      >
                        {pill.label}
                      </button>
                    );
                  })}

                  <button
                    type="button"
                    onClick={() => setWinnersOnly((v) => !v)}
                    className="inline-flex shrink-0 items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors"
                    style={
                      winnersOnly
                        ? {
                            backgroundColor: "#ECFDF3",
                            borderColor: "#86EFAC",
                            color: "#15803D",
                          }
                        : {
                            backgroundColor: "#FFFFFF",
                            borderColor: "#E6E8EC",
                            color: "#475467",
                          }
                    }
                  >
                    <Flame className="h-3 w-3" />
                    30d+ Vindere
                  </button>
                </div>

                {/* Sort Select */}
                <div className="flex items-center gap-2 rounded-xl border border-[#E6E8EC] bg-white px-3 py-1.5">
                  <SlidersHorizontal className="h-3.5 w-3.5 text-[#667085]" />
                  <select
                    aria-label="Sortér annoncer"
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as SortOption)}
                    className="bg-transparent text-xs font-semibold text-[#111318] outline-none"
                  >
                    <option value="newest">Nyeste først</option>
                    <option value="reach">Højeste EU Reach</option>
                    <option value="spend">Højeste Est. Spend</option>
                    <option value="longest">Længst aktiv (Dage)</option>
                  </select>
                </div>
              </div>

              {/* TRUE MASONRY AD FEED (4 columns desktop, TrendTrack card design) */}
              {visibleAds.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[#D0D5DD] py-16 text-center">
                  <p className="font-display text-sm font-bold text-[#111318]">
                    Ingen annoncer matcher dine filtre
                  </p>
                  <p className="mt-1 text-xs text-[#667085]">
                    Prøv at nulstille søgningen, eller indsæt et nyt Instagram/Meta link ovenfor.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setSearch("");
                      setSourceFilter("all");
                      setMediaFilter("all");
                      setWinnersOnly(false);
                    }}
                    className="mt-4 rounded-xl bg-[#0027eb] px-4 py-2 text-xs font-semibold text-white"
                  >
                    Nulstil filtre
                  </button>
                </div>
              ) : (
                <div
                  className={
                    mobileCols === 2
                      ? "columns-2 gap-3 sm:columns-2 sm:gap-4 lg:columns-3 xl:columns-4"
                      : "columns-1 gap-4 sm:columns-2 lg:columns-3 xl:columns-4"
                  }
                >
                  {visibleAds.map((ad, idx) => (
                    <AdCard
                      key={ad.id}
                      ad={ad}
                      boards={boards}
                      rank={view === "brandtracker" ? idx + 1 : undefined}
                      compact={mobileCols === 2}
                      onOpen={(item) => setActiveAdId(item.id)}
                      onToggleFavorite={handleToggleFavorite}
                      onToggleBoard={handleToggleBoard}
                      onOpenBrand={openShopAnalytics}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </main>

        {/* MOBILE FIXED BOTTOM TAB BAR (Adtrack PWA) */}
        <nav
          aria-label="Mobil navigation"
          className="pb-safe fixed inset-x-0 bottom-0 z-40 border-t border-[#E6E8EC] bg-white/95 backdrop-blur-xl lg:hidden"
        >
          <div className="mx-auto grid max-w-md grid-cols-5 items-center px-2 pt-1.5">
            <button
              type="button"
              onClick={() => {
                setView("ads");
                setSelectedBoardId(null);
                setSelectedShopId(null);
              }}
              className="flex flex-col items-center gap-1 py-1.5 text-[10px] font-semibold"
              style={{
                color: view === "ads" && !selectedBoardId ? "#0027eb" : "#667085",
              }}
            >
              <LayoutGrid className="h-5 w-5" />
              Ads
            </button>

            <button
              type="button"
              onClick={() => {
                setView("shops");
                setSelectedShopId(null);
              }}
              className="flex flex-col items-center gap-1 py-1.5 text-[10px] font-semibold"
              style={{ color: view === "shops" ? "#0027eb" : "#667085" }}
            >
              <Store className="h-5 w-5" />
              Shops
            </button>

            <div className="flex justify-center">
              <button
                id="mobile-new-ad-btn"
                type="button"
                onClick={() => {
                  setSharedUrl("");
                  setImportOpen(true);
                }}
                aria-label="Gem ny annonce"
                className="-mt-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#0027eb] text-white shadow-lg transition-transform active:scale-95"
              >
                <Plus className="h-6 w-6" />
              </button>
            </div>

            <button
              type="button"
              onClick={() => setView("boards")}
              className="flex flex-col items-center gap-1 py-1.5 text-[10px] font-semibold"
              style={{
                color:
                  view === "boards" || Boolean(selectedBoardId) ? "#0027eb" : "#667085",
              }}
            >
              <Bookmark className="h-5 w-5" />
              Boards
            </button>

            <button
              type="button"
              onClick={() => setView("connectors")}
              className="flex flex-col items-center gap-1 py-1.5 text-[10px] font-semibold"
              style={{ color: view === "connectors" ? "#0027eb" : "#667085" }}
            >
              <Settings2 className="h-5 w-5" />
              Opsætning
            </button>
          </div>
        </nav>
      </div>

      {/* IMPORT MODAL */}
      <ImportModal
        key={sharedUrl || "default"}
        open={importOpen}
        initialUrl={sharedUrl}
        boards={boards}
        onClose={() => setImportOpen(false)}
        onImported={handleImportedAds}
      />

      {/* AD DETAIL MODAL / MOBILE SHEET */}
      <AdDetailSheet
        ad={activeAd}
        boards={boards}
        onClose={() => setActiveAdId(null)}
        onUpdateAd={handleUpdateAd}
        onDeleteAd={handleDeleteAd}
        onToggleBoard={handleToggleBoard}
        onOpenBrand={openShopAnalytics}
      />
    </div>
  );
}
