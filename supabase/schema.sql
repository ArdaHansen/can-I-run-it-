create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  username text,
  streak integer default 0,
  best_streak integer default 0,
  last_run_date date,
  created_at timestamptz default now()
);

create table if not exists runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  screenshot_url text,
  distance_km numeric,
  pace text,
  duration text,
  avg_hr integer,
  weekly_km numeric,
  long_run_km numeric,
  goal text,
  readiness_score integer,
  verdict text,
  recommendation text,
  created_at timestamptz default now()
);

alter table profiles enable row level security;
alter table runs enable row level security;

create policy "profiles_select_own" on profiles for select using (auth.uid() = id);
create policy "profiles_insert_own" on profiles for insert with check (auth.uid() = id);
create policy "profiles_update_own" on profiles for update using (auth.uid() = id);

create policy "runs_select_own" on runs for select using (auth.uid() = user_id);
create policy "runs_insert_own" on runs for insert with check (auth.uid() = user_id);
create policy "runs_update_own" on runs for update using (auth.uid() = user_id);
create policy "runs_delete_own" on runs for delete using (auth.uid() = user_id);

-- Create private storage bucket in Supabase dashboard named: run-screenshots
