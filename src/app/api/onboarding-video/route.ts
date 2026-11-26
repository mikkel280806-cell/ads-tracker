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
      .eq("media_type", "video")
      .order("eu_reach", { ascending: false, nullsFirst: false })
      .limit(80);

    if (error || !data) {
      return NextResponse.json({ ok: true, videos: [] });
    }

    const candidates: OnboardingVideoItem[] = [];
    for (const row of data) {
      const p = (row.payload || {}) as Record<string, unknown>;
      const mediaUrl = typeof p.media_url === "string" ? p.media_url.trim() : "";
      const thumb =
        (typeof p.fallback_image_url === "string" && p.fallback_image_url) ||
        (typeof p.thumbnail_url === "string" && p.thumbnail_url) ||
        "";
      if (!mediaUrl || !/^https?:\/\//i.test(mediaUrl)) continue;
      // Prefer permanent R2 / direct MP4 streams that play cleanly in <video>
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

    // Prioritize R2-hosted permanent videos first, then shuffle cleanly
    const r2First = candidates.filter((v) => /r2\.dev/i.test(v.mediaUrl));
    const pool = r2First.length >= 6 ? r2First : candidates;

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
