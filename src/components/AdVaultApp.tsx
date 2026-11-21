"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  Bookmark,
  Flame,
  FolderPlus,
  Heart,
  LayoutGrid,
  Moon,
  Plus,
  Search,
  Settings2,
  SlidersHorizontal,
  Sun,
  TrendingUp,
  X,
} from "lucide-react";
import type { Ad, Board, Brand, ConnectorStatus } from "@/lib/types";
import { SEED_ADS, SEED_BOARDS, SEED_BRANDS } from "@/lib/seed-data";
import { getActiveDays } from "@/lib/url-parser";
import { AdCard } from "./AdCard";
import { AdDetailSheet } from "./AdDetailSheet";
import { ImportModal } from "./ImportModal";
import { BrandTrackerView } from "./BrandTrackerView";
import { ConnectorsView } from "./ConnectorsView";

type ActiveView = "swipe" | "brands" | "favorites" | "boards" | "connectors";
type SortOption = "newest" | "longest" | "reach";

const STORAGE_KEYS = {
  ads: "advault_ads_v1",
  brands: "advault_brands_v1",
  boards: "advault_boards_v1",
  theme: "advault_theme_v1",
};

interface AdVaultAppProps {
  initialStatus: ConnectorStatus;
}

export function AdVaultApp({ initialStatus }: AdVaultAppProps) {
  const [ads, setAds] = useState<Ad[]>(SEED_ADS);
  const [brands, setBrands] = useState<Brand[]>(SEED_BRANDS);
  const [boards, setBoards] = useState<Board[]>(SEED_BOARDS);
  const [hydrated, setHydrated] = useState(false);

  const [view, setView] = useState<ActiveView>("swipe");
  const [selectedBoardId, setSelectedBoardId] = useState<string | null>(null);
  const [selectedBrandId, setSelectedBrandId] = useState<string | null>(null);
  const [theme, setTheme] = useState<"dark" | "light">("dark");

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

  // Hydrate from localStorage + register PWA Service Worker + handle Share Target
  useEffect(() => {
    // Register Service Worker for PWA installability
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }

    let cancelled = false;
    Promise.resolve().then(() => {
      if (cancelled) return;
      try {
        const savedAds = localStorage.getItem(STORAGE_KEYS.ads);
        const savedBrands = localStorage.getItem(STORAGE_KEYS.brands);
        const savedBoards = localStorage.getItem(STORAGE_KEYS.boards);
        const savedTheme = localStorage.getItem(STORAGE_KEYS.theme);

        if (savedAds) setAds(JSON.parse(savedAds));
        if (savedBrands) setBrands(JSON.parse(savedBrands));
        if (savedBoards) setBoards(JSON.parse(savedBoards));
        if (savedTheme === "light" || savedTheme === "dark") {
          setTheme(savedTheme);
          document.documentElement.setAttribute("data-theme", savedTheme);
        }
      } catch {
        // fallback to seed data
      }
      setHydrated(true);

      // Handle Android Share Target / iOS Shortcut redirect (`/?share=1&url=...&text=...`)
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

  // Persist changes locally
  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEYS.ads, JSON.stringify(ads));
      localStorage.setItem(STORAGE_KEYS.brands, JSON.stringify(brands));
      localStorage.setItem(STORAGE_KEYS.boards, JSON.stringify(boards));
    } catch {
      // ignore storage quota errors
    }
  }, [ads, brands, boards, hydrated]);

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
    try {
      localStorage.setItem(STORAGE_KEYS.theme, next);
    } catch {
      // ignore
    }
  };

  // Ad mutations
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

  const handleDeleteAd = (adId: string) => {
    setAds((prev) => prev.filter((a) => a.id !== adId));
  };

  const handleImportedAds = (newAds: Ad[]) => {
    setAds((prev) => [...newAds, ...prev]);
    // Ensure any newly imported brand appears in Brand Tracker
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
            website_url: ad.landing_page_url || "https://example.com",
            meta_ad_library_url:
              ad.source_type === "meta_ad_library" ? ad.source_url : undefined,
            category: "Importeret",
            is_shopify: false,
            is_tracked: true,
            active_ads_count: 1,
            estimated_monthly_reach: ad.eu_reach || 0,
            last_synced_at: new Date().toISOString(),
          });
        }
      }
      return added.length > 0 ? [...added, ...prev] : prev;
    });
    setView("swipe");
    setSelectedBoardId(null);
    setSelectedBrandId(null);
  };

  const handleCreateBoard = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBoardName.trim()) return;
    const palette = ["#10B981", "#F59E0B", "#38BDF8", "#FB7185", "#14B8A6"];
    const board: Board = {
      id: `board-${Date.now()}`,
      name: newBoardName.trim(),
      description: "Eget board",
      accent_color: palette[boards.length % palette.length],
      created_at: new Date().toISOString(),
    };
    setBoards((prev) => [...prev, board]);
    setNewBoardName("");
    setNewBoardOpen(false);
    setSelectedBoardId(board.id);
    setView("swipe");
  };

  const handleSyncBrand = (brandId: string) => {
    setBrands((prev) =>
      prev.map((b) =>
        b.id === brandId ? { ...b, last_synced_at: new Date().toISOString() } : b
      )
    );
  };

  // Filtered & sorted ads
  const visibleAds = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = ads.filter((ad) => {
      if (view === "favorites" && !ad.is_favorite) return false;
      if (selectedBoardId && !ad.board_ids.includes(selectedBoardId)) return false;
      if (selectedBrandId && ad.brand_id !== selectedBrandId) return false;
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
      if (sortBy === "reach") {
        return (b.eu_reach || 0) - (a.eu_reach || 0);
      }
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [
    ads,
    view,
    selectedBoardId,
    selectedBrandId,
    sourceFilter,
    mediaFilter,
    winnersOnly,
    search,
    sortBy,
  ]);

  const activeAd = useMemo(
    () => ads.find((a) => a.id === activeAdId) || null,
    [ads, activeAdId]
  );

  const activeBoard = boards.find((b) => b.id === selectedBoardId);
  const activeBrand = brands.find((b) => b.id === selectedBrandId);
  const favoriteCount = ads.filter((a) => a.is_favorite).length;

  const pageTitle =
    view === "favorites"
      ? "Favoritter"
      : activeBoard
        ? activeBoard.name
        : activeBrand
          ? activeBrand.name
          : "Swipe File";

  return (
    <div
      className="flex min-h-dvh w-full"
      style={{ backgroundColor: "var(--bg-canvas)", color: "var(--text-primary)" }}
    >
      {/* DESKTOP SIDEBAR */}
      <aside
        className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r px-3.5 py-4 lg:flex"
        style={{
          backgroundColor: "var(--bg-surface)",
          borderColor: "var(--border-subtle)",
        }}
      >
        {/* Brand Logo */}
        <div className="mb-5 flex items-center justify-between px-1.5">
          <button
            type="button"
            onClick={() => {
              setView("swipe");
              setSelectedBoardId(null);
              setSelectedBrandId(null);
            }}
            className="flex items-center gap-2.5 text-left"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/icons/icon-192.png"
              alt="AdVault"
              className="h-8 w-8 rounded-xl shadow-sm"
            />
            <div>
              <p className="font-display text-sm font-bold leading-none tracking-tight">
                AdVault
              </p>
              <p className="mt-0.5 text-[11px]" style={{ color: "var(--text-muted)" }}>
                Swipe & Brand Tracker
              </p>
            </div>
          </button>
        </div>

        {/* Primary Import CTA */}
        <button
          id="desktop-new-ad-btn"
          type="button"
          onClick={() => {
            setSharedUrl("");
            setImportOpen(true);
          }}
          className="mb-5 flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold transition-opacity hover:opacity-90"
          style={{
            backgroundColor: "var(--btn-primary-bg)",
            color: "var(--btn-primary-fg)",
          }}
        >
          <Plus className="h-4 w-4" />
          Gem ny ad
        </button>

        {/* Primary Nav */}
        <nav className="space-y-1">
          {[
            {
              id: "swipe" as const,
              label: "Swipe File",
              icon: LayoutGrid,
              count: ads.length,
              active: view === "swipe" && !selectedBoardId && !selectedBrandId,
              onClick: () => {
                setView("swipe");
                setSelectedBoardId(null);
                setSelectedBrandId(null);
              },
            },
            {
              id: "brands" as const,
              label: "Brand Tracker",
              icon: TrendingUp,
              count: brands.length,
              active: view === "brands",
              onClick: () => {
                setView("brands");
                setSelectedBoardId(null);
              },
            },
            {
              id: "favorites" as const,
              label: "Favoritter",
              icon: Heart,
              count: favoriteCount,
              active: view === "favorites",
              onClick: () => {
                setView("favorites");
                setSelectedBoardId(null);
                setSelectedBrandId(null);
              },
            },
            {
              id: "connectors" as const,
              label: "Connectors & PWA",
              icon: Settings2,
              count: null,
              active: view === "connectors",
              onClick: () => {
                setView("connectors");
                setSelectedBoardId(null);
              },
            },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                onClick={item.onClick}
                className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-xs font-medium transition-colors"
                style={{
                  backgroundColor: item.active ? "var(--bg-elevated)" : "transparent",
                  color: item.active ? "var(--text-primary)" : "var(--text-secondary)",
                }}
              >
                <span className="flex items-center gap-2.5">
                  <Icon className="h-4 w-4" />
                  {item.label}
                </span>
                {item.count !== null && (
                  <span
                    className="font-mono-num text-[11px]"
                    style={{ color: "var(--text-muted)" }}
                  >
                    {item.count}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Boards Section */}
        <div className="mt-6 flex-1 overflow-y-auto">
          <div className="mb-2 flex items-center justify-between px-3">
            <span
              className="text-[11px] font-semibold uppercase tracking-wider"
              style={{ color: "var(--text-muted)" }}
            >
              Boards
            </span>
            <button
              type="button"
              onClick={() => setNewBoardOpen((v) => !v)}
              aria-label="Opret nyt board"
              className="rounded-md p-1 transition-colors hover:bg-white/5"
              style={{ color: "var(--text-muted)" }}
            >
              <FolderPlus className="h-3.5 w-3.5" />
            </button>
          </div>

          {newBoardOpen && (
            <form onSubmit={handleCreateBoard} className="mb-2 px-1">
              <div className="flex gap-1.5">
                <input
                  type="text"
                  autoFocus
                  value={newBoardName}
                  onChange={(e) => setNewBoardName(e.target.value)}
                  placeholder="Navn på board..."
                  className="min-w-0 flex-1 rounded-lg border px-2.5 py-1.5 text-xs outline-none"
                  style={{
                    backgroundColor: "var(--bg-elevated)",
                    borderColor: "var(--border-strong)",
                  }}
                />
                <button
                  type="submit"
                  className="rounded-lg px-2.5 py-1.5 text-xs font-semibold"
                  style={{
                    backgroundColor: "var(--btn-primary-bg)",
                    color: "var(--btn-primary-fg)",
                  }}
                >
                  Gem
                </button>
              </div>
            </form>
          )}

          <div className="space-y-0.5">
            {boards.map((board) => {
              const count = ads.filter((a) => a.board_ids.includes(board.id)).length;
              const active = view === "swipe" && selectedBoardId === board.id;
              return (
                <button
                  key={board.id}
                  type="button"
                  onClick={() => {
                    setView("swipe");
                    setSelectedBoardId(board.id);
                    setSelectedBrandId(null);
                  }}
                  className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-xs font-medium transition-colors"
                  style={{
                    backgroundColor: active ? "var(--bg-elevated)" : "transparent",
                    color: active ? "var(--text-primary)" : "var(--text-secondary)",
                  }}
                >
                  <span className="flex min-w-0 items-center gap-2.5">
                    <span
                      className="h-2 w-2 shrink-0 rounded-full"
                      style={{ backgroundColor: board.accent_color }}
                    />
                    <span className="truncate">{board.name}</span>
                  </span>
                  <span
                    className="font-mono-num shrink-0 text-[11px]"
                    style={{ color: "var(--text-muted)" }}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Sidebar Footer: Mode + Theme Toggle */}
        <div
          className="mt-4 flex items-center justify-between border-t pt-3"
          style={{ borderColor: "var(--border-subtle)" }}
        >
          <button
            type="button"
            onClick={() => setView("connectors")}
            className="inline-flex items-center gap-1.5 text-[11px] font-medium"
            style={{ color: "var(--text-muted)" }}
          >
            <span
              className="h-2 w-2 rounded-full"
              style={{
                backgroundColor:
                  initialStatus.mode === "live"
                    ? "var(--accent-live)"
                    : "var(--accent-winner)",
              }}
            />
            {initialStatus.mode === "live" ? "Supabase Live" : "Lokal Mode"}
          </button>

          <button
            type="button"
            onClick={toggleTheme}
            aria-label="Skift tema"
            className="rounded-lg border p-1.5 transition-colors hover:bg-white/5"
            style={{
              borderColor: "var(--border-subtle)",
              color: "var(--text-secondary)",
            }}
          >
            {theme === "dark" ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
          </button>
        </div>
      </aside>

      {/* MAIN AREA */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* MOBILE TOP BAR */}
        <header
          className="pt-safe sticky top-0 z-30 flex items-center justify-between border-b px-4 py-3 backdrop-blur-xl lg:hidden"
          style={{
            backgroundColor:
              theme === "dark" ? "rgba(10, 11, 13, 0.85)" : "rgba(245, 244, 240, 0.88)",
            borderColor: "var(--border-subtle)",
          }}
        >
          <div className="flex items-center gap-2.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icons/icon-192.png" alt="AdVault" className="h-7 w-7 rounded-lg" />
            <span className="font-display text-sm font-bold tracking-tight">
              AdVault
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggleTheme}
              aria-label="Skift tema"
              className="rounded-xl border p-2"
              style={{
                borderColor: "var(--border-subtle)",
                color: "var(--text-secondary)",
              }}
            >
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
          </div>
        </header>

        {/* MAIN CONTENT CONTAINER */}
        <main className="mx-auto w-full max-w-7xl flex-1 px-3.5 py-5 pb-28 sm:px-6 lg:px-8 lg:py-7 lg:pb-10">
          {view === "brands" && (
            <BrandTrackerView
              brands={brands}
              ads={ads}
              onSelectBrand={(brandId) => {
                setSelectedBrandId(brandId);
                setSelectedBoardId(null);
                setView("swipe");
              }}
              onAddBrand={(brand) => setBrands((prev) => [brand, ...prev])}
              onSyncBrand={handleSyncBrand}
            />
          )}

          {view === "connectors" && <ConnectorsView status={initialStatus} />}

          {view === "boards" && (
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="font-display text-2xl font-bold tracking-tight">
                    Boards
                  </h1>
                  <p className="mt-0.5 text-sm" style={{ color: "var(--text-secondary)" }}>
                    Dine kuraterede mapper til hooks, statics og kampagner.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setNewBoardOpen((v) => !v)}
                  className="inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold"
                  style={{
                    backgroundColor: "var(--btn-primary-bg)",
                    color: "var(--btn-primary-fg)",
                  }}
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
                    className="flex-1 rounded-xl border px-3.5 py-2.5 text-sm outline-none"
                    style={{
                      backgroundColor: "var(--bg-surface)",
                      borderColor: "var(--border-strong)",
                    }}
                  />
                  <button
                    type="submit"
                    className="rounded-xl px-4 py-2.5 text-sm font-semibold"
                    style={{
                      backgroundColor: "var(--btn-primary-bg)",
                      color: "var(--btn-primary-fg)",
                    }}
                  >
                    Opret
                  </button>
                </form>
              )}

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {boards.map((board) => {
                  const boardAds = ads.filter((a) => a.board_ids.includes(board.id));
                  return (
                    <button
                      key={board.id}
                      type="button"
                      onClick={() => {
                        setSelectedBoardId(board.id);
                        setSelectedBrandId(null);
                        setView("swipe");
                      }}
                      className="flex flex-col justify-between gap-3 rounded-2xl border p-4 text-left transition-colors hover:border-white/20"
                      style={{
                        backgroundColor: "var(--bg-surface)",
                        borderColor: "var(--border-subtle)",
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <span
                          className="h-3 w-3 rounded-full"
                          style={{ backgroundColor: board.accent_color }}
                        />
                        <span
                          className="font-mono-num text-xs"
                          style={{ color: "var(--text-muted)" }}
                        >
                          {boardAds.length} ads
                        </span>
                      </div>
                      <div>
                        <h2 className="font-display text-sm font-semibold">
                          {board.name}
                        </h2>
                        <p
                          className="mt-1 line-clamp-2 text-xs"
                          style={{ color: "var(--text-secondary)" }}
                        >
                          {board.description}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {(view === "swipe" || view === "favorites") && (
            <div className="space-y-5">
              {/* Top Heading & Active Context */}
              <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
                <div>
                  <div className="flex items-center gap-2.5">
                    {activeBoard && (
                      <span
                        className="h-3 w-3 rounded-full"
                        style={{ backgroundColor: activeBoard.accent_color }}
                      />
                    )}
                    <h1 className="font-display text-2xl font-bold tracking-tight">
                      {pageTitle}
                    </h1>
                    <span
                      className="font-mono-num rounded-lg px-2 py-0.5 text-xs font-medium"
                      style={{
                        backgroundColor: "var(--bg-elevated)",
                        color: "var(--text-secondary)",
                      }}
                    >
                      {visibleAds.length}
                    </span>
                  </div>
                  <p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>
                    {activeBoard
                      ? activeBoard.description
                      : activeBrand
                        ? `Alle gemte annoncer fra ${activeBrand.name} (${activeBrand.handle})`
                        : "Søg på tværs af hooks, video-transskriptioner, annoncetekster og vinder-signaler."}
                  </p>
                </div>

                {(selectedBoardId || selectedBrandId) && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedBoardId(null);
                      setSelectedBrandId(null);
                    }}
                    className="inline-flex items-center gap-1.5 self-start rounded-xl border px-3 py-1.5 text-xs font-medium transition-colors hover:bg-white/5"
                    style={{
                      borderColor: "var(--border-strong)",
                      color: "var(--text-secondary)",
                    }}
                  >
                    <X className="h-3.5 w-3.5" />
                    Vis alle ads
                  </button>
                )}
              </div>

              {/* Search + Filter Bar */}
              <div className="space-y-3">
                <div className="flex flex-col gap-2.5 sm:flex-row">
                  <div className="relative flex-1">
                    <Search
                      className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2"
                      style={{ color: "var(--text-muted)" }}
                    />
                    <input
                      id="swipe-search-input"
                      type="search"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Søg i hooks, transskription, brand, copy eller tags..."
                      className="w-full rounded-xl border py-2.5 pl-10 pr-4 text-sm outline-none transition-colors focus:border-white/25"
                      style={{
                        backgroundColor: "var(--bg-surface)",
                        borderColor: "var(--border-subtle)",
                      }}
                    />
                  </div>

                  {/* Sort selector */}
                  <div className="flex items-center gap-2">
                    <div
                      className="flex items-center gap-2 rounded-xl border px-3 py-2"
                      style={{
                        backgroundColor: "var(--bg-surface)",
                        borderColor: "var(--border-subtle)",
                      }}
                    >
                      <SlidersHorizontal
                        className="h-3.5 w-3.5 shrink-0"
                        style={{ color: "var(--text-muted)" }}
                      />
                      <select
                        aria-label="Sortér annoncer"
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value as SortOption)}
                        className="bg-transparent text-xs font-medium outline-none"
                        style={{ color: "var(--text-primary)" }}
                      >
                        <option value="newest">Nyeste først</option>
                        <option value="longest">Længst aktiv (Vindere)</option>
                        <option value="reach">Højeste EU Reach</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Horizontal Scrollable Filter Pills (Mobile Friendly) */}
                <div className="no-scrollbar flex items-center gap-2 overflow-x-auto pb-0.5">
                  {[
                    { id: "all", label: "Alle kilder" },
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
                        className="shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors"
                        style={{
                          backgroundColor: active
                            ? "var(--btn-primary-bg)"
                            : "var(--bg-surface)",
                          color: active
                            ? "var(--btn-primary-fg)"
                            : "var(--text-secondary)",
                          borderColor: active ? "transparent" : "var(--border-subtle)",
                        }}
                      >
                        {pill.label}
                      </button>
                    );
                  })}

                  <span
                    className="h-4 w-px shrink-0"
                    style={{ backgroundColor: "var(--border-subtle)" }}
                  />

                  {[
                    { id: "all", label: "Alle formater" },
                    { id: "video", label: "Video / UGC" },
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
                        className="shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors"
                        style={{
                          backgroundColor: active
                            ? "var(--btn-primary-bg)"
                            : "var(--bg-surface)",
                          color: active
                            ? "var(--btn-primary-fg)"
                            : "var(--text-secondary)",
                          borderColor: active ? "transparent" : "var(--border-subtle)",
                        }}
                      >
                        {pill.label}
                      </button>
                    );
                  })}

                  <button
                    type="button"
                    onClick={() => setWinnersOnly((v) => !v)}
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors"
                    style={{
                      backgroundColor: winnersOnly
                        ? "var(--accent-winner-soft)"
                        : "var(--bg-surface)",
                      color: winnersOnly
                        ? "var(--accent-winner)"
                        : "var(--text-secondary)",
                      borderColor: winnersOnly
                        ? "rgba(245, 158, 11, 0.35)"
                        : "var(--border-subtle)",
                    }}
                  >
                    <Flame className="h-3 w-3" />
                    Kun 30d+ vindere
                  </button>
                </div>
              </div>

              {/* Creative Grid */}
              {visibleAds.length === 0 ? (
                <div
                  className="flex flex-col items-center justify-center rounded-2xl border border-dashed py-16 text-center"
                  style={{ borderColor: "var(--border-strong)" }}
                >
                  <p className="font-display text-sm font-semibold">
                    Ingen annoncer matcher dine filtre
                  </p>
                  <p className="mt-1 text-xs" style={{ color: "var(--text-muted)" }}>
                    Prøv at nulstille søgningen, eller indsæt et nyt Instagram/Meta link.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setSearch("");
                      setSourceFilter("all");
                      setMediaFilter("all");
                      setWinnersOnly(false);
                    }}
                    className="mt-4 rounded-xl border px-4 py-2 text-xs font-semibold"
                    style={{ borderColor: "var(--border-strong)" }}
                  >
                    Nulstil filtre
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-4">
                  {visibleAds.map((ad) => (
                    <AdCard
                      key={ad.id}
                      ad={ad}
                      boards={boards}
                      onOpen={(item) => setActiveAdId(item.id)}
                      onToggleFavorite={handleToggleFavorite}
                      onToggleBoard={handleToggleBoard}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </main>

        {/* MOBILE FIXED BOTTOM TAB BAR (Thumb-friendly iOS/Android PWA nav) */}
        <nav
          aria-label="Mobil navigation"
          className="pb-safe fixed inset-x-0 bottom-0 z-40 border-t backdrop-blur-xl lg:hidden"
          style={{
            backgroundColor:
              theme === "dark" ? "rgba(17, 19, 23, 0.92)" : "rgba(255, 255, 255, 0.94)",
            borderColor: "var(--border-subtle)",
          }}
        >
          <div className="mx-auto grid max-w-md grid-cols-5 items-center px-2 pt-1.5">
            <button
              type="button"
              onClick={() => {
                setView("swipe");
                setSelectedBoardId(null);
                setSelectedBrandId(null);
              }}
              className="flex flex-col items-center gap-1 py-1.5 text-[10px] font-medium"
              style={{
                color:
                  view === "swipe" && !selectedBoardId
                    ? "var(--text-primary)"
                    : "var(--text-muted)",
              }}
            >
              <LayoutGrid className="h-5 w-5" />
              Swipe
            </button>

            <button
              type="button"
              onClick={() => setView("brands")}
              className="flex flex-col items-center gap-1 py-1.5 text-[10px] font-medium"
              style={{
                color: view === "brands" ? "var(--text-primary)" : "var(--text-muted)",
              }}
            >
              <TrendingUp className="h-5 w-5" />
              Brands
            </button>

            {/* Center Quick Import Button */}
            <div className="flex justify-center">
              <button
                id="mobile-new-ad-btn"
                type="button"
                onClick={() => {
                  setSharedUrl("");
                  setImportOpen(true);
                }}
                aria-label="Gem ny annonce"
                className="-mt-4 flex h-12 w-12 items-center justify-center rounded-2xl shadow-lg transition-transform active:scale-95"
                style={{
                  backgroundColor: "var(--btn-primary-bg)",
                  color: "var(--btn-primary-fg)",
                }}
              >
                <Plus className="h-6 w-6" />
              </button>
            </div>

            <button
              type="button"
              onClick={() => setView("boards")}
              className="flex flex-col items-center gap-1 py-1.5 text-[10px] font-medium"
              style={{
                color:
                  view === "boards" || Boolean(selectedBoardId)
                    ? "var(--text-primary)"
                    : "var(--text-muted)",
              }}
            >
              <Bookmark className="h-5 w-5" />
              Boards
            </button>

            <button
              type="button"
              onClick={() => setView("connectors")}
              className="flex flex-col items-center gap-1 py-1.5 text-[10px] font-medium"
              style={{
                color: view === "connectors" ? "var(--text-primary)" : "var(--text-muted)",
              }}
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

      {/* AD DETAIL DRAWER / MOBILE SHEET */}
      <AdDetailSheet
        ad={activeAd}
        boards={boards}
        onClose={() => setActiveAdId(null)}
        onUpdateAd={handleUpdateAd}
        onDeleteAd={handleDeleteAd}
        onToggleBoard={handleToggleBoard}
      />
    </div>
  );
}
