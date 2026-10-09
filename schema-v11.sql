-- ============================================================
-- SWEAT — schema v11 (migrazione additiva)
-- Aggiunge: archiviazione dei post (nascondere senza cancellare),
-- post salvati (il bottone "salva" ora funziona davvero).
-- Vai su Supabase -> SQL Editor -> New query -> incolla TUTTO
-- questo file -> Run. Va eseguito una volta sola.
-- ============================================================

-- ---------- Archiviazione post ----------
alter table public.posts add column if not exists archived boolean not null default false;

-- ---------- Post salvati ----------
create table if not exists public.saved_posts (
  user_id uuid references auth.users(id) on delete cascade,
  post_id uuid references public.posts(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (user_id, post_id)
);
alter table public.saved_posts enable row level security;

drop policy if exists "Ognuno legge solo i propri post salvati" on public.saved_posts;
create policy "Ognuno legge solo i propri post salvati"
  on public.saved_posts for select using (auth.uid() = user_id);
drop policy if exists "Ognuno salva post a proprio nome" on public.saved_posts;
create policy "Ognuno salva post a proprio nome"
  on public.saved_posts for insert with check (auth.uid() = user_id);
drop policy if exists "Ognuno rimuove solo i propri post salvati" on public.saved_posts;
create policy "Ognuno rimuove solo i propri post salvati"
  on public.saved_posts for delete using (auth.uid() = user_id);
