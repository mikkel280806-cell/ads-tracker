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

const BROWSER_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36";

function decodeEntities(str: string): string {
  return str
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function extractMeta(html: string, key: string): string | undefined {
  const patterns = [
    new RegExp(`<meta[^>]+(?:property|name)=["']${key}["'][^>]+content=["']([^"']+)["']`, "i"),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${key}["']`, "i"),
  ];
  for (const re of patterns) {
    const m = html.match(re);
    if (m?.[1]) return decodeEntities(m[1].trim());
  }
  return undefined;
}

/**
 * Tries ScrapeCreators first if configured, otherwise attempts real public OpenGraph
 * metadata extraction so we NEVER invent fake placeholder content.
 */
async function fetchRealLinkMetadata(
  rawUrl: string,
  sourceType: string,
  externalId?: string
) {
  const apiKey = process.env.SCRAPECREATORS_API_KEY;

  // 1. Live ScrapeCreators API (full Meta Ad Library & Instagram video + EU reach)
  if (apiKey) {
    try {
      if (sourceType === "meta_ad_library" && externalId) {
        const res = await fetch(
          `https://api.scrapecreators.com/v1/facebook/adLibrary/ad?id=${encodeURIComponent(externalId)}`,
          { headers: { "x-api-key": apiKey }, cache: "no-store" }
        );
        if (res.ok) {
          const data = await res.json();
          const snapshot = data?.snapshot || data?.ad?.snapshot || data;
          const videoUrl = snapshot?.videos?.[0]?.video_hd_url || snapshot?.videos?.[0]?.video_sd_url;
          const imageUrl =
            snapshot?.images?.[0]?.original_image_url ||
            snapshot?.videos?.[0]?.video_preview_image_url;

          return {
            scrapedLive: true,
            brand_name: snapshot?.page_name || data?.page_name || "Meta Annoncør",
            brand_handle: snapshot?.page_profile_uri
              ? `@${snapshot.page_profile_uri.split("/").filter(Boolean).pop()}`
              : "@meta",
            media_type: (videoUrl ? "video" : "image") as MediaType,
            remote_media_url: videoUrl || imageUrl || "",
            remote_thumb_url: imageUrl || "",
            primary_text: snapshot?.body?.text || "",
            headline: snapshot?.title || snapshot?.cards?.[0]?.title || "",
            cta_text: snapshot?.cta_text || "Shop now",
            landing_page_url: snapshot?.link_url || rawUrl,
            eu_reach: data?.eu_total_reach || data?.reach_estimate || undefined,
            started_running_at: data?.start_date
              ? new Date(data.start_date * 1000).toISOString()
              : new Date().toISOString(),
            is_active: data?.is_active ?? true,
          };
        }
      }

      if (sourceType === "instagram") {
        const res = await fetch(
          `https://api.scrapecreators.com/v1/instagram/post?url=${encodeURIComponent(rawUrl)}`,
          { headers: { "x-api-key": apiKey }, cache: "no-store" }
        );
        if (res.ok) {
          const data = await res.json();
          const item = data?.data || data;
          const videoUrl = item?.video_url;
          const imageUrl = item?.display_url || item?.thumbnail_src;

          return {
            scrapedLive: true,
            brand_name: item?.owner?.full_name || item?.owner?.username || "Instagram",
            brand_handle: item?.owner?.username ? `@${item.owner.username}` : "@instagram",
            media_type: (videoUrl ? "video" : "image") as MediaType,
            remote_media_url: videoUrl || imageUrl || "",
            remote_thumb_url: imageUrl || "",
            primary_text: item?.edge_media_to_caption?.edges?.[0]?.node?.text || item?.caption || "",
            headline: item?.title || "Instagram Reel",
            cta_text: "Se på Instagram",
            landing_page_url: rawUrl,
            eu_reach: undefined,
            started_running_at: item?.taken_at_timestamp
              ? new Date(item.taken_at_timestamp * 1000).toISOString()
              : new Date().toISOString(),
            is_active: true,
          };
        }
      }
    } catch (err) {
      console.error("ScrapeCreators fetch failed:", err);
    }
  }

  // 2. Public OpenGraph / Meta tag extraction (works live for webshops, landing pages & public embeds)
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 6500);
    const res = await fetch(rawUrl, {
      headers: { "User-Agent": BROWSER_UA, Accept: "text/html,*/*" },
      redirect: "follow",
      signal: controller.signal,
      cache: "no-store",
    });
    clearTimeout(timer);

    if (res.ok) {
      const html = await res.text();
      const ogTitle =
        extractMeta(html, "og:title") ||
        html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]?.trim();
      const ogDesc =
        extractMeta(html, "og:description") || extractMeta(html, "description");
      const ogImage = extractMeta(html, "og:image") || extractMeta(html, "twitter:image");
      const ogVideo = extractMeta(html, "og:video") || extractMeta(html, "og:video:secure_url");
      const ogSite = extractMeta(html, "og:site_name");

      if (ogTitle || ogImage || ogDesc) {
        const host = new URL(res.url || rawUrl).hostname.replace(/^www\./, "");
        return {
          scrapedLive: Boolean(ogImage || ogVideo),
          brand_name: ogSite || host.split(".")[0],
          brand_handle: `@${host.split(".")[0]}`,
          media_type: (ogVideo ? "video" : "image") as MediaType,
          remote_media_url: ogVideo || ogImage || "",
          remote_thumb_url: ogImage || "",
          primary_text: ogDesc || "",
          headline: ogTitle || host,
          cta_text: "Åbn link",
          landing_page_url: res.url || rawUrl,
          eu_reach: undefined,
          started_running_at: new Date().toISOString(),
          is_active: true,
        };
      }
    }
  } catch {
    // Public page blocked or timed out — handled cleanly below
  }

  return null;
}

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

    if (error) return null;
    const { data } = supabase.storage.from("ad-media").getPublicUrl(path);
    return data.publicUrl;
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as ImportBody;
    const boardIds = body.board_ids || [];
    const createdAds: Ad[] = [];

    // Case 1: Manual upload
    if (body.manual) {
      const id = crypto.randomUUID();
      const brandName = body.manual.brand_name?.trim() || "Eget Brand";
      const initials = brandName
        .split(/\s+/)
        .map((w: string) => w[0])
        .join("")
        .slice(0, 2)
        .toUpperCase();

      const ad: Ad = {
        id,
        brand_id: `brand-${brandName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
        brand_name: brandName,
        brand_handle: body.manual.brand_handle || `@${brandName.toLowerCase().replace(/\s+/g, "")}`,
        brand_avatar_initials: initials || "AD",
        brand_avatar_color: "#0027eb",
        source_type: "manual",
        source_url: body.manual.landing_page_url || "",
        media_type: body.manual.media_type || "image",
        media_url: body.manual.media_url || "",
        thumbnail_url: body.manual.media_url || "",
        aspect_ratio: body.manual.media_type === "video" ? "3:4" : "1:1",
        primary_text: body.manual.primary_text || "",
        headline: body.manual.headline || brandName,
        cta_text: body.manual.cta_text || "Shop now",
        landing_page_url: body.manual.landing_page_url || "",
        is_active: true,
        started_running_at: new Date().toISOString(),
        platforms: ["Instagram"],
        status: "ready",
        ai_angle: body.manual.ai_angle || undefined,
        ai_format: body.manual.media_type === "video" ? "Video" : "Static",
        tags: ["upload"],
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

    // Case 2: Single or bulk URLs
    const rawList = [...(body.urls || []), ...(body.url ? [body.url] : [])]
      .map((u) => u.trim())
      .filter(Boolean);

    if (rawList.length === 0) {
      return NextResponse.json(
        { ok: false, error: "Indsæt mindst ét Instagram-, Meta Ad Library- eller webshop-link." },
        { status: 400 }
      );
    }

    for (const raw of rawList) {
      const parsed = parseAdLink(raw);
      if (!parsed.isValid) continue;

      const id = crypto.randomUUID();
      const scraped = await fetchRealLinkMetadata(
        parsed.rawUrl,
        parsed.sourceType,
        parsed.externalId
      );

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

      const host = new URL(parsed.rawUrl).hostname.replace(/^www\./, "");
      const guessedName: string =
        scraped?.brand_name ||
        (parsed.handleGuess
          ? parsed.handleGuess.charAt(0).toUpperCase() + parsed.handleGuess.slice(1)
          : parsed.sourceType === "meta_ad_library"
            ? `Meta Ad #${(parsed.externalId || id).slice(0, 8)}`
            : parsed.sourceType === "instagram"
              ? `Instagram ${parsed.externalId ? `#${parsed.externalId.slice(0, 8)}` : "Reel"}`
              : host);

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
          (parsed.handleGuess ? `@${parsed.handleGuess}` : `@${host.split(".")[0]}`),
        brand_avatar_initials: initials || "AD",
        brand_avatar_color: parsed.sourceType === "instagram" ? "#E11D48" : "#0027eb",
        brand_logo_url: `https://www.google.com/s2/favicons?domain=${encodeURIComponent(host)}&sz=128`,
        source_type: parsed.sourceType,
        source_url: parsed.rawUrl,
        external_ad_id: parsed.externalId,
        media_type: scraped?.media_type || (parsed.sourceType === "manual" ? "image" : "video"),
        media_url: permanentMedia,
        thumbnail_url: permanentThumb || permanentMedia,
        aspect_ratio: permanentMedia ? "3:4" : "1:1",
        primary_text:
          scraped?.primary_text ||
          (parsed.sourceType === "meta_ad_library" || parsed.sourceType === "instagram"
            ? "Link gemt. Tilføj SCRAPECREATORS_API_KEY i Connectors for automatisk download af HD-video, annoncetekst og EU-reach fra Meta/Instagram."
            : ""),
        headline:
          scraped?.headline ||
          (parsed.sourceType === "meta_ad_library"
            ? `Meta Ad Library ${parsed.externalId ? `#${parsed.externalId}` : ""}`.trim()
            : parsed.sourceType === "instagram"
              ? `Instagram ${parsed.externalId || "Post"}`
              : host),
        cta_text: scraped?.cta_text || "Åbn original",
        landing_page_url: scraped?.landing_page_url || parsed.rawUrl,
        is_active: scraped?.is_active ?? true,
        started_running_at: scraped?.started_running_at || new Date().toISOString(),
        eu_reach: scraped?.eu_reach,
        platforms: parsed.sourceType === "instagram" ? ["Instagram"] : ["Facebook", "Instagram"],
        status: process.env.INSTABOX_API_KEY && permanentMedia ? "pending_ai" : "ready",
        ai_angle: undefined,
        ai_format: parsed.sourceType === "instagram" ? "Instagram" : parsed.sourceType === "meta_ad_library" ? "Meta Ad" : "Web",
        tags: [parsed.sourceType === "meta_ad_library" ? "meta" : parsed.sourceType],
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
