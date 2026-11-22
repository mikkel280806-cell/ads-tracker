import { NextRequest, NextResponse } from "next/server";
import { spawn } from "node:child_process";
import type { Ad } from "@/lib/types";
import { getSupabaseServerClient } from "@/lib/supabase";

/**
 * Interactive single-user Gemini analysis powered by the official `agy acp` binary.
 *
 * Execution order:
 *  1. InstaBox.sh VM (when INSTABOX_API_KEY + INSTABOX_MACHINE_ID are configured — works on Vercel & iPhone):
 *     - Wakes VM (`POST /v1/machines/{id}/wake`)
 *     - Runs `worker/analyze-ad.mjs --json <base64>` via `exec`, which invokes `agy acp` using your
 *       native `agy acp --login` Google AI Pro/Ultra subscription
 *     - Returns the structured Gemini teardown (or interactive answer) directly in the HTTP response
 *  2. Local `agy acp` fallback (when running Next.js locally with `agy` installed on PATH)
 */

interface AnalyzeRequest {
  ad?: Ad;
  adId?: string;
  question?: string;
  testWakeOnly?: boolean;
}

function buildTeardownPrompt(ad: Partial<Ad>): string {
  return [
    "You are an elite e-commerce performance creative strategist. Analyze this Meta ad and reply ONLY with valid JSON (no markdown fences) with these exact keys:",
    '{"ai_hook_verbal": string, "ai_hook_visual": string, "ai_angle": string, "ai_format": string, "ai_why_it_works": string[], "ai_script_breakdown": {"hook": string, "body": string, "social_proof": string, "cta": string}, "suggested_tags": string[]}',
    "Keep every field concise, concrete, and immediately usable (1-2 crisp sentences max; 3 concise strings in ai_why_it_works).",
    "",
    `Brand: ${ad.brand_name || "Unknown"} (${ad.market || "US"})`,
    `Format: ${ad.display_format || ad.media_type || "image"}`,
    `Headline: ${ad.headline || ""}`,
    `Extracted Hook: ${ad.extracted_hook || ""}`,
    `Primary Copy: ${ad.primary_text || ""}`,
    `CTA: ${ad.cta_text || ""}`,
    `Landing Page: ${ad.landing_page_url || ""}`,
    ad.ai_transcript ? `Transcript: ${ad.ai_transcript}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

function buildQuestionPrompt(ad: Partial<Ad>, question: string): string {
  return [
    "You are a concise, elite DTC performance creative strategist. Answer the user's question directly in clean, punchy bullet points (max 140 words).",
    "",
    `Brand: ${ad.brand_name || "Unknown"}`,
    `Format: ${ad.display_format || ad.media_type || "image"}`,
    `Headline: ${ad.headline || ""}`,
    `Opening Hook: ${ad.extracted_hook || ""}`,
    `Primary Copy: ${ad.primary_text || ""}`,
    `CTA: ${ad.cta_text || ""}`,
    `Landing Page: ${ad.landing_page_url || ""}`,
    ad.ai_transcript ? `Transcript: ${ad.ai_transcript}` : "",
    "",
    `User question: ${question.trim()}`,
  ]
    .filter(Boolean)
    .join("\n");
}

/**
 * Runs a single human-initiated prompt via local official `agy acp` stdio JSON-RPC 2.0.
 */
async function runLocalAgyAcp(promptText: string): Promise<string> {
  const bin = process.env.AGY_ACP_BIN || "agy";
  const args = (process.env.AGY_ACP_ARGS || "acp").split(" ").filter(Boolean);

  return new Promise((resolve, reject) => {
    const child = spawn(/*turbopackIgnore: true*/ bin, args, {
      stdio: ["pipe", "pipe", "pipe"],
    });
    let stdoutBuf = "";
    let stderrBuf = "";
    let collected = "";
    let nextId = 1;
    let newSessionReq: number | null = null;
    let promptReq: number | null = null;

    const send = (method: string, params: Record<string, unknown> = {}) => {
      const id = nextId++;
      child.stdin.write(
        JSON.stringify({ jsonrpc: "2.0", id, method, params }) + "\n"
      );
      return id;
    };

    const initId = send("initialize", {
      protocolVersion: 1,
      clientInfo: { name: "adtrack-web", version: "2.0.0" },
    });

    const timeout = setTimeout(() => {
      child.kill("SIGTERM");
      reject(new Error("agy acp timed out after 75s"));
    }, 75_000);

    child.stderr.on("data", (chunk: Buffer) => {
      stderrBuf += chunk.toString("utf8");
    });

    child.stdout.on("data", (chunk: Buffer) => {
      stdoutBuf += chunk.toString("utf8");
      const lines = stdoutBuf.split("\n");
      stdoutBuf = lines.pop() || "";

      for (const line of lines) {
        if (!line.trim()) continue;
        let msg: {
          id?: number;
          method?: string;
          result?: { sessionId?: string };
          params?: { update?: { sessionUpdate?: string; content?: { text?: string } } };
          error?: { message?: string };
        };
        try {
          msg = JSON.parse(line);
        } catch {
          continue;
        }

        if (msg.id === initId && msg.result) {
          newSessionReq = send("session/new", {
            cwd: process.cwd(),
            mcpServers: [],
          });
        } else if (msg.id === newSessionReq && msg.result?.sessionId) {
          promptReq = send("session/prompt", {
            sessionId: msg.result.sessionId,
            prompt: [{ type: "text", text: promptText }],
          });
        } else if (msg.method === "session/update") {
          const upd = msg.params?.update;
          if (upd?.sessionUpdate === "agent_message_chunk" && upd.content?.text) {
            collected += upd.content.text;
          }
        } else if (msg.id === promptReq) {
          clearTimeout(timeout);
          child.kill("SIGTERM");
          if (msg.error) {
            reject(new Error(msg.error.message || "agy acp prompt error"));
          } else {
            resolve(collected.trim());
          }
        } else if (msg.error) {
          clearTimeout(timeout);
          child.kill("SIGTERM");
          reject(new Error(msg.error.message || "agy acp error"));
        }
      }
    });

    child.on("error", (err) => {
      clearTimeout(timeout);
      reject(err);
    });

    child.on("close", (code) => {
      clearTimeout(timeout);
      if (collected.trim()) {
        resolve(collected.trim());
      } else if (code !== 0) {
        reject(
          new Error(
            stderrBuf.trim() ||
              `agy acp exited with code ${code}. Run "agy acp --login" once.`
          )
        );
      }
    });
  });
}

function extractMarkedJson(stdout: string): Record<string, unknown> | null {
  const m = stdout.match(
    /__ADTRACK_JSON_START__([\s\S]*?)__ADTRACK_JSON_END__/
  );
  if (m?.[1]) {
    try {
      return JSON.parse(m[1]);
    } catch {
      return null;
    }
  }
  const fallback = stdout.match(/\{[\s\S]*\}/);
  if (fallback?.[0]) {
    try {
      return JSON.parse(fallback[0]);
    } catch {
      return null;
    }
  }
  return null;
}

async function persistAnalysisToSupabase(
  ad: Ad,
  patch: Partial<Ad>
): Promise<void> {
  const supabase = getSupabaseServerClient();
  if (!supabase || !ad.id) return;
  try {
    const updated: Ad = { ...ad, ...patch, status: "ready" };
    await supabase
      .from("adtrack_ads")
      .update({ payload: updated })
      .eq("id", ad.id);
  } catch {
    // non-fatal
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as AnalyzeRequest;
    const apiKey = process.env.INSTABOX_API_KEY;
    const machineId = process.env.INSTABOX_MACHINE_ID;
    const workerCmd =
      process.env.INSTABOX_WORKER_CMD || "/data/advault-worker/analyze-ad.sh";

    // Optional InstaBox wake check
    if (body.testWakeOnly) {
      if (!apiKey || !machineId) {
        return NextResponse.json({
          ok: false,
          configured: false,
          provider: "none",
          message:
            "InstaBox er ikke forbundet endnu. Tilføj INSTABOX_API_KEY & INSTABOX_MACHINE_ID eller kør lokalt med agy acp.",
        });
      }
      const wakeRes = await fetch(
        `https://api.instabox.sh/v1/machines/${encodeURIComponent(machineId)}/wake`,
        {
          method: "POST",
          headers: { "X-API-Key": apiKey, "Content-Type": "application/json" },
        }
      );
      if (!wakeRes.ok) {
        return NextResponse.json(
          {
            ok: false,
            configured: true,
            provider: "instabox",
            message: `Kunne ikke vække InstaBox (${wakeRes.status}).`,
          },
          { status: 502 }
        );
      }
      const wakeData = await wakeRes.json().catch(() => ({}));
      return NextResponse.json({
        ok: true,
        configured: true,
        provider: "agy-acp-instabox",
        message: `InstaBox "${wakeData?.name || machineId}" er vågen og klar til agy acp.`,
      });
    }

    const ad = body.ad;
    const adId = ad?.id || body.adId;
    const question = body.question?.trim() || "";

    if (!ad && !adId) {
      return NextResponse.json(
        { ok: false, message: "Mangler annonce-data til analyse." },
        { status: 400 }
      );
    }

    // -------------------------------------------------------------------------
    // PATH 1: InstaBox.sh Cloud VM running official `agy acp` (works on Vercel & iPhone)
    // -------------------------------------------------------------------------
    if (apiKey && machineId && process.env.PREFER_LOCAL_ACP !== "true") {
      const headers = {
        "X-API-Key": apiKey,
        "Content-Type": "application/json",
      };

      const wakeRes = await fetch(
        `https://api.instabox.sh/v1/machines/${encodeURIComponent(machineId)}/wake`,
        { method: "POST", headers }
      );

      if (!wakeRes.ok) {
        const detail = await wakeRes.text().catch(() => "");
        return NextResponse.json(
          {
            ok: false,
            configured: true,
            provider: "agy-acp-instabox",
            message: `Kunne ikke vække InstaBox (${wakeRes.status}). ${detail.slice(0, 140)}`,
          },
          { status: 502 }
        );
      }

      // Pass compact ad payload + optional user question as base64 so worker doesn't depend on legacy table names
      const compactPayload = ad
        ? {
            ad: {
              id: ad.id,
              brand_name: ad.brand_name,
              market: ad.market,
              media_type: ad.media_type,
              display_format: ad.display_format,
              media_url: ad.media_url,
              headline: ad.headline,
              extracted_hook: ad.extracted_hook,
              hook_category: ad.hook_category,
              primary_text: (ad.primary_text || "").slice(0, 1800),
              cta_text: ad.cta_text,
              landing_page_url: ad.landing_page_url,
              ai_transcript: ad.ai_transcript,
            },
            question,
          }
        : null;

      const workerScriptMjs = workerCmd.endsWith(".sh")
        ? workerCmd.replace(/\.sh$/, ".mjs")
        : workerCmd;

      const argv = compactPayload
        ? [
            "node",
            workerScriptMjs,
            "--json",
            Buffer.from(JSON.stringify(compactPayload), "utf8").toString(
              "base64"
            ),
          ]
        : [workerCmd, adId!];

      const execRes = await fetch(
        `https://api.instabox.sh/v1/machines/${encodeURIComponent(machineId)}/exec`,
        {
          method: "POST",
          headers,
          body: JSON.stringify({ argv }),
        }
      );

      if (!execRes.ok) {
        const detail = await execRes.text().catch(() => "");
        return NextResponse.json(
          {
            ok: false,
            configured: true,
            provider: "agy-acp-instabox",
            message: `agy acp på InstaBox svarede med fejl (${execRes.status}). Sikr at worker/analyze-ad.mjs er opdateret og logget ind med "agy acp --login". ${detail.slice(0, 120)}`,
          },
          { status: 502 }
        );
      }

      const execData = (await execRes.json().catch(() => ({}))) as {
        stdout?: string;
        stderr?: string;
        output?: string;
        exitCode?: number;
        exit_code?: number;
      };

      const stdout = execData.stdout || execData.output || "";
      const stderr = execData.stderr || "";
      const exitCode = execData.exitCode ?? execData.exit_code ?? 0;

      const parsed = extractMarkedJson(stdout);
      if (parsed) {
        if (parsed.mode === "answer" && typeof parsed.answer === "string") {
          return NextResponse.json({
            ok: true,
            configured: true,
            provider: "agy-acp-instabox",
            mode: "answer",
            answer: parsed.answer,
          });
        }

        if (ad) {
          await persistAnalysisToSupabase(ad, parsed as Partial<Ad>);
        }

        return NextResponse.json({
          ok: true,
          configured: true,
          provider: "agy-acp-instabox",
          mode: "teardown",
          analysis: parsed,
        });
      }

      if (exitCode !== 0) {
        return NextResponse.json(
          {
            ok: false,
            configured: true,
            provider: "agy-acp-instabox",
            message:
              stderr.trim().slice(0, 220) ||
              `agy acp fejlede (exit ${exitCode}). Kør "agy acp --login" på din InstaBox og prøv igen.`,
          },
          { status: 502 }
        );
      }

      return NextResponse.json({
        ok: true,
        configured: true,
        provider: "agy-acp-instabox",
        mode: "queued",
        message:
          "InstaBox er vækket og analyserer annoncen med dit Gemini-abonnement (agy acp).",
      });
    }

    // -------------------------------------------------------------------------
    // PATH 2: Local official `agy acp` binary (works when running locally)
    // -------------------------------------------------------------------------
    if (ad) {
      try {
        const prompt = question
          ? buildQuestionPrompt(ad, question)
          : buildTeardownPrompt(ad);
        const raw = await runLocalAgyAcp(prompt);

        if (question) {
          return NextResponse.json({
            ok: true,
            configured: true,
            provider: "agy-acp-local",
            mode: "answer",
            answer: raw,
          });
        }

        const parsed = extractMarkedJson(raw);
        if (!parsed) {
          return NextResponse.json({
            ok: true,
            configured: true,
            provider: "agy-acp-local",
            mode: "answer",
            answer: raw,
          });
        }

        const analysis: Partial<Ad> = {
          ai_hook_verbal:
            (parsed.ai_hook_verbal as string) || ad.extracted_hook || "",
          ai_hook_visual: (parsed.ai_hook_visual as string) || "",
          ai_angle: (parsed.ai_angle as string) || ad.hook_category || "",
          ai_format:
            (parsed.ai_format as string) || ad.display_format || ad.media_type,
          ai_why_it_works: Array.isArray(parsed.ai_why_it_works)
            ? (parsed.ai_why_it_works as string[]).slice(0, 4)
            : [],
          ai_script_breakdown:
            parsed.ai_script_breakdown as Ad["ai_script_breakdown"],
          ai_provider: "gemini-agy-acp",
          ai_analyzed_at: new Date().toISOString(),
        };

        await persistAnalysisToSupabase(ad, analysis);

        return NextResponse.json({
          ok: true,
          configured: true,
          provider: "agy-acp-local",
          mode: "teardown",
          analysis,
        });
      } catch (localErr) {
        const msg =
          localErr instanceof Error ? localErr.message : String(localErr);
        const notInstalled = /ENOENT|not found/i.test(msg);
        return NextResponse.json({
          ok: false,
          configured: false,
          provider: "none",
          message: notInstalled
            ? "Tilslut InstaBox (INSTABOX_API_KEY + INSTABOX_MACHINE_ID) i Vercel, eller installér & log ind med 'agy acp --login' lokalt for at køre direkte på dit Gemini-abonnement."
            : `agy acp fejl: ${msg}`,
        });
      }
    }

    return NextResponse.json({
      ok: false,
      configured: false,
      provider: "none",
      message: "Konfigurér InstaBox eller kør lokalt med agy acp --login.",
    });
  } catch (err) {
    console.error("/api/analyze error:", err);
    return NextResponse.json(
      { ok: false, message: "Uventet fejl ved Gemini agy acp-analyse." },
      { status: 500 }
    );
  }
}
