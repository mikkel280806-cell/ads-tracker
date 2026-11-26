import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase";

interface OnboardingVideoItem {
  id: string;
  brandName: string;
  mediaUrl: string;
  thumbnailUrl: string;
  headline: string;
}

export async function GET() {
  try {
    const supabase = getSupabaseServerClient();
    if (!supabase) {
      return NextResponse.json({ ok: true, videos: [] });
    }

    const { data, error } = await supabase
      .from("adtrack_ads")
      .select("id, payload")
      .order("started_running_at", { ascending: false })
      .limit(200);

    if (error || !data) {
      return NextResponse.json({ ok: true, videos: [] });
    }

    const candidates: OnboardingVideoItem[] = [];
    for (const row of data) {
      const p = (row.payload || {}) as Record<string, unknown>;
      if (p.media_type !== "video") continue;
      const mediaUrl = typeof p.media_url === "string" ? p.media_url.trim() : "";
      const thumb =
        (typeof p.fallback_image_url === "string" && p.fallback_image_url) ||
        (typeof p.thumbnail_url === "string" && p.thumbnail_url) ||
        "";
      if (!mediaUrl || !/^https?:\/\//i.test(mediaUrl)) continue;

      const isDirectPlayable =
        /r2\.dev|cloudflarestorage|\.mp4(\?|$)/i.test(mediaUrl) ||
        /fbcdn\.net|scontent/i.test(mediaUrl);
      if (!isDirectPlayable) continue;

      candidates.push({
        id: String(row.id),
        brandName: typeof p.brand_name === "string" ? p.brand_name : "Flake",
        mediaUrl,
        thumbnailUrl: thumb,
        headline: typeof p.headline === "string" ? p.headline : "",
      });
    }

    // Strongly prefer permanent R2-hosted videos so playback never expires
    const r2Only = candidates.filter((v) => /r2\.dev|cloudflarestorage/i.test(v.mediaUrl));
    const pool = r2Only.length >= 4 ? r2Only : candidates;

    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }

    return NextResponse.json({
      ok: true,
      videos: pool.slice(0, 12),
    });
  } catch {
    return NextResponse.json({ ok: true, videos: [] });
  }
}
