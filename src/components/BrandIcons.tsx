"use client";

import React from "react";
import { getTechLogoUrl } from "@/lib/tech-catalog";

export function ShopifyBagIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 109.5 124.5" fill="none" className={className} aria-hidden="true">
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M95.9 23.9c-.1-.6-.6-1-1.1-1-.5 0-9.3-.2-9.3-.2s-7.4-7.2-8.1-7.9c-.7-.7-2.2-.5-2.7-.3-.1 0-1.4.4-3.7 1.1-2.2-6.4-6.1-12.3-13-12.3h-.6C55.4 1.1 53 0 50.9 0 35.1 0 27.6 19.8 25.2 29.8c-5.9 1.8-10.1 3.1-10.6 3.3-3.3 1-3.4 1.1-3.8 4.2C10.4 39.7 0 110.2 0 110.2l75.7 14.2 33.8-7.3S96 24.5 95.9 23.9zM67.2 16.8c-1.8.6-3.8 1.2-5.9 1.8 0-3-.4-7.2-1.8-10.7 4.4.8 6.6 5.8 7.7 8.9zm-11.9 3.7c-4 1.2-8.4 2.6-12.8 4 1.2-4.8 3.6-9.5 7.9-11.6 1.5-.7 2.8-.9 3.7-.7 1.1 2.7 1.2 6.5 1.2 8.3zm-6.1-15c1.1 0 2 .3 2.8.8-4.7 2.2-9.6 7.8-11.7 18.8-3.5 1.1-6.9 2.1-10 3.1C33.1 17.5 39.4 5.5 49.2 5.5z"
        fill="#95BF47"
      />
      <path
        d="M94.8 22.9c-.5 0-9.3-.2-9.3-.2s-7.4-7.2-8.1-7.9c-.3-.3-.6-.4-1-.4L75.7 124.4l33.8-7.3S96 24.5 95.9 23.9c-.1-.6-.6-1-1.1-1z"
        fill="#5E8E3E"
      />
      <path
        d="M58.4 45.9l-4.2 12.6s-3.7-2-8.2-2c-6.6 0-7 4.2-7 5.2 0 5.7 14.9 7.9 14.9 21.3 0 10.6-6.7 17.4-15.7 17.4-10.8 0-16.4-6.8-16.4-6.8l2.9-9.6s5.7 4.9 10.5 4.9c3.1 0 4.4-2.5 4.4-4.3 0-7.5-12.2-7.8-12.2-20.1 0-10.3 7.4-20.3 22.4-20.3 5.8 0 8.6 1.7 8.6 1.7z"
        fill="#FFFFFF"
      />
    </svg>
  );
}

export function MetaInfinityIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="M6.8 6.5c-2.6 0-4.8 2.7-4.8 6 0 2.5 1.3 4.5 3.3 4.5 1.9 0 3.3-1.4 5.1-4.3l1.6-2.6 1.6 2.6c1.8 2.9 3.2 4.3 5.1 4.3 2 0 3.3-2 3.3-4.5 0-3.3-2.2-6-4.8-6-1.8 0-3.2 1.1-4.6 3.3l-.6 1-.6-1C10 7.6 8.6 6.5 6.8 6.5z"
        stroke="#0064E0"
        strokeWidth="2.1"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function InstagramColorIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="igGrad" x1="2" y1="22" x2="22" y2="2" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FCAF45" />
          <stop offset="35%" stopColor="#F77737" />
          <stop offset="68%" stopColor="#E1306C" />
          <stop offset="100%" stopColor="#833AB4" />
        </linearGradient>
      </defs>
      <rect x="2" y="2" width="20" height="20" rx="6" fill="url(#igGrad)" />
      <rect x="6.5" y="6.5" width="11" height="11" rx="3.4" stroke="#FFFFFF" strokeWidth="1.7" />
      <circle cx="12" cy="12" r="2.6" stroke="#FFFFFF" strokeWidth="1.7" />
      <circle cx="15.7" cy="8.3" r="0.95" fill="#FFFFFF" />
    </svg>
  );
}

export function FacebookColorIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <circle cx="12" cy="12" r="10" fill="#1877F2" />
      <path
        d="M15.4 12.6l.4-2.7h-2.6V8.1c0-.75.37-1.48 1.54-1.48H16V4.3s-1.08-.18-2.12-.18c-2.16 0-3.57 1.31-3.57 3.68v2.1H8v2.7h2.31V19.5c.47.07.95.11 1.44.11s.97-.04 1.44-.11v-6.9h2.21z"
        fill="#FFFFFF"
      />
    </svg>
  );
}

export function TikTokColorIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <rect x="2" y="2" width="20" height="20" rx="5.5" fill="#0A0B0F" />
      <path
        d="M15.6 8.8c-1.1-.6-1.8-1.6-2-2.8h-2v8.4a1.75 1.75 0 1 1-1.3-1.7v-2.1a3.85 3.85 0 1 0 3.35 3.8V10c.85.65 1.9 1 3 1V9c-.4 0-.75-.08-1.05-.2z"
        fill="#25F4EE"
        transform="translate(-0.5,-0.4)"
      />
      <path
        d="M15.6 8.8c-1.1-.6-1.8-1.6-2-2.8h-2v8.4a1.75 1.75 0 1 1-1.3-1.7v-2.1a3.85 3.85 0 1 0 3.35 3.8V10c.85.65 1.9 1 3 1V9c-.4 0-.75-.08-1.05-.2z"
        fill="#FE2C55"
        transform="translate(0.5,0.4)"
      />
      <path
        d="M15.6 8.8c-1.1-.6-1.8-1.6-2-2.8h-2v8.4a1.75 1.75 0 1 1-1.3-1.7v-2.1a3.85 3.85 0 1 0 3.35 3.8V10c.85.65 1.9 1 3 1V9c-.4 0-.75-.08-1.05-.2z"
        fill="#FFFFFF"
      />
    </svg>
  );
}

export function YouTubeColorIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <rect x="2" y="5" width="20" height="14" rx="4.2" fill="#FF0000" />
      <path d="M10 9l5.5 3L10 15V9z" fill="#FFFFFF" />
    </svg>
  );
}

export function TrustpilotStarIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <rect x="2" y="2" width="20" height="20" rx="4" fill="#00B67A" />
      <path
        d="M12 5.4l1.75 5.1h5.35l-4.3 3.15 1.65 5.1L12 15.6l-4.45 3.15 1.65-5.1-4.3-3.15h5.35L12 5.4z"
        fill="#FFFFFF"
      />
    </svg>
  );
}

export function ChromeColorIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="M12 2C8.32 2 5.11 3.99 3.38 6.96L7.68 14.4C7.25 13.68 7 12.87 7 12C7 9.24 9.24 7 12 7H20.66C19.01 4.02 15.75 2 12 2Z"
        fill="#EA4335"
      />
      <path
        d="M12 22C17.52 22 22 17.52 22 12C22 10.17 21.5 8.46 20.66 7H12C14.76 7 17 9.24 17 12C17 12.92 16.75 13.78 16.32 14.52L12.01 22H12Z"
        fill="#FBBC04"
      />
      <path
        d="M3.38 6.96C2.5 8.44 2 10.16 2 12C2 17.52 6.48 22 12 22L16.32 14.52C15.44 16.01 13.84 17 12 17C10.15 17 8.55 15.99 7.68 14.4L3.38 6.96Z"
        fill="#34A853"
      />
      <circle cx="12" cy="12" r="4.6" fill="#FFFFFF" />
      <circle cx="12" cy="12" r="3.5" fill="#1A73E8" />
    </svg>
  );
}

export function InstagramMonoIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <rect
        x="3"
        y="3"
        width="18"
        height="18"
        rx="5"
        stroke="currentColor"
        strokeWidth="1.9"
      />
      <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.9" />
      <circle cx="17.2" cy="6.8" r="1.1" fill="currentColor" />
    </svg>
  );
}

export function GoogleDriveColorIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path d="M8.6 3.5h6.8l6.6 11.4h-6.8L8.6 3.5z" fill="#FBBC04" />
      <path d="M2 14.9L8.6 3.5l3.4 5.9L5.4 20.8 2 14.9z" fill="#0F9D58" />
      <path d="M5.4 20.8l3.4-5.9H22l-3.4 5.9H5.4z" fill="#4285F4" />
    </svg>
  );
}

export function SlackColorIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="M6.2 14.7a2 2 0 1 1-2-2h2v2zm1 0a2 2 0 1 1 4 0v5a2 2 0 1 1-4 0v-5z"
        fill="#E01E5A"
      />
      <path
        d="M9.2 6.2a2 2 0 1 1 2-2v2h-2zm0 1a2 2 0 1 1 0 4h-5a2 2 0 1 1 0-4h5z"
        fill="#36C5F0"
      />
      <path
        d="M17.8 9.2a2 2 0 1 1 2 2h-2v-2zm-1 0a2 2 0 1 1-4 0v-5a2 2 0 1 1 4 0v5z"
        fill="#2EB67D"
      />
      <path
        d="M14.8 17.8a2 2 0 1 1-2 2v-2h2zm0-1a2 2 0 1 1 0-4h5a2 2 0 1 1 0 4h-5z"
        fill="#ECB22E"
      />
    </svg>
  );
}

export function ClaudeBrandIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <circle cx="12" cy="12" r="10" fill="#F4EDE4" />
      <path
        d="M12 5.2v13.6M5.2 12h13.6M7.2 7.2l9.6 9.6M16.8 7.2l-9.6 9.6"
        stroke="#D97757"
        strokeWidth="1.9"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function ChatGptBrandIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <circle cx="12" cy="12" r="10" fill="#10A37F" />
      <path
        d="M12 6.5a3 3 0 0 1 2.8 1.9 3 3 0 0 1 2 4.4 3 3 0 0 1-1.9 4.5 3 3 0 0 1-5.8 0 3 3 0 0 1-1.9-4.5 3 3 0 0 1 2-4.4A3 3 0 0 1 12 6.5z"
        stroke="#FFFFFF"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12" r="1.7" fill="#FFFFFF" />
    </svg>
  );
}

export function CursorBrandIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <circle cx="12" cy="12" r="10" fill="#0F172A" />
      <path
        d="M12 5.4L17.8 8.8v6.4L12 18.6l-5.8-3.4V8.8L12 5.4z"
        stroke="#FFFFFF"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <path d="M12 5.4l5.8 3.4L12 12 6.2 8.8 12 5.4z" fill="#FFFFFF" fillOpacity="0.9" />
      <path d="M12 12v6.6" stroke="#FFFFFF" strokeWidth="1.4" />
    </svg>
  );
}

export function AtriaInspoCompassIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="currentColor" className={className} aria-hidden="true">
      <path d="M10.65 5.68673C10.7221 5.47676 10.5211 5.27573 10.3111 5.34788L4.60337 7.30912C4.37747 7.38674 4.35971 7.69938 4.57538 7.80207L6.94248 8.92924C6.99775 8.95556 7.04228 9.00009 7.0686 9.05536L8.19577 11.4225C8.29846 11.6381 8.6111 11.6204 8.68873 11.3945L10.65 5.68673Z" />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M3.05006 3.05006C5.78347 0.316648 10.2161 0.316648 12.9496 3.05006C15.683 5.78347 15.683 10.2161 12.9496 12.9496C10.2161 15.683 5.78347 15.683 3.05006 12.9496C0.316648 10.2161 0.316648 5.78347 3.05006 3.05006ZM3.88975 3.88975C1.62038 6.15912 1.62038 9.84049 3.88975 12.1099C6.15912 14.3792 9.84049 14.3792 12.1099 12.1099C14.3792 9.84049 14.3792 6.15912 12.1099 3.88975C9.84049 1.62038 6.15912 1.62038 3.88975 3.88975Z"
      />
    </svg>
  );
}

export function AtriaAdMakerSparkleIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg
      viewBox="-1.5 1 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M12.2 6H6a3 3 0 0 0-3 3v8a3 3 0 0 0 3 3h9a3 3 0 0 0 3-3v-5.3" />
      <path d="M9.4 11v4l3.4-2z" fill="currentColor" stroke="none" />
      <path
        d="M18.6 1.5c.6 2.25 1.65 3.3 3.9 3.9-2.25.6-3.3 1.65-3.9 3.9-.6-2.25-1.65-3.3-3.9-3.9 2.25-.6 3.3-1.65 3.9-3.9z"
        fill="currentColor"
        stroke="none"
      />
    </svg>
  );
}

export function AtriaBoardGridIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.35"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <rect x="2" y="2" width="12" height="12" rx="2" />
      <line x1="8" y1="2" x2="8" y2="14" />
      <line x1="2" y1="8" x2="14" y2="8" />
    </svg>
  );
}

/**
 * Renders crisp vector icons for core Ad Pixels and fetches real official logos
 * via /api/tech-logo (7-day CDN cached) for all Shopify Apps & additional Pixels,
 * with graceful fallback if a remote icon is unavailable.
 */
export function TechBrandIcon({
  name,
  className = "h-5 w-5",
}: {
  name: string;
  className?: string;
}) {
  const [failedName, setFailedName] = React.useState<string | null>(null);
  const logoError = failedName === name;
  const key = name.toLowerCase();

  // Core Ad Platform Vector SVGs (instant render, razor-sharp)
  if (key === "meta pixel") {
    return (
      <span className={`inline-flex shrink-0 items-center justify-center rounded-md bg-[#EBF3FF] ${className}`}>
        <MetaInfinityIcon className="h-[74%] w-[74%]" />
      </span>
    );
  }
  if (key === "google analytics") {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={`shrink-0 ${className}`} aria-hidden="true">
        <rect x="15.5" y="3.5" width="4.5" height="17" rx="2.25" fill="#E37400" />
        <rect x="9.75" y="9.5" width="4.5" height="11" rx="2.25" fill="#F9AB00" />
        <circle cx="6.25" cy="18.25" r="2.25" fill="#F9AB00" />
      </svg>
    );
  }
  if (key === "google tag manager") {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={`shrink-0 ${className}`} aria-hidden="true">
        <path d="M12 2.5L21.5 12 12 21.5 2.5 12 12 2.5z" fill="#4285F4" />
        <path d="M12 2.5L21.5 12 17 16.5 7.5 7 12 2.5z" fill="#8AB4F8" />
        <circle cx="12" cy="17" r="2" fill="#246FDB" />
      </svg>
    );
  }
  if (key === "google ads") {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={`shrink-0 ${className}`} aria-hidden="true">
        <path d="M4.2 17.8L10.7 5.2a2.1 2.1 0 0 1 3.7 1.9L7.9 19.7a2.1 2.1 0 0 1-3.7-1.9z" fill="#FBBC04" />
        <path d="M19.8 17.8L13.3 5.2a2.1 2.1 0 0 0-3.7 1.9l6.5 12.6a2.1 2.1 0 0 0 3.7-1.9z" fill="#4285F4" />
        <circle cx="6" cy="18.7" r="2.2" fill="#34A853" />
      </svg>
    );
  }
  if (key === "tiktok pixel") {
    return <TikTokColorIcon className={`shrink-0 ${className}`} />;
  }
  if (key === "pinterest ads") {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={`shrink-0 ${className}`} aria-hidden="true">
        <circle cx="12" cy="12" r="10" fill="#E60023" />
        <path
          d="M12.2 6.8c-3 0-4.7 2-4.7 4.2 0 1 .55 2.2 1.4 2.6.13.06.2.03.23-.09l.2-.82c.03-.1 0-.16-.06-.24-.28-.34-.5-.95-.5-1.52 0-1.47 1.12-2.9 3.03-2.9 1.65 0 2.8 1.12 2.8 2.72 0 1.82-.92 3.08-2.12 3.08-.66 0-1.16-.54-1-1.22.19-.8.56-1.67.56-2.25 0-.52-.28-.95-.85-.95-.68 0-1.22.7-1.22 1.64 0 .6.2 1 .2 1l-.82 3.48c-.21.9-.03 2.02-.01 2.13.01.07.09.09.13.04.06-.07.76-.96 1-1.85l.4-1.54c.21.4.82.74 1.48.74 1.95 0 3.35-1.8 3.35-4.04 0-2.14-1.76-3.77-4.4-3.77z"
          fill="#FFFFFF"
        />
      </svg>
    );
  }
  if (key === "snap pixel") {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={`shrink-0 ${className}`} aria-hidden="true">
        <rect x="2" y="2" width="20" height="20" rx="5.5" fill="#FFFC00" stroke="#E5DF00" strokeWidth="0.6" />
        <path
          d="M12 6.3c-2.2 0-3.6 1.5-3.6 3.7 0 .5.08 1 .12 1.3-.32.16-.7.1-.95.28-.2.15-.2.43.05.6.4.27 1 .38 1.12.68.08.22-.58 1.65-2.04 2.04-.25.07-.3.36-.08.5.54.34 1.27.45 1.65.65.16.08.16.48.4.6.42.22 1.05-.05 1.72.24.48.2 1 .48 1.61.48s1.13-.28 1.61-.48c.67-.29 1.3-.02 1.72-.24.24-.12.24-.52.4-.6.38-.2 1.11-.31 1.65-.65.22-.14.17-.43-.08-.5-1.46-.39-2.12-1.82-2.04-2.04.12-.3.72-.41 1.12-.68.25-.17.25-.45.05-.6-.25-.18-.63-.12-.95-.28.04-.3.12-.8.12-1.3 0-2.2-1.4-3.7-3.6-3.7z"
          fill="#FFFFFF"
          stroke="#111111"
          strokeWidth="1.2"
        />
      </svg>
    );
  }
  if (key === "twitter ads") {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={`shrink-0 ${className}`} aria-hidden="true">
        <rect x="2" y="2" width="20" height="20" rx="5.5" fill="#0F1419" />
        <path
          d="M13.3 10.9L17.9 5.6h-1.1l-4 4.6L9.6 5.6H5.9l4.8 7-4.8 5.6h1.1l4.2-4.9 3.4 4.9h3.7l-5-7.3zm-1.5 1.7l-.5-.7-3.9-5.5h1.7l3.1 4.5.5.7 4 5.8h-1.7l-3.2-4.8z"
          fill="#FFFFFF"
        />
      </svg>
    );
  }
  if (key === "microsoft advertising") {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={`shrink-0 ${className}`} aria-hidden="true">
        <rect x="3" y="3" width="8.4" height="8.4" rx="1.2" fill="#F25022" />
        <rect x="12.6" y="3" width="8.4" height="8.4" rx="1.2" fill="#7FBA00" />
        <rect x="3" y="12.6" width="8.4" height="8.4" rx="1.2" fill="#00A4EF" />
        <rect x="12.6" y="12.6" width="8.4" height="8.4" rx="1.2" fill="#FFB900" />
      </svg>
    );
  }

  // Real fetched brand logo via /api/tech-logo (for all Shopify Apps + extra Pixels!)
  const logoUrl = getTechLogoUrl(name);
  if (logoUrl && !logoError) {
    return (
      /* eslint-disable-next-line @next/next/no-img-element */
      <img
        src={logoUrl}
        alt={name}
        loading="lazy"
        onError={() => setFailedName(name)}
        className={`shrink-0 rounded-[5px] object-contain ${className}`}
      />
    );
  }

  // Polished branded monogram fallback
  const colors = ["#0027EB", "#0F766E", "#D97706", "#DC2626", "#2563EB", "#111827"];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  const bg = colors[Math.abs(hash) % colors.length];
  const letters = name
    .split(/[\s.-]+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-[6px] font-display text-[9px] font-bold text-white ${className}`}
      style={{ backgroundColor: bg }}
    >
      {letters}
    </span>
  );
}
