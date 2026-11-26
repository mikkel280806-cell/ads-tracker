"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Bookmark,
  Check,
  ChevronRight,
  Clock,
  Copy,
  Download,
  FileText,
  Film,
  Filter,
  FolderOpen,
  Image as ImageIcon,
  Layers,
  Link2,
  Loader2,
  Mic,
  Package,
  Pause,
  Pencil,
  Play,
  Plus,
  Rocket,
  Sparkles,
  Upload,
  Video,
  Volume2,
  VolumeX,
  Wand2,
  X,
} from "lucide-react";
import {
  ATRIA_BRAND_SCENARIOS,
  ATRIA_IMAGE_TEMPLATES,
  ATRIA_PROMO_VIDEOS,
  ATRIA_TRENDING_VIDEOS,
  type AtriaImageTemplatePlaceholder,
  type AtriaTrendingVideoPlaceholder,
  type StudioSubTab,
} from "@/lib/atria-placeholders";
import type {
  BrandMemory,
  ClonedSourceAd,
  CreativeProject,
  MinedUrlInsights,
  StaticCloneLayoutId,
  VideoStylePresetId,
} from "@/lib/studio-types";
import {
  CREATOR_PERSONAS,
  VIDEO_STYLE_PRESETS,
  getPresetById,
} from "@/lib/snow-engine";

export type { StudioSubTab };

export interface StudioDraftTrigger {
  id: string;
  mode?: "video" | "static_clone";
  stylePresetId?: VideoStylePresetId;
  productTitle?: string;
  angle?: string;
  clonedFromAd?: ClonedSourceAd;
}

export interface VideoStudioViewProps {
  brandMemory: BrandMemory | null;
  projects: CreativeProject[];
  incomingTrigger: StudioDraftTrigger | null;
  initialSubTab?: StudioSubTab;
  onSubTabChange?: (tab: StudioSubTab) => void;
  onConsumeTrigger: () => void;
  onSaveProject: (proj: CreativeProject) => void;
  onQueueForLaunch: (proj: CreativeProject) => void;
  onSaveToSwipeFolder: (proj: CreativeProject) => void;
  onOpenBrandMemory: () => void;
}

const PRESET_META: Record<
  VideoStylePresetId,
  { title: string; shortLabel: string; tag: string; gradient: string }
> = {
  iphone_ugc: {
    title: "Realistic UGC",
    shortLabel: "Realistic UGC",
    tag: "RAW 9:16",
    gradient: "from-[#050811] via-[#0F172A] to-[#1E293B]",
  },
  claymation_moa: {
    title: "Claymation",
    shortLabel: "Claymation",
    tag: "12 FPS CLAY",
    gradient: "from-[#050811] via-[#1E293B] to-[#3B66FF]",
  },
  pixar_story: {
    title: "Pixar 3D",
    shortLabel: "Pixar 3D",
    tag: "3D STORY",
    gradient: "from-[#061238] via-[#0027eb] to-[#3B66FF]",
  },
  mini_drama: {
    title: "Mini-Drama",
    shortLabel: "Mini-Drama",
    tag: "PLOT TWIST",
    gradient: "from-[#050811] via-[#1E293B] to-[#475569]",
  },
  founder_authority: {
    title: "Founder POV",
    shortLabel: "Founder POV",
    tag: "AUTHORITY",
    gradient: "from-[#0F172A] via-[#334155] to-[#64748B]",
  },
  cinema_macro: {
    title: "Cinema Macro",
    shortLabel: "Cinema Macro",
    tag: "CINEMA",
    gradient: "from-[#020617] via-[#0F172A] to-[#0027eb]",
  },
};

const VIDEO_STYLE_CHIPS: Array<{ id: VideoStylePresetId; label: string }> = [
  { id: "iphone_ugc", label: "Realistic UGC" },
  { id: "claymation_moa", label: "Claymation" },
  { id: "pixar_story", label: "Pixar 3D" },
  { id: "mini_drama", label: "Mini-Drama" },
  { id: "founder_authority", label: "Founder POV" },
  { id: "cinema_macro", label: "Cinema Macro" },
];

const ATRIA_STYLE_FILTERS = [
  "All styles",
  "Realistic",
  "UGC / handheld",
  "Studio",
  "Cinematic",
  "2D animation",
  "3D / cartoon",
  "Anime",
  "Claymation / stop motion",
  "Motion graphics",
  "Screen recording",
  "Surreal",
] as const;

const IMAGE_TEMPLATE_CATEGORIES = [
  "All",
  "Trending",
  "Discount/Promotion",
  "Before/After",
  "UGC/Testimonial",
  "Product Demo",
  "Lifestyle",
  "Problem/Solution",
  "Feature Highlight",
] as const;

const SCRIPT_TEMPLATES = [
  {
    id: "pas",
    label: "PAS (Problem · Agitate · Solve)",
    snippet:
      "Hook with the daily frustration, agitate why generic fixes fail, then reveal the tactile hero upgrade and offer.",
  },
  {
    id: "three_reasons",
    label: "3 Reasons Why",
    snippet:
      "Fast-paced listicle: 3 reasons thousands switched this month, showing proof on screen for each beat.",
  },
  {
    id: "skeptic",
    label: "Skeptical Tester",
    snippet:
      "First-person honest review: 'I thought this was just another internet ad until week 2...'",
  },
  {
    id: "founder_pov",
    label: "Founder Story",
    snippet:
      "Direct-to-camera origin story explaining the material craftsmanship and why standard options compromise.",
  },
] as const;

const STATIC_LAYOUTS: Array<{ id: StaticCloneLayoutId; label: string }> = [
  { id: "callout_pointers", label: "3 Callouts" },
  { id: "us_vs_them", label: "Us vs. Them" },
  { id: "ugly_postit", label: "Post-It" },
  { id: "founder_quote", label: "Quote" },
  { id: "before_after", label: "Before / After" },
];

const TOP_SUBTABS: Array<{ id: StudioSubTab; label: string }> = [
  { id: "video", label: "Video Ads" },
  { id: "video_projects", label: "Video Projects" },
  { id: "media", label: "Media" },
  { id: "static", label: "Image Ads" },
  { id: "image_projects", label: "Image Projects" },
  { id: "miner", label: "AI Playground" },
];

interface MediaLibraryItem {
  id: string;
  kind: "image" | "video" | "audio";
  title: string;
  subtitle: string;
  url?: string;
  aspectRatio?: string;
  createdAt: string;
  project?: CreativeProject;
}

interface PlaygroundResultRow {
  id: string;
  title: string;
  hook: string;
  presetId: VideoStylePresetId;
  why: string;
  source: string;
  createdAt: string;
}

function buildClonedAdFromTrending(
  tv: AtriaTrendingVideoPlaceholder
): ClonedSourceAd {
  return {
    id: tv.id,
    brandName: tv.brandName,
    headline: tv.hookLine,
    primaryText: `${tv.styleTag} · ${tv.industry} · Active ${tv.activeDays} days`,
    mediaUrl: tv.thumbnailUrl,
    thumbnailUrl: tv.thumbnailUrl,
    activeDays: tv.activeDays,
  };
}

function exportStaticProjectPng(project: CreativeProject) {
  const dims =
    project.aspectRatio === "9:16"
      ? { w: 1080, h: 1920 }
      : project.aspectRatio === "1:1"
        ? { w: 1080, h: 1080 }
        : { w: 1080, h: 1350 };
  const canvas = document.createElement("canvas");
  canvas.width = dims.w;
  canvas.height = dims.h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.fillStyle = "#F7F8FB";
  ctx.fillRect(0, 0, dims.w, dims.h);
  ctx.fillStyle = "#0F172A";
  ctx.fillRect(0, 0, dims.w, 120);
  ctx.fillStyle = "#FFFFFF";
  ctx.font = "bold 40px sans-serif";
  ctx.fillText(project.brandName.toUpperCase(), 64, 74);
  ctx.fillStyle = "#0F172A";
  ctx.font = "bold 52px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(project.headline.slice(0, 32), dims.w / 2, 240);
  ctx.fillStyle = "#0027eb";
  ctx.fillRect(0, dims.h - 105, dims.w, 105);
  ctx.fillStyle = "#FFFFFF";
  ctx.font = "bold 36px sans-serif";
  ctx.fillText(project.ctaText.toUpperCase(), dims.w / 2, dims.h - 40);
  try {
    const link = document.createElement("a");
    link.download = `${project.brandName.toLowerCase().replace(/[^a-z0-9]/g, "-")}-${project.aspectRatio.replace(":", "x")}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  } catch {
    // ignore canvas error
  }
}

function StaticCanvasStage({
  project,
  onUpdateProject,
  onQueueForLaunch,
  onBack,
}: {
  project: CreativeProject;
  onUpdateProject: (patch: Partial<CreativeProject>) => void;
  onQueueForLaunch: (proj: CreativeProject) => void;
  onBack: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [editingText, setEditingText] = useState(false);

  const dims = useMemo(
    () =>
      project.aspectRatio === "9:16"
        ? { w: 1080, h: 1920 }
        : project.aspectRatio === "1:1"
          ? { w: 1080, h: 1080 }
          : { w: 1080, h: 1350 },
    [project.aspectRatio]
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = dims.w;
    canvas.height = dims.h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const draw = (prodImg?: HTMLImageElement | null) => {
      const { w, h } = dims;
      ctx.fillStyle =
        project.staticLayoutId === "ugly_postit" ? "#FEF3C7" : "#F7F8FB";
      ctx.fillRect(0, 0, w, h);

      ctx.fillStyle = "#0F172A";
      ctx.fillRect(0, 0, w, 120);
      ctx.fillStyle = "#FFFFFF";
      ctx.font = "bold 42px sans-serif";
      ctx.textAlign = "left";
      ctx.fillText(project.brandName.toUpperCase(), 64, 75);

      ctx.fillStyle = "#93B4D8";
      ctx.font = "bold 24px sans-serif";
      ctx.textAlign = "right";
      ctx.fillText(project.productPriceDkk || "BESTSELLER", w - 64, 72);

      ctx.textAlign = "center";
      ctx.fillStyle = "#0F172A";
      ctx.font = "bold 56px sans-serif";
      const words = project.headline.split(" ");
      let line1 = "";
      let line2 = "";
      for (const word of words) {
        if ((line1 + " " + word).trim().length <= 28 && !line2) {
          line1 = (line1 + " " + word).trim();
        } else {
          line2 = (line2 + " " + word).trim();
        }
      }
      ctx.fillText(line1, w / 2, 220);
      if (line2) ctx.fillText(line2.slice(0, 32), w / 2, 290);

      if (project.staticLayoutId === "us_vs_them") {
        const boxY = 360;
        const boxH = h - 540;
        const colW = (w - 150) / 2;

        ctx.fillStyle = "#FFFFFF";
        ctx.strokeStyle = "#0027eb";
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.roundRect(55, boxY, colW, boxH, 32);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = "#0027eb";
        ctx.font = "bold 36px sans-serif";
        ctx.fillText(project.brandName, 55 + colW / 2, boxY + 75);

        ctx.textAlign = "left";
        ctx.fillStyle = "#0F172A";
        ctx.font = "600 30px sans-serif";
        project.usPoints.slice(0, 4).forEach((pt, idx) => {
          ctx.fillText(`✓ ${pt.slice(0, 24)}`, 90, boxY + 170 + idx * 105);
        });

        ctx.fillStyle = "#F1F5F9";
        ctx.strokeStyle = "#CBD5E1";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.roundRect(55 + colW + 40, boxY, colW, boxH, 32);
        ctx.fill();
        ctx.stroke();

        ctx.textAlign = "center";
        ctx.fillStyle = "#64748B";
        ctx.font = "bold 36px sans-serif";
        ctx.fillText("Others", 55 + colW + 40 + colW / 2, boxY + 75);

        ctx.textAlign = "left";
        ctx.fillStyle = "#475569";
        ctx.font = "500 30px sans-serif";
        project.themPoints.slice(0, 4).forEach((pt, idx) => {
          ctx.fillText(
            `✕ ${pt.slice(0, 24)}`,
            90 + colW + 40,
            boxY + 170 + idx * 105
          );
        });
      } else {
        const imgBoxSize = Math.min(w - 220, h - 620);
        const imgX = (w - imgBoxSize) / 2;
        const imgY = 340;

        ctx.fillStyle = "#FFFFFF";
        ctx.strokeStyle = "#E2E6EF";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.roundRect(imgX, imgY, imgBoxSize, imgBoxSize, 36);
        ctx.fill();
        ctx.stroke();

        if (prodImg && prodImg.naturalWidth > 0) {
          ctx.save();
          ctx.beginPath();
          ctx.roundRect(
            imgX + 16,
            imgY + 16,
            imgBoxSize - 32,
            imgBoxSize - 32,
            26
          );
          ctx.clip();
          const scale = Math.min(
            (imgBoxSize - 32) / prodImg.naturalWidth,
            (imgBoxSize - 32) / prodImg.naturalHeight
          );
          const dw = prodImg.naturalWidth * scale;
          const dh = prodImg.naturalHeight * scale;
          ctx.drawImage(
            prodImg,
            imgX + (imgBoxSize - dw) / 2,
            imgY + (imgBoxSize - dh) / 2,
            dw,
            dh
          );
          ctx.restore();
        } else {
          ctx.fillStyle = "#64748B";
          ctx.font = "bold 40px sans-serif";
          ctx.textAlign = "center";
          ctx.fillText(
            project.productTitle.slice(0, 24),
            w / 2,
            imgY + imgBoxSize / 2
          );
        }

        const pillY = imgY + imgBoxSize + 36;
        project.callouts.slice(0, 3).forEach((c, idx) => {
          const py = pillY + idx * 78;
          ctx.fillStyle = idx === 0 ? "#0027eb" : "#0F172A";
          ctx.beginPath();
          ctx.roundRect(96, py, w - 192, 62, 18);
          ctx.fill();
          ctx.fillStyle = "#FFFFFF";
          ctx.font = "bold 28px sans-serif";
          ctx.textAlign = "center";
          ctx.fillText(`✓  ${c.slice(0, 40)}`, w / 2, py + 41);
        });
      }

      ctx.fillStyle = "#0027eb";
      ctx.fillRect(0, h - 105, w, 105);
      ctx.fillStyle = "#FFFFFF";
      ctx.font = "bold 36px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(
        `${project.ctaText.toUpperCase()}  ·  ${project.brandName.toUpperCase()}`,
        w / 2,
        h - 40
      );
    };

    const imgUrl = project.productImageUrl || project.clonedFromAd?.thumbnailUrl;
    if (!imgUrl) {
      draw(null);
      return;
    }
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => draw(img);
    img.onerror = () => draw(null);
    img.src = imgUrl;
  }, [project, dims]);

  const downloadPng = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    try {
      const link = document.createElement("a");
      link.download = `${project.brandName.toLowerCase().replace(/[^a-z0-9]/g, "-")}-${project.aspectRatio.replace(":", "x")}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    } catch {
      // ignore tainted canvas
    }
  };

  return (
    <div className="mx-auto max-w-[1040px] rounded-2xl border border-[#ECEFF5] bg-white p-6 shadow-[0_2px_12px_-4px_rgba(15,23,42,0.06)]">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-[#F1F5F9] pb-4">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 rounded-full border border-[#E6E9F0] bg-white px-3.5 py-1.5 text-xs font-semibold text-[#0F172A] hover:border-[#0027eb]"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Image Ads
        </button>

        <div className="flex flex-wrap items-center gap-1.5">
          {(["4:5", "9:16", "1:1"] as const).map((ratio) => (
            <button
              key={ratio}
              type="button"
              data-no-glass="true"
              onClick={() => onUpdateProject({ aspectRatio: ratio })}
              className={`rounded-full px-3 py-1 font-mono-num text-xs font-semibold transition-colors ${
                project.aspectRatio === ratio
                  ? "bg-[#0027eb] text-white"
                  : "border border-[#E6E9F0] bg-[#F7F8FB] text-[#475569] hover:text-[#0F172A]"
              }`}
            >
              {ratio}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col items-center justify-center space-y-5">
        <div className="flex flex-wrap items-center justify-center gap-1.5">
          {STATIC_LAYOUTS.map((l) => (
            <button
              key={l.id}
              type="button"
              data-no-glass="true"
              onClick={() => onUpdateProject({ staticLayoutId: l.id })}
              className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                project.staticLayoutId === l.id
                  ? "bg-[#0F172A] text-white"
                  : "border border-[#E6E9F0] bg-white text-[#475569] hover:text-[#0F172A]"
              }`}
            >
              {l.label}
            </button>
          ))}
          <button
            type="button"
            data-no-glass="true"
            onClick={() => setEditingText((v) => !v)}
            className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors ${
              editingText
                ? "border-[#0027eb] bg-[#EEF2FF] text-[#0027eb]"
                : "border-[#E6E9F0] bg-white text-[#475569] hover:text-[#0F172A]"
            }`}
          >
            <Pencil className="h-3 w-3" />
            Edit Text
          </button>
        </div>

        <canvas
          ref={canvasRef}
          className="max-h-[480px] w-auto rounded-2xl border border-[#E6E9F0] shadow-xl"
        />

        {editingText && (
          <div className="grid w-full max-w-lg grid-cols-1 gap-2 sm:grid-cols-2">
            <input
              type="text"
              value={project.headline}
              onChange={(e) => onUpdateProject({ headline: e.target.value })}
              placeholder="Headline"
              className="rounded-xl border border-[#DCE1EC] bg-white px-3 py-2 text-xs font-bold text-[#0F172A] outline-none focus:border-[#0027eb] sm:col-span-2"
            />
            {[0, 1].map((idx) => (
              <input
                key={idx}
                type="text"
                value={project.callouts[idx] || ""}
                onChange={(e) => {
                  const next = [...project.callouts];
                  next[idx] = e.target.value;
                  onUpdateProject({ callouts: next, usPoints: next });
                }}
                placeholder={`Callout ${idx + 1}`}
                className="rounded-xl border border-[#DCE1EC] bg-white px-3 py-2 text-xs text-[#0F172A] outline-none focus:border-[#0027eb]"
              />
            ))}
          </div>
        )}

        <div className="flex flex-wrap items-center justify-center gap-2.5">
          <button
            type="button"
            onClick={downloadPng}
            className="inline-flex items-center gap-1.5 rounded-full border border-[#DCE1EC] bg-white px-4 py-2 text-xs font-semibold text-[#0F172A] hover:border-[#0027eb]"
          >
            <Download className="h-3.5 w-3.5" />
            Download PNG
          </button>
          <button
            type="button"
            onClick={() =>
              onQueueForLaunch({ ...project, mode: "static_clone" })
            }
            className="adtrack-btn-primary inline-flex items-center gap-1.5 rounded-full px-5 py-2 text-xs font-semibold text-white"
          >
            <Rocket className="h-3.5 w-3.5" />
            Queue for Meta Launch
          </button>
        </div>
      </div>
    </div>
  );
}

export function VideoStudioView({
  brandMemory,
  projects,
  incomingTrigger,
  initialSubTab = "video",
  onSubTabChange,
  onConsumeTrigger,
  onSaveProject,
  onQueueForLaunch,
  onSaveToSwipeFolder,
  onOpenBrandMemory,
}: VideoStudioViewProps) {
  const [subTabState, setSubTabState] = useState<{
    base: StudioSubTab;
    tab: StudioSubTab;
    videoStage: "picker" | "stage";
    staticStage: "home" | "canvas";
  }>({
    base: initialSubTab,
    tab: initialSubTab,
    videoStage: "picker",
    staticStage: "home",
  });

  const subTab =
    subTabState.base === initialSubTab ? subTabState.tab : initialSubTab;
  const videoStageView =
    subTabState.base === initialSubTab ? subTabState.videoStage : "picker";
  const staticStageView =
    subTabState.base === initialSubTab ? subTabState.staticStage : "home";

  const setVideoStageView = (next: "picker" | "stage") =>
    setSubTabState((prev) => ({
      base: initialSubTab,
      tab: prev.base === initialSubTab ? prev.tab : initialSubTab,
      videoStage: next,
      staticStage: prev.base === initialSubTab ? prev.staticStage : "home",
    }));

  const setStaticStageView = (next: "home" | "canvas") =>
    setSubTabState((prev) => ({
      base: initialSubTab,
      tab: prev.base === initialSubTab ? prev.tab : initialSubTab,
      videoStage: prev.base === initialSubTab ? prev.videoStage : "picker",
      staticStage: next,
    }));

  // Video Ads (/workspace/video-ads) state
  const [videoMode, setVideoMode] = useState<"clone" | "script">("clone");
  const [trendingIndustry, setTrendingIndustry] = useState<string>(
    "All industries"
  );
  const [trendingStyle, setTrendingStyle] = useState<string>("All styles");
  const [scriptTemplateId, setScriptTemplateId] = useState<string>("pas");
  const [uploadedRefName, setUploadedRefName] = useState<string | null>(null);

  // Static / Image Ads (/workspace/image-ads) state
  const [staticFilterTab, setStaticFilterTab] = useState<
    "All" | "Clone" | "Iterate" | "Snow"
  >("All");
  const [templateModalOpen, setTemplateModalOpen] = useState(false);
  const [templateCategory, setTemplateCategory] = useState<string>("All");
  const [selectedTemplateIds, setSelectedTemplateIds] = useState<string[]>([]);
  const [modalAspectRatio, setModalAspectRatio] = useState<
    "4:5" | "9:16" | "1:1"
  >("4:5");
  const [modalProductTitle, setModalProductTitle] = useState<string>("");

  // Core studio controls & active project
  const [presetId, setPresetId] = useState<VideoStylePresetId>("iphone_ugc");
  const [productTitle, setProductTitle] = useState<string>("");
  const [aspectRatio, setAspectRatio] = useState<"9:16" | "4:5" | "1:1">("9:16");
  const [language, setLanguage] = useState<"da" | "en">("en");
  const [duration, setDuration] = useState<"15s" | "30s">("15s");
  const [creatorPersona, setCreatorPersona] = useState<string>(
    CREATOR_PERSONAS[0].id
  );
  const [noteInput, setNoteInput] = useState("");
  const [playing, setPlaying] = useState(true);
  const [sceneIdx, setSceneIdx] = useState(0);
  const [editingSceneIdx, setEditingSceneIdx] = useState<number | null>(null);
  const [speakAudio, setSpeakAudio] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [copiedBrief, setCopiedBrief] = useState(false);
  const [activeProject, setActiveProject] = useState<CreativeProject | null>(
    projects[0] || null
  );

  // Video Projects & Image Projects filters
  const [projDateFilter, setProjDateFilter] = useState<
    "all" | "today" | "7d"
  >("all");
  const [projBrandFilter, setProjBrandFilter] = useState<string>("all");
  const [projProductFilter, setProjProductFilter] = useState<string>("all");
  const [projStatusFilter, setProjStatusFilter] = useState<string>("all");
  const [mountNowMs] = useState<number>(() => Date.now());

  // Media sub-tab state
  const [mediaFilter, setMediaFilter] = useState<
    "All" | "Images" | "Videos" | "Audio"
  >("All");
  const [composerKind, setComposerKind] = useState<
    "Image" | "Video" | "Voice-over"
  >("Video");
  const [composerPrompt, setComposerPrompt] = useState("");
  const [composerRatio, setComposerRatio] = useState<"9:16" | "4:5" | "1:1">(
    "9:16"
  );
  const [composerModel, setComposerModel] = useState("Snow Video v2");
  const [composerRefLabel, setComposerRefLabel] = useState<string | null>(null);
  const [customMediaItems, setCustomMediaItems] = useState<MediaLibraryItem[]>(
    []
  );
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);

  // AI Playground (miner) state
  const [minerUrlOverride, setMinerUrlOverride] = useState<string | null>(null);
  const [minerReviews, setMinerReviews] = useState("");
  const [mining, setMining] = useState(false);
  const [playgroundResults, setPlaygroundResults] = useState<
    PlaygroundResultRow[]
  >([]);
  const [minedProductTitle, setMinedProductTitle] = useState<string>("");

  const activeBrandName = brandMemory?.brandName || "Arch & Pillar";
  const brandProducts = useMemo(
    () => brandMemory?.products || [],
    [brandMemory?.products]
  );
  const effectiveProductTitle = productTitle || brandProducts[0]?.title || "";
  const effectiveModalProductTitle =
    modalProductTitle || brandProducts[0]?.title || "";
  const minerUrl = minerUrlOverride ?? brandProducts[0]?.url ?? "";

  const switchSubTab = (
    next: StudioSubTab,
    opts?: { videoStage?: "picker" | "stage"; staticStage?: "home" | "canvas" }
  ) => {
    setSubTabState({
      base: initialSubTab,
      tab: next,
      videoStage: opts?.videoStage ?? (next === "video" ? "picker" : "picker"),
      staticStage: opts?.staticStage ?? (next === "static" ? "home" : "home"),
    });
    onSubTabChange?.(next);
  };

  const runGenerate = async (opts?: {
    overridePreset?: VideoStylePresetId;
    overrideMode?: "video" | "static_clone";
    overrideLayout?: StaticCloneLayoutId;
    overrideAspectRatio?: "9:16" | "4:5" | "1:1";
    overrideProduct?: string;
    overrideAngle?: string;
    overridePrompt?: string;
    clonedFromAd?: ClonedSourceAd;
    openStage?: boolean;
  }) => {
    setGenerating(true);
    const usePreset = opts?.overridePreset || presetId;
    const useMode =
      opts?.overrideMode || (subTab === "static" ? "static_clone" : "video");
    const useRatio =
      opts?.overrideAspectRatio ||
      (useMode === "static_clone" ? modalAspectRatio : aspectRatio);
    try {
      const res = await fetch("/api/video-studio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "generate_project",
          brandMemory,
          stylePresetId: usePreset,
          staticLayoutId: opts?.overrideLayout || "callout_pointers",
          mode: useMode,
          aspectRatio: useRatio,
          language,
          creatorPersona,
          productTitle:
            opts?.overrideProduct ||
            effectiveProductTitle ||
            `${activeBrandName} Hero`,
          angle: opts?.overrideAngle || undefined,
          userPrompt: opts?.overridePrompt ?? (noteInput || undefined),
          clonedFromAd: opts?.clonedFromAd,
        }),
      });
      const data = await res.json();
      if (res.ok && data?.ok && data.project) {
        const proj = data.project as CreativeProject;
        setActiveProject(proj);
        setSceneIdx(0);
        setEditingSceneIdx(null);
        onSaveProject(proj);
        if (opts?.openStage !== false) {
          if (useMode === "static_clone") {
            switchSubTab("static", { staticStage: "canvas" });
          } else {
            switchSubTab("video", { videoStage: "stage" });
          }
        }
        return proj;
      }
    } finally {
      setGenerating(false);
    }
    return null;
  };

  useEffect(() => {
    if (!incomingTrigger) return;
    let cancelled = false;
    Promise.resolve().then(() => {
      if (cancelled) return;
      const targetTab: StudioSubTab =
        incomingTrigger.mode === "static_clone" ? "static" : "video";
      switchSubTab(targetTab);
      if (incomingTrigger.stylePresetId) {
        setPresetId(incomingTrigger.stylePresetId);
      }
      if (incomingTrigger.productTitle) {
        setProductTitle(incomingTrigger.productTitle);
      }
      void runGenerate({
        overridePreset: incomingTrigger.stylePresetId || presetId,
        overrideMode: incomingTrigger.mode || "video",
        overrideProduct: incomingTrigger.productTitle,
        overrideAngle: incomingTrigger.angle,
        clonedFromAd: incomingTrigger.clonedFromAd,
        openStage: true,
      });
      onConsumeTrigger();
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [incomingTrigger?.id]);

  const activePreset = getPresetById(activeProject?.stylePresetId || presetId);
  const currentPresetMeta = PRESET_META[presetId];

  const activeHook = useMemo(() => {
    if (!activeProject) return null;
    return (
      activeProject.hooks.find((h) => h.id === activeProject.selectedHookId) ||
      activeProject.hooks[0] ||
      null
    );
  }, [activeProject]);

  const displayScenes = useMemo(() => {
    if (!activeProject) return [];
    return activeProject.scenes.map((sc, i) =>
      i === 0 && activeHook
        ? {
            ...sc,
            spokenLine: activeHook.spokenHook,
            onScreenCaption: activeHook.onScreenText,
          }
        : sc
    );
  }, [activeProject, activeHook]);

  const currentScene = displayScenes[sceneIdx] || displayScenes[0];

  useEffect(() => {
    if (
      !playing ||
      displayScenes.length === 0 ||
      videoStageView !== "stage" ||
      subTab !== "video"
    ) {
      return;
    }
    const timer = window.setInterval(() => {
      setSceneIdx((prev) => (prev + 1) % displayScenes.length);
    }, 3400);
    return () => window.clearInterval(timer);
  }, [playing, displayScenes.length, videoStageView, subTab]);

  useEffect(() => {
    if (
      !speakAudio ||
      typeof window === "undefined" ||
      !("speechSynthesis" in window)
    ) {
      return;
    }
    window.speechSynthesis.cancel();
    if (!currentScene?.spokenLine) return;
    const u = new SpeechSynthesisUtterance(currentScene.spokenLine);
    u.lang = activeProject?.language === "da" ? "da-DK" : "en-US";
    u.rate = 1.04;
    window.speechSynthesis.speak(u);
    return () => window.speechSynthesis.cancel();
  }, [speakAudio, currentScene?.spokenLine, activeProject?.language]);

  const updateActive = (patch: Partial<CreativeProject>) => {
    if (!activeProject) return;
    const updated: CreativeProject = { ...activeProject, ...patch };
    setActiveProject(updated);
    onSaveProject(updated);
  };

  const copyBriefText = async () => {
    if (!activeProject) return;
    const text = [
      activeProject.title,
      ...activeProject.scenes.map(
        (s) => `[${s.timeRange}] "${s.spokenLine}" (${s.onScreenCaption})`
      ),
      activeProject.headline,
      activeProject.primaryText,
    ].join("\n\n");
    await navigator.clipboard.writeText(text).catch(() => {});
    setCopiedBrief(true);
    setTimeout(() => setCopiedBrief(false), 1600);
  };

  const runMineUrl = async () => {
    if (!minerUrl.trim() && !minerReviews.trim()) return;
    setMining(true);
    try {
      const res = await fetch("/api/video-studio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "mine_url",
          brandMemory,
          url: minerUrl.trim(),
          rawReviews: minerReviews.trim(),
        }),
      });
      const data = await res.json();
      if (res.ok && data?.ok && data.insights) {
        const insights = data.insights as MinedUrlInsights;
        setMinedProductTitle(insights.title);
        const now = new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        });
        const newRows: PlaygroundResultRow[] = insights.recommendedAngles.map(
          (ang, idx) => ({
            id: `mine-${Date.now()}-${idx}`,
            title: ang.title,
            hook: ang.hook,
            presetId: ang.presetId,
            why: ang.why,
            source: insights.url.replace(/^https?:\/\//, "").slice(0, 32),
            createdAt: now,
          })
        );
        setPlaygroundResults((prev) => [...newRows, ...prev]);
      }
    } finally {
      setMining(false);
    }
  };

  const generateBrandAdIdeas = () => {
    const heroProduct = effectiveProductTitle || activeBrandName;
    const usp = brandMemory?.usps[0] || "clean daily craft";
    const pain = brandMemory?.painPoints[0] || "daily friction";
    const desire = brandMemory?.desires[0] || "effortless results";
    const now = new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
    const ideas: PlaygroundResultRow[] = [
      {
        id: `idea-${Date.now()}-1`,
        title: `3-Second Problem Pattern Interrupt`,
        hook: `Stop settling for ${pain.toLowerCase()} — watch what changed with ${heroProduct}.`,
        presetId: "iphone_ugc",
        why: `Hits thumbstop quickly with raw handheld framing for ${activeBrandName}.`,
        source: "Brand Memory · AI Ideas",
        createdAt: now,
      },
      {
        id: `idea-${Date.now()}-2`,
        title: `Visual Mechanism Breakdown`,
        hook: `Look inside how ${heroProduct} delivers ${desire.toLowerCase()} from day one.`,
        presetId: "claymation_moa",
        why: `Demonstrates ${usp.toLowerCase()} visually in the first 3 seconds.`,
        source: "Brand Memory · AI Ideas",
        createdAt: now,
      },
      {
        id: `idea-${Date.now()}-3`,
        title: `Founder Guarantee & Proof`,
        hook: `Why we engineered ${heroProduct} with ${usp.toLowerCase()} — and zero compromises.`,
        presetId: "founder_authority",
        why: "Builds immediate trust for high-AOV cold traffic prospecting.",
        source: "Brand Memory · AI Ideas",
        createdAt: now,
      },
    ];
    setMinedProductTitle(heroProduct);
    setPlaygroundResults((prev) => [...ideas, ...prev]);
  };

  const trendingIndustries = useMemo(() => {
    const unique = Array.from(
      new Set(ATRIA_TRENDING_VIDEOS.map((tv) => tv.industry))
    );
    return ["All industries", ...unique];
  }, []);

  const filteredTrendingVideos = useMemo(() => {
    return ATRIA_TRENDING_VIDEOS.filter((tv) => {
      const industryOk =
        trendingIndustry === "All industries" ||
        tv.industry === trendingIndustry;
      const styleOk =
        trendingStyle === "All styles" || tv.styleTag === trendingStyle;
      return industryOk && styleOk;
    });
  }, [trendingIndustry, trendingStyle]);

  const filteredImageTemplates = useMemo(() => {
    if (templateCategory === "All") return ATRIA_IMAGE_TEMPLATES;
    return ATRIA_IMAGE_TEMPLATES.filter((t) => t.category === templateCategory);
  }, [templateCategory]);

  const toggleTemplateSelection = (id: string) => {
    setSelectedTemplateIds((prev) => {
      if (prev.includes(id)) return prev.filter((item) => item !== id);
      if (prev.length >= 10) return prev;
      return [...prev, id];
    });
  };

  const handleGenerateFromTemplates = async () => {
    const firstSelected: AtriaImageTemplatePlaceholder =
      ATRIA_IMAGE_TEMPLATES.find((t) => selectedTemplateIds.includes(t.id)) ||
      ATRIA_IMAGE_TEMPLATES[0];
    setTemplateModalOpen(false);
    await runGenerate({
      overrideMode: "static_clone",
      overrideLayout: firstSelected.layoutId,
      overrideAspectRatio: modalAspectRatio,
      overrideProduct: effectiveModalProductTitle || effectiveProductTitle,
      overrideAngle: firstSelected.title,
      clonedFromAd: {
        id: firstSelected.id,
        brandName: activeBrandName,
        headline: firstSelected.title,
        primaryText: `${firstSelected.category} template cloned for ${activeBrandName}`,
        mediaUrl: firstSelected.thumbnailUrl,
        thumbnailUrl: firstSelected.thumbnailUrl,
        activeDays: 42,
      },
      openStage: true,
    });
  };

  // Filtered projects for video_projects & image_projects
  const projectFilterOptions = useMemo(() => {
    const brands = Array.from(new Set(projects.map((p) => p.brandName)));
    const prods = Array.from(new Set(projects.map((p) => p.productTitle)));
    return { brands, prods };
  }, [projects]);

  const filterProjectsList = (modeFilter: "video" | "static" | "all") => {
    return projects.filter((p) => {
      if (modeFilter === "video" && p.mode === "static_clone") return false;
      if (modeFilter === "static" && p.mode !== "static_clone") return false;
      if (projBrandFilter !== "all" && p.brandName !== projBrandFilter)
        return false;
      if (projProductFilter !== "all" && p.productTitle !== projProductFilter)
        return false;
      if (projStatusFilter !== "all" && p.status !== projStatusFilter)
        return false;
      if (projDateFilter !== "all") {
        const createdMs = Date.parse(p.createdAt);
        if (!Number.isNaN(createdMs)) {
          const diffDays = (mountNowMs - createdMs) / (1000 * 60 * 60 * 24);
          if (projDateFilter === "today" && diffDays > 1) return false;
          if (projDateFilter === "7d" && diffDays > 7) return false;
        }
      }
      return true;
    });
  };

  // Media items combined from projects, brand memory, scenarios, and custom composer generations
  const allMediaItems = useMemo<MediaLibraryItem[]>(() => {
    const items: MediaLibraryItem[] = [...customMediaItems];
    for (const p of projects) {
      items.push({
        id: `proj-${p.id}`,
        kind: p.mode === "static_clone" ? "image" : "video",
        title: p.title,
        subtitle: `${p.brandName} · ${p.aspectRatio}`,
        url: p.productImageUrl || p.clonedFromAd?.thumbnailUrl,
        aspectRatio: p.aspectRatio,
        createdAt: p.createdAt,
        project: p,
      });
    }
    for (const prod of brandProducts) {
      if (prod.image_url) {
        items.push({
          id: `prod-${prod.title}`,
          kind: "image",
          title: prod.title,
          subtitle: `${activeBrandName} · Product Asset`,
          url: prod.image_url,
          aspectRatio: "1:1",
          createdAt: brandMemory?.scrapedAt || "",
        });
      }
    }
    for (const scn of ATRIA_BRAND_SCENARIOS) {
      items.push({
        id: `scn-${scn.id}`,
        kind: "image",
        title: scn.title,
        subtitle: scn.hookAngle,
        url: scn.imageUrl,
        aspectRatio: "4:5",
        createdAt: "",
      });
    }
    if (projects[0]?.hooks[0]) {
      items.push({
        id: `vo-${projects[0].id}`,
        kind: "audio",
        title: `${projects[0].productTitle} · Hook Voice-Over`,
        subtitle: projects[0].hooks[0].spokenHook,
        createdAt: projects[0].createdAt,
        project: projects[0],
      });
    }
    return items;
  }, [customMediaItems, projects, brandProducts, activeBrandName, brandMemory?.scrapedAt]);

  const filteredMediaItems = useMemo(() => {
    if (mediaFilter === "All") return allMediaItems;
    if (mediaFilter === "Images")
      return allMediaItems.filter((m) => m.kind === "image");
    if (mediaFilter === "Videos")
      return allMediaItems.filter((m) => m.kind === "video");
    return allMediaItems.filter((m) => m.kind === "audio");
  }, [allMediaItems, mediaFilter]);

  const handleComposerGenerate = async () => {
    const promptText =
      composerPrompt.trim() ||
      `High-converting ${composerKind.toLowerCase()} creative for ${productTitle || activeBrandName}`;
    if (composerKind === "Voice-over") {
      const id = `vo-${Date.now()}`;
      setCustomMediaItems((prev) => [
        {
          id,
          kind: "audio",
          title: `Voice-over · ${productTitle || activeBrandName}`,
          subtitle: promptText,
          createdAt: new Date().toISOString(),
        },
        ...prev,
      ]);
      setComposerPrompt("");
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(promptText);
        u.lang = "en-US";
        window.speechSynthesis.speak(u);
      }
      return;
    }

    const proj = await runGenerate({
      overrideMode: composerKind === "Image" ? "static_clone" : "video",
      overrideAspectRatio: composerRatio,
      overridePrompt: promptText,
      openStage: false,
    });
    if (proj) {
      setCustomMediaItems((prev) => [
        {
          id: `gen-${Date.now()}`,
          kind: composerKind === "Image" ? "image" : "video",
          title: proj.title,
          subtitle: `${composerModel} · ${composerRatio}`,
          url: proj.productImageUrl || brandProducts[0]?.image_url,
          aspectRatio: composerRatio,
          createdAt: proj.createdAt,
          project: proj,
        },
        ...prev,
      ]);
      setComposerPrompt("");
    }
  };

  const previewProductImage =
    activeProject?.productImageUrl ||
    brandProducts[0]?.image_url ||
    activeProject?.clonedFromAd?.thumbnailUrl;

  const backdropStyle =
    (activeProject?.stylePresetId || presetId) === "claymation_moa"
      ? "from-[#050811] via-[#1E293B] to-[#3B66FF]"
      : (activeProject?.stylePresetId || presetId) === "pixar_story"
        ? "from-[#061238] via-[#0027eb]/85 to-[#3B66FF]"
        : (activeProject?.stylePresetId || presetId) === "cinema_macro"
          ? "from-[#020617] via-[#0F172A] to-[#0027eb]"
          : "from-[#050811] via-[#1E293B] to-[#334155]";

  return (
    <div className="space-y-5 pb-10">
      {/* Compact Top Sub-Tab Switcher (for mobile / collapsed sidebar / fast switching) */}
      <div className="mx-auto flex max-w-[1160px] flex-wrap items-center justify-between gap-3">
        <div className="no-scrollbar flex max-w-full items-center gap-1 overflow-x-auto rounded-full border border-[#E6E9F0] bg-white p-1 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
          {TOP_SUBTABS.map((t) => {
            const active = subTab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                data-no-glass="true"
                onClick={() => switchSubTab(t.id)}
                className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                  active
                    ? "bg-[#050811] text-white"
                    : "text-[#64748B] hover:text-[#0F172A]"
                }`}
              >
                {t.label}
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={onOpenBrandMemory}
          className="inline-flex items-center gap-2 rounded-full border border-[#E6E9F0] bg-white px-3.5 py-1.5 text-xs font-semibold text-[#0F172A] hover:border-[#0027eb]"
        >
          <span className="h-2 w-2 rounded-full bg-[#0027eb]" />
          {activeBrandName}
        </button>
      </div>

      {/* =====================================================================
          SUB-TAB 1: VIDEO ADS (/workspace/video-ads) + INTERACTIVE VIDEO STAGE
         ===================================================================== */}
      {subTab === "video" && videoStageView === "picker" && (
        <div className="mx-auto max-w-[1160px] space-y-10">
          {/* Top Hero with Subtle Cobalt Dot-Grid Wash */}
          <div className="relative overflow-hidden rounded-3xl border border-[#ECEFF5] bg-white px-6 py-9 sm:px-10 sm:py-11">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-0 top-0 h-56 opacity-65"
              style={{
                backgroundImage:
                  "radial-gradient(rgba(0, 39, 235, 0.14) 1px, transparent 1px)",
                backgroundSize: "18px 18px",
                maskImage:
                  "linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 100%)",
                WebkitMaskImage:
                  "linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 100%)",
              }}
            />

            <div className="relative z-10 mx-auto max-w-4xl">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h1 className="font-geist-serif text-[34px] leading-[1.12] tracking-tight text-[#0F172A] sm:text-[42px]">
                  What winning ad will you make?
                </h1>
                {activeProject && activeProject.mode !== "static_clone" && (
                  <button
                    type="button"
                    onClick={() => setVideoStageView("stage")}
                    className="inline-flex items-center gap-1.5 rounded-full border border-[#DCE4FF] bg-[#EEF2FF] px-3.5 py-1.5 text-xs font-semibold text-[#0027eb]"
                    data-no-glass="true"
                  >
                    <Play className="h-3 w-3" />
                    Resume active project
                  </button>
                )}
              </div>

              {/* 2 Large Radio-Card Mode Selectors */}
              <div className="mt-7 grid grid-cols-1 gap-4 md:grid-cols-2">
                {/* Card 1: Clone an ad */}
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => setVideoMode("clone")}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") setVideoMode("clone");
                  }}
                  className={`group cursor-pointer rounded-2xl border p-5 text-left transition-all ${
                    videoMode === "clone"
                      ? "border-[#0027eb] bg-white ring-2 ring-[#0027eb]/15 shadow-[0_8px_24px_-8px_rgba(0,39,235,0.14)]"
                      : "border-[#E6E9F0] bg-[#FAFBFD] hover:border-[#CBD5E1]"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <span
                        className={`flex h-5 w-5 items-center justify-center rounded-full border ${
                          videoMode === "clone"
                            ? "border-[#0027eb] bg-[#0027eb]"
                            : "border-[#CBD5E1] bg-white"
                        }`}
                      >
                        {videoMode === "clone" && (
                          <span className="h-2 w-2 rounded-full bg-white" />
                        )}
                      </span>
                      <span className="font-display text-[15px] font-bold text-[#0F172A]">
                        Clone an ad
                      </span>
                      <span className="rounded-full bg-[#EEF2FF] px-2.5 py-0.5 text-[10px] font-bold tracking-wide text-[#0027eb]">
                        NO SCRIPT NEEDED
                      </span>
                    </div>
                  </div>
                  <p className="mt-2.5 pl-7 text-xs leading-relaxed text-[#64748B]">
                    Pick any ad below or upload your own. Snow remakes it for
                    your product.
                  </p>
                  {videoMode === "clone" && (
                    <div className="mt-4 flex flex-wrap items-center gap-2 pl-7">
                      <label
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-[#DCE1EC] bg-white px-3 py-1.5 text-[11px] font-semibold text-[#0F172A] hover:border-[#0027eb]"
                      >
                        <Upload className="h-3 w-3 text-[#0027eb]" />
                        {uploadedRefName ? uploadedRefName : "Upload reference video"}
                        <input
                          type="file"
                          accept="video/*,image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) setUploadedRefName(file.name);
                          }}
                        />
                      </label>
                      {uploadedRefName && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            void runGenerate({
                              overrideMode: "video",
                              overrideAngle: `Cloned from ${uploadedRefName}`,
                              openStage: true,
                            });
                          }}
                          className="adtrack-btn-primary inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[11px] font-semibold text-white"
                        >
                          Remake Upload
                          <ArrowRight className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Card 2: Start from a script */}
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => setVideoMode("script")}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") setVideoMode("script");
                  }}
                  className={`group cursor-pointer rounded-2xl border p-5 text-left transition-all ${
                    videoMode === "script"
                      ? "border-[#0027eb] bg-white ring-2 ring-[#0027eb]/15 shadow-[0_8px_24px_-8px_rgba(0,39,235,0.14)]"
                      : "border-[#E6E9F0] bg-[#FAFBFD] hover:border-[#CBD5E1]"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <span
                        className={`flex h-5 w-5 items-center justify-center rounded-full border ${
                          videoMode === "script"
                            ? "border-[#0027eb] bg-[#0027eb]"
                            : "border-[#CBD5E1] bg-white"
                        }`}
                      >
                        {videoMode === "script" && (
                          <span className="h-2 w-2 rounded-full bg-white" />
                        )}
                      </span>
                      <span className="font-display text-[15px] font-bold text-[#0F172A]">
                        Start from a script
                      </span>
                    </div>
                  </div>
                  <p className="mt-2.5 pl-7 text-xs leading-relaxed text-[#64748B]">
                    Paste or generate your script.
                  </p>
                </div>
              </div>

              {/* Expanded Script Composer Panel when Card 2 is active */}
              {videoMode === "script" && (
                <div className="mt-4 rounded-2xl border border-[#DCE4FF] bg-[#F7F8FB] p-5 shadow-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs font-bold text-[#0F172A]">
                      Script & Creative Brief
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        const prod =
                          effectiveProductTitle ||
                          "our hero product";
                        setNoteInput(
                          `[0-3s Hook]: I used to spend 8 hours at my desk with lower-back stiffness until I switched to ${prod}.\n[3-8s Problem]: Standard chairs lock your spine and drain afternoon focus.\n[8-16s Demo]: ${activeBrandName} encourages micro-movement with a weighted anti-roll base.\n[16-22s CTA]: Try it risk-free for 30 days.`
                        );
                      }}
                      className="inline-flex items-center gap-1.5 rounded-full border border-[#DCE4FF] bg-white px-3 py-1 text-[11px] font-semibold text-[#0027eb] hover:bg-[#EEF2FF]"
                      data-no-glass="true"
                    >
                      <Sparkles className="h-3 w-3" />
                      Try an example script
                    </button>
                  </div>

                  <textarea
                    rows={4}
                    value={noteInput}
                    onChange={(e) => setNoteInput(e.target.value)}
                    placeholder="Paste your hook + talking points or describe the angle you want Snow to direct..."
                    className="mt-3 w-full resize-none rounded-xl border border-[#DCE1EC] bg-white p-3.5 text-xs leading-relaxed text-[#0F172A] outline-none placeholder:text-[#94A3B8] focus:border-[#0027eb]"
                  />

                  {/* Script template pill selector */}
                  <div className="mt-3">
                    <p className="mb-1.5 text-[11px] font-semibold text-[#64748B]">
                      Script template
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {SCRIPT_TEMPLATES.map((tpl) => {
                        const active = scriptTemplateId === tpl.id;
                        return (
                          <button
                            key={tpl.id}
                            type="button"
                            data-no-glass="true"
                            onClick={() => {
                              setScriptTemplateId(tpl.id);
                              if (!noteInput.trim()) {
                                setNoteInput(tpl.snippet);
                              }
                            }}
                            className={`rounded-full px-3 py-1 text-[11px] font-semibold transition-colors ${
                              active
                                ? "bg-[#0027eb] text-white"
                                : "border border-[#E6E9F0] bg-white text-[#475569] hover:text-[#0F172A]"
                            }`}
                          >
                            {tpl.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Brand, Product, Style, Ratio & Start CTA */}
                  <div className="mt-4 grid grid-cols-1 gap-3 border-t border-[#E6E9F0] pt-4 sm:grid-cols-2 lg:grid-cols-4">
                    <div className="rounded-xl border border-[#E6E9F0] bg-white px-3 py-2">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-[#94A3B8]">
                        Brand
                      </p>
                      <button
                        type="button"
                        onClick={onOpenBrandMemory}
                        className="mt-0.5 flex w-full items-center justify-between text-xs font-bold text-[#0F172A] hover:text-[#0027eb]"
                      >
                        <span className="truncate">{activeBrandName}</span>
                        <ChevronRight className="h-3.5 w-3.5 text-[#94A3B8]" />
                      </button>
                    </div>

                    <div className="rounded-xl border border-[#E6E9F0] bg-white px-3 py-2">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-[#94A3B8]">
                        Product
                      </p>
                      {brandProducts.length > 0 ? (
                        <select
                          value={effectiveProductTitle}
                          onChange={(e) => setProductTitle(e.target.value)}
                          className="mt-0.5 w-full bg-transparent text-xs font-bold text-[#0F172A] outline-none"
                        >
                          {brandProducts.map((p, idx) => (
                            <option key={idx} value={p.title}>
                              {p.title}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <p className="mt-0.5 text-xs font-bold text-[#0F172A]">
                          {activeBrandName} Hero
                        </p>
                      )}
                    </div>

                    <div className="rounded-xl border border-[#E6E9F0] bg-white px-3 py-2">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-[#94A3B8]">
                        Aspect Ratio
                      </p>
                      <div className="mt-1 flex items-center gap-1.5">
                        {(["9:16", "4:5"] as const).map((r) => (
                          <button
                            key={r}
                            type="button"
                            data-no-glass="true"
                            onClick={() => setAspectRatio(r)}
                            className={`rounded-full px-2.5 py-0.5 font-mono-num text-[11px] font-bold transition-colors ${
                              aspectRatio === r
                                ? "bg-[#0F172A] text-white"
                                : "bg-[#F3F5F9] text-[#64748B] hover:text-[#0F172A]"
                            }`}
                          >
                            {r}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-end">
                      <button
                        type="button"
                        disabled={generating}
                        onClick={() =>
                          void runGenerate({
                            overrideMode: "video",
                            overridePreset: presetId,
                            overrideAngle:
                              SCRIPT_TEMPLATES.find(
                                (t) => t.id === scriptTemplateId
                              )?.label || undefined,
                            openStage: true,
                          })
                        }
                        className="adtrack-btn-primary flex h-[46px] w-full items-center justify-center gap-2 rounded-xl text-xs font-bold text-white disabled:opacity-60"
                      >
                        {generating ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Generating...
                          </>
                        ) : (
                          <>
                            Start
                            <ArrowRight className="h-3.5 w-3.5" />
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Style Pills */}
                  <div className="mt-3">
                    <p className="mb-1.5 text-[11px] font-semibold text-[#64748B]">
                      Style
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {VIDEO_STYLE_CHIPS.map((s) => (
                        <button
                          key={s.id}
                          type="button"
                          data-no-glass="true"
                          onClick={() => setPresetId(s.id)}
                          className={`rounded-full px-3 py-1 text-[11px] font-semibold transition-colors ${
                            presetId === s.id
                              ? "bg-[#0027eb] text-white"
                              : "border border-[#E6E9F0] bg-white text-[#475569] hover:text-[#0F172A]"
                          }`}
                        >
                          {s.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Clone a trending video ad Section */}
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-display text-lg font-bold text-[#0F172A]">
                  Clone a trending video ad
                </h2>
                <p className="text-xs text-[#64748B]">
                  High-performing vertical winners ready to adapt for{" "}
                  {activeBrandName}.
                </p>
              </div>

              <select
                value={trendingIndustry}
                onChange={(e) => setTrendingIndustry(e.target.value)}
                className="rounded-full border border-[#DCE1EC] bg-white px-4 py-1.5 text-xs font-semibold text-[#0F172A] outline-none focus:border-[#0027eb]"
              >
                {trendingIndustries.map((ind) => (
                  <option key={ind} value={ind}>
                    {ind}
                  </option>
                ))}
              </select>
            </div>

            {/* 12 Style Filter Pills */}
            <div className="no-scrollbar flex items-center gap-1.5 overflow-x-auto pb-1">
              {ATRIA_STYLE_FILTERS.map((style) => {
                const active = trendingStyle === style;
                return (
                  <button
                    key={style}
                    type="button"
                    data-no-glass="true"
                    onClick={() => setTrendingStyle(style)}
                    className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                      active
                        ? "bg-[#050811] text-white"
                        : "border border-[#E6E9F0] bg-white text-[#475569] hover:border-[#CBD5E1] hover:text-[#0F172A]"
                    }`}
                  >
                    {style}
                  </button>
                );
              })}
            </div>

            {/* 4-column Vertical (9:16) Video Card Grid */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {filteredTrendingVideos.map((tv) => (
                <div
                  key={tv.id}
                  onClick={() => {
                    setPresetId(tv.presetId);
                    void runGenerate({
                      overridePreset: tv.presetId,
                      overrideMode: "video",
                      overrideAngle: tv.hookLine,
                      clonedFromAd: buildClonedAdFromTrending(tv),
                      openStage: true,
                    });
                  }}
                  className="group relative aspect-[9/16] cursor-pointer overflow-hidden rounded-2xl border border-[#ECEFF5] bg-[#050811] shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-xl"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={tv.thumbnailUrl}
                    alt={`${tv.brandName} video ad`}
                    className="h-full w-full object-cover opacity-90 transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/15 to-black/35" />

                  {/* Top-left duration pill */}
                  <span className="absolute left-3 top-3 rounded-full bg-black/55 px-2.5 py-0.5 font-mono-num text-[11px] font-semibold text-white backdrop-blur-md">
                    {tv.durationLabel}
                  </span>

                  {/* Top-right style tag */}
                  <span className="absolute right-3 top-3 rounded-full bg-white/15 px-2.5 py-0.5 text-[10px] font-semibold text-white backdrop-blur-md">
                    {tv.styleTag}
                  </span>

                  {/* Centered frosted Play circle */}
                  <div className="absolute inset-0 flex items-center justify-center transition-opacity group-hover:opacity-0">
                    <span className="flex h-12 w-12 items-center justify-center rounded-full border border-white/30 bg-white/20 text-white backdrop-blur-md">
                      <Play className="ml-0.5 h-5 w-5 fill-white" />
                    </span>
                  </div>

                  {/* Hover Clone ad Cobalt CTA */}
                  <div className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                    <span className="adtrack-btn-primary inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold text-white shadow-lg">
                      {generating ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Sparkles className="h-3.5 w-3.5" />
                      )}
                      Clone ad
                    </span>
                  </div>

                  {/* Bottom Brand Avatar + Name + Green dot active days */}
                  <div className="absolute inset-x-3.5 bottom-3.5 space-y-2">
                    <p className="line-clamp-2 text-[11.5px] font-medium leading-snug text-white/90">
                      &ldquo;{tv.hookLine}&rdquo;
                    </p>
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex min-w-0 items-center gap-2">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={tv.brandAvatarUrl}
                          alt={tv.brandName}
                          className="h-6 w-6 shrink-0 rounded-full border border-white/40 object-cover"
                        />
                        <span className="truncate text-xs font-bold text-white">
                          {tv.brandName}
                        </span>
                      </div>
                      <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-black/55 px-2 py-0.5 font-mono-num text-[10.5px] font-semibold text-white backdrop-blur-md">
                        <span className="h-1.5 w-1.5 rounded-full bg-[#22C55E]" />
                        {tv.activeDays}d
                      </span>
                    </div>
                  </div>
                </div>
              ))}

              {filteredTrendingVideos.length === 0 && (
                <div className="col-span-full flex flex-col items-center justify-center rounded-2xl border border-dashed border-[#DCE1EC] bg-white py-14 text-center">
                  <p className="text-sm font-semibold text-[#0F172A]">
                    No trending ads match those filters
                  </p>
                  <p className="mt-1 text-xs text-[#64748B]">
                    Try resetting the industry or style filter to browse all
                    trending formats.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setTrendingIndustry("All industries");
                      setTrendingStyle("All styles");
                    }}
                    className="mt-4 rounded-full border border-[#DCE1EC] bg-white px-4 py-1.5 text-xs font-semibold text-[#0027eb] hover:border-[#0027eb]"
                  >
                    Reset filters
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* INTERACTIVE 2-PANE VIDEO STAGE (Higgsfield / Snow + 5 Hooks + 4 Scenes) */}
      {subTab === "video" && videoStageView === "stage" && (
        <div className="mx-auto flex min-h-[calc(100vh-8rem)] max-w-[1200px] flex-col gap-5 lg:flex-row">
          {/* LEFT CONTROL PANEL */}
          <div className="flex w-full shrink-0 flex-col justify-between rounded-2xl border border-[#ECEFF5] bg-white p-3.5 shadow-[0_2px_12px_-4px_rgba(15,23,42,0.06)] lg:w-[320px]">
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-[#F1F5F9] pb-2.5">
                <button
                  type="button"
                  onClick={() => setVideoStageView("picker")}
                  className="inline-flex items-center gap-1.5 rounded-full border border-[#E6E9F0] bg-white px-3 py-1 text-xs font-semibold text-[#0F172A] hover:border-[#0027eb]"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  Back to Video Ads
                </button>
                <span className="rounded-full bg-[#EEF2FF] px-2.5 py-0.5 text-[10px] font-bold text-[#0027eb]">
                  Snow Stage
                </span>
              </div>

              {/* Active Preset Banner */}
              <div
                className={`group relative aspect-[16/9] w-full overflow-hidden rounded-xl bg-gradient-to-br ${currentPresetMeta.gradient}`}
              >
                {previewProductImage && (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={previewProductImage}
                    alt={currentPresetMeta.title}
                    style={{ filter: getPresetById(presetId).filterCss }}
                    className="absolute inset-0 h-full w-full object-cover opacity-55 mix-blend-luminosity"
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-black/20" />
                <div className="absolute inset-x-3 bottom-2.5">
                  <p className="font-display text-[15px] font-bold uppercase tracking-wide text-white">
                    {currentPresetMeta.title}
                  </p>
                  <p className="font-mono-num text-[10px] text-white/75">
                    {currentPresetMeta.tag} · Flake Engine
                  </p>
                </div>
              </div>

              {/* Preset switcher chips */}
              <div className="flex flex-wrap gap-1">
                {VIDEO_STYLE_PRESETS.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    data-no-glass="true"
                    onClick={() => setPresetId(p.id)}
                    className={`rounded-full px-2.5 py-1 text-[10.5px] font-semibold transition-colors ${
                      presetId === p.id
                        ? "bg-[#0027eb] text-white"
                        : "bg-[#F3F5F9] text-[#475569] hover:text-[#0F172A]"
                    }`}
                  >
                    {PRESET_META[p.id].shortLabel}
                  </button>
                ))}
              </div>

              {/* Reference / Product Box */}
              <div className="rounded-xl border border-dashed border-[#DCE1EC] bg-[#FAFBFD] p-3">
                {activeProject?.clonedFromAd ? (
                  <div className="flex items-center gap-2.5">
                    {activeProject.clonedFromAd.thumbnailUrl && (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={activeProject.clonedFromAd.thumbnailUrl}
                        alt=""
                        className="h-10 w-8 shrink-0 rounded-lg object-cover"
                      />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] font-bold uppercase text-[#0027eb]">
                        Cloned Ad Source
                      </p>
                      <p className="truncate text-xs font-semibold text-[#0F172A]">
                        {activeProject.clonedFromAd.brandName}
                      </p>
                    </div>
                  </div>
                ) : brandProducts.length > 0 ? (
                  <div className="space-y-1.5">
                    <span className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-[#94A3B8]">
                      <Package className="h-3 w-3" />
                      Product Reference
                    </span>
                    <select
                      value={effectiveProductTitle}
                      onChange={(e) => setProductTitle(e.target.value)}
                      className="w-full rounded-lg border border-[#E6E9F0] bg-white px-2.5 py-1.5 text-xs font-semibold text-[#0F172A] outline-none focus:border-[#0027eb]"
                    >
                      {brandProducts.map((p, idx) => (
                        <option key={idx} value={p.title}>
                          {p.title}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={onOpenBrandMemory}
                    className="flex w-full flex-col items-center justify-center py-2 text-center"
                  >
                    <p className="text-xs font-semibold text-[#0F172A]">
                      Add product / brand kit
                    </p>
                    <p className="text-[10.5px] text-[#94A3B8]">
                      Connect Brand Memory
                    </p>
                  </button>
                )}
              </div>

              {/* Prompt Card */}
              <div className="rounded-xl border border-[#E6E9F0] bg-[#FAFBFD] p-3">
                <label className="block text-[11px] font-semibold text-[#64748B]">
                  Direction / Script Prompt
                </label>
                <textarea
                  rows={3}
                  value={noteInput}
                  onChange={(e) => setNoteInput(e.target.value)}
                  placeholder="Describe an angle or let Snow generate the full script..."
                  className="mt-1 w-full resize-none bg-transparent text-xs leading-relaxed text-[#0F172A] outline-none placeholder:text-[#94A3B8]"
                />
                <div className="mt-2 flex items-center gap-1.5">
                  <button
                    type="button"
                    data-no-glass="true"
                    onClick={() => setSpeakAudio((v) => !v)}
                    className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[10.5px] font-semibold ${
                      speakAudio
                        ? "border-[#0027eb]/30 bg-[#EEF2FF] text-[#0027eb]"
                        : "border-[#E6E9F0] bg-white text-[#64748B]"
                    }`}
                  >
                    {speakAudio ? (
                      <Volume2 className="h-3 w-3" />
                    ) : (
                      <VolumeX className="h-3 w-3" />
                    )}
                    Audio {speakAudio ? "On" : "Off"}
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setLanguage((l) => (l === "en" ? "da" : "en"))
                    }
                    className="rounded-md border border-[#E6E9F0] bg-white px-2 py-1 font-mono-num text-[10.5px] font-semibold uppercase text-[#475569]"
                  >
                    {language}
                  </button>
                </div>
              </div>

              {/* 2x2 Bento Controls */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setDuration((d) => (d === "15s" ? "30s" : "15s"))
                  }
                  className="flex items-center justify-between rounded-xl border border-[#E6E9F0] bg-[#FAFBFD] px-3 py-2 text-left hover:border-[#CBD5E1]"
                >
                  <div>
                    <p className="text-[10px] text-[#94A3B8]">Duration</p>
                    <p className="font-mono-num text-xs font-bold text-[#0F172A]">
                      {duration}
                    </p>
                  </div>
                  <ChevronRight className="h-3.5 w-3.5 text-[#94A3B8]" />
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setAspectRatio((r) =>
                      r === "9:16" ? "4:5" : r === "4:5" ? "1:1" : "9:16"
                    )
                  }
                  className="flex items-center justify-between rounded-xl border border-[#E6E9F0] bg-[#FAFBFD] px-3 py-2 text-left hover:border-[#CBD5E1]"
                >
                  <div>
                    <p className="text-[10px] text-[#94A3B8]">Aspect Ratio</p>
                    <p className="font-mono-num text-xs font-bold text-[#0F172A]">
                      {aspectRatio}
                    </p>
                  </div>
                  <ChevronRight className="h-3.5 w-3.5 text-[#94A3B8]" />
                </button>
              </div>

              <div className="rounded-xl border border-[#E6E9F0] bg-[#FAFBFD] px-3 py-2">
                <p className="text-[10px] text-[#94A3B8]">Creator</p>
                <select
                  value={creatorPersona}
                  onChange={(e) => setCreatorPersona(e.target.value)}
                  className="mt-0.5 w-full bg-transparent text-xs font-bold text-[#0F172A] outline-none"
                >
                  {CREATOR_PERSONAS.map((cp) => (
                    <option key={cp.id} value={cp.id}>
                      {cp.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <button
              type="button"
              disabled={generating}
              onClick={() =>
                void runGenerate({
                  clonedFromAd: activeProject?.clonedFromAd,
                  openStage: true,
                })
              }
              className="adtrack-btn-primary mt-4 flex w-full items-center justify-center gap-2 rounded-xl py-3 text-xs font-bold text-white disabled:opacity-60"
            >
              {generating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Regenerating...
                </>
              ) : (
                <>
                  Regenerate Cut
                  <Sparkles className="h-3.5 w-3.5" />
                </>
              )}
            </button>
          </div>

          {/* RIGHT MAIN VIDEO PREVIEW STAGE */}
          <div className="flex min-w-0 flex-1 flex-col rounded-2xl border border-[#ECEFF5] bg-white p-5">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="font-display text-sm font-bold text-[#0F172A]">
                  {activeProject?.title || "Video Ad Preview"}
                </h2>
                <p className="text-xs text-[#64748B]">
                  5 Hooks · 4 Storyboard Scenes · Live Voiceover
                </p>
              </div>

              {activeProject && (
                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    onClick={copyBriefText}
                    className="inline-flex items-center gap-1 rounded-lg border border-[#E6E9F0] px-2.5 py-1.5 text-xs font-semibold text-[#475569] hover:text-[#0F172A]"
                  >
                    {copiedBrief ? (
                      <Check className="h-3.5 w-3.5 text-[#16A34A]" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                    Copy Brief
                  </button>
                  <button
                    type="button"
                    onClick={() => onSaveToSwipeFolder(activeProject)}
                    className="inline-flex items-center gap-1 rounded-lg border border-[#E6E9F0] px-2.5 py-1.5 text-xs font-semibold text-[#475569] hover:text-[#0F172A]"
                  >
                    <Bookmark className="h-3.5 w-3.5" />
                    Save to Swipe
                  </button>
                  <button
                    type="button"
                    onClick={() => onQueueForLaunch(activeProject)}
                    className="adtrack-btn-primary inline-flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-semibold text-white"
                  >
                    <Rocket className="h-3.5 w-3.5" />
                    Queue for Meta Launch
                  </button>
                </div>
              )}
            </div>

            {activeProject ? (
              <div className="flex flex-col items-center space-y-4">
                {/* 5 Hook Switcher Pills */}
                <div className="no-scrollbar flex max-w-full gap-1.5 overflow-x-auto pb-0.5">
                  {activeProject.hooks.map((h, idx) => {
                    const active = h.id === activeProject.selectedHookId;
                    return (
                      <button
                        key={h.id}
                        type="button"
                        data-no-glass="true"
                        onClick={() => {
                          const nextScenes = activeProject.scenes.map((sc, i) =>
                            i === 0
                              ? {
                                  ...sc,
                                  spokenLine: h.spokenHook,
                                  onScreenCaption: h.onScreenText,
                                }
                              : sc
                          );
                          updateActive({
                            selectedHookId: h.id,
                            scenes: nextScenes,
                          });
                          setSceneIdx(0);
                        }}
                        className={`shrink-0 rounded-full px-3 py-1 text-[11px] font-semibold transition-all ${
                          active
                            ? "bg-[#0027eb] text-white"
                            : "bg-[#F3F5F9] text-[#475569] hover:text-[#0F172A]"
                        }`}
                      >
                        Hook {idx + 1} · {h.predictedThumbstopPct}%
                      </button>
                    );
                  })}
                </div>

                {/* 9:16 Mobile Video Frame */}
                <div
                  className={`relative aspect-[9/16] w-full max-w-[275px] overflow-hidden rounded-[26px] border-[5px] border-[#0F172A] bg-gradient-to-b ${backdropStyle} shadow-[0_24px_54px_-14px_rgba(15,23,42,0.32)]`}
                >
                  {previewProductImage && (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      key={`${currentScene?.id}-${sceneIdx}`}
                      src={
                        sceneIdx === 1 &&
                        activeProject.clonedFromAd?.thumbnailUrl
                          ? activeProject.clonedFromAd.thumbnailUrl
                          : previewProductImage
                      }
                      alt={activeProject.productTitle}
                      style={{ filter: activePreset.filterCss }}
                      className={`absolute inset-0 h-full w-full object-cover opacity-85 transition-transform duration-1000 ${
                        sceneIdx % 2 === 0 ? "scale-105" : "scale-100"
                      }`}
                    />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/15 to-black/45" />

                  <div className="relative z-10 flex gap-1 px-3 pt-2.5">
                    {displayScenes.map((sc, i) => (
                      <div
                        key={sc.id}
                        className="h-[3px] flex-1 overflow-hidden rounded-full bg-white/30"
                      >
                        <div
                          className={`h-full rounded-full bg-white transition-all duration-300 ${
                            i <= sceneIdx ? "w-full" : "w-0"
                          }`}
                        />
                      </div>
                    ))}
                  </div>

                  <div className="relative z-10 flex items-center justify-between px-3.5 pt-2.5 text-white">
                    <span className="rounded-full bg-black/45 px-2.5 py-0.5 text-[10px] font-bold backdrop-blur-md">
                      {PRESET_META[activeProject.stylePresetId].title}
                    </span>
                    <button
                      type="button"
                      data-no-glass="true"
                      onClick={() => setPlaying((v) => !v)}
                      className="flex h-7 w-7 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur-md"
                    >
                      {playing ? (
                        <Pause className="h-3.5 w-3.5" />
                      ) : (
                        <Play className="h-3.5 w-3.5" />
                      )}
                    </button>
                  </div>

                  {currentScene && (
                    <div className="absolute inset-x-3.5 bottom-13 z-10 space-y-2 text-center">
                      <div className="inline-block rounded-xl bg-white px-3 py-1.5 font-display text-[13px] font-bold leading-tight text-[#0F172A] shadow-lg">
                        {currentScene.onScreenCaption}
                      </div>
                      <p className="rounded-xl bg-black/55 px-2.5 py-1.5 text-[11px] leading-snug text-white/95 backdrop-blur-md">
                        &ldquo;{currentScene.spokenLine}&rdquo;
                      </p>
                    </div>
                  )}

                  <div className="absolute inset-x-3 bottom-3 z-10 flex items-center justify-between rounded-xl bg-[#0027eb] px-3 py-1.5 text-[11px] font-bold text-white">
                    <span className="truncate">{activeProject.brandName}</span>
                    <span>{activeProject.ctaText} →</span>
                  </div>
                </div>

                {/* 4-Scene Scrubber */}
                <div className="grid w-full max-w-xl grid-cols-2 gap-2 sm:grid-cols-4">
                  {displayScenes.map((sc, idx) => (
                    <button
                      key={sc.id}
                      type="button"
                      data-no-glass="true"
                      onClick={() => {
                        setPlaying(false);
                        setSceneIdx(idx);
                        setEditingSceneIdx(
                          editingSceneIdx === idx ? null : idx
                        );
                      }}
                      className={`rounded-xl border p-2.5 text-left transition-all ${
                        idx === sceneIdx
                          ? "border-[#0027eb] bg-[#EEF2FF]/60"
                          : "border-[#ECEFF5] bg-[#FAFBFD] hover:border-[#CBD5E1]"
                      }`}
                    >
                      <span className="font-mono-num text-[9.5px] font-bold text-[#94A3B8]">
                        {sc.timeRange}
                      </span>
                      <p className="mt-0.5 line-clamp-1 text-[11px] font-semibold text-[#0F172A]">
                        {sc.onScreenCaption}
                      </p>
                    </button>
                  ))}
                </div>

                {editingSceneIdx !== null &&
                  activeProject.scenes[editingSceneIdx] && (
                    <div className="grid w-full max-w-xl grid-cols-1 gap-2 sm:grid-cols-2">
                      <input
                        type="text"
                        value={activeProject.scenes[editingSceneIdx].spokenLine}
                        onChange={(e) => {
                          const nextScenes = activeProject.scenes.map(
                            (item, i) =>
                              i === editingSceneIdx
                                ? { ...item, spokenLine: e.target.value }
                                : item
                          );
                          updateActive({ scenes: nextScenes });
                        }}
                        placeholder="Voiceover line"
                        className="rounded-xl border border-[#DCE1EC] bg-[#FAFBFD] px-3 py-2 text-xs text-[#0F172A] outline-none focus:border-[#0027eb] focus:bg-white"
                      />
                      <input
                        type="text"
                        value={
                          activeProject.scenes[editingSceneIdx].onScreenCaption
                        }
                        onChange={(e) => {
                          const nextScenes = activeProject.scenes.map(
                            (item, i) =>
                              i === editingSceneIdx
                                ? { ...item, onScreenCaption: e.target.value }
                                : item
                          );
                          updateActive({ scenes: nextScenes });
                        }}
                        placeholder="On-screen caption"
                        className="rounded-xl border border-[#DCE1EC] bg-[#FAFBFD] px-3 py-2 text-xs font-semibold text-[#0F172A] outline-none focus:border-[#0027eb] focus:bg-white"
                      />
                    </div>
                  )}
              </div>
            ) : (
              <div className="flex flex-1 flex-col items-center justify-center py-16 text-center">
                <p className="text-sm font-semibold text-[#0F172A]">
                  No video project active
                </p>
                <button
                  type="button"
                  onClick={() => setVideoStageView("picker")}
                  className="adtrack-btn-primary mt-3 rounded-full px-4 py-2 text-xs font-semibold text-white"
                >
                  Choose a Video Ad
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* =====================================================================
          SUB-TAB 2: IMAGE ADS (/workspace/image-ads + Templates Modal + Canvas)
         ===================================================================== */}
      {subTab === "static" && staticStageView === "canvas" && activeProject && (
        <StaticCanvasStage
          project={activeProject}
          onUpdateProject={updateActive}
          onQueueForLaunch={onQueueForLaunch}
          onBack={() => setStaticStageView("home")}
        />
      )}

      {subTab === "static" && staticStageView === "home" && (
        <div className="mx-auto max-w-[1160px] space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-2">
              <h1 className="font-geist-serif text-[32px] leading-tight text-[#0F172A]">
                Image Ads
              </h1>
              <div className="flex flex-wrap items-center gap-1.5">
                {(["All", "Clone", "Iterate", "Snow"] as const).map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    data-no-glass="true"
                    onClick={() => setStaticFilterTab(tab)}
                    className={`rounded-full px-3.5 py-1 text-xs font-semibold transition-colors ${
                      staticFilterTab === tab
                        ? "bg-[#050811] text-white"
                        : "border border-[#E6E9F0] bg-white text-[#64748B] hover:text-[#0F172A]"
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={() => setTemplateModalOpen(true)}
              className="adtrack-btn-primary inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-xs font-bold text-white"
            >
              <Plus className="h-4 w-4" />
              Create new image
            </button>
          </div>

          {/* 2 Large Feature Cards Side by Side */}
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            {(staticFilterTab === "All" ||
              staticFilterTab === "Clone" ||
              staticFilterTab === "Snow") && (
              <div className="flex flex-col overflow-hidden rounded-3xl border border-[#ECEFF5] bg-white shadow-[0_4px_18px_-6px_rgba(15,23,42,0.06)]">
                <div className="relative aspect-[16/10] w-full overflow-hidden bg-[#050811]">
                  <video
                    src={ATRIA_PROMO_VIDEOS.adClone}
                    autoPlay
                    loop
                    muted
                    playsInline
                    className="h-full w-full object-cover"
                  />
                  <span className="absolute left-4 top-4 rounded-full bg-[#050811]/75 px-3 py-1 text-[10.5px] font-bold text-white backdrop-blur-md">
                    Competitor Layout Clone
                  </span>
                </div>
                <div className="flex flex-1 flex-col justify-between p-6">
                  <div>
                    <h2 className="font-display text-xl font-bold text-[#0F172A]">
                      Clone ads
                    </h2>
                    <p className="mt-1.5 text-sm leading-relaxed text-[#64748B]">
                      Clone proven competitor layouts with your product &amp;
                      brand kit
                    </p>
                  </div>
                  <div className="mt-5 flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setTemplateModalOpen(true)}
                      className="adtrack-btn-primary inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-xs font-bold text-white"
                    >
                      Start cloning
                      <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {(staticFilterTab === "All" ||
              staticFilterTab === "Iterate" ||
              staticFilterTab === "Snow") && (
              <div className="flex flex-col overflow-hidden rounded-3xl border border-[#ECEFF5] bg-white shadow-[0_4px_18px_-6px_rgba(15,23,42,0.06)]">
                <div className="relative aspect-[16/10] w-full overflow-hidden bg-[#050811]">
                  <video
                    src={ATRIA_PROMO_VIDEOS.iterateAds}
                    autoPlay
                    loop
                    muted
                    playsInline
                    className="h-full w-full object-cover"
                  />
                  <span className="absolute left-4 top-4 rounded-full bg-[#0027eb]/85 px-3 py-1 text-[10.5px] font-bold text-white backdrop-blur-md">
                    Static Variant Engine
                  </span>
                </div>
                <div className="flex flex-1 flex-col justify-between p-6">
                  <div>
                    <h2 className="font-display text-xl font-bold text-[#0F172A]">
                      Iterate ads
                    </h2>
                    <p className="mt-1.5 text-sm leading-relaxed text-[#64748B]">
                      Spin fresh winning variants &amp; angles in one click
                    </p>
                  </div>
                  <div className="mt-5 flex items-center gap-3">
                    <button
                      type="button"
                      disabled={generating}
                      onClick={() =>
                        void runGenerate({
                          overrideMode: "static_clone",
                          overrideLayout: "us_vs_them",
                          overrideAspectRatio: "4:5",
                          overrideAngle: `Fresh winning angle iteration for ${activeBrandName}`,
                          openStage: true,
                        })
                      }
                      className="adtrack-btn-primary inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-xs font-bold text-white disabled:opacity-60"
                    >
                      {generating ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Wand2 className="h-3.5 w-3.5" />
                      )}
                      Start iterating
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Quick Templates Strip */}
          <div className="rounded-2xl border border-[#ECEFF5] bg-white p-5">
            <div className="mb-3 flex items-center justify-between">
              <p className="font-display text-sm font-bold text-[#0F172A]">
                Top static templates for {activeBrandName}
              </p>
              <button
                type="button"
                onClick={() => setTemplateModalOpen(true)}
                className="text-xs font-semibold text-[#0027eb] hover:underline"
              >
                Browse all templates →
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {ATRIA_IMAGE_TEMPLATES.slice(0, 4).map((tpl) => (
                <button
                  key={tpl.id}
                  type="button"
                  onClick={() => {
                    setSelectedTemplateIds([tpl.id]);
                    setTemplateModalOpen(true);
                  }}
                  className="group overflow-hidden rounded-xl border border-[#ECEFF5] bg-[#FAFBFD] text-left transition-all hover:border-[#0027eb]"
                >
                  <div className="aspect-[4/5] w-full overflow-hidden bg-[#0F172A]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={tpl.thumbnailUrl}
                      alt={tpl.title}
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  </div>
                  <div className="p-2.5">
                    <p className="truncate text-xs font-bold text-[#0F172A]">
                      {tpl.title}
                    </p>
                    <p className="text-[10.5px] text-[#64748B]">
                      {tpl.category}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          SUB-TAB 3 & 4: VIDEO PROJECTS & IMAGE PROJECTS
         ===================================================================== */}
      {(subTab === "video_projects" || subTab === "image_projects") && (
        <div className="mx-auto max-w-[1160px] space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="font-geist-serif text-[30px] leading-tight text-[#0F172A]">
                {subTab === "video_projects"
                  ? "Video Projects"
                  : "Image Projects"}
              </h1>
              <p className="text-xs text-[#64748B]">
                {subTab === "video_projects"
                  ? "Saved video cuts, 5-hook scripts, and launch-ready reels."
                  : "Cloned static variants, canvas exports, and Meta feed creatives."}
              </p>
            </div>
            <button
              type="button"
              onClick={() =>
                subTab === "video_projects"
                  ? switchSubTab("video")
                  : setTemplateModalOpen(true)
              }
              className="adtrack-btn-primary inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold text-white"
            >
              <Plus className="h-3.5 w-3.5" />
              {subTab === "video_projects"
                ? "New Video Ad"
                : "New Image Ad"}
            </button>
          </div>

          {/* Filter Bar: Date, Brand, Product, Status */}
          <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-[#ECEFF5] bg-white p-3">
            <span className="inline-flex items-center gap-1 px-2 text-xs font-semibold text-[#64748B]">
              <Filter className="h-3.5 w-3.5" />
              Filters
            </span>

            <select
              value={projDateFilter}
              onChange={(e) =>
                setProjDateFilter(e.target.value as "all" | "today" | "7d")
              }
              className="rounded-lg border border-[#E6E9F0] bg-[#FAFBFD] px-3 py-1.5 text-xs font-semibold text-[#0F172A] outline-none focus:border-[#0027eb]"
            >
              <option value="all">All dates</option>
              <option value="today">Last 24 hours</option>
              <option value="7d">Last 7 days</option>
            </select>

            <select
              value={projBrandFilter}
              onChange={(e) => setProjBrandFilter(e.target.value)}
              className="rounded-lg border border-[#E6E9F0] bg-[#FAFBFD] px-3 py-1.5 text-xs font-semibold text-[#0F172A] outline-none focus:border-[#0027eb]"
            >
              <option value="all">All brands</option>
              {projectFilterOptions.brands.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>

            <select
              value={projProductFilter}
              onChange={(e) => setProjProductFilter(e.target.value)}
              className="rounded-lg border border-[#E6E9F0] bg-[#FAFBFD] px-3 py-1.5 text-xs font-semibold text-[#0F172A] outline-none focus:border-[#0027eb]"
            >
              <option value="all">All products</option>
              {projectFilterOptions.prods.map((prod) => (
                <option key={prod} value={prod}>
                  {prod}
                </option>
              ))}
            </select>

            <select
              value={projStatusFilter}
              onChange={(e) => setProjStatusFilter(e.target.value)}
              className="rounded-lg border border-[#E6E9F0] bg-[#FAFBFD] px-3 py-1.5 text-xs font-semibold text-[#0F172A] outline-none focus:border-[#0027eb]"
            >
              <option value="all">All statuses</option>
              <option value="draft">Draft</option>
              <option value="ready">Ready</option>
              <option value="queued">Queued</option>
              <option value="live">Live</option>
            </select>
          </div>

          {/* Responsive Card Grid or Clean Empty State */}
          {(() => {
            const list = filterProjectsList(
              subTab === "video_projects" ? "video" : "static"
            );
            if (list.length === 0) {
              return (
                <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-[#DCE1EC] bg-white px-6 py-16 text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#EEF2FF] text-[#0027eb]">
                    {subTab === "video_projects" ? (
                      <Film className="h-6 w-6" />
                    ) : (
                      <ImageIcon className="h-6 w-6" />
                    )}
                  </div>
                  <h2 className="mt-4 font-display text-base font-bold text-[#0F172A]">
                    {subTab === "video_projects"
                      ? "No video projects yet"
                      : "No image projects yet"}
                  </h2>
                  <p className="mt-1 max-w-md text-xs text-[#64748B]">
                    {subTab === "video_projects"
                      ? "Clone a trending video ad or start from a script to build your first winning cut."
                      : "Pick a proven static template or iterate a winning angle to export PNGs."}
                  </p>
                  <button
                    type="button"
                    onClick={() =>
                      subTab === "video_projects"
                        ? switchSubTab("video")
                        : setTemplateModalOpen(true)
                    }
                    className="adtrack-btn-primary mt-5 inline-flex items-center gap-1.5 rounded-full px-5 py-2 text-xs font-bold text-white"
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    {subTab === "video_projects"
                      ? "Create Video Ad"
                      : "Browse Templates"}
                  </button>
                </div>
              );
            }

            return (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {list.map((p) => {
                  const thumb =
                    p.productImageUrl || p.clonedFromAd?.thumbnailUrl;
                  return (
                    <div
                      key={p.id}
                      className="flex flex-col overflow-hidden rounded-2xl border border-[#ECEFF5] bg-white shadow-sm transition-all hover:border-[#CBD5E1] hover:shadow-md"
                    >
                      <div className="relative aspect-[4/3] w-full overflow-hidden bg-[#050811]">
                        {thumb && (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img
                            src={thumb}
                            alt={p.title}
                            style={{
                              filter: getPresetById(p.stylePresetId).filterCss,
                            }}
                            className="h-full w-full object-cover opacity-85"
                          />
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" />
                        <span className="absolute left-3 top-3 rounded-full bg-black/60 px-2.5 py-0.5 text-[10px] font-bold text-white backdrop-blur-md">
                          {p.mode === "static_clone"
                            ? STATIC_LAYOUTS.find(
                                (l) => l.id === p.staticLayoutId
                              )?.label || "Static"
                            : PRESET_META[p.stylePresetId].title}
                        </span>
                        <span className="absolute right-3 top-3 rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-bold uppercase text-[#0F172A]">
                          {p.status}
                        </span>
                        <div className="absolute inset-x-3 bottom-3">
                          <p className="truncate font-display text-sm font-bold text-white">
                            {p.title}
                          </p>
                          <p className="truncate text-[11px] text-white/75">
                            {p.brandName} · {p.productTitle} · {p.aspectRatio}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-2 p-3.5">
                        <button
                          type="button"
                          onClick={() => {
                            setActiveProject(p);
                            if (p.mode === "static_clone") {
                              switchSubTab("static", { staticStage: "canvas" });
                            } else {
                              switchSubTab("video", { videoStage: "stage" });
                            }
                          }}
                          className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-[#DCE1EC] bg-white px-3 py-2 text-xs font-semibold text-[#0F172A] hover:border-[#0027eb]"
                        >
                          Open in Studio
                        </button>

                        {p.mode === "static_clone" ? (
                          <button
                            type="button"
                            onClick={() => exportStaticProjectPng(p)}
                            className="adtrack-btn-primary inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold text-white"
                          >
                            <Download className="h-3.5 w-3.5" />
                            Download PNG
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => onQueueForLaunch(p)}
                            className="adtrack-btn-primary inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold text-white"
                          >
                            <Rocket className="h-3.5 w-3.5" />
                            Queue Launch
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>
      )}

      {/* =====================================================================
          SUB-TAB 5: MEDIA (/workspace/video-ads/media + Docked Composer)
         ===================================================================== */}
      {subTab === "media" && (
        <div className="mx-auto max-w-[1160px] space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="font-geist-serif text-[32px] leading-tight text-[#0F172A]">
                Media
              </h1>
              <p className="text-xs text-[#64748B]">
                All generated clips, static renders, voice-overs, and brand
                assets for {activeBrandName}.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              {(["All", "Images", "Videos", "Audio"] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  data-no-glass="true"
                  onClick={() => setMediaFilter(tab)}
                  className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                    mediaFilter === tab
                      ? "bg-[#050811] text-white"
                      : "border border-[#E6E9F0] bg-white text-[#64748B] hover:text-[#0F172A]"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          {/* Media Asset Grid */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {filteredMediaItems.map((item) => (
              <div
                key={item.id}
                className="group flex flex-col overflow-hidden rounded-2xl border border-[#ECEFF5] bg-white shadow-sm transition-all hover:border-[#CBD5E1] hover:shadow-md"
              >
                <div className="relative aspect-[4/5] w-full overflow-hidden bg-[#050811]">
                  {item.kind === "audio" ? (
                    <div className="flex h-full flex-col items-center justify-center bg-gradient-to-br from-[#050811] via-[#0F172A] to-[#0027eb] p-5 text-center text-white">
                      <button
                        type="button"
                        data-no-glass="true"
                        onClick={() => {
                          if (
                            typeof window === "undefined" ||
                            !("speechSynthesis" in window)
                          ) {
                            return;
                          }
                          if (playingAudioId === item.id) {
                            window.speechSynthesis.cancel();
                            setPlayingAudioId(null);
                          } else {
                            window.speechSynthesis.cancel();
                            const u = new SpeechSynthesisUtterance(
                              item.subtitle
                            );
                            u.lang = "en-US";
                            u.onend = () => setPlayingAudioId(null);
                            setPlayingAudioId(item.id);
                            window.speechSynthesis.speak(u);
                          }
                        }}
                        className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-[#0027eb] shadow-lg transition-transform hover:scale-105"
                      >
                        {playingAudioId === item.id ? (
                          <Pause className="h-5 w-5" />
                        ) : (
                          <Mic className="h-5 w-5" />
                        )}
                      </button>
                      <p className="mt-3 line-clamp-3 text-xs leading-relaxed text-white/85">
                        &ldquo;{item.subtitle}&rdquo;
                      </p>
                    </div>
                  ) : (
                    <>
                      {item.url && (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={item.url}
                          alt={item.title}
                          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/25" />
                    </>
                  )}
                  <span className="absolute left-3 top-3 rounded-full bg-black/55 px-2.5 py-0.5 text-[10px] font-bold uppercase text-white backdrop-blur-md">
                    {item.kind}
                  </span>
                  {item.project && (
                    <button
                      type="button"
                      data-no-glass="true"
                      onClick={() => {
                        if (!item.project) return;
                        setActiveProject(item.project);
                        if (item.project.mode === "static_clone") {
                          switchSubTab("static", { staticStage: "canvas" });
                        } else {
                          switchSubTab("video", { videoStage: "stage" });
                        }
                      }}
                      className="absolute right-3 top-3 rounded-full bg-white/90 px-2.5 py-0.5 text-[10px] font-bold text-[#0F172A] opacity-0 transition-opacity group-hover:opacity-100"
                    >
                      Open
                    </button>
                  )}
                </div>
                <div className="p-3">
                  <p className="truncate text-xs font-bold text-[#0F172A]">
                    {item.title}
                  </p>
                  <p className="truncate text-[11px] text-[#64748B]">
                    {item.subtitle}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Docked Bottom Floating Multi-Modal Composer */}
          <div className="sticky bottom-4 z-20 mx-auto max-w-[960px] rounded-3xl border border-[#DCE4FF] bg-white/95 p-3 shadow-[0_20px_50px_-12px_rgba(15,23,42,0.22)] backdrop-blur-md">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-stretch">
              {/* Vertical Mode Switcher */}
              <div className="flex shrink-0 flex-row gap-1 rounded-2xl bg-[#F3F5F9] p-1 sm:w-[126px] sm:flex-col">
                {(
                  [
                    { id: "Image", icon: ImageIcon },
                    { id: "Video", icon: Video },
                    { id: "Voice-over", icon: Mic },
                  ] as const
                ).map((mode) => {
                  const Icon = mode.icon;
                  const active = composerKind === mode.id;
                  return (
                    <button
                      key={mode.id}
                      type="button"
                      data-no-glass="true"
                      onClick={() => {
                        setComposerKind(mode.id);
                        setComposerModel(
                          mode.id === "Image"
                            ? "Flake Static HD"
                            : mode.id === "Video"
                              ? "Snow Video v2"
                              : "Nordic Voice"
                        );
                      }}
                      className={`flex flex-1 items-center gap-2 rounded-xl px-2.5 py-1.5 text-xs font-semibold transition-colors ${
                        active
                          ? "bg-[#050811] text-white"
                          : "text-[#64748B] hover:text-[#0F172A]"
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5 shrink-0" />
                      <span>{mode.id}</span>
                    </button>
                  );
                })}
              </div>

              {/* + Reference Dashed Tile */}
              <label className="flex shrink-0 cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-[#CBD5E1] bg-[#FAFBFD] px-3.5 py-2 text-center hover:border-[#0027eb] sm:w-[104px]">
                <Plus className="h-4 w-4 text-[#0027eb]" />
                <span className="mt-1 line-clamp-2 text-[10.5px] font-semibold text-[#475569]">
                  {composerRefLabel || "Reference"}
                </span>
                <input
                  type="file"
                  accept="image/*,video/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) setComposerRefLabel(f.name);
                  }}
                />
              </label>

              {/* Center Prompt + Pills */}
              <div className="flex min-w-0 flex-1 flex-col justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 rounded-full bg-[#EEF2FF] px-2.5 py-0.5 text-[10.5px] font-bold text-[#0027eb]">
                    {activeBrandName}
                  </span>
                  <span className="text-[11px] text-[#94A3B8]">
                    {productTitle || brandProducts[0]?.title || "Hero Product"}
                  </span>
                </div>

                <input
                  type="text"
                  value={composerPrompt}
                  onChange={(e) => setComposerPrompt(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      void handleComposerGenerate();
                    }
                  }}
                  placeholder={`Describe your ${composerKind.toLowerCase()} generation for ${activeBrandName}...`}
                  className="w-full bg-transparent py-1 text-sm text-[#0F172A] outline-none placeholder:text-[#94A3B8]"
                />

                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="rounded-full border border-[#E6E9F0] bg-[#FAFBFD] px-2.5 py-1 text-[11px] font-semibold text-[#475569]">
                      {composerModel}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setComposerRatio((r) =>
                          r === "9:16" ? "4:5" : r === "4:5" ? "1:1" : "9:16"
                        )
                      }
                      className="rounded-full border border-[#E6E9F0] bg-[#FAFBFD] px-2.5 py-1 font-mono-num text-[11px] font-semibold text-[#0F172A]"
                    >
                      {composerRatio}
                    </button>
                  </div>

                  <button
                    type="button"
                    disabled={generating}
                    onClick={() => void handleComposerGenerate()}
                    className="adtrack-btn-primary inline-flex items-center gap-1.5 rounded-full px-5 py-2 text-xs font-bold text-white disabled:opacity-60"
                  >
                    {generating ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Sparkles className="h-3.5 w-3.5" />
                    )}
                    Generate
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          SUB-TAB 6: AI PLAYGROUND (miner — /workspace/ai replica)
         ===================================================================== */}
      {subTab === "miner" && (
        <div className="mx-auto max-w-[1160px] space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="font-geist-serif text-[32px] leading-tight text-[#0F172A]">
                AI Playground
              </h1>
              <p className="text-xs text-[#64748B]">
                Turn product URLs, customer reviews, and brand memory into
                high-converting hooks.
              </p>
            </div>

            <span
              data-no-glass="true"
              className="inline-flex items-center gap-1.5 rounded-full border border-[#DCE4FF] bg-[#EEF2FF] px-3.5 py-1.5 font-mono-num text-xs font-bold text-[#0027eb]"
            >
              <Sparkles className="h-3.5 w-3.5" />
              700 credits
            </span>
          </div>

          {/* 2-Column Top Cards */}
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            {/* Card 1: Cobalt-Gradient AI Ad Ideas */}
            <div className="flex flex-col justify-between rounded-3xl bg-gradient-to-br from-[#050811] via-[#0F172A] to-[#0027eb] p-6 text-white shadow-lg">
              <div>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-[10.5px] font-bold uppercase tracking-wider text-white">
                  <Sparkles className="h-3 w-3" />
                  Snow Concept Engine
                </span>
                <h2 className="mt-4 font-display text-2xl font-bold">
                  AI Ad Ideas
                </h2>
                <p className="mt-2 max-w-md text-xs leading-relaxed text-white/80">
                  Synthesize 3 scroll-stopping creative angles directly from{" "}
                  {activeBrandName}&apos;s Brand Memory, pain points, and
                  winning Meta structures.
                </p>
              </div>

              <div className="mt-6 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  data-no-glass="true"
                  onClick={generateBrandAdIdeas}
                  className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-xs font-bold text-[#0027eb] shadow-md transition-transform hover:scale-[1.02]"
                >
                  <Wand2 className="h-3.5 w-3.5" />
                  Generate Ad Ideas
                </button>
                <span className="text-[11px] text-white/70">
                  Using {activeBrandName}
                </span>
              </div>
            </div>

            {/* Card 2: White AI URL & Review Mining Tool */}
            <div className="flex flex-col justify-between rounded-3xl border border-[#ECEFF5] bg-white p-6 shadow-sm">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="font-display text-lg font-bold text-[#0F172A]">
                    AI URL &amp; Review Mining Tool
                  </h2>
                  <span className="rounded-full bg-[#F3F5F9] px-2.5 py-0.5 text-[10.5px] font-semibold text-[#64748B]">
                    Live Scraper
                  </span>
                </div>

                <div className="flex items-center gap-2 rounded-xl border border-[#DCE4FF] bg-[#FAFBFD] px-3 py-2">
                  <Link2 className="h-4 w-4 shrink-0 text-[#94A3B8]" />
                  <input
                    type="url"
                    value={minerUrl}
                    onChange={(e) => setMinerUrlOverride(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        void runMineUrl();
                      }
                    }}
                    placeholder="Paste product or landing page URL..."
                    className="min-w-0 flex-1 bg-transparent text-xs text-[#0F172A] outline-none placeholder:text-[#94A3B8]"
                  />
                </div>

                <textarea
                  rows={2}
                  value={minerReviews}
                  onChange={(e) => setMinerReviews(e.target.value)}
                  placeholder="Optional: paste raw customer reviews or Trustpilot quotes to mine objections..."
                  className="w-full resize-none rounded-xl border border-[#E6E9F0] bg-[#FAFBFD] p-3 text-xs text-[#0F172A] outline-none placeholder:text-[#94A3B8] focus:border-[#0027eb]"
                />
              </div>

              <div className="mt-4 flex items-center justify-between gap-3">
                <p className="text-[11px] text-[#64748B]">
                  Extracts pain points, USPs &amp; recommended presets
                </p>
                <button
                  type="button"
                  disabled={mining}
                  onClick={() => void runMineUrl()}
                  className="adtrack-btn-primary inline-flex shrink-0 items-center gap-1.5 rounded-full px-5 py-2 text-xs font-bold text-white disabled:opacity-60"
                >
                  {mining ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Mining...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-3.5 w-3.5" />
                      Mine Insights
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Generated Results Table */}
          <div className="overflow-hidden rounded-2xl border border-[#ECEFF5] bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-[#F1F5F9] px-5 py-3.5">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-[#0027eb]" />
                <h3 className="font-display text-sm font-bold text-[#0F172A]">
                  Generated Results
                </h3>
                <span className="rounded-full bg-[#F3F5F9] px-2 py-0.5 font-mono-num text-[10.5px] font-bold text-[#475569]">
                  {playgroundResults.length}
                </span>
              </div>
            </div>

            {playgroundResults.length === 0 ? (
              <div className="px-6 py-12 text-center">
                <p className="text-xs font-semibold text-[#0F172A]">
                  No mined results yet
                </p>
                <p className="mt-1 text-xs text-[#64748B]">
                  Click &ldquo;Generate Ad Ideas&rdquo; or mine a product URL
                  above to populate creative angles here.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-[#F1F5F9] bg-[#FAFBFD] text-[10.5px] font-bold uppercase tracking-wider text-[#64748B]">
                    <tr>
                      <th className="px-5 py-3">Angle &amp; Hook</th>
                      <th className="px-4 py-3">Style</th>
                      <th className="px-4 py-3">Why It Wins</th>
                      <th className="px-4 py-3">Source</th>
                      <th className="px-5 py-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F1F5F9]">
                    {playgroundResults.map((row) => (
                      <tr key={row.id} className="hover:bg-[#FAFBFD]">
                        <td className="max-w-sm px-5 py-3.5">
                          <p className="font-bold text-[#0F172A]">
                            {row.title}
                          </p>
                          <p className="mt-0.5 line-clamp-2 text-[#475569]">
                            &ldquo;{row.hook}&rdquo;
                          </p>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3.5">
                          <span className="rounded-full bg-[#EEF2FF] px-2.5 py-1 text-[10.5px] font-bold text-[#0027eb]">
                            {PRESET_META[row.presetId].title}
                          </span>
                        </td>
                        <td className="max-w-xs px-4 py-3.5 text-[#64748B]">
                          {row.why}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3.5 text-[11px] text-[#64748B]">
                          {row.source} · {row.createdAt}
                        </td>
                        <td className="whitespace-nowrap px-5 py-3.5 text-right">
                          <button
                            type="button"
                            disabled={generating}
                            onClick={() => {
                              setPresetId(row.presetId);
                              void runGenerate({
                                overridePreset: row.presetId,
                                overrideMode: "video",
                                overrideProduct:
                                  minedProductTitle ||
                                  productTitle ||
                                  activeBrandName,
                                overrideAngle: row.title,
                                overridePrompt: row.hook,
                                openStage: true,
                              });
                            }}
                            className="adtrack-btn-primary inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[11px] font-bold text-white"
                          >
                            Make Ad
                            <ArrowRight className="h-3 w-3" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* =====================================================================
          SUB-TAB 7: ASSETS FALLBACK (Legacy prop compatibility)
         ===================================================================== */}
      {subTab === "assets" && (
        <div className="mx-auto max-w-[1160px] space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="font-geist-serif text-[30px] leading-tight text-[#0F172A]">
                All Studio Assets
              </h1>
              <p className="text-xs text-[#64748B]">
                All saved video and static creative projects in one view.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => switchSubTab("video")}
                className="inline-flex items-center gap-1.5 rounded-full border border-[#DCE1EC] bg-white px-4 py-2 text-xs font-semibold text-[#0F172A] hover:border-[#0027eb]"
              >
                <Layers className="h-3.5 w-3.5" />
                Video Ads
              </button>
              <button
                type="button"
                onClick={() => setTemplateModalOpen(true)}
                className="adtrack-btn-primary inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold text-white"
              >
                <Plus className="h-3.5 w-3.5" />
                Image Ads
              </button>
            </div>
          </div>

          {projects.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-[#DCE1EC] bg-white py-16 text-center">
              <FolderOpen className="h-8 w-8 text-[#0027eb]" />
              <p className="mt-3 font-display text-sm font-bold text-[#0F172A]">
                No saved studio assets yet
              </p>
              <p className="mt-1 text-xs text-[#64748B]">
                Generate a video or static ad to populate your asset library.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {projects.map((p) => {
                const img = p.productImageUrl || p.clonedFromAd?.thumbnailUrl;
                return (
                  <div
                    key={p.id}
                    onClick={() => {
                      setActiveProject(p);
                      if (p.mode === "static_clone") {
                        switchSubTab("static", { staticStage: "canvas" });
                      } else {
                        switchSubTab("video", { videoStage: "stage" });
                      }
                    }}
                    className="group relative aspect-[3/4] cursor-pointer overflow-hidden rounded-2xl border border-[#ECEFF5] bg-[#050811]"
                  >
                    {img && (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={img}
                        alt={p.title}
                        style={{
                          filter: getPresetById(p.stylePresetId).filterCss,
                        }}
                        className="h-full w-full object-cover opacity-80 transition-transform duration-500 group-hover:scale-105"
                      />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/15 to-transparent" />
                    <span className="absolute left-2.5 top-2.5 rounded-full bg-black/55 px-2.5 py-0.5 text-[10px] font-bold text-white backdrop-blur-md">
                      {PRESET_META[p.stylePresetId].title}
                    </span>
                    <div className="absolute inset-x-3 bottom-3 flex items-end justify-between gap-2">
                      <p className="truncate font-display text-[13px] font-bold text-white">
                        {p.title}
                      </p>
                      <button
                        type="button"
                        data-no-glass="true"
                        onClick={(e) => {
                          e.stopPropagation();
                          onQueueForLaunch(p);
                        }}
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-[#0F172A] transition-colors hover:bg-[#0027eb] hover:text-white"
                      >
                        <Rocket className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* =====================================================================
          MODAL: QUICK START WITH TOP TEMPLATES (Image Ads)
         ===================================================================== */}
      {templateModalOpen && (
        <div
          className="fixed inset-0 z-[95] flex items-center justify-center bg-[#050811]/70 p-3 backdrop-blur-sm sm:p-6"
          onClick={() => setTemplateModalOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="flex max-h-[90vh] w-full max-w-[1040px] flex-col overflow-hidden rounded-3xl border border-[#DCE1EC] bg-white shadow-2xl"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-[#F1F5F9] px-6 py-4">
              <div>
                <h2 className="font-display text-lg font-bold text-[#0F172A]">
                  Quick start with top templates
                </h2>
                <p className="text-xs text-[#64748B]">
                  Select up to 10 high-converting static layouts to adapt for{" "}
                  {activeBrandName}.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setTemplateModalOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full border border-[#E6E9F0] bg-white text-[#475569] hover:text-[#0F172A]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Category Pills */}
            <div className="no-scrollbar flex items-center gap-1.5 overflow-x-auto border-b border-[#F1F5F9] px-6 py-3">
              {IMAGE_TEMPLATE_CATEGORIES.map((cat) => {
                const active = templateCategory === cat;
                return (
                  <button
                    key={cat}
                    type="button"
                    data-no-glass="true"
                    onClick={() => setTemplateCategory(cat)}
                    className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                      active
                        ? "bg-[#050811] text-white"
                        : "border border-[#E6E9F0] bg-white text-[#475569] hover:text-[#0F172A]"
                    }`}
                  >
                    {cat}
                  </button>
                );
              })}
            </div>

            {/* 5-Column Selectable Template Grid */}
            <div className="workspace-scroll flex-1 overflow-y-auto p-6">
              <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 md:grid-cols-5">
                {filteredImageTemplates.map((tpl) => {
                  const isSelected = selectedTemplateIds.includes(tpl.id);
                  return (
                    <button
                      key={tpl.id}
                      type="button"
                      data-no-glass="true"
                      onClick={() => toggleTemplateSelection(tpl.id)}
                      className={`group relative flex flex-col overflow-hidden rounded-2xl border text-left transition-all ${
                        isSelected
                          ? "border-[#0027eb] ring-2 ring-[#0027eb]/20"
                          : "border-[#ECEFF5] hover:border-[#CBD5E1]"
                      }`}
                    >
                      <div className="relative aspect-[4/5] w-full overflow-hidden bg-[#0F172A]">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={tpl.thumbnailUrl}
                          alt={tpl.title}
                          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                        {/* Top-right selection radio/check badge */}
                        <span
                          className={`absolute right-2.5 top-2.5 flex h-6 w-6 items-center justify-center rounded-full border transition-colors ${
                            isSelected
                              ? "border-[#0027eb] bg-[#0027eb] text-white"
                              : "border-white/70 bg-black/40 text-transparent"
                          }`}
                        >
                          <Check className="h-3.5 w-3.5" />
                        </span>
                      </div>
                      <div className="bg-white p-2.5">
                        <p className="line-clamp-1 text-xs font-bold text-[#0F172A]">
                          {tpl.title}
                        </p>
                        <p className="truncate text-[10.5px] text-[#64748B]">
                          {tpl.category}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Sticky Bottom Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#E6E9F0] bg-[#FAFBFD] px-6 py-4">
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-[#E6E9F0] bg-white px-3 py-1.5 text-xs font-semibold text-[#0F172A]">
                  <Clock className="h-3.5 w-3.5 text-[#0027eb]" />
                  {activeBrandName}
                </span>

                {brandProducts.length > 0 && (
                  <select
                    value={effectiveModalProductTitle}
                    onChange={(e) => setModalProductTitle(e.target.value)}
                    className="rounded-full border border-[#E6E9F0] bg-white px-3 py-1.5 text-xs font-semibold text-[#0F172A] outline-none focus:border-[#0027eb]"
                  >
                    {brandProducts.map((p, idx) => (
                      <option key={idx} value={p.title}>
                        {p.title}
                      </option>
                    ))}
                  </select>
                )}

                <div className="flex items-center gap-1 rounded-full border border-[#E6E9F0] bg-white p-0.5">
                  {(["4:5", "9:16", "1:1"] as const).map((ratio) => (
                    <button
                      key={ratio}
                      type="button"
                      data-no-glass="true"
                      onClick={() => setModalAspectRatio(ratio)}
                      className={`rounded-full px-2.5 py-1 font-mono-num text-[11px] font-bold transition-colors ${
                        modalAspectRatio === ratio
                          ? "bg-[#050811] text-white"
                          : "text-[#64748B] hover:text-[#0F172A]"
                      }`}
                    >
                      {ratio}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span className="font-mono-num text-xs font-semibold text-[#475569]">
                  {selectedTemplateIds.length} / 10 selected
                </span>
                {selectedTemplateIds.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setSelectedTemplateIds([])}
                    className="text-xs font-semibold text-[#64748B] hover:text-[#0F172A]"
                  >
                    Clear
                  </button>
                )}
                <button
                  type="button"
                  disabled={generating}
                  onClick={() => void handleGenerateFromTemplates()}
                  className="adtrack-btn-primary inline-flex items-center gap-2 rounded-full px-5 py-2 text-xs font-bold text-white disabled:opacity-60"
                >
                  {generating ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="h-3.5 w-3.5" />
                  )}
                  Generate variants
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
