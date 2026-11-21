"use client";

import * as React from "react";

export interface IndicatorRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

/**
 * Tracks the bounding box of the active tab element inside a container
 * so the liquid glass pill glides smoothly with spring physics on change or resize.
 */
export function useActiveIndicator(
  containerRef: React.RefObject<HTMLElement | null>,
  selector: string,
): IndicatorRect | null {
  const [rect, setRect] = React.useState<IndicatorRect | null>(null);

  React.useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const measure = () => {
      const activeEl = container.querySelector<HTMLElement>(selector);
      if (!activeEl) {
        setRect(null);
        return;
      }

      const next: IndicatorRect = {
        left: activeEl.offsetLeft,
        top: activeEl.offsetTop,
        width: activeEl.offsetWidth,
        height: activeEl.offsetHeight,
      };

      setRect((prev) =>
        prev &&
        prev.left === next.left &&
        prev.top === next.top &&
        prev.width === next.width &&
        prev.height === next.height
          ? prev
          : next,
      );
    };

    measure();

    const mutationObserver = new MutationObserver(measure);
    mutationObserver.observe(container, {
      attributes: true,
      attributeFilter: ["aria-current", "data-state", "class"],
      subtree: true,
      childList: true,
    });

    const resizeObserver = new ResizeObserver(measure);
    resizeObserver.observe(container);
    Array.from(container.children).forEach((child) => {
      if (child instanceof HTMLElement) resizeObserver.observe(child);
    });

    window.addEventListener("resize", measure);
    return () => {
      mutationObserver.disconnect();
      resizeObserver.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [containerRef, selector]);

  return rect;
}
