-- Phase 4 Migrations: Auto-Shields and Gift System

-- 1. Add tracking columns to profiles
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS last_played_date DATE,
ADD COLUMN IF NOT EXISTS last_shield_check DATE;

-- Initialize for existing users
UPDATE profiles 
SET last_played_date = CURRENT_DATE, last_shield_check = CURRENT_DATE
WHERE last_played_date IS NULL;

-- 2. RPC to check and deduct missed days on login
CREATE OR REPLACE FUNCTION check_missed_days(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_profile RECORD;
    v_days_diff INT;
    v_missed INT;
    v_shields_to_consume INT;
BEGIN
    SELECT * INTO v_profile FROM profiles WHERE id = p_user_id;
    IF NOT FOUND THEN RETURN '{"status": "not_found"}'::jsonb; END IF;

    -- Avoid double checking on the same day
    IF v_profile.last_shield_check >= CURRENT_DATE THEN
        RETURN '{"status": "already_checked"}'::jsonb;
    END IF;

    -- Calculate calendar days difference from the last played date
    -- If played yesterday, diff is 1. If played day before, diff is 2.
    v_days_diff := CURRENT_DATE - v_profile.last_played_date;
    v_missed := v_days_diff - 1;

    -- Always update the check date so we don't run this again today
    UPDATE profiles SET last_shield_check = CURRENT_DATE WHERE id = p_user_id;

    IF v_missed <= 0 THEN
        RETURN '{"status": "up_to_date"}'::jsonb;
    END IF;

    -- Check if they have enough shields
    IF v_profile.shield_count >= v_missed THEN
        -- Consume shields, save streak. BUT we don't update last_played_date, 
        -- so if they don't play TODAY, tomorrow diff will be +1. Wait, if we don't 
        -- update last_played_date, tomorrow v_days_diff is even bigger, and we charge again for the FULL period!
        -- To fix: we must "simulate" they played by pulling last_played_date forward by v_missed days.
        UPDATE profiles SET 
            shield_count = shield_count - v_missed,
            last_played_date = last_played_date + v_missed
        WHERE id = p_user_id;

        INSERT INTO notifications (user_id, type, title, body)
        VALUES (p_user_id, 'shield_used', 'Ofensiva Protegida Automagicamente!', 'Você se ausentou por ' || v_missed || ' dia(s). Foram consumidos ' || v_missed || ' escudo(s) para manter sua ofensiva.');
        
        RETURN jsonb_build_object('status', 'shields_used', 'deducted', v_missed);
    ELSE
        -- Streak breaks
        UPDATE profiles SET 
            shield_count = 0,
            streak = 0,
            last_played_date = CURRENT_DATE -- Start fresh
        WHERE id = p_user_id;

        -- Only notify if they actually had a streak
        IF v_profile.streak > 0 THEN
            INSERT INTO notifications (user_id, type, title, body)
            VALUES (p_user_id, 'streak_broken', 'Ofensiva Perdida', 'Sua ofensiva de ' || v_profile.streak || ' foi zerada devido a ' || v_missed || ' dia(s) de ausência sem escudos.');
        END IF;

        RETURN jsonb_build_object('status', 'streak_broken', 'missed', v_missed);
    END IF;
END;
$$;


-- 3. RPC for Sending Gifts
CREATE OR REPLACE FUNCTION send_gift(sender_id UUID, receiver_id UUID, gift_type TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_sender RECORD;
    v_receiver RECORD;
    v_cost INT;
BEGIN
    -- Types: 'nous100' (costs 100 nous, gives 100), 'shield1' (costs 1 shield, gives 1 shield)
    SELECT * INTO v_sender FROM profiles WHERE id = sender_id;
    SELECT * INTO v_receiver FROM profiles WHERE id = receiver_id;

    IF v_sender.id IS NULL OR v_receiver.id IS NULL THEN
        RETURN '{"success": false, "error": "User not found"}'::jsonb;
    END IF;

    IF gift_type = 'nous100' THEN
        v_cost := 100;
        IF v_sender.nous_coins < v_cost THEN
            RETURN '{"success": false, "error": "Saldo insuficiente de Nous."}'::jsonb;
        END IF;

        UPDATE profiles SET nous_coins = nous_coins - v_cost WHERE id = sender_id;
        UPDATE profiles SET nous_coins = nous_coins + v_cost WHERE id = receiver_id;

        INSERT INTO notifications (user_id, type, title, body)
        VALUES (receiver_id, 'gift_received', 'Presente Especial! 🎁', v_sender.display_name || ' te enviou 100 Nous de presente!');
        
        RETURN '{"success": true}'::jsonb;

    ELSIF gift_type = 'shield1' THEN
        IF v_sender.shield_count < 1 THEN
            RETURN '{"success": false, "error": "Você não tem escudos para enviar."}'::jsonb;
        END IF;

        UPDATE profiles SET shield_count = shield_count - 1 WHERE id = sender_id;
        UPDATE profiles SET shield_count = shield_count + 1 WHERE id = receiver_id;

        INSERT INTO notifications (user_id, type, title, body)
        VALUES (receiver_id, 'gift_received', 'Proteção! 🛡️', v_sender.display_name || ' te enviou 1 Escudo de presente!');
        
        RETURN '{"success": true}'::jsonb;
    ELSE
        RETURN '{"success": false, "error": "Tipo de presente inválido."}'::jsonb;
    END IF;
END;
$$;
