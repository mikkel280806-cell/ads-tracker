import { NextRequest, NextResponse } from "next/server";
import type { Ad } from "@/lib/types";
import { getSupabaseServerClient } from "@/lib/supabase";

/**
 * Serverless Video Ad Transcription API (Zero VM, Zero ffmpeg).
 *
 * Supported speech-to-text providers:
 *  1. GROQ_API_KEY     -> Groq Whisper API (`whisper-large-v3-turbo`, FREE tier, ~1-2s, Danish + English, accepts .mp4 directly!)
 *  2. DEEPGRAM_API_KEY -> Deepgram Nova-2 API ($200 free starter credit, accepts video URL directly!)
 *
 * Returns full spoken transcript + automatically extracted 0–3s Spoken Hook (`hook`),
 * and caches both in Supabase `adtrack_ads` so each video is only transcribed once.
 */

interface TranscribeRequest {
  ad?: Ad;
  adId?: string;
  videoUrl?: string;
  market?: string;
}

interface TranscriptSegment {
  start: number;
  end: number;
  text: string;
}

function extractSpokenHook(
  transcript: string,
  segments?: TranscriptSegment[]
): string {
  if (segments && segments.length > 0) {
    const firstThreeSec = segments
      .filter((s) => s.start < 3.5)
      .map((s) => s.text.trim())
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();
    if (firstThreeSec.length >= 8) return firstThreeSec;
  }
  const firstSentence = transcript
    .split(/(?<=[.!?])\s+|\n+/)[0]
    ?.trim();
  if (firstSentence && firstSentence.length >= 6) {
    return firstSentence.slice(0, 180);
  }
  return transcript.slice(0, 140).trim();
}

async function transcribeWithGroq(
  videoUrl: string,
  languageHint?: string
): Promise<{
  transcript: string;
  hook: string;
  segments: TranscriptSegment[];
  durationSec?: number;
}> {
  const apiKey = process.env.GROQ_API_KEY!;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 24_000);

  try {
    const mediaRes = await fetch(videoUrl, {
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
      },
    });
    if (!mediaRes.ok) {
      throw new Error(
        `Kunne ikke hente video fra Meta CDN (HTTP ${mediaRes.status}).`
      );
    }

    const contentLen = Number(mediaRes.headers.get("content-length") || 0);
    if (contentLen > 24_000_000) {
      throw new Error("Videoen er over 24 MB (Groq Whisper grænse).");
    }

    const buf = await mediaRes.arrayBuffer();
    if (buf.byteLength === 0) {
      throw new Error("Tom videofil fra Meta CDN.");
    }
    if (buf.byteLength > 24_000_000) {
      throw new Error("Videoen er over 24 MB (Groq Whisper grænse).");
    }

    const form = new FormData();
    form.append("file", new Blob([buf], { type: "video/mp4" }), "ad-video.mp4");
    form.append("model", "whisper-large-v3-turbo");
    form.append("response_format", "verbose_json");
    if (languageHint) {
      form.append("language", languageHint);
    }

    const whisperRes = await fetch(
      "https://api.groq.com/openai/v1/audio/transcriptions",
      {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}` },
        body: form,
        signal: controller.signal,
      }
    );

    if (!whisperRes.ok) {
      const detail = await whisperRes.text().catch(() => "");
      throw new Error(
        `Groq Whisper API fejl (${whisperRes.status}): ${detail.slice(0, 140)}`
      );
    }

    const json = (await whisperRes.json()) as {
      text?: string;
      duration?: number;
      segments?: Array<{ start?: number; end?: number; text?: string }>;
    };

    const transcript = (json.text || "").trim();
    const segments: TranscriptSegment[] = Array.isArray(json.segments)
      ? json.segments
          .filter((s) => typeof s.text === "string" && s.text.trim())
          .map((s) => ({
            start: Number(s.start || 0),
            end: Number(s.end || 0),
            text: (s.text || "").trim(),
          }))
      : [];

    if (!transcript) {
      throw new Error("Ingen tale fundet i denne video (kun musik eller tekst).");
    }

    return {
      transcript,
      hook: extractSpokenHook(transcript, segments),
      segments,
      durationSec: json.duration ? Math.round(json.duration) : undefined,
    };
  } finally {
    clearTimeout(timer);
  }
}

async function transcribeWithDeepgram(
  videoUrl: string,
  languageHint?: string
): Promise<{
  transcript: string;
  hook: string;
  segments: TranscriptSegment[];
  durationSec?: number;
}> {
  const apiKey = process.env.DEEPGRAM_API_KEY!;
  const params = new URLSearchParams({
    model: "nova-2",
    smart_format: "true",
    utterances: "true",
  });
  if (languageHint) {
    params.set("language", languageHint);
  } else {
    params.set("detect_language", "true");
  }

  const res = await fetch(
    `https://api.deepgram.com/v1/listen?${params.toString()}`,
    {
      method: "POST",
      headers: {
        Authorization: `Token ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ url: videoUrl }),
    }
  );

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(
      `Deepgram API fejl (${res.status}): ${detail.slice(0, 140)}`
    );
  }

  const json = (await res.json()) as {
    metadata?: { duration?: number };
    results?: {
      channels?: Array<{
        alternatives?: Array<{ transcript?: string }>;
      }>;
      utterances?: Array<{ start?: number; end?: number; transcript?: string }>;
    };
  };

  const transcript =
    json.results?.channels?.[0]?.alternatives?.[0]?.transcript?.trim() || "";
  const segments: TranscriptSegment[] = (json.results?.utterances || [])
    .filter((u) => u.transcript?.trim())
    .map((u) => ({
      start: Number(u.start || 0),
      end: Number(u.end || 0),
      text: (u.transcript || "").trim(),
    }));

  if (!transcript) {
    throw new Error("Ingen tale fundet i denne video (kun musik eller tekst).");
  }

  return {
    transcript,
    hook: extractSpokenHook(transcript, segments),
    segments,
    durationSec: json.metadata?.duration
      ? Math.round(json.metadata.duration)
      : undefined,
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as TranscribeRequest;
    const ad = body.ad;
    const videoUrl = (body.videoUrl || ad?.media_url || "").trim();

    if (!videoUrl || !/^https?:\/\//i.test(videoUrl)) {
      return NextResponse.json(
        { ok: false, message: "Ingen spilbar video-URL på denne annonce." },
        { status: 400 }
      );
    }

    const hasGroq = Boolean(process.env.GROQ_API_KEY);
    const hasDeepgram = Boolean(process.env.DEEPGRAM_API_KEY);

    if (!hasGroq && !hasDeepgram) {
      return NextResponse.json({
        ok: false,
        configured: false,
        message:
          "Tilføj en gratis GROQ_API_KEY (console.groq.com — Whisper v3 Turbo) eller DEEPGRAM_API_KEY i Vercel Environment Variables for 1-kliks video-transskription.",
      });
    }

    // Hint Danish for DK ads, auto-detect otherwise
    const market = body.market || ad?.market;
    const languageHint = market === "DK" ? "da" : undefined;

    const result = hasGroq
      ? await transcribeWithGroq(videoUrl, languageHint)
      : await transcribeWithDeepgram(videoUrl, languageHint);

    // Cache transcript + spoken hook directly in Supabase adtrack_ads
    const supabase = getSupabaseServerClient();
    const targetAdId = ad?.id || body.adId;
    if (supabase && targetAdId && ad) {
      const updatedAd: Ad = {
        ...ad,
        ai_transcript: result.transcript,
        ai_hook_verbal: result.hook || ad.ai_hook_verbal,
        duration_seconds: result.durationSec || ad.duration_seconds,
        status: "ready",
      };
      await supabase
        .from("adtrack_ads")
        .update({ payload: updatedAd })
        .eq("id", targetAdId);
    }

    return NextResponse.json({
      ok: true,
      provider: hasGroq ? "groq-whisper" : "deepgram-nova2",
      transcript: result.transcript,
      hook: result.hook,
      segments: result.segments,
      durationSec: result.durationSec,
    });
  } catch (err) {
    console.error("/api/transcribe error:", err);
    return NextResponse.json(
      {
        ok: false,
        message:
          err instanceof Error
            ? err.message
            : "Transskription fejlede uventet.",
      },
      { status: 500 }
    );
  }
}
