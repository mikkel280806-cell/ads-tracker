import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase";
import { parseAdLink } from "@/lib/url-parser";
import type { Ad, MediaType } from "@/lib/types";

interface ImportBody {
  urls?: string[];
  url?: string;
  board_ids?: string[];
  manual?: {
    brand_name: string;
    brand_handle?: string;
    headline?: string;
    primary_text?: string;
    cta_text?: string;
    landing_page_url?: string;
    media_type?: MediaType;
    media_url?: string;
    ai_angle?: string;
    user_notes?: string;
  };
}

/**
 * Optional ScrapeCreators integration when SCRAPECREATORS_API_KEY is configured.
 * Supports both Meta Ad Library URLs (?id=...) and Instagram Reels/Posts URLs.
 */
async function tryScrapeLink(rawUrl: string, sourceType: string, externalId?: string) {
  const apiKey = process.env.SCRAPECREATORS_API_KEY;
  if (!apiKey) return null;

  try {
    if (sourceType === "meta_ad_library" && externalId) {
      const res = await fetch(
        `https://api.scrapecreators.com/v1/facebook/adLibrary/ad?id=${encodeURIComponent(externalId)}`,
        { headers: { "x-api-key": apiKey }, cache: "no-store" }
      );
      if (!res.ok) return null;
      const data = await res.json();
      const snapshot = data?.snapshot || data?.ad?.snapshot || data;
      const videoUrl = snapshot?.videos?.[0]?.video_hd_url || snapshot?.videos?.[0]?.video_sd_url;
      const imageUrl =
        snapshot?.images?.[0]?.original_image_url ||
        snapshot?.videos?.[0]?.video_preview_image_url;

      return {
        brand_name: snapshot?.page_name || data?.page_name || "Meta Annoncør",
        brand_handle: snapshot?.page_profile_uri
          ? `@${snapshot.page_profile_uri.split("/").filter(Boolean).pop()}`
          : "@meta.brand",
        media_type: (videoUrl ? "video" : "image") as MediaType,
        remote_media_url: videoUrl || imageUrl || "",
        remote_thumb_url: imageUrl || "",
        primary_text: snapshot?.body?.text || snapshot?.body?.markup?.__html || "",
        headline: snapshot?.title || snapshot?.cards?.[0]?.title || "",
        cta_text: snapshot?.cta_text || "Se mere",
        landing_page_url: snapshot?.link_url || "",
        eu_reach: data?.eu_total_reach || data?.reach_estimate || undefined,
        started_running_at: data?.start_date
          ? new Date(data.start_date * 1000).toISOString()
          : new Date().toISOString(),
        is_active: data?.is_active ?? true,
      };
    }

    if (sourceType === "instagram") {
      const res = await fetch(
        `https://api.scrapecreators.com/v1/instagram/post?url=${encodeURIComponent(rawUrl)}`,
        { headers: { "x-api-key": apiKey }, cache: "no-store" }
      );
      if (!res.ok) return null;
      const data = await res.json();
      const item = data?.data || data;
      const videoUrl = item?.video_url;
      const imageUrl = item?.display_url || item?.thumbnail_src;

      return {
        brand_name: item?.owner?.full_name || item?.owner?.username || "Instagram Brand",
        brand_handle: item?.owner?.username ? `@${item.owner.username}` : "@instagram",
        media_type: (videoUrl ? "video" : "image") as MediaType,
        remote_media_url: videoUrl || imageUrl || "",
        remote_thumb_url: imageUrl || "",
        primary_text: item?.edge_media_to_caption?.edges?.[0]?.node?.text || item?.caption || "",
        headline: item?.title || "Instagram Creative",
        cta_text: "Se opslag",
        landing_page_url: rawUrl,
        eu_reach: undefined,
        started_running_at: item?.taken_at_timestamp
          ? new Date(item.taken_at_timestamp * 1000).toISOString()
          : new Date().toISOString(),
        is_active: true,
      };
    }
  } catch (err) {
    console.error("ScrapeCreators fetch failed:", err);
  }

  return null;
}

/**
 * Downloads remote expiring media from Meta/Instagram and uploads it permanently
 * to Supabase Storage (`ad-media` bucket) so ads never expire.
 */
async function persistMediaToSupabase(
  remoteUrl: string,
  adId: string,
  suffix: string
): Promise<string | null> {
  const supabase = getSupabaseServerClient();
  if (!supabase || !remoteUrl) return null;

  try {
    const res = await fetch(remoteUrl);
    if (!res.ok) return null;
    const contentType = res.headers.get("content-type") || "application/octet-stream";
    const ext = contentType.includes("video")
      ? "mp4"
      : contentType.includes("png")
        ? "png"
        : "jpg";
    const buffer = Buffer.from(await res.arrayBuffer());
    const path = `ads/${adId}-${suffix}.${ext}`;

    const { error } = await supabase.storage
      .from("ad-media")
      .upload(path, buffer, { contentType, upsert: true });

    if (error) {
      console.error("Supabase storage upload error:", error);
      return null;
    }

    const { data } = supabase.storage.from("ad-media").getPublicUrl(path);
    return data.publicUrl;
  } catch (err) {
    console.error("Media download/upload failed:", err);
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as ImportBody;
    const boardIds = body.board_ids || [];
    const createdAds: Ad[] = [];

    // Case 1: Manual upload / manual ad entry
    if (body.manual) {
      const id = crypto.randomUUID();
      const brandName = body.manual.brand_name?.trim() || "Eget Brand";
      const initials = brandName
        .split(" ")
        .map((w) => w[0])
        .join("")
        .slice(0, 2)
        .toUpperCase();

      const ad: Ad = {
        id,
        brand_id: `brand-${brandName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
        brand_name: brandName,
        brand_handle: body.manual.brand_handle || `@${brandName.toLowerCase().replace(/\s+/g, "")}`,
        brand_avatar_initials: initials || "AD",
        brand_avatar_color: "#0F766E",
        source_type: "manual",
        source_url: body.manual.landing_page_url || "",
        media_type: body.manual.media_type || "image",
        media_url: body.manual.media_url || "/creatives/coffee-static.jpg",
        thumbnail_url: body.manual.media_url || "/creatives/coffee-static.jpg",
        aspect_ratio: body.manual.media_type === "video" ? "3:4" : "1:1",
        primary_text: body.manual.primary_text || "",
        headline: body.manual.headline || "Manuelt gemt kreativ",
        cta_text: body.manual.cta_text || "Køb nu",
        landing_page_url: body.manual.landing_page_url || "",
        is_active: true,
        started_running_at: new Date().toISOString(),
        platforms: ["Instagram"],
        status: "ready",
        ai_angle: body.manual.ai_angle || "Ikke analyseret",
        ai_format: body.manual.media_type === "video" ? "Video" : "Static",
        tags: ["manuel"],
        board_ids: boardIds,
        user_notes: body.manual.user_notes || "",
        is_favorite: false,
        created_at: new Date().toISOString(),
      };

      const supabase = getSupabaseServerClient();
      if (supabase) {
        await supabase.from("ads").insert({
          id: ad.id,
          source_type: ad.source_type,
          source_url: ad.source_url,
          media_type: ad.media_type,
          media_storage_url: ad.media_url,
          thumbnail_storage_url: ad.thumbnail_url,
          primary_text: ad.primary_text,
          headline: ad.headline,
          cta_text: ad.cta_text,
          landing_page_url: ad.landing_page_url,
          is_active: ad.is_active,
          started_running_at: ad.started_running_at,
          status: ad.status,
          ai_angle: ad.ai_angle,
          ai_format: ad.ai_format,
          user_notes: ad.user_notes,
        });
      }

      createdAds.push(ad);
      return NextResponse.json({ ok: true, ads: createdAds });
    }

    // Case 2: Single or bulk Meta Ad Library / Instagram URLs (works for UI & iOS Shortcut)
    const rawList = [
      ...(body.urls || []),
      ...(body.url ? [body.url] : []),
    ]
      .map((u) => u.trim())
      .filter(Boolean);

    if (rawList.length === 0) {
      return NextResponse.json(
        { ok: false, error: "Indsæt mindst ét Instagram- eller Meta Ad Library-link." },
        { status: 400 }
      );
    }

    const sampleCovers = [
      "/creatives/skincare-ugc.jpg",
      "/creatives/sneakers-reel.jpg",
      "/creatives/matcha-ugc.jpg",
      "/creatives/supplement-ugc.jpg",
    ];

    for (let i = 0; i < rawList.length; i++) {
      const parsed = parseAdLink(rawList[i]);
      if (!parsed.isValid) continue;

      const id = crypto.randomUUID();
      const scraped = await tryScrapeLink(parsed.rawUrl, parsed.sourceType, parsed.externalId);

      let permanentMedia = scraped?.remote_media_url || "";
      let permanentThumb = scraped?.remote_thumb_url || "";

      if (scraped?.remote_media_url) {
        const stored = await persistMediaToSupabase(scraped.remote_media_url, id, "media");
        if (stored) permanentMedia = stored;
      }
      if (scraped?.remote_thumb_url) {
        const storedThumb = await persistMediaToSupabase(scraped.remote_thumb_url, id, "thumb");
        if (storedThumb) permanentThumb = storedThumb;
      }

      const fallbackCover = sampleCovers[i % sampleCovers.length];
      const guessedName: string =
        scraped?.brand_name ||
        (parsed.handleGuess
          ? parsed.handleGuess.charAt(0).toUpperCase() + parsed.handleGuess.slice(1)
          : parsed.sourceType === "meta_ad_library"
            ? `Meta Ad #${(parsed.externalId || id).slice(0, 6)}`
            : "Instagram Creator");

      const initials = guessedName
        .split(/\s+/)
        .map((w: string) => w[0])
        .join("")
        .slice(0, 2)
        .toUpperCase();

      const ad: Ad = {
        id,
        brand_id: `brand-${guessedName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
        brand_name: guessedName,
        brand_handle:
          scraped?.brand_handle ||
          (parsed.handleGuess ? `@${parsed.handleGuess}` : "@importeret"),
        brand_avatar_initials: initials || "AD",
        brand_avatar_color: parsed.sourceType === "instagram" ? "#BE123C" : "#0369A1",
        source_type: parsed.sourceType,
        source_url: parsed.rawUrl,
        external_ad_id: parsed.externalId,
        media_type: scraped?.media_type || "video",
        media_url: permanentMedia || fallbackCover,
        thumbnail_url: permanentThumb || permanentMedia || fallbackCover,
        aspect_ratio: "3:4",
        primary_text:
          scraped?.primary_text ||
          "Link importeret! Tilslut SCRAPECREATORS_API_KEY i .env for automatisk udtræk af video, copy og EU-reach — eller brug 'Kopiér til Gemini' for at berige annoncen nu.",
        headline:
          scraped?.headline ||
          (parsed.sourceType === "meta_ad_library"
            ? `Meta Ad Library ${parsed.externalId ? `#${parsed.externalId}` : ""}`.trim()
            : `Instagram ${parsed.externalId ? `(${parsed.externalId})` : "Reel"}`),
        cta_text: scraped?.cta_text || "Åbn original",
        landing_page_url: scraped?.landing_page_url || parsed.rawUrl,
        is_active: scraped?.is_active ?? true,
        started_running_at: scraped?.started_running_at || new Date().toISOString(),
        eu_reach: scraped?.eu_reach,
        platforms: parsed.sourceType === "instagram" ? ["Instagram"] : ["Facebook", "Instagram"],
        status: process.env.INSTABOX_API_KEY ? "pending_ai" : "ready",
        ai_angle: scraped ? "Afventer AI-analyse" : "Importeret link",
        ai_format: parsed.sourceType === "instagram" ? "Instagram Reel" : "Meta Video Ad",
        tags: [
          parsed.sourceType === "meta_ad_library" ? "meta-ad-library" : "instagram",
          "ny-import",
        ],
        board_ids: boardIds,
        user_notes: "",
        is_favorite: false,
        created_at: new Date().toISOString(),
      };

      const supabase = getSupabaseServerClient();
      if (supabase) {
        await supabase.from("ads").insert({
          id: ad.id,
          source_type: ad.source_type,
          source_url: ad.source_url,
          external_ad_id: ad.external_ad_id,
          media_type: ad.media_type,
          media_storage_url: ad.media_url,
          thumbnail_storage_url: ad.thumbnail_url,
          primary_text: ad.primary_text,
          headline: ad.headline,
          cta_text: ad.cta_text,
          landing_page_url: ad.landing_page_url,
          is_active: ad.is_active,
          started_running_at: ad.started_running_at,
          eu_reach: ad.eu_reach,
          platforms: ad.platforms,
          status: ad.status,
          ai_angle: ad.ai_angle,
          ai_format: ad.ai_format,
          user_notes: ad.user_notes,
        });
      }

      createdAds.push(ad);
    }

    return NextResponse.json({
      ok: true,
      scrapedLive: Boolean(process.env.SCRAPECREATORS_API_KEY),
      ads: createdAds,
    });
  } catch (err) {
    console.error("/api/import error:", err);
    return NextResponse.json(
      { ok: false, error: "Kunne ikke importere linket." },
      { status: 500 }
    );
  }
}
