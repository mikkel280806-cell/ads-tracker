"use client";

import React from "react";

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`skeleton-shimmer rounded-lg ${className}`} aria-hidden="true" />;
}

export function ShopsSkeleton() {
  return (
    <div className="space-y-4 lg:space-y-5" aria-busy="true" aria-label="Indlæser shops">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <Skeleton className="h-7 w-24 rounded-lg" />
        <Skeleton className="h-9 w-9 rounded-xl" />
      </div>

      {/* Filter Bar */}
      <div className="space-y-2.5 lg:flex lg:items-center lg:justify-between lg:gap-3 lg:space-y-0">
        <Skeleton className="h-9 w-full rounded-xl lg:w-64" />
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Skeleton className="h-9 w-full rounded-xl sm:w-56" />
          <div className="grid grid-cols-2 gap-2 sm:flex">
            <Skeleton className="h-9 w-full rounded-xl sm:w-36" />
            <Skeleton className="h-9 w-full rounded-xl sm:w-32" />
          </div>
        </div>
      </div>

      {/* Mobile Cards (< xl) */}
      <div className="space-y-3 xl:hidden">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="rounded-2xl border border-[#E6E9F0] bg-white p-3.5"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex flex-1 items-center gap-3">
                <Skeleton className="h-[52px] w-[84px] shrink-0 rounded-xl" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-44" />
                </div>
              </div>
              <Skeleton className="h-9 w-9 shrink-0 rounded-xl" />
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <Skeleton className="h-14 w-full rounded-xl" />
              <Skeleton className="h-14 w-full rounded-xl" />
            </div>
          </div>
        ))}
      </div>

      {/* Desktop 6-Column Table (xl+) */}
      <div className="adtrack-card hidden overflow-hidden rounded-2xl xl:block">
        <div className="grid grid-cols-[2.35fr_1.45fr_0.9fr_1.15fr_1.15fr_1.45fr] items-center gap-4 border-b border-[#EFF2F6] bg-[#FAFBFD] px-5 py-3.5">
          <Skeleton className="h-3.5 w-20" />
          <Skeleton className="mx-auto h-3.5 w-28" />
          <Skeleton className="mx-auto h-3.5 w-16" />
          <Skeleton className="h-3.5 w-24" />
          <Skeleton className="h-3.5 w-16" />
          <Skeleton className="ml-auto h-3.5 w-12" />
        </div>
        <div className="divide-y divide-[#F1F4F9]">
          {Array.from({ length: 7 }).map((_, i) => (
            <div
              key={i}
              className="grid grid-cols-[2.35fr_1.45fr_0.9fr_1.15fr_1.15fr_1.45fr] items-center gap-4 px-5 py-4"
            >
              <div className="flex items-center gap-3.5">
                <Skeleton className="h-[68px] w-[108px] shrink-0 rounded-xl" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-28" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
              <div className="flex flex-col items-center gap-1.5">
                <div className="flex gap-1.5">
                  <Skeleton className="h-14 w-14 rounded-lg" />
                  <Skeleton className="h-14 w-14 rounded-lg" />
                  <Skeleton className="h-14 w-14 rounded-lg" />
                </div>
                <Skeleton className="h-3 w-10" />
              </div>
              <div className="flex justify-center">
                <Skeleton className="h-6 w-24 rounded-full" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-8 w-full rounded-md" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-8 w-full rounded-md" />
              </div>
              <div className="flex justify-end gap-1.5">
                <Skeleton className="h-14 w-14 rounded-lg" />
                <Skeleton className="h-14 w-14 rounded-lg" />
                <Skeleton className="h-14 w-14 rounded-lg" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function ExploreSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Indlæser annoncer">
      {/* Konvert-style Header */}
      <div className="flex flex-col justify-between gap-3 border-b border-[#EFEFF4] pb-4 sm:flex-row sm:items-center">
        <div className="flex items-center gap-3">
          <Skeleton className="h-9 w-9 shrink-0 rounded-xl" />
          <div className="space-y-1.5">
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-3 w-64" />
          </div>
        </div>
        <Skeleton className="h-9 w-full rounded-xl sm:w-64" />
      </div>

      {/* Single Clean Toolbar Row */}
      <div className="flex flex-col gap-2.5 lg:flex-row lg:items-center lg:justify-between">
        <Skeleton className="h-8 w-full rounded-lg lg:w-[270px]" />
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-24 rounded-lg" />
          <Skeleton className="h-8 w-24 rounded-lg" />
          <Skeleton className="h-8 w-20 rounded-lg" />
          <Skeleton className="h-8 w-20 rounded-lg" />
        </div>
      </div>

      {/* 4-Column Staggered Ad Card Grid */}
      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="flex flex-col overflow-hidden rounded-[14px] border border-[#EAECEF] bg-white"
          >
            <div className="flex items-center justify-between gap-2 px-3 pb-2 pt-3">
              <div className="flex items-center gap-2">
                <Skeleton className="h-7 w-7 rounded-full" />
                <Skeleton className="h-3.5 w-24" />
              </div>
              <Skeleton className="h-5 w-11 rounded-md" />
            </div>
            <div className="space-y-1.5 px-3 pb-2.5">
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-4/5" />
            </div>
            <div className="px-2">
              <Skeleton className={`${i % 2 === 0 ? "aspect-[9/14]" : "aspect-[4/5]"} w-full rounded-[10px]`} />
            </div>
            <div className="mt-2 flex items-center justify-between border-t border-[#F1F3F7] px-3 py-2.5">
              <Skeleton className="h-3.5 w-28" />
              <Skeleton className="h-3.5 w-3.5 rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ShopAnalyticsSkeleton() {
  return (
    <div className="space-y-5" aria-busy="true" aria-label="Indlæser shop analytics">
      {/* Header + Metadata + Tabs */}
      <div className="space-y-3.5 border-b border-[#E6E9F0] pb-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Skeleton className="h-9 w-9 rounded-xl" />
            <Skeleton className="h-11 w-11 rounded-xl" />
            <div className="space-y-2">
              <Skeleton className="h-5 w-36" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
          <Skeleton className="h-9 w-36 rounded-xl" />
        </div>
        <Skeleton className="h-10 w-full rounded-xl" />
        <div className="flex items-center gap-2 pt-1">
          <Skeleton className="h-9 w-32 rounded-xl" />
          <Skeleton className="h-9 w-32 rounded-xl" />
          <Skeleton className="h-9 w-28 rounded-xl" />
        </div>
      </div>

      {/* 3 KPI Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="adtrack-kpi-card rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <Skeleton className="h-3.5 w-24" />
              <Skeleton className="h-4 w-16 rounded-md" />
            </div>
            <Skeleton className="h-8 w-32" />
          </div>
        ))}
      </div>

      {/* 2 Chart Cards */}
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="adtrack-card rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1.5">
                <Skeleton className="h-4 w-36" />
                <Skeleton className="h-3 w-48" />
              </div>
              <Skeleton className="h-7 w-28 rounded-xl" />
            </div>
            <Skeleton className="h-[190px] w-full rounded-xl" />
          </div>
        ))}
      </div>

      {/* Products + Tech Row */}
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-12">
        <div className="adtrack-card rounded-2xl p-5 xl:col-span-7 space-y-4">
          <div className="flex items-center justify-between">
            <Skeleton className="h-7 w-24" />
            <Skeleton className="h-8 w-44 rounded-xl" />
          </div>
          <div className="flex gap-3 overflow-hidden">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="w-[144px] shrink-0 space-y-2">
                <Skeleton className="aspect-square w-full rounded-xl" />
                <Skeleton className="h-3 w-28" />
                <Skeleton className="h-3 w-16" />
              </div>
            ))}
          </div>
        </div>
        <div className="adtrack-card rounded-2xl p-5 xl:col-span-5 space-y-4">
          <Skeleton className="h-10 w-full rounded-xl" />
          <div className="grid grid-cols-2 gap-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function FoldersSkeleton() {
  return (
    <div className="space-y-5" aria-busy="true" aria-label="Indlæser folders">
      <div className="flex items-center justify-between gap-3">
        <Skeleton className="h-7 w-28 rounded-lg" />
        <Skeleton className="h-9 w-28 rounded-xl" />
      </div>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="adtrack-card rounded-[20px] p-2.5 space-y-3">
            <Skeleton className="h-[210px] w-full rounded-[14px]" />
            <div className="space-y-1.5 px-1.5 pb-1">
              <Skeleton className="h-4 w-36" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
