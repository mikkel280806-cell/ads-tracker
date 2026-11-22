# Adtrack — E-commerce Shops & Meta Ad Library Intelligence

Trendtrack-inspireret e-commerce shops & Meta Ads intelligence PWA bygget 100% serverless med **Next.js 16 (App Router) + Tailwind CSS v4 + Supabase** — helt uden AI API-keys eller VMs.

## Stack (Zero-AI, Trendtrack-Style Tools)
- **Shops & Meta Ad Library**: Live scraping via **ScrapeCreators API** + 5-lags Shopify Pixel/App-detektion (Web Pixels JSON, `asyncLoad`, Trekkie CAPI, HTML-signaturer & Elevar S2S) + `/api/tech-logo` logo-fetcher.
- **Ad & Landing Page Intelligence (0 kr. / 0 AI-keys)**: Deterministisk scaling-score, automatisk hook-, offer- og social-proof-udtræk ([`src/lib/ad-analyzer.ts`](src/lib/ad-analyzer.ts)) + live Landing Page & Conversion Inspector ([`/api/analyze`](src/app/api/analyze/route.ts)).
- **Database & Storage**: **Supabase Postgres** (`adtrack_brands`, `adtrack_ads`, `adtrack_folders`) + `ad-media` storage bucket.
- **UI & Mobil PWA**: Instrument Sans + Geist + Geist Mono, Electric Cobalt `#0027eb`, KISS UI med Lucide-ikoner og flydende iOS 26 **Liquid Glass** mobil-menubar (`Shops` · `Explore` · `Folders`).
