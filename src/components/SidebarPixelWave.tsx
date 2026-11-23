"use client";

import React, { useEffect, useRef } from "react";

// 4x4 Bayer ordered dithering matrix (normalized 0..1) for crisp pixel-art wave falloff
const BAYER_4X4 = [
  [0 / 16, 8 / 16, 2 / 16, 10 / 16],
  [12 / 16, 4 / 16, 14 / 16, 6 / 16],
  [3 / 16, 11 / 16, 1 / 16, 9 / 16],
  [15 / 16, 7 / 16, 13 / 16, 5 / 16],
];

// Curated Flake pure-blue palette (zero purple): obsidian -> deep navy -> #0027eb cobalt -> azure -> arctic ice
const PALETTE: [number, number, number][] = [
  [5, 8, 17],      // #050811 obsidian base
  [7, 18, 52],     // #071234 abyssal navy
  [4, 29, 128],    // #041D80 deep cobalt
  [0, 39, 235],    // #0027EB Flake electric cobalt
  [12, 84, 255],   // #0C54FF vivid royal blue
  [38, 132, 255],  // #2684FF luminous azure
  [96, 182, 255],  // #60B6FF sky highlight
  [191, 228, 255], // #BFE4FF crisp ice crest
];

function samplePalette(t: number): [number, number, number] {
  const clamped = Math.max(0, Math.min(1, t));
  const scaled = clamped * (PALETTE.length - 1);
  const idx = Math.floor(scaled);
  const frac = scaled - idx;
  const a = PALETTE[idx];
  const b = PALETTE[Math.min(PALETTE.length - 1, idx + 1)];
  return [
    Math.round(a[0] + (b[0] - a[0]) * frac),
    Math.round(a[1] + (b[1] - a[1]) * frac),
    Math.round(a[2] + (b[2] - a[2]) * frac),
  ];
}

export function SidebarPixelWave() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    const prefersReducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let width = 266;
    let height = 340;
    const cell = 3; // Crisp 3px micro-pixel matrix

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        width = Math.round(rect.width);
        height = Math.round(rect.height);
      }
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    let rafId = 0;
    let lastRender = 0;
    let phase = 0;

    const drawFrame = (t: number) => {
      ctx.clearRect(0, 0, width, height);

      const cols = Math.ceil(width / cell);
      const rows = Math.ceil(height / cell);

      for (let row = 0; row < rows; row++) {
        // ny: 0 at top of wave zone -> 1 at very bottom edge of sidebar
        const ny = row / Math.max(1, rows - 1);
        const yPx = row * cell;

        for (let col = 0; col < cols; col++) {
          const nx = col / Math.max(1, cols - 1);

          // 3 layered, braided interference wave ribbons at different depths
          const waveBack =
            0.34 +
            0.095 * Math.sin(nx * 4.8 + t * 0.55) +
            0.045 * Math.sin(nx * 10.5 - t * 0.35 + 1.4);

          const waveMid =
            0.52 +
            0.105 * Math.sin(nx * 6.2 - t * 0.8 + 0.9) +
            0.05 * Math.cos(nx * 13.0 + t * 0.5);

          const waveFront =
            0.70 +
            0.085 * Math.sin(nx * 7.8 + t * 1.05 + 2.3) +
            0.042 * Math.sin(nx * 17.5 - t * 0.7);

          // Crisp glowing ridge lines right along each wave crest
          const ridgeBack = Math.exp(-Math.pow((ny - waveBack) / 0.055, 2)) * 0.42;
          const ridgeMid = Math.exp(-Math.pow((ny - waveMid) / 0.048, 2)) * 0.68;
          const ridgeFront = Math.exp(-Math.pow((ny - waveFront) / 0.04, 2)) * 0.92;

          // Body fill underneath each wave crest (deeper glow near bottom)
          const bodyBack = ny > waveBack ? Math.min(1, (ny - waveBack) * 2.2) * 0.32 : 0;
          const bodyMid = ny > waveMid ? Math.min(1, (ny - waveMid) * 2.6) * 0.52 : 0;
          const bodyFront = ny > waveFront ? Math.min(1, (ny - waveFront) * 3.1) * 0.78 : 0;

          // Fine high-frequency micro-ripple texture inside the waves
          const microRipple =
            0.065 *
            Math.sin(nx * 24.0 + ny * 18.0 - t * 1.2) *
            Math.cos(nx * 14.0 - ny * 11.0 + t * 0.6);

          // Smooth vertical vignette so top edge dissolves cleanly into #050811
          const topFade = Math.max(0, Math.min(1, (ny - 0.06) / 0.28));
          const bottomBoost = Math.pow(ny, 2.4) * 0.45;

          const rawIntensity =
            (Math.max(bodyBack, bodyMid, bodyFront) +
              ridgeBack +
              ridgeMid +
              ridgeFront +
              bottomBoost +
              microRipple) *
            topFade;

          const intensity = Math.max(0, Math.min(1, rawIntensity));
          if (intensity < 0.055) continue;

          // Bayer 4x4 ordered dithering for authentic detailed pixel-wave stippling
          const threshold = BAYER_4X4[row & 3][col & 3];
          if (intensity < threshold * 0.48) continue;

          // Quantize slight color stepping + subtle dither noise for rich pixel banding
          const colorPos = Math.min(
            1,
            Math.max(0, intensity * 0.96 + (threshold - 0.5) * 0.14)
          );
          const [r, g, b] = samplePalette(colorPos);

          // Dynamic pixel size: delicate 1.5px spark dots at low energy -> crisp 2.4px tiles at bright crests
          const pxSize =
            intensity > 0.72
              ? 2.45
              : intensity > 0.42
                ? 2.15
                : intensity > 0.22
                  ? 1.85
                  : 1.45;

          const alpha = Math.min(1, 0.22 + intensity * 0.88);
          const offset = (cell - pxSize) * 0.5;

          ctx.fillStyle = `rgba(${r},${g},${b},${alpha.toFixed(2)})`;
          ctx.fillRect(col * cell + offset, yPx + offset, pxSize, pxSize);
        }
      }
    };

    // Draw initial crisp frame immediately
    drawFrame(0);

    if (!prefersReducedMotion) {
      const tick = (now: number) => {
        rafId = requestAnimationFrame(tick);
        if (document.hidden) return;
        // Smooth ~20fps ambient drift (ultra-light CPU, buttery wave motion)
        if (now - lastRender < 50) return;
        lastRender = now;
        phase += 0.022;
        drawFrame(phase);
      };
      rafId = requestAnimationFrame(tick);
    }

    return () => {
      cancelAnimationFrame(rafId);
      ro.disconnect();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none absolute inset-x-0 bottom-0 z-0 h-[340px] w-full select-none"
    />
  );
}
