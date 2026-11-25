import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase";
import { SEED_ADS, SEED_BRANDS } from "@/lib/seed-data";
import type { Ad, Board, Brand } from "@/lib/types";

const CUSTOM_MEDIA_BRAND_ID = "custom-media";

function isCustomMediaAd(ad: Ad): boolean {
  return (
    ad.source_type === "manual" ||
    ad.source_type === "instagram" ||
    ad.brand_id === "custom-upload" ||
    ad.brand_id === CUSTOM_MEDIA_BRAND_ID ||
    ad.brand_id.startsWith("ig-") ||
    (Array.isArray(ad.tags) &&
      (ad.tags.includes("custom-upload") || ad.tags.includes("custom-import")))
  );
}

async function ensureCustomMediaBrand(
  supabase: NonNullable<ReturnType<typeof getSupabaseServerClient>>
) {
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
}

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
  const safeBrandId = isCustomMediaAd(ad) ? CUSTOM_MEDIA_BRAND_ID : ad.brand_id;
  return {
    id: ad.id,
    brand_id: safeBrandId,
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
    payload: { ...ad, brand_id: safeBrandId },
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

export async function GET(request: NextRequest) {
  const supabase = getSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json({
      ok: true,
      synced: false,
      reason: "supabase_not_configured",
    });
  }

  const mode = request.nextUrl.searchParams.get("mode");
  const brandIdParam = request.nextUrl.searchParams.get("brandId");

  try {
    // 1. Ultra-fast single-brand ads fetch (~200ms) for instant Shop Analytics drill-down
    if (brandIdParam) {
      const { data, error } = await supabase
        .from("adtrack_ads")
        .select("payload")
        .eq("brand_id", brandIdParam)
        .order("started_running_at", { ascending: false })
        .range(0, 999);
      if (error) {
        return NextResponse.json({ ok: true, synced: false, reason: "error", detail: error.message });
      }
      const ads = (data || []).map((r) => r.payload as Ad);
      return NextResponse.json({ ok: true, synced: true, brandId: brandIdParam, ads });
    }

    // Parallel page fetcher for all ads (1 parallel batch instead of 7 serial round-trips!)
    const fetchAllAdsParallel = async () => {
      const PAGE_SIZE = 1000;
      const MAX_PAGES = 10; // up to 10,000 ads

      const [countRes, page0Res] = await Promise.all([
        supabase.from("adtrack_ads").select("id", { count: "exact", head: true }),
        supabase
          .from("adtrack_ads")
          .select("payload")
          .order("started_running_at", { ascending: false })
          .range(0, PAGE_SIZE - 1),
      ]);

      if (page0Res.error) {
        return { data: null as { payload: unknown }[] | null, error: page0Res.error };
      }

      const firstChunk = page0Res.data || [];
      const totalCount = countRes.count ?? firstChunk.length;
      if (firstChunk.length < PAGE_SIZE || totalCount <= PAGE_SIZE) {
        return { data: firstChunk, error: null };
      }

      const totalPages = Math.min(MAX_PAGES, Math.ceil(totalCount / PAGE_SIZE));
      const remainingPages = Array.from({ length: totalPages - 1 }, (_, i) => i + 1);
      const restResults = await Promise.all(
        remainingPages.map((page) =>
          supabase
            .from("adtrack_ads")
            .select("payload")
            .order("started_running_at", { ascending: false })
            .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)
        )
      );

      const allRows: { payload: unknown }[] = [...firstChunk];
      for (const res of restResults) {
        if (res.error) return { data: null as { payload: unknown }[] | null, error: res.error };
        if (res.data) allRows.push(...res.data);
      }
      return { data: allRows, error: null };
    };

    // 1b. Ultra-fast filtered counts (~40ms) so Ads counters always show exact DB totals even while Stage 2 streams
    if (mode === "counts") {
      const sp = request.nextUrl.searchParams;
      const brand = sp.get("brand");
      const media = sp.get("media");
      const time = sp.get("time");
      const scaled = sp.get("scaled") === "1";
      const q = (sp.get("q") || "").replace(/[%(),]/g, " ").trim();

      const buildQuery = (marketScope: "DK" | "US") => {
        let query = supabase
          .from("adtrack_ads")
          .select("id", { count: "exact", head: true })
          .neq("brand_id", CUSTOM_MEDIA_BRAND_ID);

        if (marketScope === "DK") query = query.eq("market", "DK");
        else query = query.neq("market", "DK");

        if (brand && brand !== "all") query = query.eq("brand_id", brand);
        if (media && media !== "all") {
          if (media === "video") query = query.eq("media_type", "video");
          else if (media === "carousel") query = query.eq("media_type", "carousel");
          else if (media === "image") query = query.eq("media_type", "image");
        }
        if (time === "7d" || time === "30d" || time === "90d") {
          const days = time === "7d" ? 7 : time === "30d" ? 30 : 90;
          const refNowMs = Date.UTC(2026, 10, 21, 16, 0, 0);
          const cutoffIso = new Date(refNowMs - days * 86_400_000).toISOString();
          query = query.gte("started_running_at", cutoffIso);
        }
        if (scaled) {
          query = query.gte("duplicated_count", 3);
        }
        if (q) {
          query = query.or(
            `brand_name.ilike.%${q}%,headline.ilike.%${q}%,primary_text.ilike.%${q}%,extracted_hook.ilike.%${q}%,landing_page_url.ilike.%${q}%`
          );
        }
        return query;
      };

      const [dkRes, usRes] = await Promise.all([buildQuery("DK"), buildQuery("US")]);
      if (dkRes.error || usRes.error) {
        return NextResponse.json({
          ok: true,
          synced: false,
          reason: "error",
          detail: dkRes.error?.message || usRes.error?.message,
        });
      }
      const dk = dkRes.count ?? 0;
      const us = usRes.count ?? 0;
      return NextResponse.json({
        ok: true,
        synced: true,
        counts: { all: dk + us, dk, us },
      });
    }

    // 2. Chunked background ads sync (?mode=ads&page=0&limit=500 -> ~450ms per chunk, zero DB timeouts!)
    if (mode === "ads") {
      const pageParam = request.nextUrl.searchParams.get("page");
      if (pageParam !== null) {
        const page = Math.max(0, parseInt(pageParam, 10) || 0);
        const pageSize = Math.min(
          800,
          Math.max(100, parseInt(request.nextUrl.searchParams.get("limit") || "500", 10) || 500)
        );
        const from = page * pageSize;
        const to = from + pageSize - 1;
        const { data, error } = await supabase
          .from("adtrack_ads")
          .select("payload")
          .order("started_running_at", { ascending: false })
          .range(from, to);
        if (error) {
          return NextResponse.json({
            ok: true,
            synced: false,
            reason: "error",
            detail: error.message,
          });
        }
        const ads = (data || []).map((r) => r.payload as Ad);
        return NextResponse.json({
          ok: true,
          synced: true,
          page,
          hasMore: ads.length === pageSize,
          ads,
        });
      }

      const adsRes = await fetchAllAdsParallel();
      if (adsRes.error) {
        return NextResponse.json({
          ok: true,
          synced: false,
          reason: "error",
          detail: adsRes.error.message,
        });
      }
      const ads = (adsRes.data || []).map((r) => r.payload as Ad);
      return NextResponse.json({ ok: true, synced: true, ads });
    }

    // 3. Ultra-fast initial bootstrap (~300-500ms): all 37 brands + folders + saved/folder ads + newest 220 ads + exact market totals
    if (mode === "fast") {
      const [brandsRes, foldersRes, savedAdsRes, recentAdsRes, dkCountRes, usCountRes] = await Promise.all([
        supabase
          .from("adtrack_brands")
          .select("payload")
          .order("active_ads_count", { ascending: false }),
        supabase
          .from("adtrack_folders")
          .select("id, name, description, accent_color, created_at")
          .order("created_at", { ascending: true }),
        supabase
          .from("adtrack_ads")
          .select("payload")
          .not("board_ids", "eq", "{}")
          .order("started_running_at", { ascending: false })
          .range(0, 399),
        supabase
          .from("adtrack_ads")
          .select("payload")
          .order("started_running_at", { ascending: false })
          .range(0, 219),
        supabase
          .from("adtrack_ads")
          .select("id", { count: "exact", head: true })
          .neq("brand_id", CUSTOM_MEDIA_BRAND_ID)
          .eq("market", "DK"),
        supabase
          .from("adtrack_ads")
          .select("id", { count: "exact", head: true })
          .neq("brand_id", CUSTOM_MEDIA_BRAND_ID)
          .neq("market", "DK"),
      ]);

      if (brandsRes.error || foldersRes.error || recentAdsRes.error) {
        return NextResponse.json({
          ok: true,
          synced: false,
          reason: "schema_not_initialized",
          detail:
            brandsRes.error?.message ||
            foldersRes.error?.message ||
            recentAdsRes.error?.message,
        });
      }

      const brands = (brandsRes.data || [])
        .map((r) => r.payload as Brand)
        .filter((b) => b && b.id !== CUSTOM_MEDIA_BRAND_ID && b.is_tracked !== false);
      const folders = (foldersRes.data || []) as Board[];

      const seenAdIds = new Set<string>();
      const ads: Ad[] = [];
      for (const row of [...(savedAdsRes.data || []), ...(recentAdsRes.data || [])]) {
        const a = row.payload as Ad;
        if (a && a.id && !seenAdIds.has(a.id)) {
          seenAdIds.add(a.id);
          ads.push(a);
        }
      }

      const dkCount = dkCountRes.count ?? 0;
      const usCount = usCountRes.count ?? 0;
      const paidTotal = dkCount + usCount;

      return NextResponse.json({
        ok: true,
        synced: true,
        partial: true,
        totalAdsCount: paidTotal || ads.length,
        adCounts: {
          all: paidTotal,
          dk: dkCount,
          us: usCount,
        },
        brands,
        ads,
        folders,
      });
    }

    // 4. Default full catalog (parallelized!)
    const [brandsRes, adsRes, foldersRes] = await Promise.all([
      supabase
        .from("adtrack_brands")
        .select("payload")
        .order("active_ads_count", { ascending: false }),
      fetchAllAdsParallel(),
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

    let brands = (brandsRes.data || [])
      .map((r) => r.payload as Brand)
      .filter((b) => b && b.id !== CUSTOM_MEDIA_BRAND_ID && b.is_tracked !== false);
    let ads = (adsRes.data || []).map((r) => r.payload as Ad);
    let folders = (foldersRes.data || []) as Board[];

    // Incrementally sync missing OR meta_page_id-corrected OR stale-ad catalog brands/ads into Supabase
    const existingById = new Map(brands.map((b) => [b.id, b]));
    const staleTheNapAds = ads.some(
      (a) =>
        a.brand_id === "brand-thenap-dk" &&
        (!a.landing_page_url?.includes("thenap") ||
          a.landing_page_url.includes("sscnapoli"))
    );
    const brandsToUpsert = SEED_BRANDS.filter((seedBrand) => {
      const cur = existingById.get(seedBrand.id);
      if (!cur) return true;
      if (seedBrand.id === "brand-thenap-dk" && staleTheNapAds) return true;
      return Boolean(seedBrand.meta_page_id && cur.meta_page_id !== seedBrand.meta_page_id);
    });

    // Clean up removed / stale brand rows if present
    const removedBrandIds = [
      "brand-mycomfort-dk",
      "brand-deepstash-com",
      "brand-barons-dk",
      "brand-gymshark-com",
      "brand-planetnusa-com",
      "brand-rains-com",
      "brand-colorfulstandard-com",
      "brand-nordgreen-com",
      "brand-shapingnewtomorrow-com",
      "brand-eyda-com",
      "brand-trueclassictees-com",
      "brand-us-dollarshaveclub-com",
      "brand-theoodie-com",
      "brand-loopearplugs-com",
      "brand-jonesroadbeauty-com",
    ];
    for (const removedId of removedBrandIds) {
      if (existingById.has(removedId)) {
        await supabase.from("adtrack_brands").delete().eq("id", removedId);
        brands = brands.filter((b) => b.id !== removedId);
        ads = ads.filter((a) => a.brand_id !== removedId);
      }
    }

    if (brandsToUpsert.length > 0) {
      const upsertIds = new Set(brandsToUpsert.map((b) => b.id));
      const updatedAds = SEED_ADS.filter((a) => upsertIds.has(a.brand_id));

      // Preserve any user folder_ids on existing brands being refreshed
      const mergedUpsertBrands = brandsToUpsert.map((sb) => ({
        ...sb,
        folder_ids: existingById.get(sb.id)?.folder_ids || sb.folder_ids || [],
      }));

      await supabase
        .from("adtrack_brands")
        .upsert(mergedUpsertBrands.map(toBrandRow), { onConflict: "id" });

      for (const id of upsertIds) {
        if (existingById.has(id)) {
          await supabase.from("adtrack_ads").delete().eq("brand_id", id);
        }
      }

      for (let i = 0; i < updatedAds.length; i += 100) {
        await supabase
          .from("adtrack_ads")
          .upsert(updatedAds.slice(i, i + 100).map(toAdRow), {
            onConflict: "id",
          });
      }

      brands = [
        ...mergedUpsertBrands,
        ...brands.filter((b) => !upsertIds.has(b.id)),
      ];
      ads = [...updatedAds, ...ads.filter((a) => !upsertIds.has(a.brand_id))];
    }

    // Incrementally sync upgraded pixels & shopify_apps into existing Supabase rows (preserves ads & folders)
    const afterFullById = new Map(brands.map((b) => [b.id, b]));
    const sameList = (a?: string[], b?: string[]) => {
      const aa = a || [];
      const bb = b || [];
      return aa.length === bb.length && aa.every((v, i) => v === bb[i]);
    };
    const techRefreshBrands: Brand[] = [];
    for (const sb of SEED_BRANDS) {
      const cur = afterFullById.get(sb.id);
      if (!cur) continue;
      const seedPx = sb.pixels || [];
      const seedApps = sb.shopify_apps || [];
      const curPx = cur.pixels || [];
      const curApps = cur.shopify_apps || [];
      const needsTechSync =
        (seedPx.length > 0 && !sameList(curPx, seedPx)) ||
        (seedApps.length > 0 && !sameList(curApps, seedApps)) ||
        (sb.is_shopify && !cur.is_shopify);
      if (needsTechSync) {
        techRefreshBrands.push({
          ...cur,
          pixels: seedPx.length > 0 ? seedPx : curPx,
          shopify_apps: seedApps.length > 0 ? seedApps : curApps,
          is_shopify: sb.is_shopify || cur.is_shopify,
        });
      }
    }

    if (techRefreshBrands.length > 0) {
      await supabase
        .from("adtrack_brands")
        .upsert(techRefreshBrands.map(toBrandRow), { onConflict: "id" });
      const refreshedById = new Map(techRefreshBrands.map((b) => [b.id, b]));
      brands = brands.map((b) => refreshedById.get(b.id) || b);
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
        | "delete_ad"
        | "upsert_folder"
        | "delete_folder";
      brand?: Brand;
      ads?: Ad[];
      ad?: Ad;
      adId?: string;
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
      if (isCustomMediaAd(body.ad)) {
        await ensureCustomMediaBrand(supabase);
      }
      const { error } = await supabase
        .from("adtrack_ads")
        .upsert(toAdRow(body.ad), { onConflict: "id" });
      if (error) throw error;
    }

    if (body.action === "delete_ad" && body.adId) {
      const { error } = await supabase
        .from("adtrack_ads")
        .delete()
        .eq("id", body.adId);
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
