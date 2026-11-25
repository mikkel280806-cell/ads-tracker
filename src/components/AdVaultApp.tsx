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
  ArrowUpDown,
  Award,
  Building2,
  Calendar,
  Check,
  ChevronDown,
  ChevronsUpDown,
  Folder,
  Hammer,
  Info,
  ListFilter,
  PackagePlus,
  Plus,
  Radar,
  Search,
  Store,
  Users,
  X,
} from "lucide-react";
import type { Ad, Board, Brand, ConnectorStatus, MarketCode } from "@/lib/types";
import { SEED_ADS, SEED_BRANDS } from "@/lib/seed-data";
import { dedupeAds, getActiveDays } from "@/lib/url-parser";
import { buildAdRankIndex, sortAdsForExplore } from "@/lib/ad-ranking";
import {
  adMatchesAgeBucket,
  getCountryDisplay,
  summarizeAdAudience,
} from "@/lib/audience-insights";
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
import {
  FlakePopover,
  FlakeSelect,
  type FlakeSelectOption,
} from "@/components/ui/FlakeDropdown";

type ActiveView = "shops" | "explore" | "folders";
type SortOption = "top" | "reach" | "longest" | "duplicated" | "newest";
type MinReachFilter = "all" | "10k" | "50k" | "100k" | "500k";
type GenderFilter = "all" | "Women" | "Men" | "All";
type AgeFilter = "all" | "18-24" | "25-34" | "35-44" | "45-54" | "55+";

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
  const [platformFilter, setPlatformFilter] = useState<string>("all");
  const [countryFilter, setCountryFilter] = useState<string>("all");
  const [genderFilter, setGenderFilter] = useState<GenderFilter>("all");
  const [ageFilter, setAgeFilter] = useState<AgeFilter>("all");
  const [minReachFilter, setMinReachFilter] = useState<MinReachFilter>("all");
  const [scaledOnly, setScaledOnly] = useState<boolean>(false);
  const [brandFilter, setBrandFilter] = useState<string>("all");
  const [timeFilter, setTimeFilter] = useState<"all" | "7d" | "30d" | "90d">("all");
  const [rankMin, setRankMin] = useState<number | null>(null);
  const [rankMax, setRankMax] = useState<number | null>(null);
  const [rankMinDraft, setRankMinDraft] = useState("");
  const [rankMaxDraft, setRankMaxDraft] = useState("");
  const [rankOpen, setRankOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const rankTriggerRef = useRef<HTMLButtonElement | null>(null);
  const filtersTriggerRef = useRef<HTMLButtonElement | null>(null);
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

  const fullAdsLoadedRef = useRef(false);
  const loadedBrandAdsRef = useRef<Set<string>>(new Set());

  const syncCatalog = async (payload: Record<string, unknown>): Promise<boolean> => {
    try {
      const res = await fetch("/api/catalog", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      return res.ok;
    } catch {
      return false;
    }
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
      let hadCachedBrands = false;
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
            hadCachedBrands = true;
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
              .filter(
                (b) =>
                  !removedIds.has(b.id) &&
                  b.id !== "custom-media" &&
                  b.is_tracked !== false
              )
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
      // Instant paint on repeat visits when localStorage already has the shop catalog
      if (hadCachedBrands) {
        setCatalogLoaded(true);
      }

      // Stage 1 (~350ms): Fast bootstrap with all 37 brands + folders + saved ads + newest 220 ads
      fetch("/api/catalog?mode=fast", { cache: "no-store" })
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (cancelled || !data) return;
          if (data.synced) {
            if (Array.isArray(data.brands) && data.brands.length > 0) {
              setBrands(data.brands);
            }
            if (Array.isArray(data.folders)) {
              setBoards(data.folders);
            }
            if (Array.isArray(data.ads) && data.ads.length > 0) {
              startTransition(() => {
                setAds((prev) => {
                  const fastMap = new Map<string, Ad>();
                  for (const a of data.ads as Ad[]) fastMap.set(a.id, a);
                  // Keep any already-cached ads until Stage 2 replaces with the complete DB catalog
                  for (const a of prev) {
                    if (!fastMap.has(a.id)) fastMap.set(a.id, a);
                  }
                  return dedupeAds(Array.from(fastMap.values()));
                });
              });
            }
          }
          if (!cancelled) setCatalogLoaded(true);

          // Stage 2 (non-blocking background): Stream all ads in fast 500-row chunks (~450ms each, zero DB timeouts)
          if (data.synced) {
            const totalExpected =
              typeof data.totalAdsCount === "number" && data.totalAdsCount > 0
                ? data.totalAdsCount
                : 7000;
            const CHUNK_SIZE = 500;
            const totalPages = Math.min(20, Math.ceil(totalExpected / CHUNK_SIZE));

            (async () => {
              const collected: Ad[] = [];
              const CONCURRENCY = 2;
              for (let start = 0; start < totalPages; start += CONCURRENCY) {
                if (cancelled) return;
                const batchPages = Array.from(
                  { length: Math.min(CONCURRENCY, totalPages - start) },
                  (_, idx) => start + idx
                );
                const results = await Promise.all(
                  batchPages.map((p) =>
                    fetch(`/api/catalog?mode=ads&page=${p}&limit=${CHUNK_SIZE}`, {
                      cache: "no-store",
                    })
                      .then((r) => (r.ok ? r.json() : null))
                      .catch(() => null)
                  )
                );
                if (cancelled) return;
                let reachedEnd = false;
                const newlyFetched: Ad[] = [];
                for (const res of results) {
                  if (res?.synced && Array.isArray(res.ads)) {
                    newlyFetched.push(...(res.ads as Ad[]));
                    collected.push(...(res.ads as Ad[]));
                    if (!res.hasMore) reachedEnd = true;
                  }
                }
                if (newlyFetched.length > 0) {
                  startTransition(() => {
                    setAds((prev) => {
                      const byId = new Map<string, Ad>();
                      for (const a of prev) byId.set(a.id, a);
                      for (const a of newlyFetched) {
                        const existing = byId.get(a.id);
                        byId.set(
                          a.id,
                          existing
                            ? {
                                ...a,
                                board_ids:
                                  existing.board_ids?.length > 0
                                    ? existing.board_ids
                                    : a.board_ids,
                                user_notes: existing.user_notes || a.user_notes,
                              }
                            : a
                        );
                      }
                      return dedupeAds(Array.from(byId.values()));
                    });
                  });
                }
                if (reachedEnd) break;
              }
              if (!cancelled && collected.length > 0) {
                fullAdsLoadedRef.current = true;
              }
            })();
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
          localStorage.setItem(STORAGE_KEYS.brands, JSON.stringify(brands));
          localStorage.setItem(STORAGE_KEYS.boards, JSON.stringify(boards));
          // Keep lightweight localStorage cache (saved folder ads first + newest 200, stripping heavy audience_breakdown)
          const savedInFolders = ads.filter((a) => a.board_ids && a.board_ids.length > 0);
          const rest = ads.filter((a) => !a.board_ids || a.board_ids.length === 0).slice(0, 200);
          const leanCache = [...savedInFolders, ...rest].slice(0, 240).map((a) => {
            if (!a.audience_breakdown) return a;
            const copy = { ...a };
            delete copy.audience_breakdown;
            return copy;
          });
          localStorage.setItem(STORAGE_KEYS.ads, JSON.stringify(leanCache));
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

  const handleDeleteAd = (adId: string) => {
    setAds((prev) => prev.filter((a) => a.id !== adId));
    if (activeAdId === adId) setActiveAdId(null);
    syncCatalog({ action: "delete_ad", adId });
    showToast("Medie slettet");
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
    void syncCatalog({ action: "upsert_ad", ad: newAd }).then((ok) => {
      if (ok) {
        showToast("Medie gemt i folder");
      } else {
        showToast("Advarsel: Kunne ikke gemme medie i databasen");
      }
    });
  };

  const openShopAnalytics = useCallback(
    (brandId: string) => {
      navigateWithSkeleton(() => {
        setSelectedShopId(brandId);
        setView("shops");
      });
      // If background full catalog hasn't finished yet, fetch this shop's complete ads in ~200ms
      if (!fullAdsLoadedRef.current && !loadedBrandAdsRef.current.has(brandId)) {
        loadedBrandAdsRef.current.add(brandId);
        fetch(`/api/catalog?brandId=${encodeURIComponent(brandId)}`, { cache: "no-store" })
          .then((res) => (res.ok ? res.json() : null))
          .then((data) => {
            if (!data?.synced || !Array.isArray(data.ads) || data.ads.length === 0) return;
            startTransition(() => {
              setAds((prev) => dedupeAds([...(data.ads as Ad[]), ...prev]));
            });
          })
          .catch(() => {
            loadedBrandAdsRef.current.delete(brandId);
          });
      }
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
          Array.isArray(ad.carousel_cards) && ad.carousel_cards.length >= 2;
        if (mediaFilter === "carousel" && !isRealCarousel) return false;
        if (mediaFilter === "video" && (ad.media_type !== "video" || isRealCarousel)) return false;
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
      if (platformFilter !== "all") {
        if (!(ad.platforms || []).includes(platformFilter)) return false;
      }
      if (countryFilter !== "all") {
        const inTargeted = (ad.targeted_countries || []).includes(countryFilter);
        const inBreakdown = (ad.audience_breakdown || []).some(
          (b) => b.country === countryFilter
        );
        if (!inTargeted && !inBreakdown) return false;
      }
      if (genderFilter !== "all") {
        const aud = summarizeAdAudience(ad);
        if (!aud.hasBreakdown && !aud.targetGender) return false;
        if (aud.dominantGender !== genderFilter) return false;
      }
      if (ageFilter !== "all") {
        if (!adMatchesAgeBucket(ad, ageFilter)) return false;
      }
      if (minReachFilter !== "all") {
        const reach = ad.eu_reach || 0;
        const threshold =
          minReachFilter === "500k"
            ? 500_000
            : minReachFilter === "100k"
              ? 100_000
              : minReachFilter === "50k"
                ? 50_000
                : 10_000;
        if (reach < threshold) return false;
      }
      if (scaledOnly && (ad.duplicated_count || 1) < 3) {
        return false;
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
        if (sortBy === "reach") {
          const diff = (b.eu_reach || 0) - (a.eu_reach || 0);
          if (diff !== 0) return diff;
          return (
            (adRankIndex.get(b.id)?.winnerScore || 0) -
            (adRankIndex.get(a.id)?.winnerScore || 0)
          );
        }
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
    platformFilter,
    countryFilter,
    genderFilter,
    ageFilter,
    minReachFilter,
    scaledOnly,
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
    (mediaFilter !== "all" ? 1 : 0) +
    (platformFilter !== "all" ? 1 : 0) +
    (countryFilter !== "all" ? 1 : 0) +
    (genderFilter !== "all" ? 1 : 0) +
    (ageFilter !== "all" ? 1 : 0) +
    (minReachFilter !== "all" ? 1 : 0) +
    (scaledOnly ? 1 : 0);

  const hasAnyAdsFilter =
    marketFilter !== "ALL" ||
    brandFilter !== "all" ||
    timeFilter !== "all" ||
    activeFilterCount > 0 ||
    rankMin !== null ||
    rankMax !== null ||
    search.trim().length > 0;

  const resetAllAdsFilters = () => {
    setMarketFilter("ALL");
    setBrandFilter("all");
    setTimeFilter("all");
    setMediaFilter("all");
    setPlatformFilter("all");
    setCountryFilter("all");
    setGenderFilter("all");
    setAgeFilter("all");
    setMinReachFilter("all");
    setScaledOnly(false);
    setRankMin(null);
    setRankMax(null);
    setRankMinDraft("");
    setRankMaxDraft("");
    setSearch("");
    setVisibleLimit(48);
  };

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

  const paidAds = useMemo(
    () =>
      dedupedAds.filter(
        (ad) =>
          ad.source_type !== "instagram" &&
          ad.source_type !== "manual" &&
          !ad.tags.includes("custom-import") &&
          !ad.tags.includes("custom-upload")
      ),
    [dedupedAds]
  );
  const dkAdsCount = useMemo(
    () => paidAds.filter((a) => a.market === "DK").length,
    [paidAds]
  );
  const usAdsCount = useMemo(
    () => paidAds.filter((a) => a.market !== "DK").length,
    [paidAds]
  );

  const availableAdCountries = useMemo(() => {
    const counts = new Map<string, number>();
    for (const ad of paidAds) {
      const codes = new Set<string>();
      for (const c of ad.targeted_countries || []) codes.add(c);
      for (const b of ad.audience_breakdown || []) codes.add(b.country);
      for (const code of codes) {
        if (code) counts.set(code, (counts.get(code) || 0) + 1);
      }
    }
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 12)
      .map(([code, count]) => ({ ...getCountryDisplay(code), count }));
  }, [paidAds]);

  const sortSelectOptions = useMemo<FlakeSelectOption[]>(
    () => [
      { value: "top", label: "Top Performing" },
      { value: "reach", label: "Highest Reach" },
      { value: "newest", label: "Newest" },
      { value: "longest", label: "Longest Active" },
      { value: "duplicated", label: "Most Duplicated" },
    ],
    []
  );

  const brandSelectOptions = useMemo<FlakeSelectOption[]>(
    () => [
      { value: "all", label: `${brands.length} Brands` },
      ...brands.map((b) => ({
        value: b.id,
        label: b.name,
        icon: b.logo_url ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={b.logo_url}
            alt=""
            className="h-4 w-4 rounded-full border border-[#ECEFF5] bg-white object-contain p-[1px]"
          />
        ) : (
          <span
            className="flex h-4 w-4 items-center justify-center rounded-full text-[8px] font-bold text-white"
            style={{ backgroundColor: b.avatar_color || "#0F172A" }}
          >
            {b.avatar_initials.slice(0, 2)}
          </span>
        ),
      })),
    ],
    [brands]
  );

  const timeSelectOptions = useMemo<FlakeSelectOption[]>(
    () => [
      { value: "all", label: "All time" },
      { value: "7d", label: "Last 7 days" },
      { value: "30d", label: "Last 30 days" },
      { value: "90d", label: "Last 90 days" },
    ],
    []
  );

  return (
    <>
    {/* COMPACT FIXED SOLID WHITE MOBILE TOP BAR (root-level fixed at top: 0 for WebKit edge sampling, Antigravity-tight height) */}
    <header className="mobile-pwa-header fixed inset-x-0 top-0 z-40 flex items-center border-b border-[#E6E9F0] bg-white px-4 pb-2.5 text-[#0F172A] lg:hidden">
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
          className="h-[22px] w-auto select-none"
        />
      </button>
    </header>
    <div className="flake-app-shell flex w-full overflow-hidden bg-[#F7F8FB] lg:bg-[#050811]">
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
              <Store className="h-[17px] w-[17px]" />
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
              <Radar className="h-[17px] w-[17px]" />
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
              <Folder className="h-[17px] w-[17px]" />
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

        {/* Bottom Sidebar Footer: Chrome Extension + Request a Feature + Affiliate + Profile Placeholder */}
        <div className="relative z-10 mt-3 shrink-0 space-y-1 border-t border-white/[0.08] pt-3">
          <button
            type="button"
            data-no-glass="true"
            className="flex w-full items-center justify-between gap-2 rounded-xl px-2.5 py-2.5 text-left text-[13px] font-medium text-white/85 transition-colors hover:bg-white/[0.06] hover:text-white"
          >
            <span className="flex min-w-0 items-center gap-2.5">
              <PackagePlus className="h-[17px] w-[17px] shrink-0 text-white/75" />
              <span className="truncate">Chrome extension</span>
            </span>
            <span className="my-0.5 inline-flex shrink-0 items-center justify-center rounded-full bg-gradient-to-b from-[#233985]/70 to-[#162457]/75 px-2 py-0.5 text-[10px] font-semibold leading-none tracking-[0.01em] text-[#B9CBFF] ring-1 ring-[#6B88FF]/25 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]">
              New
            </span>
          </button>

          <button
            type="button"
            data-no-glass="true"
            className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-[13px] font-medium text-white/85 transition-colors hover:bg-white/[0.06] hover:text-white"
          >
            <Hammer className="h-[17px] w-[17px] shrink-0 text-white/75" />
            <span className="truncate">Request a feature</span>
          </button>

          <button
            type="button"
            data-no-glass="true"
            className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-[13px] font-medium text-white/85 transition-colors hover:bg-white/[0.06] hover:text-white"
          >
            <Users className="h-[17px] w-[17px] shrink-0 text-white/75" />
            <span className="truncate">Affiliate program</span>
          </button>

          <button
            type="button"
            data-no-glass="true"
            className="!mt-4 flex w-full items-center justify-between gap-2.5 rounded-xl px-2 py-2 text-left transition-colors hover:bg-white/[0.06]"
          >
            <span className="flex min-w-0 items-center gap-2.5">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#2A3142] font-display text-[13px] font-bold text-white ring-1 ring-white/15">
                M
              </span>
              <span className="min-w-0">
                <span className="block truncate font-display text-[13px] font-semibold leading-tight text-white">
                  Mikkel Petersen
                </span>
                <span className="block truncate text-[11px] leading-tight text-white/50">
                  mikkel280806@gmail.com
                </span>
              </span>
            </span>
            <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 text-white/45" />
          </button>
        </div>
      </aside>

      {/* =====================================================================
          STATIONARY WORKSPACE FRAME — ONLY INNER <main> SCROLLS (MOBILE + DESKTOP)
         ===================================================================== */}
      <div className="flex h-full min-w-0 flex-1 flex-col overflow-hidden bg-[#F7F8FB] lg:relative lg:z-10 lg:-ml-6 lg:rounded-tl-[24px] lg:bg-white">
        {/* SCROLLABLE WORKSPACE CONTENT VIEWPORT */}
        <main
          ref={workspaceScrollRef}
          data-scroll-root="true"
          className="workspace-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain bg-[#F7F8FB] px-3.5 pt-[calc(env(safe-area-inset-top,0px)+58px)] pb-[calc(7rem+env(safe-area-inset-bottom,0px))] text-[#0F172A] sm:px-6 lg:bg-transparent lg:px-7 lg:py-6 lg:pb-12"
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
              {/* Header: Title + live count left · Centered top search middle · balanced spacer right */}
              <div className="grid grid-cols-1 items-center gap-3 md:grid-cols-[1fr_minmax(260px,420px)_1fr]">
                <div className="flex items-center gap-3">
                  <h1 className="font-display text-[22px] font-bold leading-tight text-[#0F172A]">
                    Ads
                  </h1>
                  <span className="inline-flex items-center rounded-xl border border-[#ECEFF5] bg-white px-2.5 py-1 font-mono-num text-[12.5px] font-semibold text-[#334155] shadow-[0_2px_8px_rgba(15,23,42,0.06)]">
                    {visibleAds.length.toLocaleString("fr-FR")}
                  </span>
                </div>

                {/* Centered Top Search Bar */}
                <div className="relative w-full">
                  <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94A3B8]" />
                  <input
                    id="explore-search-input"
                    type="search"
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value);
                      setVisibleLimit(24);
                    }}
                    placeholder="Search brands or keywords..."
                    className="w-full rounded-xl border border-[#E6E9F0] bg-white py-2 pl-9.5 pr-8 text-[16px] text-[#0F172A] shadow-[0_1px_3px_rgba(15,23,42,0.03)] outline-none transition-all placeholder:text-[#94A3B8] focus:border-[#CBD5E1] focus:shadow-[0_4px_14px_-4px_rgba(15,23,42,0.08)] sm:text-[13px]"
                  />
                  {search && (
                    <button
                      type="button"
                      data-no-glass="true"
                      onClick={() => {
                        setSearch("");
                        setVisibleLimit(24);
                      }}
                      aria-label="Clear search"
                      className="absolute right-2.5 top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded-full text-[#94A3B8] transition-colors hover:bg-[#F1F5F9] hover:text-[#475569]"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>

                <div className="hidden md:block" />
              </div>

              {/* UNIFIED FILTER BAR — Exact same layout & bordered pill design as Shops */}
              <div className="space-y-2.5 lg:flex lg:items-center lg:justify-between lg:gap-3 lg:space-y-0">
                {/* Clean Segmented Market Control (Alle · DK · US & Global) */}
                <div className="grid grid-cols-3 rounded-xl bg-[#EFEFF4] p-1 text-xs font-semibold lg:inline-flex lg:w-fit">
                  {[
                    { id: "ALL" as const, label: "Alle", count: paidAds.length },
                    { id: "DK" as const, label: "DK", count: dkAdsCount },
                    { id: "US" as const, label: "US & Global", count: usAdsCount },
                  ].map((m) => {
                    const active = marketFilter === m.id;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => {
                          setMarketFilter(m.id);
                          setVisibleLimit(48);
                        }}
                        className={`inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-lg px-2.5 py-1.5 transition-all lg:px-3 ${
                          active
                            ? "bg-white text-[#0F172A] shadow-xs"
                            : "text-[#64748B] hover:text-[#0F172A]"
                        }`}
                      >
                        <span>{m.label}</span>
                        <span
                          className={`font-mono-num text-[10.5px] font-semibold ${
                            active ? "text-[#475569]" : "text-[#94A3B8]"
                          }`}
                        >
                          {m.count.toLocaleString("fr-FR")}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Right Bordered Controls: 2x2 symmetrical grid + full-width sort on mobile, single inline row on desktop */}
                <div className="grid grid-cols-2 gap-2 lg:flex lg:flex-wrap lg:items-center lg:gap-1.5">
                  {/* Brands */}
                  <FlakeSelect
                    ariaLabel="Vælg shop"
                    value={brandFilter}
                    onChange={(val) => {
                      setBrandFilter(val);
                      setVisibleLimit(48);
                    }}
                    options={brandSelectOptions}
                    icon={<Building2 className="h-3.5 w-3.5 text-[#475569]" />}
                    variant="bordered"
                    align="left"
                    menuWidth={240}
                    isActive={brandFilter !== "all"}
                    triggerClassName="lg:max-w-[170px]"
                  />

                  {/* Timeframe */}
                  <FlakeSelect
                    ariaLabel="Tidsperiode"
                    value={timeFilter}
                    onChange={(val) => {
                      setTimeFilter(val as "all" | "7d" | "30d" | "90d");
                      setVisibleLimit(48);
                    }}
                    options={timeSelectOptions}
                    icon={<Calendar className="h-3.5 w-3.5 text-[#475569]" />}
                    variant="bordered"
                    align="right"
                    menuWidth={195}
                    isActive={timeFilter !== "all"}
                  />

                  {/* Ad Rank Min-Max Popover (bordered pill matching Shops) */}
                  <div className="relative">
                    <button
                      ref={rankTriggerRef}
                      type="button"
                      onClick={() => {
                        setFiltersOpen(false);
                        setRankMinDraft(rankMin !== null ? String(rankMin) : "");
                        setRankMaxDraft(rankMax !== null ? String(rankMax) : "");
                        setRankOpen((v) => !v);
                      }}
                      className={`inline-flex w-full items-center justify-between gap-1.5 rounded-xl border bg-white px-3 py-2 text-[13px] font-medium transition-colors lg:w-auto lg:text-xs ${
                        rankMin !== null || rankMax !== null || rankOpen
                          ? "border-[#CBD5E1] text-[#0F172A]"
                          : "border-[#E6E9F0] text-[#334155] hover:border-[#CBD5E1]"
                      }`}
                    >
                      <span className="inline-flex min-w-0 items-center gap-1.5">
                        <Award className="h-3.5 w-3.5 shrink-0 text-[#475569]" />
                        <span className="truncate">
                          {rankMin !== null || rankMax !== null
                            ? `Rank ${rankMin ?? 1}–${rankMax ?? "∞"}`
                            : "Ad Rank"}
                        </span>
                      </span>
                      <ChevronDown
                        className={`h-3.5 w-3.5 shrink-0 text-[#64748B] transition-transform duration-150 ${
                          rankOpen ? "rotate-180" : ""
                        }`}
                      />
                    </button>

                    <FlakePopover
                      open={rankOpen}
                      onOpenChange={setRankOpen}
                      anchorRef={rankTriggerRef}
                      align="right"
                      width={330}
                    >
                      <div className="space-y-3.5 p-4">
                        <div className="flex items-center gap-3">
                          <input
                            type="number"
                            min={1}
                            inputMode="numeric"
                            value={rankMinDraft}
                            onChange={(e) => setRankMinDraft(e.target.value)}
                            placeholder="Min"
                            className="w-full border-b border-[#E2E6EF] bg-transparent py-1.5 text-[16px] text-[#0F172A] outline-none placeholder:text-[#94A3B8] focus:border-[#0F172A] sm:text-[14px]"
                          />
                          <span className="text-[#94A3B8]">-</span>
                          <input
                            type="number"
                            min={1}
                            inputMode="numeric"
                            value={rankMaxDraft}
                            onChange={(e) => setRankMaxDraft(e.target.value)}
                            placeholder="50"
                            className="w-full border-b border-[#E2E6EF] bg-transparent py-1.5 text-[16px] text-[#0F172A] outline-none placeholder:text-[#94A3B8] focus:border-[#0F172A] sm:text-[14px]"
                          />
                        </div>

                        <div className="flex items-start gap-2.5 rounded-xl border border-[#ECEFF5] bg-[#FAFBFD] p-3 text-[12px] leading-[1.45] text-[#475569]">
                          <Info className="mt-0.5 h-4 w-4 shrink-0 text-[#94A3B8]" />
                          <p>
                            Ads are ranked within each brand by reach, scaling and active runtime. The lower the rank, the stronger the ad is performing.
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
                            setVisibleLimit(48);
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
                            setVisibleLimit(48);
                            setRankOpen(false);
                          }}
                          className="rounded-xl bg-[#0F172A] px-4 py-1.5 text-[13px] font-semibold text-white transition-colors hover:bg-[#1E293B]"
                        >
                          Apply
                        </button>
                      </div>
                    </FlakePopover>
                  </div>

                  {/* Filters Popover (Format, bordered pill matching Shops) */}
                  <div className="relative">
                    <button
                      ref={filtersTriggerRef}
                      type="button"
                      onClick={() => {
                        setRankOpen(false);
                        setFiltersOpen((v) => !v);
                      }}
                      className={`inline-flex w-full items-center justify-between gap-1.5 rounded-xl border bg-white px-3 py-2 text-[13px] font-medium transition-colors lg:w-auto lg:text-xs ${
                        activeFilterCount > 0 || filtersOpen
                          ? "border-[#CBD5E1] text-[#0F172A]"
                          : "border-[#E6E9F0] text-[#334155] hover:border-[#CBD5E1]"
                      }`}
                    >
                      <span className="inline-flex items-center gap-1.5">
                        <ListFilter className="h-3.5 w-3.5 text-[#475569]" />
                        <span>Filters</span>
                        {activeFilterCount > 0 && (
                          <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-[#0F172A] px-1 font-mono-num text-[10px] font-bold text-white">
                            {activeFilterCount}
                          </span>
                        )}
                      </span>
                      <ChevronDown
                        className={`h-3.5 w-3.5 shrink-0 text-[#64748B] transition-transform duration-150 ${
                          filtersOpen ? "rotate-180" : ""
                        }`}
                      />
                    </button>

                    <FlakePopover
                      open={filtersOpen}
                      onOpenChange={setFiltersOpen}
                      anchorRef={filtersTriggerRef}
                      align="right"
                      width={330}
                      maxHeight={480}
                    >
                      <div className="workspace-scroll space-y-3.5 overflow-y-auto overscroll-contain p-3.5">
                        {/* Format */}
                        <div>
                          <p className="mb-1.5 text-[10.5px] font-semibold uppercase tracking-wider text-[#64748B]">
                            Format
                          </p>
                          <div className="grid grid-cols-4 gap-1 rounded-xl bg-[#F3F4F6] p-1 text-[11.5px] font-medium">
                            {(
                              [
                                { id: "all", label: "Alle" },
                                { id: "video", label: "Video" },
                                { id: "image", label: "Image" },
                                { id: "carousel", label: "Carousel" },
                              ] as const
                            ).map((fmt) => (
                              <button
                                key={fmt.id}
                                type="button"
                                onClick={() => {
                                  setMediaFilter(fmt.id);
                                  setVisibleLimit(48);
                                }}
                                className={`rounded-lg py-1 transition-all ${
                                  mediaFilter === fmt.id
                                    ? "bg-white font-semibold text-[#0F172A] shadow-xs"
                                    : "text-[#64748B] hover:text-[#0F172A]"
                                }`}
                              >
                                {fmt.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Platform */}
                        <div>
                          <p className="mb-1.5 text-[10.5px] font-semibold uppercase tracking-wider text-[#64748B]">
                            Platform
                          </p>
                          <div className="flex flex-wrap gap-1.5 text-[11.5px] font-medium">
                            {[
                              { id: "all", label: "Alle" },
                              { id: "Facebook", label: "Facebook" },
                              { id: "Instagram", label: "Instagram" },
                              { id: "Messenger", label: "Messenger" },
                              { id: "Threads", label: "Threads" },
                            ].map((p) => (
                              <button
                                key={p.id}
                                type="button"
                                onClick={() => {
                                  setPlatformFilter(p.id);
                                  setVisibleLimit(48);
                                }}
                                className={`rounded-lg border px-2.5 py-1 transition-colors ${
                                  platformFilter === p.id
                                    ? "border-[#0F172A] bg-[#0F172A] text-white"
                                    : "border-[#E6E9F0] bg-white text-[#475569] hover:bg-[#F8FAFC]"
                                }`}
                              >
                                {p.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Min. Real Reach */}
                        <div>
                          <p className="mb-1.5 text-[10.5px] font-semibold uppercase tracking-wider text-[#64748B]">
                            Min. Reach (Meta)
                          </p>
                          <div className="grid grid-cols-5 gap-1 rounded-xl bg-[#F3F4F6] p-1 text-[11.5px] font-medium">
                            {(
                              [
                                { id: "all", label: "Alle" },
                                { id: "10k", label: "10K+" },
                                { id: "50k", label: "50K+" },
                                { id: "100k", label: "100K+" },
                                { id: "500k", label: "500K+" },
                              ] as const
                            ).map((opt) => (
                              <button
                                key={opt.id}
                                type="button"
                                onClick={() => {
                                  setMinReachFilter(opt.id);
                                  setVisibleLimit(48);
                                }}
                                className={`rounded-lg py-1 transition-all ${
                                  minReachFilter === opt.id
                                    ? "bg-white font-semibold text-[#0F172A] shadow-xs"
                                    : "text-[#64748B] hover:text-[#0F172A]"
                                }`}
                              >
                                {opt.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Målgruppe: Køn */}
                        <div>
                          <p className="mb-1.5 text-[10.5px] font-semibold uppercase tracking-wider text-[#64748B]">
                            Målgruppe · Køn
                          </p>
                          <div className="grid grid-cols-4 gap-1 rounded-xl bg-[#F3F4F6] p-1 text-[11.5px] font-medium">
                            {(
                              [
                                { id: "all", label: "Alle" },
                                { id: "Women", label: "Kvinder" },
                                { id: "Men", label: "Mænd" },
                                { id: "All", label: "Begge" },
                              ] as const
                            ).map((opt) => (
                              <button
                                key={opt.id}
                                type="button"
                                onClick={() => {
                                  setGenderFilter(opt.id);
                                  setVisibleLimit(48);
                                }}
                                className={`rounded-lg py-1 transition-all ${
                                  genderFilter === opt.id
                                    ? "bg-white font-semibold text-[#0F172A] shadow-xs"
                                    : "text-[#64748B] hover:text-[#0F172A]"
                                }`}
                              >
                                {opt.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Målgruppe: Aldersgruppe */}
                        <div>
                          <p className="mb-1.5 text-[10.5px] font-semibold uppercase tracking-wider text-[#64748B]">
                            Målgruppe · Aldersgruppe
                          </p>
                          <div className="grid grid-cols-3 gap-1.5 text-[11.5px] font-medium">
                            {(
                              [
                                { id: "all", label: "Alle aldre" },
                                { id: "18-24", label: "18–24" },
                                { id: "25-34", label: "25–34" },
                                { id: "35-44", label: "35–44" },
                                { id: "45-54", label: "45–54" },
                                { id: "55+", label: "55+" },
                              ] as const
                            ).map((opt) => (
                              <button
                                key={opt.id}
                                type="button"
                                onClick={() => {
                                  setAgeFilter(opt.id);
                                  setVisibleLimit(48);
                                }}
                                className={`rounded-lg border px-2 py-1 transition-colors ${
                                  ageFilter === opt.id
                                    ? "border-[#0F172A] bg-[#0F172A] text-white"
                                    : "border-[#E6E9F0] bg-white text-[#475569] hover:bg-[#F8FAFC]"
                                }`}
                              >
                                {opt.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Land (from real Meta targeted / reached countries) */}
                        {availableAdCountries.length > 0 && (
                          <div>
                            <p className="mb-1.5 text-[10.5px] font-semibold uppercase tracking-wider text-[#64748B]">
                              Land (Reach)
                            </p>
                            <div className="flex flex-wrap gap-1.5 text-[11.5px] font-medium">
                              <button
                                type="button"
                                onClick={() => {
                                  setCountryFilter("all");
                                  setVisibleLimit(48);
                                }}
                                className={`rounded-lg border px-2.5 py-1 transition-colors ${
                                  countryFilter === "all"
                                    ? "border-[#0F172A] bg-[#0F172A] text-white"
                                    : "border-[#E6E9F0] bg-white text-[#475569] hover:bg-[#F8FAFC]"
                                }`}
                              >
                                Alle
                              </button>
                              {availableAdCountries.map((c) => (
                                <button
                                  key={c.code}
                                  type="button"
                                  onClick={() => {
                                    setCountryFilter(c.code);
                                    setVisibleLimit(48);
                                  }}
                                  className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1 transition-colors ${
                                    countryFilter === c.code
                                      ? "border-[#0F172A] bg-[#0F172A] text-white"
                                      : "border-[#E6E9F0] bg-white text-[#475569] hover:bg-[#F8FAFC]"
                                  }`}
                                >
                                  <span>{c.flag}</span>
                                  <span>{c.code}</span>
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Scaled Ads Toggle */}
                        <div className="flex items-center justify-between rounded-xl border border-[#ECEFF5] bg-[#FAFBFD] px-3 py-2">
                          <div>
                            <p className="text-[12px] font-semibold text-[#0F172A]">
                              Kun skalerede ads
                            </p>
                            <p className="text-[10.5px] text-[#64748B]">
                              3+ aktive duplikater
                            </p>
                          </div>
                          <button
                            type="button"
                            role="switch"
                            aria-checked={scaledOnly}
                            onClick={() => {
                              setScaledOnly((v) => !v);
                              setVisibleLimit(48);
                            }}
                            className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${
                              scaledOnly ? "bg-[#0027eb]" : "bg-[#CBD5E1]"
                            }`}
                          >
                            <span
                              className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow-xs transition-transform ${
                                scaledOnly ? "translate-x-[18px]" : "translate-x-[3px]"
                              }`}
                            />
                          </button>
                        </div>

                        {activeFilterCount > 0 && (
                          <button
                            type="button"
                            onClick={() => {
                              setMediaFilter("all");
                              setPlatformFilter("all");
                              setCountryFilter("all");
                              setGenderFilter("all");
                              setAgeFilter("all");
                              setMinReachFilter("all");
                              setScaledOnly(false);
                              setVisibleLimit(48);
                            }}
                            className="w-full rounded-xl border border-[#E6E9F0] py-1.5 text-xs font-semibold text-[#475569] hover:bg-[#F8FAFC] hover:text-[#0F172A]"
                          >
                            Nulstil filtre
                          </button>
                        )}
                      </div>
                    </FlakePopover>
                  </div>

                  {/* Sort (clean full-width row on mobile, compact right pill on desktop) */}
                  <div className="col-span-2 lg:col-span-1">
                    <FlakeSelect
                      ariaLabel="Sortér"
                      value={sortBy}
                      onChange={(val) => setSortBy(val as SortOption)}
                      options={sortSelectOptions}
                      icon={<ArrowUpDown className="h-3.5 w-3.5 text-[#475569]" />}
                      variant="bordered"
                      align="right"
                      menuWidth={210}
                      isActive={sortBy !== "top"}
                      triggerClassName="font-semibold text-[#0F172A]"
                    />
                  </div>

                  {hasAnyAdsFilter && (
                    <button
                      type="button"
                      data-no-glass="true"
                      onClick={resetAllAdsFilters}
                      className="col-span-2 inline-flex items-center justify-center gap-1 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-[#64748B] transition-colors hover:bg-[#F1F5F9] hover:text-[#0F172A] lg:col-span-1 lg:py-2"
                    >
                      <X className="h-3.5 w-3.5" />
                      Nulstil filtre
                    </button>
                  )}
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
        className="flake-mobile-nav pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center px-4 pt-1 lg:hidden"
        style={{
          paddingBottom: "max(1.125rem, calc(env(safe-area-inset-bottom, 0px) * 0.72))",
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
            : view === "folders" && selectedFolderId
              ? ads.filter((a) => a.board_ids.includes(selectedFolderId))
              : visibleAds
        }
        boards={boards}
        onClose={() => setActiveAdId(null)}
        onSelectAd={(id) => setActiveAdId(id)}
        onUpdateAd={handleUpdateAd}
        onDeleteAd={handleDeleteAd}
        onToggleBoard={handleToggleBoard}
        onOpenBrand={openShopAnalytics}
      />
    </>
  );
}
