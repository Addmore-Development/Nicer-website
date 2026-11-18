-- NiCER Notice Board: run this once in Supabase → SQL Editor.
-- Roles: 'user' (default, can read published notices) and 'admin' (can add/edit/delete notices).

-- ---------- profiles ----------
create table if not exists public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  full_name  text,
  role       text not null default 'user' check (role in ('user', 'admin')),
  created_at timestamptz not null default now()
);
alter table public.profiles enable row level security;

-- Admin check. SECURITY DEFINER so policies can use it without recursing into profiles' own RLS.
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

-- Users can read their own profile; admins can read all.
-- There are deliberately NO insert/update/delete policies for users, so nobody can promote themselves.
drop policy if exists "read own profile or admin" on public.profiles;
create policy "read own profile or admin" on public.profiles
  for select to authenticated
  using (id = auth.uid() or public.is_admin());

-- Create a profile automatically when someone signs up. Role is always 'user' here.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''));
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- notices ----------
create table if not exists public.notices (
  id           uuid primary key default gen_random_uuid(),
  title        text not null check (char_length(title) between 3 and 160),
  category     text not null check (category in ('job', 'funding', 'programme', 'event', 'announcement')),
  organisation text check (char_length(organisation) <= 160),
  location     text check (char_length(location) <= 160),
  body         text not null check (char_length(body) between 1 and 5000),
  link_url     text check (link_url is null or link_url ~* '^https?://'),
  deadline     date,
  pinned       boolean not null default false,
  is_published boolean not null default true,
  created_by   uuid references auth.users(id) on delete set null default auth.uid(),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists notices_created_idx on public.notices (created_at desc);
alter table public.notices enable row level security;

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
drop trigger if exists notices_touch on public.notices;
create trigger notices_touch before update on public.notices
  for each row execute function public.touch_updated_at();

-- Signed-in users see published notices; admins see everything (including drafts).
drop policy if exists "members read published" on public.notices;
create policy "members read published" on public.notices
  for select to authenticated
  using (is_published or public.is_admin());

drop policy if exists "admins insert notices" on public.notices;
create policy "admins insert notices" on public.notices
  for insert to authenticated
  with check (public.is_admin());

drop policy if exists "admins update notices" on public.notices;
create policy "admins update notices" on public.notices
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "admins delete notices" on public.notices;
create policy "admins delete notices" on public.notices
  for delete to authenticated
  using (public.is_admin());

-- ---------- make your first admin ----------
-- 1. Create an account on signin.html first (and confirm the email if confirmation is on).
-- 2. Then run this with that account's email:
--
--   update public.profiles
--   set role = 'admin'
--   where id = (select id from auth.users where email = 'admin@example.com');
