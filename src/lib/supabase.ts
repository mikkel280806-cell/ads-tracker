import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { ConnectorStatus } from "./types";

function getSupabaseUrl(): string | null {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.SUPABASE_URL ||
    null
  );
}

function getSupabaseKey(): string | null {
  return (
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    null
  );
}

export function isSupabaseConfigured(): boolean {
  return Boolean(getSupabaseUrl() && getSupabaseKey());
}

export function getSupabaseServerClient(): SupabaseClient | null {
  const url = getSupabaseUrl();
  const key = getSupabaseKey();

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
    passcodeLock: Boolean(process.env.APP_PASSWORD),
    mode: supabase ? "live" : "demo",
  };
}
