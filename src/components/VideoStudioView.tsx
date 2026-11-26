"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  Bookmark,
  Check,
  ChevronRight,
  Clock,
  Copy,
  Download,
  Film,
  Image as ImageIcon,
  Layers,
  Link2,
  Loader2,
  Package,
  Pause,
  Pencil,
  Play,
  Rocket,
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
  initialSubTab?: StudioSubTab;
  onConsumeTrigger: () => void;
  onSaveProject: (proj: CreativeProject) => void;
  onQueueForLaunch: (proj: CreativeProject) => void;
  onSaveToSwipeFolder: (proj: CreativeProject) => void;
  onOpenBrandMemory: () => void;
}

const PRESET_META: Record<
  VideoStylePresetId,
  { title: string; tag: string; gradient: string }
> = {
  iphone_ugc: {
    title: "iPhone UGC",
    tag: "RAW 9:16",
    gradient: "from-[#064E3B] via-[#0F766E] to-[#5EEAD4]",
  },
  claymation_moa: {
    title: "Claymation",
    tag: "12 FPS CLAY",
    gradient: "from-[#7C2D12] via-[#EA580C] to-[#FDBA74]",
  },
  pixar_story: {
    title: "Pixar 3D",
    tag: "3D STORY",
    gradient: "from-[#061238] via-[#0027eb] to-[#7DD3FC]",
  },
  mini_drama: {
    title: "Mini-Drama",
    tag: "PLOT TWIST",
    gradient: "from-[#050811] via-[#1E293B] to-[#475569]",
  },
  founder_authority: {
    title: "Founder POV",
    tag: "AUTHORITY",
    gradient: "from-[#0F172A] via-[#334155] to-[#94A3B8]",
  },
  cinema_macro: {
    title: "Macro 60fps",
    tag: "CINEMA",
    gradient: "from-[#020617] via-[#0F172A] to-[#1D4ED8]",
  },
};

const STATIC_LAYOUTS: Array<{ id: StaticCloneLayoutId; label: string }> = [
  { id: "callout_pointers", label: "3 Callouts" },
  { id: "us_vs_them", label: "Os vs. Dem" },
  { id: "ugly_postit", label: "Post-It" },
  { id: "founder_quote", label: "Citat" },
  { id: "before_after", label: "Før / Efter" },
];

function StaticCanvasStage({
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
    <div className="flex h-full flex-col items-center justify-center space-y-4">
      <div className="flex flex-wrap items-center justify-center gap-1.5">
        {STATIC_LAYOUTS.map((l) => (
          <button
            key={l.id}
            type="button"
            onClick={() => onUpdateProject({ staticLayoutId: l.id })}
            className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
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
          onClick={() => setEditingText((v) => !v)}
          className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-semibold ${
            editingText
              ? "border-[#0027eb] bg-[#0027eb]/[0.08] text-[#0027eb]"
              : "border-[#E6E9F0] bg-white text-[#475569]"
          }`}
        >
          <Pencil className="h-3 w-3" />
          Tekst
        </button>
      </div>

      <canvas
        ref={canvasRef}
        className="max-h-[460px] w-auto rounded-2xl border border-[#E6E9F0] shadow-xl"
      />

      {editingText && (
        <div className="grid w-full max-w-lg grid-cols-1 gap-2 sm:grid-cols-2">
          <input
            type="text"
            value={project.headline}
            onChange={(e) => onUpdateProject({ headline: e.target.value })}
            placeholder="Overskrift"
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
              placeholder={`USP ${idx + 1}`}
              className="rounded-xl border border-[#DCE1EC] bg-white px-3 py-2 text-xs text-[#0F172A] outline-none focus:border-[#0027eb]"
            />
          ))}
        </div>
      )}

      <div className="flex items-center gap-2">
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
          onClick={() => onQueueForLaunch({ ...project, mode: "static_clone" })}
          className="adtrack-btn-primary inline-flex items-center gap-1.5 rounded-full px-5 py-2 text-xs font-semibold text-white"
        >
          <Rocket className="h-3.5 w-3.5" />
          Launch
        </button>
      </div>
    </div>
  );
}

export function VideoStudioView({
  brandMemory,
  projects,
  incomingTrigger,
  initialSubTab = "video",
  onConsumeTrigger,
  onSaveProject,
  onQueueForLaunch,
  onSaveToSwipeFolder,
  onOpenBrandMemory,
}: VideoStudioViewProps) {
  const [subTab, setSubTab] = useState<StudioSubTab>(initialSubTab);
  const [stageMode, setStageMode] = useState<"presets" | "preview" | "history">(
    projects.length > 0 ? "preview" : "presets"
  );
  const [presetId, setPresetId] = useState<VideoStylePresetId>("iphone_ugc");
  const [productTitle, setProductTitle] = useState<string>(
    brandMemory?.products[0]?.title || ""
  );
  const [aspectRatio, setAspectRatio] = useState<"9:16" | "4:5" | "1:1">("9:16");
  const [language, setLanguage] = useState<"da" | "en">("da");
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

  // URL Miner
  const [minerUrl, setMinerUrl] = useState(brandMemory?.products[0]?.url || "");
  const [mining, setMining] = useState(false);
  const [minedInsights, setMinedInsights] = useState<MinedUrlInsights | null>(
    null
  );

  useEffect(() => {
    setSubTab(initialSubTab);
    if (initialSubTab === "assets") setStageMode("history");
  }, [initialSubTab]);

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
          angle: opts?.overrideAngle || undefined,
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
        setStageMode("preview");
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
    if (!playing || displayScenes.length === 0 || stageMode !== "preview" || subTab !== "video") {
      return;
    }
    const timer = window.setInterval(() => {
      setSceneIdx((prev) => (prev + 1) % displayScenes.length);
    }, 3400);
    return () => window.clearInterval(timer);
  }, [playing, displayScenes.length, stageMode, subTab]);

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
    (activeProject?.stylePresetId || presetId) === "claymation_moa"
      ? "from-[#451A03] via-[#92400E] to-[#D97706]"
      : (activeProject?.stylePresetId || presetId) === "pixar_story"
        ? "from-[#061238] via-[#0027eb]/85 to-[#38BDF8]"
        : (activeProject?.stylePresetId || presetId) === "cinema_macro"
          ? "from-[#020617] via-[#0F172A] to-[#0027eb]"
          : "from-[#050811] via-[#1E293B] to-[#334155]";

  return (
    <div className="flex min-h-[calc(100vh-5.5rem)] flex-col gap-5 lg:flex-row">
      {/* =====================================================================
          LEFT HIGGSFIELD-STYLE CONTROL PANEL (320px FIXED ON DESKTOP)
         ===================================================================== */}
      <div className="flex w-full shrink-0 flex-col justify-between rounded-2xl border border-[#ECEFF5] bg-white p-3.5 shadow-[0_2px_12px_-4px_rgba(15,23,42,0.06)] lg:w-[320px]">
        <div className="space-y-3">
          {/* Higgsfield Top Mode Tabs */}
          <div className="flex items-center gap-4 border-b border-[#F1F5F9] pb-2.5 text-xs font-semibold">
            {(
              [
                { id: "video", label: "Create Video" },
                { id: "static", label: "Static" },
                { id: "miner", label: "URL Miner" },
              ] as const
            ).map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => {
                  setSubTab(t.id);
                  if (t.id === "static" && !activeProject) {
                    void runGenerate({ overrideMode: "static_clone" });
                  }
                }}
                className={`relative pb-2.5 -mb-[11px] transition-colors ${
                  subTab === t.id
                    ? "border-b-2 border-[#0F172A] text-[#0F172A]"
                    : "text-[#94A3B8] hover:text-[#475569]"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Active Preset Banner Card + Change Button (exact Higgsfield pattern) */}
          <div
            onClick={() => {
              setSubTab("video");
              setStageMode("presets");
            }}
            className={`group relative aspect-[16/9] w-full cursor-pointer overflow-hidden rounded-xl bg-gradient-to-br ${currentPresetMeta.gradient}`}
          >
            {previewProductImage && (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={previewProductImage}
                alt={currentPresetMeta.title}
                style={{ filter: getPresetById(presetId).filterCss }}
                className="absolute inset-0 h-full w-full object-cover opacity-55 mix-blend-luminosity transition-transform duration-500 group-hover:scale-105"
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-black/20" />

            <span className="absolute right-2.5 top-2.5 inline-flex items-center gap-1 rounded-lg bg-black/55 px-2.5 py-1 text-[10.5px] font-semibold text-white backdrop-blur-md transition-colors group-hover:bg-[#0027eb]">
              <Pencil className="h-2.5 w-2.5" />
              Skift
            </span>

            <div className="absolute inset-x-3 bottom-2.5">
              <p className="font-display text-[15px] font-bold uppercase tracking-wide text-white">
                {currentPresetMeta.title}
              </p>
              <p className="font-mono-num text-[10px] text-white/75">
                {currentPresetMeta.tag} · Flake Engine
              </p>
            </div>
          </div>

          {/* Reference / Product Drop Box (exact Higgsfield "Add references" tile) */}
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
                    Cloner Swipe-Ad
                  </p>
                  <p className="truncate text-xs font-semibold text-[#0F172A]">
                    {activeProject.clonedFromAd.brandName}
                  </p>
                </div>
              </div>
            ) : brandMemory && brandMemory.products.length > 0 ? (
              <div className="space-y-1.5">
                <span className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-[#94A3B8]">
                  <Package className="h-3 w-3" />
                  Produkt-reference
                </span>
                <select
                  value={productTitle}
                  onChange={(e) => setProductTitle(e.target.value)}
                  className="w-full rounded-lg border border-[#E6E9F0] bg-white px-2.5 py-1.5 text-xs font-semibold text-[#0F172A] outline-none focus:border-[#0027eb]"
                >
                  {brandMemory.products.map((p, idx) => (
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
                <div className="mb-1.5 flex items-center -space-x-1.5">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full border border-white bg-[#E2E8F0] text-[#475569]">
                    <ImageIcon className="h-3.5 w-3.5" />
                  </span>
                  <span className="flex h-7 w-7 items-center justify-center rounded-full border border-white bg-[#0F172A] text-white">
                    <Film className="h-3.5 w-3.5" />
                  </span>
                </div>
                <p className="text-xs font-semibold text-[#0F172A]">
                  Tilføj produkt / brand
                </p>
                <p className="text-[10.5px] text-[#94A3B8]">
                  Billede eller Brand Memory
                </p>
              </button>
            )}
          </div>

          {/* Higgsfield Prompt Card */}
          <div className="rounded-xl border border-[#E6E9F0] bg-[#FAFBFD] p-3">
            <label className="block text-[11px] font-semibold text-[#64748B]">
              Prompt
            </label>
            <textarea
              rows={3}
              value={noteInput}
              onChange={(e) => setNoteInput(e.target.value)}
              placeholder="Beskriv en idé eller lad Flake skrive hele scriptet automatisk..."
              className="mt-1 w-full resize-none bg-transparent text-xs leading-relaxed text-[#0F172A] outline-none placeholder:text-[#94A3B8]"
            />
            <div className="mt-2 flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setSpeakAudio((v) => !v)}
                className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[10.5px] font-semibold ${
                  speakAudio
                    ? "border-[#0027eb]/30 bg-[#0027eb]/[0.08] text-[#0027eb]"
                    : "border-[#E6E9F0] bg-white text-[#64748B]"
                }`}
              >
                {speakAudio ? (
                  <Volume2 className="h-3 w-3" />
                ) : (
                  <VolumeX className="h-3 w-3" />
                )}
                Lyd {speakAudio ? "On" : "Off"}
              </button>
              <button
                type="button"
                onClick={() =>
                  setLanguage((l) => (l === "da" ? "en" : "da"))
                }
                className="rounded-md border border-[#E6E9F0] bg-white px-2 py-1 font-mono-num text-[10.5px] font-semibold uppercase text-[#475569]"
              >
                {language}
              </button>
            </div>
          </div>

          {/* Higgsfield 2x2 Bento Parameter Tiles */}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() =>
                setDuration((d) => (d === "15s" ? "30s" : "15s"))
              }
              className="flex items-center justify-between rounded-xl border border-[#E6E9F0] bg-[#FAFBFD] px-3 py-2 text-left hover:border-[#CBD5E1]"
            >
              <div>
                <p className="text-[10px] text-[#94A3B8]">Længde</p>
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

        {/* Full-width Flake Cobalt Generate CTA at Bottom of Left Panel */}
        <button
          type="button"
          disabled={generating}
          onClick={() =>
            void runGenerate({
              clonedFromAd: activeProject?.clonedFromAd,
            })
          }
          className="adtrack-btn-primary mt-4 flex w-full items-center justify-center gap-2 rounded-xl py-3 text-xs font-bold text-white disabled:opacity-60"
        >
          {generating ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Genererer...
            </>
          ) : (
            <>
              Generér
              <Sparkles className="h-3.5 w-3.5" />
            </>
          )}
        </button>
      </div>

      {/* =====================================================================
          RIGHT MAIN STAGE (HIGGSFIELD HERO / LIVE VIDEO / STATIC / HISTORY)
         ===================================================================== */}
      <div className="flex min-w-0 flex-1 flex-col rounded-2xl border border-[#ECEFF5] bg-white p-5">
        {/* Top Stage Bar: History / Presets / Preview */}
        <div className="mb-5 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => {
                setSubTab("video");
                setStageMode("history");
              }}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                stageMode === "history" && subTab !== "static" && subTab !== "miner"
                  ? "bg-[#0F172A] text-white"
                  : "text-[#64748B] hover:bg-[#F5F7FA] hover:text-[#0F172A]"
              }`}
            >
              <Clock className="h-3.5 w-3.5" />
              Historik ({projects.length})
            </button>
            <button
              type="button"
              onClick={() => {
                setSubTab("video");
                setStageMode("presets");
              }}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                stageMode === "presets" && subTab === "video"
                  ? "bg-[#0F172A] text-white"
                  : "text-[#64748B] hover:bg-[#F5F7FA] hover:text-[#0F172A]"
              }`}
            >
              <Layers className="h-3.5 w-3.5" />
              Presets
            </button>
            {activeProject && (
              <button
                type="button"
                onClick={() => {
                  setSubTab("video");
                  setStageMode("preview");
                }}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                  stageMode === "preview" && subTab === "video"
                    ? "bg-[#0F172A] text-white"
                    : "text-[#64748B] hover:bg-[#F5F7FA] hover:text-[#0F172A]"
                }`}
              >
                <Play className="h-3.5 w-3.5" />
                Preview
              </button>
            )}
          </div>

          {activeProject && subTab === "video" && stageMode === "preview" && (
            <div className="flex items-center gap-1.5">
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
                Brief
              </button>
              <button
                type="button"
                onClick={() => onSaveToSwipeFolder(activeProject)}
                className="inline-flex items-center gap-1 rounded-lg border border-[#E6E9F0] px-2.5 py-1.5 text-xs font-semibold text-[#475569] hover:text-[#0F172A]"
              >
                <Bookmark className="h-3.5 w-3.5" />
                Gem
              </button>
              <button
                type="button"
                onClick={() => onQueueForLaunch(activeProject)}
                className="adtrack-btn-primary inline-flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-semibold text-white"
              >
                <Rocket className="h-3.5 w-3.5" />
                Launch
              </button>
            </div>
          )}
        </div>

        {/* STAGE CONTENT */}
        <div className="flex-1">
          {/* 1. STATIC CLONER STAGE */}
          {subTab === "static" && activeProject && (
            <StaticCanvasStage
              project={activeProject}
              onUpdateProject={updateActive}
              onQueueForLaunch={onQueueForLaunch}
            />
          )}

          {/* 2. URL MINER STAGE */}
          {subTab === "miner" && (
            <div className="mx-auto max-w-2xl space-y-5 py-6">
              <div className="flex items-center gap-2 rounded-2xl border border-[#DCE4FF] bg-[#FAFBFD] p-1.5 pl-4">
                <Link2 className="h-4 w-4 shrink-0 text-[#94A3B8]" />
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
                  className="min-w-0 flex-1 bg-transparent py-1.5 text-sm text-[#0F172A] outline-none"
                />
                <button
                  type="button"
                  disabled={mining}
                  onClick={() => void runMineUrl()}
                  className="adtrack-btn-primary inline-flex shrink-0 items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-semibold text-white disabled:opacity-60"
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
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  {minedInsights.recommendedAngles.map((ang, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setSubTab("video");
                        setPresetId(ang.presetId);
                        void runGenerate({
                          overridePreset: ang.presetId,
                          overrideMode: "video",
                          overrideProduct: minedInsights.title,
                          overrideAngle: ang.title,
                        });
                      }}
                      className="group flex flex-col justify-between rounded-2xl border border-[#ECEFF5] bg-[#FAFBFD] p-4 text-left transition-all hover:border-[#0027eb] hover:bg-white"
                    >
                      <div>
                        <span className="rounded-full bg-[#0027eb]/[0.08] px-2 py-0.5 text-[10px] font-bold text-[#0027eb]">
                          {PRESET_META[ang.presetId].title}
                        </span>
                        <p className="mt-2 font-display text-sm font-bold text-[#0F172A]">
                          {ang.title}
                        </p>
                        <p className="mt-1 line-clamp-2 text-xs text-[#64748B]">
                          &ldquo;{ang.hook}&rdquo;
                        </p>
                      </div>
                      <span className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-[#0027eb]">
                        Generér
                        <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 3. HIGGSFIELD PRESETS & 1-CLICK HERO STAGE */}
          {subTab === "video" && stageMode === "presets" && (
            <div className="space-y-6">
              <div>
                <h2 className="font-display text-[22px] font-extrabold uppercase tracking-tight text-[#0F172A]">
                  Lav videoer med ét klik
                </h2>
                <p className="mt-1 text-xs text-[#64748B]">
                  Vælg en stil — Flake bygger automatisk 5 hooks, storyboard og færdigt ad-format.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3">
                {VIDEO_STYLE_PRESETS.map((p) => {
                  const meta = PRESET_META[p.id];
                  const selected = presetId === p.id;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        setPresetId(p.id);
                        void runGenerate({
                          overridePreset: p.id,
                          clonedFromAd: activeProject?.clonedFromAd,
                        });
                      }}
                      className={`group relative aspect-[4/5] overflow-hidden rounded-2xl bg-gradient-to-br ${meta.gradient} text-left transition-all ${
                        selected
                          ? "ring-[2.5px] ring-[#0027eb] ring-offset-2"
                          : "hover:scale-[1.01]"
                      }`}
                    >
                      {previewProductImage && (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={previewProductImage}
                          alt={meta.title}
                          style={{ filter: p.filterCss }}
                          className="absolute inset-0 h-full w-full object-cover opacity-55 mix-blend-luminosity transition-transform duration-500 group-hover:scale-105"
                        />
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/15 to-transparent" />
                      <div className="absolute inset-x-3.5 bottom-3.5">
                        <span className="font-mono-num text-[9.5px] font-bold tracking-wider text-white/75">
                          {meta.tag}
                        </span>
                        <p className="font-display text-[15px] font-bold text-white">
                          {meta.title}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* 4. LIVE VIDEO PREVIEW STAGE */}
          {subTab === "video" && stageMode === "preview" && activeProject && (
            <div className="flex flex-col items-center space-y-4">
              {/* Hook Switcher Pills */}
              <div className="no-scrollbar flex max-w-full gap-1.5 overflow-x-auto pb-0.5">
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

              {/* Centerpiece Phone Frame */}
              <div
                className={`relative aspect-[9/16] w-full max-w-[275px] overflow-hidden rounded-[26px] border-[5px] border-[#0F172A] bg-gradient-to-b ${backdropStyle} shadow-[0_24px_54px_-14px_rgba(15,23,42,0.32)]`}
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
                    onClick={() => setPlaying((v) => !v)}
                    className="flex h-7 w-7 items-center justify-center rounded-full bg-black/45 backdrop-blur-md"
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

              {/* 4-Frame Visual Scene Scrubber */}
              <div className="grid w-full max-w-xl grid-cols-2 gap-2 sm:grid-cols-4">
                {displayScenes.map((sc, idx) => (
                  <button
                    key={sc.id}
                    type="button"
                    onClick={() => {
                      setPlaying(false);
                      setSceneIdx(idx);
                      setEditingSceneIdx(editingSceneIdx === idx ? null : idx);
                    }}
                    className={`rounded-xl border p-2.5 text-left transition-all ${
                      idx === sceneIdx
                        ? "border-[#0027eb] bg-[#0027eb]/[0.05]"
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
                        const nextScenes = activeProject.scenes.map((item, i) =>
                          i === editingSceneIdx
                            ? { ...item, spokenLine: e.target.value }
                            : item
                        );
                        updateActive({ scenes: nextScenes });
                      }}
                      placeholder="Voiceover"
                      className="rounded-xl border border-[#DCE1EC] bg-[#FAFBFD] px-3 py-2 text-xs text-[#0F172A] outline-none focus:border-[#0027eb] focus:bg-white"
                    />
                    <input
                      type="text"
                      value={
                        activeProject.scenes[editingSceneIdx].onScreenCaption
                      }
                      onChange={(e) => {
                        const nextScenes = activeProject.scenes.map((item, i) =>
                          i === editingSceneIdx
                            ? { ...item, onScreenCaption: e.target.value }
                            : item
                        );
                        updateActive({ scenes: nextScenes });
                      }}
                      placeholder="Tekst på skærm"
                      className="rounded-xl border border-[#DCE1EC] bg-[#FAFBFD] px-3 py-2 text-xs font-semibold text-[#0F172A] outline-none focus:border-[#0027eb] focus:bg-white"
                    />
                  </div>
                )}
            </div>
          )}

          {/* 5. HISTORY / ASSETS POSTER WALL */}
          {subTab !== "static" && subTab !== "miner" && stageMode === "history" && (
            <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3">
              {projects.map((p) => {
                const img = p.productImageUrl || p.clonedFromAd?.thumbnailUrl;
                return (
                  <div
                    key={p.id}
                    onClick={() => {
                      setActiveProject(p);
                      setSubTab(p.mode === "static_clone" ? "static" : "video");
                      setStageMode("preview");
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
              {projects.length === 0 && (
                <div className="col-span-full py-16 text-center text-xs text-[#94A3B8]">
                  Ingen videoer endnu — vælg en stil og klik Generér.
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
