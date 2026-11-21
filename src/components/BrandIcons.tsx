"use client";

import React from "react";

export function ShopifyBagIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="M19.4 5.9a.6.6 0 0 0-.55-.45l-2.05-.15s-1.5-1.45-1.65-1.6c-.15-.15-.45-.1-.55-.07l-.78.24c-.47-1.36-1.3-2.6-2.77-2.6h-.12C10.5.75 9.97.5 9.52.5 6.84.5 5.56 3.85 5.16 5.56L3 6.23c-.65.2-.67.23-.76.84L.8 18.23 15.65 21l5.55-1.2-1.8-13.9z"
        fill="#95BF47"
      />
      <path
        d="M18.85 5.45l-2.05-.15c-.15-.15-.52-.5-.88-.86L15.65 21l5.55-1.2-1.8-13.9a.6.6 0 0 0-.55-.45z"
        fill="#5E8E3E"
      />
      <path
        d="M12.35 8.85l-.68 2.02s-.6-.32-1.33-.32c-1.08 0-1.13.68-1.13.85 0 .93 2.43 1.29 2.43 3.47 0 1.72-1.09 2.82-2.56 2.82-1.76 0-2.66-1.1-2.66-1.1l.47-1.56s.93.8 1.71.8c.51 0 .72-.4.72-.7 0-1.22-1.99-1.27-1.99-3.27 0-1.68 1.21-3.31 3.64-3.31.94 0 1.38.3 1.38.3z"
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

/**
 * Renders an authentic full-color vector brand icon for any detected Pixel or Shopify App.
 */
export function TechBrandIcon({
  name,
  className = "h-5 w-5",
}: {
  name: string;
  className?: string;
}) {
  const key = name.toLowerCase();

  // PIXELS
  if (key.includes("meta")) {
    return (
      <span className={`inline-flex items-center justify-center rounded-md bg-[#EBF3FF] ${className}`}>
        <MetaInfinityIcon className="h-[72%] w-[72%]" />
      </span>
    );
  }
  if (key.includes("google analytics")) {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
        <rect x="15.5" y="3.5" width="4.5" height="17" rx="2.25" fill="#E37400" />
        <rect x="9.75" y="9.5" width="4.5" height="11" rx="2.25" fill="#F9AB00" />
        <circle cx="6.25" cy="18.25" r="2.25" fill="#F9AB00" />
      </svg>
    );
  }
  if (key.includes("tag manager")) {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
        <path d="M12 2.5L21.5 12 12 21.5 2.5 12 12 2.5z" fill="#4285F4" />
        <path d="M12 2.5L21.5 12 17 16.5 7.5 7 12 2.5z" fill="#8AB4F8" />
        <circle cx="12" cy="17" r="2" fill="#246FDB" />
      </svg>
    );
  }
  if (key.includes("google ads")) {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
        <path d="M4.2 17.8L10.7 5.2a2.1 2.1 0 0 1 3.7 1.9L7.9 19.7a2.1 2.1 0 0 1-3.7-1.9z" fill="#FBBC04" />
        <path d="M19.8 17.8L13.3 5.2a2.1 2.1 0 0 0-3.7 1.9l6.5 12.6a2.1 2.1 0 0 0 3.7-1.9z" fill="#4285F4" />
        <circle cx="6" cy="18.7" r="2.2" fill="#34A853" />
      </svg>
    );
  }
  if (key.includes("tiktok")) {
    return <TikTokColorIcon className={className} />;
  }
  if (key.includes("pinterest")) {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
        <circle cx="12" cy="12" r="10" fill="#E60023" />
        <path
          d="M12.2 6.8c-3 0-4.7 2-4.7 4.2 0 1 .55 2.2 1.4 2.6.13.06.2.03.23-.09l.2-.82c.03-.1 0-.16-.06-.24-.28-.34-.5-.95-.5-1.52 0-1.47 1.12-2.9 3.03-2.9 1.65 0 2.8 1.12 2.8 2.72 0 1.82-.92 3.08-2.12 3.08-.66 0-1.16-.54-1-1.22.19-.8.56-1.67.56-2.25 0-.52-.28-.95-.85-.95-.68 0-1.22.7-1.22 1.64 0 .6.2 1 .2 1l-.82 3.48c-.21.9-.03 2.02-.01 2.13.01.07.09.09.13.04.06-.07.76-.96 1-1.85l.4-1.54c.21.4.82.74 1.48.74 1.95 0 3.35-1.8 3.35-4.04 0-2.14-1.76-3.77-4.4-3.77z"
          fill="#FFFFFF"
        />
      </svg>
    );
  }
  if (key.includes("snap")) {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
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
  if (key.includes("twitter")) {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
        <rect x="2" y="2" width="20" height="20" rx="5.5" fill="#0F1419" />
        <path
          d="M13.3 10.9L17.9 5.6h-1.1l-4 4.6L9.6 5.6H5.9l4.8 7-4.8 5.6h1.1l4.2-4.9 3.4 4.9h3.7l-5-7.3zm-1.5 1.7l-.5-.7-3.9-5.5h1.7l3.1 4.5.5.7 4 5.8h-1.7l-3.2-4.8z"
          fill="#FFFFFF"
        />
      </svg>
    );
  }
  if (key.includes("microsoft") && !key.includes("clarity")) {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
        <rect x="3" y="3" width="8.4" height="8.4" rx="1.2" fill="#F25022" />
        <rect x="12.6" y="3" width="8.4" height="8.4" rx="1.2" fill="#7FBA00" />
        <rect x="3" y="12.6" width="8.4" height="8.4" rx="1.2" fill="#00A4EF" />
        <rect x="12.6" y="12.6" width="8.4" height="8.4" rx="1.2" fill="#FFB900" />
      </svg>
    );
  }
  if (key.includes("clarity")) {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
        <rect x="2" y="2" width="20" height="20" rx="5.5" fill="#1E40AF" />
        <circle cx="12" cy="12" r="5.5" stroke="#93C5FD" strokeWidth="2.2" />
        <circle cx="12" cy="12" r="2" fill="#FFFFFF" />
      </svg>
    );
  }
  if (key.includes("taboola")) {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
        <rect x="2" y="4" width="20" height="16" rx="5" fill="#004B87" />
        <circle cx="9" cy="11.5" r="2.2" stroke="#FFFFFF" strokeWidth="1.6" />
        <circle cx="15" cy="11.5" r="2.2" stroke="#FFFFFF" strokeWidth="1.6" />
        <path d="M8.5 16c1.1.9 2.2 1.2 3.5 1.2s2.4-.3 3.5-1.2" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    );
  }
  if (key.includes("reddit")) {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
        <circle cx="12" cy="12" r="10" fill="#FF4500" />
        <circle cx="12" cy="13.5" r="4.8" fill="#FFFFFF" />
        <circle cx="10.2" cy="13" r="0.9" fill="#FF4500" />
        <circle cx="13.8" cy="13" r="0.9" fill="#FF4500" />
      </svg>
    );
  }
  if (key.includes("linkedin")) {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
        <rect x="2" y="2" width="20" height="20" rx="4.5" fill="#0A66C2" />
        <path d="M7.5 10v7M7.5 7.2v.1M11 17v-4c0-1.4 1-2.5 2.4-2.5S15.8 11.6 15.8 13v4M11 10v7" stroke="#FFFFFF" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    );
  }
  if (key.includes("hotjar")) {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
        <rect x="2" y="2" width="20" height="20" rx="5.5" fill="#FF3C00" />
        <path d="M13.5 6.5c-2.5 1.8-4.5 3.6-4.5 6.2 0 1.4.8 2.4 2 2.8-.2-1.1.3-2.2 1.3-3 .5 1.5 1.5 2.4 1.5 4.2 0 1.2-.6 2.1-1.5 2.8 2.8-.6 4.7-2.8 4.7-5.9 0-3.2-2.2-4.8-3.5-7.1z" fill="#FFFFFF" />
      </svg>
    );
  }

  // SHOPIFY APPS
  if (key.includes("klaviyo")) {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
        <rect x="2" y="2" width="20" height="20" rx="5.5" fill="#111318" />
        <path d="M6.5 7.5h11l-3.6 4.5 3.6 4.5h-11v-9z" fill="#FFFFFF" />
      </svg>
    );
  }
  if (key.includes("triple whale")) {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
        <rect x="2" y="2" width="20" height="20" rx="5.5" fill="#0B5CFF" />
        <path d="M6 14.5c1.8-4 5.5-5.5 9.2-4.2 1.4.5 2.3 1.4 2.8 2.4-1.5.5-2.6 1.2-3.4 2.3H6z" fill="#FFFFFF" />
        <circle cx="10.2" cy="12.2" r="0.9" fill="#0B5CFF" />
      </svg>
    );
  }
  if (key.includes("trustpilot")) {
    return <TrustpilotStarIcon className={className} />;
  }
  if (key.includes("klarna")) {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
        <rect x="2" y="2" width="20" height="20" rx="5.5" fill="#FFB3C7" />
        <path d="M7.5 7v10M14.5 7c0 2.5-1.3 4.6-3.3 5.8L15 17" stroke="#0A0B0F" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="17.2" cy="16.2" r="1.2" fill="#0A0B0F" />
      </svg>
    );
  }
  if (key.includes("shop pay")) {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
        <rect x="2" y="2" width="20" height="20" rx="5.5" fill="#5A31F4" />
        <path d="M8.5 14.2c.6.6 1.7 1 2.9 1 1.5 0 2.4-.7 2.4-1.7 0-1-.8-1.5-2.5-1.9-1.9-.4-3-1.1-3-2.5 0-1.5 1.3-2.6 3.2-2.6 1.2 0 2.2.3 2.9.9" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" />
      </svg>
    );
  }
  if (key.includes("gorgias")) {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
        <rect x="2" y="2" width="20" height="20" rx="5.5" fill="#1F2937" />
        <path d="M7 9.5a5 5 0 0 1 10 0v3.5a2 2 0 0 1-2 2h-4l-3 2.5V15a2 2 0 0 1-1-1.7V9.5z" fill="#60A5FA" />
      </svg>
    );
  }
  if (key.includes("judge.me") || key.includes("yotpo") || key.includes("loox") || key.includes("okendo") || key.includes("stamped") || key.includes("reviews") || key.includes("lipscore")) {
    const bg = key.includes("yotpo")
      ? "#0066FF"
      : key.includes("loox")
        ? "#FF4F79"
        : key.includes("okendo")
          ? "#111827"
          : "#0EA5E9";
    return (
      <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
        <rect x="2" y="2" width="20" height="20" rx="5.5" fill={bg} />
        <path d="M12 6.2l1.6 4.4h4.6l-3.7 2.8 1.4 4.5-3.9-2.8-3.9 2.8 1.4-4.5-3.7-2.8h4.6L12 6.2z" fill="#FFFFFF" />
      </svg>
    );
  }
  if (key.includes("recharge") || key.includes("skio")) {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
        <rect x="2" y="2" width="20" height="20" rx="5.5" fill="#1D4ED8" />
        <path d="M16.5 10.5a4.8 4.8 0 0 0-8.6-1.7M7.5 13.5a4.8 4.8 0 0 0 8.6 1.7" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" />
        <path d="M17 7.5v3.2h-3.2M7 16.5v-3.2h3.2" stroke="#FFFFFF" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  if (key.includes("rebuy") || key.includes("aftersell") || key.includes("zipify")) {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
        <rect x="2" y="2" width="20" height="20" rx="5.5" fill="#0027EB" />
        <path d="M7.5 15.5l3.5-4 2.5 2.5 3.5-5" stroke="#FFFFFF" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  if (key.includes("cookiebot") || key.includes("onetrust") || key.includes("pandectes")) {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
        <rect x="2" y="2" width="20" height="20" rx="5.5" fill="#0F766E" />
        <path d="M12 6l5 2.2v4.3c0 3-2.1 5.2-5 6.2-2.9-1-5-3.2-5-6.2V8.2L12 6z" stroke="#FFFFFF" strokeWidth="1.8" />
        <path d="M9.8 12.2l1.5 1.5 3.2-3.2" stroke="#FFFFFF" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
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
