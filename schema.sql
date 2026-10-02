-- ============================================================
-- SWEAT — schema del database
-- Vai su Supabase -> il tuo progetto -> "SQL Editor" -> "New query"
-- incolla TUTTO questo file e premi "Run". Va eseguito una volta sola.
-- ============================================================

-- ---------- Tabella profili (dati pubblici legati a ogni utente) ----------
create table if not exists public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  name text,
  workouts integer default 0,
  km_month numeric default 0,
  streak integer default 0,
  points integer default 0,
  created_at timestamptz default now()
);

alter table public.profiles enable row level security;

create policy "I profili sono leggibili da chiunque sia autenticato"
  on public.profiles for select
  using (auth.role() = 'authenticated');

create policy "Ogni utente modifica solo il proprio profilo"
  on public.profiles for update
  using (auth.uid() = id);

-- Crea automaticamente un profilo quando qualcuno si registra
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)));
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ---------- Tabella post (il feed) ----------
create table if not exists public.posts (
  id uuid default gen_random_uuid() primary key,
  author_id uuid references auth.users(id) on delete cascade,
  author_name text,
  type text,
  caption text,
  likes_count integer default 0,
  created_at timestamptz default now()
);

alter table public.posts enable row level security;

create policy "I post sono leggibili da chiunque sia autenticato"
  on public.posts for select
  using (auth.role() = 'authenticated');

create policy "Ogni utente pubblica i propri post"
  on public.posts for insert
  with check (auth.uid() = author_id);

create policy "Ogni utente cancella solo i propri post"
  on public.posts for delete
  using (auth.uid() = author_id);

-- ---------- Tabella like (chi ha messo like a cosa) ----------
create table if not exists public.likes (
  post_id uuid references public.posts(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (post_id, user_id)
);

alter table public.likes enable row level security;

create policy "I like sono leggibili da chiunque sia autenticato"
  on public.likes for select
  using (auth.role() = 'authenticated');

create policy "Ogni utente gestisce solo i propri like"
  on public.likes for insert
  with check (auth.uid() = user_id);

create policy "Ogni utente rimuove solo i propri like"
  on public.likes for delete
  using (auth.uid() = user_id);

-- Mantiene automaticamente aggiornato il contatore likes_count sui post
create or replace function public.handle_like_change()
returns trigger as $$
begin
  if (tg_op = 'INSERT') then
    update public.posts set likes_count = likes_count + 1 where id = new.post_id;
    return new;
  elsif (tg_op = 'DELETE') then
    update public.posts set likes_count = greatest(likes_count - 1, 0) where id = old.post_id;
    return old;
  end if;
  return null;
end;
$$ language plpgsql security definer;

drop trigger if exists on_like_added on public.likes;
create trigger on_like_added
  after insert on public.likes
  for each row execute procedure public.handle_like_change();

drop trigger if exists on_like_removed on public.likes;
create trigger on_like_removed
  after delete on public.likes
  for each row execute procedure public.handle_like_change();
