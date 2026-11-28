"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  Activity,
  ArrowRight,
  ArrowUpDown,
  ArrowUpRight,
  BarChart3,
  Briefcase,
  Building2,
  Check,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Code2,
  Copy,
  Crown,
  ExternalLink,
  Eye,
  FileText,
  Film,
  Filter,
  FlaskConical,
  Globe,
  Image as ImageIcon,
  Layers,
  LayoutGrid,
  Lightbulb,
  LineChart,
  Link2,
  Loader2,
  Megaphone,
  MoreHorizontal,
  Package,
  Pencil,
  Plug,
  Plus,
  RefreshCw,
  Rocket,
  Search,
  ShieldCheck,
  Sparkles,
  Terminal,
  Trash2,
  Type,
  Upload,
  Users,
  Video,
  Wand2,
  X,
  Zap,
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
   OFFICIAL THIRD-PARTY BRAND LOGOS (FULL COLOR, NON-LUCIDE)
   ============================================================================ */

function GoogleDriveColorIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path d="M8.5 3.5h7l6.5 11.2h-7L8.5 3.5z" fill="#FFC107" />
      <path d="M2 14.7L8.5 3.5l3.5 6.1-6.5 11.2L2 14.7z" fill="#0F9D58" />
      <path d="M5.5 20.8l3.5-6.1h13l-3.5 6.1h-13z" fill="#4285F4" />
    </svg>
  );
}

function ClaudeBrandIcon({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <g stroke="#D97757" strokeWidth="2.1" strokeLinecap="round">
        <line x1="12" y1="3" x2="12" y2="21" />
        <line x1="3" y1="12" x2="21" y2="12" />
        <line x1="5.6" y1="5.6" x2="18.4" y2="18.4" />
        <line x1="18.4" y1="5.6" x2="5.6" y2="18.4" />
        <line x1="8.2" y1="3.8" x2="15.8" y2="20.2" strokeWidth="1.5" />
        <line x1="20.2" y1="8.2" x2="3.8" y2="15.8" strokeWidth="1.5" />
      </g>
    </svg>
  );
}

function ChatGptBrandIcon({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <rect x="2" y="2" width="20" height="20" rx="5.5" fill="#74AA9C" />
      <circle cx="12" cy="12" r="4.5" stroke="#FFFFFF" strokeWidth="1.6" />
      <path
        d="M12 6.5v11M7.2 9.25l9.6 5.5M16.8 9.25l-9.6 5.5"
        stroke="#FFFFFF"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

function CursorBrandIcon({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="M12 2.5L20.5 7.4v9.2L12 21.5 3.5 16.6V7.4L12 2.5z"
        fill="#0F172A"
      />
      <path d="M12 2.5L20.5 7.4 12 12.2 3.5 7.4 12 2.5z" fill="#334155" />
      <path d="M12 12.2l8.5-4.8v9.2L12 21.5v-9.3z" fill="#1E293B" />
      <path d="M12 6.5l5 5.5-5 3.2V6.5z" fill="#FFFFFF" />
    </svg>
  );
}

/* ============================================================================
   SHARED SMALL HELPERS
   ============================================================================ */

function extractBareDomain(websiteUrl?: string | null): string | null {
  if (typeof websiteUrl !== "string") return null;
  const trimmed = websiteUrl.trim();
  if (!trimmed) return null;
  try {
    const withProtocol = /^https?:\/\//i.test(trimmed)
      ? trimmed
      : `https://${trimmed}`;
    const host = new URL(withProtocol).hostname.replace(/^www\./i, "");
    return host.includes(".") ? host : null;
  } catch {
    const stripped = trimmed
      .replace(/^https?:\/\//i, "")
      .replace(/^www\./i, "")
      .split(/[/?#]/)[0];
    return stripped && stripped.includes(".") ? stripped : null;
  }
}

function BrandAvatar({
  name,
  logoUrl,
  websiteUrl,
  initials,
  sizeClass = "h-10 w-10",
  textClass = "text-[11px]",
}: {
  name: string;
  logoUrl?: string | null;
  websiteUrl?: string | null;
  initials?: string | null;
  sizeClass?: string;
  textClass?: string;
}) {
  const bareDomain = extractBareDomain(websiteUrl);
  const faviconUrl = bareDomain
    ? `https://www.google.com/s2/favicons?domain=${encodeURIComponent(bareDomain)}&sz=128`
    : null;

  const sources = [
    typeof logoUrl === "string" && logoUrl.trim() ? logoUrl.trim() : null,
    faviconUrl,
  ].filter((u): u is string => Boolean(u));

  const sourceKey = sources.join("|");
  const [failedState, setFailedState] = useState<{
    key: string;
    index: number;
  }>({ key: sourceKey, index: 0 });

  const activeIndex = failedState.key === sourceKey ? failedState.index : 0;
  const currentSrc = sources[activeIndex] ?? null;

  const fallbackInitials =
    (typeof initials === "string" && initials.trim()) ||
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0])
      .join("")
      .toUpperCase() ||
    name.slice(0, 2).toUpperCase();

  if (!currentSrc) {
    return (
      <div
        className={`flex shrink-0 items-center justify-center rounded-full bg-[#050811] text-white ${sizeClass}`}
      >
        <span className={`font-display font-bold tracking-tight ${textClass}`}>
          {fallbackInitials}
        </span>
      </div>
    );
  }

  return (
    <div
      className={`flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-[#ebebf3] bg-white p-1 ${sizeClass}`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={currentSrc}
        alt={name}
        onError={() =>
          setFailedState({ key: sourceKey, index: activeIndex + 1 })
        }
        className="h-full w-full rounded-full object-contain"
      />
    </div>
  );
}

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
      className="inline-flex items-center gap-2 rounded-full border border-[#C7D2FE] bg-[#EEF2FF] px-3 py-1 text-[12px] font-semibold text-[#0027eb]"
    >
      <div className="relative flex h-6 w-6 items-center justify-center">
        <svg className="h-6 w-6 -rotate-90" viewBox="0 0 28 28">
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
        <span className="font-mono-num absolute text-[9px] font-bold text-[#0027eb]">
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
      ? "border border-[#C7D2FE] bg-[#EEF2FF] text-[#0027eb]"
      : tone === "amber"
        ? "border border-[#FDE68A] bg-[#FFFBEB] text-[#92400E]"
        : "border border-[#ebebf3] bg-[#f5f5fa] text-[#0F172A]";

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {items.length === 0 && !editing && (
        <span className="text-[12.5px] text-[#94A3B8]">None added yet</span>
      )}
      {items.map((item, idx) => (
        <span
          key={`${item}-${idx}`}
          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-medium ${pillClass}`}
        >
          <span>{item}</span>
          {editing && (
            <button
              type="button"
              data-no-glass="true"
              onClick={() => onChange(items.filter((_, i) => i !== idx))}
              aria-label={`Remove ${item}`}
              className="rounded-full p-0.5 text-[#475569] opacity-75 transition-opacity hover:opacity-100"
            >
              <X className="h-3 w-3 text-[#475569]" />
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
            className="w-40 rounded-full border border-[#d6d6e0] bg-white px-3 py-1 text-[12px] text-[#0F172A] outline-none focus:border-[#0027eb]"
          />
          <button
            type="button"
            data-no-glass="true"
            onClick={addChip}
            className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-[#d6d6e0] bg-white text-[#0F172A] hover:border-[#0027eb]"
          >
            <Plus className="h-3 w-3 text-[#0F172A]" />
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
  const [limitModalOpen, setLimitModalOpen] = useState(false);

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
    const tracked = brands.filter(
      (b) => b.is_tracked && b.id !== "custom-media"
    );
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
     LIST VIEW (1:1 ATRIA BRANDS PAGE + CONTEXT FEATURE BANNER + LIMIT MODAL)
     -------------------------------------------------------------------------- */
  if (subView === "list") {
    const profileCount = 1;

    return (
      <div className="min-h-full bg-[#f5f5fa]">
        {/* Sticky White Page Header */}
        <div className="sticky top-0 z-10 border-b border-[#ebebf3] bg-white px-6 py-4">
          <h1 className="font-display text-[20px] font-bold tracking-tight text-[#0F172A]">
            Brands ({profileCount})
          </h1>
        </div>

        <div className="space-y-4 p-4">
          {/* Context Feature Banner Card */}
          <section className="grid grid-cols-1 items-center gap-6 rounded-[12px] border border-[#ebebf3] bg-white p-6 lg:grid-cols-[310px_1fr]">
            <div>
              <div className="flex items-start gap-2.5">
                <SnowMark className="mt-0.5 h-6 w-6 shrink-0 text-[#0027eb]" />
                <h2 className="font-display text-[17px] font-bold leading-snug tracking-tight text-[#0F172A]">
                  Give Snow the context it works from
                </h2>
              </div>
              <p className="mt-2.5 text-[13px] leading-relaxed text-[#475569]">
                Snow can generate ad creatives right now — but without a brand,
                Snow is working in the dark. A brand profile tells Snow who you
                are, so every output actually sounds like you.
              </p>
              <button
                type="button"
                data-no-glass="true"
                onClick={() => setLimitModalOpen(true)}
                className="mt-4 inline-flex h-9 items-center gap-1.5 rounded-[8px] bg-[#0027eb] px-4 text-[13.5px] font-semibold text-white transition-colors hover:bg-[#001fc2]"
              >
                <Plus className="h-4 w-4 text-white" />
                Create a brand
              </button>
            </div>

            {/* 3 Soft Slate Feature Tiles (Strict Monochrome Icons) */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-[10px] bg-[#f5f5fa] p-4">
                <Wand2 className="mb-2.5 h-4 w-4 text-[#475569]" />
                <h3 className="text-[13.5px] font-bold text-[#0F172A]">
                  On-brand output
                </h3>
                <p className="mt-1 text-[12.5px] leading-relaxed text-[#475569]">
                  Snow writes copy and generates creatives that match your
                  voice, tone, and visual style.
                </p>
              </div>
              <div className="rounded-[10px] bg-[#f5f5fa] p-4">
                <Users className="mb-2.5 h-4 w-4 text-[#475569]" />
                <h3 className="text-[13.5px] font-bold text-[#0F172A]">
                  Audience precision
                </h3>
                <p className="mt-1 text-[12.5px] leading-relaxed text-[#475569]">
                  Snow targets the right scenarios and personas instead of
                  guessing who you&apos;re speaking to.
                </p>
              </div>
              <div className="rounded-[10px] bg-[#f5f5fa] p-4">
                <Eye className="mb-2.5 h-4 w-4 text-[#475569]" />
                <h3 className="text-[13.5px] font-bold text-[#0F172A]">
                  Competitor awareness
                </h3>
                <p className="mt-1 text-[12.5px] leading-relaxed text-[#475569]">
                  Snow monitors your competitors and factors their moves into
                  your ad strategy.
                </p>
              </div>
            </div>
          </section>

          {/* Brands Table Card (Exact Atria 6-Column Black Header Layout) */}
          <section className="overflow-hidden rounded-[12px] border border-[#ebebf3] bg-white">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[740px] border-collapse text-left">
                <thead>
                  <tr className="border-b border-[#ebebf3] bg-white text-[13px] font-semibold text-[#0F172A]">
                    <th className="px-5 py-3.5">Brand</th>
                    <th className="px-4 py-3.5">Ad accounts</th>
                    <th className="px-4 py-3.5">Scenarios</th>
                    <th className="px-4 py-3.5">Personas</th>
                    <th className="px-4 py-3.5">Competitors</th>
                    <th className="px-5 py-3.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#ebebf3] text-[13.5px]">
                  {/* Primary Brand Profile Row */}
                  <tr className="transition-colors hover:bg-[#f5f5fa]/50">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <BrandAvatar
                          name={activeMemory.brandName}
                          logoUrl={activeMemory.logoUrl}
                          websiteUrl={activeMemory.websiteUrl || activeMemory.domain}
                          sizeClass="h-10 w-10"
                          textClass="text-[11px]"
                        />
                        <div className="min-w-0">
                          <p className="font-semibold text-[#0F172A]">
                            {activeMemory.brandName}
                          </p>
                          <p className="truncate text-[12.5px] text-[#64748B]">
                            {activeMemory.category} · {activeMemory.domain}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="font-mono-num px-4 py-4 text-[13px] text-[#64748B]">
                      {brandMemory ? "1" : "—"}
                    </td>
                    <td className="font-mono-num px-4 py-4 text-[13px] font-medium text-[#0F172A]">
                      {allScenarios.length}
                    </td>
                    <td className="font-mono-num px-4 py-4 text-[13px] font-medium text-[#0F172A]">
                      {ATRIA_BRAND_PERSONAS.length}
                    </td>
                    <td className="font-mono-num px-4 py-4 text-[13px] text-[#64748B]">
                      {trackedCompetitors.length > 0
                        ? trackedCompetitors.length
                        : "—"}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <button
                        type="button"
                        data-no-glass="true"
                        onClick={() => onSubViewChange("overview")}
                        className="inline-flex h-8 items-center rounded-[6px] border border-[#d6d6e0] bg-white px-3 text-[12.5px] font-medium text-[#0F172A] transition-colors hover:border-[#0027eb] hover:text-[#0027eb]"
                      >
                        View details
                      </button>
                    </td>
                  </tr>

                  {/* Tracked Competitor Brands (Compact Atria Rows) */}
                  {trackedCompetitors.slice(0, 6).map((brand) => {
                    const liveCount =
                      brand.active_ads_count ?? adCountByBrand.get(brand.id) ?? 0;
                    return (
                      <tr
                        key={brand.id}
                        className="transition-colors hover:bg-[#f5f5fa]/50"
                      >
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            <BrandAvatar
                              name={brand.name}
                              logoUrl={brand.logo_url}
                              websiteUrl={brand.website_url}
                              initials={brand.avatar_initials}
                              sizeClass="h-10 w-10"
                              textClass="text-[11px]"
                            />
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-[#0F172A]">
                                  {brand.name}
                                </span>
                                <span className="rounded-[4px] bg-[#f5f5fa] px-1.5 py-0.5 text-[10.5px] font-medium text-[#64748B]">
                                  Tracked
                                </span>
                              </div>
                              <p className="truncate text-[12px] text-[#64748B]">
                                {brand.category}
                                {typeof brand.website_url === "string" &&
                                brand.website_url.trim()
                                  ? ` · ${brand.website_url.replace(/^https?:\/\//, "")}`
                                  : ""}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="font-mono-num px-4 py-3.5 text-[12.5px] text-[#64748B]">
                          {liveCount > 0 ? `${liveCount} ads` : "—"}
                        </td>
                        <td className="font-mono-num px-4 py-3.5 text-[13px] text-[#64748B]">
                          3
                        </td>
                        <td className="font-mono-num px-4 py-3.5 text-[13px] text-[#64748B]">
                          3
                        </td>
                        <td className="font-mono-num px-4 py-3.5 text-[13px] text-[#64748B]">
                          —
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <button
                            type="button"
                            data-no-glass="true"
                            onClick={() => onOpenCompetitorBrand(brand.id)}
                            className="inline-flex h-8 items-center rounded-[6px] border border-[#d6d6e0] bg-white px-3 text-[12.5px] font-medium text-[#0F172A] transition-colors hover:border-[#0027eb] hover:text-[#0027eb]"
                          >
                            View details
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        {/* PROFILE LIMIT MODAL (1:1 ATRIA STEP 69 REPLICA) */}
        {limitModalOpen &&
          typeof document !== "undefined" &&
          createPortal(
            <div
              className="fixed inset-0 z-[95] flex items-center justify-center bg-[#050811]/55 p-4"
              onClick={() => setLimitModalOpen(false)}
            >
              <div
                className="w-full max-w-[409px] rounded-[12px] border border-[#ebebf3] bg-white p-6 shadow-[0_8px_28px_rgba(15,23,42,0.16)]"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#F59E0B] text-[13px] font-bold text-white">
                    !
                  </span>
                  <div className="min-w-0 flex-1">
                    <h2 className="font-display text-[15.5px] font-bold text-[#0F172A]">
                      You&apos;ve reached brand profile limit
                    </h2>
                    <p className="mt-2 text-[13.5px] leading-relaxed text-[#475569]">
                      Up to 1 brand profile can be created in your workspace.
                      You can upgrade the plan to expand the limit.
                    </p>
                  </div>
                </div>

                <div className="mt-6 flex items-center justify-end gap-2.5">
                  <button
                    type="button"
                    data-no-glass="true"
                    onClick={() => setLimitModalOpen(false)}
                    className="h-8 rounded-[8px] border border-[#d6d6e0] bg-white px-3.5 text-[13px] font-medium text-[#0F172A] transition-colors hover:border-[#0F172A]/40"
                  >
                    Got it
                  </button>
                  <button
                    type="button"
                    data-no-glass="true"
                    onClick={() => {
                      setLimitModalOpen(false);
                      onOpenBrandScanner();
                    }}
                    className="h-8 rounded-[8px] bg-[#0027eb] px-4 text-[13px] font-semibold text-white transition-colors hover:bg-[#001fc2]"
                  >
                    Upgrade plan
                  </button>
                </div>
              </div>
            </div>,
            document.body
          )}
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
        className="flex flex-wrap items-center gap-1.5 text-[12.5px] font-medium text-[#64748B]"
      >
        <button
          type="button"
          data-no-glass="true"
          onClick={() => onSubViewChange("list")}
          className="transition-colors hover:text-[#0F172A]"
        >
          Brands
        </button>
        <ChevronRight className="h-3.5 w-3.5 text-[#94A3B8]" />
        <button
          type="button"
          data-no-glass="true"
          onClick={() => onSubViewChange("overview")}
          className="transition-colors hover:text-[#0F172A]"
        >
          {activeMemory.brandName}
        </button>
        <ChevronRight className="h-3.5 w-3.5 text-[#94A3B8]" />
        <span className="font-semibold text-[#0F172A]">
          {subSectionLabel[subView]}
        </span>
      </nav>

      {/* Brand Identity Bar */}
      <div className="flex flex-col justify-between gap-4 rounded-[12px] border border-[#ebebf3] bg-white p-5 sm:flex-row sm:items-center sm:px-6">
        <div className="flex min-w-0 items-center gap-4">
          <BrandAvatar
            name={activeMemory.brandName}
            logoUrl={activeMemory.logoUrl}
            websiteUrl={activeMemory.websiteUrl || activeMemory.domain}
            sizeClass="h-14 w-14"
            textClass="text-base"
          />
          <div className="min-w-0 space-y-1">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="font-display truncate text-[20px] font-bold tracking-tight text-[#0F172A]">
                {activeMemory.brandName}
              </h1>
              <BrandContextRing score={85} />
              {savedNotice && (
                <span className="inline-flex items-center gap-1 rounded-full bg-[#ECFDF3] px-2.5 py-0.5 text-[11px] font-semibold text-[#15803D]">
                  <Check className="h-3 w-3 text-[#475569]" />
                  Saved
                </span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2.5 text-[12.5px] text-[#64748B]">
              <a
                href={activeMemory.websiteUrl}
                target="_blank"
                rel="noreferrer"
                className="font-mono-num inline-flex items-center gap-1 hover:text-[#0027eb]"
              >
                <Globe className="h-3.5 w-3.5 text-[#64748B]" />
                {activeMemory.domain}
                <ExternalLink className="h-3 w-3 text-[#94A3B8]" />
              </a>
              <span>·</span>
              <span>{activeMemory.category}</span>
            </div>
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <button
            type="button"
            data-no-glass="true"
            onClick={onOpenBrandScanner}
            className="inline-flex h-8 items-center gap-1.5 rounded-[8px] border border-[#d6d6e0] bg-white px-3.5 text-[12.5px] font-medium text-[#0F172A] transition-colors hover:border-[#0027eb]"
          >
            <RefreshCw className="h-3.5 w-3.5 text-[#475569]" />
            Rescan URL
          </button>
          <button
            type="button"
            data-no-glass="true"
            onClick={() => {
              onSubViewChange("overview");
              setOverviewTab("profile");
              setIsEditingProfile((v) => !v);
            }}
            className="inline-flex h-8 items-center gap-1.5 rounded-[8px] bg-[#0027eb] px-3.5 text-[12.5px] font-semibold text-white transition-colors hover:bg-[#001fc2]"
          >
            <Pencil className="h-3.5 w-3.5 text-white" />
            {isEditingProfile && subView === "overview"
              ? "Done editing"
              : "Edit profile"}
          </button>
        </div>
      </div>

      {/* Sub-view Nav Pills */}
      <div className="flex flex-wrap items-center gap-1 rounded-[10px] border border-[#ebebf3] bg-white p-1">
        {(
          [
            { id: "overview", label: "Overview" },
            { id: "audience", label: "Audience" },
            {
              id: "products",
              label: `Products (${activeMemory.products.length})`,
            },
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
              className={`rounded-[8px] px-3.5 py-1.5 text-[12.5px] font-semibold transition-colors ${
                active
                  ? "bg-[#0F172A] text-white"
                  : "text-[#475569] hover:bg-[#f5f5fa] hover:text-[#0F172A]"
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
      <div className="min-h-full bg-[#f5f5fa]">
        <div className="mx-auto w-full max-w-[1240px] space-y-5 px-6 py-6">
          {renderDetailHeader()}

          {/* 5 Summary Stat Cards */}
          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-5">
            <div className="rounded-[12px] border border-[#ebebf3] bg-white p-4">
              <div className="flex items-center justify-between text-[12px] font-medium text-[#64748B]">
                <span>Ad accounts</span>
                <Building2 className="h-3.5 w-3.5 text-[#64748B]" />
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="font-mono-num text-xl font-bold text-[#0F172A]">
                  1
                </span>
                <span className="text-[12px] font-medium text-[#15803D]">
                  Meta Ads active
                </span>
              </div>
              <p className="mt-2 truncate text-[11.5px] text-[#64748B]">
                {activeMemory.pixels?.join(" · ") || "Meta Pixel synced"}
              </p>
            </div>

            <button
              type="button"
              data-no-glass="true"
              onClick={() => {
                setAudienceMode("scenarios");
                onSubViewChange("audience");
              }}
              className="group rounded-[12px] border border-[#ebebf3] bg-white p-4 text-left transition-colors hover:border-[#d6d6e0]"
            >
              <div className="flex items-center justify-between text-[12px] font-medium text-[#64748B]">
                <span>Scenarios</span>
                <ArrowUpRight className="h-3.5 w-3.5 text-[#64748B] transition-colors group-hover:text-[#0F172A]" />
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
                      className="h-7 w-7 rounded-[6px] border-2 border-white object-cover"
                    />
                  ))}
                </div>
              </div>
              <p className="mt-2 truncate text-[11.5px] text-[#64748B]">
                Angles &amp; lifestyle use cases
              </p>
            </button>

            <button
              type="button"
              data-no-glass="true"
              onClick={() => {
                setAudienceMode("personas");
                onSubViewChange("audience");
              }}
              className="group rounded-[12px] border border-[#ebebf3] bg-white p-4 text-left transition-colors hover:border-[#d6d6e0]"
            >
              <div className="flex items-center justify-between text-[12px] font-medium text-[#64748B]">
                <span>Personas</span>
                <ArrowUpRight className="h-3.5 w-3.5 text-[#64748B] transition-colors group-hover:text-[#0F172A]" />
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
                      className="h-7 w-7 rounded-full border-2 border-white object-cover"
                    />
                  ))}
                </div>
              </div>
              <p className="mt-2 truncate text-[11.5px] text-[#64748B]">
                Target customer profiles
              </p>
            </button>

            <button
              type="button"
              data-no-glass="true"
              onClick={() => onSubViewChange("products")}
              className="group rounded-[12px] border border-[#ebebf3] bg-white p-4 text-left transition-colors hover:border-[#d6d6e0]"
            >
              <div className="flex items-center justify-between text-[12px] font-medium text-[#64748B]">
                <span>Products</span>
                <ArrowUpRight className="h-3.5 w-3.5 text-[#64748B] transition-colors group-hover:text-[#0F172A]" />
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
                    className="h-8 w-8 rounded-[6px] border border-[#ebebf3] object-cover"
                  />
                ) : (
                  <div className="flex h-8 w-8 items-center justify-center rounded-[6px] bg-[#f5f5fa]">
                    <Package className="h-4 w-4 text-[#64748B]" />
                  </div>
                )}
              </div>
              <p className="mt-2 truncate text-[11.5px] text-[#64748B]">
                {activeMemory.products[0]?.title || "Product catalog"}
              </p>
            </button>

            <button
              type="button"
              data-no-glass="true"
              onClick={() => onSubViewChange("competitors")}
              className="group rounded-[12px] border border-[#ebebf3] bg-white p-4 text-left transition-colors hover:border-[#d6d6e0]"
            >
              <div className="flex items-center justify-between text-[12px] font-medium text-[#64748B]">
                <span>Competitors</span>
                <ArrowUpRight className="h-3.5 w-3.5 text-[#64748B] transition-colors group-hover:text-[#0F172A]" />
              </div>
              <div className="mt-3 flex items-center justify-between gap-2">
                <span className="font-mono-num text-lg font-bold text-[#0F172A]">
                  {trackedCompetitors.length} Competitors
                </span>
              </div>
              <p className="mt-2 truncate text-[11.5px] text-[#64748B]">
                Live ad benchmarks tracked
              </p>
            </button>
          </div>

          {/* Overview 3 Horizontal Section Tabs */}
          <section className="overflow-hidden rounded-[12px] border border-[#ebebf3] bg-white">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#ebebf3] px-6 pt-3">
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
                      className={`border-b-2 pt-1 pb-3 text-[13px] font-semibold transition-colors ${
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
                        className="h-8 rounded-[8px] border border-[#d6d6e0] bg-white px-3 text-[12.5px] font-medium text-[#475569] hover:text-[#0F172A]"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        data-no-glass="true"
                        onClick={() => {
                          commitMemory(draftMemory);
                          setIsEditingProfile(false);
                        }}
                        className="inline-flex h-8 items-center gap-1.5 rounded-[8px] bg-[#0027eb] px-3.5 text-[12.5px] font-semibold text-white hover:bg-[#001fc2]"
                      >
                        <Check className="h-3.5 w-3.5 text-white" />
                        Save changes
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      data-no-glass="true"
                      onClick={() => setIsEditingProfile(true)}
                      className="inline-flex h-8 items-center gap-1.5 rounded-[8px] border border-[#d6d6e0] bg-white px-3 text-[12.5px] font-medium text-[#0F172A] hover:border-[#0027eb]"
                    >
                      <Pencil className="h-3 w-3 text-[#475569]" />
                      Edit fields
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* TAB 1: BRAND PROFILE */}
            {overviewTab === "profile" && (
              <div className="divide-y divide-[#ebebf3]">
                <div className="grid grid-cols-1 gap-2 px-6 py-4 md:grid-cols-12 md:items-center">
                  <label className="text-[12.5px] font-semibold text-[#64748B] md:col-span-4">
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
                        className="w-full rounded-[8px] border border-[#d6d6e0] bg-white px-3 py-2 text-[13.5px] text-[#0F172A] outline-none focus:border-[#0027eb]"
                      />
                    ) : (
                      <p className="text-[13.5px] font-semibold text-[#0F172A]">
                        {draftMemory.brandName}
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-2 px-6 py-4 md:grid-cols-12 md:items-center">
                  <label className="text-[12.5px] font-semibold text-[#64748B] md:col-span-4">
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
                        className="font-mono-num w-full rounded-[8px] border border-[#d6d6e0] bg-white px-3 py-2 text-[13.5px] text-[#0F172A] outline-none focus:border-[#0027eb]"
                      />
                    ) : (
                      <a
                        href={draftMemory.websiteUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="font-mono-num inline-flex items-center gap-1.5 text-[13.5px] font-medium text-[#0027eb] hover:underline"
                      >
                        {draftMemory.websiteUrl}
                        <ExternalLink className="h-3.5 w-3.5 text-[#64748B]" />
                      </a>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-2 px-6 py-4 md:grid-cols-12 md:items-center">
                  <label className="text-[12.5px] font-semibold text-[#64748B] md:col-span-4">
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
                        className="w-full rounded-[8px] border border-[#d6d6e0] bg-white px-3 py-2 text-[13.5px] text-[#0F172A] outline-none focus:border-[#0027eb]"
                      />
                    ) : (
                      <span className="inline-flex rounded-full border border-[#C7D2FE] bg-[#EEF2FF] px-3 py-1 text-[12px] font-semibold text-[#0027eb]">
                        {draftMemory.category}
                      </span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-2 px-6 py-4 md:grid-cols-12 md:items-start">
                  <label className="pt-1 text-[12.5px] font-semibold text-[#64748B] md:col-span-4">
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
                        className="w-full rounded-[8px] border border-[#d6d6e0] bg-white px-3 py-2 text-[13.5px] text-[#0F172A] outline-none focus:border-[#0027eb]"
                      />
                    ) : (
                      <p className="text-[13.5px] leading-relaxed text-[#334155]">
                        {draftMemory.description || draftMemory.tagline || "—"}
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-2 px-6 py-4 md:grid-cols-12 md:items-start">
                  <label className="pt-1 text-[12.5px] font-semibold text-[#64748B] md:col-span-4">
                    Unique value propositions
                  </label>
                  <div className="md:col-span-8">
                    <EditableChipGroup
                      items={draftMemory.usps}
                      editing={isEditingProfile}
                      tone="cobalt"
                      placeholder="Add USP + Enter"
                      onChange={(usps) =>
                        setDraftMemory({ ...draftMemory, usps })
                      }
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-2 px-6 py-4 md:grid-cols-12 md:items-start">
                  <label className="pt-1 text-[12.5px] font-semibold text-[#64748B] md:col-span-4">
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

                <div className="grid grid-cols-1 gap-2 px-6 py-4 md:grid-cols-12 md:items-center">
                  <label className="text-[12.5px] font-semibold text-[#64748B] md:col-span-4">
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
                        className="w-full rounded-[8px] border border-[#d6d6e0] bg-white px-3 py-2 text-[13.5px] text-[#0F172A] outline-none focus:border-[#0027eb]"
                      />
                    ) : (
                      <p className="text-[13.5px] text-[#0F172A]">
                        {draftMemory.targetAudience}
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-2 px-6 py-4 md:grid-cols-12 md:items-center">
                  <label className="text-[12.5px] font-semibold text-[#64748B] md:col-span-4">
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
                        className="w-full rounded-[8px] border border-[#d6d6e0] bg-white px-3 py-2 text-[13.5px] text-[#0F172A] outline-none focus:border-[#0027eb]"
                      />
                    ) : (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-[#ECFDF3] px-3 py-1 text-[12px] font-semibold text-[#15803D]">
                        <ShieldCheck className="h-3.5 w-3.5 text-[#475569]" />
                        {draftMemory.primaryOffer}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: BRAND GUIDELINES */}
            {overviewTab === "guidelines" && (
              <div className="divide-y divide-[#ebebf3]">
                <div className="grid grid-cols-1 gap-4 px-6 py-5 md:grid-cols-12 md:items-start">
                  <div className="md:col-span-4">
                    <p className="text-[13px] font-semibold text-[#0F172A]">
                      Logos
                    </p>
                    <p className="mt-1 text-[12px] text-[#64748B]">
                      Primary mark used in Studio templates and Snow renders.
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-4 md:col-span-8">
                    <div className="relative flex h-24 w-44 items-center justify-center rounded-[10px] border border-[#ebebf3] bg-[#f5f5fa] p-4">
                      <span className="absolute top-2.5 right-2.5 rounded-full bg-[#EEF2FF] px-2 py-0.5 text-[10px] font-semibold text-[#0027eb]">
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
                    <div className="flex h-24 w-44 items-center justify-center rounded-[10px] border border-[#0F172A] bg-[#050811] p-4">
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

                <div className="grid grid-cols-1 gap-4 px-6 py-5 md:grid-cols-12 md:items-start">
                  <div className="md:col-span-4">
                    <p className="text-[13px] font-semibold text-[#0F172A]">
                      Brand colors
                    </p>
                    <p className="mt-1 text-[12px] text-[#64748B]">
                      Click any swatch to adjust its hex code or add a new brand
                      color.
                    </p>
                  </div>
                  <div className="space-y-3 md:col-span-8">
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                      {draftMemory.brandColors.map((hex, idx) => (
                        <div
                          key={`${hex}-${idx}`}
                          className="group relative overflow-hidden rounded-[10px] border border-[#ebebf3] bg-white p-2"
                        >
                          <label className="block cursor-pointer">
                            <div
                              className="h-14 w-full rounded-[8px] border border-black/10"
                              style={{ backgroundColor: hex }}
                            />
                            <input
                              type="color"
                              value={
                                /^#[0-9A-Fa-f]{6}$/.test(hex) ? hex : "#0027eb"
                              }
                              onChange={(e) =>
                                handleUpdateColorAt(idx, e.target.value)
                              }
                              className="sr-only"
                            />
                          </label>
                          <div className="mt-2 flex items-center justify-between px-1">
                            <span className="font-mono-num text-[12px] font-semibold text-[#0F172A]">
                              {hex.toUpperCase()}
                            </span>
                            {draftMemory.brandColors.length > 1 && (
                              <button
                                type="button"
                                data-no-glass="true"
                                onClick={() => handleRemoveColorAt(idx)}
                                aria-label={`Remove ${hex}`}
                                className="text-[#64748B] opacity-0 transition-opacity hover:text-[#0F172A] group-hover:opacity-100"
                              >
                                <X className="h-3.5 w-3.5 text-[#64748B]" />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <label className="inline-flex cursor-pointer items-center gap-2 rounded-[8px] border border-[#d6d6e0] bg-[#f5f5fa] px-3 py-1.5 text-[12px]">
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
                        className="inline-flex h-8 items-center gap-1.5 rounded-[8px] border border-[#d6d6e0] bg-white px-3 text-[12.5px] font-medium text-[#0F172A] transition-colors hover:border-[#0027eb]"
                      >
                        <Plus className="h-3.5 w-3.5 text-[#475569]" />
                        Add color swatch
                      </button>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 px-6 py-5 md:grid-cols-12 md:items-start">
                  <div className="md:col-span-4">
                    <p className="text-[13px] font-semibold text-[#0F172A]">
                      Brand fonts
                    </p>
                    <p className="mt-1 text-[12px] text-[#64748B]">
                      Typography pairing applied to static ads and captions.
                    </p>
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:col-span-8">
                    <div className="rounded-[10px] border border-[#ebebf3] bg-[#f5f5fa] p-4">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">
                          Primary UI &amp; Display
                        </span>
                        <Type className="h-3.5 w-3.5 text-[#475569]" />
                      </div>
                      <p className="mt-2 text-lg font-bold text-[#0F172A]">
                        Geist Sans
                      </p>
                      <p className="mt-1 text-[12px] text-[#64748B]">
                        Aa Bb Cc · Clean modern geometric grotesque
                      </p>
                    </div>
                    <div className="rounded-[10px] border border-[#ebebf3] bg-[#f5f5fa] p-4">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">
                          Editorial Accent
                        </span>
                        <Type className="h-3.5 w-3.5 text-[#475569]" />
                      </div>
                      <p className="font-geist-serif mt-2 text-xl font-normal text-[#0F172A]">
                        Geist Serif
                      </p>
                      <p className="mt-1 text-[12px] text-[#64748B]">
                        Aa Bb Cc · High-trust founder &amp; editorial headlines
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 px-6 py-5 md:grid-cols-12 md:items-center">
                  <div className="md:col-span-4">
                    <p className="text-[13px] font-semibold text-[#0F172A]">
                      Tone of voice
                    </p>
                    <p className="mt-1 text-[12px] text-[#64748B]">
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
                      className="flex-1 rounded-[8px] border border-[#d6d6e0] bg-white px-3.5 py-2 text-[13.5px] text-[#0F172A] outline-none focus:border-[#0027eb]"
                    />
                    <button
                      type="button"
                      data-no-glass="true"
                      onClick={() => commitMemory(draftMemory)}
                      className="h-9 rounded-[8px] bg-[#0027eb] px-4 text-[12.5px] font-semibold text-white hover:bg-[#001fc2]"
                    >
                      Update
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 px-6 py-5 md:grid-cols-12 md:items-center">
                  <div className="md:col-span-4">
                    <p className="text-[13px] font-semibold text-[#0F172A]">
                      Logo on Snow images
                    </p>
                    <p className="mt-1 text-[12px] text-[#64748B]">
                      Automatically watermark or place brand mark on static
                      outputs.
                    </p>
                  </div>
                  <div className="flex items-center justify-between gap-3 md:col-span-8">
                    <span className="text-[13.5px] font-medium text-[#0F172A]">
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

                <div className="grid grid-cols-1 gap-4 px-6 py-5 md:grid-cols-12 md:items-center">
                  <div className="md:col-span-4">
                    <p className="text-[13px] font-semibold text-[#0F172A]">
                      Default language
                    </p>
                    <p className="mt-1 text-[12px] text-[#64748B]">
                      Default copywriting and voiceover language in Studio.
                    </p>
                  </div>
                  <div className="md:col-span-8">
                    <select
                      value={defaultLanguage}
                      onChange={(e) => setDefaultLanguage(e.target.value)}
                      data-no-glass="true"
                      className="w-full max-w-xs rounded-[8px] border border-[#d6d6e0] bg-white px-3.5 py-2 text-[13.5px] font-medium text-[#0F172A] outline-none focus:border-[#0027eb]"
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
                  className="flex cursor-pointer flex-col items-center justify-center rounded-[12px] border border-dashed border-[#d6d6e0] bg-[#f5f5fa]/60 px-6 py-8 text-center transition-colors hover:border-[#0027eb]"
                >
                  <div className="flex h-11 w-11 items-center justify-center rounded-[10px] border border-[#ebebf3] bg-white">
                    <Upload className="h-5 w-5 text-[#475569]" />
                  </div>
                  <p className="mt-3 text-[13.5px] font-semibold text-[#0F172A]">
                    Drop brand PDFs, review exports, or creative guidelines
                  </p>
                  <p className="mt-1 text-[12px] text-[#64748B]">
                    Supports PDF, CSV, TXT, DOCX, and Markdown context files
                  </p>
                  <span className="mt-3 inline-flex h-8 items-center gap-1.5 rounded-[8px] bg-[#0027eb] px-4 text-[12.5px] font-semibold text-white">
                    <Plus className="h-3.5 w-3.5 text-white" />
                    Select files
                  </span>
                </div>

                <div className="overflow-hidden rounded-[10px] border border-[#ebebf3]">
                  <table className="w-full border-collapse text-left">
                    <thead>
                      <tr className="border-b border-[#ebebf3] bg-white text-[12.5px] font-semibold text-[#0F172A]">
                        <th className="px-4 py-3">Name</th>
                        <th className="px-4 py-3">Topic tags</th>
                        <th className="px-4 py-3">Added</th>
                        <th className="px-4 py-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#ebebf3] text-[12.5px]">
                      {contextFiles.map((file) => (
                        <tr key={file.id} className="hover:bg-[#f5f5fa]/50">
                          <td className="px-4 py-3.5">
                            <div className="flex items-center gap-2.5">
                              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] bg-[#f5f5fa]">
                                <FileText className="h-4 w-4 text-[#475569]" />
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
                                  className="rounded-full border border-[#ebebf3] bg-[#f5f5fa] px-2.5 py-0.5 text-[11px] font-medium text-[#475569]"
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
                              className="inline-flex h-7 w-7 items-center justify-center rounded-[6px] text-[#64748B] hover:bg-[#f5f5fa] hover:text-[#0F172A]"
                            >
                              <Trash2 className="h-3.5 w-3.5 text-[#64748B]" />
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
      </div>
    );
  }

  /* --------------------------------------------------------------------------
     AUDIENCE SUB-VIEW (Scenarios & Personas)
     -------------------------------------------------------------------------- */
  if (subView === "audience") {
    return (
      <div className="min-h-full bg-[#f5f5fa]">
        <div className="mx-auto w-full max-w-[1240px] space-y-5 px-6 py-6">
          {renderDetailHeader()}

          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div className="grid grid-cols-2 gap-3 sm:w-[420px]">
              <button
                type="button"
                data-no-glass="true"
                onClick={() => setAudienceMode("scenarios")}
                className={`rounded-[12px] border p-3.5 text-left transition-colors ${
                  audienceMode === "scenarios"
                    ? "border-[#0027eb] bg-[#EEF2FF]/60"
                    : "border-[#ebebf3] bg-white hover:border-[#d6d6e0]"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[13px] font-bold text-[#0F172A]">
                    Scenarios
                  </span>
                  <span className="font-mono-num rounded-full bg-white px-2 py-0.5 text-[11px] font-bold text-[#0027eb]">
                    {allScenarios.length}
                  </span>
                </div>
                <p className="mt-1 text-[11.5px] text-[#64748B]">
                  Real-world buying moments
                </p>
              </button>

              <button
                type="button"
                data-no-glass="true"
                onClick={() => setAudienceMode("personas")}
                className={`rounded-[12px] border p-3.5 text-left transition-colors ${
                  audienceMode === "personas"
                    ? "border-[#0027eb] bg-[#EEF2FF]/60"
                    : "border-[#ebebf3] bg-white hover:border-[#d6d6e0]"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[13px] font-bold text-[#0F172A]">
                    Personas
                  </span>
                  <span className="font-mono-num rounded-full bg-white px-2 py-0.5 text-[11px] font-bold text-[#0027eb]">
                    {ATRIA_BRAND_PERSONAS.length}
                  </span>
                </div>
                <p className="mt-1 text-[11.5px] text-[#64748B]">
                  Core customer archetypes
                </p>
              </button>
            </div>

            <button
              type="button"
              data-no-glass="true"
              onClick={() => {
                setAudienceMode("scenarios");
                setShowAddScenario((v) => !v);
              }}
              className="inline-flex h-9 items-center gap-1.5 self-start rounded-[8px] bg-[#0027eb] px-4 text-[13px] font-semibold text-white transition-colors hover:bg-[#001fc2] sm:self-auto"
            >
              <Plus className="h-4 w-4 text-white" />
              Add scenario
            </button>
          </div>

          {showAddScenario && (
            <form
              onSubmit={handleCreateScenario}
              className="grid grid-cols-1 gap-3 rounded-[12px] border border-[#C7D2FE] bg-[#EEF2FF]/45 p-4 md:grid-cols-12"
            >
              <input
                type="text"
                required
                value={newScenarioTitle}
                onChange={(e) => setNewScenarioTitle(e.target.value)}
                placeholder="Scenario title (e.g. Morning Studio Setup)"
                className="rounded-[8px] border border-[#d6d6e0] bg-white px-3 py-2 text-[12.5px] text-[#0F172A] outline-none focus:border-[#0027eb] md:col-span-4"
              />
              <input
                type="text"
                value={newScenarioHook}
                onChange={(e) => setNewScenarioHook(e.target.value)}
                placeholder="Hook angle (e.g. Problem -> Demo)"
                className="rounded-[8px] border border-[#d6d6e0] bg-white px-3 py-2 text-[12.5px] text-[#0F172A] outline-none focus:border-[#0027eb] md:col-span-3"
              />
              <input
                type="text"
                value={newScenarioSummary}
                onChange={(e) => setNewScenarioSummary(e.target.value)}
                placeholder="Short scenario summary"
                className="rounded-[8px] border border-[#d6d6e0] bg-white px-3 py-2 text-[12.5px] text-[#0F172A] outline-none focus:border-[#0027eb] md:col-span-3"
              />
              <div className="flex items-center justify-end gap-2 md:col-span-2">
                <button
                  type="button"
                  data-no-glass="true"
                  onClick={() => setShowAddScenario(false)}
                  className="h-8 rounded-[8px] border border-[#d6d6e0] bg-white px-3 text-[12.5px] font-medium text-[#475569]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  data-no-glass="true"
                  className="h-8 rounded-[8px] bg-[#0027eb] px-4 text-[12.5px] font-semibold text-white"
                >
                  Save
                </button>
              </div>
            </form>
          )}

          {audienceMode === "scenarios" ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {allScenarios.map((scn) => (
                <div
                  key={scn.id}
                  className="group overflow-hidden rounded-[12px] border border-[#ebebf3] bg-white transition-colors hover:border-[#d6d6e0]"
                >
                  <div className="relative aspect-[16/9] w-full overflow-hidden bg-[#f5f5fa]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={scn.imageUrl}
                      alt={scn.title}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                    />
                    <span className="absolute top-3 left-3 rounded-full bg-[#050811]/85 px-3 py-1 text-[11px] font-semibold text-white backdrop-blur-xs">
                      {scn.hookAngle}
                    </span>
                  </div>
                  <div className="space-y-3 p-5">
                    <div>
                      <h3 className="font-display text-[15px] font-bold text-[#0F172A]">
                        {scn.title}
                      </h3>
                      <p className="mt-1 text-[12.5px] leading-relaxed text-[#475569]">
                        {scn.summary}
                      </p>
                    </div>
                    <div className="flex items-center justify-between border-t border-[#ebebf3] pt-3">
                      <span className="text-[11.5px] font-medium text-[#64748B]">
                        Ready for Video &amp; Static Studio
                      </span>
                      <button
                        type="button"
                        data-no-glass="true"
                        onClick={() =>
                          onCreateAdFromProduct(
                            `${
                              activeMemory.products[0]?.title ||
                              activeMemory.brandName
                            } (${scn.title})`
                          )
                        }
                        className="inline-flex h-8 items-center gap-1.5 rounded-[8px] bg-[#0027eb] px-3.5 text-[12.5px] font-semibold text-white hover:bg-[#001fc2]"
                      >
                        <Sparkles className="h-3.5 w-3.5 text-white" />
                        Create Ad with Scenario
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {ATRIA_BRAND_PERSONAS.map((persona) => (
                <div
                  key={persona.id}
                  className="flex flex-col justify-between gap-4 rounded-[12px] border border-[#ebebf3] bg-white p-5 transition-colors hover:border-[#d6d6e0]"
                >
                  <div className="flex items-start gap-4">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={persona.avatarUrl}
                      alt={persona.name}
                      className="h-16 w-16 shrink-0 rounded-[10px] border border-[#ebebf3] object-cover"
                    />
                    <div className="min-w-0 space-y-1.5">
                      <span className="inline-flex rounded-full bg-[#EEF2FF] px-2.5 py-0.5 text-[11px] font-semibold text-[#0027eb]">
                        {persona.role}
                      </span>
                      <h3 className="font-display text-[15px] font-bold text-[#0F172A]">
                        {persona.name}
                      </h3>
                      <p className="text-[12.5px] leading-relaxed text-[#475569]">
                        {persona.desire}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between border-t border-[#ebebf3] pt-3">
                    <span className="text-[11.5px] font-medium text-[#64748B]">
                      ICP Persona · {activeMemory.brandName}
                    </span>
                    <button
                      type="button"
                      data-no-glass="true"
                      onClick={() =>
                        onCreateAdFromProduct(
                          `${
                            activeMemory.products[0]?.title ||
                            activeMemory.brandName
                          } (${persona.name.split("—")[0].trim()})`
                        )
                      }
                      className="inline-flex h-8 items-center gap-1.5 rounded-[8px] bg-[#0027eb] px-3.5 text-[12.5px] font-semibold text-white hover:bg-[#001fc2]"
                    >
                      <Sparkles className="h-3.5 w-3.5 text-white" />
                      Create Ad for Persona
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  /* --------------------------------------------------------------------------
     PRODUCTS SUB-VIEW
     -------------------------------------------------------------------------- */
  if (subView === "products") {
    return (
      <div className="min-h-full bg-[#f5f5fa]">
        <div className="mx-auto w-full max-w-[1240px] space-y-5 px-6 py-6">
          {renderDetailHeader()}

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-display text-[17px] font-bold text-[#0F172A]">
                Product Catalog
              </h2>
              <p className="text-[12.5px] text-[#64748B]">
                Launch new video or static creatives directly from any synced
                product.
              </p>
            </div>
            <button
              type="button"
              data-no-glass="true"
              onClick={() => setShowAddProduct((v) => !v)}
              className="inline-flex h-9 items-center gap-1.5 rounded-[8px] bg-[#0027eb] px-4 text-[13px] font-semibold text-white hover:bg-[#001fc2]"
            >
              <Plus className="h-4 w-4 text-white" />
              Add product
            </button>
          </div>

          {showAddProduct && (
            <form
              onSubmit={handleCreateProduct}
              className="grid grid-cols-1 gap-3 rounded-[12px] border border-[#C7D2FE] bg-[#EEF2FF]/45 p-4 md:grid-cols-12"
            >
              <input
                type="text"
                required
                value={newProductTitle}
                onChange={(e) => setNewProductTitle(e.target.value)}
                placeholder="Product title"
                className="rounded-[8px] border border-[#d6d6e0] bg-white px-3 py-2 text-[12.5px] text-[#0F172A] outline-none focus:border-[#0027eb] md:col-span-3"
              />
              <input
                type="text"
                value={newProductPrice}
                onChange={(e) => setNewProductPrice(e.target.value)}
                placeholder="Price (e.g. 799)"
                className="rounded-[8px] border border-[#d6d6e0] bg-white px-3 py-2 text-[12.5px] text-[#0F172A] outline-none focus:border-[#0027eb] md:col-span-2"
              />
              <input
                type="url"
                value={newProductUrl}
                onChange={(e) => setNewProductUrl(e.target.value)}
                placeholder="Product URL"
                className="rounded-[8px] border border-[#d6d6e0] bg-white px-3 py-2 text-[12.5px] text-[#0F172A] outline-none focus:border-[#0027eb] md:col-span-3"
              />
              <input
                type="url"
                value={newProductImageUrl}
                onChange={(e) => setNewProductImageUrl(e.target.value)}
                placeholder="Image URL (optional)"
                className="rounded-[8px] border border-[#d6d6e0] bg-white px-3 py-2 text-[12.5px] text-[#0F172A] outline-none focus:border-[#0027eb] md:col-span-2"
              />
              <div className="flex items-center justify-end gap-2 md:col-span-2">
                <button
                  type="button"
                  data-no-glass="true"
                  onClick={() => setShowAddProduct(false)}
                  className="h-8 rounded-[8px] border border-[#d6d6e0] bg-white px-3 text-[12.5px] font-medium text-[#475569]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  data-no-glass="true"
                  className="h-8 rounded-[8px] bg-[#0027eb] px-4 text-[12.5px] font-semibold text-white"
                >
                  Save
                </button>
              </div>
            </form>
          )}

          <div className="overflow-hidden rounded-[12px] border border-[#ebebf3] bg-white">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] border-collapse text-left">
                <thead>
                  <tr className="border-b border-[#ebebf3] bg-white text-[13px] font-semibold text-[#0F172A]">
                    <th className="px-6 py-3.5">Product</th>
                    <th className="px-4 py-3.5">Price</th>
                    <th className="px-4 py-3.5">URL</th>
                    <th className="px-6 py-3.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#ebebf3] text-[13.5px]">
                  {activeMemory.products.map((p, idx) => {
                    const formattedPrice =
                      formatProductPriceDkk(
                        p.price,
                        p.currency || activeMemory.currency
                      ) || "—";
                    return (
                      <tr
                        key={`${p.title}-${idx}`}
                        className="transition-colors hover:bg-[#f5f5fa]/50"
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3.5">
                            <div className="h-12 w-12 shrink-0 overflow-hidden rounded-[8px] border border-[#ebebf3] bg-[#f5f5fa]">
                              {p.image_url ? (
                                /* eslint-disable-next-line @next/next/no-img-element */
                                <img
                                  src={p.image_url}
                                  alt={p.title}
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center">
                                  <Package className="h-5 w-5 text-[#64748B]" />
                                </div>
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="font-semibold text-[#0F172A]">
                                {p.title}
                              </p>
                              {p.product_type && (
                                <p className="text-[12px] text-[#64748B]">
                                  {p.product_type}
                                </p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="font-mono-num px-4 py-4 font-semibold text-[#0F172A]">
                          {formattedPrice}
                        </td>
                        <td className="px-4 py-4">
                          {p.url ? (
                            <a
                              href={p.url}
                              target="_blank"
                              rel="noreferrer"
                              className="font-mono-num inline-flex max-w-[260px] items-center gap-1 truncate text-[12.5px] text-[#0027eb] hover:underline"
                            >
                              <span className="truncate">
                                {p.url.replace(/^https?:\/\//, "")}
                              </span>
                              <ExternalLink className="h-3 w-3 shrink-0 text-[#64748B]" />
                            </a>
                          ) : (
                            <span className="text-[12.5px] text-[#94A3B8]">
                              —
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button
                            type="button"
                            data-no-glass="true"
                            onClick={() => onCreateAdFromProduct(p.title)}
                            className="inline-flex h-8 items-center gap-1.5 rounded-[8px] bg-[#0027eb] px-3.5 text-[12.5px] font-semibold text-white hover:bg-[#001fc2]"
                          >
                            <Sparkles className="h-3.5 w-3.5 text-white" />
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
      </div>
    );
  }

  /* --------------------------------------------------------------------------
     COMPETITORS SUB-VIEW
     -------------------------------------------------------------------------- */
  return (
    <div className="min-h-full bg-[#f5f5fa]">
      <div className="mx-auto w-full max-w-[1240px] space-y-5 px-6 py-6">
        {renderDetailHeader()}

        <div>
          <h2 className="font-display text-[17px] font-bold text-[#0F172A]">
            Tracked Competitors
          </h2>
          <p className="text-[12.5px] text-[#64748B]">
            Monitor active Meta creative volume, traffic velocity, and offer
            structures.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {trackedCompetitors.map((brand) => {
            const activeCount =
              brand.active_ads_count ?? adCountByBrand.get(brand.id) ?? 0;
            return (
              <div
                key={brand.id}
                className="flex flex-col justify-between gap-4 rounded-[12px] border border-[#ebebf3] bg-white p-5 transition-colors hover:border-[#d6d6e0]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <BrandAvatar
                      name={brand.name}
                      logoUrl={brand.logo_url}
                      websiteUrl={brand.website_url}
                      initials={brand.avatar_initials}
                      sizeClass="h-11 w-11"
                      textClass="text-[13px]"
                    />
                    <div className="min-w-0">
                      <h3 className="font-display truncate text-[15px] font-bold text-[#0F172A]">
                        {brand.name}
                      </h3>
                      <p className="font-mono-num truncate text-[12px] text-[#64748B]">
                        {typeof brand.website_url === "string"
                          ? brand.website_url.replace(/^https?:\/\//, "")
                          : ""}
                      </p>
                    </div>
                  </div>
                  <span className="shrink-0 rounded-full border border-[#C7D2FE] bg-[#EEF2FF] px-2.5 py-0.5 text-[11px] font-semibold text-[#0027eb]">
                    {brand.market}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2.5 rounded-[10px] bg-[#f5f5fa] p-3">
                  <div>
                    <p className="text-[11px] text-[#64748B]">Active ads</p>
                    <p className="font-mono-num mt-0.5 text-base font-bold text-[#0F172A]">
                      {activeCount}
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] text-[#64748B]">Category</p>
                    <p className="mt-0.5 truncate text-[12.5px] font-semibold text-[#0F172A]">
                      {brand.category}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  data-no-glass="true"
                  onClick={() => onOpenCompetitorBrand(brand.id)}
                  className="inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-[8px] bg-[#0F172A] px-4 text-[12.5px] font-semibold text-white transition-colors hover:bg-[#1E293B]"
                >
                  <BarChart3 className="h-3.5 w-3.5 text-white" />
                  Inspect Analytics
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ============================================================================
   2. ASSETS WORKSPACE VIEW (1:1 ATRIA STEP 63 REPLICA)
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
  const [showFilters, setShowFilters] = useState(true);
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
      if (formatFilter !== "all" && item.mediaType !== formatFilter)
        return false;
      if (uploaderFilter !== "all" && item.source !== uploaderFilter)
        return false;
      if (creatorFilter !== "all" && item.creator !== creatorFilter)
        return false;
      if (sceneFilter !== "all" && item.scene !== sceneFilter) return false;
      if (rollFilter !== "all" && item.rollType !== rollFilter) return false;
      if (captionFilter !== "all" && item.captionState !== captionFilter)
        return false;
      if (audioFilter !== "all" && item.audioState !== audioFilter)
        return false;
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

  const hasActiveFilter =
    Boolean(searchQuery) ||
    formatFilter !== "all" ||
    uploaderFilter !== "all" ||
    creatorFilter !== "all" ||
    sceneFilter !== "all" ||
    rollFilter !== "all" ||
    captionFilter !== "all" ||
    audioFilter !== "all";

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
    <div className="flex min-h-full flex-col bg-[#f5f5fa]">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,video/*"
        multiple
        className="hidden"
        onChange={(e) => handleFileUpload(e.target.files)}
      />

      {/* STICKY WHITE HEADER + FILTER DRAWER (EXACT ATRIA LAYOUT) */}
      <div className="sticky top-0 z-10 border-b border-[#ebebf3] bg-white">
        {/* Row 1: Title + Search + Add */}
        <div className="flex flex-wrap items-center justify-between gap-4 px-6 pt-3.5 pb-2.5">
          <h1 className="font-display shrink-0 text-[20px] font-bold tracking-tight text-[#0F172A]">
            All assets
          </h1>

          <div className="flex h-9 w-full max-w-[520px] flex-1 items-center gap-2 rounded-[8px] border border-[#d6d6e0] bg-white px-3 focus-within:border-[#0027eb]">
            <Search className="h-4 w-4 shrink-0 text-[#94A3B8]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name/visual element/voice-over/text-overlay"
              className="w-full bg-transparent text-[13.5px] text-[#0F172A] outline-none placeholder:text-[#94A3B8]"
            />
            {searchQuery && (
              <button
                type="button"
                data-no-glass="true"
                onClick={() => setSearchQuery("")}
                className="text-[#64748B] hover:text-[#0F172A]"
              >
                <X className="h-3.5 w-3.5 text-[#64748B]" />
              </button>
            )}
          </div>

          <button
            type="button"
            data-no-glass="true"
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-[8px] bg-[#0027eb] px-4 text-[13.5px] font-semibold text-white transition-colors hover:bg-[#001fc2]"
          >
            <Plus className="h-4 w-4 text-white" />
            Add
          </button>
        </div>

        {/* Row 2: Filters Hide + Sort */}
        <div className="flex flex-wrap items-center gap-2 px-6 pb-2.5">
          <button
            type="button"
            data-no-glass="true"
            onClick={() => setShowFilters((v) => !v)}
            className="inline-flex h-8 items-center gap-1.5 rounded-[8px] border border-[#ebebf3] bg-white px-3 text-[13px] font-semibold text-[#0F172A] transition-colors hover:border-[#d6d6e0]"
          >
            <Filter className="h-3.5 w-3.5 text-[#475569]" />
            <span>Filters</span>
            <span className="font-normal text-[#64748B]">
              {showFilters ? "Hide" : "Show"}
            </span>
            {showFilters ? (
              <ChevronUp className="h-3.5 w-3.5 text-[#64748B]" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5 text-[#64748B]" />
            )}
          </button>

          <div className="inline-flex h-8 items-center gap-1.5 rounded-[8px] border border-[#ebebf3] bg-white px-3 text-[13px]">
            <ArrowUpDown className="h-3.5 w-3.5 text-[#64748B]" />
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

          {hasActiveFilter && (
            <button
              type="button"
              data-no-glass="true"
              onClick={resetFilters}
              className="ml-1 text-[12.5px] font-medium text-[#0027eb] hover:underline"
            >
              Reset filters
            </button>
          )}
        </div>

        {/* Row 3: Expanded Single-Row #f5f5fa Filter Drawer */}
        {showFilters && (
          <div className="px-6 pb-3">
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 rounded-[10px] bg-[#f5f5fa] px-4 py-2.5">
              {/* Asset Group */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[12.5px] font-medium text-[#64748B]">
                  Asset
                </span>
                <select
                  aria-label="Format"
                  value={formatFilter}
                  onChange={(e) =>
                    setFormatFilter(
                      e.target.value as "all" | "image" | "video"
                    )
                  }
                  data-no-glass="true"
                  className={`h-7 rounded-[6px] border px-2.5 text-[12.5px] font-medium outline-none ${
                    formatFilter !== "all"
                      ? "border-[#0027eb] bg-[#EEF2FF] text-[#0027eb]"
                      : "border-[#ebebf3] bg-white text-[#0F172A] hover:border-[#d6d6e0]"
                  }`}
                >
                  <option value="all">Format</option>
                  <option value="image">Image</option>
                  <option value="video">Video</option>
                </select>

                <select
                  aria-label="Uploader"
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
                  className={`h-7 rounded-[6px] border px-2.5 text-[12.5px] font-medium outline-none ${
                    uploaderFilter !== "all"
                      ? "border-[#0027eb] bg-[#EEF2FF] text-[#0027eb]"
                      : "border-[#ebebf3] bg-white text-[#0F172A] hover:border-[#d6d6e0]"
                  }`}
                >
                  <option value="all">Uploader</option>
                  <option value="Uploaded">Uploaded</option>
                  <option value="Brand Memory">Brand Memory</option>
                  <option value="Studio">Studio</option>
                </select>

                <select
                  aria-label="Creator"
                  value={creatorFilter}
                  onChange={(e) =>
                    setCreatorFilter(
                      e.target.value as "all" | "You" | "Snow AI"
                    )
                  }
                  data-no-glass="true"
                  className={`h-7 rounded-[6px] border px-2.5 text-[12.5px] font-medium outline-none ${
                    creatorFilter !== "all"
                      ? "border-[#0027eb] bg-[#EEF2FF] text-[#0027eb]"
                      : "border-[#ebebf3] bg-white text-[#0F172A] hover:border-[#d6d6e0]"
                  }`}
                >
                  <option value="all">Creator</option>
                  <option value="You">You</option>
                  <option value="Snow AI">Snow AI</option>
                </select>
              </div>

              {/* Clip Group */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[12.5px] font-medium text-[#64748B]">
                  Clip
                </span>
                <select
                  aria-label="Scene"
                  value={sceneFilter}
                  onChange={(e) => setSceneFilter(e.target.value)}
                  data-no-glass="true"
                  className={`h-7 rounded-[6px] border px-2.5 text-[12.5px] font-medium outline-none ${
                    sceneFilter !== "all"
                      ? "border-[#0027eb] bg-[#EEF2FF] text-[#0027eb]"
                      : "border-[#ebebf3] bg-white text-[#0F172A] hover:border-[#d6d6e0]"
                  }`}
                >
                  <option value="all">Scene</option>
                  <option value="Product Hero">Product Hero</option>
                  <option value="Lifestyle">Lifestyle</option>
                  <option value="UGC Hook">UGC Hook</option>
                  <option value="B-Roll">B-Roll</option>
                </select>

                <select
                  aria-label="A/B-roll"
                  value={rollFilter}
                  onChange={(e) => setRollFilter(e.target.value)}
                  data-no-glass="true"
                  className={`h-7 rounded-[6px] border px-2.5 text-[12.5px] font-medium outline-none ${
                    rollFilter !== "all"
                      ? "border-[#0027eb] bg-[#EEF2FF] text-[#0027eb]"
                      : "border-[#ebebf3] bg-white text-[#0F172A] hover:border-[#d6d6e0]"
                  }`}
                >
                  <option value="all">A/B-roll</option>
                  <option value="A-Roll">A-Roll</option>
                  <option value="B-Roll">B-Roll</option>
                </select>

                <select
                  aria-label="Caption"
                  value={captionFilter}
                  onChange={(e) => setCaptionFilter(e.target.value)}
                  data-no-glass="true"
                  className={`h-7 rounded-[6px] border px-2.5 text-[12.5px] font-medium outline-none ${
                    captionFilter !== "all"
                      ? "border-[#0027eb] bg-[#EEF2FF] text-[#0027eb]"
                      : "border-[#ebebf3] bg-white text-[#0F172A] hover:border-[#d6d6e0]"
                  }`}
                >
                  <option value="all">Caption</option>
                  <option value="With Captions">With Captions</option>
                  <option value="Clean">Clean</option>
                </select>

                <select
                  aria-label="Audio"
                  value={audioFilter}
                  onChange={(e) => setAudioFilter(e.target.value)}
                  data-no-glass="true"
                  className={`h-7 rounded-[6px] border px-2.5 text-[12.5px] font-medium outline-none ${
                    audioFilter !== "all"
                      ? "border-[#0027eb] bg-[#EEF2FF] text-[#0027eb]"
                      : "border-[#ebebf3] bg-white text-[#0F172A] hover:border-[#d6d6e0]"
                  }`}
                >
                  <option value="all">Audio</option>
                  <option value="Voiceover">Voiceover</option>
                  <option value="Silent / Visual">Silent / Visual</option>
                </select>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* MAIN CANVAS: EMPTY STATE OR ASSET GRID */}
      <div className="flex-1 px-6 py-6">
        {filteredAssets.length === 0 ? (
          <div className="mx-auto flex max-w-[540px] flex-col items-center pt-16 pb-16 text-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/atria-assets/workspace/cloud-upload.svg"
              alt="Upload assets"
              className="mx-auto h-14 w-14"
            />
            <h2 className="font-display mt-3 text-[18px] font-bold text-[#0F172A]">
              Upload or import assets
            </h2>
            <ul className="mt-3 inline-block space-y-1.5 text-left text-[13.5px] leading-relaxed text-[#475569]">
              <li>
                • Use the buttons below to upload or import files (max 1 GB
                each).
              </li>
              <li>
                • Images, videos, and audio cost 1 credit each for AI tagging
                and search.
              </li>
              <li>• Other file types can be uploaded without credits.</li>
            </ul>
            <div className="mt-5 flex flex-wrap items-center justify-center gap-2.5">
              <button
                type="button"
                data-no-glass="true"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex h-9 items-center gap-2 rounded-[8px] border border-[#d6d6e0] bg-white px-4 text-[13.5px] font-medium text-[#0F172A] transition-colors hover:border-[#0F172A]/40"
              >
                <Upload className="h-4 w-4 text-[#475569]" />
                Upload assets
              </button>
              <button
                type="button"
                data-no-glass="true"
                onClick={onOpenBrandScanner}
                className="inline-flex h-9 items-center gap-2 rounded-[8px] border border-[#d6d6e0] bg-white px-4 text-[13.5px] font-medium text-[#0F172A] transition-colors hover:border-[#0F172A]/40"
              >
                <GoogleDriveColorIcon className="h-4 w-4" />
                Google Drive
              </button>
              {combinedAssets.length > 0 && (
                <button
                  type="button"
                  data-no-glass="true"
                  onClick={resetFilters}
                  className="inline-flex h-9 items-center rounded-[8px] border border-[#ebebf3] bg-white px-4 text-[13px] font-medium text-[#475569] hover:text-[#0F172A]"
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
                className="group overflow-hidden rounded-[12px] border border-[#ebebf3] bg-white transition-colors hover:border-[#d6d6e0]"
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

                  <div className="pointer-events-none absolute top-2.5 left-2.5 flex items-center gap-1.5">
                    <span className="inline-flex items-center gap-1 rounded-[6px] bg-[#050811]/85 px-2 py-0.5 text-[10.5px] font-semibold text-white backdrop-blur-xs">
                      {asset.mediaType === "video" ? (
                        <Video className="h-3 w-3 text-white" />
                      ) : (
                        <ImageIcon className="h-3 w-3 text-white" />
                      )}
                      {asset.mediaType.toUpperCase()}
                    </span>
                  </div>

                  <span className="pointer-events-none absolute top-2.5 right-2.5 rounded-[6px] bg-white/95 px-2 py-0.5 text-[10.5px] font-semibold text-[#0F172A]">
                    {asset.source}
                  </span>
                </div>

                <div className="space-y-2.5 p-3.5">
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-semibold text-[#0F172A]">
                      {asset.name}
                    </p>
                    <p className="mt-0.5 truncate text-[11.5px] text-[#64748B]">
                      {asset.subtitle || `${asset.scene} · ${asset.rollType}`}
                    </p>
                  </div>

                  <div className="flex items-center justify-between border-t border-[#ebebf3] pt-2.5">
                    <span className="font-mono-num text-[11px] text-[#64748B]">
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
                      className="inline-flex items-center gap-1 text-[12px] font-semibold text-[#0027eb] hover:underline"
                    >
                      Use in Studio
                      <ArrowRight className="h-3 w-3 text-[#475569]" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ============================================================================
   3. MCP WORKSPACE VIEW (1:1 ATRIA SETUP WIZARD + OVERVIEW + PROMPT LIBRARY + SKILL HUB)
   ============================================================================ */

export interface McpWorkspaceViewProps {
  subView: McpSubView;
  onSubViewChange: (sub: McpSubView) => void;
}

const MCP_SERVER_URL = "https://api.flake.app/mcp";

const MCP_CAPABILITY_TAGS = [
  { label: "Ad library", icon: Search },
  { label: "Competitor tracking", icon: Layers },
  { label: "Ad performance", icon: LineChart },
  { label: "Creative analysis", icon: FlaskConical },
  { label: "Image & video generation", icon: ImageIcon },
  { label: "Video ads", icon: Video },
  { label: "Launch ads", icon: Rocket },
];

const MCP_WIZARD_ROLES = [
  { label: "Media buyer", icon: LineChart },
  { label: "Creative strategist", icon: Lightbulb },
  { label: "Product researcher", icon: Search },
  { label: "Designer or content creator", icon: Wand2 },
  { label: "Marketer", icon: Megaphone },
  { label: "Founder or business owner", icon: Briefcase },
  { label: "Developer or engineer", icon: Terminal },
  { label: "Other", icon: MoreHorizontal },
];

const MCP_WIZARD_ASSISTANTS = [
  {
    id: "claude",
    label: "Claude",
    sub: "",
  },
  {
    id: "chatgpt",
    label: "ChatGPT",
    sub: "",
  },
  {
    id: "coding_agent",
    label: "Coding agent",
    sub: "Claude Code, Cursor, Codex...",
  },
  {
    id: "other",
    label: "Something else",
    sub: "",
  },
] as const;

const MCP_WIZARD_GOALS = [
  {
    id: "research_competitors",
    title: "Research competitor ads",
    desc: "what's working in your market right now",
    icon: Search,
  },
  {
    id: "analyze_performance",
    title: "Analyze my ad performance",
    desc: "spend, ROAS, CTR from your connected accounts",
    icon: BarChart3,
  },
  {
    id: "generate_variations",
    title: "Generate creative variations",
    desc: "concepts grounded in reference ads",
    icon: FlaskConical,
  },
  {
    id: "launch_ads",
    title: "Launch ads",
    desc: "publish ads from your brand assets to Meta",
    icon: Rocket,
  },
] as const;

const MCP_OVERVIEW_TABS = [
  {
    id: "video_ads",
    label: "Video ads",
    icon: Video,
    leftLabel: "Trending ad",
    rightLabel: "Your video",
    title: "Clone a winning video for your product",
    quote:
      "“Clone this video ad for our vitamins. Same story, our product, 9:16.”",
    tag: "Create",
    tool: "Flake · ad_maker_video_ad_project_create",
  },
  {
    id: "video_hooks",
    label: "Video hooks",
    icon: Film,
    leftLabel: "Winning creative",
    rightLabel: "3 new hooks",
    title: "Test new 3-second hooks on your top performer",
    quote:
      "“Take my highest-ROAS video and write 3 new visual opening hooks keeping the body identical.”",
    tag: "Iterate",
    tool: "Flake · ad_maker_video_hook_variations",
  },
  {
    id: "research_ads",
    label: "Research ads",
    icon: Search,
    leftLabel: "Competitors",
    rightLabel: "Top hooks",
    title: "Surface active competitor winners in seconds",
    quote:
      "“Find the top 10 longest-running Meta video ads in our niche and break down their hook patterns.”",
    tag: "Research",
    tool: "Flake · search_swipe_ads",
  },
  {
    id: "ad_accounts",
    label: "Ad accounts",
    icon: LineChart,
    leftLabel: "Meta account",
    rightLabel: "Creative report",
    title: "Audit creative spend, ROAS & fatigue directly in chat",
    quote:
      "“Pull my top 25 spenders over 30 days, flag fatigued hooks, and suggest what to scale next.”",
    tag: "Analyze",
    tool: "Flake · analytics_creative_breakdown",
  },
  {
    id: "image_ads",
    label: "Image ads",
    icon: ImageIcon,
    leftLabel: "Template",
    rightLabel: "On-brand static",
    title: "Generate on-brand static ads from proven layouts",
    quote:
      "“Turn this Us vs. Them layout into 4 static ad concepts using our Brand Memory and hero SKU.”",
    tag: "Create",
    tool: "Flake · ad_maker_image_ad_create",
  },
  {
    id: "launch_ads",
    label: "Launch ads",
    icon: Rocket,
    leftLabel: "Brand assets",
    rightLabel: "Meta draft",
    title: "Draft and launch new Meta ads from your assets",
    quote:
      "“Build a paused Meta draft in my Advantage+ campaign from the 3 new videos in Assets.”",
    tag: "Launch",
    tool: "Flake · meta_campaign_draft_create",
  },
  {
    id: "workspace",
    label: "Your workspace",
    icon: LayoutGrid,
    leftLabel: "Brand context",
    rightLabel: "Saved boards",
    title: "Query Brand Memory, scenarios & saved swipe boards",
    quote:
      "“Read our Brand Memory personas and match them to the top 5 saved ads in Default Board.”",
    tag: "Workspace",
    tool: "Flake · workspace_brand_context_read",
  },
] as const;

const MCP_TODAY_PROMPTS = [
  {
    id: "today-1",
    icon: Video,
    title: "Clone a trending video ad for your product",
    meta: "Video ads · May consume credits",
    prompt:
      "Using Flake, find a high-performing trending video ad in our category and clone its pacing and shot structure for our hero product in 9:16 using our Brand Memory tone of voice.",
  },
  {
    id: "today-2",
    icon: Video,
    title: "Test new hooks on your best video",
    meta: "Video ads · May consume credits",
    prompt:
      "Pull our top spending video creative from the last 14 days via Flake, analyze its 3s thumbstop rate, and generate 3 fresh opening hook scripts we can film tomorrow.",
  },
  {
    id: "today-3",
    icon: Rocket,
    title: "Launch new ads from your brand assets",
    meta: "Launch ads",
    prompt:
      "Using Flake, check my Meta ad account is ready to launch, list its campaigns and help me pick an existing ad set that can take new ads. Then build a draft from the images or videos I name in my brand's assets. Keep it as a draft. Show me the draft, the number of ads, and copy before publishing.",
  },
  {
    id: "today-4",
    icon: Search,
    title: "Extract top 10 active competitor hooks",
    meta: "Competitor research",
    prompt:
      "Use Flake MCP to call list_tracked_shops and search_swipe_ads for our top competitors. Rank the top 10 video ads by EU reach and active runtime, and break down each ad's 3-second verbal hook and CTA.",
  },
];

const MCP_OVERVIEW_SKILLS = [
  {
    id: "sk-ad-writer",
    slug: "ad-writer",
    icon: LayoutGrid,
    summary:
      "Write or revise finished hooks, on-ramps, copy, taglines and video/UGC scripts, including static-to-video adaptations.",
    tools: ["search_swipe_ads", "create_clone_brief"],
    instruction: `# Flake Skill: ad-writer\n1. Read active Brand Memory profile and tone of voice.\n2. Pull top-performing hooks via search_swipe_ads.\n3. Draft 5 hooks, on-ramps, body copy, and UGC/static-to-video scripts.`,
  },
  {
    id: "sk-competitive-landscape",
    slug: "competitive-landscape",
    icon: LayoutGrid,
    summary:
      "Compare multiple competitors in Flake's ad library for long-running ads, saturated angles/hooks, share of format, and offer gaps.",
    tools: ["list_tracked_shops", "search_swipe_ads"],
    instruction: `# Flake Skill: competitive-landscape\n1. Call list_tracked_shops to resolve target competitors.\n2. Pull active ads via search_swipe_ads and group by angle, runtime, and format.\n3. Highlight under-served hook angles and white-space opportunities.`,
  },
  {
    id: "sk-creative-breakdown",
    slug: "creative-breakdown",
    icon: LayoutGrid,
    summary:
      "Analyze one connected account's top 25 spenders over 30 days, deduped by creative, into a Creative Breakdown with scale/kill calls.",
    tools: ["analytics_creative_breakdown", "list_tracked_shops"],
    instruction: `# Flake Skill: creative-breakdown\n1. Fetch top 25 spenders over the last 30 days deduped by creative.\n2. Rank by ROAS, CPA, 3s thumbstop, and 15s hold rate.\n3. Output Scale / Iterate / Pause recommendations.`,
  },
  {
    id: "sk-video-ad-edit",
    slug: "video-ad-edit",
    icon: LayoutGrid,
    summary:
      "Make a bounded generative edit of a short existing video advertisement with private planning and optional hook/CTA swaps.",
    tools: ["ad_maker_video_ad_project_create", "create_clone_brief"],
    instruction: `# Flake Skill: video-ad-edit\n1. Inspect source video scenes and timing.\n2. Plan bounded edit (new opening hook or localized CTA).\n3. Submit render project to Flake Ad Maker.`,
  },
  {
    id: "sk-video-ad-references",
    slug: "video-ad-references",
    icon: LineChart,
    summary:
      "Find product-relevant video ad references from both connected ad accounts and the ad library, comparing pacing and retention.",
    tools: ["search_swipe_ads", "get_shop_funnels"],
    instruction: `# Flake Skill: video-ad-references\n1. Query Flake ad library for product-relevant video winners.\n2. Cross-reference with top-retaining creatives in connected accounts.\n3. Return ranked reference shortlist with scene timings.`,
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

export function McpWorkspaceView({
  subView,
  onSubViewChange,
}: McpWorkspaceViewProps) {
  const [wizardOpen, setWizardOpen] = useState(false);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [completedSteps, setCompletedSteps] = useState(0);
  const [selectedRole, setSelectedRole] = useState<string>("Media buyer");
  const [selectedAssistant, setSelectedAssistant] =
    useState<(typeof MCP_WIZARD_ASSISTANTS)[number]["id"]>("claude");
  const [selectedGoal, setSelectedGoal] =
    useState<(typeof MCP_WIZARD_GOALS)[number]["id"]>("research_competitors");

  const [activeCapTab, setActiveCapTab] =
    useState<(typeof MCP_OVERVIEW_TABS)[number]["id"]>("video_ads");
  const [clientScope, setClientScope] = useState<"mine" | "workspace">("mine");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const [testingMcp, setTestingMcp] = useState(false);
  const [probeResult, setProbeResult] = useState<McpProbeResult | null>(null);

  const mcpConfigJson = useMemo(
    () =>
      JSON.stringify(
        {
          mcpServers: {
            "flake-mcp": {
              url: MCP_SERVER_URL,
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
    []
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

  const activeTabSpec =
    MCP_OVERVIEW_TABS.find((t) => t.id === activeCapTab) ||
    MCP_OVERVIEW_TABS[0];

  const renderServerFooter = () => (
    <footer className="mt-6 flex flex-wrap items-center gap-3 border-t border-[#ebebf3] pt-5 text-[13px] text-[#64748B]">
      <span className="font-mono text-[12.5px] text-[#64748B]">
        Server: {MCP_SERVER_URL}
      </span>
      <button
        type="button"
        data-no-glass="true"
        onClick={() => void copyText("footer-server-url", MCP_SERVER_URL)}
        aria-label="Copy MCP server URL"
        className="inline-flex h-6 w-6 items-center justify-center rounded-[6px] text-[#475569] transition-colors hover:bg-black/[0.05] hover:text-[#0F172A]"
      >
        {copiedId === "footer-server-url" ? (
          <Check className="h-3.5 w-3.5 text-[#0F172A]" />
        ) : (
          <Copy className="h-3.5 w-3.5 text-[#475569]" />
        )}
      </button>
      <button
        type="button"
        data-no-glass="true"
        onClick={() => {
          onSubViewChange("overview");
          setStep(2);
          setWizardOpen(true);
        }}
        className="font-medium text-[#0027eb] hover:underline"
      >
        Documentation
      </button>
    </footer>
  );

  /* --------------------------------------------------------------------------
     SETUP WIZARD MODE (1:1 ATRIA STEP 71 REPLICA)
     -------------------------------------------------------------------------- */
  if (subView === "overview" && wizardOpen) {
    return (
      <div className="min-h-full bg-[#f5f5fa] px-6 pt-8 pb-20">
        <div className="mx-auto max-w-[1040px]">
          {/* Top Header Row */}
          <div className="flex flex-wrap items-baseline justify-between gap-4">
            <div className="flex flex-wrap items-baseline gap-3">
              <h1 className="font-display text-[22px] font-bold tracking-tight text-[#0F172A]">
                Set up Flake MCP
              </h1>
              <p className="text-[13.5px] text-[#475569]">
                Bring your Flake data into the AI assistant you already use.
              </p>
            </div>
            <button
              type="button"
              data-no-glass="true"
              onClick={() => setWizardOpen(false)}
              className="text-[13.5px] font-medium text-[#0F172A] transition-colors hover:text-[#0027eb]"
            >
              Skip for now
            </button>
          </div>

          {/* 7 Capability Tag Pills */}
          <div className="mt-3 flex flex-wrap gap-2">
            {MCP_CAPABILITY_TAGS.map((cap) => {
              const Icon = cap.icon;
              return (
                <span
                  key={cap.label}
                  data-no-glass="true"
                  className="inline-flex items-center gap-1.5 rounded-[6px] bg-[#EEF2FF]/80 px-2.5 py-1 text-[12px] font-medium text-[#475569]"
                >
                  <Icon className="h-3.5 w-3.5 text-[#64748B]" />
                  {cap.label}
                </span>
              );
            })}
          </div>

          {/* 3-Step Horizontal Stepper */}
          <div className="mt-6 flex max-w-[520px] items-center gap-3">
            {(
              [
                { num: 1, label: "About you" },
                { num: 2, label: "Connect" },
                { num: 3, label: "Try it" },
              ] as const
            ).map((s, idx) => {
              const active = step === s.num;
              const done = step > s.num;
              return (
                <React.Fragment key={s.num}>
                  <button
                    type="button"
                    data-no-glass="true"
                    onClick={() => setStep(s.num)}
                    className="inline-flex shrink-0 items-center gap-2 text-[13px]"
                  >
                    <span
                      className={`font-mono-num flex h-6 w-6 items-center justify-center rounded-full text-[12px] font-bold ${
                        active
                          ? "bg-[#0027eb] text-white"
                          : done
                            ? "bg-[#0F172A] text-white"
                            : "bg-[#ECEFF4] text-[#64748B]"
                      }`}
                    >
                      {done ? (
                        <Check className="h-3.5 w-3.5 text-white" />
                      ) : (
                        s.num
                      )}
                    </span>
                    <span
                      className={
                        active
                          ? "font-semibold text-[#0F172A]"
                          : "font-medium text-[#64748B]"
                      }
                    >
                      {s.label}
                    </span>
                  </button>
                  {idx < 2 && <div className="h-px flex-1 bg-[#d6d6e0]" />}
                </React.Fragment>
              );
            })}
          </div>

          {/* STEP 1: TELL US A LITTLE ABOUT YOU */}
          {step === 1 && (
            <div className="mt-5 rounded-[12px] border border-[#d6d6e0] bg-white px-8 py-8 sm:px-10 sm:py-9">
              <h2 className="font-display mb-6 text-[22px] font-bold tracking-tight text-[#0F172A]">
                Tell us a little about you
              </h2>

              <div className="space-y-7">
                {/* 01 Role (4x2 Grid) */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-[13.5px]">
                    <span className="font-mono-num font-semibold text-[#64748B]">
                      01
                    </span>
                    <span className="font-semibold text-[#0F172A]">
                      What best describes your role?
                    </span>
                  </div>
                  <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
                    {MCP_WIZARD_ROLES.map((role) => {
                      const Icon = role.icon;
                      const selected = selectedRole === role.label;
                      return (
                        <button
                          key={role.label}
                          type="button"
                          data-no-glass="true"
                          onClick={() => setSelectedRole(role.label)}
                          className={`flex items-center gap-3 rounded-[10px] border px-3.5 py-3 text-left transition-colors ${
                            selected
                              ? "border-[#0027eb] bg-[#EEF2FF]"
                              : "border-transparent bg-[#f5f5fa] hover:border-[#d6d6e0]"
                          }`}
                        >
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] bg-white">
                            <Icon className="h-4 w-4 text-[#475569]" />
                          </span>
                          <span className="text-[13px] font-semibold leading-snug text-[#0F172A]">
                            {role.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 02 AI Assistant (4 Cards) */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-[13.5px]">
                    <span className="font-mono-num font-semibold text-[#64748B]">
                      02
                    </span>
                    <span className="font-semibold text-[#0F172A]">
                      Which AI assistant do you use most?
                    </span>
                  </div>
                  <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
                    {MCP_WIZARD_ASSISTANTS.map((assistant) => {
                      const selected = selectedAssistant === assistant.id;
                      return (
                        <button
                          key={assistant.id}
                          type="button"
                          data-no-glass="true"
                          onClick={() => setSelectedAssistant(assistant.id)}
                          className={`flex items-center gap-3 rounded-[10px] border px-3.5 py-3.5 text-left transition-colors ${
                            selected
                              ? "border-[#0027eb] bg-[#EEF2FF]"
                              : "border-transparent bg-[#f5f5fa] hover:border-[#d6d6e0]"
                          }`}
                        >
                          {assistant.id === "claude" && (
                            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] bg-white">
                              <ClaudeBrandIcon className="h-5 w-5" />
                            </span>
                          )}
                          {assistant.id === "chatgpt" && (
                            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] bg-white">
                              <ChatGptBrandIcon className="h-5 w-5" />
                            </span>
                          )}
                          {assistant.id === "coding_agent" && (
                            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] bg-[#0F172A]">
                              <Terminal className="h-4 w-4 text-white" />
                            </span>
                          )}
                          {assistant.id === "other" && (
                            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] bg-white">
                              <Plug className="h-4 w-4 text-[#475569]" />
                            </span>
                          )}
                          <div className="min-w-0">
                            <p className="text-[13px] font-semibold text-[#0F172A]">
                              {assistant.label}
                            </p>
                            {assistant.sub && (
                              <p className="mt-0.5 text-[11.5px] leading-snug text-[#64748B]">
                                {assistant.sub}
                              </p>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 03 First Goal (3+1 Grid) */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-[13.5px]">
                    <span className="font-mono-num font-semibold text-[#64748B]">
                      03
                    </span>
                    <span className="font-semibold text-[#0F172A]">
                      What do you want to do first?
                    </span>
                  </div>
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                    {MCP_WIZARD_GOALS.map((goal) => {
                      const Icon = goal.icon;
                      const selected = selectedGoal === goal.id;
                      return (
                        <button
                          key={goal.id}
                          type="button"
                          data-no-glass="true"
                          onClick={() => setSelectedGoal(goal.id)}
                          className={`rounded-[10px] border p-4 text-left transition-colors ${
                            selected
                              ? "border-[#0027eb] bg-[#EEF2FF]"
                              : "border-transparent bg-[#f5f5fa] hover:border-[#d6d6e0]"
                          }`}
                        >
                          <span className="mb-3 flex h-7 w-7 items-center justify-center rounded-[6px] bg-white">
                            <Icon className="h-3.5 w-3.5 text-[#475569]" />
                          </span>
                          <p className="text-[13.5px] font-bold text-[#0F172A]">
                            {goal.title}
                          </p>
                          <p className="mt-1 text-[12px] leading-relaxed text-[#64748B]">
                            {goal.desc}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="mt-7 flex items-center justify-start">
                <button
                  type="button"
                  data-no-glass="true"
                  onClick={() => {
                    setCompletedSteps((prev) => Math.max(prev, 1));
                    setStep(2);
                  }}
                  className="inline-flex h-11 min-w-[220px] items-center justify-center gap-2 rounded-[10px] bg-[#0027eb] px-6 text-[13.5px] font-semibold text-white transition-colors hover:bg-[#001fc2]"
                >
                  Continue
                  <ArrowRight className="h-4 w-4 text-white" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: CONNECT */}
          {step === 2 && (
            <div className="mt-5 space-y-6 rounded-[12px] border border-[#d6d6e0] bg-white px-8 py-8 sm:px-10 sm:py-9">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h2 className="font-display text-[20px] font-bold text-[#0F172A]">
                    Connect{" "}
                    {
                      MCP_WIZARD_ASSISTANTS.find(
                        (a) => a.id === selectedAssistant
                      )?.label
                    }{" "}
                    to Flake MCP
                  </h2>
                  <p className="mt-1 text-[13px] text-[#475569]">
                    Paste this server URL or JSON configuration into your MCP
                    client, then verify live connectivity below.
                  </p>
                </div>

                <button
                  type="button"
                  data-no-glass="true"
                  onClick={() => void runLiveMcpTest()}
                  disabled={testingMcp}
                  className="inline-flex h-9 items-center gap-1.5 rounded-[8px] bg-[#0F172A] px-4 text-[12.5px] font-semibold text-white transition-colors hover:bg-[#1E293B] disabled:opacity-60"
                >
                  {testingMcp ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-white" />
                  ) : (
                    <Activity className="h-3.5 w-3.5 text-white" />
                  )}
                  Test MCP Connection
                </button>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 rounded-[10px] border border-[#C7D2FE] bg-[#EEF2FF]/60 px-4 py-3">
                <div className="flex min-w-0 items-center gap-2.5">
                  <Link2 className="h-4 w-4 shrink-0 text-[#475569]" />
                  <code className="font-mono truncate text-[12.5px] font-semibold text-[#0F172A]">
                    {MCP_SERVER_URL}
                  </code>
                </div>
                <button
                  type="button"
                  data-no-glass="true"
                  onClick={() => void copyText("endpoint", MCP_SERVER_URL)}
                  className="inline-flex h-7 items-center gap-1.5 rounded-[6px] border border-[#d6d6e0] bg-white px-3 text-[12px] font-medium text-[#0F172A]"
                >
                  {copiedId === "endpoint" ? (
                    <>
                      <Check className="h-3 w-3 text-[#0F172A]" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="h-3 w-3 text-[#475569]" />
                      Copy URL
                    </>
                  )}
                </button>
              </div>

              <div className="overflow-hidden rounded-[10px] border border-[#0F172A] bg-[#050811] text-white">
                <div className="flex items-center justify-between border-b border-white/10 px-4 py-2.5">
                  <div className="flex items-center gap-2 text-[12px] font-medium text-white/75">
                    <Code2 className="h-3.5 w-3.5 text-white/80" />
                    <span>mcp_config.json</span>
                  </div>
                  <button
                    type="button"
                    data-no-glass="true"
                    onClick={() => void copyText("config-json", mcpConfigJson)}
                    className="inline-flex items-center gap-1.5 rounded-[6px] bg-white/10 px-3 py-1 text-[11.5px] font-medium text-white transition-colors hover:bg-white/20"
                  >
                    {copiedId === "config-json" ? (
                      <>
                        <Check className="h-3 w-3 text-white" />
                        Copied config
                      </>
                    ) : (
                      <>
                        <Copy className="h-3 w-3 text-white" />
                        Copy JSON
                      </>
                    )}
                  </button>
                </div>
                <pre className="workspace-scroll overflow-x-auto p-4 font-mono text-[12px] leading-relaxed text-[#E2E8F0]">
                  {mcpConfigJson}
                </pre>
              </div>

              {probeResult && (
                <div
                  className={`rounded-[10px] border p-4 ${
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
                      <span className="text-[13px] font-bold text-[#0F172A]">
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
                    <p className="mt-2 text-[12.5px] text-[#92400E]">
                      {probeResult.error}
                    </p>
                  ) : (
                    <div className="mt-3 space-y-2">
                      <p className="text-[12px] font-medium text-[#475569]">
                        Protocol: {probeResult.protocol} ·{" "}
                        {probeResult.tools?.length || 0} tools discovered
                      </p>
                      {probeResult.tools && probeResult.tools.length > 0 && (
                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                          {probeResult.tools.map((t) => (
                            <div
                              key={t.name}
                              className="rounded-[8px] border border-[#ebebf3] bg-white p-2.5"
                            >
                              <code className="text-[11.5px] font-bold text-[#0027eb]">
                                {t.name}
                              </code>
                              <p className="mt-0.5 text-[11.5px] text-[#64748B]">
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

              <div className="flex items-center justify-between border-t border-[#ebebf3] pt-5">
                <button
                  type="button"
                  data-no-glass="true"
                  onClick={() => setStep(1)}
                  className="h-9 rounded-[8px] border border-[#d6d6e0] bg-white px-4 text-[13px] font-medium text-[#0F172A]"
                >
                  Back
                </button>
                <button
                  type="button"
                  data-no-glass="true"
                  onClick={() => {
                    setCompletedSteps((prev) => Math.max(prev, 2));
                    setStep(3);
                  }}
                  className="inline-flex h-10 items-center gap-2 rounded-[8px] bg-[#0027eb] px-6 text-[13.5px] font-semibold text-white hover:bg-[#001fc2]"
                >
                  Continue to Try it
                  <ArrowRight className="h-4 w-4 text-white" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: TRY IT */}
          {step === 3 && (
            <div className="mt-5 space-y-5 rounded-[12px] border border-[#d6d6e0] bg-white px-8 py-8 sm:px-10 sm:py-9">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="font-display text-[20px] font-bold text-[#0F172A]">
                    Try your first MCP prompt
                  </h2>
                  <p className="mt-1 text-[13px] text-[#475569]">
                    Copy a starter prompt into your assistant, then return to
                    Flake MCP overview.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {MCP_TODAY_PROMPTS.slice(0, 2).map((item) => {
                  const Icon = item.icon;
                  return (
                    <div
                      key={item.id}
                      className="flex flex-col justify-between gap-3.5 rounded-[12px] border border-[#ebebf3] bg-white p-5"
                    >
                      <div className="space-y-3">
                        <div className="flex items-center gap-3">
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[8px] bg-[#f5f5fa]">
                            <Icon className="h-4 w-4 text-[#475569]" />
                          </span>
                          <div>
                            <h3 className="text-[14px] font-bold text-[#0F172A]">
                              {item.title}
                            </h3>
                            <p className="text-[12px] text-[#64748B]">
                              {item.meta}
                            </p>
                          </div>
                        </div>
                        <p className="rounded-[8px] border border-[#ebebf3] bg-[#f5f5fa] p-3.5 font-mono text-[12px] leading-relaxed text-[#334155]">
                          {item.prompt}
                        </p>
                      </div>
                      <button
                        type="button"
                        data-no-glass="true"
                        onClick={() => void copyText(item.id, item.prompt)}
                        className="inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-[8px] border border-[#d6d6e0] bg-white text-[13px] font-medium text-[#0F172A] hover:border-[#0F172A]/40"
                      >
                        {copiedId === item.id ? (
                          <>
                            <Check className="h-3.5 w-3.5 text-[#0F172A]" />
                            Copied prompt
                          </>
                        ) : (
                          <>
                            <Copy className="h-3.5 w-3.5 text-[#475569]" />
                            Copy prompt
                          </>
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>

              <div className="flex items-center justify-between border-t border-[#ebebf3] pt-5">
                <button
                  type="button"
                  data-no-glass="true"
                  onClick={() => setStep(2)}
                  className="h-9 rounded-[8px] border border-[#d6d6e0] bg-white px-4 text-[13px] font-medium text-[#0F172A]"
                >
                  Back
                </button>
                <button
                  type="button"
                  data-no-glass="true"
                  onClick={() => {
                    setCompletedSteps(3);
                    setWizardOpen(false);
                  }}
                  className="inline-flex h-10 items-center gap-2 rounded-[8px] bg-[#0027eb] px-6 text-[13.5px] font-semibold text-white hover:bg-[#001fc2]"
                >
                  Finish setup
                  <Check className="h-4 w-4 text-white" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  /* --------------------------------------------------------------------------
     OVERVIEW MODE (1:1 ATRIA STEP 73 + STEP 75 REPLICA)
     -------------------------------------------------------------------------- */
  if (subView === "overview") {
    return (
      <div className="min-h-full bg-[#f5f5fa]">
        {/* Sticky White Header */}
        <div className="sticky top-0 z-10 border-b border-[#ebebf3] bg-white px-6 py-4">
          <h1 className="font-display text-[20px] font-bold tracking-tight text-[#0F172A]">
            Flake MCP overview
          </h1>
        </div>

        <div className="mx-auto max-w-[1160px] space-y-5 px-6 py-5 pb-16">
          {/* 1. COBALT-TINT HERO CARD */}
          <section className="rounded-[12px] border border-[#C7D2FE] bg-gradient-to-br from-[#EEF2FF] via-[#F7F9FF] to-[#EEF2FF]/75 p-6">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="text-[13px] font-semibold text-[#0027eb]">
                Model context protocol
              </span>
              <span className="inline-flex items-center gap-1 rounded-full border border-[#C7D2FE] bg-white px-2.5 py-0.5 text-[11.5px] font-medium text-[#0F172A]">
                <ShieldCheck className="h-3 w-3 text-[#475569]" />
                OAuth-secured
              </span>
            </div>

            <h2 className="font-display mt-2 text-[22px] font-bold tracking-tight text-[#0F172A]">
              Use Flake inside your AI assistant
            </h2>
            <p className="mt-1.5 max-w-[740px] text-[13.5px] leading-relaxed text-[#475569]">
              Make video and image ads, research competitors and read your ad
              accounts — right from Claude, ChatGPT, Cursor or any MCP-enabled
              agent. No API key, no code.
            </p>

            {/* 3 Slightly Tilted 48x48 AI Client Cards */}
            <div className="mt-4 flex items-center gap-3">
              <div className="flex h-12 w-12 -rotate-6 items-center justify-center rounded-[12px] border border-[#ebebf3] bg-white shadow-xs">
                <ClaudeBrandIcon className="h-6 w-6" />
              </div>
              <div className="-mt-2 flex h-12 w-12 rotate-3 items-center justify-center rounded-[12px] border border-[#ebebf3] bg-white shadow-xs">
                <ChatGptBrandIcon className="h-6 w-6" />
              </div>
              <div className="flex h-12 w-12 rotate-6 items-center justify-center rounded-[12px] border border-[#ebebf3] bg-white shadow-xs">
                <CursorBrandIcon className="h-6 w-6" />
              </div>
            </div>

            {/* Resume setup + progress bar */}
            <div className="mt-5 flex flex-wrap items-center gap-4">
              <button
                type="button"
                data-no-glass="true"
                onClick={() => setWizardOpen(true)}
                className="h-9 rounded-[8px] bg-[#0027eb] px-4 text-[13px] font-semibold text-white transition-colors hover:bg-[#001fc2]"
              >
                Resume setup
              </button>
              <div className="flex items-center gap-3">
                <div className="h-1.5 w-36 overflow-hidden rounded-full bg-[#DCE4FF]">
                  <div
                    className="h-full rounded-full bg-[#0027eb] transition-all"
                    style={{ width: `${(completedSteps / 3) * 100}%` }}
                  />
                </div>
                <span className="font-mono-num text-[12.5px] text-[#64748B]">
                  {completedSteps} of 3 setup steps done
                </span>
              </div>
            </div>

            {/* 7 Capability Tabs */}
            <div className="mt-5 flex flex-wrap items-center gap-1">
              {MCP_OVERVIEW_TABS.map((tab) => {
                const Icon = tab.icon;
                const active = activeCapTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    data-no-glass="true"
                    onClick={() => setActiveCapTab(tab.id)}
                    className={`inline-flex items-center gap-1.5 rounded-[6px] px-2.5 py-1.5 text-[12.5px] transition-colors ${
                      active
                        ? "border border-[#ebebf3] bg-white font-semibold text-[#0F172A] shadow-2xs"
                        : "border border-transparent font-medium text-[#475569] hover:text-[#0F172A]"
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5 text-[#475569]" />
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {/* Inner White Split Preview Card */}
            <div className="mt-3 grid grid-cols-1 items-center gap-6 rounded-[10px] border border-[#ebebf3] bg-white p-5 md:grid-cols-2">
              <div className="flex items-center justify-center gap-5 py-2">
                <div className="flex flex-col items-center">
                  <div className="h-[164px] w-[112px] rounded-[10px] border border-[#ebebf3] bg-[#ECEFF4]" />
                  <span className="mt-2 text-[11.5px] text-[#64748B]">
                    {activeTabSpec.leftLabel}
                  </span>
                </div>
                <ArrowRight className="h-4 w-4 shrink-0 text-[#475569]" />
                <div className="flex flex-col items-center">
                  <div className="flex h-[164px] w-[112px] items-center justify-center rounded-[10px] border border-[#C7D2FE] bg-gradient-to-br from-[#EEF2FF] to-white">
                    <SnowMark className="h-6 w-6 text-[#0027eb]/60" />
                  </div>
                  <span className="mt-2 text-[11.5px] text-[#64748B]">
                    {activeTabSpec.rightLabel}
                  </span>
                </div>
              </div>

              <div className="flex flex-col items-start justify-between gap-4">
                <div>
                  <h3 className="text-[15.5px] font-bold text-[#0F172A]">
                    {activeTabSpec.title}
                  </h3>
                  <p className="mt-2 text-[13.5px] leading-relaxed text-[#475569]">
                    {activeTabSpec.quote}
                  </p>
                </div>

                <div className="w-full space-y-2 pt-2">
                  <span className="inline-flex rounded-[4px] bg-[#f5f5fa] px-2 py-0.5 text-[11.5px] font-medium text-[#475569]">
                    {activeTabSpec.tag}
                  </span>
                  <div className="flex items-center gap-2 rounded-[8px] border border-[#ebebf3] bg-white px-3 py-2 font-mono text-[12px] text-[#475569]">
                    <Plug className="h-3.5 w-3.5 shrink-0 text-[#64748B]" />
                    <span className="truncate">{activeTabSpec.tool}</span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* 2. CONNECTED CLIENTS + USAGE & ALLOWANCES */}
          <section className="space-y-4 rounded-[12px] border border-[#ebebf3] bg-white p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-[15px] font-bold text-[#0F172A]">
                Connected clients
              </h2>
              <div className="inline-flex items-center rounded-[8px] border border-[#ebebf3] bg-[#f5f5fa] p-0.5">
                <button
                  type="button"
                  data-no-glass="true"
                  onClick={() => setClientScope("mine")}
                  className={`rounded-[6px] px-3 py-1 text-[12px] font-semibold transition-colors ${
                    clientScope === "mine"
                      ? "bg-white text-[#0F172A] shadow-2xs"
                      : "text-[#64748B] hover:text-[#0F172A]"
                  }`}
                >
                  Mine
                </button>
                <button
                  type="button"
                  data-no-glass="true"
                  onClick={() => setClientScope("workspace")}
                  className={`rounded-[6px] px-3 py-1 text-[12px] font-semibold transition-colors ${
                    clientScope === "workspace"
                      ? "bg-white text-[#0F172A] shadow-2xs"
                      : "text-[#64748B] hover:text-[#0F172A]"
                  }`}
                >
                  Workspace
                </button>
              </div>
            </div>

            <p className="text-[13px] text-[#64748B]">
              You have no connected clients in this workspace.
            </p>

            <div>
              <button
                type="button"
                data-no-glass="true"
                onClick={() => {
                  setStep(2);
                  setWizardOpen(true);
                }}
                className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-[#d6d6e0] bg-white px-4 py-2 text-[13px] font-medium text-[#0F172A] transition-colors hover:border-[#0027eb]"
              >
                <Plus className="h-3.5 w-3.5 text-[#475569]" />
                Connect a client
              </button>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#ebebf3] pt-3.5 text-[12.5px]">
              <div className="flex flex-wrap items-center gap-4">
                <span className="font-semibold text-[#0F172A]">
                  Usage &amp; allowances
                </span>
                <span className="font-mono-num text-[#64748B]">
                  MCP calls: 0 / 30 left
                </span>
                <span className="font-mono-num text-[#64748B]">
                  REST API calls: 0 / 30 left
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="rounded-full bg-[#f5f5fa] px-2.5 py-0.5 text-[11.5px] font-medium text-[#475569]">
                  Free plan
                </span>
                <button
                  type="button"
                  data-no-glass="true"
                  onClick={() => void runLiveMcpTest()}
                  disabled={testingMcp}
                  className="font-semibold text-[#0027eb] hover:underline"
                >
                  {testingMcp ? "Checking..." : "Upgrade plan"}
                </button>
              </div>
            </div>
          </section>

          {/* 3. WHAT YOU CAN DO TODAY */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-[16px] font-bold text-[#0F172A]">
                What you can do today
              </h2>
              <button
                type="button"
                data-no-glass="true"
                onClick={() => onSubViewChange("prompts")}
                className="inline-flex items-center gap-1 text-[13px] font-medium text-[#475569] hover:text-[#0F172A]"
              >
                Open prompt library
                <ChevronRight className="h-3.5 w-3.5 text-[#64748B]" />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {MCP_TODAY_PROMPTS.map((item) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.id}
                    className="flex flex-col justify-between gap-3.5 rounded-[12px] border border-[#ebebf3] bg-white p-5"
                  >
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[8px] bg-[#f5f5fa]">
                          <Icon className="h-4 w-4 text-[#475569]" />
                        </span>
                        <div className="min-w-0">
                          <h3 className="truncate text-[14px] font-bold text-[#0F172A]">
                            {item.title}
                          </h3>
                          <p className="text-[12px] text-[#64748B]">
                            {item.meta}
                          </p>
                        </div>
                      </div>
                      <p className="line-clamp-4 rounded-[8px] border border-[#ebebf3] bg-[#f5f5fa] p-3.5 font-mono text-[12px] leading-relaxed text-[#334155]">
                        {item.prompt}
                      </p>
                    </div>
                    <button
                      type="button"
                      data-no-glass="true"
                      onClick={() => void copyText(item.id, item.prompt)}
                      className="inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-[8px] border border-[#d6d6e0] bg-white text-[13px] font-medium text-[#0F172A] transition-colors hover:border-[#0F172A]/40"
                    >
                      {copiedId === item.id ? (
                        <>
                          <Check className="h-3.5 w-3.5 text-[#0F172A]" />
                          Copied prompt
                        </>
                      ) : (
                        <>
                          <Copy className="h-3.5 w-3.5 text-[#475569]" />
                          Copy prompt
                        </>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          </section>

          {/* 4. SKILL HUB (EXACT 5 ROWS + FOOTER LINK) */}
          <section className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-baseline gap-2.5">
                <h2 className="font-display text-[16px] font-bold text-[#0F172A]">
                  Skill Hub
                </h2>
                <span className="text-[12.5px] text-[#64748B]">
                  Switch one on and every connected assistant can run it.
                </span>
              </div>
              <button
                type="button"
                data-no-glass="true"
                onClick={() => onSubViewChange("skills")}
                className="inline-flex items-center gap-1 text-[13px] font-medium text-[#475569] hover:text-[#0F172A]"
              >
                View all skills
                <ChevronRight className="h-3.5 w-3.5 text-[#64748B]" />
              </button>
            </div>

            <div className="overflow-hidden rounded-[12px] border border-[#ebebf3] bg-white divide-y divide-[#ebebf3]">
              {MCP_OVERVIEW_SKILLS.map((skill) => {
                const Icon = skill.icon;
                return (
                  <div
                    key={skill.id}
                    className="flex items-center justify-between gap-4 px-5 py-3.5 transition-colors hover:bg-[#f5f5fa]/50"
                  >
                    <div className="flex min-w-0 items-center gap-3.5">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[8px] bg-[#f5f5fa]">
                        <Icon className="h-4 w-4 text-[#475569]" />
                      </span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[13.5px] font-bold text-[#0F172A]">
                            {skill.slug}
                          </span>
                          <Crown className="h-3.5 w-3.5 shrink-0 text-[#64748B]" />
                        </div>
                        <p className="truncate text-[12.5px] text-[#64748B]">
                          {skill.summary}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      data-no-glass="true"
                      onClick={() => onSubViewChange("skills")}
                      className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-[6px] border border-[#d6d6e0] bg-white px-3 text-[12.5px] font-medium text-[#0F172A] transition-colors hover:border-[#0027eb]"
                    >
                      <Zap className="h-3.5 w-3.5 text-[#475569]" />
                      Upgrade
                    </button>
                  </div>
                );
              })}

              <div className="bg-white px-5 py-3">
                <button
                  type="button"
                  data-no-glass="true"
                  onClick={() => onSubViewChange("skills")}
                  className="inline-flex items-center gap-1 text-[13px] font-medium text-[#475569] hover:text-[#0F172A]"
                >
                  15 more in the Skill Hub
                  <ChevronRight className="h-3.5 w-3.5 text-[#64748B]" />
                </button>
              </div>
            </div>
          </section>

          {/* 5. SERVER FOOTER BAR */}
          {renderServerFooter()}
        </div>
      </div>
    );
  }

  /* --------------------------------------------------------------------------
     PROMPT LIBRARY SUB-VIEW
     -------------------------------------------------------------------------- */
  if (subView === "prompts") {
    return (
      <div className="min-h-full bg-[#f5f5fa]">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[#ebebf3] bg-white px-6 py-4">
          <h1 className="font-display text-[20px] font-bold tracking-tight text-[#0F172A]">
            Prompt library
          </h1>
          <button
            type="button"
            data-no-glass="true"
            onClick={() => onSubViewChange("overview")}
            className="h-8 rounded-[8px] border border-[#d6d6e0] bg-white px-3 text-[12.5px] font-medium text-[#0F172A] hover:border-[#0027eb]"
          >
            Back to overview
          </button>
        </div>

        <div className="mx-auto max-w-[1160px] space-y-5 px-6 py-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {MCP_TODAY_PROMPTS.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.id}
                  className="flex flex-col justify-between gap-4 rounded-[12px] border border-[#ebebf3] bg-white p-5"
                >
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[8px] bg-[#f5f5fa]">
                        <Icon className="h-4 w-4 text-[#475569]" />
                      </span>
                      <div>
                        <h2 className="text-[14.5px] font-bold text-[#0F172A]">
                          {item.title}
                        </h2>
                        <p className="text-[12px] text-[#64748B]">
                          {item.meta}
                        </p>
                      </div>
                    </div>
                    <p className="rounded-[8px] border border-[#ebebf3] bg-[#f5f5fa] p-3.5 font-mono text-[12px] leading-relaxed text-[#334155]">
                      {item.prompt}
                    </p>
                  </div>

                  <button
                    type="button"
                    data-no-glass="true"
                    onClick={() => void copyText(item.id, item.prompt)}
                    className="inline-flex h-9 items-center justify-center gap-1.5 rounded-[8px] border border-[#d6d6e0] bg-white text-[13px] font-medium text-[#0F172A] hover:border-[#0F172A]/40"
                  >
                    {copiedId === item.id ? (
                      <>
                        <Check className="h-3.5 w-3.5 text-[#0F172A]" />
                        Copied prompt
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5 text-[#475569]" />
                        Copy prompt
                      </>
                    )}
                  </button>
                </div>
              );
            })}
          </div>

          {renderServerFooter()}
        </div>
      </div>
    );
  }

  /* --------------------------------------------------------------------------
     SKILL HUB SUB-VIEW
     -------------------------------------------------------------------------- */
  return (
    <div className="min-h-full bg-[#f5f5fa]">
      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[#ebebf3] bg-white px-6 py-4">
        <h1 className="font-display text-[20px] font-bold tracking-tight text-[#0F172A]">
          Skill Hub
        </h1>
        <button
          type="button"
          data-no-glass="true"
          onClick={() => onSubViewChange("overview")}
          className="h-8 rounded-[8px] border border-[#d6d6e0] bg-white px-3 text-[12.5px] font-medium text-[#0F172A] hover:border-[#0027eb]"
        >
          Back to overview
        </button>
      </div>

      <div className="mx-auto max-w-[1160px] space-y-5 px-6 py-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {MCP_OVERVIEW_SKILLS.map((skill) => {
            const Icon = skill.icon;
            return (
              <div
                key={skill.id}
                className="flex flex-col justify-between gap-4 rounded-[12px] border border-[#ebebf3] bg-white p-5"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="flex h-9 w-9 items-center justify-center rounded-[8px] bg-[#f5f5fa]">
                      <Icon className="h-4 w-4 text-[#475569]" />
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full border border-[#ebebf3] bg-[#f5f5fa] px-2.5 py-0.5 text-[11px] font-medium text-[#475569]">
                      <Crown className="h-3 w-3 text-[#64748B]" />
                      Pro Skill
                    </span>
                  </div>
                  <h2 className="font-display text-[15px] font-bold text-[#0F172A]">
                    {skill.slug}
                  </h2>
                  <p className="text-[12.5px] leading-relaxed text-[#475569]">
                    {skill.summary}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {skill.tools.map((t) => (
                      <code
                        key={t}
                        className="rounded-[4px] border border-[#ebebf3] bg-[#f5f5fa] px-2 py-0.5 text-[10.5px] font-medium text-[#334155]"
                      >
                        {t}
                      </code>
                    ))}
                  </div>
                  <pre className="overflow-x-auto rounded-[8px] bg-[#050811] p-3 font-mono text-[11px] leading-relaxed text-[#E2E8F0]">
                    {skill.instruction}
                  </pre>
                </div>

                <button
                  type="button"
                  data-no-glass="true"
                  onClick={() => void copyText(skill.id, skill.instruction)}
                  className="inline-flex h-9 items-center justify-center gap-1.5 rounded-[8px] border border-[#d6d6e0] bg-white text-[13px] font-medium text-[#0F172A] hover:border-[#0F172A]/40"
                >
                  {copiedId === skill.id ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-[#0F172A]" />
                      Copied skill
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5 text-[#475569]" />
                      Copy skill
                    </>
                  )}
                </button>
              </div>
            );
          })}
        </div>

        {renderServerFooter()}
      </div>
    </div>
  );
}
