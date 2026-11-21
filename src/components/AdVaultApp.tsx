"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  Bookmark,
  Check,
  ClipboardPaste,
  Columns2,
  Flame,
  FolderPlus,
  Heart,
  LayoutGrid,
  Link2,
  Loader2,
  Moon,
  Plus,
  Search,
  Settings2,
  SlidersHorizontal,
  Square,
  Sun,
  TrendingUp,
  Upload,
  X,
} from "lucide-react";
import type { Ad, Board, Brand, ConnectorStatus } from "@/lib/types";
import { SEED_ADS, SEED_BOARDS, SEED_BRANDS } from "@/lib/seed-data";
import { getActiveDays, parseAdLink } from "@/lib/url-parser";
import { Badge } from "@/components/reui/badge";
import { Frame, FramePanel } from "@/components/reui/frame";
import { AdCard } from "./AdCard";
import { AdDetailSheet } from "./AdDetailSheet";
import { ImportModal } from "./ImportModal";
import { BrandTrackerView } from "./BrandTrackerView";
import { ConnectorsView } from "./ConnectorsView";

type ActiveView = "swipe" | "brands" | "favorites" | "boards" | "connectors";
type SortOption = "newest" | "longest" | "reach";

const STORAGE_KEYS = {
  ads: "advault_ads_v2",
  brands: "advault_brands_v2",
  boards: "advault_boards_v2",
  theme: "advault_theme_v2",
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

  const [view, setView] = useState<ActiveView>("swipe");
  const [selectedBoardId, setSelectedBoardId] = useState<string | null>(null);
  const [selectedBrandId, setSelectedBrandId] = useState<string | null>(null);
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [mobileCols, setMobileCols] = useState<1 | 2>(1);

  // Quick-paste Foreplay bar state
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

  const applyThemeClass = (next: "dark" | "light") => {
    document.documentElement.setAttribute("data-theme", next);
    document.documentElement.classList.toggle("dark", next === "dark");
  };

  // Hydrate from localStorage + live /api/status + PWA Service Worker + Share Target
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
        const savedTheme = localStorage.getItem(STORAGE_KEYS.theme);

        if (savedAds) setAds(JSON.parse(savedAds));
        if (savedBrands) setBrands(JSON.parse(savedBrands));
        if (savedBoards) setBoards(JSON.parse(savedBoards));
        if (savedTheme === "light" || savedTheme === "dark") {
          setTheme(savedTheme);
          applyThemeClass(savedTheme);
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

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEYS.ads, JSON.stringify(ads));
      localStorage.setItem(STORAGE_KEYS.brands, JSON.stringify(brands));
      localStorage.setItem(STORAGE_KEYS.boards, JSON.stringify(boards));
    } catch {
      // ignore quota errors
    }
  }, [ads, brands, boards, hydrated]);

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    applyThemeClass(next);
    try {
      localStorage.setItem(STORAGE_KEYS.theme, next);
    } catch {
      // ignore
    }
  };

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

  // Inline quick-paste import (Foreplay 1-click flow)
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
        setQuickToast("Annonce gemt i dit bibliotek!");
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
    const palette = ["#10B981", "#F59E0B", "#38BDF8", "#FB7185", "#14B8A6"];
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
    setView("swipe");
  };

  const handleSyncBrand = (brandId: string) => {
    setBrands((prev) =>
      prev.map((b) =>
        b.id === brandId ? { ...b, last_synced_at: new Date().toISOString() } : b
      )
    );
  };

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
      {/* DESKTOP SIDEBAR (ReUI / Foreplay Studio Shell) */}
      <aside
        className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r px-3.5 py-4 lg:flex"
        style={{
          backgroundColor: "var(--bg-surface)",
          borderColor: "var(--border-subtle)",
        }}
      >
        {/* Brand Header */}
        <div className="mb-4 flex items-center justify-between px-1.5">
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
              className="h-8 w-8 rounded-xl ring-1 ring-white/10"
            />
            <div>
              <p className="font-display text-sm font-bold leading-none tracking-tight">
                AdVault
              </p>
              <p className="mt-1 text-[11px]" style={{ color: "var(--text-muted)" }}>
                Foreplay · TrendTrack
              </p>
            </div>
          </button>

          <button
            type="button"
            onClick={toggleTheme}
            aria-label="Skift tema"
            className="rounded-lg border p-1.5 transition-colors hover:bg-muted"
            style={{
              borderColor: "var(--border-subtle)",
              color: "var(--text-secondary)",
            }}
          >
            {theme === "dark" ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
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
          className="mb-4 flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-semibold shadow-sm transition-opacity hover:opacity-90"
          style={{
            backgroundColor: "var(--btn-primary-bg)",
            color: "var(--btn-primary-fg)",
          }}
        >
          <Plus className="h-4 w-4" />
          Importér / Upload Ad
        </button>

        {/* Primary Nav */}
        <nav className="space-y-0.5">
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
              className="text-[10px] font-semibold uppercase tracking-wider"
              style={{ color: "var(--text-muted)" }}
            >
              Boards
            </span>
            <button
              type="button"
              onClick={() => setNewBoardOpen((v) => !v)}
              aria-label="Opret nyt board"
              className="rounded-md p-1 transition-colors hover:bg-muted"
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

        {/* Live Connector Status Strip */}
        <button
          type="button"
          onClick={() => setView("connectors")}
          className="mt-4 flex flex-col gap-1.5 rounded-xl border p-2.5 text-left transition-colors hover:bg-muted/60"
          style={{
            backgroundColor: "var(--bg-elevated)",
            borderColor: "var(--border-subtle)",
          }}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold">Systemstatus</span>
            <Badge
              size="xs"
              radius="full"
              variant={connectorStatus.instabox ? "success-light" : "warning-light"}
            >
              {connectorStatus.instabox ? "InstaBox Klar" : "Demo"}
            </Badge>
          </div>
          <div className="flex items-center gap-2 text-[10px]" style={{ color: "var(--text-muted)" }}>
            <span className="inline-flex items-center gap-1">
              <span
                className="h-1.5 w-1.5 rounded-full"
                style={{
                  backgroundColor: connectorStatus.supabase
                    ? "var(--accent-live)"
                    : "var(--accent-winner)",
                }}
              />
              {connectorStatus.supabase ? "Supabase" : "Lokal DB"}
            </span>
            <span>·</span>
            <span className="inline-flex items-center gap-1">
              <span
                className="h-1.5 w-1.5 rounded-full"
                style={{
                  backgroundColor: connectorStatus.instabox
                    ? "var(--accent-live)"
                    : "#6B7280",
                }}
              />
              InstaBox
            </span>
          </div>
        </button>
      </aside>

      {/* MAIN AREA */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* MOBILE TOP BAR */}
        <header
          className="pt-safe sticky top-0 z-30 flex items-center justify-between border-b px-4 py-2.5 backdrop-blur-xl lg:hidden"
          style={{
            backgroundColor:
              theme === "dark" ? "rgba(9, 10, 12, 0.86)" : "rgba(245, 244, 240, 0.9)",
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

          <div className="flex items-center gap-1.5">
            {(view === "swipe" || view === "favorites") && (
              <button
                type="button"
                onClick={() => setMobileCols((c) => (c === 1 ? 2 : 1))}
                aria-label="Skift mobil kolonne-visning"
                className="rounded-xl border p-2"
                style={{
                  borderColor: "var(--border-subtle)",
                  color: "var(--text-secondary)",
                }}
              >
                {mobileCols === 1 ? (
                  <Columns2 className="h-4 w-4" />
                ) : (
                  <Square className="h-4 w-4" />
                )}
              </button>
            )}
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
        <main className="mx-auto w-full max-w-[1440px] flex-1 px-3.5 py-5 pb-28 sm:px-6 lg:px-8 lg:py-6 lg:pb-12">
          {view === "brands" && (
            <BrandTrackerView
              brands={brands}
              ads={ads}
              onSelectBrand={(brandId) => {
                setSelectedBrandId(brandId);
                setSelectedBoardId(null);
                setView("swipe");
              }}
              onOpenAd={(ad) => setActiveAdId(ad.id)}
              onAddBrand={(brand) => setBrands((prev) => [brand, ...prev])}
              onSyncBrand={handleSyncBrand}
            />
          )}

          {view === "connectors" && <ConnectorsView status={connectorStatus} />}

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

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {boards.map((board) => {
                  const boardAds = ads.filter((a) => a.board_ids.includes(board.id));
                  return (
                    <Frame key={board.id} spacing="sm">
                      <FramePanel className="p-0">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedBoardId(board.id);
                            setSelectedBrandId(null);
                            setView("swipe");
                          }}
                          className="flex w-full flex-col gap-3 p-4 text-left"
                        >
                          {/* 3-thumb visual collage */}
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
                                <div
                                  key={i}
                                  className="h-full w-full"
                                  style={{ backgroundColor: "var(--bg-elevated)" }}
                                />
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
                                <h2 className="font-display text-sm font-semibold">
                                  {board.name}
                                </h2>
                              </div>
                              <p
                                className="mt-1 line-clamp-2 text-xs"
                                style={{ color: "var(--text-secondary)" }}
                              >
                                {board.description}
                              </p>
                            </div>
                            <Badge size="sm" variant="secondary" className="font-mono-num">
                              {boardAds.length}
                            </Badge>
                          </div>
                        </button>
                      </FramePanel>
                    </Frame>
                  );
                })}
              </div>
            </div>
          )}

          {(view === "swipe" || view === "favorites") && (
            <div className="space-y-5">
              {/* Top Title + Foreplay Quick-Paste Bar */}
              <div className="flex flex-col justify-between gap-3 md:flex-row md:items-end">
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
                    <Badge size="lg" variant="secondary" className="font-mono-num">
                      {visibleAds.length} ads
                    </Badge>
                  </div>
                  <p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>
                    {activeBoard
                      ? activeBoard.description
                      : activeBrand
                        ? `Gemte annoncer fra ${activeBrand.name} (${activeBrand.handle})`
                        : "Gem Instagram Reels & Meta Ad Library links permanent — søg på tværs af hooks, scripts og EU-reach."}
                  </p>
                </div>

                {(selectedBoardId || selectedBrandId) && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedBoardId(null);
                      setSelectedBrandId(null);
                    }}
                    className="inline-flex items-center gap-1.5 self-start rounded-xl border px-3 py-1.5 text-xs font-medium transition-colors hover:bg-muted"
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

              {/* FOREPLAY INSTANT LINK-DROP BAR (ReUI Concentric Frame) */}
              <Frame spacing="xs">
                <FramePanel className="!p-1.5">
                  <form
                    onSubmit={handleQuickImport}
                    className="flex flex-wrap items-center gap-2 sm:flex-nowrap"
                  >
                    <div className="flex min-w-0 flex-1 items-center gap-2.5 px-2.5">
                      <Link2
                        className="h-4 w-4 shrink-0"
                        style={{ color: "var(--text-muted)" }}
                      />
                      <input
                        id="quick-import-input"
                        type="url"
                        value={quickLink}
                        onChange={(e) => setQuickLink(e.target.value)}
                        placeholder="Indsæt Instagram- eller Meta Ad Library-link her..."
                        className="w-full bg-transparent py-2 text-sm outline-none placeholder:text-muted-foreground"
                      />
                      {quickLink.trim() && parsedQuickLink.isValid && (
                        <Badge
                          size="sm"
                          radius="full"
                          variant={
                            parsedQuickLink.sourceType === "meta_ad_library"
                              ? "info-light"
                              : parsedQuickLink.sourceType === "instagram"
                                ? "destructive-light"
                                : "secondary"
                          }
                          className="hidden shrink-0 sm:inline-flex"
                        >
                          {parsedQuickLink.sourceType === "meta_ad_library"
                            ? "Meta Ad Library"
                            : parsedQuickLink.sourceType === "instagram"
                              ? "Instagram"
                              : "Link"}
                        </Badge>
                      )}
                    </div>

                    <div className="flex w-full items-center justify-end gap-1.5 sm:w-auto">
                      {!quickLink.trim() && (
                        <button
                          type="button"
                          onClick={handleQuickClipboard}
                          className="inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-2 text-xs font-medium transition-colors hover:bg-muted"
                          style={{
                            borderColor: "var(--border-subtle)",
                            color: "var(--text-secondary)",
                          }}
                        >
                          <ClipboardPaste className="h-3.5 w-3.5" />
                          <span>Indsæt</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => {
                          setSharedUrl(quickLink);
                          setImportOpen(true);
                        }}
                        className="inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-2 text-xs font-medium transition-colors hover:bg-muted"
                        style={{
                          borderColor: "var(--border-subtle)",
                          color: "var(--text-secondary)",
                        }}
                      >
                        <Upload className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">Bulk / Fil</span>
                      </button>

                      <button
                        type="submit"
                        disabled={!parsedQuickLink.isValid || quickImporting}
                        className="inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-semibold transition-opacity disabled:opacity-40"
                        style={{
                          backgroundColor: "var(--btn-primary-bg)",
                          color: "var(--btn-primary-fg)",
                        }}
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
                </FramePanel>
              </Frame>

              {quickToast && (
                <div className="inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-medium" style={{ backgroundColor: "var(--accent-live-soft)", borderColor: "rgba(16, 185, 129, 0.28)", color: "var(--accent-live)" }}>
                  <Check className="h-3.5 w-3.5" />
                  {quickToast}
                </div>
              )}

              {/* Search + Filter Strip */}
              <div className="space-y-2.5">
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
                      placeholder="Søg i hooks, video-transskription, brand, copy eller tags..."
                      className="w-full rounded-xl border py-2.5 pl-10 pr-4 text-sm outline-none transition-colors focus:border-foreground/25"
                      style={{
                        backgroundColor: "var(--bg-surface)",
                        borderColor: "var(--border-subtle)",
                      }}
                    />
                  </div>

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

                {/* Filter Pills */}
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

              {/* TRUE FOREPLAY CSS MASONRY GALLERY */}
              {visibleAds.length === 0 ? (
                <Frame>
                  <FramePanel className="flex flex-col items-center justify-center py-16 text-center">
                    <p className="font-display text-sm font-semibold">
                      Ingen annoncer matcher dine filtre
                    </p>
                    <p className="mt-1 text-xs" style={{ color: "var(--text-muted)" }}>
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
                      className="mt-4 rounded-xl border px-4 py-2 text-xs font-semibold"
                      style={{ borderColor: "var(--border-strong)" }}
                    >
                      Nulstil filtre
                    </button>
                  </FramePanel>
                </Frame>
              ) : (
                <div
                  className={
                    mobileCols === 2
                      ? "columns-2 gap-3 sm:columns-2 sm:gap-4 lg:columns-3 xl:columns-4"
                      : "columns-1 gap-4 sm:columns-2 lg:columns-3 xl:columns-4"
                  }
                >
                  {visibleAds.map((ad) => (
                    <AdCard
                      key={ad.id}
                      ad={ad}
                      boards={boards}
                      compact={mobileCols === 2}
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
              theme === "dark" ? "rgba(18, 20, 25, 0.94)" : "rgba(255, 255, 255, 0.95)",
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
