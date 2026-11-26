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
  BarChart3,
  Bookmark,
  Building2,
  Calendar,
  Check,
  ChevronDown,
  Clapperboard,
  Compass,
  FileBarChart2,
  Film,
  Folder,
  Info,
  Lightbulb,
  ListFilter,
  PackagePlus,
  PanelLeft,
  Plus,
  Radar,
  Search,
  Sparkles,
  Store,
  X,
} from "lucide-react";
import type { Ad, Board, Brand, ConnectorStatus, MarketCode } from "@/lib/types";
import type {
  BrandMemory,
  CreativeProject,
  OwnAdMetricRow,
  SnowMessage,
  VideoStylePresetId,
} from "@/lib/studio-types";
import { buildClonedSourceFromAd } from "@/lib/studio-types";
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
  type StudioSubTab,
} from "./VideoStudioView";
import {
  CreativeAnalyticsView,
  type AnalyticsReportId,
} from "./CreativeAnalyticsView";
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

type ActiveView = "shops" | "explore" | "folders" | "snow" | "studio" | "analytics";
type SortOption = "top" | "reach" | "longest" | "duplicated" | "newest";
type MinReachFilter = "all" | "10k" | "50k" | "100k" | "500k";
type GenderFilter = "all" | "Women" | "Men" | "All";
type AgeFilter = "all" | "18-24" | "25-34" | "35-44" | "45-54" | "55+";

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
  const [filteredServerCounts, setFilteredServerCounts] = useState<AdMarketCounts | null>(null);

  // Navigation: Shops, Explore, Folders + Snow AI, Ad Studio, Analytics & Launch
  const [view, setView] = useState<ActiveView>("shops");
  const [selectedShopId, setSelectedShopId] = useState<string | null>(null);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [quickFolderOpen, setQuickFolderOpen] = useState(false);
  const [quickFolderName, setQuickFolderName] = useState("");
  const [toast, setToast] = useState<string | null>(null);

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
    } catch {
      // ignore storage errors
    }
  }, [brandMemory, creativeProjects, snowMessages, importedCsvRows, hydrated]);

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

  // Non-market filtered Explore ads (used both for visibleAds and market-tab totals)
  const nonMarketFilteredAds = useMemo(() => {
    const q = deferredSearch.trim().toLowerCase();
    return dedupedAds.filter((ad) => {
      if (
        ad.source_type === "instagram" ||
        ad.source_type === "manual" ||
        ad.tags.includes("custom-import") ||
        ad.tags.includes("custom-upload")
      ) {
        return false;
      }
      if (brandFilter !== "all" && ad.brand_id !== brandFilter) return false;
      if (mediaFilter !== "all") {
        const isRealCarousel =
          ad.media_type === "carousel" &&
          Array.isArray(ad.carousel_cards) &&
          ad.carousel_cards.length >= 2;
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
  }, [
    dedupedAds,
    adRankIndex,
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
  ]);

  // Filtered & sorted Explore ads (only tracked paid ads — excludes personal folder uploads / organic IG Reels)
  const visibleAds = useMemo(() => {
    const list =
      marketFilter === "ALL"
        ? nonMarketFilteredAds
        : nonMarketFilteredAds.filter((ad) =>
            marketFilter === "DK" ? ad.market === "DK" : ad.market !== "DK"
          );

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
    nonMarketFilteredAds,
    adRankIndex,
    marketFilter,
    brandFilter,
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

  const hasNonMarketFilters =
    brandFilter !== "all" ||
    mediaFilter !== "all" ||
    timeFilter !== "all" ||
    scaledOnly ||
    deferredSearch.trim().length > 0 ||
    platformFilter !== "all" ||
    countryFilter !== "all" ||
    genderFilter !== "all" ||
    ageFilter !== "all" ||
    minReachFilter !== "all" ||
    rankMin !== null ||
    rankMax !== null;

  // While Stage 2 is still streaming, fetch exact server-side totals when any non-market filter is active
  // (and immediately load the selected brand's ads if brandFilter is set!)
  useEffect(() => {
    if (fullAdsLoaded) {
      setFilteredServerCounts(null);
      return;
    }

    if (brandFilter !== "all" && !loadedBrandAdsRef.current.has(brandFilter)) {
      loadedBrandAdsRef.current.add(brandFilter);
      fetch(`/api/catalog?brandId=${encodeURIComponent(brandFilter)}`, { cache: "no-store" })
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (!data?.synced || !Array.isArray(data.ads) || data.ads.length === 0) return;
          startTransition(() => {
            setAds((prev) => dedupeAds([...(data.ads as Ad[]), ...prev]));
          });
        })
        .catch(() => {
          loadedBrandAdsRef.current.delete(brandFilter);
        });
    }

    if (!hasNonMarketFilters) {
      setFilteredServerCounts(null);
      return;
    }

    let cancelled = false;
    const params = new URLSearchParams({ mode: "counts" });
    if (brandFilter !== "all") params.set("brand", brandFilter);
    if (mediaFilter !== "all") params.set("media", mediaFilter);
    if (timeFilter !== "all") params.set("time", timeFilter);
    if (scaledOnly) params.set("scaled", "1");
    if (deferredSearch.trim()) params.set("q", deferredSearch.trim());

    const delay = deferredSearch.trim() ? 120 : 0;
    const timer = window.setTimeout(() => {
      fetch(`/api/catalog?${params.toString()}`, { cache: "no-store" })
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (cancelled || !data?.synced || !data.counts) return;
          setFilteredServerCounts(data.counts as AdMarketCounts);
        })
        .catch(() => {});
    }, delay);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [
    fullAdsLoaded,
    hasNonMarketFilters,
    brandFilter,
    mediaFilter,
    timeFilter,
    scaledOnly,
    deferredSearch,
  ]);

  const filteredMarketCounts = useMemo<AdMarketCounts>(() => {
    let dk = 0;
    let us = 0;
    for (const ad of nonMarketFilteredAds) {
      if (ad.market === "DK") dk++;
      else us++;
    }
    return { all: dk + us, dk, us };
  }, [nonMarketFilteredAds]);

  // Display totals strictly based on active filters across the FULL catalog — never partial chunk counts
  const displayMarketCounts: AdMarketCounts | null = useMemo(() => {
    if (fullAdsLoaded) return filteredMarketCounts;
    if (hasNonMarketFilters) {
      return filteredServerCounts ?? baseServerCounts;
    }
    return baseServerCounts;
  }, [
    fullAdsLoaded,
    filteredMarketCounts,
    hasNonMarketFilters,
    filteredServerCounts,
    baseServerCounts,
  ]);

  const displayAdsTotal: number | null = useMemo(() => {
    if (!displayMarketCounts) return null;
    if (marketFilter === "DK") return displayMarketCounts.dk;
    if (marketFilter === "US") return displayMarketCounts.us;
    return displayMarketCounts.all;
  }, [displayMarketCounts, marketFilter]);

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
          FLAKE COMMAND RAIL + CONTEXTUAL OBSIDIAN DOCK
         ===================================================================== */}
      {(() => {
        const isInspoView =
          view === "shops" || view === "explore" || view === "folders";
        const hasSubDrawer = (isInspoView || view === "analytics") && subNavOpen;

        const primaryRailItems = [
          {
            id: "inspo",
            label: "Inspo",
            active: isInspoView,
            accent: false,
            badge: null as string | null,
            dot: false,
            icon: <Compass className="h-[18px] w-[18px]" />,
            onClick: () => {
              if (isInspoView) {
                setSubNavOpen((v) => !v);
              } else {
                navigateWithSkeleton(() => {
                  setView("explore");
                  setSelectedShopId(null);
                  setSelectedFolderId(null);
                  setSubNavOpen(true);
                });
              }
            },
          },
          {
            id: "snow",
            label: "Snow",
            active: view === "snow",
            accent: true,
            badge: null as string | null,
            dot: false,
            icon: <SnowMark className="h-[18px] w-[18px]" />,
            onClick: () => {
              navigateWithSkeleton(() => {
                setView("snow");
                setSelectedShopId(null);
                setSelectedFolderId(null);
              });
            },
          },
          {
            id: "studio",
            label: "Creation",
            active: view === "studio" && studioInitialTab !== "assets",
            accent: false,
            badge: null as string | null,
            dot: false,
            icon: <Lightbulb className="h-[18px] w-[18px]" />,
            onClick: () => {
              setStudioInitialTab("video");
              navigateWithSkeleton(() => {
                setView("studio");
                setSelectedShopId(null);
                setSelectedFolderId(null);
              });
            },
          },
          {
            id: "analytics",
            label: "Analytics",
            active: view === "analytics",
            accent: false,
            badge: null as string | null,
            dot: false,
            icon: <BarChart3 className="h-[18px] w-[18px]" />,
            onClick: () => {
              if (view === "analytics") {
                setSubNavOpen((v) => !v);
              } else {
                navigateWithSkeleton(() => {
                  setView("analytics");
                  setSelectedShopId(null);
                  setSelectedFolderId(null);
                  setSubNavOpen(true);
                });
              }
            },
          },
        ];

        const libraryRailItems = [
          {
            id: "assets",
            label: "Assets",
            active: view === "studio" && studioInitialTab === "assets",
            accent: false,
            badge:
              creativeProjects.length > 0
                ? String(creativeProjects.length)
                : null,
            dot: false,
            icon: <Clapperboard className="h-[18px] w-[18px]" />,
            onClick: () => {
              setStudioInitialTab("assets");
              navigateWithSkeleton(() => {
                setView("studio");
                setSelectedShopId(null);
                setSelectedFolderId(null);
              });
            },
          },
          {
            id: "brands",
            label: "Brands",
            active: brandMemoryModalOpen,
            accent: false,
            badge: null as string | null,
            dot: Boolean(brandMemory),
            icon: <Store className="h-[18px] w-[18px]" />,
            onClick: () => setBrandMemoryModalOpen(true),
          },
        ];

        const renderRailButton = (item: (typeof primaryRailItems)[number]) => (
          <button
            key={item.id}
            type="button"
            data-no-glass="true"
            onClick={item.onClick}
            className="group relative flex w-full flex-col items-center justify-center gap-1 py-1 text-center transition-all"
          >
            {/* Active Cobalt Beacon Pill flush on left rail edge */}
            <span
              className={`absolute left-0 top-1/2 -translate-y-1/2 rounded-r-full bg-[#3B66FF] shadow-[0_0_12px_rgba(0,39,235,0.95)] transition-all duration-200 ${
                item.active ? "h-5 w-[3px] opacity-100" : "h-0 w-[3px] opacity-0"
              }`}
            />

            {/* Crisp Icon Tile */}
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
                <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#0027eb] px-1 font-mono-num text-[9px] font-bold text-white ring-2 ring-[#050811]">
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
        );

        return (
          <aside className="relative hidden h-full shrink-0 text-white lg:flex">
            {/* 1. SLIM COMMAND RAIL (70px — real Flake asterisk emblem + Cobalt beacon) */}
            <div
              className={`relative z-20 flex h-full flex-col items-center justify-between bg-[#050811] py-4 ${
                hasSubDrawer
                  ? "w-[70px] border-r border-white/[0.06]"
                  : "w-[94px] pr-[24px]"
              }`}
            >
              <div className="flex w-full flex-col items-center">
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
                  className="group mb-5 flex h-10 w-10 items-center justify-center overflow-hidden rounded-[12px] ring-1 ring-white/20 shadow-[0_8px_22px_-6px_rgba(0,39,235,0.85)] transition-all duration-300 hover:scale-105 hover:ring-white/35"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/icons/icon-192.png"
                    alt="Flake"
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:rotate-12"
                  />
                </button>

                {/* Primary Creative Loop */}
                <div className="flex w-full flex-col items-center gap-1.5">
                  {primaryRailItems.map(renderRailButton)}
                </div>

                {/* Hairline Divider */}
                <div className="my-3 h-px w-6 bg-white/[0.09]" />

                {/* Workspace Library */}
                <div className="flex w-full flex-col items-center gap-1.5">
                  {libraryRailItems.map(renderRailButton)}
                </div>
              </div>

              {/* Bottom Slim Rail Profile */}
              <div className="flex flex-col items-center gap-2">
                <button
                  type="button"
                  data-no-glass="true"
                  title="Mikkel Petersen"
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-b from-white/[0.14] to-white/[0.06] font-display text-xs font-bold text-white ring-1 ring-white/15 transition-colors hover:ring-white/30"
                >
                  M
                </button>
              </div>
            </div>

            {/* 2. CONTEXTUAL SECONDARY DOCK (Inspo / Analytics — auto-collapses on Snow & Creation) */}
            {hasSubDrawer && (
              <div className="adtrack-sidebar relative flex h-full w-[236px] flex-col bg-[#080C18] py-4 pl-4 pr-[36px] text-white">
                <SidebarPixelWave />

                {/* Top Wordmark + Section Breadcrumb + Collapse Toggle */}
                <div className="mb-5 flex items-center justify-between px-1">
                  <div className="flex items-center gap-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src="/icons/flake-wordmark-white.png"
                      alt="Flake"
                      className="h-[15px] w-auto select-none opacity-95"
                    />
                    <span className="text-white/20">/</span>
                    <span className="text-[12px] font-semibold text-white/75">
                      {isInspoView ? "Inspo" : "Analytics"}
                    </span>
                  </div>
                  <button
                    type="button"
                    data-no-glass="true"
                    onClick={() => setSubNavOpen(false)}
                    title="Skjul panel"
                    className="flex h-6 w-6 items-center justify-center rounded-lg text-white/40 transition-colors hover:bg-white/10 hover:text-white"
                  >
                    <PanelLeft className="h-3.5 w-3.5" />
                  </button>
                </div>

                {isInspoView ? (
                  <>
                    <div className="space-y-1">
                      {[
                        {
                          id: "explore",
                          label: "Ads",
                          active: view === "explore",
                          icon: <Radar className="h-[15px] w-[15px]" />,
                          onClick: () =>
                            navigateWithSkeleton(() => {
                              setView("explore");
                              setSelectedShopId(null);
                              setSelectedFolderId(null);
                            }),
                        },
                        {
                          id: "shops",
                          label: "Shops",
                          active: view === "shops",
                          icon: <Store className="h-[15px] w-[15px]" />,
                          onClick: () =>
                            navigateWithSkeleton(() => {
                              setView("shops");
                              setSelectedShopId(null);
                              setSelectedFolderId(null);
                            }),
                        },
                        {
                          id: "folders",
                          label: "Saved Ads",
                          active: view === "folders" && !selectedFolderId,
                          icon: <Bookmark className="h-[15px] w-[15px]" />,
                          onClick: () =>
                            navigateWithSkeleton(() => {
                              setView("folders");
                              setSelectedFolderId(null);
                              setSelectedShopId(null);
                            }),
                        },
                      ].map((row) => (
                        <button
                          key={row.id}
                          type="button"
                          onClick={row.onClick}
                          className={`group flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-[13px] font-medium transition-all ${
                            row.active
                              ? "bg-white/[0.1] font-semibold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]"
                              : "text-white/60 hover:bg-white/[0.05] hover:text-white/90"
                          }`}
                        >
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
                        </button>
                      ))}
                    </div>

                    {/* Boards List with Crisp Color Dots */}
                    <div className="mt-5 flex min-h-0 flex-1 flex-col border-t border-white/[0.07] pt-4">
                      <div className="mb-2 flex items-center justify-between px-2">
                        <span className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-white/35">
                          Boards
                        </span>
                        <button
                          type="button"
                          onClick={() => setQuickFolderOpen((v) => !v)}
                          title="Nyt board"
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
                            placeholder="Board navn + Enter"
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

                    {/* Minimal Frosted Extension Pill */}
                    <button
                      type="button"
                      data-no-glass="true"
                      className="mt-3 flex items-center justify-between rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2.5 text-left transition-colors hover:bg-white/[0.08]"
                    >
                      <span className="flex items-center gap-2 text-[11.5px] font-medium text-white/80">
                        <PackagePlus className="h-3.5 w-3.5 text-[#7AA2FF]" />
                        Chrome Extension
                      </span>
                      <span className="h-1.5 w-1.5 rounded-full bg-[#3B66FF]" />
                    </button>
                  </>
                ) : (
                  /* ANALYTICS NESTED SYSTEM REPORTS TREE */
                  <>
                    <div className="mb-4 flex items-center justify-between rounded-xl border border-white/[0.08] bg-white/[0.05] px-2.5 py-2">
                      <span className="flex min-w-0 items-center gap-2 text-[12.5px] font-semibold text-white">
                        <span className="h-2 w-2 shrink-0 rounded-full bg-[#38BDF8]" />
                        <span className="truncate">
                          {brandMemory ? brandMemory.brandName : "Flake Demo"}
                        </span>
                      </span>
                      <button
                        type="button"
                        onClick={() => setBrandMemoryModalOpen(true)}
                        className="text-[10.5px] font-medium text-white/45 hover:text-white"
                      >
                        Skift
                      </button>
                    </div>

                    <p className="px-2 pb-2 text-[10.5px] font-semibold uppercase tracking-[0.08em] text-white/35">
                      System reports
                    </p>
                    <div className="ml-2.5 space-y-0.5 border-l border-white/[0.09] pl-2.5">
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
                  </>
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
                  <span className="inline-flex min-w-[46px] items-center justify-center rounded-xl border border-[#ECEFF5] bg-white px-2.5 py-1 font-mono-num text-[12.5px] font-semibold text-[#334155] shadow-[0_2px_8px_rgba(15,23,42,0.06)]">
                    {displayAdsTotal !== null ? (
                      displayAdsTotal.toLocaleString("fr-FR")
                    ) : (
                      <span className="inline-block h-3.5 w-9 animate-pulse rounded bg-[#EEF1F6]" />
                    )}
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
                    { id: "ALL" as const, label: "Alle", count: displayMarketCounts?.all ?? null },
                    { id: "DK" as const, label: "DK", count: displayMarketCounts?.dk ?? null },
                    { id: "US" as const, label: "US & Global", count: displayMarketCounts?.us ?? null },
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
                          {m.count !== null ? (
                            m.count.toLocaleString("fr-FR")
                          ) : (
                            <span className="inline-block h-2.5 w-7 animate-pulse rounded bg-[#E2E8F0] align-middle" />
                          )}
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
                onMessagesChange={setSnowMessages}
                onOpenBrandMemory={() => setBrandMemoryModalOpen(true)}
                onCloneAdToStudio={handleCloneAdToStudio}
                onOpenBriefInStudio={handleOpenBriefInStudio}
                onOpenAdDetail={(ad) => setActiveAdId(ad.id)}
              />
            </div>
          )}

          {/* =================================================================
              VIEW 5: ZERO-SKILL AD STUDIO (VIDEO MAKER + STATIC CLONER + URL MINER)
             ================================================================= */}
          {view === "studio" && (
            <div className="animate-view-in">
              <VideoStudioView
                brandMemory={brandMemory}
                projects={creativeProjects}
                incomingTrigger={studioTrigger}
                initialSubTab={studioInitialTab}
                onConsumeTrigger={() => setStudioTrigger(null)}
                onSaveProject={handleSaveStudioProject}
                onQueueForLaunch={handleQueueProjectForLaunch}
                onSaveToSwipeFolder={handleSaveStudioCreativeToFolder}
                onOpenBrandMemory={() => setBrandMemoryModalOpen(true)}
              />
            </div>
          )}

          {/* =================================================================
              VIEW 6: CREATIVE ANALYTICS & META LAUNCH
             ================================================================= */}
          {view === "analytics" && (
            <div className="animate-view-in">
              <CreativeAnalyticsView
                brandMemory={brandMemory}
                projects={creativeProjects}
                analyticsRows={ownAnalyticsRows}
                activeReport={analyticsReport}
                onDoubleDown={handleDoubleDownWinner}
                onLaunchProjects={handleLaunchProjects}
                onImportCsvRows={(rows) => {
                  setImportedCsvRows(rows);
                  showToast(`${rows.length} annoncer importeret til Analytics`);
                }}
                onOpenBrandMemory={() => setBrandMemoryModalOpen(true)}
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
          value={view === "folders" ? "explore" : view}
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
