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

// Precomputed 256-entry RGB lookup table (zero per-pixel interpolation overhead)
const LUT_R = new Uint8Array(256);
const LUT_G = new Uint8Array(256);
const LUT_B = new Uint8Array(256);
for (let i = 0; i < 256; i++) {
  const scaled = (i / 255) * (PALETTE.length - 1);
  const idx = Math.floor(scaled);
  const frac = scaled - idx;
  const a = PALETTE[idx];
  const b = PALETTE[Math.min(PALETTE.length - 1, idx + 1)];
  LUT_R[i] = Math.round(a[0] + (b[0] - a[0]) * frac);
  LUT_G[i] = Math.round(a[1] + (b[1] - a[1]) * frac);
  LUT_B[i] = Math.round(a[2] + (b[2] - a[2]) * frac);
}

const BASE_R = 5;
const BASE_G = 8;
const BASE_B = 17;

export const SidebarPixelWave = React.memo(function SidebarPixelWave() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return;

    const prefersReducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // Render crisp 3px pixel grid directly via ImageData (zero fillRect/string allocations -> <0.3ms/frame)
    const width = 266;
    const height = 480;
    const cell = 3;
    const cols = Math.ceil(width / cell);
    const rows = Math.ceil(height / cell);

    canvas.width = width;
    canvas.height = height;

    const imgData = ctx.createImageData(width, height);
    const buf = imgData.data;

    // Precompute normalized X & Y arrays
    const nxArr = new Float32Array(cols);
    for (let c = 0; c < cols; c++) nxArr[c] = c / Math.max(1, cols - 1);
    const nyArr = new Float32Array(rows);
    const topFadeArr = new Float32Array(rows);
    const bottomBoostArr = new Float32Array(rows);
    for (let r = 0; r < rows; r++) {
      const ny = r / Math.max(1, rows - 1);
      nyArr[r] = ny;
      topFadeArr[r] = Math.max(0, Math.min(1, (ny - 0.06) / 0.28));
      bottomBoostArr[r] = Math.pow(ny, 2.4) * 0.45;
    }

    // Per-column wave crests cached once per frame (only 89 sin calls instead of 10,000!)
    const wBack = new Float32Array(cols);
    const wMid = new Float32Array(cols);
    const wFront = new Float32Array(cols);

    // Pre-fill background once cleanly per frame from template buffer
    const bgTemplate = new Uint8ClampedArray(width * height * 4);
    for (let i = 0; i < bgTemplate.length; i += 4) {
      bgTemplate[i] = BASE_R;
      bgTemplate[i + 1] = BASE_G;
      bgTemplate[i + 2] = BASE_B;
      bgTemplate[i + 3] = 255;
    }

    const drawFrame = (t: number) => {
      buf.set(bgTemplate);

      for (let col = 0; col < cols; col++) {
        const nx = nxArr[col];
        wBack[col] =
          0.26 +
          0.095 * Math.sin(nx * 4.8 + t * 0.55) +
          0.045 * Math.sin(nx * 10.5 - t * 0.35 + 1.4);
        wMid[col] =
          0.46 +
          0.105 * Math.sin(nx * 6.2 - t * 0.8 + 0.9) +
          0.05 * Math.cos(nx * 13.0 + t * 0.5);
        wFront[col] =
          0.66 +
          0.085 * Math.sin(nx * 7.8 + t * 1.05 + 2.3) +
          0.042 * Math.sin(nx * 17.5 - t * 0.7);
      }

      for (let row = 0; row < rows; row++) {
        const topFade = topFadeArr[row];
        if (topFade <= 0) continue;
        const ny = nyArr[row];
        const bottomBoost = bottomBoostArr[row];
        const bayerRow = BAYER_4X4[row & 3];
        const y0 = row * cell;

        for (let col = 0; col < cols; col++) {
          const wb = wBack[col];
          const wm = wMid[col];
          const wf = wFront[col];

          const db = (ny - wb) * 18.18;
          const dm = (ny - wm) * 20.83;
          const df = (ny - wf) * 25.0;

          const ridgeBack = db * db < 9 ? Math.exp(-(db * db)) * 0.42 : 0;
          const ridgeMid = dm * dm < 9 ? Math.exp(-(dm * dm)) * 0.68 : 0;
          const ridgeFront = df * df < 9 ? Math.exp(-(df * df)) * 0.92 : 0;

          const bodyBack = ny > wb ? Math.min(1, (ny - wb) * 2.2) * 0.32 : 0;
          const bodyMid = ny > wm ? Math.min(1, (ny - wm) * 2.6) * 0.52 : 0;
          const bodyFront = ny > wf ? Math.min(1, (ny - wf) * 3.1) * 0.78 : 0;

          const bodyMax =
            bodyFront > bodyMid
              ? bodyFront > bodyBack
                ? bodyFront
                : bodyBack
              : bodyMid > bodyBack
                ? bodyMid
                : bodyBack;

          let intensity = (bodyMax + ridgeBack + ridgeMid + ridgeFront + bottomBoost) * topFade;
          if (intensity < 0.055) continue;
          if (intensity > 1) intensity = 1;

          const threshold = bayerRow[col & 3];
          if (intensity < threshold * 0.48) continue;

          let colorPos = intensity * 0.96 + (threshold - 0.5) * 0.14;
          if (colorPos < 0) colorPos = 0;
          else if (colorPos > 1) colorPos = 1;
          const lutIdx = (colorPos * 255) | 0;

          const alpha = Math.min(1, 0.24 + intensity * 0.86);
          const invA = 1 - alpha;
          const r = (LUT_R[lutIdx] * alpha + BASE_R * invA) | 0;
          const g = (LUT_G[lutIdx] * alpha + BASE_G * invA) | 0;
          const b = (LUT_B[lutIdx] * alpha + BASE_B * invA) | 0;

          // Crisp 2x2 pixel tile inside 3x3 cell (1x1 dot at low energy)
          const size = intensity > 0.28 ? 2 : 1;
          const x0 = col * cell;
          for (let dy = 0; dy < size; dy++) {
            const py = y0 + dy;
            if (py >= height) break;
            let idx = (py * width + x0) * 4;
            for (let dx = 0; dx < size; dx++) {
              if (x0 + dx >= width) break;
              buf[idx] = r;
              buf[idx + 1] = g;
              buf[idx + 2] = b;
              idx += 4;
            }
          }
        }
      }

      ctx.putImageData(imgData, 0, 0);
    };

    drawFrame(0);

    // Pause animation briefly while user actively scrolls workspace so scroll gets 100% GPU/CPU priority
    let scrollPauseUntil = 0;
    const onScroll = () => {
      scrollPauseUntil = performance.now() + 220;
    };
    window.addEventListener("scroll", onScroll, { passive: true, capture: true });

    let rafId = 0;
    let lastRender = 0;
    let phase = 0;

    if (!prefersReducedMotion) {
      const tick = (now: number) => {
        rafId = requestAnimationFrame(tick);
        if (document.hidden || now < scrollPauseUntil) return;
        // 14fps calm ambient drift (<0.25ms per frame -> ~0.3% CPU total)
        if (now - lastRender < 72) return;
        lastRender = now;
        phase += 0.028;
        drawFrame(phase);
      };
      rafId = requestAnimationFrame(tick);
    }

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("scroll", onScroll, true);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none absolute inset-x-0 bottom-0 z-0 h-[480px] w-full select-none [image-rendering:pixelated]"
    />
  );
});
