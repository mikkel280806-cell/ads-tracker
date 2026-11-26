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
  BarChart3,
  Bookmark,
  Bot,
  Check,
  ChevronDown,
  Clapperboard,
  Compass,
  FileBarChart2,
  Film,
  Folder,
  FolderOpen,
  Gift,
  Heart,
  Home,
  Image as ImageIcon,
  Layers,
  Megaphone,
  Package,
  PanelLeft,
  PlugZap,
  Plus,
  Radar,
  Server,
  Sparkles,
  Store,
  Trophy,
  UserPlus,
  Users,
  Video,
  Wand2,
  Zap,
} from "lucide-react";
import type { Ad, Board, Brand, ConnectorStatus } from "@/lib/types";
import type {
  BrandMemory,
  CreativeProject,
  OwnAdMetricRow,
  SnowMessage,
  VideoStylePresetId,
} from "@/lib/studio-types";
import { buildClonedSourceFromAd } from "@/lib/studio-types";
import type {
  AtriaCollectionPlaceholder,
  BrandsSubView,
  McpSubView,
  SnowSubView,
  StudioSubTab,
} from "@/lib/atria-placeholders";
import { buildOwnAnalyticsDataset } from "@/lib/snow-engine";
import { BrandMemoryModal } from "./BrandMemoryModal";
import {
  SnowAssistantView,
  SnowMark,
  SnowQuickDrawer,
} from "./SnowAssistantView";
import {
  VideoStudioView,
  type StudioDraftTrigger,
} from "./VideoStudioView";
import {
  CreativeAnalyticsView,
  type AnalyticsReportId,
} from "./CreativeAnalyticsView";
import {
  AdvertisersView,
  FollowingView,
  SavedAdsSubView,
  TopPicksView,
} from "./InspoSuiteViews";
import {
  AtriaDiscoveryBar,
  DEFAULT_DISCOVERY_FILTERS,
  matchesDiscoveryFilters,
  sortDiscoveryAds,
  type DiscoveryFiltersState,
  type DiscoverySortOption,
} from "./AtriaDiscoveryBar";
import {
  AssetsWorkspaceView,
  BrandsWorkspaceView,
  McpWorkspaceView,
} from "./BrandsAssetsMcpViews";
import { SEED_ADS, SEED_BRANDS } from "@/lib/seed-data";
import { dedupeAds, getActiveDays } from "@/lib/url-parser";
import { buildAdRankIndex } from "@/lib/ad-ranking";
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

type ActiveView =
  | "explore"
  | "shops"
  | "advertisers"
  | "top_picks"
  | "following"
  | "folders"
  | "snow"
  | "studio"
  | "analytics"
  | "assets"
  | "brands"
  | "mcp";

type AdMarketCounts = {
  all: number;
  dk: number;
  us: number;
  rawTotal?: number;
};

const STORAGE_KEYS = {
  ads: "adtrack_ads_v7",
  brands: "adtrack_brands_v7",
  boards: "adtrack_boards_v7",
  stats: "adtrack_ad_counts_v1",
  brandMemory: "flake_studio_brand_memory_v1",
  projects: "flake_studio_projects_v1",
  snowMessages: "flake_studio_snow_v1",
  csvAnalytics: "flake_studio_analytics_v1",
  followedBrands: "flake_followed_brands_v1",
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
  const [fullAdsLoaded, setFullAdsLoaded] = useState(false);
  const [baseServerCounts, setBaseServerCounts] = useState<AdMarketCounts | null>(null);

  // Navigation: Complete 7-section Atria workspace in Flake design system (starts on Discovery)
  const [view, setView] = useState<ActiveView>("explore");
  const [selectedShopId, setSelectedShopId] = useState<string | null>(null);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [quickFolderOpen, setQuickFolderOpen] = useState(false);
  const [quickFolderName, setQuickFolderName] = useState("");
  const [toast, setToast] = useState<string | null>(null);

  // Sub-navigation states across Inspo, Snow, Studio, Brands & MCP
  const [discoveryViewTab, setDiscoveryViewTab] = useState<string>("all");
  const [snowSubView, setSnowSubView] = useState<SnowSubView>("home");
  const [brandsSubView, setBrandsSubView] = useState<BrandsSubView>("overview");
  const [mcpSubView, setMcpSubView] = useState<McpSubView>("overview");
  const [followedBrandIds, setFollowedBrandIds] = useState<string[]>([]);
  const [creditsCount, setCreditsCount] = useState<number>(700);

  // Flake v2 Studio, Snow AI, Brand Memory & Analytics State
  const [brandMemory, setBrandMemory] = useState<BrandMemory | null>(null);
  const [brandMemoryModalOpen, setBrandMemoryModalOpen] = useState(false);
  const [snowDrawerOpen, setSnowDrawerOpen] = useState(false);
  const [snowMessages, setSnowMessages] = useState<SnowMessage[]>([]);
  const [creativeProjects, setCreativeProjects] = useState<CreativeProject[]>([]);
  const [importedCsvRows, setImportedCsvRows] = useState<OwnAdMetricRow[]>([]);
  const [studioTrigger, setStudioTrigger] = useState<StudioDraftTrigger | null>(null);

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

  // Explore state (Atria 22-filter Discovery engine)
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [discoveryFilters, setDiscoveryFilters] =
    useState<DiscoveryFiltersState>(DEFAULT_DISCOVERY_FILTERS);
  const [discoverySortBy, setDiscoverySortBy] =
    useState<DiscoverySortOption>("recommended");
  const [assumedCpm, setAssumedCpm] = useState<number>(9);
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

  // Ad Detail Sheet & Studio/Analytics Navigation State
  const [activeAdId, setActiveAdId] = useState<string | null>(null);
  const [subNavOpen, setSubNavOpen] = useState<boolean>(true);
  const [analyticsReport, setAnalyticsReport] =
    useState<AnalyticsReportId>("overview");
  const [studioInitialTab, setStudioInitialTab] =
    useState<StudioSubTab>("video");

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
      let cachedCounts: AdMarketCounts | null = null;
      try {
        const savedAds = localStorage.getItem(STORAGE_KEYS.ads);
        const savedBrands =
          localStorage.getItem(STORAGE_KEYS.brands) ||
          localStorage.getItem("adtrack_brands_v6");
        const savedBoards =
          localStorage.getItem(STORAGE_KEYS.boards) ||
          localStorage.getItem("adtrack_boards_v6") ||
          localStorage.getItem("adtrack_boards_v5");
        const savedStats = localStorage.getItem(STORAGE_KEYS.stats);

        if (savedStats) {
          const parsedStats: AdMarketCounts = JSON.parse(savedStats);
          if (
            parsedStats &&
            typeof parsedStats.all === "number" &&
            typeof parsedStats.dk === "number" &&
            typeof parsedStats.us === "number" &&
            parsedStats.all > 0
          ) {
            cachedCounts = parsedStats;
            setBaseServerCounts(parsedStats);
          }
        }

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
        const savedBm = localStorage.getItem(STORAGE_KEYS.brandMemory);
        if (savedBm) setBrandMemory(JSON.parse(savedBm) as BrandMemory);
        const savedProjects = localStorage.getItem(STORAGE_KEYS.projects);
        if (savedProjects) setCreativeProjects(JSON.parse(savedProjects) as CreativeProject[]);
        const savedSnow = localStorage.getItem(STORAGE_KEYS.snowMessages);
        if (savedSnow) setSnowMessages(JSON.parse(savedSnow) as SnowMessage[]);
        const savedCsv = localStorage.getItem(STORAGE_KEYS.csvAnalytics);
        if (savedCsv) setImportedCsvRows(JSON.parse(savedCsv) as OwnAdMetricRow[]);
        const savedFollowed = localStorage.getItem(STORAGE_KEYS.followedBrands);
        if (savedFollowed) {
          const parsedF = JSON.parse(savedFollowed);
          if (Array.isArray(parsedF)) setFollowedBrandIds(parsedF);
        }
        const savedOnboarding = localStorage.getItem("flake_onboarding_profile_v1");
        if (savedOnboarding) {
          const parsedOb = JSON.parse(savedOnboarding) as { credits?: number };
          if (typeof parsedOb?.credits === "number") {
            setCreditsCount(700 + parsedOb.credits);
          }
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
            if (
              data.adCounts &&
              typeof data.adCounts.all === "number" &&
              typeof data.adCounts.dk === "number" &&
              typeof data.adCounts.us === "number"
            ) {
              const rawTotal = data.adCounts.all as number;
              // Keep exact cached deduped totals when DB row count hasn't changed; otherwise update immediately
              if (!cachedCounts || cachedCounts.rawTotal !== rawTotal) {
                setBaseServerCounts({
                  all: data.adCounts.all,
                  dk: data.adCounts.dk,
                  us: data.adCounts.us,
                  rawTotal,
                });
              }
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
                setFullAdsLoaded(true);
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

  // Persist Studio, Brand Memory, Snow & CSV Analytics separately in namespaced keys
  useEffect(() => {
    if (!hydrated) return;
    try {
      if (brandMemory) {
        localStorage.setItem(STORAGE_KEYS.brandMemory, JSON.stringify(brandMemory));
      } else {
        localStorage.removeItem(STORAGE_KEYS.brandMemory);
      }
      localStorage.setItem(STORAGE_KEYS.projects, JSON.stringify(creativeProjects));
      localStorage.setItem(STORAGE_KEYS.snowMessages, JSON.stringify(snowMessages.slice(-40)));
      localStorage.setItem(STORAGE_KEYS.csvAnalytics, JSON.stringify(importedCsvRows));
      localStorage.setItem(STORAGE_KEYS.followedBrands, JSON.stringify(followedBrandIds));
    } catch {
      // ignore storage errors
    }
  }, [brandMemory, creativeProjects, snowMessages, importedCsvRows, followedBrandIds, hydrated]);

  const handleToggleFollow = useCallback((brandId: string) => {
    setFollowedBrandIds((prev) => {
      const exists = prev.includes(brandId);
      const next = exists ? prev.filter((id) => id !== brandId) : [...prev, brandId];
      showToast(exists ? "Removed from Following" : "Added to Following");
      return next;
    });
  }, []);

  const handleCloneCollectionToStudio = useCallback(
    (col: AtriaCollectionPlaceholder) => {
      setStudioInitialTab("static");
      setStudioTrigger({
        id: `col-${col.id}-${Date.now()}`,
        mode: "static_clone",
        angle: col.title,
      });
      navigateWithSkeleton(() => {
        setView("studio");
        setSelectedShopId(null);
      });
      showToast(`Cloning "${col.title}" in Ad Maker`);
    },
    [navigateWithSkeleton]
  );

  const ownAnalyticsRows = useMemo(
    () =>
      importedCsvRows.length > 0
        ? [
            ...buildOwnAnalyticsDataset(brandMemory, creativeProjects).filter((r) =>
              r.id.startsWith("live-")
            ),
            ...importedCsvRows,
          ]
        : buildOwnAnalyticsDataset(brandMemory, creativeProjects),
    [brandMemory, creativeProjects, importedCsvRows]
  );

  const handleCloneAdToStudio = useCallback(
    (ad: Ad, presetId?: VideoStylePresetId) => {
      const days = getActiveDays(ad.started_running_at);
      setStudioTrigger({
        id: `clone-${ad.id}-${Date.now()}`,
        mode: ad.media_type === "image" && !presetId ? "static_clone" : "video",
        stylePresetId: presetId || (ad.media_type === "video" ? "iphone_ugc" : "cinema_macro"),
        clonedFromAd: buildClonedSourceFromAd(ad, days),
      });
      setSnowDrawerOpen(false);
      navigateWithSkeleton(() => {
        setView("studio");
        setSelectedShopId(null);
      });
      showToast(`Kloner struktur fra ${ad.brand_name} i Studio`);
    },
    [navigateWithSkeleton]
  );

  const handleAskSnowAboutAd = useCallback(
    (ad: Ad) => {
      const userMsg: SnowMessage = {
        id: `u-${Date.now()}`,
        role: "user",
        createdAt: new Date().toISOString(),
        content: `Dekonstruér hvorfor denne annonce fra ${ad.brand_name} virker, og lav et klonet koncept til mit brand.`,
        attachments: [
          {
            type: "ad",
            label: ad.brand_name,
            sublabel: ad.headline,
            imageUrl: ad.fallback_image_url || ad.thumbnail_url,
            refId: ad.id,
          },
        ],
      };
      setSnowMessages((prev) => [...prev, userMsg]);
      setSnowDrawerOpen(true);
      void fetch("/api/snow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: userMsg.content,
          brandMemory,
          attachedAd: buildClonedSourceFromAd(ad, getActiveDays(ad.started_running_at)),
          analyticsRows: ownAnalyticsRows,
          candidateSwipeAds: ads.filter((a) => a.source_type === "meta_ad_library").slice(0, 12),
        }),
      })
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => {
          if (d?.ok && d.message) {
            setSnowMessages((prev) => [...prev, d.message as SnowMessage]);
          }
        })
        .catch(() => {});
    },
    [ads, brandMemory, ownAnalyticsRows]
  );

  const handleOpenBriefInStudio = useCallback(
    (opts: {
      title?: string;
      angle?: string;
      stylePresetId: VideoStylePresetId;
      productTitle?: string;
      clonedFromAd?: ReturnType<typeof buildClonedSourceFromAd>;
    }) => {
      setStudioTrigger({
        id: `brief-${Date.now()}`,
        mode: "video",
        stylePresetId: opts.stylePresetId,
        productTitle: opts.productTitle,
        angle: opts.angle,
        clonedFromAd: opts.clonedFromAd,
      });
      setSnowDrawerOpen(false);
      navigateWithSkeleton(() => {
        setView("studio");
        setSelectedShopId(null);
      });
    },
    [navigateWithSkeleton]
  );

  const handleSaveStudioProject = useCallback((proj: CreativeProject) => {
    setCreativeProjects((prev) => [proj, ...prev.filter((p) => p.id !== proj.id)]);
  }, []);

  const handleQueueProjectForLaunch = useCallback(
    (proj: CreativeProject) => {
      const queued: CreativeProject = { ...proj, status: "queued" };
      setCreativeProjects((prev) => [queued, ...prev.filter((p) => p.id !== proj.id)]);
      navigateWithSkeleton(() => {
        setView("analytics");
      });
      showToast(`"${proj.title}" lagt i Meta Launch-køen`);
    },
    [navigateWithSkeleton]
  );

  const handleDoubleDownWinner = useCallback(
    (row: OwnAdMetricRow) => {
      setStudioTrigger({
        id: `dd-${row.id}-${Date.now()}`,
        mode: "video",
        stylePresetId:
          row.stylePresetId === "iphone_ugc" ? "claymation_moa" : "iphone_ugc",
        angle: `Double Down: ${row.hookText}`,
      });
      navigateWithSkeleton(() => {
        setView("studio");
      });
      showToast(`Bygger frisk vinder-variant ud fra "${row.name}"`);
    },
    [navigateWithSkeleton]
  );

  const handleLaunchProjects = useCallback(
    (projectIds: string[], campaign: string, budgetDkk: number) => {
      setCreativeProjects((prev) =>
        prev.map((p) =>
          projectIds.includes(p.id)
            ? { ...p, status: "live", campaignName: campaign, dailyBudgetDkk: budgetDkk }
            : p
        )
      );
      showToast(`${projectIds.length} creative(s) sendt live til "${campaign}"`);
    },
    []
  );

  const handleSaveStudioCreativeToFolder = useCallback(
    (proj: CreativeProject) => {
      const targetBoardId = boards[0]?.id;
      const newAd: Ad = {
        id: `studio-${proj.id}`,
        brand_id: "custom-media",
        brand_name: proj.brandName,
        brand_handle: "@studio",
        brand_avatar_initials: proj.brandName.slice(0, 2).toUpperCase(),
        brand_avatar_color: "#0027eb",
        market: "DK",
        source_type: "manual",
        source_url: proj.landingPageUrl || "https://ads-tracker-blue.vercel.app",
        media_type: proj.mode === "static_clone" ? "image" : "video",
        media_url: proj.productImageUrl || "",
        thumbnail_url: proj.productImageUrl || "",
        aspect_ratio: proj.aspectRatio === "1:1" ? "1:1" : proj.aspectRatio === "4:5" ? "3:4" : "9:16",
        headline: proj.headline,
        primary_text: proj.primaryText,
        cta_text: proj.ctaText,
        landing_page_url: proj.landingPageUrl,
        landing_page_path: "/",
        extracted_hook: proj.hooks[0]?.spokenHook || proj.headline,
        hook_category: proj.angle,
        is_active: true,
        is_favorite: false,
        started_running_at: new Date().toISOString(),
        platforms: ["Facebook", "Instagram"],
        tags: ["custom-upload", "studio"],
        board_ids: targetBoardId ? [targetBoardId] : [],
        user_notes: proj.scenes.map((s) => `${s.timeRange}: ${s.spokenLine}`).join("\n"),
        status: "ready",
        created_at: new Date().toISOString(),
      };
      setAds((prev) => [newAd, ...prev.filter((a) => a.id !== newAd.id)]);
      syncCatalog({ action: "upsert_ad", ad: newAd });
      showToast(
        targetBoardId
          ? `Gemt i Swipe Folder "${boards[0].name}"`
          : "Gemt som Studio-creative"
      );
    },
    [boards]
  );

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

  const brandCategoryMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const b of brands) {
      map.set(b.id, b.category || "");
    }
    return map;
  }, [brands]);

  // Filtered & sorted Explore ads using Atria's full 22-filter + 6-sort Discovery engine
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
      if (
        discoveryViewTab === "following" &&
        !followedBrandIds.includes(ad.brand_id)
      ) {
        return false;
      }
      if (
        !matchesDiscoveryFilters(
          ad,
          discoveryFilters,
          brandCategoryMap,
          adRankIndex.get(ad.id),
          assumedCpm
        )
      ) {
        return false;
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
          brandCategoryMap.get(ad.brand_id) || "",
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });

    const effectiveSort: DiscoverySortOption =
      discoveryViewTab === "trending" && discoverySortBy === "recommended"
        ? "impressions"
        : discoverySortBy;

    return sortDiscoveryAds(list, effectiveSort, adRankIndex);
  }, [
    dedupedAds,
    adRankIndex,
    brandCategoryMap,
    discoveryFilters,
    discoverySortBy,
    assumedCpm,
    deferredSearch,
    discoveryViewTab,
    followedBrandIds,
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

  const resetAllAdsFilters = () => {
    setDiscoveryFilters(DEFAULT_DISCOVERY_FILTERS);
    setDiscoverySortBy("recommended");
    setDiscoveryViewTab("all");
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

  // Persist exact deduplicated totals once Stage 2 finishes so next visit paints exact totals at 0ms
  useEffect(() => {
    if (!fullAdsLoaded || paidAds.length === 0) return;
    try {
      const stats: AdMarketCounts = {
        all: paidAds.length,
        dk: dkAdsCount,
        us: usAdsCount,
        rawTotal: baseServerCounts?.rawTotal,
      };
      localStorage.setItem(STORAGE_KEYS.stats, JSON.stringify(stats));
    } catch {
      // ignore storage errors
    }
  }, [fullAdsLoaded, paidAds.length, dkAdsCount, usAdsCount, baseServerCounts?.rawTotal]);

  return (
    <>
    {/* COMPACT FIXED SOLID WHITE MOBILE TOP BAR (root-level fixed at top: 0 for WebKit edge sampling, Antigravity-tight height) */}
    <header className="mobile-pwa-header fixed inset-x-0 top-0 z-40 flex items-center justify-between border-b border-[#E6E9F0] bg-white px-4 pb-2.5 text-[#0F172A] lg:hidden">
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

      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() =>
            navigateWithSkeleton(() => {
              setView("folders");
              setSelectedShopId(null);
            })
          }
          aria-label="Folders"
          className={`flex h-7 w-7 items-center justify-center rounded-lg border ${
            view === "folders"
              ? "border-[#0027eb] bg-[#0027eb]/10 text-[#0027eb]"
              : "border-[#E6E9F0] bg-white text-[#475569]"
          }`}
        >
          <Folder className="h-3.5 w-3.5" />
        </button>
      </div>
    </header>
    <div className="flake-app-shell flex w-full overflow-hidden bg-[#F7F8FB] lg:bg-[#050811]">
      {/* =====================================================================
          FLAKE COMMAND RAIL + FULL 7-SECTION CONTEXTUAL OBSIDIAN DOCK
         ===================================================================== */}
      {(() => {
        const isInspoView =
          view === "explore" ||
          view === "shops" ||
          view === "advertisers" ||
          view === "top_picks" ||
          view === "following" ||
          view === "folders";

        const sectionTitle = isInspoView
          ? "Inspo"
          : view === "snow"
            ? "Snow"
            : view === "analytics"
              ? "Analytics"
              : view === "studio"
                ? "Ad Maker"
                : view === "assets"
                  ? "Assets"
                  : view === "brands"
                    ? "Brands"
                    : "Flake MCP";

        const hasSubDrawer = subNavOpen;

        const switchSection = (
          targetView: ActiveView,
          extra?: () => void
        ) => {
          const alreadyInSection =
            (targetView === "explore" && isInspoView) || targetView === view;
          if (alreadyInSection && !extra) {
            setSubNavOpen((v) => !v);
            return;
          }
          navigateWithSkeleton(() => {
            setView(targetView);
            setSelectedShopId(null);
            setSelectedFolderId(null);
            setSubNavOpen(true);
            extra?.();
          });
        };

        const railItems: Array<{
          id: string;
          targetView: ActiveView;
          label: string;
          active: boolean;
          accent: boolean;
          badge: string | null;
          dot: boolean;
          icon: React.ReactNode;
        }> = [
          {
            id: "inspo",
            targetView: "explore",
            label: "Inspo",
            active: isInspoView,
            accent: false,
            badge: null,
            dot: false,
            icon: <Compass className="h-[18px] w-[18px]" />,
          },
          {
            id: "snow",
            targetView: "snow",
            label: "Snow",
            active: view === "snow",
            accent: true,
            badge: null,
            dot: false,
            icon: <SnowMark className="h-[18px] w-[18px]" />,
          },
          {
            id: "analytics",
            targetView: "analytics",
            label: "Analytics",
            active: view === "analytics",
            accent: false,
            badge: null,
            dot: false,
            icon: <BarChart3 className="h-[18px] w-[18px]" />,
          },
          {
            id: "studio",
            targetView: "studio",
            label: "Ad Maker",
            active: view === "studio",
            accent: false,
            badge: "HOT",
            dot: false,
            icon: <Wand2 className="h-[18px] w-[18px]" />,
          },
          {
            id: "assets",
            targetView: "assets",
            label: "Assets",
            active: view === "assets",
            accent: false,
            badge: null,
            dot: false,
            icon: <Clapperboard className="h-[18px] w-[18px]" />,
          },
          {
            id: "brands",
            targetView: "brands",
            label: "Brands",
            active: view === "brands",
            accent: false,
            badge: null,
            dot: Boolean(brandMemory),
            icon: <Store className="h-[18px] w-[18px]" />,
          },
          {
            id: "mcp",
            targetView: "mcp",
            label: "MCP",
            active: view === "mcp",
            accent: false,
            badge: null,
            dot: false,
            icon: <Server className="h-[18px] w-[18px]" />,
          },
        ];

        const drawerRowClass = (active: boolean) =>
          `group flex w-full items-center justify-between gap-2 rounded-xl px-2.5 py-2 text-left text-[13px] font-medium transition-all ${
            active
              ? "bg-white/[0.11] font-semibold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]"
              : "text-white/60 hover:bg-white/[0.05] hover:text-white/90"
          }`;

        return (
          <aside className="relative hidden h-full shrink-0 text-white lg:flex">
            {/* 1. SLIM COMMAND RAIL (70px — real Flake asterisk emblem + 7 sections + utility stack) */}
            <div
              className={`relative z-20 flex h-full flex-col items-center justify-between bg-[#050811] py-3.5 ${
                hasSubDrawer
                  ? "w-[70px] border-r border-white/[0.07]"
                  : "w-[94px] pr-[24px]"
              }`}
            >
              <div className="no-scrollbar flex w-full flex-col items-center overflow-y-auto">
                {/* Real Flake Asterisk Emblem */}
                <button
                  type="button"
                  data-no-glass="true"
                  onClick={() => {
                    navigateWithSkeleton(() => {
                      setView("explore");
                      setSelectedShopId(null);
                      setSelectedFolderId(null);
                      setSubNavOpen(true);
                    });
                  }}
                  title="Flake"
                  className="group mb-4 flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-[12px] ring-1 ring-white/20 shadow-[0_8px_22px_-6px_rgba(0,39,235,0.85)] transition-all duration-300 hover:scale-105 hover:ring-white/35"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/icons/icon-192.png"
                    alt="Flake"
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:rotate-12"
                  />
                </button>

                {/* 7 Atria Core Sections */}
                <div className="flex w-full flex-col items-center gap-1">
                  {railItems.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      data-no-glass="true"
                      onClick={() => {
                        if (item.targetView === "studio") {
                          switchSection("studio", () =>
                            setStudioInitialTab("video")
                          );
                        } else {
                          switchSection(item.targetView);
                        }
                      }}
                      className="group relative flex w-full flex-col items-center justify-center gap-1 py-1 text-center transition-all"
                    >
                      <span
                        className={`absolute left-0 top-1/2 -translate-y-1/2 rounded-r-full bg-[#3B66FF] shadow-[0_0_12px_rgba(0,39,235,0.95)] transition-all duration-200 ${
                          item.active ? "h-5 w-[3px] opacity-100" : "h-0 w-[3px] opacity-0"
                        }`}
                      />
                      <span
                        className={`relative flex h-9 w-9 items-center justify-center rounded-xl transition-all duration-200 ${
                          item.active && item.accent
                            ? "bg-[#0027eb] text-white shadow-[0_6px_18px_-4px_rgba(0,39,235,0.85)] ring-1 ring-white/25"
                            : item.active
                              ? "bg-white/[0.12] text-white ring-1 ring-white/[0.15] shadow-[inset_0_1px_0_rgba(255,255,255,0.16)]"
                              : "text-white/55 group-hover:bg-white/[0.07] group-hover:text-white"
                        }`}
                      >
                        {item.icon}
                        {item.badge && (
                          <span className="absolute -right-2 -top-1 rounded-full bg-[#0027eb] px-1.5 py-[1px] text-[8px] font-bold tracking-wider text-white ring-2 ring-[#050811]">
                            {item.badge}
                          </span>
                        )}
                        {item.dot && (
                          <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-[#22C55E] ring-2 ring-[#050811]" />
                        )}
                      </span>
                      <span
                        className={`text-[10px] font-medium leading-none tracking-tight transition-colors ${
                          item.active
                            ? "text-white"
                            : "text-white/45 group-hover:text-white/80"
                        }`}
                      >
                        {item.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Bottom Utility Stack (Affiliate · News · Invite · Credits · Panel Toggle) */}
              <div className="mt-2 flex w-full flex-col items-center gap-1.5 border-t border-white/[0.06] pt-2.5">
                {!hasSubDrawer && (
                  <button
                    type="button"
                    data-no-glass="true"
                    onClick={() => setSubNavOpen(true)}
                    title="Expand sidebar"
                    className="flex h-7 w-7 items-center justify-center rounded-lg text-white/50 hover:bg-white/10 hover:text-white"
                  >
                    <PanelLeft className="h-3.5 w-3.5" />
                  </button>
                )}
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    data-no-glass="true"
                    onClick={() => showToast("Affiliate program — 25% recurring commission")}
                    title="Affiliate program"
                    className="flex h-7 w-7 items-center justify-center rounded-lg text-white/45 hover:bg-white/10 hover:text-white"
                  >
                    <Gift className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    data-no-glass="true"
                    onClick={() => showToast("What's new: Ad Maker v2 + Snow AI")}
                    title="News Center"
                    className="flex h-7 w-7 items-center justify-center rounded-lg text-white/45 hover:bg-white/10 hover:text-white"
                  >
                    <Megaphone className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    data-no-glass="true"
                    onClick={() => {
                      if (navigator.clipboard) {
                        void navigator.clipboard.writeText(window.location.origin);
                      }
                      showToast("Invite link copied");
                    }}
                    title="Invite team"
                    className="flex h-7 w-7 items-center justify-center rounded-lg text-white/45 hover:bg-white/10 hover:text-white"
                  >
                    <UserPlus className="h-3.5 w-3.5" />
                  </button>
                </div>

                <button
                  type="button"
                  data-no-glass="true"
                  onClick={() => {
                    navigateWithSkeleton(() => {
                      setView("brands");
                      setBrandsSubView("overview");
                      setSubNavOpen(true);
                    });
                  }}
                  title="Workspace credits"
                  className="inline-flex items-center gap-1 rounded-full border border-white/[0.12] bg-white/[0.07] px-2.5 py-1 font-mono-num text-[10.5px] font-semibold text-white/90 transition-colors hover:border-[#3B66FF] hover:bg-[#0027eb]/30"
                >
                  <Sparkles className="h-3 w-3 text-[#60A5FA]" />
                  {creditsCount}
                </button>
              </div>
            </div>

            {/* 2. CONTEXTUAL SECONDARY DOCK (Rendered cleanly for all 7 sections) */}
            {hasSubDrawer && (
              <div className="adtrack-sidebar relative flex h-full w-[244px] flex-col bg-[#080C18] py-4 pl-3.5 pr-[36px] text-white">
                <SidebarPixelWave />

                {/* Top Section Title + Collapse Toggle */}
                <div className="mb-4 flex items-center justify-between px-1.5">
                  <div className="flex items-center gap-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src="/icons/flake-wordmark-white.png"
                      alt="Flake"
                      className="h-[14px] w-auto select-none opacity-90"
                    />
                    <span className="text-white/20">/</span>
                    <span className="text-[12.5px] font-semibold text-white/85">
                      {sectionTitle}
                    </span>
                  </div>
                  <button
                    type="button"
                    data-no-glass="true"
                    onClick={() => setSubNavOpen(false)}
                    title="Collapse sidebar"
                    className="flex h-6 w-6 items-center justify-center rounded-lg text-white/40 transition-colors hover:bg-white/10 hover:text-white"
                  >
                    <PanelLeft className="h-3.5 w-3.5" />
                  </button>
                </div>

                {/* SECTION 1: INSPO DRAWER */}
                {isInspoView && (
                  <>
                    <div className="space-y-0.5">
                      {[
                        {
                          id: "explore" as ActiveView,
                          label: "Ads",
                          active: view === "explore",
                          icon: <Radar className="h-[15px] w-[15px]" />,
                          badge: null as string | null,
                        },
                        {
                          id: "shops" as ActiveView,
                          label: "Brands",
                          active: view === "shops",
                          icon: <Store className="h-[15px] w-[15px]" />,
                          badge: null as string | null,
                        },
                        {
                          id: "advertisers" as ActiveView,
                          label: "Advertisers",
                          active: view === "advertisers",
                          icon: <Users className="h-[15px] w-[15px]" />,
                          badge: "NEW",
                        },
                        {
                          id: "top_picks" as ActiveView,
                          label: "Top picks",
                          active: view === "top_picks",
                          icon: <Trophy className="h-[15px] w-[15px]" />,
                          badge: null as string | null,
                        },
                        {
                          id: "following" as ActiveView,
                          label: "Following",
                          active: view === "following",
                          icon: <Heart className="h-[15px] w-[15px]" />,
                          badge:
                            followedBrandIds.length > 0
                              ? String(followedBrandIds.length)
                              : null,
                        },
                        {
                          id: "folders" as ActiveView,
                          label: "Saved ads",
                          active: view === "folders" && !selectedFolderId,
                          icon: <Bookmark className="h-[15px] w-[15px]" />,
                          badge: null as string | null,
                        },
                      ].map((row) => (
                        <button
                          key={row.id}
                          type="button"
                          data-no-glass="true"
                          onClick={() =>
                            navigateWithSkeleton(() => {
                              setView(row.id);
                              setSelectedShopId(null);
                              setSelectedFolderId(null);
                            })
                          }
                          className={drawerRowClass(row.active)}
                        >
                          <span className="flex items-center gap-2.5">
                            <span
                              className={
                                row.active
                                  ? "text-[#7AA2FF]"
                                  : "text-white/45 group-hover:text-white/75"
                              }
                            >
                              {row.icon}
                            </span>
                            {row.label}
                          </span>
                          {row.badge && (
                            <span className="rounded-full bg-[#0027eb] px-1.5 py-0.5 text-[9px] font-bold text-white">
                              {row.badge}
                            </span>
                          )}
                        </button>
                      ))}
                    </div>

                    {/* Boards Tree */}
                    <div className="mt-4 flex min-h-0 flex-1 flex-col border-t border-white/[0.07] pt-3.5">
                      <div className="mb-2 flex items-center justify-between px-2">
                        <span className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-white/35">
                          Boards
                        </span>
                        <button
                          type="button"
                          data-no-glass="true"
                          onClick={() => setQuickFolderOpen((v) => !v)}
                          title="New board"
                          className="flex h-5 w-5 items-center justify-center rounded-md text-white/45 transition-colors hover:bg-white/10 hover:text-white"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      {quickFolderOpen && (
                        <form
                          onSubmit={(e) => {
                            e.preventDefault();
                            if (!quickFolderName.trim()) return;
                            handleCreateBoard(quickFolderName.trim());
                            setQuickFolderName("");
                            setQuickFolderOpen(false);
                          }}
                          className="mb-2 px-1"
                        >
                          <input
                            type="text"
                            autoFocus
                            value={quickFolderName}
                            onChange={(e) => setQuickFolderName(e.target.value)}
                            placeholder="Board name + Enter"
                            className="w-full rounded-lg border border-white/15 bg-white/[0.08] px-2.5 py-1.5 text-xs text-white outline-none placeholder:text-white/40 focus:border-[#4D6BFF]"
                          />
                        </form>
                      )}

                      <div className="min-h-0 flex-1 space-y-0.5 overflow-y-auto">
                        {boards.map((board) => {
                          const count = ads.filter((a) =>
                            a.board_ids.includes(board.id)
                          ).length;
                          const active =
                            view === "folders" && selectedFolderId === board.id;
                          return (
                            <button
                              key={board.id}
                              type="button"
                              data-no-glass="true"
                              onClick={() => {
                                navigateWithSkeleton(() => {
                                  setSelectedFolderId(board.id);
                                  setSelectedShopId(null);
                                  setView("folders");
                                });
                              }}
                              className={`flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-left text-[12.5px] transition-colors ${
                                active
                                  ? "bg-white/[0.1] font-semibold text-white"
                                  : "text-white/55 hover:bg-white/[0.05] hover:text-white/90"
                              }`}
                            >
                              <span className="flex min-w-0 items-center gap-2.5">
                                <span
                                  className="h-2 w-2 shrink-0 rounded-full ring-2 ring-white/10"
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

                    {/* Save ads from Extension | IG (mobile) card */}
                    <div className="mt-3 rounded-xl border border-white/[0.08] bg-white/[0.04] p-2.5">
                      <p className="mb-1.5 text-[10px] font-medium text-white/45">
                        Save ads from
                      </p>
                      <div className="grid grid-cols-2 gap-1.5">
                        <button
                          type="button"
                          data-no-glass="true"
                          onClick={() =>
                            showToast("Chrome Extension ready for Meta & TikTok Ad Library")
                          }
                          className="flex items-center justify-center gap-1.5 rounded-lg bg-white/[0.06] py-1.5 text-[11px] font-medium text-white/80 hover:bg-white/[0.12]"
                        >
                          <Compass className="h-3 w-3 text-[#7AA2FF]" />
                          Extension
                        </button>
                        <button
                          type="button"
                          data-no-glass="true"
                          onClick={() =>
                            navigateWithSkeleton(() => {
                              setView("folders");
                              setSelectedFolderId(null);
                            })
                          }
                          className="flex items-center justify-center gap-1.5 rounded-lg bg-white/[0.06] py-1.5 text-[11px] font-medium text-white/80 hover:bg-white/[0.12]"
                        >
                          <Film className="h-3 w-3 text-[#7AA2FF]" />
                          IG (mobile)
                        </button>
                      </div>
                    </div>
                  </>
                )}

                {/* SECTION 2: SNOW DRAWER */}
                {view === "snow" && (
                  <div className="flex flex-1 flex-col justify-between">
                    <div className="space-y-1">
                      <button
                        type="button"
                        data-no-glass="true"
                        onClick={() => setBrandMemoryModalOpen(true)}
                        className="mb-3 flex w-full items-center justify-between rounded-xl border border-white/[0.09] bg-white/[0.05] px-3 py-2 text-left text-[12px] font-medium text-white/85 hover:bg-white/[0.09]"
                      >
                        <span className="truncate">
                          {brandMemory ? brandMemory.brandName : "All brands"}
                        </span>
                        <ChevronDown className="h-3.5 w-3.5 text-white/45" />
                      </button>

                      {[
                        { id: "home" as SnowSubView, label: "Home", icon: <Home className="h-[15px] w-[15px]" /> },
                        { id: "new_task" as SnowSubView, label: "New task", icon: <Plus className="h-[15px] w-[15px]" /> },
                        { id: "connectors" as SnowSubView, label: "Connectors", icon: <PlugZap className="h-[15px] w-[15px]" /> },
                        { id: "automations" as SnowSubView, label: "Automations", icon: <Zap className="h-[15px] w-[15px]" /> },
                        { id: "skills" as SnowSubView, label: "Skills", icon: <Sparkles className="h-[15px] w-[15px]" /> },
                      ].map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          data-no-glass="true"
                          onClick={() => {
                            if (item.id === "new_task") {
                              setSnowMessages([]);
                            }
                            setSnowSubView(item.id);
                          }}
                          className={drawerRowClass(snowSubView === item.id)}
                        >
                          <span className="flex items-center gap-2.5">
                            <span
                              className={
                                snowSubView === item.id ? "text-[#7AA2FF]" : "text-white/45"
                              }
                            >
                              {item.icon}
                            </span>
                            {item.label}
                          </span>
                        </button>
                      ))}
                    </div>

                    {snowMessages.length > 0 && (
                      <div className="border-t border-white/[0.08] pt-3">
                        <p className="mb-1.5 px-2 text-[10px] font-semibold uppercase tracking-wider text-white/35">
                          Recent threads
                        </p>
                        <button
                          type="button"
                          data-no-glass="true"
                          onClick={() => setSnowSubView("home")}
                          className="w-full truncate rounded-lg bg-white/[0.07] px-2.5 py-1.5 text-left text-[11.5px] text-white/80"
                        >
                          {snowMessages[0]?.content.slice(0, 32)}...
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* SECTION 3: ANALYTICS DRAWER */}
                {view === "analytics" && (
                  <div className="flex flex-1 flex-col justify-between">
                    <div>
                      <div className="mb-3 flex items-center justify-between px-1.5">
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-white/40">
                          Ad accounts
                        </span>
                        <button
                          type="button"
                          data-no-glass="true"
                          onClick={() => setAnalyticsReport("connect")}
                          title="Connect ad account"
                          className="flex h-5 w-5 items-center justify-center rounded-md text-white/50 hover:bg-white/10 hover:text-white"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      <div className="mb-4 flex items-center justify-between rounded-xl border border-white/[0.08] bg-white/[0.05] px-2.5 py-2">
                        <span className="flex min-w-0 items-center gap-2 text-[12.5px] font-semibold text-white">
                          <span className="h-2 w-2 shrink-0 rounded-full bg-[#38BDF8]" />
                          <span className="truncate">
                            {brandMemory ? brandMemory.brandName : "Flake Demo"}
                          </span>
                        </span>
                        <button
                          type="button"
                          data-no-glass="true"
                          onClick={() => setAnalyticsReport("connect")}
                          className="text-[10.5px] font-medium text-white/45 hover:text-white"
                        >
                          Connect
                        </button>
                      </div>

                      <p className="px-2 pb-2 text-[10.5px] font-semibold uppercase tracking-[0.08em] text-white/35">
                        System reports
                      </p>
                      <div className="ml-2 space-y-0.5 border-l border-white/[0.09] pl-2.5">
                        {(
                          [
                            { id: "overview", label: "Key metrics overview" },
                            { id: "top_spend", label: "Top spend ads" },
                            { id: "top_performing", label: "Top performing ads" },
                            { id: "top_videos", label: "Top performing videos" },
                            { id: "top_images", label: "Top performing images" },
                            { id: "top_hooks", label: "Top hooks & retention" },
                            { id: "connect", label: "Connect ad account" },
                          ] as Array<{ id: AnalyticsReportId; label: string }>
                        ).map((rep) => (
                          <button
                            key={rep.id}
                            type="button"
                            data-no-glass="true"
                            onClick={() => setAnalyticsReport(rep.id)}
                            className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-[12px] transition-colors ${
                              analyticsReport === rep.id
                                ? "bg-white/[0.11] font-semibold text-white"
                                : "text-white/55 hover:bg-white/[0.05] hover:text-white/90"
                            }`}
                          >
                            <FileBarChart2
                              className={`h-3.5 w-3.5 shrink-0 ${
                                analyticsReport === rep.id
                                  ? "text-[#7AA2FF]"
                                  : "opacity-55"
                              }`}
                            />
                            <span className="truncate">{rep.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-[11px] text-white/60">
                      <div className="flex items-center justify-between">
                        <span>Ad spend tracked</span>
                        <span className="font-mono-num text-white/90">Live</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* SECTION 4: AD MAKER DRAWER */}
                {view === "studio" && (
                  <div className="space-y-1">
                    <button
                      type="button"
                      data-no-glass="true"
                      onClick={() => setStudioInitialTab("video")}
                      className={drawerRowClass(studioInitialTab === "video")}
                    >
                      <span className="flex items-center gap-2.5">
                        <Video className="h-[15px] w-[15px] text-[#7AA2FF]" />
                        Video Ads
                      </span>
                      <span className="rounded-full bg-[#0027eb] px-1.5 py-0.5 text-[9px] font-bold text-white">
                        NEW
                      </span>
                    </button>
                    <div className="ml-3 space-y-0.5 border-l border-white/[0.08] pl-2.5">
                      <button
                        type="button"
                        data-no-glass="true"
                        onClick={() => setStudioInitialTab("video_projects")}
                        className={drawerRowClass(studioInitialTab === "video_projects")}
                      >
                        <span>Video projects</span>
                      </button>
                      <button
                        type="button"
                        data-no-glass="true"
                        onClick={() => setStudioInitialTab("media")}
                        className={drawerRowClass(studioInitialTab === "media")}
                      >
                        <span>Media</span>
                      </button>
                    </div>

                    <div className="pt-2" />
                    <button
                      type="button"
                      data-no-glass="true"
                      onClick={() => setStudioInitialTab("static")}
                      className={drawerRowClass(studioInitialTab === "static")}
                    >
                      <span className="flex items-center gap-2.5">
                        <ImageIcon className="h-[15px] w-[15px] text-[#7AA2FF]" />
                        Image Ads
                      </span>
                    </button>
                    <div className="ml-3 space-y-0.5 border-l border-white/[0.08] pl-2.5">
                      <button
                        type="button"
                        data-no-glass="true"
                        onClick={() => setStudioInitialTab("image_projects")}
                        className={drawerRowClass(studioInitialTab === "image_projects")}
                      >
                        <span>Image projects</span>
                      </button>
                    </div>

                    <div className="pt-2" />
                    <button
                      type="button"
                      data-no-glass="true"
                      onClick={() => setStudioInitialTab("miner")}
                      className={drawerRowClass(studioInitialTab === "miner")}
                    >
                      <span className="flex items-center gap-2.5">
                        <Bot className="h-[15px] w-[15px]" />
                        AI Playground
                      </span>
                      <span className="rounded-full bg-white/[0.08] px-1.5 py-0.5 text-[9px] text-white/60">
                        Miner
                      </span>
                    </button>
                  </div>
                )}

                {/* SECTION 5: ASSETS DRAWER */}
                {view === "assets" && (
                  <div className="space-y-2">
                    <div className="rounded-xl border border-white/[0.08] bg-white/[0.05] px-3 py-2 text-[12px] font-semibold text-white">
                      {brandMemory ? brandMemory.brandName : "Arch & Pillar"}
                    </div>
                    <button
                      type="button"
                      data-no-glass="true"
                      onClick={() => setView("assets")}
                      className={drawerRowClass(true)}
                    >
                      <span className="flex items-center gap-2.5">
                        <FolderOpen className="h-[15px] w-[15px] text-[#7AA2FF]" />
                        All assets
                      </span>
                    </button>
                    <div className="border-t border-white/[0.07] pt-3">
                      <p className="mb-1.5 px-2 text-[10.5px] font-semibold uppercase tracking-wider text-white/35">
                        Boards
                      </p>
                      {boards.slice(0, 4).map((b) => (
                        <button
                          key={b.id}
                          type="button"
                          data-no-glass="true"
                          onClick={() =>
                            navigateWithSkeleton(() => {
                              setSelectedFolderId(b.id);
                              setView("folders");
                            })
                          }
                          className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-[12px] text-white/60 hover:bg-white/[0.05] hover:text-white"
                        >
                          <span
                            className="h-2 w-2 rounded-full"
                            style={{ backgroundColor: b.accent_color }}
                          />
                          <span className="truncate">{b.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* SECTION 6: BRANDS DRAWER */}
                {view === "brands" && (
                  <div className="space-y-1">
                    <button
                      type="button"
                      data-no-glass="true"
                      onClick={() => setBrandsSubView("list")}
                      className={drawerRowClass(brandsSubView === "list")}
                    >
                      <span className="flex items-center gap-2.5">
                        <Layers className="h-[15px] w-[15px]" />
                        All brands
                      </span>
                    </button>
                    <div className="my-2 rounded-xl border border-white/[0.08] bg-white/[0.05] px-3 py-2">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-white/35">
                        Active brand
                      </p>
                      <p className="truncate text-[12.5px] font-semibold text-white">
                        {brandMemory ? brandMemory.brandName : "Arch & Pillar"}
                      </p>
                    </div>
                    {[
                      { id: "overview" as BrandsSubView, label: "Overview", icon: <Store className="h-[15px] w-[15px]" /> },
                      { id: "audience" as BrandsSubView, label: "Audience", icon: <Users className="h-[15px] w-[15px]" /> },
                      { id: "products" as BrandsSubView, label: "Products", icon: <Package className="h-[15px] w-[15px]" /> },
                      { id: "competitors" as BrandsSubView, label: "Competitors", icon: <Radar className="h-[15px] w-[15px]" /> },
                    ].map((bItem) => (
                      <button
                        key={bItem.id}
                        type="button"
                        data-no-glass="true"
                        onClick={() => setBrandsSubView(bItem.id)}
                        className={drawerRowClass(brandsSubView === bItem.id)}
                      >
                        <span className="flex items-center gap-2.5">
                          <span
                            className={
                              brandsSubView === bItem.id ? "text-[#7AA2FF]" : "text-white/45"
                            }
                          >
                            {bItem.icon}
                          </span>
                          {bItem.label}
                        </span>
                      </button>
                    ))}
                  </div>
                )}

                {/* SECTION 7: MCP DRAWER */}
                {view === "mcp" && (
                  <div className="space-y-1">
                    {[
                      { id: "overview" as McpSubView, label: "Overview", icon: <Server className="h-[15px] w-[15px]" /> },
                      { id: "prompts" as McpSubView, label: "Prompt library", icon: <Sparkles className="h-[15px] w-[15px]" /> },
                      { id: "skills" as McpSubView, label: "Skill Hub", icon: <Zap className="h-[15px] w-[15px]" /> },
                    ].map((mItem) => (
                      <button
                        key={mItem.id}
                        type="button"
                        data-no-glass="true"
                        onClick={() => setMcpSubView(mItem.id)}
                        className={drawerRowClass(mcpSubView === mItem.id)}
                      >
                        <span className="flex items-center gap-2.5">
                          <span
                            className={
                              mcpSubView === mItem.id ? "text-[#7AA2FF]" : "text-white/45"
                            }
                          >
                            {mItem.icon}
                          </span>
                          {mItem.label}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </aside>
        );
      })()}

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
              VIEW 2: ADS (Atria Discovery Suite + Masonry Ad Feed)
             ================================================================= */}
          {view === "explore" && (
            <div className="animate-view-in space-y-4">
              <AtriaDiscoveryBar
                search={search}
                onSearchChange={(val) => {
                  setSearch(val);
                  setVisibleLimit(48);
                }}
                activeViewTab={discoveryViewTab}
                onViewTabChange={(tab) => {
                  setDiscoveryViewTab(tab);
                  setVisibleLimit(48);
                }}
                followedCount={followedBrandIds.length}
                sortBy={discoverySortBy}
                onSortChange={(val) => setDiscoverySortBy(val)}
                assumedCpm={assumedCpm}
                onAssumedCpmChange={setAssumedCpm}
                filters={discoveryFilters}
                onFiltersChange={(next) => {
                  setDiscoveryFilters(next);
                  setVisibleLimit(48);
                }}
                onResetFilters={resetAllAdsFilters}
                onOpenRequestBrand={() => {
                  navigateWithSkeleton(() => setView("shops"));
                }}
              />

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
                        isFollowed={followedBrandIds.includes(ad.brand_id)}
                        onToggleFollow={handleToggleFollow}
                        onOpen={handleOpenAd}
                        onToggleBoard={handleToggleBoard}
                        onOpenBrand={openShopAnalytics}
                        onCloneAd={(a) => handleCloneAdToStudio(a)}
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
                    No ads match your active filters
                  </p>
                  <p className="mt-1 text-xs text-[#64748B]">
                    Try switching tabs, format, or clearing your search.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* =================================================================
              VIEW 2B: ADVERTISERS, TOP PICKS & FOLLOWING
             ================================================================= */}
          {view === "advertisers" && (
            <div className="animate-view-in">
              <AdvertisersView
                brands={brands}
                ads={ads}
                followedBrandIds={followedBrandIds}
                onToggleFollow={handleToggleFollow}
                onOpenBrand={openShopAnalytics}
                onCloneAd={(ad) => handleCloneAdToStudio(ad)}
              />
            </div>
          )}

          {view === "top_picks" && (
            <div className="animate-view-in">
              <TopPicksView
                onCloneCollectionToStudio={handleCloneCollectionToStudio}
                onBrowseAds={() => navigateWithSkeleton(() => setView("explore"))}
              />
            </div>
          )}

          {view === "following" && (
            <div className="animate-view-in">
              <FollowingView
                brands={brands}
                ads={ads}
                followedBrandIds={followedBrandIds}
                onToggleFollow={handleToggleFollow}
                onOpenBrand={openShopAnalytics}
                onBrowseBrands={() =>
                  navigateWithSkeleton(() => setView("advertisers"))
                }
              />
            </div>
          )}

          {/* =================================================================
              VIEW 3: SAVED ADS & BOARDS
             ================================================================= */}
          {view === "folders" && !selectedFolderId && (
            <div className="animate-view-in space-y-6">
              <SavedAdsSubView
                ads={ads}
                boards={boards}
                onOpenAd={(ad) => setActiveAdId(ad.id)}
                onToggleBoard={handleToggleBoard}
                onOpenBrand={openShopAnalytics}
                onCloneAd={(ad) => handleCloneAdToStudio(ad)}
                onBrowseAds={() => navigateWithSkeleton(() => setView("explore"))}
                onOpenUpload={() => {
                  setStudioInitialTab("media");
                  navigateWithSkeleton(() => setView("studio"));
                }}
              />
              {boards.length > 0 && (
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
                  onCloneAd={(ad) => handleCloneAdToStudio(ad)}
                />
              )}
            </div>
          )}

          {view === "folders" && selectedFolderId && (
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
                onCloneAd={(ad) => handleCloneAdToStudio(ad)}
              />
            </div>
          )}

          {/* =================================================================
              VIEW 4: SNOW AI CREATIVE STRATEGIST
             ================================================================= */}
          {view === "snow" && (
            <div className="animate-view-in h-[calc(100%-1rem)]">
              <SnowAssistantView
                brandMemory={brandMemory}
                messages={snowMessages}
                ads={dedupedAds}
                analyticsRows={ownAnalyticsRows}
                subView={snowSubView}
                onSubViewChange={setSnowSubView}
                onNavigateToStudio={(tab) => {
                  if (tab) setStudioInitialTab(tab);
                  navigateWithSkeleton(() => setView("studio"));
                }}
                onMessagesChange={setSnowMessages}
                onOpenBrandMemory={() => setBrandMemoryModalOpen(true)}
                onCloneAdToStudio={handleCloneAdToStudio}
                onOpenBriefInStudio={handleOpenBriefInStudio}
                onOpenAdDetail={(ad) => setActiveAdId(ad.id)}
              />
            </div>
          )}

          {/* =================================================================
              VIEW 5: AD MAKER STUDIO (VIDEO, IMAGE, PROJECTS, MEDIA, PLAYGROUND)
             ================================================================= */}
          {view === "studio" && (
            <div className="animate-view-in">
              <VideoStudioView
                brandMemory={brandMemory}
                projects={creativeProjects}
                incomingTrigger={studioTrigger}
                initialSubTab={studioInitialTab}
                onSubTabChange={setStudioInitialTab}
                onConsumeTrigger={() => setStudioTrigger(null)}
                onSaveProject={handleSaveStudioProject}
                onQueueForLaunch={handleQueueProjectForLaunch}
                onSaveToSwipeFolder={handleSaveStudioCreativeToFolder}
                onOpenBrandMemory={() => setBrandMemoryModalOpen(true)}
              />
            </div>
          )}

          {/* =================================================================
              VIEW 6: CREATIVE ANALYTICS, CONNECT & META LAUNCH
             ================================================================= */}
          {view === "analytics" && (
            <div className="animate-view-in">
              <CreativeAnalyticsView
                brandMemory={brandMemory}
                projects={creativeProjects}
                analyticsRows={ownAnalyticsRows}
                activeReport={analyticsReport}
                onReportChange={setAnalyticsReport}
                onOpenMcp={() => navigateWithSkeleton(() => setView("mcp"))}
                onDoubleDown={handleDoubleDownWinner}
                onLaunchProjects={handleLaunchProjects}
                onImportCsvRows={(rows) => {
                  setImportedCsvRows(rows);
                  setAnalyticsReport("overview");
                  showToast(`${rows.length} ads imported into Analytics`);
                }}
                onOpenBrandMemory={() => setBrandMemoryModalOpen(true)}
              />
            </div>
          )}

          {/* =================================================================
              VIEW 7: ASSETS, BRANDS & MCP
             ================================================================= */}
          {view === "assets" && (
            <div className="animate-view-in">
              <AssetsWorkspaceView
                brandMemory={brandMemory}
                projects={creativeProjects}
                onOpenBrandScanner={() => setBrandMemoryModalOpen(true)}
                onNavigateToStudio={(tab) => {
                  if (tab) setStudioInitialTab(tab);
                  navigateWithSkeleton(() => setView("studio"));
                }}
              />
            </div>
          )}

          {view === "brands" && (
            <div className="animate-view-in">
              <BrandsWorkspaceView
                brandMemory={brandMemory}
                subView={brandsSubView}
                onSubViewChange={setBrandsSubView}
                brands={brands}
                ads={dedupedAds}
                onSaveMemory={(mem) => {
                  setBrandMemory(mem);
                  showToast(`Saved Brand Memory for ${mem.brandName}`);
                }}
                onOpenBrandScanner={() => setBrandMemoryModalOpen(true)}
                onCreateAdFromProduct={(productTitle) => {
                  setStudioInitialTab("video");
                  setStudioTrigger({
                    id: `prod-${Date.now()}`,
                    mode: "video",
                    productTitle,
                  });
                  navigateWithSkeleton(() => setView("studio"));
                }}
                onOpenCompetitorBrand={openShopAnalytics}
              />
            </div>
          )}

          {view === "mcp" && (
            <div className="animate-view-in">
              <McpWorkspaceView
                subView={mcpSubView}
                onSubViewChange={setMcpSubView}
              />
            </div>
          )}
            </>
          )}
        </main>
      </div>
    </div>

      {/* FLOATING "SNOW" COPILOT BUTTON (Desktop only — crisp SnowMark circular icon) */}
      {view !== "snow" && (
        <button
          type="button"
          onClick={() => setSnowDrawerOpen(true)}
          aria-label="Spørg Snow"
          className="fixed bottom-6 right-6 z-30 hidden h-11 w-11 items-center justify-center rounded-full border border-[#DCE4FF] bg-white text-[#0027eb] shadow-[0_10px_28px_-6px_rgba(0,39,235,0.3)] transition-all hover:scale-105 hover:border-[#0027eb] lg:inline-flex"
        >
          <SnowMark className="h-5 w-5" />
        </button>
      )}

      {/* =====================================================================
          FLOATING iOS 26 LIQUID GLASS TAB BAR — 5 CORE WORKFLOW TABS
         ===================================================================== */}
      <div
        className="flake-mobile-nav pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center px-2 pt-1 lg:hidden"
        style={{
          paddingBottom: "max(1.125rem, calc(env(safe-area-inset-bottom, 0px) * 0.72))",
        }}
      >
        <GlassTabBar
          aria-label="Hovednavigation"
          value={
            view === "advertisers" ||
            view === "top_picks" ||
            view === "following" ||
            view === "folders"
              ? "explore"
              : view === "assets"
                ? "studio"
                : view === "brands"
                  ? "shops"
                  : view === "mcp"
                    ? "analytics"
                    : view
          }
          onValueChange={(next) => {
            const target = next as ActiveView;
            navigateWithSkeleton(() => {
              setView(target);
              setSelectedShopId(null);
              setSelectedFolderId(null);
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
            value="snow"
            icon={<SnowMark />}
            label="Snow"
          />
          <GlassTabBarItem
            value="studio"
            icon={<Film strokeWidth={view === "studio" ? 2.25 : 1.85} />}
            label="Studio"
          />
          <GlassTabBarItem
            value="analytics"
            icon={<BarChart3 strokeWidth={view === "analytics" ? 2.25 : 1.85} />}
            label="Analytics"
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
        onCloneAd={(ad) => handleCloneAdToStudio(ad)}
        onAskSnow={handleAskSnowAboutAd}
      />

      {/* BRAND MEMORY ONBOARDING MODAL */}
      <BrandMemoryModal
        open={brandMemoryModalOpen}
        initialMemory={brandMemory}
        onClose={() => setBrandMemoryModalOpen(false)}
        onSaveMemory={(mem) => {
          setBrandMemory(mem);
          showToast(`Brand Memory gemt for ${mem.brandName}`);
        }}
      />

      {/* SNOW AI QUICK COPILOT DRAWER */}
      <SnowQuickDrawer
        open={snowDrawerOpen}
        onClose={() => setSnowDrawerOpen(false)}
        brandMemory={brandMemory}
        messages={snowMessages}
        ads={dedupedAds}
        analyticsRows={ownAnalyticsRows}
        onMessagesChange={setSnowMessages}
        onOpenBrandMemory={() => {
          setSnowDrawerOpen(false);
          setBrandMemoryModalOpen(true);
        }}
        onCloneAdToStudio={handleCloneAdToStudio}
        onOpenBriefInStudio={handleOpenBriefInStudio}
        onOpenAdDetail={(ad) => setActiveAdId(ad.id)}
      />
    </>
  );
}
