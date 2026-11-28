"use client";

import React, { useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  Check,
  ChevronRight,
  Lock,
  Plus,
  Search,
  Trash2,
  TrendingDown,
  TrendingUp,
  X,
} from "lucide-react";
import { FlakePopover } from "./ui/FlakeDropdown";

/* ============================================================================
   ATRIA FILTER CATALOG DATA (Discovery + Brands)
   ============================================================================ */

export interface AtriaCountryEntry {
  code: string;
  name: string;
  flag: string;
  regions: Array<"na" | "top_eu" | "eu_uk" | "english">;
}

export const ATRIA_COUNTRIES: AtriaCountryEntry[] = [
  { code: "US", name: "United States", flag: "🇺🇸", regions: ["na", "english"] },
  { code: "CA", name: "Canada", flag: "🇨🇦", regions: ["na", "english"] },
  { code: "GB", name: "United Kingdom", flag: "🇬🇧", regions: ["top_eu", "eu_uk", "english"] },
  { code: "DE", name: "Germany", flag: "🇩🇪", regions: ["top_eu", "eu_uk"] },
  { code: "FR", name: "France", flag: "🇫🇷", regions: ["top_eu", "eu_uk"] },
  { code: "IT", name: "Italy", flag: "🇮🇹", regions: ["top_eu", "eu_uk"] },
  { code: "ES", name: "Spain", flag: "🇪🇸", regions: ["top_eu", "eu_uk"] },
  { code: "NL", name: "Netherlands", flag: "🇳🇱", regions: ["eu_uk"] },
  { code: "PL", name: "Poland", flag: "🇵🇱", regions: ["eu_uk"] },
  { code: "SE", name: "Sweden", flag: "🇸🇪", regions: ["eu_uk"] },
  { code: "BE", name: "Belgium", flag: "🇧🇪", regions: ["eu_uk"] },
  { code: "IE", name: "Ireland", flag: "🇮🇪", regions: ["eu_uk"] },
  { code: "AT", name: "Austria", flag: "🇦🇹", regions: ["eu_uk"] },
  { code: "DK", name: "Denmark", flag: "🇩🇰", regions: ["eu_uk"] },
  { code: "CZ", name: "Czechia", flag: "🇨🇿", regions: ["eu_uk"] },
  { code: "RO", name: "Romania", flag: "🇷🇴", regions: ["eu_uk"] },
  { code: "FI", name: "Finland", flag: "🇫🇮", regions: ["eu_uk"] },
  { code: "PT", name: "Portugal", flag: "🇵🇹", regions: ["eu_uk"] },
  { code: "GR", name: "Greece", flag: "🇬🇷", regions: ["eu_uk"] },
  { code: "HU", name: "Hungary", flag: "🇭🇺", regions: ["eu_uk"] },
  { code: "SK", name: "Slovakia", flag: "🇸🇰", regions: ["eu_uk"] },
  { code: "BG", name: "Bulgaria", flag: "🇧🇬", regions: ["eu_uk"] },
  { code: "HR", name: "Croatia", flag: "🇭🇷", regions: ["eu_uk"] },
  { code: "LT", name: "Lithuania", flag: "🇱🇹", regions: ["eu_uk"] },
  { code: "LU", name: "Luxembourg", flag: "🇱🇺", regions: ["eu_uk"] },
  { code: "SI", name: "Slovenia", flag: "🇸🇮", regions: ["eu_uk"] },
  { code: "LV", name: "Latvia", flag: "🇱🇻", regions: ["eu_uk"] },
  { code: "EE", name: "Estonia", flag: "🇪🇪", regions: ["eu_uk"] },
  { code: "CY", name: "Cyprus", flag: "🇨🇾", regions: ["eu_uk"] },
  { code: "MT", name: "Malta", flag: "🇲🇹", regions: ["eu_uk"] },
  { code: "AU", name: "Australia", flag: "🇦🇺", regions: ["english"] },
  { code: "NZ", name: "New Zealand", flag: "🇳🇿", regions: ["english"] },
];

export const ATRIA_COUNTRY_QUICK_GROUPS: Array<{
  id: "na" | "top_eu" | "eu_uk" | "english";
  label: string;
  count: number;
}> = [
  { id: "na", label: "North America", count: 2 },
  { id: "top_eu", label: "Top EU markets", count: 5 },
  { id: "eu_uk", label: "All EU & UK", count: 28 },
  { id: "english", label: "English-speaking", count: 5 },
];

export interface AtriaIndustryParent {
  name: string;
  children: string[];
}

export const ATRIA_INDUSTRY_TREE: AtriaIndustryParent[] = [
  {
    name: "Apparel & Accessories",
    children: [
      "Women's Clothing",
      "Men's Clothing",
      "Shoes & Footwear",
      "Jewelry & Watches",
      "Bags & Luggage",
      "Eyewear",
      "Accessories",
      "Hats & Headwear",
      "Underwear & Lingerie",
      "Sportswear",
      "Swimwear",
      "Designer & Fashion Brands",
      "Formal & Occasion Wear",
      "Costumes & Cosplay",
      "Fabrics & Textiles",
    ],
  },
  {
    name: "Electronics & Appliances",
    children: [
      "Audio & Headphones",
      "Smart Home",
      "Kitchen Appliances",
      "Wearables",
      "Mobile Accessories",
      "Lighting & Tech",
    ],
  },
  {
    name: "Arts, Media & Entertainment",
    children: ["Streaming & Media", "Photography", "Music & Instruments", "Design Prints"],
  },
  {
    name: "Baby, Kids & Maternity",
    children: ["Baby Gear", "Kids Apparel", "Nursery & Sleep", "Maternity Care"],
  },
  {
    name: "Beauty & Personal Care",
    children: [
      "Skincare",
      "Haircare",
      "Makeup & Cosmetics",
      "Fragrance",
      "Oral Care",
      "Men's Grooming",
      "Body Care",
    ],
  },
  { name: "Book/Publishing", children: ["Books", "Journals & Planners", "Magazines"] },
  { name: "Business Services", children: ["B2B SaaS", "Agencies", "Logistics", "Consulting"] },
  { name: "Charity, NFP & NGO", children: ["Nonprofits", "Environmental", "Community"] },
  { name: "E-Commerce", children: ["DTC Marketplaces", "Subscription Boxes", "Gift Shops"] },
  { name: "Education", children: ["Online Courses", "Language Learning", "Coaching"] },
  { name: "Event", children: ["Ticketing", "Workshops", "Festivals"] },
  { name: "Financial Services", children: ["Fintech", "Banking", "Insurance", "Investing"] },
  {
    name: "Fitness, Sports & Outdoors",
    children: [
      "Home Gym & Equipment",
      "Activewear",
      "Running & Training",
      "Recovery & Mobility",
      "Outdoor & Camping",
    ],
  },
  {
    name: "Food & Beverage",
    children: [
      "Coffee & Matcha",
      "Functional Beverages",
      "Snacks & Bars",
      "Meal Kits",
      "Pantry & Condiments",
    ],
  },
  { name: "Games & Toys", children: ["Board Games", "Mobile Games", "Kids Toys", "Collectibles"] },
  { name: "Government", children: ["Public Services", "Civic Campaigns"] },
  {
    name: "Health & Medical",
    children: [
      "Supplements & Vitamins",
      "Sleep & Wellness",
      "Ergonomics & Posture",
      "Mental Health",
      "Telehealth",
    ],
  },
  {
    name: "Home & Garden",
    children: [
      "Bedding & Sleep",
      "Furniture & Seating",
      "Home Decor",
      "Kitchen & Dining",
      "Cleaning & Organization",
      "Garden & Patio",
    ],
  },
  { name: "Life Services", children: ["Wellness Studios", "Home Services", "Personal Care"] },
  {
    name: "Pets",
    children: ["Dog Food & Treats", "Pet Supplements", "Pet Beds & Gear", "Cat Care"],
  },
  {
    name: "Technology & Software",
    children: ["AI Tools", "Productivity Apps", "Creator Software", "Security & VPN"],
  },
  { name: "Travel & Hospitality", children: ["Luggage & Travel Gear", "Hotels", "Experiences"] },
  { name: "Vehicle & Transportation", children: ["E-Bikes", "Auto Accessories", "Mobility"] },
];

export const ATRIA_THEMES: string[] = [
  "Absurd Alternatives",
  "Announcement",
  "Authority/Celebrity",
  "Before & After",
  "Behind the Scenes",
  "Case Study",
  "Comparison",
  "Ebook",
  "Features/Benefits",
  "Founder's Story",
  "Holiday/Festival",
  "Interface",
  "Media/Press",
  "Meme",
  "Negative Marketing",
  "Post-it Notes",
  "Problem & Solution",
  "Promotion/Discount",
  "Question",
  "Quiz/Survey",
  "Quote",
  "Scarcity",
  "Seasonal",
  "Showcase",
  "Social Proof",
  "Statistics",
  "Testimonial",
  "UGC",
  "Unboxing",
  "Us vs Them",
  "X Reasons Why",
];

export const ATRIA_VISUAL_STYLES: string[] = [
  "Realistic",
  "UGC / handheld",
  "Studio",
  "Cinematic",
  "2D animation",
  "3D / cartoon",
  "Anime",
  "Claymation / stop motion",
  "Motion graphics",
  "Screen recording",
  "Surreal",
  "Unrecognized",
];

export const ATRIA_CTAS: string[] = [
  "Shop Now",
  "Learn More",
  "Install Now",
  "Order Now",
  "Sign Up",
  "Download",
  "Book Now",
  "Get Offer",
  "See Details",
  "Play Game",
  "Watch More",
  "Apply Now",
  "Get Quote",
  "View Instagram Profile",
  "Send Message",
  "Subscribe",
  "Send WhatsApp Message",
  "Use App",
  "Contact Us",
  "Like Page",
  "Get Directions",
  "Listen Now",
  "Call Now",
  "Donate Now",
  "Buy Tickets",
  "Interested",
  "Buy Now",
  "See Menu",
  "No button",
  "Others",
];

export const ATRIA_LANGUAGES: string[] = [
  "English",
  "Danish (dansk)",
  "German (Deutsch)",
  "Swedish (svenska)",
  "Norwegian (norsk)",
  "Dutch (Nederlands)",
  "French (français)",
  "Spanish (español)",
  "Italian (italiano)",
  "Portuguese (português)",
  "Polish (polski)",
  "Finnish (suomi)",
  "Czech (čeština)",
  "Romanian (română)",
  "Hungarian (magyar)",
  "Greek (Ελληνικά)",
  "Turkish (Türkçe)",
  "Arabic (العربية)",
  "Chinese (中文)",
  "Japanese (日本語)",
  "Korean (한국어)",
  "Hindi (हिन्दी)",
  "Afrikaans",
  "Albanian (Shqip)",
  "Bulgarian (български)",
  "Croatian (hrvatski)",
  "Estonian (eesti)",
  "Hebrew (עברית)",
  "Icelandic (íslenska)",
  "Indonesian (Bahasa Indonesia)",
  "Latvian (latviešu)",
  "Lithuanian (lietuvių)",
  "Slovak (slovenčina)",
  "Slovenian (slovenščina)",
  "Ukrainian (українська)",
  "Vietnamese (Tiếng Việt)",
];

/* ============================================================================
   REUSABLE ATRIA-DESIGNED POPOVER PRIMITIVES (IN FLAKE COBALT / OBSIDIAN)
   ============================================================================ */

export interface AtriaFilterPillProps {
  label: string;
  activeLabel?: string | null;
  active?: boolean;
  open: boolean;
  onToggle: () => void;
  triggerRef: React.RefObject<HTMLButtonElement | null>;
}

export function AtriaFilterPill({
  label,
  activeLabel,
  active = false,
  open,
  onToggle,
  triggerRef,
}: AtriaFilterPillProps) {
  return (
    <button
      ref={triggerRef}
      type="button"
      data-no-glass="true"
      onClick={onToggle}
      className={`inline-flex h-7 select-none items-center gap-1.5 rounded-[6px] border px-2.5 text-[12.5px] transition-colors ${
        active
          ? "border-[#0027eb] bg-[#EEF2FF] text-[#0027eb] hover:bg-[#E0E7FF]"
          : open
            ? "border-[#d6d6e0] bg-[#ECECF4] text-[#0F172A]"
            : "border-[#ebebf3] bg-white text-[#0F172A] hover:border-[#d6d6e0]"
      }`}
    >
      <span className="max-w-[195px] truncate">
        {activeLabel ? (
          <>
            <span className="font-normal opacity-75">{label}: </span>
            <span className="font-semibold">{activeLabel}</span>
          </>
        ) : (
          <span className="font-medium">{label}</span>
        )}
      </span>
      <svg
        viewBox="0 0 8 5"
        aria-hidden="true"
        className={`h-[5px] w-[7px] shrink-0 text-[#475569] transition-transform duration-150 ${
          open ? "rotate-180" : ""
        }`}
        fill="currentColor"
      >
        <path d="M4 5L0 0h8L4 5z" />
      </svg>
    </button>
  );
}

export function AtriaPopoverHeader({
  title,
  subtitle,
  badge,
  onClear,
  hasValue,
  bordered = false,
}: {
  title: string;
  subtitle?: string;
  badge?: React.ReactNode;
  onClear?: () => void;
  hasValue?: boolean;
  bordered?: boolean;
}) {
  return (
    <div
      className={`px-4 pt-4 ${
        bordered ? "border-b border-[#ebebf3] pb-3.5" : "pb-2"
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <h4 className="font-sans text-[15px] font-bold tracking-[-0.01em] text-[#0F172A]">
            {title}
          </h4>
          {badge}
        </div>
        {onClear && (
          <button
            type="button"
            data-no-glass="true"
            onClick={onClear}
            className={`text-[13px] font-medium transition-colors ${
              hasValue
                ? "text-[#0F172A] hover:text-[#475569]"
                : "text-[#94A3B8] hover:text-[#64748B]"
            }`}
          >
            Clear
          </button>
        )}
      </div>
      {subtitle && (
        <p className="mt-1 text-[12.5px] leading-snug text-[#64748B]">
          {subtitle}
        </p>
      )}
    </div>
  );
}

export interface RangeFilterValue {
  min: number | null;
  max: number | null;
  window?: string;
}

function formatTooltipNum(n: number, prefix?: string, unitSuffix?: string): string {
  const numStr =
    n >= 1_000_000
      ? `${(n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1)}M`
      : n >= 10_000
        ? `${Math.round(n / 1000)}K`
        : n.toLocaleString("en-US");
  const core = `${prefix ?? ""}${numStr}`;
  return unitSuffix ? `${core} ${unitSuffix}` : core;
}

export function AtriaRangeFilterPopover({
  open,
  onOpenChange,
  anchorRef,
  title,
  subtitle,
  badge,
  minBound = 0,
  maxBound = 100,
  step = 1,
  ticks,
  value,
  onChange,
  minLabel = "Min",
  maxLabel = "Max",
  minPlaceholder = "0",
  maxPlaceholder = "No limit",
  quickRanges,
  quickTitle = "Quick ranges",
  windowOptions,
  windowLabel = "Time period",
  prefix,
  unitSuffix,
  extraContent,
  width = 376,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  anchorRef: React.RefObject<HTMLButtonElement | null>;
  title: string;
  subtitle: string;
  badge?: React.ReactNode;
  minBound?: number;
  maxBound?: number;
  step?: number;
  ticks: string[];
  value: RangeFilterValue;
  onChange: (next: RangeFilterValue) => void;
  minLabel?: string;
  maxLabel?: string;
  minPlaceholder?: string;
  maxPlaceholder?: string;
  quickRanges?: Array<{ label: string; min: number | null; max: number | null }>;
  quickTitle?: string;
  windowOptions?: string[];
  windowLabel?: string;
  prefix?: string;
  unitSuffix?: string;
  extraContent?: React.ReactNode;
  width?: number;
}) {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const [activeThumb, setActiveThumb] = useState<"min" | "max" | null>(null);
  const [hoveredThumb, setHoveredThumb] = useState<"min" | "max" | null>(null);

  const hasValue = value.min !== null || value.max !== null;
  const span = Math.max(1, maxBound - minBound);

  const clampedMin = Math.min(
    maxBound,
    Math.max(minBound, value.min ?? minBound)
  );
  const clampedMax = Math.min(
    maxBound,
    Math.max(clampedMin, value.max ?? maxBound)
  );

  const minPct = ((clampedMin - minBound) / span) * 100;
  const maxPct = ((clampedMax - minBound) / span) * 100;

  const snapValue = (raw: number) => {
    const snapped = Math.round((raw - minBound) / step) * step + minBound;
    return Math.min(maxBound, Math.max(minBound, snapped));
  };

  const clientXToVal = (clientX: number) => {
    const rect = trackRef.current?.getBoundingClientRect();
    if (!rect || rect.width <= 0) return minBound;
    const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    return snapValue(minBound + ratio * span);
  };

  const applyThumbVal = (thumb: "min" | "max", nextVal: number) => {
    if (thumb === "min") {
      const capped = Math.min(nextVal, clampedMax);
      onChange({
        ...value,
        min: capped <= minBound ? null : capped,
      });
    } else {
      const floored = Math.max(nextVal, clampedMin);
      onChange({
        ...value,
        max: floored >= maxBound ? null : floored,
      });
    }
  };

  const handleTrackPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const targetVal = clientXToVal(e.clientX);
    const distMin = Math.abs(targetVal - clampedMin);
    const distMax = Math.abs(targetVal - clampedMax);
    const chosen: "min" | "max" = distMin <= distMax ? "min" : "max";
    setActiveThumb(chosen);
    applyThumbVal(chosen, targetVal);
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handleTrackPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!activeThumb) return;
    applyThumbVal(activeThumb, clientXToVal(e.clientX));
  };

  const handleTrackPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!activeThumb) return;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    setActiveThumb(null);
  };

  const handleTickClick = (idx: number) => {
    const denom = Math.max(1, ticks.length - 1);
    const pct = idx / denom;
    const val = snapValue(minBound + pct * span);
    const distMin = Math.abs(val - clampedMin);
    const distMax = Math.abs(val - clampedMax);
    applyThumbVal(distMin <= distMax ? "min" : "max", val);
  };

  const showMinTooltip = activeThumb === "min" || hoveredThumb === "min";
  const showMaxTooltip = activeThumb === "max" || hoveredThumb === "max";

  return (
    <FlakePopover
      open={open}
      onOpenChange={onOpenChange}
      anchorRef={anchorRef}
      align="left"
      width={width}
      maxHeight={560}
    >
      <AtriaPopoverHeader
        title={title}
        subtitle={subtitle}
        badge={badge}
        hasValue={hasValue}
        onClear={() =>
          onChange({
            min: null,
            max: null,
            window: windowOptions ? windowOptions[0] : value.window,
          })
        }
      />

      <div className="space-y-4 px-5 pb-5 pt-3">
        {/* Custom Dual-Thumb Range Slider with Tick Stops & Floating Tooltip */}
        <div className="pt-2">
          <div
            ref={trackRef}
            onPointerDown={handleTrackPointerDown}
            onPointerMove={handleTrackPointerMove}
            onPointerUp={handleTrackPointerUp}
            onPointerCancel={handleTrackPointerUp}
            className="relative flex h-6 cursor-pointer touch-none select-none items-center"
          >
            {/* Full Neutral Track */}
            <div className="h-[3.5px] w-full rounded-full bg-[#E5E7EB]" />

            {/* Active Cobalt Range Segment */}
            <div
              className="pointer-events-none absolute h-[3.5px] rounded-full bg-[#93B4FF]"
              style={{
                left: `${minPct}%`,
                width: `${Math.max(0, maxPct - minPct)}%`,
              }}
            />

            {/* Tick Stop Dots */}
            {ticks.map((t, idx) => {
              const pct =
                ticks.length <= 1 ? 0 : (idx / (ticks.length - 1)) * 100;
              const inRange = pct >= minPct - 0.5 && pct <= maxPct + 0.5;
              return (
                <span
                  key={`${t}-${idx}`}
                  style={{ left: `${pct}%` }}
                  className={`pointer-events-none absolute h-2.5 w-2.5 -translate-x-1/2 rounded-full border-2 bg-white transition-colors ${
                    inRange ? "border-[#93B4FF]" : "border-[#D1D5DB]"
                  }`}
                />
              );
            })}

            {/* Min Thumb */}
            <button
              type="button"
              data-no-glass="true"
              aria-label={`Minimum ${title}`}
              onPointerDown={(e) => {
                e.stopPropagation();
                setActiveThumb("min");
                trackRef.current?.setPointerCapture(e.pointerId);
              }}
              onMouseEnter={() => setHoveredThumb("min")}
              onMouseLeave={() =>
                setHoveredThumb((prev) => (prev === "min" ? null : prev))
              }
              style={{ left: `${minPct}%` }}
              className={`absolute z-10 h-[18px] w-[18px] -translate-x-1/2 rounded-full border-[2.5px] bg-white transition-shadow ${
                activeThumb === "min" || hoveredThumb === "min"
                  ? "border-[#0027eb] ring-4 ring-[#0027eb]/15"
                  : value.min !== null
                    ? "border-[#0027eb]"
                    : "border-[#93B4FF] hover:border-[#0027eb]"
              }`}
            >
              {showMinTooltip && (
                <span className="pointer-events-none absolute bottom-full left-1/2 mb-2.5 -translate-x-1/2 whitespace-nowrap rounded-lg bg-[#1C1F26] px-2.5 py-1 text-[12px] font-semibold text-white shadow-lg">
                  {formatTooltipNum(clampedMin, prefix, unitSuffix)}
                  <span className="absolute left-1/2 top-full h-2 w-2 -translate-x-1/2 -translate-y-1 rotate-45 bg-[#1C1F26]" />
                </span>
              )}
            </button>

            {/* Max Thumb */}
            <button
              type="button"
              data-no-glass="true"
              aria-label={`Maximum ${title}`}
              onPointerDown={(e) => {
                e.stopPropagation();
                setActiveThumb("max");
                trackRef.current?.setPointerCapture(e.pointerId);
              }}
              onMouseEnter={() => setHoveredThumb("max")}
              onMouseLeave={() =>
                setHoveredThumb((prev) => (prev === "max" ? null : prev))
              }
              style={{ left: `${maxPct}%` }}
              className={`absolute z-10 h-[18px] w-[18px] -translate-x-1/2 rounded-full border-[2.5px] bg-white transition-shadow ${
                activeThumb === "max" || hoveredThumb === "max"
                  ? "border-[#0027eb] ring-4 ring-[#0027eb]/15"
                  : value.max !== null
                    ? "border-[#0027eb]"
                    : "border-[#93B4FF] hover:border-[#0027eb]"
              }`}
            >
              {showMaxTooltip && (
                <span className="pointer-events-none absolute bottom-full left-1/2 mb-2.5 -translate-x-1/2 whitespace-nowrap rounded-lg bg-[#1C1F26] px-2.5 py-1 text-[12px] font-semibold text-white shadow-lg">
                  {value.max === null && maxPlaceholder === "No limit"
                    ? "No limit"
                    : formatTooltipNum(clampedMax, prefix, unitSuffix)}
                  <span className="absolute left-1/2 top-full h-2 w-2 -translate-x-1/2 -translate-y-1 rotate-45 bg-[#1C1F26]" />
                </span>
              )}
            </button>
          </div>

          {/* Tick Labels */}
          <div className="relative mt-1.5 h-5">
            {ticks.map((t, idx) => {
              const pct =
                ticks.length <= 1 ? 0 : (idx / (ticks.length - 1)) * 100;
              const isFirst = idx === 0;
              const isLast = idx === ticks.length - 1;
              const inRange = pct >= minPct - 0.5 && pct <= maxPct + 0.5;
              return (
                <button
                  key={`${t}-${idx}`}
                  type="button"
                  data-no-glass="true"
                  onClick={() => handleTickClick(idx)}
                  style={{ left: `${pct}%` }}
                  className={`absolute top-0 whitespace-nowrap text-[12px] transition-colors ${
                    isFirst
                      ? "translate-x-0"
                      : isLast
                        ? "-translate-x-full"
                        : "-translate-x-1/2"
                  } ${
                    inRange
                      ? "font-medium text-[#0F172A]"
                      : "font-normal text-[#64748B] hover:text-[#0F172A]"
                  }`}
                >
                  {t}
                </button>
              );
            })}
          </div>
        </div>

        {/* Min to Max Inputs (with inline clear × + unitSuffix) */}
        <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-2.5">
          <div>
            <label className="mb-1.5 block text-[12.5px] font-medium text-[#475569]">
              {minLabel}
            </label>
            <div className="flex h-10 items-center gap-1.5 rounded-xl border border-[#D8DDE6] bg-white px-3 transition-all focus-within:border-[#0027eb] focus-within:ring-2 focus-within:ring-[#0027eb]/15">
              {prefix && (
                <span className="text-[13px] font-medium text-[#64748B]">
                  {prefix}
                </span>
              )}
              <input
                type="number"
                value={value.min ?? ""}
                onChange={(e) => {
                  const raw = e.target.value.trim();
                  onChange({
                    ...value,
                    min: raw === "" ? null : Number(raw),
                  });
                }}
                placeholder={minPlaceholder}
                className="min-w-0 flex-1 bg-transparent font-mono-num text-[13.5px] font-medium text-[#0F172A] outline-none placeholder:text-[#9CA3AF] [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
              />
              {value.min !== null && (
                <button
                  type="button"
                  data-no-glass="true"
                  onClick={() => onChange({ ...value, min: null })}
                  aria-label="Clear minimum"
                  className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[#CBD5E1] text-white transition-colors hover:bg-[#94A3B8]"
                >
                  <X className="h-2.5 w-2.5 stroke-[3]" />
                </button>
              )}
              {value.min !== null && unitSuffix && (
                <span className="shrink-0 text-[13px] font-normal text-[#0F172A]">
                  {unitSuffix}
                </span>
              )}
            </div>
          </div>

          <span className="pb-2.5 text-[13px] font-normal text-[#64748B]">
            to
          </span>

          <div>
            <label className="mb-1.5 block text-[12.5px] font-medium text-[#475569]">
              {maxLabel}
            </label>
            <div className="flex h-10 items-center gap-1.5 rounded-xl border border-[#D8DDE6] bg-white px-3 transition-all focus-within:border-[#0027eb] focus-within:ring-2 focus-within:ring-[#0027eb]/15">
              {prefix && (
                <span className="text-[13px] font-medium text-[#64748B]">
                  {prefix}
                </span>
              )}
              <input
                type="number"
                value={value.max ?? ""}
                onChange={(e) => {
                  const raw = e.target.value.trim();
                  onChange({
                    ...value,
                    max: raw === "" ? null : Number(raw),
                  });
                }}
                placeholder={maxPlaceholder}
                className="min-w-0 flex-1 bg-transparent font-mono-num text-[13.5px] font-medium text-[#0F172A] outline-none placeholder:text-[#9CA3AF] [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
              />
              {value.max !== null && (
                <button
                  type="button"
                  data-no-glass="true"
                  onClick={() => onChange({ ...value, max: null })}
                  aria-label="Clear maximum"
                  className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[#CBD5E1] text-white transition-colors hover:bg-[#94A3B8]"
                >
                  <X className="h-2.5 w-2.5 stroke-[3]" />
                </button>
              )}
              {value.max !== null && unitSuffix && (
                <span className="shrink-0 text-[13px] font-normal text-[#0F172A]">
                  {unitSuffix}
                </span>
              )}
            </div>
          </div>
        </div>

        {extraContent}

        {/* Optional Time period / window segmented radio */}
        {windowOptions && windowOptions.length > 0 && (
          <div className="border-t border-[#EEF0F4] pt-3.5">
            <p className="mb-2 text-[12.5px] font-semibold text-[#0F172A]">
              {windowLabel}
            </p>
            <div className="flex flex-wrap gap-1 rounded-xl bg-[#F3F5F9] p-1">
              {windowOptions.map((opt) => {
                const active = (value.window || windowOptions[0]) === opt;
                return (
                  <button
                    key={opt}
                    type="button"
                    data-no-glass="true"
                    onClick={() => onChange({ ...value, window: opt })}
                    className={`flex-1 whitespace-nowrap rounded-lg px-2 py-1.5 text-[11.5px] font-medium transition-all ${
                      active
                        ? "bg-white font-semibold text-[#0F172A] shadow-xs"
                        : "text-[#64748B] hover:text-[#0F172A]"
                    }`}
                  >
                    {opt}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Quick Ranges Pills (Atria rounded-full style) */}
        {quickRanges && quickRanges.length > 0 && (
          <div className="border-t border-[#EEF0F4] pt-3.5">
            <p className="mb-2.5 text-[13px] font-semibold text-[#0F172A]">
              {quickTitle}
            </p>
            <div
              className={
                quickRanges.length === 3
                  ? "grid grid-cols-3 gap-2"
                  : "flex flex-wrap gap-2"
              }
            >
              {quickRanges.map((qr) => {
                const isSelected = value.min === qr.min && value.max === qr.max;
                return (
                  <button
                    key={qr.label}
                    type="button"
                    data-no-glass="true"
                    onClick={() =>
                      onChange({
                        ...value,
                        min: isSelected ? null : qr.min,
                        max: isSelected ? null : qr.max,
                      })
                    }
                    className={`rounded-full border px-3 py-1.5 text-center text-[12.5px] transition-colors ${
                      isSelected
                        ? "border-transparent bg-[#EFEFF2] font-semibold text-[#0F172A]"
                        : "border-[#D8DDE6] bg-white font-medium text-[#0F172A] hover:border-[#CBD5E1] hover:bg-[#F7F8FB]"
                    }`}
                  >
                    {qr.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </FlakePopover>
  );
}

export interface GrowthFilterValue {
  direction: "rising" | "falling" | null;
  minPct: number | null;
  period?: string;
}

export function AtriaGrowthFilterPopover({
  open,
  onOpenChange,
  anchorRef,
  title,
  subtitle,
  value,
  onChange,
  periods,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  anchorRef: React.RefObject<HTMLButtonElement | null>;
  title: string;
  subtitle: string;
  value: GrowthFilterValue;
  onChange: (next: GrowthFilterValue) => void;
  periods?: string[];
}) {
  const hasValue = value.direction !== null || value.minPct !== null;

  return (
    <FlakePopover
      open={open}
      onOpenChange={onOpenChange}
      anchorRef={anchorRef}
      align="left"
      width={320}
    >
      <AtriaPopoverHeader
        title={title}
        subtitle={subtitle}
        hasValue={hasValue}
        onClear={() =>
          onChange({
            direction: null,
            minPct: null,
            period: periods?.[0],
          })
        }
      />
      <div className="space-y-3.5 p-4">
        <div>
          <p className="mb-1.5 text-[11px] font-medium text-[#64748B]">
            Direction
          </p>
          <div className="grid grid-cols-2 gap-2">
            {(
              [
                { id: "rising", label: "Rising", icon: TrendingUp },
                { id: "falling", label: "Falling", icon: TrendingDown },
              ] as const
            ).map((opt) => {
              const Icon = opt.icon;
              const active = value.direction === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  data-no-glass="true"
                  onClick={() =>
                    onChange({
                      ...value,
                      direction: active ? null : opt.id,
                    })
                  }
                  className={`flex items-center justify-center gap-1.5 rounded-full border py-2 text-[12.5px] font-medium transition-colors ${
                    active
                      ? "border-transparent bg-[#EFEFF2] font-semibold text-[#0F172A]"
                      : "border-[#D8DDE6] bg-white text-[#0F172A] hover:bg-[#F7F8FB]"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5 text-[#475569]" />
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <p className="mb-1.5 text-[11px] font-medium text-[#64748B]">
            Minimum change
          </p>
          <div className="flex items-center gap-2">
            <span className="text-[12px] text-[#475569]">At least</span>
            <div className="flex w-24 items-center rounded-lg border border-[#E2E6EF] bg-white px-2.5 py-1.5 focus-within:border-[#0027eb]">
              <input
                type="number"
                min={0}
                value={value.minPct ?? ""}
                onChange={(e) => {
                  const raw = e.target.value.trim();
                  onChange({
                    ...value,
                    direction: value.direction || "rising",
                    minPct: raw === "" ? null : Number(raw),
                  });
                }}
                placeholder="0"
                className="w-full bg-transparent font-mono-num text-[12.5px] text-[#0F172A] outline-none"
              />
              <span className="text-xs text-[#94A3B8]">%</span>
            </div>
          </div>
        </div>

        {periods && periods.length > 0 && (
          <div>
            <p className="mb-1.5 text-[11px] font-medium text-[#64748B]">
              Time period
            </p>
            <div className="grid grid-cols-3 gap-1 rounded-lg bg-[#F3F5F9] p-1">
              {periods.map((p) => {
                const active = (value.period || periods[0]) === p;
                return (
                  <button
                    key={p}
                    type="button"
                    data-no-glass="true"
                    onClick={() => onChange({ ...value, period: p })}
                    className={`rounded-md py-1 text-[11.5px] font-medium transition-all ${
                      active
                        ? "bg-white font-semibold text-[#0F172A] shadow-xs"
                        : "text-[#64748B] hover:text-[#0F172A]"
                    }`}
                  >
                    {p}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </FlakePopover>
  );
}

export function AtriaSearchCheckboxPopover({
  open,
  onOpenChange,
  anchorRef,
  title,
  subtitle,
  badge,
  searchPlaceholder,
  options,
  selected,
  onChange,
  width = 300,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  anchorRef: React.RefObject<HTMLButtonElement | null>;
  title: string;
  subtitle?: string;
  badge?: React.ReactNode;
  searchPlaceholder: string;
  options: string[];
  selected: string[];
  onChange: (next: string[]) => void;
  width?: number;
}) {
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => o.toLowerCase().includes(q));
  }, [options, query]);

  const toggle = (item: string) => {
    if (selected.includes(item)) {
      onChange(selected.filter((x) => x !== item));
    } else {
      onChange([...selected, item]);
    }
  };

  return (
    <FlakePopover
      open={open}
      onOpenChange={onOpenChange}
      anchorRef={anchorRef}
      align="left"
      width={width}
      maxHeight={420}
    >
      <AtriaPopoverHeader
        title={title}
        subtitle={subtitle}
        badge={badge}
        hasValue={selected.length > 0}
        onClear={() => onChange([])}
      />
      <div className="p-2.5 pb-1.5">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#94A3B8]" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={searchPlaceholder}
            className="w-full rounded-lg border border-[#E2E6EF] bg-[#FAFBFD] py-1.5 pl-8 pr-2.5 text-[12px] text-[#0F172A] outline-none placeholder:text-[#94A3B8] focus:border-[#0027eb] focus:bg-white"
          />
        </div>
      </div>
      <div className="workspace-scroll max-h-[250px] overflow-y-auto px-2 pb-2.5">
        {filtered.map((opt) => {
          const checked = selected.includes(opt);
          return (
            <button
              key={opt}
              type="button"
              data-no-glass="true"
              onClick={() => toggle(opt)}
              className="flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left text-[12.5px] text-[#1E293B] transition-colors hover:bg-[#F7F8FB]"
            >
              <span
                className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors ${
                  checked
                    ? "border-[#0027eb] bg-[#0027eb] text-white"
                    : "border-[#CBD5E1] bg-white"
                }`}
              >
                {checked && <Check className="h-3 w-3 stroke-[3]" />}
              </span>
              <span className="truncate">{opt}</span>
            </button>
          );
        })}
        {filtered.length === 0 && (
          <p className="py-5 text-center text-xs text-[#94A3B8]">
            No matches found
          </p>
        )}
      </div>
    </FlakePopover>
  );
}

export function AtriaIndustryPopover({
  open,
  onOpenChange,
  anchorRef,
  selected,
  onApply,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  anchorRef: React.RefObject<HTMLButtonElement | null>;
  selected: string[];
  onApply: (next: string[]) => void;
}) {
  const [query, setQuery] = useState("");
  const [activeParent, setActiveParent] = useState<string>(
    ATRIA_INDUSTRY_TREE[0].name
  );
  const [draftOverride, setDraftOverride] = useState<string[] | null>(null);
  const draft = draftOverride ?? selected;

  const setDraft = (updater: string[] | ((prev: string[]) => string[])) => {
    setDraftOverride((prev) => {
      const base = prev ?? selected;
      return typeof updater === "function" ? updater(base) : updater;
    });
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) setDraftOverride(null);
    onOpenChange(nextOpen);
  };

  const toggleVal = (val: string) => {
    setDraft((prev) =>
      prev.includes(val) ? prev.filter((x) => x !== val) : [...prev, val]
    );
  };

  const toggleParent = (parent: AtriaIndustryParent) => {
    const allIn =
      draft.includes(parent.name) ||
      parent.children.every((c) => draft.includes(c));
    if (allIn) {
      setDraft((prev) =>
        prev.filter((x) => x !== parent.name && !parent.children.includes(x))
      );
    } else {
      setDraft((prev) =>
        Array.from(new Set([...prev, parent.name, ...parent.children]))
      );
    }
  };

  const filteredParents = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return ATRIA_INDUSTRY_TREE;
    return ATRIA_INDUSTRY_TREE.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.children.some((c) => c.toLowerCase().includes(q))
    );
  }, [query]);

  const currentParentObj =
    filteredParents.find((p) => p.name === activeParent) || filteredParents[0];

  const visibleChildren = useMemo(() => {
    if (!currentParentObj) return [];
    const q = query.trim().toLowerCase();
    if (!q || currentParentObj.name.toLowerCase().includes(q)) {
      return currentParentObj.children;
    }
    return currentParentObj.children.filter((c) => c.toLowerCase().includes(q));
  }, [currentParentObj, query]);

  return (
    <FlakePopover
      open={open}
      onOpenChange={handleOpenChange}
      anchorRef={anchorRef}
      align="left"
      width={540}
      maxHeight={470}
    >
      <AtriaPopoverHeader
        title="Industry"
        subtitle="Browse by category or search for a specific industry"
        hasValue={draft.length > 0}
        onClear={() => setDraft([])}
      />

      <div className="border-b border-[#F1F4F9] p-2.5">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#94A3B8]" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search for industries"
            className="w-full rounded-lg border border-[#E2E6EF] bg-[#FAFBFD] py-1.5 pl-8 pr-2.5 text-[12px] text-[#0F172A] outline-none placeholder:text-[#94A3B8] focus:border-[#0027eb] focus:bg-white"
          />
        </div>
      </div>

      {/* 2-Column Hierarchical Tree */}
      <div className="grid h-[270px] grid-cols-2 divide-x divide-[#F1F4F9]">
        {/* Left: Parent Categories */}
        <div className="workspace-scroll overflow-y-auto p-1.5">
          {filteredParents.map((p) => {
            const isCurrent = currentParentObj?.name === p.name;
            const someChecked =
              draft.includes(p.name) ||
              p.children.some((c) => draft.includes(c));
            return (
              <div
                key={p.name}
                onMouseEnter={() => setActiveParent(p.name)}
                onClick={() => setActiveParent(p.name)}
                className={`flex cursor-pointer items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-[12px] transition-colors ${
                  isCurrent
                    ? "bg-[#EEF2FF] font-semibold text-[#0027eb]"
                    : "text-[#334155] hover:bg-[#F7F8FB]"
                }`}
              >
                <div className="flex min-w-0 items-center gap-2">
                  <button
                    type="button"
                    data-no-glass="true"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleParent(p);
                    }}
                    className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                      someChecked
                        ? "border-[#0027eb] bg-[#0027eb] text-white"
                        : "border-[#CBD5E1] bg-white"
                    }`}
                  >
                    {someChecked && <Check className="h-3 w-3 stroke-[3]" />}
                  </button>
                  <span className="truncate">{p.name}</span>
                </div>
                <ChevronRight className="h-3.5 w-3.5 shrink-0 text-[#64748B]" />
              </div>
            );
          })}
        </div>

        {/* Right: Sub-categories */}
        <div className="workspace-scroll overflow-y-auto p-1.5">
          {visibleChildren.map((child) => {
            const checked = draft.includes(child);
            return (
              <button
                key={child}
                type="button"
                data-no-glass="true"
                onClick={() => toggleVal(child)}
                className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-[12px] text-[#334155] transition-colors hover:bg-[#F7F8FB]"
              >
                <span
                  className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                    checked
                      ? "border-[#0027eb] bg-[#0027eb] text-white"
                      : "border-[#CBD5E1] bg-white"
                  }`}
                >
                  {checked && <Check className="h-3 w-3 stroke-[3]" />}
                </span>
                <span className="truncate">{child}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Explicit Apply Footer (matches Atria's Industry popover) */}
      <div className="flex items-center justify-between border-t border-[#ebebf3] bg-[#f5f5fa]/60 px-3.5 py-2.5">
        <span className="text-[11.5px] text-[#64748B]">
          {draft.length > 0 ? `${draft.length} selected` : "All industries"}
        </span>
        <button
          type="button"
          data-no-glass="true"
          onClick={() => {
            onApply(draft);
            setDraftOverride(null);
            onOpenChange(false);
          }}
          className="rounded-[8px] bg-[#0027eb] px-4 py-1.5 text-[12px] font-semibold text-white transition-colors hover:bg-[#001fc2]"
        >
          Apply
        </button>
      </div>
    </FlakePopover>
  );
}

/* ============================================================================
   CREATE NEW VIEW & MANAGE VIEWS MODALS (SHARED BY DISCOVERY & BRANDS)
   ============================================================================ */

export interface SavedCustomView {
  id: string;
  name: string;
  sortLabel: string;
  summaryBadges: string[];
}

export function AtriaCreateViewModal({
  open,
  onClose,
  sortLabel,
  activeSummaryBadges,
  onCreate,
}: {
  open: boolean;
  onClose: () => void;
  sortLabel: string;
  activeSummaryBadges: string[];
  onCreate: (name: string) => void;
}) {
  const [name, setName] = useState("New view");

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="flake-modal-backdrop z-[130] flex items-center justify-center bg-[#050811]/55 p-4 backdrop-blur-[2px]"
      onClick={onClose}
    >
      <div
        className="animate-sheet-up w-full max-w-[440px] rounded-2xl border border-[#E6E9F0] bg-white p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="font-display text-[16px] font-bold text-[#0F172A]">
            Create new view
          </h3>
          <button
            type="button"
            data-no-glass="true"
            onClick={onClose}
            aria-label="Close"
            className="flex h-7 w-7 items-center justify-center rounded-lg text-[#64748B] hover:bg-[#F3F5F9] hover:text-[#0F172A]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            const trimmed = name.trim() || "New view";
            onCreate(trimmed);
            setName("New view");
            onClose();
          }}
          className="mt-4 space-y-3"
        >
          <input
            type="text"
            autoFocus
            onFocus={(e) => e.currentTarget.select()}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="View name"
            className="w-full rounded-xl border border-[#0027eb] bg-white px-3.5 py-2 text-[13.5px] font-medium text-[#0F172A] outline-none ring-2 ring-[#0027eb]/15"
          />

          <p className="text-[12px] leading-relaxed text-[#64748B]">
            Saves the current filters and sort as a view you can reapply
            anytime. Only you can see it — it is not shared with other workspace
            members.
          </p>

          <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
            <span className="inline-flex items-center rounded-md border border-[#E2E6EF] bg-[#F7F8FB] px-2.5 py-1 text-[11.5px] font-medium text-[#334155]">
              Sort: {sortLabel}
            </span>
            {activeSummaryBadges.map((b) => (
              <span
                key={b}
                className="inline-flex items-center rounded-md border border-[#0027eb]/25 bg-[#EEF2FF] px-2.5 py-1 text-[11.5px] font-medium text-[#0027eb]"
              >
                {b}
              </span>
            ))}
          </div>

          <div className="flex items-center justify-end gap-2 pt-3">
            <button
              type="button"
              data-no-glass="true"
              onClick={onClose}
              className="rounded-lg border border-[#E2E6EF] bg-white px-4 py-1.5 text-[12.5px] font-medium text-[#334155] hover:bg-[#F7F8FB]"
            >
              Cancel
            </button>
            <button
              type="submit"
              data-no-glass="true"
              className="rounded-[8px] bg-[#0027eb] px-4 py-1.5 text-[12.5px] font-semibold text-white transition-colors hover:bg-[#001fc2]"
            >
              Create view
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}

export function AtriaManageViewsModal({
  open,
  onClose,
  systemViews,
  customViews,
  onDeleteView,
  onOpenCreateView,
}: {
  open: boolean;
  onClose: () => void;
  systemViews: string[];
  customViews: SavedCustomView[];
  onDeleteView: (id: string) => void;
  onOpenCreateView: () => void;
}) {
  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="flake-modal-backdrop z-[130] flex items-center justify-center bg-[#050811]/55 p-4 backdrop-blur-[2px]"
      onClick={onClose}
    >
      <div
        className="animate-sheet-up w-full max-w-[440px] rounded-2xl border border-[#E6E9F0] bg-white p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="font-display text-[16px] font-bold text-[#0F172A]">
            Manage views
          </h3>
          <button
            type="button"
            data-no-glass="true"
            onClick={onClose}
            aria-label="Close"
            className="flex h-7 w-7 items-center justify-center rounded-lg text-[#64748B] hover:bg-[#F3F5F9] hover:text-[#0F172A]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-4 space-y-4">
          <div>
            <p className="mb-2 text-[11.5px] font-semibold text-[#64748B]">
              System views
            </p>
            <div className="space-y-1.5">
              {systemViews.map((sv) => (
                <div
                  key={sv}
                  className="flex items-center justify-between rounded-lg border border-[#ECEFF5] bg-[#FAFBFD] px-3 py-2 text-[12.5px] font-medium text-[#0F172A]"
                >
                  <span>{sv}</span>
                  <span className="inline-flex items-center gap-1 text-[11px] text-[#94A3B8]">
                    <Lock className="h-3 w-3" />
                    Locked
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-2 text-[11.5px] font-semibold text-[#64748B]">
              Your views (only visible to you)
            </p>
            {customViews.length === 0 ? (
              <p className="rounded-lg border border-dashed border-[#E2E6EF] px-3 py-4 text-center text-[12px] text-[#94A3B8]">
                You have not created any views yet.
              </p>
            ) : (
              <div className="space-y-1.5">
                {customViews.map((cv) => (
                  <div
                    key={cv.id}
                    className="flex items-center justify-between rounded-lg border border-[#E6E9F0] bg-white px-3 py-2 text-[12.5px] font-medium text-[#0F172A]"
                  >
                    <span className="truncate">{cv.name}</span>
                    <button
                      type="button"
                      data-no-glass="true"
                      onClick={() => onDeleteView(cv.id)}
                      className="text-[#94A3B8] hover:text-[#E11D48]"
                      aria-label={`Delete ${cv.name}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="mt-5 flex items-center justify-between border-t border-[#F1F4F9] pt-3.5">
          <button
            type="button"
            data-no-glass="true"
            onClick={() => {
              onClose();
              onOpenCreateView();
            }}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#E2E6EF] bg-white px-3 py-1.5 text-[12px] font-medium text-[#334155] hover:bg-[#F7F8FB]"
          >
            <Plus className="h-3.5 w-3.5" />
            Add view
          </button>
          <button
            type="button"
            data-no-glass="true"
            onClick={onClose}
            className="rounded-[8px] bg-[#0027eb] px-4 py-1.5 text-[12.5px] font-semibold text-white transition-colors hover:bg-[#001fc2]"
          >
            Done
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
