#!/usr/bin/env node
/**
 * Adtrack `agy acp` Worker (runs on InstaBox.sh or local machine)
 *
 * Uses the official, unmodified `agy acp` binary (JSON-RPC 2.0 over stdio)
 * with your native `agy acp --login` Google AI Pro/Ultra Gemini subscription.
 *
 * Modes:
 *   1. Direct interactive JSON mode (recommended, called by /api/analyze):
 *        node analyze-ad.mjs --json <base64-encoded-payload>
 *   2. Supabase ID mode:
 *        node analyze-ad.mjs <ad_id>
 */

import { execFileSync, spawn } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ACP_BIN = process.env.AGY_ACP_BIN || "agy";
const ACP_ARGS = (process.env.AGY_ACP_ARGS || "acp")
  .split(" ")
  .filter(Boolean);

async function supabaseFetch(path, options = {}) {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) return null;
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
    return execFileSync(cmd, args, {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      timeout: 45_000,
    });
  } catch {
    return null;
  }
}

/**
 * Runs a single interactive human-triggered prompt through the official
 * unmodified `agy acp` binary over JSON-RPC 2.0 stdio.
 */
async function runAcpPrompt(promptText) {
  return new Promise((resolve, reject) => {
    const child = spawn(ACP_BIN, ACP_ARGS, { stdio: ["pipe", "pipe", "pipe"] });
    let stdoutBuf = "";
    let stderrBuf = "";
    let collectedText = "";
    let sessionId = null;
    let nextId = 1;
    let newSessionReq = null;
    let promptReq = null;

    const send = (method, params = {}) => {
      const id = nextId++;
      child.stdin.write(
        JSON.stringify({ jsonrpc: "2.0", id, method, params }) + "\n"
      );
      return id;
    };

    const initId = send("initialize", {
      protocolVersion: 1,
      clientInfo: { name: "adtrack-acp", version: "2.0.0" },
    });

    const timeout = setTimeout(() => {
      child.kill("SIGTERM");
      reject(new Error("agy acp timed out after 95s"));
    }, 95_000);

    child.stderr.on("data", (chunk) => {
      stderrBuf += chunk.toString("utf8");
    });

    child.stdout.on("data", (chunk) => {
      stdoutBuf += chunk.toString("utf8");
      const lines = stdoutBuf.split("\n");
      stdoutBuf = lines.pop() || "";

      for (const line of lines) {
        if (!line.trim()) continue;
        let msg;
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
          sessionId = msg.result.sessionId;
          promptReq = send("session/prompt", {
            sessionId,
            prompt: [{ type: "text", text: promptText }],
          });
        } else if (msg.method === "session/update") {
          const update = msg.params?.update;
          if (
            update?.sessionUpdate === "agent_message_chunk" &&
            update?.content?.text
          ) {
            collectedText += update.content.text;
          }
        } else if (msg.id === promptReq) {
          clearTimeout(timeout);
          child.kill("SIGTERM");
          if (msg.error) {
            reject(new Error(msg.error.message || "agy acp prompt failed"));
          } else {
            resolve(collectedText.trim());
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
      if (collectedText.trim()) {
        resolve(collectedText.trim());
      } else if (code !== 0) {
        reject(
          new Error(
            stderrBuf.trim() ||
              `agy acp exited with code ${code}. Run "agy acp --login" once on this machine.`
          )
        );
      }
    });
  });
}

async function loadInput() {
  if (process.argv[2] === "--json" && process.argv[3]) {
    const decoded = Buffer.from(process.argv[3], "base64").toString("utf8");
    return JSON.parse(decoded);
  }

  const adId = process.argv[2];
  if (!adId) {
    throw new Error("Usage: analyze-ad.mjs <ad_id> | --json <base64>");
  }

  const rows = await supabaseFetch(
    `adtrack_ads?id=eq.${encodeURIComponent(adId)}&select=payload`
  );
  const ad = rows?.[0]?.payload;
  if (!ad) throw new Error(`Ad ${adId} not found in adtrack_ads`);
  return { ad, question: "" };
}

async function main() {
  const { ad, question } = await loadInput();
  const workDir = mkdtempSync(join(tmpdir(), "adtrack-"));
  let transcript = ad.ai_transcript || "";

  try {
    // Extract audio + transcribe locally with ffmpeg + faster-whisper if video URL is accessible
    const videoUrl = ad.media_url;
    if (
      ad.media_type === "video" &&
      videoUrl &&
      /\.(mp4|webm|mov)(\?|$)/i.test(videoUrl) &&
      !transcript
    ) {
      const videoPath = join(workDir, "ad.mp4");
      const audioPath = join(workDir, "audio.wav");
      const mediaRes = await fetch(videoUrl).catch(() => null);
      if (mediaRes && mediaRes.ok) {
        writeFileSync(videoPath, Buffer.from(await mediaRes.arrayBuffer()));
        tryCommand("ffmpeg", [
          "-y",
          "-i",
          videoPath,
          "-vn",
          "-ac",
          "1",
          "-ar",
          "16000",
          audioPath,
        ]);
        if (existsSync(audioPath)) {
          const out = tryCommand("python3", [
            "-c",
            `from faster_whisper import WhisperModel; m = WhisperModel("small", compute_type="int8"); segs, _ = m.transcribe("${audioPath}"); print(" ".join(s.text.strip() for s in segs))`,
          ]);
          if (out?.trim()) transcript = out.trim();
        }
      }
    }

    // Mode A: Interactive follow-up question from user
    if (question && question.trim()) {
      const qPrompt = [
        "You are a concise, elite DTC performance creative strategist. Answer the user's question directly in clean, punchy bullet points (max 140 words, match the language of the question or ad).",
        "",
        `Brand: ${ad.brand_name || "Unknown"}`,
        `Format: ${ad.display_format || ad.media_type}`,
        `Headline: ${ad.headline || ""}`,
        `Opening Hook: ${ad.extracted_hook || ""}`,
        `Primary Copy: ${ad.primary_text || ""}`,
        `CTA: ${ad.cta_text || ""}`,
        `Landing Page: ${ad.landing_page_url || ""}`,
        transcript ? `Transcript: ${transcript}` : "",
        "",
        `User question: ${question.trim()}`,
      ]
        .filter(Boolean)
        .join("\n");

      const answer = await runAcpPrompt(qPrompt);
      const output = {
        mode: "answer",
        answer,
        ai_transcript: transcript || undefined,
      };
      console.log(
        `__ADTRACK_JSON_START__${JSON.stringify(output)}__ADTRACK_JSON_END__`
      );
      return;
    }

    // Mode B: Structured creative teardown
    const prompt = [
      "You are an elite e-commerce performance creative strategist. Analyze this Meta ad and reply ONLY with valid JSON (no markdown code fences) with these exact keys:",
      '{"ai_hook_verbal": string, "ai_hook_visual": string, "ai_angle": string, "ai_format": string, "ai_why_it_works": string[], "ai_script_breakdown": {"hook": string, "body": string, "social_proof": string, "cta": string}, "suggested_tags": string[]}',
      "Keep every string concise, specific, and immediately actionable (1-2 crisp sentences max; 3 bullet strings in ai_why_it_works).",
      "",
      `Brand: ${ad.brand_name || "Unknown"} (${ad.market || "US"})`,
      `Format: ${ad.display_format || ad.media_type}`,
      `Headline: ${ad.headline || ""}`,
      `Extracted Hook: ${ad.extracted_hook || ""}`,
      `Primary Copy: ${ad.primary_text || ""}`,
      `CTA: ${ad.cta_text || ""}`,
      `Landing Page: ${ad.landing_page_url || ""}`,
      transcript ? `Video Transcript: ${transcript}` : "",
    ]
      .filter(Boolean)
      .join("\n");

    const raw = await runAcpPrompt(prompt);
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("Could not parse JSON from agy acp response");
    }
    const parsed = JSON.parse(jsonMatch[0]);

    const analysis = {
      mode: "teardown",
      ai_transcript: transcript || ad.ai_transcript || undefined,
      ai_hook_verbal: parsed.ai_hook_verbal || ad.extracted_hook || "",
      ai_hook_visual: parsed.ai_hook_visual || "",
      ai_angle: parsed.ai_angle || ad.hook_category || "",
      ai_format: parsed.ai_format || ad.display_format || ad.media_type,
      ai_why_it_works: Array.isArray(parsed.ai_why_it_works)
        ? parsed.ai_why_it_works.slice(0, 4)
        : [],
      ai_script_breakdown: parsed.ai_script_breakdown || undefined,
      suggested_tags: Array.isArray(parsed.suggested_tags)
        ? parsed.suggested_tags.slice(0, 6)
        : [],
      ai_provider: "gemini-agy-acp",
      ai_analyzed_at: new Date().toISOString(),
    };

    // Persist back to Supabase adtrack_ads JSONB payload if configured
    if (ad.id && SUPABASE_URL && SUPABASE_SERVICE_KEY) {
      const updatedPayload = {
        ...ad,
        status: "ready",
        ...analysis,
      };
      await supabaseFetch(
        `adtrack_ads?id=eq.${encodeURIComponent(ad.id)}`,
        {
          method: "PATCH",
          body: JSON.stringify({ payload: updatedPayload }),
        }
      ).catch(() => {});
    }

    console.log(
      `__ADTRACK_JSON_START__${JSON.stringify(analysis)}__ADTRACK_JSON_END__`
    );
  } finally {
    rmSync(workDir, { recursive: true, force: true });
  }
}

main().catch((err) => {
  console.error(err?.message || String(err));
  process.exit(1);
});
