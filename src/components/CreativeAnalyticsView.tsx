"use client";

import React, { useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  Activity,
  ArrowRight,
  BarChart3,
  Check,
  Code2,
  Copy,
  Film,
  Image as ImageIcon,
  Info,
  Link2,
  Radar,
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
import {
  ATRIA_IMAGE_TEMPLATES,
  ATRIA_TOP_PICKS_COLLECTIONS,
} from "@/lib/atria-placeholders";
import { formatDkkExact, parseMetaAdsCsv } from "@/lib/snow-engine";
import { MetaInfinityIcon } from "./BrandIcons";

export type AnalyticsReportId =
  | "connect"
  | "overview"
  | "top_spend"
  | "top_performing"
  | "top_videos"
  | "top_images"
  | "top_hooks";

export interface CreativeAnalyticsViewProps {
  brandMemory: BrandMemory | null;
  projects: CreativeProject[];
  analyticsRows: OwnAdMetricRow[];
  activeReport?: AnalyticsReportId;
  onReportChange?: (rep: AnalyticsReportId) => void;
  onDoubleDown: (row: OwnAdMetricRow) => void;
  onLaunchProjects: (
    projectIds: string[],
    campaignName: string,
    dailyBudgetDkk: number
  ) => void;
  onImportCsvRows: (rows: OwnAdMetricRow[]) => void;
  onOpenBrandMemory: () => void;
  onOpenMcp?: () => void;
}

function TikTokBrandMark({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M16.2 7.8c-1.15-.65-1.9-1.7-2.1-3h-2.1v9.3a2.05 2.05 0 1 1-1.5-2V9.8a4.3 4.3 0 1 0 3.7 4.25V9.2c.95.7 2.1 1.1 3.3 1.1V8.1c-.45 0-.9-.1-1.3-.3z"
        fill="#25F4EE"
        transform="translate(-0.55,-0.45)"
      />
      <path
        d="M16.2 7.8c-1.15-.65-1.9-1.7-2.1-3h-2.1v9.3a2.05 2.05 0 1 1-1.5-2V9.8a4.3 4.3 0 1 0 3.7 4.25V9.2c.95.7 2.1 1.1 3.3 1.1V8.1c-.45 0-.9-.1-1.3-.3z"
        fill="#FE2C55"
        transform="translate(0.55,0.45)"
      />
      <path
        d="M16.2 7.8c-1.15-.65-1.9-1.7-2.1-3h-2.1v9.3a2.05 2.05 0 1 1-1.5-2V9.8a4.3 4.3 0 1 0 3.7 4.25V9.2c.95.7 2.1 1.1 3.3 1.1V8.1c-.45 0-.9-.1-1.3-.3z"
        fill="#0F172A"
      />
    </svg>
  );
}

function FlakeLineSparkline({
  points,
  prevPoints,
  stroke = "#0027eb",
  compact = false,
  fillArea = false,
  showPrev = true,
  gradientId = "flakeSparkFill",
}: {
  points: number[];
  prevPoints: number[];
  stroke?: string;
  compact?: boolean;
  fillArea?: boolean;
  showPrev?: boolean;
  gradientId?: string;
}) {
  const all = showPrev ? [...points, ...prevPoints] : [...points];
  const min = Math.min(...all);
  const max = Math.max(...all);
  const span = Math.max(1, max - min);

  const toCoords = (arr: number[]) =>
    arr.map((v, i) => ({
      x: (i / Math.max(1, arr.length - 1)) * 160,
      y: 34 - ((v - min) / span) * 26,
    }));

  const buildPath = (pts: { x: number; y: number }[], smooth = true) => {
    if (pts.length === 0) return "";
    let d = `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`;
    for (let i = 1; i < pts.length; i++) {
      const p0 = pts[i - 1];
      const p1 = pts[i];
      if (!smooth) {
        d += ` L ${p1.x.toFixed(1)} ${p1.y.toFixed(1)}`;
      } else {
        const cx = ((p0.x + p1.x) / 2).toFixed(1);
        d += ` C ${cx} ${p0.y.toFixed(1)}, ${cx} ${p1.y.toFixed(1)}, ${p1.x.toFixed(1)} ${p1.y.toFixed(1)}`;
      }
    }
    return d;
  };

  const mainCoords = toCoords(points);
  const lineD = buildPath(mainCoords, !fillArea);
  const areaD =
    fillArea && mainCoords.length > 0
      ? `${lineD} L ${mainCoords[mainCoords.length - 1].x.toFixed(1)} 38 L ${mainCoords[0].x.toFixed(1)} 38 Z`
      : "";

  return (
    <svg
      viewBox="0 0 160 38"
      className={compact ? "h-7 w-full overflow-visible" : "h-9 w-full overflow-visible"}
    >
      {fillArea && (
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={stroke} stopOpacity="0.16" />
            <stop offset="100%" stopColor={stroke} stopOpacity="0.01" />
          </linearGradient>
        </defs>
      )}
      {showPrev && (
        <path
          d={buildPath(toCoords(prevPoints), true)}
          fill="none"
          stroke="#CBD5E1"
          strokeWidth="1.2"
          strokeDasharray="2.5 2.5"
        />
      )}
      {fillArea && areaD && <path d={areaD} fill={`url(#${gradientId})`} />}
      <path
        d={lineD}
        fill="none"
        stroke={stroke}
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function HookRetentionChart({ curve }: { curve: number[] }) {
  const points = curve.length >= 2 ? curve : [100, 42, 36, 30, 24, 19, 15];
  const benchmark = [100, 34, 27, 21, 16, 12, 9];
  const labels = ["0s", "3s", "6s", "10s", "15s", "20s", "25s"];
  const width = 560;
  const height = 148;
  const padX = 24;
  const padY = 14;
  const innerW = width - padX * 2;
  const innerH = height - padY * 2;

  const mapCoords = (arr: number[]) =>
    arr.map((v, idx) => ({
      x: padX + (idx / Math.max(1, arr.length - 1)) * innerW,
      y: padY + ((100 - Math.max(0, Math.min(100, v))) / 100) * innerH,
      val: v,
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

  const mainCoords = mapCoords(points);
  const benchCoords = mapCoords(benchmark.slice(0, points.length));
  const linePath = buildSmooth(mainCoords);
  const benchPath = buildSmooth(benchCoords);
  const areaPath =
    mainCoords.length > 0
      ? `${linePath} L ${mainCoords[mainCoords.length - 1].x.toFixed(1)} ${(height - padY).toFixed(1)} L ${mainCoords[0].x.toFixed(1)} ${(height - padY).toFixed(1)} Z`
      : "";

  return (
    <div className="w-full">
      <svg viewBox={`0 0 ${width} ${height + 20}`} className="h-40 w-full">
        <defs>
          <linearGradient id="flakeRetentionFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0027eb" stopOpacity="0.16" />
            <stop offset="100%" stopColor="#0027eb" stopOpacity="0.01" />
          </linearGradient>
        </defs>
        {[0, 25, 50, 75, 100].map((tick) => {
          const y = padY + ((100 - tick) / 100) * innerH;
          return (
            <line
              key={tick}
              x1={padX}
              x2={width - padX}
              y1={y}
              y2={y}
              stroke="#ebebf3"
              strokeWidth="1"
            />
          );
        })}
        <path
          d={benchPath}
          fill="none"
          stroke="#CBD5E1"
          strokeWidth="1.5"
          strokeDasharray="4 4"
        />
        <path d={areaPath} fill="url(#flakeRetentionFill)" />
        <path
          d={linePath}
          fill="none"
          stroke="#0027eb"
          strokeWidth="2.25"
          strokeLinecap="round"
        />
        {mainCoords.map((pt, idx) => (
          <g key={labels[idx] || idx}>
            <circle
              cx={pt.x}
              cy={pt.y}
              r={idx === 1 ? 4 : 3}
              fill={idx === 1 ? "#0027eb" : "#FFFFFF"}
              stroke="#0027eb"
              strokeWidth="2"
            />
            <text
              x={pt.x}
              y={height + 12}
              textAnchor="middle"
              className="fill-[#94A3B8] font-mono-num text-[10px]"
            >
              {labels[idx] || `${idx * 4}s`}
            </text>
          </g>
        ))}
      </svg>
    </div>
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
    { label: "Problem & solution", pct: 95 },
    { label: "Before & after", pct: 76 },
    { label: "Seasonal / Promo", pct: 64 },
    { label: "Product demo", pct: 56 },
    { label: "Behind the scenes", pct: 44 },
  ],
  angles: [
    { label: "Daily routine", pct: 94 },
    { label: "Social proof / Review", pct: 86 },
    { label: "Value vs. quality", pct: 74 },
    { label: "Expert / Founder", pct: 66 },
    { label: "Comfort & guarantee", pct: 52 },
  ],
  emotions: [
    { label: "Trust & reassurance", pct: 96 },
    { label: "Relief", pct: 72 },
    { label: "Curiosity", pct: 58 },
    { label: "Satisfaction", pct: 46 },
    { label: "Warmth & joy", pct: 38 },
  ],
};

function getStatusBadgeClasses(status: OwnAdMetricRow["status"]): string {
  switch (status) {
    case "Scaling Winner":
      return "bg-[#EEF2FF] text-[#0027eb]";
    case "Hook Winner":
      return "bg-[#ECFDF3] text-[#15803D]";
    case "Fatigue":
      return "bg-[#FEF2F2] text-[#DC2626]";
    default:
      return "bg-[#f5f5fa] text-[#475569]";
  }
}

export function CreativeAnalyticsView({
  brandMemory,
  projects,
  analyticsRows,
  activeReport = "connect",
  onReportChange,
  onDoubleDown,
  onLaunchProjects,
  onImportCsvRows,
  onOpenMcp,
}: CreativeAnalyticsViewProps) {
  const [prevActiveReport, setPrevActiveReport] =
    useState<AnalyticsReportId>(activeReport);
  const [localReport, setLocalReport] =
    useState<AnalyticsReportId>(activeReport);

  if (activeReport !== prevActiveReport) {
    setPrevActiveReport(activeReport);
    setLocalReport(activeReport);
  }

  const effectiveReport = localReport;

  const selectReport = (next: AnalyticsReportId) => {
    setLocalReport(next);
    onReportChange?.(next);
  };

  const [period, setPeriod] = useState<"7d" | "14d" | "30d">("14d");
  const [breakdownMetric, setBreakdownMetric] = useState<"spend" | "roas">(
    "spend"
  );
  const [tagsMetric, setTagsMetric] = useState<"spend" | "roas">("spend");
  const [previewTab, setPreviewTab] = useState<"overview" | "radar">("overview");
  const [selectedHookRowId, setSelectedHookRowId] = useState<string | null>(
    null
  );
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
  const [csvFeedback, setCsvFeedback] = useState<{
    message: string;
    ok: boolean;
  } | null>(null);
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
    if (effectiveReport === "top_spend") {
      return copy.sort((a, b) => b.spendDkk - a.spendDkk);
    }
    if (effectiveReport === "top_performing") {
      return copy.sort((a, b) => b.roas - a.roas);
    }
    if (effectiveReport === "top_videos") {
      return copy.filter((r) => !r.format.toLowerCase().includes("static"));
    }
    if (effectiveReport === "top_images") {
      const imgs = copy.filter((r) => r.format.toLowerCase().includes("static"));
      return imgs.length > 0 ? imgs : copy;
    }
    if (effectiveReport === "top_hooks") {
      return copy.sort((a, b) => b.thumbstopPct - a.thumbstopPct);
    }
    return copy;
  }, [analyticsRows, effectiveReport]);

  const activeHookRow = useMemo(() => {
    if (filteredReportRows.length === 0) return null;
    return (
      filteredReportRows.find((r) => r.id === selectedHookRowId) ||
      filteredReportRows[0]
    );
  }, [filteredReportRows, selectedHookRowId]);

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
        setCsvFeedback({
          message: `${parsed.length} ads imported`,
          ok: true,
        });
        if (effectiveReport === "connect") {
          selectReport("overview");
        }
      } else {
        setCsvFeedback({
          message: "No valid columns found in CSV",
          ok: false,
        });
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
      delta: "+0.42%",
      positive: true,
      pts: [45, 58, 42, 38, 62, 50, 39, 58, 54],
      prev: [40, 46, 44, 42, 47, 45, 43, 46, 45],
    },
    {
      label: "CPA",
      value: formatDkkExact(totals.cpa),
      delta: "-8.4%",
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
      delta: "+0.97%",
      positive: true,
      pts: [50, 44, 56, 54, 48, 46, 52, 58, 54],
      prev: [48, 47, 50, 49, 48, 47, 49, 50, 49],
    },
    {
      label: "CPC (all)",
      value: formatDkkExact(totals.cpcAll),
      delta: "+0.37%",
      positive: false,
      pts: [48, 56, 52, 44, 50, 62, 58, 49, 52],
      prev: [46, 49, 48, 46, 48, 51, 50, 48, 49],
    },
    {
      label: "CPC (link click)",
      value: formatDkkExact(totals.cpcLink),
      delta: "-0.79%",
      positive: true,
      pts: [54, 48, 50, 64, 52, 45, 48, 52, 46],
      prev: [56, 53, 54, 55, 52, 51, 52, 53, 51],
    },
    {
      label: "CPM",
      value: formatDkkExact(totals.cpm),
      delta: "-0.60%",
      positive: true,
      pts: [52, 46, 60, 56, 48, 55, 52, 44, 49],
      prev: [55, 52, 54, 53, 51, 52, 51, 49, 50],
    },
  ];

  const reportTitles: Record<AnalyticsReportId, string> = {
    connect: "Connect an ad account",
    overview: "Overview",
    top_spend: "Top spend ads",
    top_performing: "Top performing ads",
    top_videos: "Top performing videos",
    top_images: "Top performing images",
    top_hooks: "Top hooks & retention",
  };

  const previewTopPerforming = ATRIA_IMAGE_TEMPLATES.slice(0, 4);
  const previewTopSpend = ATRIA_TOP_PICKS_COLLECTIONS.slice(0, 4);

  return (
    <div className="min-h-full bg-[#f5f5fa]">
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

      {csvFeedback && (
        <div className="px-6 pt-4">
          <div
            className={`mx-auto max-w-[1180px] rounded-[10px] border px-4 py-2.5 text-[13px] font-medium ${
              csvFeedback.ok
                ? "border-[#BBF7D0] bg-[#ECFDF3] text-[#15803D]"
                : "border-[#FECACA] bg-[#FEF2F2] text-[#DC2626]"
            }`}
          >
            {csvFeedback.message}
          </div>
        </div>
      )}

      {effectiveReport === "connect" ? (
        /* =====================================================================
           CONNECT AD ACCOUNT VIEW (1:1 ATRIA SPLIT CARD + FLAKE COBALT)
           ===================================================================== */
        <div className="px-6 pt-[6vh] pb-20">
          <div className="mx-auto mb-8 max-w-[540px] text-center">
            <h1 className="font-display text-[28px] font-bold tracking-tight text-[#0F172A]">
              Connect an ad account
            </h1>
            <p className="mt-2 text-[13.5px] leading-relaxed text-[#475569]">
              Ask your workspace admin to grant you access to an existing ad
              account, or connect a new one below to get started.
            </p>
          </div>

          <div className="mx-auto grid max-w-[880px] grid-cols-1 overflow-hidden rounded-[12px] border border-[#ebebf3] bg-white lg:grid-cols-[minmax(0,460fr)_minmax(0,420fr)]">
            {/* LEFT COLUMN: 3-STEP VERTICAL STEPPER */}
            <div className="px-8 pt-9 pb-8">
              <div className="space-y-6">
                {/* STEP 1 */}
                <div className="relative flex gap-3.5">
                  <div className="flex flex-col items-center">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#0027eb] font-mono-num text-[12px] font-bold text-white ring-4 ring-[#EEF2FF]">
                      1
                    </span>
                    <div className="mt-2.5 w-px flex-1 bg-[#ebebf3]" />
                  </div>
                  <div className="flex-1 pb-2">
                    <p className="text-[15px] font-bold text-[#0F172A]">
                      Choose a platform
                    </p>
                    <p className="mt-1 text-[13px] leading-relaxed text-[#475569]">
                      Sign in to Meta or TikTok in a pop-up window, then pick
                      the ad accounts to add.
                    </p>

                    <div className="mt-4 space-y-2.5">
                      <div className="flex items-center justify-between rounded-[10px] border border-[#ebebf3] bg-white px-4 py-3">
                        <div className="flex items-center gap-3">
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[8px] bg-[#f5f5fa]">
                            <MetaInfinityIcon className="h-5 w-5" />
                          </span>
                          <span className="text-[14px] font-semibold text-[#0F172A]">
                            Meta ad account
                          </span>
                        </div>
                        <button
                          type="button"
                          data-no-glass="true"
                          onClick={() => selectReport("overview")}
                          className="h-8 rounded-[8px] bg-[#0027eb] px-4 text-[13px] font-semibold text-white transition-colors hover:bg-[#001fc2]"
                        >
                          Connect
                        </button>
                      </div>

                      <div className="flex items-center justify-between rounded-[10px] border border-[#ebebf3] bg-white px-4 py-3">
                        <div className="flex items-center gap-3">
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[8px] bg-[#f5f5fa]">
                            <TikTokBrandMark className="h-5 w-5" />
                          </span>
                          <span className="text-[14px] font-semibold text-[#0F172A]">
                            TikTok ad account
                          </span>
                        </div>
                        <button
                          type="button"
                          data-no-glass="true"
                          onClick={() => selectReport("overview")}
                          className="h-8 rounded-[8px] bg-[#0027eb] px-4 text-[13px] font-semibold text-white transition-colors hover:bg-[#001fc2]"
                        >
                          Connect
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* STEP 2 */}
                <div className="relative flex gap-3.5">
                  <div className="flex flex-col items-center">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#ECEFF4] font-mono-num text-[12px] font-bold text-[#64748B]">
                      2
                    </span>
                    <div className="mt-2.5 w-px flex-1 bg-[#ebebf3]" />
                  </div>
                  <div className="pb-2">
                    <p className="text-[15px] font-bold text-[#0F172A]">
                      Flake syncs your data
                    </p>
                    <p className="mt-1 text-[13px] leading-relaxed text-[#475569]">
                      Flake imports your ads and their results. The first sync
                      may take a few hours.
                    </p>
                  </div>
                </div>

                {/* STEP 3 */}
                <div className="flex gap-3.5">
                  <div className="flex flex-col items-center">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#ECEFF4] font-mono-num text-[12px] font-bold text-[#64748B]">
                      3
                    </span>
                  </div>
                  <div>
                    <p className="text-[15px] font-bold text-[#0F172A]">
                      Set your goals
                    </p>
                    <p className="mt-1 text-[13px] leading-relaxed text-[#475569]">
                      While the data syncs, choose the minimum spend for a
                      creative to be analyzed and the metric that defines
                      success.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN: COBALT-TINTED DASHBOARD MOCKUP PREVIEW */}
            <div className="flex items-end overflow-hidden border-t border-[#ebebf3] bg-gradient-to-br from-[#EEF2FF] via-[#F4F7FF] to-[#EEF2FF]/70 pt-8 pl-8 lg:border-t-0 lg:border-l">
              <div className="w-[110%] -mr-8 rounded-tl-[12px] border-t border-l border-[#e2e6ef] bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
                {/* Preview Header + Overview | Radar Toggle */}
                <div className="flex items-center justify-between gap-2 pb-4">
                  <div className="flex items-center gap-2.5">
                    <MetaInfinityIcon className="h-4 w-4 shrink-0" />
                    <span className="h-2.5 w-16 rounded-full bg-[#ECEFF4]" />
                  </div>

                  <div className="inline-flex items-center rounded-[8px] bg-[#f5f5fa] p-0.5">
                    <button
                      type="button"
                      data-no-glass="true"
                      onClick={() => setPreviewTab("overview")}
                      className={`inline-flex items-center gap-1.5 rounded-[6px] px-2.5 py-1 text-[11.5px] font-semibold transition-colors ${
                        previewTab === "overview"
                          ? "bg-white text-[#0F172A] shadow-2xs"
                          : "text-[#64748B] hover:text-[#0F172A]"
                      }`}
                    >
                      <BarChart3 className="h-3.5 w-3.5 text-[#475569]" />
                      Overview
                    </button>
                    <button
                      type="button"
                      data-no-glass="true"
                      onClick={() => setPreviewTab("radar")}
                      className={`inline-flex items-center gap-1.5 rounded-[6px] px-2.5 py-1 text-[11.5px] font-semibold transition-colors ${
                        previewTab === "radar"
                          ? "bg-white text-[#0F172A] shadow-2xs"
                          : "text-[#64748B] hover:text-[#0F172A]"
                      }`}
                    >
                      <Radar className="h-3.5 w-3.5 text-[#475569]" />
                      Radar
                    </button>
                  </div>
                </div>

                {/* 3 KPI Sparkline Mini-Cards */}
                <div className="grid grid-cols-3 gap-2.5">
                  {[
                    {
                      id: "spend",
                      label: "Spend",
                      pts:
                        previewTab === "overview"
                          ? [18, 22, 20, 32, 30, 42, 48]
                          : [24, 30, 28, 38, 44, 41, 56],
                      prev: [16, 18, 19, 24, 26, 29, 32],
                    },
                    {
                      id: "roas",
                      label: "ROAS",
                      pts:
                        previewTab === "overview"
                          ? [20, 18, 28, 25, 36, 40, 38]
                          : [22, 29, 27, 35, 42, 46, 51],
                      prev: [18, 20, 22, 23, 25, 28, 29],
                    },
                    {
                      id: "ctr",
                      label: "CTR",
                      pts:
                        previewTab === "overview"
                          ? [16, 20, 22, 19, 28, 31, 35]
                          : [19, 24, 26, 28, 34, 39, 43],
                      prev: [15, 17, 18, 18, 21, 22, 24],
                    },
                  ].map((m) => (
                    <div
                      key={m.id}
                      className="rounded-[10px] border border-[#ebebf3] bg-white p-3"
                    >
                      <span className="block text-[11px] font-medium text-[#475569]">
                        {m.label}
                      </span>
                      <div className="mt-2 h-2.5 w-11 rounded-full bg-[#ECEFF4]" />
                      <div className="mt-2.5">
                        <FlakeLineSparkline
                          points={m.pts}
                          prevPoints={m.prev}
                          stroke="#0027eb"
                          compact
                          fillArea
                          showPrev={false}
                          gradientId={`preview-${m.id}`}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Top performing 4-thumbnail strip */}
                <div className="mt-5">
                  <p className="mb-2.5 text-[13px] font-bold text-[#0F172A]">
                    Top performing
                  </p>
                  <div className="grid grid-cols-4 gap-2">
                    {previewTopPerforming.map((tpl, idx) => {
                      const pct = [88, 76, 62, 48][idx] ?? 50;
                      return (
                        <div key={tpl.id} className="space-y-2">
                          <div className="aspect-square overflow-hidden rounded-[8px] border border-[#ebebf3] bg-[#f5f5fa]">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={tpl.thumbnailUrl}
                              alt={tpl.title}
                              className="h-full w-full object-cover"
                            />
                          </div>
                          <div className="h-[4px] w-full overflow-hidden rounded-full bg-[#EEF2FF]">
                            <div
                              className="h-full rounded-full bg-[#0027eb]"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Top spend 4-thumbnail strip clipped cleanly at bottom edge */}
                <div className="mt-5 -mb-7">
                  <p className="mb-2.5 text-[13px] font-bold text-[#0F172A]">
                    Top spend
                  </p>
                  <div className="grid grid-cols-4 gap-2">
                    {previewTopSpend.map((col) => (
                      <div
                        key={col.id}
                        className="aspect-square overflow-hidden rounded-[8px] border border-[#ebebf3] bg-[#f5f5fa]"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={col.thumbnailUrl}
                          alt={col.title}
                          className="h-full w-full object-cover"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Subtle bottom toggle row for CSV upload & live demo analytics */}
          <div className="mx-auto mt-5 flex max-w-[880px] flex-wrap items-center justify-between gap-3 px-1 text-[13px] text-[#64748B]">
            <button
              type="button"
              data-no-glass="true"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 rounded-[8px] border border-[#d6d6e0] bg-white px-3 py-1.5 text-[12.5px] font-medium text-[#0F172A] transition-colors hover:border-[#0027eb]"
            >
              <Upload className="h-3.5 w-3.5 text-[#475569]" />
              Upload Meta Ads CSV
            </button>

            <button
              type="button"
              data-no-glass="true"
              onClick={() => selectReport("overview")}
              className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-[#0027eb] hover:underline"
            >
              Explore live demo analytics
              <ArrowRight className="h-3.5 w-3.5 text-[#475569]" />
            </button>
          </div>
        </div>
      ) : (
        /* =====================================================================
           OVERVIEW & SYSTEM REPORTS VIEWS
           ===================================================================== */
        <>
          {/* STICKY WHITE TOP HEADER */}
          <div className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-3 border-b border-[#ebebf3] bg-white px-6 py-3.5">
            <div className="flex items-center gap-2.5">
              <MetaInfinityIcon className="h-5 w-5" />
              <h1 className="font-display text-[18px] font-bold tracking-tight text-[#0F172A]">
                {brandMemory ? brandMemory.brandName : "Flake Demo"}
              </h1>
              {effectiveReport !== "overview" && (
                <span className="rounded-[6px] bg-[#EEF2FF] px-2 py-0.5 text-[11.5px] font-semibold text-[#0027eb]">
                  {reportTitles[effectiveReport]}
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                data-no-glass="true"
                onClick={() => selectReport("connect")}
                className="inline-flex h-8 items-center gap-1.5 rounded-[8px] border border-[#d6d6e0] bg-white px-3 text-[12.5px] font-medium text-[#0F172A] transition-colors hover:border-[#0027eb]"
              >
                <Link2 className="h-3.5 w-3.5 text-[#475569]" />
                Connect Source
              </button>

              <select
                value={period}
                data-no-glass="true"
                onChange={(e) =>
                  setPeriod(e.target.value as "7d" | "14d" | "30d")
                }
                className="h-8 rounded-[8px] border border-[#d6d6e0] bg-white px-3 text-[12.5px] font-medium text-[#0F172A] outline-none hover:border-[#0027eb]"
              >
                <option value="7d">Last 7 days</option>
                <option value="14d">Last 14 days</option>
                <option value="30d">Last 30 days</option>
              </select>

              <button
                type="button"
                data-no-glass="true"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex h-8 items-center gap-1.5 rounded-[8px] border border-[#d6d6e0] bg-white px-3 text-[12.5px] font-medium text-[#0F172A] transition-colors hover:border-[#0027eb]"
              >
                <Upload className="h-3.5 w-3.5 text-[#475569]" />
                Import CSV
              </button>

              <button
                type="button"
                data-no-glass="true"
                onClick={() => {
                  if (onOpenMcp) {
                    onOpenMcp();
                  } else {
                    setMcpOpen(true);
                  }
                }}
                className="inline-flex h-8 items-center gap-1.5 rounded-[8px] border border-[#d6d6e0] bg-white px-3 text-[12.5px] font-medium text-[#0F172A] transition-colors hover:border-[#0027eb]"
              >
                <Code2 className="h-3.5 w-3.5 text-[#475569]" />
                MCP
              </button>

              <button
                type="button"
                data-no-glass="true"
                onClick={() => {
                  setSelectedLaunchIds(queuedProjects.map((p) => p.id));
                  setLaunchOpen(true);
                }}
                className="inline-flex h-8 items-center gap-1.5 rounded-[8px] bg-[#0027eb] px-3.5 text-[12.5px] font-semibold text-white transition-colors hover:bg-[#001fc2]"
              >
                <Rocket className="h-3.5 w-3.5 text-white" />
                Launch to Meta
              </button>
            </div>
          </div>

          <div className="mx-auto max-w-[1220px] space-y-4 p-6">
            {effectiveReport === "overview" && (
              <>
                {/* SECTION 1: KEY METRICS (2x4 GRID) */}
                <section className="rounded-[12px] border border-[#ebebf3] bg-white p-5">
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-4">
                      <h2 className="font-display text-[15px] font-bold text-[#0F172A]">
                        Key Metrics
                      </h2>
                      <div className="flex items-center gap-3 text-[11.5px] text-[#64748B]">
                        <span className="inline-flex items-center gap-1.5">
                          <span className="h-[2px] w-3 bg-[#0027eb]" />
                          Selected period
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                          <span className="w-3 border-t border-dashed border-[#94A3B8]" />
                          Previous period
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      data-no-glass="true"
                      onClick={() => fileInputRef.current?.click()}
                      className="inline-flex items-center gap-1.5 text-[12px] font-medium text-[#64748B] hover:text-[#0F172A]"
                    >
                      <SlidersHorizontal className="h-3.5 w-3.5 text-[#64748B]" />
                      Import CSV
                    </button>
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    {kpiCards.map((card) => (
                      <div
                        key={card.label}
                        className="rounded-[10px] border border-[#ebebf3] bg-[#f5f5fa]/50 p-3.5 transition-colors hover:border-[#d6d6e0] hover:bg-white"
                      >
                        <div className="flex items-center justify-between">
                          <span className="inline-flex items-center gap-1 text-[12px] font-medium text-[#64748B]">
                            {card.label}
                            <Info className="h-3 w-3 text-[#94A3B8]" />
                          </span>
                        </div>

                        <div className="mt-1.5 flex items-center gap-2">
                          <span className="font-mono-num text-[17px] font-bold tracking-tight text-[#0F172A]">
                            {card.value}
                          </span>
                          <span
                            className={`rounded-[4px] px-1.5 py-0.5 font-mono-num text-[10.5px] font-semibold ${
                              card.positive
                                ? "bg-[#ECFDF3] text-[#15803D]"
                                : "bg-[#FEF2F2] text-[#DC2626]"
                            }`}
                          >
                            {card.delta}
                          </span>
                        </div>

                        <div className="mt-3">
                          <FlakeLineSparkline
                            points={card.pts}
                            prevPoints={card.prev}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </section>

                {/* SECTION 2: BREAKDOWNS BY [SPEND] — 3 SIDE-BY-SIDE CHARTS */}
                <section className="rounded-[12px] border border-[#ebebf3] bg-white p-5">
                  <div className="mb-4 flex items-center gap-2">
                    <h2 className="font-display text-[15px] font-bold text-[#0F172A]">
                      Breakdowns by
                    </h2>
                    <select
                      value={breakdownMetric}
                      data-no-glass="true"
                      onChange={(e) =>
                        setBreakdownMetric(e.target.value as "spend" | "roas")
                      }
                      className="rounded-[6px] border border-[#d6d6e0] bg-white px-2.5 py-1 text-[12px] font-medium text-[#0F172A] outline-none"
                    >
                      <option value="spend">Spend</option>
                      <option value="roas">ROAS</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                    {/* 1. Format Vertical Bars */}
                    <div className="flex flex-col justify-between rounded-[10px] border border-[#ebebf3] p-4">
                      <p className="text-[13px] font-semibold text-[#0F172A]">
                        Format
                      </p>
                      <div className="mt-5 flex h-32 items-end justify-around px-6">
                        <div className="flex flex-col items-center gap-2">
                          <div
                            className="w-5 rounded-t-[4px] bg-[#0027eb]"
                            style={{
                              height: `${Math.round(formatSplit.imagePct * 0.95)}px`,
                            }}
                          />
                          <ImageIcon className="h-3.5 w-3.5 text-[#64748B]" />
                        </div>
                        <div className="flex flex-col items-center gap-2">
                          <div
                            className="w-5 rounded-t-[4px] bg-[#0027eb]"
                            style={{
                              height: `${Math.round(formatSplit.videoPct * 0.95)}px`,
                            }}
                          />
                          <Film className="h-3.5 w-3.5 text-[#64748B]" />
                        </div>
                      </div>
                    </div>

                    {/* 2. Age & Gender Grouped Bars (Muted #E5A9B8 & #93B4D8) */}
                    <div className="flex flex-col justify-between rounded-[10px] border border-[#ebebf3] p-4">
                      <div className="flex items-center justify-between">
                        <p className="text-[13px] font-semibold text-[#0F172A]">
                          Age &amp; gender
                        </p>
                        <div className="flex items-center gap-2.5 text-[11px] text-[#64748B]">
                          <span className="inline-flex items-center gap-1">
                            <span className="h-2 w-2 rounded-xs bg-[#E5A9B8]" />
                            Female
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <span className="h-2 w-2 rounded-xs bg-[#93B4D8]" />
                            Male
                          </span>
                        </div>
                      </div>

                      <div className="mt-5 grid h-32 grid-cols-6 items-end gap-2">
                        {AGE_GENDER_SERIES.map((g) => (
                          <div
                            key={g.age}
                            className="flex flex-col items-center gap-1.5"
                          >
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
                            <span className="font-mono-num text-[10px] text-[#64748B]">
                              {g.age}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* 3. Platform Grouped Bars (Desktop #0F172A vs Mobile #3B66FF) */}
                    <div className="flex flex-col justify-between rounded-[10px] border border-[#ebebf3] p-4">
                      <div className="flex items-center justify-between">
                        <p className="text-[13px] font-semibold text-[#0F172A]">
                          Platform
                        </p>
                        <div className="flex items-center gap-2.5 text-[11px] text-[#64748B]">
                          <span className="inline-flex items-center gap-1">
                            <span className="h-2 w-2 rounded-xs bg-[#0F172A]" />
                            Desktop
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <span className="h-2 w-2 rounded-xs bg-[#3B66FF]" />
                            Mobile
                          </span>
                        </div>
                      </div>

                      <div className="mt-5 grid h-32 grid-cols-4 items-end gap-3 px-2">
                        {PLATFORM_SERIES.map((p) => (
                          <div
                            key={p.label}
                            className="flex flex-col items-center gap-1.5"
                          >
                            <div className="flex h-24 items-end gap-1">
                              <div
                                className="w-2.5 rounded-t-xs bg-[#0F172A]"
                                style={{
                                  height: `${Math.max(4, p.desktop * 0.9)}px`,
                                }}
                              />
                              <div
                                className="w-2.5 rounded-t-xs bg-[#3B66FF]"
                                style={{
                                  height: `${Math.max(4, p.mobile * 0.9)}px`,
                                }}
                              />
                            </div>
                            <span className="font-mono-num text-[10px] text-[#64748B]">
                              {p.label}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </section>

                {/* SECTION 3: AI TOP CREATIVE TAGS BY [SPEND] — 3 COLUMNS */}
                <section className="rounded-[12px] border border-[#ebebf3] bg-white p-5">
                  <div className="mb-4 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex h-5 items-center rounded-[4px] bg-[#0F172A] px-1.5 font-mono-num text-[10px] font-bold text-white">
                        AI
                      </span>
                      <h2 className="font-display text-[15px] font-bold text-[#0F172A]">
                        Top Creative Tags by
                      </h2>
                      <select
                        value={tagsMetric}
                        data-no-glass="true"
                        onChange={(e) =>
                          setTagsMetric(e.target.value as "spend" | "roas")
                        }
                        className="rounded-[6px] border border-[#d6d6e0] bg-white px-2.5 py-1 text-[12px] font-medium text-[#0F172A] outline-none"
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
                        className="space-y-3 rounded-[10px] border border-[#ebebf3] p-4"
                      >
                        <p className="inline-flex items-center gap-1 text-[13px] font-semibold text-[#0F172A]">
                          {col.title}
                          <Info className="h-3 w-3 text-[#94A3B8]" />
                        </p>
                        <div className="space-y-2.5">
                          {col.rows.map((item) => (
                            <div
                              key={item.label}
                              className="grid grid-cols-12 items-center gap-2"
                            >
                              <span className="col-span-5 truncate text-[12px] text-[#475569]">
                                {item.label}
                              </span>
                              <div className="col-span-7 h-2 overflow-hidden rounded-full bg-[#f5f5fa]">
                                <div
                                  className="h-full rounded-full bg-[#0027eb]"
                                  style={{
                                    width: `${
                                      tagsMetric === "roas"
                                        ? Math.min(
                                            100,
                                            Math.round(item.pct * 0.92 + 6)
                                          )
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

            {/* HOOK RETENTION CURVE (OVERVIEW & TOP HOOKS REPORT) */}
            {(effectiveReport === "overview" ||
              effectiveReport === "top_hooks") &&
              activeHookRow && (
                <section className="rounded-[12px] border border-[#ebebf3] bg-white p-5">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="font-display text-[15px] font-bold text-[#0F172A]">
                          Hook Retention Curve
                        </h2>
                        <span className="rounded-full bg-[#EEF2FF] px-2.5 py-0.5 font-mono-num text-[11px] font-semibold text-[#0027eb]">
                          {activeHookRow.thumbstopPct}% 3s Thumbstop
                        </span>
                        <span className="rounded-full bg-[#f5f5fa] px-2.5 py-0.5 font-mono-num text-[11px] font-semibold text-[#475569]">
                          {activeHookRow.holdPct}% 15s Hold
                        </span>
                      </div>
                      <p className="mt-1 text-[12.5px] text-[#64748B]">
                        {activeHookRow.hookText}
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-3 text-[11.5px] text-[#64748B]">
                        <span className="inline-flex items-center gap-1.5">
                          <span className="h-[2px] w-3 bg-[#0027eb]" />
                          Selected ad
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                          <span className="w-3 border-t border-dashed border-[#94A3B8]" />
                          Account benchmark
                        </span>
                      </div>
                      <button
                        type="button"
                        data-no-glass="true"
                        onClick={() => onDoubleDown(activeHookRow)}
                        className="inline-flex h-8 items-center gap-1.5 rounded-[8px] bg-[#0027eb] px-3 text-[12px] font-semibold text-white transition-colors hover:bg-[#001fc2]"
                      >
                        <Sparkles className="h-3.5 w-3.5 text-white" />
                        Double Down
                      </button>
                    </div>
                  </div>

                  <div className="mb-3 flex flex-wrap gap-1.5">
                    {filteredReportRows.slice(0, 6).map((row) => {
                      const selected = row.id === activeHookRow.id;
                      return (
                        <button
                          key={row.id}
                          type="button"
                          data-no-glass="true"
                          onClick={() => setSelectedHookRowId(row.id)}
                          className={`rounded-[6px] px-2.5 py-1 text-[12px] font-medium transition-colors ${
                            selected
                              ? "bg-[#050811] text-white"
                              : "border border-[#ebebf3] bg-[#f5f5fa] text-[#475569] hover:border-[#d6d6e0] hover:text-[#0F172A]"
                          }`}
                        >
                          {row.name} ({row.thumbstopPct}%)
                        </button>
                      );
                    })}
                  </div>

                  <HookRetentionChart curve={activeHookRow.retentionCurve} />
                </section>
              )}

            {/* SYSTEM REPORT / TOP PERFORMING CREATIVES VISUAL GALLERY */}
            <section className="rounded-[12px] border border-[#ebebf3] bg-white p-5">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="font-display text-[15px] font-bold text-[#0F172A]">
                  {effectiveReport === "overview"
                    ? "Top Performing Creatives"
                    : reportTitles[effectiveReport]}
                </h2>
                <span className="font-mono-num text-[12px] text-[#64748B]">
                  {filteredReportRows.length} ads
                </span>
              </div>

              <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
                {filteredReportRows.map((row) => (
                  <div
                    key={row.id}
                    className="group overflow-hidden rounded-[12px] border border-[#ebebf3] bg-white transition-colors hover:border-[#d6d6e0]"
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
                          <Activity className="h-6 w-6 text-white/40" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />

                      <button
                        type="button"
                        data-no-glass="true"
                        onClick={() => onDoubleDown(row)}
                        className="absolute top-2 right-2 inline-flex items-center gap-1 rounded-[6px] bg-white/95 px-2.5 py-1 text-[11px] font-semibold text-[#0F172A] opacity-0 transition-all hover:bg-[#0027eb] hover:text-white group-hover:opacity-100"
                      >
                        <Sparkles className="h-3 w-3" />
                        Double Down
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

                    <div className="flex items-center justify-between px-3 py-2.5 font-mono-num text-[12px]">
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

            {/* CREATIVE PERFORMANCE TABLE (BLACK HEADERS) */}
            <section className="overflow-hidden rounded-[12px] border border-[#ebebf3] bg-white">
              <div className="flex items-center justify-between border-b border-[#ebebf3] px-5 py-3.5">
                <h2 className="font-display text-[15px] font-bold text-[#0F172A]">
                  Creative Breakdown
                </h2>
                <span className="font-mono-num text-[12px] text-[#64748B]">
                  {filteredReportRows.length} creatives
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[780px] text-left text-[13px]">
                  <thead>
                    <tr className="border-b border-[#ebebf3] bg-white text-[12.5px] font-semibold text-[#0F172A]">
                      <th className="px-5 py-3">Creative</th>
                      <th className="px-3 py-3">Format</th>
                      <th className="px-3 py-3">Status</th>
                      <th className="px-3 py-3 text-right">Spend</th>
                      <th className="px-3 py-3 text-right">ROAS</th>
                      <th className="px-3 py-3 text-right">CPA</th>
                      <th className="px-3 py-3 text-right">CTR</th>
                      <th className="px-3 py-3 text-right">Thumbstop</th>
                      <th className="px-3 py-3 text-right">Hold rate</th>
                      <th className="px-5 py-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#ebebf3]">
                    {filteredReportRows.map((row) => (
                      <tr
                        key={row.id}
                        className="transition-colors hover:bg-[#f5f5fa]/60"
                      >
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2.5">
                            <div className="h-8 w-8 shrink-0 overflow-hidden rounded-[6px] bg-[#0F172A]">
                              {row.thumbnailUrl ? (
                                /* eslint-disable-next-line @next/next/no-img-element */
                                <img
                                  src={row.thumbnailUrl}
                                  alt={row.name}
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center text-white/40">
                                  <Activity className="h-3.5 w-3.5 text-white/50" />
                                </div>
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="truncate font-semibold text-[#0F172A]">
                                {row.name}
                              </p>
                              <p className="truncate text-[11.5px] text-[#64748B]">
                                {row.angle}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-3 text-[#475569]">
                          {row.format}
                        </td>
                        <td className="px-3 py-3">
                          <span
                            className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${getStatusBadgeClasses(
                              row.status
                            )}`}
                          >
                            {row.status}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-right font-mono-num font-semibold text-[#0F172A]">
                          {formatDkkExact(row.spendDkk)}
                        </td>
                        <td className="px-3 py-3 text-right font-mono-num font-bold text-[#0027eb]">
                          {row.roas.toFixed(2)}x
                        </td>
                        <td className="px-3 py-3 text-right font-mono-num text-[#334155]">
                          {formatDkkExact(row.cpaDkk)}
                        </td>
                        <td className="px-3 py-3 text-right font-mono-num text-[#334155]">
                          {row.ctrPct.toFixed(2)}%
                        </td>
                        <td className="px-3 py-3 text-right font-mono-num text-[#334155]">
                          {row.thumbstopPct}%
                        </td>
                        <td className="px-3 py-3 text-right font-mono-num text-[#334155]">
                          {row.holdPct}%
                        </td>
                        <td className="px-5 py-3 text-right">
                          <button
                            type="button"
                            data-no-glass="true"
                            onClick={() => onDoubleDown(row)}
                            className="inline-flex h-7 items-center gap-1.5 rounded-[6px] border border-[#d6d6e0] bg-white px-2.5 text-[12px] font-medium text-[#0F172A] transition-colors hover:border-[#0027eb] hover:bg-[#0027eb] hover:text-white"
                          >
                            <Sparkles className="h-3 w-3" />
                            Double Down
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        </>
      )}

      {/* DIRECT META LAUNCH MODAL */}
      {launchOpen &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            className="fixed inset-0 z-[95] flex items-center justify-center bg-[#050811]/60 p-3 backdrop-blur-xs"
            onClick={() => setLaunchOpen(false)}
          >
            <div
              className="flex max-h-[86vh] w-full max-w-lg flex-col overflow-hidden rounded-[12px] border border-[#ebebf3] bg-white shadow-[0_8px_28px_rgba(15,23,42,0.14)]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-[#ebebf3] px-5 py-4">
                <span className="font-display text-[15px] font-bold text-[#0F172A]">
                  Launch to Meta
                </span>
                <button
                  type="button"
                  data-no-glass="true"
                  onClick={() => setLaunchOpen(false)}
                  className="text-[#64748B] hover:text-[#0F172A]"
                >
                  <X className="h-4 w-4 text-[#64748B]" />
                </button>
              </div>

              <div className="workspace-scroll flex-1 space-y-4 overflow-y-auto p-5">
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="text"
                    value={campaignName}
                    onChange={(e) => setCampaignName(e.target.value)}
                    placeholder="Campaign name"
                    className="rounded-[8px] border border-[#d6d6e0] px-3 py-2 text-[13px] text-[#0F172A] outline-none focus:border-[#0027eb]"
                  />
                  <input
                    type="number"
                    min={100}
                    step={50}
                    value={dailyBudgetDkk}
                    onChange={(e) =>
                      setDailyBudgetDkk(Number(e.target.value) || 500)
                    }
                    className="rounded-[8px] border border-[#d6d6e0] px-3 py-2 font-mono-num text-[13px] text-[#0F172A] outline-none focus:border-[#0027eb]"
                  />
                </div>

                <div className="space-y-2">
                  {queuedProjects.map((p) => {
                    const checked = selectedLaunchIds.includes(p.id);
                    return (
                      <button
                        key={p.id}
                        type="button"
                        data-no-glass="true"
                        onClick={() =>
                          setSelectedLaunchIds((prev) =>
                            checked
                              ? prev.filter((id) => id !== p.id)
                              : [...prev, p.id]
                          )
                        }
                        className={`flex w-full items-center justify-between rounded-[10px] border p-3 text-left text-[13px] ${
                          checked
                            ? "border-[#0027eb] bg-[#EEF2FF]/60"
                            : "border-[#ebebf3] bg-white"
                        }`}
                      >
                        <span className="truncate pr-3 font-semibold text-[#0F172A]">
                          {p.title}
                        </span>
                        <span
                          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${
                            checked
                              ? "bg-[#0027eb] text-white"
                              : "border border-[#d6d6e0]"
                          }`}
                        >
                          {checked && <Check className="h-3 w-3 text-white" />}
                        </span>
                      </button>
                    );
                  })}
                  {queuedProjects.length === 0 && (
                    <p className="py-6 text-center text-[13px] text-[#64748B]">
                      No creatives queued yet
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between border-t border-[#ebebf3] px-5 py-3.5">
                <span className="font-mono-num text-[12.5px] text-[#64748B]">
                  {formatDkkExact(dailyBudgetDkk)}/day
                </span>
                <button
                  type="button"
                  data-no-glass="true"
                  disabled={selectedLaunchIds.length === 0}
                  onClick={() => {
                    onLaunchProjects(
                      selectedLaunchIds,
                      campaignName,
                      dailyBudgetDkk
                    );
                    setLaunchOpen(false);
                  }}
                  className="inline-flex h-9 items-center gap-1.5 rounded-[8px] bg-[#0027eb] px-4 text-[13px] font-semibold text-white transition-colors hover:bg-[#001fc2] disabled:opacity-45"
                >
                  Launch to Meta
                  <ArrowRight className="h-3.5 w-3.5 text-white" />
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* MCP API MODAL (FALLBACK WHEN onOpenMcp IS NOT PASSED) */}
      {mcpOpen &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            className="fixed inset-0 z-[95] flex items-center justify-center bg-[#050811]/60 p-3 backdrop-blur-xs"
            onClick={() => setMcpOpen(false)}
          >
            <div
              className="w-full max-w-md rounded-[12px] border border-[#ebebf3] bg-white p-5 shadow-[0_8px_28px_rgba(15,23,42,0.14)]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between">
                <span className="font-display text-[15px] font-bold text-[#0F172A]">
                  Flake MCP
                </span>
                <button
                  type="button"
                  data-no-glass="true"
                  onClick={() => setMcpOpen(false)}
                  className="text-[#64748B] hover:text-[#0F172A]"
                >
                  <X className="h-4 w-4 text-[#64748B]" />
                </button>
              </div>

              <pre className="mt-3 overflow-x-auto rounded-[10px] bg-[#050811] p-3.5 font-mono text-[11.5px] text-white/90">
{`{
  "mcpServers": {
    "flake-creative": {
      "url": "https://api.flake.app/mcp"
    }
  }
}`}
              </pre>

              <div className="mt-3 flex justify-end">
                <button
                  type="button"
                  data-no-glass="true"
                  onClick={async () => {
                    await navigator.clipboard
                      .writeText("https://api.flake.app/mcp")
                      .catch(() => {});
                    setCopiedMcp(true);
                    setTimeout(() => setCopiedMcp(false), 1600);
                  }}
                  className="inline-flex h-8 items-center gap-1.5 rounded-[8px] bg-[#0F172A] px-3.5 text-[12.5px] font-semibold text-white hover:bg-[#1E293B]"
                >
                  {copiedMcp ? (
                    <Check className="h-3.5 w-3.5 text-white" />
                  ) : (
                    <Copy className="h-3.5 w-3.5 text-white" />
                  )}
                  {copiedMcp ? "Copied" : "Copy URL"}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
