"use client";

import React, { useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Check,
  Code2,
  Copy,
  Flame,
  Rocket,
  Sparkles,
  TrendingUp,
  Upload,
  X,
} from "lucide-react";
import type {
  BrandMemory,
  CreativeProject,
  OwnAdMetricRow,
  VideoStylePresetId,
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

function MiniSparklineSvg({
  points,
  color = "#0027eb",
}: {
  points: number[];
  color?: string;
}) {
  const min = Math.min(...points);
  const max = Math.max(...points);
  const span = Math.max(1, max - min);
  const coords = points.map((v, i) => {
    const x = (i / Math.max(1, points.length - 1)) * 120;
    const y = 32 - ((v - min) / span) * 26;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const d = `M ${coords.join(" L ")}`;
  return (
    <svg viewBox="0 0 120 36" className="h-9 w-full overflow-visible">
      <path
        d={d}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
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
  const [breakdownMetric, setBreakdownMetric] = useState<
    "spend" | "roas" | "thumbstop"
  >("spend");
  const [launchOpen, setLaunchOpen] = useState(false);
  const [mcpOpen, setMcpOpen] = useState(false);
  const [campaignName, setCampaignName] = useState(
    `${brandMemory?.brandName || "Brand"} · Advantage+ Creative Test`
  );
  const [dailyBudgetDkk, setDailyBudgetDkk] = useState(750);
  const [selectedLaunchIds, setSelectedLaunchIds] = useState<string[]>(() =>
    projects.filter((p) => p.status === "queued" || p.status === "ready").map((p) => p.id)
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
      Math.round(analyticsRows.reduce((s, r) => s + r.purchases, 0) * periodFactor)
    );
    const roas = spend > 0 ? Number((revenue / spend).toFixed(2)) : 0;
    const cpa = Math.round(spend / purchases);
    const aov = Math.round(revenue / purchases);
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
    const avgCtr =
      analyticsRows.length > 0
        ? Number(
            (
              analyticsRows.reduce((s, r) => s + r.ctrPct, 0) /
              analyticsRows.length
            ).toFixed(2)
          )
        : 0;

    return {
      spend,
      revenue,
      purchases,
      roas,
      cpa,
      aov,
      avgThumbstop,
      avgHold,
      avgCtr,
    };
  }, [analyticsRows, periodFactor]);

  const selectedRow =
    analyticsRows.find((r) => r.id === selectedRowId) || analyticsRows[0];

  const formatBreakdown = useMemo(() => {
    const map = new Map<
      string,
      { label: string; spend: number; roasSum: number; thumbSum: number; count: number }
    >();
    for (const r of analyticsRows) {
      const cur = map.get(r.format) || {
        label: r.format,
        spend: 0,
        roasSum: 0,
        thumbSum: 0,
        count: 0,
      };
      cur.spend += r.spendDkk;
      cur.roasSum += r.roas;
      cur.thumbSum += r.thumbstopPct;
      cur.count += 1;
      map.set(r.format, cur);
    }
    const list = Array.from(map.values()).map((x) => ({
      label: x.label,
      value:
        breakdownMetric === "spend"
          ? x.spend
          : breakdownMetric === "roas"
            ? Number((x.roasSum / x.count).toFixed(2))
            : Number((x.thumbSum / x.count).toFixed(1)),
    }));
    const maxVal = Math.max(1, ...list.map((i) => i.value));
    return list.map((i) => ({ ...i, pct: Math.round((i.value / maxVal) * 100) }));
  }, [analyticsRows, breakdownMetric]);

  const queuedProjects = useMemo(
    () => projects.filter((p) => p.status !== "live"),
    [projects]
  );

  const handleCsvUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result || "");
      const parsed = parseMetaAdsCsv(text);
      if (parsed.length > 0) {
        onImportCsvRows(parsed);
        setCsvFeedback(`Importerede ${parsed.length} annoncer fra din Meta Ads CSV.`);
      } else {
        setCsvFeedback("Kunne ikke finde kolonnerne Ad Name & Amount Spent i CSV-filen.");
      }
      setTimeout(() => setCsvFeedback(null), 4000);
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-5">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="font-display text-[22px] font-bold leading-tight text-[#0F172A]">
              Creative Analytics & Launch
            </h1>
            <span className="rounded-xl border border-[#ECEFF5] bg-white px-2.5 py-1 font-mono-num text-[11.5px] font-semibold text-[#334155] shadow-xs">
              {brandMemory ? brandMemory.brandName : "Demo Konto"}
            </span>
          </div>
          <p className="mt-0.5 text-xs text-[#64748B]">
            Overvåg Hook & Hold-retention, spot creative fatigue i DKK og send færdige Studio-varianter direkte til Meta Ads.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-xl border border-[#E6E9F0] bg-[#F5F7FA] p-1 text-xs font-semibold">
            {(
              [
                { id: "7d", label: "7 dage" },
                { id: "14d", label: "14 dage" },
                { id: "30d", label: "30 dage" },
              ] as const
            ).map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setPeriod(p.id)}
                className={`rounded-lg px-2.5 py-1.5 ${
                  period === p.id ? "bg-white text-[#0F172A] shadow-xs" : "text-[#64748B]"
                }`}
              >
                {p.label}
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
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-1.5 rounded-xl border border-[#DCE1EC] bg-white px-3 py-2 text-xs font-semibold text-[#0F172A] transition-colors hover:border-[#0027eb]"
          >
            <Upload className="h-3.5 w-3.5 text-[#64748B]" />
            Importér Meta CSV
          </button>

          <button
            type="button"
            onClick={() => setMcpOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-[#DCE1EC] bg-white px-3 py-2 text-xs font-semibold text-[#0F172A] transition-colors hover:border-[#0027eb]"
          >
            <Code2 className="h-3.5 w-3.5 text-[#64748B]" />
            MCP API
          </button>

          <button
            type="button"
            onClick={() => {
              setSelectedLaunchIds(queuedProjects.map((p) => p.id));
              setLaunchOpen(true);
            }}
            className="adtrack-btn-primary inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold text-white"
          >
            <Rocket className="h-3.5 w-3.5" />
            Meta Launch ({queuedProjects.length})
          </button>
        </div>
      </div>

      {!brandMemory && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-[#DCE4FF] bg-[#F5F8FF] px-4 py-3 text-xs">
          <span className="font-medium text-[#0F172A]">
            Viser simuleret kontodata — forbind dit brand eller importér en Meta Ads CSV for at måle dine egne produkter i DKK.
          </span>
          <button
            type="button"
            onClick={onOpenBrandMemory}
            className="font-bold text-[#0027eb] hover:underline"
          >
            Forbind Brand Memory →
          </button>
        </div>
      )}

      {csvFeedback && (
        <div className="rounded-xl border border-[#DCFCE7] bg-[#F0FDF4] px-4 py-2.5 text-xs font-semibold text-[#15803D]">
          {csvFeedback}
        </div>
      )}

      {/* 8 ATRIA-STYLE KEY METRIC CARDS (DKK + Cobalt/Emerald/Slate — Zero Purple) */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          {
            label: "Ad Spend",
            value: formatDkkExact(totals.spend),
            delta: "+12%",
            pos: true,
            pts: [38, 42, 40, 49, 46, 54, 62],
          },
          {
            label: "ROAS",
            value: `${totals.roas.toFixed(2)}x`,
            delta: "+0.34x",
            pos: true,
            pts: [2.8, 2.9, 3.1, 3.0, 3.25, 3.4, totals.roas],
          },
          {
            label: "CPA (Pris pr. køb)",
            value: formatDkkExact(totals.cpa),
            delta: "-11%",
            pos: true,
            pts: [220, 210, 205, 198, 192, 185, totals.cpa],
          },
          {
            label: "Omsætning (Meta)",
            value: formatDkkExact(totals.revenue),
            delta: "+18%",
            pos: true,
            pts: [120, 145, 138, 162, 180, 210, 240],
          },
          {
            label: "Gns. AOV",
            value: formatDkkExact(totals.aov),
            delta: "+4%",
            pos: true,
            pts: [540, 555, 560, 550, 575, 582, totals.aov],
          },
          {
            label: "Thumbstop Rate (3s)",
            value: `${totals.avgThumbstop}%`,
            delta: "+6,2%",
            pos: true,
            pts: [32, 35, 34, 38, 41, 40, totals.avgThumbstop],
          },
          {
            label: "Hold Rate (15s)",
            value: `${totals.avgHold}%`,
            delta: "+3,8%",
            pos: true,
            pts: [21, 22, 24, 25, 27, 28, totals.avgHold],
          },
          {
            label: "CTR (Link-klik)",
            value: `${totals.avgCtr}%`,
            delta: "+0,4%",
            pos: true,
            pts: [1.7, 1.8, 1.9, 2.0, 2.1, 2.15, totals.avgCtr],
          },
        ].map((card) => (
          <div key={card.label} className="adtrack-card rounded-2xl p-3.5">
            <p className="text-[11px] font-semibold text-[#64748B]">{card.label}</p>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="font-display text-[19px] font-bold tracking-tight text-[#0F172A]">
                {card.value}
              </span>
              <span className="rounded-md bg-[#ECFDF3] px-1.5 py-0.5 font-mono-num text-[10px] font-bold text-[#15803D]">
                {card.delta}
              </span>
            </div>
            <div className="mt-2">
              <MiniSparklineSvg points={card.pts} color="#0027eb" />
            </div>
          </div>
        ))}
      </div>

      {/* HOOK & RETENTION DROP-OFF CURVE + BREAKDOWNS */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        {/* Hook & Retention Drop-off Inspector (7 cols) */}
        <div className="adtrack-card rounded-2xl p-5 xl:col-span-7">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="font-display text-[15px] font-bold text-[#0F172A]">
                Hook & Video Retention Kurve
              </h2>
              <p className="text-[11.5px] text-[#64748B]">
                Klik på en annonce herunder for at inspicere drop-off fra 0s → 3s Thumbstop → 15s Hold → 30s.
              </p>
            </div>
            {selectedRow && (
              <span className="rounded-xl bg-[#EEF2FF] px-2.5 py-1 font-mono-num text-[11px] font-bold text-[#0027eb]">
                Thumbstop {selectedRow.thumbstopPct}% · Hold {selectedRow.holdPct}%
              </span>
            )}
          </div>

          {selectedRow && (
            <>
              <div className="grid grid-cols-7 items-end gap-2 rounded-2xl border border-[#ECEFF5] bg-[#FAFBFD] p-4 pt-6">
                {["0s", "3s Hook", "6s", "10s", "15s Hold", "22s", "30s"].map(
                  (lbl, idx) => {
                    const pct = selectedRow.retentionCurve[idx] ?? 15;
                    const isThumb = idx === 1;
                    const isHold = idx === 4;
                    return (
                      <div key={lbl} className="flex flex-col items-center gap-1.5">
                        <span className="font-mono-num text-[10.5px] font-bold text-[#0F172A]">
                          {pct}%
                        </span>
                        <div className="flex h-32 w-full items-end justify-center rounded-lg bg-[#E6E9F0]/60 p-1">
                          <div
                            className={`w-full rounded-md transition-all duration-300 ${
                              isThumb
                                ? "bg-[#0027eb]"
                                : isHold
                                  ? "bg-[#16A34A]"
                                  : "bg-[#0F172A]/80"
                            }`}
                            style={{ height: `${Math.max(8, pct)}%` }}
                          />
                        </div>
                        <span className="text-center font-mono-num text-[10px] font-semibold text-[#64748B]">
                          {lbl}
                        </span>
                      </div>
                    );
                  }
                )}
              </div>

              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#ECEFF5] bg-white px-3.5 py-2.5 text-xs">
                <div className="min-w-0 flex-1">
                  <span className="font-bold text-[#0F172A]">Snow Diagnose: </span>
                  <span className="text-[#475569]">
                    {selectedRow.status === "Fatigue"
                      ? `Drop-off allerede ved 3 sek. (${selectedRow.thumbstopPct}%). Behold kernen, men skift de første 3 sek. til 5 friske hooks.`
                      : `Stærk fastholdelse gennem mekanismen (${selectedRow.holdPct}% Hold-rate). Klar kandidat til at skubbe i nye formater.`}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => onDoubleDown(selectedRow)}
                  className="inline-flex shrink-0 items-center gap-1 rounded-xl bg-[#0027eb]/[0.08] px-3 py-1.5 text-[11.5px] font-bold text-[#0027eb] hover:bg-[#0027eb] hover:text-white"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  Double Down →
                </button>
              </div>
            </>
          )}
        </div>

        {/* Breakdowns by Format + Age/Gender (5 cols) */}
        <div className="space-y-4 xl:col-span-5">
          <div className="adtrack-card rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-display text-[13.5px] font-bold text-[#0F172A]">
                Format & Vinkel Breakdown
              </h3>
              <select
                value={breakdownMetric}
                onChange={(e) =>
                  setBreakdownMetric(e.target.value as "spend" | "roas" | "thumbstop")
                }
                className="rounded-lg border border-[#E2E6EF] bg-white px-2 py-1 text-[11px] font-semibold text-[#334155] outline-none"
              >
                <option value="spend">Efter Spend (DKK)</option>
                <option value="roas">Efter ROAS</option>
                <option value="thumbstop">Efter Thumbstop %</option>
              </select>
            </div>

            <div className="space-y-2.5">
              {formatBreakdown.map((item, idx) => (
                <div key={item.label} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-[#0F172A]">{item.label}</span>
                    <span className="font-mono-num font-bold text-[#334155]">
                      {breakdownMetric === "spend"
                        ? formatDkkExact(item.value)
                        : breakdownMetric === "roas"
                          ? `${item.value}x`
                          : `${item.value}%`}
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-[#EFF2F6]">
                    <div
                      className={`h-full rounded-full ${
                        idx === 0 ? "bg-[#0027eb]" : "bg-[#0F172A]/75"
                      }`}
                      style={{ width: `${item.pct}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Muted Gender & Age Distribution */}
          <div className="adtrack-card rounded-2xl p-4 space-y-2.5">
            <p className="font-display text-[13px] font-bold text-[#0F172A]">
              Købsfordeling · Køn
            </p>
            <div className="flex items-center justify-between text-xs">
              <span className="inline-flex items-center gap-1.5 font-medium text-[#334155]">
                <span className="h-2 w-2 rounded-full bg-[#E5A9B8]" />
                Kvinder <strong className="font-mono-num text-[#0F172A]">64%</strong>
              </span>
              <span className="inline-flex items-center gap-1.5 font-medium text-[#334155]">
                <span className="h-2 w-2 rounded-full bg-[#93B4D8]" />
                Mænd <strong className="font-mono-num text-[#0F172A]">36%</strong>
              </span>
            </div>
            <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-[#EFF2F6]">
              <div className="h-full bg-[#E5A9B8]" style={{ width: "64%" }} />
              <div className="h-full bg-[#93B4D8]" style={{ width: "36%" }} />
            </div>
          </div>
        </div>
      </div>

      {/* CREATIVE PERFORMANCE & FATIGUE TABLE */}
      <div className="adtrack-card overflow-hidden rounded-2xl">
        <div className="flex items-center justify-between border-b border-[#ECEFF5] px-5 py-3.5">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-[#64748B]" />
            <h2 className="font-display text-[14.5px] font-bold text-[#0F172A]">
              Alle Annoncer & Double-Down Loop
            </h2>
          </div>
          <span className="font-mono-num text-xs text-[#64748B]">
            {analyticsRows.length} aktive test-spor
          </span>
        </div>

        <div className="divide-y divide-[#F1F5F9]">
          {analyticsRows.map((row) => {
            const isSelected = row.id === selectedRow?.id;
            return (
              <div
                key={row.id}
                onClick={() => setSelectedRowId(row.id)}
                className={`flex cursor-pointer flex-col justify-between gap-3 px-5 py-3.5 transition-colors sm:flex-row sm:items-center ${
                  isSelected ? "bg-[#F5F8FF]" : "hover:bg-[#FAFBFD]"
                }`}
              >
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <div className="h-11 w-11 shrink-0 overflow-hidden rounded-xl border border-[#E6E9F0] bg-[#F3F5F9]">
                    {row.thumbnailUrl ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={row.thumbnailUrl}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-[#94A3B8]">
                        <Activity className="h-4 w-4" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="truncate font-display text-[13px] font-bold text-[#0F172A]">
                        {row.name}
                      </span>
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          row.status === "Scaling Winner"
                            ? "bg-[#ECFDF3] text-[#15803D]"
                            : row.status === "Hook Winner"
                              ? "bg-[#EEF2FF] text-[#0027eb]"
                              : row.status === "Fatigue"
                                ? "bg-[#FFF1F2] text-[#E11D48]"
                                : "bg-[#F1F5F9] text-[#475569]"
                        }`}
                      >
                        {row.status === "Fatigue" && (
                          <AlertTriangle className="h-2.5 w-2.5" />
                        )}
                        {row.status === "Scaling Winner" && (
                          <Flame className="h-2.5 w-2.5" />
                        )}
                        {row.status}
                      </span>
                    </div>
                    <p className="truncate text-[11px] text-[#64748B]">
                      {row.format} · {row.angle} · {row.daysActive} dage live
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-4 sm:gap-5">
                  <div className="text-right">
                    <p className="text-[10px] font-medium text-[#64748B]">Spend</p>
                    <p className="font-mono-num text-xs font-bold text-[#0F172A]">
                      {formatDkkExact(row.spendDkk)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-medium text-[#64748B]">ROAS</p>
                    <p className="font-mono-num text-xs font-bold text-[#15803D]">
                      {row.roas.toFixed(2)}x
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-medium text-[#64748B]">CPA</p>
                    <p className="font-mono-num text-xs font-bold text-[#0F172A]">
                      {formatDkkExact(row.cpaDkk)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-medium text-[#64748B]">Thumb / Hold</p>
                    <p className="font-mono-num text-xs font-semibold text-[#334155]">
                      {row.thumbstopPct}% / {row.holdPct}%
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDoubleDown(row);
                    }}
                    className="inline-flex items-center gap-1 rounded-xl border border-[#DCE1EC] bg-white px-3 py-1.5 text-[11.5px] font-semibold text-[#0F172A] transition-colors hover:border-[#0027eb] hover:text-[#0027eb]"
                  >
                    <TrendingUp className="h-3.5 w-3.5" />
                    Double Down
                  </button>
                </div>
              </div>
            );
          })}
        </div>
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
              className="flex max-h-[88vh] w-full max-w-xl flex-col overflow-hidden rounded-2xl border border-[#E6E9F0] bg-white shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-[#ECEFF5] px-5 py-4">
                <div className="flex items-center gap-2">
                  <Rocket className="h-4 w-4 text-[#0027eb]" />
                  <h3 className="font-display text-[15px] font-bold text-[#0F172A]">
                    Launch direkte til Meta Ads Manager
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setLaunchOpen(false)}
                  className="text-[#64748B] hover:text-[#0F172A]"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="workspace-scroll flex-1 space-y-4 overflow-y-auto p-5">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-[11px] font-semibold text-[#64748B]">
                      Meta Kampagne
                    </label>
                    <input
                      type="text"
                      value={campaignName}
                      onChange={(e) => setCampaignName(e.target.value)}
                      className="w-full rounded-xl border border-[#DCE1EC] px-3 py-2 text-xs text-[#0F172A] outline-none focus:border-[#0027eb]"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-[11px] font-semibold text-[#64748B]">
                      Dagligt Budget (DKK)
                    </label>
                    <input
                      type="number"
                      min={100}
                      step={50}
                      value={dailyBudgetDkk}
                      onChange={(e) => setDailyBudgetDkk(Number(e.target.value) || 500)}
                      className="w-full rounded-xl border border-[#DCE1EC] px-3 py-2 font-mono-num text-xs text-[#0F172A] outline-none focus:border-[#0027eb]"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-[11px] font-semibold text-[#64748B]">
                    Creatives fra Studio klar til launch ({queuedProjects.length})
                  </label>
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
                          className={`flex w-full items-center justify-between rounded-xl border p-3 text-left text-xs ${
                            checked
                              ? "border-[#0027eb] bg-[#0027eb]/[0.06]"
                              : "border-[#E6E9F0] bg-white"
                          }`}
                        >
                          <div className="min-w-0 pr-3">
                            <p className="truncate font-bold text-[#0F172A]">{p.title}</p>
                            <p className="truncate text-[11px] text-[#64748B]">
                              {p.headline}
                            </p>
                          </div>
                          <span
                            className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border ${
                              checked
                                ? "border-[#0027eb] bg-[#0027eb] text-white"
                                : "border-[#CBD5E1]"
                            }`}
                          >
                            {checked && <Check className="h-3 w-3" />}
                          </span>
                        </button>
                      );
                    })}
                    {queuedProjects.length === 0 && (
                      <p className="rounded-xl bg-[#FAFBFD] p-4 text-center text-xs text-[#64748B]">
                        Lav eller vælg et creative i Ad Studio først, og send det til launch-køen.
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between border-t border-[#ECEFF5] bg-[#FAFBFD] px-5 py-3.5">
                <span className="font-mono-num text-xs text-[#64748B]">
                  {selectedLaunchIds.length} valgt · {formatDkkExact(dailyBudgetDkk)}/dag
                </span>
                <button
                  type="button"
                  disabled={selectedLaunchIds.length === 0}
                  onClick={() => {
                    onLaunchProjects(selectedLaunchIds, campaignName, dailyBudgetDkk);
                    setLaunchOpen(false);
                  }}
                  className="adtrack-btn-primary inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-semibold text-white disabled:opacity-45"
                >
                  <ArrowRight className="h-3.5 w-3.5" />
                  Launch til Meta Ads
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* MCP SERVER & AGENT API MODAL */}
      {mcpOpen &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            className="fixed inset-0 z-[95] flex items-center justify-center bg-[#050811]/65 p-3 backdrop-blur-xs"
            onClick={() => setMcpOpen(false)}
          >
            <div
              className="w-full max-w-lg rounded-2xl border border-[#E6E9F0] bg-white p-5 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Code2 className="h-4 w-4 text-[#0027eb]" />
                  <h3 className="font-display text-[15px] font-bold text-[#0F172A]">
                    Flake MCP Server & Agent API
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setMcpOpen(false)}
                  className="text-[#64748B] hover:text-[#0F172A]"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <p className="mt-2 text-xs leading-relaxed text-[#475569]">
                Forbind Claude, Cursor eller dine egne agenter direkte til Flakes swipe file, shop-funnels og brief-generator via JSON-RPC 2.0 MCP.
              </p>

              <pre className="mt-3 overflow-x-auto rounded-xl bg-[#050811] p-3 font-mono-num text-[11px] text-white/90">
{`{
  "mcpServers": {
    "flake-creative": {
      "url": "${typeof window !== "undefined" ? window.location.origin : ""}/api/mcp"
    }
  }
}`}
              </pre>

              <div className="mt-3 flex items-center justify-between">
                <span className="text-[11px] text-[#64748B]">
                  Tools: search_swipe_ads, list_tracked_shops, get_shop_funnels, create_clone_brief
                </span>
                <button
                  type="button"
                  onClick={async () => {
                    const url = `${window.location.origin}/api/mcp`;
                    await navigator.clipboard.writeText(url).catch(() => {});
                    setCopiedMcp(true);
                    setTimeout(() => setCopiedMcp(false), 1800);
                  }}
                  className="inline-flex items-center gap-1 rounded-xl bg-[#0F172A] px-3 py-1.5 text-xs font-semibold text-white"
                >
                  {copiedMcp ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
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
