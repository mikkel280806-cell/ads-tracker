"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  Bookmark,
  Check,
  Copy,
  Download,
  Film,
  Image as ImageIcon,
  Layers,
  Link2,
  Loader2,
  Pause,
  Pencil,
  Play,
  Rocket,
  SlidersHorizontal,
  Sparkles,
  Volume2,
  VolumeX,
} from "lucide-react";
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

export type StudioSubTab = "video" | "static" | "miner" | "assets";

export interface StudioDraftTrigger {
  id: string;
  mode?: "video" | "static_clone";
  stylePresetId?: VideoStylePresetId;
  productTitle?: string;
  angle?: string;
  clonedFromAd?: ClonedSourceAd;
}

interface VideoStudioViewProps {
  brandMemory: BrandMemory | null;
  projects: CreativeProject[];
  incomingTrigger: StudioDraftTrigger | null;
  onConsumeTrigger: () => void;
  onSaveProject: (proj: CreativeProject) => void;
  onQueueForLaunch: (proj: CreativeProject) => void;
  onSaveToSwipeFolder: (proj: CreativeProject) => void;
  onOpenBrandMemory: () => void;
}

const SHORT_PRESET_LABELS: Record<VideoStylePresetId, { title: string; tag: string }> = {
  iphone_ugc: { title: "iPhone UGC", tag: "9:16 RAW" },
  claymation_moa: { title: "Claymation", tag: "12 FPS" },
  pixar_story: { title: "Pixar 3D", tag: "STORY" },
  mini_drama: { title: "Mini-Drama", tag: "TWIST" },
  founder_authority: { title: "Founder", tag: "POV" },
  cinema_macro: { title: "Macro 60fps", tag: "CINEMA" },
};

const STATIC_LAYOUTS: Array<{
  id: StaticCloneLayoutId;
  label: string;
}> = [
  { id: "callout_pointers", label: "3 Callouts" },
  { id: "us_vs_them", label: "Os vs. Dem" },
  { id: "ugly_postit", label: "Post-It" },
  { id: "founder_quote", label: "Citat" },
  { id: "before_after", label: "Før / Efter" },
];

/** Visual Higgsfield-style cinema poster tile for each preset */
function PresetPosterCard({
  id,
  selected,
  previewImg,
  onClick,
}: {
  id: VideoStylePresetId;
  selected: boolean;
  previewImg?: string;
  onClick: () => void;
}) {
  const meta = SHORT_PRESET_LABELS[id];
  const preset = getPresetById(id);

  const bgGradient =
    id === "claymation_moa"
      ? "from-[#7C2D12] via-[#EA580C] to-[#FDBA74]"
      : id === "pixar_story"
        ? "from-[#061238] via-[#0027eb] to-[#7DD3FC]"
        : id === "mini_drama"
          ? "from-[#050811] via-[#1E293B] to-[#475569]"
          : id === "founder_authority"
            ? "from-[#0F172A] via-[#334155] to-[#94A3B8]"
            : id === "cinema_macro"
              ? "from-[#020617] via-[#0F172A] to-[#1D4ED8]"
              : "from-[#064E3B] via-[#0F766E] to-[#5EEAD4]";

  return (
    <button
      type="button"
      onClick={onClick}
      className={`group relative aspect-[3/4] w-full overflow-hidden rounded-2xl bg-gradient-to-br ${bgGradient} text-left transition-all ${
        selected
          ? "ring-[2.5px] ring-[#0027eb] ring-offset-2 ring-offset-[#F7F8FB] scale-[1.01]"
          : "opacity-90 hover:opacity-100 hover:scale-[1.01]"
      }`}
    >
      {previewImg && (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={previewImg}
          alt={meta.title}
          style={{ filter: preset.filterCss }}
          className="absolute inset-0 h-full w-full object-cover opacity-55 mix-blend-luminosity transition-transform duration-500 group-hover:scale-105"
        />
      )}

      {/* Visual style accents (show, don't tell) */}
      {id === "claymation_moa" && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="h-11 w-11 rounded-full bg-[#FDBA74]/85 shadow-[inset_-4px_-6px_10px_rgba(124,45,18,0.45)]" />
          <div className="-ml-4 h-9 w-9 rounded-full bg-white/85 shadow-[inset_-3px_-5px_8px_rgba(15,23,42,0.3)]" />
        </div>
      )}
      {id === "mini_drama" && (
        <span className="absolute left-2.5 top-2.5 inline-flex items-center gap-1 rounded-full bg-black/60 px-2 py-0.5 font-mono-num text-[9px] font-bold text-white backdrop-blur-md">
          <span className="h-1.5 w-1.5 rounded-full bg-[#E11D48]" />
          REC
        </span>
      )}
      {id === "iphone_ugc" && (
        <span className="absolute left-2.5 top-2.5 rounded-full bg-black/50 px-2 py-0.5 font-mono-num text-[9px] font-bold text-white backdrop-blur-md">
          9:16
        </span>
      )}

      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/15 to-transparent" />

      {selected && (
        <span className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-[#0027eb] text-white shadow">
          <Check className="h-3 w-3" />
        </span>
      )}

      <div className="absolute inset-x-2.5 bottom-2.5">
        <span className="font-mono-num text-[9px] font-semibold tracking-wider text-white/70">
          {meta.tag}
        </span>
        <p className="font-display text-[13px] font-bold leading-tight text-white">
          {meta.title}
        </p>
      </div>
    </button>
  );
}

function StaticCanvasAdRenderer({
  project,
  onUpdateProject,
  onQueueForLaunch,
}: {
  project: CreativeProject;
  onUpdateProject: (patch: Partial<CreativeProject>) => void;
  onQueueForLaunch: (proj: CreativeProject) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [editingText, setEditingText] = useState(false);

  const dims =
    project.aspectRatio === "9:16"
      ? { w: 1080, h: 1920 }
      : project.aspectRatio === "1:1"
        ? { w: 1080, h: 1080 }
        : { w: 1080, h: 1350 };

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
        ctx.fillText("Andre", 55 + colW + 40 + colW / 2, boxY + 75);

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
    <div className="mx-auto max-w-4xl space-y-4">
      {/* Top Layout Strip + Ratio Pills */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="no-scrollbar flex items-center gap-1.5 overflow-x-auto">
          {STATIC_LAYOUTS.map((l) => (
            <button
              key={l.id}
              type="button"
              onClick={() => onUpdateProject({ staticLayoutId: l.id })}
              className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all ${
                project.staticLayoutId === l.id
                  ? "bg-[#0F172A] text-white"
                  : "border border-[#E6E9F0] bg-white text-[#475569] hover:text-[#0F172A]"
              }`}
            >
              {l.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1.5">
          <div className="inline-flex rounded-full border border-[#E6E9F0] bg-white p-0.5 font-mono-num text-[11px] font-semibold">
            {(["4:5", "9:16", "1:1"] as const).map((ratio) => (
              <button
                key={ratio}
                type="button"
                onClick={() => onUpdateProject({ aspectRatio: ratio })}
                className={`rounded-full px-2.5 py-1 ${
                  project.aspectRatio === ratio
                    ? "bg-[#0F172A] text-white"
                    : "text-[#64748B]"
                }`}
              >
                {ratio}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setEditingText((v) => !v)}
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
              editingText
                ? "border-[#0027eb] bg-[#0027eb]/[0.08] text-[#0027eb]"
                : "border-[#E6E9F0] bg-white text-[#334155]"
            }`}
          >
            <Pencil className="h-3.5 w-3.5" />
            Tekst
          </button>
        </div>
      </div>

      {/* Hero Stage: Huge Crisp Canvas Preview */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <div
          className={`flex flex-col items-center justify-center rounded-3xl border border-[#ECEFF5] bg-white p-6 shadow-[0_8px_30px_-14px_rgba(15,23,42,0.08)] ${
            editingText ? "lg:col-span-7" : "lg:col-span-12"
          }`}
        >
          <canvas
            ref={canvasRef}
            className="max-h-[520px] w-auto rounded-2xl border border-[#E6E9F0] shadow-xl"
          />

          <div className="mt-5 flex items-center gap-2">
            <button
              type="button"
              onClick={downloadPng}
              className="inline-flex items-center gap-1.5 rounded-full border border-[#DCE1EC] bg-white px-4 py-2 text-xs font-semibold text-[#0F172A] hover:border-[#0027eb]"
            >
              <Download className="h-3.5 w-3.5" />
              PNG
            </button>
            <button
              type="button"
              onClick={() =>
                onQueueForLaunch({ ...project, mode: "static_clone" })
              }
              className="adtrack-btn-primary inline-flex items-center gap-1.5 rounded-full px-5 py-2 text-xs font-semibold text-white"
            >
              <Rocket className="h-3.5 w-3.5" />
              Launch
            </button>
          </div>
        </div>

        {editingText && (
          <div className="space-y-3 rounded-3xl border border-[#ECEFF5] bg-white p-4 lg:col-span-5">
            <input
              type="text"
              value={project.headline}
              onChange={(e) => onUpdateProject({ headline: e.target.value })}
              placeholder="Overskrift"
              className="w-full rounded-xl border border-[#DCE1EC] bg-[#FAFBFD] px-3 py-2 text-[16px] font-bold text-[#0F172A] outline-none focus:border-[#0027eb] focus:bg-white sm:text-xs"
            />
            {[0, 1, 2].map((idx) => (
              <input
                key={idx}
                type="text"
                value={project.callouts[idx] || ""}
                onChange={(e) => {
                  const next = [...project.callouts];
                  next[idx] = e.target.value;
                  onUpdateProject({ callouts: next, usPoints: next });
                }}
                placeholder={`USP ${idx + 1}`}
                className="w-full rounded-xl border border-[#DCE1EC] bg-[#FAFBFD] px-3 py-2 text-[16px] text-[#0F172A] outline-none focus:border-[#0027eb] focus:bg-white sm:text-xs"
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function VideoStudioView({
  brandMemory,
  projects,
  incomingTrigger,
  onConsumeTrigger,
  onSaveProject,
  onQueueForLaunch,
  onSaveToSwipeFolder,
}: VideoStudioViewProps) {
  const [subTab, setSubTab] = useState<StudioSubTab>("video");
  const [presetId, setPresetId] = useState<VideoStylePresetId>("iphone_ugc");
  const [productTitle, setProductTitle] = useState<string>(
    brandMemory?.products[0]?.title || ""
  );
  const [aspectRatio, setAspectRatio] = useState<"9:16" | "4:5" | "1:1">("9:16");
  const [language, setLanguage] = useState<"da" | "en">("da");
  const [creatorPersona, setCreatorPersona] = useState<string>(
    CREATOR_PERSONAS[0].id
  );
  const [angleInput, setAngleInput] = useState("");
  const [noteInput, setNoteInput] = useState("");
  const [showOptions, setShowOptions] = useState(false);
  const [editingSceneIdx, setEditingSceneIdx] = useState<number | null>(null);
  const [playing, setPlaying] = useState(true);
  const [sceneIdx, setSceneIdx] = useState(0);
  const [speakAudio, setSpeakAudio] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [copiedBrief, setCopiedBrief] = useState(false);
  const [activeProject, setActiveProject] = useState<CreativeProject | null>(
    projects[0] || null
  );

  // URL Miner
  const [minerUrl, setMinerUrl] = useState(brandMemory?.products[0]?.url || "");
  const [mining, setMining] = useState(false);
  const [minedInsights, setMinedInsights] = useState<MinedUrlInsights | null>(
    null
  );

  const runGenerate = async (opts?: {
    overridePreset?: VideoStylePresetId;
    overrideMode?: "video" | "static_clone";
    overrideProduct?: string;
    overrideAngle?: string;
    clonedFromAd?: ClonedSourceAd;
  }) => {
    setGenerating(true);
    const usePreset = opts?.overridePreset || presetId;
    const useMode =
      opts?.overrideMode || (subTab === "static" ? "static_clone" : "video");
    try {
      const res = await fetch("/api/video-studio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "generate_project",
          brandMemory,
          stylePresetId: usePreset,
          mode: useMode,
          aspectRatio: useMode === "static_clone" ? "4:5" : aspectRatio,
          language,
          creatorPersona,
          productTitle:
            opts?.overrideProduct ||
            productTitle ||
            brandMemory?.products[0]?.title,
          angle: opts?.overrideAngle || angleInput || undefined,
          userPrompt: noteInput || undefined,
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
      }
    } finally {
      setGenerating(false);
    }
  };

  useEffect(() => {
    if (!incomingTrigger) return;
    const targetTab: StudioSubTab =
      incomingTrigger.mode === "static_clone" ? "static" : "video";
    setSubTab(targetTab);
    if (incomingTrigger.stylePresetId)
      setPresetId(incomingTrigger.stylePresetId);
    if (incomingTrigger.productTitle)
      setProductTitle(incomingTrigger.productTitle);
    if (incomingTrigger.angle) setAngleInput(incomingTrigger.angle);
    void runGenerate({
      overridePreset: incomingTrigger.stylePresetId || presetId,
      overrideMode: incomingTrigger.mode || "video",
      overrideProduct: incomingTrigger.productTitle,
      overrideAngle: incomingTrigger.angle,
      clonedFromAd: incomingTrigger.clonedFromAd,
    });
    onConsumeTrigger();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [incomingTrigger?.id]);

  useEffect(() => {
    if (!activeProject && !generating) {
      void runGenerate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const activePreset = activeProject
    ? getPresetById(activeProject.stylePresetId)
    : getPresetById(presetId);

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
    if (!playing || displayScenes.length === 0 || subTab !== "video") return;
    const timer = window.setInterval(() => {
      setSceneIdx((prev) => (prev + 1) % displayScenes.length);
    }, 3400);
    return () => window.clearInterval(timer);
  }, [playing, displayScenes.length, subTab]);

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
    u.lang = activeProject?.language === "en" ? "en-US" : "da-DK";
    u.rate = 1.04;
    window.speechSynthesis.speak(u);
    return () => window.speechSynthesis.cancel();
  }, [speakAudio, currentScene?.spokenLine, activeProject?.language]);

  const runMineUrl = async () => {
    if (!minerUrl.trim()) return;
    setMining(true);
    try {
      const res = await fetch("/api/video-studio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "mine_url",
          brandMemory,
          url: minerUrl.trim(),
        }),
      });
      const data = await res.json();
      if (res.ok && data?.ok && data.insights) {
        setMinedInsights(data.insights as MinedUrlInsights);
      }
    } finally {
      setMining(false);
    }
  };

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

  const previewProductImage =
    activeProject?.productImageUrl ||
    brandMemory?.products[0]?.image_url ||
    activeProject?.clonedFromAd?.thumbnailUrl;

  const backdropStyle =
    activeProject?.stylePresetId === "claymation_moa"
      ? "from-[#451A03] via-[#92400E] to-[#D97706]"
      : activeProject?.stylePresetId === "pixar_story"
        ? "from-[#061238] via-[#0027eb]/85 to-[#38BDF8]"
        : activeProject?.stylePresetId === "cinema_macro"
          ? "from-[#020617] via-[#0F172A] to-[#0027eb]"
          : "from-[#050811] via-[#1E293B] to-[#334155]";

  return (
    <div className="space-y-5">
      {/* Minimal Studio Top Strip: Title + Segmented Sub-Tabs only */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-[22px] font-bold tracking-tight text-[#0F172A]">
          Ad Studio
        </h1>

        <div className="no-scrollbar inline-flex items-center gap-1 overflow-x-auto rounded-full border border-[#E6E9F0] bg-white p-1 shadow-2xs">
          {[
            { id: "video" as StudioSubTab, label: "Video", icon: Film },
            { id: "static" as StudioSubTab, label: "Static", icon: ImageIcon },
            { id: "miner" as StudioSubTab, label: "URL Miner", icon: Link2 },
            {
              id: "assets" as StudioSubTab,
              label: `Galleri (${projects.length})`,
              icon: Layers,
            },
          ].map((t) => {
            const Icon = t.icon;
            const active = subTab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setSubTab(t.id)}
                className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all ${
                  active
                    ? "bg-[#0F172A] text-white"
                    : "text-[#64748B] hover:text-[#0F172A]"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* =====================================================================
          TAB 1: VISUAL VIDEO STUDIO (HIGGSFIELD GALLERY + LIVE STAGE)
         ===================================================================== */}
      {subTab === "video" && (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
          {/* Left: Visual Preset Poster Wall + Clean Single-Bar Dock (7 cols) */}
          <div className="space-y-4 xl:col-span-7">
            {/* Cloned Source Visual Pill (only when cloning) */}
            {activeProject?.clonedFromAd && (
              <div className="flex items-center gap-3 rounded-2xl border border-[#DCE4FF] bg-white px-3 py-2.5">
                {activeProject.clonedFromAd.thumbnailUrl && (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={activeProject.clonedFromAd.thumbnailUrl}
                    alt=""
                    className="h-10 w-8 shrink-0 rounded-lg object-cover"
                  />
                )}
                <div className="min-w-0 flex-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#0027eb]">
                    Cloner struktur
                  </span>
                  <p className="truncate text-xs font-bold text-[#0F172A]">
                    {activeProject.clonedFromAd.brandName} ·{" "}
                    {activeProject.clonedFromAd.activeDays}d live
                  </p>
                </div>
              </div>
            )}

            {/* 6 Higgsfield-style Visual Cinema Poster Cards */}
            <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-6 xl:grid-cols-3">
              {VIDEO_STYLE_PRESETS.map((p) => (
                <PresetPosterCard
                  key={p.id}
                  id={p.id}
                  selected={presetId === p.id}
                  previewImg={previewProductImage}
                  onClick={() => {
                    setPresetId(p.id);
                    void runGenerate({
                      overridePreset: p.id,
                      clonedFromAd: activeProject?.clonedFromAd,
                    });
                  }}
                />
              ))}
            </div>

            {/* Runway / Higgsfield Floating Prompt & Action Dock */}
            <div className="rounded-2xl border border-[#E6E9F0] bg-white p-2.5 shadow-[0_8px_28px_-14px_rgba(15,23,42,0.12)]">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={noteInput}
                  onChange={(e) => setNoteInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      void runGenerate({
                        clonedFromAd: activeProject?.clonedFromAd,
                      });
                    }
                  }}
                  placeholder="Valgfri idé — eller klik bare Generér..."
                  className="min-w-0 flex-1 bg-transparent px-2 py-2 text-[16px] text-[#0F172A] outline-none placeholder:text-[#94A3B8] sm:text-xs"
                />

                <button
                  type="button"
                  onClick={() => setShowOptions((v) => !v)}
                  title="Indstillinger"
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border transition-colors ${
                    showOptions
                      ? "border-[#0027eb] bg-[#0027eb]/[0.08] text-[#0027eb]"
                      : "border-[#E6E9F0] bg-[#FAFBFD] text-[#64748B] hover:text-[#0F172A]"
                  }`}
                >
                  <SlidersHorizontal className="h-4 w-4" />
                </button>

                <button
                  type="button"
                  disabled={generating}
                  onClick={() =>
                    void runGenerate({
                      clonedFromAd: activeProject?.clonedFromAd,
                    })
                  }
                  className="adtrack-btn-primary inline-flex shrink-0 items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-semibold text-white disabled:opacity-60"
                >
                  {generating ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="h-3.5 w-3.5" />
                  )}
                  Generér
                </button>
              </div>

              {/* Collapsible Controls (hidden by default for clean visual UI) */}
              {showOptions && (
                <div className="mt-2.5 grid grid-cols-2 gap-2 border-t border-[#F1F5F9] pt-2.5 sm:grid-cols-4">
                  {brandMemory && brandMemory.products.length > 0 ? (
                    <select
                      value={productTitle}
                      onChange={(e) => setProductTitle(e.target.value)}
                      className="rounded-xl border border-[#E6E9F0] bg-[#FAFBFD] px-2.5 py-1.5 text-xs font-medium text-[#0F172A] outline-none"
                    >
                      {brandMemory.products.map((p, idx) => (
                        <option key={idx} value={p.title}>
                          {p.title}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      value={productTitle}
                      onChange={(e) => setProductTitle(e.target.value)}
                      placeholder="Produkt..."
                      className="rounded-xl border border-[#E6E9F0] bg-[#FAFBFD] px-2.5 py-1.5 text-xs text-[#0F172A] outline-none"
                    />
                  )}

                  <select
                    value={creatorPersona}
                    onChange={(e) => setCreatorPersona(e.target.value)}
                    className="rounded-xl border border-[#E6E9F0] bg-[#FAFBFD] px-2.5 py-1.5 text-xs font-medium text-[#0F172A] outline-none"
                  >
                    {CREATOR_PERSONAS.map((cp) => (
                      <option key={cp.id} value={cp.id}>
                        {cp.label}
                      </option>
                    ))}
                  </select>

                  <div className="inline-flex rounded-xl bg-[#F5F7FA] p-0.5 text-[11px] font-semibold">
                    {(["da", "en"] as const).map((l) => (
                      <button
                        key={l}
                        type="button"
                        onClick={() => setLanguage(l)}
                        className={`flex-1 rounded-lg py-1 uppercase ${
                          language === l
                            ? "bg-white text-[#0F172A] shadow-2xs"
                            : "text-[#64748B]"
                        }`}
                      >
                        {l}
                      </button>
                    ))}
                  </div>

                  <div className="inline-flex rounded-xl bg-[#F5F7FA] p-0.5 font-mono-num text-[11px] font-semibold">
                    {(["9:16", "4:5", "1:1"] as const).map((r) => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => setAspectRatio(r)}
                        className={`flex-1 rounded-lg py-1 ${
                          aspectRatio === r
                            ? "bg-white text-[#0F172A] shadow-2xs"
                            : "text-[#64748B]"
                        }`}
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Visual Filmstrip Storyboard (4 visual scene frames; click any frame to edit inline) */}
            {activeProject && (
              <div className="space-y-2.5">
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {displayScenes.map((sc, idx) => {
                    const isActive = idx === sceneIdx;
                    const isEditing = idx === editingSceneIdx;
                    return (
                      <button
                        key={sc.id}
                        type="button"
                        onClick={() => {
                          setPlaying(false);
                          setSceneIdx(idx);
                          setEditingSceneIdx(isEditing ? null : idx);
                        }}
                        className={`group relative overflow-hidden rounded-2xl border p-3 text-left transition-all ${
                          isActive
                            ? "border-[#0027eb] bg-white shadow-[0_6px_18px_-8px_rgba(0,39,235,0.28)]"
                            : "border-[#ECEFF5] bg-white hover:border-[#CBD5E1]"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono-num text-[10px] font-bold text-[#64748B]">
                            {sc.timeRange}
                          </span>
                          <Pencil className="h-3 w-3 text-[#94A3B8] opacity-0 transition-opacity group-hover:opacity-100" />
                        </div>
                        <p className="mt-1.5 line-clamp-2 text-[11.5px] font-semibold leading-snug text-[#0F172A]">
                          {sc.onScreenCaption}
                        </p>
                      </button>
                    );
                  })}
                </div>

                {/* Single Inline Scene Editor (only visible when user clicks a scene frame) */}
                {editingSceneIdx !== null && activeProject.scenes[editingSceneIdx] && (
                  <div className="grid grid-cols-1 gap-2 rounded-2xl border border-[#DCE4FF] bg-white p-3 sm:grid-cols-2">
                    <input
                      type="text"
                      value={activeProject.scenes[editingSceneIdx].spokenLine}
                      onChange={(e) => {
                        const nextScenes = activeProject.scenes.map((item, i) =>
                          i === editingSceneIdx
                            ? { ...item, spokenLine: e.target.value }
                            : item
                        );
                        updateActive({ scenes: nextScenes });
                      }}
                      placeholder="Voiceover"
                      className="rounded-xl border border-[#E2E6EF] bg-[#FAFBFD] px-3 py-2 text-xs text-[#0F172A] outline-none focus:border-[#0027eb] focus:bg-white"
                    />
                    <input
                      type="text"
                      value={activeProject.scenes[editingSceneIdx].onScreenCaption}
                      onChange={(e) => {
                        const nextScenes = activeProject.scenes.map((item, i) =>
                          i === editingSceneIdx
                            ? { ...item, onScreenCaption: e.target.value }
                            : item
                        );
                        updateActive({ scenes: nextScenes });
                      }}
                      placeholder="Tekst på skærm"
                      className="rounded-xl border border-[#E2E6EF] bg-[#FAFBFD] px-3 py-2 text-xs font-semibold text-[#0F172A] outline-none focus:border-[#0027eb] focus:bg-white"
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right: HERO Live Phone Stage + Clean Hook Switcher (5 cols) */}
          <div className="xl:col-span-5">
            {activeProject && (
              <div className="flex flex-col items-center rounded-3xl border border-[#ECEFF5] bg-white p-5 shadow-[0_12px_36px_-16px_rgba(15,23,42,0.12)]">
                {/* Compact Hook Pills */}
                <div className="no-scrollbar mb-4 flex w-full gap-1.5 overflow-x-auto pb-0.5">
                  {activeProject.hooks.map((h, idx) => {
                    const active = h.id === activeProject.selectedHookId;
                    return (
                      <button
                        key={h.id}
                        type="button"
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

                {/* Live Phone Frame */}
                <div
                  className={`relative aspect-[9/16] w-full max-w-[290px] overflow-hidden rounded-[28px] border-[5px] border-[#0F172A] bg-gradient-to-b ${backdropStyle} shadow-[0_24px_54px_-14px_rgba(15,23,42,0.38)]`}
                >
                  {previewProductImage && (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      key={`${currentScene?.id}-${sceneIdx}`}
                      src={
                        sceneIdx === 1 && activeProject.clonedFromAd?.thumbnailUrl
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

                  {/* Story Progress Bars */}
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

                  {/* Minimal Top Controls */}
                  <div className="relative z-10 flex items-center justify-between px-3.5 pt-2.5 text-white">
                    <span className="rounded-full bg-black/45 px-2.5 py-0.5 text-[10px] font-bold backdrop-blur-md">
                      {SHORT_PRESET_LABELS[activeProject.stylePresetId].title}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setSpeakAudio((v) => !v)}
                        aria-label="Lyd"
                        className="flex h-7 w-7 items-center justify-center rounded-full bg-black/45 backdrop-blur-md"
                      >
                        {speakAudio ? (
                          <Volume2 className="h-3.5 w-3.5" />
                        ) : (
                          <VolumeX className="h-3.5 w-3.5" />
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => setPlaying((v) => !v)}
                        aria-label="Afspil"
                        className="flex h-7 w-7 items-center justify-center rounded-full bg-black/45 backdrop-blur-md"
                      >
                        {playing ? (
                          <Pause className="h-3.5 w-3.5" />
                        ) : (
                          <Play className="h-3.5 w-3.5" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Live Kinetic Caption */}
                  {currentScene && (
                    <div className="absolute inset-x-3.5 bottom-13 z-10 space-y-2 text-center">
                      <div className="inline-block rounded-xl bg-white px-3 py-1.5 font-display text-[13.5px] font-bold leading-tight text-[#0F172A] shadow-lg">
                        {currentScene.onScreenCaption}
                      </div>
                      <p className="rounded-xl bg-black/55 px-2.5 py-1.5 text-[11px] leading-snug text-white/95 backdrop-blur-md">
                        &ldquo;{currentScene.spokenLine}&rdquo;
                      </p>
                    </div>
                  )}

                  {/* Bottom Meta CTA Strip */}
                  <div className="absolute inset-x-3 bottom-3 z-10 flex items-center justify-between rounded-xl bg-[#0027eb] px-3 py-1.5 text-[11px] font-bold text-white">
                    <span className="truncate">{activeProject.brandName}</span>
                    <span>{activeProject.ctaText} →</span>
                  </div>
                </div>

                {/* Clean 1-Row Footer Actions (Icon + Icon + Primary Launch) */}
                <div className="mt-4 flex w-full max-w-[290px] items-center gap-2">
                  <button
                    type="button"
                    onClick={copyBriefText}
                    title="Kopiér brief"
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#E6E9F0] bg-white text-[#475569] hover:border-[#0027eb] hover:text-[#0027eb]"
                  >
                    {copiedBrief ? (
                      <Check className="h-4 w-4 text-[#16A34A]" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => onSaveToSwipeFolder(activeProject)}
                    title="Gem i Swipe Folder"
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#E6E9F0] bg-white text-[#475569] hover:border-[#0027eb] hover:text-[#0027eb]"
                  >
                    <Bookmark className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onQueueForLaunch(activeProject)}
                    className="adtrack-btn-primary inline-flex flex-1 items-center justify-center gap-1.5 rounded-full py-2.5 text-xs font-semibold text-white"
                  >
                    <Rocket className="h-3.5 w-3.5" />
                    Send til Launch
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* =====================================================================
          TAB 2: STATIC AD CLONER (CANVAS-FIRST)
         ===================================================================== */}
      {subTab === "static" && activeProject && (
        <StaticCanvasAdRenderer
          project={activeProject}
          onUpdateProject={updateActive}
          onQueueForLaunch={onQueueForLaunch}
        />
      )}

      {/* =====================================================================
          TAB 3: MINIMAL URL MINER
         ===================================================================== */}
      {subTab === "miner" && (
        <div className="mx-auto max-w-3xl space-y-5">
          <div className="flex items-center gap-2 rounded-full border border-[#DCE4FF] bg-white p-2 shadow-[0_8px_28px_-12px_rgba(0,39,235,0.18)]">
            <Link2 className="ml-2.5 h-4 w-4 shrink-0 text-[#94A3B8]" />
            <input
              type="url"
              value={minerUrl}
              onChange={(e) => setMinerUrl(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  void runMineUrl();
                }
              }}
              placeholder="Indsæt produktside-URL..."
              className="min-w-0 flex-1 bg-transparent px-1 py-1.5 text-[16px] text-[#0F172A] outline-none sm:text-sm"
            />
            <button
              type="button"
              disabled={mining}
              onClick={() => void runMineUrl()}
              className="adtrack-btn-primary inline-flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2 text-xs font-semibold text-white disabled:opacity-60"
            >
              {mining ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Sparkles className="h-3.5 w-3.5" />
              )}
              Mine
            </button>
          </div>

          {minedInsights && (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-1.5">
                {minedInsights.painPoints.slice(0, 3).map((x, i) => (
                  <span
                    key={`p-${i}`}
                    className="rounded-full bg-[#FFF1F2] px-3 py-1 text-xs font-medium text-[#BE123C]"
                  >
                    {x}
                  </span>
                ))}
                {minedInsights.usps.slice(0, 3).map((x, i) => (
                  <span
                    key={`u-${i}`}
                    className="rounded-full bg-[#ECFDF3] px-3 py-1 text-xs font-medium text-[#15803D]"
                  >
                    {x}
                  </span>
                ))}
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                {minedInsights.recommendedAngles.map((ang, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setSubTab("video");
                      setPresetId(ang.presetId);
                      setAngleInput(ang.title);
                      void runGenerate({
                        overridePreset: ang.presetId,
                        overrideMode: "video",
                        overrideProduct: minedInsights.title,
                        overrideAngle: ang.title,
                      });
                    }}
                    className="group flex flex-col justify-between rounded-2xl border border-[#ECEFF5] bg-white p-4 text-left transition-all hover:border-[#0027eb]"
                  >
                    <div>
                      <span className="rounded-full bg-[#0027eb]/[0.08] px-2.5 py-0.5 text-[10px] font-bold text-[#0027eb]">
                        {SHORT_PRESET_LABELS[ang.presetId].title}
                      </span>
                      <p className="mt-2.5 font-display text-sm font-bold text-[#0F172A]">
                        {ang.title}
                      </p>
                      <p className="mt-1 line-clamp-2 text-xs text-[#64748B]">
                        &ldquo;{ang.hook}&rdquo;
                      </p>
                    </div>
                    <span className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-[#0027eb]">
                      Åbn i Studio
                      <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* =====================================================================
          TAB 4: VISUAL POSTER GALLERY (ASSETS)
         ===================================================================== */}
      {subTab === "assets" && (
        <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 lg:grid-cols-4">
          {projects.map((p) => {
            const img = p.productImageUrl || p.clonedFromAd?.thumbnailUrl;
            return (
              <div
                key={p.id}
                onClick={() => {
                  setActiveProject(p);
                  setSubTab(p.mode === "static_clone" ? "static" : "video");
                }}
                className="group relative aspect-[3/4] cursor-pointer overflow-hidden rounded-2xl border border-[#ECEFF5] bg-[#0F172A]"
              >
                {img && (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={img}
                    alt={p.title}
                    style={{ filter: getPresetById(p.stylePresetId).filterCss }}
                    className="h-full w-full object-cover opacity-80 transition-transform duration-500 group-hover:scale-105"
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-black/30" />

                <div className="absolute inset-x-3 top-3 flex items-center justify-between">
                  <span className="rounded-full bg-black/55 px-2.5 py-0.5 text-[10px] font-bold text-white backdrop-blur-md">
                    {SHORT_PRESET_LABELS[p.stylePresetId].title}
                  </span>
                  <span
                    className={`h-2.5 w-2.5 rounded-full ${
                      p.status === "live"
                        ? "bg-[#22C55E]"
                        : p.status === "queued"
                          ? "bg-[#3B82F6]"
                          : "bg-white/60"
                    }`}
                  />
                </div>

                <div className="absolute inset-x-3 bottom-3 flex items-end justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-display text-[13px] font-bold text-white">
                      {p.title}
                    </p>
                    <p className="truncate text-[10.5px] text-white/75">
                      {p.productTitle}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onQueueForLaunch(p);
                    }}
                    title="Launch"
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-[#0F172A] shadow transition-colors hover:bg-[#0027eb] hover:text-white"
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
  );
}
