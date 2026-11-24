"use client";

import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown } from "lucide-react";

const VIEWPORT_MARGIN = 12;
const TRIGGER_GAP = 6;
const EXIT_DURATION_MS = 165;

interface PopoverCoords {
  left: number;
  top?: number;
  bottom?: number;
  width: number;
  maxHeight: number;
  placement: "bottom" | "top";
  originX: number;
}

export interface FlakePopoverProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  anchorRef: React.RefObject<HTMLElement | null>;
  align?: "left" | "right" | "match";
  preferredPlacement?: "bottom" | "top";
  width?: number;
  minWidth?: number;
  maxHeight?: number;
  className?: string;
  children: React.ReactNode;
}

/**
 * Viewport-clamped, portaled popover with smooth enter + exit animations.
 * Guarantees dropdowns like Ad Rank, Filters, Brands, and Folders never clip
 * outside mobile or desktop screens.
 */
export function FlakePopover({
  open,
  onOpenChange,
  anchorRef,
  align = "left",
  preferredPlacement = "bottom",
  width,
  minWidth,
  maxHeight: maxHeightCap = 340,
  className = "",
  children,
}: FlakePopoverProps) {
  const [rendered, setRendered] = useState(open);
  const [visible, setVisible] = useState(false);
  const [coords, setCoords] = useState<PopoverCoords | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);

  const computeCoords = useCallback((): PopoverCoords | null => {
    const anchor = anchorRef.current;
    if (!anchor || typeof window === "undefined") return null;

    const rect = anchor.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const maxViewportW = Math.max(160, vw - VIEWPORT_MARGIN * 2);

    let desiredW: number;
    if (align === "match") {
      desiredW = Math.max(rect.width, minWidth ?? 180);
    } else {
      desiredW = width ?? Math.max(rect.width, minWidth ?? 210);
    }
    const resolvedW = Math.min(desiredW, maxViewportW);

    let left = align === "right" ? rect.right - resolvedW : rect.left;
    left = Math.max(
      VIEWPORT_MARGIN,
      Math.min(left, vw - resolvedW - VIEWPORT_MARGIN)
    );

    const triggerCenterX = rect.left + rect.width / 2;
    const originX = Math.max(
      14,
      Math.min(resolvedW - 14, triggerCenterX - left)
    );

    const spaceBelow = vh - rect.bottom - TRIGGER_GAP - VIEWPORT_MARGIN;
    const spaceAbove = rect.top - TRIGGER_GAP - VIEWPORT_MARGIN;
    const minComfortHeight = 190;

    let placement: "bottom" | "top" = preferredPlacement;
    if (
      preferredPlacement === "bottom" &&
      spaceBelow < minComfortHeight &&
      spaceAbove > spaceBelow
    ) {
      placement = "top";
    } else if (
      preferredPlacement === "top" &&
      spaceAbove < minComfortHeight &&
      spaceBelow > spaceAbove
    ) {
      placement = "bottom";
    }

    const availableVertical = placement === "bottom" ? spaceBelow : spaceAbove;
    const resolvedMaxH = Math.max(
      130,
      Math.min(maxHeightCap, Math.floor(availableVertical))
    );

    if (placement === "bottom") {
      return {
        left,
        top: Math.max(VIEWPORT_MARGIN, rect.bottom + TRIGGER_GAP),
        width: resolvedW,
        maxHeight: resolvedMaxH,
        placement,
        originX,
      };
    }

    return {
      left,
      bottom: Math.max(VIEWPORT_MARGIN, vh - rect.top + TRIGGER_GAP),
      width: resolvedW,
      maxHeight: resolvedMaxH,
      placement,
      originX,
    };
  }, [anchorRef, align, width, minWidth, preferredPlacement, maxHeightCap]);

  // Mount + position synchronously before first paint, then animate in; on close, animate out then unmount
  useLayoutEffect(() => {
    if (open) {
      const next = computeCoords();
      if (next) setCoords(next);
      setRendered(true);
      let raf2 = 0;
      const raf1 = requestAnimationFrame(() => {
        raf2 = requestAnimationFrame(() => {
          setVisible(true);
        });
      });
      return () => {
        cancelAnimationFrame(raf1);
        cancelAnimationFrame(raf2);
      };
    } else {
      setVisible(false);
      const timer = window.setTimeout(() => {
        setRendered(false);
      }, EXIT_DURATION_MS);
      return () => window.clearTimeout(timer);
    }
  }, [open, computeCoords]);

  // Keep anchored to trigger on resize or inner scroll while open
  useEffect(() => {
    if (!open) return;

    const update = (e?: Event) => {
      if (e && panelRef.current && e.target instanceof Node && panelRef.current.contains(e.target)) {
        return;
      }
      const next = computeCoords();
      if (!next) return;
      setCoords((prev) =>
        prev &&
        prev.left === next.left &&
        prev.top === next.top &&
        prev.bottom === next.bottom &&
        prev.width === next.width &&
        prev.maxHeight === next.maxHeight &&
        prev.placement === next.placement
          ? prev
          : next
      );
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onOpenChange(false);
    };

    window.addEventListener("resize", update, { passive: true });
    window.addEventListener("scroll", update, { passive: true, capture: true });
    window.addEventListener("keydown", onKeyDown);

    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, computeCoords, onOpenChange]);

  if (!rendered || !coords || typeof document === "undefined") {
    return null;
  }

  const closedTransform =
    coords.placement === "bottom"
      ? "translate3d(0, -6px, 0) scale(0.97)"
      : "translate3d(0, 6px, 0) scale(0.97)";

  return createPortal(
    <>
      {/* Transparent click-outside backdrop */}
      <div
        aria-hidden="true"
        onClick={(e) => {
          e.stopPropagation();
          onOpenChange(false);
        }}
        className={`fixed inset-0 z-[65] ${
          open ? "pointer-events-auto" : "pointer-events-none"
        }`}
      />

      {/* Clamped animated popover surface */}
      <div
        ref={panelRef}
        role="dialog"
        onClick={(e) => e.stopPropagation()}
        style={{
          position: "fixed",
          left: `${coords.left}px`,
          top: coords.top !== undefined ? `${coords.top}px` : undefined,
          bottom: coords.bottom !== undefined ? `${coords.bottom}px` : undefined,
          width: `${coords.width}px`,
          maxHeight: `${coords.maxHeight}px`,
          transformOrigin: `${coords.originX}px ${
            coords.placement === "bottom" ? "0px" : "100%"
          }`,
          opacity: visible ? 1 : 0,
          transform: visible ? "translate3d(0, 0, 0) scale(1)" : closedTransform,
          transition:
            "opacity 150ms cubic-bezier(0.22, 1, 0.36, 1), transform 170ms cubic-bezier(0.22, 1, 0.36, 1)",
          willChange: "opacity, transform",
        }}
        className={`z-[70] flex flex-col overflow-hidden rounded-2xl border border-[#E6E9F0] bg-white shadow-[0_18px_40px_rgba(15,23,42,0.13),0_2px_8px_rgba(15,23,42,0.05)] ${
          open ? "pointer-events-auto" : "pointer-events-none"
        } ${className}`}
      >
        {children}
      </div>
    </>,
    document.body
  );
}

export interface FlakeSelectOption {
  value: string;
  label: string;
  icon?: React.ReactNode;
}

export interface FlakeSelectProps {
  ariaLabel: string;
  value: string;
  onChange: (value: string) => void;
  options: FlakeSelectOption[];
  icon?: React.ReactNode;
  variant?: "ghost" | "bordered";
  align?: "left" | "right" | "match";
  menuWidth?: number;
  isActive?: boolean;
  triggerClassName?: string;
}

/**
 * Custom Flake dropdown matching the Ad Rank & Filters popovers across both
 * iPhone and desktop — replaces native iOS <select> wheels with a clean,
 * animated, viewport-safe menu.
 */
export function FlakeSelect({
  ariaLabel,
  value,
  onChange,
  options,
  icon,
  variant = "ghost",
  align = "left",
  menuWidth,
  isActive = false,
  triggerClassName = "",
}: FlakeSelectProps) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement | null>(null);

  const selectedOption =
    options.find((opt) => opt.value === value) || options[0];

  const baseTriggerClass =
    variant === "bordered"
      ? `inline-flex w-full items-center justify-between gap-2 rounded-xl border bg-white px-3 py-2 text-[13.5px] font-medium outline-none transition-colors sm:w-auto sm:text-xs ${
          open || isActive
            ? "border-[#CBD5E1] text-[#0F172A]"
            : "border-[#E6E9F0] text-[#334155] hover:border-[#CBD5E1]"
        }`
      : `inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[12.5px] font-medium outline-none transition-colors ${
          open || isActive
            ? "bg-[#F1F5F9] text-[#0F172A]"
            : "text-[#1E293B] hover:bg-[#F3F5F9]"
        }`;

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className={`${baseTriggerClass} ${triggerClassName}`}
      >
        <span className="flex min-w-0 items-center gap-1.5">
          {icon && <span className="shrink-0">{icon}</span>}
          <span className="truncate">{selectedOption?.label}</span>
        </span>
        <ChevronDown
          className={`h-3.5 w-3.5 shrink-0 text-[#64748B] transition-transform duration-150 ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      <FlakePopover
        open={open}
        onOpenChange={setOpen}
        anchorRef={triggerRef}
        align={align}
        width={menuWidth}
        minWidth={variant === "bordered" ? 210 : 196}
      >
        <div
          role="listbox"
          aria-label={ariaLabel}
          className="workspace-scroll overflow-y-auto overscroll-contain p-1.5"
        >
          {options.map((opt) => {
            const active = opt.value === value;
            return (
              <button
                key={opt.value}
                type="button"
                role="option"
                aria-selected={active}
                data-no-glass="true"
                onClick={() => {
                  onChange(opt.value);
                  setOpen(false);
                }}
                className={`flex w-full items-center justify-between gap-2.5 rounded-xl px-3 py-2 text-left text-[13px] transition-colors ${
                  active
                    ? "bg-[#F1F5F9] font-semibold text-[#0F172A]"
                    : "font-medium text-[#334155] hover:bg-[#F8FAFC] hover:text-[#0F172A]"
                }`}
              >
                <span className="flex min-w-0 items-center gap-2">
                  {opt.icon && <span className="shrink-0">{opt.icon}</span>}
                  <span className="truncate">{opt.label}</span>
                </span>
                {active && (
                  <Check className="h-3.5 w-3.5 shrink-0 text-[#0027eb]" />
                )}
              </button>
            );
          })}
        </div>
      </FlakePopover>
    </>
  );
}
