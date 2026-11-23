import { NextRequest, NextResponse } from "next/server";
import type { Ad } from "@/lib/types";
import { getSupabaseServerClient } from "@/lib/supabase";

export const maxDuration = 60;

function getSupabaseRestConfig() {
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "";
  const serviceKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SECRET_KEY ||
    "";
  return { url, serviceKey };
}

function sanitizeFilename(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9.\-_]+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 80);
}

async function uploadBufferToStorage(
  pathKey: string,
  buf: ArrayBuffer | Uint8Array,
  contentType: string
): Promise<string | null> {
  const { url, serviceKey } = getSupabaseRestConfig();
  if (!url || !serviceKey) return null;
  const res = await fetch(`${url}/storage/v1/object/ad-media/${pathKey}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${serviceKey}`,
      apikey: serviceKey,
      "Content-Type": contentType,
      "x-upsert": "true",
    },
    body: buf instanceof Uint8Array ? new Uint8Array(buf) : buf,
  });
  if (!res.ok) return null;
  return `${url}/storage/v1/object/public/ad-media/${pathKey}`;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      action?: "sign_upload" | "import_instagram";
      filename?: string;
      contentType?: string;
      url?: string;
      folderId?: string;
      title?: string;
      notes?: string;
    };

    const { url: supaUrl, serviceKey } = getSupabaseRestConfig();

    // =========================================================================
    // 1. DIRECT SIGNED UPLOAD URL FOR LOCAL VIDEO / IPHONE PHOTO LIBRARY FILES
    //    (Bypasses Vercel's 4.5 MB serverless body limit -> supports 50MB+ videos!)
    // =========================================================================
    if (body.action === "sign_upload") {
      if (!supaUrl || !serviceKey) {
        return NextResponse.json(
          { ok: false, error: "Supabase Storage er ikke konfigureret." },
          { status: 500 }
        );
      }

      const rawName = body.filename || "video.mp4";
      const safe = sanitizeFilename(rawName);
      const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const pathKey = `uploads/${unique}-${safe}`;

      const signRes = await fetch(
        `${supaUrl}/storage/v1/object/upload/sign/ad-media/${pathKey}`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${serviceKey}`,
            apikey: serviceKey,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({}),
        }
      );

      if (!signRes.ok) {
        const detail = await signRes.text().catch(() => "");
        return NextResponse.json(
          { ok: false, error: `Kunne ikke klargøre upload: ${detail.slice(0, 120)}` },
          { status: 500 }
        );
      }

      const signed = (await signRes.json()) as { url?: string; token?: string };
      const uploadUrl = signed.url?.startsWith("http")
        ? signed.url
        : `${supaUrl}/storage/v1${signed.url}`;
      const publicUrl = `${supaUrl}/storage/v1/object/public/ad-media/${pathKey}`;

      return NextResponse.json({
        ok: true,
        uploadUrl,
        token: signed.token,
        publicUrl,
        pathKey,
      });
    }

    // =========================================================================
    // 2. IMPORT VIDEO / REEL FROM INSTAGRAM LINK VIA APIFY + MIRROR TO STORAGE
    // =========================================================================
    if (body.action === "import_instagram") {
      const rawUrl = (body.url || "").trim();
      const folderId = body.folderId || "";

      if (!rawUrl || !/instagram\.com\/(reel|reels|p|tv)\//i.test(rawUrl)) {
        return NextResponse.json(
          {
            ok: false,
            error: "Indsæt et gyldigt Instagram Reel- eller opslagslink (fx instagram.com/reel/...).",
          },
          { status: 400 }
        );
      }

      const cleanUrl = rawUrl.split("?")[0];
      const codeMatch = cleanUrl.match(/\/(reel|reels|p|tv)\/([A-Za-z0-9_-]+)/i);
      const shortcode = codeMatch?.[2] || `${Date.now()}`;

      const apifyToken = process.env.APIFY_API_TOKEN;
      if (!apifyToken) {
        return NextResponse.json(
          { ok: false, error: "APIFY_API_TOKEN mangler på serveren." },
          { status: 500 }
        );
      }

      // Run Apify Instagram Scraper synchronously for this single post/reel
      const actorRes = await fetch(
        `https://api.apify.com/v2/acts/apify~instagram-scraper/run-sync-get-dataset-items?token=${encodeURIComponent(
          apifyToken
        )}&timeout=45`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            directUrls: [cleanUrl],
            resultsType: "posts",
            resultsLimit: 1,
          }),
          cache: "no-store",
        }
      );

      if (!actorRes.ok) {
        const errTxt = await actorRes.text().catch(() => "");
        return NextResponse.json(
          {
            ok: false,
            error: `Instagram-import fejlede (${actorRes.status}): ${errTxt.slice(0, 120)}`,
          },
          { status: 502 }
        );
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const items: any[] = await actorRes.json();
      const post = Array.isArray(items) ? items[0] : null;
      if (!post || post.error) {
        return NextResponse.json(
          {
            ok: false,
            error: "Kunne ikke hente opslaget fra Instagram (tjek at opslaget er offentligt).",
          },
          { status: 404 }
        );
      }

      const igVideoUrl: string = post.videoUrl || "";
      const igImageUrl: string =
        post.displayUrl ||
        (Array.isArray(post.images) ? post.images[0] : "") ||
        "";

      if (!igVideoUrl && !igImageUrl) {
        return NextResponse.json(
          { ok: false, error: "Ingen video eller billede fundet på det Instagram-link." },
          { status: 404 }
        );
      }

      // Mirror media permanently into Supabase Storage so Instagram signed URLs never expire!
      let storedMediaUrl = igVideoUrl || igImageUrl;
      let storedThumbUrl = igImageUrl || igVideoUrl;

      if (igVideoUrl) {
        try {
          const vidRes = await fetch(igVideoUrl, {
            headers: { "User-Agent": "Mozilla/5.0" },
          });
          if (vidRes.ok) {
            const vidBuf = await vidRes.arrayBuffer();
            if (vidBuf.byteLength > 1000) {
              const mirrored = await uploadBufferToStorage(
                `ig/${shortcode}.mp4`,
                vidBuf,
                "video/mp4"
              );
              if (mirrored) storedMediaUrl = mirrored;
            }
          }
        } catch {
          // keep igVideoUrl fallback
        }
      }

      if (igImageUrl) {
        try {
          const imgRes = await fetch(igImageUrl, {
            headers: { "User-Agent": "Mozilla/5.0" },
          });
          if (imgRes.ok) {
            const imgBuf = await imgRes.arrayBuffer();
            const ct = imgRes.headers.get("content-type") || "image/jpeg";
            if (imgBuf.byteLength > 500) {
              const mirroredImg = await uploadBufferToStorage(
                `ig/${shortcode}.jpg`,
                imgBuf,
                ct
              );
              if (mirroredImg) {
                storedThumbUrl = mirroredImg;
                if (!igVideoUrl) storedMediaUrl = mirroredImg;
              }
            }
          }
        } catch {
          // keep igImageUrl fallback
        }
      }

      const ownerUsername: string =
        post.ownerUsername || post.username || "instagram";
      const ownerFullName: string =
        body.title?.trim() || post.ownerFullName || `@${ownerUsername}`;
      const caption: string = (post.caption || "").trim();
      const isVideo = Boolean(igVideoUrl || post.type === "Video");
      const initials = ownerFullName
        .replace(/^@/, "")
        .slice(0, 2)
        .toUpperCase();

      const ad: Ad = {
        id: `ig-${shortcode}-${Date.now().toString(36)}`,
        brand_id: `ig-${ownerUsername.toLowerCase().replace(/[^a-z0-9]/g, "")}`,
        brand_name: ownerFullName,
        brand_handle: `@${ownerUsername}`,
        brand_avatar_initials: initials || "IG",
        brand_avatar_color: "#0F172A",
        market: "US",
        source_type: isVideo ? "instagram_reel" : "instagram_post",
        source_url: cleanUrl,
        external_ad_id: shortcode,
        media_type: isVideo ? "video" : "image",
        display_format: isVideo ? "VIDEO" : "IMAGE",
        media_url: storedMediaUrl,
        thumbnail_url: storedThumbUrl,
        fallback_image_url: storedThumbUrl,
        aspect_ratio: isVideo ? "9:16" : "4:5",
        duration_seconds:
          typeof post.videoDuration === "number" && post.videoDuration > 0
            ? Math.round(post.videoDuration)
            : undefined,
        primary_text: caption,
        headline: body.title?.trim() || caption.split(/\n/)[0]?.slice(0, 80) || `Instagram Reel (@${ownerUsername})`,
        cta_text: "Open Instagram",
        landing_page_url: cleanUrl,
        landing_page_path: `/reel/${shortcode}`,
        is_active: true,
        started_running_at: post.timestamp || new Date().toISOString(),
        platforms: ["Instagram"],
        status: "ready",
        tags: ["instagram", "custom-import"],
        board_ids: folderId ? [folderId] : [],
        user_notes: body.notes?.trim() || "",
        is_favorite: false,
        created_at: new Date().toISOString(),
      };

      const supabase = getSupabaseServerClient();
      if (supabase) {
        await supabase.from("adtrack_ads").upsert({
          id: ad.id,
          brand_id: ad.brand_id,
          brand_name: ad.brand_name,
          market: ad.market,
          payload: ad,
          updated_at: new Date().toISOString(),
        });
      }

      return NextResponse.json({ ok: true, ad });
    }

    return NextResponse.json(
      { ok: false, error: "Ukendt action." },
      { status: 400 }
    );
  } catch (err) {
    console.error("POST /api/folder-video error:", err);
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : "Der opstod en fejl.",
      },
      { status: 500 }
    );
  }
}
