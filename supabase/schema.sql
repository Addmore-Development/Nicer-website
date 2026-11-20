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
  category     text not null check (category in ('job', 'funding', 'learnership', 'scholarship', 'bursary', 'programme', 'event', 'announcement')),
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

-- Existing databases: widen the category list to include learnerships, scholarships and bursaries.
alter table public.notices drop constraint if exists notices_category_check;
alter table public.notices add constraint notices_category_check
  check (category in ('job', 'funding', 'learnership', 'scholarship', 'bursary', 'programme', 'event', 'announcement'));

-- ---------- programme sign-ups ----------
-- Anyone can submit the Sign Up form on a programme page. Only admins can read or delete the entries.
create table if not exists public.programme_signups (
  id         uuid primary key default gen_random_uuid(),
  programme  text not null check (char_length(programme) between 2 and 120),
  full_name  text not null check (char_length(full_name) between 2 and 120),
  email      text not null check (char_length(email) between 5 and 200 and email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  phone      text not null check (char_length(phone) between 7 and 30),
  created_at timestamptz not null default now()
);
alter table public.programme_signups enable row level security;
grant insert on public.programme_signups to anon, authenticated;

drop policy if exists "anyone can sign up" on public.programme_signups;
create policy "anyone can sign up" on public.programme_signups
  for insert to anon, authenticated
  with check (true);

drop policy if exists "admins read signups" on public.programme_signups;
create policy "admins read signups" on public.programme_signups
  for select to authenticated
  using (public.is_admin());

drop policy if exists "admins delete signups" on public.programme_signups;
create policy "admins delete signups" on public.programme_signups
  for delete to authenticated
  using (public.is_admin());

-- ---------- make your first admin ----------
-- 1. Create an account on signin.html first (and confirm the email if confirmation is on).
-- 2. Then run this with that account's email:
--
--   update public.profiles
--   set role = 'admin'
--   where id = (select id from auth.users where email = 'admin@example.com');


-- =====================================================================
-- v2 additions: News and Events, partner logos, image storage.
-- Safe to run on an existing database (everything is "if not exists" / "drop ... if exists").
-- =====================================================================

-- ---------- news and media ----------
-- Published items are PUBLIC (shown on news.html to everyone). Only admins can add, edit or delete.
create table if not exists public.news (
  id           uuid primary key default gen_random_uuid(),
  kind         text not null default 'news' check (kind in ('news', 'press', 'media', 'event', 'publication', 'video')),
  title        text not null check (char_length(title) between 3 and 200),
  summary      text check (char_length(summary) <= 400),
  body         text check (char_length(body) <= 20000),
  image_url    text check (image_url is null or image_url ~* '^https?://'),
  link_url     text check (link_url is null or link_url ~* '^https?://'),
  published_at date not null default current_date,
  featured     boolean not null default false,
  is_published boolean not null default false,
  created_by   uuid references auth.users(id) on delete set null default auth.uid(),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists news_published_idx on public.news (is_published, published_at desc);
alter table public.news enable row level security;
grant select on public.news to anon, authenticated;
grant insert, update, delete on public.news to authenticated;

drop trigger if exists news_touch on public.news;
create trigger news_touch before update on public.news
  for each row execute function public.touch_updated_at();

drop policy if exists "public reads published news" on public.news;
create policy "public reads published news" on public.news
  for select to anon, authenticated
  using (is_published or public.is_admin());

drop policy if exists "admins insert news" on public.news;
create policy "admins insert news" on public.news
  for insert to authenticated with check (public.is_admin());

drop policy if exists "admins update news" on public.news;
create policy "admins update news" on public.news
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "admins delete news" on public.news;
create policy "admins delete news" on public.news
  for delete to authenticated using (public.is_admin());

-- ---------- partners (logos) ----------
-- One row per partner shown on the site. "slug" matches data-logo="..." in the HTML. Admins upload the logo.
create table if not exists public.partners (
  slug       text primary key check (slug ~ '^[a-z0-9-]+$'),
  name       text not null check (char_length(name) between 2 and 120),
  website    text check (website is null or website ~* '^https?://'),
  logo_url   text check (logo_url is null or logo_url ~* '^https?://'),
  sort_order int not null default 0,
  updated_at timestamptz not null default now()
);
alter table public.partners enable row level security;
grant select on public.partners to anon, authenticated;
grant insert, update, delete on public.partners to authenticated;

drop policy if exists "public reads partners" on public.partners;
create policy "public reads partners" on public.partners
  for select to anon, authenticated using (true);

drop policy if exists "admins write partners" on public.partners;
create policy "admins write partners" on public.partners
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

insert into public.partners (slug, name, sort_order) values
  ('sasol', 'Sasol', 1),
  ('gauteng-e-government', 'Gauteng Department of e-Government', 2),
  ('usaf', 'Universities South Africa', 3),
  ('edhe', 'EDHE', 4),
  ('studytrust', 'StudyTrust', 5),
  ('bellatrix', 'Bellatrix Investment Managers', 6),
  ('mtn', 'MTN', 7),
  ('adopt-a-school', 'Adopt-a-School', 8),
  ('univen', 'University of Venda', 9),
  ('vhembe-district', 'Vhembe District', 10),
  ('wibc', 'WIBC', 11),
  ('icatalysis-hub', 'iCatalysis Hub', 12),
  ('khoro', 'Khoro', 13),
  ('uj-education', 'UJ Faculty of Education', 14)
on conflict (slug) do nothing;

-- ---------- image storage (news images and partner logos) ----------
-- Public bucket: anyone can view files, only admins can upload, replace or delete.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('site-media', 'site-media', true, 5242880, array['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'])
on conflict (id) do update set public = true, file_size_limit = 5242880,
  allowed_mime_types = array['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'];

drop policy if exists "site-media public read" on storage.objects;
create policy "site-media public read" on storage.objects
  for select to anon, authenticated using (bucket_id = 'site-media');

drop policy if exists "site-media admin insert" on storage.objects;
create policy "site-media admin insert" on storage.objects
  for insert to authenticated with check (bucket_id = 'site-media' and public.is_admin());

drop policy if exists "site-media admin update" on storage.objects;
create policy "site-media admin update" on storage.objects
  for update to authenticated using (bucket_id = 'site-media' and public.is_admin()) with check (bucket_id = 'site-media' and public.is_admin());

drop policy if exists "site-media admin delete" on storage.objects;
create policy "site-media admin delete" on storage.objects
  for delete to authenticated using (bucket_id = 'site-media' and public.is_admin());

-- ---------- events: date and place for items of type 'event' ----------
alter table public.news add column if not exists event_date date;
alter table public.news add column if not exists event_location text check (event_location is null or char_length(event_location) <= 160);