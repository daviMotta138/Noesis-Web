-- Fix for the Ranking Timer bug
-- The previous function omitted the promotion check and did not correctly grant badges for leagues since it searched by lowercase league names.

CREATE OR REPLACE FUNCTION process_weekly_leagues()
RETURNS void AS $$
DECLARE
    player RECORD;
    place_idx INT;
    badge_name TEXT;
    -- Note: Profiles table check constraint requires these values to be capitalized
    leagues TEXT[] := ARRAY['Campeonato', 'Diamante', 'Ouro', 'Prata', 'Bronze'];
    current_league TEXT;
BEGIN
    -- 1. Grant badges to Top 3 of each league based on the standing BEFORE any promotions/demotions
    FOREACH current_league IN ARRAY leagues LOOP
        place_idx := 1;

        -- Process users in the current league ordered by score descending
        FOR player IN
            SELECT id, score, league
            FROM public.profiles
            WHERE league = current_league
            ORDER BY score DESC, updated_at ASC
        LOOP
            -- Grant badges to Top 3 of each league who scored some points
            IF place_idx <= 3 AND player.score > 0 THEN
                -- Format badge name inside DB matches JS split e.g ouro_1
                badge_name := lower(current_league) || '_' || place_idx::text;
                
                -- Add badge if not already present, give a push notification
                IF NOT (badge_name = ANY(COALESCE((SELECT badges FROM public.profiles WHERE id = player.id), '{}'))) THEN
                    UPDATE public.profiles
                    SET badges = array_append(COALESCE(badges, '{}'), badge_name)
                    WHERE id = player.id;

                    INSERT INTO public.notifications (user_id, type, title, body)
                    VALUES (player.id, 'system', 'Nova Conquista!', 'Você terminou no Top ' || place_idx::text || ' da Liga ' || current_league || ' e recebeu um novo broche!');
                END IF;
            END IF;
            
            place_idx := place_idx + 1;
        END LOOP;
    END LOOP;

    -- 2. Evaluate Promotion/Demotion logic using actual cutoffs mechanism
    -- Located in league_promotion_system.sql
    PERFORM process_league_promotions();

    -- 3. Reset scores globally to start the new week
    UPDATE public.profiles SET score = 0;

    -- 4. System notification to everyone
    INSERT INTO public.notifications (user_id, type, title, body)
    SELECT id, 'system', 'Nova Semana do Ranking', 'O Ranking foi reiniciado e as Ligas foram avaliadas! Comece a jogar para garantir sua posição.'
    FROM public.profiles;

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
