-- Fix for the Ranking Timer bug + Badge sync
-- process_weekly_leagues() is called via pg_cron every Sunday at 23:00 UTC.
-- It:
--   1. Awards top-3 badges per league (both profiles.badges[] and user_badges table)
--   2. Runs league promotion/demotion logic
--   3. Resets all scores to 0
--   4. Sends a "New Week" system notification to all users

CREATE OR REPLACE FUNCTION process_weekly_leagues()
RETURNS void AS $$
DECLARE
    player RECORD;
    place_idx INT;
    badge_name TEXT;
    -- Profiles table check constraint requires capitalized values
    leagues TEXT[] := ARRAY['Campeonato', 'Diamante', 'Ouro', 'Prata', 'Bronze'];
    current_league TEXT;
    week_num INT;
    year_num INT;
BEGIN
    week_num := extract(week from now())::int;
    year_num := extract(year from now())::int;

    -- 1. Grant badges to Top 3 of each league BEFORE promotions/demotions
    FOREACH current_league IN ARRAY leagues LOOP
        place_idx := 1;

        FOR player IN
            SELECT id, score, league
            FROM public.profiles
            WHERE league = current_league
            ORDER BY score DESC, created_at ASC
        LOOP
            -- Only top 3 with actual points
            IF place_idx <= 3 AND player.score > 0 THEN
                -- badge_name format matches JS split e.g. "ouro_1"
                badge_name := lower(current_league) || '_' || place_idx::text;

                -- Update profiles.badges array (for FriendProfileView display)
                IF NOT (badge_name = ANY(COALESCE((SELECT badges FROM public.profiles WHERE id = player.id), '{}'))) THEN
                    UPDATE public.profiles
                    SET badges = array_append(COALESCE(badges, '{}'), badge_name)
                    WHERE id = player.id;
                END IF;

                -- Also insert into user_badges table (for BadgeDisplay component)
                -- Map badge_name to position_badges badge_type
                BEGIN
                    PERFORM award_position_badge(
                        player.id,
                        CASE place_idx
                            WHEN 1 THEN 'champion_rank1'
                            WHEN 2 THEN 'champion_rank2'
                            WHEN 3 THEN 'champion_rank3'
                        END,
                        place_idx,
                        week_num,
                        year_num
                    );
                EXCEPTION WHEN others THEN
                    -- silently ignore if badge_type doesn't apply
                    NULL;
                END;

                -- Notify the player about their badge
                INSERT INTO public.notifications (user_id, type, title, body)
                VALUES (
                    player.id,
                    'system',
                    'Novo Broche Conquistado! 🏅',
                    'Você terminou no Top ' || place_idx::text || ' da Liga ' || current_league || ' e recebeu um broche!'
                );
            END IF;

            place_idx := place_idx + 1;
        END LOOP;
    END LOOP;

    -- 2. Evaluate Promotion/Demotion logic
    PERFORM process_league_promotions();

    -- 3. Reset scores globally to start the new week
    UPDATE public.profiles SET score = 0;

    -- 4. System notification to everyone about new week
    INSERT INTO public.notifications (user_id, type, title, body)
    SELECT id, 'system', 'Nova Semana do Ranking 🏆', 'O Ranking foi reiniciado e as Ligas foram avaliadas! Comece a jogar para garantir sua posição.'
    FROM public.profiles;

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

