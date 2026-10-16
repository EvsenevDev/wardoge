-- WarDOGE database setup. Paste into Supabase: SQL Editor -> New query -> Run.
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null default 'Player',
  cash integer not null default 1500,
  xp integer not null default 0,
  matches integer not null default 0,
  wins integer not null default 0,
  kills integer not null default 0,
  deaths integer not null default 0,
  revives integer not null default 0,
  history jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
-- Players can read their own profile. Only the game server (service key) can write, so nobody can edit their cash.
drop policy if exists "read own profile" on public.profiles;
create policy "read own profile" on public.profiles for select using (auth.uid() = id);
