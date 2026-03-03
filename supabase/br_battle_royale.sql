-- Battle Royale: Memory Pairs mode (MVP migrations + RPCs)
-- Creates tables and core RPCs for matchmaking and play loop

create extension if not exists pgcrypto;

-- Matches
create table if not exists br_matches (
  id uuid primary key default gen_random_uuid(),
  host_id uuid,
  status text not null default 'waiting', -- waiting|playing|finished
  max_players integer not null default 8,
  grid_rows integer not null default 4,
  grid_cols integer not null default 6,
  deck_seed text,
  round_number integer not null default 1,
  cards_remaining integer,
  current_player_id uuid,
  created_at timestamptz not null default now(),
  started_at timestamptz,
  ended_at timestamptz
);

create index if not exists idx_br_matches_status on br_matches(status);

-- Players in a match
create table if not exists br_players (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references br_matches(id) on delete cascade,
  user_id uuid,
  display_name text,
  is_bot boolean not null default false,
  status text not null default 'waiting', -- waiting|playing|eliminated|left
  join_order integer,
  consecutive_hits integer not null default 0,
  total_score integer not null default 0,
  errors integer not null default 0,
  is_current_turn boolean not null default false,
  join_at timestamptz not null default now()
);

create index if not exists idx_br_players_match on br_players(match_id);

-- Cards (server stores hashed value to avoid exposing mapping directly)
create table if not exists br_cards (
  match_id uuid not null references br_matches(id) on delete cascade,
  idx integer not null,
  value_hash text not null,
  revealed boolean not null default false,
  primary key (match_id, idx)
);

-- Events for audit and replay
create table if not exists br_events (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references br_matches(id) on delete cascade,
  player_id uuid,
  event_type text not null,
  payload jsonb,
  created_at timestamptz not null default now()
);

-- Invites
create table if not exists br_invites (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references br_matches(id) on delete cascade,
  token text not null unique,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

-- Matchmaking queue: users waiting for automatic match creation
create table if not exists br_queue (
  user_id uuid primary key,
  display_name text,
  joined_at timestamptz not null default now()
);

-- Simple policies: authenticated users can read BR data
-- (RPCs handle authorization internally with security definer)
-- drop older policies to avoid recursion issues
alter table br_matches enable row level security;
alter table br_players enable row level security;
alter table br_cards enable row level security;
alter table br_events enable row level security;
alter table br_queue enable row level security; -- allow RLS on queue
alter table br_invites enable row level security; -- allow RLS on invites

-- ensure old policies are removed
drop policy if exists "public_select_matches" on br_matches;
drop policy if exists "players_select_if_participant" on br_players;
drop policy if exists "cards_select_if_participant" on br_cards;
drop policy if exists "events_select_if_participant" on br_events;

drop policy if exists "matches_select_authenticated" on br_matches;
drop policy if exists "players_select_authenticated" on br_players;
drop policy if exists "cards_select_authenticated" on br_cards;
drop policy if exists "events_select_authenticated" on br_events;

create policy "matches_select_authenticated" on br_matches for select using (auth.role() = 'authenticated');

create policy "players_select_authenticated" on br_players for select using (auth.role() = 'authenticated');

create policy "cards_select_authenticated" on br_cards for select using (auth.role() = 'authenticated');

create policy "events_select_authenticated" on br_events for select using (auth.role() = 'authenticated');

-- ensure policies are idempotent
-- queue policy
drop policy if exists "queue_select_authenticated" on br_queue;
create policy "queue_select_authenticated" on br_queue for select using (auth.role() = 'authenticated');
-- no insert policy for queue (users added via RPC)

-- invites should also be visible to authenticated users
-- drop prior invite policies too
drop policy if exists "invites_select_authenticated" on br_invites;
drop policy if exists "invites_insert_authenticated" on br_invites;
create policy "invites_select_authenticated" on br_invites for select using (auth.role() = 'authenticated');
-- insert policies require WITH CHECK
create policy "invites_insert_authenticated" on br_invites for insert with check (auth.role() = 'authenticated');

-- RPCs / Functions

-- create_br_match(host, max_players, rows, cols)
create or replace function create_br_match(p_host uuid, p_max_players integer default 8, p_rows integer default 4, p_cols integer default 6)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_match_id uuid;
begin
  insert into br_matches(host_id, max_players, grid_rows, grid_cols)
  values (p_host, p_max_players, p_rows, p_cols)
  returning id into v_match_id;
  return v_match_id;
end;
$$;

grant execute on function create_br_match(uuid, integer, integer, integer) to authenticated, service_role;

-- join_br_match(match_id, user_id, display_name, is_bot)
create or replace function join_br_match(p_match_id uuid, p_user_id uuid, p_display_name text default null, p_is_bot boolean default false)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order int;
  v_player_id uuid;
begin
  select coalesce(max(join_order),0)+1 into v_order from br_players where match_id = p_match_id;
  insert into br_players(match_id, user_id, display_name, is_bot, join_order)
  values (p_match_id, p_user_id, coalesce(p_display_name, 'Player'), p_is_bot, v_order)
  returning id into v_player_id;

  insert into br_events(match_id, player_id, event_type, payload) 
  values (p_match_id, v_player_id, 'joined', json_build_object('join_order', v_order));

  -- if first player, set as current
  if v_order = 1 then
    update br_matches set current_player_id = v_player_id where id = p_match_id;
    update br_players set is_current_turn = (id = v_player_id) where match_id = p_match_id;
  end if;

  return v_player_id;
end;
$$;

grant execute on function join_br_match(uuid, uuid, text, boolean) to authenticated, service_role;

-- start_br_match(match_id) - sets status, seed, creates cards
create or replace function start_br_match(p_match_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rows int; v_cols int; v_count int; v_seed text; i int;
begin
  select grid_rows, grid_cols into v_rows, v_cols from br_matches where id = p_match_id;
  v_count := v_rows * v_cols;
  v_seed := gen_random_uuid()::text;

  update br_matches set status = 'playing', deck_seed = v_seed, cards_remaining = v_count, started_at = now() where id = p_match_id;

  -- create cards with hashed values: pairs generated by hashing seed and pair index
  delete from br_cards where match_id = p_match_id;
  for i in 0..(v_count-1) loop
    -- value_index: floor(i/2) so each pair shares same value_hash
    -- ensure digest receives a bytea input and explicit algorithm text to avoid ambiguous types
    insert into br_cards(match_id, idx, value_hash)
    values (p_match_id, i, encode(digest((v_seed || '|' || floor(i/2)::text)::bytea, 'sha256'::text), 'hex'));
  end loop;

  insert into br_events(match_id, event_type, payload) 
  values (p_match_id, 'match_started', json_build_object('seed', v_seed));
end;
$$;

grant execute on function start_br_match(uuid) to authenticated, service_role;

-- helper: advance_turn(match_id) - moves current_player to next active player

-- matchmaking helpers

-- enqueue_player(user, display_name) -> returns {match_id, queue_count, needed}
create or replace function enqueue_player(p_user_id uuid, p_display_name text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_match uuid;
  v_count int;
  v_needed int;
  rec record;
begin
  -- ensure user not already queued
  delete from br_queue where user_id = p_user_id;
  insert into br_queue(user_id, display_name) values (p_user_id, p_display_name);
  select count(*) into v_count from br_queue;

  -- default threshold (minimum 2 to start, or 4?) using 4
  v_needed := 4 - v_count;
  if v_needed <= 0 then
    -- create new match with default grid 4x6, max_players 8
    v_match := create_br_match(p_user_id, 8, 4, 6);
    -- join up to 8 players from queue
    for rec in select * from br_queue order by joined_at limit 8 loop
      perform join_br_match(v_match, rec.user_id, rec.display_name, false);
    end loop;
    delete from br_queue where user_id in (select user_id from br_queue order by joined_at limit 8);
    return jsonb_build_object('match_id', v_match, 'queue_count', 0, 'needed', 0);
  end if;
  return jsonb_build_object('match_id', null, 'queue_count', v_count, 'needed', v_needed);
end;
$$;

grant execute on function enqueue_player(uuid, text) to authenticated, service_role;

-- remove user from queue
create or replace function leave_queue(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from br_queue where user_id = p_user_id;
end;
$$;

grant execute on function leave_queue(uuid) to authenticated, service_role;

-- create_invite(match_id, ttl_seconds)
create or replace function create_br_invite(p_match_id uuid, p_ttl integer default 30)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_token text := gen_random_uuid()::text;
begin
  insert into br_invites(match_id, token, expires_at)
  values (p_match_id, v_token, now() + (p_ttl || ' seconds')::interval);
  return v_token;
end;
$$;

grant execute on function create_br_invite(uuid, integer) to authenticated, service_role;

-- join by invite token
create or replace function join_br_match_by_token(p_token text, p_user_id uuid, p_display_name text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_match uuid;
  v_status text;
  v_player uuid;
begin
  select match_id into v_match from br_invites where token = p_token and expires_at > now();
  if v_match is null then
    raise exception 'invalid_or_expired_token';
  end if;
  select status into v_status from br_matches where id = v_match;
  if v_status <> 'waiting' then
    raise exception 'match_not_open';
  end if;
  v_player := join_br_match(v_match, p_user_id, p_display_name, false);
  return jsonb_build_object('match_id', v_match, 'player_id', v_player);
end;
$$;

grant execute on function join_br_match_by_token(text, uuid, text) to authenticated, service_role;

create or replace function advance_turn(p_match_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_current uuid;
  v_next uuid;
begin
  select current_player_id into v_current from br_matches where id = p_match_id;
  select id into v_next from br_players where match_id = p_match_id and status = 'playing' and id <> v_current order by join_order asc limit 1;
  if v_next is null then
    -- wrap: pick first
    select id into v_next from br_players where match_id = p_match_id and status = 'playing' order by join_order asc limit 1;
  end if;
  update br_matches set current_player_id = v_next where id = p_match_id;
  update br_players set is_current_turn = (id = v_next) where match_id = p_match_id;
  insert into br_events(match_id, event_type, payload) 
  values (p_match_id, 'turn_pass', json_build_object('from', v_current, 'to', v_next));
  return v_next;
end;
$$;

grant execute on function advance_turn(uuid) to authenticated, service_role;

-- report_pair(match_id, player_id, idx1, idx2) - player reports two indices they flipped
create or replace function report_pair(p_match_id uuid, p_player_id uuid, p_idx1 integer, p_idx2 integer)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_hash1 text; v_hash2 text; v_next uuid; v_score_increment int := 1;
  v_cards_left int;
  v_consec int;
begin
  -- validation
  perform 1 from br_players where id = p_player_id and match_id = p_match_id and status = 'playing';
  if not found then
    return json_build_object('error','player_not_in_match');
  end if;

  select value_hash into v_hash1 from br_cards where match_id = p_match_id and idx = p_idx1 for update;
  select value_hash into v_hash2 from br_cards where match_id = p_match_id and idx = p_idx2 for update;

  if v_hash1 is null or v_hash2 is null then
    return json_build_object('error','invalid_index');
  end if;

  if v_hash1 = v_hash2 then
    -- pair found
    update br_cards set revealed = true where match_id = p_match_id and idx in (p_idx1, p_idx2);
    update br_players set consecutive_hits = consecutive_hits + 1 where id = p_player_id;
    select consecutive_hits into v_consec from br_players where id = p_player_id;
    -- score multiplier: 2^(consecutive_hits-1)
    v_score_increment := greatest(1, (2 ^ (v_consec - 1))::int);
    update br_players set total_score = total_score + v_score_increment where id = p_player_id;
    update br_matches set cards_remaining = cards_remaining - 2 where id = p_match_id;
    insert into br_events(match_id, player_id, event_type, payload) 
    values (p_match_id, p_player_id, 'pair_found', json_build_object('idx1', p_idx1, 'idx2', p_idx2, 'score_inc', v_score_increment));

    select cards_remaining into v_cards_left from br_matches where id = p_match_id;
    if v_cards_left <= 0 then
      -- end round
      insert into br_events(match_id, event_type, payload) 
      values (p_match_id, 'round_end', json_build_object('round', (select round_number from br_matches where id = p_match_id)));
      -- call end_round_and_redistribute
      perform end_round_and_redistribute(p_match_id);
      return json_build_object('result','match','continue_turn',true,'score_inc', v_score_increment);
    end if;

    return json_build_object('result','match','continue_turn',true,'score_inc', v_score_increment);
  else
    -- no match
    update br_players set consecutive_hits = 0, errors = errors + 1 where id = p_player_id;
    insert into br_events(match_id, player_id, event_type, payload) 
    values (p_match_id, p_player_id, 'no_match', json_build_object('idx1', p_idx1, 'idx2', p_idx2));
    -- advance turn
    v_next := advance_turn(p_match_id);
    return json_build_object('result','no_match','continue_turn',false,'next', v_next);
  end if;
end;
$$;

grant execute on function report_pair(uuid, uuid, integer, integer) to authenticated, service_role;

-- end_round_and_redistribute(match_id)
create or replace function end_round_and_redistribute(p_match_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int;
  v_last_player uuid;
  v_remaining int;
begin
  -- compute mini-ranking and eliminate lowest scorer(s)
  select count(*) into v_count from br_players where match_id = p_match_id and status = 'playing';
  if v_count = 0 then
    update br_matches set status = 'finished', ended_at = now() where id = p_match_id;
    return;
  end if;

  -- eliminate the player with lowest total_score (tie-breaker: higher errors)
  select id into v_last_player from br_players where match_id = p_match_id and status = 'playing' order by total_score asc, errors desc limit 1;
  update br_players set status = 'eliminated' where id = v_last_player;
  insert into br_events(match_id, player_id, event_type, payload) 
  values (p_match_id, v_last_player, 'player_eliminated', json_build_object('player', v_last_player));

  select count(*) into v_remaining from br_players where match_id = p_match_id and status = 'playing';
  if v_remaining <= 1 then
    -- finish match
    update br_matches set status = 'finished', ended_at = now() where id = p_match_id;
    insert into br_events(match_id, event_type, payload) 
    values (p_match_id, 'match_end', json_build_object('winner', (select id from br_players where match_id = p_match_id and status = 'playing' limit 1)));
    return;
  end if;

  -- else: redistribute deck and start new round
  update br_matches set round_number = round_number + 1 where id = p_match_id;
  -- reset cards: rebuild using same seed
  delete from br_cards where match_id = p_match_id;
  perform start_br_match(p_match_id);
end;
$$;

grant execute on function end_round_and_redistribute(uuid) to authenticated, service_role;

-- get_match_state(match_id, player_id) -> returns snapshot JSON
create or replace function get_match_state(p_match_id uuid, p_player_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_match record;
  v_players jsonb;
  v_cards jsonb;
begin
  select * into v_match from br_matches where id = p_match_id;
  select jsonb_agg(to_jsonb(p) - 'match_id') into v_players from (select id, display_name, is_bot, status, consecutive_hits, total_score, errors, is_current_turn from br_players where match_id = p_match_id) p;
  select jsonb_agg(to_jsonb(c) - 'value_hash') into v_cards from (select idx, revealed from br_cards where match_id = p_match_id order by idx) c;
  return jsonb_build_object('match', to_jsonb(v_match), 'players', v_players, 'cards', v_cards);
end;
$$;

grant execute on function get_match_state(uuid, uuid) to authenticated, service_role;
