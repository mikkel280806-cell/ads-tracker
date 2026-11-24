-- =============================================================================
-- Adtrack — Supabase Postgres Schema (Shops, Live Meta Ads & Folders)
-- Run this SQL once in Supabase Dashboard -> SQL Editor -> New Query -> Run
-- =============================================================================

-- 1. SHOPS / BRANDS
create table if not exists public.adtrack_brands (
  id text primary key,
  name text not null,
  market text not null default 'US',
  website_url text not null default '',
  meta_page_id text,
  is_shopify boolean not null default false,
  active_ads_count integer not null default 0,
  monthly_visits bigint not null default 0,
  products_count integer not null default 0,
  pixels text[] not null default '{}',
  shopify_apps text[] not null default '{}',
  folder_ids text[] not null default '{}',
  payload jsonb not null,
  last_synced_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_adtrack_brands_market on public.adtrack_brands (market);
create index if not exists idx_adtrack_brands_active_ads on public.adtrack_brands (active_ads_count desc);
create index if not exists idx_adtrack_brands_visits on public.adtrack_brands (monthly_visits desc);

-- 2. META ADS (also stores standalone folder uploads & organic Instagram Reels)
create table if not exists public.adtrack_ads (
  id text primary key,
  brand_id text not null,
  brand_name text not null,
  market text not null default 'US',
  media_type text not null default 'image',
  display_format text,
  headline text not null default '',
  primary_text text not null default '',
  extracted_hook text not null default '',
  hook_category text,
  landing_page_url text not null default '',
  landing_page_path text not null default '/',
  is_active boolean not null default true,
  started_running_at timestamptz not null default now(),
  duplicated_count integer,
  board_ids text[] not null default '{}',
  user_notes text not null default '',
  payload jsonb not null,
  updated_at timestamptz not null default now()
);

create index if not exists idx_adtrack_ads_brand_id on public.adtrack_ads (brand_id);
create index if not exists idx_adtrack_ads_market on public.adtrack_ads (market);
create index if not exists idx_adtrack_ads_started on public.adtrack_ads (started_running_at desc);

-- Full-text search across brand, copy, hook & headline
alter table public.adtrack_ads
  add column if not exists search_tsv tsvector
  generated always as (
    to_tsvector(
      'simple',
      coalesce(brand_name, '') || ' ' ||
      coalesce(headline, '') || ' ' ||
      coalesce(primary_text, '') || ' ' ||
      coalesce(extracted_hook, '') || ' ' ||
      coalesce(user_notes, '')
    )
  ) stored;

create index if not exists idx_adtrack_ads_search on public.adtrack_ads using gin (search_tsv);

-- 3. FOLDERS
create table if not exists public.adtrack_folders (
  id text primary key,
  name text not null,
  description text not null default '',
  accent_color text not null default '#0027eb',
  created_at timestamptz not null default now()
);

-- Updated_at trigger
create or replace function public.adtrack_touch_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_adtrack_brands_updated on public.adtrack_brands;
create trigger trg_adtrack_brands_updated
  before update on public.adtrack_brands
  for each row execute function public.adtrack_touch_updated_at();

drop trigger if exists trg_adtrack_ads_updated on public.adtrack_ads;
create trigger trg_adtrack_ads_updated
  before update on public.adtrack_ads
  for each row execute function public.adtrack_touch_updated_at();

-- 4. STORAGE BUCKET for permanent ad videos & thumbnails
insert into storage.buckets (id, name, public)
values ('ad-media', 'ad-media', true)
on conflict (id) do nothing;

drop policy if exists "Public read ad-media" on storage.objects;
create policy "Public read ad-media"
  on storage.objects for select
  using (bucket_id = 'ad-media');
