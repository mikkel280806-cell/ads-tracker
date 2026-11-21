import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase";
import { parseAdLink } from "@/lib/url-parser";
import {
  fetchInstagramPost,
  fetchSingleMetaAd,
  mapScrapeCreatorsAd,
} from "@/lib/scrapecreators";
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
        market: "US",
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

      let ad: Ad | null = null;

      // A) Real Meta Ad Library ad via ScrapeCreators
      if (parsed.sourceType === "meta_ad_library" && parsed.externalId) {
        const rawAd = await fetchSingleMetaAd(parsed.externalId);
        if (rawAd) {
          const name: string = rawAd?.snapshot?.page_name || rawAd?.page_name || "Meta Brand";
          const initials = name
            .split(/\s+/)
            .map((w: string) => w[0])
            .join("")
            .slice(0, 2)
            .toUpperCase();
          ad = mapScrapeCreatorsAd(rawAd, `brand-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`, {
            name,
            handle: `@${name.toLowerCase().replace(/[^a-z0-9]+/g, "")}`,
            initials: initials || "MB",
            color: "#0027eb",
          });
          ad.board_ids = boardIds;
        }
      }

      // B) Real Instagram Reel/Post via ScrapeCreators
      if (!ad && parsed.sourceType === "instagram") {
        const item = await fetchInstagramPost(parsed.rawUrl);
        if (item) {
          const username = item?.owner?.username || parsed.handleGuess || "instagram";
          const fullName = item?.owner?.full_name || username;
          const videoUrl = item?.video_url || "";
          const thumbUrl = item?.display_url || item?.thumbnail_src || "";
          const caption =
            item?.edge_media_to_caption?.edges?.[0]?.node?.text || item?.caption || "";
          const initials = fullName
            .split(/\s+/)
            .map((w: string) => w[0])
            .join("")
            .slice(0, 2)
            .toUpperCase();

          ad = {
            id: `ig-${item?.shortcode || parsed.externalId || crypto.randomUUID()}`,
            brand_id: `brand-${username.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
            brand_name: fullName,
            brand_handle: `@${username}`,
            brand_avatar_initials: initials || "IG",
            brand_avatar_color: "#E11D48",
            brand_logo_url: item?.owner?.profile_pic_url,
            market: "US",
            source_type: "instagram",
            source_url: parsed.rawUrl,
            external_ad_id: item?.shortcode || parsed.externalId,
            media_type: videoUrl ? "video" : "image",
            media_url: videoUrl || thumbUrl,
            thumbnail_url: thumbUrl || videoUrl,
            aspect_ratio: videoUrl ? "9:16" : "3:4",
            duration_seconds: item?.video_duration ? Math.round(item.video_duration) : undefined,
            primary_text: caption,
            headline: caption ? caption.slice(0, 68) : `@${username} Reel`,
            cta_text: "Åbn på IG",
            landing_page_url: parsed.rawUrl,
            is_active: true,
            started_running_at: item?.taken_at_timestamp
              ? new Date(item.taken_at_timestamp * 1000).toISOString()
              : new Date().toISOString(),
            eu_reach: item?.video_view_count || item?.video_play_count || undefined,
            platforms: ["Instagram"],
            status: "ready",
            ai_format: videoUrl ? "Instagram Reel" : "Instagram Post",
            tags: ["instagram"],
            board_ids: boardIds,
            user_notes: "",
            is_favorite: false,
            created_at: new Date().toISOString(),
          };
        }
      }

      // C) OpenGraph fallback for landing pages / webshops / unconfigured key
      if (!ad) {
        const id = crypto.randomUUID();
        const host = new URL(parsed.rawUrl).hostname.replace(/^www\./, "");
        let ogTitle = "";
        let ogDesc = "";
        let ogImage = "";
        let ogSite = "";

        try {
          const controller = new AbortController();
          const timer = setTimeout(() => controller.abort(), 6000);
          const res = await fetch(parsed.rawUrl, {
            headers: { "User-Agent": BROWSER_UA },
            redirect: "follow",
            signal: controller.signal,
            cache: "no-store",
          });
          clearTimeout(timer);
          if (res.ok) {
            const html = await res.text();
            ogTitle = extractMeta(html, "og:title") || "";
            ogDesc = extractMeta(html, "og:description") || "";
            ogImage = extractMeta(html, "og:image") || "";
            ogSite = extractMeta(html, "og:site_name") || "";
          }
        } catch {
          // ignore
        }

        const guessedName = ogSite || parsed.handleGuess || host;
        const initials = guessedName
          .split(/\s+/)
          .map((w: string) => w[0])
          .join("")
          .slice(0, 2)
          .toUpperCase();

        ad = {
          id,
          brand_id: `brand-${guessedName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
          brand_name: guessedName,
          brand_handle: `@${host.split(".")[0]}`,
          brand_avatar_initials: initials || "AD",
          brand_avatar_color: "#0027eb",
          brand_logo_url: `https://www.google.com/s2/favicons?domain=${encodeURIComponent(host)}&sz=128`,
          market: "US",
          source_type: parsed.sourceType,
          source_url: parsed.rawUrl,
          external_ad_id: parsed.externalId,
          media_type: parsed.sourceType === "manual" ? "image" : "video",
          media_url: ogImage,
          thumbnail_url: ogImage,
          aspect_ratio: "3:4",
          primary_text: ogDesc,
          headline: ogTitle || host,
          cta_text: "Åbn link",
          landing_page_url: parsed.rawUrl,
          is_active: true,
          started_running_at: new Date().toISOString(),
          platforms: parsed.sourceType === "instagram" ? ["Instagram"] : ["Facebook", "Instagram"],
          status: "ready",
          tags: [parsed.sourceType],
          board_ids: boardIds,
          user_notes: "",
          is_favorite: false,
          created_at: new Date().toISOString(),
        };
      }

      // Persist media permanently to Supabase Storage when Supabase is configured
      if (ad.media_url && ad.media_url.startsWith("http")) {
        const stored = await persistMediaToSupabase(ad.media_url, ad.id, "media");
        if (stored) ad.media_url = stored;
      }
      if (ad.thumbnail_url && ad.thumbnail_url.startsWith("http") && ad.thumbnail_url !== ad.media_url) {
        const storedThumb = await persistMediaToSupabase(ad.thumbnail_url, ad.id, "thumb");
        if (storedThumb) ad.thumbnail_url = storedThumb;
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
