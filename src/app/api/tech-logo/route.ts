import { NextRequest, NextResponse } from "next/server";
import { getTechMeta } from "@/lib/tech-catalog";

const BROWSER_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36";

async function tryFetchImage(url: string, minBytes = 350): Promise<{ buf: ArrayBuffer; contentType: string } | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 4500);
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": BROWSER_UA,
        Accept: "image/avif,image/webp,image/png,image/svg+xml,image/*,*/*;q=0.8",
      },
      redirect: "follow",
      signal: controller.signal,
    });
    if (!res.ok) return null;
    const contentType = res.headers.get("content-type") || "image/png";
    if (!contentType.startsWith("image/") && !contentType.includes("icon") && !contentType.includes("octet-stream")) {
      return null;
    }
    const buf = await res.arrayBuffer();
    if (buf.byteLength < minBytes) return null;
    return { buf, contentType: contentType.startsWith("image/") ? contentType : "image/png" };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const name = searchParams.get("name")?.trim() || "";
  const rawDomain = searchParams.get("domain")?.trim() || "";

  const meta = name ? getTechMeta(name) : null;
  const domain = (meta?.domain || rawDomain)
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/\/.*$/, "");

  if (!domain || !/^[a-z0-9.-]+\.[a-z]{2,}$/.test(domain)) {
    return new NextResponse(null, { status: 404 });
  }

  // Waterfall of real brand icon sources (cached 7 days on Vercel Edge CDN)
  const candidates = [
    `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=128`,
    `https://icons.duckduckgo.com/ip3/${encodeURIComponent(domain)}.ico`,
    `https://${domain}/apple-touch-icon.png`,
    `https://${domain}/favicon.ico`,
  ];

  for (const candidate of candidates) {
    const hit = await tryFetchImage(candidate, candidate.includes("s2/favicons") ? 420 : 250);
    if (hit) {
      return new NextResponse(hit.buf, {
        status: 200,
        headers: {
          "Content-Type": hit.contentType,
          "Cache-Control": "public, max-age=604800, s-maxage=604800, stale-while-revalidate=86400",
        },
      });
    }
  }

  return new NextResponse(null, { status: 404 });
}
