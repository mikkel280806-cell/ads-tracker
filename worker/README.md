# AdVault InstaBox.sh On-Demand Worker

Denne mappe kører inde i din **InstaBox.sh** Linux VM og vækkes automatisk af Vercel (`/api/analyze`) med din `INSTABOX_API_KEY`, når du importerer eller analyserer en ny ad.

## Engangsopsætning på din InstaBox

```bash
# 1. Opret mappe og kopiér filer (eller git clone hele repoet)
mkdir -p /home/user/advault-worker
cp analyze-ad.sh analyze-ad.mjs /home/user/advault-worker/
chmod +x /home/user/advault-worker/analyze-ad.sh /home/user/advault-worker/analyze-ad.mjs

# 2. Installér ffmpeg + gratis lokal Whisper til lyd-transskription
sudo apt-get update && sudo apt-get install -y ffmpeg python3-pip
pip install --break-system-packages faster-whisper

# 3. Log ind én gang i Antigravity CLI (gemmes på din faste InstaBox-disk)
agy acp --login

# 4. Sæt dine Supabase-miljøvariabler som InstaBox Secrets (eller i ~/.bashrc)
# NEXT_PUBLIC_SUPABASE_URL=...
# SUPABASE_SERVICE_ROLE_KEY=...
```

## Sådan virker auto-wake efter 30 min idle
1. Efter 30 minutters inaktivitet pauser InstaBox automatisk VM'en (filer, `agy`-login og RAM bevares).
2. Når du trykker **"Analyser med InstaBox"** i din AdVault-app (på telefon eller PC), kalder Vercel:
   - `POST https://api.instabox.sh/v1/machines/<INSTABOX_MACHINE_ID>/wake` (vækker VM'en på < 1 sek.)
   - `POST https://api.instabox.sh/v1/machines/<INSTABOX_MACHINE_ID>/exec` med `["/home/user/advault-worker/analyze-ad.sh", "<ad_id>"]`
3. Workeren henter videoen fra Supabase Storage, udtrækker lyd med `ffmpeg`, transskriberer gratis lokalt med `faster-whisper`, sender prompt til officiel `agy acp` og opdaterer `ads`-rækken i Supabase.
