import { NextRequest, NextResponse } from "next/server";
import type { Ad } from "@/lib/types";
import { getSupabaseServerClient } from "@/lib/supabase";
import { archiveAdMedia } from "@/lib/media-vault";

export const maxDuration = 60;

/**
 * Foreplay-style on-demand permanent media archiver.
 * Mirrors an ad's expiring Meta/Instagram CDN video + thumbnail into our own
 * permanent storage (Cloudflare R2 when configured, or Supabase Storage) and
 * updates the ad row in Supabase Postgres so the link NEVER expires.
 */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      ad?: Ad;
      adId?: string;
    };

    const supabase = getSupabaseServerClient();
    let targetAd: Ad | null = body.ad || null;

    if (!targetAd && body.adId && supabase) {
      const { data } = await supabase
        .from("adtrack_ads")
        .select("payload")
        .eq("id", body.adId)
        .maybeSingle();
      if (data?.payload) targetAd = data.payload as Ad;
    }

    if (!targetAd) {
      return NextResponse.json(
        { ok: false, error: "Annonce ikke fundet." },
        { status: 404 }
      );
    }

    const { ad: archivedAd, archived, backend } = await archiveAdMedia(
      targetAd,
      { includeVideo: true }
    );

    if (archived && supabase) {
      await supabase
        .from("adtrack_ads")
        .update({
          payload: archivedAd,
          updated_at: new Date().toISOString(),
        })
        .eq("id", archivedAd.id);
    }

    return NextResponse.json({
      ok: true,
      archived,
      backend,
      ad: archivedAd,
    });
  } catch (err) {
    console.error("POST /api/archive-media error:", err);
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : "Arkivering fejlede.",
      },
      { status: 500 }
    );
  }
}
