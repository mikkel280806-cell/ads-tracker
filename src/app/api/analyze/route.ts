import { NextRequest, NextResponse } from "next/server";
import type { Ad } from "@/lib/types";
import { getSupabaseServerClient } from "@/lib/supabase";

/**
 * Pure Serverless AI Ad Analysis API (Trendtrack-style, 100% Vercel-native — no VM needed).
 *
 * Supported API providers (in priority order):
 *  1. GEMINI_API_KEY  -> Google Gemini 2.5 Flash (multimodal: sees ad creative + reads copy/transcript)
 *  2. OPENAI_API_KEY  -> OpenAI gpt-4o-mini (multimodal vision + copy)
 *  3. GROQ_API_KEY    -> Groq Llama 3.3 70B (+ automatic Whisper large-v3-turbo video transcription!)
 */

interface AnalyzeRequest {
  ad?: Ad;
  question?: string;
}

function buildTeardownPrompt(ad: Partial<Ad>, transcript?: string): string {
  return [
    "You are an elite DTC e-commerce performance creative strategist. Analyze this Meta ad (including the attached creative visual if provided) and reply ONLY with valid JSON (no markdown fences) matching this exact schema:",
    '{"ai_hook_verbal": string, "ai_hook_visual": string, "ai_angle": string, "ai_format": string, "ai_why_it_works": string[], "ai_script_breakdown": {"hook": string, "body": string, "social_proof": string, "cta": string}, "suggested_tags": string[]}',
    "Keep every field concrete, specific, and concise (1-2 crisp sentences max; 3 concise bullet strings in ai_why_it_works). Write in the language of the ad (Danish for DK ads, English for US/EU ads).",
    "",
    `Brand: ${ad.brand_name || "Unknown"} (${ad.market || "US"})`,
    `Format: ${ad.display_format || ad.media_type || "image"}`,
    `Headline: ${ad.headline || ""}`,
    `Extracted Hook: ${ad.extracted_hook || ""}`,
    `Primary Copy: ${(ad.primary_text || "").slice(0, 2200)}`,
    `CTA: ${ad.cta_text || ""}`,
    `Landing Page: ${ad.landing_page_url || ""}`,
    transcript ? `Video Transcript: ${transcript.slice(0, 2500)}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

function buildQuestionPrompt(
  ad: Partial<Ad>,
  question: string,
  transcript?: string
): string {
  return [
    "You are a concise, elite DTC performance creative strategist. Answer the user's question directly in clean, punchy bullet points (max 150 words, match the language of the user's question).",
    "",
    `Brand: ${ad.brand_name || "Unknown"} (${ad.market || "US"})`,
    `Format: ${ad.display_format || ad.media_type || "image"}`,
    `Headline: ${ad.headline || ""}`,
    `Opening Hook: ${ad.extracted_hook || ""}`,
    `Primary Copy: ${(ad.primary_text || "").slice(0, 2200)}`,
    `CTA: ${ad.cta_text || ""}`,
    `Landing Page: ${ad.landing_page_url || ""}`,
    transcript ? `Video Transcript: ${transcript.slice(0, 2500)}` : "",
    "",
    `User question: ${question.trim()}`,
  ]
    .filter(Boolean)
    .join("\n");
}

async function fetchImageAsBase64(
  url?: string
): Promise<{ mimeType: string; data: string } | null> {
  if (!url || !url.startsWith("http")) return null;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5000);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) return null;
    const ct = res.headers.get("content-type") || "image/jpeg";
    if (!ct.startsWith("image/")) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.byteLength === 0 || buf.byteLength > 4_000_000) return null;
    return {
      mimeType: ct.split(";")[0],
      data: buf.toString("base64"),
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Optional serverless video transcription via Groq Whisper API (whisper-large-v3-turbo).
 */
async function transcribeVideoWithGroq(
  videoUrl?: string
): Promise<string | null> {
  const groqKey = process.env.GROQ_API_KEY;
  if (!groqKey || !videoUrl || !/\.(mp4|webm|mov)(\?|$)/i.test(videoUrl)) {
    return null;
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 14_000);
  try {
    const mediaRes = await fetch(videoUrl, { signal: controller.signal });
    if (!mediaRes.ok) return null;
    const contentLen = Number(mediaRes.headers.get("content-length") || 0);
    if (contentLen > 22_000_000) return null;

    const arrayBuf = await mediaRes.arrayBuffer();
    if (arrayBuf.byteLength === 0 || arrayBuf.byteLength > 22_000_000) {
      return null;
    }

    const form = new FormData();
    form.append(
      "file",
      new Blob([arrayBuf], { type: "video/mp4" }),
      "ad-creative.mp4"
    );
    form.append("model", "whisper-large-v3-turbo");
    form.append("response_format", "json");

    const whisperRes = await fetch(
      "https://api.groq.com/openai/v1/audio/transcriptions",
      {
        method: "POST",
        headers: { Authorization: `Bearer ${groqKey}` },
        body: form,
        signal: controller.signal,
      }
    );
    if (!whisperRes.ok) return null;
    const data = (await whisperRes.json()) as { text?: string };
    return data.text?.trim() || null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function callGeminiApi(
  prompt: string,
  image: { mimeType: string; data: string } | null,
  expectJson: boolean
): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY!;
  const models = [
    process.env.GEMINI_MODEL || "gemini-2.5-flash",
    "gemini-2.0-flash",
  ];

  const parts: Array<Record<string, unknown>> = [{ text: prompt }];
  if (image) {
    parts.push({
      inline_data: {
        mime_type: image.mimeType,
        data: image.data,
      },
    });
  }

  let lastErr = "Gemini API request failed";
  for (const model of models) {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
        model
      )}:generateContent?key=${encodeURIComponent(apiKey)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts }],
          generationConfig: {
            temperature: 0.35,
            ...(expectJson ? { responseMimeType: "application/json" } : {}),
          },
        }),
      }
    );

    if (res.ok) {
      const json = (await res.json()) as {
        candidates?: Array<{
          content?: { parts?: Array<{ text?: string }> };
        }>;
      };
      const text =
        json.candidates?.[0]?.content?.parts
          ?.map((p) => p.text || "")
          .join("")
          .trim() || "";
      if (text) return text;
    } else {
      const errText = await res.text().catch(() => "");
      lastErr = `Gemini (${model}) HTTP ${res.status}: ${errText.slice(0, 160)}`;
      if (res.status === 401 || res.status === 403) break;
    }
  }

  throw new Error(lastErr);
}

async function callOpenAiApi(
  prompt: string,
  imageUrl?: string,
  expectJson?: boolean
): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY!;
  const content: Array<Record<string, unknown>> = [
    { type: "text", text: prompt },
  ];
  if (imageUrl && imageUrl.startsWith("http")) {
    content.push({ type: "image_url", image_url: { url: imageUrl } });
  }

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      temperature: 0.35,
      ...(expectJson ? { response_format: { type: "json_object" } } : {}),
      messages: [{ role: "user", content }],
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`OpenAI HTTP ${res.status}: ${errText.slice(0, 160)}`);
  }

  const json = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  return json.choices?.[0]?.message?.content?.trim() || "";
}

async function callGroqLlmApi(
  prompt: string,
  expectJson?: boolean
): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY!;
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      temperature: 0.35,
      ...(expectJson ? { response_format: { type: "json_object" } } : {}),
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`Groq HTTP ${res.status}: ${errText.slice(0, 160)}`);
  }

  const json = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  return json.choices?.[0]?.message?.content?.trim() || "";
}

function parseJsonObject(raw: string): Record<string, unknown> | null {
  try {
    return JSON.parse(raw);
  } catch {
    const m = raw.match(/\{[\s\S]*\}/);
    if (!m?.[0]) return null;
    try {
      return JSON.parse(m[0]);
    } catch {
      return null;
    }
  }
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
    const ad = body.ad;
    const question = body.question?.trim() || "";

    if (!ad) {
      return NextResponse.json(
        { ok: false, message: "Mangler annonce-data til analyse." },
        { status: 400 }
      );
    }

    const hasGemini = Boolean(process.env.GEMINI_API_KEY);
    const hasOpenAi = Boolean(process.env.OPENAI_API_KEY);
    const hasGroq = Boolean(process.env.GROQ_API_KEY);

    if (!hasGemini && !hasOpenAi && !hasGroq) {
      return NextResponse.json({
        ok: false,
        configured: false,
        provider: "none",
        message:
          "Tilføj GEMINI_API_KEY (gratis via Google AI Studio), OPENAI_API_KEY eller GROQ_API_KEY i Vercel Environment Variables.",
      });
    }

    const imageUrl = ad.thumbnail_url || ad.fallback_image_url || "";

    // Run optional Groq Whisper transcription + creative image download in parallel
    const [transcript, imageData] = await Promise.all([
      ad.ai_transcript
        ? Promise.resolve(ad.ai_transcript)
        : ad.media_type === "video"
          ? transcribeVideoWithGroq(ad.media_url)
          : Promise.resolve(null),
      hasGemini ? fetchImageAsBase64(imageUrl) : Promise.resolve(null),
    ]);

    const expectJson = !question;
    const prompt = question
      ? buildQuestionPrompt(ad, question, transcript || undefined)
      : buildTeardownPrompt(ad, transcript || undefined);

    let raw = "";
    let provider = "gemini-api";

    if (hasGemini) {
      raw = await callGeminiApi(prompt, imageData, expectJson);
      provider = "gemini-api";
    } else if (hasOpenAi) {
      raw = await callOpenAiApi(prompt, imageUrl, expectJson);
      provider = "openai-api";
    } else {
      raw = await callGroqLlmApi(prompt, expectJson);
      provider = "groq-api";
    }

    if (question) {
      return NextResponse.json({
        ok: true,
        configured: true,
        provider,
        mode: "answer",
        answer: raw,
      });
    }

    const parsed = parseJsonObject(raw);
    if (!parsed) {
      return NextResponse.json({
        ok: true,
        configured: true,
        provider,
        mode: "answer",
        answer: raw,
      });
    }

    const analysis: Partial<Ad> = {
      ai_transcript: transcript || ad.ai_transcript || undefined,
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
      ai_provider: provider,
      ai_analyzed_at: new Date().toISOString(),
    };

    await persistAnalysisToSupabase(ad, analysis);

    return NextResponse.json({
      ok: true,
      configured: true,
      provider,
      mode: "teardown",
      analysis,
    });
  } catch (err) {
    console.error("/api/analyze error:", err);
    return NextResponse.json(
      {
        ok: false,
        message:
          err instanceof Error
            ? err.message
            : "Uventet fejl ved AI-analyse.",
      },
      { status: 500 }
    );
  }
}
