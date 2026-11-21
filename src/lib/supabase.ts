import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { ConnectorStatus } from "./types";

export function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
  );
}

export function getSupabaseServerClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) return null;

  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function getConnectorStatus(): ConnectorStatus {
  const supabase = isSupabaseConfigured();
  return {
    supabase,
    scrapeCreators: Boolean(process.env.SCRAPECREATORS_API_KEY),
    apify: Boolean(process.env.APIFY_API_TOKEN),
    similarweb: Boolean(process.env.SIMILARWEB_API_KEY || process.env.RAPIDAPI_KEY),
    instabox: Boolean(process.env.INSTABOX_API_KEY && process.env.INSTABOX_MACHINE_ID),
    groq: Boolean(process.env.GROQ_API_KEY),
    gemini: Boolean(process.env.GEMINI_API_KEY),
    passcodeLock: Boolean(process.env.APP_PASSWORD),
    mode: supabase ? "live" : "demo",
  };
}
