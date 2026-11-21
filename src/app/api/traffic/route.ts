import { NextRequest, NextResponse } from "next/server";

/**
 * Competitor Website Traffic Lookup (Trendtrack-style Shop Analytics)
 * Supports:
 *  - Official SimilarWeb API (`SIMILARWEB_API_KEY`)
 *  - Affordable RapidAPI SimilarWeb Traffic API (`RAPIDAPI_KEY`)
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
        `https://similarweb-traffic.p.rapidapi.com/traffic?domain=${encodeURIComponent(domain)}`,
        {
          headers: {
            "x-rapidapi-key": rapidKey,
            "x-rapidapi-host": "similarweb-traffic.p.rapidapi.com",
          },
          cache: "no-store",
        }
      );
      if (res.ok) {
        const data = await res.json();
        const monthlyObj = data?.EstimatedMonthlyVisits || {};
        const points = Object.entries(monthlyObj)
          .slice(-6)
          .map(([date, visits]) => ({
            label: String(date).slice(0, 7),
            visits: Math.round(Number(visits) || 0),
          }));
        const latest = points[points.length - 1]?.visits || 0;
        const prev = points[points.length - 2]?.visits || latest || 1;
        return NextResponse.json({
          ok: true,
          provider: "rapidapi-similarweb",
          domain,
          monthly_visits: latest,
          traffic_growth_pct: Math.round(((latest - prev) / prev) * 100),
          traffic_history: points,
        });
      }
    }

    return NextResponse.json(
      { ok: false, configured: true, domain, message: "Kunne ikke hente trafikdata for domænet." },
      { status: 502 }
    );
  } catch (err) {
    console.error("/api/traffic error:", err);
    return NextResponse.json({ ok: false, error: "Fejl ved SimilarWeb opslag." }, { status: 500 });
  }
}
