import type { Ad, Board, Brand } from "./types";
import catalogData from "./scraped-catalog.json";

const REFERENCE_NOW = Date.UTC(2026, 10, 21, 16, 0, 0);
const daysAgo = (days: number) =>
  new Date(REFERENCE_NOW - days * 24 * 60 * 60 * 1000).toISOString();

export const SEED_BOARDS: Board[] = [
  {
    id: "folder-dk-ecom",
    name: "Danske E-com Winners",
    description: "Udvalgte danske Shopify-brands, landing pages og live Meta-annoncer.",
    accent_color: "#0027eb",
    created_at: daysAgo(1),
  },
  {
    id: "folder-us-scaling",
    name: "US Scaling Brands",
    description: "Amerikanske DTC-brands med høj annoncevolumen og stærke hooks.",
    accent_color: "#16a34a",
    created_at: daysAgo(1),
  },
  {
    id: "folder-hooks-copy",
    name: "Top Hooks & Copy",
    description: "Bedste åbningshooks, annoncer og konverterende vinkler til inspiration.",
    accent_color: "#d97706",
    created_at: daysAgo(1),
  },
];

export const CATALOG_SCRAPED_AT: string = catalogData.scraped_at;
export const SEED_BRANDS: Brand[] = catalogData.brands as Brand[];
export const SEED_ADS: Ad[] = catalogData.ads as Ad[];
