"use client";

import React, { useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  Activity,
  ArrowRight,
  Check,
  Code2,
  Copy,
  Film,
  Image as ImageIcon,
  Info,
  MoreHorizontal,
  Rocket,
  SlidersHorizontal,
  Sparkles,
  Upload,
  X,
} from "lucide-react";
import type {
  BrandMemory,
  CreativeProject,
  OwnAdMetricRow,
} from "@/lib/studio-types";
import { formatDkkExact, parseMetaAdsCsv } from "@/lib/snow-engine";
import { MetaInfinityIcon } from "./BrandIcons";

export type AnalyticsReportId =
  | "overview"
  | "top_spend"
  | "top_performing"
  | "top_videos"
  | "top_images"
  | "top_hooks";

interface CreativeAnalyticsViewProps {
  brandMemory: BrandMemory | null;
  projects: CreativeProject[];
  analyticsRows: OwnAdMetricRow[];
  activeReport?: AnalyticsReportId;
  onDoubleDown: (row: OwnAdMetricRow) => void;
  onLaunchProjects: (
    projectIds: string[],
    campaignName: string,
    dailyBudgetDkk: number
  ) => void;
  onImportCsvRows: (rows: OwnAdMetricRow[]) => void;
  onOpenBrandMemory: () => void;
}

function AtriaLineSparkline({
  points,
  prevPoints,
}: {
  points: number[];
  prevPoints: number[];
}) {
  const all = [...points, ...prevPoints];
  const min = Math.min(...all);
  const max = Math.max(...all);
  const span = Math.max(1, max - min);

  const toCoords = (arr: number[]) =>
    arr.map((v, i) => ({
      x: (i / Math.max(1, arr.length - 1)) * 160,
      y: 34 - ((v - min) / span) * 26,
    }));

  const buildSmooth = (pts: { x: number; y: number }[]) => {
    if (pts.length === 0) return "";
    let d = `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`;
    for (let i = 1; i < pts.length; i++) {
      const p0 = pts[i - 1];
      const p1 = pts[i];
      const cx = ((p0.x + p1.x) / 2).toFixed(1);
      d += ` C ${cx} ${p0.y.toFixed(1)}, ${cx} ${p1.y.toFixed(1)}, ${p1.x.toFixed(1)} ${p1.y.toFixed(1)}`;
    }
    return d;
  };

  return (
    <svg viewBox="0 0 160 38" className="h-9 w-full overflow-visible">
      <path
        d={buildSmooth(toCoords(prevPoints))}
        fill="none"
        stroke="#CBD5E1"
        strokeWidth="1.2"
        strokeDasharray="2.5 2.5"
      />
      <path
        d={buildSmooth(toCoords(points))}
        fill="none"
        stroke="#0284C7"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  );
}

const AGE_GENDER_SERIES = [
  { age: "18-24", f: 8, m: 6 },
  { age: "25-34", f: 42, m: 14 },
  { age: "35-44", f: 96, m: 18 },
  { age: "45-54", f: 84, m: 15 },
  { age: "55-64", f: 68, m: 11 },
  { age: "65+", f: 44, m: 9 },
];

const PLATFORM_SERIES = [
  { label: "IG", desktop: 6, mobile: 96 },
  { label: "FB", desktop: 12, mobile: 82 },
  { label: "AN", desktop: 4, mobile: 18 },
  { label: "MSG", desktop: 3, mobile: 10 },
];

const CREATIVE_TAGS = {
  themes: [
    { label: "Problem & løsning", pct: 95 },
    { label: "Før & efter", pct: 76 },
    { label: "Sæson / Kampagne", pct: 64 },
    { label: "Produkt-demo", pct: 56 },
    { label: "Behind the scenes", pct: 44 },
  ],
  angles: [
    { label: "Hverdags-rutine", pct: 94 },
    { label: "Social proof / Review", pct: 86 },
    { label: "Pris vs. kvalitet", pct: 74 },
    { label: "Ekspert / Founder", pct: 66 },
    { label: "Komfort & garanti", pct: 52 },
  ],
  emotions: [
    { label: "Tillid & tryghed", pct: 96 },
    { label: "Lettelse", pct: 72 },
    { label: "Nysgerrighed", pct: 58 },
    { label: "Tilfredshed", pct: 46 },
    { label: "Varme & glæde", pct: 38 },
  ],
};

export function CreativeAnalyticsView({
  brandMemory,
  projects,
  analyticsRows,
  activeReport = "overview",
  onDoubleDown,
  onLaunchProjects,
  onImportCsvRows,
}: CreativeAnalyticsViewProps) {
  const [period, setPeriod] = useState<"7d" | "14d" | "30d">("14d");
  const [breakdownMetric, setBreakdownMetric] = useState<"spend" | "roas">(
    "spend"
  );
  const [tagsMetric, setTagsMetric] = useState<"spend" | "roas">("spend");
  const [menuOpen, setMenuOpen] = useState(false);
  const [launchOpen, setLaunchOpen] = useState(false);
  const [mcpOpen, setMcpOpen] = useState(false);
  const [campaignName, setCampaignName] = useState(
    `${brandMemory?.brandName || "Flake"} · Advantage+`
  );
  const [dailyBudgetDkk, setDailyBudgetDkk] = useState(750);
  const [selectedLaunchIds, setSelectedLaunchIds] = useState<string[]>(() =>
    projects
      .filter((p) => p.status === "queued" || p.status === "ready")
      .map((p) => p.id)
  );
  const [copiedMcp, setCopiedMcp] = useState(false);
  const [csvFeedback, setCsvFeedback] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const periodFactor = period === "7d" ? 0.52 : period === "30d" ? 1.85 : 1;

  const totals = useMemo(() => {
    const spend = Math.round(
      analyticsRows.reduce((s, r) => s + r.spendDkk, 0) * periodFactor
    );
    const revenue = Math.round(
      analyticsRows.reduce((s, r) => s + r.revenueDkk, 0) * periodFactor
    );
    const purchases = Math.max(
      1,
      Math.round(
        analyticsRows.reduce((s, r) => s + r.purchases, 0) * periodFactor
      )
    );
    const roas = spend > 0 ? Number((revenue / spend).toFixed(2)) : 0;
    const cpa = Math.round(spend / purchases);
    const aov = Math.round(revenue / purchases);
    const cpcAll = Math.max(3, Math.round(cpa * 0.045));
    const cpcLink = Math.max(4, Math.round(cpa * 0.056));
    const cpm = Math.max(45, Math.round(spend / Math.max(1, purchases * 5.2)));

    return { spend, revenue, roas, cpa, aov, cpcAll, cpcLink, cpm };
  }, [analyticsRows, periodFactor]);

  const formatSplit = useMemo(() => {
    let imageVal = 0;
    let videoVal = 0;
    for (const r of analyticsRows) {
      const isStatic = r.format.toLowerCase().includes("static");
      const val = breakdownMetric === "spend" ? r.spendDkk : r.roas * 1000;
      if (isStatic) imageVal += val;
      else videoVal += val;
    }
    const maxV = Math.max(1, imageVal, videoVal);
    return {
      imagePct: Math.max(24, Math.round((imageVal / maxV) * 100)),
      videoPct: Math.max(24, Math.round((videoVal / maxV) * 100)),
    };
  }, [analyticsRows, breakdownMetric]);

  const filteredReportRows = useMemo(() => {
    const copy = [...analyticsRows];
    if (activeReport === "top_spend") {
      return copy.sort((a, b) => b.spendDkk - a.spendDkk);
    }
    if (activeReport === "top_performing") {
      return copy.sort((a, b) => b.roas - a.roas);
    }
    if (activeReport === "top_videos") {
      return copy.filter((r) => !r.format.toLowerCase().includes("static"));
    }
    if (activeReport === "top_images") {
      const imgs = copy.filter((r) => r.format.toLowerCase().includes("static"));
      return imgs.length > 0 ? imgs : copy;
    }
    if (activeReport === "top_hooks") {
      return copy.sort((a, b) => b.thumbstopPct - a.thumbstopPct);
    }
    return copy;
  }, [analyticsRows, activeReport]);

  const queuedProjects = useMemo(
    () => projects.filter((p) => p.status !== "live"),
    [projects]
  );

  const handleCsvUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const parsed = parseMetaAdsCsv(String(reader.result || ""));
      if (parsed.length > 0) {
        onImportCsvRows(parsed);
        setCsvFeedback(`${parsed.length} annoncer importeret`);
      } else {
        setCsvFeedback("Ingen gyldige kolonner i CSV");
      }
      setTimeout(() => setCsvFeedback(null), 3500);
    };
    reader.readAsText(file);
  };

  const kpiCards = [
    {
      label: "Spend",
      value: formatDkkExact(totals.spend),
      delta: "+12%",
      positive: true,
      pts: [42, 34, 65, 58, 40, 62, 46, 70, 56],
      prev: [38, 44, 52, 49, 46, 51, 48, 55, 50],
    },
    {
      label: "ROAS",
      value: `${totals.roas.toFixed(2)}x`,
      delta: "+0,42%",
      positive: true,
      pts: [45, 58, 42, 38, 62, 50, 39, 58, 54],
      prev: [40, 46, 44, 42, 47, 45, 43, 46, 45],
    },
    {
      label: "CPA",
      value: formatDkkExact(totals.cpa),
      delta: "-8,4%",
      positive: true,
      pts: [62, 54, 58, 49, 52, 44, 50, 42, 39],
      prev: [65, 60, 62, 57, 58, 55, 54, 52, 50],
    },
    {
      label: "Purchase value",
      value: formatDkkExact(totals.revenue),
      delta: "+18%",
      positive: true,
      pts: [36, 48, 42, 66, 55, 44, 61, 49, 68],
      prev: [32, 39, 41, 48, 46, 42, 49, 46, 52],
    },
    {
      label: "AOV",
      value: formatDkkExact(totals.aov),
      delta: "+0,97%",
      positive: true,
      pts: [50, 44, 56, 54, 48, 46, 52, 58, 54],
      prev: [48, 47, 50, 49, 48, 47, 49, 50, 49],
    },
    {
      label: "CPC (all)",
      value: formatDkkExact(totals.cpcAll),
      delta: "+0,37%",
      positive: false,
      pts: [48, 56, 52, 44, 50, 62, 58, 49, 52],
      prev: [46, 49, 48, 46, 48, 51, 50, 48, 49],
    },
    {
      label: "CPC (link click)",
      value: formatDkkExact(totals.cpcLink),
      delta: "-0,79%",
      positive: true,
      pts: [54, 48, 50, 64, 52, 45, 48, 52, 46],
      prev: [56, 53, 54, 55, 52, 51, 52, 53, 51],
    },
    {
      label: "CPM",
      value: formatDkkExact(totals.cpm),
      delta: "-0,60%",
      positive: true,
      pts: [52, 46, 60, 56, 48, 55, 52, 44, 49],
      prev: [55, 52, 54, 53, 51, 52, 51, 49, 50],
    },
  ];

  const reportTitles: Record<AnalyticsReportId, string> = {
    overview: "Overview",
    top_spend: "Top spend ads",
    top_performing: "Top performing ads",
    top_videos: "Top performing videos",
    top_images: "Top performing images",
    top_hooks: "Top hooks & retention",
  };

  return (
    <div className="mx-auto max-w-[1180px] space-y-4">
      {/* ATRIA CLEAN TOP HEADER STRIP */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-1">
        <div className="flex items-center gap-2.5">
          <MetaInfinityIcon className="h-5 w-5 text-[#0027eb]" />
          <h1 className="font-display text-[17px] font-bold tracking-tight text-[#0F172A]">
            {brandMemory ? brandMemory.brandName : "Flake Demo"}
          </h1>
          {activeReport !== "overview" && (
            <span className="rounded-md bg-[#F1F5F9] px-2 py-0.5 text-[11px] font-semibold text-[#475569]">
              {reportTitles[activeReport]}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value as "7d" | "14d" | "30d")}
            className="rounded-lg border border-[#E6E9F0] bg-white px-3 py-1.5 text-xs font-medium text-[#334155] outline-none hover:border-[#CBD5E1]"
          >
            <option value="7d">Sidste 7 dage</option>
            <option value="14d">Sidste 14 dage</option>
            <option value="30d">Sidste 30 dage</option>
          </select>

          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleCsvUpload(f);
              e.target.value = "";
            }}
          />

          <div className="relative">
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              aria-label="Flere handlinger"
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#E6E9F0] bg-white text-[#64748B] hover:text-[#0F172A]"
            >
              <MoreHorizontal className="h-4 w-4" />
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-10 z-20 w-44 rounded-xl border border-[#E6E9F0] bg-white p-1.5 shadow-xl">
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    fileInputRef.current?.click();
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-medium text-[#0F172A] hover:bg-[#F5F7FA]"
                >
                  <Upload className="h-3.5 w-3.5 text-[#64748B]" />
                  Importér Meta CSV
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    setMcpOpen(true);
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-medium text-[#0F172A] hover:bg-[#F5F7FA]"
                >
                  <Code2 className="h-3.5 w-3.5 text-[#64748B]" />
                  MCP API
                </button>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => {
              setSelectedLaunchIds(queuedProjects.map((p) => p.id));
              setLaunchOpen(true);
            }}
            className="adtrack-btn-primary inline-flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-semibold text-white"
          >
            <Rocket className="h-3.5 w-3.5" />
            Launch
          </button>
        </div>
      </div>

      {csvFeedback && (
        <div className="rounded-xl bg-[#ECFDF3] px-3.5 py-2 text-xs font-semibold text-[#15803D]">
          {csvFeedback}
        </div>
      )}

      {/* =====================================================================
          SECTION 1: KEY METRICS (2x4 GRID INSIDE SINGLE ATRIA CARD)
         ===================================================================== */}
      {activeReport === "overview" && (
        <>
          <section className="rounded-2xl border border-[#ECEFF5] bg-white p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-4">
                <h2 className="font-display text-[14.5px] font-bold text-[#0F172A]">
                  Key Metrics
                </h2>
                <div className="flex items-center gap-3 text-[11px] text-[#64748B]">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="h-[2px] w-3 bg-[#0284C7]" />
                    Valgt periode
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-3 border-t border-dashed border-[#94A3B8]" />
                    Forrige periode
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 text-[11.5px] font-medium text-[#64748B] hover:text-[#0F172A]"
              >
                <SlidersHorizontal className="h-3.5 w-3.5" />
                Importér CSV
              </button>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {kpiCards.map((card) => (
                <div
                  key={card.label}
                  className="rounded-xl border border-[#F1F5F9] bg-[#FAFBFD]/70 p-3.5 transition-colors hover:border-[#E2E8F0] hover:bg-white"
                >
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-1 text-[11.5px] font-medium text-[#64748B]">
                      {card.label}
                      <Info className="h-3 w-3 text-[#CBD5E1]" />
                    </span>
                  </div>

                  <div className="mt-1.5 flex items-center gap-2">
                    <span className="font-mono-num text-[17px] font-bold tracking-tight text-[#0F172A]">
                      {card.value}
                    </span>
                    <span
                      className={`rounded px-1.5 py-0.5 font-mono-num text-[10px] font-semibold ${
                        card.positive
                          ? "bg-[#ECFDF3] text-[#15803D]"
                          : "bg-[#FFF1F2] text-[#E11D48]"
                      }`}
                    >
                      {card.delta}
                    </span>
                  </div>

                  <div className="mt-3">
                    <AtriaLineSparkline
                      points={card.pts}
                      prevPoints={card.prev}
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* =====================================================================
              SECTION 2: BREAKDOWNS BY [SPEND] — 3 SIDE-BY-SIDE CHARTS
             ===================================================================== */}
          <section className="rounded-2xl border border-[#ECEFF5] bg-white p-5">
            <div className="mb-4 flex items-center gap-2">
              <h2 className="font-display text-[14.5px] font-bold text-[#0F172A]">
                Breakdowns by
              </h2>
              <select
                value={breakdownMetric}
                onChange={(e) =>
                  setBreakdownMetric(e.target.value as "spend" | "roas")
                }
                className="rounded-md border border-[#E6E9F0] bg-[#FAFBFD] px-2 py-0.5 text-xs font-medium text-[#334155] outline-none"
              >
                <option value="spend">Spend</option>
                <option value="roas">ROAS</option>
              </select>
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              {/* 1. Format Vertical Bars */}
              <div className="flex flex-col justify-between rounded-xl border border-[#F1F5F9] p-4">
                <p className="text-xs font-semibold text-[#0F172A]">Format</p>
                <div className="mt-5 flex h-32 items-end justify-around px-6">
                  <div className="flex flex-col items-center gap-2">
                    <div
                      className="w-5 rounded-t-md bg-[#0027eb]"
                      style={{ height: `${Math.round(formatSplit.imagePct * 0.95)}px` }}
                    />
                    <ImageIcon className="h-3.5 w-3.5 text-[#94A3B8]" />
                  </div>
                  <div className="flex flex-col items-center gap-2">
                    <div
                      className="w-5 rounded-t-md bg-[#0027eb]"
                      style={{ height: `${Math.round(formatSplit.videoPct * 0.95)}px` }}
                    />
                    <Film className="h-3.5 w-3.5 text-[#94A3B8]" />
                  </div>
                </div>
              </div>

              {/* 2. Age & Gender Grouped Bars (Muted Rose #E5A9B8 & Soft Blue #93B4D8) */}
              <div className="flex flex-col justify-between rounded-xl border border-[#F1F5F9] p-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-[#0F172A]">
                    Alder &amp; køn
                  </p>
                  <div className="flex items-center gap-2.5 text-[10.5px] text-[#64748B]">
                    <span className="inline-flex items-center gap-1">
                      <span className="h-2 w-2 rounded-xs bg-[#E5A9B8]" />
                      Kvinder
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <span className="h-2 w-2 rounded-xs bg-[#93B4D8]" />
                      Mænd
                    </span>
                  </div>
                </div>

                <div className="mt-5 grid h-32 grid-cols-6 items-end gap-2">
                  {AGE_GENDER_SERIES.map((g) => (
                    <div key={g.age} className="flex flex-col items-center gap-1.5">
                      <div className="flex h-24 items-end gap-0.5">
                        <div
                          className="w-2.5 rounded-t-xs bg-[#E5A9B8]"
                          style={{ height: `${Math.max(4, g.f * 0.9)}px` }}
                        />
                        <div
                          className="w-2.5 rounded-t-xs bg-[#93B4D8]"
                          style={{ height: `${Math.max(4, g.m * 0.9)}px` }}
                        />
                      </div>
                      <span className="font-mono-num text-[9.5px] text-[#94A3B8]">
                        {g.age}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* 3. Platform Grouped Bars (Desktop #0F172A vs Mobile #0EA5E9) */}
              <div className="flex flex-col justify-between rounded-xl border border-[#F1F5F9] p-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-[#0F172A]">
                    Platform
                  </p>
                  <div className="flex items-center gap-2.5 text-[10.5px] text-[#64748B]">
                    <span className="inline-flex items-center gap-1">
                      <span className="h-2 w-2 rounded-xs bg-[#0F172A]" />
                      Desktop
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <span className="h-2 w-2 rounded-xs bg-[#0EA5E9]" />
                      Mobil
                    </span>
                  </div>
                </div>

                <div className="mt-5 grid h-32 grid-cols-4 items-end gap-3 px-2">
                  {PLATFORM_SERIES.map((p) => (
                    <div key={p.label} className="flex flex-col items-center gap-1.5">
                      <div className="flex h-24 items-end gap-1">
                        <div
                          className="w-2.5 rounded-t-xs bg-[#0F172A]"
                          style={{ height: `${Math.max(4, p.desktop * 0.9)}px` }}
                        />
                        <div
                          className="w-2.5 rounded-t-xs bg-[#0EA5E9]"
                          style={{ height: `${Math.max(4, p.mobile * 0.9)}px` }}
                        />
                      </div>
                      <span className="font-mono-num text-[9.5px] text-[#94A3B8]">
                        {p.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* =====================================================================
              SECTION 3: AI TOP CREATIVE TAGS BY [SPEND] — 3 COLUMNS
             ===================================================================== */}
          <section className="rounded-2xl border border-[#ECEFF5] bg-white p-5">
            <div className="mb-4 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="inline-flex h-5 items-center rounded bg-[#0F172A] px-1.5 font-mono-num text-[10px] font-bold text-white">
                  AI
                </span>
                <h2 className="font-display text-[14.5px] font-bold text-[#0F172A]">
                  Top Creative Tags by
                </h2>
                <select
                  value={tagsMetric}
                  onChange={(e) =>
                    setTagsMetric(e.target.value as "spend" | "roas")
                  }
                  className="rounded-md border border-[#E6E9F0] bg-[#FAFBFD] px-2 py-0.5 text-xs font-medium text-[#334155] outline-none"
                >
                  <option value="spend">Spend</option>
                  <option value="roas">ROAS</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              {(
                [
                  { title: "Themes", rows: CREATIVE_TAGS.themes },
                  { title: "Ad angles", rows: CREATIVE_TAGS.angles },
                  { title: "Emotions", rows: CREATIVE_TAGS.emotions },
                ] as const
              ).map((col) => (
                <div
                  key={col.title}
                  className="space-y-3 rounded-xl border border-[#F1F5F9] p-4"
                >
                  <p className="inline-flex items-center gap-1 text-xs font-semibold text-[#0F172A]">
                    {col.title}
                    <Info className="h-3 w-3 text-[#CBD5E1]" />
                  </p>
                  <div className="space-y-2.5">
                    {col.rows.map((item) => (
                      <div
                        key={item.label}
                        className="grid grid-cols-12 items-center gap-2"
                      >
                        <span className="col-span-5 truncate text-[11px] text-[#475569]">
                          {item.label}
                        </span>
                        <div className="col-span-7 h-2 overflow-hidden rounded-full bg-[#F1F5F9]">
                          <div
                            className="h-full rounded-full bg-[#0027eb]"
                            style={{
                              width: `${
                                tagsMetric === "roas"
                                  ? Math.min(100, Math.round(item.pct * 0.92 + 6))
                                  : item.pct
                              }%`,
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        </>
      )}

      {/* =====================================================================
          SYSTEM REPORT / TOP PERFORMING CREATIVES VISUAL GALLERY
         ===================================================================== */}
      <section className="rounded-2xl border border-[#ECEFF5] bg-white p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-[14.5px] font-bold text-[#0F172A]">
            {activeReport === "overview"
              ? "Top Performing Creatives"
              : reportTitles[activeReport]}
          </h2>
          <span className="font-mono-num text-xs text-[#94A3B8]">
            {filteredReportRows.length} ads
          </span>
        </div>

        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
          {filteredReportRows.map((row) => (
            <div
              key={row.id}
              className="group overflow-hidden rounded-xl border border-[#ECEFF5] bg-white transition-all hover:border-[#CBD5E1]"
            >
              <div className="relative aspect-[4/3] overflow-hidden bg-[#0F172A]">
                {row.thumbnailUrl ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={row.thumbnailUrl}
                    alt={row.name}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-white/30">
                    <Activity className="h-6 w-6" />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />

                <button
                  type="button"
                  onClick={() => onDoubleDown(row)}
                  className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-full bg-white/95 px-2.5 py-1 text-[10.5px] font-bold text-[#0F172A] opacity-0 shadow transition-all hover:bg-[#0027eb] hover:text-white group-hover:opacity-100"
                >
                  <Sparkles className="h-3 w-3" />
                  Skalér
                </button>

                <div className="absolute inset-x-3 bottom-2.5 flex items-end justify-between text-white">
                  <p className="truncate pr-2 font-display text-[12.5px] font-bold">
                    {row.name}
                  </p>
                  <span className="shrink-0 font-mono-num text-[12.5px] font-bold text-[#86EFAC]">
                    {row.roas.toFixed(2)}x
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between px-3 py-2.5 font-mono-num text-[11.5px]">
                <span className="font-bold text-[#0F172A]">
                  {formatDkkExact(row.spendDkk)}
                </span>
                <span className="text-[#64748B]">
                  {row.thumbstopPct}% · {row.holdPct}%
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* DIRECT META LAUNCH MODAL */}
      {launchOpen &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            className="fixed inset-0 z-[95] flex items-center justify-center bg-[#050811]/65 p-3 backdrop-blur-xs"
            onClick={() => setLaunchOpen(false)}
          >
            <div
              className="flex max-h-[86vh] w-full max-w-lg flex-col overflow-hidden rounded-3xl border border-[#E6E9F0] bg-white shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-[#ECEFF5] px-5 py-4">
                <span className="font-display text-[15px] font-bold text-[#0F172A]">
                  Meta Launch
                </span>
                <button
                  type="button"
                  onClick={() => setLaunchOpen(false)}
                  className="text-[#64748B] hover:text-[#0F172A]"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="workspace-scroll flex-1 space-y-4 overflow-y-auto p-5">
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="text"
                    value={campaignName}
                    onChange={(e) => setCampaignName(e.target.value)}
                    placeholder="Kampagne"
                    className="rounded-xl border border-[#DCE1EC] px-3 py-2 text-xs text-[#0F172A] outline-none focus:border-[#0027eb]"
                  />
                  <input
                    type="number"
                    min={100}
                    step={50}
                    value={dailyBudgetDkk}
                    onChange={(e) =>
                      setDailyBudgetDkk(Number(e.target.value) || 500)
                    }
                    className="rounded-xl border border-[#DCE1EC] px-3 py-2 font-mono-num text-xs text-[#0F172A] outline-none focus:border-[#0027eb]"
                  />
                </div>

                <div className="space-y-2">
                  {queuedProjects.map((p) => {
                    const checked = selectedLaunchIds.includes(p.id);
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() =>
                          setSelectedLaunchIds((prev) =>
                            checked
                              ? prev.filter((id) => id !== p.id)
                              : [...prev, p.id]
                          )
                        }
                        className={`flex w-full items-center justify-between rounded-2xl border p-3 text-left text-xs ${
                          checked
                            ? "border-[#0027eb] bg-[#0027eb]/[0.05]"
                            : "border-[#E6E9F0] bg-white"
                        }`}
                      >
                        <span className="truncate pr-3 font-bold text-[#0F172A]">
                          {p.title}
                        </span>
                        <span
                          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${
                            checked
                              ? "bg-[#0027eb] text-white"
                              : "border border-[#CBD5E1]"
                          }`}
                        >
                          {checked && <Check className="h-3 w-3" />}
                        </span>
                      </button>
                    );
                  })}
                  {queuedProjects.length === 0 && (
                    <p className="py-6 text-center text-xs text-[#94A3B8]">
                      Ingen creatives i kø endnu
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between border-t border-[#ECEFF5] px-5 py-3.5">
                <span className="font-mono-num text-xs text-[#64748B]">
                  {formatDkkExact(dailyBudgetDkk)}/dag
                </span>
                <button
                  type="button"
                  disabled={selectedLaunchIds.length === 0}
                  onClick={() => {
                    onLaunchProjects(
                      selectedLaunchIds,
                      campaignName,
                      dailyBudgetDkk
                    );
                    setLaunchOpen(false);
                  }}
                  className="adtrack-btn-primary inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-semibold text-white disabled:opacity-45"
                >
                  Launch
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* MCP API MODAL */}
      {mcpOpen &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            className="fixed inset-0 z-[95] flex items-center justify-center bg-[#050811]/65 p-3 backdrop-blur-xs"
            onClick={() => setMcpOpen(false)}
          >
            <div
              className="w-full max-w-md rounded-3xl border border-[#E6E9F0] bg-white p-5 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between">
                <span className="font-display text-[15px] font-bold text-[#0F172A]">
                  Flake MCP
                </span>
                <button
                  type="button"
                  onClick={() => setMcpOpen(false)}
                  className="text-[#64748B] hover:text-[#0F172A]"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <pre className="mt-3 overflow-x-auto rounded-2xl bg-[#050811] p-3.5 font-mono-num text-[11px] text-white/90">
{`{
  "mcpServers": {
    "flake-creative": {
      "url": "${typeof window !== "undefined" ? window.location.origin : ""}/api/mcp"
    }
  }
}`}
              </pre>

              <div className="mt-3 flex justify-end">
                <button
                  type="button"
                  onClick={async () => {
                    const url = `${window.location.origin}/api/mcp`;
                    await navigator.clipboard.writeText(url).catch(() => {});
                    setCopiedMcp(true);
                    setTimeout(() => setCopiedMcp(false), 1600);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-full bg-[#0F172A] px-3.5 py-1.5 text-xs font-semibold text-white"
                >
                  {copiedMcp ? (
                    <Check className="h-3.5 w-3.5" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                  {copiedMcp ? "Kopieret" : "Kopiér URL"}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
