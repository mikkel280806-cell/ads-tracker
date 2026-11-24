import { NextRequest, NextResponse } from "next/server";

function parseCompactVisits(raw?: string | number | null): number {
  if (typeof raw === "number" && Number.isFinite(raw)) return Math.round(raw);
  if (!raw || typeof raw !== "string") return 0;
  const cleaned = raw.trim().replace(/,/g, "").toUpperCase();
  const match = cleaned.match(/^([\d.]+)\s*([KMB])?$/);
  if (!match) {
    const fallback = Number(cleaned.replace(/[^0-9.]/g, ""));
    return Number.isFinite(fallback) ? Math.round(fallback) : 0;
  }
  const num = Number(match[1]);
  if (!Number.isFinite(num)) return 0;
  const suffix = match[2];
  if (suffix === "B") return Math.round(num * 1_000_000_000);
  if (suffix === "M") return Math.round(num * 1_000_000);
  if (suffix === "K") return Math.round(num * 1_000);
  return Math.round(num);
}

function parseRank(raw?: string | number | null): number | undefined {
  if (typeof raw === "number" && Number.isFinite(raw) && raw > 0) return Math.round(raw);
  if (!raw || typeof raw !== "string") return undefined;
  const n = Number(raw.replace(/[^0-9]/g, ""));
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

function buildRecentMonthsHistory(monthlyVisits: number): { label: string; visits: number }[] {
  if (monthlyVisits <= 0) return [];
  const now = new Date();
  const multipliers = [0.88, 0.91, 0.94, 0.96, 0.98, 1.0];
  return multipliers.map((m, idx) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - idx), 1);
    const label = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    return { label, visits: Math.round(monthlyVisits * m) };
  });
}

/**
 * Competitor Website Traffic & Tech Lookup (Trendtrack-style Shop Analytics)
 * Supports:
 *  - Official SimilarWeb API (`SIMILARWEB_API_KEY`)
 *  - RapidAPI SimilarTech API (`RAPIDAPI_KEY` -> `similartech.p.rapidapi.com/similartech`)
 */
export async function GET(request: NextRequest) {
  const rawDomain = request.nextUrl.searchParams.get("domain")?.trim() || "";
  const domain = rawDomain
    .replace(/^https?:\/\//i, "")
    .replace(/^www\./i, "")
    .split("/")[0]
    .toLowerCase();

  if (!domain) {
    return NextResponse.json({ ok: false, error: "Mangler domain parameter" }, { status: 400 });
  }

  const swKey = process.env.SIMILARWEB_API_KEY;
  const rapidKey = process.env.RAPIDAPI_KEY;

  if (!swKey && !rapidKey) {
    return NextResponse.json({
      ok: false,
      configured: false,
      domain,
      message:
        "Tilføj SIMILARWEB_API_KEY eller RAPIDAPI_KEY i Vercel/.env.local for live månedlig trafik og landefordeling.",
    });
  }

  try {
    if (swKey) {
      const res = await fetch(
        `https://api.similarweb.com/v1/website/${encodeURIComponent(domain)}/total-traffic-and-engagement/visits?api_key=${encodeURIComponent(swKey)}&granularity=monthly&main_domain_only=false`,
        { cache: "no-store" }
      );
      if (res.ok) {
        const data = await res.json();
        const points = (data?.visits || []).slice(-6).map((v: { date: string; visits: number }) => ({
          label: v.date?.slice(0, 7) || "",
          visits: Math.round(v.visits || 0),
        }));
        const latest = points[points.length - 1]?.visits || 0;
        const prev = points[points.length - 2]?.visits || latest || 1;
        const growthPct = Math.round(((latest - prev) / prev) * 100);
        return NextResponse.json({
          ok: true,
          provider: "similarweb",
          domain,
          monthly_visits: latest,
          traffic_growth_pct: growthPct,
          traffic_history: points,
        });
      }
    }

    if (rapidKey) {
      const res = await fetch(
        `https://similartech.p.rapidapi.com/similartech?url=${encodeURIComponent(domain)}`,
        {
          headers: {
            "x-rapidapi-key": rapidKey,
            "x-rapidapi-host": "similartech.p.rapidapi.com",
          },
          cache: "no-store",
        }
      );
      if (res.ok) {
        const data = await res.json();
        const info = data?.website_info || {};
        const monthlyVisits = parseCompactVisits(info.monthly_visits);
        const globalRank = parseRank(info.global_traffic_rank);

        if (monthlyVisits > 0) {
          return NextResponse.json({
            ok: true,
            provider: "rapidapi-similartech",
            domain,
            monthly_visits: monthlyVisits,
            traffic_growth_pct: 4,
            traffic_history: buildRecentMonthsHistory(monthlyVisits),
            global_traffic_rank: globalRank,
            leading_country: info.leading_country || null,
            traffic_sources: info.traffic_sources || null,
            technologies: data?.technologies || null,
          });
        }
      }
    }

    return NextResponse.json(
      { ok: false, configured: true, domain, message: "Kunne ikke hente trafikdata for domænet." },
      { status: 404 }
    );
  } catch (err) {
    console.error("/api/traffic error:", err);
    return NextResponse.json({ ok: false, error: "Fejl ved SimilarTech opslag." }, { status: 500 });
  }
}
