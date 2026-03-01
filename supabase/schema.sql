-- ─── Noesis Database Schema (v2) ─────────────────────────────────────────────
-- Rode no SQL Editor do Supabase: cole tudo e clique em Run.

-- ─── Limpar versão anterior (se existir) ─────────────────────────────────────
drop trigger if exists on_auth_user_created on auth.users;
drop function if exists handle_new_user();
drop table if exists user_items cascade;
drop table if exists shop_items cascade;
drop table if exists friendships cascade;
drop table if exists daily_sessions cascade;
drop table if exists profiles cascade;

-- ─── Profiles ────────────────────────────────────────────────────────────────
create table profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  display_name  text not null default 'Noesia',
  email         text,
  nous_coins    integer not null default 0,
  score         integer not null default 0,
  streak        integer not null default 0,
  shield_count  integer not null default 0,
  friend_id     text unique not null,
  avatar_config jsonb not null default '{"body":"body_01","hair":"hair_short","shirt":"shirt_blue","accessory":"none","shoes":"shoes_white"}'::jsonb,
  word_count    integer not null default 3,
  created_at    timestamptz not null default now()
);

-- ─── Trigger: criar perfil automaticamente no cadastro ───────────────────────
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name      text;
  v_friend_id text;
  v_suffix    text;
begin
  -- Nome: usa metadata se disponível, senão parte do email
  v_name := coalesce(
    nullif(trim(new.raw_user_meta_data->>'display_name'), ''),
    split_part(new.email, '@', 1),
    'Usuário'
  );

  -- Friend ID: nome + 6 chars únicos do UUID (sem hífens)
  v_suffix    := upper(substring(replace(new.id::text, '-', ''), 1, 6));
  v_friend_id := v_name || '#' || v_suffix;

  insert into public.profiles (id, display_name, email, friend_id)
  values (new.id, v_name, new.email, v_friend_id);

  return new;
exception when others then
  raise log 'Noesis handle_new_user error for %: %', new.id, sqlerrm;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ─── Daily Sessions ───────────────────────────────────────────────────────────
create table daily_sessions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references profiles(id) on delete cascade,
  words       text[] not null,
  viewed_at   timestamptz not null default now(),
  unlocks_at  timestamptz not null,
  recalled_at timestamptz,
  answers     text[],
  score       integer not null default 0,
  success     boolean,
  created_at  timestamptz not null default now()
);
create index daily_sessions_user_idx on daily_sessions(user_id);

-- ─── Friendships ─────────────────────────────────────────────────────────────
create table friendships (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references profiles(id) on delete cascade,
  friend_id  uuid not null references profiles(id) on delete cascade,
  status     text not null default 'pending'
               check (status in ('pending','accepted','blocked')),
  created_at timestamptz not null default now(),
  unique(user_id, friend_id)
);

-- ─── Shop Items ───────────────────────────────────────────────────────────────
create table shop_items (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  description text not null default '',
  category    text not null
                check (category in ('shield','hair','shirt','shoes','accessory','item')),
  price_nous  integer not null default 100,
  price_brl   numeric(8,2),
  asset_key   text not null,
  preview_url text,
  created_at  timestamptz not null default now()
);

-- ─── User Items (inventário) ──────────────────────────────────────────────────
create table user_items (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references profiles(id) on delete cascade,
  item_id    uuid not null references shop_items(id) on delete cascade,
  equipped   boolean not null default false,
  created_at timestamptz not null default now(),
  unique(user_id, item_id)
);

-- ─── Row Level Security ───────────────────────────────────────────────────────
alter table profiles       enable row level security;
alter table daily_sessions enable row level security;
alter table friendships    enable row level security;
alter table shop_items     enable row level security;
alter table user_items     enable row level security;

-- profiles: leitura pública, escrita só do dono
create policy "profiles_select" on profiles for select using (true);
create policy "profiles_insert" on profiles for insert with check (auth.uid() = id);
create policy "profiles_update" on profiles for update using (auth.uid() = id);

-- daily_sessions: privado ao dono
create policy "sessions_all" on daily_sessions for all using (auth.uid() = user_id);

-- friendships: partes envolvidas podem ver
create policy "friendships_select" on friendships for select
  using (auth.uid() = user_id or auth.uid() = friend_id);
create policy "friendships_insert" on friendships for insert
  with check (auth.uid() = user_id);
create policy "friendships_update" on friendships for update
  using (auth.uid() = user_id or auth.uid() = friend_id);

-- shop_items: leitura pública
create policy "shop_select" on shop_items for select using (true);

-- user_items: privado ao dono
create policy "inventory_all" on user_items for all using (auth.uid() = user_id);

-- ─── Messages (chat entre amigos) ───────────────────────────────────────────
create table if not exists messages (
  id           uuid primary key default gen_random_uuid(),
  sender_id    uuid not null references profiles(id) on delete cascade,
  recipient_id uuid not null references profiles(id) on delete cascade,
  content      text not null,
  read_at      timestamptz,
  created_at   timestamptz not null default now()
);
create index if not exists messages_pair_idx on messages(sender_id, recipient_id);
create index if not exists messages_created_idx on messages(created_at);

alter table messages enable row level security;
create policy "messages_select" on messages for select
  using (auth.uid() = sender_id or auth.uid() = recipient_id);
create policy "messages_insert" on messages for insert
  with check (auth.uid() = sender_id);
create policy "messages_update" on messages for update
  using (auth.uid() = recipient_id);

-- ─── Seed: Itens da loja ──────────────────────────────────────────────────────
insert into shop_items (name, description, category, price_nous, asset_key) values
  ('Escudo Bronze',   'Protege 1 ofensiva',            'shield',    150, 'shield_bronze'),
  ('Escudo Prata',    'Protege 2 ofensivas',           'shield',    300, 'shield_silver'),
  ('Escudo Ouro',     'Protege 5 ofensivas',           'shield',    600, 'shield_gold'),
  ('Cabelo Cacheado', 'Cachos volumosos',              'hair',      200, 'hair_curly'),
  ('Cabelo Longo',    'Liso e comprido',               'hair',      200, 'hair_long'),
  ('Camisa Roxa',     'Camisa esportiva roxa',         'shirt',     150, 'shirt_purple'),
  ('Camisa Vermelha', 'Street style vermelho',         'shirt',     150, 'shirt_red'),
  ('Óculos Redondos', 'Intelectual e estiloso',        'accessory', 180, 'acc_glasses_round'),
  ('Coroa Dourada',   'Para verdadeiros campeões',     'accessory', 500, 'acc_crown_gold'),
  ('Tênis Branco',    'Clássico e minimalista',        'shoes',     120, 'shoes_white'),
  ('Bota Preta',      'Couro premium',                 'shoes',     200, 'shoes_black_boot'),
  ('Espada Mágica',   'Item: espada reluzente',        'item',      350, 'item_sword'),
  ('Grimório',        'Item: livro antigo',            'item',      350, 'item_book'),
  ('Cajado',          'Item: cajado mágico',           'item',      400, 'item_staff');
