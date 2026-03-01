-- ─── Noesis: Criar tabela messages (chat entre amigos) ─────────────────────
-- Execute no SQL Editor do Supabase → clique em Run.
-- Seguro de rodar mesmo se a tabela já existir (usa IF NOT EXISTS).

-- ─── Tabela ───────────────────────────────────────────────────────────────────
create table if not exists messages (
  id           uuid        primary key default gen_random_uuid(),
  sender_id    uuid        not null references profiles(id) on delete cascade,
  recipient_id uuid        not null references profiles(id) on delete cascade,
  content      text        not null check (char_length(content) between 1 and 2000),
  read_at      timestamptz,                       -- null = não lida
  created_at   timestamptz not null default now()
);

-- ─── Índices (performance nas queries do chat) ────────────────────────────────
create index if not exists messages_pair_idx
  on messages(sender_id, recipient_id);

create index if not exists messages_recipient_idx
  on messages(recipient_id);

create index if not exists messages_created_idx
  on messages(created_at);

-- ─── Row Level Security ───────────────────────────────────────────────────────
alter table messages enable row level security;

-- Leitura: só quem enviou ou recebeu
create policy "messages_select" on messages
  for select
  using (auth.uid() = sender_id or auth.uid() = recipient_id);

-- Inserção: só pode enviar mensagens de si mesmo
create policy "messages_insert" on messages
  for insert
  with check (auth.uid() = sender_id);

-- Atualização (ex: marcar como lida): só o destinatário
create policy "messages_update" on messages
  for update
  using (auth.uid() = recipient_id);

-- Deleção: sender ou recipient podem apagar
create policy "messages_delete" on messages
  for delete
  using (auth.uid() = sender_id or auth.uid() = recipient_id);

-- ─── Realtime ─────────────────────────────────────────────────────────────────
-- Habilitar replicação para o canal realtime do chat funcionar
alter publication supabase_realtime add table messages;
