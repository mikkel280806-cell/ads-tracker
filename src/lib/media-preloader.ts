import type { Ad } from "./types";

/**
 * Instagram / TikTok-style Predictive Media Preloader.
 *
 * Preloads upcoming thumbnails into decoded browser memory and warms
 * near-viewport video headers/first segments with bounded concurrency
 * so fast scrolling, hover previews, and ad detail inspection feel instant.
 */
const preloadedImages = new Set<string>();
const preloadedVideos = new Set<string>();
const videoQueue: string[] = [];
let activeVideoWarmups = 0;
const MAX_CONCURRENT_VIDEO_WARMUPS = 3;

export function preloadImage(url?: string | null): void {
  if (typeof window === "undefined" || !url || !url.startsWith("http")) return;
  if (preloadedImages.has(url)) return;
  preloadedImages.add(url);

  const img = new window.Image();
  img.decoding = "async";
  img.src = url;
}

function drainVideoQueue(): void {
  if (typeof document === "undefined") return;
  while (
    activeVideoWarmups < MAX_CONCURRENT_VIDEO_WARMUPS &&
    videoQueue.length > 0
  ) {
    const url = videoQueue.shift()!;
    activeVideoWarmups++;

    const v = document.createElement("video");
    v.muted = true;
    v.playsInline = true;
    v.preload = "auto";
    v.src = url;

    let finished = false;
    const cleanup = () => {
      if (finished) return;
      finished = true;
      v.removeEventListener("loadeddata", cleanup);
      v.removeEventListener("canplay", cleanup);
      v.removeEventListener("error", cleanup);
      v.src = "";
      v.load();
      activeVideoWarmups = Math.max(0, activeVideoWarmups - 1);
      drainVideoQueue();
    };

    v.addEventListener("loadeddata", cleanup, { once: true });
    v.addEventListener("canplay", cleanup, { once: true });
    v.addEventListener("error", cleanup, { once: true });
    // Safety timeout so stalled CDN URLs never block the warmup queue
    window.setTimeout(cleanup, 4500);
    v.load();
  }
}

export function preloadVideo(url?: string | null): void {
  if (typeof window === "undefined" || !url || !url.startsWith("http")) return;
  if (!/\.(mp4|webm|mov)(\?|$)/i.test(url)) return;
  if (preloadedVideos.has(url)) return;
  preloadedVideos.add(url);
  videoQueue.push(url);
  drainVideoQueue();
}

export function preloadFeedWindow(
  ads: Ad[],
  startIndex: number,
  imageLookahead = 48,
  videoLookahead = 10
): void {
  if (typeof window === "undefined" || ads.length === 0) return;

  const endImg = Math.min(ads.length, startIndex + imageLookahead);
  for (let i = Math.max(0, startIndex); i < endImg; i++) {
    const ad = ads[i];
    preloadImage(ad.thumbnail_url || ad.fallback_image_url || ad.media_url);
    if (ad.brand_logo_url) preloadImage(ad.brand_logo_url);
  }

  let warmedVideos = 0;
  for (
    let i = Math.max(0, startIndex);
    i < Math.min(ads.length, startIndex + 30) && warmedVideos < videoLookahead;
    i++
  ) {
    const ad = ads[i];
    if (ad.media_type === "video" && ad.media_url) {
      preloadVideo(ad.media_url);
      warmedVideos++;
    }
  }
}
