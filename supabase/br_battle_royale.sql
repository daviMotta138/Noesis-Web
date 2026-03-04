-- ============================================================
-- Battle Royale: CLEAN MIGRATION (run this in Supabase SQL Editor)
-- Fixes: pgcrypto digest issue, adds all tables and RPCs fresh
-- ============================================================

-- 0. Clean up ghost queue entries from previous tests
DELETE FROM br_queue;

-- 1. Extensions
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2. Tables (drop-safe)
CREATE TABLE IF NOT EXISTS br_matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  host_id uuid,
  status text NOT NULL DEFAULT 'waiting',
  max_players integer NOT NULL DEFAULT 8,
  grid_rows integer NOT NULL DEFAULT 4,
  grid_cols integer NOT NULL DEFAULT 6,
  deck_seed text,
  round_number integer NOT NULL DEFAULT 1,
  cards_remaining integer,
  current_player_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  started_at timestamptz,
  ended_at timestamptz
);

CREATE TABLE IF NOT EXISTS br_players (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id uuid NOT NULL REFERENCES br_matches(id) ON DELETE CASCADE,
  user_id uuid,
  display_name text,
  is_bot boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'waiting',
  join_order integer,
  consecutive_hits integer NOT NULL DEFAULT 0,
  total_score integer NOT NULL DEFAULT 0,
  errors integer NOT NULL DEFAULT 0,
  is_current_turn boolean NOT NULL DEFAULT false,
  join_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS br_cards (
  match_id uuid NOT NULL REFERENCES br_matches(id) ON DELETE CASCADE,
  idx integer NOT NULL,
  value_hash text NOT NULL,
  revealed boolean NOT NULL DEFAULT false,
  PRIMARY KEY (match_id, idx)
);

CREATE TABLE IF NOT EXISTS br_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id uuid NOT NULL REFERENCES br_matches(id) ON DELETE CASCADE,
  player_id uuid,
  event_type text NOT NULL,
  payload jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS br_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id uuid NOT NULL REFERENCES br_matches(id) ON DELETE CASCADE,
  token text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS br_queue (
  user_id uuid PRIMARY KEY,
  display_name text,
  joined_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_br_matches_status ON br_matches(status);
CREATE INDEX IF NOT EXISTS idx_br_players_match ON br_players(match_id);

-- 3. RLS
ALTER TABLE br_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE br_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE br_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE br_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE br_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE br_invites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "br_matches_select" ON br_matches;
DROP POLICY IF EXISTS "br_players_select" ON br_players;
DROP POLICY IF EXISTS "br_cards_select" ON br_cards;
DROP POLICY IF EXISTS "br_events_select" ON br_events;
DROP POLICY IF EXISTS "br_queue_select" ON br_queue;
DROP POLICY IF EXISTS "br_invites_select" ON br_invites;
DROP POLICY IF EXISTS "br_invites_insert" ON br_invites;

CREATE POLICY "br_matches_select" ON br_matches FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "br_players_select" ON br_players FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "br_cards_select" ON br_cards FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "br_events_select" ON br_events FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "br_queue_select" ON br_queue FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "br_invites_select" ON br_invites FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "br_invites_insert" ON br_invites FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- 4. RPCs

-- create_br_match
CREATE OR REPLACE FUNCTION create_br_match(p_host uuid, p_max_players integer DEFAULT 8, p_rows integer DEFAULT 4, p_cols integer DEFAULT 6)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_id uuid;
BEGIN
  INSERT INTO br_matches(host_id, max_players, grid_rows, grid_cols)
  VALUES (p_host, p_max_players, p_rows, p_cols)
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;
GRANT EXECUTE ON FUNCTION create_br_match(uuid, integer, integer, integer) TO authenticated, service_role;

-- join_br_match
CREATE OR REPLACE FUNCTION join_br_match(p_match_id uuid, p_user_id uuid, p_display_name text DEFAULT NULL, p_is_bot boolean DEFAULT false)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_order int; v_pid uuid;
BEGIN
  SELECT COALESCE(MAX(join_order), 0) + 1 INTO v_order FROM br_players WHERE match_id = p_match_id;
  INSERT INTO br_players(match_id, user_id, display_name, is_bot, join_order, status)
  VALUES (p_match_id, p_user_id, COALESCE(p_display_name, 'Player'), p_is_bot, v_order, 'playing')
  RETURNING id INTO v_pid;
  -- first player gets the turn
  IF v_order = 1 THEN
    UPDATE br_matches SET current_player_id = v_pid WHERE id = p_match_id;
    UPDATE br_players SET is_current_turn = (id = v_pid) WHERE match_id = p_match_id;
  END IF;
  RETURN v_pid;
END;
$$;
GRANT EXECUTE ON FUNCTION join_br_match(uuid, uuid, text, boolean) TO authenticated, service_role;

-- start_br_match (NO pgcrypto digest — uses gen_random_uuid as seed, md5 for simple hashing)
CREATE OR REPLACE FUNCTION start_br_match(p_match_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_rows int; v_cols int; v_count int; v_seed text; i int; v_pair_idx int;
BEGIN
  SELECT grid_rows, grid_cols INTO v_rows, v_cols FROM br_matches WHERE id = p_match_id;
  v_count := v_rows * v_cols;
  v_seed := gen_random_uuid()::text;

  UPDATE br_matches
  SET status = 'playing', deck_seed = v_seed, cards_remaining = v_count, started_at = now()
  WHERE id = p_match_id;

  DELETE FROM br_cards WHERE match_id = p_match_id;
  FOR i IN 0..(v_count - 1) LOOP
    v_pair_idx := i / 2;
    -- Use md5 (always available) instead of pgcrypto digest
    INSERT INTO br_cards(match_id, idx, value_hash)
    VALUES (p_match_id, i, md5(v_seed || '|' || v_pair_idx::text));
  END LOOP;

  -- Update all players to 'playing' and reset scores for this round
  UPDATE br_players SET status = 'playing', consecutive_hits = 0 WHERE match_id = p_match_id AND status = 'waiting';

  INSERT INTO br_events(match_id, event_type, payload)
  VALUES (p_match_id, 'match_started', jsonb_build_object('seed', v_seed));
END;
$$;
GRANT EXECUTE ON FUNCTION start_br_match(uuid) TO authenticated, service_role;

-- advance_turn
CREATE OR REPLACE FUNCTION advance_turn(p_match_id uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_current uuid; v_next uuid;
BEGIN
  SELECT current_player_id INTO v_current FROM br_matches WHERE id = p_match_id;
  -- next active player after current
  SELECT id INTO v_next FROM br_players
  WHERE match_id = p_match_id AND status = 'playing' AND id <> v_current
  ORDER BY join_order ASC LIMIT 1;
  -- wrap around
  IF v_next IS NULL THEN
    SELECT id INTO v_next FROM br_players
    WHERE match_id = p_match_id AND status = 'playing'
    ORDER BY join_order ASC LIMIT 1;
  END IF;
  UPDATE br_matches SET current_player_id = v_next WHERE id = p_match_id;
  UPDATE br_players SET is_current_turn = (id = v_next) WHERE match_id = p_match_id;
  RETURN v_next;
END;
$$;
GRANT EXECUTE ON FUNCTION advance_turn(uuid) TO authenticated, service_role;

-- report_pair
CREATE OR REPLACE FUNCTION report_pair(p_match_id uuid, p_player_id uuid, p_idx1 integer, p_idx2 integer)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_hash1 text; v_hash2 text; v_next uuid;
  v_score_inc int := 1; v_cards_left int; v_consec int;
BEGIN
  -- verify player is active
  PERFORM 1 FROM br_players WHERE id = p_player_id AND match_id = p_match_id AND status = 'playing';
  IF NOT FOUND THEN RETURN jsonb_build_object('error', 'player_not_in_match'); END IF;

  SELECT value_hash INTO v_hash1 FROM br_cards WHERE match_id = p_match_id AND idx = p_idx1;
  SELECT value_hash INTO v_hash2 FROM br_cards WHERE match_id = p_match_id AND idx = p_idx2;

  IF v_hash1 IS NULL OR v_hash2 IS NULL THEN RETURN jsonb_build_object('error', 'invalid_index'); END IF;

  IF v_hash1 = v_hash2 THEN
    -- match!
    UPDATE br_cards SET revealed = true WHERE match_id = p_match_id AND idx IN (p_idx1, p_idx2);
    UPDATE br_players SET consecutive_hits = consecutive_hits + 1 WHERE id = p_player_id;
    SELECT consecutive_hits INTO v_consec FROM br_players WHERE id = p_player_id;
    -- combo: 2^(hits-1) capped by logic (1,2,4,8,16...)
    v_score_inc := GREATEST(1, POW(2, LEAST(v_consec - 1, 4))::int);
    UPDATE br_players SET total_score = total_score + v_score_inc WHERE id = p_player_id;
    UPDATE br_matches SET cards_remaining = cards_remaining - 2 WHERE id = p_match_id;

    INSERT INTO br_events(match_id, player_id, event_type, payload)
    VALUES (p_match_id, p_player_id, 'pair_found', jsonb_build_object('idx1', p_idx1, 'idx2', p_idx2, 'score_inc', v_score_inc));

    SELECT cards_remaining INTO v_cards_left FROM br_matches WHERE id = p_match_id;
    IF v_cards_left <= 0 THEN
      PERFORM end_round_and_redistribute(p_match_id);
    END IF;

    RETURN jsonb_build_object('result', 'match', 'continue_turn', true, 'score_inc', v_score_inc);
  ELSE
    -- no match
    UPDATE br_players SET consecutive_hits = 0, errors = errors + 1 WHERE id = p_player_id;
    INSERT INTO br_events(match_id, player_id, event_type, payload)
    VALUES (p_match_id, p_player_id, 'no_match', jsonb_build_object('idx1', p_idx1, 'idx2', p_idx2));
    v_next := advance_turn(p_match_id);
    RETURN jsonb_build_object('result', 'no_match', 'continue_turn', false, 'next', v_next);
  END IF;
END;
$$;
GRANT EXECUTE ON FUNCTION report_pair(uuid, uuid, integer, integer) TO authenticated, service_role;

-- end_round_and_redistribute
CREATE OR REPLACE FUNCTION end_round_and_redistribute(p_match_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_count int; v_loser uuid; v_remaining int;
BEGIN
  SELECT COUNT(*) INTO v_count FROM br_players WHERE match_id = p_match_id AND status = 'playing';
  IF v_count = 0 THEN
    UPDATE br_matches SET status = 'finished', ended_at = now() WHERE id = p_match_id;
    RETURN;
  END IF;

  -- eliminate lowest scorer
  SELECT id INTO v_loser FROM br_players
  WHERE match_id = p_match_id AND status = 'playing'
  ORDER BY total_score ASC, errors DESC LIMIT 1;

  UPDATE br_players SET status = 'eliminated' WHERE id = v_loser;
  INSERT INTO br_events(match_id, player_id, event_type, payload)
  VALUES (p_match_id, v_loser, 'player_eliminated', jsonb_build_object('player', v_loser));

  SELECT COUNT(*) INTO v_remaining FROM br_players WHERE match_id = p_match_id AND status = 'playing';
  IF v_remaining <= 1 THEN
    UPDATE br_matches SET status = 'finished', ended_at = now() WHERE id = p_match_id;
    INSERT INTO br_events(match_id, event_type, payload)
    VALUES (p_match_id, 'match_end', jsonb_build_object('winner',
      (SELECT id FROM br_players WHERE match_id = p_match_id AND status = 'playing' LIMIT 1)));
    RETURN;
  END IF;

  -- new round
  UPDATE br_matches SET round_number = round_number + 1 WHERE id = p_match_id;
  DELETE FROM br_cards WHERE match_id = p_match_id;
  PERFORM start_br_match(p_match_id);
END;
$$;
GRANT EXECUTE ON FUNCTION end_round_and_redistribute(uuid) TO authenticated, service_role;

-- enqueue_player
CREATE OR REPLACE FUNCTION enqueue_player(p_user_id uuid, p_display_name text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_match uuid; v_count int; rec RECORD;
BEGIN
  DELETE FROM br_queue WHERE user_id = p_user_id;
  INSERT INTO br_queue(user_id, display_name) VALUES (p_user_id, p_display_name);
  SELECT COUNT(*) INTO v_count FROM br_queue;

  -- Start match when 4+ players in queue
  IF v_count >= 4 THEN
    v_match := create_br_match(p_user_id, 4, 4, 6);
    FOR rec IN SELECT * FROM br_queue ORDER BY joined_at LIMIT 4 LOOP
      PERFORM join_br_match(v_match, rec.user_id, rec.display_name, false);
    END LOOP;
    DELETE FROM br_queue WHERE user_id IN (SELECT user_id FROM br_queue ORDER BY joined_at LIMIT 4);
    PERFORM start_br_match(v_match);
    RETURN jsonb_build_object('match_id', v_match, 'queue_count', 0);
  END IF;
  RETURN jsonb_build_object('match_id', null, 'queue_count', v_count);
END;
$$;
GRANT EXECUTE ON FUNCTION enqueue_player(uuid, text) TO authenticated, service_role;

-- leave_queue
CREATE OR REPLACE FUNCTION leave_queue(p_user_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN DELETE FROM br_queue WHERE user_id = p_user_id; END;
$$;
GRANT EXECUTE ON FUNCTION leave_queue(uuid) TO authenticated, service_role;

-- create_br_invite
CREATE OR REPLACE FUNCTION create_br_invite(p_match_id uuid, p_ttl integer DEFAULT 300)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_token text := gen_random_uuid()::text;
BEGIN
  INSERT INTO br_invites(match_id, token, expires_at)
  VALUES (p_match_id, v_token, now() + (p_ttl || ' seconds')::interval);
  RETURN v_token;
END;
$$;
GRANT EXECUTE ON FUNCTION create_br_invite(uuid, integer) TO authenticated, service_role;

-- join_br_match_by_token
CREATE OR REPLACE FUNCTION join_br_match_by_token(p_token text, p_user_id uuid, p_display_name text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_match uuid; v_status text; v_pid uuid;
BEGIN
  SELECT match_id INTO v_match FROM br_invites WHERE token = p_token AND expires_at > now();
  IF v_match IS NULL THEN RAISE EXCEPTION 'invalid_or_expired_token'; END IF;
  SELECT status INTO v_status FROM br_matches WHERE id = v_match;
  IF v_status <> 'waiting' THEN RAISE EXCEPTION 'match_not_open'; END IF;
  v_pid := join_br_match(v_match, p_user_id, p_display_name, false);
  RETURN jsonb_build_object('match_id', v_match, 'player_id', v_pid);
END;
$$;
GRANT EXECUTE ON FUNCTION join_br_match_by_token(text, uuid, text) TO authenticated, service_role;

-- get_match_state
CREATE OR REPLACE FUNCTION get_match_state(p_match_id uuid, p_player_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_match record; v_players jsonb; v_cards jsonb;
BEGIN
  SELECT * INTO v_match FROM br_matches WHERE id = p_match_id;
  SELECT jsonb_agg(to_jsonb(p) - 'match_id') INTO v_players
  FROM (SELECT id, display_name, is_bot, status, consecutive_hits, total_score, errors, is_current_turn
        FROM br_players WHERE match_id = p_match_id) p;
  SELECT jsonb_agg(to_jsonb(c) - 'value_hash') INTO v_cards
  FROM (SELECT idx, revealed FROM br_cards WHERE match_id = p_match_id ORDER BY idx) c;
  RETURN jsonb_build_object('match', to_jsonb(v_match), 'players', COALESCE(v_players, '[]'::jsonb), 'cards', COALESCE(v_cards, '[]'::jsonb));
END;
$$;
GRANT EXECUTE ON FUNCTION get_match_state(uuid, uuid) TO authenticated, service_role;
