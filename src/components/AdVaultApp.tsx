"use client";

import React, {
  startTransition,
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Award,
  Building2,
  Calendar,
  Check,
  ChevronDown,
  Clock,
  Folder,
  Info,
  ListFilter,
  Plus,
  Radar,
  Search,
  Store,
} from "lucide-react";
import type { Ad, Board, Brand, ConnectorStatus, MarketCode } from "@/lib/types";
import { SEED_ADS, SEED_BRANDS } from "@/lib/seed-data";
import { dedupeAds, getActiveDays } from "@/lib/url-parser";
import { buildAdRankIndex, sortAdsForExplore } from "@/lib/ad-ranking";
import { preloadFeedWindow } from "@/lib/media-preloader";
import { AdCard } from "./AdCard";
import { AdDetailSheet } from "./AdDetailSheet";
import { CollectionsView } from "./CollectionsView";
import { ShopsTableView } from "./ShopsTableView";
import { ShopAnalyticsView } from "./ShopAnalyticsView";
import { SidebarPixelWave } from "./SidebarPixelWave";
import {
  ExploreSkeleton,
  FoldersSkeleton,
  ShopAnalyticsSkeleton,
  ShopsSkeleton,
} from "./Skeletons";
import { GlassTabBar, GlassTabBarItem } from "@/components/ui/glass-tab-bar";

type ActiveView = "shops" | "explore" | "folders";
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
  const [ads, setAds] = useState<Ad[]>(() => dedupeAds(SEED_ADS));
  const [brands, setBrands] = useState<Brand[]>(SEED_BRANDS);
  const [boards, setBoards] = useState<Board[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [catalogLoaded, setCatalogLoaded] = useState(false);

  // Navigation: ONLY Shops, Explore, Folders!
  const [view, setView] = useState<ActiveView>("shops");
  const [selectedShopId, setSelectedShopId] = useState<string | null>(null);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [quickFolderOpen, setQuickFolderOpen] = useState(false);
  const [quickFolderName, setQuickFolderName] = useState("");
  const [toast, setToast] = useState<string | null>(null);

  const workspaceScrollRef = useRef<HTMLElement | null>(null);

  const scrollWorkspaceToTop = useCallback((smooth = false) => {
    const behavior: ScrollBehavior = smooth ? "smooth" : "auto";
    workspaceScrollRef.current?.scrollTo({ top: 0, behavior });
    window.scrollTo({ top: 0, behavior });
  }, []);

  const navigateWithSkeleton = useCallback(
    (fn: () => void) => {
      startTransition(() => {
        fn();
      });
      scrollWorkspaceToTop(false);
    },
    [scrollWorkspaceToTop]
  );

  // Explore state
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [marketFilter, setMarketFilter] = useState<"ALL" | MarketCode>("ALL");
  const [mediaFilter, setMediaFilter] = useState<"all" | "video" | "image" | "carousel">("all");
  const [brandFilter, setBrandFilter] = useState<string>("all");
  const [timeFilter, setTimeFilter] = useState<"all" | "7d" | "30d" | "90d">("all");
  const [rankMin, setRankMin] = useState<number | null>(null);
  const [rankMax, setRankMax] = useState<number | null>(null);
  const [rankMinDraft, setRankMinDraft] = useState("");
  const [rankMaxDraft, setRankMaxDraft] = useState("");
  const [rankOpen, setRankOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>("top");
  const [visibleLimit, setVisibleLimit] = useState(48);
  const [masonryCols, setMasonryCols] = useState(4);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const updateCols = () => {
      const w = window.innerWidth;
      if (w >= 1280) setMasonryCols(4);
      else if (w >= 1024) setMasonryCols(3);
      else if (w >= 640) setMasonryCols(2);
      else setMasonryCols(1);
    };
    updateCols();
    window.addEventListener("resize", updateCols);
    return () => window.removeEventListener("resize", updateCols);
  }, []);

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
              "brand-trueclassictees-com",
              "brand-us-dollarshaveclub-com",
              "brand-theoodie-com",
              "brand-loopearplugs-com",
              "brand-jonesroadbeauty-com",
              "brand-groovelife-com",
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
              "brand-trueclassictees-com",
              "brand-us-dollarshaveclub-com",
              "brand-theoodie-com",
              "brand-loopearplugs-com",
              "brand-jonesroadbeauty-com",
              "brand-groovelife-com",
            ]);
            const cleaned = parsed.filter(
              (a) =>
                !removedAdBrandIds.has(a.brand_id) &&
                !(a.brand_id === "brand-thenap-dk" && !a.landing_page_url?.includes("thenap"))
            );
            const existingIds = new Set(cleaned.map((a) => a.id));
            const newSeedAds = SEED_ADS.filter((a) => !existingIds.has(a.id));
            setAds(dedupeAds([...newSeedAds, ...cleaned]));
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
              setAds(dedupeAds(data.ads));
            }
            if (Array.isArray(data.folders)) {
              setBoards(data.folders);
            }
          }
        })
        .catch(() => {})
        .finally(() => {
          if (!cancelled) setCatalogLoaded(true);
        });
    });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    const timer = window.setTimeout(() => {
      const persist = () => {
        try {
          localStorage.setItem(STORAGE_KEYS.ads, JSON.stringify(ads));
          localStorage.setItem(STORAGE_KEYS.brands, JSON.stringify(brands));
          localStorage.setItem(STORAGE_KEYS.boards, JSON.stringify(boards));
        } catch {
          // ignore quota errors
        }
      };
      const ric = (
        window as unknown as {
          requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
        }
      ).requestIdleCallback;
      if (typeof ric === "function") ric(persist, { timeout: 2000 });
      else persist();
    }, 800);
    return () => window.clearTimeout(timer);
  }, [ads, brands, boards, hydrated]);

  const handleOpenAd = useCallback((item: Ad) => {
    setActiveAdId(item.id);
  }, []);

  const handleToggleBoard = useCallback((adId: string, boardId: string) => {
    let adToArchive: Ad | null = null;
    setAds((prev) => {
      const existing = prev.find((a) => a.id === adId);
      if (!existing) return prev;
      const hasBoard = existing.board_ids.includes(boardId);
      const updatedAd: Ad = {
        ...existing,
        board_ids: hasBoard
          ? existing.board_ids.filter((id) => id !== boardId)
          : [...existing.board_ids, boardId],
      };
      syncCatalog({ action: "upsert_ad", ad: updatedAd });
      // Foreplay-style permanent archiving: whenever an ad is saved to a folder,
      // permanently mirror its expiring Meta CDN video & thumbnail into our own storage!
      if (
        !hasBoard &&
        (updatedAd.media_url.includes("fbcdn.net") ||
          updatedAd.thumbnail_url.includes("fbcdn.net"))
      ) {
        adToArchive = updatedAd;
      }
      return prev.map((a) => (a.id === adId ? updatedAd : a));
    });

    if (adToArchive) {
      const snapshot = adToArchive as Ad;
      fetch("/api/archive-media", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ad: snapshot }),
      })
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data?.ok && data.archived && data.ad) {
            setAds((prev) =>
              prev.map((a) =>
                a.id === snapshot.id
                  ? {
                      ...a,
                      media_url: data.ad.media_url,
                      thumbnail_url: data.ad.thumbnail_url,
                      fallback_image_url: data.ad.fallback_image_url,
                      audio_url: data.ad.audio_url,
                    }
                  : a
              )
            );
          }
        })
        .catch(() => {});
    }
  }, []);

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
        return dedupeAds([...freshAds, ...otherAds]);
      });
    }
    syncCatalog({
      action: "upsert_brand_and_ads",
      brand: updatedBrand,
      ads: freshAds || [],
    });
  };

  const handleAddBrandWithAds = (brand: Brand, discoveredAds: Ad[] = []) => {
    const cleanDiscovered = dedupeAds(discoveredAds);
    setBrands((prev) => [brand, ...prev.filter((b) => b.id !== brand.id)]);
    if (cleanDiscovered.length > 0) {
      setAds((prev) => dedupeAds([...cleanDiscovered, ...prev]));
      showToast(
        `${brand.name} scrapet + ${cleanDiscovered.length} live Meta-annoncer tilføjet!`
      );
    } else {
      showToast(`${brand.name} scrapet og tilføjet til Shops!`);
    }
    syncCatalog({
      action: "upsert_brand_and_ads",
      brand,
      ads: cleanDiscovered,
    });
  };

  const handleCreateBoard = (name: string, accentColor?: string) => {
    const palette = ["#0027eb", "#16a34a", "#d97706", "#e11d48", "#0284c7"];
    const board: Board = {
      id: `folder-${Date.now()}`,
      name,
      description: "Personlig folder til videoer og Meta ads",
      accent_color: accentColor || palette[boards.length % palette.length],
      created_at: new Date().toISOString(),
    };
    setBoards((prev) => [...prev, board]);
    syncCatalog({ action: "upsert_folder", folder: board });
    showToast(`Folder "${name}" oprettet`);
  };

  const handleUpdateBoard = (
    boardId: string,
    patch: { name: string; accent_color: string }
  ) => {
    const existing = boards.find((b) => b.id === boardId);
    if (!existing) return;
    const cleanName = patch.name.trim() || existing.name;
    const updated: Board = {
      ...existing,
      name: cleanName,
      accent_color: patch.accent_color || existing.accent_color,
    };
    setBoards((prev) => prev.map((b) => (b.id === boardId ? updated : b)));
    syncCatalog({ action: "upsert_folder", folder: updated });
    showToast(`Folder "${cleanName}" opdateret`);
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

  const handleAddCustomAd = (newAd: Ad) => {
    setAds((prev) => [newAd, ...prev.filter((a) => a.id !== newAd.id)]);
    syncCatalog({ action: "upsert_ad", ad: newAd });
    showToast(`Video tilføjet til folder`);
  };

  const openShopAnalytics = useCallback(
    (brandId: string) => {
      navigateWithSkeleton(() => {
        setSelectedShopId(brandId);
        setView("shops");
      });
    },
    [navigateWithSkeleton]
  );

  // Brand-relative Ad Rank & Impressions intelligence index across all deduplicated ads
  const dedupedAds = useMemo(() => dedupeAds(ads), [ads]);
  const adRankIndex = useMemo(
    () => buildAdRankIndex(dedupedAds, brands),
    [dedupedAds, brands]
  );

  // Filtered & sorted Explore ads (only tracked paid ads — excludes personal folder uploads / organic IG Reels)
  const visibleAds = useMemo(() => {
    const q = deferredSearch.trim().toLowerCase();
    const list = dedupedAds.filter((ad) => {
      if (
        ad.source_type === "instagram" ||
        ad.source_type === "manual" ||
        ad.tags.includes("custom-import") ||
        ad.tags.includes("custom-upload")
      ) {
        return false;
      }
      if (marketFilter === "DK" && ad.market !== "DK") return false;
      if (marketFilter === "US" && ad.market === "DK") return false;
      if (brandFilter !== "all" && ad.brand_id !== brandFilter) return false;
      if (mediaFilter !== "all") {
        const isRealCarousel =
          ad.display_format === "CAROUSEL" ||
          (ad.media_type === "carousel" && ad.display_format !== "DCO");
        if (mediaFilter === "carousel" && !isRealCarousel) return false;
        if (mediaFilter === "video" && ad.media_type !== "video") return false;
        if (
          mediaFilter === "image" &&
          (ad.media_type === "video" || isRealCarousel)
        ) {
          return false;
        }
      }
      if (timeFilter !== "all") {
        const days = getActiveDays(ad.started_running_at);
        if (timeFilter === "7d" && days > 7) return false;
        if (timeFilter === "30d" && days > 30) return false;
        if (timeFilter === "90d" && days > 90) return false;
      }
      if (rankMin !== null || rankMax !== null) {
        const meta = adRankIndex.get(ad.id);
        const br = meta?.brandRank ?? 999;
        if (rankMin !== null && br < rankMin) return false;
        if (rankMax !== null && br > rankMax) return false;
      }
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

    return sortAdsForExplore(list, adRankIndex, brandFilter !== "all");
  }, [
    dedupedAds,
    adRankIndex,
    marketFilter,
    brandFilter,
    mediaFilter,
    timeFilter,
    rankMin,
    rankMax,
    deferredSearch,
    sortBy,
  ]);

  const exploreMasonryColumns = useMemo(() => {
    const cols: { ad: Ad; idx: number }[][] = Array.from(
      { length: Math.max(1, masonryCols) },
      () => []
    );
    visibleAds.slice(0, visibleLimit).forEach((ad, idx) => {
      cols[idx % cols.length].push({ ad, idx });
    });
    return cols;
  }, [visibleAds, visibleLimit, masonryCols]);

  const activeFilterCount =
    (marketFilter !== "ALL" ? 1 : 0) + (mediaFilter !== "all" ? 1 : 0);

  // Predictive Instagram/TikTok-style media lookahead for Explore feed
  useEffect(() => {
    if (view !== "explore" || visibleAds.length === 0) return;
    preloadFeedWindow(visibleAds, Math.max(0, visibleLimit - 48), 40, 6);
  }, [view, visibleAds, visibleLimit]);

  // Bulletproof seamless infinite scroll for Explore (both IntersectionObserver + passive scroll listener)
  useEffect(() => {
    if (view !== "explore" || !catalogLoaded) return;
    if (visibleAds.length <= visibleLimit) return;

    const scrollCandidate = workspaceScrollRef.current;
    const overflowY = scrollCandidate
      ? window.getComputedStyle(scrollCandidate).overflowY
      : "";
    const scrollRoot =
      scrollCandidate && (overflowY === "auto" || overflowY === "scroll")
        ? scrollCandidate
        : null;

    let expanded = false;
    const loadNextBatch = () => {
      if (expanded) return;
      expanded = true;
      startTransition(() => {
        setVisibleLimit((prev) => Math.min(visibleAds.length, prev + 48));
      });
    };

    // 1. IntersectionObserver ~3 screens ahead of sentinel
    const node = loadMoreRef.current;
    let observer: IntersectionObserver | null = null;
    if (node) {
      observer = new IntersectionObserver(
        (entries) => {
          if (entries[0]?.isIntersecting) loadNextBatch();
        },
        { root: scrollRoot, rootMargin: "2600px 0px" }
      );
      observer.observe(node);
    }

    // 2. Passive rAF-throttled scroll fallback so fast flick-scrolling NEVER hits a roadblock
    let rafPending = false;
    const checkScrollDistance = () => {
      rafPending = false;
      if (expanded) return;
      if (scrollRoot) {
        const remaining =
          scrollRoot.scrollHeight - scrollRoot.scrollTop - scrollRoot.clientHeight;
        if (remaining < 2600) loadNextBatch();
      } else {
        const remaining =
          document.documentElement.scrollHeight -
          window.scrollY -
          window.innerHeight;
        if (remaining < 2600) loadNextBatch();
      }
    };

    const onScroll = () => {
      if (rafPending || expanded) return;
      rafPending = true;
      requestAnimationFrame(checkScrollDistance);
    };

    const target: EventTarget = scrollRoot || window;
    target.addEventListener("scroll", onScroll, { passive: true });
    // Also check immediately in case current viewport is already close to bottom
    const initRaf = requestAnimationFrame(checkScrollDistance);

    return () => {
      observer?.disconnect();
      target.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(initRaf);
    };
  }, [view, catalogLoaded, visibleAds.length, visibleLimit]);

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
    <div className="flex h-dvh w-full overflow-hidden bg-white lg:bg-[#050811]">
      {/* =====================================================================
          ADTRACK OBSIDIAN SIDEBAR — FIXED APP SHELL FRAME (EXTENDS 24PX UNDER ROUNDED CORNER)
         ===================================================================== */}
      <aside className="adtrack-sidebar relative hidden h-full w-[266px] shrink-0 flex-col py-5 pl-3.5 pr-[38px] text-white lg:flex">
        <SidebarPixelWave />
        {/* Brand Wordmark */}
        <button
          type="button"
          data-no-glass="true"
          onClick={() => {
            navigateWithSkeleton(() => {
              setView("shops");
              setSelectedShopId(null);
              setSelectedFolderId(null);
            });
          }}
          className="mb-7 flex items-center px-2.5 text-left"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/icons/flake-wordmark-white.png"
            alt="Flake"
            className="h-[19px] w-auto select-none"
          />
        </button>

        {/* SECTION 1: DISCOVER (Shops + Explore ONLY) */}
        <div className="space-y-1">
          <p className="px-3 pb-1.5 text-[10.5px] font-semibold uppercase tracking-[0.08em] text-white/35">
            Discover
          </p>

          <button
            type="button"
            onClick={() => {
              navigateWithSkeleton(() => {
                setView("shops");
                setSelectedShopId(null);
                setSelectedFolderId(null);
              });
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
              navigateWithSkeleton(() => {
                setView("explore");
                setSelectedShopId(null);
                setSelectedFolderId(null);
              });
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
              <Radar
                className="h-[17px] w-[17px]"
                style={{ color: view === "explore" ? "#60A5FA" : undefined }}
              />
              Ads
            </span>
          </button>
        </div>

        {/* SECTION 2: FOLDERS */}
        <div className="mt-7 flex min-h-0 flex-1 flex-col space-y-1">
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
              navigateWithSkeleton(() => {
                setView("folders");
                setSelectedFolderId(null);
                setSelectedShopId(null);
              });
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
              <Folder
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
          <div className="min-h-0 flex-1 space-y-0.5 overflow-y-auto pl-2 pt-1">
            {boards.map((board) => {
              const count = ads.filter((a) => a.board_ids.includes(board.id)).length;
              const active = view === "folders" && selectedFolderId === board.id;
              return (
                <button
                  key={board.id}
                  type="button"
                  onClick={() => {
                    navigateWithSkeleton(() => {
                      setSelectedFolderId(board.id);
                      setSelectedShopId(null);
                      setView("folders");
                    });
                  }}
                  className="flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-left text-[12.5px] transition-colors hover:bg-white/[0.06]"
                  style={
                    active
                      ? {
                          backgroundColor: "rgba(255,255,255,0.11)",
                          color: "#FFFFFF",
                          boxShadow: "inset 0 1px 0 rgba(255,255,255,0.14)",
                        }
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
          STATIONARY WORKSPACE FRAME — ONLY INNER <main> SCROLLS (MOBILE + DESKTOP)
         ===================================================================== */}
      <div className="flex h-full min-w-0 flex-1 flex-col overflow-hidden bg-white lg:relative lg:z-10 lg:-ml-6 lg:rounded-tl-[24px]">
        {/* STATIONARY SOLID WHITE MOBILE TOP BAR
            Locks the status bar + Flake brand bar above the scroll container so content
            never scrolls behind the iOS 26 Dynamic Island / top scroll-edge blur zone. */}
        <header className="mobile-pwa-header relative z-20 flex shrink-0 items-center border-b border-[#ECEFF5] bg-white px-4 pb-3 text-[#0F172A] lg:hidden">
          <button
            type="button"
            data-no-glass="true"
            onClick={() => {
              navigateWithSkeleton(() => {
                setView("shops");
                setSelectedShopId(null);
                setSelectedFolderId(null);
              });
            }}
            className="flex items-center"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/icons/flake-wordmark-dark.png"
              alt="Flake"
              className="h-[18px] w-auto select-none"
            />
          </button>
        </header>

        {/* SCROLLABLE WORKSPACE CONTENT VIEWPORT */}
        <main
          ref={workspaceScrollRef}
          data-scroll-root="true"
          className="workspace-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain bg-[#F7F8FB] px-3.5 py-4 pb-28 text-[#0F172A] sm:px-6 lg:bg-transparent lg:px-7 lg:py-6 lg:pb-12"
        >
          {/* Global Live Toast */}
          {toast && (
            <div className="mb-4 inline-flex items-center gap-2 rounded-xl border border-[#E2E6EF] bg-[#F8FAFC] px-3.5 py-2 text-xs font-semibold text-[#0F172A]">
              <Check className="h-3.5 w-3.5 text-[#16A34A]" />
              {toast}
            </div>
          )}

          {/* UNIFORM SKELETON LOADING ON INITIAL HYDRATION */}
          {!catalogLoaded ? (
            view === "explore" ? (
              <ExploreSkeleton />
            ) : view === "folders" ? (
              <FoldersSkeleton />
            ) : selectedShop ? (
              <ShopAnalyticsSkeleton />
            ) : (
              <ShopsSkeleton />
            )
          ) : (
            <>
          {/* =================================================================
              VIEW 1: SHOPS (Table Explorer + Full Trendtrack Shop Analytics)
             ================================================================= */}
          {view === "shops" && selectedShop && (
            <ShopAnalyticsView
              brand={selectedShop}
              ads={ads}
              boards={boards}
              onBack={() =>
                navigateWithSkeleton(() => {
                  setSelectedShopId(null);
                })
              }
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
              onOpenShop={openShopAnalytics}
              onAddBrand={handleAddBrandWithAds}
              onToggleBrandFolder={handleToggleBrandFolder}
            />
          )}

          {/* =================================================================
              VIEW 2: ADS (Clean Masonry Ad Discovery)
             ================================================================= */}
          {view === "explore" && (
            <div className="animate-view-in space-y-4">
              {/* Clean Minimal Header: Title + Live White Count Badge */}
              <div className="flex items-center gap-3">
                <h1 className="font-display text-[22px] font-bold leading-tight text-[#0F172A]">
                  Ads
                </h1>
                <span className="inline-flex items-center rounded-xl border border-[#ECEFF5] bg-white px-2.5 py-1 font-mono-num text-[12.5px] font-semibold text-[#334155] shadow-[0_2px_8px_rgba(15,23,42,0.06)]">
                  {visibleAds.length.toLocaleString("fr-FR")}
                </span>
              </div>

              {/* Single Clean Toolbar Row: Search Left · Sort / Brands / All time / Filters Right */}
              <div className="flex flex-col gap-2.5 lg:flex-row lg:items-center lg:justify-between">
                {/* Search brands or keywords */}
                <div className="relative w-full lg:w-[270px]">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#94A3B8]" />
                  <input
                    id="explore-search-input"
                    type="search"
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value);
                      setVisibleLimit(24);
                    }}
                    placeholder="Search brands or keywords"
                    className="w-full rounded-lg border border-[#E6E9F0] bg-white py-1.5 pl-8 pr-3 text-[16px] text-[#0F172A] outline-none transition-colors placeholder:text-[#94A3B8] focus:border-[#CBD5E1] sm:text-[12.5px]"
                  />
                </div>

                {/* Inline Clean Right Controls: Sort · Brands · All time · Filters */}
                <div className="flex flex-wrap items-center gap-1 text-[12.5px]">
                  {/* Sort */}
                  <div className="relative inline-flex items-center rounded-lg transition-colors hover:bg-[#F3F5F9]">
                    <Clock className="pointer-events-none absolute left-2.5 h-3.5 w-3.5 text-[#475569]" />
                    <select
                      aria-label="Sortér"
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as SortOption)}
                      className="cursor-pointer appearance-none bg-transparent py-1.5 pl-7.5 pr-6 text-[12.5px] font-medium text-[#1E293B] outline-none"
                    >
                      <option value="top">Top Performing</option>
                      <option value="newest">Newest</option>
                      <option value="longest">Longest Active</option>
                      <option value="duplicated">Most Duplicated</option>
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-2 h-3 w-3 text-[#94A3B8]" />
                  </div>

                  {/* Brands */}
                  <div className="relative inline-flex items-center rounded-lg transition-colors hover:bg-[#F3F5F9]">
                    <Building2 className="pointer-events-none absolute left-2.5 h-3.5 w-3.5 text-[#475569]" />
                    <select
                      aria-label="Vælg shop"
                      value={brandFilter}
                      onChange={(e) => {
                        setBrandFilter(e.target.value);
                        setVisibleLimit(24);
                      }}
                      className="max-w-[155px] cursor-pointer appearance-none truncate bg-transparent py-1.5 pl-7.5 pr-6 text-[12.5px] font-medium text-[#1E293B] outline-none"
                    >
                      <option value="all">{brands.length} Brands</option>
                      {brands.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-2 h-3 w-3 text-[#94A3B8]" />
                  </div>

                  {/* Timeframe */}
                  <div className="relative inline-flex items-center rounded-lg transition-colors hover:bg-[#F3F5F9]">
                    <Calendar className="pointer-events-none absolute left-2.5 h-3.5 w-3.5 text-[#475569]" />
                    <select
                      aria-label="Tidsperiode"
                      value={timeFilter}
                      onChange={(e) => {
                        setTimeFilter(e.target.value as "all" | "7d" | "30d" | "90d");
                        setVisibleLimit(24);
                      }}
                      className="cursor-pointer appearance-none bg-transparent py-1.5 pl-7.5 pr-6 text-[12.5px] font-medium text-[#1E293B] outline-none"
                    >
                      <option value="all">All time</option>
                      <option value="7d">Last 7 days</option>
                      <option value="30d">Last 30 days</option>
                      <option value="90d">Last 90 days</option>
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-2 h-3 w-3 text-[#94A3B8]" />
                  </div>

                  {/* Ad Rank Min-Max Popover (exact Konvert/Afterlib style) */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => {
                        setFiltersOpen(false);
                        setRankMinDraft(rankMin !== null ? String(rankMin) : "");
                        setRankMaxDraft(rankMax !== null ? String(rankMax) : "");
                        setRankOpen((v) => !v);
                      }}
                      className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[12.5px] font-medium transition-colors ${
                        rankMin !== null || rankMax !== null || rankOpen
                          ? "bg-[#F1F5F9] text-[#0F172A]"
                          : "text-[#1E293B] hover:bg-[#F3F5F9]"
                      }`}
                    >
                      <Award className="h-3.5 w-3.5 text-[#475569]" />
                      <span>
                        {rankMin !== null || rankMax !== null
                          ? `Rank ${rankMin ?? 1}–${rankMax ?? "∞"}`
                          : "Ad Rank"}
                      </span>
                      <ChevronDown
                        className={`h-3.5 w-3.5 text-[#64748B] transition-transform ${
                          rankOpen ? "rotate-180" : ""
                        }`}
                      />
                    </button>

                    {rankOpen && (
                      <div className="absolute right-0 top-10 z-40 w-[330px] overflow-hidden rounded-2xl border border-[#E6E9F0] bg-white shadow-[0_18px_40px_rgba(15,23,42,0.12)]">
                        <div className="space-y-3.5 p-4">
                          <div className="flex items-center gap-3">
                            <input
                              type="number"
                              min={1}
                              inputMode="numeric"
                              value={rankMinDraft}
                              onChange={(e) => setRankMinDraft(e.target.value)}
                              placeholder="Min"
                              className="w-full border-b border-[#E2E6EF] bg-transparent py-1.5 text-[14px] text-[#0F172A] outline-none placeholder:text-[#94A3B8] focus:border-[#0F172A]"
                            />
                            <span className="text-[#94A3B8]">-</span>
                            <input
                              type="number"
                              min={1}
                              inputMode="numeric"
                              value={rankMaxDraft}
                              onChange={(e) => setRankMaxDraft(e.target.value)}
                              placeholder="50"
                              className="w-full border-b border-[#E2E6EF] bg-transparent py-1.5 text-[14px] text-[#0F172A] outline-none placeholder:text-[#94A3B8] focus:border-[#0F172A]"
                            />
                          </div>

                          <div className="flex items-start gap-2.5 rounded-xl border border-[#ECEFF5] bg-[#FAFBFD] p-3 text-[12px] leading-[1.45] text-[#475569]">
                            <Info className="mt-0.5 h-4 w-4 shrink-0 text-[#94A3B8]" />
                            <p>
                              Ads are ranked by comparing impressions to other ads from their brand. The lower the rank, the better the ad is performing.
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center justify-between border-t border-[#ECEFF5] px-4 py-3">
                          <button
                            type="button"
                            onClick={() => {
                              setRankMin(null);
                              setRankMax(null);
                              setRankMinDraft("");
                              setRankMaxDraft("");
                              setVisibleLimit(24);
                              setRankOpen(false);
                            }}
                            className="text-[13px] font-medium text-[#334155] transition-colors hover:text-[#0F172A]"
                          >
                            Clear
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const parsedMin = parseInt(rankMinDraft, 10);
                              const parsedMax = parseInt(rankMaxDraft, 10);
                              setRankMin(Number.isFinite(parsedMin) && parsedMin > 0 ? parsedMin : null);
                              setRankMax(Number.isFinite(parsedMax) && parsedMax > 0 ? parsedMax : null);
                              setVisibleLimit(24);
                              setRankOpen(false);
                            }}
                            className="rounded-xl bg-[#0F172A] px-4 py-1.5 text-[13px] font-semibold text-white transition-colors hover:bg-[#1E293B]"
                          >
                            Apply
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Filters Popover (Market + Format) */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => {
                        setRankOpen(false);
                        setFiltersOpen((v) => !v);
                      }}
                      className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[12.5px] font-medium transition-colors ${
                        activeFilterCount > 0 || filtersOpen
                          ? "bg-[#F1F5F9] text-[#0F172A]"
                          : "text-[#1E293B] hover:bg-[#F3F5F9]"
                      }`}
                    >
                      <ListFilter className="h-3.5 w-3.5 text-[#475569]" />
                      <span>Filters</span>
                      {activeFilterCount > 0 && (
                        <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-[#0F172A] px-1 font-mono-num text-[10px] font-bold text-white">
                          {activeFilterCount}
                        </span>
                      )}
                      <ChevronDown
                        className={`h-3.5 w-3.5 text-[#64748B] transition-transform ${
                          filtersOpen ? "rotate-180" : ""
                        }`}
                      />
                    </button>

                    {filtersOpen && (
                      <div className="absolute right-0 top-10 z-40 w-64 rounded-2xl border border-[#E6E9F0] bg-white p-3.5 shadow-[0_18px_40px_rgba(15,23,42,0.12)]">
                        <div className="space-y-3.5">
                          <div>
                            <p className="mb-1.5 text-[10.5px] font-semibold uppercase tracking-wider text-[#64748B]">
                              Marked
                            </p>
                            <div className="grid grid-cols-3 gap-1 rounded-xl bg-[#F3F4F6] p-1 text-xs font-medium">
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
                                  className={`rounded-lg py-1 transition-all ${
                                    marketFilter === m.id
                                      ? "bg-white font-semibold text-[#0F172A] shadow-xs"
                                      : "text-[#64748B] hover:text-[#0F172A]"
                                  }`}
                                >
                                  {m.label}
                                </button>
                              ))}
                            </div>
                          </div>

                          <div>
                            <p className="mb-1.5 text-[10.5px] font-semibold uppercase tracking-wider text-[#64748B]">
                              Format
                            </p>
                            <div className="grid grid-cols-2 gap-1.5 text-xs font-medium">
                              {(["all", "video", "image", "carousel"] as const).map((fmt) => (
                                <button
                                  key={fmt}
                                  type="button"
                                  onClick={() => {
                                    setMediaFilter(fmt);
                                    setVisibleLimit(24);
                                  }}
                                  className={`rounded-lg border px-2.5 py-1.5 capitalize transition-colors ${
                                    mediaFilter === fmt
                                      ? "border-[#0F172A] bg-[#0F172A] text-white"
                                      : "border-[#E6E9F0] bg-white text-[#475569] hover:bg-[#F8FAFC]"
                                  }`}
                                >
                                  {fmt === "all" ? "Alle formater" : fmt}
                                </button>
                              ))}
                            </div>
                          </div>

                          {activeFilterCount > 0 && (
                            <button
                              type="button"
                              onClick={() => {
                                setMarketFilter("ALL");
                                setMediaFilter("all");
                                setVisibleLimit(24);
                              }}
                              className="w-full rounded-lg border border-[#E6E9F0] py-1.5 text-xs font-semibold text-[#475569] hover:bg-[#F8FAFC] hover:text-[#0F172A]"
                            >
                              Nulstil filtre
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* KONVERT-STYLE 4-COLUMN HORIZONTAL MASONRY FEED */}
              <div className="grid grid-cols-1 items-start gap-3.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {exploreMasonryColumns.map((col, colIdx) => (
                  <div key={colIdx} className="flex flex-col gap-3.5">
                    {col.map(({ ad, idx }) => (
                      <AdCard
                        key={ad.id}
                        ad={ad}
                        boards={boards}
                        rank={idx < 3 ? idx + 1 : undefined}
                        onOpen={handleOpenAd}
                        onToggleBoard={handleToggleBoard}
                        onOpenBrand={openShopAnalytics}
                      />
                    ))}
                  </div>
                ))}
              </div>

              {/* Seamless Infinite Scroll Sentinel (triggers ~3 screens ahead so user never hits a wall) */}
              {visibleAds.length > visibleLimit && (
                <div
                  ref={loadMoreRef}
                  className="h-8 w-full"
                  aria-hidden="true"
                />
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
            </div>
          )}

          {/* =================================================================
              VIEW 3: FOLDERS
             ================================================================= */}
          {view === "folders" && (
            <div className="animate-view-in">
              <CollectionsView
                boards={boards}
                ads={ads}
                brands={brands}
                selectedFolderId={selectedFolderId}
                onSelectFolder={(id) =>
                  navigateWithSkeleton(() => setSelectedFolderId(id))
                }
                onCreateBoard={handleCreateBoard}
                onUpdateBoard={handleUpdateBoard}
                onDeleteBoard={handleDeleteBoard}
                onOpenShop={openShopAnalytics}
                onOpenAd={(ad) => setActiveAdId(ad.id)}
                onToggleBoard={handleToggleBoard}
                onAddCustomAd={handleAddCustomAd}
              />
            </div>
          )}
            </>
          )}
        </main>
      </div>
    </div>

      {/* =====================================================================
          FLOATING iOS 26 LIQUID GLASS TAB BAR — SHOPS, EXPLORE, FOLDERS
         ===================================================================== */}
      <div
        className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center px-4 pt-1 lg:hidden"
        style={{
          paddingBottom: "max(0.75rem, calc(env(safe-area-inset-bottom) * 0.72))",
        }}
      >
        <GlassTabBar
          aria-label="Hovednavigation"
          value={view}
          onValueChange={(next) => {
            const target = next as ActiveView;
            navigateWithSkeleton(() => {
              setView(target);
              setSelectedShopId(null);
              if (target !== "folders") setSelectedFolderId(null);
              scrollWorkspaceToTop(true);
            });
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
            icon={<Radar strokeWidth={view === "explore" ? 2.25 : 1.85} />}
            label="Ads"
          />
          <GlassTabBarItem
            value="folders"
            icon={<Folder strokeWidth={view === "folders" ? 2.25 : 1.85} />}
            label="Folders"
          />
        </GlassTabBar>
      </div>

      {/* AD DETAIL SHEET */}
      <AdDetailSheet
        ad={activeAd}
        rankMeta={activeAd ? adRankIndex.get(activeAd.id) : undefined}
        adsList={
          selectedShop
            ? dedupedAds.filter((a) => a.brand_id === selectedShop.id)
            : visibleAds
        }
        boards={boards}
        onClose={() => setActiveAdId(null)}
        onSelectAd={(id) => setActiveAdId(id)}
        onUpdateAd={handleUpdateAd}
        onToggleBoard={handleToggleBoard}
        onOpenBrand={openShopAnalytics}
      />
    </>
  );
}
