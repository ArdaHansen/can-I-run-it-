create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  username text,
  full_name text,
  level text default 'Intermediate',
  experience text default '1-3 years',
  goal_distance text default 'Marathon',
  goal_time_hour integer default 3,
  goal_time_min integer default 30,
  target_race text,
  weekly_goal integer default 4,
  weekly_km numeric default 0,
  training_days integer default 4,
  available_days text[] default array['Mon','Wed','Fri','Sun'],
  available_time jsonb default '{}'::jsonb,
  rest_preference text default 'balanced',
  injury_history text,
  current_fitness text,
  notes text,
  onboarding_complete boolean default false,
  streak integer default 0,
  best_streak integer default 0,
  consistency_score integer default 0,
  readiness_score integer default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  run_date date default current_date,
  title text default 'Run upload',
  source text default 'manual',
  screenshot_url text,
  image_path text,
  distance_km numeric default 0,
  duration_min integer default 0,
  pace_text text,
  avg_hr integer,
  max_hr integer,
  elevation_gain numeric default 0,
  effort integer default 5,
  run_type text default 'Easy',
  notes text,
  parsed_data jsonb default '{}'::jsonb,
  readiness_score integer default 0,
  ai_analysis text,
  training_suggestion text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.training_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text default 'Adaptive week',
  plan jsonb not null default '[]'::jsonb,
  summary text,
  created_at timestamptz default now()
);

alter table public.profiles enable row level security;
alter table public.runs enable row level security;
alter table public.training_plans enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
drop policy if exists "profiles_insert_own" on public.profiles;
drop policy if exists "profiles_update_own" on public.profiles;
drop policy if exists "runs_select_own" on public.runs;
drop policy if exists "runs_insert_own" on public.runs;
drop policy if exists "runs_update_own" on public.runs;
drop policy if exists "plans_select_own" on public.training_plans;
drop policy if exists "plans_insert_own" on public.training_plans;

create policy "profiles_select_own" on public.profiles for select using (auth.uid() = id);
create policy "profiles_insert_own" on public.profiles for insert with check (auth.uid() = id);
create policy "profiles_update_own" on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);
create policy "runs_select_own" on public.runs for select using (auth.uid() = user_id);
create policy "runs_insert_own" on public.runs for insert with check (auth.uid() = user_id);
create policy "runs_update_own" on public.runs for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "plans_select_own" on public.training_plans for select using (auth.uid() = user_id);
create policy "plans_insert_own" on public.training_plans for insert with check (auth.uid() = user_id);
