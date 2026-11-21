"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  Building2,
  Calendar,
  Check,
  ChevronRight,
  ClipboardPaste,
  Clock,
  Columns2,
  Compass,
  FolderKanban,
  LayoutGrid,
  Link2,
  Loader2,
  Plus,
  Radar,
  Search,
  Settings2,
  SlidersHorizontal,
  Smartphone,
  Square,
  Upload,
  X,
} from "lucide-react";
import type { Ad, Board, Brand, ConnectorStatus } from "@/lib/types";
import { SEED_ADS, SEED_BOARDS, SEED_BRANDS } from "@/lib/seed-data";
import { getActiveDays, parseAdLink } from "@/lib/url-parser";
import { AdCard } from "./AdCard";
import { AdDetailSheet } from "./AdDetailSheet";
import { ImportModal } from "./ImportModal";
import { TemplatesGridView } from "./TemplatesGridView";
import { CollectionsView } from "./CollectionsView";
import { ShopsTableView } from "./ShopsTableView";
import { ShopAnalyticsView } from "./ShopAnalyticsView";
import { ConnectorsView } from "./ConnectorsView";

type ActiveView = "explore" | "templates" | "scout" | "collections" | "connectors";
type SortOption = "newest" | "longest" | "reach";

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

  const [view, setView] = useState<ActiveView>("explore");
  const [selectedBoardId, setSelectedBoardId] = useState<string | null>(null);
  const [selectedShopId, setSelectedShopId] = useState<string | null>(null);
  const [mobileCols, setMobileCols] = useState<1 | 2>(1);
  const [showFiltersRow, setShowFiltersRow] = useState(false);

  // Quick-paste & 1-click Scout state
  const [quickLink, setQuickLink] = useState("");
  const [quickImporting, setQuickImporting] = useState(false);
  const [quickScouting, setQuickScouting] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  // Search & filters
  const [search, setSearch] = useState("");
  const [sourceFilter, setSourceFilter] = useState<"all" | "meta_ad_library" | "instagram">("all");
  const [mediaFilter, setMediaFilter] = useState<"all" | "video" | "image">("all");
  const [brandFilter, setBrandFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<SortOption>("newest");

  // Modals / Sheets
  const [activeAdId, setActiveAdId] = useState<string | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [sharedUrl, setSharedUrl] = useState("");

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

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
        // fallback
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

  const handleAddBrandWithAds = (brand: Brand, discoveredAds: Ad[] = []) => {
    setBrands((prev) => [brand, ...prev.filter((b) => b.id !== brand.id)]);
    if (discoveredAds.length > 0) {
      setAds((prev) => {
        const existingIds = new Set(prev.map((a) => a.id));
        const fresh = discoveredAds.filter((a) => !existingIds.has(a.id));
        return [...fresh, ...prev];
      });
      showToast(`${brand.name} fundet + ${discoveredAds.length} live Meta-ads importeret!`);
    } else {
      showToast(`${brand.name} tilføjet til Scout!`);
    }
  };

  const handleQuickScout = async (domainOrBrand: string) => {
    setQuickScouting(true);
    try {
      const res = await fetch("/api/brand-lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: domainOrBrand }),
      });
      const data = await res.json();
      if (res.ok && data.ok && data.brand) {
        handleAddBrandWithAds(data.brand, Array.isArray(data.ads) ? data.ads : []);
      } else {
        showToast(data.error || "Kunne ikke hente brand.");
      }
    } catch {
      showToast("Netværksfejl under brand-scouting.");
    } finally {
      setQuickScouting(false);
    }
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
    setView("explore");
    setSelectedBoardId(null);
    setSelectedShopId(null);
    showToast(`${newAds.length} annonce${newAds.length > 1 ? "r" : ""} gemt i Adtrack!`);
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

  const handleCreateBoard = (name: string) => {
    const palette = ["#0027eb", "#16a34a", "#d97706", "#e11d48", "#0284c7"];
    const board: Board = {
      id: `board-${Date.now()}`,
      name,
      description: "Personlig kollektion",
      accent_color: palette[boards.length % palette.length],
      created_at: new Date().toISOString(),
    };
    setBoards((prev) => [...prev, board]);
    showToast(`Collection "${name}" oprettet`);
  };

  const handleDeleteBoard = (boardId: string) => {
    setBoards((prev) => prev.filter((b) => b.id !== boardId));
    setAds((prev) =>
      prev.map((a) => ({
        ...a,
        board_ids: a.board_ids.filter((id) => id !== boardId),
      }))
    );
    if (selectedBoardId === boardId) setSelectedBoardId(null);
  };

  const openShopAnalytics = (brandId: string) => {
    const exists = brands.some((b) => b.id === brandId);
    if (!exists) return;
    setSelectedShopId(brandId);
    setView("scout");
  };

  const visibleAds = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = ads.filter((ad) => {
      if (selectedBoardId && !ad.board_ids.includes(selectedBoardId)) return false;
      if (brandFilter !== "all" && ad.brand_id !== brandFilter) return false;
      if (sourceFilter !== "all" && ad.source_type !== sourceFilter) return false;
      if (mediaFilter !== "all" && ad.media_type !== mediaFilter) return false;
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
  }, [ads, selectedBoardId, brandFilter, sourceFilter, mediaFilter, search, sortBy]);

  const activeAd = useMemo(
    () => ads.find((a) => a.id === activeAdId) || null,
    [ads, activeAdId]
  );

  const selectedShop = useMemo(
    () => brands.find((b) => b.id === selectedShopId) || null,
    [brands, selectedShopId]
  );

  const activeBoard = boards.find((b) => b.id === selectedBoardId);

  return (
    <div className="flex min-h-dvh w-full bg-[#05060A]">
      {/* KONVERT-INSPIRED OBSIDIAN SIDEBAR WITH ADTRACK #0027eb COBALT AMBIENT GLOW */}
      <aside className="adtrack-sidebar sticky top-0 hidden h-dvh w-[238px] shrink-0 flex-col px-3.5 py-5 text-white lg:flex">
        {/* Adtrack Wordmark + Blue Icon */}
        <button
          type="button"
          onClick={() => {
            setView("explore");
            setSelectedBoardId(null);
            setSelectedShopId(null);
          }}
          className="mb-6 flex items-center gap-2.5 px-2 text-left"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/icons/logo.png"
            alt="Adtrack"
            className="h-7 w-7 rounded-[8px] shadow-[0_4px_14px_rgba(0,39,235,0.45)]"
          />
          <span className="font-display text-[17px] font-extrabold tracking-[-0.03em] text-white">
            Adtrack
          </span>
        </button>

        {/* Primary Nav (Clean Konvert Pill Rows) */}
        <nav className="space-y-1">
          <button
            type="button"
            onClick={() => {
              setView("explore");
              setSelectedBoardId(null);
              setSelectedShopId(null);
            }}
            className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-[13px] font-medium transition-colors"
            style={
              view === "explore" && !selectedBoardId
                ? { backgroundColor: "rgba(255,255,255,0.11)", color: "#FFFFFF" }
                : { color: "rgba(255,255,255,0.62)" }
            }
          >
            <span className="flex items-center gap-2.5">
              <Compass className="h-[17px] w-[17px]" />
              Explore
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              setView("templates");
              setSelectedBoardId(null);
              setSelectedShopId(null);
            }}
            className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-[13px] font-medium transition-colors"
            style={
              view === "templates"
                ? { backgroundColor: "rgba(255,255,255,0.11)", color: "#FFFFFF" }
                : { color: "rgba(255,255,255,0.62)" }
            }
          >
            <span className="flex items-center gap-2.5">
              <LayoutGrid className="h-[17px] w-[17px]" />
              Templates
            </span>
            <span className="rounded-full bg-white/[0.1] px-2 py-0.5 font-mono-num text-[10px] font-semibold text-white/75">
              {ads.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              setView("scout");
              setSelectedBoardId(null);
              setSelectedShopId(null);
            }}
            className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-[13px] font-medium transition-colors"
            style={
              view === "scout"
                ? { backgroundColor: "rgba(255,255,255,0.11)", color: "#FFFFFF" }
                : { color: "rgba(255,255,255,0.62)" }
            }
          >
            <span className="flex items-center gap-2.5">
              <Radar className="h-[17px] w-[17px]" />
              Scout
            </span>
            <span className="rounded-full bg-[#0027eb] px-2 py-0.5 text-[10px] font-semibold text-white shadow-[0_2px_10px_rgba(0,39,235,0.5)]">
              Live
            </span>
          </button>
        </nav>

        {/* My Workspace Section */}
        <div className="mt-7 space-y-1">
          <p className="px-3 pb-1 text-[11px] font-medium text-white/40">
            My Workspace
          </p>

          <button
            type="button"
            onClick={() => {
              setView("collections");
              setSelectedBoardId(null);
              setSelectedShopId(null);
            }}
            className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-[13px] font-medium transition-colors"
            style={
              view === "collections" || Boolean(selectedBoardId)
                ? { backgroundColor: "rgba(255,255,255,0.11)", color: "#FFFFFF" }
                : { color: "rgba(255,255,255,0.68)" }
            }
          >
            <span className="flex items-center gap-2.5">
              <FolderKanban className="h-[17px] w-[17px]" />
              My Collections
            </span>
            <ChevronRight className="h-3.5 w-3.5 text-white/40" />
          </button>

          {/* Compact quick-links to collections */}
          <div className="space-y-0.5 pl-4 pt-1">
            {boards.slice(0, 5).map((board) => {
              const count = ads.filter((a) => a.board_ids.includes(board.id)).length;
              const active = view === "explore" && selectedBoardId === board.id;
              return (
                <button
                  key={board.id}
                  type="button"
                  onClick={() => {
                    setSelectedBoardId(board.id);
                    setView("explore");
                  }}
                  className="flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-left text-[12px] transition-colors"
                  style={
                    active
                      ? { backgroundColor: "rgba(255,255,255,0.1)", color: "#FFFFFF" }
                      : { color: "rgba(255,255,255,0.48)" }
                  }
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <span
                      className="h-1.5 w-1.5 shrink-0 rounded-full"
                      style={{ backgroundColor: board.accent_color }}
                    />
                    <span className="truncate">{board.name}</span>
                  </span>
                  <span className="font-mono-num text-[10px] text-white/35">
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Bottom Utility Links over Cobalt #0027eb Ambient Glow */}
        <div className="mt-auto space-y-1 border-t border-white/[0.08] pt-4">
          <button
            id="desktop-new-ad-btn"
            type="button"
            onClick={() => {
              setSharedUrl("");
              setImportOpen(true);
            }}
            className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-[12.5px] font-medium text-white/80 transition-colors hover:bg-white/[0.08] hover:text-white"
          >
            <span className="flex items-center gap-2.5">
              <Plus className="h-4 w-4 text-[#6B8BFF]" />
              Importér Link / Fil
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              setView("connectors");
              setSelectedShopId(null);
            }}
            className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-[12.5px] font-medium transition-colors hover:bg-white/[0.08]"
            style={
              view === "connectors"
                ? { backgroundColor: "rgba(255,255,255,0.11)", color: "#FFFFFF" }
                : { color: "rgba(255,255,255,0.72)" }
            }
          >
            <span className="flex items-center gap-2.5">
              <Smartphone className="h-4 w-4" />
              Mobil PWA &amp; API
            </span>
            <span className="rounded-full bg-[#0027eb] px-1.5 py-0.5 text-[9px] font-bold text-white">
              PWA
            </span>
          </button>

          {/* Bottom Personal Workspace Identity Pill */}
          <button
            type="button"
            onClick={() => setView("connectors")}
            className="mt-2 flex w-full items-center gap-2.5 rounded-xl px-2 py-2 text-left transition-colors hover:bg-white/[0.06]"
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#0027eb] font-display text-xs font-bold text-white shadow-[0_2px_10px_rgba(0,39,235,0.55)]">
              A
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[12.5px] font-semibold leading-tight text-white">
                Adtrack Personal
              </p>
              <p className="mt-0.5 truncate text-[11px] text-white/50">
                {connectorStatus.scrapeCreators ? "ScrapeCreators Live" : "Klar til API"}
              </p>
            </div>
          </button>
        </div>
      </aside>

      {/* FLOATING CRISP WHITE MAIN CANVAS */}
      <div className="flex min-w-0 flex-1 flex-col lg:p-2.5 lg:pl-0">
        {/* MOBILE TOP BAR */}
        <header className="pt-safe sticky top-0 z-30 flex items-center justify-between bg-[#05060A] px-4 py-3 text-white lg:hidden">
          <button
            type="button"
            onClick={() => {
              setView("explore");
              setSelectedBoardId(null);
              setSelectedShopId(null);
            }}
            className="flex items-center gap-2"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icons/logo.png" alt="Adtrack" className="h-7 w-7 rounded-lg" />
            <span className="font-display text-base font-extrabold tracking-[-0.03em]">
              Adtrack
            </span>
          </button>

          <div className="flex items-center gap-1.5">
            {view === "explore" && (
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
            <button
              type="button"
              onClick={() => setView("connectors")}
              aria-label="Connectors og PWA"
              className="rounded-lg bg-white/10 p-2 text-white"
            >
              <Settings2 className="h-4 w-4" />
            </button>
          </div>
        </header>

        {/* WHITE WORKSPACE CARD */}
        <main className="flex-1 bg-white px-4 py-5 pb-28 text-[#101828] sm:px-6 lg:rounded-[20px] lg:px-7 lg:py-6 lg:pb-12">
          {/* Global Live Toast */}
          {toast && (
            <div className="mb-4 inline-flex items-center gap-2 rounded-xl border border-[#0027eb]/20 bg-[#EEF2FF] px-3.5 py-2 text-xs font-semibold text-[#0027eb]">
              <Check className="h-3.5 w-3.5" />
              {toast}
            </div>
          )}

          {/* VIEW 1: SCOUT (Brandtracker & Shop Analytics) */}
          {view === "scout" && selectedShop && (
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

          {view === "scout" && !selectedShop && (
            <ShopsTableView
              brands={brands}
              ads={ads}
              onOpenShop={(brandId) => setSelectedShopId(brandId)}
              onOpenAd={(ad) => setActiveAdId(ad.id)}
              onAddBrand={handleAddBrandWithAds}
              onDeleteBrand={handleDeleteBrand}
            />
          )}

          {/* VIEW 2: TEMPLATES (Konvert Visual Creative Wall) */}
          {view === "templates" && (
            <TemplatesGridView
              ads={ads}
              onOpenAd={(ad) => setActiveAdId(ad.id)}
              onToggleFavorite={handleToggleFavorite}
              onOpenImport={() => {
                setSharedUrl("");
                setImportOpen(true);
              }}
              onQuickScout={handleQuickScout}
              scouting={quickScouting}
            />
          )}

          {/* VIEW 3: COLLECTIONS (Konvert 3-Photo Asymmetric Bento Grid) */}
          {view === "collections" && (
            <CollectionsView
              boards={boards}
              ads={ads}
              onSelectBoard={(boardId) => {
                setSelectedBoardId(boardId);
                setView("explore");
              }}
              onCreateBoard={handleCreateBoard}
              onDeleteBoard={handleDeleteBoard}
            />
          )}

          {/* VIEW 4: CONNECTORS & PWA */}
          {view === "connectors" && <ConnectorsView status={connectorStatus} />}

          {/* VIEW 5: EXPLORE (Konvert Signature Ads Feed) */}
          {view === "explore" && (
            <div className="space-y-5">
              {/* KONVERT EXPLORE HEADER */}
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="adtrack-icon-badge flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white">
                    <Compass className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h1 className="font-display text-[17px] font-bold leading-tight text-[#101828]">
                        {activeBoard ? activeBoard.name : "Explore"}
                      </h1>
                      {activeBoard && (
                        <button
                          type="button"
                          onClick={() => setSelectedBoardId(null)}
                          className="inline-flex items-center gap-1 rounded-full bg-[#F4F5F7] px-2 py-0.5 text-[11px] font-medium text-[#475467] hover:bg-[#EAECF0]"
                        >
                          <X className="h-3 w-3" />
                          Alle ads
                        </button>
                      )}
                    </div>
                    <p className="mt-0.5 text-[12.5px] text-[#667085]">
                      {activeBoard
                        ? activeBoard.description
                        : "Gennemse dine gemte Instagram & Meta ads — søg i hooks, scripts og koncepter"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setView("scout")}
                    className="hidden items-center gap-1.5 rounded-xl border border-[#EAECF0] bg-white px-3.5 py-2 text-xs font-semibold text-[#344054] transition-colors hover:border-[#0027eb] hover:text-[#0027eb] sm:inline-flex"
                  >
                    <Radar className="h-3.5 w-3.5" />
                    Scout Brand
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSharedUrl("");
                      setImportOpen(true);
                    }}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-[#101828] px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#0027eb]"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Importér Ad
                  </button>
                </div>
              </div>

              {/* KONVERT CLEAN FILTER TOOLBAR: Left Search · Right Minimal Inline Controls */}
              <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
                <div className="relative w-full md:max-w-[340px]">
                  <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#98A2B3]" />
                  <input
                    id="swipe-search-input"
                    type="search"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search brands or keywords"
                    className="w-full rounded-xl border border-[#EAECF0] bg-white py-2 pl-9 pr-4 text-[13px] text-[#101828] shadow-[0_1px_2px_rgba(16,24,40,0.03)] outline-none transition-colors placeholder:text-[#98A2B3] focus:border-[#0027eb]"
                  />
                </div>

                {/* Right Konvert-style lightweight filter items */}
                <div className="no-scrollbar flex items-center gap-2 overflow-x-auto text-[12.5px] font-medium text-[#475467]">
                  <div className="inline-flex shrink-0 items-center gap-1.5 rounded-lg px-2 py-1.5 hover:bg-[#F4F5F7]">
                    <Clock className="h-3.5 w-3.5 text-[#667085]" />
                    <select
                      aria-label="Sortér"
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as SortOption)}
                      className="cursor-pointer bg-transparent text-[12.5px] font-medium text-[#344054] outline-none"
                    >
                      <option value="newest">Newest</option>
                      <option value="longest">Longest live</option>
                      <option value="reach">Highest reach</option>
                    </select>
                  </div>

                  <div className="inline-flex shrink-0 items-center gap-1.5 rounded-lg px-2 py-1.5 hover:bg-[#F4F5F7]">
                    <Building2 className="h-3.5 w-3.5 text-[#667085]" />
                    <select
                      aria-label="Vælg brand"
                      value={brandFilter}
                      onChange={(e) => setBrandFilter(e.target.value)}
                      className="cursor-pointer bg-transparent text-[12.5px] font-medium text-[#344054] outline-none"
                    >
                      <option value="all">{brands.length} Brands</option>
                      {brands.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      setMediaFilter((m) =>
                        m === "all" ? "video" : m === "video" ? "image" : "all"
                      )
                    }
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 transition-colors hover:bg-[#F4F5F7]"
                    style={
                      mediaFilter !== "all"
                        ? { backgroundColor: "#EEF2FF", color: "#0027eb" }
                        : undefined
                    }
                  >
                    <Calendar className="h-3.5 w-3.5" />
                    {mediaFilter === "all"
                      ? "All formats"
                      : mediaFilter === "video"
                        ? "Videos"
                        : "Statics"}
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowFiltersRow((v) => !v)}
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 transition-colors hover:bg-[#F4F5F7]"
                    style={
                      showFiltersRow || sourceFilter !== "all"
                        ? { backgroundColor: "#EEF2FF", color: "#0027eb" }
                        : undefined
                    }
                  >
                    <SlidersHorizontal className="h-3.5 w-3.5" />
                    Filters
                  </button>
                </div>
              </div>

              {/* Optional expandable source filter strip */}
              {showFiltersRow && (
                <div className="animate-sheet-up flex flex-wrap items-center gap-2 rounded-xl border border-[#EAECF0] bg-[#FAFBFD] px-3 py-2">
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
                        className="rounded-full px-3 py-1 text-xs font-semibold transition-colors"
                        style={
                          active
                            ? { backgroundColor: "#0027eb", color: "#FFFFFF" }
                            : { backgroundColor: "#FFFFFF", color: "#475467", border: "1px solid #EAECF0" }
                        }
                      >
                        {pill.label}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* SUBTLE 1-CLICK LINK-DROP BAR (Instagram / Meta Ad Library) */}
              <form
                onSubmit={handleQuickImport}
                className="flex flex-wrap items-center gap-2 rounded-2xl border border-[#EAECF0] bg-[#FAFBFD] p-1.5 transition-colors focus-within:border-[#0027eb] focus-within:bg-white sm:flex-nowrap"
              >
                <div className="flex min-w-0 flex-1 items-center gap-2.5 px-2.5">
                  <Link2 className="h-4 w-4 shrink-0 text-[#0027eb]" />
                  <input
                    id="quick-import-input"
                    type="url"
                    value={quickLink}
                    onChange={(e) => setQuickLink(e.target.value)}
                    placeholder="Indsæt Instagram Reel eller Meta Ad Library link for at gemme..."
                    className="w-full bg-transparent py-1.5 text-[13px] text-[#101828] outline-none placeholder:text-[#98A2B3]"
                  />
                </div>
                <div className="flex w-full items-center justify-end gap-1.5 sm:w-auto">
                  {!quickLink.trim() && (
                    <button
                      type="button"
                      onClick={handleQuickClipboard}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-[#EAECF0] bg-white px-2.5 py-1.5 text-xs font-semibold text-[#344054] hover:border-[#0027eb] hover:text-[#0027eb]"
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
                    className="inline-flex items-center gap-1.5 rounded-xl border border-[#EAECF0] bg-white px-2.5 py-1.5 text-xs font-semibold text-[#344054] hover:bg-[#F4F5F7]"
                  >
                    <Upload className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Upload</span>
                  </button>
                  <button
                    type="submit"
                    disabled={!parsedQuickLink.isValid || quickImporting}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-[#0027eb] px-3.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-[#001fc2] disabled:opacity-40"
                  >
                    {quickImporting ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Plus className="h-3.5 w-3.5" />
                    )}
                    Gem
                  </button>
                </div>
              </form>

              {/* EXPLORE MASONRY FEED OR CLEAN LIVE QUICK-START */}
              {visibleAds.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[#D8DCE3] bg-[#FAFBFD] px-6 py-16 text-center">
                  <div className="adtrack-icon-badge mb-4 flex h-12 w-12 items-center justify-center rounded-2xl text-white">
                    <Compass className="h-6 w-6" />
                  </div>
                  <h2 className="font-display text-base font-bold text-[#101828]">
                    {ads.length === 0
                      ? "Dit Adtrack-bibliotek er klar"
                      : "Ingen annoncer matcher dine filtre"}
                  </h2>
                  <p className="mt-1.5 max-w-md text-xs leading-relaxed text-[#667085]">
                    {ads.length === 0
                      ? "Indsæt et Instagram- eller Meta Ad Library-link i feltet ovenfor — eller klik på et brand herunder for at hente rigtige live Meta-annoncer nu."
                      : "Prøv at nulstille din søgning eller filtre."}
                  </p>

                  {ads.length === 0 ? (
                    <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
                      {["loopearplugs.com", "ridge.com", "gymshark.com"].map((domain) => (
                        <button
                          key={domain}
                          type="button"
                          disabled={quickScouting}
                          onClick={() => handleQuickScout(domain)}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-[#E2E5EB] bg-white px-3.5 py-2 text-xs font-semibold text-[#101828] shadow-[0_1px_2px_rgba(16,24,40,0.04)] transition-all hover:border-[#0027eb] hover:text-[#0027eb] disabled:opacity-50"
                        >
                          {quickScouting ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin text-[#0027eb]" />
                          ) : (
                            <Radar className="h-3.5 w-3.5 text-[#0027eb]" />
                          )}
                          Hent live ads: {domain}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setSearch("");
                        setSourceFilter("all");
                        setMediaFilter("all");
                        setBrandFilter("all");
                      }}
                      className="mt-4 rounded-xl bg-[#0027eb] px-4 py-2 text-xs font-semibold text-white"
                    >
                      Nulstil filtre
                    </button>
                  )}
                </div>
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
          className="pb-safe fixed inset-x-0 bottom-0 z-40 border-t border-[#EAECF0] bg-white/95 backdrop-blur-xl lg:hidden"
        >
          <div className="mx-auto grid max-w-md grid-cols-5 items-center px-2 pt-1.5">
            <button
              type="button"
              onClick={() => {
                setView("explore");
                setSelectedBoardId(null);
                setSelectedShopId(null);
              }}
              className="flex flex-col items-center gap-1 py-1.5 text-[10px] font-semibold"
              style={{
                color: view === "explore" && !selectedBoardId ? "#0027eb" : "#667085",
              }}
            >
              <Compass className="h-5 w-5" />
              Explore
            </button>

            <button
              type="button"
              onClick={() => {
                setView("templates");
                setSelectedBoardId(null);
                setSelectedShopId(null);
              }}
              className="flex flex-col items-center gap-1 py-1.5 text-[10px] font-semibold"
              style={{ color: view === "templates" ? "#0027eb" : "#667085" }}
            >
              <LayoutGrid className="h-5 w-5" />
              Templates
            </button>

            <div className="flex justify-center">
              <button
                id="mobile-new-ad-btn"
                type="button"
                onClick={() => {
                  setSharedUrl("");
                  setImportOpen(true);
                }}
                aria-label="Importér annonce"
                className="-mt-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#0027eb] text-white shadow-[0_6px_18px_rgba(0,39,235,0.4)] transition-transform active:scale-95"
              >
                <Plus className="h-6 w-6" />
              </button>
            </div>

            <button
              type="button"
              onClick={() => {
                setView("scout");
                setSelectedShopId(null);
              }}
              className="flex flex-col items-center gap-1 py-1.5 text-[10px] font-semibold"
              style={{ color: view === "scout" ? "#0027eb" : "#667085" }}
            >
              <Radar className="h-5 w-5" />
              Scout
            </button>

            <button
              type="button"
              onClick={() => {
                setView("collections");
                setSelectedBoardId(null);
              }}
              className="flex flex-col items-center gap-1 py-1.5 text-[10px] font-semibold"
              style={{
                color:
                  view === "collections" || Boolean(selectedBoardId)
                    ? "#0027eb"
                    : "#667085",
              }}
            >
              <FolderKanban className="h-5 w-5" />
              Collections
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
