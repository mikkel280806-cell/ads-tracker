"use client";

import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  Check,
  Globe,
  Loader2,
  Package,
  Plus,
  Sparkles,
  Trash2,
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

const EXAMPLE_DOMAINS = ["archandpillar.dk", "thenap.dk", "mellowsleep.com"];

function ChipEditor({
  label,
  items,
  placeholder,
  onChange,
}: {
  label: string;
  items: string[];
  placeholder: string;
  onChange: (next: string[]) => void;
}) {
  const [draft, setDraft] = useState("");

  const addItem = () => {
    const clean = draft.trim();
    if (!clean) return;
    if (!items.includes(clean)) onChange([...items, clean]);
    setDraft("");
  };

  return (
    <div className="space-y-1.5">
      <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">
        {label}
      </label>
      <div className="flex flex-wrap gap-1.5">
        {items.map((item, idx) => (
          <span
            key={`${item}-${idx}`}
            className="inline-flex max-w-full items-center gap-1.5 rounded-lg border border-[#E2E6EF] bg-[#FAFBFD] px-2.5 py-1 text-[11.5px] font-medium text-[#0F172A]"
          >
            <span className="truncate">{item}</span>
            <button
              type="button"
              onClick={() => onChange(items.filter((_, i) => i !== idx))}
              aria-label="Fjern"
              className="shrink-0 text-[#94A3B8] transition-colors hover:text-[#E11D48]"
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
      </div>
      <div className="flex items-center gap-1.5">
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addItem();
            }
          }}
          placeholder={placeholder}
          className="min-w-0 flex-1 rounded-xl border border-[#E2E6EF] bg-[#F8FAFC] px-3 py-1.5 text-[16px] text-[#0F172A] outline-none transition-colors focus:border-[#0027eb] focus:bg-white sm:text-xs"
        />
        <button
          type="button"
          onClick={addItem}
          className="inline-flex shrink-0 items-center gap-1 rounded-xl border border-[#E2E6EF] bg-white px-2.5 py-1.5 text-xs font-semibold text-[#334155] transition-colors hover:border-[#CBD5E1] hover:text-[#0F172A]"
        >
          <Plus className="h-3.5 w-3.5" />
          Tilføj
        </button>
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
  const [urlInput, setUrlInput] = useState(
    initialMemory?.websiteUrl || ""
  );
  const [scraping, setScraping] = useState(false);
  const [scrapeStep, setScrapeStep] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<BrandMemory | null>(initialMemory);

  useEffect(() => {
    if (!open) return;
    setDraft(initialMemory);
    setUrlInput(initialMemory?.websiteUrl || "");
    setError(null);
  }, [open, initialMemory]);

  if (!open || typeof document === "undefined") return null;

  const runBrandScrape = async (targetUrl?: string) => {
    const raw = (targetUrl ?? urlInput).trim();
    if (!raw) {
      setError("Indtast din shop-URL for at opbygge Brand Memory.");
      return;
    }
    setUrlInput(raw);
    setError(null);
    setScraping(true);
    setScrapeStep("Henter hjemmeside, tone-of-voice & tech stack...");

    const stepTimer = window.setTimeout(() => {
      setScrapeStep("Udtrækker Shopify-produkter, USP'er, pain points & Trustpilot...");
    }, 1400);

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
      setScrapeStep("");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Fejl under analyse af webshop."
      );
    } finally {
      window.clearTimeout(stepTimer);
      setScraping(false);
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[95] flex items-center justify-center bg-[#050811]/65 p-3 backdrop-blur-xs sm:p-5"
      onClick={onClose}
    >
      <div
        className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-[#E6E9F0] bg-white text-[#0F172A] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-[#ECEFF5] px-5 py-4">
          <div className="flex items-center gap-2.5">
            <span className="adtrack-icon-badge flex h-9 w-9 items-center justify-center rounded-xl text-white">
              <Sparkles className="h-4 w-4" />
            </span>
            <div>
              <h2 className="font-display text-[16px] font-bold text-[#0F172A]">
                Brand Memory & Onboarding
              </h2>
              <p className="text-[11.5px] text-[#64748B]">
                Indsæt din shop-URL én gang — Snow, Cloner og Video Maker husker altid dine produkter, USP&apos;er og tone.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Luk"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-[#64748B] transition-colors hover:bg-[#F3F5F9] hover:text-[#0F172A]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="workspace-scroll min-h-0 flex-1 space-y-5 overflow-y-auto p-5">
          {/* Step 1: Scrape URL */}
          <div className="rounded-2xl border border-[#E6E9F0] bg-[#FAFBFD] p-4">
            <label className="mb-2 block text-[11.5px] font-semibold uppercase tracking-wider text-[#475569]">
              1. Scan dit brand automatisk
            </label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="relative flex-1">
                <Globe className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#64748B]" />
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
                  className="w-full rounded-xl border border-[#DCE1EC] bg-white py-2.5 pl-9.5 pr-3 text-[16px] text-[#0F172A] outline-none transition-colors focus:border-[#0027eb] sm:text-xs"
                />
              </div>
              <button
                type="button"
                disabled={scraping}
                onClick={() => void runBrandScrape()}
                className="adtrack-btn-primary inline-flex shrink-0 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold text-white disabled:opacity-60"
              >
                {scraping ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Scanner...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-3.5 w-3.5" />
                    Scan & Lær Brand
                  </>
                )}
              </button>
            </div>

            <div className="mt-2.5 flex flex-wrap items-center gap-1.5 text-[11px] text-[#64748B]">
              <span>Hurtig test:</span>
              {EXAMPLE_DOMAINS.map((dom) => (
                <button
                  key={dom}
                  type="button"
                  disabled={scraping}
                  onClick={() => void runBrandScrape(`https://${dom}`)}
                  className="rounded-lg border border-[#E2E6EF] bg-white px-2.5 py-1 font-mono-num font-medium text-[#334155] transition-colors hover:border-[#0027eb] hover:text-[#0027eb]"
                >
                  {dom}
                </button>
              ))}
            </div>

            {scraping && scrapeStep && (
              <p className="mt-2.5 flex items-center gap-2 text-xs font-medium text-[#0027eb]">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                {scrapeStep}
              </p>
            )}
            {error && (
              <p className="mt-2.5 rounded-xl bg-[#FFF1F2] px-3 py-2 text-xs font-medium text-[#E11D48]">
                {error}
              </p>
            )}
          </div>

          {/* Step 2: Editable Memory Profile */}
          {draft ? (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#ECEFF5] bg-white p-4">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-[#E6E9F0] bg-[#F7F8FB]">
                    {draft.logoUrl ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={draft.logoUrl}
                        alt={draft.brandName}
                        className="h-7 w-7 object-contain"
                      />
                    ) : (
                      <span className="font-display text-sm font-bold text-[#0F172A]">
                        {draft.brandName.slice(0, 2).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div className="min-w-0">
                    <input
                      type="text"
                      value={draft.brandName}
                      onChange={(e) =>
                        setDraft({ ...draft, brandName: e.target.value })
                      }
                      className="w-full font-display text-[15px] font-bold text-[#0F172A] outline-none focus:text-[#0027eb]"
                    />
                    <p className="truncate font-mono-num text-[11.5px] text-[#64748B]">
                      {draft.domain} · {draft.category} · {draft.products.length} produkter indlæst
                    </p>
                  </div>
                </div>
                {draft.trustpilotScore && (
                  <span className="rounded-xl border border-[#DCFCE7] bg-[#F0FDF4] px-2.5 py-1 font-mono-num text-[11.5px] font-semibold text-[#15803D]">
                    ★ {draft.trustpilotScore}/5 Trustpilot ({draft.trustpilotReviews || "verificeret"})
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">
                    Tone of Voice
                  </label>
                  <input
                    type="text"
                    value={draft.toneOfVoice}
                    onChange={(e) =>
                      setDraft({ ...draft, toneOfVoice: e.target.value })
                    }
                    className="w-full rounded-xl border border-[#E2E6EF] bg-[#F8FAFC] px-3 py-2 text-[16px] text-[#0F172A] outline-none focus:border-[#0027eb] focus:bg-white sm:text-xs"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">
                    Primært Offer / Tilbud
                  </label>
                  <input
                    type="text"
                    value={draft.primaryOffer}
                    onChange={(e) =>
                      setDraft({ ...draft, primaryOffer: e.target.value })
                    }
                    className="w-full rounded-xl border border-[#E2E6EF] bg-[#F8FAFC] px-3 py-2 text-[16px] text-[#0F172A] outline-none focus:border-[#0027eb] focus:bg-white sm:text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">
                  Kerne-målgruppe
                </label>
                <input
                  type="text"
                  value={draft.targetAudience}
                  onChange={(e) =>
                    setDraft({ ...draft, targetAudience: e.target.value })
                  }
                  className="w-full rounded-xl border border-[#E2E6EF] bg-[#F8FAFC] px-3 py-2 text-[16px] text-[#0F172A] outline-none focus:border-[#0027eb] focus:bg-white sm:text-xs"
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <ChipEditor
                  label="USP'er (Salgsargumenter)"
                  items={draft.usps}
                  placeholder="Ny USP + Enter"
                  onChange={(usps) => setDraft({ ...draft, usps })}
                />
                <ChipEditor
                  label="Pain Points (Kundeproblemer)"
                  items={draft.painPoints}
                  placeholder="Nyt pain point + Enter"
                  onChange={(painPoints) => setDraft({ ...draft, painPoints })}
                />
                <ChipEditor
                  label="Desires (Ønskede resultater)"
                  items={draft.desires}
                  placeholder="Nyt desire + Enter"
                  onChange={(desires) => setDraft({ ...draft, desires })}
                />
                <ChipEditor
                  label="Indvendinger (Skepsis)"
                  items={draft.objections}
                  placeholder="Ny indvending + Enter"
                  onChange={(objections) => setDraft({ ...draft, objections })}
                />
              </div>

              {/* Products preview */}
              {draft.products.length > 0 && (
                <div className="space-y-2">
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">
                    Indlæste Produkter ({draft.products.length})
                  </label>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {draft.products.slice(0, 8).map((p, idx) => (
                      <div
                        key={`${p.title}-${idx}`}
                        className="flex items-center gap-2 rounded-xl border border-[#ECEFF5] bg-[#FAFBFD] p-2"
                      >
                        <div className="h-9 w-9 shrink-0 overflow-hidden rounded-lg border border-[#E6E9F0] bg-white">
                          {p.image_url ? (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img
                              src={p.image_url}
                              alt={p.title}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-[#94A3B8]">
                              <Package className="h-4 w-4" />
                            </div>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[11px] font-semibold text-[#0F172A]">
                            {p.title}
                          </p>
                          <p className="font-mono-num text-[10.5px] text-[#64748B]">
                            {formatProductPriceDkk(p.price, p.currency || draft.currency)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">
                  Kundeanmeldelser / Citat-bank (én pr. linje)
                </label>
                <textarea
                  rows={3}
                  value={draft.customerReviews.join("\n")}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      customerReviews: e.target.value
                        .split("\n")
                        .map((l) => l.trim())
                        .filter(Boolean),
                    })
                  }
                  className="w-full rounded-xl border border-[#E2E6EF] bg-[#F8FAFC] p-3 text-[16px] leading-relaxed text-[#0F172A] outline-none focus:border-[#0027eb] focus:bg-white sm:text-xs"
                />
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-[#DCE1EC] bg-[#FAFBFD] px-6 py-10 text-center">
              <Sparkles className="mx-auto h-6 w-6 text-[#64748B]" />
              <p className="mt-2 font-display text-sm font-bold text-[#0F172A]">
                Ingen brand-hukommelse gemt endnu
              </p>
              <p className="mx-auto mt-1 max-w-md text-xs text-[#64748B]">
                Indtast din hjemmeside øverst (eller klik på en af hurtig-testene), så bygger vi hele dit brands vidensbank automatisk.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex shrink-0 items-center justify-between gap-2 border-t border-[#ECEFF5] bg-[#FAFBFD] px-5 py-3.5">
          {draft ? (
            <button
              type="button"
              onClick={() => setDraft(null)}
              className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold text-[#64748B] transition-colors hover:bg-[#F1F5F9] hover:text-[#E11D48]"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Nulstil
            </button>
          ) : (
            <span />
          )}

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-[#E2E6EF] bg-white px-4 py-2 text-xs font-semibold text-[#334155] transition-colors hover:bg-[#F3F5F9]"
            >
              Annuller
            </button>
            <button
              type="button"
              disabled={!draft}
              onClick={() => {
                if (!draft) return;
                onSaveMemory(draft);
                onClose();
              }}
              className="adtrack-btn-primary inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-semibold text-white disabled:opacity-45"
            >
              <Check className="h-3.5 w-3.5" />
              Gem Brand Memory
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
