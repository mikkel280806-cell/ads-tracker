"use client";

import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  Check,
  ChevronDown,
  Globe,
  Loader2,
  Package,
  Plus,
  Sparkles,
  X,
} from "lucide-react";
import type { BrandMemory } from "@/lib/studio-types";
import { formatProductPriceDkk } from "@/lib/audience-insights";

interface BrandMemoryModalProps {
  open: boolean;
  initialMemory: BrandMemory | null;
  onClose: () => void;
  onSaveMemory: (memory: BrandMemory) => void;
}

const QUICK_DOMAINS = ["archandpillar.dk", "thenap.dk", "mellowsleep.com"];

function MinimalTagRow({
  label,
  items,
  tone = "neutral",
  onChange,
}: {
  label: string;
  items: string[];
  tone?: "green" | "rose" | "neutral";
  onChange: (next: string[]) => void;
}) {
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState("");

  const commit = () => {
    const clean = draft.trim();
    if (clean && !items.includes(clean)) onChange([...items, clean]);
    setDraft("");
    setAdding(false);
  };

  const pillClass =
    tone === "green"
      ? "bg-[#ECFDF3] text-[#15803D]"
      : tone === "rose"
        ? "bg-[#FFF1F2] text-[#BE123C]"
        : "bg-[#F3F5F9] text-[#334155]";

  return (
    <div className="space-y-1.5">
      <span className="block text-[10.5px] font-semibold uppercase tracking-wider text-[#94A3B8]">
        {label}
      </span>
      <div className="flex flex-wrap items-center gap-1.5">
        {items.map((item, idx) => (
          <span
            key={`${item}-${idx}`}
            className={`inline-flex max-w-full items-center gap-1 rounded-full px-2.5 py-1 text-[11.5px] font-medium ${pillClass}`}
          >
            <span className="truncate">{item}</span>
            <button
              type="button"
              onClick={() => onChange(items.filter((_, i) => i !== idx))}
              className="opacity-50 hover:opacity-100"
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}

        {adding ? (
          <input
            autoFocus
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                commit();
              }
              if (e.key === "Escape") {
                setDraft("");
                setAdding(false);
              }
            }}
            placeholder="Skriv + Enter"
            className="w-36 rounded-full border border-[#0027eb] bg-white px-2.5 py-1 text-[11.5px] text-[#0F172A] outline-none"
          />
        ) : (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="flex h-6 w-6 items-center justify-center rounded-full border border-dashed border-[#CBD5E1] text-[#64748B] hover:border-[#0027eb] hover:text-[#0027eb]"
          >
            <Plus className="h-3 w-3" />
          </button>
        )}
      </div>
    </div>
  );
}

export function BrandMemoryModal({
  open,
  initialMemory,
  onClose,
  onSaveMemory,
}: BrandMemoryModalProps) {
  const [urlInput, setUrlInput] = useState(initialMemory?.websiteUrl || "");
  const [scraping, setScraping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<BrandMemory | null>(initialMemory);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    if (!open) return;
    setDraft(initialMemory);
    setUrlInput(initialMemory?.websiteUrl || "");
    setError(null);
    setShowDetails(false);
  }, [open, initialMemory]);

  if (!open || typeof document === "undefined") return null;

  const runBrandScrape = async (targetUrl?: string) => {
    const raw = (targetUrl ?? urlInput).trim();
    if (!raw) return;
    setUrlInput(raw);
    setError(null);
    setScraping(true);
    try {
      const res = await fetch("/api/brand-memory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: raw }),
      });
      const data = await res.json();
      if (!res.ok || !data?.ok || !data.memory) {
        throw new Error(data?.error || "Kunne ikke indlæse shoppen.");
      }
      setDraft(data.memory as BrandMemory);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Fejl under scan.");
    } finally {
      setScraping(false);
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[95] flex items-center justify-center bg-[#050811]/65 p-3 backdrop-blur-xs sm:p-5"
      onClick={onClose}
    >
      <div
        className="flex max-h-[88vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-[#E6E9F0] bg-white text-[#0F172A] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Minimal Header */}
        <div className="flex shrink-0 items-center justify-between px-5 py-4">
          <span className="font-display text-[16px] font-bold text-[#0F172A]">
            Brand Memory
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Luk"
            className="flex h-8 w-8 items-center justify-center rounded-full text-[#64748B] hover:bg-[#F3F5F9] hover:text-[#0F172A]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="workspace-scroll min-h-0 flex-1 space-y-5 overflow-y-auto px-5 pb-5">
          {/* Single Pill URL Scanner */}
          <div className="space-y-2.5">
            <div className="flex items-center gap-2 rounded-full border border-[#DCE4FF] bg-[#FAFBFD] p-1.5 pl-4 focus-within:border-[#0027eb] focus-within:bg-white">
              <Globe className="h-4 w-4 shrink-0 text-[#94A3B8]" />
              <input
                type="text"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    void runBrandScrape();
                  }
                }}
                placeholder="https://ditbrand.dk"
                className="min-w-0 flex-1 bg-transparent py-1.5 text-[16px] text-[#0F172A] outline-none sm:text-sm"
              />
              <button
                type="button"
                disabled={scraping}
                onClick={() => void runBrandScrape()}
                className="adtrack-btn-primary inline-flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2 text-xs font-semibold text-white disabled:opacity-60"
              >
                {scraping ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Sparkles className="h-3.5 w-3.5" />
                )}
                Scan
              </button>
            </div>

            {!draft && (
              <div className="flex flex-wrap items-center justify-center gap-1.5">
                {QUICK_DOMAINS.map((dom) => (
                  <button
                    key={dom}
                    type="button"
                    disabled={scraping}
                    onClick={() => void runBrandScrape(`https://${dom}`)}
                    className="rounded-full border border-[#ECEFF5] bg-white px-3 py-1 font-mono-num text-[11px] text-[#64748B] transition-colors hover:border-[#0027eb] hover:text-[#0027eb]"
                  >
                    {dom}
                  </button>
                ))}
              </div>
            )}

            {error && (
              <p className="rounded-xl bg-[#FFF1F2] px-3 py-2 text-xs font-medium text-[#E11D48]">
                {error}
              </p>
            )}
          </div>

          {/* Visual Brand Identity Card + Product Visual Strip */}
          {draft && (
            <div className="space-y-5">
              {/* Brand Hero Card */}
              <div className="flex items-center justify-between gap-3 rounded-2xl border border-[#ECEFF5] bg-[#FAFBFD] p-4">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-[#E6E9F0] bg-white">
                    {draft.logoUrl ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={draft.logoUrl}
                        alt={draft.brandName}
                        className="h-8 w-8 object-contain"
                      />
                    ) : (
                      <span className="font-display text-sm font-bold text-[#0F172A]">
                        {draft.brandName.slice(0, 2).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-display text-[16px] font-bold text-[#0F172A]">
                      {draft.brandName}
                    </p>
                    <p className="truncate font-mono-num text-[11.5px] text-[#64748B]">
                      {draft.domain} · {draft.products.length} produkter
                    </p>
                  </div>
                </div>
                {draft.trustpilotScore && (
                  <span className="shrink-0 rounded-full bg-[#ECFDF3] px-3 py-1 font-mono-num text-xs font-bold text-[#15803D]">
                    ★ {draft.trustpilotScore}
                  </span>
                )}
              </div>

              {/* Visual Product Photo Strip */}
              {draft.products.length > 0 && (
                <div className="no-scrollbar flex gap-2.5 overflow-x-auto pb-1">
                  {draft.products.slice(0, 8).map((p, idx) => (
                    <div
                      key={`${p.title}-${idx}`}
                      className="w-28 shrink-0 overflow-hidden rounded-2xl border border-[#ECEFF5] bg-white"
                    >
                      <div className="aspect-square w-full bg-[#FAFBFD]">
                        {p.image_url ? (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img
                            src={p.image_url}
                            alt={p.title}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-[#CBD5E1]">
                            <Package className="h-5 w-5" />
                          </div>
                        )}
                      </div>
                      <div className="p-2">
                        <p className="truncate text-[11px] font-semibold text-[#0F172A]">
                          {p.title}
                        </p>
                        <p className="font-mono-num text-[10px] text-[#64748B]">
                          {formatProductPriceDkk(
                            p.price,
                            p.currency || draft.currency
                          )}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Clean Scannable Brand DNA Pills */}
              <div className="space-y-3.5">
                <MinimalTagRow
                  label="USP'er"
                  items={draft.usps}
                  tone="green"
                  onChange={(usps) => setDraft({ ...draft, usps })}
                />
                <MinimalTagRow
                  label="Pain Points"
                  items={draft.painPoints}
                  tone="rose"
                  onChange={(painPoints) => setDraft({ ...draft, painPoints })}
                />
                <MinimalTagRow
                  label="Desires"
                  items={draft.desires}
                  onChange={(desires) => setDraft({ ...draft, desires })}
                />
              </div>

              {/* Optional Collapsible Details */}
              <div className="border-t border-[#F1F5F9] pt-3">
                <button
                  type="button"
                  onClick={() => setShowDetails((v) => !v)}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#64748B] hover:text-[#0F172A]"
                >
                  Tone, offer & målgruppe
                  <ChevronDown
                    className={`h-3.5 w-3.5 transition-transform ${
                      showDetails ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {showDetails && (
                  <div className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                    <input
                      type="text"
                      value={draft.toneOfVoice}
                      onChange={(e) =>
                        setDraft({ ...draft, toneOfVoice: e.target.value })
                      }
                      placeholder="Tone of voice"
                      className="rounded-xl border border-[#E2E6EF] bg-[#FAFBFD] px-3 py-2 text-xs text-[#0F172A] outline-none focus:border-[#0027eb] focus:bg-white"
                    />
                    <input
                      type="text"
                      value={draft.primaryOffer}
                      onChange={(e) =>
                        setDraft({ ...draft, primaryOffer: e.target.value })
                      }
                      placeholder="Offer"
                      className="rounded-xl border border-[#E2E6EF] bg-[#FAFBFD] px-3 py-2 text-xs text-[#0F172A] outline-none focus:border-[#0027eb] focus:bg-white"
                    />
                    <input
                      type="text"
                      value={draft.targetAudience}
                      onChange={(e) =>
                        setDraft({ ...draft, targetAudience: e.target.value })
                      }
                      placeholder="Målgruppe"
                      className="rounded-xl border border-[#E2E6EF] bg-[#FAFBFD] px-3 py-2 text-xs text-[#0F172A] outline-none focus:border-[#0027eb] focus:bg-white sm:col-span-2"
                    />
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Minimal Single-CTA Footer */}
        {draft && (
          <div className="flex shrink-0 items-center justify-end border-t border-[#ECEFF5] px-5 py-3.5">
            <button
              type="button"
              onClick={() => {
                onSaveMemory(draft);
                onClose();
              }}
              className="adtrack-btn-primary inline-flex items-center gap-1.5 rounded-full px-5 py-2 text-xs font-semibold text-white"
            >
              <Check className="h-3.5 w-3.5" />
              Gem Brand
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
