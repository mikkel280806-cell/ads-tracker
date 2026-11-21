"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface LiquidGlassProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Render the glass surface directly onto the single child element. */
  asChild?: boolean;
  /** Toggle ambient floating elevation shadow. Defaults to true. */
  shadow?: boolean;
  /** Optical bezel softness in px controlling rim specular highlight. */
  bezel?: number;
  /** Glass surface tint (CSS color or variable). */
  tint?: string;
}

/**
 * iOS 26 Liquid Glass surface primitive.
 * Uses WebKit-safe multi-layer backdrop saturation + specular lensing rim
 * so iPhone Safari and Chromium both render true optical frosted liquid glass.
 */
export function LiquidGlass({
  asChild = false,
  shadow = true,
  bezel = 22,
  tint = "var(--glass-tint-frosted)",
  className,
  style,
  children,
  ...props
}: LiquidGlassProps) {
  const composedStyle: React.CSSProperties = {
    backgroundColor: tint,
    boxShadow: shadow
      ? "var(--glass-rim), var(--glass-shadow)"
      : "var(--glass-rim)",
    ["--glass-bezel" as string]: `${bezel}px`,
    ...style,
  };

  const glassClasses = cn(
    "liquid-glass-surface relative overflow-hidden",
    className,
  );

  const specularOverlay = (
    <span
      aria-hidden="true"
      className="liquid-glass-sheen pointer-events-none absolute inset-0 rounded-[inherit]"
    />
  );

  if (asChild && React.isValidElement(children)) {
    const child = children as React.ReactElement<{
      className?: string;
      style?: React.CSSProperties;
      children?: React.ReactNode;
    }>;

    return React.cloneElement(child, {
      ...props,
      className: cn(glassClasses, child.props.className),
      style: { ...composedStyle, ...child.props.style },
      children: (
        <>
          {specularOverlay}
          {child.props.children}
        </>
      ),
    });
  }

  return (
    <div className={glassClasses} style={composedStyle} {...props}>
      {specularOverlay}
      {children}
    </div>
  );
}
