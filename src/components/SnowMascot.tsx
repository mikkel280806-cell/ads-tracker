"use client";

import React from "react";

/**
 * Crisp 12×12 monochrome pixel-art Snow character glyph.
 * Uses fillRule="evenodd" eye cutouts so it adapts cleanly to dark sidebars,
 * light Liquid Glass tab bars, and Cobalt buttons at any size (14px–24px).
 */
export function SnowMark({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 12 12"
      fill="currentColor"
      shapeRendering="crispEdges"
      className={className}
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M2 1h2v1h1v1h2V2h1V1h2v2h1v1h1v5h-1v1h-1v1H2v-1H1V9H0V4h1V3h1V1ZM3 6h1v2H3V6Zm5 0h1v2H8V6Z"
      />
    </svg>
  );
}

/**
 * Full-body 18×18 clean pixel-art Snow mascot character.
 * Mathematically symmetric pixel grid in Flake's palette:
 * Crisp White (#FFFFFF), Ice Blue (#E0F2FE / #BAE6FD),
 * Deep Obsidian (#0F172A), and Flake Cobalt (#0027eb) pixel scarf.
 */
export function SnowCharacter({
  size = 64,
  thinking = false,
  animate = true,
  className = "",
}: {
  size?: number;
  thinking?: boolean;
  animate?: boolean;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 18 18"
      fill="none"
      shapeRendering="crispEdges"
      className={`select-none ${animate ? "snow-pixel-idle" : ""} ${className}`}
      role="img"
      aria-label="Snow AI karakter"
    >
      {/* Subtle grounded pixel shadow */}
      <rect x="4" y="16" width="10" height="1" fill="#0F172A" fillOpacity="0.1" />
      <rect x="6" y="17" width="6" height="1" fill="#0F172A" fillOpacity="0.05" />

      {/* Outer crisp pixel silhouette (#0F172A), 100% symmetric around x=9 */}
      <path
        fill="#0F172A"
        d="M4 0H6V1H7V2H11V1H12V0H14V1H15V3H16V4H17V9H16V11H15V14H14V15H13V16H11V15H7V16H5V15H4V14H3V11H2V9H1V4H2V3H3V1H4V0Z"
      />

      {/* Crisp pure white snow ears + rounded pixel head */}
      <rect x="4" y="1" width="2" height="2" fill="#FFFFFF" />
      <rect x="12" y="1" width="2" height="2" fill="#FFFFFF" />
      <rect x="4" y="2" width="3" height="1" fill="#FFFFFF" />
      <rect x="11" y="2" width="3" height="1" fill="#FFFFFF" />
      <rect x="3" y="3" width="12" height="1" fill="#FFFFFF" />
      <rect x="2" y="4" width="14" height="5" fill="#FFFFFF" />
      <rect x="3" y="9" width="12" height="1" fill="#FFFFFF" />

      {/* Soft glacial ice cheeks & subtle chin rim */}
      <rect x="4" y="8" width="1" height="1" fill="#BAE6FD" />
      <rect x="13" y="8" width="1" height="1" fill="#BAE6FD" />
      <rect x="3" y="9" width="2" height="1" fill="#E0F2FE" />
      <rect x="13" y="9" width="2" height="1" fill="#E0F2FE" />

      {/* Compact cozy snow body */}
      <rect x="4" y="11" width="10" height="3" fill="#FFFFFF" />
      <rect x="4" y="12" width="1" height="2" fill="#E0F2FE" />
      <rect x="5" y="13" width="1" height="1" fill="#E0F2FE" />
      <rect x="13" y="12" width="1" height="2" fill="#E0F2FE" />

      {/* Two neat little pixel feet */}
      <rect x="5" y="14" width="2" height="1" fill="#E0F2FE" />
      <rect x="11" y="14" width="2" height="1" fill="#E0F2FE" />

      {/* Signature Flake Cobalt pixel scarf */}
      <rect x="3" y="10" width="12" height="1" fill="#0027eb" />
      <rect x="5" y="10" width="2" height="1" fill="#60A5FA" />
      <rect x="10" y="11" width="2" height="3" fill="#0027eb" />
      <rect x="10" y="12" width="1" height="1" fill="#60A5FA" />
      <rect x="10" y="13" width="2" height="1" fill="#001BB8" />

      {/* Crisp 1×2 pixel eyes (with stepped pixel blink) */}
      <g className={animate ? "snow-pixel-eyes" : ""}>
        <rect x="6" y="6" width="1" height="2" fill="#0F172A" />
        <rect x="11" y="6" width="1" height="2" fill="#0F172A" />
      </g>

      {/* Tiny cobalt pixel sparkle when thinking */}
      {thinking && (
        <g className="snow-pixel-sparkle">
          <rect x="16" y="0" width="1" height="3" fill="#0027eb" />
          <rect x="15" y="1" width="3" height="1" fill="#0027eb" />
          <rect x="16" y="1" width="1" height="1" fill="#BAE6FD" />
        </g>
      )}
    </svg>
  );
}
