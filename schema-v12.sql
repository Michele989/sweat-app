-- ============================================================
-- SWEAT — schema v12 (migrazione additiva)
-- Aggiunge: scheda di allenamento editabile e persistente, piano
-- alimentare editabile e persistente, diario pasti giornaliero.
-- Non cancella nulla di quello che hai già.
-- Vai su Supabase -> SQL Editor -> New query -> incolla tutto -> Run.
-- ============================================================

-- ---------- Scheda di allenamento (piano settimanale editabile) ----------
create table if not exists public.training_plans (
  user_id uuid references auth.users(id) on delete cascade primary key,
  days jsonb not null default '[]'::jsonb,
  updated_at timestamptz default now()
);
alter table public.training_plans enable row level security;

drop policy if exists "Ognuno legge solo la propria scheda" on public.training_plans;
create policy "Ognuno legge solo la propria scheda"
  on public.training_plans for select using (auth.uid() = user_id);
drop policy if exists "Ognuno crea solo la propria scheda" on public.training_plans;
create policy "Ognuno crea solo la propria scheda"
  on public.training_plans for insert with check (auth.uid() = user_id);
drop policy if exists "Ognuno modifica solo la propria scheda" on public.training_plans;
create policy "Ognuno modifica solo la propria scheda"
  on public.training_plans for update using (auth.uid() = user_id);

-- ---------- Piano alimentare (editabile e persistente) ----------
create table if not exists public.diet_plans (
  user_id uuid references auth.users(id) on delete cascade primary key,
  calorie_target numeric,
  days jsonb not null default '[]'::jsonb,
  updated_at timestamptz default now()
);
alter table public.diet_plans enable row level security;

drop policy if exists "Ognuno legge solo il proprio piano alimentare" on public.diet_plans;
create policy "Ognuno legge solo il proprio piano alimentare"
  on public.diet_plans for select using (auth.uid() = user_id);
drop policy if exists "Ognuno crea solo il proprio piano alimentare" on public.diet_plans;
create policy "Ognuno crea solo il proprio piano alimentare"
  on public.diet_plans for insert with check (auth.uid() = user_id);
drop policy if exists "Ognuno modifica solo il proprio piano alimentare" on public.diet_plans;
create policy "Ognuno modifica solo il proprio piano alimentare"
  on public.diet_plans for update using (auth.uid() = user_id);

-- ---------- Diario pasti giornaliero ----------
create table if not exists public.meal_logs (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade,
  log_date date not null default current_date,
  meal_name text not null,
  description text not null,
  created_at timestamptz default now()
);
alter table public.meal_logs enable row level security;

drop policy if exists "Ognuno legge solo il proprio diario pasti" on public.meal_logs;
create policy "Ognuno legge solo il proprio diario pasti"
  on public.meal_logs for select using (auth.uid() = user_id);
drop policy if exists "Ognuno inserisce solo nel proprio diario pasti" on public.meal_logs;
create policy "Ognuno inserisce solo nel proprio diario pasti"
  on public.meal_logs for insert with check (auth.uid() = user_id);
drop policy if exists "Ognuno cancella solo dal proprio diario pasti" on public.meal_logs;
create policy "Ognuno cancella solo dal proprio diario pasti"
  on public.meal_logs for delete using (auth.uid() = user_id);
