"use client";

import React, { useEffect, useMemo, useState } from "react";

interface MasonryGridProps<T> {
  items: T[];
  getKey: (item: T, index: number) => string;
  renderItem: (item: T, index: number) => React.ReactNode;
  maxCols?: 4 | 5;
  className?: string;
}

/**
 * Responsive horizontal masonry layout.
 * Distributes items left-to-right across columns so rank #1/#2/#3 always stay on the top row,
 * while each column packs cards tightly vertically with zero dead whitespace under shorter 1:1 creatives.
 */
export function MasonryGrid<T>({
  items,
  getKey,
  renderItem,
  maxCols = 4,
  className = "",
}: MasonryGridProps<T>) {
  const [cols, setCols] = useState<number>(maxCols);

  useEffect(() => {
    const update = () => {
      const w = window.innerWidth;
      if (maxCols === 5) {
        if (w >= 1280) setCols(5);
        else if (w >= 1024) setCols(4);
        else if (w >= 640) setCols(3);
        else setCols(2);
      } else {
        if (w >= 1280) setCols(4);
        else if (w >= 1024) setCols(3);
        else if (w >= 640) setCols(2);
        else setCols(1);
      }
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [maxCols]);

  const columns = useMemo(() => {
    const count = Math.max(1, cols);
    const buckets: { item: T; idx: number }[][] = Array.from(
      { length: count },
      () => []
    );
    items.forEach((item, idx) => {
      buckets[idx % count].push({ item, idx });
    });
    return buckets;
  }, [items, cols]);

  const gridColsClass =
    maxCols === 5
      ? "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5"
      : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4";

  return (
    <div className={`grid items-start gap-3.5 ${gridColsClass} ${className}`}>
      {columns.map((col, colIdx) => (
        <div key={colIdx} className="flex min-w-0 flex-col gap-3.5">
          {col.map(({ item, idx }) => (
            <React.Fragment key={getKey(item, idx)}>
              {renderItem(item, idx)}
            </React.Fragment>
          ))}
        </div>
      ))}
    </div>
  );
}
