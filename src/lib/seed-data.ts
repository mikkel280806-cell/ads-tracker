import type { Ad, Board, Brand } from "./types";

const REFERENCE_NOW = Date.UTC(2026, 10, 21, 16, 0, 0);
const daysAgo = (days: number) =>
  new Date(REFERENCE_NOW - days * 24 * 60 * 60 * 1000).toISOString();

/**
 * Starter boards so the user can organize saved ads right away.
 * Brands and Ads start EMPTY — zero fake placeholders!
 */
export const SEED_BOARDS: Board[] = [
  {
    id: "board-hooks",
    name: "Vindende UGC Hooks",
    description: "De første 3 sekunder der stopper scroll på Instagram & Reels.",
    accent_color: "#0027eb",
    created_at: daysAgo(1),
  },
  {
    id: "board-statics",
    name: "Konverterende Statics",
    description: "Skarpe billedannoncer med stærk copy og produktfokus.",
    accent_color: "#16a34a",
    created_at: daysAgo(1),
  },
  {
    id: "board-q4",
    name: "Tilbud & Kampagner",
    description: "Bundles, tilbudsvinkler og vinder-ads.",
    accent_color: "#d97706",
    created_at: daysAgo(1),
  },
];

export const SEED_BRANDS: Brand[] = [];
export const SEED_ADS: Ad[] = [];
