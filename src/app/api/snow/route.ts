import { NextRequest, NextResponse } from "next/server";
import { decodeEntities, extractMeta, fetchHtmlSmart } from "@/lib/shop-scraper";
import { generateSnowResponse, mineUrlToInsights } from "@/lib/snow-engine";
import type {
  BrandMemory,
  ClonedSourceAd,
  MinedUrlInsights,
  OwnAdMetricRow,
  SnowMessage,
} from "@/lib/studio-types";
import type { Ad, ProductPreview } from "@/lib/types";

interface SnowRequestBody {
  messages?: SnowMessage[];
  prompt?: string;
  brandMemory?: BrandMemory | null;
  attachedAd?: ClonedSourceAd | null;
  attachedProduct?: ProductPreview | null;
  urlToMine?: string;
  analyticsRows?: OwnAdMetricRow[];
  candidateSwipeAds?: Ad[];
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as SnowRequestBody;
    const latestPrompt =
      body.prompt ||
      body.messages?.[body.messages.length - 1]?.content ||
      "Analysér mit brand og find bedste ad-muligheder";

    let urlCandidate = (body.urlToMine || "").trim();
    if (!urlCandidate) {
      const inlineUrl = latestPrompt.match(/https?:\/\/[^\s]+/i)?.[0];
      if (inlineUrl) urlCandidate = inlineUrl;
    }

    let minedInsights: MinedUrlInsights | null = null;
    if (urlCandidate && /^https?:\/\//i.test(urlCandidate)) {
      const parsed = new URL(urlCandidate);
      if (!/^(localhost|127\.|10\.|192\.168\.|169\.254\.)/i.test(parsed.hostname)) {
        const fetched = await fetchHtmlSmart(urlCandidate, 8500);
        if (fetched.ok) {
          const title = decodeEntities(
            extractMeta(fetched.html, "og:title") ||
              fetched.html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ||
              parsed.hostname
          );
          const imageUrl =
            extractMeta(fetched.html, "og:image") ||
            extractMeta(fetched.html, "twitter:image");
          const priceAmt =
            extractMeta(fetched.html, "product:price:amount") ||
            extractMeta(fetched.html, "og:price:amount");
          const priceCur =
            extractMeta(fetched.html, "product:price:currency") ||
            extractMeta(fetched.html, "og:price:currency") ||
            "DKK";
          minedInsights = mineUrlToInsights({
            url: fetched.url || urlCandidate,
            html: fetched.html,
            title,
            description: extractMeta(fetched.html, "description"),
            imageUrl,
            priceText: priceAmt ? `${priceAmt} ${priceCur}` : undefined,
            brandMemory: body.brandMemory || null,
          });
        }
      }
    }

    const message = await generateSnowResponse({
      prompt: latestPrompt,
      brandMemory: body.brandMemory || null,
      attachedAd: body.attachedAd || null,
      attachedProduct: body.attachedProduct || null,
      minedInsights,
      analyticsRows: body.analyticsRows || [],
      candidateSwipeAds: body.candidateSwipeAds || [],
    });

    return NextResponse.json({
      ok: true,
      message,
    });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error:
          err instanceof Error ? err.message : "Snow kunne ikke fuldføre svaret.",
      },
      { status: 500 }
    );
  }
}
