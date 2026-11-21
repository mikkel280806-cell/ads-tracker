# Adtrack — Personlig Trendtrack & Foreplay Ads Tracker

Din egen lynhurtige e-commerce creative intelligence-app i **#0027eb**, bygget med **Next.js (App Router) + Tailwind CSS + ReUI + Supabase + InstaBox.sh** — designet med kulsort sidebar, kridhvidt Trendtrack-workspace og fuld **mobil-app (PWA)** på iPhone og Android.

## Funktioner
- **Ads (Trendtrack + Foreplay Swipe File)**: Gem annoncer fra **Meta Ad Library** og **Instagram (Reels & Posts)** med 1 klik via Quick-Paste baren eller manuel upload. Hvert kort viser EU Reach, Est. Spend, Daily Spend, aktive dage, Duplicated-antal, hvid Play-knap, domæne + CTA og **"Save to Favorites"** med board-vælger.
- **Shops & Shop Analytics (Trendtrack + SimilarWeb)**: Følg konkurrerende webshops i Trendtrack-tabel med **Monthly Visits area-grafer**, **Meta Ads grafer**, Shopify-tema, Trustpilot-score, Pixels, landefordeling (`Visitor Countries`) og live `/api/traffic` integration mod **SimilarWeb API** / **RapidAPI SimilarWeb**.
- **Brandtracker**: Rangerede Top EU Ads (`#1`, `#2`, `#3`...) på tværs af fulgte konkurrenter.
- **Permanent Medielagring**: Videoer og billeder downloades og lagres permanent i **Supabase Storage** (`ad-media` bucket), så ads aldrig udløber.
- **InstaBox.sh Auto-Wake AI/Video-Worker**: Vækker automatisk din InstaBox VM fra 30 min. dvale via `INSTABOX_API_KEY` (`POST /v1/machines/{id}/wake` + `exec`), kører `ffmpeg` + lokal `faster-whisper` + officiel `agy acp`, plus 1-kliks **"Kopiér til Gemini"** og **UGC Creator Brief generator**.
- **Mobil PWA ("Føj til hjemmeskærm")**: Eget blåt **Adtrack**-ikon, fuldskærm uden browser-bar, bund-navigation, 1/2-kolonners mobil-toggle, Android Share Target og iPhone Apple Genvej-opskrift.

## Miljøvariabler
Se [.env.example](./.env.example) for alle nøgler til **Supabase**, **ScrapeCreators/Apify**, **SimilarWeb/RapidAPI** og **InstaBox.sh**.
