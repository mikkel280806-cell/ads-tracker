import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase";
import { SEED_ADS, SEED_BOARDS, SEED_BRANDS } from "@/lib/seed-data";
import type { Ad, Board, Brand } from "@/lib/types";

function toBrandRow(brand: Brand) {
  return {
    id: brand.id,
    name: brand.name,
    market: brand.market || "US",
    website_url: brand.website_url || "",
    meta_page_id: brand.meta_page_id || null,
    is_shopify: Boolean(brand.is_shopify),
    active_ads_count: brand.active_ads_count ?? 0,
    monthly_visits: brand.monthly_visits ?? 0,
    products_count: brand.products_count ?? 0,
    pixels: brand.pixels || [],
    shopify_apps: brand.shopify_apps || [],
    folder_ids: brand.folder_ids || [],
    payload: brand,
    last_synced_at: brand.last_synced_at || new Date().toISOString(),
  };
}

function toAdRow(ad: Ad) {
  return {
    id: ad.id,
    brand_id: ad.brand_id,
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
    payload: ad,
  };
}

function toFolderRow(board: Board) {
  return {
    id: board.id,
    name: board.name,
    description: board.description || "",
    accent_color: board.accent_color || "#0027eb",
    created_at: board.created_at || new Date().toISOString(),
  };
}

export async function GET() {
  const supabase = getSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json({
      ok: true,
      synced: false,
      reason: "supabase_not_configured",
    });
  }

  try {
    const [brandsRes, adsRes, foldersRes] = await Promise.all([
      supabase
        .from("adtrack_brands")
        .select("payload")
        .order("active_ads_count", { ascending: false }),
      supabase
        .from("adtrack_ads")
        .select("payload")
        .order("started_running_at", { ascending: false })
        .limit(1000),
      supabase
        .from("adtrack_folders")
        .select("id, name, description, accent_color, created_at")
        .order("created_at", { ascending: true }),
    ]);

    if (brandsRes.error || adsRes.error || foldersRes.error) {
      return NextResponse.json({
        ok: true,
        synced: false,
        reason: "schema_not_initialized",
        detail:
          brandsRes.error?.message ||
          adsRes.error?.message ||
          foldersRes.error?.message,
      });
    }

    let brands = (brandsRes.data || []).map((r) => r.payload as Brand);
    let ads = (adsRes.data || []).map((r) => r.payload as Ad);
    let folders = (foldersRes.data || []) as Board[];

    // Incrementally sync any newly scraped catalog brands/ads not yet in Supabase
    const existingBrandIds = new Set(brands.map((b) => b.id));
    const missingBrands = SEED_BRANDS.filter((b) => !existingBrandIds.has(b.id));

    if (missingBrands.length > 0) {
      const missingBrandIdSet = new Set(missingBrands.map((b) => b.id));
      const missingAds = SEED_ADS.filter((a) => missingBrandIdSet.has(a.brand_id));

      await supabase
        .from("adtrack_brands")
        .upsert(missingBrands.map(toBrandRow), { onConflict: "id" });

      for (let i = 0; i < missingAds.length; i += 100) {
        await supabase
          .from("adtrack_ads")
          .upsert(missingAds.slice(i, i + 100).map(toAdRow), {
            onConflict: "id",
          });
      }

      brands = [...missingBrands, ...brands];
      ads = [...missingAds, ...ads];
    }

    if (folders.length === 0 && SEED_BOARDS.length > 0) {
      await supabase
        .from("adtrack_folders")
        .upsert(SEED_BOARDS.map(toFolderRow), { onConflict: "id" });
      folders = SEED_BOARDS;
    }

    return NextResponse.json({
      ok: true,
      synced: true,
      brands,
      ads,
      folders,
    });
  } catch (err) {
    console.error("GET /api/catalog error:", err);
    return NextResponse.json({
      ok: true,
      synced: false,
      reason: "error",
    });
  }
}

export async function POST(request: NextRequest) {
  const supabase = getSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json({ ok: true, synced: false });
  }

  try {
    const body = (await request.json()) as {
      action:
        | "upsert_brand"
        | "upsert_brand_and_ads"
        | "upsert_ad"
        | "upsert_folder"
        | "delete_folder";
      brand?: Brand;
      ads?: Ad[];
      ad?: Ad;
      folder?: Board;
      folderId?: string;
    };

    if (body.action === "upsert_brand" && body.brand) {
      const { error } = await supabase
        .from("adtrack_brands")
        .upsert(toBrandRow(body.brand), { onConflict: "id" });
      if (error) throw error;
    }

    if (body.action === "upsert_brand_and_ads" && body.brand) {
      const { error: bErr } = await supabase
        .from("adtrack_brands")
        .upsert(toBrandRow(body.brand), { onConflict: "id" });
      if (bErr) throw bErr;

      if (Array.isArray(body.ads) && body.ads.length > 0) {
        const { error: aErr } = await supabase
          .from("adtrack_ads")
          .upsert(body.ads.map(toAdRow), { onConflict: "id" });
        if (aErr) throw aErr;
      }
    }

    if (body.action === "upsert_ad" && body.ad) {
      const { error } = await supabase
        .from("adtrack_ads")
        .upsert(toAdRow(body.ad), { onConflict: "id" });
      if (error) throw error;
    }

    if (body.action === "upsert_folder" && body.folder) {
      const { error } = await supabase
        .from("adtrack_folders")
        .upsert(toFolderRow(body.folder), { onConflict: "id" });
      if (error) throw error;
    }

    if (body.action === "delete_folder" && body.folderId) {
      const { error } = await supabase
        .from("adtrack_folders")
        .delete()
        .eq("id", body.folderId);
      if (error) throw error;
    }

    return NextResponse.json({ ok: true, synced: true });
  } catch (err) {
    console.error("POST /api/catalog error:", err);
    return NextResponse.json(
      { ok: false, error: "Supabase sync failed" },
      { status: 500 }
    );
  }
}
