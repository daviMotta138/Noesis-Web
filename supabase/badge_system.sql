-- ─── Badge System (Broches de Posição) ─────────────────────────────────────
-- Sistema de recompensa visual para usuários que atingem posições específicas

-- ─── Criar tabela de badges disponíveis ────────────────────────────────────
create table if not exists position_badges (
  id uuid primary key default gen_random_uuid(),
  badge_type text not null unique
    check (badge_type in (
      'champion_rank1',      -- 1º lugar
      'champion_rank2',      -- 2º lugar
      'champion_rank3',      -- 3º lugar
      'elite_top10',         -- Top 10 em Campeonato
      'elite_top5',          -- Top 5 em Campeonato
      'master_promoter',     -- 5+ promoções
      'season_winner',       -- Vencedor de season
      'streak_master',       -- 30+ streak
      'climb_warrior'        -- Bronze → Campeonato
    )),
  name text not null,                       -- Nome do broche (ex: "Campeão")
  description text,                         -- Descrição
  icon_emoji text not null,                 -- Emoji do broche
  color text not null default '#FFD700',    -- Cor principal
  rarity text not null default 'common'     -- common, rare, epic, legendary
    check (rarity in ('common', 'rare', 'epic', 'legendary')),
  unlock_condition text,                    -- Descrição da condição
  created_at timestamptz not null default now()
);

create index idx_position_badges_type on position_badges(badge_type);

-- ─── Criar tabela de badges dos usuários ──────────────────────────────────
create table if not exists user_badges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  badge_type text not null references position_badges(badge_type) on delete cascade,
  earned_at timestamptz not null default now(),
  season_week integer,                      -- Semana/season quando ganhou
  season_year integer,                      -- Ano quando ganhou
  position integer,                         -- Posição que alcançou (1º, 2º, 3º, etc)
  displayed boolean not null default true,  -- Se está visível no perfil
  unique(user_id, badge_type, earned_at)
);

create index idx_user_badges_user on user_badges(user_id);
create index idx_user_badges_displayed on user_badges(displayed);
create index idx_user_badges_earned on user_badges(earned_at);

-- ─── RLS para user_badges ──────────────────────────────────────────────────
alter table position_badges enable row level security;
alter table user_badges enable row level security;

create policy "badges_select_public" on position_badges for select using (true);

create policy "user_badges_select_public" on user_badges for select using (true);
create policy "user_badges_insert_service" on user_badges for insert
  with check (true);
create policy "user_badges_update_own" on user_badges for update
  using (auth.uid() = user_id);

-- ─── Seed: Badges padrão ──────────────────────────────────────────────────
insert into position_badges (badge_type, name, description, icon_emoji, color, rarity, unlock_condition) values
  ('champion_rank1', 'Campeão Supremo', 'Alcançou o 1º lugar em Campeonato', '🥇', '#FFD700', 'legendary', 'Ficar em 1º lugar em Campeonato'),
  ('champion_rank2', 'Vice-Campeão', 'Alcançou o 2º lugar em Campeonato', '🥈', '#C0C0C0', 'epic', 'Ficar em 2º lugar em Campeonato'),
  ('champion_rank3', 'Bronze Honroso', 'Alcançou o 3º lugar em Campeonato', '🥉', '#CD7F32', 'epic', 'Ficar em 3º lugar em Campeonato'),
  ('elite_top10', 'Elite Domadora', 'Entrou top 10 em Campeonato', '⭐', '#00FFFF', 'rare', 'Ficar no top 10 em Campeonato'),
  ('elite_top5', 'Dominador Absoluto', 'Entrou top 5 em Campeonato', '💎', '#FF00FF', 'legendary', 'Ficar no top 5 em Campeonato'),
  ('master_promoter', 'Escalador Mestre', '5+ promoções em uma season', '📈', '#4ADE80', 'epic', 'Ser promovido 5 vezes na mesma temporada'),
  ('season_winner', 'Vencedor da Season', 'Venceu uma temporada completa', '👑', '#FF00FF', 'legendary', 'Terminar a season em 1º lugar'),
  ('streak_master', 'Mestre do Streak', 'Atingiu 30+ dias de streak', '🔥', '#FF6B6B', 'rare', 'Manter 30+ dias de streak'),
  ('climb_warrior', 'Guerreiro da Escalada', 'Subiu de Bronze até Campeonato', '⚔️', '#FF6B35', 'epic', 'Ser promovido de Bronze até Campeonato');

-- ─── Função para dar broche ao usuário ────────────────────────────────────
create or replace function award_position_badge(
  p_user_id uuid,
  p_badge_type text,
  p_position integer default null,
  p_season_week integer default null,
  p_season_year integer default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Verificar se badge existe
  if not exists (select 1 from position_badges where badge_type = p_badge_type) then
    raise exception 'Badge type % does not exist', p_badge_type;
  end if;

  -- Inserir badge se não existir já
  insert into user_badges (user_id, badge_type, position, season_week, season_year)
  values (p_user_id, p_badge_type, p_position, p_season_week, p_season_year)
  on conflict (user_id, badge_type, earned_at) do nothing;
end;
$$;

-- ─── Função para listar badges do usuário ──────────────────────────────────
create or replace function get_user_badges(p_user_id uuid)
returns table (
  badge_type text,
  name text,
  icon_emoji text,
  color text,
  rarity text,
  earned_at timestamptz,
  position integer,
  displayed boolean
)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  select 
    ub.badge_type,
    pb.name,
    pb.icon_emoji,
    pb.color,
    pb.rarity,
    ub.earned_at,
    ub.position,
    ub.displayed
  from user_badges ub
  join position_badges pb on ub.badge_type = pb.badge_type
  where ub.user_id = p_user_id and ub.displayed = true
  order by ub.earned_at desc;
end;
$$;

-- ─── Atualizar profiles para referenciar badges ────────────────────────────
-- (opcional - para cache rápido do broche em destaque)
alter table profiles add column if not exists featured_badge text;
alter table profiles add column if not exists badge_count integer default 0;

-- ─── Trigger para atualizar badge_count ────────────────────────────────────
create or replace function update_badge_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update profiles
  set badge_count = (
    select count(*) from user_badges
    where user_id = new.user_id and displayed = true
  )
  where id = new.user_id;
  return new;
end;
$$;

drop trigger if exists on_user_badge_insert on user_badges;
create trigger on_user_badge_insert
  after insert on user_badges
  for each row execute function update_badge_count();

-- ─── Grant permissions ────────────────────────────────────────────────────
grant execute on function award_position_badge(uuid, text, integer, integer, integer) to authenticated, service_role;
grant execute on function get_user_badges(uuid) to authenticated;

-- ─── Atualizar função de processamento de promoções ───────────────────────
-- Adicionar concessão de broches no final da função process_league_promotions()
-- Veja seção "ATUALIZAR PROCESS_LEAGUE_PROMOTIONS" abaixo

/*
  INSTRUÇÕES DE INTEGRAÇÃO:
  
  Na função process_league_promotions(), após atualizar profiles, adicione:
  
  -- Award badges for promotion
  if v_promoted then
    perform award_position_badge(v_user_rec.id, 'master_promoter');
  end if;
  
  -- Award badges for top positions in Campeonato
  if v_league = 'Campeonato' then
    if v_pos = 1 then
      perform award_position_badge(v_user_rec.id, 'champion_rank1', v_pos);
      perform award_position_badge(v_user_rec.id, 'season_winner');
    elsif v_pos = 2 then
      perform award_position_badge(v_user_rec.id, 'champion_rank2', v_pos);
    elsif v_pos = 3 then
      perform award_position_badge(v_user_rec.id, 'champion_rank3', v_pos);
    elsif v_pos <= 5 then
      perform award_position_badge(v_user_rec.id, 'elite_top5', v_pos);
    elsif v_pos <= 10 then
      perform award_position_badge(v_user_rec.id, 'elite_top10', v_pos);
    end if;
  end if;
*/
