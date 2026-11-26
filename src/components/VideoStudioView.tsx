"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  Bookmark,
  Check,
  ChevronDown,
  Copy,
  Download,
  Film,
  Image as ImageIcon,
  Layers,
  Link2,
  Loader2,
  Package,
  Pause,
  Play,
  RefreshCw,
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

const STATIC_LAYOUTS: Array<{
  id: StaticCloneLayoutId;
  label: string;
  desc: string;
}> = [
  { id: "callout_pointers", label: "3 Callout Pointers", desc: "Produkt i centrum med 3 knivskarpe USP-pile" },
  { id: "us_vs_them", label: "Os vs. Dem", desc: "Split-sammenligning der afviser konkurrenter" },
  { id: "ugly_postit", label: "Post-It Note UGC", desc: "Troværdigt 'hjemmelavet' stop-scroll layout" },
  { id: "founder_quote", label: "Founder / Anmeldelse", desc: "Stjernedokumentation + stort citat" },
  { id: "before_after", label: "Før / Efter Kontrast", desc: "Tydelig problem → løsning kontrast" },
];

function PresetVisualBadge({ id }: { id: VideoStylePresetId }) {
  if (id === "claymation_moa") {
    return (
      <div className="relative flex h-12 w-full items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-[#FDE68A] via-[#FDBA74] to-[#F59E0B] p-2">
        <div className="h-7 w-7 rounded-full border-2 border-white/80 bg-[#EA580C] shadow-inner" />
        <div className="-ml-2 h-6 w-6 rounded-full border-2 border-white/80 bg-[#0F172A] shadow-inner" />
        <span className="ml-2 rounded-md bg-white/90 px-1.5 py-0.5 font-mono-num text-[9.5px] font-bold text-[#92400E]">
          12 FPS CLAY
        </span>
      </div>
    );
  }
  if (id === "pixar_story") {
    return (
      <div className="relative flex h-12 w-full items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-[#DBEAFE] via-[#93B4D8] to-[#0027eb]/80 p-2">
        <div className="h-7 w-7 rounded-2xl border border-white/70 bg-white/90 shadow-md" />
        <span className="ml-2 rounded-md bg-white/90 px-1.5 py-0.5 font-mono-num text-[9.5px] font-bold text-[#0027eb]">
          3D STORY
        </span>
      </div>
    );
  }
  if (id === "mini_drama") {
    return (
      <div className="relative flex h-12 w-full items-center justify-between overflow-hidden rounded-xl bg-[#0F172A] px-3 text-white">
        <span className="rounded bg-[#E11D48] px-1.5 py-0.5 font-mono-num text-[9px] font-bold">
          REC ●
        </span>
        <span className="font-display text-[11px] font-bold">PLOT TWIST</span>
      </div>
    );
  }
  if (id === "founder_authority") {
    return (
      <div className="relative flex h-12 w-full items-center justify-between overflow-hidden rounded-xl border border-[#DCE1EC] bg-gradient-to-r from-[#F8FAFC] to-[#EEF2FF] px-3">
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#0F172A] text-[10px] font-bold text-white">
          FD
        </span>
        <span className="font-mono-num text-[10px] font-bold text-[#0F172A]">
          FOUNDER POV
        </span>
      </div>
    );
  }
  if (id === "cinema_macro") {
    return (
      <div className="relative flex h-12 w-full items-center justify-center overflow-hidden rounded-xl bg-gradient-to-r from-[#050811] via-[#1E293B] to-[#0027eb]/70 px-3 text-white">
        <span className="font-mono-num text-[10px] font-bold tracking-widest">
          100MM MACRO · 60FPS
        </span>
      </div>
    );
  }
  return (
    <div className="relative flex h-12 w-full items-center justify-between overflow-hidden rounded-xl bg-gradient-to-br from-[#ECFDF3] via-[#D1FAE5] to-[#A7F3D0] px-3">
      <span className="rounded-md bg-white/90 px-1.5 py-0.5 font-mono-num text-[9.5px] font-bold text-[#15803D]">
        iPHONE 9:16
      </span>
      <span className="text-[10.5px] font-bold text-[#065F46]">RAW UGC</span>
    </div>
  );
}

function InteractivePhonePlayer({
  project,
  selectedHookId,
  onSelectHook,
}: {
  project: CreativeProject;
  selectedHookId: string;
  onSelectHook: (hookId: string) => void;
}) {
  const [playing, setPlaying] = useState(true);
  const [sceneIdx, setSceneIdx] = useState(0);
  const [speakAudio, setSpeakAudio] = useState(false);

  const preset = getPresetById(project.stylePresetId);
  const activeHook =
    project.hooks.find((h) => h.id === selectedHookId) || project.hooks[0];

  const displayScenes = useMemo(() => {
    return project.scenes.map((sc, i) =>
      i === 0 && activeHook
        ? {
            ...sc,
            spokenLine: activeHook.spokenHook,
            onScreenCaption: activeHook.onScreenText,
          }
        : sc
    );
  }, [project.scenes, activeHook]);

  const currentScene = displayScenes[sceneIdx] || displayScenes[0];

  useEffect(() => {
    if (!playing || displayScenes.length === 0) return;
    const ms = project.stylePresetId === "claymation_moa" ? 3200 : 3600;
    const timer = window.setInterval(() => {
      setSceneIdx((prev) => (prev + 1) % displayScenes.length);
    }, ms);
    return () => window.clearInterval(timer);
  }, [playing, displayScenes.length, project.stylePresetId]);

  useEffect(() => {
    if (!speakAudio || typeof window === "undefined" || !("speechSynthesis" in window)) {
      return;
    }
    window.speechSynthesis.cancel();
    if (!currentScene?.spokenLine) return;
    const u = new SpeechSynthesisUtterance(currentScene.spokenLine);
    u.lang = project.language === "en" ? "en-US" : "da-DK";
    u.rate = 1.04;
    window.speechSynthesis.speak(u);
    return () => window.speechSynthesis.cancel();
  }, [speakAudio, currentScene?.spokenLine, project.language]);

  const backdropStyle =
    project.stylePresetId === "claymation_moa"
      ? "from-[#451A03] via-[#92400E] to-[#D97706]"
      : project.stylePresetId === "pixar_story"
        ? "from-[#061238] via-[#0027eb]/85 to-[#38BDF8]"
        : project.stylePresetId === "mini_drama"
          ? "from-[#050811] via-[#1E293B] to-[#334155]"
          : project.stylePresetId === "cinema_macro"
            ? "from-[#050811] via-[#0F172A] to-[#0027eb]"
            : "from-[#0F172A] via-[#1E293B] to-[#334155]";

  const ratioClass =
    project.aspectRatio === "1:1"
      ? "aspect-square max-w-[330px]"
      : project.aspectRatio === "4:5"
        ? "aspect-[4/5] max-w-[310px]"
        : "aspect-[9/16] max-w-[275px]";

  return (
    <div className="flex flex-col items-center">
      {/* Hook Variant Pills right above Phone */}
      <div className="mb-3 w-full space-y-1.5">
        <p className="text-[10.5px] font-semibold uppercase tracking-wider text-[#64748B]">
          Vælg Hook (De første 3 sek.)
        </p>
        <div className="no-scrollbar flex gap-1.5 overflow-x-auto pb-1">
          {project.hooks.map((h) => {
            const active = h.id === selectedHookId;
            return (
              <button
                key={h.id}
                type="button"
                onClick={() => {
                  onSelectHook(h.id);
                  setSceneIdx(0);
                }}
                className={`shrink-0 rounded-xl border px-2.5 py-1.5 text-left transition-all ${
                  active
                    ? "border-[#0027eb] bg-[#0027eb]/[0.08] text-[#0027eb]"
                    : "border-[#E6E9F0] bg-white text-[#334155] hover:border-[#CBD5E1]"
                }`}
              >
                <span className="block text-[11px] font-bold">{h.label}</span>
                <span className="font-mono-num text-[10px] text-[#64748B]">
                  Est. Thumbstop {h.predictedThumbstopPct}%
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Simulated Mobile Video Preview */}
      <div
        className={`relative w-full overflow-hidden rounded-[24px] border-[4px] border-[#0F172A] bg-gradient-to-b ${backdropStyle} ${ratioClass} shadow-[0_20px_50px_-14px_rgba(15,23,42,0.35)]`}
      >
        {/* Product / Clone Media Layer with Preset Motion */}
        {(project.productImageUrl || project.clonedFromAd?.thumbnailUrl) && (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            key={`${currentScene?.id}-${sceneIdx}`}
            src={
              sceneIdx === 1 && project.clonedFromAd?.thumbnailUrl
                ? project.clonedFromAd.thumbnailUrl
                : project.productImageUrl || project.clonedFromAd?.thumbnailUrl
            }
            alt={project.productTitle}
            style={{ filter: preset.filterCss }}
            className={`absolute inset-0 h-full w-full object-cover opacity-80 transition-transform duration-1000 ${
              sceneIdx % 2 === 0 ? "scale-105" : "scale-100"
            }`}
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-black/50" />

        {/* Top TikTok/Reels HUD */}
        <div className="relative z-10 flex items-center justify-between px-3.5 pt-3 text-white">
          <div className="flex items-center gap-1.5">
            <span className="rounded-md bg-white/20 px-2 py-0.5 font-mono-num text-[9.5px] font-bold backdrop-blur-md">
              {preset.name}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setSpeakAudio((v) => !v)}
              title="Hør AI-oplæsning"
              className="flex h-7 w-7 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur-md"
            >
              {speakAudio ? <Volume2 className="h-3.5 w-3.5" /> : <VolumeX className="h-3.5 w-3.5" />}
            </button>
            <button
              type="button"
              onClick={() => setPlaying((v) => !v)}
              className="flex h-7 w-7 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur-md"
            >
              {playing ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
            </button>
          </div>
        </div>

        {/* Center-Lower Kinetic Caption + Voiceover Subtitles */}
        {currentScene && (
          <div className="absolute inset-x-3 bottom-12 z-10 space-y-2 text-center">
            <div className="inline-block rounded-lg bg-white px-3 py-1 font-display text-[13px] font-bold leading-tight text-[#0F172A] shadow-lg">
              {currentScene.onScreenCaption}
            </div>
            <p className="rounded-xl bg-black/60 px-2.5 py-1.5 text-[11px] font-medium leading-snug text-white/95 backdrop-blur-md">
              &ldquo;{currentScene.spokenLine}&rdquo;
            </p>
            <p className="text-[10px] font-medium text-white/75">
              {currentScene.visualDirection}
            </p>
          </div>
        )}

        {/* Bottom CTA Overlay Preview */}
        <div className="absolute inset-x-3 bottom-3 z-10 flex items-center justify-between rounded-xl bg-[#0027eb] px-3 py-1.5 text-[11px] font-bold text-white shadow-md">
          <span className="truncate">{project.brandName}</span>
          <span>{project.ctaText} →</span>
        </div>
      </div>

      {/* Scene Timeline Scrubber */}
      <div className="mt-3 grid w-full grid-cols-4 gap-1.5">
        {displayScenes.map((sc, idx) => (
          <button
            key={sc.id}
            type="button"
            onClick={() => {
              setPlaying(false);
              setSceneIdx(idx);
            }}
            className={`rounded-xl border p-2 text-left transition-colors ${
              idx === sceneIdx
                ? "border-[#0027eb] bg-[#0027eb]/[0.07]"
                : "border-[#E6E9F0] bg-white hover:border-[#CBD5E1]"
            }`}
          >
            <span className="block font-mono-num text-[9.5px] font-bold text-[#64748B]">
              {sc.timeRange}
            </span>
            <span className="block truncate text-[10.5px] font-bold text-[#0F172A]">
              Scene {sc.sceneNumber}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

function StaticCanvasAdRenderer({
  project,
  onUpdateProject,
}: {
  project: CreativeProject;
  onUpdateProject: (patch: Partial<CreativeProject>) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

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
      // Background
      ctx.fillStyle = project.staticLayoutId === "ugly_postit" ? "#FEF3C7" : "#F7F8FB";
      ctx.fillRect(0, 0, w, h);

      // Subtle header brand strip
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

      // Headline block
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

        // Left: Us
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

        // Right: Them
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
        ctx.fillText("Andre Løsninger", 55 + colW + 40 + colW / 2, boxY + 75);

        ctx.textAlign = "left";
        ctx.fillStyle = "#475569";
        ctx.font = "500 30px sans-serif";
        project.themPoints.slice(0, 4).forEach((pt, idx) => {
          ctx.fillText(`✕ ${pt.slice(0, 24)}`, 90 + colW + 40, boxY + 170 + idx * 105);
        });
      } else {
        // Product showcase frame
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
          ctx.roundRect(imgX + 16, imgY + 16, imgBoxSize - 32, imgBoxSize - 32, 26);
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
          ctx.fillText(project.productTitle.slice(0, 24), w / 2, imgY + imgBoxSize / 2);
        }

        // 3 Callout Badges around bottom
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

      // Bottom CTA Strip
      ctx.fillStyle = "#0027eb";
      ctx.fillRect(0, h - 105, w, 105);
      ctx.fillStyle = "#FFFFFF";
      ctx.font = "bold 36px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(`${project.ctaText.toUpperCase()}  ·  ${project.brandName.toUpperCase()}`, w / 2, h - 40);
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
      // ignore tainted canvas CORS if external CDN lacked CORS headers
    }
  };

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
      <div className="space-y-4 lg:col-span-6">
        <div>
          <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">
            Vælg Static Layout (1080px eksport)
          </label>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {STATIC_LAYOUTS.map((l) => (
              <button
                key={l.id}
                type="button"
                onClick={() => onUpdateProject({ staticLayoutId: l.id })}
                className={`rounded-xl border p-3 text-left transition-colors ${
                  project.staticLayoutId === l.id
                    ? "border-[#0027eb] bg-[#0027eb]/[0.07]"
                    : "border-[#E6E9F0] bg-white hover:border-[#CBD5E1]"
                }`}
              >
                <p className="text-xs font-bold text-[#0F172A]">{l.label}</p>
                <p className="mt-0.5 text-[11px] text-[#64748B]">{l.desc}</p>
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">
            Overskrift i billede
          </label>
          <input
            type="text"
            value={project.headline}
            onChange={(e) => onUpdateProject({ headline: e.target.value })}
            className="w-full rounded-xl border border-[#DCE1EC] bg-white px-3 py-2 text-[16px] font-semibold text-[#0F172A] outline-none focus:border-[#0027eb] sm:text-xs"
          />
        </div>

        <div className="space-y-2">
          <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">
            3 Callouts / USP-punkter
          </label>
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
              placeholder={`Punkt ${idx + 1}`}
              className="w-full rounded-xl border border-[#DCE1EC] bg-white px-3 py-2 text-[16px] text-[#0F172A] outline-none focus:border-[#0027eb] sm:text-xs"
            />
          ))}
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={downloadPng}
            className="adtrack-btn-primary inline-flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-xs font-semibold text-white"
          >
            <Download className="h-3.5 w-3.5" />
            Download PNG ({dims.w}×{dims.h})
          </button>
          {(["4:5", "9:16", "1:1"] as const).map((ratio) => (
            <button
              key={ratio}
              type="button"
              onClick={() => onUpdateProject({ aspectRatio: ratio })}
              className={`rounded-xl border px-3 py-2 font-mono-num text-xs font-semibold ${
                project.aspectRatio === ratio
                  ? "border-[#0F172A] bg-[#0F172A] text-white"
                  : "border-[#E6E9F0] bg-white text-[#475569]"
              }`}
            >
              {ratio}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col items-center justify-center rounded-2xl border border-[#ECEFF5] bg-[#FAFBFD] p-4 lg:col-span-6">
        <canvas
          ref={canvasRef}
          className="max-h-[460px] w-auto rounded-2xl border border-[#DCE1EC] bg-white shadow-lg"
        />
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
  onOpenBrandMemory,
}: VideoStudioViewProps) {
  const [subTab, setSubTab] = useState<StudioSubTab>("video");
  const [presetId, setPresetId] = useState<VideoStylePresetId>("iphone_ugc");
  const [productTitle, setProductTitle] = useState<string>(
    brandMemory?.products[0]?.title || ""
  );
  const [aspectRatio, setAspectRatio] = useState<"9:16" | "4:5" | "1:1">("9:16");
  const [language, setLanguage] = useState<"da" | "en">("da");
  const [creatorPersona, setCreatorPersona] = useState<string>(CREATOR_PERSONAS[0].id);
  const [angleInput, setAngleInput] = useState("");
  const [noteInput, setNoteInput] = useState("");
  const [showTechPrompt, setShowTechPrompt] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [copiedBrief, setCopiedBrief] = useState(false);
  const [activeProject, setActiveProject] = useState<CreativeProject | null>(
    projects[0] || null
  );

  // URL & Review Miner state
  const [minerUrl, setMinerUrl] = useState(brandMemory?.products[0]?.url || "");
  const [minerReviews, setMinerReviews] = useState("");
  const [mining, setMining] = useState(false);
  const [minedInsights, setMinedInsights] = useState<MinedUrlInsights | null>(null);

  const runGenerate = async (opts?: {
    overridePreset?: VideoStylePresetId;
    overrideMode?: "video" | "static_clone";
    overrideProduct?: string;
    overrideAngle?: string;
    clonedFromAd?: ClonedSourceAd;
  }) => {
    setGenerating(true);
    const usePreset = opts?.overridePreset || presetId;
    const useMode = opts?.overrideMode || (subTab === "static" ? "static_clone" : "video");
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
          productTitle: opts?.overrideProduct || productTitle || brandMemory?.products[0]?.title,
          angle: opts?.overrideAngle || angleInput || undefined,
          userPrompt: noteInput || undefined,
          clonedFromAd: opts?.clonedFromAd,
        }),
      });
      const data = await res.json();
      if (res.ok && data?.ok && data.project) {
        const proj = data.project as CreativeProject;
        setActiveProject(proj);
        onSaveProject(proj);
      }
    } finally {
      setGenerating(false);
    }
  };

  // Handle incoming clone / Snow brief / double-down trigger automatically
  useEffect(() => {
    if (!incomingTrigger) return;
    const targetTab: StudioSubTab =
      incomingTrigger.mode === "static_clone" ? "static" : "video";
    setSubTab(targetTab);
    if (incomingTrigger.stylePresetId) setPresetId(incomingTrigger.stylePresetId);
    if (incomingTrigger.productTitle) setProductTitle(incomingTrigger.productTitle);
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

  // Auto-create initial draft preview on first visit so right pane is never dead empty
  useEffect(() => {
    if (!activeProject && !generating) {
      void runGenerate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
          url: minerUrl.trim() || undefined,
          rawReviews: minerReviews.trim() || undefined,
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
      `BRIEF: ${activeProject.title}`,
      `Format: ${getPresetById(activeProject.stylePresetId).name} (${activeProject.aspectRatio})`,
      `Vinkel: ${activeProject.angle}`,
      ``,
      `SCENER:`,
      ...activeProject.scenes.map(
        (s) =>
          `[${s.timeRange}] ${s.phase}\nTale: "${s.spokenLine}"\nTekst på skærm: ${s.onScreenCaption}\nVisuelt: ${s.visualDirection}`
      ),
      ``,
      `PRIMARY TEXT:\n${activeProject.primaryText}`,
      `HEADLINE: ${activeProject.headline}`,
    ].join("\n\n");
    await navigator.clipboard.writeText(text).catch(() => {});
    setCopiedBrief(true);
    setTimeout(() => setCopiedBrief(false), 1800);
  };

  return (
    <div className="space-y-5">
      {/* Studio Header + Brand Memory Banner */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="font-display text-[22px] font-bold leading-tight text-[#0F172A]">
              Ad Studio
            </h1>
            <span className="rounded-xl border border-[#ECEFF5] bg-white px-2.5 py-1 font-mono-num text-[11.5px] font-semibold text-[#334155] shadow-xs">
              0-Skill Producer
            </span>
          </div>
          <p className="mt-0.5 text-xs text-[#64748B]">
            Lav AI UGC, Claymation MOA, Pixar 3D & Mini-Drama videoer + Static Clones direkte ud fra dit brands hukommelse.
          </p>
        </div>

        <button
          type="button"
          onClick={onOpenBrandMemory}
          className="inline-flex items-center gap-2 rounded-xl border border-[#DCE1EC] bg-white px-3.5 py-2 text-xs font-semibold text-[#0F172A] transition-colors hover:border-[#0027eb] hover:text-[#0027eb]"
        >
          <Package className="h-3.5 w-3.5 text-[#64748B]" />
          {brandMemory ? `Brand Memory: ${brandMemory.brandName}` : "Forbind dit brand"}
        </button>
      </div>

      {/* Studio Sub-Navigation */}
      <div className="no-scrollbar flex items-center gap-1 overflow-x-auto border-b border-[#E6E9F0]">
        {[
          { id: "video" as StudioSubTab, label: "AI Video Maker", icon: Film },
          { id: "static" as StudioSubTab, label: "Static Ad Cloner", icon: ImageIcon },
          { id: "miner" as StudioSubTab, label: "URL & Review Miner", icon: Link2 },
          {
            id: "assets" as StudioSubTab,
            label: `Mine Creatives (${projects.length})`,
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
              className={`inline-flex shrink-0 items-center gap-1.5 border-b-2 px-3.5 py-2.5 font-display text-[13px] font-semibold transition-colors ${
                active
                  ? "border-[#0F172A] text-[#0F172A]"
                  : "border-transparent text-[#64748B] hover:text-[#0F172A]"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* =====================================================================
          SUB-TAB 1: ZERO-SKILL AI VIDEO MAKER (HIGGSFIELD + ATRIA WORKFLOW)
         ===================================================================== */}
      {subTab === "video" && (
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-12">
          {/* Left: Zero-Skill Preset Builder (7 cols) */}
          <div className="space-y-4 xl:col-span-7">
            {/* Cloned Source Comparison Card (if cloning from a Swipe Ad) */}
            {activeProject?.clonedFromAd && (
              <div className="flex items-center gap-3 rounded-2xl border border-[#DCE4FF] bg-[#F5F8FF] p-3.5">
                {activeProject.clonedFromAd.thumbnailUrl && (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={activeProject.clonedFromAd.thumbnailUrl}
                    alt=""
                    className="h-14 w-12 shrink-0 rounded-xl border border-[#DCE1EC] object-cover"
                  />
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="rounded-md bg-[#0027eb] px-1.5 py-0.5 text-[9.5px] font-bold text-white">
                      CLONER STRUKTUR
                    </span>
                    <span className="text-xs font-bold text-[#0F172A]">
                      {activeProject.clonedFromAd.brandName} ({activeProject.clonedFromAd.activeDays}d live)
                    </span>
                  </div>
                  <p className="mt-1 line-clamp-2 text-[11px] text-[#475569]">
                    Original copy: &ldquo;{activeProject.clonedFromAd.primaryText.slice(0, 140)}&rdquo;
                  </p>
                </div>
              </div>
            )}

            {/* Step 1: Visual Style Presets (Higgsfield-style, zero prompt engineering) */}
            <div className="adtrack-card rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="font-display text-[13.5px] font-bold text-[#0F172A]">
                  1. Vælg Stil (Ingen prompts nødvendige)
                </p>
                <span className="text-[11px] text-[#64748B]">6 testede formater</span>
              </div>
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
                {VIDEO_STYLE_PRESETS.map((p) => {
                  const selected = presetId === p.id;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setPresetId(p.id)}
                      className={`flex flex-col rounded-2xl border p-2.5 text-left transition-all ${
                        selected
                          ? "border-[#0027eb] bg-[#0027eb]/[0.05] ring-1 ring-[#0027eb]"
                          : "border-[#E6E9F0] bg-white hover:border-[#CBD5E1]"
                      }`}
                    >
                      <PresetVisualBadge id={p.id} />
                      <div className="mt-2 flex items-center justify-between gap-1">
                        <span className="truncate font-display text-[12.5px] font-bold text-[#0F172A]">
                          {p.name}
                        </span>
                      </div>
                      <p className="mt-0.5 line-clamp-2 text-[10.5px] leading-snug text-[#64748B]">
                        {p.description}
                      </p>
                      <span className="mt-1.5 inline-block w-fit rounded-md bg-[#F1F5F9] px-1.5 py-0.5 text-[9.5px] font-semibold text-[#334155]">
                        {p.badge}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Step 2: Simple Brand & Format Controls */}
            <div className="adtrack-card rounded-2xl p-4 space-y-3.5">
              <p className="font-display text-[13.5px] font-bold text-[#0F172A]">
                2. Produkt, Sprog & Format
              </p>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-[11px] font-semibold text-[#64748B]">
                    Produkt (fra Brand Memory)
                  </label>
                  {brandMemory && brandMemory.products.length > 0 ? (
                    <select
                      value={productTitle}
                      onChange={(e) => setProductTitle(e.target.value)}
                      className="w-full rounded-xl border border-[#DCE1EC] bg-white px-3 py-2 text-xs font-medium text-[#0F172A] outline-none focus:border-[#0027eb]"
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
                      placeholder="F.eks. Ergonomisk Hovedpude"
                      className="w-full rounded-xl border border-[#DCE1EC] bg-white px-3 py-2 text-[16px] text-[#0F172A] outline-none focus:border-[#0027eb] sm:text-xs"
                    />
                  )}
                </div>

                <div>
                  <label className="mb-1 block text-[11px] font-semibold text-[#64748B]">
                    Creator / Stemme
                  </label>
                  <select
                    value={creatorPersona}
                    onChange={(e) => setCreatorPersona(e.target.value)}
                    className="w-full rounded-xl border border-[#DCE1EC] bg-white px-3 py-2 text-xs font-medium text-[#0F172A] outline-none focus:border-[#0027eb]"
                  >
                    {CREATOR_PERSONAS.map((cp) => (
                      <option key={cp.id} value={cp.id}>
                        {cp.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-[11px] font-semibold text-[#64748B]">
                    Valgfri vinkel / ønske (1 linje)
                  </label>
                  <input
                    type="text"
                    value={noteInput}
                    onChange={(e) => setNoteInput(e.target.value)}
                    placeholder="F.eks. fokus på 30 dages prøve & søvn..."
                    className="w-full rounded-xl border border-[#DCE1EC] bg-white px-3 py-2 text-[16px] text-[#0F172A] outline-none focus:border-[#0027eb] sm:text-xs"
                  />
                </div>

                <div className="flex items-end justify-between gap-2">
                  <div className="inline-flex rounded-xl border border-[#E6E9F0] bg-[#F5F7FA] p-1 text-xs font-semibold">
                    {(
                      [
                        { id: "da", label: "Dansk" },
                        { id: "en", label: "English" },
                      ] as const
                    ).map((lang) => (
                      <button
                        key={lang.id}
                        type="button"
                        onClick={() => setLanguage(lang.id)}
                        className={`rounded-lg px-2.5 py-1.5 ${
                          language === lang.id
                            ? "bg-white text-[#0F172A] shadow-xs"
                            : "text-[#64748B]"
                        }`}
                      >
                        {lang.label}
                      </button>
                    ))}
                  </div>

                  <div className="inline-flex rounded-xl border border-[#E6E9F0] bg-[#F5F7FA] p-1 font-mono-num text-xs font-semibold">
                    {(["9:16", "4:5", "1:1"] as const).map((r) => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => setAspectRatio(r)}
                        className={`rounded-lg px-2.5 py-1.5 ${
                          aspectRatio === r
                            ? "bg-white text-[#0F172A] shadow-xs"
                            : "text-[#64748B]"
                        }`}
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <button
                type="button"
                disabled={generating}
                onClick={() =>
                  void runGenerate({
                    clonedFromAd: activeProject?.clonedFromAd,
                  })
                }
                className="adtrack-btn-primary flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-xs font-semibold text-white disabled:opacity-60"
              >
                {generating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Bygger 5 hooks & komplet storyboard...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    Generér Færdig Video-pakke (1 klik)
                  </>
                )}
              </button>
            </div>

            {/* Editable Scene Breakdown */}
            {activeProject && (
              <div className="adtrack-card rounded-2xl p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-display text-[13.5px] font-bold text-[#0F172A]">
                    3. Storyboard & Manuskript ({activeProject.scenes.length} scener)
                  </p>
                  <button
                    type="button"
                    onClick={() => setShowTechPrompt((v) => !v)}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#64748B] hover:text-[#0F172A]"
                  >
                    <SlidersHorizontal className="h-3 w-3" />
                    {showTechPrompt ? "Skjul kamera-prompt" : "Vis teknisk kamera-prompt"}
                    <ChevronDown
                      className={`h-3 w-3 transition-transform ${
                        showTechPrompt ? "rotate-180" : ""
                      }`}
                    />
                  </button>
                </div>

                <div className="space-y-2.5">
                  {activeProject.scenes.map((sc, idx) => (
                    <div
                      key={sc.id}
                      className="rounded-xl border border-[#ECEFF5] bg-[#FAFBFD] p-3 space-y-2"
                    >
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-bold text-[#0F172A]">
                          Scene {sc.sceneNumber} · {sc.phase}
                        </span>
                        <span className="font-mono-num text-[#64748B]">
                          {sc.timeRange} · {sc.cameraMotion}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                        <div>
                          <span className="text-[10px] font-semibold uppercase text-[#64748B]">
                            Voiceover / Tale
                          </span>
                          <textarea
                            rows={2}
                            value={sc.spokenLine}
                            onChange={(e) => {
                              const nextScenes = activeProject.scenes.map((item, i) =>
                                i === idx ? { ...item, spokenLine: e.target.value } : item
                              );
                              updateActive({ scenes: nextScenes });
                            }}
                            className="mt-0.5 w-full rounded-lg border border-[#E2E6EF] bg-white p-2 text-[11.5px] text-[#0F172A] outline-none focus:border-[#0027eb]"
                          />
                        </div>
                        <div>
                          <span className="text-[10px] font-semibold uppercase text-[#64748B]">
                            Tekst på skærmen
                          </span>
                          <textarea
                            rows={2}
                            value={sc.onScreenCaption}
                            onChange={(e) => {
                              const nextScenes = activeProject.scenes.map((item, i) =>
                                i === idx
                                  ? { ...item, onScreenCaption: e.target.value }
                                  : item
                              );
                              updateActive({ scenes: nextScenes });
                            }}
                            className="mt-0.5 w-full rounded-lg border border-[#E2E6EF] bg-white p-2 text-[11.5px] font-semibold text-[#0F172A] outline-none focus:border-[#0027eb]"
                          />
                        </div>
                      </div>

                      <p className="text-[11px] text-[#64748B]">
                        Visuelt: {sc.visualDirection}
                      </p>

                      {showTechPrompt && (
                        <p className="rounded-lg bg-[#0F172A] px-2.5 py-1.5 font-mono-num text-[10.5px] text-white/85">
                          {sc.hiddenPrompt}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right: Live Mobile Player + Launch Actions (5 cols) */}
          <div className="space-y-4 xl:col-span-5">
            {activeProject && (
              <div className="adtrack-card rounded-2xl p-4 space-y-4">
                <InteractivePhonePlayer
                  project={activeProject}
                  selectedHookId={activeProject.selectedHookId}
                  onSelectHook={(hookId) => {
                    const pickedHook = activeProject.hooks.find((h) => h.id === hookId);
                    if (!pickedHook) return;
                    const nextScenes = activeProject.scenes.map((sc, i) =>
                      i === 0
                        ? {
                            ...sc,
                            spokenLine: pickedHook.spokenHook,
                            onScreenCaption: pickedHook.onScreenText,
                          }
                        : sc
                    );
                    updateActive({ selectedHookId: hookId, scenes: nextScenes });
                  }}
                />

                {/* Ad Copy Preview */}
                <div className="rounded-xl border border-[#ECEFF5] bg-[#FAFBFD] p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10.5px] font-semibold uppercase text-[#64748B]">
                      Meta Ad Copy & Headline
                    </span>
                    <button
                      type="button"
                      onClick={copyBriefText}
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#0027eb]"
                    >
                      {copiedBrief ? (
                        <>
                          <Check className="h-3 w-3" /> Kopieret!
                        </>
                      ) : (
                        <>
                          <Copy className="h-3 w-3" /> Kopiér Canva/Brief
                        </>
                      )}
                    </button>
                  </div>
                  <p className="text-xs font-bold text-[#0F172A]">
                    {activeProject.headline}
                  </p>
                  <p className="whitespace-pre-line text-[11px] leading-relaxed text-[#475569]">
                    {activeProject.primaryText}
                  </p>
                </div>

                {/* Actions: Save to Swipe Folder + Launch to Meta */}
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => onSaveToSwipeFolder(activeProject)}
                    className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-[#DCE1EC] bg-white px-3 py-2.5 text-xs font-semibold text-[#0F172A] transition-colors hover:border-[#0027eb] hover:text-[#0027eb]"
                  >
                    <Bookmark className="h-3.5 w-3.5" />
                    Gem i Swipe Folder
                  </button>
                  <button
                    type="button"
                    onClick={() => onQueueForLaunch(activeProject)}
                    className="adtrack-btn-primary inline-flex items-center justify-center gap-1.5 rounded-xl px-3 py-2.5 text-xs font-semibold text-white"
                  >
                    <Rocket className="h-3.5 w-3.5" />
                    Send til Meta Launch →
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* =====================================================================
          SUB-TAB 2: STATIC AD CLONER & CANVAS FORMAT WALL
         ===================================================================== */}
      {subTab === "static" && activeProject && (
        <div className="adtrack-card rounded-2xl p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="font-display text-[15px] font-bold text-[#0F172A]">
                Static Ad Cloner & Format Wall
              </h2>
              <p className="text-xs text-[#64748B]">
                Generér højopløste PNG-billedannoncer direkte med dit brands USP&apos;er og produktbillede — klar til Meta Ads.
              </p>
            </div>
            <button
              type="button"
              onClick={() => onQueueForLaunch({ ...activeProject, mode: "static_clone" })}
              className="adtrack-btn-primary inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold text-white"
            >
              <Rocket className="h-3.5 w-3.5" />
              Send til Meta Launch →
            </button>
          </div>
          <StaticCanvasAdRenderer
            project={activeProject}
            onUpdateProject={updateActive}
          />
        </div>
      )}

      {/* =====================================================================
          SUB-TAB 3: URL & REVIEW MINER (ATRIA PATTERN)
         ===================================================================== */}
      {subTab === "miner" && (
        <div className="space-y-4">
          <div className="adtrack-card rounded-2xl p-5 space-y-3">
            <h2 className="font-display text-[15px] font-bold text-[#0F172A]">
              URL- & Kundeanmeldelse Miner
            </h2>
            <p className="text-xs text-[#64748B]">
              Indsæt en produktside, et advertorial eller rå kundeanmeldelser — så udtrækker vi automatisk pain points, desires & 3 færdige koncepter.
            </p>
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
              <div>
                <label className="mb-1 block text-[11px] font-semibold text-[#64748B]">
                  Produktside eller Advertorial URL
                </label>
                <input
                  type="url"
                  value={minerUrl}
                  onChange={(e) => setMinerUrl(e.target.value)}
                  placeholder="https://ditbrand.dk/products/..."
                  className="w-full rounded-xl border border-[#DCE1EC] bg-white px-3 py-2.5 text-[16px] text-[#0F172A] outline-none focus:border-[#0027eb] sm:text-xs"
                />
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-semibold text-[#64748B]">
                  Eller indsæt rå anmeldelser (valgfrit)
                </label>
                <input
                  type="text"
                  value={minerReviews}
                  onChange={(e) => setMinerReviews(e.target.value)}
                  placeholder="Indsæt Trustpilot / anmeldelses-tekst..."
                  className="w-full rounded-xl border border-[#DCE1EC] bg-white px-3 py-2.5 text-[16px] text-[#0F172A] outline-none focus:border-[#0027eb] sm:text-xs"
                />
              </div>
            </div>
            <button
              type="button"
              disabled={mining}
              onClick={() => void runMineUrl()}
              className="adtrack-btn-primary inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold text-white disabled:opacity-60"
            >
              {mining ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Udtrækker indsigter...
                </>
              ) : (
                <>
                  <RefreshCw className="h-3.5 w-3.5" />
                  Mine URL & Anmeldelser
                </>
              )}
            </button>
          </div>

          {minedInsights && (
            <div className="adtrack-card rounded-2xl p-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="font-display text-[15px] font-bold text-[#0F172A]">
                    {minedInsights.title}
                  </h3>
                  <p className="font-mono-num text-[11px] text-[#64748B]">
                    {minedInsights.url}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="rounded-xl border border-[#ECEFF5] bg-[#FAFBFD] p-3">
                  <p className="text-[10.5px] font-bold uppercase text-[#64748B]">
                    Pain Points
                  </p>
                  <ul className="mt-1.5 space-y-1 text-xs text-[#334155]">
                    {minedInsights.painPoints.map((x, i) => (
                      <li key={i}>• {x}</li>
                    ))}
                  </ul>
                </div>
                <div className="rounded-xl border border-[#ECEFF5] bg-[#FAFBFD] p-3">
                  <p className="text-[10.5px] font-bold uppercase text-[#64748B]">
                    Desires
                  </p>
                  <ul className="mt-1.5 space-y-1 text-xs text-[#334155]">
                    {minedInsights.desires.map((x, i) => (
                      <li key={i}>✓ {x}</li>
                    ))}
                  </ul>
                </div>
                <div className="rounded-xl border border-[#ECEFF5] bg-[#FAFBFD] p-3">
                  <p className="text-[10.5px] font-bold uppercase text-[#64748B]">
                    Udtrukne USP&apos;er
                  </p>
                  <ul className="mt-1.5 space-y-1 text-xs text-[#334155]">
                    {minedInsights.usps.map((x, i) => (
                      <li key={i}>★ {x}</li>
                    ))}
                  </ul>
                </div>
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
                    className="flex flex-col justify-between rounded-xl border border-[#E6E9F0] bg-white p-3.5 text-left transition-colors hover:border-[#0027eb]"
                  >
                    <div>
                      <span className="rounded-md bg-[#0027eb]/[0.08] px-2 py-0.5 text-[10px] font-bold text-[#0027eb]">
                        {getPresetById(ang.presetId).name}
                      </span>
                      <p className="mt-2 font-display text-xs font-bold text-[#0F172A]">
                        {ang.title}
                      </p>
                      <p className="mt-1 text-[11.5px] text-[#334155]">
                        &ldquo;{ang.hook}&rdquo;
                      </p>
                    </div>
                    <span className="mt-3 inline-flex items-center gap-1 text-[11px] font-semibold text-[#0027eb]">
                      Lav nu i Video Maker <ArrowRight className="h-3 w-3" />
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* =====================================================================
          SUB-TAB 4: GENERATED CREATIVES / ASSETS VAULT
         ===================================================================== */}
      {subTab === "assets" && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((p) => (
            <div
              key={p.id}
              className="adtrack-card flex flex-col justify-between rounded-2xl p-4"
            >
              <div>
                <div className="flex items-center justify-between gap-2">
                  <span className="rounded-md bg-[#F1F5F9] px-2 py-0.5 text-[10px] font-bold text-[#334155]">
                    {getPresetById(p.stylePresetId).name}
                  </span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                      p.status === "live"
                        ? "bg-[#ECFDF3] text-[#15803D]"
                        : p.status === "queued"
                          ? "bg-[#EEF2FF] text-[#0027eb]"
                          : "bg-[#F1F5F9] text-[#475569]"
                    }`}
                  >
                    {p.status === "live"
                      ? "Live på Meta"
                      : p.status === "queued"
                        ? "Klar til Launch"
                        : "Udkast"}
                  </span>
                </div>
                <h3 className="mt-2 font-display text-[13.5px] font-bold text-[#0F172A]">
                  {p.title}
                </h3>
                <p className="mt-1 line-clamp-2 text-[11.5px] text-[#64748B]">
                  {p.hooks[0]?.spokenHook}
                </p>
              </div>
              <div className="mt-4 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setActiveProject(p);
                    setSubTab(p.mode === "static_clone" ? "static" : "video");
                  }}
                  className="flex-1 rounded-xl border border-[#DCE1EC] bg-white px-3 py-1.5 text-xs font-semibold text-[#0F172A] hover:border-[#0027eb]"
                >
                  Åbn & Rediger
                </button>
                <button
                  type="button"
                  onClick={() => onQueueForLaunch(p)}
                  className="adtrack-btn-primary rounded-xl px-3 py-1.5 text-xs font-semibold text-white"
                >
                  Launch
                </button>
              </div>
            </div>
          ))}
          {projects.length === 0 && (
            <p className="col-span-full py-12 text-center text-xs text-[#94A3B8]">
              Ingen genererede creatives endnu — vælg en stil under AI Video Maker og tryk Generér.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
