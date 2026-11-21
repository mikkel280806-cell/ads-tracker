"use client";

import React, { useState } from "react";
import {
  Check,
  CheckCircle2,
  Circle,
  Copy,
  Database,
  Globe,
  Loader2,
  Server,
  Smartphone,
  Sparkles,
  Zap,
} from "lucide-react";
import type { ConnectorStatus } from "@/lib/types";
import { Badge } from "@/components/reui/badge";
import { Frame, FramePanel } from "@/components/reui/frame";

interface ConnectorsViewProps {
  status: ConnectorStatus;
}

export function ConnectorsView({ status }: ConnectorsViewProps) {
  const [testingWake, setTestingWake] = useState(false);
  const [wakeResult, setWakeResult] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const origin =
    typeof window !== "undefined" ? window.location.origin : "https://din-app.vercel.app";

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
      name: "Supabase (Database & Permanent Storage)",
      connected: status.supabase,
      icon: Database,
      description:
        "Gemmer alle ads, brands, boards, tags og selve videofilerne permanent, så Meta/Instagram-links aldrig udløber.",
      envVars: ["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"],
      actionHint: "Kør supabase/schema.sql i Supabase SQL Editor.",
    },
    {
      name: "ScrapeCreators / Apify (Link-Import)",
      connected: status.scrapeCreators || status.apify,
      icon: Globe,
      description:
        "Henter automatisk HD-video, annoncetekst, CTA, landingsside og EU-reach fra Meta Ad Library og Instagram-links.",
      envVars: ["SCRAPECREATORS_API_KEY"],
      actionHint: "Opret nøgle på scrapecreators.com (eller apify.com).",
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
    {
      name: "Cloud AI Fallback (Groq / Gemini API)",
      connected: status.groq || status.gemini,
      icon: Sparkles,
      description:
        "Valgfri fallback hvis du vil køre AI uden InstaBox — ellers brug 1-kliks 'Kopiér til Gemini' inde på hver ad.",
      envVars: ["GROQ_API_KEY", "GEMINI_API_KEY"],
      actionHint: "100% valgfri.",
    },
  ];

  const shortcutPayload = `POST ${origin}/api/import\nHeader: Content-Type: application/json\nBody: { "url": "<Genvejsinput>" }`;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight">
          Connectors & Mobil PWA
        </h1>
        <p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>
          Live status på dine forbundne tjenester, InstaBox.sh auto-wake og opsætning på telefonen.
        </p>
      </div>

      {/* Mode Banner */}
      <Frame spacing="sm">
        <FramePanel className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div className="flex items-start gap-3">
            <span
              className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full"
              style={{
                backgroundColor:
                  status.mode === "live" ? "var(--accent-live)" : "var(--accent-winner)",
              }}
            />
            <div>
              <p className="text-sm font-semibold">
                {status.mode === "live"
                  ? "Live Mode — Forbundet til Supabase"
                  : "Lokal / Demo Mode — Klar til Supabase-nøgler"}
              </p>
              <p className="mt-0.5 text-xs" style={{ color: "var(--text-secondary)" }}>
                {status.mode === "live"
                  ? "Alle ændringer og importerede annoncer gemmes direkte i din Supabase Postgres database."
                  : "Alt virker allerede i browseren. Tilføj Supabase- og ScrapeCreators-nøgler i Vercel for fuld cloud-synk på tværs af PC og telefon."}
              </p>
            </div>
          </div>
          <Badge
            size="lg"
            radius="full"
            variant={status.instabox ? "success-light" : "warning-light"}
          >
            {status.instabox ? "InstaBox Forbundet" : "Klar til opsætning"}
          </Badge>
        </FramePanel>
      </Frame>

      {/* Connector Cards in ReUI Frames */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {connectors.map((c) => {
          const Icon = c.icon;
          return (
            <Frame key={c.name} spacing="sm">
              <FramePanel className="flex flex-col justify-between gap-4">
                <div className="space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
                        style={{ backgroundColor: "var(--bg-elevated)" }}
                      >
                        <Icon className="h-4 w-4" />
                      </div>
                      <h2 className="font-display text-sm font-semibold">
                        {c.name}
                      </h2>
                    </div>

                    <Badge
                      size="sm"
                      radius="full"
                      variant={c.connected ? "success-light" : "secondary"}
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
                    </Badge>
                  </div>

                  <p
                    className="text-xs leading-relaxed"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    {c.description}
                  </p>

                  <div className="flex flex-wrap gap-1.5">
                    {c.envVars.map((env) => (
                      <code
                        key={env}
                        className="rounded-md px-2 py-0.5 font-mono text-[11px]"
                        style={{
                          backgroundColor: "var(--bg-elevated)",
                          color: "var(--text-secondary)",
                        }}
                      >
                        {env}
                      </code>
                    ))}
                  </div>
                </div>

                <div
                  className="flex flex-wrap items-center justify-between gap-2 border-t pt-3"
                  style={{ borderColor: "var(--border-subtle)" }}
                >
                  <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>
                    {c.actionHint}
                  </span>

                  {c.hasWakeTest && (
                    <button
                      type="button"
                      onClick={handleTestInstaBoxWake}
                      disabled={testingWake}
                      className="inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors hover:bg-muted"
                      style={{
                        borderColor: "var(--border-strong)",
                        color: "var(--text-primary)",
                      }}
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
                  <p
                    className="rounded-xl px-3 py-2 text-xs"
                    style={{
                      backgroundColor: "var(--bg-elevated)",
                      color: "var(--text-secondary)",
                    }}
                  >
                    {wakeResult}
                  </p>
                )}
              </FramePanel>
            </Frame>
          );
        })}
      </div>

      {/* Mobile PWA & iPhone Share Sheet Guide */}
      <Frame spacing="sm">
        <FramePanel>
          <div className="flex items-center gap-2.5">
            <Smartphone className="h-5 w-5" style={{ color: "var(--accent-live)" }} />
            <h2 className="font-display text-base font-semibold">
              Installér på telefonen (PWA) & 1-kliks deling fra Instagram
            </h2>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div
              className="space-y-2 rounded-xl p-4"
              style={{ backgroundColor: "var(--bg-elevated)" }}
            >
              <h3 className="text-xs font-semibold uppercase tracking-wider">
                1. Hent som Web App (iPhone & Android)
              </h3>
              <ol
                className="list-decimal space-y-1.5 pl-4 text-xs leading-relaxed"
                style={{ color: "var(--text-secondary)" }}
              >
                <li>
                  Åbn din Vercel-URL i <strong>Safari (iPhone)</strong> eller{" "}
                  <strong>Chrome (Android)</strong>.
                </li>
                <li>
                  Tryk på <strong>Del-ikonet</strong> (iPhone) eller menuen (Android) → vælg{" "}
                  <strong>&quot;Føj til hjemmeskærm&quot;</strong>.
                </li>
                <li>
                  Nu åbner <strong>AdVault</strong> i fuld skærm med eget ikon, bund-navigation og
                  uden browser-bar.
                </li>
              </ol>
            </div>

            <div
              className="space-y-2.5 rounded-xl p-4"
              style={{ backgroundColor: "var(--bg-elevated)" }}
            >
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold uppercase tracking-wider">
                  2. iPhone Del-menu (Apple Genvej)
                </h3>
                <button
                  type="button"
                  onClick={() => copy("shortcut", shortcutPayload)}
                  className="inline-flex items-center gap-1 text-xs"
                  style={{ color: "var(--accent-live)" }}
                >
                  {copiedId === "shortcut" ? (
                    <>
                      <Check className="h-3.5 w-3.5" /> Kopieret
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" /> Kopiér endpoint
                    </>
                  )}
                </button>
              </div>
              <p className="text-xs leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                Opret én genvej i iPhone-appen <strong>Genveje</strong> aktiveret for{" "}
                <em>&quot;Vis i delingsark&quot;</em> med handlingen{" "}
                <em>&quot;Hent indhold af URL&quot;</em>:
              </p>
              <pre
                className="overflow-x-auto rounded-lg border p-2.5 font-mono text-[11px]"
                style={{
                  backgroundColor: "var(--bg-surface)",
                  borderColor: "var(--border-subtle)",
                  color: "var(--text-secondary)",
                }}
              >
                {shortcutPayload}
              </pre>
              <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>
                På Android virker deling fra Instagram automatisk via PWA Share Target.
              </p>
            </div>
          </div>
        </FramePanel>
      </Frame>
    </div>
  );
}
