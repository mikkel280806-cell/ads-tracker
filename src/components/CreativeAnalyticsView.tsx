"use client";

import React, { useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  Activity,
  ArrowRight,
  Check,
  Code2,
  Copy,
  MoreHorizontal,
  Rocket,
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

interface CreativeAnalyticsViewProps {
  brandMemory: BrandMemory | null;
  projects: CreativeProject[];
  analyticsRows: OwnAdMetricRow[];
  onDoubleDown: (row: OwnAdMetricRow) => void;
  onLaunchProjects: (
    projectIds: string[],
    campaignName: string,
    dailyBudgetDkk: number
  ) => void;
  onImportCsvRows: (rows: OwnAdMetricRow[]) => void;
  onOpenBrandMemory: () => void;
}

function SmoothAreaSparkline({
  points,
  prevPoints,
  id,
}: {
  points: number[];
  prevPoints?: number[];
  id: string;
}) {
  const all = prevPoints ? [...points, ...prevPoints] : points;
  const min = Math.min(...all);
  const max = Math.max(...all);
  const span = Math.max(1, max - min);

  const toCoords = (arr: number[]) =>
    arr.map((v, i) => ({
      x: (i / Math.max(1, arr.length - 1)) * 140,
      y: 36 - ((v - min) / span) * 28,
    }));

  const buildSmoothPath = (pts: { x: number; y: number }[]) => {
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

  const mainPts = toCoords(points);
  const mainD = buildSmoothPath(mainPts);
  const areaD = `${mainD} L 140 42 L 0 42 Z`;
  const prevD = prevPoints ? buildSmoothPath(toCoords(prevPoints)) : "";

  return (
    <svg viewBox="0 0 140 42" className="h-10 w-full overflow-visible">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0027eb" stopOpacity="0.16" />
          <stop offset="100%" stopColor="#0027eb" stopOpacity="0" />
        </linearGradient>
      </defs>
      {prevD && (
        <path
          d={prevD}
          fill="none"
          stroke="#CBD5E1"
          strokeWidth="1.3"
          strokeDasharray="3 3"
        />
      )}
      <path d={areaD} fill={`url(#${id})`} />
      <path
        d={mainD}
        fill="none"
        stroke="#0027eb"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function SmoothRetentionChart({ curve }: { curve: number[] }) {
  const labels = ["0s", "3s Hook", "6s", "10s", "15s Hold", "22s", "30s"];
  const w = 520;
  const h = 150;
  const padX = 22;
  const padTop = 18;
  const padBottom = 26;
  const chartH = h - padTop - padBottom;

  const pts = labels.map((_, i) => {
    const val = curve[i] ?? 15;
    const x = padX + (i / (labels.length - 1)) * (w - padX * 2);
    const y = padTop + chartH - (Math.max(0, Math.min(100, val)) / 100) * chartH;
    return { x, y, val };
  });

  let lineD = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 1; i < pts.length; i++) {
    const p0 = pts[i - 1];
    const p1 = pts[i];
    const cx = (p0.x + p1.x) / 2;
    lineD += ` C ${cx} ${p0.y}, ${cx} ${p1.y}, ${p1.x} ${p1.y}`;
  }
  const areaD = `${lineD} L ${pts[pts.length - 1].x} ${padTop + chartH} L ${pts[0].x} ${padTop + chartH} Z`;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-44 w-full">
      <defs>
        <linearGradient id="flake-ret-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0027eb" stopOpacity="0.2" />
          <stop offset="100%" stopColor="#0027eb" stopOpacity="0.01" />
        </linearGradient>
      </defs>

      {[25, 50, 75].map((pct) => {
        const y = padTop + chartH - (pct / 100) * chartH;
        return (
          <line
            key={pct}
            x1={padX}
            y1={y}
            x2={w - padX}
            y2={y}
            stroke="#EEF2F6"
            strokeWidth="1"
          />
        );
      })}

      <path d={areaD} fill="url(#flake-ret-fill)" />
      <path
        d={lineD}
        fill="none"
        stroke="#0027eb"
        strokeWidth="2.5"
        strokeLinecap="round"
      />

      {pts.map((pt, i) => {
        const isHook = i === 1;
        const isHold = i === 4;
        return (
          <g key={labels[i]}>
            <circle
              cx={pt.x}
              cy={pt.y}
              r={isHook || isHold ? 5 : 3.2}
              fill={isHold ? "#16A34A" : isHook ? "#0027eb" : "#0F172A"}
              stroke="#FFFFFF"
              strokeWidth="2"
            />
            <text
              x={pt.x}
              y={pt.y - 9}
              textAnchor="middle"
              className="fill-[#0F172A] font-mono-num text-[10px] font-bold"
            >
              {pt.val}%
            </text>
            <text
              x={pt.x}
              y={h - 6}
              textAnchor="middle"
              className={`font-mono-num text-[10px] ${
                isHook || isHold
                  ? "fill-[#0F172A] font-bold"
                  : "fill-[#94A3B8] font-medium"
              }`}
            >
              {labels[i]}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

export function CreativeAnalyticsView({
  brandMemory,
  projects,
  analyticsRows,
  onDoubleDown,
  onLaunchProjects,
  onImportCsvRows,
  onOpenBrandMemory,
}: CreativeAnalyticsViewProps) {
  const [period, setPeriod] = useState<"7d" | "14d" | "30d">("14d");
  const [selectedRowId, setSelectedRowId] = useState<string>(
    analyticsRows[0]?.id || ""
  );
  const [menuOpen, setMenuOpen] = useState(false);
  const [launchOpen, setLaunchOpen] = useState(false);
  const [mcpOpen, setMcpOpen] = useState(false);
  const [campaignName, setCampaignName] = useState(
    `${brandMemory?.brandName || "Brand"} · Advantage+`
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
    const avgThumbstop =
      analyticsRows.length > 0
        ? Number(
            (
              analyticsRows.reduce((s, r) => s + r.thumbstopPct, 0) /
              analyticsRows.length
            ).toFixed(1)
          )
        : 0;
    const avgHold =
      analyticsRows.length > 0
        ? Number(
            (
              analyticsRows.reduce((s, r) => s + r.holdPct, 0) /
              analyticsRows.length
            ).toFixed(1)
          )
        : 0;

    return { spend, revenue, roas, cpa, avgThumbstop, avgHold };
  }, [analyticsRows, periodFactor]);

  const selectedRow =
    analyticsRows.find((r) => r.id === selectedRowId) || analyticsRows[0];

  const formatBreakdown = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of analyticsRows) {
      map.set(r.format, (map.get(r.format) || 0) + r.spendDkk);
    }
    const list = Array.from(map.entries())
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value);
    const maxVal = Math.max(1, ...list.map((i) => i.value));
    return list.map((i) => ({
      ...i,
      pct: Math.round((i.value / maxVal) * 100),
    }));
  }, [analyticsRows]);

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

  return (
    <div className="space-y-5">
      {/* Clean Minimal Header: Brand + Period + Launch + Overflow Menu */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <h1 className="font-display text-[22px] font-bold tracking-tight text-[#0F172A]">
            Analytics
          </h1>
          <button
            type="button"
            onClick={onOpenBrandMemory}
            className="rounded-full border border-[#E6E9F0] bg-white px-3 py-1 text-xs font-semibold text-[#475569] hover:border-[#0027eb] hover:text-[#0F172A]"
          >
            {brandMemory ? brandMemory.brandName : "Demo · Forbind brand"}
          </button>
        </div>

        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-full border border-[#E6E9F0] bg-white p-0.5 text-xs font-semibold">
            {(["7d", "14d", "30d"] as const).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPeriod(p)}
                className={`rounded-full px-3 py-1 ${
                  period === p ? "bg-[#0F172A] text-white" : "text-[#64748B]"
                }`}
              >
                {p}
              </button>
            ))}
          </div>

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
              aria-label="Flere valg"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-[#E6E9F0] bg-white text-[#64748B] hover:text-[#0F172A]"
            >
              <MoreHorizontal className="h-4 w-4" />
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-11 z-20 w-44 rounded-2xl border border-[#E6E9F0] bg-white p-1.5 shadow-xl">
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    fileInputRef.current?.click();
                  }}
                  className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-[#0F172A] hover:bg-[#F5F7FA]"
                >
                  <Upload className="h-3.5 w-3.5 text-[#64748B]" />
                  Importér CSV
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    setMcpOpen(true);
                  }}
                  className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-[#0F172A] hover:bg-[#F5F7FA]"
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
            className="adtrack-btn-primary inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-semibold text-white"
          >
            <Rocket className="h-3.5 w-3.5" />
            Launch ({queuedProjects.length})
          </button>
        </div>
      </div>

      {csvFeedback && (
        <div className="rounded-full bg-[#ECFDF3] px-4 py-1.5 text-center text-xs font-semibold text-[#15803D]">
          {csvFeedback}
        </div>
      )}

      {/* 4 Clean Hero KPI Cards with Smooth Area Sparklines (Current vs Previous) */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          {
            id: "sp-spend",
            label: "Spend",
            value: formatDkkExact(totals.spend),
            delta: "+12%",
            pts: [38, 44, 41, 52, 48, 56, 62],
            prev: [34, 39, 38, 43, 45, 48, 51],
          },
          {
            id: "sp-roas",
            label: "ROAS",
            value: `${totals.roas.toFixed(2)}x`,
            delta: "+0.34x",
            pts: [2.8, 3.0, 2.95, 3.2, 3.3, 3.45, totals.roas],
            prev: [2.5, 2.6, 2.7, 2.75, 2.8, 2.9, 2.95],
          },
          {
            id: "sp-cpa",
            label: "CPA",
            value: formatDkkExact(totals.cpa),
            delta: "-11%",
            pts: [220, 212, 208, 198, 192, 186, totals.cpa],
            prev: [235, 232, 228, 224, 220, 218, 214],
          },
          {
            id: "sp-hook",
            label: "Thumbstop / Hold",
            value: `${totals.avgThumbstop}% · ${totals.avgHold}%`,
            delta: "+6,2%",
            pts: [31, 35, 34, 39, 41, 40, totals.avgThumbstop],
            prev: [28, 30, 31, 32, 33, 34, 35],
          },
        ].map((card) => (
          <div key={card.id} className="adtrack-card rounded-2xl p-4">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-[#64748B]">
                {card.label}
              </span>
              <span className="rounded-full bg-[#ECFDF3] px-2 py-0.5 font-mono-num text-[10px] font-bold text-[#15803D]">
                {card.delta}
              </span>
            </div>
            <p className="mt-1 font-display text-[20px] font-bold tracking-tight text-[#0F172A]">
              {card.value}
            </p>
            <div className="mt-2">
              <SmoothAreaSparkline
                id={card.id}
                points={card.pts}
                prevPoints={card.prev}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Smooth Retention Area Curve + Clean Visual Breakdowns */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        <div className="adtrack-card rounded-2xl p-5 xl:col-span-8">
          <div className="mb-2 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <h2 className="truncate font-display text-[14.5px] font-bold text-[#0F172A]">
                {selectedRow ? selectedRow.name : "Video Retention"}
              </h2>
              {selectedRow && (
                <span className="shrink-0 rounded-full bg-[#EEF2FF] px-2.5 py-0.5 font-mono-num text-[10.5px] font-bold text-[#0027eb]">
                  {selectedRow.roas.toFixed(2)}x ROAS
                </span>
              )}
            </div>
            {selectedRow && (
              <button
                type="button"
                onClick={() => onDoubleDown(selectedRow)}
                className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[#0027eb]/[0.08] px-3 py-1 text-[11px] font-bold text-[#0027eb] transition-colors hover:bg-[#0027eb] hover:text-white"
              >
                <Sparkles className="h-3 w-3" />
                Double Down
              </button>
            )}
          </div>

          {selectedRow && (
            <SmoothRetentionChart curve={selectedRow.retentionCurve} />
          )}
        </div>

        <div className="flex flex-col justify-between gap-4 xl:col-span-4">
          {/* Format Bars */}
          <div className="adtrack-card flex-1 rounded-2xl p-4 space-y-3">
            <p className="font-display text-[13px] font-bold text-[#0F172A]">
              Format
            </p>
            <div className="space-y-2.5">
              {formatBreakdown.map((item, idx) => (
                <div key={item.label} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-[#334155]">
                      {item.label}
                    </span>
                    <span className="font-mono-num font-bold text-[#0F172A]">
                      {formatDkkExact(item.value)}
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-[#EFF2F6]">
                    <div
                      className={`h-full rounded-full ${
                        idx === 0 ? "bg-[#0027eb]" : "bg-[#0F172A]/70"
                      }`}
                      style={{ width: `${item.pct}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Muted Gender Split */}
          <div className="adtrack-card rounded-2xl p-4 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="inline-flex items-center gap-1.5 font-medium text-[#334155]">
                <span className="h-2 w-2 rounded-full bg-[#E5A9B8]" />
                Kvinder <strong className="font-mono-num">64%</strong>
              </span>
              <span className="inline-flex items-center gap-1.5 font-medium text-[#334155]">
                <span className="h-2 w-2 rounded-full bg-[#93B4D8]" />
                Mænd <strong className="font-mono-num">36%</strong>
              </span>
            </div>
            <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-[#EFF2F6]">
              <div className="h-full bg-[#E5A9B8]" style={{ width: "64%" }} />
              <div className="h-full bg-[#93B4D8]" style={{ width: "36%" }} />
            </div>
          </div>
        </div>
      </div>

      {/* VISUAL CREATIVE GALLERY (Show the ads instead of a dense button table) */}
      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
        {analyticsRows.map((row) => {
          const isSelected = row.id === selectedRow?.id;
          return (
            <div
              key={row.id}
              onClick={() => setSelectedRowId(row.id)}
              className={`group cursor-pointer overflow-hidden rounded-2xl border bg-white transition-all ${
                isSelected
                  ? "border-[#0027eb] ring-1 ring-[#0027eb]"
                  : "border-[#ECEFF5] hover:border-[#CBD5E1]"
              }`}
            >
              {/* Visual Ad Poster Header */}
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
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/15 to-black/25" />

                <span
                  className={`absolute left-2.5 top-2.5 rounded-full px-2 py-0.5 text-[10px] font-bold backdrop-blur-md ${
                    row.status === "Scaling Winner"
                      ? "bg-[#15803D]/90 text-white"
                      : row.status === "Fatigue"
                        ? "bg-[#E11D48]/90 text-white"
                        : "bg-black/60 text-white"
                  }`}
                >
                  {row.status}
                </span>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDoubleDown(row);
                  }}
                  className="absolute right-2.5 top-2.5 inline-flex items-center gap-1 rounded-full bg-white/95 px-2.5 py-1 text-[10.5px] font-bold text-[#0F172A] opacity-0 shadow transition-all hover:bg-[#0027eb] hover:text-white group-hover:opacity-100"
                >
                  <Sparkles className="h-3 w-3" />
                  Skalér
                </button>

                <div className="absolute inset-x-3 bottom-2.5 flex items-end justify-between text-white">
                  <p className="truncate font-display text-[13px] font-bold pr-2">
                    {row.name}
                  </p>
                  <span className="shrink-0 font-mono-num text-[13px] font-bold text-[#86EFAC]">
                    {row.roas.toFixed(2)}x
                  </span>
                </div>
              </div>

              {/* Clean Metric Strip + Visual Hook/Hold Bar */}
              <div className="space-y-2 p-3">
                <div className="flex items-center justify-between font-mono-num text-xs">
                  <span className="font-bold text-[#0F172A]">
                    {formatDkkExact(row.spendDkk)}
                  </span>
                  <span className="text-[#64748B]">
                    {row.thumbstopPct}% · {row.holdPct}%
                  </span>
                </div>
                <div className="flex h-1.5 w-full overflow-hidden rounded-full bg-[#F1F5F9]">
                  <div
                    className="h-full bg-[#0027eb]"
                    style={{ width: `${Math.min(100, row.thumbstopPct)}%` }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

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
