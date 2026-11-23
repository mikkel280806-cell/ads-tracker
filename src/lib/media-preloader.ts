import type { Ad } from "./types";

/**
 * Lightweight Instagram / TikTok-style Predictive Media Preloader.
 *
 * 1. Thumbnails ALWAYS get priority #1 with bounded concurrency so visible images
 *    never starve for HTTP sockets.
 * 2. Videos are warmed via tiny HTTP Range fetches (first 256KB header/moov atom)
 *    during browser idle time — ZERO offscreen <video> hardware decoder churn!
 */
const preloadedImages = new Set<string>();
const imageQueue: string[] = [];
let activeImages = 0;
const MAX_CONCURRENT_IMAGES = 6;

const preloadedVideos = new Set<string>();
const videoQueue: string[] = [];
let activeVideos = 0;
const MAX_CONCURRENT_VIDEOS = 2;

function scheduleIdle(fn: () => void): void {
  if (typeof window === "undefined") return;
  const ric = (window as unknown as { requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number })
    .requestIdleCallback;
  if (typeof ric === "function") {
    ric(fn, { timeout: 600 });
  } else {
    window.setTimeout(fn, 16);
  }
}

function drainImageQueue(): void {
  if (typeof window === "undefined") return;
  while (activeImages < MAX_CONCURRENT_IMAGES && imageQueue.length > 0) {
    const url = imageQueue.shift()!;
    activeImages++;
    const img = new window.Image();
    img.decoding = "async";
    const done = () => {
      activeImages = Math.max(0, activeImages - 1);
      drainImageQueue();
    };
    img.onload = done;
    img.onerror = done;
    img.src = url;
  }
}

export function preloadImage(url?: string | null): void {
  if (typeof window === "undefined" || !url || !url.startsWith("http")) return;
  if (preloadedImages.has(url)) return;
  preloadedImages.add(url);
  // Keep queue bounded so rapid filter switches don't stall on stale images
  if (imageQueue.length > 48) imageQueue.splice(0, imageQueue.length - 48);
  imageQueue.push(url);
  drainImageQueue();
}

function drainVideoQueue(): void {
  if (typeof window === "undefined") return;
  while (activeVideos < MAX_CONCURRENT_VIDEOS && videoQueue.length > 0) {
    const url = videoQueue.shift()!;
    activeVideos++;
    scheduleIdle(() => {
      const controller = new AbortController();
      const timeout = window.setTimeout(() => controller.abort(), 3500);
      // Warm only the opening 256KB segment into HTTP cache (no decoder allocation!)
      fetch(url, {
        headers: { Range: "bytes=0-262143" },
        signal: controller.signal,
        credentials: "omit",
      })
        .then((res) => {
          // Consume small buffer so browser caches it cleanly
          if (res.ok || res.status === 206) return res.arrayBuffer();
        })
        .catch(() => {})
        .finally(() => {
          window.clearTimeout(timeout);
          activeVideos = Math.max(0, activeVideos - 1);
          drainVideoQueue();
        });
    });
  }
}

export function preloadVideo(url?: string | null): void {
  if (typeof window === "undefined" || !url || !url.startsWith("http")) return;
  if (!/\.(mp4|webm|mov)(\?|$)/i.test(url)) return;
  if (preloadedVideos.has(url)) return;
  preloadedVideos.add(url);
  if (videoQueue.length > 16) videoQueue.splice(0, videoQueue.length - 16);
  videoQueue.push(url);
  drainVideoQueue();
}

export function preloadFeedWindow(
  ads: Ad[],
  startIndex: number,
  imageLookahead = 36,
  videoLookahead = 6
): void {
  if (typeof window === "undefined" || ads.length === 0) return;

  const endImg = Math.min(ads.length, startIndex + imageLookahead);
  for (let i = Math.max(0, startIndex); i < endImg; i++) {
    const ad = ads[i];
    preloadImage(ad.thumbnail_url || ad.fallback_image_url || ad.media_url);
  }

  let warmedVideos = 0;
  for (
    let i = Math.max(0, startIndex);
    i < Math.min(ads.length, startIndex + 24) && warmedVideos < videoLookahead;
    i++
  ) {
    const ad = ads[i];
    if (ad.media_type === "video" && ad.media_url) {
      preloadVideo(ad.media_url);
      warmedVideos++;
    }
  }
}
