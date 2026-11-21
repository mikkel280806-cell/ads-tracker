# AdVault — Personlig Foreplay & TrendTrack Ads Tracker

En hurtig, personlig e-commerce ads tracker bygget med **Next.js (App Router) + Tailwind CSS + Supabase + InstaBox.sh** — designet til både desktop og som installerbar **mobil-app (PWA)** på iPhone og Android.

## Funktioner
- **Foreplay Swipe File**: Gem annoncer fra **Meta Ad Library** og **Instagram (Reels & Posts)** eller upload manuelt. Organisér i **Boards**, tilføj tags, noter og generér **UGC Creator Briefs** med 1 klik.
- **TrendTrack Brand Tracker**: Følg konkurrerende brands, se aktive Meta-ads, **dage live (30d+ vinder-badges)**, **EU Reach**, Shopify-status og direkte links til deres Ad Library & webshop.
- **Permanent Medielagring**: Downloads fra Meta/Instagram gemmes permanent i **Supabase Storage** (`ad-media` bucket), så annoncer aldrig udløber.
- **On-Demand AI-worker på InstaBox.sh**: Vækker automatisk din InstaBox VM fra 30-minutters dvale via `INSTABOX_API_KEY` (`POST /v1/machines/{id}/wake` + `exec`), kører `ffmpeg` + lokal `faster-whisper` + officiel `agy acp` og skriver hooks, transskription og script-struktur tilbage til Supabase. Indeholder også **1-kliks "Kopiér til Gemini"** + JSON-import direkte i UI'et.
- **Mobil PWA ("Føj til hjemmeskærm")**: Standalone fuldskærm på iOS/Android, fast tommelfinger-venlig bund-navigation, 1-kliks *"Indsæt fra udklipsholder"*, Android Share Target og opskrift til iPhone Apple Genvej.

## Hurtig start lokalt
```bash
npm install
cp .env.example .env.local
npm run dev
```
Appen virker med det samme i **Lokal / Demo Mode** med indbygget data og `localStorage` — også før du tilføjer API-nøgler.

## Tilslutning af Services
1. **Supabase**: Opret projekt på supabase.com → kør `supabase/schema.sql` i SQL Editor → tilføj `NEXT_PUBLIC_SUPABASE_URL` og `SUPABASE_SERVICE_ROLE_KEY` i Vercel / `.env.local`.
2. **Vercel**: Importer GitHub-repoet på vercel.com og indsæt miljøvariablerne fra `.env.example`.
3. **ScrapeCreators (Live Link-Import)**: Tilføj `SCRAPECREATORS_API_KEY` for automatisk udtræk af video, annoncetekst, CTA og EU-reach fra Meta Ad Library og Instagram.
4. **InstaBox.sh (Auto-Wake AI/Video-Worker)**:
   - Kopiér `worker/`-mappen over på din InstaBox VM (`/home/user/advault-worker/`).
   - Installér `ffmpeg`, `faster-whisper` og log ind én gang med `agy acp --login`.
   - Tilføj `INSTABOX_API_KEY` og `INSTABOX_MACHINE_ID` i Vercel.
