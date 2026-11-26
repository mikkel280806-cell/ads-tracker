import { NextRequest, NextResponse } from "next/server";
import { decodeEntities, extractMeta, fetchHtmlSmart } from "@/lib/shop-scraper";
import {
  buildHookVariants,
  buildScenesForPreset,
  generateCreativeProject,
  mineUrlToInsights,
} from "@/lib/snow-engine";
import type {
  BrandMemory,
  ClonedSourceAd,
  StaticCloneLayoutId,
  VideoStylePresetId,
} from "@/lib/studio-types";

interface StudioRequestBody {
  action?: "generate_project" | "mine_url" | "regenerate_hooks";
  brandMemory?: BrandMemory | null;
  stylePresetId?: VideoStylePresetId;
  staticLayoutId?: StaticCloneLayoutId;
  mode?: "video" | "static_clone" | "url_miner";
  aspectRatio?: "9:16" | "4:5" | "1:1";
  language?: "da" | "en";
  creatorPersona?: string;
  productTitle?: string;
  angle?: string;
  userPrompt?: string;
  clonedFromAd?: ClonedSourceAd;
  url?: string;
  rawReviews?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as StudioRequestBody;
    const action = body.action || "generate_project";

    if (action === "mine_url") {
      const rawUrl = (body.url || "").trim();
      const rawReviews = (body.rawReviews || "").trim();

      if (!rawUrl && !rawReviews) {
        return NextResponse.json(
          { ok: false, error: "Indsæt enten en produkt-URL eller kundeanmeldelser." },
          { status: 400 }
        );
      }

      if (rawUrl) {
        const normalized = /^https?:\/\//i.test(rawUrl) ? rawUrl : `https://${rawUrl}`;
        const parsed = new URL(normalized);
        if (/^(localhost|127\.|10\.|192\.168\.|169\.254\.)/i.test(parsed.hostname)) {
          return NextResponse.json({ ok: false, error: "Ugyldig URL." }, { status: 400 });
        }
        const fetched = await fetchHtmlSmart(normalized, 8500);
        const html = fetched.ok ? fetched.html : `<p>${rawReviews}</p>`;
        const title = fetched.ok
          ? decodeEntities(
              extractMeta(html, "og:title") ||
                html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ||
                parsed.hostname
            )
          : body.brandMemory?.brandName || parsed.hostname;
        const insights = mineUrlToInsights({
          url: fetched.url || normalized,
          html: rawReviews ? `${html}\n<p>${rawReviews.replace(/\n/g, "</p><p>")}</p>` : html,
          title,
          description: extractMeta(html, "description"),
          imageUrl: extractMeta(html, "og:image"),
          brandMemory: body.brandMemory || null,
        });
        return NextResponse.json({ ok: true, insights });
      }

      const insights = mineUrlToInsights({
        url: body.brandMemory?.websiteUrl || "https://custom-reviews",
        html: `<p>${rawReviews.replace(/\n/g, "</p><p>")}</p>`,
        title: `${body.brandMemory?.brandName || "Produkt"} · Review Mining`,
        brandMemory: body.brandMemory || null,
      });
      return NextResponse.json({ ok: true, insights });
    }

    if (action === "regenerate_hooks") {
      const bm = body.brandMemory || null;
      const brandName = bm?.brandName || "Dit Brand";
      const productTitle = body.productTitle || bm?.products[0]?.title || `${brandName} Hero`;
      const hooks = buildHookVariants({
        brandName,
        productTitle,
        painPoint: bm?.painPoints[0] || "hverdagsproblemet",
        desire: bm?.desires[0] || "bedre resultater",
        usp: bm?.usps[0] || "høj kvalitet",
        language: body.language || "da",
        clonedFromAd: body.clonedFromAd,
      });
      const scenes = buildScenesForPreset({
        presetId: body.stylePresetId || "iphone_ugc",
        brandName,
        productTitle,
        hook: hooks[0],
        painPoint: bm?.painPoints[0] || "hverdagsproblemet",
        desire: bm?.desires[0] || "bedre resultater",
        usp: bm?.usps[0] || "høj kvalitet",
        primaryOffer: bm?.primaryOffer || "Hurtig levering & tilfredshedsgaranti",
        language: body.language || "da",
      });
      return NextResponse.json({ ok: true, hooks, scenes });
    }

    const project = await generateCreativeProject({
      brandMemory: body.brandMemory || null,
      stylePresetId: body.stylePresetId || "iphone_ugc",
      staticLayoutId: body.staticLayoutId || "callout_pointers",
      mode: body.mode || "video",
      aspectRatio: body.aspectRatio || "9:16",
      language: body.language || "da",
      creatorPersona: body.creatorPersona,
      productTitle: body.productTitle,
      angle: body.angle,
      userPrompt: body.userPrompt,
      clonedFromAd: body.clonedFromAd,
    });

    return NextResponse.json({ ok: true, project });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error:
          err instanceof Error
            ? err.message
            : "Kunne ikke generere kreativt projekt.",
      },
      { status: 500 }
    );
  }
}
