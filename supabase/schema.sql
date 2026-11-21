-- =============================================================================
-- AdVault (Foreplay + TrendTrack) — Supabase Postgres Schema
-- Personal e-commerce ad library (no multi-tenant auth required)
-- Run this SQL in Supabase Dashboard -> SQL Editor
-- =============================================================================

create extension if not exists pgcrypto;

-- 1. BRANDS (TrendTrack Brand Tracker)
create table if not exists public.brands (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  handle text,
  avatar_url text,
  website_url text,
  meta_page_id text,
  meta_ad_library_url text,
  category text,
  is_shopify boolean not null default false,
  is_tracked boolean not null default true,
  active_ads_count integer not null default 0,
  estimated_monthly_reach bigint not null default 0,
  last_synced_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_brands_tracked on public.brands (is_tracked);
create index if not exists idx_brands_meta_page_id on public.brands (meta_page_id);

-- 2. ADS (Foreplay Swipe File + Permanent Media + AI Intelligence)
create table if not exists public.ads (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid references public.brands(id) on delete set null,
  source_type text not null default 'meta_ad_library'
    check (source_type in ('meta_ad_library', 'instagram', 'manual')),
  source_url text,
  external_ad_id text,
  media_type text not null default 'video'
    check (media_type in ('video', 'image', 'carousel')),
  media_storage_url text,
  thumbnail_storage_url text,
  aspect_ratio text not null default '3:4',
  duration_seconds integer,
  primary_text text,
  headline text,
  cta_text text,
  landing_page_url text,
  is_active boolean not null default true,
  started_running_at timestamptz,
  eu_reach bigint,
  platforms text[] not null default '{}',
  status text not null default 'ready'
    check (status in ('processing', 'pending_ai', 'ready', 'failed')),
  ai_hook_verbal text,
  ai_hook_visual text,
  ai_angle text,
  ai_format text,
  ai_transcript text,
  ai_script_breakdown jsonb,
  ai_analysis_json jsonb,
  user_notes text not null default '',
  is_favorite boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_ads_brand_id on public.ads (brand_id);
create index if not exists idx_ads_created_at on public.ads (created_at desc);
create index if not exists idx_ads_status on public.ads (status);
create index if not exists idx_ads_eu_reach on public.ads (eu_reach desc nulls last);
create index if not exists idx_ads_started_running_at on public.ads (started_running_at asc nulls last);

-- Full-text search vector across copy, hooks, transcript & user notes
alter table public.ads
  add column if not exists search_tsv tsvector
  generated always as (
    to_tsvector(
      'simple',
      coalesce(primary_text, '') || ' ' ||
      coalesce(headline, '') || ' ' ||
      coalesce(ai_hook_verbal, '') || ' ' ||
      coalesce(ai_hook_visual, '') || ' ' ||
      coalesce(ai_angle, '') || ' ' ||
      coalesce(ai_format, '') || ' ' ||
      coalesce(ai_transcript, '') || ' ' ||
      coalesce(user_notes, '')
    )
  ) stored;

create index if not exists idx_ads_search_tsv on public.ads using gin (search_tsv);

-- 3. BOARDS (Foreplay Collections)
create table if not exists public.boards (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text not null default '',
  accent_color text not null default '#10B981',
  created_at timestamptz not null default now()
);

create table if not exists public.board_ads (
  board_id uuid not null references public.boards(id) on delete cascade,
  ad_id uuid not null references public.ads(id) on delete cascade,
  added_at timestamptz not null default now(),
  primary key (board_id, ad_id)
);

-- 4. TAGS
create table if not exists public.tags (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  color text not null default '#64748B'
);

create table if not exists public.ad_tags (
  ad_id uuid not null references public.ads(id) on delete cascade,
  tag_id uuid not null references public.tags(id) on delete cascade,
  primary key (ad_id, tag_id)
);

-- Updated_at trigger for ads
create or replace function public.touch_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_ads_updated_at on public.ads;
create trigger trg_ads_updated_at
  before update on public.ads
  for each row execute function public.touch_updated_at();

-- 5. STORAGE BUCKET for permanent ad videos & thumbnails
insert into storage.buckets (id, name, public)
values ('ad-media', 'ad-media', true)
on conflict (id) do nothing;

-- Personal app policy: allow server/service-role full access + public read for media URLs
drop policy if exists "Public read ad-media" on storage.objects;
create policy "Public read ad-media"
  on storage.objects for select
  using (bucket_id = 'ad-media');
