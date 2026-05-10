-- Can I Run It? Supabase schema
-- Run this once in Supabase SQL Editor.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique,
  age integer check (age between 8 and 100),
  weight numeric check (weight > 0 and weight < 400),
  weekly_km numeric default 0 check (weekly_km >= 0 and weekly_km < 400),
  target_race text check (target_race in ('5K','10K','HALF','MARATHON')),
  target_time text,
  streak integer not null default 0 check (streak >= 0),
  best_streak integer not null default 0 check (best_streak >= 0),
  last_run_date date,
  created_at timestamptz not null default now()
);

create table if not exists public.runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  screenshot_url text,
  distance numeric check (distance > 0 and distance < 500),
  pace text,
  duration text,
  avg_hr integer check (avg_hr is null or (avg_hr between 40 and 230)),
  readiness_score integer check (readiness_score between 0 and 100),
  analysis text,
  uploaded_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.runs enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
drop policy if exists "profiles_insert_own" on public.profiles;
drop policy if exists "profiles_update_own" on public.profiles;
drop policy if exists "runs_select_own" on public.runs;
drop policy if exists "runs_insert_own" on public.runs;
drop policy if exists "runs_update_own" on public.runs;
drop policy if exists "runs_delete_own" on public.runs;

create policy "profiles_select_own" on public.profiles
for select using (auth.uid() = id);
create policy "profiles_insert_own" on public.profiles
for insert with check (auth.uid() = id);
create policy "profiles_update_own" on public.profiles
for update using (auth.uid() = id) with check (auth.uid() = id);

create policy "runs_select_own" on public.runs
for select using (auth.uid() = user_id);
create policy "runs_insert_own" on public.runs
for insert with check (auth.uid() = user_id);
create policy "runs_update_own" on public.runs
for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "runs_delete_own" on public.runs
for delete using (auth.uid() = user_id);

-- Storage bucket. If this errors because the bucket exists, create it in Dashboard instead.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('run-screenshots', 'run-screenshots', false, 5242880, array['image/png','image/jpeg','image/webp'])
on conflict (id) do update set public = false, file_size_limit = 5242880, allowed_mime_types = array['image/png','image/jpeg','image/webp'];

alter table storage.objects enable row level security;

drop policy if exists "screenshots_select_own" on storage.objects;
drop policy if exists "screenshots_insert_own" on storage.objects;
drop policy if exists "screenshots_update_own" on storage.objects;
drop policy if exists "screenshots_delete_own" on storage.objects;

create policy "screenshots_select_own" on storage.objects
for select using (
  bucket_id = 'run-screenshots'
  and auth.uid()::text = (storage.foldername(name))[1]
);

create policy "screenshots_insert_own" on storage.objects
for insert with check (
  bucket_id = 'run-screenshots'
  and auth.uid()::text = (storage.foldername(name))[1]
);

create policy "screenshots_update_own" on storage.objects
for update using (
  bucket_id = 'run-screenshots'
  and auth.uid()::text = (storage.foldername(name))[1]
) with check (
  bucket_id = 'run-screenshots'
  and auth.uid()::text = (storage.foldername(name))[1]
);

create policy "screenshots_delete_own" on storage.objects
for delete using (
  bucket_id = 'run-screenshots'
  and auth.uid()::text = (storage.foldername(name))[1]
);
