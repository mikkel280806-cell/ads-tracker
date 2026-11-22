import { NextRequest, NextResponse } from "next/server";
import {
  BROWSER_UA,
  decodeEntities,
  extractMeta,
} from "@/lib/shop-scraper";
import {
  classifyFunnelType,
  type LiveLandingPageAudit,
} from "@/lib/ad-analyzer";

/**
 * 100% Free, Zero-AI-Key Live Landing Page Inspector (Trendtrack-style).
 * Fetches the ad's landing page URL directly and extracts H1, title, price,
 * funnel type, load speed, and conversion/trust signals.
 */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { url?: string };
    const rawUrl = (body.url || "").trim();

    if (!rawUrl || !/^https?:\/\//i.test(rawUrl)) {
      return NextResponse.json(
        { ok: false, message: "Ingen gyldig landing page URL på denne annonce." },
        { status: 400 }
      );
    }

    const parsedUrl = new URL(rawUrl);
    // Block private/local network hosts
    if (
      /^(localhost|127\.|10\.|192\.168\.|169\.254\.|0\.0\.0\.0)/i.test(
        parsedUrl.hostname
      )
    ) {
      return NextResponse.json(
        { ok: false, message: "Ugyldig destination." },
        { status: 400 }
      );
    }

    const start = Date.now();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8500);

    let res: Response;
    try {
      res = await fetch(rawUrl, {
        headers: {
          "User-Agent": BROWSER_UA,
          Accept:
            "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "da-DK,da;q=0.9,en-US;q=0.8,en;q=0.7",
        },
        redirect: "follow",
        signal: controller.signal,
        cache: "no-store",
      });
    } finally {
      clearTimeout(timer);
    }

    const responseMs = Date.now() - start;
    if (!res.ok) {
      return NextResponse.json({
        ok: false,
        message: `Landing page svarede med HTTP ${res.status} (${responseMs}ms).`,
      });
    }

    const html = await res.text();
    const finalUrl = res.url || rawUrl;
    const finalPath = (() => {
      try {
        return new URL(finalUrl).pathname;
      } catch {
        return "/";
      }
    })();

    const titleRaw =
      extractMeta(html, "og:title") ||
      html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ||
      "";
    const title = decodeEntities(titleRaw.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim());

    const h1Raw = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1] || "";
    const h1 = decodeEntities(
      h1Raw.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()
    ).slice(0, 160);

    const description = (
      extractMeta(html, "og:description") ||
      extractMeta(html, "description") ||
      ""
    ).slice(0, 220);

    // Extract product price from meta tags or JSON-LD
    let price =
      extractMeta(html, "product:price:amount") ||
      extractMeta(html, "og:price:amount") ||
      "";
    let currency =
      extractMeta(html, "product:price:currency") ||
      extractMeta(html, "og:price:currency") ||
      "";

    if (!price) {
      const ldPrice = html.match(/"price"\s*:\s*"?(\d+(?:[.,]\d{1,2})?)"?/i);
      const ldCurr = html.match(/"priceCurrency"\s*:\s*"([A-Z]{3})"/i);
      if (ldPrice?.[1] && Number(ldPrice[1].replace(",", ".")) > 0) {
        price = ldPrice[1];
        if (ldCurr?.[1]) currency = ldCurr[1];
      }
    }
    if (price && !(Number(price.replace(",", ".")) > 0)) {
      price = "";
      currency = "";
    }

    const lower = html.toLowerCase();
    const conversionSignals: string[] = [];
    const checks: [string, RegExp][] = [
      ["Trustpilot", /trustpilot/i],
      ["Kundeanmeldelser", /judge\.me|loox|yotpo|okendo|junip|stamped|reviews\.io|lipscore/i],
      ["Fri fragt", /gratis fragt|fri fragt|free shipping|free delivery/i],
      ["Tilfredshedsgaranti", /tilfredshedsgaranti|money[\s-]?back|day guarantee|dages retur|dages prøve/i],
      ["Bundle / Mængderabat", /bundle|buy \d|køb \d|save \d+%|spar \d+%|quantity break/i],
      ["Subscription / Abonnement", /subscribe\s*(&|and)\s*save|recharge|skio|abonnement/i],
      ["Klarna / Anyday / Shop Pay", /klarna|anyday|shop pay|apple pay|mobilepay/i],
      ["Urgency / Countdown", /countdown|limited stock|få på lager|only \d+ left|selling fast/i],
      ["e-mærket", /emaerket|e-mærket/i],
    ];

    for (const [label, re] of checks) {
      if (re.test(lower)) conversionSignals.push(label);
    }

    const audit: LiveLandingPageAudit = {
      url: rawUrl,
      finalUrl,
      httpStatus: res.status,
      responseMs,
      title: title || undefined,
      h1: h1 && h1 !== title ? h1 : undefined,
      description: description || undefined,
      price: price || undefined,
      currency: currency || undefined,
      funnelType: classifyFunnelType(finalUrl, finalPath),
      conversionSignals: conversionSignals.slice(0, 8),
    };

    return NextResponse.json({ ok: true, audit });
  } catch (err) {
    console.error("/api/analyze LP inspector error:", err);
    return NextResponse.json(
      { ok: false, message: "Kunne ikke hente landing page (timeout eller blokeret)." },
      { status: 500 }
    );
  }
}
