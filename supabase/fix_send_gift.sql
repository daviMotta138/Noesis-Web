-- Fix: Adds metadata to gift_received notifications so they can be processed by frontend GiftClaimOverlay correctly.

CREATE OR REPLACE FUNCTION send_gift(sender_id UUID, receiver_id UUID, gift_type TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_sender RECORD;
    v_receiver RECORD;
    v_cost INT;
    v_metadata JSONB;
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

        v_metadata := jsonb_build_object(
            'category', 'nous',
            'name', '100 Nous',
            'emoji', '🪙',
            'sender_name', v_sender.display_name,
            'nous_amount', 100
        );

        INSERT INTO notifications (user_id, type, title, body, metadata)
        VALUES (receiver_id, 'gift_received', 'Presente Especial! 🎁', v_sender.display_name || ' te enviou 100 Nous de presente!', v_metadata);
        
        RETURN '{"success": true}'::jsonb;

    ELSIF gift_type = 'shield1' THEN
        IF v_sender.shield_count < 1 THEN
            RETURN '{"success": false, "error": "Você não tem escudos para enviar."}'::jsonb;
        END IF;

        UPDATE profiles SET shield_count = shield_count - 1 WHERE id = sender_id;
        UPDATE profiles SET shield_count = shield_count + 1 WHERE id = receiver_id;

        v_metadata := jsonb_build_object(
            'category', 'shield',
            'name', '1 Escudo',
            'emoji', '🛡️',
            'sender_name', v_sender.display_name,
            'shield_amount', 1
        );

        INSERT INTO notifications (user_id, type, title, body, metadata)
        VALUES (receiver_id, 'gift_received', 'Proteção! 🛡️', v_sender.display_name || ' te enviou 1 Escudo de presente!', v_metadata);
        
        RETURN '{"success": true}'::jsonb;
    ELSE
        RETURN '{"success": false, "error": "Tipo de presente inválido."}'::jsonb;
    END IF;
END;
$$;
