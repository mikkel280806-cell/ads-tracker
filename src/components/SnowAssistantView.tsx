"use client";

import React, { useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  ArrowRight,
  ArrowUp,
  BarChart3,
  Film,
  Flame,
  Link2,
  Loader2,
  Package,
  Plus,
  RotateCcw,
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
import { getPresetById } from "@/lib/snow-engine";
import { formatReach, getActiveDays } from "@/lib/url-parser";
import { SnowCharacter, SnowMark } from "./SnowMascot";

export { SnowCharacter, SnowMark };

export interface SnowAssistantProps {
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

const STARTER_CARDS = [
  {
    title: "Analysér mine ads",
    tag: "Performance",
    prompt:
      "Analysér mine nuværende annoncer, find vores stærkeste winner og foreslå 4 Double Down varianter.",
    icon: BarChart3,
  },
  {
    title: "Klon top-konkurrent",
    tag: "Swipe File",
    prompt:
      "Find de bedste konkurrent-vindere i vores swipe file og lav et klonet ad-brief til mit brand.",
    icon: Sparkles,
  },
  {
    title: "Ugens ad-batch",
    tag: "UGC & Clay",
    prompt:
      "Kør det fulde ugentlige creative strategy workflow for mit brand: hooks, scripts og næste test-batch.",
    icon: Flame,
  },
  {
    title: "Skalér vinder-vinkel",
    tag: "4 formater",
    prompt:
      "Double down på min top performing annonce og omsæt vinklen til nye hooks i flere video-stilarter.",
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
            <div key={`sp-${cIdx}`} className="space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">
                {card.title}
              </p>
              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                {card.picks.slice(0, 6).map((pick) => {
                  const fullAd = ads.find((a) => a.id === pick.adId);
                  return (
                    <div
                      key={pick.adId}
                      className="group relative overflow-hidden rounded-2xl border border-[#ECEFF5] bg-[#0F172A] aspect-[4/5]"
                    >
                      {pick.thumbnailUrl ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={pick.thumbnailUrl}
                          alt={pick.brandName}
                          onClick={() => fullAd && onOpenAdDetail?.(fullAd)}
                          className="h-full w-full cursor-pointer object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                      ) : (
                        <div className="h-full w-full bg-[#1E293B]" />
                      )}
                      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/85 via-black/15 to-black/35" />

                      <div className="absolute inset-x-2.5 top-2.5 flex items-center justify-between gap-1">
                        <span className="truncate rounded-full bg-black/55 px-2 py-0.5 text-[10px] font-semibold text-white backdrop-blur-md">
                          {pick.brandName}
                        </span>
                        <span className="shrink-0 rounded-full bg-[#15803D]/90 px-1.5 py-0.5 font-mono-num text-[9.5px] font-bold text-white">
                          {pick.activeDays}d
                        </span>
                      </div>

                      <div className="absolute inset-x-2.5 bottom-2.5 space-y-1.5">
                        <p className="line-clamp-2 text-[11px] font-medium leading-snug text-white/95">
                          {pick.hook}
                        </p>
                        <div className="flex items-center justify-between gap-1">
                          <span className="font-mono-num text-[9.5px] text-white/70">
                            {pick.euReach ? formatReach(pick.euReach) : ""}
                          </span>
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
                            className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-[10.5px] font-bold text-[#0F172A] shadow-sm transition-colors hover:bg-[#0027eb] hover:text-white"
                          >
                            <Sparkles className="h-3 w-3" />
                            Clone
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
              className="overflow-hidden rounded-2xl border border-[#DCE4FF] bg-white shadow-[0_6px_24px_-12px_rgba(0,39,235,0.2)]"
            >
              <div className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="rounded-full bg-[#0027eb]/[0.08] px-2 py-0.5 text-[10px] font-bold text-[#0027eb]">
                      {preset.name}
                    </span>
                    <span className="truncate text-[11px] text-[#64748B]">
                      {card.productTitle}
                    </span>
                  </div>
                  <h4 className="mt-1 truncate font-display text-[13.5px] font-bold text-[#0F172A]">
                    {card.title}
                  </h4>
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
                  className="adtrack-btn-primary inline-flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[11.5px] font-semibold text-white"
                >
                  <Film className="h-3.5 w-3.5" />
                  Åbn i Studio
                </button>
              </div>

              {/* Visual 4-Frame Storyboard Filmstrip */}
              <div className="grid grid-cols-2 gap-1.5 border-t border-[#F1F5F9] bg-[#FAFBFD] p-2.5 sm:grid-cols-4">
                {card.scenes.slice(0, 4).map((sc) => (
                  <div
                    key={sc.id}
                    className="flex flex-col justify-between rounded-xl bg-gradient-to-b from-[#0F172A] to-[#1E293B] p-2.5 text-white min-h-[104px]"
                  >
                    <span className="font-mono-num text-[9px] font-bold uppercase tracking-wider text-white/60">
                      0{sc.sceneNumber} · {sc.timeRange}
                    </span>
                    <p className="mt-2 line-clamp-3 text-[11px] font-semibold leading-snug text-white">
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
              className="rounded-2xl border border-[#ECEFF5] bg-[#FAFBFD] p-3.5 space-y-2.5"
            >
              <p className="truncate font-display text-[13px] font-bold text-[#0F172A]">
                {ins.title}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {ins.painPoints.slice(0, 3).map((p, i) => (
                  <span
                    key={`p-${i}`}
                    className="rounded-full bg-[#FFF1F2] px-2.5 py-1 text-[11px] font-medium text-[#BE123C]"
                  >
                    {p}
                  </span>
                ))}
                {ins.usps.slice(0, 3).map((u, i) => (
                  <span
                    key={`u-${i}`}
                    className="rounded-full bg-[#ECFDF3] px-2.5 py-1 text-[11px] font-medium text-[#15803D]"
                  >
                    {u}
                  </span>
                ))}
              </div>
            </div>
          );
        }

        if (card.type === "winner_scale") {
          return (
            <div
              key={`ws-${cIdx}`}
              className="rounded-2xl border border-[#ECEFF5] bg-white p-3.5 space-y-2.5"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-display text-[13px] font-bold text-[#0F172A]">
                  {card.title}
                </span>
                <span className="rounded-full bg-[#ECFDF3] px-2.5 py-0.5 font-mono-num text-[10.5px] font-bold text-[#15803D]">
                  {card.metricSummary}
                </span>
              </div>
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
                    className="group flex items-center justify-between gap-2 rounded-xl border border-[#ECEFF5] bg-[#FAFBFD] px-3 py-2.5 text-left transition-all hover:border-[#0027eb] hover:bg-white"
                  >
                    <div className="min-w-0">
                      <p className="text-[11px] font-bold text-[#0F172A]">
                        {it.label}
                      </p>
                      <p className="mt-0.5 truncate text-[11px] text-[#64748B]">
                        &ldquo;{it.hook}&rdquo;
                      </p>
                    </div>
                    <ArrowRight className="h-3.5 w-3.5 shrink-0 text-[#94A3B8] transition-transform group-hover:translate-x-0.5 group-hover:text-[#0027eb]" />
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
  const [plusOpen, setPlusOpen] = useState(false);
  const [pickerMode, setPickerMode] = useState<"ad" | "product" | "url" | null>(
    null
  );
  const [pickerSearch, setPickerSearch] = useState("");
  const [attachedAd, setAttachedAd] = useState<Ad | null>(null);
  const [attachedProduct, setAttachedProduct] =
    useState<ProductPreview | null>(null);
  const [urlToMine, setUrlToMine] = useState("");
  const endRef = useRef<HTMLDivElement | null>(null);

  const featuredSwipeAds = useMemo(() => {
    return ads
      .filter(
        (a) =>
          a.source_type === "meta_ad_library" &&
          (a.fallback_image_url || a.thumbnail_url)
      )
      .slice(0, 4);
  }, [ads]);

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
      .slice(0, 12);
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
      content:
        text ||
        (urlToMine
          ? `Mine denne URL: ${urlToMine}`
          : `Klon denne annonce fra ${attachedAd?.brand_name}`),
      createdAt: new Date().toISOString(),
      attachments: attachments.length > 0 ? attachments : undefined,
    };

    const nextMessages = [...messages, userMsg];
    onMessagesChange(nextMessages);
    if (!overridePrompt) setInput("");
    setSending(true);
    setPlusOpen(false);

    try {
      const res = await fetch("/api/snow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: userMsg.content,
          brandMemory,
          attachedAd: attachedAd
            ? buildClonedSourceFromAd(
                attachedAd,
                getActiveDays(attachedAd.started_running_at)
              )
            : null,
          attachedProduct,
          urlToMine: urlToMine.trim() || undefined,
          analyticsRows,
          candidateSwipeAds: ads
            .filter((a) => a.source_type === "meta_ad_library")
            .slice(0, 12),
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
          content: "Prøv lige igen om et øjeblik.",
        },
      ]);
    } finally {
      setSending(false);
      setAttachedAd(null);
      setAttachedProduct(null);
      setUrlToMine("");
      setPickerMode(null);
      setTimeout(
        () => endRef.current?.scrollIntoView({ behavior: "smooth" }),
        80
      );
    }
  };

  return (
    <div className="mx-auto flex h-full w-full max-w-3xl flex-col">
      {/* Ultra-minimal Top Bar (Brand Pill + Reset only) */}
      <div className="mb-2 flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={onOpenBrandMemory}
          className="inline-flex items-center gap-2 rounded-full border border-[#E6E9F0] bg-white px-3 py-1 text-[11.5px] font-semibold text-[#0F172A] transition-colors hover:border-[#0027eb]"
        >
          <span
            className={`h-2 w-2 rounded-full ${
              brandMemory ? "bg-[#16A34A]" : "bg-[#D97706]"
            }`}
          />
          {brandMemory ? brandMemory.brandName : "Forbind brand"}
        </button>
        {messages.length > 0 && (
          <button
            type="button"
            onClick={() => onMessagesChange([])}
            title="Ny chat"
            className="flex h-7 w-7 items-center justify-center rounded-full border border-[#E6E9F0] bg-white text-[#64748B] transition-colors hover:text-[#0F172A]"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Centered Clean Welcome Hero with Pixel Snow Character */}
      {messages.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center">
          <div className="relative mb-3 flex items-center justify-center">
            <div className="pointer-events-none absolute h-16 w-16 rounded-full bg-[#0027eb]/12 blur-xl" />
            <SnowCharacter size={76} className="relative z-10" />
          </div>
          <h1 className="font-display text-[28px] font-bold tracking-[-0.03em] text-[#0F172A]">
            Spørg Snow
          </h1>

          {/* Floating Pill Composer right in Hero Center */}
          <div className="mt-6 w-full">{renderComposer()}</div>

          {/* Minimal 2x2 Action Tiles */}
          <div className="mt-4 grid w-full grid-cols-2 gap-2.5">
            {STARTER_CARDS.map((card) => {
              const Icon = card.icon;
              return (
                <button
                  key={card.title}
                  type="button"
                  onClick={() => void sendMessage(card.prompt)}
                  className="group flex items-center justify-between rounded-2xl border border-[#ECEFF5] bg-white px-4 py-3 text-left transition-all hover:border-[#0027eb]/40 hover:shadow-[0_6px_20px_-10px_rgba(0,39,235,0.2)]"
                >
                  <div>
                    <p className="font-display text-[13px] font-bold text-[#0F172A]">
                      {card.title}
                    </p>
                    <p className="text-[11px] text-[#94A3B8]">{card.tag}</p>
                  </div>
                  <Icon className="h-4 w-4 text-[#94A3B8] transition-colors group-hover:text-[#0027eb]" />
                </button>
              );
            })}
          </div>

          {/* Visual Swipe Strip — Show, don't tell */}
          {featuredSwipeAds.length > 0 && (
            <div className="mt-6 w-full">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-[11px] font-semibold text-[#94A3B8]">
                  Klik en vinder for at klone
                </span>
              </div>
              <div className="grid grid-cols-4 gap-2.5">
                {featuredSwipeAds.map((ad) => (
                  <button
                    key={ad.id}
                    type="button"
                    onClick={() => onCloneAdToStudio(ad, "iphone_ugc")}
                    className="group relative aspect-[4/5] overflow-hidden rounded-2xl border border-[#ECEFF5] bg-[#0F172A] text-left"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={ad.fallback_image_url || ad.thumbnail_url}
                      alt={ad.brand_name}
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                    <div className="absolute inset-x-2 bottom-2 flex items-center justify-between gap-1">
                      <span className="truncate text-[10.5px] font-bold text-white">
                        {ad.brand_name}
                      </span>
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/95 text-[#0027eb] opacity-0 transition-opacity group-hover:opacity-100">
                        <Sparkles className="h-3 w-3" />
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <>
          <div className="workspace-scroll mb-4 flex-1 space-y-4 overflow-y-auto pr-1">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex items-start gap-2.5 ${
                  msg.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                {msg.role === "assistant" && (
                  <div className="mt-1 shrink-0">
                    <SnowCharacter size={28} animate={false} />
                  </div>
                )}
                <div
                  className={`max-w-[90%] rounded-2xl px-4 py-3 sm:max-w-[85%] ${
                    msg.role === "user"
                      ? "bg-[#0F172A] text-white"
                      : "border border-[#ECEFF5] bg-white text-[#0F172A]"
                  }`}
                >
                  {msg.attachments && msg.attachments.length > 0 && (
                    <div className="mb-2 flex flex-wrap gap-1.5">
                      {msg.attachments.map((att, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-0.5 text-[11px] font-medium"
                        >
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
              <div className="flex items-center gap-2.5">
                <SnowCharacter size={28} thinking />
                <div className="inline-flex items-center gap-2 rounded-full border border-[#ECEFF5] bg-white px-3.5 py-1.5 text-xs font-medium text-[#64748B]">
                  Snow tænker...
                </div>
              </div>
            )}
            <div ref={endRef} />
          </div>

          {renderComposer()}
        </>
      )}
    </div>
  );

  function renderComposer() {
    return (
      <div className="relative rounded-[22px] border border-[#DCE4FF] bg-white p-2 shadow-[0_10px_32px_-12px_rgba(0,39,235,0.22)]">
        {/* Selected Attachment Pills */}
        {(attachedAd || attachedProduct || urlToMine) && (
          <div className="mb-1.5 flex flex-wrap gap-1.5 px-2 pt-1">
            {attachedAd && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#0027eb]/[0.08] px-2.5 py-0.5 text-[11px] font-semibold text-[#0027eb]">
                {attachedAd.brand_name}
                <button type="button" onClick={() => setAttachedAd(null)}>
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
            {attachedProduct && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#F1F5F9] px-2.5 py-0.5 text-[11px] font-semibold text-[#0F172A]">
                {attachedProduct.title}
                <button type="button" onClick={() => setAttachedProduct(null)}>
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
            {urlToMine && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#F1F5F9] px-2.5 py-0.5 font-mono-num text-[11px] text-[#0F172A]">
                {urlToMine}
                <button type="button" onClick={() => setUrlToMine("")}>
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
          </div>
        )}

        {/* Popover Picker (opened via single + button) */}
        {pickerMode && (
          <div className="mb-2 rounded-2xl border border-[#ECEFF5] bg-[#FAFBFD] p-2.5">
            <div className="mb-2 flex items-center justify-between px-1">
              <span className="text-[11px] font-semibold text-[#64748B]">
                {pickerMode === "ad"
                  ? "Vælg annonce"
                  : pickerMode === "product"
                    ? "Vælg produkt"
                    : "Indsæt URL"}
              </span>
              <button
                type="button"
                onClick={() => setPickerMode(null)}
                className="text-[#94A3B8] hover:text-[#0F172A]"
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
                  placeholder="https://..."
                  className="flex-1 rounded-xl border border-[#DCE1EC] bg-white px-3 py-1.5 text-[16px] text-[#0F172A] outline-none focus:border-[#0027eb] sm:text-xs"
                />
                <button
                  type="button"
                  onClick={() => setPickerMode(null)}
                  className="rounded-xl bg-[#0F172A] px-3 py-1.5 text-xs font-semibold text-white"
                >
                  OK
                </button>
              </div>
            ) : pickerMode === "product" ? (
              brandMemory && brandMemory.products.length > 0 ? (
                <div className="grid max-h-40 grid-cols-2 gap-1.5 overflow-y-auto sm:grid-cols-3">
                  {brandMemory.products.map((p, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setAttachedProduct(p);
                        setPickerMode(null);
                      }}
                      className="flex items-center gap-2 rounded-xl border border-[#ECEFF5] bg-white p-1.5 text-left text-[11px] hover:border-[#0027eb]"
                    >
                      {p.image_url && (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={p.image_url}
                          alt=""
                          className="h-7 w-7 shrink-0 rounded-lg object-cover"
                        />
                      )}
                      <span className="truncate font-semibold text-[#0F172A]">
                        {p.title}
                      </span>
                    </button>
                  ))}
                </div>
              ) : (
                <button
                  type="button"
                  onClick={onOpenBrandMemory}
                  className="text-xs font-semibold text-[#0027eb]"
                >
                  Forbind dit brand først →
                </button>
              )
            ) : (
              <div className="space-y-2">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#94A3B8]" />
                  <input
                    type="text"
                    value={pickerSearch}
                    onChange={(e) => setPickerSearch(e.target.value)}
                    placeholder="Søg brand..."
                    className="w-full rounded-xl border border-[#DCE1EC] bg-white py-1.5 pl-8 pr-3 text-xs outline-none focus:border-[#0027eb]"
                  />
                </div>
                <div className="grid max-h-40 grid-cols-3 gap-1.5 overflow-y-auto sm:grid-cols-4">
                  {searchableAds.map((a) => (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => {
                        setAttachedAd(a);
                        setPickerMode(null);
                      }}
                      className="relative aspect-[4/5] overflow-hidden rounded-xl border border-[#ECEFF5] bg-[#0F172A]"
                    >
                      {(a.fallback_image_url || a.thumbnail_url) && (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={a.fallback_image_url || a.thumbnail_url}
                          alt={a.brand_name}
                          className="h-full w-full object-cover"
                        />
                      )}
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-1.5 py-1">
                        <p className="truncate text-[10px] font-bold text-white">
                          {a.brand_name}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Single Clean Input Row: [+] [Input] [Send] */}
        <div className="flex items-center gap-1.5">
          <div className="relative">
            <button
              type="button"
              onClick={() => setPlusOpen((v) => !v)}
              aria-label="Tilføj kontekst"
              className="flex h-9 w-9 items-center justify-center rounded-full text-[#64748B] transition-colors hover:bg-[#F3F5F9] hover:text-[#0F172A]"
            >
              <Plus
                className={`h-4 w-4 transition-transform ${
                  plusOpen ? "rotate-45" : ""
                }`}
              />
            </button>
            {plusOpen && (
              <div className="absolute bottom-11 left-0 z-20 w-44 rounded-2xl border border-[#E6E9F0] bg-white p-1.5 shadow-xl">
                <button
                  type="button"
                  onClick={() => {
                    setPickerMode("ad");
                    setPlusOpen(false);
                  }}
                  className="flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-xs font-semibold text-[#0F172A] hover:bg-[#F5F7FA]"
                >
                  <Sparkles className="h-3.5 w-3.5 text-[#64748B]" />
                  Swipe-annonce
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPickerMode("product");
                    setPlusOpen(false);
                  }}
                  className="flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-xs font-semibold text-[#0F172A] hover:bg-[#F5F7FA]"
                >
                  <Package className="h-3.5 w-3.5 text-[#64748B]" />
                  Mit produkt
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPickerMode("url");
                    setPlusOpen(false);
                  }}
                  className="flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-xs font-semibold text-[#0F172A] hover:bg-[#F5F7FA]"
                >
                  <Link2 className="h-3.5 w-3.5 text-[#64748B]" />
                  Produkt-URL
                </button>
              </div>
            )}
          </div>

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
                ? `Spørg Snow om ${brandMemory.brandName}...`
                : "Spørg Snow eller indsæt en URL..."
            }
            className="min-w-0 flex-1 bg-transparent px-1.5 py-2 text-[16px] text-[#0F172A] outline-none placeholder:text-[#94A3B8] sm:text-[14px]"
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
      </div>
    );
  }
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
        <div className="mb-2 flex items-center justify-between">
          <span className="inline-flex items-center gap-2 font-display text-xs font-bold text-[#0F172A]">
            <SnowCharacter size={22} animate={false} />
            Snow
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Luk"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-[#64748B] shadow-xs hover:text-[#0F172A]"
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
