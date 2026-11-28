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
  BookOpen,
  Bookmark,
  Bot,
  Check,
  ChevronDown,
  ChevronRight,
  Clock,
  ExternalLink,
  FileBarChart2,
  FileText,
  Film,
  Folder,
  Gift,
  Heart,
  Home,
  Image as ImageIcon,
  Layers,
  LayoutGrid,
  Megaphone,
  MessageCircle,
  MoreHorizontal,
  Package,
  PanelLeft,
  PlaySquare,
  Plug,
  Plus,
  Radar,
  SquarePen,
  Store,
  Sun,
  Trophy,
  UserPlus,
  Users,
  Video,
} from "lucide-react";
import {
  AtriaAdMakerSparkleIcon,
  AtriaBoardGridIcon,
  AtriaInspoCompassIcon,
  ChromeColorIcon,
  InstagramMonoIcon,
} from "./BrandIcons";
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
  const [brandsSubView, setBrandsSubView] = useState<BrandsSubView>("list");
  const [mcpSubView, setMcpSubView] = useState<McpSubView>("overview");
  const [followedBrandIds, setFollowedBrandIds] = useState<string[]>([]);
  const [creditsCount, setCreditsCount] = useState<number>(700);
  const [expandedBoards, setExpandedBoards] = useState<Record<string, boolean>>({});
  const [brandDropdownOpen, setBrandDropdownOpen] = useState(false);

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
    useState<AnalyticsReportId>("connect");
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
    <header className="mobile-pwa-header fixed inset-x-0 top-0 z-40 flex items-center justify-between border-b border-[#ebebf3] bg-white px-4 pb-2.5 text-[#0F172A] lg:hidden">
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
          data-no-glass="true"
          onClick={() =>
            navigateWithSkeleton(() => {
              setView("folders");
              setSelectedShopId(null);
            })
          }
          aria-label="Folders"
          className={`flex h-7 w-7 items-center justify-center rounded-lg border transition-colors ${
            view === "folders"
              ? "border-[#0027eb] bg-[#0027eb] text-white"
              : "border-[#d6d6e0] bg-white text-[#475569] hover:border-[#0027eb]"
          }`}
        >
          <Folder className="h-3.5 w-3.5" />
        </button>
      </div>
    </header>
    <div className="flake-app-shell flex w-full overflow-hidden bg-[#f5f5fa] lg:bg-[#050811]">
      {/* =====================================================================
          FLAKE COMMAND RAIL (64px) + CONTEXTUAL SUB-SIDEBAR (264px -> 328px)
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
              ? "Analytics & Launch"
              : view === "studio"
                ? "Ad Maker"
                : view === "assets"
                  ? "Assets"
                  : view === "brands"
                    ? "Brands"
                    : "MCP";

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
          label: React.ReactNode;
          active: boolean;
          badge: string | null;
          icon: React.ReactNode;
        }> = [
          {
            id: "inspo",
            targetView: "explore",
            label: "Inspo",
            active: isInspoView,
            badge: null,
            icon: <AtriaInspoCompassIcon className="h-[20px] w-[20px]" />,
          },
          {
            id: "snow",
            targetView: "snow",
            label: "Snow",
            active: view === "snow",
            badge: null,
            icon: <SnowMark className="h-[20px] w-[20px]" />,
          },
          {
            id: "analytics",
            targetView: "analytics",
            label: (
              <>
                Analytics
                <br />
                &amp; Launch
              </>
            ),
            active: view === "analytics",
            badge: null,
            icon: <BarChart3 className="h-[19px] w-[19px]" strokeWidth={1.75} />,
          },
          {
            id: "studio",
            targetView: "studio",
            label: "Ad Maker",
            active: view === "studio",
            badge: "HOT",
            icon: <AtriaAdMakerSparkleIcon className="h-[21px] w-[21px]" />,
          },
          {
            id: "assets",
            targetView: "assets",
            label: "Assets",
            active: view === "assets",
            badge: null,
            icon: <Video className="h-[19px] w-[19px]" strokeWidth={1.75} />,
          },
          {
            id: "brands",
            targetView: "brands",
            label: "Brands",
            active: view === "brands",
            badge: null,
            icon: <Store className="h-[19px] w-[19px]" strokeWidth={1.75} />,
          },
          {
            id: "mcp",
            targetView: "mcp",
            label: "MCP",
            active: view === "mcp",
            badge: null,
            icon: <Plug className="h-[19px] w-[19px]" strokeWidth={1.75} />,
          },
        ];

        const drawerRowClass = (active: boolean) =>
          `group flex h-9 w-full items-center justify-between gap-2 rounded-lg px-2.5 text-left text-[13.5px] transition-colors ${
            active
              ? "bg-white/15 font-semibold text-white"
              : "font-medium text-white/70 hover:bg-white/10 hover:text-white"
          }`;

        const toggleBoardExpand = (boardId: string) => {
          setExpandedBoards((prev) => ({
            ...prev,
            [boardId]: !prev[boardId],
          }));
        };

        const sidebarBoardsList: Array<{ id: string; name: string; isVirtual?: boolean }> =
          boards.length > 0
            ? boards.map((b) => ({ id: b.id, name: b.name }))
            : [{ id: "default-board", name: "Default Board", isVirtual: true }];

        return (
          <aside className="flake-dark-shell relative hidden h-full shrink-0 text-white lg:flex">
            {/* 1. LEFT COMMAND RAIL (64px fixed ALWAYS) */}
            <div className="relative z-20 flex h-full w-[64px] shrink-0 flex-col items-center justify-between border-r border-white/15 bg-transparent pb-3 pt-4">
              <div className="no-scrollbar flex w-full flex-col items-center overflow-y-auto">
                {/* Top 36x36 rounded-[6px] Flake Cobalt Workspace Squircle */}
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
                  title="Flake Workspace"
                  className="group mb-3 flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-[6px] border border-white/20 bg-[#0027eb] transition-opacity hover:opacity-95"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/icons/icon-192.png"
                    alt="Flake"
                    className="h-full w-full object-cover"
                  />
                </button>

                {/* 7 Core Workspace Sections */}
                <div className="flex w-full flex-col items-center gap-1.5 px-1">
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
                      className="group relative flex w-full flex-col items-center justify-center gap-1 py-0.5 text-center transition-colors"
                    >
                      <span
                        className={`relative flex h-9 w-9 items-center justify-center rounded-[6px] transition-colors ${
                          item.active
                            ? "bg-white/20 text-white"
                            : "text-white/65 group-hover:bg-white/15 group-hover:text-white"
                        }`}
                      >
                        {item.icon}
                        {item.badge && (
                          <span className="absolute -right-2 -top-1 inline-flex h-[14px] items-center justify-center rounded-full bg-[#0027eb] px-1 text-[8px] font-bold leading-none tracking-wider text-white">
                            {item.badge}
                          </span>
                        )}
                      </span>
                      <span
                        className={`text-[10.5px] leading-[1.15] tracking-tight transition-colors ${
                          item.active
                            ? "font-semibold text-white"
                            : "font-medium text-white/65 group-hover:text-white/90"
                        }`}
                      >
                        {item.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Bottom Vertical Utility Stack + Unbordered Credits Footer */}
              <div className="mt-2 flex w-full flex-col items-center gap-0.5">
                {!hasSubDrawer && (
                  <button
                    type="button"
                    data-no-glass="true"
                    onClick={() => setSubNavOpen(true)}
                    title="Expand sidebar"
                    className="flex h-9 w-9 items-center justify-center rounded-[6px] text-white/65 transition-colors hover:bg-white/10 hover:text-white"
                  >
                    <PanelLeft className="h-[17px] w-[17px]" strokeWidth={1.75} />
                  </button>
                )}
                <button
                  type="button"
                  data-no-glass="true"
                  onClick={() => showToast("Affiliate program — 25% recurring commission")}
                  title="Affiliate program"
                  className="flex h-9 w-9 items-center justify-center rounded-[6px] text-white/65 transition-colors hover:bg-white/10 hover:text-white"
                >
                  <Gift className="h-[17px] w-[17px]" strokeWidth={1.75} />
                </button>
                <button
                  type="button"
                  data-no-glass="true"
                  onClick={() => showToast("What's new: Ad Maker v2 + Snow AI")}
                  title="News Center"
                  className="relative flex h-9 w-9 items-center justify-center rounded-[6px] text-white/65 transition-colors hover:bg-white/10 hover:text-white"
                >
                  <Megaphone className="h-[17px] w-[17px]" strokeWidth={1.75} />
                  <span className="absolute right-1 top-1 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-[#0027eb] px-1 font-mono-num text-[9px] font-bold leading-none text-white">
                    1
                  </span>
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
                  className="flex h-9 w-9 items-center justify-center rounded-[6px] text-white/65 transition-colors hover:bg-white/10 hover:text-white"
                >
                  <UserPlus className="h-[17px] w-[17px]" strokeWidth={1.75} />
                </button>
                <button
                  type="button"
                  data-no-glass="true"
                  onClick={() => showToast("Theme: Flake Light workspace")}
                  title="Theme"
                  className="flex h-9 w-9 items-center justify-center rounded-[6px] text-white/65 transition-colors hover:bg-white/10 hover:text-white"
                >
                  <Sun className="h-[17px] w-[17px]" strokeWidth={1.75} />
                </button>

                <div className="my-1.5 h-px w-8 bg-white/15" />

                <button
                  type="button"
                  data-no-glass="true"
                  onClick={() => {
                    navigateWithSkeleton(() => {
                      setView("brands");
                      setBrandsSubView("list");
                      setSubNavOpen(true);
                    });
                  }}
                  title="Workspace credits"
                  className="flex w-full flex-col items-center justify-center py-0.5 text-center transition-opacity hover:opacity-90"
                >
                  <span className="inline-flex items-center gap-1 font-mono-num text-[12.5px] font-semibold leading-tight text-white">
                    <svg
                      viewBox="0 0 12 12"
                      fill="currentColor"
                      className="h-2.5 w-2.5 text-white"
                      aria-hidden="true"
                    >
                      <path d="M6 0.5C6.75 3.4 8.6 5.25 11.5 6C8.6 6.75 6.75 8.6 6 11.5C5.25 8.6 3.4 6.75 0.5 6C3.4 5.25 5.25 3.4 6 0.5Z" />
                    </svg>
                    {creditsCount}
                  </span>
                  <span className="text-[11px] font-semibold leading-tight text-[#6B8CFF]">
                    Free
                  </span>
                </button>
              </div>
            </div>

            {/* 2. CONTEXTUAL SUB-SIDEBAR (264px -> 328px total expanded) */}
            {hasSubDrawer && (
              <div className="relative flex h-full w-[264px] shrink-0 flex-col border-r border-white/15 bg-transparent px-3 py-3.5 text-white">
                {/* Clean Title-Only Header + Collapse Toggle */}
                <div className="mb-3.5 flex items-center justify-between px-1.5">
                  <h2 className="text-[15px] font-semibold tracking-tight text-white">
                    {sectionTitle}
                  </h2>
                  <button
                    type="button"
                    data-no-glass="true"
                    onClick={() => setSubNavOpen(false)}
                    title="Collapse sidebar"
                    className="flex h-7 w-7 items-center justify-center rounded-[6px] text-white/55 transition-colors hover:bg-white/10 hover:text-white"
                  >
                    <PanelLeft className="h-4 w-4" strokeWidth={1.75} />
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
                          icon: <AtriaInspoCompassIcon className="h-4 w-4" />,
                        },
                        {
                          id: "shops" as ActiveView,
                          label: "Brands",
                          active: view === "shops",
                          icon: <Store className="h-4 w-4" strokeWidth={1.75} />,
                        },
                        {
                          id: "advertisers" as ActiveView,
                          label: "Advertisers",
                          active: view === "advertisers",
                          icon: <Users className="h-4 w-4" strokeWidth={1.75} />,
                        },
                        {
                          id: "top_picks" as ActiveView,
                          label: "Top picks",
                          active: view === "top_picks",
                          icon: <Trophy className="h-4 w-4" strokeWidth={1.75} />,
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
                                  ? "text-white"
                                  : "text-white/60 group-hover:text-white/90"
                              }
                            >
                              {row.icon}
                            </span>
                            {row.label}
                          </span>
                        </button>
                      ))}
                    </div>

                    <div className="my-2 border-t border-white/10" />

                    <div className="space-y-0.5">
                      {[
                        {
                          id: "following" as ActiveView,
                          label: "Following",
                          active: view === "following",
                          icon: <Heart className="h-4 w-4" strokeWidth={1.75} />,
                          count:
                            followedBrandIds.length > 0
                              ? followedBrandIds.length
                              : null,
                        },
                        {
                          id: "folders" as ActiveView,
                          label: "Saved ads",
                          active: view === "folders" && !selectedFolderId,
                          icon: <Bookmark className="h-4 w-4" strokeWidth={1.75} />,
                          count: null,
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
                                  ? "text-white"
                                  : "text-white/60 group-hover:text-white/90"
                              }
                            >
                              {row.icon}
                            </span>
                            {row.label}
                          </span>
                          {row.count !== null && (
                            <span className="font-mono-num text-[11px] font-medium text-white/55">
                              {row.count}
                            </span>
                          )}
                        </button>
                      ))}
                    </div>

                    <div className="my-2 border-t border-white/10" />

                    {/* Boards Tree */}
                    <div className="flex min-h-0 flex-1 flex-col pt-1">
                      <div className="mb-1.5 flex items-center justify-between px-2">
                        <span className="text-[12.5px] font-semibold text-white/50">
                          Boards
                        </span>
                        <button
                          type="button"
                          data-no-glass="true"
                          onClick={() => setQuickFolderOpen((v) => !v)}
                          title="New board"
                          className="flex h-6 w-6 items-center justify-center rounded text-white/60 transition-colors hover:bg-white/10 hover:text-white"
                        >
                          <Plus className="h-3.5 w-3.5" strokeWidth={1.75} />
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
                            className="w-full rounded-lg border border-white/15 bg-white/[0.08] px-2.5 py-1.5 text-xs text-white outline-none placeholder:text-white/40 focus:border-[#3B66FF]"
                          />
                        </form>
                      )}

                      <div className="no-scrollbar min-h-0 flex-1 space-y-0.5 overflow-y-auto">
                        {sidebarBoardsList.map((board) => {
                          const isExpanded = Boolean(expandedBoards[board.id]);
                          const active =
                            view === "folders" &&
                            ((!board.isVirtual && selectedFolderId === board.id) ||
                              (Boolean(board.isVirtual) && !selectedFolderId));
                          return (
                            <div key={board.id}>
                              <div
                                className={`group flex h-8 w-full items-center justify-between gap-1 rounded-lg px-1.5 text-[13px] transition-colors ${
                                  active
                                    ? "bg-white/15 font-semibold text-white"
                                    : "font-medium text-white/70 hover:bg-white/10 hover:text-white"
                                }`}
                              >
                                <div className="flex min-w-0 flex-1 items-center gap-1">
                                  <button
                                    type="button"
                                    data-no-glass="true"
                                    onClick={() => toggleBoardExpand(board.id)}
                                    aria-label={isExpanded ? "Collapse board" : "Expand board"}
                                    className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-white/50 hover:text-white"
                                  >
                                    {isExpanded ? (
                                      <ChevronDown className="h-3 w-3" />
                                    ) : (
                                      <ChevronRight className="h-3 w-3" />
                                    )}
                                  </button>
                                  <button
                                    type="button"
                                    data-no-glass="true"
                                    onClick={() => {
                                      navigateWithSkeleton(() => {
                                        setSelectedFolderId(board.isVirtual ? null : board.id);
                                        setSelectedShopId(null);
                                        setView("folders");
                                      });
                                    }}
                                    className="flex min-w-0 flex-1 items-center gap-2 text-left"
                                  >
                                    <AtriaBoardGridIcon
                                      className={`h-4 w-4 shrink-0 ${
                                        active
                                          ? "text-white"
                                          : "text-white/60 group-hover:text-white/90"
                                      }`}
                                    />
                                    <span className="truncate">{board.name}</span>
                                  </button>
                                </div>
                                <div className="flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                                  <button
                                    type="button"
                                    data-no-glass="true"
                                    onClick={() => {
                                      navigateWithSkeleton(() => {
                                        setSelectedFolderId(board.isVirtual ? null : board.id);
                                        setView("folders");
                                      });
                                    }}
                                    title="Board options"
                                    className="flex h-5 w-5 items-center justify-center rounded text-white/55 hover:bg-white/15 hover:text-white"
                                  >
                                    <MoreHorizontal className="h-3.5 w-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    data-no-glass="true"
                                    onClick={() => setQuickFolderOpen(true)}
                                    title="Add sub-board"
                                    className="flex h-5 w-5 items-center justify-center rounded text-white/55 hover:bg-white/15 hover:text-white"
                                  >
                                    <Plus className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              </div>

                              {isExpanded && (
                                <button
                                  type="button"
                                  data-no-glass="true"
                                  onClick={() => {
                                    navigateWithSkeleton(() => {
                                      setSelectedFolderId(board.isVirtual ? null : board.id);
                                      setSelectedShopId(null);
                                      setView("folders");
                                    });
                                  }}
                                  className="mt-0.5 flex h-8 w-full items-center gap-2 rounded-lg pl-8 pr-2 text-left text-[12.5px] font-medium text-white/60 transition-colors hover:bg-white/10 hover:text-white"
                                >
                                  <AtriaBoardGridIcon className="h-3.5 w-3.5 shrink-0 text-white/50" />
                                  <span className="truncate">Default Sub-board</span>
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Save ads from Extension | IG (mobile) — Flat Atria 2-col bar */}
                    <div className="mx-0.5 mt-3 rounded-lg bg-white/15 p-3">
                      <p className="mb-2 text-center text-[12.5px] font-semibold text-white">
                        Save ads from
                      </p>
                      <div className="flex items-center">
                        <button
                          type="button"
                          data-no-glass="true"
                          onClick={() =>
                            showToast("Chrome Extension ready for Meta & TikTok Ad Library")
                          }
                          className="flex flex-1 items-center justify-center gap-1.5 rounded-md py-1 text-[12px] font-medium text-white/90 transition-colors hover:bg-white/10 hover:text-white"
                        >
                          <ChromeColorIcon className="h-3.5 w-3.5 shrink-0" />
                          <span>Extension</span>
                        </button>
                        <span className="h-4 w-px shrink-0 bg-white/15" />
                        <button
                          type="button"
                          data-no-glass="true"
                          onClick={() =>
                            navigateWithSkeleton(() => {
                              setView("folders");
                              setSelectedFolderId(null);
                            })
                          }
                          className="flex flex-1 items-center justify-center gap-1.5 rounded-md py-1 text-[12px] font-medium text-white/90 transition-colors hover:bg-white/10 hover:text-white"
                        >
                          <InstagramMonoIcon className="h-3.5 w-3.5 shrink-0 text-white" />
                          <span>IG (mobile)</span>
                        </button>
                      </div>
                    </div>
                  </>
                )}

                {/* SECTION 2: SNOW DRAWER */}
                {view === "snow" && (
                  <div className="flex flex-1 flex-col justify-between">
                    <div className="space-y-0.5">
                      <button
                        type="button"
                        data-no-glass="true"
                        onClick={() => setBrandMemoryModalOpen(true)}
                        className="mb-3 flex h-9 w-full items-center justify-between rounded-lg border border-white/15 bg-white/[0.04] px-3 text-left text-[13px] font-medium text-white transition-colors hover:bg-white/[0.08]"
                      >
                        <span className="truncate">
                          {brandMemory ? brandMemory.brandName : "All brands"}
                        </span>
                        <ChevronDown className="h-3.5 w-3.5 shrink-0 text-white/60" />
                      </button>

                      {[
                        {
                          id: "home" as SnowSubView,
                          label: "Home",
                          icon: <Home className="h-4 w-4" strokeWidth={1.75} />,
                        },
                        {
                          id: "new_task" as SnowSubView,
                          label: "New task",
                          icon: <SquarePen className="h-4 w-4" strokeWidth={1.75} />,
                        },
                        {
                          id: "connectors" as SnowSubView,
                          label: "Connectors",
                          icon: <Plug className="h-4 w-4" strokeWidth={1.75} />,
                        },
                        {
                          id: "automations" as SnowSubView,
                          label: "Automations",
                          icon: <Clock className="h-4 w-4" strokeWidth={1.75} />,
                        },
                        {
                          id: "skills" as SnowSubView,
                          label: "Skills",
                          icon: <FileText className="h-4 w-4" strokeWidth={1.75} />,
                        },
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
                                snowSubView === item.id
                                  ? "text-white"
                                  : "text-white/60 group-hover:text-white/90"
                              }
                            >
                              {item.icon}
                            </span>
                            {item.label}
                          </span>
                        </button>
                      ))}

                      <button
                        type="button"
                        data-no-glass="true"
                        onClick={() => showToast("Feedback noted — thank you for helping improve Snow")}
                        className={drawerRowClass(false)}
                      >
                        <span className="flex items-center gap-2.5">
                          <span className="text-white/60 group-hover:text-white/90">
                            <MessageCircle className="h-4 w-4" strokeWidth={1.75} />
                          </span>
                          Leave feedback
                        </span>
                      </button>
                    </div>

                    {snowMessages.length > 0 && (
                      <div className="border-t border-white/10 pt-3">
                        <p className="mb-1.5 px-2 text-[11px] font-semibold text-white/45">
                          Recent threads
                        </p>
                        <button
                          type="button"
                          data-no-glass="true"
                          onClick={() => setSnowSubView("home")}
                          className="w-full truncate rounded-lg bg-white/10 px-2.5 py-1.5 text-left text-[12px] text-white/85 hover:bg-white/15"
                        >
                          {snowMessages[0]?.content.slice(0, 32)}...
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* SECTION 3: ANALYTICS & LAUNCH DRAWER */}
                {view === "analytics" && (
                  <div className="flex flex-1 flex-col justify-between">
                    <div>
                      <div className="mb-2 flex items-center justify-between px-1.5">
                        <span className="text-[13px] font-semibold text-white/60">
                          Ad accounts ({importedCsvRows.length > 0 ? 1 : 0})
                        </span>
                        <button
                          type="button"
                          data-no-glass="true"
                          onClick={() => setAnalyticsReport("connect")}
                          title="Connect ad account"
                          className="flex h-6 w-6 items-center justify-center rounded text-white/60 transition-colors hover:bg-white/10 hover:text-white"
                        >
                          <Plus className="h-3.5 w-3.5" strokeWidth={1.75} />
                        </button>
                      </div>

                      {importedCsvRows.length === 0 && analyticsReport === "connect" ? (
                        <p className="px-1.5 text-[12.5px] leading-relaxed text-white/55">
                          Click the &quot;+&quot; above to add a data source and analyze your ad performance.
                        </p>
                      ) : (
                        <>
                          <div className="mb-3 flex items-center justify-between rounded-lg border border-white/15 bg-white/[0.05] px-2.5 py-2">
                            <span className="flex min-w-0 items-center gap-2 text-[13px] font-semibold text-white">
                              <span className="h-2 w-2 shrink-0 rounded-full bg-[#22C55E]" />
                              <span className="truncate">
                                {brandMemory ? brandMemory.brandName : "Flake Demo"}
                              </span>
                            </span>
                            <button
                              type="button"
                              data-no-glass="true"
                              onClick={() => setAnalyticsReport("connect")}
                              className="text-[11px] font-medium text-white/55 hover:text-white"
                            >
                              Connect
                            </button>
                          </div>

                          <p className="px-2 pb-1.5 text-[11.5px] font-semibold text-white/45">
                            System reports
                          </p>
                          <div className="space-y-0.5">
                            {(
                              [
                                { id: "overview", label: "Key metrics overview" },
                                { id: "top_spend", label: "Top spend ads" },
                                { id: "top_performing", label: "Top performing ads" },
                                { id: "top_videos", label: "Top performing videos" },
                                { id: "top_images", label: "Top performing images" },
                                { id: "top_hooks", label: "Top hooks & retention" },
                              ] as Array<{ id: AnalyticsReportId; label: string }>
                            ).map((rep) => (
                              <button
                                key={rep.id}
                                type="button"
                                data-no-glass="true"
                                onClick={() => setAnalyticsReport(rep.id)}
                                className={drawerRowClass(analyticsReport === rep.id)}
                              >
                                <span className="flex min-w-0 items-center gap-2.5">
                                  <FileBarChart2
                                    className={`h-4 w-4 shrink-0 ${
                                      analyticsReport === rep.id
                                        ? "text-white"
                                        : "text-white/60 group-hover:text-white/90"
                                    }`}
                                    strokeWidth={1.75}
                                  />
                                  <span className="truncate">{rep.label}</span>
                                </span>
                              </button>
                            ))}
                          </div>
                        </>
                      )}
                    </div>

                    <button
                      type="button"
                      data-no-glass="true"
                      onClick={() =>
                        setAnalyticsReport((prev) =>
                          prev === "connect" ? "overview" : "connect"
                        )
                      }
                      className="mt-3 flex w-full items-center justify-between rounded-lg bg-white/15 px-3 py-2.5 text-[13px] font-medium text-white transition-colors hover:bg-white/20"
                    >
                      <span>Ad spend usage</span>
                      <span className="inline-flex items-center gap-0.5 font-mono-num text-[12.5px]">
                        <span className="font-semibold text-white">0</span>
                        <span className="text-white/55">/10K</span>
                        <ChevronRight className="h-3.5 w-3.5 text-white/60" />
                      </span>
                    </button>
                  </div>
                )}

                {/* SECTION 4: AD MAKER DRAWER */}
                {view === "studio" && (
                  <div className="space-y-0.5">
                    <button
                      type="button"
                      data-no-glass="true"
                      onClick={() => setStudioInitialTab("video")}
                      className={drawerRowClass(studioInitialTab === "video")}
                    >
                      <span className="flex items-center gap-2.5">
                        <Video
                          className={`h-4 w-4 ${
                            studioInitialTab === "video"
                              ? "text-white"
                              : "text-white/60 group-hover:text-white/90"
                          }`}
                          strokeWidth={1.75}
                        />
                        <span>Video Ads</span>
                        <span className="rounded-full bg-[#0027eb] px-1.5 py-0.5 text-[9.5px] font-bold leading-none text-white">
                          NEW
                        </span>
                      </span>
                    </button>
                    <div className="ml-4 space-y-0.5">
                      <button
                        type="button"
                        data-no-glass="true"
                        onClick={() => setStudioInitialTab("video_projects")}
                        className={drawerRowClass(studioInitialTab === "video_projects")}
                      >
                        <span className="flex items-center gap-2.5">
                          <Folder
                            className={`h-4 w-4 ${
                              studioInitialTab === "video_projects"
                                ? "text-white"
                                : "text-white/60 group-hover:text-white/90"
                            }`}
                            strokeWidth={1.75}
                          />
                          <span>Video projects</span>
                        </span>
                      </button>
                      <button
                        type="button"
                        data-no-glass="true"
                        onClick={() => setStudioInitialTab("media")}
                        className={drawerRowClass(studioInitialTab === "media")}
                      >
                        <span className="flex items-center gap-2.5">
                          <PlaySquare
                            className={`h-4 w-4 ${
                              studioInitialTab === "media"
                                ? "text-white"
                                : "text-white/60 group-hover:text-white/90"
                            }`}
                            strokeWidth={1.75}
                          />
                          <span>Media</span>
                        </span>
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
                        <ImageIcon
                          className={`h-4 w-4 ${
                            studioInitialTab === "static"
                              ? "text-white"
                              : "text-white/60 group-hover:text-white/90"
                          }`}
                          strokeWidth={1.75}
                        />
                        <span>Image Ads</span>
                      </span>
                    </button>
                    <div className="ml-4 space-y-0.5">
                      <button
                        type="button"
                        data-no-glass="true"
                        onClick={() => setStudioInitialTab("image_projects")}
                        className={drawerRowClass(studioInitialTab === "image_projects")}
                      >
                        <span className="flex items-center gap-2.5">
                          <Folder
                            className={`h-4 w-4 ${
                              studioInitialTab === "image_projects"
                                ? "text-white"
                                : "text-white/60 group-hover:text-white/90"
                            }`}
                            strokeWidth={1.75}
                          />
                          <span>Image projects</span>
                        </span>
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
                        <Bot
                          className={`h-4 w-4 ${
                            studioInitialTab === "miner"
                              ? "text-white"
                              : "text-white/60 group-hover:text-white/90"
                          }`}
                          strokeWidth={1.75}
                        />
                        <span>AI Playground</span>
                      </span>
                      <span className="rounded border border-white/15 px-1.5 py-0.5 text-[10px] font-medium text-white/50">
                        Legacy
                      </span>
                    </button>
                  </div>
                )}

                {/* SECTION 5: ASSETS DRAWER */}
                {view === "assets" && (
                  <div className="flex flex-1 flex-col">
                    <button
                      type="button"
                      data-no-glass="true"
                      onClick={() => setBrandMemoryModalOpen(true)}
                      className="mb-2.5 flex h-9 w-full items-center justify-between rounded-lg border border-white/15 bg-white/[0.04] px-3 text-left text-[13px] font-medium text-white transition-colors hover:bg-white/[0.08]"
                    >
                      <span className="truncate">
                        {brandMemory ? brandMemory.brandName : "Arch & Pillar"}
                      </span>
                      <ChevronDown className="h-3.5 w-3.5 shrink-0 text-white/60" />
                    </button>

                    <button
                      type="button"
                      data-no-glass="true"
                      onClick={() => setView("assets")}
                      className={drawerRowClass(true)}
                    >
                      <span className="flex items-center gap-2.5">
                        <Layers className="h-4 w-4 text-white" strokeWidth={1.75} />
                        <span>All assets</span>
                      </span>
                    </button>

                    <div className="my-2.5 border-t border-white/10" />

                    <div className="mb-1.5 flex items-center justify-between px-2">
                      <span className="text-[12.5px] font-semibold text-white/50">
                        Boards
                      </span>
                      <button
                        type="button"
                        data-no-glass="true"
                        onClick={() => setQuickFolderOpen((v) => !v)}
                        title="New board"
                        className="flex h-6 w-6 items-center justify-center rounded text-white/60 transition-colors hover:bg-white/10 hover:text-white"
                      >
                        <Plus className="h-3.5 w-3.5" strokeWidth={1.75} />
                      </button>
                    </div>

                    <div className="space-y-0.5">
                      {sidebarBoardsList.map((b) => (
                        <button
                          key={b.id}
                          type="button"
                          data-no-glass="true"
                          onClick={() =>
                            navigateWithSkeleton(() => {
                              setSelectedFolderId(b.isVirtual ? null : b.id);
                              setView("folders");
                            })
                          }
                          className="flex h-8 w-full items-center gap-2 rounded-lg px-2 text-left text-[13px] font-medium text-white/65 transition-colors hover:bg-white/10 hover:text-white"
                        >
                          <ChevronRight className="h-3 w-3 shrink-0 text-white/45" />
                          <AtriaBoardGridIcon className="h-4 w-4 shrink-0 text-white/60" />
                          <span className="truncate">{b.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* SECTION 6: BRANDS DRAWER */}
                {view === "brands" && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between px-1.5">
                      <span className="text-[13px] font-semibold text-white/60">
                        Brands ({brandMemory ? 1 : 1})
                      </span>
                      <button
                        type="button"
                        data-no-glass="true"
                        onClick={() => setBrandMemoryModalOpen(true)}
                        title="Create brand"
                        className="flex h-6 w-6 items-center justify-center rounded text-white/60 transition-colors hover:bg-white/10 hover:text-white"
                      >
                        <Plus className="h-3.5 w-3.5" strokeWidth={1.75} />
                      </button>
                    </div>

                    <button
                      type="button"
                      data-no-glass="true"
                      onClick={() => setBrandDropdownOpen((v) => !v)}
                      className="flex h-9 w-full items-center justify-between rounded-lg border border-white/15 bg-white/[0.04] px-3 text-left text-[13px] font-medium text-white/75 transition-colors hover:bg-white/[0.08] hover:text-white"
                    >
                      <span className="truncate">
                        {brandsSubView === "list"
                          ? "Select a brand"
                          : brandMemory
                            ? brandMemory.brandName
                            : "Arch & Pillar"}
                      </span>
                      <ChevronDown className="h-3.5 w-3.5 shrink-0 text-white/60" />
                    </button>

                    {(brandDropdownOpen || brandsSubView !== "list") && (
                      <div className="space-y-0.5 pt-1">
                        <button
                          type="button"
                          data-no-glass="true"
                          onClick={() => {
                            setBrandsSubView("list");
                            setBrandDropdownOpen(false);
                          }}
                          className={drawerRowClass(brandsSubView === "list")}
                        >
                          <span className="flex items-center gap-2.5">
                            <Layers
                              className={`h-4 w-4 ${
                                brandsSubView === "list"
                                  ? "text-white"
                                  : "text-white/60 group-hover:text-white/90"
                              }`}
                              strokeWidth={1.75}
                            />
                            All brands
                          </span>
                        </button>
                        {[
                          {
                            id: "overview" as BrandsSubView,
                            label: "Overview",
                            icon: <Store className="h-4 w-4" strokeWidth={1.75} />,
                          },
                          {
                            id: "audience" as BrandsSubView,
                            label: "Audience",
                            icon: <Users className="h-4 w-4" strokeWidth={1.75} />,
                          },
                          {
                            id: "products" as BrandsSubView,
                            label: "Products",
                            icon: <Package className="h-4 w-4" strokeWidth={1.75} />,
                          },
                          {
                            id: "competitors" as BrandsSubView,
                            label: "Competitors",
                            icon: <Radar className="h-4 w-4" strokeWidth={1.75} />,
                          },
                        ].map((bItem) => (
                          <button
                            key={bItem.id}
                            type="button"
                            data-no-glass="true"
                            onClick={() => {
                              setBrandsSubView(bItem.id);
                              setBrandDropdownOpen(false);
                            }}
                            className={drawerRowClass(brandsSubView === bItem.id)}
                          >
                            <span className="flex items-center gap-2.5">
                              <span
                                className={
                                  brandsSubView === bItem.id
                                    ? "text-white"
                                    : "text-white/60 group-hover:text-white/90"
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
                  </div>
                )}

                {/* SECTION 7: MCP DRAWER */}
                {view === "mcp" && (
                  <div className="space-y-0.5">
                    <p className="px-2.5 pb-1.5 text-[13px] font-semibold text-white">
                      Flake MCP
                    </p>
                    {[
                      {
                        id: "overview" as McpSubView,
                        label: "Overview",
                        icon: <Home className="h-4 w-4" strokeWidth={1.75} />,
                      },
                      {
                        id: "prompts" as McpSubView,
                        label: "Prompt library",
                        icon: <FileText className="h-4 w-4" strokeWidth={1.75} />,
                      },
                      {
                        id: "skills" as McpSubView,
                        label: "Skill Hub",
                        icon: <LayoutGrid className="h-4 w-4" strokeWidth={1.75} />,
                      },
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
                              mcpSubView === mItem.id
                                ? "text-white"
                                : "text-white/60 group-hover:text-white/90"
                            }
                          >
                            {mItem.icon}
                          </span>
                          {mItem.label}
                        </span>
                      </button>
                    ))}
                    <button
                      type="button"
                      data-no-glass="true"
                      onClick={() => {
                        setMcpSubView("overview");
                        showToast("Flake MCP endpoint: https://api.flake.app/mcp");
                      }}
                      className={drawerRowClass(false)}
                    >
                      <span className="flex items-center gap-2.5">
                        <span className="text-white/60 group-hover:text-white/90">
                          <BookOpen className="h-4 w-4" strokeWidth={1.75} />
                        </span>
                        Documentation
                      </span>
                      <ExternalLink className="h-3.5 w-3.5 text-white/45" strokeWidth={1.75} />
                    </button>
                  </div>
                )}
              </div>
            )}
          </aside>
        );
      })()}

      {/* =====================================================================
          STATIONARY WORKSPACE FRAME — CRISP STRAIGHT SEAM ONTO #f5f5fa CANVAS
         ===================================================================== */}
      <div className="flex h-full min-w-0 flex-1 flex-col overflow-hidden bg-[#f5f5fa] lg:relative lg:z-10">
        {/* Global Live Toast (floating so full-bleed sticky headers never shift) */}
        {toast && (
          <div className="fixed right-5 top-4 z-50 inline-flex items-center gap-2 rounded-lg border border-[#d6d6e0] bg-white px-3.5 py-2 text-xs font-semibold text-[#0F172A] shadow-[0_8px_28px_rgba(15,23,42,0.12)]">
            <Check className="h-3.5 w-3.5 text-[#0F172A]" />
            {toast}
          </div>
        )}

        {/* SCROLLABLE WORKSPACE CONTENT VIEWPORT */}
        <main
          ref={workspaceScrollRef}
          data-scroll-root="true"
          className="workspace-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain bg-[#f5f5fa] pt-[calc(env(safe-area-inset-top,0px)+52px)] pb-[calc(6.5rem+env(safe-area-inset-bottom,0px))] text-[#0F172A] lg:p-0"
        >
          {/* UNIFORM SKELETON LOADING ON INITIAL HYDRATION */}
          {!catalogLoaded ? (
            <div className="px-4 py-5 sm:px-6">
              {view === "explore" ? (
                <ExploreSkeleton />
              ) : view === "folders" ? (
                <FoldersSkeleton />
              ) : selectedShop ? (
                <ShopAnalyticsSkeleton />
              ) : (
                <ShopsSkeleton />
              )}
            </div>
          ) : (
            <>
          {/* =================================================================
              VIEW 1: SHOPS (Table Explorer + Full Trendtrack Shop Analytics)
             ================================================================= */}
          {view === "shops" && selectedShop && (
            <div className="px-4 py-5 sm:px-6">
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
            </div>
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
            <div className="animate-view-in">
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

              {/* 4-COLUMN HORIZONTAL MASONRY FEED ON #f5f5fa CANVAS */}
              <div className="px-4 py-4 sm:px-6 lg:py-5">
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
                <div className="px-4 pb-6 sm:px-6">
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
            </div>
          )}

          {view === "folders" && selectedFolderId && (
            <div className="animate-view-in px-4 py-5 sm:px-6">
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
            <div className="h-full">
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

      {/* FLOATING "SNOW" COPILOT BUTTON (Desktop only — solid Flake Cobalt circle matching Atria bottom-right assistant) */}
      {view !== "snow" && (
        <button
          type="button"
          data-no-glass="true"
          onClick={() => setSnowDrawerOpen(true)}
          aria-label="Ask Snow"
          className="fixed bottom-5 right-5 z-30 hidden h-11 w-11 items-center justify-center rounded-full bg-[#0027eb] text-white shadow-[0_8px_22px_-4px_rgba(0,39,235,0.45)] transition-transform hover:scale-105 hover:bg-[#001fc2] lg:inline-flex"
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
