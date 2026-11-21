#!/usr/bin/env bash
# =============================================================================
# AdVault InstaBox.sh On-Demand Worker
# Runs inside your InstaBox.sh VM when woken by Vercel (/api/analyze).
# Pipeline:
#   1. Fetches the ad row + media URL from Supabase
#   2. Extracts audio + keyframes via ffmpeg
#   3. Transcribes audio locally with faster-whisper (free)
#   4. Calls official `agy acp` (or Gemini/Groq fallback) for hooks, angle & script
#   5. Writes structured AI analysis back to Supabase `ads` table
# =============================================================================

set -euo pipefail

AD_ID="${1:-}"
if [ -z "$AD_ID" ]; then
  echo "Usage: analyze-ad.sh <ad_id>" >&2
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
exec node "$SCRIPT_DIR/analyze-ad.mjs" "$AD_ID"
