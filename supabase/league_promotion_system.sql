-- ─── Liga Promotion/Demotion System ────────────────────────────────────────
-- This migration adds support for automatic league promotions and demotions
-- based on ranking at the end of each week (Sunday 20h)

-- ─── Add columns to profiles table ────────────────────────────────────────
alter table profiles 
add column if not exists league text not null default 'Bronze'
  check (league in ('Bronze', 'Prata', 'Ouro', 'Diamante', 'Campeonato')),
add column if not exists previous_league text,
add column if not exists promotion_timestamp timestamptz,
add column if not exists demotion_timestamp timestamptz,
add column if not exists last_season_rank integer,
add column if not exists promotion_seen boolean not null default false,
add column if not exists demotion_seen boolean not null default false;

-- ─── Create table to track season history ────────────────────────────────
create table if not exists season_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  season_week integer not null,
  season_year integer not null,
  league_before text not null,
  league_after text not null,
  rank_position integer,
  score integer,
  promoted boolean not null default false,
  demoted boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists season_history_user_idx on season_history(user_id);
create index if not exists season_history_season_idx on season_history(season_year, season_week);

-- ─── RLS for season_history ───────────────────────────────────────────────
alter table season_history enable row level security;
create policy "season_select" on season_history for select
  using (auth.uid() = user_id or true);
create policy "season_insert" on season_history for insert
  with check (true);

-- ─── Function to process league promotions and demotions ──────────────────
create or replace function process_league_promotions()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_league text;
  v_user_rec record;
  v_league_data record;
  v_total_count integer;
  v_pos integer;
  v_status text;
  v_new_league text;
  v_promoted boolean;
  v_demoted boolean;
begin
  -- Loop through all leagues
  for v_league in select unnest(array['Bronze', 'Prata', 'Ouro', 'Diamante', 'Campeonato'])
  loop
    -- Get all users in this league, ordered by score DESC
    for v_user_rec in
      select id, display_name, score, league
      from profiles
      where league = v_league
      order by score desc
    loop
      -- Get total users in this league
      select count(*)::integer into v_total_count
      from profiles
      where league = v_league;

      -- Calculate position
      select row_number() over (order by score desc)::integer into v_pos
      from profiles
      where league = v_league and id = v_user_rec.id;

      v_new_league := v_league;
      v_promoted := false;
      v_demoted := false;

      -- Determine promotion/demotion based on league and position
      if v_league = 'Bronze' then
        if v_pos <= v_total_count * 0.3 then
          v_new_league := 'Prata';
          v_promoted := true;
        end if;
      elsif v_league = 'Prata' then
        if v_pos <= v_total_count * 0.2 then
          v_new_league := 'Ouro';
          v_promoted := true;
        elsif v_pos > v_total_count * 0.8 then
          v_new_league := 'Bronze';
          v_demoted := true;
        end if;
      elsif v_league = 'Ouro' then
        if v_pos <= v_total_count * 0.1 then
          v_new_league := 'Diamante';
          v_promoted := true;
        elsif v_pos > v_total_count * 0.7 then
          v_new_league := 'Prata';
          v_demoted := true;
        end if;
      elsif v_league = 'Diamante' then
        if v_pos <= v_total_count * 0.05 then
          v_new_league := 'Campeonato';
          v_promoted := true;
        elsif v_pos > v_total_count * 0.5 then
          v_new_league := 'Ouro';
          v_demoted := true;
        end if;
      elsif v_league = 'Campeonato' then
        if v_pos > v_total_count * 0.3 then
          v_new_league := 'Diamante';
          v_demoted := true;
        end if;
      end if;

      -- Update user if league changed
      if v_new_league <> v_league then
        update profiles
        set 
          previous_league = league,
          league = v_new_league,
          promotion_timestamp = case when v_promoted then now() else null end,
          demotion_timestamp = case when v_demoted then now() else null end,
          promotion_seen = false,
          demotion_seen = false,
          last_season_rank = v_pos
        where id = v_user_rec.id;

        -- Record in season history
        insert into season_history (user_id, season_week, season_year, league_before, league_after, rank_position, score, promoted, demoted)
        values (
          v_user_rec.id,
          extract(week from now())::integer,
          extract(year from now())::integer,
          v_league,
          v_new_league,
          v_pos,
          v_user_rec.score,
          v_promoted,
          v_demoted
        );

        -- Award badges for achievements
        if v_promoted then
          perform award_position_badge(v_user_rec.id, 'master_promoter', v_pos, extract(week from now())::integer, extract(year from now())::integer);
        end if;

        -- Award badges for top positions in Campeonato
        if v_new_league = 'Campeonato' then
          if v_pos = 1 then
            perform award_position_badge(v_user_rec.id, 'champion_rank1', v_pos, extract(week from now())::integer, extract(year from now())::integer);
            perform award_position_badge(v_user_rec.id, 'season_winner', v_pos, extract(week from now())::integer, extract(year from now())::integer);
          elsif v_pos = 2 then
            perform award_position_badge(v_user_rec.id, 'champion_rank2', v_pos, extract(week from now())::integer, extract(year from now())::integer);
          elsif v_pos = 3 then
            perform award_position_badge(v_user_rec.id, 'champion_rank3', v_pos, extract(week from now())::integer, extract(year from now())::integer);
          elsif v_pos <= 5 then
            perform award_position_badge(v_user_rec.id, 'elite_top5', v_pos, extract(week from now())::integer, extract(year from now())::integer);
          elsif v_pos <= 10 then
            perform award_position_badge(v_user_rec.id, 'elite_top10', v_pos, extract(week from now())::integer, extract(year from now())::integer);
          end if;
        end if;
      else
        -- Update last_season_rank even if no promotion/demotion
        update profiles
        set last_season_rank = v_pos
        where id = v_user_rec.id;
      end if;
    end loop;
  end loop;
end;
$$;

-- ─── Function to check and trigger promotions (to be called by scheduled job)
-- This is a helper that can be called to manually trigger the promotion process
create or replace function check_league_promotions()
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  perform process_league_promotions();
  
  select count(*) into v_count
  from profiles
  where promotion_timestamp > now() - interval '1 minute'
    or demotion_timestamp > now() - interval '1 minute';
  
  return json_build_object('processed', true, 'updated_count', v_count);
end;
$$;

-- ─── Cleanup function to mark promotions/demotions as seen ────────────────
create or replace function mark_promotion_seen(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update profiles
  set promotion_seen = true
  where id = p_user_id and promotion_seen = false;
end;
$$;

create or replace function mark_demotion_seen(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update profiles
  set demotion_seen = true
  where id = p_user_id and demotion_seen = false;
end;
$$;

-- ─── Grant execute permissions ────────────────────────────────────────────
grant execute on function check_league_promotions() to authenticated;
grant execute on function mark_promotion_seen(uuid) to authenticated;
grant execute on function mark_demotion_seen(uuid) to authenticated;

-- Notes for Vercel Cron Jobs:
-- Add to vercel.json to trigger promotions every Sunday at 20:00 UTC:
-- {
--   "crons": [
--     {
--       "path": "/api/promotions",
--       "schedule": "0 20 * * 0"
--     }
--   ]
-- }
--
-- Create /pages/api/promotions.ts that calls:
-- const result = await supabase.rpc('check_league_promotions');
