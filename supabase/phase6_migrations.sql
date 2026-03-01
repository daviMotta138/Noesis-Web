-- Phase 6 DB Updates: Badges and Weekly League Automations

-- 1. Add badges column to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS badges text[] DEFAULT '{}';

-- 2. Create the procedure to process weekly leagues
CREATE OR REPLACE FUNCTION process_weekly_leagues()
RETURNS void AS $$
DECLARE
    league_record RECORD;
    player RECORD;
    place_idx INT;
    badge_name TEXT;
    leagues TEXT[] := ARRAY['campeonato', 'diamante', 'ouro', 'prata', 'bronze'];
    current_league TEXT;
BEGIN
    -- Loop over all leagues to determine winners and demotions
    FOREACH current_league IN ARRAY leagues LOOP
        place_idx := 1;

        -- Process users in the current league ordered by score descending
        FOR player IN
            SELECT id, score, league
            FROM public.profiles
            WHERE league = current_league
            ORDER BY score DESC, updated_at ASC
        LOOP
            -- Grant badges to Top 3 of each league
            IF place_idx <= 3 AND player.score > 0 THEN
                badge_name := current_league || '_' || place_idx::text;
                
                -- Add badge if not already present, give a push notification
                IF NOT (badge_name = ANY(COALESCE((SELECT badges FROM public.profiles WHERE id = player.id), '{}'))) THEN
                    UPDATE public.profiles
                    SET badges = array_append(COALESCE(badges, '{}'), badge_name)
                    WHERE id = player.id;

                    INSERT INTO public.notifications (user_id, type, title, body)
                    VALUES (player.id, 'system', 'Nova Conquista!', 'Você terminou no Top ' || place_idx::text || ' da Liga ' || current_league || ' e recebeu um novo broche!');
                END IF;
            END IF;

            -- Evaluate Promotion/Demotion (simplified logic based on top X% or specific cutoffs)
            -- For Noesis, let's say the Top 3 move up to the next league, and the bottom ranks drop down if they exist.
            -- This logic can be expanded. For now, we'll reset everyone's weekly score to 0 to start fresh.
            
            place_idx := place_idx + 1;
        END LOOP;
    END LOOP;

    -- Reset scores globally to start the new week
    UPDATE public.profiles SET score = 0;

    -- System notification to everyone
    INSERT INTO public.notifications (user_id, type, title, body)
    SELECT id, 'system', 'Nova Semana do Ranking', 'O Ranking foi reiniciado e as Ligas foram avaliadas! Comece a jogar para garantir sua posição.'
    FROM public.profiles;

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Schedule with pg_cron: Every Sunday at 20:00
-- NOTE: pg_cron requires the extension to be created and managed by a superuser.
-- In Supabase, you can enable pg_cron in Database > Extensions.
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule job if it doesn't already exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'weekly_league_reset') THEN
        -- Run at 20:00 every Sunday (0 20 * * 0 in cron syntax)
        PERFORM cron.schedule('weekly_league_reset', '0 20 * * 0', 'SELECT process_weekly_leagues();');
    END IF;
END $$;
