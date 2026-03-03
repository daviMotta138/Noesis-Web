-- Idempotent fix: ensure badge tables exist and recreate get_user_badges safely
-- Run this in Supabase SQL Editor or with supabase CLI

-- Ensure minimal `position_badges` table exists (only columns used by RPC)
create table if not exists position_badges (
  badge_type text primary key,
  name text not null,
  icon_emoji text not null,
  color text not null default '#FFD700',
  rarity text not null default 'common'
);

-- Ensure minimal `user_badges` table exists with required columns
create table if not exists user_badges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  badge_type text not null,
  earned_at timestamptz not null default now(),
  position integer,
  displayed boolean not null default true
);

create index if not exists idx_user_badges_user on user_badges(user_id);
create index if not exists idx_user_badges_displayed on user_badges(displayed);
create index if not exists idx_user_badges_earned on user_badges(earned_at);

-- Recreate get_user_badges RPC (quotes around "position" to avoid keyword parsing)
create or replace function get_user_badges(p_user_id uuid)
returns table (
  badge_type text,
  name text,
  icon_emoji text,
  color text,
  rarity text,
  earned_at timestamptz,
  "position" integer,
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
    coalesce(pb.name, ub.badge_type) as name,
    coalesce(pb.icon_emoji, '') as icon_emoji,
    coalesce(pb.color, '#FFD700') as color,
    coalesce(pb.rarity, 'common') as rarity,
    ub.earned_at,
    ub.position as "position",
    ub.displayed
  from user_badges ub
  left join position_badges pb on ub.badge_type = pb.badge_type
  where ub.user_id = p_user_id and ub.displayed = true
  order by ub.earned_at desc;
end;
$$;

-- Grants
grant execute on function get_user_badges(uuid) to authenticated;

-- Helpful: recreate award function if needed (idempotent minimal)
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
  -- ensure badge_type exists in position_badges, otherwise insert a placeholder
  if not exists (select 1 from position_badges where badge_type = p_badge_type) then
    insert into position_badges(badge_type, name, icon_emoji, color, rarity)
    values (p_badge_type, p_badge_type, '🏅', '#CCCCCC', 'common');
  end if;

  insert into user_badges(user_id, badge_type, position, earned_at)
  values (p_user_id, p_badge_type, p_position, now())
  on conflict do nothing;
end;
$$;

grant execute on function award_position_badge(uuid, text, integer, integer, integer) to authenticated, service_role;
