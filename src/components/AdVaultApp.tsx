"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  ArrowUpRight,
  Building2,
  Check,
  Clock,
  Compass,
  Copy,
  Film,
  FolderKanban,
  Link2,
  Plus,
  Search,
  Sparkles,
  Store,
} from "lucide-react";
import type { Ad, Board, Brand, ConnectorStatus, MarketCode } from "@/lib/types";
import { SEED_ADS, SEED_BRANDS } from "@/lib/seed-data";
import { getActiveDays } from "@/lib/url-parser";
import { AdCard } from "./AdCard";
import { AdDetailSheet } from "./AdDetailSheet";
import { CollectionsView } from "./CollectionsView";
import { ShopsTableView } from "./ShopsTableView";
import { ShopAnalyticsView } from "./ShopAnalyticsView";
import { ShopifyBagIcon } from "./BrandIcons";
import { GlassTabBar, GlassTabBarItem } from "@/components/ui/glass-tab-bar";

type ActiveView = "shops" | "explore" | "folders";
type ExploreSubView = "ads" | "hooks" | "lp";
type SortOption = "top" | "longest" | "duplicated" | "newest";

const STORAGE_KEYS = {
  ads: "adtrack_ads_v7",
  brands: "adtrack_brands_v7",
  boards: "adtrack_boards_v7",
};

interface AdVaultAppProps {
  initialStatus: ConnectorStatus;
}

export function AdVaultApp({ initialStatus: _initialStatus }: AdVaultAppProps) {
  void _initialStatus;
  const [ads, setAds] = useState<Ad[]>(SEED_ADS);
  const [brands, setBrands] = useState<Brand[]>(SEED_BRANDS);
  const [boards, setBoards] = useState<Board[]>([]);
  const [hydrated, setHydrated] = useState(false);

  // Navigation: ONLY Shops, Explore, Folders!
  const [view, setView] = useState<ActiveView>("shops");
  const [selectedShopId, setSelectedShopId] = useState<string | null>(null);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [quickFolderOpen, setQuickFolderOpen] = useState(false);
  const [quickFolderName, setQuickFolderName] = useState("");
  const [toast, setToast] = useState<string | null>(null);

  // Explore state
  const [exploreSubView, setExploreSubView] = useState<ExploreSubView>("ads");
  const [search, setSearch] = useState("");
  const [marketFilter, setMarketFilter] = useState<"ALL" | MarketCode>("ALL");
  const [mediaFilter, setMediaFilter] = useState<"all" | "video" | "image" | "carousel">("all");
  const [brandFilter, setBrandFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<SortOption>("top");
  const [visibleLimit, setVisibleLimit] = useState(24);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Ad Detail Sheet
  const [activeAdId, setActiveAdId] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3200);
  };

  const syncCatalog = (payload: Record<string, unknown>) => {
    fetch("/api/catalog", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }).catch(() => {});
  };

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .then((reg) => reg.update().catch(() => {}))
        .catch(() => {});
    }

    let cancelled = false;
    Promise.resolve().then(() => {
      if (cancelled) return;
      try {
        const savedAds = localStorage.getItem(STORAGE_KEYS.ads);
        const savedBrands =
          localStorage.getItem(STORAGE_KEYS.brands) ||
          localStorage.getItem("adtrack_brands_v6");
        const savedBoards =
          localStorage.getItem(STORAGE_KEYS.boards) ||
          localStorage.getItem("adtrack_boards_v6") ||
          localStorage.getItem("adtrack_boards_v5");

        if (savedBrands) {
          const parsed: Brand[] = JSON.parse(savedBrands);
          if (Array.isArray(parsed) && parsed.length > 0) {
            const seedById = new Map(SEED_BRANDS.map((b) => [b.id, b]));
            const removedIds = new Set([
              "brand-mycomfort-dk",
              "brand-deepstash-com",
              "brand-barons-dk",
              "brand-gymshark-com",
              "brand-planetnusa-com",
              "brand-rains-com",
              "brand-colorfulstandard-com",
              "brand-nordgreen-com",
              "brand-shapingnewtomorrow-com",
              "brand-eyda-com",
            ]);
            const refreshed = parsed
              .filter((b) => !removedIds.has(b.id))
              .map((b) => {
                const sb = seedById.get(b.id);
                if (!sb) return b;
                if (sb.meta_page_id && sb.meta_page_id !== b.meta_page_id) {
                  return { ...sb, folder_ids: b.folder_ids || [] };
                }
                return {
                  ...b,
                  pixels:
                    (sb.pixels?.length || 0) > 0 ? sb.pixels : b.pixels || [],
                  shopify_apps:
                    (sb.shopify_apps?.length || 0) > 0
                      ? sb.shopify_apps
                      : b.shopify_apps || [],
                  is_shopify: sb.is_shopify || b.is_shopify,
                };
              });
            const existingIds = new Set(refreshed.map((b) => b.id));
            const newSeedBrands = SEED_BRANDS.filter((b) => !existingIds.has(b.id));
            setBrands([...newSeedBrands, ...refreshed]);
          }
        }
        if (savedAds) {
          const parsed: Ad[] = JSON.parse(savedAds);
          if (Array.isArray(parsed) && parsed.length > 0) {
            const removedAdBrandIds = new Set([
              "brand-mycomfort-dk",
              "brand-deepstash-com",
              "brand-barons-dk",
              "brand-gymshark-com",
              "brand-planetnusa-com",
              "brand-rains-com",
              "brand-colorfulstandard-com",
              "brand-nordgreen-com",
              "brand-shapingnewtomorrow-com",
              "brand-eyda-com",
            ]);
            const cleaned = parsed.filter(
              (a) =>
                !removedAdBrandIds.has(a.brand_id) &&
                !(a.brand_id === "brand-thenap-dk" && !a.landing_page_url?.includes("thenap"))
            );
            const existingIds = new Set(cleaned.map((a) => a.id));
            const newSeedAds = SEED_ADS.filter((a) => !existingIds.has(a.id));
            setAds([...newSeedAds, ...cleaned]);
          }
        }
        if (savedBoards) {
          const parsed = JSON.parse(savedBoards);
          if (Array.isArray(parsed) && parsed.length > 0) setBoards(parsed);
        }
      } catch {
        // fallback to scraped catalog
      }
      setHydrated(true);

      // Hydrate from live Supabase Postgres when configured (auto-seeds on first load)
      fetch("/api/catalog", { cache: "no-store" })
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (cancelled || !data) return;
          if (data.synced) {
            if (Array.isArray(data.brands) && data.brands.length > 0) {
              setBrands(data.brands);
            }
            if (Array.isArray(data.ads) && data.ads.length > 0) {
              setAds(data.ads);
            }
            if (Array.isArray(data.folders)) {
              setBoards(data.folders);
            }
          }
        })
        .catch(() => {});
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

  const handleToggleBoard = (adId: string, boardId: string) => {
    const existing = ads.find((a) => a.id === adId);
    if (!existing) return;
    const hasBoard = existing.board_ids.includes(boardId);
    const updatedAd: Ad = {
      ...existing,
      board_ids: hasBoard
        ? existing.board_ids.filter((id) => id !== boardId)
        : [...existing.board_ids, boardId],
    };
    setAds((prev) => prev.map((a) => (a.id === adId ? updatedAd : a)));
    syncCatalog({ action: "upsert_ad", ad: updatedAd });
  };

  const handleToggleBrandFolder = (brandId: string, boardId: string) => {
    const existing = brands.find((b) => b.id === brandId);
    if (!existing) return;
    const cur = existing.folder_ids || [];
    const hasFolder = cur.includes(boardId);
    const updatedBrand: Brand = {
      ...existing,
      folder_ids: hasFolder ? cur.filter((id) => id !== boardId) : [...cur, boardId],
    };
    setBrands((prev) => prev.map((b) => (b.id === brandId ? updatedBrand : b)));
    syncCatalog({ action: "upsert_brand", brand: updatedBrand });
  };

  const handleUpdateAd = (adId: string, patch: Partial<Ad>) => {
    const existing = ads.find((a) => a.id === adId);
    if (!existing) return;
    const updatedAd: Ad = { ...existing, ...patch };
    setAds((prev) => prev.map((a) => (a.id === adId ? updatedAd : a)));
    syncCatalog({ action: "upsert_ad", ad: updatedAd });
  };

  const handleUpdateBrand = (brandId: string, patch: Partial<Brand>, freshAds?: Ad[]) => {
    const existing = brands.find((b) => b.id === brandId);
    if (!existing) return;
    const updatedBrand: Brand = { ...existing, ...patch };
    setBrands((prev) => prev.map((b) => (b.id === brandId ? updatedBrand : b)));
    if (freshAds && freshAds.length > 0) {
      setAds((prev) => {
        const otherAds = prev.filter((a) => a.brand_id !== brandId);
        return [...freshAds, ...otherAds];
      });
    }
    syncCatalog({
      action: "upsert_brand_and_ads",
      brand: updatedBrand,
      ads: freshAds || [],
    });
  };

  const handleAddBrandWithAds = (brand: Brand, discoveredAds: Ad[] = []) => {
    setBrands((prev) => [brand, ...prev.filter((b) => b.id !== brand.id)]);
    if (discoveredAds.length > 0) {
      setAds((prev) => {
        const existingIds = new Set(prev.map((a) => a.id));
        const fresh = discoveredAds.filter((a) => !existingIds.has(a.id));
        return [...fresh, ...prev];
      });
      showToast(
        `${brand.name} scrapet + ${discoveredAds.length} live Meta-annoncer tilføjet!`
      );
    } else {
      showToast(`${brand.name} scrapet og tilføjet til Shops!`);
    }
    syncCatalog({
      action: "upsert_brand_and_ads",
      brand,
      ads: discoveredAds,
    });
  };

  const handleCreateBoard = (name: string) => {
    const palette = ["#0027eb", "#16a34a", "#d97706", "#e11d48", "#0284c7"];
    const board: Board = {
      id: `folder-${Date.now()}`,
      name,
      description: "Personlig folder til shops og Meta ads",
      accent_color: palette[boards.length % palette.length],
      created_at: new Date().toISOString(),
    };
    setBoards((prev) => [...prev, board]);
    syncCatalog({ action: "upsert_folder", folder: board });
    showToast(`Folder "${name}" oprettet`);
  };

  const handleDeleteBoard = (boardId: string) => {
    setBoards((prev) => prev.filter((b) => b.id !== boardId));
    setAds((prev) =>
      prev.map((a) => ({
        ...a,
        board_ids: a.board_ids.filter((id) => id !== boardId),
      }))
    );
    setBrands((prev) =>
      prev.map((b) => ({
        ...b,
        folder_ids: (b.folder_ids || []).filter((id) => id !== boardId),
      }))
    );
    syncCatalog({ action: "delete_folder", folderId: boardId });
    if (selectedFolderId === boardId) setSelectedFolderId(null);
  };

  const openShopAnalytics = (brandId: string) => {
    const exists = brands.some((b) => b.id === brandId);
    if (!exists) return;
    setSelectedShopId(brandId);
    setView("shops");
  };

  const copyText = async (key: string, val: string) => {
    try {
      await navigator.clipboard.writeText(val);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 1600);
    } catch {
      // ignore
    }
  };

  // Filtered & sorted Explore ads
  const visibleAds = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = ads.filter((ad) => {
      if (marketFilter === "DK" && ad.market !== "DK") return false;
      if (marketFilter === "US" && ad.market === "DK") return false;
      if (brandFilter !== "all" && ad.brand_id !== brandFilter) return false;
      if (mediaFilter !== "all" && ad.media_type !== mediaFilter) return false;
      if (q) {
        const haystack = [
          ad.brand_name,
          ad.brand_handle,
          ad.headline,
          ad.primary_text,
          ad.extracted_hook,
          ad.hook_category,
          ad.landing_page_url,
          ad.cta_text,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });

    if (sortBy !== "top") {
      return [...list].sort((a, b) => {
        if (sortBy === "longest") {
          return getActiveDays(b.started_running_at) - getActiveDays(a.started_running_at);
        }
        if (sortBy === "duplicated") {
          return (b.duplicated_count || 1) - (a.duplicated_count || 1);
        }
        return (
          new Date(b.started_running_at).getTime() -
          new Date(a.started_running_at).getTime()
        );
      });
    }

    // Top Performing: balanced blend of reach/impressions + scaling + longevity,
    // with per-brand diversity interleaving so no single brand monopolizes Explore.
    const brandMap = new Map(brands.map((b) => [b.id, b]));
    const baseScore = (ad: Ad) => {
      const days = Math.max(1, getActiveDays(ad.started_running_at));
      const brand = brandMap.get(ad.brand_id);
      const longevityScore = Math.log1p(Math.min(days, 365)) * 14;
      const reachScore =
        ad.eu_reach && ad.eu_reach > 0
          ? Math.log10(ad.eu_reach + 10) * 18
          : Math.log10(((brand?.monthly_visits || 0) / 1000) + 10) * 9;
      const scalingScore =
        Math.log1p(Math.max(0, (ad.duplicated_count || 1) - 1)) * 26 +
        Math.log10((ad.brand_live_ads || brand?.active_ads_count || 1) + 1) * 7;
      const spendBonus =
        ad.estimated_spend && ad.estimated_spend > 0
          ? Math.log10(ad.estimated_spend + 10) * 8
          : 0;
      return longevityScore + reachScore + scalingScore + spendBonus;
    };

    const scored = list
      .map((ad) => ({ ad, raw: baseScore(ad) }))
      .sort((a, b) => b.raw - a.raw);

    if (brandFilter !== "all") {
      return scored.map((s) => s.ad);
    }

    const brandSeenCount = new Map<string, number>();
    return scored
      .map((item) => {
        const rankInBrand = brandSeenCount.get(item.ad.brand_id) || 0;
        brandSeenCount.set(item.ad.brand_id, rankInBrand + 1);
        return { ad: item.ad, finalScore: item.raw - rankInBrand * 22 };
      })
      .sort((a, b) => b.finalScore - a.finalScore)
      .map((s) => s.ad);
  }, [ads, brands, marketFilter, brandFilter, mediaFilter, search, sortBy]);

  // Cross-brand winning hooks extracted from visibleAds
  const exploreHooks = useMemo(() => {
    const seen = new Set<string>();
    const out: {
      hook: string;
      category: string;
      days: number;
      ad: Ad;
    }[] = [];
    for (const ad of visibleAds) {
      const hook = (ad.extracted_hook || "").trim();
      if (hook.length < 10) continue;
      const k = hook.toLowerCase();
      if (seen.has(k)) continue;
      seen.add(k);
      out.push({
        hook,
        category: ad.hook_category || "Product Benefit",
        days: getActiveDays(ad.started_running_at),
        ad,
      });
    }
    return out;
  }, [visibleAds]);

  // Cross-brand top landing pages extracted from visibleAds
  const exploreLandingPages = useMemo(() => {
    const map = new Map<
      string,
      { url: string; path: string; brandName: string; brandId: string; market: MarketCode; count: number; ads: Ad[] }
    >();
    for (const ad of visibleAds) {
      if (!ad.landing_page_url) continue;
      const key = `${ad.brand_id}|${ad.landing_page_path || "/"}`;
      const ex = map.get(key);
      if (ex) {
        ex.count++;
        ex.ads.push(ad);
      } else {
        map.set(key, {
          url: ad.landing_page_url,
          path: ad.landing_page_path || "/",
          brandName: ad.brand_name,
          brandId: ad.brand_id,
          market: ad.market,
          count: 1,
          ads: [ad],
        });
      }
    }
    return Array.from(map.values()).sort((a, b) => b.count - a.count);
  }, [visibleAds]);

  const activeAd = useMemo(
    () => ads.find((a) => a.id === activeAdId) || null,
    [ads, activeAdId]
  );

  const selectedShop = useMemo(
    () => brands.find((b) => b.id === selectedShopId) || null,
    [brands, selectedShopId]
  );

  const dkAdsCount = useMemo(() => ads.filter((a) => a.market === "DK").length, [ads]);
  const usAdsCount = useMemo(() => ads.filter((a) => a.market !== "DK").length, [ads]);

  return (
    <>
    <div className="flex min-h-dvh w-full overflow-x-clip bg-[#F7F8FB] lg:bg-[#05060B]">
      {/* =====================================================================
          ADTRACK OBSIDIAN SIDEBAR — ONLY SHOPS, EXPLORE, AND FOLDERS
         ===================================================================== */}
      <aside className="adtrack-sidebar sticky top-0 hidden h-dvh w-[242px] shrink-0 flex-col px-3.5 py-5 text-white lg:flex">
        {/* Brand Wordmark */}
        <button
          type="button"
          onClick={() => {
            setView("shops");
            setSelectedShopId(null);
            setSelectedFolderId(null);
          }}
          className="mb-7 flex items-center px-2 text-left"
        >
          <span className="flex items-center gap-2.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/icons/logo.png"
              alt="Adtrack"
              className="h-7.5 w-7.5 rounded-[9px]"
            />
            <span className="font-display text-[18px] font-bold tracking-[-0.03em] text-white">
              Adtrack
            </span>
          </span>
        </button>

        {/* SECTION 1: DISCOVER (Shops + Explore ONLY) */}
        <div className="space-y-1">
          <p className="px-3 pb-1.5 text-[10.5px] font-semibold uppercase tracking-[0.08em] text-white/35">
            Discover
          </p>

          <button
            type="button"
            onClick={() => {
              setView("shops");
              setSelectedShopId(null);
              setSelectedFolderId(null);
            }}
            className="flex w-full items-center rounded-xl px-3 py-2.5 font-display text-[13.5px] font-semibold transition-all"
            style={
              view === "shops"
                ? {
                    backgroundColor: "rgba(255,255,255,0.11)",
                    color: "#FFFFFF",
                    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.12)",
                  }
                : { color: "rgba(255,255,255,0.62)" }
            }
          >
            <span className="flex items-center gap-2.5">
              <Store
                className="h-[17px] w-[17px]"
                style={{ color: view === "shops" ? "#60A5FA" : undefined }}
              />
              Shops
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              setView("explore");
              setSelectedShopId(null);
              setSelectedFolderId(null);
            }}
            className="flex w-full items-center rounded-xl px-3 py-2.5 font-display text-[13.5px] font-semibold transition-all"
            style={
              view === "explore"
                ? {
                    backgroundColor: "rgba(255,255,255,0.11)",
                    color: "#FFFFFF",
                    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.12)",
                  }
                : { color: "rgba(255,255,255,0.62)" }
            }
          >
            <span className="flex items-center gap-2.5">
              <Compass
                className="h-[17px] w-[17px]"
                style={{ color: view === "explore" ? "#60A5FA" : undefined }}
              />
              Explore
            </span>
          </button>
        </div>

        {/* SECTION 2: FOLDERS */}
        <div className="mt-7 space-y-1">
          <div className="flex items-center justify-between px-3 pb-1.5">
            <p className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-white/35">
              Folders
            </p>
            <button
              type="button"
              onClick={() => setQuickFolderOpen((v) => !v)}
              title="Ny folder"
              className="flex h-5 w-5 items-center justify-center rounded-md text-white/45 transition-colors hover:bg-white/10 hover:text-white"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>

          <button
            type="button"
            onClick={() => {
              setView("folders");
              setSelectedFolderId(null);
              setSelectedShopId(null);
            }}
            className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 font-display text-[13.5px] font-semibold transition-all"
            style={
              view === "folders" && !selectedFolderId
                ? {
                    backgroundColor: "rgba(255,255,255,0.11)",
                    color: "#FFFFFF",
                    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.12)",
                  }
                : { color: "rgba(255,255,255,0.68)" }
            }
          >
            <span className="flex items-center gap-2.5">
              <FolderKanban
                className="h-[17px] w-[17px]"
                style={{
                  color: view === "folders" && !selectedFolderId ? "#6B8BFF" : undefined,
                }}
              />
              Folders
            </span>
            <span className="font-mono-num text-[10.5px] text-white/45">
              {boards.length}
            </span>
          </button>

          {quickFolderOpen && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!quickFolderName.trim()) return;
                handleCreateBoard(quickFolderName.trim());
                setQuickFolderName("");
                setQuickFolderOpen(false);
              }}
              className="px-2 py-1"
            >
              <input
                type="text"
                autoFocus
                value={quickFolderName}
                onChange={(e) => setQuickFolderName(e.target.value)}
                placeholder="Folder navn + Enter"
                className="w-full rounded-lg border border-white/15 bg-white/[0.08] px-2.5 py-1.5 text-xs text-white outline-none placeholder:text-white/40 focus:border-[#4D6BFF]"
              />
            </form>
          )}

          {/* Direct Folder List */}
          <div className="space-y-0.5 pl-2 pt-1">
            {boards.map((board) => {
              const count =
                ads.filter((a) => a.board_ids.includes(board.id)).length +
                brands.filter((b) => (b.folder_ids || []).includes(board.id)).length;
              const active = view === "folders" && selectedFolderId === board.id;
              return (
                <button
                  key={board.id}
                  type="button"
                  onClick={() => {
                    setSelectedFolderId(board.id);
                    setSelectedShopId(null);
                    setView("folders");
                  }}
                  className="flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-left text-[12.5px] transition-colors hover:bg-white/[0.06]"
                  style={
                    active
                      ? { backgroundColor: "rgba(255,255,255,0.11)", color: "#FFFFFF" }
                      : { color: "rgba(255,255,255,0.54)" }
                  }
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <span
                      className="h-2 w-2 shrink-0 rounded-full"
                      style={{ backgroundColor: board.accent_color }}
                    />
                    <span className="truncate">{board.name}</span>
                  </span>
                  <span className="font-mono-num text-[10.5px] text-white/35">
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </aside>

      {/* =====================================================================
          FLOATING ELEVATED WHITE MAIN WORKSPACE
         ===================================================================== */}
      <div className="flex min-w-0 flex-1 flex-col lg:p-2.5 lg:pl-0">
        {/* NATIVE iOS FROSTED TOP BAR */}
        <header className="pt-safe sticky top-0 z-30 flex items-center justify-between border-b border-[#ECEFF5] bg-white/88 px-4 py-2.5 text-[#0F172A] backdrop-blur-xl lg:hidden">
          <button
            type="button"
            onClick={() => {
              setView("shops");
              setSelectedShopId(null);
              setSelectedFolderId(null);
            }}
            className="flex items-center gap-2"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/icons/logo.png"
              alt="Adtrack"
              className="h-7 w-7 rounded-[8px] shadow-[0_2px_8px_rgba(0,39,235,0.22)]"
            />
            <span className="font-display text-[17px] font-bold tracking-[-0.03em] text-[#0F172A]">
              Adtrack
            </span>
          </button>

          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#F5F7FA] px-2.5 py-1 font-mono-num text-[11px] font-semibold text-[#475569]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#16A34A]" />
            {brands.length} · {ads.length}
          </span>
        </header>

        {/* WORKSPACE CANVAS */}
        <main className="flex-1 bg-[#F7F8FB] px-3.5 py-4 pb-28 text-[#0F172A] sm:px-6 lg:rounded-[22px] lg:bg-white lg:px-7 lg:py-6 lg:pb-12">
          {/* Global Live Toast */}
          {toast && (
            <div className="mb-4 inline-flex items-center gap-2 rounded-xl border border-[#0027eb]/20 bg-[#EEF2FF] px-3.5 py-2 text-xs font-semibold text-[#0027eb]">
              <Check className="h-3.5 w-3.5" />
              {toast}
            </div>
          )}

          {/* =================================================================
              VIEW 1: SHOPS (Table Explorer + Full Trendtrack Shop Analytics)
             ================================================================= */}
          {view === "shops" && selectedShop && (
            <ShopAnalyticsView
              brand={selectedShop}
              ads={ads}
              boards={boards}
              onBack={() => setSelectedShopId(null)}
              onOpenAd={(ad) => setActiveAdId(ad.id)}
              onToggleBoard={handleToggleBoard}
              onToggleBrandFolder={handleToggleBrandFolder}
              onUpdateBrand={handleUpdateBrand}
            />
          )}

          {view === "shops" && !selectedShop && (
            <ShopsTableView
              brands={brands}
              ads={ads}
              boards={boards}
              onOpenShop={(brandId) => {
                setSelectedShopId(brandId);
                window.scrollTo(0, 0);
              }}
              onAddBrand={handleAddBrandWithAds}
              onToggleBrandFolder={handleToggleBrandFolder}
            />
          )}

          {/* =================================================================
              VIEW 2: EXPLORE (Global Scraped Meta Ad Library + Hooks + LP)
             ================================================================= */}
          {view === "explore" && (
            <div className="space-y-4 lg:space-y-5">
              {/* Explore Header — KISS */}
              <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                <div className="flex items-center gap-2.5">
                  <h1 className="font-display text-[22px] font-bold leading-tight text-[#0F172A]">
                    Explore
                  </h1>
                  <span className="rounded-full bg-[#EEF2FF] px-2.5 py-0.5 font-mono-num text-[11px] font-bold text-[#0027eb]">
                    {visibleAds.length}
                  </span>
                </div>

                {/* Sub-mode switcher: Ads | Hooks | Landing Pages */}
                <div className="grid grid-cols-3 rounded-xl bg-[#EFEFF4] p-1 text-xs font-semibold sm:inline-flex">
                  {[
                    { id: "ads" as const, short: "Ads", label: "Ads", count: visibleAds.length },
                    { id: "hooks" as const, short: "Hooks", label: "Hooks", count: exploreHooks.length },
                    { id: "lp" as const, short: "LP", label: "Landing Pages", count: exploreLandingPages.length },
                  ].map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setExploreSubView(m.id)}
                      className={`inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-lg px-2.5 py-1.5 transition-all sm:px-3 ${
                        exploreSubView === m.id
                          ? "bg-white text-[#0F172A] shadow-xs"
                          : "text-[#64748B] hover:text-[#0F172A]"
                      }`}
                    >
                      <span className="sm:hidden">{m.short}</span>
                      <span className="hidden sm:inline">{m.label}</span>
                      <span
                        className={`font-mono-num text-[10.5px] font-semibold ${
                          exploreSubView === m.id ? "text-[#0027eb]" : "text-[#94A3B8]"
                        }`}
                      >
                        {m.count}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Unified Calm Filter Bar */}
              <div className="space-y-2.5 xl:flex xl:items-center xl:justify-between xl:gap-3 xl:space-y-0">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  {/* Search (16px on mobile prevents iOS Safari auto-zoom) */}
                  <div className="relative flex-1 sm:w-64 sm:flex-none">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94A3B8]" />
                    <input
                      id="explore-search-input"
                      type="search"
                      value={search}
                      onChange={(e) => {
                        setSearch(e.target.value);
                        setVisibleLimit(24);
                      }}
                      placeholder="Søg brands, hooks, copy..."
                      className="w-full rounded-xl border border-[#E6E9F0] bg-white py-2 pl-9 pr-3 text-[16px] text-[#0F172A] outline-none transition-colors focus:border-[#0027eb] sm:text-xs"
                    />
                  </div>

                  {/* Clean Market Segmented Control */}
                  <div className="grid grid-cols-3 rounded-xl bg-[#EFEFF4] p-1 text-xs font-semibold sm:inline-flex">
                    {[
                      { id: "ALL" as const, label: "Alle", count: ads.length },
                      { id: "DK" as const, label: "DK", count: dkAdsCount },
                      { id: "US" as const, label: "US", count: usAdsCount },
                    ].map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => {
                          setMarketFilter(m.id);
                          setVisibleLimit(24);
                        }}
                        className={`inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-lg px-2.5 py-1 transition-all ${
                          marketFilter === m.id
                            ? "bg-white text-[#0F172A] shadow-xs"
                            : "text-[#64748B] hover:text-[#0F172A]"
                        }`}
                      >
                        <span>{m.label}</span>
                        <span
                          className={`font-mono-num text-[10px] ${
                            marketFilter === m.id ? "text-[#0027eb]" : "text-[#94A3B8]"
                          }`}
                        >
                          {m.count}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Format + Brand + Sort */}
                <div className="no-scrollbar flex items-center gap-2 overflow-x-auto pb-0.5 text-xs">
                  <div className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-[#E6E9F0] bg-white px-2.5 py-2 sm:py-1.5">
                    <Film className="h-3.5 w-3.5 text-[#64748B]" />
                    <select
                      aria-label="Format"
                      value={mediaFilter}
                      onChange={(e) =>
                        setMediaFilter(
                          e.target.value as "all" | "video" | "image" | "carousel"
                        )
                      }
                      className="cursor-pointer bg-transparent text-[13px] font-medium text-[#334155] outline-none sm:text-xs"
                    >
                      <option value="all">Alle formater</option>
                      <option value="video">Video</option>
                      <option value="image">Image</option>
                      <option value="carousel">Carousel</option>
                    </select>
                  </div>

                  <div className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-[#E6E9F0] bg-white px-2.5 py-2 sm:py-1.5">
                    <Building2 className="h-3.5 w-3.5 text-[#64748B]" />
                    <select
                      aria-label="Vælg shop"
                      value={brandFilter}
                      onChange={(e) => setBrandFilter(e.target.value)}
                      className="max-w-[140px] cursor-pointer truncate bg-transparent text-[13px] font-medium text-[#334155] outline-none sm:max-w-none sm:text-xs"
                    >
                      <option value="all">Alle shops ({brands.length})</option>
                      {brands.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-[#E6E9F0] bg-white px-2.5 py-2 sm:py-1.5">
                    <Clock className="h-3.5 w-3.5 text-[#64748B]" />
                    <select
                      aria-label="Sortér"
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as SortOption)}
                      className="cursor-pointer bg-transparent text-[13px] font-semibold text-[#0F172A] outline-none sm:text-xs"
                    >
                      <option value="top">Top Performing</option>
                      <option value="longest">Longest Active</option>
                      <option value="duplicated">Most Duplicated</option>
                      <option value="newest">Newest</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* SUB-VIEW A: META ADS FEED */}
              {exploreSubView === "ads" && (
                <>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {visibleAds.slice(0, visibleLimit).map((ad, idx) => (
                      <AdCard
                        key={ad.id}
                        ad={ad}
                        boards={boards}
                        rank={idx < 10 ? idx + 1 : undefined}
                        onOpen={(item) => setActiveAdId(item.id)}
                        onToggleBoard={handleToggleBoard}
                        onOpenBrand={openShopAnalytics}
                      />
                    ))}
                  </div>

                  {visibleAds.length > visibleLimit && (
                    <div className="flex justify-center pt-2">
                      <button
                        type="button"
                        onClick={() => setVisibleLimit((n) => n + 24)}
                        className="rounded-xl border border-[#DCE1EC] bg-white px-5 py-2.5 font-display text-xs font-semibold text-[#0F172A] shadow-xs transition-all hover:border-[#0027eb] hover:text-[#0027eb]"
                      >
                        Vis flere annoncer ({visibleAds.length - visibleLimit} tilbage)
                      </button>
                    </div>
                  )}

                  {visibleAds.length === 0 && (
                    <div className="py-16 text-center">
                      <p className="font-display text-sm font-bold text-[#0F172A]">
                        Ingen annoncer matcher dit filter
                      </p>
                      <p className="mt-1 text-xs text-[#64748B]">
                        Prøv at skifte marked, format eller ryd søgefeltet.
                      </p>
                    </div>
                  )}
                </>
              )}

              {/* SUB-VIEW B: CROSS-BRAND HOOKS & COPY LIBRARY */}
              {exploreSubView === "hooks" && (
                <div className="grid grid-cols-1 gap-3.5 md:grid-cols-2">
                  {exploreHooks.slice(0, 48).map((item, idx) => (
                    <div
                      key={`${item.ad.id}-${idx}`}
                      className="adtrack-card-interactive flex flex-col justify-between gap-3 rounded-2xl p-4"
                    >
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <button
                            type="button"
                            onClick={() => openShopAnalytics(item.ad.brand_id)}
                            className="inline-flex items-center gap-1.5 font-display text-xs font-bold text-[#0F172A] hover:text-[#0027eb]"
                          >
                            <span>{item.ad.market === "DK" ? "🇩🇰" : "🇺🇸"}</span>
                            {item.ad.brand_name}
                          </button>

                          <div className="flex items-center gap-1.5">
                            <span className="inline-flex items-center gap-1 rounded-full bg-[#EEF2FF] px-2 py-0.5 text-[10.5px] font-semibold text-[#0027eb]">
                              <Sparkles className="h-2.5 w-2.5" />
                              {item.category}
                            </span>
                            <span className="rounded-md bg-[#ECFDF3] px-2 py-0.5 font-mono-num text-[10.5px] font-bold text-[#15803D]">
                              {item.days}d
                            </span>
                          </div>
                        </div>

                        <p className="font-display text-[14.5px] font-semibold leading-snug text-[#0F172A]">
                          &ldquo;{item.hook}&rdquo;
                        </p>
                      </div>

                      <div className="flex items-center justify-between border-t border-[#EFF2F6] pt-2.5">
                        <span className="truncate font-mono-num text-[11px] text-[#64748B]">
                          {item.ad.landing_page_path || "/"}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => copyText(`exhook-${idx}`, item.hook)}
                            className="inline-flex items-center gap-1 rounded-lg border border-[#DCE1EC] bg-white px-2.5 py-1 text-[11px] font-semibold text-[#334155] hover:border-[#0027eb] hover:text-[#0027eb]"
                          >
                            {copiedKey === `exhook-${idx}` ? (
                              <Check className="h-3 w-3 text-[#16A34A]" />
                            ) : (
                              <Copy className="h-3 w-3" />
                            )}
                            Kopiér
                          </button>
                          <button
                            type="button"
                            onClick={() => setActiveAdId(item.ad.id)}
                            className="rounded-lg bg-[#0F172A] px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-[#0027eb]"
                          >
                            Se ad
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* SUB-VIEW C: CROSS-BRAND TOP LANDING PAGES */}
              {exploreSubView === "lp" && (
                <div className="space-y-3">
                  {exploreLandingPages.slice(0, 40).map((lp, idx) => (
                    <div
                      key={`${lp.brandId}-${lp.path}-${idx}`}
                      className="adtrack-card flex flex-col justify-between gap-3 rounded-2xl p-4 sm:flex-row sm:items-center"
                    >
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <ShopifyBagIcon className="h-4 w-4 shrink-0" />
                          <button
                            type="button"
                            onClick={() => openShopAnalytics(lp.brandId)}
                            className="font-display text-xs font-bold text-[#0027eb] hover:underline"
                          >
                            {lp.market === "DK" ? "🇩🇰 " : "🇺🇸 "}
                            {lp.brandName}
                          </button>
                          <span className="truncate font-display text-sm font-bold text-[#0F172A]">
                            {lp.path}
                          </span>
                          <span className="rounded-full bg-[#EEF2FF] px-2 py-0.5 font-mono-num text-[11px] font-bold text-[#0027eb]">
                            {lp.count} active ads
                          </span>
                        </div>
                        <p className="flex items-center gap-1 truncate font-mono-num text-[11.5px] text-[#64748B]">
                          <Link2 className="h-3 w-3 shrink-0" />
                          {lp.url}
                        </p>
                      </div>

                      <div className="flex shrink-0 items-center gap-2.5">
                        <div className="flex -space-x-2">
                          {lp.ads.slice(0, 3).map((a) => (
                            <button
                              key={a.id}
                              type="button"
                              onClick={() => setActiveAdId(a.id)}
                              className="h-9 w-9 overflow-hidden rounded-lg border-2 border-white bg-[#F3F5F9] shadow-xs"
                            >
                              {(a.fallback_image_url || a.thumbnail_url) && (
                                /* eslint-disable-next-line @next/next/no-img-element */
                                <img
                                  src={a.fallback_image_url || a.thumbnail_url}
                                  alt=""
                                  className="h-full w-full object-cover"
                                />
                              )}
                            </button>
                          ))}
                        </div>
                        <a
                          href={lp.url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 rounded-xl border border-[#DCE1EC] bg-white px-3 py-1.5 text-xs font-semibold text-[#0F172A] hover:border-[#0027eb] hover:text-[#0027eb]"
                        >
                          Åbn LP
                          <ArrowUpRight className="h-3.5 w-3.5" />
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* =================================================================
              VIEW 3: FOLDERS
             ================================================================= */}
          {view === "folders" && (
            <CollectionsView
              boards={boards}
              ads={ads}
              brands={brands}
              selectedFolderId={selectedFolderId}
              onSelectFolder={(id) => setSelectedFolderId(id)}
              onCreateBoard={handleCreateBoard}
              onDeleteBoard={handleDeleteBoard}
              onOpenShop={openShopAnalytics}
              onOpenAd={(ad) => setActiveAdId(ad.id)}
              onToggleBoard={handleToggleBoard}
            />
          )}
        </main>
      </div>
    </div>

      {/* =====================================================================
          FLOATING iOS 26 LIQUID GLASS TAB BAR — SHOPS, EXPLORE, FOLDERS
         ===================================================================== */}
      <div
        className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center px-4 pt-4 lg:hidden"
        style={{
          paddingBottom: "max(0.85rem, env(safe-area-inset-bottom))",
          background:
            "linear-gradient(180deg, rgba(247,248,251,0) 0%, rgba(247,248,251,0.34) 68%, rgba(247,248,251,0.62) 100%)",
        }}
      >
        <GlassTabBar
          aria-label="Hovednavigation"
          value={view}
          onValueChange={(next) => {
            const target = next as ActiveView;
            setView(target);
            setSelectedShopId(null);
            if (target !== "folders") setSelectedFolderId(null);
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
          className="pointer-events-auto"
        >
          <GlassTabBarItem
            value="shops"
            icon={<Store strokeWidth={view === "shops" ? 2.25 : 1.85} />}
            label="Shops"
          />
          <GlassTabBarItem
            value="explore"
            icon={<Compass strokeWidth={view === "explore" ? 2.25 : 1.85} />}
            label="Explore"
          />
          <GlassTabBarItem
            value="folders"
            icon={<FolderKanban strokeWidth={view === "folders" ? 2.25 : 1.85} />}
            label="Folders"
          />
        </GlassTabBar>
      </div>

      {/* AD DETAIL SHEET */}
      <AdDetailSheet
        ad={activeAd}
        boards={boards}
        onClose={() => setActiveAdId(null)}
        onUpdateAd={handleUpdateAd}
        onToggleBoard={handleToggleBoard}
        onOpenBrand={openShopAnalytics}
      />
    </>
  );
}
