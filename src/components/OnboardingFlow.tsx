"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowRight,
  Briefcase,
  Building2,
  Check,
  ChevronLeft,
  Coffee,
  Dumbbell,
  Film,
  HeartPulse,
  Lamp,
  Laptop,
  Package,
  PawPrint,
  Shirt,
  Smartphone,
  Sparkles,
  Store,
  Volume2,
  VolumeX,
} from "lucide-react";
import type { BrandMemory } from "@/lib/studio-types";
import type { ProductPreview } from "@/lib/types";
import { SnowMark } from "./SnowMascot";

interface OnboardingVideo {
  id: string;
  brandName: string;
  mediaUrl: string;
  thumbnailUrl: string;
  headline: string;
}

const ROLE_OPTIONS = [
  { id: "Brand owner / founder", label: "Brand owner / founder", icon: Store },
  { id: "Marketer at a brand", label: "Marketer hos et brand", icon: Laptop },
  { id: "Agency / consultant", label: "Bureau / konsulent", icon: Building2 },
  { id: "Video editor", label: "Video editor", icon: Film },
  { id: "UGC / content creator", label: "UGC / content creator", icon: Smartphone },
  { id: "Something else", label: "Noget andet", icon: Briefcase },
];

const INDUSTRY_OPTIONS = [
  { id: "Health & Wellness", label: "Health & Wellness", icon: HeartPulse },
  { id: "Beauty & Personal Care", label: "Beauty & Personal Care", icon: Sparkles },
  { id: "Apparel & Accessories", label: "Apparel & Accessories", icon: Shirt },
  { id: "Food & Beverage", label: "Food & Beverage", icon: Coffee },
  { id: "Home & Electronics", label: "Home & Electronics", icon: Lamp },
  { id: "Pets", label: "Pets", icon: PawPrint },
  {
    id: "Fitness, Sports & Outdoors",
    label: "Fitness, Sports & Outdoors",
    icon: Dumbbell,
  },
  {
    id: "Apps, Software & Courses",
    label: "Apps, Software & Courses",
    icon: Laptop,
  },
  { id: "Something else", label: "Noget andet", icon: Package },
];

const BRAND_STORAGE_KEY = "flake_studio_brand_memory_v1";
const ONBOARDING_STORAGE_KEY = "flake_onboarding_profile_v1";

export function OnboardingFlow() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const initialStep = Math.min(
    3,
    Math.max(1, Number(searchParams.get("step") || "1") || 1)
  ) as 1 | 2 | 3;

  const [step, setStep] = useState<1 | 2 | 3>(initialStep);
  const [role, setRole] = useState<string>(searchParams.get("role") || "");
  const [industry, setIndustry] = useState<string>(
    searchParams.get("industry") || ""
  );

  // Left-panel random video ad
  const [videos, setVideos] = useState<OnboardingVideo[]>([]);
  const [videoIdx, setVideoIdx] = useState(0);
  const [muted, setMuted] = useState(true);

  // Step 3 brand streaming state
  const [urlInput, setUrlInput] = useState("");
  const [phase, setPhase] = useState<"input" | "streaming" | "ready">("input");
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [domain, setDomain] = useState("");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [fallbackLogoUrl, setFallbackLogoUrl] = useState<string | null>(null);
  const [brandColors, setBrandColors] = useState<string[]>([]);
  const [products, setProducts] = useState<ProductPreview[]>([]);
  const [fallbackImageUrl, setFallbackImageUrl] = useState<string | null>(null);
  const [brandName, setBrandName] = useState<string | null>(null);
  const [description, setDescription] = useState<string | null>(null);
  const [creditsAdded, setCreditsAdded] = useState(false);
  const [finalMemory, setFinalMemory] = useState<BrandMemory | null>(null);
  const [editing, setEditing] = useState(false);

  const revealQueueRef = useRef<Array<() => void>>([]);
  const drainingRef = useRef(false);

  const enqueueReveal = useCallback((fn: () => void, delayMs = 340) => {
    revealQueueRef.current.push(fn);
    if (drainingRef.current) return;
    drainingRef.current = true;

    const drain = () => {
      const next = revealQueueRef.current.shift();
      if (!next) {
        drainingRef.current = false;
        return;
      }
      next();
      window.setTimeout(drain, delayMs);
    };
    drain();
  }, []);

  // Load random real video ads from Flake catalog
  useEffect(() => {
    let cancelled = false;
    fetch("/api/onboarding-video")
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled && d?.ok && Array.isArray(d.videos) && d.videos.length > 0) {
          setVideos(d.videos as OnboardingVideo[]);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const syncQuery = (nextStep: 1 | 2 | 3, nextRole: string, nextIndustry: string) => {
    const qs = new URLSearchParams();
    if (nextRole) qs.set("role", nextRole);
    if (nextIndustry) qs.set("industry", nextIndustry);
    qs.set("step", String(nextStep));
    router.replace(`/onboarding?${qs.toString()}`, { scroll: false });
  };

  const handleSelectRole = (picked: string) => {
    setRole(picked);
    window.setTimeout(() => {
      setStep(2);
      syncQuery(2, picked, industry);
    }, 180);
  };

  const handleSelectIndustry = (picked: string) => {
    setIndustry(picked);
    window.setTimeout(() => {
      setStep(3);
      syncQuery(3, role, picked);
    }, 180);
  };

  const handleBack = () => {
    if (step === 3) {
      if (phase !== "input") {
        setPhase("input");
        setError(null);
        return;
      }
      setStep(2);
      syncQuery(2, role, industry);
    } else if (step === 2) {
      setStep(1);
      syncQuery(1, role, industry);
    }
  };

  const startBrandStream = async () => {
    const trimmed = urlInput.trim();
    if (!trimmed) {
      setError("Indtast din hjemmeside — f.eks. archandpillar.dk");
      return;
    }

    // Reset live card slots cleanly
    revealQueueRef.current = [];
    drainingRef.current = false;
    setError(null);
    setPhase("streaming");
    setProgress(8);
    setDomain(
      trimmed
        .replace(/^https?:\/\//i, "")
        .replace(/^www\./i, "")
        .split("/")[0]
    );
    setLogoUrl(null);
    setFallbackLogoUrl(null);
    setBrandColors([]);
    setProducts([]);
    setFallbackImageUrl(null);
    setBrandName(null);
    setDescription(null);
    setCreditsAdded(false);
    setFinalMemory(null);
    setEditing(false);

    // Subtle animated baseline progress creep while waiting on network
    const creepTimer = window.setInterval(() => {
      setProgress((prev) => (prev < 86 ? Math.min(86, prev + 2) : prev));
    }, 450);

    try {
      const res = await fetch("/api/brand-memory/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: trimmed }),
      });

      if (!res.ok || !res.body) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson?.error || "Kunne ikke analysere hjemmesiden.");
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const rawLine of lines) {
          const line = rawLine.trim();
          if (!line) continue;
          let ev: Record<string, unknown>;
          try {
            ev = JSON.parse(line) as Record<string, unknown>;
          } catch {
            continue;
          }

          if (ev.type === "error") {
            throw new Error(String(ev.error || "Fejl under analyse."));
          }

          if (ev.type === "init") {
            enqueueReveal(() => {
              if (typeof ev.domain === "string") setDomain(ev.domain);
              setProgress((p) => Math.max(p, 16));
            }, 260);
          }

          if (ev.type === "logo_colors") {
            enqueueReveal(() => {
              if (typeof ev.logoUrl === "string") setLogoUrl(ev.logoUrl);
              if (typeof ev.fallbackLogoUrl === "string") {
                setFallbackLogoUrl(ev.fallbackLogoUrl);
              }
              if (Array.isArray(ev.brandColors)) {
                setBrandColors(ev.brandColors as string[]);
              }
              setCreditsAdded(true);
              setProgress((p) => Math.max(p, 48));
            }, 420);
          }

          if (ev.type === "products") {
            enqueueReveal(() => {
              if (Array.isArray(ev.products)) {
                setProducts(ev.products as ProductPreview[]);
              }
              if (typeof ev.fallbackImageUrl === "string") {
                setFallbackImageUrl(ev.fallbackImageUrl);
              }
              setProgress((p) => Math.max(p, 76));
            }, 420);
          }

          if (ev.type === "brand_info") {
            enqueueReveal(() => {
              if (typeof ev.brandName === "string") setBrandName(ev.brandName);
              if (typeof ev.description === "string") {
                setDescription(ev.description);
              }
              setProgress((p) => Math.max(p, 94));
            }, 380);
          }

          if (ev.type === "complete" && ev.memory) {
            const mem = ev.memory as BrandMemory;
            enqueueReveal(() => {
              setFinalMemory(mem);
              setBrandName((prev) => prev || mem.brandName);
              setDescription((prev) => prev || mem.description || "");
              if (mem.brandColors?.length) setBrandColors(mem.brandColors);
              if (mem.products?.length) setProducts(mem.products);
              setProgress(100);
              setPhase("ready");
            }, 240);
          }
        }
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Kunne ikke indlæse hjemmesiden."
      );
      setPhase("input");
    } finally {
      window.clearInterval(creepTimer);
    }
  };

  const handleFinish = () => {
    try {
      if (finalMemory) {
        const updatedMemory: BrandMemory = {
          ...finalMemory,
          brandName: brandName?.trim() || finalMemory.brandName,
          description: description?.trim() || finalMemory.description,
          brandColors:
            brandColors.length > 0 ? brandColors : finalMemory.brandColors,
        };
        localStorage.setItem(BRAND_STORAGE_KEY, JSON.stringify(updatedMemory));
      }
      localStorage.setItem(
        ONBOARDING_STORAGE_KEY,
        JSON.stringify({
          role,
          industry,
          credits: 300,
          completedAt: new Date().toISOString(),
        })
      );
    } catch {
      // ignore storage quota
    }
    router.push("/");
  };

  const currentVideo = videos[videoIdx] || null;
  const topProduct = products[0] || null;
  const extraProducts = products.slice(1, 4);

  return (
    <div className="flex h-[100dvh] w-full overflow-hidden bg-[#050811] text-white">
      {/* =====================================================================
          LEFT PANEL: FULL-BLEED RANDOM VIDEO AD SHOWCASE
         ===================================================================== */}
      <div className="relative hidden h-full w-[34%] min-w-[330px] max-w-[500px] shrink-0 overflow-hidden bg-[#0B0F1A] lg:block">
        {currentVideo ? (
          <video
            key={currentVideo.id}
            src={currentVideo.mediaUrl}
            poster={currentVideo.thumbnailUrl || undefined}
            autoPlay
            loop
            muted={muted}
            playsInline
            onError={() => {
              if (videoIdx + 1 < videos.length) {
                setVideoIdx((i) => i + 1);
              }
            }}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#061238] via-[#050811] to-[#0027eb]/30">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/icons/flake-wordmark-white.png"
              alt="Flake"
              className="h-7 w-auto opacity-80"
            />
          </div>
        )}

        {/* Subtle bottom/top gradient scrim for clean readability */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/25" />

        {/* Subtle Mute / Unmute Toggle */}
        {currentVideo && (
          <button
            type="button"
            onClick={() => setMuted((m) => !m)}
            aria-label={muted ? "Slå lyd til" : "Slå lyd fra"}
            className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-black/45 text-white/90 backdrop-blur-md transition-colors hover:bg-black/70"
          >
            {muted ? (
              <VolumeX className="h-4 w-4" />
            ) : (
              <Volume2 className="h-4 w-4" />
            )}
          </button>
        )}

        {/* Bottom-left "Made with Flake" pill */}
        <div className="absolute bottom-5 left-5 inline-flex items-center gap-2 rounded-full border border-white/15 bg-black/55 px-3.5 py-1.5 text-[11.5px] font-semibold text-white/95 backdrop-blur-md">
          <span className="h-2 w-2 rounded-full bg-[#3B66FF] shadow-[0_0_8px_#0027eb]" />
          Made with Flake
        </div>
      </div>

      {/* =====================================================================
          RIGHT PANEL: OBSIDIAN DOT-GRID INTERACTIVE ONBOARDING
         ===================================================================== */}
      <div className="onboarding-dot-grid relative flex h-full flex-1 flex-col items-center justify-between px-6 py-6 sm:px-10">
        {/* Top Row: Back Button + Centered 3-Step Cobalt Progress Dashes */}
        <div className="relative flex w-full items-center justify-center pt-1">
          {(step > 1 || phase !== "input") && (
            <button
              type="button"
              onClick={handleBack}
              aria-label="Tilbage"
              className="absolute left-0 flex h-9 w-9 items-center justify-center rounded-full border border-white/[0.1] bg-white/[0.04] text-white/75 transition-all hover:border-white/25 hover:bg-white/[0.08] hover:text-white"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
          )}

          {/* 3-Dash Progress Bar */}
          <div className="flex items-center gap-2">
            {([1, 2, 3] as const).map((s) => (
              <span
                key={s}
                className={`h-[3px] rounded-full transition-all duration-300 ${
                  s <= step
                    ? "w-7 bg-[#3B66FF] shadow-[0_0_10px_rgba(0,39,235,0.85)]"
                    : "w-5 bg-white/15"
                }`}
              />
            ))}
          </div>

          <button
            type="button"
            onClick={() => router.push("/")}
            className="absolute right-0 text-xs font-medium text-white/40 transition-colors hover:text-white/80"
          >
            Spring over
          </button>
        </div>

        {/* Center Stage Content */}
        <div className="flex w-full max-w-[600px] flex-1 flex-col items-center justify-center">
          {/* ===============================================================
              STEP 1: ROLE
             =============================================================== */}
          {step === 1 && (
            <div
              key="step-1"
              className="animate-onboard-step flex w-full flex-col items-center text-center"
            >
              <h1 className="font-display text-[32px] font-bold leading-[1.12] tracking-[-0.03em] sm:text-[38px]">
                <span className="block text-white">Hvad beskriver</span>
                <span className="block text-white/45">dig bedst?</span>
              </h1>

              <div className="mt-7 flex flex-wrap items-center justify-center gap-2.5">
                {ROLE_OPTIONS.map((opt, idx) => {
                  const Icon = opt.icon;
                  const active = role === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => handleSelectRole(opt.id)}
                      style={{ animationDelay: `${idx * 45}ms` }}
                      className={`animate-onboard-step inline-flex items-center gap-2 rounded-full border px-4 py-2.5 text-[13px] font-medium transition-all duration-200 ${
                        active
                          ? "border-[#3B66FF] bg-[#0027eb]/25 text-white shadow-[0_0_24px_-6px_rgba(0,39,235,0.85)]"
                          : "border-white/[0.1] bg-white/[0.05] text-white/85 hover:-translate-y-0.5 hover:border-white/25 hover:bg-white/[0.1] hover:text-white"
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5 text-white/60" />
                      {opt.label}
                    </button>
                  );
                })}
              </div>

              <p className="mt-6 text-[12px] text-white/35">
                Vi opsætter Flake efter hvordan du arbejder
              </p>
            </div>
          )}

          {/* ===============================================================
              STEP 2: INDUSTRY
             =============================================================== */}
          {step === 2 && (
            <div
              key="step-2"
              className="animate-onboard-step flex w-full flex-col items-center text-center"
            >
              <h1 className="font-display text-[32px] font-bold leading-[1.12] tracking-[-0.03em] sm:text-[38px]">
                <span className="block text-white">Hvilken branche</span>
                <span className="block text-white/45">er du i?</span>
              </h1>

              <div className="mt-7 flex flex-wrap items-center justify-center gap-2.5">
                {INDUSTRY_OPTIONS.map((opt, idx) => {
                  const Icon = opt.icon;
                  const active = industry === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => handleSelectIndustry(opt.id)}
                      style={{ animationDelay: `${idx * 35}ms` }}
                      className={`animate-onboard-step inline-flex items-center gap-2 rounded-full border px-4 py-2.5 text-[13px] font-medium transition-all duration-200 ${
                        active
                          ? "border-[#3B66FF] bg-[#0027eb]/25 text-white shadow-[0_0_24px_-6px_rgba(0,39,235,0.85)]"
                          : "border-white/[0.1] bg-white/[0.05] text-white/85 hover:-translate-y-0.5 hover:border-white/25 hover:bg-white/[0.1] hover:text-white"
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5 text-white/60" />
                      {opt.label}
                    </button>
                  );
                })}
              </div>

              <p className="mt-6 text-[12px] text-white/35">
                Vi viser dig annoncer der virker i din kategori
              </p>
            </div>
          )}

          {/* ===============================================================
              STEP 3: PASTE BRAND PAGE + PROGRESSIVE LIVE STREAMING CARD
             =============================================================== */}
          {step === 3 && (
            <div
              key="step-3"
              className="animate-onboard-step flex w-full max-w-[520px] flex-col items-center text-center"
            >
              <h1 className="font-display text-[32px] font-bold leading-[1.12] tracking-[-0.03em] sm:text-[38px]">
                <span className="block text-white">Indsæt din</span>
                <span className="block text-white/45">brand-side</span>
              </h1>

              <p className="mt-3 max-w-md text-[13px] leading-relaxed text-white/50">
                Din hjemmeside eller webshop. Snow læser den og sætter dit brand
                op med navn, logo, farver og produkter.
              </p>

              {/* PHASE A: URL INPUT */}
              {phase === "input" && (
                <div className="mt-7 w-full space-y-3.5">
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      void startBrandStream();
                    }}
                    className="flex flex-col items-center gap-2.5 sm:flex-row"
                  >
                    <input
                      type="text"
                      autoFocus
                      value={urlInput}
                      onChange={(e) => {
                        setUrlInput(e.target.value);
                        if (error) setError(null);
                      }}
                      placeholder="https://ditbrand.dk"
                      className="w-full flex-1 rounded-full border border-white/[0.14] bg-white/[0.04] px-5 py-3 text-[15px] text-white outline-none transition-all placeholder:text-white/30 focus:border-[#3B66FF] focus:bg-white/[0.07] sm:text-[13.5px]"
                    />
                    <button
                      type="submit"
                      className="adtrack-btn-primary w-full shrink-0 rounded-full px-6 py-3 text-[13.5px] font-semibold text-white sm:w-auto"
                    >
                      Opret brand
                    </button>
                  </form>

                  {error && (
                    <p className="text-xs font-medium text-[#FB7185]">{error}</p>
                  )}

                  <div className="flex items-center justify-center gap-2 pt-0.5 text-[11.5px] text-white/45">
                    <span className="rounded-full bg-[#0027eb] px-2.5 py-0.5 font-mono-num text-[10.5px] font-bold text-white">
                      +300 credits
                    </span>
                    <span>for at sætte dit brand op</span>
                  </div>
                </div>
              )}

              {/* PHASE B & C: PROGRESSIVE ANIMATED BRAND CARD */}
              {phase !== "input" && (
                <div className="animate-onboard-pop mt-7 w-full text-left">
                  <div className="overflow-hidden rounded-2xl border border-white/[0.11] bg-[#101522]/90 shadow-[0_24px_60px_-20px_rgba(0,0,0,0.8)] backdrop-blur-md">
                    {/* Top Brand Section */}
                    <div className="p-4 sm:p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex min-w-0 flex-1 items-center gap-3.5">
                          {/* Logo Circle: skeleton -> pop-in */}
                          {logoUrl ? (
                            <div className="animate-onboard-pop flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white p-1.5 shadow-md ring-1 ring-white/20">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={logoUrl}
                                alt={brandName || domain}
                                onError={(e) => {
                                  if (
                                    fallbackLogoUrl &&
                                    e.currentTarget.src !== fallbackLogoUrl
                                  ) {
                                    e.currentTarget.src = fallbackLogoUrl;
                                  }
                                }}
                                className="h-full w-full object-contain"
                              />
                            </div>
                          ) : (
                            <div className="onboard-skeleton h-11 w-11 shrink-0 rounded-full" />
                          )}

                          {/* Brand Label + Name + Domain */}
                          <div className="min-w-0 flex-1">
                            <span className="block text-[9.5px] font-bold uppercase tracking-[0.12em] text-white/40">
                              BRAND
                            </span>

                            {brandName ? (
                              editing ? (
                                <input
                                  type="text"
                                  value={brandName}
                                  onChange={(e) => setBrandName(e.target.value)}
                                  className="mt-0.5 w-full rounded-md border border-white/20 bg-white/10 px-2 py-0.5 font-display text-[15px] font-bold text-white outline-none focus:border-[#3B66FF]"
                                />
                              ) : (
                                <p className="animate-onboard-text truncate font-display text-[15.5px] font-bold text-white">
                                  {brandName}
                                </p>
                              )
                            ) : (
                              <div className="onboard-skeleton mt-1 h-4 w-36 rounded-md" />
                            )}

                            <p className="mt-0.5 truncate font-mono-num text-[11.5px] text-white/45">
                              {domain}
                            </p>
                          </div>
                        </div>

                        <button
                          type="button"
                          disabled={phase !== "ready"}
                          onClick={() => setEditing((v) => !v)}
                          className="shrink-0 rounded-lg border border-white/[0.12] bg-white/[0.04] px-3 py-1 text-[11.5px] font-medium text-white/75 transition-colors hover:border-white/25 hover:text-white disabled:opacity-35"
                        >
                          {editing ? "Gem" : "Rediger"}
                        </button>
                      </div>

                      {/* Description Slot: skeleton bars -> blur-fade text */}
                      <div className="mt-4">
                        {description ? (
                          editing ? (
                            <textarea
                              rows={2}
                              value={description}
                              onChange={(e) => setDescription(e.target.value)}
                              className="w-full rounded-lg border border-white/20 bg-white/10 p-2 text-xs leading-relaxed text-white outline-none focus:border-[#3B66FF]"
                            />
                          ) : (
                            <p className="animate-onboard-text line-clamp-2 text-[12.5px] leading-relaxed text-white/65">
                              {description}
                            </p>
                          )
                        ) : (
                          <div className="space-y-2">
                            <div className="onboard-skeleton h-3 w-full rounded-md" />
                            <div className="onboard-skeleton h-3 w-4/6 rounded-md" />
                          </div>
                        )}
                      </div>

                      {/* Brand Colors Swatches: 4 circles popping in staggered */}
                      <div className="mt-4 flex items-center gap-2">
                        {brandColors.length > 0
                          ? brandColors.slice(0, 4).map((hex, i) => (
                              <span
                                key={`${hex}-${i}`}
                                title={hex}
                                style={{
                                  backgroundColor: hex,
                                  animationDelay: `${i * 85}ms`,
                                }}
                                className="animate-onboard-pop h-5 w-5 rounded-full ring-1 ring-white/25 shadow-sm"
                              />
                            ))
                          : [0, 1, 2, 3].map((i) => (
                              <span
                                key={i}
                                className="onboard-skeleton h-5 w-5 rounded-full"
                              />
                            ))}
                      </div>
                    </div>

                    {/* Divider + Product Section */}
                    <div className="flex items-center justify-between gap-3 border-t border-white/[0.08] bg-white/[0.02] px-4 py-3.5 sm:px-5">
                      <div className="flex min-w-0 flex-1 items-center gap-3">
                        {topProduct || fallbackImageUrl ? (
                          <div className="animate-onboard-pop h-10 w-10 shrink-0 overflow-hidden rounded-full border border-white/15 bg-white/10">
                            {topProduct?.image_url || fallbackImageUrl ? (
                              /* eslint-disable-next-line @next/next/no-img-element */
                              <img
                                src={topProduct?.image_url || fallbackImageUrl || ""}
                                alt={topProduct?.title || brandName || "Produkt"}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center text-white/50">
                                <Package className="h-4 w-4" />
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="onboard-skeleton h-10 w-10 shrink-0 rounded-full" />
                        )}

                        <div className="min-w-0 flex-1">
                          <span className="block text-[9.5px] font-bold uppercase tracking-[0.12em] text-white/40">
                            PRODUKT
                          </span>
                          {topProduct ? (
                            <p className="animate-onboard-text truncate text-[13px] font-semibold text-white">
                              {topProduct.title}
                            </p>
                          ) : phase === "ready" ? (
                            <p className="animate-onboard-text truncate text-[13px] font-semibold text-white/80">
                              {brandName || domain}
                            </p>
                          ) : (
                            <div className="onboard-skeleton mt-1 h-3.5 w-32 rounded-md" />
                          )}
                        </div>
                      </div>

                      {/* 3 Mini Extra Product Avatars */}
                      <div className="flex shrink-0 items-center gap-1.5">
                        {extraProducts.length > 0
                          ? extraProducts.map((p, idx) => (
                              <div
                                key={`${p.title}-${idx}`}
                                style={{ animationDelay: `${idx * 90}ms` }}
                                title={p.title}
                                className="animate-onboard-pop h-7 w-7 overflow-hidden rounded-full border border-white/15 bg-white/10"
                              >
                                {p.image_url ? (
                                  /* eslint-disable-next-line @next/next/no-img-element */
                                  <img
                                    src={p.image_url}
                                    alt={p.title}
                                    className="h-full w-full object-cover"
                                  />
                                ) : (
                                  <div className="flex h-full w-full items-center justify-center text-white/40">
                                    <Package className="h-3 w-3" />
                                  </div>
                                )}
                              </div>
                            ))
                          : phase === "streaming"
                            ? [0, 1, 2].map((i) => (
                                <span
                                  key={i}
                                  className="onboard-skeleton h-7 w-7 rounded-full"
                                />
                              ))
                            : null}
                      </div>
                    </div>
                  </div>

                  {/* Live Cobalt Progress Bar + Status Message */}
                  <div className="mt-3.5 flex flex-col items-center text-center">
                    {phase === "streaming" ? (
                      <>
                        <div className="h-[3px] w-full overflow-hidden rounded-full bg-white/[0.1]">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-[#0027eb] via-[#3B66FF] to-[#7DD3FC] transition-all duration-500 ease-out"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                        <div className="mt-2.5 flex items-center justify-center gap-2 text-[11.5px] text-white/50">
                          <SnowMark className="h-3.5 w-3.5 text-[#4D6BFF]" />
                          <span>
                            Snow læser din side og sætter dit brand op...
                          </span>
                        </div>
                      </>
                    ) : (
                      <div className="animate-onboard-text flex items-center justify-center gap-1.5 text-[12px] font-medium text-white/75">
                        <Check className="h-3.5 w-3.5 text-[#4ADE80]" />
                        <span>
                          Dit brand er klar. Du kan altid redigere det under Brands.
                        </span>
                      </div>
                    )}

                    {/* +300 credits added pop-in */}
                    {creditsAdded && (
                      <div className="animate-onboard-pop mt-3 inline-flex items-center gap-1.5 text-[12px] font-semibold text-[#86EFAC]">
                        <Sparkles className="h-3.5 w-3.5" />
                        +300 credits tilføjet
                      </div>
                    )}

                    {/* Continue Button: dim disabled -> glowing Flake Cobalt */}
                    <button
                      type="button"
                      disabled={phase !== "ready"}
                      onClick={handleFinish}
                      className={`mt-5 inline-flex items-center gap-1.5 rounded-full px-6 py-2.5 text-[13px] font-semibold transition-all duration-300 ${
                        phase === "ready"
                          ? "adtrack-btn-primary text-white shadow-[0_10px_28px_-6px_rgba(0,39,235,0.8)] hover:scale-[1.02]"
                          : "cursor-not-allowed border border-white/[0.1] bg-white/[0.05] text-white/35"
                      }`}
                    >
                      Fortsæt
                      <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Bottom Subtle Brand Wordmark */}
        <div className="flex w-full items-center justify-center pb-1">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/icons/flake-wordmark-white.png"
            alt="Flake"
            className="h-[14px] w-auto opacity-30"
          />
        </div>
      </div>
    </div>
  );
}
