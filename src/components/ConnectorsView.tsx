"use client";

import React, { useState } from "react";
import {
  BarChart3,
  Check,
  CheckCircle2,
  Circle,
  Copy,
  Database,
  Globe,
  Loader2,
  Server,
  Smartphone,
  Zap,
} from "lucide-react";
import type { ConnectorStatus } from "@/lib/types";

interface ConnectorsViewProps {
  status: ConnectorStatus;
}

export function ConnectorsView({ status }: ConnectorsViewProps) {
  const [testingWake, setTestingWake] = useState(false);
  const [wakeResult, setWakeResult] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const origin =
    typeof window !== "undefined" ? window.location.origin : "https://adtrack.vercel.app";

  const copy = async (id: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 1800);
    } catch {
      // ignore
    }
  };

  const handleTestInstaBoxWake = async () => {
    setTestingWake(true);
    setWakeResult(null);
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ testWakeOnly: true }),
      });
      const data = await res.json();
      setWakeResult(data.message || (data.ok ? "InstaBox vågen!" : "Ikke forbundet."));
    } catch {
      setWakeResult("Netværksfejl ved test af InstaBox wake.");
    } finally {
      setTestingWake(false);
    }
  };

  const connectors = [
    {
      name: "Supabase (Database & Permanent Video-Storage)",
      connected: status.supabase,
      icon: Database,
      description:
        "Gemmer alle ads, shops, boards, tags og selve videofilerne permanent, så Meta/Instagram-links aldrig udløber.",
      envVars: ["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"],
      actionHint: "Kør supabase/schema.sql i Supabase SQL Editor.",
    },
    {
      name: "ScrapeCreators / Apify (Instagram & Meta Ad Library)",
      connected: status.scrapeCreators || status.apify,
      icon: Globe,
      description:
        "Henter HD-video, annoncetekst, CTA, landingsside, duplikeringer og EU-reach fra Meta Ad Library og Instagram-links.",
      envVars: ["SCRAPECREATORS_API_KEY"],
      actionHint: "Opret nøgle på scrapecreators.com (eller apify.com).",
    },
    {
      name: "SimilarWeb / RapidAPI (Shop Traffic & Lande)",
      connected: status.similarweb,
      icon: BarChart3,
      description:
        "Henter månedlige besøgende, trafikvækst over tid og landefordeling på enhver konkurrent-webshop i Shops & Shop Analytics.",
      envVars: ["SIMILARWEB_API_KEY", "RAPIDAPI_KEY"],
      actionHint: "Brug enten officiel SimilarWeb API eller billig RapidAPI SimilarWeb-nøgle.",
    },
    {
      name: "InstaBox.sh (On-Demand AI & Video Worker)",
      connected: status.instabox,
      icon: Server,
      description:
        "Fuld Linux VM der pauser sig selv efter 30 min idle og vågner på < 1 sek. via API key til ffmpeg + lokal Whisper + agy acp.",
      envVars: ["INSTABOX_API_KEY", "INSTABOX_MACHINE_ID"],
      actionHint: "Worker er klar i /data/advault-worker/ på din ad-tracker VM.",
      hasWakeTest: true,
    },
  ];

  const shortcutPayload = `POST ${origin}/api/import\nHeader: Content-Type: application/json\nBody: { "url": "<Genvejsinput>" }`;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3.5">
        <div className="adtrack-icon-badge flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white">
          <Server className="h-5 w-5" />
        </div>
        <div>
          <h1 className="font-display text-[17px] font-bold leading-tight text-[#101828]">
            Connectors &amp; Mobil PWA
          </h1>
          <p className="mt-0.5 text-[12.5px] text-[#667085]">
            Live status på Supabase, ScrapeCreators, SimilarWeb, InstaBox.sh auto-wake og iPhone/Android PWA
          </p>
        </div>
      </div>

      {/* Mode Banner */}
      <div className="flex flex-col justify-between gap-3 rounded-2xl border border-[#E6E8EC] bg-[#FAFBFD] p-4 sm:flex-row sm:items-center">
        <div className="flex items-start gap-3">
          <span
            className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full"
            style={{
              backgroundColor: status.mode === "live" ? "#16A34A" : "#0027eb",
            }}
          />
          <div>
            <p className="text-sm font-bold text-[#111318]">
              {status.mode === "live"
                ? "Live Mode — Forbundet til Supabase"
                : "Lokal / Demo Mode — Klar til Vercel & Supabase nøgler"}
            </p>
            <p className="mt-0.5 text-xs text-[#667085]">
              {status.mode === "live"
                ? "Alle ændringer og importerede annoncer gemmes direkte i din Supabase Postgres database."
                : "Alt virker allerede i browseren. Tilføj dine miljøvariabler i Vercel for 24/7 synk på tværs af PC og telefon."}
            </p>
          </div>
        </div>
        <span
          className="inline-flex shrink-0 items-center rounded-full px-3 py-1 text-xs font-semibold"
          style={
            status.instabox
              ? { backgroundColor: "#ECFDF3", color: "#15803D" }
              : { backgroundColor: "#EEF2FF", color: "#0027eb" }
          }
        >
          {status.instabox ? "InstaBox Forbundet" : "Klar til opsætning"}
        </span>
      </div>

      {/* Connector Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {connectors.map((c) => {
          const Icon = c.icon;
          return (
            <div
              key={c.name}
              className="flex flex-col justify-between gap-4 rounded-2xl border border-[#E6E8EC] bg-white p-4"
            >
              <div className="space-y-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#EEF2FF] text-[#0027eb]">
                      <Icon className="h-4 w-4" />
                    </div>
                    <h2 className="font-display text-sm font-bold text-[#111318]">
                      {c.name}
                    </h2>
                  </div>

                  <span
                    className="inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold"
                    style={
                      c.connected
                        ? { backgroundColor: "#ECFDF3", color: "#15803D" }
                        : { backgroundColor: "#F2F4F7", color: "#667085" }
                    }
                  >
                    {c.connected ? (
                      <>
                        <CheckCircle2 className="h-3 w-3" /> Forbundet
                      </>
                    ) : (
                      <>
                        <Circle className="h-3 w-3" /> Klar til nøgle
                      </>
                    )}
                  </span>
                </div>

                <p className="text-xs leading-relaxed text-[#475467]">
                  {c.description}
                </p>

                <div className="flex flex-wrap gap-1.5">
                  {c.envVars.map((env) => (
                    <code
                      key={env}
                      className="rounded-md bg-[#F2F4F7] px-2 py-0.5 font-mono text-[11px] text-[#344054]"
                    >
                      {env}
                    </code>
                  ))}
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#F1F3F6] pt-3">
                <span className="text-[11px] text-[#667085]">{c.actionHint}</span>

                {c.hasWakeTest && (
                  <button
                    type="button"
                    onClick={handleTestInstaBoxWake}
                    disabled={testingWake}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-[#0027eb] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#001fc2]"
                  >
                    {testingWake ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Zap className="h-3 w-3" />
                    )}
                    Test Auto-Wake
                  </button>
                )}
              </div>

              {c.hasWakeTest && wakeResult && (
                <p className="rounded-xl bg-[#F8F9FB] px-3 py-2 text-xs font-medium text-[#111318]">
                  {wakeResult}
                </p>
              )}
            </div>
          );
        })}
      </div>

      {/* Mobile PWA & iPhone Share Sheet Guide */}
      <div className="rounded-2xl border border-[#E6E8EC] bg-white p-5">
        <div className="flex items-center gap-2.5">
          <Smartphone className="h-5 w-5 text-[#0027eb]" />
          <h2 className="font-display text-base font-bold text-[#111318]">
            Installér Adtrack på telefonen (PWA) &amp; 1-kliks deling fra Instagram
          </h2>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="space-y-2 rounded-xl bg-[#FAFBFD] p-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#111318]">
              1. Hent som Web App (iPhone &amp; Android)
            </h3>
            <ol className="list-decimal space-y-1.5 pl-4 text-xs leading-relaxed text-[#475467]">
              <li>
                Åbn din Vercel-URL i <strong>Safari (iPhone)</strong> eller{" "}
                <strong>Chrome (Android)</strong>.
              </li>
              <li>
                Tryk på <strong>Del-ikonet</strong> (iPhone) eller menuen (Android) → vælg{" "}
                <strong>&quot;Føj til hjemmeskærm&quot;</strong>.
              </li>
              <li>
                Nu får du dit blå <strong>Adtrack</strong>-ikon på hjemmeskærmen i fuld skærm uden
                browser-bar.
              </li>
            </ol>
          </div>

          <div className="space-y-2.5 rounded-xl bg-[#FAFBFD] p-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#111318]">
                2. iPhone Del-menu (Apple Genvej)
              </h3>
              <button
                type="button"
                onClick={() => copy("shortcut", shortcutPayload)}
                className="inline-flex items-center gap-1 text-xs font-semibold text-[#0027eb]"
              >
                {copiedId === "shortcut" ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-[#16A34A]" /> Kopieret
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" /> Kopiér endpoint
                  </>
                )}
              </button>
            </div>
            <p className="text-xs leading-relaxed text-[#475467]">
              Opret én genvej i iPhone-appen <strong>Genveje</strong> aktiveret for{" "}
              <em>&quot;Vis i delingsark&quot;</em> med handlingen{" "}
              <em>&quot;Hent indhold af URL&quot;</em>:
            </p>
            <pre className="overflow-x-auto rounded-lg border border-[#E6E8EC] bg-white p-2.5 font-mono text-[11px] text-[#344054]">
              {shortcutPayload}
            </pre>
            <p className="text-[11px] text-[#667085]">
              På Android virker deling fra Instagram automatisk via PWA Share Target.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
