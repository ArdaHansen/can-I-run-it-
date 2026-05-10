-- Can I Run It V2 Supabase schema
-- Run in Supabase SQL Editor.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text check (char_length(username) <= 32),
  level text not null default 'beginner' check (level in ('beginner','intermediate','advanced','competitive')),
  weekly_km numeric default 0 check (weekly_km >= 0 and weekly_km <= 220),
  goal_distance text default '10k' check (goal_distance in ('5k','10k','half','marathon')),
  goal_time_min numeric default 50 check (goal_time_min >= 10 and goal_time_min <= 500),
  available_days text[] default '{}',
  rest_preference text default '1-2',
  notes text check (char_length(notes) <= 300),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  distance_km numeric not null check (distance_km > 0 and distance_km <= 100),
  duration_min numeric not null check (duration_min > 0 and duration_min <= 900),
  avg_hr integer check (avg_hr is null or (avg_hr >= 60 and avg_hr <= 230)),
  effort text not null default 'easy' check (effort in ('easy','steady','tempo','interval','long')),
  pace_text text,
  screenshot_path text,
  source text default 'manual' check (source in ('manual','screenshot_upload','strava_future')),
  created_at timestamptz default now()
);

alter table public.profiles enable row level security;
alter table public.runs enable row level security;

DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_delete_own" ON public.profiles;
DROP POLICY IF EXISTS "runs_select_own" ON public.runs;
DROP POLICY IF EXISTS "runs_insert_own" ON public.runs;
DROP POLICY IF EXISTS "runs_update_own" ON public.runs;
DROP POLICY IF EXISTS "runs_delete_own" ON public.runs;

create policy "profiles_select_own" on public.profiles for select using (auth.uid() = id);
create policy "profiles_insert_own" on public.profiles for insert with check (auth.uid() = id);
create policy "profiles_update_own" on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);
create policy "profiles_delete_own" on public.profiles for delete using (auth.uid() = id);

create policy "runs_select_own" on public.runs for select using (auth.uid() = user_id);
create policy "runs_insert_own" on public.runs for insert with check (auth.uid() = user_id);
create policy "runs_update_own" on public.runs for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "runs_delete_own" on public.runs for delete using (auth.uid() = user_id);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('run-screenshots', 'run-screenshots', false, 4194304, array['image/png','image/jpeg','image/webp'])
on conflict (id) do update set public = false, file_size_limit = 4194304, allowed_mime_types = array['image/png','image/jpeg','image/webp'];

DROP POLICY IF EXISTS "screenshots_select_own" ON storage.objects;
DROP POLICY IF EXISTS "screenshots_insert_own" ON storage.objects;
DROP POLICY IF EXISTS "screenshots_delete_own" ON storage.objects;

create policy "screenshots_select_own" on storage.objects for select
using (bucket_id = 'run-screenshots' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "screenshots_insert_own" on storage.objects for insert
with check (bucket_id = 'run-screenshots' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "screenshots_delete_own" on storage.objects for delete
using (bucket_id = 'run-screenshots' and auth.uid()::text = (storage.foldername(name))[1]);
