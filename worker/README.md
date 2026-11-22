# Adtrack `agy acp` Worker (InstaBox.sh)

Runs the official, unmodified `agy acp` binary on your **InstaBox.sh** VM (using your native `agy acp --login` Google AI Pro/Ultra subscription) when you click **"Analysér med Gemini"** or ask a question inside View Ad.

## One-time setup on InstaBox

```bash
# 1. Copy worker files (or git pull the repo)
mkdir -p /data/advault-worker
cp worker/analyze-ad.sh worker/analyze-ad.mjs /data/advault-worker/
chmod +x /data/advault-worker/analyze-ad.sh /data/advault-worker/analyze-ad.mjs

# 2. Optional: install ffmpeg + faster-whisper for video audio transcription
sudo apt-get update && sudo apt-get install -y ffmpeg python3-pip
pip install --break-system-packages faster-whisper

# 3. Sign in once with your Google AI subscription (persisted on InstaBox disk)
agy acp --login
```

## How it works
1. Clicking **"Analysér med Gemini"** or submitting a question in **View Ad** calls `POST /api/analyze`.
2. Vercel wakes your InstaBox VM (`POST /v1/machines/{id}/wake`) and executes `node analyze-ad.mjs --json <base64>`.
3. `analyze-ad.mjs` spawns the official `agy acp` binary over JSON-RPC 2.0 stdio, returns the structured breakdown (or interactive answer) live to the modal, and saves it into `adtrack_ads` in Supabase.
4. When running `npm run dev` locally with `agy` on your `PATH`, `/api/analyze` also supports calling local `agy acp` directly.
