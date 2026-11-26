"use client";

import React, { useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  Activity,
  ArrowRight,
  ArrowUp,
  Bot,
  Calendar,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  Cpu,
  ExternalLink,
  Film,
  Globe,
  Image as ImageIcon,
  Layers,
  Link2,
  Loader2,
  MessageSquare,
  Package,
  Play,
  Plug,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  ShoppingBag,
  Sparkles,
  Target,
  TrendingUp,
  Wand2,
  X,
  Zap,
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
import {
  ATRIA_TRENDING_VIDEOS,
  type SnowSubView,
  type StudioSubTab,
} from "@/lib/atria-placeholders";
import { SnowMark } from "./SnowMascot";

export { SnowMark };

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
  subView?: SnowSubView;
  onSubViewChange?: (sub: SnowSubView) => void;
  onNavigateToStudio?: (tab?: StudioSubTab) => void;
}

const SUB_VIEW_TABS: Array<{ id: SnowSubView; label: string }> = [
  { id: "home", label: "Home" },
  { id: "new_task", label: "New task" },
  { id: "connectors", label: "Connectors" },
  { id: "automations", label: "Automations" },
  { id: "skills", label: "Skills" },
];

type TaskCategoryId =
  | "diagnostics"
  | "patterns"
  | "audience"
  | "competitors"
  | "creative"
  | "inspiration";

const TASK_CATEGORIES: Array<{
  id: TaskCategoryId;
  label: string;
  prompts: Array<{ title: string; subtitle: string; prompt: string }>;
}> = [
  {
    id: "diagnostics",
    label: "Diagnostics",
    prompts: [
      {
        title: "Spot key issues",
        subtitle: "Surface sudden drops in thumbstop, hold rate, and CPA across active ads",
        prompt:
          "Audit my active ads, spot the key creative bottlenecks hurting CPA right now, and recommend 3 immediate fixes.",
      },
      {
        title: "Conversion blockers",
        subtitle: "Pinpoint why high-CTR creatives fail to convert after the click",
        prompt:
          "Identify conversion blockers between my top-CTR ads and landing page expectations, and suggest message-match fixes.",
      },
      {
        title: "Fatigue check",
        subtitle: "Detect early frequency saturation before ROAS decays",
        prompt:
          "Run a fatigue check across my running creatives and give me fresh hook variations for any ad showing thumbstop decay.",
      },
      {
        title: "Kill / scale / hold",
        subtitle: "Clear spend allocation decisions backed by 3-second & hold signals",
        prompt:
          "Classify my current creatives into Kill, Scale, and Hold buckets and outline 4 Double-Down iterations for the top winner.",
      },
    ],
  },
  {
    id: "patterns",
    label: "Patterns",
    prompts: [
      {
        title: "Winning hook DNA",
        subtitle: "Extract the opening 3-second patterns driving your highest thumbstop",
        prompt:
          "Analyze my top-performing ads and break down the exact visual and spoken hook DNA behind their thumbstop rate.",
      },
      {
        title: "Format winner matrix",
        subtitle: "Compare UGC, Claymation MOA, Mini-Drama, and Static Callouts",
        prompt:
          "Compare performance across creative formats in my account and recommend which style preset to test next.",
      },
      {
        title: "Pacing & retention curve",
        subtitle: "See where viewers drop off between second 3 and second 15",
        prompt:
          "Evaluate my video retention curves and tell me how to tighten pacing between the hook and product proof.",
      },
      {
        title: "Offer framing test",
        subtitle: "Compare bundle anchoring, trial framing, and risk-reversal CTAs",
        prompt:
          "Suggest 4 high-converting offer and CTA framings tailored to my brand memory and price point.",
      },
    ],
  },
  {
    id: "audience",
    label: "Audience",
    prompts: [
      {
        title: "Core pain-point angles",
        subtitle: "Turn real customer objections into scroll-stopping first lines",
        prompt:
          "Use my brand memory and customer objections to craft 5 high-intent ad angles for cold Meta traffic.",
      },
      {
        title: "Persona script split",
        subtitle: "Adapt one winning product benefit across 3 distinct buyer personas",
        prompt:
          "Split my strongest product value prop into 3 distinct buyer personas with tailored spoken hooks for each.",
      },
      {
        title: "Review mining brief",
        subtitle: "Extract verbatim customer phrases that build instant trust",
        prompt:
          "Turn customer review language and desires from my brand profile into an authentic iPhone UGC script.",
      },
      {
        title: "Awareness stage ladder",
        subtitle: "Map unaware, problem-aware, and solution-aware ad hooks",
        prompt:
          "Build a 3-tier awareness funnel of ad concepts from problem-aware pattern interrupts to retargeting proof.",
      },
    ],
  },
  {
    id: "competitors",
    label: "Competitors",
    prompts: [
      {
        title: "Clone top swipe winners",
        subtitle: "Deconstruct longest-running competitor ads in your vault",
        prompt:
          "Find the strongest long-running competitor winners in my swipe file and build a cloned creative brief for my brand.",
      },
      {
        title: "Whitespace gap scan",
        subtitle: "Spot visual styles competitors aren't using in your category",
        prompt:
          "Scan competitor ads in my swipe file and highlight underused creative angles and visual formats we can own.",
      },
      {
        title: "Hook counter-positioning",
        subtitle: "Respond directly to category fatigue and generic alternatives",
        prompt:
          "Draft an Us vs. Them creative brief that positions our hero product cleanly against generic category alternatives.",
      },
      {
        title: "30-day launch velocity",
        subtitle: "See what formats top DTC brands are scaling this month",
        prompt:
          "Summarize the creative patterns behind the highest-reach active ads in my swipe vault right now.",
      },
    ],
  },
  {
    id: "creative",
    label: "Creative",
    prompts: [
      {
        title: "Write 5 hooks in chat",
        subtitle: "Generate 5 distinct 3-second openers ready for Creator or AI UGC",
        prompt:
          "Write 5 high-thumbstop 3-second video hooks for my hero product across curiosity, contrarian, and demo frameworks.",
      },
      {
        title: "Claymation MOA storyboard",
        subtitle: "Script a tactile stop-motion mechanism-of-action explainer",
        prompt:
          "Create a 4-scene Claymation MOA video brief explaining visually how my hero product solves the core problem.",
      },
      {
        title: "Static callout blueprint",
        subtitle: "Design a crisp pointer-style static ad with 3 benefit callouts",
        prompt:
          "Write copy, headline, and 3 crisp feature pointer callouts for a high-converting static hero ad.",
      },
      {
        title: "Founder authority script",
        subtitle: "Craft a trust-building 'why we built this' talking-head brief",
        prompt:
          "Write a 25-second Founder Authority script covering the origin story, key proof point, and risk-free guarantee.",
      },
    ],
  },
  {
    id: "inspiration",
    label: "Inspiration",
    prompts: [
      {
        title: "This week's breakout ads",
        subtitle: "Curate top active-day winners from your swipe library",
        prompt:
          "Pick the most inspiring long-running ads from my swipe file and explain why each creative concept works.",
      },
      {
        title: "Native pattern interrupts",
        subtitle: "Lo-fi Notes, sticky-note, and organic handheld formats",
        prompt:
          "Give me 3 low-production, high-CTR native ad concepts we can ship within 24 hours.",
      },
      {
        title: "Seasonal campaign angles",
        subtitle: "Fresh bundle and gifting hooks tuned for upcoming demand",
        prompt:
          "Propose 4 fresh seasonal campaign angles and bundle hooks for my product catalog.",
      },
      {
        title: "Cross-category swipe",
        subtitle: "Borrow proven visual hooks from top-performing wellness & apparel brands",
        prompt:
          "Pull cross-category creative inspiration from my swipe file and adapt the best hook structure to my brand.",
      },
    ],
  },
];

const SCHEDULE_WEEKS = ["Last week", "This week", "Next week"] as const;

const SCHEDULE_EXAMPLES = [
  {
    title: "Weekly Performance Analysis",
    cadence: "Every Monday · 08:00",
    description:
      "Summarize winning hooks, fatigued creatives, and ROAS shifts across your active Meta campaigns.",
    prompt:
      "Run my Weekly Performance Analysis: highlight scaling winners, fatigued ads, and top 3 creative actions for this week.",
    icon: Activity,
  },
  {
    title: "Weekly Competitor Insights",
    cadence: "Every Wednesday · 09:00",
    description:
      "Track newly launched competitor ads, active-day longevity leaders, and emerging messaging angles.",
    prompt:
      "Generate my Weekly Competitor Insights brief from the swipe file with top winning angles to adapt.",
    icon: Layers,
  },
  {
    title: "Daily Market Inspirations",
    cadence: "Weekdays · 08:30",
    description:
      "Morning digest of 3 high-velocity creative concepts and fresh UGC hooks ready to clone in Studio.",
    prompt:
      "Give me today's Daily Market Inspirations: 3 proven swipe picks and ready-to-test hook variations for my brand.",
    icon: Sparkles,
  },
];

interface ConnectorItem {
  id: string;
  name: string;
  category: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  defaultConnected: boolean;
}

const CONNECTOR_ITEMS: ConnectorItem[] = [
  {
    id: "meta_ads",
    name: "Meta Ads Manager",
    category: "Ad Performance & Delivery",
    description:
      "Sync live thumbstop, hold rate, ROAS, CPA, and fatigue signals directly into Snow diagnostics.",
    icon: TrendingUp,
    defaultConnected: true,
  },
  {
    id: "tiktok_ads",
    name: "TikTok Ads",
    category: "Short-Form Attribution",
    description:
      "Pull 2-second view rate, Spark Ad winners, and creator hook retention benchmarks.",
    icon: Film,
    defaultConnected: false,
  },
  {
    id: "shopify",
    name: "Shopify Store",
    category: "Catalog, AOV & Reviews",
    description:
      "Auto-sync hero SKUs, bundle pricing, product imagery, and verified customer review language.",
    icon: ShoppingBag,
    defaultConnected: true,
  },
  {
    id: "slack_snow",
    name: "Slack @Snow",
    category: "Team Briefs & Alerts",
    description:
      "Receive automated creative digests, fatigue warnings, and Studio brief links inside Slack.",
    icon: MessageSquare,
    defaultConnected: false,
  },
];

interface AutomationItem {
  id: string;
  title: string;
  schedule: string;
  channel: string;
  description: string;
  prompt: string;
  defaultEnabled: boolean;
}

const AUTOMATION_ITEMS: AutomationItem[] = [
  {
    id: "weekly_brief",
    title: "Weekly Performance Brief",
    schedule: "Mondays at 08:00",
    channel: "Snow Inbox & Slack",
    description:
      "Ranks every active ad by thumbstop, hold rate, and spend efficiency, then queues 4 Double-Down briefs.",
    prompt:
      "Run the Weekly Performance Brief now: rank my active ads and recommend 4 Double-Down creative briefs.",
    defaultEnabled: true,
  },
  {
    id: "competitor_radar",
    title: "Competitor Launch Radar",
    schedule: "Wednesdays at 09:00",
    channel: "Snow Inbox",
    description:
      "Scans your tracked brands for new 14+ day winners and extracts their hook structure for cloning.",
    prompt:
      "Run the Competitor Launch Radar now: surface top active competitor ads and create a clone-ready brief.",
    defaultEnabled: true,
  },
  {
    id: "fatigue_alert",
    title: "Creative Fatigue Alert",
    schedule: "Daily check at 10:00",
    channel: "Instant Alert",
    description:
      "Flags any scaling winner whose CPA rises >18% or thumbstop drops, paired with 3 replacement hooks.",
    prompt:
      "Run the Creative Fatigue Alert check now: identify any fatiguing ads and give me 3 replacement hooks immediately.",
    defaultEnabled: false,
  },
];

interface SkillItem {
  id: string;
  title: string;
  tag: string;
  description: string;
  actionLabel: string;
  mode: "chat" | "studio_miner" | "studio_video";
  presetId?: VideoStylePresetId;
  prompt: string;
  icon: React.ComponentType<{ className?: string }>;
}

const STRATEGIST_SKILLS: SkillItem[] = [
  {
    id: "url_miner",
    title: "URL & Review Miner",
    tag: "Research",
    description:
      "Scrape any PDP or landing page to extract buyer pain points, objections, USPs, and ad angles.",
    actionLabel: "Open URL Miner",
    mode: "studio_miner",
    prompt:
      "Mine my primary product positioning to extract top pain points, customer objections, USPs, and 3 video angles.",
    icon: Globe,
  },
  {
    id: "hook_engine",
    title: "5-Hook Variant Engine",
    tag: "Copy & Hooks",
    description:
      "Turn one winning concept into 5 distinct 3-second openings across curiosity, proof, and contrarian hooks.",
    actionLabel: "Run in chat",
    mode: "chat",
    prompt:
      "Run the 5-Hook Variant Engine on my hero product and deliver 5 high-thumbstop opening lines with visual directions.",
    icon: Zap,
  },
  {
    id: "ad_cloner",
    title: "Competitor Ad Cloner",
    tag: "Swipe → Brief",
    description:
      "Deconstruct a winning competitor ad from your swipe vault and adapt its beat-by-beat pacing to your brand.",
    actionLabel: "Run in chat",
    mode: "chat",
    prompt:
      "Pick the highest-performing competitor ad in my swipe file, deconstruct why it wins, and clone its brief for my brand.",
    icon: Layers,
  },
  {
    id: "roas_double_down",
    title: "ROAS Double-Down",
    tag: "Scaling",
    description:
      "Analyze your top-converting ad and generate 4 controlled iterations to scale spend without losing efficiency.",
    actionLabel: "Run in chat",
    mode: "chat",
    prompt:
      "Analyze my highest-ROAS creative and generate 4 Double-Down iterations across new hooks and visual presets.",
    icon: TrendingUp,
  },
  {
    id: "lp_audit",
    title: "Landing Page Audit",
    tag: "Conversion",
    description:
      "Spot above-the-fold friction, missing social proof, and message-match gaps hurting post-click CVR.",
    actionLabel: "Run in chat",
    mode: "chat",
    prompt:
      "Audit my brand's landing page message-match against cold Meta traffic and suggest 4 high-impact conversion improvements.",
    icon: Target,
  },
  {
    id: "claymation_scripter",
    title: "Claymation MOA Scripter",
    tag: "Video Studio",
    description:
      "Script a tactile stop-motion Mechanism-of-Action video ad built to stop scrolling in under 0.8 seconds.",
    actionLabel: "Open in Studio",
    mode: "studio_video",
    presetId: "claymation_moa",
    prompt:
      "Write a 4-scene Claymation MOA script showing visually how my product works from problem to relief.",
    icon: Wand2,
  },
];

function SnowCircleBadge({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  if (size === "lg") {
    return (
      <div className="relative flex items-center justify-center">
        <div className="pointer-events-none absolute h-20 w-20 rounded-full bg-gradient-to-tr from-[#0027eb]/22 via-[#38BDF8]/18 to-[#93C5FD]/22 blur-xl" />
        <div className="relative flex h-16 w-16 items-center justify-center rounded-full border border-[#DCE4FF] bg-white shadow-[0_8px_28px_-6px_rgba(0,39,235,0.24),0_2px_8px_rgba(15,23,42,0.06)]">
          <SnowMark className="h-8 w-8 text-[#0027eb]" />
        </div>
      </div>
    );
  }
  if (size === "sm") {
    return (
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-[#DCE4FF] bg-white shadow-2xs">
        <SnowMark className="h-3.5 w-3.5 text-[#0027eb]" />
      </span>
    );
  }
  return (
    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[#DCE4FF] bg-white shadow-xs">
      <SnowMark className="h-4 w-4 text-[#0027eb]" />
    </span>
  );
}

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
                      className="group relative aspect-[4/5] overflow-hidden rounded-2xl border border-[#ECEFF5] bg-[#0F172A]"
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
              className="overflow-hidden rounded-2xl border border-[#DCE4FF] bg-white shadow-[0_6px_24px_-12px_rgba(0,39,235,0.18)]"
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
                  Open in Studio
                </button>
              </div>

              <div className="grid grid-cols-2 gap-1.5 border-t border-[#F1F5F9] bg-[#FAFBFD] p-2.5 sm:grid-cols-4">
                {card.scenes.slice(0, 4).map((sc) => (
                  <div
                    key={sc.id}
                    className="flex min-h-[100px] flex-col justify-between rounded-xl bg-[#0F172A] p-2.5 text-white"
                  >
                    <span className="font-mono-num text-[9px] font-bold uppercase tracking-wider text-white/55">
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
              className="space-y-2.5 rounded-2xl border border-[#ECEFF5] bg-[#FAFBFD] p-3.5"
            >
              <p className="truncate font-display text-[13px] font-bold text-[#0F172A]">
                {ins.title}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {ins.painPoints.slice(0, 3).map((p, i) => (
                  <span
                    key={`p-${i}`}
                    className="rounded-full bg-[#FEF3C7] px-2.5 py-1 text-[11px] font-medium text-[#B45309]"
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
              className="space-y-2.5 rounded-2xl border border-[#ECEFF5] bg-white p-3.5"
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
  subView,
  onSubViewChange,
  onNavigateToStudio,
}: SnowAssistantProps) {
  const [internalSubView, setInternalSubView] = useState<SnowSubView>(
    subView ?? "home"
  );

  const activeSubView: SnowSubView =
    subView !== undefined && onSubViewChange ? subView : internalSubView;

  const setActiveSubView = (next: SnowSubView) => {
    setInternalSubView(next);
    onSubViewChange?.(next);
  };

  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [plusOpen, setPlusOpen] = useState(false);
  const [createMenuOpen, setCreateMenuOpen] = useState(false);
  const [brandMenuOpen, setBrandMenuOpen] = useState(false);
  const [pickerMode, setPickerMode] = useState<"ad" | "product" | "url" | null>(
    null
  );
  const [pickerSearch, setPickerSearch] = useState("");
  const [attachedAd, setAttachedAd] = useState<Ad | null>(null);
  const [attachedProduct, setAttachedProduct] =
    useState<ProductPreview | null>(null);
  const [urlToMine, setUrlToMine] = useState("");

  // Sub-view interactive state
  const [scheduleWeekIdx, setScheduleWeekIdx] = useState(1); // "This week"
  const [activeTaskCategory, setActiveTaskCategory] =
    useState<TaskCategoryId>("diagnostics");
  const [connectedMap, setConnectedMap] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(
      CONNECTOR_ITEMS.map((c) => [c.id, c.defaultConnected])
    )
  );
  const [automationEnabledMap, setAutomationEnabledMap] = useState<
    Record<string, boolean>
  >(() =>
    Object.fromEntries(
      AUTOMATION_ITEMS.map((a) => [a.id, a.defaultEnabled])
    )
  );

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
          ? `Mine this URL: ${urlToMine}`
          : `Clone this ad from ${attachedAd?.brand_name}`),
      createdAt: new Date().toISOString(),
      attachments: attachments.length > 0 ? attachments : undefined,
    };

    const nextMessages = [...messages, userMsg];
    onMessagesChange(nextMessages);
    if (!overridePrompt) setInput("");
    setSending(true);
    setPlusOpen(false);
    setCreateMenuOpen(false);

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
        throw new Error(data?.error || "Request failed");
      }
    } catch {
      onMessagesChange([
        ...nextMessages,
        {
          id: `err-${Date.now()}`,
          role: "assistant",
          createdAt: new Date().toISOString(),
          content: "Please try again in a moment.",
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

  const navigateStudio = (tab?: StudioSubTab) => {
    if (onNavigateToStudio) {
      onNavigateToStudio(tab);
      return;
    }
    onOpenBriefInStudio({
      title: tab === "static" ? "Static Ad Concept" : "Video Ad Concept",
      stylePresetId: "iphone_ugc",
      productTitle: brandMemory?.products?.[0]?.title,
    });
  };

  const handleResetToNewTask = () => {
    onMessagesChange([]);
    setActiveSubView("new_task");
  };

  const currentTaskCategory =
    TASK_CATEGORIES.find((c) => c.id === activeTaskCategory) ??
    TASK_CATEGORIES[0];

  return (
    <div
      className="relative flex h-full w-full flex-col overflow-hidden rounded-2xl"
      style={{
        backgroundColor: "#F7F8FB",
        backgroundImage:
          "radial-gradient(ellipse 78% 42% at 50% 0%, rgba(0,39,235,0.065) 0%, rgba(56,189,248,0.045) 48%, transparent 78%), radial-gradient(rgba(15,23,42,0.055) 1px, transparent 1px)",
        backgroundSize: "100% 100%, 22px 22px",
      }}
    >
      <div className="mx-auto flex h-full w-full max-w-[840px] flex-col px-3 pt-3 pb-4 sm:px-6 sm:pt-4">
        {/* TOP UTILITY STRIP */}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          {/* Brand context selector pill + dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setBrandMenuOpen((v) => !v)}
              className="inline-flex items-center gap-2 rounded-full border border-[#E2E8F0] bg-white px-3 py-1.5 text-[12px] font-medium text-[#0F172A] shadow-2xs transition-colors hover:border-[#0027eb]/40"
            >
              {brandMemory?.logoUrl ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={brandMemory.logoUrl}
                  alt={brandMemory.brandName}
                  className="h-4 w-4 rounded-full border border-[#E2E8F0] object-cover"
                />
              ) : (
                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[#EEF2FF] text-[9.5px] font-bold text-[#0027eb]">
                  {brandMemory ? (
                    brandMemory.brandName.slice(0, 1).toUpperCase()
                  ) : (
                    <Globe className="h-2.5 w-2.5" />
                  )}
                </span>
              )}
              <span className="max-w-[180px] truncate">
                {brandMemory
                  ? brandMemory.brandName
                  : "Select a brand to work with"}
              </span>
              <ChevronDown
                className={`h-3.5 w-3.5 text-[#64748B] transition-transform ${
                  brandMenuOpen ? "rotate-180" : ""
                }`}
              />
            </button>

            {brandMenuOpen && (
              <div className="absolute left-0 top-10 z-30 w-64 rounded-2xl border border-[#E2E8F0] bg-white p-2 shadow-[0_16px_40px_-12px_rgba(15,23,42,0.18)]">
                {brandMemory ? (
                  <div className="mb-1.5 rounded-xl bg-[#F7F8FB] p-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-[12px] font-bold text-[#0F172A]">
                        {brandMemory.brandName}
                      </p>
                      <span className="rounded-full bg-[#EEF2FF] px-2 py-0.5 text-[10px] font-semibold text-[#0027eb]">
                        Active
                      </span>
                    </div>
                    <p className="mt-0.5 truncate text-[11px] text-[#64748B]">
                      {brandMemory.domain} · {brandMemory.category}
                    </p>
                    <p className="mt-1.5 text-[10.5px] text-[#64748B]">
                      {brandMemory.products.length} products ·{" "}
                      {brandMemory.usps.length} USPs synced
                    </p>
                  </div>
                ) : (
                  <div className="mb-1.5 rounded-xl bg-[#F7F8FB] p-2.5">
                    <p className="text-[11.5px] font-semibold text-[#0F172A]">
                      No brand profile selected
                    </p>
                    <p className="mt-0.5 text-[10.5px] text-[#64748B]">
                      Pick or scan a storefront so Snow tailors every brief and hook.
                    </p>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setBrandMenuOpen(false);
                    onOpenBrandMemory();
                  }}
                  className="flex w-full items-center justify-between gap-2 rounded-xl px-2.5 py-2 text-left text-[12px] font-semibold text-[#0F172A] transition-colors hover:bg-[#EEF2FF] hover:text-[#0027eb]"
                >
                  <span className="inline-flex items-center gap-2">
                    <RefreshCw className="h-3.5 w-3.5 text-[#0027eb]" />
                    {brandMemory ? "Inspect or switch brand" : "Choose brand profile"}
                  </span>
                  <ArrowRight className="h-3.5 w-3.5 opacity-60" />
                </button>
              </div>
            )}
          </div>

          {/* Right side: Sub-view switcher pills + New task reset when chatting */}
          <div className="flex flex-wrap items-center gap-1.5">
            <div className="flex items-center gap-1 rounded-full border border-[#E2E8F0] bg-white/90 p-1 shadow-2xs">
              {SUB_VIEW_TABS.map((tab) => {
                const isActive =
                  messages.length === 0 && activeSubView === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    data-no-glass="true"
                    onClick={() => {
                      if (messages.length > 0) onMessagesChange([]);
                      setActiveSubView(tab.id);
                    }}
                    className={`rounded-full px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                      isActive
                        ? "bg-[#0F172A] text-white"
                        : "text-[#64748B] hover:bg-[#F1F5F9] hover:text-[#0F172A]"
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {messages.length > 0 && (
              <button
                type="button"
                onClick={handleResetToNewTask}
                title="New task"
                className="inline-flex items-center gap-1 rounded-full border border-[#DCE4FF] bg-[#EEF2FF] px-3 py-1.5 text-[11px] font-semibold text-[#0027eb] transition-colors hover:bg-[#0027eb] hover:text-white"
              >
                <RotateCcw className="h-3 w-3" />
                + New task
              </button>
            )}
          </div>
        </div>

        {/* MAIN CONTENT: SUB-VIEWS WHEN NO MESSAGES, OR ACTIVE CHAT THREAD */}
        {messages.length === 0 ? (
          <div className="workspace-scroll min-h-0 flex-1 overflow-y-auto pr-0.5">
            {activeSubView === "home" && renderHomeView()}
            {activeSubView === "new_task" && renderNewTaskView()}
            {activeSubView === "connectors" && renderConnectorsView()}
            {activeSubView === "automations" && renderAutomationsView()}
            {activeSubView === "skills" && renderSkillsView()}
          </div>
        ) : (
          <>
            <div className="workspace-scroll mb-4 min-h-0 flex-1 space-y-4 overflow-y-auto pr-1">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex items-start gap-2.5 ${
                    msg.role === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  {msg.role === "assistant" && (
                    <div className="mt-1">
                      <SnowCircleBadge size="md" />
                    </div>
                  )}
                  <div
                    className={`max-w-[90%] rounded-2xl px-4 py-3 sm:max-w-[85%] ${
                      msg.role === "user"
                        ? "bg-[#0F172A] text-white"
                        : "border border-[#ECEFF5] bg-white text-[#0F172A] shadow-2xs"
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
                  <SnowCircleBadge size="md" />
                  <div className="inline-flex items-center gap-2 rounded-full border border-[#ECEFF5] bg-white px-3.5 py-1.5 text-xs font-medium text-[#64748B]">
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-[#0027eb]" />
                    Snow is thinking...
                  </div>
                </div>
              )}
              <div ref={endRef} />
            </div>

            <div className="mx-auto w-full max-w-[700px]">{renderComposer()}</div>
          </>
        )}
      </div>
    </div>
  );

  function renderHomeView() {
    const trendingPreview = ATRIA_TRENDING_VIDEOS.slice(0, 4);
    const activeCount = analyticsRows.length;

    return (
      <div className="space-y-5 pb-6">
        {/* 1. MOST RECOMMENDED HERO CARD */}
        <section className="overflow-hidden rounded-[18px] border border-white/10 bg-[#070B16] p-5 text-white shadow-[0_20px_50px_-20px_rgba(5,8,17,0.65)]">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div className="space-y-2.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-[#B8FF3B] px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-[#050811]">
                  NEW
                </span>
                <span className="text-[11px] font-medium text-white/60">
                  Most recommended
                </span>
              </div>

              <h2 className="font-display text-[22px] font-bold tracking-[-0.02em] text-white sm:text-[24px]">
                Generate video ads
              </h2>

              <div className="flex flex-wrap items-center gap-1.5">
                {["Realistic UGC", "Live action", "3D & Claymation"].map(
                  (tag) => (
                    <span
                      key={tag}
                      className="rounded-full border border-white/12 bg-white/[0.06] px-2.5 py-0.5 text-[11px] font-medium text-white/80"
                    >
                      {tag}
                    </span>
                  )
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={() => navigateStudio("video")}
              className="adtrack-btn-primary inline-flex shrink-0 items-center justify-center gap-2 rounded-full px-5 py-2.5 text-[13px] font-semibold text-white"
            >
              <Film className="h-4 w-4" />
              Try video ads
            </button>
          </div>

          {/* 4-column edge-to-edge video preview strip */}
          <div className="mt-5 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            {trendingPreview.map((tv) => (
              <button
                key={tv.id}
                type="button"
                data-no-glass="true"
                onClick={() =>
                  onOpenBriefInStudio({
                    title: `Clone: ${tv.brandName}`,
                    angle: tv.hookLine,
                    stylePresetId: tv.presetId,
                    productTitle: brandMemory?.products?.[0]?.title,
                    clonedFromAd: {
                      id: tv.id,
                      brandName: tv.brandName,
                      headline: tv.styleTag,
                      primaryText: tv.hookLine,
                      mediaUrl: tv.thumbnailUrl,
                      thumbnailUrl: tv.thumbnailUrl,
                      activeDays: tv.activeDays,
                    },
                  })
                }
                className="group relative aspect-[3/4] overflow-hidden rounded-xl border border-white/10 bg-[#0F172A] text-left transition-transform hover:-translate-y-0.5"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={tv.thumbnailUrl}
                  alt={tv.brandName}
                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#050811]/90 via-[#050811]/20 to-black/35" />

                <div className="absolute inset-x-2 top-2 flex items-center justify-between gap-1">
                  <span className="truncate rounded-full bg-black/55 px-2 py-0.5 text-[10px] font-semibold text-white backdrop-blur-sm">
                    {tv.brandName}
                  </span>
                  <span className="shrink-0 rounded-full bg-[#0027eb]/90 px-1.5 py-0.5 font-mono-num text-[9.5px] font-semibold text-white">
                    {tv.durationLabel}
                  </span>
                </div>

                <div className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity group-hover:opacity-100">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/95 text-[#0027eb] shadow-md">
                    <Play className="ml-0.5 h-4 w-4 fill-current" />
                  </span>
                </div>

                <div className="absolute inset-x-2.5 bottom-2.5 space-y-1">
                  <span className="inline-block rounded-full bg-white/15 px-2 py-0.5 text-[9.5px] font-semibold text-white backdrop-blur-sm">
                    {tv.styleTag}
                  </span>
                  <p className="line-clamp-2 text-[11px] font-medium leading-snug text-white/90">
                    {tv.hookLine}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </section>

        {/* 2. RECENT TEST ANALYSIS BANNER */}
        <section className="flex flex-col justify-between gap-4 rounded-[18px] border border-[#DCE4FF] bg-[#F4F7FF] p-5 sm:flex-row sm:items-center">
          <div className="flex items-start gap-3.5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#DCE4FF] bg-white text-[#0027eb] shadow-2xs">
              <Sparkles className="h-4.5 w-4.5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-display text-[15px] font-bold text-[#0F172A]">
                  Recent Test Analysis
                </h3>
                {activeCount > 0 && (
                  <span className="rounded-full bg-[#EEF2FF] px-2 py-0.5 font-mono-num text-[10px] font-semibold text-[#0027eb]">
                    {activeCount} creatives tracked
                  </span>
                )}
              </div>
              <p className="mt-1 max-w-xl text-[12.5px] leading-relaxed text-[#475569]">
                Let Snow inspect your latest creative tests, diagnose thumbstop or
                hold-rate drop-offs, and surface the next winning iteration to scale.
              </p>
            </div>
          </div>

          <button
            type="button"
            data-no-glass="true"
            onClick={() =>
              void sendMessage(
                "Run a Recent Test Analysis on my active creatives: pinpoint winners to scale, spot early fatigue, and propose 3 next test iterations."
              )
            }
            className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-full bg-[#0F172A] px-4 py-2 text-[12.5px] font-semibold text-white transition-colors hover:bg-[#0027eb]"
          >
            Set up now
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </section>

        {/* 3. SNOW'S SCHEDULE */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-[#0027eb]" />
              <h3 className="font-display text-[15px] font-bold text-[#0F172A]">
                Snow&apos;s schedule
              </h3>
            </div>

            <div className="inline-flex items-center gap-1 rounded-full border border-[#E2E8F0] bg-white px-2 py-1 text-[11.5px] font-semibold text-[#0F172A]">
              <button
                type="button"
                data-no-glass="true"
                onClick={() => setScheduleWeekIdx((i) => Math.max(0, i - 1))}
                aria-label="Previous week"
                className="rounded-full p-0.5 text-[#64748B] hover:bg-[#F1F5F9] hover:text-[#0F172A]"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
              <span className="min-w-[74px] text-center">
                {SCHEDULE_WEEKS[scheduleWeekIdx]}
              </span>
              <button
                type="button"
                data-no-glass="true"
                onClick={() =>
                  setScheduleWeekIdx((i) =>
                    Math.min(SCHEDULE_WEEKS.length - 1, i + 1)
                  )
                }
                aria-label="Next week"
                className="rounded-full p-0.5 text-[#64748B] hover:bg-[#F1F5F9] hover:text-[#0F172A]"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          <div className="rounded-2xl border border-dashed border-[#DCE4FF] bg-white/85 px-4 py-5 text-center">
            <p className="text-[12.5px] font-medium text-[#64748B]">
              Nothing scheduled for {SCHEDULE_WEEKS[scheduleWeekIdx].toLowerCase()}{" "}
              yet. Try the examples below.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {SCHEDULE_EXAMPLES.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.title}
                  type="button"
                  onClick={() => void sendMessage(item.prompt)}
                  className="group flex flex-col justify-between rounded-2xl border border-[#E2E8F0] bg-white p-4 text-left transition-all hover:border-[#0027eb]/50 hover:shadow-[0_10px_28px_-14px_rgba(0,39,235,0.22)]"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#EEF2FF] text-[#0027eb]">
                        <Icon className="h-4 w-4" />
                      </span>
                      <span className="font-mono-num text-[10px] font-medium text-[#64748B]">
                        {item.cadence}
                      </span>
                    </div>
                    <h4 className="mt-3 font-display text-[13.5px] font-bold text-[#0F172A] group-hover:text-[#0027eb]">
                      {item.title}
                    </h4>
                    <p className="mt-1 text-[11.5px] leading-relaxed text-[#64748B]">
                      {item.description}
                    </p>
                  </div>

                  <div className="mt-3 flex items-center gap-1 text-[11px] font-semibold text-[#0027eb]">
                    Run briefing
                    <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* Bottom quick composer on Home */}
        <div className="pt-1">{renderComposer()}</div>
      </div>
    );
  }

  function renderNewTaskView() {
    return (
      <div className="flex flex-col items-center pb-8 pt-4">
        <SnowCircleBadge size="lg" />

        <h1 className="mt-4 font-geist-serif text-[36px] font-normal leading-tight tracking-[-0.02em] text-[#0F172A]">
          Ask Snow
        </h1>

        <p className="mt-1.5 text-center text-[13px] italic text-[#64748B]">
          Trained on live Meta creative signals &amp; winning DTC patterns
        </p>

        {/* Brand context badge */}
        <button
          type="button"
          onClick={onOpenBrandMemory}
          className="mt-4 inline-flex items-center gap-2 rounded-full border border-[#DCE4FF] bg-[#EEF2FF]/70 px-3 py-1 text-[11.5px] font-semibold text-[#0027eb] transition-colors hover:bg-[#EEF2FF]"
        >
          <Sparkles className="h-3 w-3" />
          {brandMemory
            ? `Context: ${brandMemory.brandName}`
            : "Select a brand context"}
        </button>

        {/* Inline Floating Composer */}
        <div className="mt-5 w-full max-w-[680px]">{renderComposer()}</div>

        {/* Explore what Snow can do */}
        <div className="mt-8 w-full max-w-[740px] space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-display text-[13px] font-bold uppercase tracking-wider text-[#64748B]">
              Explore what Snow can do
            </h2>
          </div>

          {/* 6 Category Tabs */}
          <div className="flex flex-wrap gap-1.5">
            {TASK_CATEGORIES.map((cat) => {
              const active = cat.id === currentTaskCategory.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  data-no-glass="true"
                  onClick={() => setActiveTaskCategory(cat.id)}
                  className={`rounded-full px-3.5 py-1.5 text-[12px] font-semibold transition-colors ${
                    active
                      ? "bg-[#0027eb] text-white shadow-xs"
                      : "border border-[#E2E8F0] bg-white text-[#475569] hover:border-[#0027eb]/40 hover:text-[#0F172A]"
                  }`}
                >
                  {cat.label}
                </button>
              );
            })}
          </div>

          {/* 4 Clickable Prompt Cards/Rows per Tab */}
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            {currentTaskCategory.prompts.map((item) => (
              <button
                key={item.title}
                type="button"
                onClick={() => void sendMessage(item.prompt)}
                className="group flex items-start justify-between gap-3 rounded-2xl border border-[#E2E8F0] bg-white px-4 py-3.5 text-left transition-all hover:border-[#0027eb]/55 hover:shadow-[0_8px_24px_-12px_rgba(0,39,235,0.22)]"
              >
                <div className="flex min-w-0 items-start gap-2.5">
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-[#EEF2FF] text-[#0027eb]">
                    <Sparkles className="h-3.5 w-3.5" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-[13px] font-semibold text-[#0F172A] group-hover:text-[#0027eb]">
                      {item.title}
                    </p>
                    <p className="mt-0.5 line-clamp-2 text-[11.5px] leading-snug text-[#64748B]">
                      {item.subtitle}
                    </p>
                  </div>
                </div>
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#F1F5F9] text-[#64748B] transition-colors group-hover:bg-[#0027eb] group-hover:text-white">
                  <ArrowUp className="h-3.5 w-3.5" />
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  function renderConnectorsView() {
    return (
      <div className="space-y-4 pb-8">
        <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
          <div>
            <h2 className="font-display text-[20px] font-bold tracking-[-0.02em] text-[#0F172A]">
              Connectors
            </h2>
            <p className="mt-0.5 text-[12.5px] text-[#64748B]">
              Plug live ad accounts, commerce catalogs, and team channels into Snow.
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#EEF2FF] px-3 py-1 text-[11px] font-semibold text-[#0027eb]">
            <Plug className="h-3.5 w-3.5" />
            {Object.values(connectedMap).filter(Boolean).length} of{" "}
            {CONNECTOR_ITEMS.length} connected
          </span>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {CONNECTOR_ITEMS.map((conn) => {
            const Icon = conn.icon;
            const isConnected = !!connectedMap[conn.id];
            return (
              <div
                key={conn.id}
                className="flex flex-col justify-between rounded-2xl border border-[#E2E8F0] bg-white p-4 shadow-2xs"
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#DCE4FF] bg-[#EEF2FF] text-[#0027eb]">
                        <Icon className="h-4.5 w-4.5" />
                      </span>
                      <div>
                        <h3 className="font-display text-[14px] font-bold text-[#0F172A]">
                          {conn.name}
                        </h3>
                        <p className="text-[11px] font-medium text-[#64748B]">
                          {conn.category}
                        </p>
                      </div>
                    </div>

                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10.5px] font-semibold ${
                        isConnected
                          ? "bg-[#ECFDF3] text-[#15803D]"
                          : "bg-[#F1F5F9] text-[#64748B]"
                      }`}
                    >
                      {isConnected && <Check className="h-3 w-3" />}
                      {isConnected ? "Connected" : "Not connected"}
                    </span>
                  </div>

                  <p className="mt-3 text-[12px] leading-relaxed text-[#475569]">
                    {conn.description}
                  </p>
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-[#F1F5F9] pt-3">
                  <button
                    type="button"
                    data-no-glass="true"
                    onClick={() =>
                      setConnectedMap((prev) => ({
                        ...prev,
                        [conn.id]: !prev[conn.id],
                      }))
                    }
                    className={`rounded-full px-3.5 py-1.5 text-[11.5px] font-semibold transition-colors ${
                      isConnected
                        ? "border border-[#E2E8F0] bg-white text-[#475569] hover:bg-[#F8FAFC]"
                        : "bg-[#0027eb] text-white hover:bg-[#0021cc]"
                    }`}
                  >
                    {isConnected ? "Disconnect" : "Connect"}
                  </button>

                  {isConnected && (
                    <button
                      type="button"
                      onClick={() =>
                        void sendMessage(
                          `Check my ${conn.name} data and summarize the latest actionable signals for my creatives.`
                        )
                      }
                      className="inline-flex items-center gap-1 text-[11.5px] font-semibold text-[#0027eb] hover:underline"
                    >
                      Ask Snow
                      <ArrowRight className="h-3 w-3" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  function renderAutomationsView() {
    return (
      <div className="space-y-4 pb-8">
        <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
          <div>
            <h2 className="font-display text-[20px] font-bold tracking-[-0.02em] text-[#0F172A]">
              Automations
            </h2>
            <p className="mt-0.5 text-[12.5px] text-[#64748B]">
              Scheduled creative intelligence briefings and fatigue watchdogs powered by Snow.
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#EEF2FF] px-3 py-1 text-[11px] font-semibold text-[#0027eb]">
            <Clock className="h-3.5 w-3.5" />
            {Object.values(automationEnabledMap).filter(Boolean).length} active schedules
          </span>
        </div>

        <div className="space-y-3">
          {AUTOMATION_ITEMS.map((auto) => {
            const enabled = !!automationEnabledMap[auto.id];
            return (
              <div
                key={auto.id}
                className="flex flex-col justify-between gap-4 rounded-2xl border border-[#E2E8F0] bg-white p-4 shadow-2xs sm:flex-row sm:items-center"
              >
                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#EEF2FF] text-[#0027eb]">
                      <Bot className="h-4 w-4" />
                    </span>
                    <h3 className="font-display text-[14.5px] font-bold text-[#0F172A]">
                      {auto.title}
                    </h3>
                    <span className="rounded-full bg-[#F1F5F9] px-2.5 py-0.5 text-[10.5px] font-semibold text-[#475569]">
                      {auto.schedule}
                    </span>
                    <span className="rounded-full bg-[#EEF2FF] px-2 py-0.5 text-[10.5px] font-semibold text-[#0027eb]">
                      {auto.channel}
                    </span>
                  </div>
                  <p className="max-w-xl text-[12px] leading-relaxed text-[#64748B]">
                    {auto.description}
                  </p>
                </div>

                <div className="flex shrink-0 items-center gap-3">
                  <button
                    type="button"
                    role="switch"
                    aria-checked={enabled}
                    aria-label={`Toggle ${auto.title}`}
                    data-no-glass="true"
                    onClick={() =>
                      setAutomationEnabledMap((prev) => ({
                        ...prev,
                        [auto.id]: !prev[auto.id],
                      }))
                    }
                    className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
                      enabled ? "bg-[#0027eb]" : "bg-[#CBD5E1]"
                    }`}
                  >
                    <span
                      className={`inline-block h-4.5 w-4.5 transform rounded-full bg-white shadow-xs transition-transform ${
                        enabled ? "translate-x-5.5" : "translate-x-1"
                      }`}
                    />
                  </button>

                  <button
                    type="button"
                    data-no-glass="true"
                    onClick={() => void sendMessage(auto.prompt)}
                    className="inline-flex items-center gap-1.5 rounded-full bg-[#0F172A] px-3.5 py-1.5 text-[11.5px] font-semibold text-white transition-colors hover:bg-[#0027eb]"
                  >
                    <Play className="h-3 w-3 fill-current" />
                    Run now
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  function renderSkillsView() {
    return (
      <div className="space-y-4 pb-8">
        <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
          <div>
            <h2 className="font-display text-[20px] font-bold tracking-[-0.02em] text-[#0F172A]">
              Creative Strategist Skills
            </h2>
            <p className="mt-0.5 text-[12.5px] text-[#64748B]">
              One-click workflows combining your brand memory, swipe vault, and Studio presets.
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#EEF2FF] px-3 py-1 text-[11px] font-semibold text-[#0027eb]">
            <Cpu className="h-3.5 w-3.5" />6 specialized skills
          </span>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {STRATEGIST_SKILLS.map((skill) => {
            const Icon = skill.icon;
            return (
              <button
                key={skill.id}
                type="button"
                onClick={() => {
                  if (skill.mode === "studio_miner") {
                    navigateStudio("miner");
                    return;
                  }
                  if (skill.mode === "studio_video") {
                    onOpenBriefInStudio({
                      title: skill.title,
                      angle:
                        brandMemory?.painPoints?.[0] ||
                        "Visual mechanism-of-action explainer",
                      stylePresetId: skill.presetId ?? "claymation_moa",
                      productTitle: brandMemory?.products?.[0]?.title,
                    });
                    return;
                  }
                  void sendMessage(skill.prompt);
                }}
                className="group flex flex-col justify-between rounded-2xl border border-[#E2E8F0] bg-white p-4 text-left transition-all hover:border-[#0027eb]/55 hover:shadow-[0_12px_30px_-14px_rgba(0,39,235,0.22)]"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#EEF2FF] text-[#0027eb]">
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="rounded-full border border-[#E2E8F0] bg-[#F8FAFC] px-2.5 py-0.5 text-[10px] font-semibold text-[#475569]">
                      {skill.tag}
                    </span>
                  </div>

                  <h3 className="mt-3 font-display text-[14px] font-bold text-[#0F172A] group-hover:text-[#0027eb]">
                    {skill.title}
                  </h3>
                  <p className="mt-1 text-[11.5px] leading-relaxed text-[#64748B]">
                    {skill.description}
                  </p>
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-[#F1F5F9] pt-2.5 text-[11.5px] font-semibold text-[#0027eb]">
                  <span>{skill.actionLabel}</span>
                  {skill.mode === "chat" ? (
                    <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                  ) : (
                    <ExternalLink className="h-3.5 w-3.5" />
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  function renderComposer() {
    return (
      <div className="relative rounded-[20px] border border-[#E2E8F0] bg-white p-4 pb-3 shadow-[0_12px_36px_-12px_rgba(0,39,235,0.14)]">
        {/* Selected Attachment Pills */}
        {(attachedAd || attachedProduct || urlToMine) && (
          <div className="mb-2 flex flex-wrap gap-1.5">
            {attachedAd && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#0027eb]/[0.08] px-2.5 py-0.5 text-[11px] font-semibold text-[#0027eb]">
                Swipe: {attachedAd.brand_name}
                <button
                  type="button"
                  onClick={() => setAttachedAd(null)}
                  aria-label="Remove attached ad"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
            {attachedProduct && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#F1F5F9] px-2.5 py-0.5 text-[11px] font-semibold text-[#0F172A]">
                Product: {attachedProduct.title}
                <button
                  type="button"
                  onClick={() => setAttachedProduct(null)}
                  aria-label="Remove attached product"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
            {urlToMine && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#F1F5F9] px-2.5 py-0.5 font-mono-num text-[11px] text-[#0F172A]">
                {urlToMine}
                <button
                  type="button"
                  onClick={() => setUrlToMine("")}
                  aria-label="Remove attached URL"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
          </div>
        )}

        {/* Popover Picker */}
        {pickerMode && (
          <div className="mb-3 rounded-xl border border-[#ECEFF5] bg-[#FAFBFD] p-2.5">
            <div className="mb-2 flex items-center justify-between px-1">
              <span className="text-[11px] font-semibold text-[#64748B]">
                {pickerMode === "ad"
                  ? "Attach Swipe-Ad"
                  : pickerMode === "product"
                    ? "Attach Product"
                    : "Attach Brand / Product URL"}
              </span>
              <button
                type="button"
                onClick={() => setPickerMode(null)}
                aria-label="Close picker"
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
                  placeholder="https://yourstore.com/products/..."
                  className="flex-1 rounded-xl border border-[#DCE1EC] bg-white px-3 py-1.5 text-[16px] text-[#0F172A] outline-none focus:border-[#0027eb] sm:text-xs"
                />
                <button
                  type="button"
                  onClick={() => setPickerMode(null)}
                  className="rounded-xl bg-[#0F172A] px-3 py-1.5 text-xs font-semibold text-white"
                >
                  Done
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
                  Add a brand profile under Brands →
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
                    placeholder="Search swipe ads by brand or hook..."
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

        {/* Textarea */}
        <textarea
          rows={2}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void sendMessage();
            }
          }}
          placeholder="Ask Snow anything..."
          className="w-full resize-none bg-transparent text-[15px] leading-relaxed text-[#0F172A] outline-none placeholder:text-[#94A3B8] sm:text-[13.5px]"
        />

        {/* Composer Action Row */}
        <div className="mt-2 flex items-center justify-between gap-2 pt-1">
          <div className="flex items-center gap-2">
            {/* + Attach Context dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setPlusOpen((v) => !v);
                  setCreateMenuOpen(false);
                }}
                aria-label="Attach context"
                className="flex h-8 w-8 items-center justify-center rounded-full border border-[#E2E8F0] bg-white text-[#475569] transition-colors hover:border-[#0027eb]/40 hover:text-[#0F172A]"
              >
                <Plus
                  className={`h-4 w-4 transition-transform ${
                    plusOpen ? "rotate-45" : ""
                  }`}
                />
              </button>
              {plusOpen && (
                <div className="absolute bottom-10 left-0 z-30 w-48 rounded-2xl border border-[#E2E8F0] bg-white p-1.5 shadow-xl">
                  <button
                    type="button"
                    onClick={() => {
                      setPickerMode("ad");
                      setPlusOpen(false);
                    }}
                    className="flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-xs font-semibold text-[#0F172A] hover:bg-[#F5F7FA]"
                  >
                    <Sparkles className="h-3.5 w-3.5 text-[#0027eb]" />
                    Swipe-Ad
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPickerMode("product");
                      setPlusOpen(false);
                    }}
                    className="flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-xs font-semibold text-[#0F172A] hover:bg-[#F5F7FA]"
                  >
                    <Package className="h-3.5 w-3.5 text-[#0027eb]" />
                    Product
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPickerMode("url");
                      setPlusOpen(false);
                    }}
                    className="flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-xs font-semibold text-[#0F172A] hover:bg-[#F5F7FA]"
                  >
                    <Link2 className="h-3.5 w-3.5 text-[#0027eb]" />
                    Brand URL
                  </button>
                </div>
              )}
            </div>

            {/* Create dashed pill dropdown */}
            <div className="relative">
              <button
                type="button"
                data-no-glass="true"
                onClick={() => {
                  setCreateMenuOpen((v) => !v);
                  setPlusOpen(false);
                }}
                className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-[#CBD5E1] bg-[#FAFBFD] px-3 py-1 text-[12px] font-semibold text-[#334155] transition-colors hover:border-[#0027eb] hover:bg-[#EEF2FF]/60 hover:text-[#0027eb]"
              >
                <Wand2 className="h-3.5 w-3.5" />
                Create
                <ChevronDown
                  className={`h-3 w-3 transition-transform ${
                    createMenuOpen ? "rotate-180" : ""
                  }`}
                />
              </button>

              {createMenuOpen && (
                <div className="absolute bottom-10 left-0 z-30 w-60 rounded-2xl border border-[#E2E8F0] bg-white p-1.5 shadow-xl">
                  <button
                    type="button"
                    onClick={() => {
                      setCreateMenuOpen(false);
                      navigateStudio("video");
                    }}
                    className="flex w-full items-center justify-between gap-2 rounded-xl px-2.5 py-2 text-left text-xs font-semibold text-[#0F172A] hover:bg-[#EEF2FF] hover:text-[#0027eb]"
                  >
                    <span className="inline-flex items-center gap-2">
                      <Film className="h-3.5 w-3.5 text-[#0027eb]" />
                      Video ad → Ad Maker
                    </span>
                    <ArrowRight className="h-3 w-3 opacity-60" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setCreateMenuOpen(false);
                      navigateStudio("static");
                    }}
                    className="flex w-full items-center justify-between gap-2 rounded-xl px-2.5 py-2 text-left text-xs font-semibold text-[#0F172A] hover:bg-[#EEF2FF] hover:text-[#0027eb]"
                  >
                    <span className="inline-flex items-center gap-2">
                      <ImageIcon className="h-3.5 w-3.5 text-[#0027eb]" />
                      Image ad → Static templates
                    </span>
                    <ArrowRight className="h-3 w-3 opacity-60" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setCreateMenuOpen(false);
                      void sendMessage(
                        "Write 5 scroll-stopping hooks for my hero product in chat with visual cues and predicted thumbstop angles."
                      );
                    }}
                    className="flex w-full items-center justify-between gap-2 rounded-xl px-2.5 py-2 text-left text-xs font-semibold text-[#0F172A] hover:bg-[#EEF2FF] hover:text-[#0027eb]"
                  >
                    <span className="inline-flex items-center gap-2">
                      <Sparkles className="h-3.5 w-3.5 text-[#0027eb]" />
                      Write 5 hooks in chat
                    </span>
                    <ArrowUp className="h-3 w-3 opacity-60" />
                  </button>
                </div>
              )}
            </div>
          </div>

          <button
            type="button"
            disabled={sending}
            data-no-glass="true"
            onClick={() => void sendMessage()}
            aria-label="Send to Snow"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#0027eb] text-white shadow-xs transition-colors hover:bg-[#0021cc] disabled:opacity-50"
          >
            {sending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <ArrowUp className="h-3.5 w-3.5" />
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
            <SnowCircleBadge size="sm" />
            Snow
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
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
