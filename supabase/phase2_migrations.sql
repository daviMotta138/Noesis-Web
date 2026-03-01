-- ─── Noesis: Criação das tabelas de Phase 2 ────────────────────────────────
-- Execute no SQL Editor do Supabase. Seguro de rodar múltiplas vezes.

-- ─── 1. Notificações ──────────────────────────────────────────────────────────
create table if not exists notifications (
  id         uuid        primary key default gen_random_uuid(),
  user_id    uuid        not null references profiles(id) on delete cascade,
  type       text        not null, -- 'friend_request','nous_earned','streak_broken','shield_used','league_up','league_down','system'
  title      text        not null,
  body       text        not null default '',
  read_at    timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists notifications_user_idx on notifications(user_id, created_at desc);

alter table notifications enable row level security;

drop policy if exists "notifications_select" on notifications;
create policy "notifications_select" on notifications
  for select using (auth.uid() = user_id);

drop policy if exists "notifications_insert" on notifications;
create policy "notifications_insert" on notifications
  for insert with check (auth.uid() = user_id);

drop policy if exists "notifications_update" on notifications;
create policy "notifications_update" on notifications
  for update using (auth.uid() = user_id);

drop policy if exists "notifications_delete" on notifications;
create policy "notifications_delete" on notifications
  for delete using (auth.uid() = user_id);

-- Allow service role to insert notifications for any user (e.g. from triggers)
drop policy if exists "notifications_service_insert" on notifications;
create policy "notifications_service_insert" on notifications
  for insert with check (true);

-- ─── 2. Avatar URL (foto de perfil) ──────────────────────────────────────────
alter table profiles add column if not exists avatar_url text;

-- ─── 3. Shields: garantir coluna shield_count ─────────────────────────────────
-- Já existe no schema mas por segurança:
alter table profiles add column if not exists shield_count integer not null default 0;
