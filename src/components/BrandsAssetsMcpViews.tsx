"use client";

import React, {
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  useEffect,
} from "react";
import {
  Activity,
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  Bot,
  Building2,
  Check,
  ChevronRight,
  Code2,
  Copy,
  ExternalLink,
  FileText,
  Film,
  Filter,
  FolderOpen,
  Globe,
  Image as ImageIcon,
  Layers,
  Link2,
  Loader2,
  Package,
  Palette,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Tag,
  Terminal,
  Trash2,
  Type,
  Upload,
  Users,
  Video,
  Wand2,
  X,
} from "lucide-react";
import {
  ATRIA_BRAND_PERSONAS,
  ATRIA_BRAND_SCENARIOS,
  DEFAULT_DEMO_BRAND_MEMORY,
  type BrandsSubView,
  type McpSubView,
  type StudioSubTab,
} from "@/lib/atria-placeholders";
import type { BrandMemory, CreativeProject } from "@/lib/studio-types";
import type { Ad, Brand, ProductPreview } from "@/lib/types";
import { formatProductPriceDkk } from "@/lib/audience-insights";
import { SnowMark } from "./SnowMascot";

/* ============================================================================
   SHARED SMALL HELPERS
   ============================================================================ */

interface ContextFileItem {
  id: string;
  name: string;
  sizeLabel: string;
  topics: string[];
  addedAt: string;
}

interface CustomScenarioItem {
  id: string;
  title: string;
  summary: string;
  imageUrl: string;
  hookAngle: string;
}

interface UploadedAssetItem {
  id: string;
  name: string;
  mediaType: "image" | "video";
  url: string;
  source: "Uploaded" | "Brand Memory" | "Studio";
  creator: "You" | "Snow AI";
  scene: "Product Hero" | "Lifestyle" | "UGC Hook" | "B-Roll";
  rollType: "A-Roll" | "B-Roll";
  captionState: "With Captions" | "Clean";
  audioState: "Voiceover" | "Silent / Visual";
  addedAt: string;
  timestampMs: number;
  subtitle?: string;
  projectMode?: "video" | "static_clone" | "url_miner";
}

function BrandContextRing({ score = 85 }: { score?: number }) {
  const clamped = Math.max(0, Math.min(100, score));
  const r = 11;
  const c = 2 * Math.PI * r;
  const dashOffset = c - (clamped / 100) * c;

  return (
    <div
      data-no-glass="true"
      className="inline-flex items-center gap-2 rounded-full border border-[#DCE4FF] bg-[#EEF2FF] px-3 py-1.5 text-xs font-semibold text-[#0027eb]"
    >
      <div className="relative flex h-7 w-7 items-center justify-center">
        <svg className="h-7 w-7 -rotate-90" viewBox="0 0 28 28">
          <circle
            cx="14"
            cy="14"
            r={r}
            fill="none"
            stroke="rgba(0, 39, 235, 0.16)"
            strokeWidth="2.5"
          />
          <circle
            cx="14"
            cy="14"
            r={r}
            fill="none"
            stroke="#0027eb"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={dashOffset}
          />
        </svg>
        <span className="font-mono-num absolute text-[9.5px] font-bold text-[#0027eb]">
          {clamped}
        </span>
      </div>
      <span>Brand context</span>
    </div>
  );
}

function EditableChipGroup({
  items,
  editing,
  tone = "neutral",
  placeholder,
  onChange,
}: {
  items: string[];
  editing: boolean;
  tone?: "cobalt" | "amber" | "neutral";
  placeholder: string;
  onChange: (next: string[]) => void;
}) {
  const [draft, setDraft] = useState("");

  const addChip = () => {
    const clean = draft.trim();
    if (clean && !items.includes(clean)) {
      onChange([...items, clean]);
    }
    setDraft("");
  };

  const pillClass =
    tone === "cobalt"
      ? "border border-[#DCE4FF] bg-[#EEF2FF] text-[#0027eb]"
      : tone === "amber"
        ? "border border-[#FDE68A] bg-[#FFFBEB] text-[#92400E]"
        : "border border-[#E6E9F0] bg-[#F7F8FB] text-[#0F172A]";

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {items.length === 0 && !editing && (
        <span className="text-xs text-[#94A3B8]">None added yet</span>
      )}
      {items.map((item, idx) => (
        <span
          key={`${item}-${idx}`}
          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${pillClass}`}
        >
          <span>{item}</span>
          {editing && (
            <button
              type="button"
              data-no-glass="true"
              onClick={() => onChange(items.filter((_, i) => i !== idx))}
              aria-label={`Remove ${item}`}
              className="rounded-full p-0.5 opacity-70 transition-opacity hover:opacity-100"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </span>
      ))}
      {editing && (
        <div className="inline-flex items-center gap-1">
          <input
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addChip();
              }
            }}
            placeholder={placeholder}
            className="w-40 rounded-full border border-[#DCE4FF] bg-white px-3 py-1 text-xs text-[#0F172A] outline-none focus:border-[#0027eb]"
          />
          <button
            type="button"
            data-no-glass="true"
            onClick={addChip}
            className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-[#DCE4FF] bg-[#EEF2FF] text-[#0027eb] hover:bg-[#0027eb] hover:text-white"
          >
            <Plus className="h-3 w-3" />
          </button>
        </div>
      )}
    </div>
  );
}

/* ============================================================================
   1. BRANDS WORKSPACE VIEW
   ============================================================================ */

export interface BrandsWorkspaceViewProps {
  brandMemory: BrandMemory | null;
  subView: BrandsSubView;
  onSubViewChange: (sub: BrandsSubView) => void;
  brands: Brand[];
  ads: Ad[];
  onSaveMemory: (mem: BrandMemory) => void;
  onOpenBrandScanner: () => void;
  onCreateAdFromProduct: (productTitle: string) => void;
  onOpenCompetitorBrand: (brandId: string) => void;
}

const INITIAL_CONTEXT_FILES: ContextFileItem[] = [
  {
    id: "ctx-1",
    name: "Brand_Voice_and_Positioning_2026.pdf",
    sizeLabel: "1.4 MB",
    topics: ["Tone of voice", "Visual rules", "Messaging"],
    addedAt: "Nov 18, 2026",
  },
  {
    id: "ctx-2",
    name: "Customer_Reviews_Objections_Export.csv",
    sizeLabel: "420 KB",
    topics: ["Social proof", "Pain points", "FAQ"],
    addedAt: "Nov 22, 2026",
  },
];

export function BrandsWorkspaceView({
  brandMemory,
  subView,
  onSubViewChange,
  brands,
  ads,
  onSaveMemory,
  onOpenBrandScanner,
  onCreateAdFromProduct,
  onOpenCompetitorBrand,
}: BrandsWorkspaceViewProps) {
  const activeMemory = brandMemory || DEFAULT_DEMO_BRAND_MEMORY;

  const [editedMemory, setEditedMemory] = useState<BrandMemory | null>(null);
  const draftMemory = editedMemory ?? activeMemory;
  const setDraftMemory = (next: BrandMemory) => setEditedMemory(next);
  const [overviewTab, setOverviewTab] = useState<
    "profile" | "guidelines" | "context_files"
  >("profile");
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [savedNotice, setSavedNotice] = useState(false);

  // Guidelines local interactive preferences
  const [logoOnSnowImages, setLogoOnSnowImages] = useState(true);
  const [defaultLanguage, setDefaultLanguage] = useState("English (US)");
  const [newColorHex, setNewColorHex] = useState("#0027eb");

  // Context files state
  const [contextFiles, setContextFiles] = useState<ContextFileItem[]>(
    INITIAL_CONTEXT_FILES
  );
  const contextFileInputRef = useRef<HTMLInputElement | null>(null);

  // Audience sub-view state
  const [audienceMode, setAudienceMode] = useState<"scenarios" | "personas">(
    "scenarios"
  );
  const [customScenarios, setCustomScenarios] = useState<CustomScenarioItem[]>(
    []
  );
  const [showAddScenario, setShowAddScenario] = useState(false);
  const [newScenarioTitle, setNewScenarioTitle] = useState("");
  const [newScenarioSummary, setNewScenarioSummary] = useState("");
  const [newScenarioHook, setNewScenarioHook] = useState(
    "Problem -> Product Demo"
  );

  // Products sub-view state
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [newProductTitle, setNewProductTitle] = useState("");
  const [newProductPrice, setNewProductPrice] = useState("");
  const [newProductUrl, setNewProductUrl] = useState("");
  const [newProductImageUrl, setNewProductImageUrl] = useState("");

  const trackedCompetitors = useMemo(() => {
    const tracked = brands.filter((b) => b.is_tracked && b.id !== "custom-media");
    return tracked.length > 0
      ? tracked
      : brands.filter((b) => b.id !== "custom-media");
  }, [brands]);

  const adCountByBrand = useMemo(() => {
    const counts = new Map<string, number>();
    for (const ad of ads) {
      if (ad.is_active) {
        counts.set(ad.brand_id, (counts.get(ad.brand_id) || 0) + 1);
      }
    }
    return counts;
  }, [ads]);

  const allScenarios = useMemo(
    () => [...ATRIA_BRAND_SCENARIOS, ...customScenarios],
    [customScenarios]
  );

  const commitMemory = (next: BrandMemory) => {
    setEditedMemory(null);
    onSaveMemory(next);
    setSavedNotice(true);
    window.setTimeout(() => setSavedNotice(false), 2200);
  };

  const handleContextFilesSelected = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const added: ContextFileItem[] = Array.from(files).map((file, idx) => ({
      id: `ctx-upload-${Date.now()}-${idx}`,
      name: file.name,
      sizeLabel:
        file.size > 1024 * 1024
          ? `${(file.size / (1024 * 1024)).toFixed(1)} MB`
          : `${Math.max(1, Math.round(file.size / 1024))} KB`,
      topics: ["Uploaded context", "Brand Memory"],
      addedAt: "Just now",
    }));
    setContextFiles((prev) => [...added, ...prev]);
  };

  const handleAddColor = () => {
    const normalized = newColorHex.trim().toUpperCase();
    if (!/^#[0-9A-F]{6}$/.test(normalized)) return;
    if (draftMemory.brandColors.includes(normalized)) return;
    commitMemory({
      ...draftMemory,
      brandColors: [...draftMemory.brandColors, normalized],
    });
  };

  const handleUpdateColorAt = (index: number, hex: string) => {
    const updated = draftMemory.brandColors.map((c, i) =>
      i === index ? hex.toUpperCase() : c
    );
    commitMemory({ ...draftMemory, brandColors: updated });
  };

  const handleRemoveColorAt = (index: number) => {
    commitMemory({
      ...draftMemory,
      brandColors: draftMemory.brandColors.filter((_, i) => i !== index),
    });
  };

  const handleCreateScenario = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newScenarioTitle.trim()) return;
    const created: CustomScenarioItem = {
      id: `scn-custom-${Date.now()}`,
      title: newScenarioTitle.trim(),
      summary:
        newScenarioSummary.trim() ||
        `Targeted buying scenario tailored for ${draftMemory.brandName}.`,
      imageUrl: ATRIA_BRAND_SCENARIOS[0].imageUrl,
      hookAngle: newScenarioHook.trim() || "Problem -> Benefit",
    };
    setCustomScenarios((prev) => [...prev, created]);
    setNewScenarioTitle("");
    setNewScenarioSummary("");
    setShowAddScenario(false);
  };

  const handleCreateProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProductTitle.trim()) return;
    const product: ProductPreview = {
      id: `prod-${Date.now()}`,
      title: newProductTitle.trim(),
      price: newProductPrice.trim() || "499",
      currency: draftMemory.currency || "DKK",
      url:
        newProductUrl.trim() ||
        `${draftMemory.websiteUrl.replace(/\/$/, "")}/products/${newProductTitle
          .trim()
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")}`,
      image_url:
        newProductImageUrl.trim() || draftMemory.products[0]?.image_url,
    };
    commitMemory({
      ...draftMemory,
      products: [product, ...draftMemory.products],
    });
    setNewProductTitle("");
    setNewProductPrice("");
    setNewProductUrl("");
    setNewProductImageUrl("");
    setShowAddProduct(false);
  };

  const subSectionLabel: Record<BrandsSubView, string> = {
    list: "All Brands",
    overview: "Overview",
    audience: "Audience",
    products: "Products",
    competitors: "Competitors",
  };

  /* --------------------------------------------------------------------------
     LIST VIEW
     -------------------------------------------------------------------------- */
  if (subView === "list") {
    return (
      <div className="animate-view-in mx-auto w-full max-w-[1280px] space-y-6 px-4 py-6 sm:px-7">
        {/* Top Page Header */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-[26px] font-bold tracking-tight text-[#0F172A]">
              Brands
            </h1>
            <p className="mt-1 text-sm text-[#64748B]">
              Manage brand memory profiles, audience scenarios, products, and tracked competitors.
            </p>
          </div>
          <button
            type="button"
            onClick={onOpenBrandScanner}
            className="adtrack-btn-primary inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-xs font-semibold text-white"
          >
            <Plus className="h-4 w-4" />
            Create a brand
          </button>
        </div>

        {/* Hero Card */}
        <section className="overflow-hidden rounded-3xl border border-[#DCE4FF] bg-white shadow-xs">
          <div className="border-b border-[#EEF2FF] bg-gradient-to-br from-[#F7F8FB] via-[#FFFFFF] to-[#EEF2FF]/70 px-6 py-6 sm:px-8">
            <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-center">
              <div className="max-w-2xl space-y-2.5">
                <div className="inline-flex items-center gap-2 rounded-full border border-[#DCE4FF] bg-[#EEF2FF] px-3 py-1 text-[11px] font-semibold text-[#0027eb]">
                  <SnowMark className="h-3.5 w-3.5 text-[#0027eb]" />
                  <span>Brand Memory Engine</span>
                </div>
                <h2 className="font-display text-xl font-bold tracking-tight text-[#0F172A] sm:text-2xl">
                  Give Snow the context it works from
                </h2>
                <p className="text-sm leading-relaxed text-[#475569]">
                  Scan any storefront URL to extract positioning, USPs, customer objections, brand
                  colors, and live product feeds so every ad Snow creates feels unmistakably yours.
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <button
                  type="button"
                  onClick={() => onSubViewChange("overview")}
                  data-no-glass="true"
                  className="inline-flex items-center gap-1.5 rounded-full border border-[#E6E9F0] bg-white px-4 py-2.5 text-xs font-semibold text-[#0F172A] transition-colors hover:border-[#0027eb]/30 hover:text-[#0027eb]"
                >
                  Open {activeMemory.brandName}
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={onOpenBrandScanner}
                  className="adtrack-btn-primary inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-xs font-semibold text-white"
                >
                  <Plus className="h-4 w-4" />
                  Create a brand
                </button>
              </div>
            </div>
          </div>

          {/* 3 Benefit Columns */}
          <div className="grid grid-cols-1 divide-y divide-[#ECEFF5] bg-white md:grid-cols-3 md:divide-x md:divide-y-0">
            <div className="p-6">
              <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-[#EEF2FF] text-[#0027eb]">
                <Palette className="h-4 w-4" />
              </div>
              <h3 className="font-display text-sm font-bold text-[#0F172A]">
                On-brand output
              </h3>
              <p className="mt-1 text-xs leading-relaxed text-[#64748B]">
                Locks in your logos, hex palette, fonts, and tone of voice across every video brief
                and static ad layout.
              </p>
            </div>
            <div className="p-6">
              <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-[#EEF2FF] text-[#0027eb]">
                <Users className="h-4 w-4" />
              </div>
              <h3 className="font-display text-sm font-bold text-[#0F172A]">
                Audience precision
              </h3>
              <p className="mt-1 text-xs leading-relaxed text-[#64748B]">
                Maps real buyer scenarios, ICP personas, pain points, and objections directly into
                scroll-stopping hooks.
              </p>
            </div>
            <div className="p-6">
              <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-[#EEF2FF] text-[#0027eb]">
                <Activity className="h-4 w-4" />
              </div>
              <h3 className="font-display text-sm font-bold text-[#0F172A]">
                Competitor awareness
              </h3>
              <p className="mt-1 text-xs leading-relaxed text-[#64748B]">
                Tracks competitor ad volume, active creative formats, and landing funnels alongside
                your own brand catalog.
              </p>
            </div>
          </div>
        </section>

        {/* Brands Table */}
        <section className="overflow-hidden rounded-3xl border border-[#ECEFF5] bg-white shadow-xs">
          <div className="flex items-center justify-between border-b border-[#ECEFF5] px-6 py-4">
            <div className="flex items-center gap-2.5">
              <h2 className="font-display text-sm font-bold text-[#0F172A]">
                Your Brand Workspaces & Tracked Shops
              </h2>
              <span className="font-mono-num rounded-full bg-[#F3F5F9] px-2.5 py-0.5 text-[11px] font-semibold text-[#475569]">
                {1 + trackedCompetitors.length}
              </span>
            </div>
            <button
              type="button"
              onClick={() => onSubViewChange("competitors")}
              data-no-glass="true"
              className="text-xs font-semibold text-[#0027eb] hover:underline"
            >
              Manage competitors
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[780px] border-collapse text-left">
              <thead>
                <tr className="border-b border-[#ECEFF5] bg-[#FAFBFD] text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">
                  <th className="px-6 py-3">Brand</th>
                  <th className="px-4 py-3">Industry</th>
                  <th className="px-4 py-3">Ad accounts</th>
                  <th className="px-4 py-3">Scenarios</th>
                  <th className="px-4 py-3">Personas</th>
                  <th className="px-4 py-3">Products</th>
                  <th className="px-6 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#ECEFF5] text-sm">
                {/* Active / Demo Brand Memory Row */}
                <tr className="bg-[#EEF2FF]/35 transition-colors hover:bg-[#EEF2FF]/60">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-[#DCE4FF] bg-white p-1.5">
                        {activeMemory.logoUrl ? (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img
                            src={activeMemory.logoUrl}
                            alt={activeMemory.brandName}
                            className="h-full w-full object-contain"
                          />
                        ) : (
                          <span className="font-display text-xs font-bold text-[#0F172A]">
                            {activeMemory.brandName.slice(0, 2).toUpperCase()}
                          </span>
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-display font-bold text-[#0F172A]">
                            {activeMemory.brandName}
                          </span>
                          <span className="rounded-full bg-[#0027eb] px-2 py-0.5 text-[10px] font-semibold text-white">
                            {brandMemory ? "Active Brand" : "Demo Profile"}
                          </span>
                        </div>
                        <p className="font-mono-num text-xs text-[#64748B]">
                          {activeMemory.domain}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <span className="inline-flex rounded-full border border-[#DCE4FF] bg-white px-2.5 py-1 text-xs font-medium text-[#0027eb]">
                      {activeMemory.category}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#0F172A]">
                      <span className="h-2 w-2 rounded-full bg-[#16A34A]" />
                      Meta Ads · Connected
                    </span>
                  </td>
                  <td className="font-mono-num px-4 py-4 text-xs font-semibold text-[#0F172A]">
                    Scenarios: {allScenarios.length}
                  </td>
                  <td className="font-mono-num px-4 py-4 text-xs font-semibold text-[#0F172A]">
                    Personas: {ATRIA_BRAND_PERSONAS.length}
                  </td>
                  <td className="font-mono-num px-4 py-4 text-xs font-semibold text-[#0F172A]">
                    {activeMemory.products.length}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      type="button"
                      onClick={() => onSubViewChange("overview")}
                      className="adtrack-btn-primary inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold text-white"
                    >
                      View details
                      <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>

                {/* Tracked Competitor Brands */}
                {trackedCompetitors.slice(0, 8).map((brand) => {
                  const liveCount =
                    brand.active_ads_count ?? adCountByBrand.get(brand.id) ?? 0;
                  const prodCount =
                    brand.top_products?.length || brand.products_count || 0;
                  return (
                    <tr
                      key={brand.id}
                      className="transition-colors hover:bg-[#F7F8FB]"
                    >
                      <td className="px-6 py-3.5">
                        <div className="flex items-center gap-3">
                          <div
                            className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-[#E6E9F0] bg-white p-1"
                          >
                            {brand.logo_url ? (
                              /* eslint-disable-next-line @next/next/no-img-element */
                              <img
                                src={brand.logo_url}
                                alt={brand.name}
                                className="h-full w-full rounded-full object-contain"
                              />
                            ) : (
                              <span className="font-display text-xs font-bold text-[#0F172A]">
                                {brand.avatar_initials}
                              </span>
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-[#0F172A]">
                                {brand.name}
                              </span>
                              <span className="rounded-full bg-[#F3F5F9] px-2 py-0.5 text-[10px] font-medium text-[#64748B]">
                                Tracked
                              </span>
                            </div>
                            <p className="font-mono-num truncate text-xs text-[#64748B]">
                              {brand.website_url.replace(/^https?:\/\//, "")}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="inline-flex rounded-full border border-[#E6E9F0] bg-[#F7F8FB] px-2.5 py-1 text-xs font-medium text-[#334155]">
                          {brand.category}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-xs text-[#64748B]">
                        <span className="font-mono-num font-medium text-[#0F172A]">
                          {liveCount}
                        </span>{" "}
                        live Meta ads
                      </td>
                      <td className="font-mono-num px-4 py-3.5 text-xs text-[#64748B]">
                        Scenarios: 3
                      </td>
                      <td className="font-mono-num px-4 py-3.5 text-xs text-[#64748B]">
                        Personas: 3
                      </td>
                      <td className="font-mono-num px-4 py-3.5 text-xs font-medium text-[#0F172A]">
                        {prodCount}
                      </td>
                      <td className="px-6 py-3.5 text-right">
                        <div className="inline-flex items-center gap-2">
                          <button
                            type="button"
                            data-no-glass="true"
                            onClick={() => onOpenCompetitorBrand(brand.id)}
                            className="inline-flex items-center gap-1 rounded-full border border-[#E6E9F0] bg-white px-3 py-1.5 text-xs font-semibold text-[#0F172A] transition-colors hover:border-[#0027eb]/30 hover:text-[#0027eb]"
                          >
                            View details
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    );
  }

  /* --------------------------------------------------------------------------
     SHARED DETAIL HEADER + BREADCRUMB + SUB-NAV (Overview / Audience / Products / Competitors)
     -------------------------------------------------------------------------- */
  const renderDetailHeader = () => (
    <div className="space-y-4">
      {/* Breadcrumb */}
      <nav
        aria-label="Breadcrumb"
        className="flex flex-wrap items-center gap-1.5 text-xs font-medium text-[#64748B]"
      >
        <button
          type="button"
          data-no-glass="true"
          onClick={() => onSubViewChange("list")}
          className="transition-colors hover:text-[#0027eb]"
        >
          Brands
        </button>
        <ChevronRight className="h-3.5 w-3.5 text-[#CBD5E1]" />
        <button
          type="button"
          data-no-glass="true"
          onClick={() => onSubViewChange("overview")}
          className="transition-colors hover:text-[#0027eb]"
        >
          {activeMemory.brandName}
        </button>
        <ChevronRight className="h-3.5 w-3.5 text-[#CBD5E1]" />
        <span className="font-semibold text-[#0F172A]">
          {subSectionLabel[subView]}
        </span>
      </nav>

      {/* Brand Identity Bar */}
      <div className="flex flex-col justify-between gap-4 rounded-3xl border border-[#ECEFF5] bg-white p-5 shadow-xs sm:flex-row sm:items-center sm:px-6">
        <div className="flex min-w-0 items-center gap-4">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full border border-[#E6E9F0] bg-white p-2 shadow-xs">
            {activeMemory.logoUrl ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={activeMemory.logoUrl}
                alt={activeMemory.brandName}
                className="h-full w-full object-contain"
              />
            ) : (
              <span className="font-display text-lg font-bold text-[#0F172A]">
                {activeMemory.brandName.slice(0, 2).toUpperCase()}
              </span>
            )}
          </div>
          <div className="min-w-0 space-y-1">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="font-display truncate text-xl font-bold tracking-tight text-[#0F172A] sm:text-2xl">
                {activeMemory.brandName}
              </h1>
              <BrandContextRing score={85} />
              {savedNotice && (
                <span className="inline-flex items-center gap-1 rounded-full bg-[#ECFDF3] px-2.5 py-0.5 text-[11px] font-semibold text-[#15803D]">
                  <Check className="h-3 w-3" />
                  Saved
                </span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-3 text-xs text-[#64748B]">
              <a
                href={activeMemory.websiteUrl}
                target="_blank"
                rel="noreferrer"
                className="font-mono-num inline-flex items-center gap-1 hover:text-[#0027eb]"
              >
                <Globe className="h-3.5 w-3.5" />
                {activeMemory.domain}
                <ExternalLink className="h-3 w-3 opacity-60" />
              </a>
              <span>·</span>
              <span>{activeMemory.category}</span>
              {!brandMemory && (
                <>
                  <span>·</span>
                  <span className="font-medium text-[#0027eb]">
                    Demo Brand Context (click Rescan URL to load yours)
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <button
            type="button"
            data-no-glass="true"
            onClick={onOpenBrandScanner}
            className="inline-flex items-center gap-1.5 rounded-full border border-[#E6E9F0] bg-white px-4 py-2 text-xs font-semibold text-[#0F172A] transition-colors hover:border-[#0027eb]/30 hover:text-[#0027eb]"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Rescan URL
          </button>
          <button
            type="button"
            onClick={() => {
              onSubViewChange("overview");
              setOverviewTab("profile");
              setIsEditingProfile((v) => !v);
            }}
            className="adtrack-btn-primary inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-semibold text-white"
          >
            <Pencil className="h-3.5 w-3.5" />
            {isEditingProfile && subView === "overview"
              ? "Done editing"
              : "Edit profile"}
          </button>
        </div>
      </div>

      {/* Sub-view Nav Pills */}
      <div className="flex flex-wrap items-center gap-1.5 rounded-2xl border border-[#ECEFF5] bg-[#F7F8FB] p-1.5">
        {(
          [
            { id: "overview", label: "Overview" },
            { id: "audience", label: "Audience" },
            { id: "products", label: `Products (${activeMemory.products.length})` },
            {
              id: "competitors",
              label: `Competitors (${trackedCompetitors.length})`,
            },
          ] as Array<{ id: BrandsSubView; label: string }>
        ).map((item) => {
          const active = subView === item.id;
          return (
            <button
              key={item.id}
              type="button"
              data-no-glass="true"
              onClick={() => onSubViewChange(item.id)}
              className={`rounded-xl px-4 py-2 text-xs font-semibold transition-all ${
                active
                  ? "bg-[#0F172A] text-white shadow-xs"
                  : "text-[#475569] hover:bg-white hover:text-[#0F172A]"
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </div>
    </div>
  );

  /* --------------------------------------------------------------------------
     OVERVIEW SUB-VIEW
     -------------------------------------------------------------------------- */
  if (subView === "overview") {
    return (
      <div className="animate-view-in mx-auto w-full max-w-[1280px] space-y-6 px-4 py-6 sm:px-7">
        {renderDetailHeader()}

        {/* 5 Summary Stat Cards */}
        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-5">
          {/* 1. Ad accounts */}
          <div className="rounded-2xl border border-[#ECEFF5] bg-white p-4 shadow-xs">
            <div className="flex items-center justify-between text-xs font-medium text-[#64748B]">
              <span>Ad accounts</span>
              <Building2 className="h-3.5 w-3.5 text-[#0027eb]" />
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="font-mono-num text-xl font-bold text-[#0F172A]">
                1
              </span>
              <span className="text-xs font-medium text-[#16A34A]">
                Meta Ads active
              </span>
            </div>
            <p className="mt-2 truncate text-[11px] text-[#64748B]">
              {activeMemory.pixels?.join(" · ") || "Meta Pixel synced"}
            </p>
          </div>

          {/* 2. 3 Scenarios */}
          <button
            type="button"
            data-no-glass="true"
            onClick={() => {
              setAudienceMode("scenarios");
              onSubViewChange("audience");
            }}
            className="group rounded-2xl border border-[#ECEFF5] bg-white p-4 text-left shadow-xs transition-all hover:border-[#DCE4FF] hover:shadow-md"
          >
            <div className="flex items-center justify-between text-xs font-medium text-[#64748B]">
              <span>Scenarios</span>
              <ArrowUpRight className="h-3.5 w-3.5 text-[#94A3B8] transition-colors group-hover:text-[#0027eb]" />
            </div>
            <div className="mt-3 flex items-center justify-between gap-2">
              <span className="font-mono-num text-lg font-bold text-[#0F172A]">
                {allScenarios.length} Scenarios
              </span>
              <div className="flex -space-x-2">
                {ATRIA_BRAND_SCENARIOS.slice(0, 3).map((scn) => (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    key={scn.id}
                    src={scn.imageUrl}
                    alt={scn.title}
                    className="h-7 w-7 rounded-lg border-2 border-white object-cover shadow-xs"
                  />
                ))}
              </div>
            </div>
            <p className="mt-2 truncate text-[11px] text-[#64748B]">
              Angles & lifestyle use cases
            </p>
          </button>

          {/* 3. 3 Personas */}
          <button
            type="button"
            data-no-glass="true"
            onClick={() => {
              setAudienceMode("personas");
              onSubViewChange("audience");
            }}
            className="group rounded-2xl border border-[#ECEFF5] bg-white p-4 text-left shadow-xs transition-all hover:border-[#DCE4FF] hover:shadow-md"
          >
            <div className="flex items-center justify-between text-xs font-medium text-[#64748B]">
              <span>Personas</span>
              <ArrowUpRight className="h-3.5 w-3.5 text-[#94A3B8] transition-colors group-hover:text-[#0027eb]" />
            </div>
            <div className="mt-3 flex items-center justify-between gap-2">
              <span className="font-mono-num text-lg font-bold text-[#0F172A]">
                {ATRIA_BRAND_PERSONAS.length} Personas
              </span>
              <div className="flex -space-x-2">
                {ATRIA_BRAND_PERSONAS.slice(0, 3).map((per) => (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    key={per.id}
                    src={per.avatarUrl}
                    alt={per.name}
                    className="h-7 w-7 rounded-full border-2 border-white object-cover shadow-xs"
                  />
                ))}
              </div>
            </div>
            <p className="mt-2 truncate text-[11px] text-[#64748B]">
              Target customer profiles
            </p>
          </button>

          {/* 4. Products */}
          <button
            type="button"
            data-no-glass="true"
            onClick={() => onSubViewChange("products")}
            className="group rounded-2xl border border-[#ECEFF5] bg-white p-4 text-left shadow-xs transition-all hover:border-[#DCE4FF] hover:shadow-md"
          >
            <div className="flex items-center justify-between text-xs font-medium text-[#64748B]">
              <span>Products</span>
              <ArrowUpRight className="h-3.5 w-3.5 text-[#94A3B8] transition-colors group-hover:text-[#0027eb]" />
            </div>
            <div className="mt-3 flex items-center justify-between gap-2">
              <span className="font-mono-num text-lg font-bold text-[#0F172A]">
                {activeMemory.products.length}{" "}
                {activeMemory.products.length === 1 ? "Product" : "Products"}
              </span>
              {activeMemory.products[0]?.image_url ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={activeMemory.products[0].image_url}
                  alt={activeMemory.products[0].title}
                  className="h-8 w-8 rounded-lg border border-[#E6E9F0] object-cover"
                />
              ) : (
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#F7F8FB] text-[#94A3B8]">
                  <Package className="h-4 w-4" />
                </div>
              )}
            </div>
            <p className="mt-2 truncate text-[11px] text-[#64748B]">
              {activeMemory.products[0]?.title || "Product catalog"}
            </p>
          </button>

          {/* 5. Competitors */}
          <button
            type="button"
            data-no-glass="true"
            onClick={() => onSubViewChange("competitors")}
            className="group rounded-2xl border border-[#ECEFF5] bg-white p-4 text-left shadow-xs transition-all hover:border-[#DCE4FF] hover:shadow-md"
          >
            <div className="flex items-center justify-between text-xs font-medium text-[#64748B]">
              <span>Competitors</span>
              <ArrowUpRight className="h-3.5 w-3.5 text-[#94A3B8] transition-colors group-hover:text-[#0027eb]" />
            </div>
            <div className="mt-3 flex items-center justify-between gap-2">
              <span className="font-mono-num text-lg font-bold text-[#0F172A]">
                {trackedCompetitors.length} Competitors
              </span>
            </div>
            <p className="mt-2 truncate text-[11px] text-[#64748B]">
              Live ad benchmarks tracked
            </p>
          </button>
        </div>

        {/* Overview 3 Horizontal Section Tabs */}
        <section className="overflow-hidden rounded-3xl border border-[#ECEFF5] bg-white shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#ECEFF5] px-6 pt-3">
            <div className="flex items-center gap-6">
              {(
                [
                  { id: "profile", label: "Brand profile" },
                  { id: "guidelines", label: "Brand guidelines" },
                  {
                    id: "context_files",
                    label: `Context files (${contextFiles.length})`,
                  },
                ] as const
              ).map((tab) => {
                const active = overviewTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    data-no-glass="true"
                    onClick={() => setOverviewTab(tab.id)}
                    className={`border-b-2 pb-3 pt-1 text-xs font-semibold transition-colors sm:text-sm ${
                      active
                        ? "border-[#0027eb] text-[#0027eb]"
                        : "border-transparent text-[#64748B] hover:text-[#0F172A]"
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {overviewTab === "profile" && (
              <div className="mb-2 flex items-center gap-2">
                {isEditingProfile ? (
                  <>
                    <button
                      type="button"
                      data-no-glass="true"
                      onClick={() => {
                        setEditedMemory(null);
                        setIsEditingProfile(false);
                      }}
                      className="rounded-full border border-[#E6E9F0] bg-white px-3 py-1.5 text-xs font-semibold text-[#475569] hover:bg-[#F7F8FB]"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        commitMemory(draftMemory);
                        setIsEditingProfile(false);
                      }}
                      className="adtrack-btn-primary inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-semibold text-white"
                    >
                      <Check className="h-3.5 w-3.5" />
                      Save changes
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    data-no-glass="true"
                    onClick={() => setIsEditingProfile(true)}
                    className="inline-flex items-center gap-1.5 rounded-full border border-[#E6E9F0] bg-white px-3.5 py-1.5 text-xs font-semibold text-[#0F172A] hover:border-[#0027eb]/30 hover:text-[#0027eb]"
                  >
                    <Pencil className="h-3 w-3" />
                    Edit fields
                  </button>
                )}
              </div>
            )}
          </div>

          {/* TAB 1: BRAND PROFILE */}
          {overviewTab === "profile" && (
            <div className="divide-y divide-[#ECEFF5]">
              {/* Brand name */}
              <div className="grid grid-cols-1 gap-2 px-6 py-4 md:grid-cols-12 md:items-center">
                <label className="text-xs font-semibold text-[#64748B] md:col-span-4">
                  Brand name
                </label>
                <div className="md:col-span-8">
                  {isEditingProfile ? (
                    <input
                      type="text"
                      value={draftMemory.brandName}
                      onChange={(e) =>
                        setDraftMemory({
                          ...draftMemory,
                          brandName: e.target.value,
                        })
                      }
                      className="w-full rounded-xl border border-[#DCE4FF] bg-[#FAFBFD] px-3.5 py-2 text-sm text-[#0F172A] outline-none focus:border-[#0027eb] focus:bg-white"
                    />
                  ) : (
                    <p className="text-sm font-semibold text-[#0F172A]">
                      {draftMemory.brandName}
                    </p>
                  )}
                </div>
              </div>

              {/* Website */}
              <div className="grid grid-cols-1 gap-2 px-6 py-4 md:grid-cols-12 md:items-center">
                <label className="text-xs font-semibold text-[#64748B] md:col-span-4">
                  Website
                </label>
                <div className="md:col-span-8">
                  {isEditingProfile ? (
                    <input
                      type="url"
                      value={draftMemory.websiteUrl}
                      onChange={(e) =>
                        setDraftMemory({
                          ...draftMemory,
                          websiteUrl: e.target.value,
                        })
                      }
                      className="font-mono-num w-full rounded-xl border border-[#DCE4FF] bg-[#FAFBFD] px-3.5 py-2 text-sm text-[#0F172A] outline-none focus:border-[#0027eb] focus:bg-white"
                    />
                  ) : (
                    <a
                      href={draftMemory.websiteUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="font-mono-num inline-flex items-center gap-1.5 text-sm font-medium text-[#0027eb] hover:underline"
                    >
                      {draftMemory.websiteUrl}
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  )}
                </div>
              </div>

              {/* Industry / category */}
              <div className="grid grid-cols-1 gap-2 px-6 py-4 md:grid-cols-12 md:items-center">
                <label className="text-xs font-semibold text-[#64748B] md:col-span-4">
                  Industry / category
                </label>
                <div className="md:col-span-8">
                  {isEditingProfile ? (
                    <input
                      type="text"
                      value={draftMemory.category}
                      onChange={(e) =>
                        setDraftMemory({
                          ...draftMemory,
                          category: e.target.value,
                        })
                      }
                      className="w-full rounded-xl border border-[#DCE4FF] bg-[#FAFBFD] px-3.5 py-2 text-sm text-[#0F172A] outline-none focus:border-[#0027eb] focus:bg-white"
                    />
                  ) : (
                    <span className="inline-flex rounded-full border border-[#DCE4FF] bg-[#EEF2FF] px-3 py-1 text-xs font-semibold text-[#0027eb]">
                      {draftMemory.category}
                    </span>
                  )}
                </div>
              </div>

              {/* Product / service description */}
              <div className="grid grid-cols-1 gap-2 px-6 py-4 md:grid-cols-12 md:items-start">
                <label className="pt-1 text-xs font-semibold text-[#64748B] md:col-span-4">
                  Product / service description
                </label>
                <div className="md:col-span-8">
                  {isEditingProfile ? (
                    <textarea
                      rows={3}
                      value={draftMemory.description || ""}
                      onChange={(e) =>
                        setDraftMemory({
                          ...draftMemory,
                          description: e.target.value,
                        })
                      }
                      className="w-full rounded-xl border border-[#DCE4FF] bg-[#FAFBFD] px-3.5 py-2 text-sm text-[#0F172A] outline-none focus:border-[#0027eb] focus:bg-white"
                    />
                  ) : (
                    <p className="text-sm leading-relaxed text-[#334155]">
                      {draftMemory.description || draftMemory.tagline || "—"}
                    </p>
                  )}
                </div>
              </div>

              {/* Unique value propositions */}
              <div className="grid grid-cols-1 gap-2 px-6 py-4 md:grid-cols-12 md:items-start">
                <label className="pt-1 text-xs font-semibold text-[#64748B] md:col-span-4">
                  Unique value propositions
                </label>
                <div className="md:col-span-8">
                  <EditableChipGroup
                    items={draftMemory.usps}
                    editing={isEditingProfile}
                    tone="cobalt"
                    placeholder="Add USP + Enter"
                    onChange={(usps) => setDraftMemory({ ...draftMemory, usps })}
                  />
                </div>
              </div>

              {/* Pain points */}
              <div className="grid grid-cols-1 gap-2 px-6 py-4 md:grid-cols-12 md:items-start">
                <label className="pt-1 text-xs font-semibold text-[#64748B] md:col-span-4">
                  Pain points
                </label>
                <div className="md:col-span-8">
                  <EditableChipGroup
                    items={draftMemory.painPoints}
                    editing={isEditingProfile}
                    tone="amber"
                    placeholder="Add pain point + Enter"
                    onChange={(painPoints) =>
                      setDraftMemory({ ...draftMemory, painPoints })
                    }
                  />
                </div>
              </div>

              {/* Target audience */}
              <div className="grid grid-cols-1 gap-2 px-6 py-4 md:grid-cols-12 md:items-center">
                <label className="text-xs font-semibold text-[#64748B] md:col-span-4">
                  Target audience
                </label>
                <div className="md:col-span-8">
                  {isEditingProfile ? (
                    <input
                      type="text"
                      value={draftMemory.targetAudience}
                      onChange={(e) =>
                        setDraftMemory({
                          ...draftMemory,
                          targetAudience: e.target.value,
                        })
                      }
                      className="w-full rounded-xl border border-[#DCE4FF] bg-[#FAFBFD] px-3.5 py-2 text-sm text-[#0F172A] outline-none focus:border-[#0027eb] focus:bg-white"
                    />
                  ) : (
                    <p className="text-sm text-[#0F172A]">
                      {draftMemory.targetAudience}
                    </p>
                  )}
                </div>
              </div>

              {/* Primary offer */}
              <div className="grid grid-cols-1 gap-2 px-6 py-4 md:grid-cols-12 md:items-center">
                <label className="text-xs font-semibold text-[#64748B] md:col-span-4">
                  Primary offer
                </label>
                <div className="md:col-span-8">
                  {isEditingProfile ? (
                    <input
                      type="text"
                      value={draftMemory.primaryOffer}
                      onChange={(e) =>
                        setDraftMemory({
                          ...draftMemory,
                          primaryOffer: e.target.value,
                        })
                      }
                      className="w-full rounded-xl border border-[#DCE4FF] bg-[#FAFBFD] px-3.5 py-2 text-sm text-[#0F172A] outline-none focus:border-[#0027eb] focus:bg-white"
                    />
                  ) : (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-[#ECFDF3] px-3 py-1 text-xs font-semibold text-[#15803D]">
                      <ShieldCheck className="h-3.5 w-3.5" />
                      {draftMemory.primaryOffer}
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: BRAND GUIDELINES */}
          {overviewTab === "guidelines" && (
            <div className="divide-y divide-[#ECEFF5]">
              {/* Logos */}
              <div className="grid grid-cols-1 gap-4 px-6 py-5 md:grid-cols-12 md:items-start">
                <div className="md:col-span-4">
                  <p className="text-xs font-semibold text-[#0F172A]">Logos</p>
                  <p className="mt-1 text-xs text-[#64748B]">
                    Primary mark used in Studio templates and Snow renders.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-4 md:col-span-8">
                  <div className="relative flex h-24 w-44 items-center justify-center rounded-2xl border border-[#DCE4FF] bg-[#FAFBFD] p-4">
                    <span className="absolute right-2.5 top-2.5 rounded-full bg-[#EEF2FF] px-2 py-0.5 text-[10px] font-semibold text-[#0027eb]">
                      Default
                    </span>
                    {draftMemory.logoUrl ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={draftMemory.logoUrl}
                        alt={draftMemory.brandName}
                        className="max-h-12 max-w-[110px] object-contain"
                      />
                    ) : (
                      <span className="font-display text-base font-bold text-[#0F172A]">
                        {draftMemory.brandName}
                      </span>
                    )}
                  </div>
                  <div className="flex h-24 w-44 items-center justify-center rounded-2xl border border-[#0F172A] bg-[#050811] p-4">
                    {draftMemory.logoUrl ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={draftMemory.logoUrl}
                        alt={`${draftMemory.brandName} dark`}
                        className="max-h-12 max-w-[110px] object-contain brightness-0 invert"
                      />
                    ) : (
                      <span className="font-display text-base font-bold text-white">
                        {draftMemory.brandName}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Brand colors */}
              <div className="grid grid-cols-1 gap-4 px-6 py-5 md:grid-cols-12 md:items-start">
                <div className="md:col-span-4">
                  <p className="text-xs font-semibold text-[#0F172A]">
                    Brand colors
                  </p>
                  <p className="mt-1 text-xs text-[#64748B]">
                    Click any swatch to adjust its hex code or add a new brand color.
                  </p>
                </div>
                <div className="space-y-3 md:col-span-8">
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {draftMemory.brandColors.map((hex, idx) => (
                      <div
                        key={`${hex}-${idx}`}
                        className="group relative overflow-hidden rounded-2xl border border-[#E6E9F0] bg-white p-2 shadow-xs"
                      >
                        <label className="block cursor-pointer">
                          <div
                            className="h-14 w-full rounded-xl border border-black/10"
                            style={{ backgroundColor: hex }}
                          />
                          <input
                            type="color"
                            value={/^#[0-9A-Fa-f]{6}$/.test(hex) ? hex : "#0027eb"}
                            onChange={(e) =>
                              handleUpdateColorAt(idx, e.target.value)
                            }
                            className="sr-only"
                          />
                        </label>
                        <div className="mt-2 flex items-center justify-between px-1">
                          <span className="font-mono-num text-xs font-semibold text-[#0F172A]">
                            {hex.toUpperCase()}
                          </span>
                          {draftMemory.brandColors.length > 1 && (
                            <button
                              type="button"
                              data-no-glass="true"
                              onClick={() => handleRemoveColorAt(idx)}
                              aria-label={`Remove ${hex}`}
                              className="text-[#94A3B8] opacity-0 transition-opacity hover:text-[#0F172A] group-hover:opacity-100"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Add Swatch */}
                  <div className="flex flex-wrap items-center gap-2">
                    <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-[#E6E9F0] bg-[#FAFBFD] px-3 py-1.5 text-xs">
                      <span
                        className="h-4 w-4 rounded-full border border-black/10"
                        style={{ backgroundColor: newColorHex }}
                      />
                      <input
                        type="color"
                        value={newColorHex}
                        onChange={(e) => setNewColorHex(e.target.value)}
                        className="sr-only"
                      />
                      <span className="font-mono-num font-semibold text-[#0F172A]">
                        {newColorHex.toUpperCase()}
                      </span>
                    </label>
                    <button
                      type="button"
                      data-no-glass="true"
                      onClick={handleAddColor}
                      className="inline-flex items-center gap-1.5 rounded-full border border-[#DCE4FF] bg-[#EEF2FF] px-3.5 py-1.5 text-xs font-semibold text-[#0027eb] transition-colors hover:bg-[#0027eb] hover:text-white"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Add color swatch
                    </button>
                  </div>
                </div>
              </div>

              {/* Brand fonts */}
              <div className="grid grid-cols-1 gap-4 px-6 py-5 md:grid-cols-12 md:items-start">
                <div className="md:col-span-4">
                  <p className="text-xs font-semibold text-[#0F172A]">
                    Brand fonts
                  </p>
                  <p className="mt-1 text-xs text-[#64748B]">
                    Typography pairing applied to static ads and captions.
                  </p>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:col-span-8">
                  <div className="rounded-2xl border border-[#ECEFF5] bg-[#FAFBFD] p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">
                        Primary UI & Display
                      </span>
                      <Type className="h-3.5 w-3.5 text-[#0027eb]" />
                    </div>
                    <p className="mt-2 text-lg font-bold text-[#0F172A]">
                      Geist Sans
                    </p>
                    <p className="mt-1 text-xs text-[#64748B]">
                      Aa Bb Cc · Clean modern geometric grotesque
                    </p>
                  </div>
                  <div className="rounded-2xl border border-[#ECEFF5] bg-[#FAFBFD] p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">
                        Editorial Accent
                      </span>
                      <Type className="h-3.5 w-3.5 text-[#0F172A]" />
                    </div>
                    <p className="font-geist-serif mt-2 text-xl font-normal text-[#0F172A]">
                      Geist Serif
                    </p>
                    <p className="mt-1 text-xs text-[#64748B]">
                      Aa Bb Cc · High-trust founder & editorial headlines
                    </p>
                  </div>
                </div>
              </div>

              {/* Tone of voice */}
              <div className="grid grid-cols-1 gap-4 px-6 py-5 md:grid-cols-12 md:items-center">
                <div className="md:col-span-4">
                  <p className="text-xs font-semibold text-[#0F172A]">
                    Tone of voice
                  </p>
                  <p className="mt-1 text-xs text-[#64748B]">
                    Guides Snow scriptwriting and headline variations.
                  </p>
                </div>
                <div className="flex items-center gap-2 md:col-span-8">
                  <input
                    type="text"
                    value={draftMemory.toneOfVoice}
                    onChange={(e) =>
                      setDraftMemory({
                        ...draftMemory,
                        toneOfVoice: e.target.value,
                      })
                    }
                    className="flex-1 rounded-xl border border-[#E6E9F0] bg-[#FAFBFD] px-3.5 py-2 text-sm text-[#0F172A] outline-none focus:border-[#0027eb] focus:bg-white"
                  />
                  <button
                    type="button"
                    data-no-glass="true"
                    onClick={() => commitMemory(draftMemory)}
                    className="rounded-xl border border-[#DCE4FF] bg-[#EEF2FF] px-3.5 py-2 text-xs font-semibold text-[#0027eb] hover:bg-[#0027eb] hover:text-white"
                  >
                    Update
                  </button>
                </div>
              </div>

              {/* Logo on Snow images toggle */}
              <div className="grid grid-cols-1 gap-4 px-6 py-5 md:grid-cols-12 md:items-center">
                <div className="md:col-span-4">
                  <p className="text-xs font-semibold text-[#0F172A]">
                    Logo on Snow images
                  </p>
                  <p className="mt-1 text-xs text-[#64748B]">
                    Automatically watermark or place brand mark on static outputs.
                  </p>
                </div>
                <div className="flex items-center justify-between gap-3 md:col-span-8">
                  <span className="text-sm font-medium text-[#0F172A]">
                    {logoOnSnowImages
                      ? "On — Snow adds your logo to generated ads"
                      : "Off — Clean unbranded exports"}
                  </span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={logoOnSnowImages}
                    data-no-glass="true"
                    onClick={() => setLogoOnSnowImages((v) => !v)}
                    className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
                      logoOnSnowImages ? "bg-[#0027eb]" : "bg-[#CBD5E1]"
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-xs transition-transform ${
                        logoOnSnowImages ? "translate-x-6" : "translate-x-1"
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* Default language */}
              <div className="grid grid-cols-1 gap-4 px-6 py-5 md:grid-cols-12 md:items-center">
                <div className="md:col-span-4">
                  <p className="text-xs font-semibold text-[#0F172A]">
                    Default language
                  </p>
                  <p className="mt-1 text-xs text-[#64748B]">
                    Default copywriting and voiceover language in Studio.
                  </p>
                </div>
                <div className="md:col-span-8">
                  <select
                    value={defaultLanguage}
                    onChange={(e) => setDefaultLanguage(e.target.value)}
                    data-no-glass="true"
                    className="w-full max-w-xs rounded-xl border border-[#E6E9F0] bg-[#FAFBFD] px-3.5 py-2 text-sm font-medium text-[#0F172A] outline-none focus:border-[#0027eb] focus:bg-white"
                  >
                    <option value="English (US)">English (US)</option>
                    <option value="Danish (DA)">Danish (DA)</option>
                    <option value="Swedish (SV)">Swedish (SV)</option>
                    <option value="Norwegian (NO)">Norwegian (NO)</option>
                    <option value="German (DE)">German (DE)</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: CONTEXT FILES */}
          {overviewTab === "context_files" && (
            <div className="space-y-5 p-6">
              <input
                ref={contextFileInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={(e) => handleContextFilesSelected(e.target.files)}
              />
              <div
                onClick={() => contextFileInputRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  handleContextFilesSelected(e.dataTransfer.files);
                }}
                className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-[#C2D0FF] bg-[#EEF2FF]/35 px-6 py-8 text-center transition-colors hover:border-[#0027eb] hover:bg-[#EEF2FF]/60"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-[#0027eb] shadow-xs">
                  <Upload className="h-5 w-5" />
                </div>
                <p className="mt-3 text-sm font-semibold text-[#0F172A]">
                  Drop brand PDFs, review exports, or creative guidelines
                </p>
                <p className="mt-1 text-xs text-[#64748B]">
                  Supports PDF, CSV, TXT, DOCX, and Markdown context files
                </p>
                <span className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-[#0027eb] px-4 py-1.5 text-xs font-semibold text-white">
                  <Plus className="h-3.5 w-3.5" />
                  Select files
                </span>
              </div>

              <div className="overflow-hidden rounded-2xl border border-[#ECEFF5]">
                <table className="w-full border-collapse text-left">
                  <thead>
                    <tr className="border-b border-[#ECEFF5] bg-[#FAFBFD] text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">
                      <th className="px-4 py-3">Name</th>
                      <th className="px-4 py-3">Topic tags</th>
                      <th className="px-4 py-3">Added</th>
                      <th className="px-4 py-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#ECEFF5] text-xs">
                    {contextFiles.map((file) => (
                      <tr key={file.id} className="hover:bg-[#F7F8FB]">
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-2.5">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#EEF2FF] text-[#0027eb]">
                              <FileText className="h-4 w-4" />
                            </div>
                            <div>
                              <p className="font-semibold text-[#0F172A]">
                                {file.name}
                              </p>
                              <p className="font-mono-num text-[11px] text-[#64748B]">
                                {file.sizeLabel}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="flex flex-wrap gap-1.5">
                            {file.topics.map((t) => (
                              <span
                                key={t}
                                className="rounded-full border border-[#E6E9F0] bg-[#F7F8FB] px-2.5 py-0.5 text-[11px] font-medium text-[#334155]"
                              >
                                {t}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="font-mono-num px-4 py-3.5 text-[#64748B]">
                          {file.addedAt}
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          <button
                            type="button"
                            data-no-glass="true"
                            onClick={() =>
                              setContextFiles((prev) =>
                                prev.filter((f) => f.id !== file.id)
                              )
                            }
                            aria-label={`Delete ${file.name}`}
                            className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-[#94A3B8] hover:bg-[#F3F5F9] hover:text-[#0F172A]"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>
      </div>
    );
  }

  /* --------------------------------------------------------------------------
     AUDIENCE SUB-VIEW (Scenarios & Personas)
     -------------------------------------------------------------------------- */
  if (subView === "audience") {
    return (
      <div className="animate-view-in mx-auto w-full max-w-[1280px] space-y-6 px-4 py-6 sm:px-7">
        {renderDetailHeader()}

        {/* Toggle Cards + Add Scenario CTA */}
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div className="grid grid-cols-2 gap-3 sm:w-[420px]">
            <button
              type="button"
              data-no-glass="true"
              onClick={() => setAudienceMode("scenarios")}
              className={`rounded-2xl border p-3.5 text-left transition-all ${
                audienceMode === "scenarios"
                  ? "border-[#0027eb] bg-[#EEF2FF]/60 shadow-xs"
                  : "border-[#ECEFF5] bg-white hover:border-[#DCE4FF]"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#0F172A]">
                  Scenarios
                </span>
                <span className="font-mono-num rounded-full bg-white px-2 py-0.5 text-[11px] font-bold text-[#0027eb]">
                  {allScenarios.length}
                </span>
              </div>
              <p className="mt-1 text-[11px] text-[#64748B]">
                Real-world buying moments
              </p>
            </button>

            <button
              type="button"
              data-no-glass="true"
              onClick={() => setAudienceMode("personas")}
              className={`rounded-2xl border p-3.5 text-left transition-all ${
                audienceMode === "personas"
                  ? "border-[#0027eb] bg-[#EEF2FF]/60 shadow-xs"
                  : "border-[#ECEFF5] bg-white hover:border-[#DCE4FF]"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#0F172A]">
                  Personas
                </span>
                <span className="font-mono-num rounded-full bg-white px-2 py-0.5 text-[11px] font-bold text-[#0027eb]">
                  {ATRIA_BRAND_PERSONAS.length}
                </span>
              </div>
              <p className="mt-1 text-[11px] text-[#64748B]">
                Core customer archetypes
              </p>
            </button>
          </div>

          <button
            type="button"
            onClick={() => {
              setAudienceMode("scenarios");
              setShowAddScenario((v) => !v);
            }}
            className="adtrack-btn-primary inline-flex items-center gap-1.5 self-start rounded-full px-4 py-2.5 text-xs font-semibold text-white sm:self-auto"
          >
            <Plus className="h-4 w-4" />
            Add scenario
          </button>
        </div>

        {/* Inline Add Scenario Form */}
        {showAddScenario && (
          <form
            onSubmit={handleCreateScenario}
            className="grid grid-cols-1 gap-3 rounded-2xl border border-[#DCE4FF] bg-[#EEF2FF]/40 p-4 md:grid-cols-12"
          >
            <input
              type="text"
              required
              value={newScenarioTitle}
              onChange={(e) => setNewScenarioTitle(e.target.value)}
              placeholder="Scenario title (e.g. Morning Studio Setup)"
              className="rounded-xl border border-[#DCE4FF] bg-white px-3.5 py-2 text-xs text-[#0F172A] outline-none focus:border-[#0027eb] md:col-span-4"
            />
            <input
              type="text"
              value={newScenarioHook}
              onChange={(e) => setNewScenarioHook(e.target.value)}
              placeholder="Hook angle (e.g. Problem -> Demo)"
              className="rounded-xl border border-[#DCE4FF] bg-white px-3.5 py-2 text-xs text-[#0F172A] outline-none focus:border-[#0027eb] md:col-span-3"
            />
            <input
              type="text"
              value={newScenarioSummary}
              onChange={(e) => setNewScenarioSummary(e.target.value)}
              placeholder="Short scenario summary"
              className="rounded-xl border border-[#DCE4FF] bg-white px-3.5 py-2 text-xs text-[#0F172A] outline-none focus:border-[#0027eb] md:col-span-3"
            />
            <div className="flex items-center justify-end gap-2 md:col-span-2">
              <button
                type="button"
                data-no-glass="true"
                onClick={() => setShowAddScenario(false)}
                className="rounded-full border border-[#E6E9F0] bg-white px-3 py-2 text-xs font-semibold text-[#475569]"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="adtrack-btn-primary rounded-full px-4 py-2 text-xs font-semibold text-white"
              >
                Save
              </button>
            </div>
          </form>
        )}

        {/* 2-Column Grid */}
        {audienceMode === "scenarios" ? (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            {allScenarios.map((scn) => (
              <div
                key={scn.id}
                className="group overflow-hidden rounded-3xl border border-[#ECEFF5] bg-white shadow-xs transition-all hover:border-[#DCE4FF] hover:shadow-md"
              >
                <div className="relative aspect-[16/9] w-full overflow-hidden bg-[#F7F8FB]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={scn.imageUrl}
                    alt={scn.title}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                  />
                  <span className="absolute left-3.5 top-3.5 rounded-full bg-[#050811]/85 px-3 py-1 text-[11px] font-semibold text-white backdrop-blur-xs">
                    {scn.hookAngle}
                  </span>
                </div>
                <div className="space-y-3 p-5">
                  <div>
                    <h3 className="font-display text-base font-bold text-[#0F172A]">
                      {scn.title}
                    </h3>
                    <p className="mt-1 text-xs leading-relaxed text-[#475569]">
                      {scn.summary}
                    </p>
                  </div>
                  <div className="flex items-center justify-between border-t border-[#ECEFF5] pt-3">
                    <span className="text-[11px] font-medium text-[#64748B]">
                      Ready for Video & Static Studio
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        onCreateAdFromProduct(
                          `${
                            activeMemory.products[0]?.title ||
                            activeMemory.brandName
                          } (${scn.title})`
                        )
                      }
                      className="adtrack-btn-primary inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-semibold text-white"
                    >
                      <Sparkles className="h-3.5 w-3.5" />
                      Create Ad with Scenario
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            {ATRIA_BRAND_PERSONAS.map((persona) => (
              <div
                key={persona.id}
                className="flex flex-col justify-between gap-4 rounded-3xl border border-[#ECEFF5] bg-white p-5 shadow-xs transition-all hover:border-[#DCE4FF] hover:shadow-md"
              >
                <div className="flex items-start gap-4">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={persona.avatarUrl}
                    alt={persona.name}
                    className="h-16 w-16 shrink-0 rounded-2xl border border-[#E6E9F0] object-cover"
                  />
                  <div className="min-w-0 space-y-1.5">
                    <span className="inline-flex rounded-full bg-[#EEF2FF] px-2.5 py-0.5 text-[11px] font-semibold text-[#0027eb]">
                      {persona.role}
                    </span>
                    <h3 className="font-display text-base font-bold text-[#0F172A]">
                      {persona.name}
                    </h3>
                    <p className="text-xs leading-relaxed text-[#475569]">
                      {persona.desire}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-[#ECEFF5] pt-3">
                  <span className="text-[11px] font-medium text-[#64748B]">
                    ICP Persona · {activeMemory.brandName}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      onCreateAdFromProduct(
                        `${
                          activeMemory.products[0]?.title ||
                          activeMemory.brandName
                        } (${persona.name.split("—")[0].trim()})`
                      )
                    }
                    className="adtrack-btn-primary inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-semibold text-white"
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    Create Ad for Persona
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  /* --------------------------------------------------------------------------
     PRODUCTS SUB-VIEW
     -------------------------------------------------------------------------- */
  if (subView === "products") {
    return (
      <div className="animate-view-in mx-auto w-full max-w-[1280px] space-y-6 px-4 py-6 sm:px-7">
        {renderDetailHeader()}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-lg font-bold text-[#0F172A]">
              Product Catalog
            </h2>
            <p className="text-xs text-[#64748B]">
              Launch new video or static creatives directly from any synced product.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowAddProduct((v) => !v)}
            className="adtrack-btn-primary inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-semibold text-white"
          >
            <Plus className="h-4 w-4" />
            Add product
          </button>
        </div>

        {showAddProduct && (
          <form
            onSubmit={handleCreateProduct}
            className="grid grid-cols-1 gap-3 rounded-2xl border border-[#DCE4FF] bg-[#EEF2FF]/40 p-4 md:grid-cols-12"
          >
            <input
              type="text"
              required
              value={newProductTitle}
              onChange={(e) => setNewProductTitle(e.target.value)}
              placeholder="Product title"
              className="rounded-xl border border-[#DCE4FF] bg-white px-3.5 py-2 text-xs text-[#0F172A] outline-none focus:border-[#0027eb] md:col-span-3"
            />
            <input
              type="text"
              value={newProductPrice}
              onChange={(e) => setNewProductPrice(e.target.value)}
              placeholder="Price (e.g. 799)"
              className="rounded-xl border border-[#DCE4FF] bg-white px-3.5 py-2 text-xs text-[#0F172A] outline-none focus:border-[#0027eb] md:col-span-2"
            />
            <input
              type="url"
              value={newProductUrl}
              onChange={(e) => setNewProductUrl(e.target.value)}
              placeholder="Product URL"
              className="rounded-xl border border-[#DCE4FF] bg-white px-3.5 py-2 text-xs text-[#0F172A] outline-none focus:border-[#0027eb] md:col-span-3"
            />
            <input
              type="url"
              value={newProductImageUrl}
              onChange={(e) => setNewProductImageUrl(e.target.value)}
              placeholder="Image URL (optional)"
              className="rounded-xl border border-[#DCE4FF] bg-white px-3.5 py-2 text-xs text-[#0F172A] outline-none focus:border-[#0027eb] md:col-span-2"
            />
            <div className="flex items-center justify-end gap-2 md:col-span-2">
              <button
                type="button"
                data-no-glass="true"
                onClick={() => setShowAddProduct(false)}
                className="rounded-full border border-[#E6E9F0] bg-white px-3 py-2 text-xs font-semibold text-[#475569]"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="adtrack-btn-primary rounded-full px-4 py-2 text-xs font-semibold text-white"
              >
                Save
              </button>
            </div>
          </form>
        )}

        <div className="overflow-hidden rounded-3xl border border-[#ECEFF5] bg-white shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse text-left">
              <thead>
                <tr className="border-b border-[#ECEFF5] bg-[#FAFBFD] text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">
                  <th className="px-6 py-3">Product</th>
                  <th className="px-4 py-3">Price</th>
                  <th className="px-4 py-3">URL</th>
                  <th className="px-6 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#ECEFF5] text-sm">
                {activeMemory.products.map((p, idx) => {
                  const formattedPrice =
                    formatProductPriceDkk(
                      p.price,
                      p.currency || activeMemory.currency
                    ) || "—";
                  return (
                    <tr
                      key={`${p.title}-${idx}`}
                      className="transition-colors hover:bg-[#F7F8FB]"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3.5">
                          <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-[#E6E9F0] bg-[#FAFBFD]">
                            {p.image_url ? (
                              /* eslint-disable-next-line @next/next/no-img-element */
                              <img
                                src={p.image_url}
                                alt={p.title}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center text-[#94A3B8]">
                                <Package className="h-5 w-5" />
                              </div>
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-[#0F172A]">
                              {p.title}
                            </p>
                            {p.product_type && (
                              <p className="text-xs text-[#64748B]">
                                {p.product_type}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="font-mono-num px-4 py-4 text-sm font-semibold text-[#0F172A]">
                        {formattedPrice}
                      </td>
                      <td className="px-4 py-4">
                        {p.url ? (
                          <a
                            href={p.url}
                            target="_blank"
                            rel="noreferrer"
                            className="font-mono-num inline-flex max-w-[260px] items-center gap-1 truncate text-xs text-[#0027eb] hover:underline"
                          >
                            <span className="truncate">
                              {p.url.replace(/^https?:\/\//, "")}
                            </span>
                            <ExternalLink className="h-3 w-3 shrink-0" />
                          </a>
                        ) : (
                          <span className="text-xs text-[#94A3B8]">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          type="button"
                          onClick={() => onCreateAdFromProduct(p.title)}
                          className="adtrack-btn-primary inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-semibold text-white"
                        >
                          <Sparkles className="h-3.5 w-3.5" />
                          Create Ad
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  /* --------------------------------------------------------------------------
     COMPETITORS SUB-VIEW
     -------------------------------------------------------------------------- */
  return (
    <div className="animate-view-in mx-auto w-full max-w-[1280px] space-y-6 px-4 py-6 sm:px-7">
      {renderDetailHeader()}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-bold text-[#0F172A]">
            Tracked Competitors
          </h2>
          <p className="text-xs text-[#64748B]">
            Monitor active Meta creative volume, traffic velocity, and offer structures.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {trackedCompetitors.map((brand) => {
          const activeCount =
            brand.active_ads_count ?? adCountByBrand.get(brand.id) ?? 0;
          return (
            <div
              key={brand.id}
              className="flex flex-col justify-between gap-4 rounded-3xl border border-[#ECEFF5] bg-white p-5 shadow-xs transition-all hover:border-[#DCE4FF] hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full border border-[#E6E9F0] bg-white p-1.5">
                    {brand.logo_url ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={brand.logo_url}
                        alt={brand.name}
                        className="h-full w-full rounded-full object-contain"
                      />
                    ) : (
                      <span className="font-display text-sm font-bold text-[#0F172A]">
                        {brand.avatar_initials}
                      </span>
                    )}
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-display truncate text-base font-bold text-[#0F172A]">
                      {brand.name}
                    </h3>
                    <p className="font-mono-num truncate text-xs text-[#64748B]">
                      {brand.website_url.replace(/^https?:\/\//, "")}
                    </p>
                  </div>
                </div>
                <span className="shrink-0 rounded-full border border-[#DCE4FF] bg-[#EEF2FF] px-2.5 py-0.5 text-[11px] font-semibold text-[#0027eb]">
                  {brand.market}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2.5 rounded-2xl bg-[#F7F8FB] p-3">
                <div>
                  <p className="text-[11px] text-[#64748B]">Active ads</p>
                  <p className="font-mono-num mt-0.5 text-base font-bold text-[#0F172A]">
                    {activeCount}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] text-[#64748B]">Category</p>
                  <p className="mt-0.5 truncate text-xs font-semibold text-[#0F172A]">
                    {brand.category}
                  </p>
                </div>
              </div>

              <button
                type="button"
                data-no-glass="true"
                onClick={() => onOpenCompetitorBrand(brand.id)}
                className="inline-flex w-full items-center justify-center gap-1.5 rounded-full bg-[#0F172A] px-4 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-[#1E293B]"
              >
                <BarChart3 className="h-3.5 w-3.5" />
                Inspect Analytics
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ============================================================================
   2. ASSETS WORKSPACE VIEW
   ============================================================================ */

export interface AssetsWorkspaceViewProps {
  brandMemory: BrandMemory | null;
  projects: CreativeProject[];
  onOpenBrandScanner: () => void;
  onNavigateToStudio: (tab?: StudioSubTab) => void;
}

export function AssetsWorkspaceView({
  brandMemory,
  projects,
  onOpenBrandScanner,
  onNavigateToStudio,
}: AssetsWorkspaceViewProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [sortBy, setSortBy] = useState<"recent" | "name" | "format">("recent");

  // Filter states: Asset & Clip
  const [formatFilter, setFormatFilter] = useState<"all" | "image" | "video">(
    "all"
  );
  const [uploaderFilter, setUploaderFilter] = useState<
    "all" | "Uploaded" | "Brand Memory" | "Studio"
  >("all");
  const [creatorFilter, setCreatorFilter] = useState<
    "all" | "You" | "Snow AI"
  >("all");
  const [sceneFilter, setSceneFilter] = useState<string>("all");
  const [rollFilter, setRollFilter] = useState<string>("all");
  const [captionFilter, setCaptionFilter] = useState<string>("all");
  const [audioFilter, setAudioFilter] = useState<string>("all");

  const [uploadedAssets, setUploadedAssets] = useState<UploadedAssetItem[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const objectUrlsRef = useRef<string[]>([]);

  useEffect(() => {
    const urls = objectUrlsRef.current;
    return () => {
      for (const u of urls) {
        URL.revokeObjectURL(u);
      }
    };
  }, []);

  const handleFileUpload = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const now = Date.now();
    const next: UploadedAssetItem[] = Array.from(files).map((file, idx) => {
      const url = URL.createObjectURL(file);
      objectUrlsRef.current.push(url);
      const isVideo = file.type.startsWith("video/");
      return {
        id: `upload-${now}-${idx}`,
        name: file.name,
        mediaType: isVideo ? "video" : "image",
        url,
        source: "Uploaded",
        creator: "You",
        scene: isVideo ? "UGC Hook" : "Product Hero",
        rollType: isVideo ? "A-Roll" : "B-Roll",
        captionState: "Clean",
        audioState: isVideo ? "Voiceover" : "Silent / Visual",
        addedAt: "Just now",
        timestampMs: now + idx,
        subtitle: `${Math.max(1, Math.round(file.size / 1024))} KB`,
      };
    });
    setUploadedAssets((prev) => [...next, ...prev]);
  };

  const combinedAssets = useMemo<UploadedAssetItem[]>(() => {
    const projectAssets: UploadedAssetItem[] = projects
      .map((proj, idx) => {
        const thumb =
          proj.productImageUrl || proj.clonedFromAd?.thumbnailUrl || "";
        if (!thumb) return null;
        const isVideo = proj.mode === "video";
        const item: UploadedAssetItem = {
          id: `proj-${proj.id}`,
          name: proj.title || proj.productTitle,
          mediaType: isVideo ? "video" : "image",
          url: thumb,
          source: "Studio",
          creator: "Snow AI",
          scene: isVideo ? "UGC Hook" : "Product Hero",
          rollType: isVideo ? "A-Roll" : "B-Roll",
          captionState: "With Captions",
          audioState: isVideo ? "Voiceover" : "Silent / Visual",
          addedAt: new Date(proj.createdAt).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          }),
          timestampMs: Date.parse(proj.createdAt) || 1000 + idx,
          subtitle: `${proj.brandName} · ${proj.aspectRatio}`,
          projectMode: proj.mode,
        };
        return item;
      })
      .filter((x): x is UploadedAssetItem => x !== null);

    const productAssets: UploadedAssetItem[] = (brandMemory?.products || [])
      .filter((p) => Boolean(p.image_url))
      .map((p, idx) => ({
        id: `brand-prod-${idx}-${p.title}`,
        name: p.title,
        mediaType: "image" as const,
        url: p.image_url as string,
        source: "Brand Memory" as const,
        creator: "You" as const,
        scene: "Product Hero" as const,
        rollType: "B-Roll" as const,
        captionState: "Clean" as const,
        audioState: "Silent / Visual" as const,
        addedAt: "Brand sync",
        timestampMs: 500 + idx,
        subtitle:
          formatProductPriceDkk(p.price, p.currency || brandMemory?.currency) ||
          brandMemory?.brandName,
      }));

    return [...uploadedAssets, ...projectAssets, ...productAssets];
  }, [uploadedAssets, projects, brandMemory]);

  const filteredAssets = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const list = combinedAssets.filter((item) => {
      if (q) {
        const hay = `${item.name} ${item.subtitle || ""} ${item.scene} ${
          item.source
        }`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (formatFilter !== "all" && item.mediaType !== formatFilter) return false;
      if (uploaderFilter !== "all" && item.source !== uploaderFilter)
        return false;
      if (creatorFilter !== "all" && item.creator !== creatorFilter)
        return false;
      if (sceneFilter !== "all" && item.scene !== sceneFilter) return false;
      if (rollFilter !== "all" && item.rollType !== rollFilter) return false;
      if (captionFilter !== "all" && item.captionState !== captionFilter)
        return false;
      if (audioFilter !== "all" && item.audioState !== audioFilter) return false;
      return true;
    });

    if (sortBy === "name") {
      return [...list].sort((a, b) => a.name.localeCompare(b.name));
    }
    if (sortBy === "format") {
      return [...list].sort((a, b) => a.mediaType.localeCompare(b.mediaType));
    }
    return [...list].sort((a, b) => b.timestampMs - a.timestampMs);
  }, [
    combinedAssets,
    searchQuery,
    formatFilter,
    uploaderFilter,
    creatorFilter,
    sceneFilter,
    rollFilter,
    captionFilter,
    audioFilter,
    sortBy,
  ]);

  const resetFilters = () => {
    setSearchQuery("");
    setFormatFilter("all");
    setUploaderFilter("all");
    setCreatorFilter("all");
    setSceneFilter("all");
    setRollFilter("all");
    setCaptionFilter("all");
    setAudioFilter("all");
  };

  return (
    <div className="animate-view-in mx-auto w-full max-w-[1280px] space-y-5 px-4 py-6 sm:px-7">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,video/*"
        multiple
        className="hidden"
        onChange={(e) => handleFileUpload(e.target.files)}
      />

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <h1 className="font-display text-[26px] font-bold tracking-tight text-[#0F172A]">
            All assets
          </h1>
          <span className="font-mono-num rounded-full border border-[#E6E9F0] bg-white px-2.5 py-0.5 text-xs font-semibold text-[#475569]">
            {filteredAssets.length}
          </span>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            data-no-glass="true"
            onClick={() => onNavigateToStudio("video")}
            className="inline-flex items-center gap-1.5 rounded-full border border-[#E6E9F0] bg-white px-4 py-2 text-xs font-semibold text-[#0F172A] transition-colors hover:border-[#0027eb]/30 hover:text-[#0027eb]"
          >
            <Wand2 className="h-3.5 w-3.5" />
            Open Studio
          </button>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="adtrack-btn-primary inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-semibold text-white"
          >
            <Plus className="h-4 w-4" />
            Add
          </button>
        </div>
      </div>

      {/* Search + Controls Bar */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="flex flex-1 items-center gap-2.5 rounded-full border border-[#E6E9F0] bg-white px-4 py-2.5 shadow-xs focus-within:border-[#0027eb]">
          <Search className="h-4 w-4 shrink-0 text-[#94A3B8]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name/visual element/voice-over/text-overlay"
            className="w-full bg-transparent text-xs text-[#0F172A] outline-none placeholder:text-[#94A3B8] sm:text-sm"
          />
          {searchQuery && (
            <button
              type="button"
              data-no-glass="true"
              onClick={() => setSearchQuery("")}
              className="text-[#94A3B8] hover:text-[#0F172A]"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            data-no-glass="true"
            onClick={() => setShowFilters((v) => !v)}
            className={`inline-flex items-center gap-1.5 rounded-full border px-4 py-2.5 text-xs font-semibold transition-colors ${
              showFilters
                ? "border-[#0027eb] bg-[#EEF2FF] text-[#0027eb]"
                : "border-[#E6E9F0] bg-white text-[#0F172A] hover:border-[#DCE4FF]"
            }`}
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            Filters {showFilters ? "Hide" : "Show"}
          </button>

          <div className="inline-flex items-center gap-2 rounded-full border border-[#E6E9F0] bg-white px-3.5 py-2 text-xs font-semibold text-[#0F172A]">
            <span className="text-[#64748B]">Sort:</span>
            <select
              value={sortBy}
              onChange={(e) =>
                setSortBy(e.target.value as "recent" | "name" | "format")
              }
              data-no-glass="true"
              className="bg-transparent font-semibold text-[#0F172A] outline-none"
            >
              <option value="recent">Recently added</option>
              <option value="name">Name A–Z</option>
              <option value="format">Media format</option>
            </select>
          </div>
        </div>
      </div>

      {/* Expanded Filter Bar */}
      {showFilters && (
        <div className="grid grid-cols-1 gap-4 rounded-3xl border border-[#ECEFF5] bg-white p-5 shadow-xs lg:grid-cols-2">
          {/* Asset Filters */}
          <div className="space-y-3">
            <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[#64748B]">
              <Filter className="h-3.5 w-3.5 text-[#0027eb]" />
              <span>Asset</span>
            </div>
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
              <label className="space-y-1 text-xs">
                <span className="font-medium text-[#64748B]">Format</span>
                <select
                  value={formatFilter}
                  onChange={(e) =>
                    setFormatFilter(
                      e.target.value as "all" | "image" | "video"
                    )
                  }
                  data-no-glass="true"
                  className="w-full rounded-xl border border-[#E6E9F0] bg-[#FAFBFD] px-3 py-2 text-xs font-medium text-[#0F172A] outline-none focus:border-[#0027eb]"
                >
                  <option value="all">All formats</option>
                  <option value="image">Image</option>
                  <option value="video">Video</option>
                </select>
              </label>

              <label className="space-y-1 text-xs">
                <span className="font-medium text-[#64748B]">Uploader</span>
                <select
                  value={uploaderFilter}
                  onChange={(e) =>
                    setUploaderFilter(
                      e.target.value as
                        | "all"
                        | "Uploaded"
                        | "Brand Memory"
                        | "Studio"
                    )
                  }
                  data-no-glass="true"
                  className="w-full rounded-xl border border-[#E6E9F0] bg-[#FAFBFD] px-3 py-2 text-xs font-medium text-[#0F172A] outline-none focus:border-[#0027eb]"
                >
                  <option value="all">All sources</option>
                  <option value="Uploaded">Uploaded</option>
                  <option value="Brand Memory">Brand Memory</option>
                  <option value="Studio">Studio</option>
                </select>
              </label>

              <label className="space-y-1 text-xs">
                <span className="font-medium text-[#64748B]">Creator</span>
                <select
                  value={creatorFilter}
                  onChange={(e) =>
                    setCreatorFilter(
                      e.target.value as "all" | "You" | "Snow AI"
                    )
                  }
                  data-no-glass="true"
                  className="w-full rounded-xl border border-[#E6E9F0] bg-[#FAFBFD] px-3 py-2 text-xs font-medium text-[#0F172A] outline-none focus:border-[#0027eb]"
                >
                  <option value="all">All creators</option>
                  <option value="You">You</option>
                  <option value="Snow AI">Snow AI</option>
                </select>
              </label>
            </div>
          </div>

          {/* Clip Filters */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[#64748B]">
                <Film className="h-3.5 w-3.5 text-[#0027eb]" />
                <span>Clip</span>
              </div>
              <button
                type="button"
                data-no-glass="true"
                onClick={resetFilters}
                className="text-[11px] font-semibold text-[#0027eb] hover:underline"
              >
                Reset all
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
              <label className="space-y-1 text-xs">
                <span className="font-medium text-[#64748B]">Scene</span>
                <select
                  value={sceneFilter}
                  onChange={(e) => setSceneFilter(e.target.value)}
                  data-no-glass="true"
                  className="w-full rounded-xl border border-[#E6E9F0] bg-[#FAFBFD] px-2.5 py-2 text-xs font-medium text-[#0F172A] outline-none focus:border-[#0027eb]"
                >
                  <option value="all">All</option>
                  <option value="Product Hero">Product Hero</option>
                  <option value="Lifestyle">Lifestyle</option>
                  <option value="UGC Hook">UGC Hook</option>
                  <option value="B-Roll">B-Roll</option>
                </select>
              </label>

              <label className="space-y-1 text-xs">
                <span className="font-medium text-[#64748B]">A-B roll</span>
                <select
                  value={rollFilter}
                  onChange={(e) => setRollFilter(e.target.value)}
                  data-no-glass="true"
                  className="w-full rounded-xl border border-[#E6E9F0] bg-[#FAFBFD] px-2.5 py-2 text-xs font-medium text-[#0F172A] outline-none focus:border-[#0027eb]"
                >
                  <option value="all">All</option>
                  <option value="A-Roll">A-Roll</option>
                  <option value="B-Roll">B-Roll</option>
                </select>
              </label>

              <label className="space-y-1 text-xs">
                <span className="font-medium text-[#64748B]">Caption</span>
                <select
                  value={captionFilter}
                  onChange={(e) => setCaptionFilter(e.target.value)}
                  data-no-glass="true"
                  className="w-full rounded-xl border border-[#E6E9F0] bg-[#FAFBFD] px-2.5 py-2 text-xs font-medium text-[#0F172A] outline-none focus:border-[#0027eb]"
                >
                  <option value="all">All</option>
                  <option value="With Captions">With Captions</option>
                  <option value="Clean">Clean</option>
                </select>
              </label>

              <label className="space-y-1 text-xs">
                <span className="font-medium text-[#64748B]">Audio</span>
                <select
                  value={audioFilter}
                  onChange={(e) => setAudioFilter(e.target.value)}
                  data-no-glass="true"
                  className="w-full rounded-xl border border-[#E6E9F0] bg-[#FAFBFD] px-2.5 py-2 text-xs font-medium text-[#0F172A] outline-none focus:border-[#0027eb]"
                >
                  <option value="all">All</option>
                  <option value="Voiceover">Voiceover</option>
                  <option value="Silent / Visual">Silent / Visual</option>
                </select>
              </label>
            </div>
          </div>
        </div>
      )}

      {/* Asset Grid OR Empty Card */}
      {filteredAssets.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-[#DCE4FF] bg-white px-6 py-16 text-center shadow-xs">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#EEF2FF] text-[#0027eb]">
            <FolderOpen className="h-6 w-6" />
          </div>
          <h2 className="font-display mt-4 text-lg font-bold text-[#0F172A]">
            Upload or import assets
          </h2>
          <p className="mt-1.5 max-w-md text-xs leading-relaxed text-[#64748B]">
            {combinedAssets.length > 0
              ? "No assets matched your current search or clip filters. Reset filters or upload new footage."
              : "Upload B-roll clips and product photography, scan your storefront URL, or generate scenes in Studio."}
          </p>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-2.5">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="adtrack-btn-primary inline-flex items-center gap-1.5 rounded-full px-5 py-2.5 text-xs font-semibold text-white"
            >
              <Upload className="h-3.5 w-3.5" />
              Upload files
            </button>
            <button
              type="button"
              data-no-glass="true"
              onClick={onOpenBrandScanner}
              className="inline-flex items-center gap-1.5 rounded-full border border-[#E6E9F0] bg-white px-4 py-2.5 text-xs font-semibold text-[#0F172A] hover:border-[#0027eb]/30 hover:text-[#0027eb]"
            >
              <Globe className="h-3.5 w-3.5" />
              Import from Brand URL
            </button>
            {combinedAssets.length > 0 && (
              <button
                type="button"
                data-no-glass="true"
                onClick={resetFilters}
                className="inline-flex items-center gap-1.5 rounded-full border border-[#E6E9F0] bg-[#F7F8FB] px-4 py-2.5 text-xs font-semibold text-[#475569] hover:text-[#0F172A]"
              >
                Clear filters
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {filteredAssets.map((asset) => (
            <div
              key={asset.id}
              className="group overflow-hidden rounded-2xl border border-[#ECEFF5] bg-white shadow-xs transition-all hover:border-[#DCE4FF] hover:shadow-md"
            >
              <div className="relative aspect-[4/3] w-full overflow-hidden bg-[#050811]">
                {asset.mediaType === "video" &&
                asset.source === "Uploaded" ? (
                  <video
                    src={asset.url}
                    muted
                    playsInline
                    controls
                    className="h-full w-full object-cover"
                  />
                ) : (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={asset.url}
                    alt={asset.name}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                  />
                )}

                {/* Top Format Badge */}
                <div className="pointer-events-none absolute left-2.5 top-2.5 flex items-center gap-1.5">
                  <span className="inline-flex items-center gap-1 rounded-full bg-[#050811]/85 px-2.5 py-0.5 text-[10px] font-semibold text-white backdrop-blur-xs">
                    {asset.mediaType === "video" ? (
                      <Video className="h-3 w-3 text-[#3B66FF]" />
                    ) : (
                      <ImageIcon className="h-3 w-3 text-[#3B66FF]" />
                    )}
                    {asset.mediaType.toUpperCase()}
                  </span>
                </div>

                {/* Source Pill */}
                <span className="pointer-events-none absolute right-2.5 top-2.5 rounded-full bg-white/95 px-2.5 py-0.5 text-[10px] font-semibold text-[#0F172A] shadow-xs">
                  {asset.source}
                </span>
              </div>

              <div className="space-y-2.5 p-3.5">
                <div className="min-w-0">
                  <p className="truncate text-xs font-bold text-[#0F172A]">
                    {asset.name}
                  </p>
                  <p className="mt-0.5 truncate text-[11px] text-[#64748B]">
                    {asset.subtitle || `${asset.scene} · ${asset.rollType}`}
                  </p>
                </div>

                <div className="flex items-center justify-between border-t border-[#ECEFF5] pt-2.5">
                  <span className="font-mono-num text-[10.5px] text-[#64748B]">
                    {asset.addedAt}
                  </span>
                  <button
                    type="button"
                    data-no-glass="true"
                    onClick={() =>
                      onNavigateToStudio(
                        asset.projectMode === "static_clone"
                          ? "static"
                          : "video"
                      )
                    }
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#0027eb] hover:underline"
                  >
                    Use in Studio
                    <ArrowRight className="h-3 w-3" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ============================================================================
   3. MCP WORKSPACE VIEW
   ============================================================================ */

export interface McpWorkspaceViewProps {
  subView: McpSubView;
  onSubViewChange: (sub: McpSubView) => void;
}

const MCP_CAPABILITY_PILLS = [
  { label: "Ad library", icon: Layers },
  { label: "Competitor tracking", icon: Activity },
  { label: "Ad performance", icon: BarChart3 },
  { label: "Creative analysis", icon: Search },
  { label: "Image & video generation", icon: Sparkles },
  { label: "Video ads", icon: Film },
];

const MCP_ROLES = [
  "Performance Marketer",
  "Creative Strategist",
  "Brand Founder",
  "Media Buyer",
  "Agency Lead",
  "Creative Director",
  "Growth Engineer",
  "E-commerce Manager",
];

const MCP_ASSISTANTS = [
  {
    id: "claude",
    label: "Claude",
    desc: "Claude Desktop & Claude Code",
  },
  {
    id: "chatgpt",
    label: "ChatGPT",
    desc: "OpenAI Desktop & Connectors",
  },
  {
    id: "coding_agent",
    label: "Coding agent",
    desc: "Cursor, Windsurf & Antigravity",
  },
  {
    id: "other",
    label: "Something else",
    desc: "Custom JSON-RPC 2.0 client",
  },
] as const;

const MCP_GOALS = [
  {
    id: "swipe_wins",
    title: "Find winning competitor hooks",
    desc: "Query high-reach Meta ads and extract repeatable hook structures.",
  },
  {
    id: "brand_briefs",
    title: "Generate on-brand ad briefs",
    desc: "Turn Brand Memory + active swipe winners into 4-scene shoot briefs.",
  },
  {
    id: "funnel_audit",
    title: "Audit landing funnels & offers",
    desc: "Inspect Shopify sitemaps, advertorials, and bundle offer stacks.",
  },
];

const MCP_PROMPT_LIBRARY = [
  {
    id: "pr-1",
    category: "Competitor Research",
    title: "Extract Top 10 Active Hooks in My Niche",
    tools: ["search_swipe_ads", "list_tracked_shops"],
    prompt:
      "Use Flake MCP to call list_tracked_shops and search_swipe_ads for our top competitors. Rank the top 10 video ads by EU reach and active runtime, and break down each ad's 3-second verbal hook, visual pattern interrupt, and CTA.",
  },
  {
    id: "pr-2",
    category: "Funnel & Offer Audit",
    title: "Map Competitor Advertorials & Landing Funnels",
    tools: ["list_tracked_shops", "get_shop_funnels"],
    prompt:
      "Call get_shop_funnels for the top 3 highest-traffic shops from list_tracked_shops. Categorize their discovered landing pages into Advertorials, Listicles, Quizzes, and Offer Pages, and tell me which offer angle we should test next.",
  },
  {
    id: "pr-3",
    category: "Brief Generation",
    title: "Write a 4-Scene UGC Script from Brand Memory",
    tools: ["search_swipe_ads", "create_clone_brief"],
    prompt:
      "Find the highest-reach UGC video ad using search_swipe_ads, then call create_clone_brief with stylePresetId='iphone_ugc' to adapt that winning pacing to my hero product with 5 fresh hooks and 4 chronological scenes.",
  },
  {
    id: "pr-4",
    category: "Creative Strategy",
    title: "Weekly Creative Sprint Matrix (3 Angles x 2 Formats)",
    tools: ["search_swipe_ads", "create_clone_brief"],
    prompt:
      "Using Flake MCP, build a 6-ad creative sprint matrix combining 3 proven angles from search_swipe_ads across iphone_ugc and claymation_moa presets via create_clone_brief.",
  },
];

const MCP_SKILL_HUB = [
  {
    id: "sk-1",
    title: "Competitor Ad Teardown",
    badge: "Research Skill",
    tools: ["list_tracked_shops", "search_swipe_ads"],
    summary:
      "Automated teardown of a rival DTC brand's live Meta creative mix, hook distribution, and dominant formats.",
    instruction: `# Flake Skill: Competitor Ad Teardown\n1. Call list_tracked_shops to resolve the target competitor.\n2. Call search_swipe_ads with the competitor brand name.\n3. Group ads by mediaType and summarize winning hooks, active days, and landing pages.`,
  },
  {
    id: "sk-2",
    title: "Shopify Funnel & Offer Audit",
    badge: "Conversion Skill",
    tools: ["get_shop_funnels", "list_tracked_shops"],
    summary:
      "Inspects discovered advertorials, quizzes, and bundle pages to uncover high-converting AOV levers.",
    instruction: `# Flake Skill: Shopify Funnel & Offer Audit\n1. Call get_shop_funnels(brandQuery).\n2. Classify URLs by funnel type (Advertorial / Listicle / Quiz / Offer LP).\n3. Recommend 2 landing page experiments tailored to our offer.`,
  },
  {
    id: "sk-3",
    title: "Clone-to-Brief Factory",
    badge: "Production Skill",
    tools: ["search_swipe_ads", "create_clone_brief"],
    summary:
      "Turns any winning swipe reference into a 5-hook, 4-scene production brief ready for Studio.",
    instruction: `# Flake Skill: Clone-to-Brief Factory\n1. Pull top swipe winners via search_swipe_ads.\n2. Call create_clone_brief with brandName, productTitle, stylePresetId, and angle.\n3. Output shooting checklist, on-screen captions, and primary copy.`,
  },
];

interface McpProbeResult {
  ok: boolean;
  status: number;
  serverName?: string;
  version?: string;
  protocol?: string;
  tools?: Array<{ name: string; description: string }>;
  error?: string;
}

const noopSubscribe = () => () => {};

export function McpWorkspaceView({
  subView,
  onSubViewChange,
}: McpWorkspaceViewProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selectedRole, setSelectedRole] = useState<string>(MCP_ROLES[0]);
  const [selectedAssistant, setSelectedAssistant] =
    useState<(typeof MCP_ASSISTANTS)[number]["id"]>("claude");
  const [selectedGoal, setSelectedGoal] = useState<string>(MCP_GOALS[0].id);
  const origin = useSyncExternalStore(
    noopSubscribe,
    () => window.location.origin,
    () => "https://flake.studio"
  );
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const [testingMcp, setTestingMcp] = useState(false);
  const [probeResult, setProbeResult] = useState<McpProbeResult | null>(null);

  const mcpEndpoint = `${origin}/api/mcp`;

  const mcpConfigJson = useMemo(
    () =>
      JSON.stringify(
        {
          mcpServers: {
            "flake-creative-mcp": {
              url: mcpEndpoint,
              transport: "http",
              headers: {
                "Content-Type": "application/json",
              },
            },
          },
        },
        null,
        2
      ),
    [mcpEndpoint]
  );

  const copyText = async (id: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      window.setTimeout(() => {
        setCopiedId((cur) => (cur === id ? null : cur));
      }, 1800);
    } catch {
      // Clipboard API unavailable in restricted contexts
    }
  };

  const runLiveMcpTest = async () => {
    setTestingMcp(true);
    setProbeResult(null);
    try {
      const res = await fetch("/api/mcp", { method: "GET" });
      const data = (await res.json()) as {
        ok?: boolean;
        protocol?: string;
        server?: { name?: string; version?: string };
        tools?: Array<{ name: string; description: string }>;
      };
      setProbeResult({
        ok: res.ok && Boolean(data?.ok),
        status: res.status,
        serverName: data?.server?.name || "flake-creative-mcp",
        version: data?.server?.version || "1.0.0",
        protocol: data?.protocol || "Model Context Protocol (JSON-RPC 2.0)",
        tools: data?.tools || [],
      });
    } catch (err) {
      setProbeResult({
        ok: false,
        status: 0,
        error:
          err instanceof Error ? err.message : "Failed to reach /api/mcp",
      });
    } finally {
      setTestingMcp(false);
    }
  };

  return (
    <div className="animate-view-in mx-auto w-full max-w-[1160px] space-y-6 px-4 py-6 sm:px-7">
      {/* Header Section */}
      <div className="space-y-4 rounded-3xl border border-[#ECEFF5] bg-white p-6 shadow-xs sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[#DCE4FF] bg-[#EEF2FF] px-3 py-1 text-[11px] font-semibold text-[#0027eb]">
            <Terminal className="h-3.5 w-3.5" />
            Model Context Protocol · Live Endpoint
          </span>

          {/* Sub-view Nav */}
          <div className="flex items-center gap-1 rounded-full border border-[#ECEFF5] bg-[#F7F8FB] p-1">
            {(
              [
                { id: "overview", label: "Setup" },
                { id: "prompts", label: "Prompt Library" },
                { id: "skills", label: "Skill Hub" },
              ] as Array<{ id: McpSubView; label: string }>
            ).map((tab) => {
              const active = subView === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  data-no-glass="true"
                  onClick={() => onSubViewChange(tab.id)}
                  className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all ${
                    active
                      ? "bg-[#0F172A] text-white shadow-xs"
                      : "text-[#475569] hover:text-[#0F172A]"
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="max-w-2xl space-y-2">
          <h1 className="font-geist-serif text-[32px] font-normal leading-tight tracking-tight text-[#0F172A]">
            Set up Flake MCP
          </h1>
          <p className="text-sm leading-relaxed text-[#475569]">
            Bring your Flake ad library, brand memory, and analytics into the AI assistant you
            already use.
          </p>
        </div>

        {/* 6 Capability Pills */}
        <div className="flex flex-wrap gap-2 pt-1">
          {MCP_CAPABILITY_PILLS.map((cap) => {
            const Icon = cap.icon;
            return (
              <span
                key={cap.label}
                data-no-glass="true"
                className="inline-flex items-center gap-1.5 rounded-full border border-[#E6E9F0] bg-[#FAFBFD] px-3 py-1.5 text-xs font-medium text-[#0F172A]"
              >
                <Icon className="h-3.5 w-3.5 text-[#0027eb]" />
                {cap.label}
              </span>
            );
          })}
        </div>
      </div>

      {/* OVERVIEW: 3-STEP HORIZONTAL STEPPER */}
      {subView === "overview" && (
        <div className="space-y-6">
          {/* Stepper Header */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {(
              [
                { num: 1, label: "About you" },
                { num: 2, label: "Connect" },
                { num: 3, label: "Try it" },
              ] as const
            ).map((s) => {
              const active = step === s.num;
              const completed = step > s.num;
              return (
                <button
                  key={s.num}
                  type="button"
                  data-no-glass="true"
                  onClick={() => setStep(s.num)}
                  className={`flex items-center gap-3 rounded-2xl border px-4 py-3.5 text-left transition-all ${
                    active
                      ? "border-[#0027eb] bg-[#EEF2FF]/70 shadow-xs"
                      : completed
                        ? "border-[#DCE4FF] bg-white"
                        : "border-[#ECEFF5] bg-white hover:border-[#DCE4FF]"
                  }`}
                >
                  <span
                    className={`font-mono-num flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                      active
                        ? "bg-[#0027eb] text-white"
                        : completed
                          ? "bg-[#0F172A] text-white"
                          : "bg-[#F3F5F9] text-[#64748B]"
                    }`}
                  >
                    {completed ? <Check className="h-3.5 w-3.5" /> : s.num}
                  </span>
                  <div>
                    <p className="text-[11px] font-medium text-[#64748B]">
                      Step {s.num}
                    </p>
                    <p className="text-sm font-bold text-[#0F172A]">
                      {s.num} {s.label}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>

          {/* STEP 1: ABOUT YOU */}
          {step === 1 && (
            <div className="space-y-7 rounded-3xl border border-[#ECEFF5] bg-white p-6 shadow-xs sm:p-8">
              {/* 01 Role */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="font-mono-num rounded-md bg-[#EEF2FF] px-2 py-0.5 text-[11px] font-bold text-[#0027eb]">
                    01
                  </span>
                  <h2 className="font-display text-sm font-bold text-[#0F172A]">
                    What best describes your role?
                  </h2>
                </div>
                <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                  {MCP_ROLES.map((role) => {
                    const selected = selectedRole === role;
                    return (
                      <button
                        key={role}
                        type="button"
                        data-no-glass="true"
                        onClick={() => setSelectedRole(role)}
                        className={`rounded-2xl border px-3.5 py-3 text-left text-xs font-semibold transition-all ${
                          selected
                            ? "border-[#0027eb] bg-[#EEF2FF] text-[#0027eb]"
                            : "border-[#E6E9F0] bg-[#FAFBFD] text-[#0F172A] hover:border-[#DCE4FF] hover:bg-white"
                        }`}
                      >
                        {role}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 02 AI Assistant */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="font-mono-num rounded-md bg-[#EEF2FF] px-2 py-0.5 text-[11px] font-bold text-[#0027eb]">
                    02
                  </span>
                  <h2 className="font-display text-sm font-bold text-[#0F172A]">
                    Which AI assistant do you use most?
                  </h2>
                </div>
                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
                  {MCP_ASSISTANTS.map((assistant) => {
                    const selected = selectedAssistant === assistant.id;
                    return (
                      <button
                        key={assistant.id}
                        type="button"
                        data-no-glass="true"
                        onClick={() => setSelectedAssistant(assistant.id)}
                        className={`rounded-2xl border p-3.5 text-left transition-all ${
                          selected
                            ? "border-[#0027eb] bg-[#EEF2FF]"
                            : "border-[#E6E9F0] bg-[#FAFBFD] hover:border-[#DCE4FF] hover:bg-white"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span
                            className={`text-xs font-bold ${
                              selected ? "text-[#0027eb]" : "text-[#0F172A]"
                            }`}
                          >
                            {assistant.label}
                          </span>
                          <Bot
                            className={`h-4 w-4 ${
                              selected ? "text-[#0027eb]" : "text-[#94A3B8]"
                            }`}
                          />
                        </div>
                        <p className="mt-1 text-[11px] text-[#64748B]">
                          {assistant.desc}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 03 First Goal */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="font-mono-num rounded-md bg-[#EEF2FF] px-2 py-0.5 text-[11px] font-bold text-[#0027eb]">
                    03
                  </span>
                  <h2 className="font-display text-sm font-bold text-[#0F172A]">
                    What do you want to do first?
                  </h2>
                </div>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                  {MCP_GOALS.map((goal) => {
                    const selected = selectedGoal === goal.id;
                    return (
                      <button
                        key={goal.id}
                        type="button"
                        data-no-glass="true"
                        onClick={() => setSelectedGoal(goal.id)}
                        className={`rounded-2xl border p-4 text-left transition-all ${
                          selected
                            ? "border-[#0027eb] bg-[#EEF2FF]"
                            : "border-[#E6E9F0] bg-[#FAFBFD] hover:border-[#DCE4FF] hover:bg-white"
                        }`}
                      >
                        <p
                          className={`text-xs font-bold ${
                            selected ? "text-[#0027eb]" : "text-[#0F172A]"
                          }`}
                        >
                          {goal.title}
                        </p>
                        <p className="mt-1 text-[11px] leading-relaxed text-[#64748B]">
                          {goal.desc}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-between border-t border-[#ECEFF5] pt-5">
                <p className="text-xs text-[#64748B]">
                  Tailored for{" "}
                  <span className="font-semibold text-[#0F172A]">
                    {selectedRole}
                  </span>{" "}
                  on{" "}
                  <span className="font-semibold text-[#0F172A]">
                    {
                      MCP_ASSISTANTS.find((a) => a.id === selectedAssistant)
                        ?.label
                    }
                  </span>
                </p>
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="adtrack-btn-primary inline-flex items-center gap-2 rounded-full px-6 py-2.5 text-xs font-semibold text-white"
                >
                  Continue
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: CONNECT */}
          {step === 2 && (
            <div className="space-y-6 rounded-3xl border border-[#ECEFF5] bg-white p-6 shadow-xs sm:p-8">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h2 className="font-display text-lg font-bold text-[#0F172A]">
                    Connect{" "}
                    {
                      MCP_ASSISTANTS.find((a) => a.id === selectedAssistant)
                        ?.label
                    }{" "}
                    to Flake MCP
                  </h2>
                  <p className="mt-1 text-xs text-[#64748B]">
                    Paste this server configuration into your MCP settings file, then verify live
                    connectivity below.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    data-no-glass="true"
                    onClick={() => void runLiveMcpTest()}
                    disabled={testingMcp}
                    className="inline-flex items-center gap-1.5 rounded-full bg-[#0F172A] px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#1E293B] disabled:opacity-60"
                  >
                    {testingMcp ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Activity className="h-3.5 w-3.5 text-[#3B66FF]" />
                    )}
                    Test MCP Connection
                  </button>
                </div>
              </div>

              {/* Endpoint Pill */}
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-[#DCE4FF] bg-[#EEF2FF]/50 px-4 py-3">
                <div className="flex min-w-0 items-center gap-2.5">
                  <Link2 className="h-4 w-4 shrink-0 text-[#0027eb]" />
                  <code className="font-mono-num truncate text-xs font-semibold text-[#0F172A]">
                    {mcpEndpoint}
                  </code>
                </div>
                <button
                  type="button"
                  data-no-glass="true"
                  onClick={() => void copyText("endpoint", mcpEndpoint)}
                  className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1 text-[11px] font-semibold text-[#0027eb] shadow-xs"
                >
                  {copiedId === "endpoint" ? (
                    <>
                      <Check className="h-3 w-3" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="h-3 w-3" />
                      Copy URL
                    </>
                  )}
                </button>
              </div>

              {/* Copyable JSON Config */}
              <div className="overflow-hidden rounded-2xl border border-[#0F172A] bg-[#050811] text-white">
                <div className="flex items-center justify-between border-b border-white/10 px-4 py-2.5">
                  <div className="flex items-center gap-2 text-xs font-medium text-white/75">
                    <Code2 className="h-3.5 w-3.5 text-[#3B66FF]" />
                    <span>mcp_config.json</span>
                  </div>
                  <button
                    type="button"
                    data-no-glass="true"
                    onClick={() => void copyText("config-json", mcpConfigJson)}
                    className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-[11px] font-semibold text-white transition-colors hover:bg-white/20"
                  >
                    {copiedId === "config-json" ? (
                      <>
                        <Check className="h-3 w-3 text-[#4ADE80]" />
                        Copied config
                      </>
                    ) : (
                      <>
                        <Copy className="h-3 w-3" />
                        Copy JSON
                      </>
                    )}
                  </button>
                </div>
                <pre className="workspace-scroll overflow-x-auto p-4 font-mono text-xs leading-relaxed text-[#E2E8F0]">
                  {mcpConfigJson}
                </pre>
              </div>

              {/* Live Test MCP Connection Result */}
              {probeResult && (
                <div
                  className={`rounded-2xl border p-4 ${
                    probeResult.ok
                      ? "border-[#BBF7D0] bg-[#ECFDF3]"
                      : "border-[#FDE68A] bg-[#FFFBEB]"
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span
                        className={`h-2.5 w-2.5 rounded-full ${
                          probeResult.ok ? "bg-[#16A34A]" : "bg-[#D97706]"
                        }`}
                      />
                      <span className="text-xs font-bold text-[#0F172A]">
                        {probeResult.ok
                          ? `Connected · ${probeResult.serverName} v${probeResult.version}`
                          : `Connection check returned HTTP ${probeResult.status}`}
                      </span>
                    </div>
                    <span className="font-mono-num rounded-full bg-white px-2.5 py-0.5 text-[11px] font-semibold text-[#0F172A]">
                      HTTP {probeResult.status}
                    </span>
                  </div>

                  {probeResult.error ? (
                    <p className="mt-2 text-xs text-[#92400E]">
                      {probeResult.error}
                    </p>
                  ) : (
                    <div className="mt-3 space-y-2">
                      <p className="text-[11px] font-medium text-[#475569]">
                        Protocol: {probeResult.protocol} ·{" "}
                        {probeResult.tools?.length || 0} tools discovered
                      </p>
                      {probeResult.tools && probeResult.tools.length > 0 && (
                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                          {probeResult.tools.map((t) => (
                            <div
                              key={t.name}
                              className="rounded-xl border border-[#E6E9F0] bg-white p-2.5"
                            >
                              <code className="text-[11px] font-bold text-[#0027eb]">
                                {t.name}
                              </code>
                              <p className="mt-0.5 text-[11px] text-[#64748B]">
                                {t.description}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              <div className="flex items-center justify-between border-t border-[#ECEFF5] pt-5">
                <button
                  type="button"
                  data-no-glass="true"
                  onClick={() => setStep(1)}
                  className="rounded-full border border-[#E6E9F0] bg-white px-4 py-2 text-xs font-semibold text-[#475569] hover:text-[#0F172A]"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className="adtrack-btn-primary inline-flex items-center gap-2 rounded-full px-6 py-2.5 text-xs font-semibold text-white"
                >
                  Continue to Try it
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: TRY IT */}
          {step === 3 && (
            <div className="space-y-5 rounded-3xl border border-[#ECEFF5] bg-white p-6 shadow-xs sm:p-8">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="font-display text-lg font-bold text-[#0F172A]">
                    Try your first MCP prompt
                  </h2>
                  <p className="mt-1 text-xs text-[#64748B]">
                    Copy any starter prompt below or browse the full Prompt Library and Skill Hub.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    data-no-glass="true"
                    onClick={() => onSubViewChange("prompts")}
                    className="rounded-full border border-[#DCE4FF] bg-[#EEF2FF] px-3.5 py-1.5 text-xs font-semibold text-[#0027eb]"
                  >
                    Open Prompt Library
                  </button>
                  <button
                    type="button"
                    data-no-glass="true"
                    onClick={() => onSubViewChange("skills")}
                    className="rounded-full border border-[#E6E9F0] bg-white px-3.5 py-1.5 text-xs font-semibold text-[#0F172A]"
                  >
                    Open Skill Hub
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {MCP_PROMPT_LIBRARY.slice(0, 2).map((item) => (
                  <div
                    key={item.id}
                    className="flex flex-col justify-between gap-3 rounded-2xl border border-[#ECEFF5] bg-[#FAFBFD] p-4"
                  >
                    <div className="space-y-2">
                      <span className="inline-flex rounded-full bg-[#EEF2FF] px-2.5 py-0.5 text-[10.5px] font-semibold text-[#0027eb]">
                        {item.category}
                      </span>
                      <h3 className="font-display text-sm font-bold text-[#0F172A]">
                        {item.title}
                      </h3>
                      <p className="rounded-xl border border-[#E6E9F0] bg-white p-3 text-xs leading-relaxed text-[#334155]">
                        {item.prompt}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => void copyText(item.id, item.prompt)}
                      className="adtrack-btn-primary inline-flex w-full items-center justify-center gap-1.5 rounded-full px-4 py-2 text-xs font-semibold text-white"
                    >
                      {copiedId === item.id ? (
                        <>
                          <Check className="h-3.5 w-3.5" />
                          Copied to clipboard
                        </>
                      ) : (
                        <>
                          <Copy className="h-3.5 w-3.5" />
                          Copy prompt
                        </>
                      )}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* PROMPTS SUB-VIEW */}
      {subView === "prompts" && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {MCP_PROMPT_LIBRARY.map((item) => (
            <div
              key={item.id}
              className="flex flex-col justify-between gap-4 rounded-3xl border border-[#ECEFF5] bg-white p-5 shadow-xs transition-all hover:border-[#DCE4FF]"
            >
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="rounded-full bg-[#EEF2FF] px-2.5 py-0.5 text-[11px] font-semibold text-[#0027eb]">
                    {item.category}
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {item.tools.map((tool) => (
                      <code
                        key={tool}
                        className="rounded-md bg-[#F3F5F9] px-2 py-0.5 text-[10.5px] font-medium text-[#334155]"
                      >
                        {tool}
                      </code>
                    ))}
                  </div>
                </div>
                <h2 className="font-display text-base font-bold text-[#0F172A]">
                  {item.title}
                </h2>
                <p className="rounded-2xl border border-[#ECEFF5] bg-[#FAFBFD] p-3.5 text-xs leading-relaxed text-[#334155]">
                  {item.prompt}
                </p>
              </div>

              <button
                type="button"
                onClick={() => void copyText(item.id, item.prompt)}
                className="adtrack-btn-primary inline-flex items-center justify-center gap-1.5 rounded-full px-4 py-2.5 text-xs font-semibold text-white"
              >
                {copiedId === item.id ? (
                  <>
                    <Check className="h-3.5 w-3.5" />
                    Copied prompt
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" />
                    Copy prompt
                  </>
                )}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* SKILLS SUB-VIEW */}
      {subView === "skills" && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {MCP_SKILL_HUB.map((skill) => (
            <div
              key={skill.id}
              className="flex flex-col justify-between gap-4 rounded-3xl border border-[#ECEFF5] bg-white p-5 shadow-xs transition-all hover:border-[#DCE4FF]"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-[#EEF2FF] px-2.5 py-0.5 text-[11px] font-semibold text-[#0027eb]">
                    <Tag className="h-3 w-3" />
                    {skill.badge}
                  </span>
                </div>
                <h2 className="font-display text-base font-bold text-[#0F172A]">
                  {skill.title}
                </h2>
                <p className="text-xs leading-relaxed text-[#475569]">
                  {skill.summary}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {skill.tools.map((t) => (
                    <code
                      key={t}
                      className="rounded-md border border-[#E6E9F0] bg-[#FAFBFD] px-2 py-0.5 text-[10.5px] font-semibold text-[#0F172A]"
                    >
                      {t}
                    </code>
                  ))}
                </div>
                <pre className="overflow-x-auto rounded-2xl border border-[#E6E9F0] bg-[#050811] p-3 font-mono text-[11px] leading-relaxed text-[#E2E8F0]">
                  {skill.instruction}
                </pre>
              </div>

              <button
                type="button"
                onClick={() => void copyText(skill.id, skill.instruction)}
                className="adtrack-btn-primary inline-flex items-center justify-center gap-1.5 rounded-full px-4 py-2.5 text-xs font-semibold text-white"
              >
                {copiedId === skill.id ? (
                  <>
                    <Check className="h-3.5 w-3.5" />
                    Copied skill
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" />
                    Copy skill to clipboard
                  </>
                )}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
