#!/usr/bin/env node
/**
 * AdVault InstaBox.sh Worker
 *
 * Woken on-demand via InstaBox API (`POST /v1/machines/{id}/wake` + `exec`).
 * Steps:
 *  1. Load ad record from Supabase REST API
 *  2. Download media locally and extract audio + keyframes via ffmpeg (if video)
 *  3. Transcribe audio via local `faster-whisper` (if installed) or Groq Whisper
 *  4. Analyze transcript + keyframes + ad copy via official `agy acp` (JSON-RPC stdio)
 *     using your logged-in Antigravity session on the InstaBox persistent disk
 *  5. PATCH the enriched fields back to Supabase (`status = 'ready'`)
 */

import { execFileSync, spawn } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const AD_ID = process.argv[2];
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ACP_BIN = process.env.AGY_ACP_BIN || "agy";
const ACP_ARGS = (process.env.AGY_ACP_ARGS || "acp").split(" ").filter(Boolean);

if (!AD_ID || !SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error("Missing AD_ID, SUPABASE_URL, or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

async function supabaseFetch(path, options = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...options,
    headers: {
      apikey: SUPABASE_SERVICE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });
  if (!res.ok) {
    throw new Error(`Supabase error ${res.status}: ${await res.text()}`);
  }
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

function tryCommand(cmd, args) {
  try {
    return execFileSync(cmd, args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  } catch {
    return null;
  }
}

/**
 * Sends a single prompt over JSON-RPC 2.0 stdio to the official `agy acp` binary.
 */
async function runAcpAnalysis(promptText) {
  return new Promise((resolve, reject) => {
    const child = spawn(ACP_BIN, ACP_ARGS, { stdio: ["pipe", "pipe", "pipe"] });
    let buffer = "";
    let collectedText = "";
    let sessionId = null;
    let nextId = 1;

    const send = (method, params = {}) => {
      const id = nextId++;
      child.stdin.write(JSON.stringify({ jsonrpc: "2.0", id, method, params }) + "\n");
      return id;
    };

    const initId = send("initialize", {
      protocolVersion: 1,
      clientInfo: { name: "advault-worker", version: "1.0.0" },
    });

    let newSessionIdReq = null;
    let promptReq = null;

    const timeout = setTimeout(() => {
      child.kill("SIGTERM");
      reject(new Error("ACP analysis timed out after 120s"));
    }, 120_000);

    child.stdout.on("data", (chunk) => {
      buffer += chunk.toString("utf8");
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (!line.trim()) continue;
        let msg;
        try {
          msg = JSON.parse(line);
        } catch {
          continue;
        }

        if (msg.id === initId && msg.result) {
          newSessionIdReq = send("session/new", { cwd: process.cwd(), mcpServers: [] });
        } else if (msg.id === newSessionIdReq && msg.result?.sessionId) {
          sessionId = msg.result.sessionId;
          promptReq = send("session/prompt", {
            sessionId,
            prompt: [{ type: "text", text: promptText }],
          });
        } else if (msg.method === "session/update") {
          const update = msg.params?.update;
          if (update?.sessionUpdate === "agent_message_chunk" && update?.content?.text) {
            collectedText += update.content.text;
          }
        } else if (msg.id === promptReq) {
          clearTimeout(timeout);
          child.kill("SIGTERM");
          resolve(collectedText);
        } else if (msg.error) {
          clearTimeout(timeout);
          child.kill("SIGTERM");
          reject(new Error(msg.error.message || "ACP error"));
        }
      }
    });

    child.on("error", (err) => {
      clearTimeout(timeout);
      reject(err);
    });
  });
}

async function main() {
  const rows = await supabaseFetch(`ads?id=eq.${encodeURIComponent(AD_ID)}&select=*,brands(*)`);
  const ad = rows?.[0];
  if (!ad) throw new Error(`Ad ${AD_ID} not found`);

  const workDir = mkdtempSync(join(tmpdir(), "advault-"));
  let transcript = ad.ai_transcript || "";

  try {
    // 1. Download video & run local ffmpeg + whisper if available
    if (ad.media_type === "video" && ad.media_storage_url) {
      const videoPath = join(workDir, "ad.mp4");
      const audioPath = join(workDir, "audio.wav");
      const mediaRes = await fetch(ad.media_storage_url);
      if (mediaRes.ok) {
        writeFileSync(videoPath, Buffer.from(await mediaRes.arrayBuffer()));
        tryCommand("ffmpeg", ["-y", "-i", videoPath, "-vn", "-ac", "1", "-ar", "16000", audioPath]);
        if (existsSync(audioPath) && !transcript) {
          const out = tryCommand("python3", [
            "-c",
            `from faster_whisper import WhisperModel; m = WhisperModel("small", compute_type="int8"); segs, _ = m.transcribe("${audioPath}"); print(" ".join(s.text.strip() for s in segs))`,
          ]);
          if (out?.trim()) transcript = out.trim();
        }
      }
    }

    // 2. Ask official `agy acp` to structure hooks, angle, format & script breakdown
    const prompt = [
      "Du er en skarp e-commerce performance creative strategist. Analyser denne annonce og svar KUN med valid JSON (ingen markdown-kodeblokke) med felterne:",
      '{"ai_hook_verbal": string, "ai_hook_visual": string, "ai_angle": string, "ai_format": string, "ai_script_breakdown": {"hook": string, "body": string, "social_proof": string, "cta": string}, "suggested_tags": string[]}',
      "",
      `Brand: ${ad.brands?.name || "Ukendt"}`,
      `Format: ${ad.media_type}`,
      `Headline: ${ad.headline || ""}`,
      `Primary text: ${ad.primary_text || ""}`,
      `CTA: ${ad.cta_text || ""}`,
      `Transcript: ${transcript || "(ingen transskription tilgængelig)"}`,
    ].join("\n");

    const raw = await runAcpAnalysis(prompt);
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("Could not parse JSON from ACP response");
    const parsed = JSON.parse(jsonMatch[0]);

    await supabaseFetch(`ads?id=eq.${encodeURIComponent(AD_ID)}`, {
      method: "PATCH",
      body: JSON.stringify({
        status: "ready",
        ai_transcript: transcript || ad.ai_transcript,
        ai_hook_verbal: parsed.ai_hook_verbal || ad.ai_hook_verbal,
        ai_hook_visual: parsed.ai_hook_visual || ad.ai_hook_visual,
        ai_angle: parsed.ai_angle || ad.ai_angle,
        ai_format: parsed.ai_format || ad.ai_format,
        ai_script_breakdown: parsed.ai_script_breakdown || ad.ai_script_breakdown,
        ai_analysis_json: parsed,
      }),
    });

    console.log(`Ad ${AD_ID} analyzed and updated successfully.`);
  } catch (err) {
    console.error("Worker failed:", err);
    await supabaseFetch(`ads?id=eq.${encodeURIComponent(AD_ID)}`, {
      method: "PATCH",
      body: JSON.stringify({ status: "failed" }),
    }).catch(() => {});
    process.exit(1);
  } finally {
    rmSync(workDir, { recursive: true, force: true });
  }
}

main();
