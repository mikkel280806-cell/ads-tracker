"use client";

import React, { useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  ArrowRight,
  ArrowUp,
  BarChart3,
  Check,
  Film,
  Flame,
  Link2,
  Loader2,
  Package,
  Plus,
  Search,
  Sparkles,
  TrendingUp,
  X,
} from "lucide-react";
import type {
  BrandMemory,
  ClonedSourceAd,
  MinedUrlInsights,
  OwnAdMetricRow,
  SnowActionCard,
  SnowAttachment,
  SnowMessage,
  VideoStylePresetId,
} from "@/lib/studio-types";
import type { Ad, ProductPreview } from "@/lib/types";
import { buildClonedSourceFromAd } from "@/lib/studio-types";
import { formatDkkExact, getPresetById } from "@/lib/snow-engine";
import { formatReach, getActiveDays } from "@/lib/url-parser";

interface SnowAssistantProps {
  brandMemory: BrandMemory | null;
  messages: SnowMessage[];
  ads: Ad[];
  analyticsRows: OwnAdMetricRow[];
  onMessagesChange: (next: SnowMessage[]) => void;
  onOpenBrandMemory: () => void;
  onCloneAdToStudio: (ad: Ad, presetId?: VideoStylePresetId) => void;
  onOpenBriefInStudio: (opts: {
    title?: string;
    angle?: string;
    stylePresetId: VideoStylePresetId;
    productTitle?: string;
    clonedFromAd?: ClonedSourceAd;
  }) => void;
  onOpenAdDetail?: (ad: Ad) => void;
}

export function SnowMark({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M12 2v20M2 12h20M4.93 4.93l14.14 14.14M19.07 4.93L4.93 19.07" />
      <circle cx="12" cy="12" r="2.2" fill="currentColor" stroke="none" />
    </svg>
  );
}

const STARTER_WORKFLOWS = [
  {
    title: "Analysér mine egne ads & find winners",
    subtitle: "Find højeste Thumbstop/Hold-rate og stop fatigue i tide",
    prompt: "Analysér mine nuværende annoncer, find vores stærkeste winner og foreslå 4 Double Down varianter.",
    icon: BarChart3,
  },
  {
    title: "Klon konkurrent-vindere til mit brand",
    subtitle: "Brug dokumenterede swipe-strukturer i vores tone-of-voice",
    prompt: "Find de bedste konkurrent-vindere i vores swipe file og lav et klonet ad-brief til mit brand.",
    icon: Sparkles,
  },
  {
    title: "Kør komplet ugentligt ad-workflow",
    subtitle: "Watch → Make → Launch plan med både UGC & Claymation",
    prompt: "Kør det fulde ugentlige creative strategy workflow for mit brand: hooks, scripts og næste test-batch.",
    icon: Flame,
  },
  {
    title: "Skalér vinder-koncept til 4 formater",
    subtitle: "Omsæt samme vinder-vinkel til iPhone UGC, Claymation & Mini-Drama",
    prompt: "Double down på min top performing annonce og omsæt vinklen til nye hooks i flere video-stilarter.",
    icon: TrendingUp,
  },
];

function ActionCardsRenderer({
  cards,
  ads,
  onCloneAdToStudio,
  onOpenBriefInStudio,
  onOpenAdDetail,
}: {
  cards: SnowActionCard[];
  ads: Ad[];
  onCloneAdToStudio: (ad: Ad, presetId?: VideoStylePresetId) => void;
  onOpenBriefInStudio: SnowAssistantProps["onOpenBriefInStudio"];
  onOpenAdDetail?: (ad: Ad) => void;
}) {
  return (
    <div className="mt-3 space-y-3">
      {cards.map((card, cIdx) => {
        if (card.type === "swipe_picks") {
          return (
            <div
              key={`sp-${cIdx}`}
              className="rounded-2xl border border-[#E6E9F0] bg-[#FAFBFD] p-3.5"
            >
              <div className="mb-2.5 flex items-center justify-between gap-2">
                <div>
                  <p className="font-display text-[13px] font-bold text-[#0F172A]">
                    {card.title}
                  </p>
                  <p className="text-[11px] text-[#64748B]">{card.subtitle}</p>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                {card.picks.map((pick) => {
                  const fullAd = ads.find((a) => a.id === pick.adId);
                  return (
                    <div
                      key={pick.adId}
                      className="flex gap-2.5 rounded-xl border border-[#ECEFF5] bg-white p-2.5"
                    >
                      <button
                        type="button"
                        onClick={() => fullAd && onOpenAdDetail?.(fullAd)}
                        className="h-16 w-14 shrink-0 overflow-hidden rounded-lg border border-[#E6E9F0] bg-[#F3F5F9]"
                      >
                        {pick.thumbnailUrl && (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img
                            src={pick.thumbnailUrl}
                            alt={pick.brandName}
                            className="h-full w-full object-cover"
                          />
                        )}
                      </button>
                      <div className="flex min-w-0 flex-1 flex-col justify-between">
                        <div>
                          <div className="flex items-center justify-between gap-1">
                            <span className="truncate text-[11.5px] font-bold text-[#0F172A]">
                              {pick.brandName}
                            </span>
                            <span className="shrink-0 font-mono-num text-[10px] font-semibold text-[#15803D]">
                              {pick.activeDays}d
                              {pick.euReach ? ` · ${formatReach(pick.euReach)}` : ""}
                            </span>
                          </div>
                          <p className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-[#475569]">
                            {pick.hook}
                          </p>
                        </div>
                        <div className="mt-2 flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() =>
                              fullAd
                                ? onCloneAdToStudio(fullAd, "iphone_ugc")
                                : onOpenBriefInStudio({
                                    title: `Clone: ${pick.brandName}`,
                                    stylePresetId: "iphone_ugc",
                                  })
                            }
                            className="inline-flex items-center gap-1 rounded-lg bg-[#0027eb]/[0.08] px-2 py-1 text-[10.5px] font-semibold text-[#0027eb] transition-colors hover:bg-[#0027eb] hover:text-white"
                          >
                            <Sparkles className="h-3 w-3" />
                            Clone til mit brand
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        }

        if (card.type === "creative_brief") {
          const preset = getPresetById(card.stylePresetId);
          return (
            <div
              key={`cb-${cIdx}`}
              className="rounded-2xl border border-[#DCE4FF] bg-white p-4 shadow-[0_2px_12px_-4px_rgba(0,39,235,0.08)]"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="rounded-md bg-[#0027eb]/[0.08] px-2 py-0.5 text-[10px] font-bold text-[#0027eb]">
                      {preset.name}
                    </span>
                    <span className="rounded-md bg-[#F1F5F9] px-2 py-0.5 text-[10px] font-semibold text-[#475569]">
                      {card.productTitle}
                    </span>
                  </div>
                  <h4 className="mt-1.5 font-display text-[14px] font-bold text-[#0F172A]">
                    {card.title}
                  </h4>
                  <p className="text-[11px] text-[#64748B]">Vinkel: {card.angle}</p>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    onOpenBriefInStudio({
                      title: card.title,
                      angle: card.angle,
                      stylePresetId: card.stylePresetId,
                      productTitle: card.productTitle,
                      clonedFromAd: card.clonedFromAd,
                    })
                  }
                  className="adtrack-btn-primary inline-flex shrink-0 items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold text-white"
                >
                  <Film className="h-3.5 w-3.5" />
                  Åbn i Video Maker
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>

              <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                {card.scenes.slice(0, 4).map((sc) => (
                  <div
                    key={sc.id}
                    className="rounded-xl border border-[#ECEFF5] bg-[#FAFBFD] p-2.5"
                  >
                    <p className="font-mono-num text-[10px] font-bold uppercase text-[#64748B]">
                      Scene {sc.sceneNumber} · {sc.phase}
                    </p>
                    <p className="mt-1 text-[11.5px] font-medium text-[#0F172A]">
                      &ldquo;{sc.spokenLine}&rdquo;
                    </p>
                  </div>
                ))}
              </div>
            </div>
          );
        }

        if (card.type === "mined_url") {
          const ins: MinedUrlInsights = card.insights;
          return (
            <div
              key={`mu-${cIdx}`}
              className="rounded-2xl border border-[#E6E9F0] bg-[#FAFBFD] p-4 space-y-3"
            >
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="font-display text-[13.5px] font-bold text-[#0F172A]">
                    URL & Review Mining: {ins.title}
                  </p>
                  <p className="truncate font-mono-num text-[11px] text-[#64748B]">
                    {ins.url}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                <div className="rounded-xl border border-[#ECEFF5] bg-white p-2.5">
                  <p className="text-[10px] font-bold uppercase text-[#64748B]">
                    Pain Points
                  </p>
                  <ul className="mt-1 space-y-1 text-[11.5px] text-[#334155]">
                    {ins.painPoints.slice(0, 3).map((p, i) => (
                      <li key={i}>• {p}</li>
                    ))}
                  </ul>
                </div>
                <div className="rounded-xl border border-[#ECEFF5] bg-white p-2.5">
                  <p className="text-[10px] font-bold uppercase text-[#64748B]">
                    Desires & USP&apos;er
                  </p>
                  <ul className="mt-1 space-y-1 text-[11.5px] text-[#334155]">
                    {ins.usps.slice(0, 3).map((u, i) => (
                      <li key={i}>✓ {u}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          );
        }

        if (card.type === "winner_scale") {
          return (
            <div
              key={`ws-${cIdx}`}
              className="rounded-2xl border border-[#E6E9F0] bg-white p-4 space-y-3"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span className="inline-flex items-center gap-1 rounded-full bg-[#ECFDF3] px-2 py-0.5 text-[10px] font-bold text-[#15803D]">
                    <TrendingUp className="h-3 w-3" />
                    Winner Double-Down Plan
                  </span>
                  <h4 className="mt-1 font-display text-[14px] font-bold text-[#0F172A]">
                    {card.title}
                  </h4>
                  <p className="font-mono-num text-[11px] text-[#64748B]">
                    {card.metricSummary}
                  </p>
                </div>
              </div>
              <p className="rounded-xl border border-[#ECEFF5] bg-[#FAFBFD] p-3 text-xs leading-relaxed text-[#334155]">
                {card.diagnosis}
              </p>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {card.iterations.map((it, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() =>
                      onOpenBriefInStudio({
                        title: it.label,
                        angle: it.hook,
                        stylePresetId: it.stylePresetId,
                      })
                    }
                    className="flex flex-col justify-between rounded-xl border border-[#E6E9F0] bg-white p-3 text-left transition-colors hover:border-[#0027eb] hover:bg-[#F5F8FF]/50"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[11.5px] font-bold text-[#0F172A]">
                          {it.label}
                        </span>
                        <ArrowRight className="h-3.5 w-3.5 shrink-0 text-[#0027eb]" />
                      </div>
                      <p className="mt-1 text-[11.5px] font-medium text-[#334155]">
                        &ldquo;{it.hook}&rdquo;
                      </p>
                    </div>
                    <p className="mt-1.5 text-[10.5px] text-[#64748B]">{it.why}</p>
                  </button>
                ))}
              </div>
            </div>
          );
        }

        return null;
      })}
    </div>
  );
}

export function SnowAssistantView({
  brandMemory,
  messages,
  ads,
  analyticsRows,
  onMessagesChange,
  onOpenBrandMemory,
  onCloneAdToStudio,
  onOpenBriefInStudio,
  onOpenAdDetail,
}: SnowAssistantProps) {
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [pickerMode, setPickerMode] = useState<"ad" | "product" | "url" | null>(null);
  const [pickerSearch, setPickerSearch] = useState("");
  const [attachedAd, setAttachedAd] = useState<Ad | null>(null);
  const [attachedProduct, setAttachedProduct] = useState<ProductPreview | null>(null);
  const [urlToMine, setUrlToMine] = useState("");
  const endRef = useRef<HTMLDivElement | null>(null);

  const searchableAds = useMemo(() => {
    const q = pickerSearch.trim().toLowerCase();
    return ads
      .filter((a) => a.source_type === "meta_ad_library")
      .filter((a) => {
        if (!q) return true;
        return `${a.brand_name} ${a.headline} ${a.primary_text}`
          .toLowerCase()
          .includes(q);
      })
      .slice(0, 18);
  }, [ads, pickerSearch]);

  const sendMessage = async (overridePrompt?: string) => {
    const text = (overridePrompt ?? input).trim();
    if (!text && !urlToMine.trim() && !attachedAd) return;

    const attachments: SnowAttachment[] = [];
    if (attachedAd) {
      attachments.push({
        type: "ad",
        label: attachedAd.brand_name,
        sublabel: attachedAd.headline,
        imageUrl: attachedAd.fallback_image_url || attachedAd.thumbnail_url,
        refId: attachedAd.id,
      });
    }
    if (attachedProduct) {
      attachments.push({
        type: "product",
        label: attachedProduct.title,
        imageUrl: attachedProduct.image_url,
      });
    }
    if (urlToMine.trim()) {
      attachments.push({ type: "url", label: urlToMine.trim() });
    }

    const userMsg: SnowMessage = {
      id: `u-${Date.now()}`,
      role: "user",
      content: text || (urlToMine ? `Mine denne URL og lav ad-koncepter: ${urlToMine}` : `Klon denne annonce fra ${attachedAd?.brand_name}`),
      createdAt: new Date().toISOString(),
      attachments: attachments.length > 0 ? attachments : undefined,
    };

    const nextMessages = [...messages, userMsg];
    onMessagesChange(nextMessages);
    if (!overridePrompt) setInput("");
    setSending(true);

    try {
      const res = await fetch("/api/snow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: userMsg.content,
          brandMemory,
          attachedAd: attachedAd
            ? buildClonedSourceFromAd(attachedAd, getActiveDays(attachedAd.started_running_at))
            : null,
          attachedProduct,
          urlToMine: urlToMine.trim() || undefined,
          analyticsRows,
          candidateSwipeAds: ads.filter((a) => a.source_type === "meta_ad_library").slice(0, 12),
        }),
      });
      const data = await res.json();
      if (res.ok && data?.ok && data.message) {
        onMessagesChange([...nextMessages, data.message as SnowMessage]);
      } else {
        throw new Error(data?.error || "Fejl");
      }
    } catch {
      onMessagesChange([
        ...nextMessages,
        {
          id: `err-${Date.now()}`,
          role: "assistant",
          createdAt: new Date().toISOString(),
          content: "Beklager — prøv lige igen om et øjeblik.",
        },
      ]);
    } finally {
      setSending(false);
      setAttachedAd(null);
      setAttachedProduct(null);
      setUrlToMine("");
      setPickerMode(null);
      setTimeout(() => endRef.current?.scrollIntoView({ behavior: "smooth" }), 80);
    }
  };

  return (
    <div className="mx-auto flex h-full w-full max-w-4xl flex-col">
      {/* Top Memory Status Strip */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-[#ECEFF5] bg-white px-4 py-2.5 shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="adtrack-icon-badge flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-white">
            <SnowMark className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-display text-[13.5px] font-bold text-[#0F172A]">
                Snow · AI Creative Strategist
              </span>
              {brandMemory ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-[#ECFDF3] px-2 py-0.5 text-[10.5px] font-semibold text-[#15803D]">
                  <Check className="h-3 w-3" />
                  Hukommelse: {brandMemory.brandName} ({brandMemory.products.length} prod.)
                </span>
              ) : (
                <span className="rounded-full bg-[#FEF3C7] px-2 py-0.5 text-[10.5px] font-semibold text-[#92400E]">
                  Ingen Brand Memory endnu
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {messages.length > 0 && (
            <button
              type="button"
              onClick={() => onMessagesChange([])}
              className="rounded-xl border border-[#E6E9F0] bg-white px-2.5 py-1.5 text-[11.5px] font-semibold text-[#64748B] transition-colors hover:text-[#0F172A]"
            >
              Ny chat
            </button>
          )}
          <button
            type="button"
            onClick={onOpenBrandMemory}
            className="inline-flex items-center gap-1.5 rounded-xl border border-[#DCE1EC] bg-white px-3 py-1.5 text-[11.5px] font-semibold text-[#0F172A] transition-colors hover:border-[#0027eb] hover:text-[#0027eb]"
          >
            {brandMemory ? "Rediger Brand" : "Forbind dit brand"}
          </button>
        </div>
      </div>

      {/* Empty Welcome Hero (Atria Raya inspired in Flake Light/Obsidian/Cobalt identity) */}
      {messages.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center py-6">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-[#DCE4FF] bg-white shadow-[0_12px_36px_-8px_rgba(0,39,235,0.22)]">
            <span className="adtrack-icon-badge flex h-11 w-11 items-center justify-center rounded-xl text-white">
              <SnowMark className="h-6 w-6" />
            </span>
          </div>
          <h1 className="font-display text-[26px] font-bold tracking-[-0.03em] text-[#0F172A]">
            Spørg Snow
          </h1>
          <p className="mt-1 max-w-md text-center text-xs text-[#64748B]">
            Din AI Creative Strategist til research, kloning, videomanuskripter og winner-skalering{brandMemory ? ` for ${brandMemory.brandName}` : ""}.
          </p>
        </div>
      ) : (
        /* Conversation Thread */
        <div className="workspace-scroll mb-4 flex-1 space-y-4 overflow-y-auto pr-1">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[92%] rounded-2xl p-4 sm:max-w-[86%] ${
                  msg.role === "user"
                    ? "bg-[#0F172A] text-white"
                    : "border border-[#ECEFF5] bg-white text-[#0F172A] shadow-[0_1px_3px_rgba(15,23,42,0.04)]"
                }`}
              >
                {msg.attachments && msg.attachments.length > 0 && (
                  <div className="mb-2 flex flex-wrap gap-1.5">
                    {msg.attachments.map((att, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-white/15 px-2 py-1 text-[11px] font-medium"
                      >
                        {att.type === "ad" && <Sparkles className="h-3 w-3" />}
                        {att.type === "product" && <Package className="h-3 w-3" />}
                        {att.type === "url" && <Link2 className="h-3 w-3" />}
                        {att.label}
                      </span>
                    ))}
                  </div>
                )}

                <div className="whitespace-pre-wrap text-[13px] leading-relaxed">
                  {msg.content}
                </div>

                {msg.actionCards && msg.actionCards.length > 0 && (
                  <ActionCardsRenderer
                    cards={msg.actionCards}
                    ads={ads}
                    onCloneAdToStudio={onCloneAdToStudio}
                    onOpenBriefInStudio={onOpenBriefInStudio}
                    onOpenAdDetail={onOpenAdDetail}
                  />
                )}
              </div>
            </div>
          ))}
          {sending && (
            <div className="flex justify-start">
              <div className="inline-flex items-center gap-2 rounded-2xl border border-[#ECEFF5] bg-white px-4 py-3 text-xs font-semibold text-[#475569]">
                <Loader2 className="h-3.5 w-3.5 animate-spin text-[#0027eb]" />
                Snow analyserer brand, swipe file & performance...
              </div>
            </div>
          )}
          <div ref={endRef} />
        </div>
      )}

      {/* Composer Card with Subtle Cobalt Rim */}
      <div className="rounded-2xl border border-[#DCE4FF] bg-white p-3 shadow-[0_8px_30px_-10px_rgba(0,39,235,0.16)]">
        {/* Selected Attachments Pills */}
        {(attachedAd || attachedProduct || urlToMine) && (
          <div className="mb-2 flex flex-wrap gap-1.5">
            {attachedAd && (
              <span className="inline-flex items-center gap-1.5 rounded-lg border border-[#0027eb]/25 bg-[#0027eb]/[0.07] px-2.5 py-1 text-[11px] font-semibold text-[#0027eb]">
                Kloner: {attachedAd.brand_name}
                <button type="button" onClick={() => setAttachedAd(null)}>
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
            {attachedProduct && (
              <span className="inline-flex items-center gap-1.5 rounded-lg border border-[#E2E6EF] bg-[#FAFBFD] px-2.5 py-1 text-[11px] font-semibold text-[#0F172A]">
                Produkt: {attachedProduct.title}
                <button type="button" onClick={() => setAttachedProduct(null)}>
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
            {urlToMine && (
              <span className="inline-flex items-center gap-1.5 rounded-lg border border-[#E2E6EF] bg-[#FAFBFD] px-2.5 py-1 font-mono-num text-[11px] text-[#0F172A]">
                URL: {urlToMine}
                <button type="button" onClick={() => setUrlToMine("")}>
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
          </div>
        )}

        {/* Context Picker Drawer */}
        {pickerMode && (
          <div className="mb-3 rounded-xl border border-[#ECEFF5] bg-[#FAFBFD] p-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#64748B]">
                {pickerMode === "ad"
                  ? "Vælg Swipe-Ad at klone eller analysere"
                  : pickerMode === "product"
                    ? "Vælg produkt fra Brand Memory"
                    : "Indsæt URL til URL/Review Mining"}
              </span>
              <button
                type="button"
                onClick={() => setPickerMode(null)}
                className="text-[#64748B] hover:text-[#0F172A]"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>

            {pickerMode === "url" ? (
              <div className="flex gap-2">
                <input
                  type="url"
                  value={urlToMine}
                  onChange={(e) => setUrlToMine(e.target.value)}
                  placeholder="https://ditbrand.dk/products/..."
                  className="flex-1 rounded-xl border border-[#DCE1EC] bg-white px-3 py-1.5 text-[16px] text-[#0F172A] outline-none focus:border-[#0027eb] sm:text-xs"
                />
                <button
                  type="button"
                  onClick={() => setPickerMode(null)}
                  className="rounded-xl bg-[#0F172A] px-3 py-1.5 text-xs font-semibold text-white"
                >
                  Vedhæft
                </button>
              </div>
            ) : pickerMode === "product" ? (
              brandMemory && brandMemory.products.length > 0 ? (
                <div className="grid max-h-44 grid-cols-1 gap-1.5 overflow-y-auto sm:grid-cols-2">
                  {brandMemory.products.map((p, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setAttachedProduct(p);
                        setPickerMode(null);
                      }}
                      className="flex items-center gap-2 rounded-lg border border-[#E6E9F0] bg-white p-2 text-left text-xs hover:border-[#0027eb]"
                    >
                      {p.image_url && (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={p.image_url}
                          alt=""
                          className="h-8 w-8 rounded object-cover"
                        />
                      )}
                      <span className="truncate font-semibold text-[#0F172A]">
                        {p.title}
                      </span>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-[#64748B]">
                  Forbind dit brand øverst først for at vælge blandt dine egne produkter.
                </p>
              )
            ) : (
              <div className="space-y-2">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#94A3B8]" />
                  <input
                    type="text"
                    value={pickerSearch}
                    onChange={(e) => setPickerSearch(e.target.value)}
                    placeholder="Søg brand eller hook..."
                    className="w-full rounded-lg border border-[#DCE1EC] bg-white py-1.5 pl-8 pr-3 text-xs outline-none focus:border-[#0027eb]"
                  />
                </div>
                <div className="grid max-h-44 grid-cols-1 gap-1.5 overflow-y-auto sm:grid-cols-2">
                  {searchableAds.map((a) => (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => {
                        setAttachedAd(a);
                        setPickerMode(null);
                      }}
                      className="flex items-center gap-2 rounded-lg border border-[#E6E9F0] bg-white p-2 text-left hover:border-[#0027eb]"
                    >
                      {(a.fallback_image_url || a.thumbnail_url) && (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={a.fallback_image_url || a.thumbnail_url}
                          alt=""
                          className="h-8 w-8 shrink-0 rounded object-cover"
                        />
                      )}
                      <div className="min-w-0">
                        <p className="truncate text-[11px] font-bold text-[#0F172A]">
                          {a.brand_name}
                        </p>
                        <p className="truncate text-[10.5px] text-[#64748B]">
                          {a.extracted_hook || a.headline}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="flex items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void sendMessage();
              }
            }}
            placeholder={
              brandMemory
                ? `Spørg Snow om ${brandMemory.brandName} — f.eks. "lav 3 claymation hooks" eller "klon en vinder"`
                : `Spørg Snow om strategi, hooks, kloning eller indsæt en produkt-URL...`
            }
            className="min-w-0 flex-1 bg-transparent px-2 py-2 text-[16px] text-[#0F172A] outline-none placeholder:text-[#94A3B8] sm:text-[13.5px]"
          />
          <button
            type="button"
            disabled={sending}
            onClick={() => void sendMessage()}
            aria-label="Send til Snow"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#0F172A] text-white transition-colors hover:bg-[#0027eb] disabled:opacity-50"
          >
            {sending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ArrowUp className="h-4 w-4" />
            )}
          </button>
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-1.5 border-t border-[#F1F5F9] pt-2">
          <button
            type="button"
            onClick={() => setPickerMode(pickerMode === "ad" ? null : "ad")}
            className="inline-flex items-center gap-1 rounded-lg border border-[#E6E9F0] bg-[#FAFBFD] px-2.5 py-1 text-[11px] font-semibold text-[#475569] transition-colors hover:border-[#CBD5E1] hover:text-[#0F172A]"
          >
            <Plus className="h-3 w-3" />
            Vedhæft Swipe-Ad
          </button>
          <button
            type="button"
            onClick={() => setPickerMode(pickerMode === "product" ? null : "product")}
            className="inline-flex items-center gap-1 rounded-lg border border-[#E6E9F0] bg-[#FAFBFD] px-2.5 py-1 text-[11px] font-semibold text-[#475569] transition-colors hover:border-[#CBD5E1] hover:text-[#0F172A]"
          >
            <Package className="h-3 w-3" />
            Vælg Produkt
          </button>
          <button
            type="button"
            onClick={() => setPickerMode(pickerMode === "url" ? null : "url")}
            className="inline-flex items-center gap-1 rounded-lg border border-[#E6E9F0] bg-[#FAFBFD] px-2.5 py-1 text-[11px] font-semibold text-[#475569] transition-colors hover:border-[#CBD5E1] hover:text-[#0F172A]"
          >
            <Link2 className="h-3 w-3" />
            Mine URL
          </button>
        </div>
      </div>

      {/* 2x2 Atria Starter Cards when thread is empty */}
      {messages.length === 0 && (
        <div className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          {STARTER_WORKFLOWS.map((wf) => {
            const Icon = wf.icon;
            return (
              <button
                key={wf.title}
                type="button"
                onClick={() => void sendMessage(wf.prompt)}
                className="flex items-start justify-between gap-3 rounded-2xl border border-[#ECEFF5] bg-white p-3.5 text-left transition-all hover:border-[#CBD5E1] hover:shadow-xs"
              >
                <div>
                  <p className="font-display text-[13px] font-bold text-[#0F172A]">
                    {wf.title}
                  </p>
                  <p className="mt-0.5 text-[11.5px] text-[#64748B]">
                    {wf.subtitle}
                  </p>
                </div>
                <Icon className="mt-0.5 h-4 w-4 shrink-0 text-[#64748B]" />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function SnowQuickDrawer({
  open,
  onClose,
  ...props
}: SnowAssistantProps & { open: boolean; onClose: () => void }) {
  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[90] flex justify-end bg-[#050811]/45 backdrop-blur-[2px]"
      onClick={onClose}
    >
      <div
        className="flex h-full w-full max-w-2xl flex-col bg-[#F7F8FB] p-4 shadow-2xl sm:p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-[#64748B]">
            Snow AI Copilot
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Luk Snow"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#E6E9F0] bg-white text-[#64748B] hover:text-[#0F172A]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-hidden">
          <SnowAssistantView {...props} />
        </div>
      </div>
    </div>,
    document.body
  );
}
