import { NextRequest, NextResponse } from "next/server";

/**
 * Triggers on-demand AI & video analysis via InstaBox.sh auto-wake:
 *   1. POST https://api.instabox.sh/v1/machines/{id}/wake (wakes paused VM in < 1s)
 *   2. POST https://api.instabox.sh/v1/machines/{id}/exec (runs worker/analyze-ad.sh <adId>)
 *
 * If InstaBox is not configured yet, returns a clear status so the UI can offer
 * 1-click "Kopiér til Gemini" or cloud API fallback.
 */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { adId?: string; testWakeOnly?: boolean };
    const apiKey = process.env.INSTABOX_API_KEY;
    const machineId = process.env.INSTABOX_MACHINE_ID;
    const workerCmd =
      process.env.INSTABOX_WORKER_CMD || "/home/user/advault-worker/analyze-ad.sh";

    if (!apiKey || !machineId) {
      return NextResponse.json({
        ok: false,
        configured: false,
        provider: "none",
        message:
          "InstaBox.sh er endnu ikke forbundet. Tilføj INSTABOX_API_KEY og INSTABOX_MACHINE_ID i Vercel/.env — eller brug 'Kopiér til Gemini' imens.",
      });
    }

    const headers = {
      "X-API-Key": apiKey,
      "Content-Type": "application/json",
    };

    // Step 1: Wake idle-paused InstaBox VM (resumes RAM + disk in < 1s)
    const wakeRes = await fetch(
      `https://api.instabox.sh/v1/machines/${encodeURIComponent(machineId)}/wake`,
      { method: "POST", headers }
    );

    if (!wakeRes.ok) {
      const detail = await wakeRes.text();
      return NextResponse.json(
        {
          ok: false,
          configured: true,
          provider: "instabox",
          message: `Kunne ikke vække InstaBox (${wakeRes.status}): ${detail}`,
        },
        { status: 502 }
      );
    }

    if (body.testWakeOnly) {
      return NextResponse.json({
        ok: true,
        configured: true,
        provider: "instabox",
        message: "InstaBox.sh er vågen og klar!",
      });
    }

    if (!body.adId) {
      return NextResponse.json(
        { ok: false, error: "Mangler adId" },
        { status: 400 }
      );
    }

    // Step 2: Execute worker script inside the awake InstaBox VM
    const execRes = await fetch(
      `https://api.instabox.sh/v1/machines/${encodeURIComponent(machineId)}/exec`,
      {
        method: "POST",
        headers,
        body: JSON.stringify({
          command: [workerCmd, body.adId],
          background: true,
        }),
      }
    );

    if (!execRes.ok) {
      const detail = await execRes.text();
      return NextResponse.json(
        {
          ok: false,
          configured: true,
          provider: "instabox",
          message: `InstaBox vågnede, men worker-kald fejlede (${execRes.status}): ${detail}`,
        },
        { status: 502 }
      );
    }

    return NextResponse.json({
      ok: true,
      configured: true,
      provider: "instabox",
      message: "InstaBox.sh er vækket og analyserer annoncen (ffmpeg + Whisper + agy acp).",
    });
  } catch (err) {
    console.error("/api/analyze error:", err);
    return NextResponse.json(
      { ok: false, message: "Uventet fejl ved opkald til analyse-worker." },
      { status: 500 }
    );
  }
}
