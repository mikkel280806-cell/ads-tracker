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

function sanitizeFilename(name: string, contentType?: string): string {
  const cleaned = name
    .toLowerCase()
    .replace(/[^a-z0-9.\-_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 72);

  if (/\.[a-z0-9]{2,5}$/i.test(cleaned)) return cleaned;
  const ct = (contentType || "").toLowerCase();
  const ext = ct.includes("quicktime")
    ? ".mov"
    : ct.includes("webm")
      ? ".webm"
      : ct.includes("png")
        ? ".png"
        : ct.includes("webp")
          ? ".webp"
          : ct.includes("image")
            ? ".jpg"
            : ".mp4";
  return `${cleaned || "video"}${ext}`;
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

async function mirrorRemoteMedia(
  remoteUrl: string,
  pathKey: string,
  fallbackContentType: string
): Promise<string | null> {
  if (!remoteUrl) return null;
  try {
    const res = await fetch(remoteUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
      },
    });
    if (!res.ok) return null;
    const buf = await res.arrayBuffer();
    if (buf.byteLength < 400) return null;
    const ct = res.headers.get("content-type") || fallbackContentType;
    return await uploadBufferToStorage(pathKey, buf, ct);
  } catch {
    return null;
  }
}

const CUSTOM_MEDIA_BRAND_ID = "custom-media";

function toAdRow(ad: Ad) {
  return {
    id: ad.id,
    brand_id: CUSTOM_MEDIA_BRAND_ID,
    brand_name: ad.brand_name,
    market: ad.market || "US",
    media_type: ad.media_type,
    display_format: ad.display_format || null,
    headline: ad.headline || "",
    primary_text: ad.primary_text || "",
    extracted_hook: ad.extracted_hook || "",
    hook_category: ad.hook_category || null,
    landing_page_url: ad.landing_page_url || "",
    landing_page_path: ad.landing_page_path || "/",
    is_active: ad.is_active ?? true,
    started_running_at: ad.started_running_at || new Date().toISOString(),
    duplicated_count: ad.duplicated_count ?? null,
    board_ids: ad.board_ids || [],
    user_notes: ad.user_notes || "",
    payload: { ...ad, brand_id: CUSTOM_MEDIA_BRAND_ID },
    updated_at: new Date().toISOString(),
  };
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
    //    (Bypasses Vercel's 4.5 MB serverless body limit -> up to 50MB!)
    // =========================================================================
    if (body.action === "sign_upload") {
      if (!supaUrl || !serviceKey) {
        return NextResponse.json(
          { ok: false, error: "Supabase Storage er ikke konfigureret." },
          { status: 500 }
        );
      }

      const rawName = body.filename || "video.mp4";
      const safe = sanitizeFilename(rawName, body.contentType);
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
          {
            ok: false,
            error: `Kunne ikke klargøre upload: ${detail.slice(0, 140)}`,
          },
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
    // 2. IMPORT VIDEO / REEL FROM INSTAGRAM LINK VIA APIFY + PARALLEL MIRROR
    //    (Mirrors video + separate DASH audio track + thumbnail permanently!)
    // =========================================================================
    if (body.action === "import_instagram") {
      const rawUrl = (body.url || "").trim();
      const folderId = body.folderId || "";

      if (!rawUrl || !/instagram\.com\/(reel|reels|p|tv)\//i.test(rawUrl)) {
        return NextResponse.json(
          {
            ok: false,
            error:
              "Indsæt et gyldigt Instagram Reel- eller opslagslink (fx instagram.com/reel/...).",
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
            error:
              "Kunne ikke hente opslaget fra Instagram (tjek at opslaget er offentligt).",
          },
          { status: 404 }
        );
      }

      const igVideoUrl: string = post.videoUrl || "";
      const igAudioUrl: string =
        post.audioUrl || post.musicInfo?.audio_url || "";
      const igImageUrl: string =
        post.displayUrl ||
        (Array.isArray(post.images) ? post.images[0] : "") ||
        "";

      if (!igVideoUrl && !igImageUrl) {
        return NextResponse.json(
          {
            ok: false,
            error: "Ingen video eller billede fundet på det Instagram-link.",
          },
          { status: 404 }
        );
      }

      // Mirror video + separate Instagram DASH audio track + thumbnail IN PARALLEL!
      const [mirroredVideo, mirroredAudio, mirroredImage] = await Promise.all([
        igVideoUrl
          ? mirrorRemoteMedia(igVideoUrl, `ig/${shortcode}.mp4`, "video/mp4")
          : Promise.resolve(null),
        igAudioUrl
          ? mirrorRemoteMedia(
              igAudioUrl,
              `ig/${shortcode}-audio.m4a`,
              "audio/mp4"
            )
          : Promise.resolve(null),
        igImageUrl
          ? mirrorRemoteMedia(igImageUrl, `ig/${shortcode}.jpg`, "image/jpeg")
          : Promise.resolve(null),
      ]);

      const storedMediaUrl =
        mirroredVideo || igVideoUrl || mirroredImage || igImageUrl;
      const storedAudioUrl = mirroredAudio || igAudioUrl || undefined;
      const storedThumbUrl = mirroredImage || igImageUrl || storedMediaUrl;

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
        brand_id: CUSTOM_MEDIA_BRAND_ID,
        brand_name: ownerFullName,
        brand_handle: `@${ownerUsername}`,
        brand_avatar_initials: initials || "IG",
        brand_avatar_color: "#0F172A",
        market: "US",
        source_type: "instagram",
        source_url: cleanUrl,
        external_ad_id: shortcode,
        media_type: isVideo ? "video" : "image",
        display_format: isVideo ? "VIDEO" : "IMAGE",
        media_url: storedMediaUrl,
        audio_url: storedAudioUrl,
        thumbnail_url: storedThumbUrl,
        fallback_image_url: storedThumbUrl,
        aspect_ratio: isVideo ? "9:16" : "3:4",
        duration_seconds:
          typeof post.videoDuration === "number" && post.videoDuration > 0
            ? Math.round(post.videoDuration)
            : undefined,
        primary_text: caption,
        headline:
          body.title?.trim() ||
          caption.split(/\n/)[0]?.slice(0, 80) ||
          `@${ownerUsername}`,
        cta_text: "",
        landing_page_url: "",
        landing_page_path: "",
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
        await supabase.from("adtrack_brands").upsert(
          {
            id: CUSTOM_MEDIA_BRAND_ID,
            name: "Custom Media",
            market: "DK",
            website_url: "",
            meta_page_id: null,
            is_shopify: false,
            active_ads_count: 0,
            monthly_visits: 0,
            products_count: 0,
            pixels: [],
            shopify_apps: [],
            folder_ids: [],
            payload: {
              id: CUSTOM_MEDIA_BRAND_ID,
              name: "Custom Media",
              handle: "@custom",
              avatar_initials: "CM",
              avatar_color: "#0F172A",
              website_url: "",
              category: "System",
              market: "DK",
              is_shopify: false,
              is_tracked: false,
              last_synced_at: new Date().toISOString(),
            },
            last_synced_at: new Date().toISOString(),
          },
          { onConflict: "id" }
        );
        const { error: upsertErr } = await supabase
          .from("adtrack_ads")
          .upsert(toAdRow(ad), { onConflict: "id" });
        if (upsertErr) {
          console.error("adtrack_ads upsert error:", upsertErr);
          return NextResponse.json(
            { ok: false, error: `Kunne ikke gemme i databasen: ${upsertErr.message}` },
            { status: 500 }
          );
        }
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
