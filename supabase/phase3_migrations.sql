-- ─── Noesis: Criação das tabelas de Phase 3 ────────────────────────────────
-- Execute no SQL Editor do Supabase. Seguro de rodar múltiplas vezes.

-- ─── 1. Banners de Atualização (Home Carousel) ────────────────────────────────
create table if not exists update_banners (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  image_url text not null,
  link_url text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table update_banners enable row level security;

drop policy if exists "Banners are viewable by everyone." on update_banners;
create policy "Banners are viewable by everyone."
  on update_banners for select
  using ( is_active = true );

drop policy if exists "Only admins can insert banners." on update_banners;
create policy "Only admins can insert banners."
  on update_banners for insert
  with check ( exists (
    select 1 from profiles where id = auth.uid() and is_admin = true
  ) );

drop policy if exists "Only admins can update banners." on update_banners;
create policy "Only admins can update banners."
  on update_banners for update
  using ( exists (
    select 1 from profiles where id = auth.uid() and is_admin = true
  ) );

drop policy if exists "Only admins can delete banners." on update_banners;
create policy "Only admins can delete banners."
  on update_banners for delete
  using ( exists (
    select 1 from profiles where id = auth.uid() and is_admin = true
  ) );

-- ─── 2. Sistema de Ligas (Ranking) ──────────────────────────────────────────
-- Adiciona a coluna de liga na tabela profiles se não existir
alter table profiles add column if not exists league text not null default 'Bronze';
alter table profiles add column if not exists league_points integer not null default 0;

-- A constraint para garantir apenas ligas válidas
alter table profiles drop constraint if exists valid_leagues;
alter table profiles add constraint valid_leagues 
  check (league in ('Bronze', 'Prata', 'Ouro', 'Diamante', 'Campeonato'));

-- ─── 3. Bucket para os Thumbnails dos Banners ────────────────────────────────
insert into storage.buckets (id, name, public) 
values ('banners', 'banners', true)
on conflict (id) do nothing;

drop policy if exists "Banners images are publicly accessible." on storage.objects;
create policy "Banners images are publicly accessible."
  on storage.objects for select
  using ( bucket_id = 'banners' );

drop policy if exists "Only admins can upload banners." on storage.objects;
create policy "Only admins can upload banners."
  on storage.objects for insert
  with check ( bucket_id = 'banners' and exists (
    select 1 from profiles where id = auth.uid() and is_admin = true
  ) );

drop policy if exists "Only admins can update banners." on storage.objects;
create policy "Only admins can update banners."
  on storage.objects for update
  using ( bucket_id = 'banners' and exists (
    select 1 from profiles where id = auth.uid() and is_admin = true
  ) );

drop policy if exists "Only admins can delete banner images." on storage.objects;
create policy "Only admins can delete banner images."
  on storage.objects for delete
  using ( bucket_id = 'banners' and exists (
    select 1 from profiles where id = auth.uid() and is_admin = true
  ) );
