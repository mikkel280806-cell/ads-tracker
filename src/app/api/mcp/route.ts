import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase";
import { SEED_ADS, SEED_BRANDS } from "@/lib/seed-data";
import { generateCreativeProject } from "@/lib/snow-engine";
import type { Ad, Brand } from "@/lib/types";

const MCP_TOOLS = [
  {
    name: "search_swipe_ads",
    description:
      "Search Flake's curated Meta Ad Library swipe database by keyword, brand, or media format and sort by active runtime or EU reach.",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Brand, hook, or copy keyword" },
        mediaType: { type: "string", enum: ["video", "image", "carousel"] },
        limit: { type: "number", description: "Max ads to return (default 10)" },
      },
    },
  },
  {
    name: "list_tracked_shops",
    description:
      "List tracked DTC & e-commerce shops in Flake with monthly traffic, live ads count, AOV, and category.",
    inputSchema: {
      type: "object",
      properties: {
        market: { type: "string", enum: ["DK", "US", "EU", "ALL"] },
        limit: { type: "number" },
      },
    },
  },
  {
    name: "get_shop_funnels",
    description:
      "Return discovered Shopify sitemap landing pages, advertorials, listicles, and quizzes for a tracked brand.",
    inputSchema: {
      type: "object",
      required: ["brandQuery"],
      properties: {
        brandQuery: { type: "string" },
      },
    },
  },
  {
    name: "create_clone_brief",
    description:
      "Generate a ready-to-shoot video or static ad brief with 5 hooks and 4 chronological scenes from a brand angle.",
    inputSchema: {
      type: "object",
      required: ["brandName", "productTitle"],
      properties: {
        brandName: { type: "string" },
        productTitle: { type: "string" },
        stylePresetId: {
          type: "string",
          enum: [
            "iphone_ugc",
            "claymation_moa",
            "pixar_story",
            "mini_drama",
            "founder_authority",
            "cinema_macro",
          ],
        },
        angle: { type: "string" },
      },
    },
  },
];

export async function GET() {
  return NextResponse.json({
    ok: true,
    protocol: "Model Context Protocol (JSON-RPC 2.0)",
    server: {
      name: "flake-creative-mcp",
      version: "1.0.0",
    },
    endpoint: "/api/mcp",
    tools: MCP_TOOLS,
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      jsonrpc?: string;
      id?: string | number | null;
      method?: string;
      params?: Record<string, unknown>;
    };
    const rpcId = body.id ?? null;

    if (body.method === "initialize") {
      return NextResponse.json({
        jsonrpc: "2.0",
        id: rpcId,
        result: {
          protocolVersion: "2024-11-05",
          capabilities: { tools: {} },
          serverInfo: { name: "flake-creative-mcp", version: "1.0.0" },
        },
      });
    }

    if (body.method === "tools/list") {
      return NextResponse.json({
        jsonrpc: "2.0",
        id: rpcId,
        result: { tools: MCP_TOOLS },
      });
    }

    if (body.method === "tools/call") {
      const toolName = String(body.params?.name || "");
      const args = (body.params?.arguments || {}) as Record<string, unknown>;
      const supabase = getSupabaseServerClient();

      if (toolName === "search_swipe_ads") {
        const q = String(args.query || "").trim().toLowerCase();
        const limit = Math.min(25, Math.max(1, Number(args.limit) || 10));
        let ads: Ad[] = SEED_ADS;
        if (supabase) {
          let query = supabase
            .from("adtrack_ads")
            .select("payload")
            .neq("brand_id", "custom-media")
            .order("started_running_at", { ascending: false })
            .limit(200);
          if (args.mediaType) {
            query = query.eq("media_type", String(args.mediaType));
          }
          const { data } = await query;
          if (data && data.length > 0) {
            ads = data.map((r) => r.payload as Ad);
          }
        }
        const filtered = ads
          .filter((a) => {
            if (!q) return true;
            return `${a.brand_name} ${a.headline} ${a.primary_text} ${a.extracted_hook}`
              .toLowerCase()
              .includes(q);
          })
          .slice(0, limit)
          .map((a) => ({
            id: a.id,
            brand_name: a.brand_name,
            media_type: a.media_type,
            headline: a.headline,
            hook: a.extracted_hook,
            eu_reach: a.eu_reach,
            landing_page_url: a.landing_page_url,
          }));

        return NextResponse.json({
          jsonrpc: "2.0",
          id: rpcId,
          result: {
            content: [{ type: "text", text: JSON.stringify({ count: filtered.length, ads: filtered }, null, 2) }],
          },
        });
      }

      if (toolName === "list_tracked_shops") {
        const limit = Math.min(50, Math.max(1, Number(args.limit) || 15));
        let brands: Brand[] = SEED_BRANDS;
        if (supabase) {
          const { data } = await supabase
            .from("adtrack_brands")
            .select("payload")
            .order("active_ads_count", { ascending: false })
            .limit(150);
          if (data && data.length > 0) {
            brands = data
              .map((r) => r.payload as Brand)
              .filter((b) => b && b.id !== "custom-media");
          }
        }
        const out = brands.slice(0, limit).map((b) => ({
          id: b.id,
          name: b.name,
          website_url: b.website_url,
          category: b.category,
          monthly_visits: b.monthly_visits,
          active_ads_count: b.active_ads_count,
          estimated_aov: b.estimated_aov,
        }));
        return NextResponse.json({
          jsonrpc: "2.0",
          id: rpcId,
          result: {
            content: [{ type: "text", text: JSON.stringify({ count: out.length, shops: out }, null, 2) }],
          },
        });
      }

      if (toolName === "get_shop_funnels") {
        const q = String(args.brandQuery || "").toLowerCase();
        let brands: Brand[] = SEED_BRANDS;
        if (supabase) {
          const { data } = await supabase.from("adtrack_brands").select("payload").limit(200);
          if (data) brands = data.map((r) => r.payload as Brand);
        }
        const match = brands.find(
          (b) => b?.name?.toLowerCase().includes(q) || b?.website_url?.toLowerCase().includes(q)
        );
        return NextResponse.json({
          jsonrpc: "2.0",
          id: rpcId,
          result: {
            content: [
              {
                type: "text",
                text: JSON.stringify(
                  {
                    brand: match?.name || null,
                    funnels: match?.discovered_landing_pages?.slice(0, 30) || [],
                  },
                  null,
                  2
                ),
              },
            ],
          },
        });
      }

      if (toolName === "create_clone_brief") {
        const project = await generateCreativeProject({
          brandMemory: {
            brandName: String(args.brandName || "Brand"),
            domain: "brand.dk",
            websiteUrl: "https://brand.dk",
            category: "DTC",
            currency: "DKK",
            toneOfVoice: "Direkte & skandinavisk",
            targetAudience: "Moderne DTC-købere",
            primaryOffer: "Fri fragt & garanti",
            usps: ["Høj dokumenteret effekt", "Hurtig levering"],
            painPoints: ["Tidsspilde med standardløsninger"],
            desires: ["Mærkbar opgradering i hverdagen"],
            objections: ["Virker det for mig?"],
            customerReviews: [],
            products: [],
            brandColors: ["#0027eb", "#0F172A"],
            scrapedAt: new Date().toISOString(),
          },
          stylePresetId:
            (args.stylePresetId as "iphone_ugc" | "claymation_moa" | "pixar_story" | "mini_drama" | "founder_authority" | "cinema_macro") ||
            "iphone_ugc",
          productTitle: String(args.productTitle || "Produkt"),
          angle: args.angle ? String(args.angle) : undefined,
        });

        return NextResponse.json({
          jsonrpc: "2.0",
          id: rpcId,
          result: {
            content: [{ type: "text", text: JSON.stringify(project, null, 2) }],
          },
        });
      }

      return NextResponse.json({
        jsonrpc: "2.0",
        id: rpcId,
        error: { code: -32601, message: `Unknown tool: ${toolName}` },
      });
    }

    return NextResponse.json({
      jsonrpc: "2.0",
      id: rpcId,
      error: { code: -32601, message: `Unknown method: ${body.method}` },
    });
  } catch (err) {
    return NextResponse.json(
      {
        jsonrpc: "2.0",
        id: null,
        error: {
          code: -32000,
          message: err instanceof Error ? err.message : "MCP error",
        },
      },
      { status: 500 }
    );
  }
}
