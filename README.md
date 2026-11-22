# Adtrack — E-commerce Shops & Meta Ad Library Intelligence

Trendtrack-inspireret e-commerce shops & Meta Ads intelligence PWA bygget 100% serverless med **Next.js 16 (App Router) + Tailwind CSS v4 + Supabase + rene REST API'er** (ingen VMs eller lokale workers).

## Stack (100% Serverless APIs)
- **Shops & Meta Ad Library**: Live scraping via **ScrapeCreators API** + 5-lags Shopify Pixel/App-detektion (Web Pixels JSON, `asyncLoad`, Trekkie CAPI, HTML-signaturer & Elevar S2S) + `/api/tech-logo` logo-fetcher.
- **Database & Storage**: **Supabase Postgres** (`adtrack_brands`, `adtrack_ads`, `adtrack_folders`) + `ad-media` storage bucket.
- **AI Ad Teardown & Video Transcription**: Direkte serverless REST API i `/api/analyze` med **Gemini API** (multimodal vision + copy), **OpenAI API** eller **Groq API** (`whisper-large-v3-turbo` til video-lyd).
- **UI & Mobil PWA**: Instrument Sans + Geist + Geist Mono, Electric Cobalt `#0027eb`, KISS UI med Lucide-ikoner og flydende iOS 26 **Liquid Glass** mobil-menubar (`Shops` · `Explore` · `Folders`).
