-- ─── Noesis: Criar tabela push_subscriptions ─────────────────────
-- Execute no SQL Editor do Supabase → clique em Run.

create table if not exists push_subscriptions (
  id           uuid        primary key default gen_random_uuid(),
  user_id      uuid        not null references profiles(id) on delete cascade,
  endpoint     text        not null unique,
  auth_key     text        not null,
  p256dh_key   text        not null,
  created_at   timestamptz not null default now()
);

-- Habilitar Row Level Security (RLS)
alter table push_subscriptions enable row level security;

-- Inserção: apenas o dono autênticado pode registrar um dispositivo para si
create policy "push_insert" on push_subscriptions
  for insert
  with check (auth.uid() = user_id);

-- Seleção: Apenas o dono
create policy "push_select" on push_subscriptions
  for select
  using (auth.uid() = user_id);

-- Deleção: Apenas o dono
create policy "push_delete" on push_subscriptions
  for delete
  using (auth.uid() = user_id);
