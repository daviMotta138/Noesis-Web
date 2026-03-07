-- Migration: Add 'is_default' flag to shop items
-- This allows admins to grant items/characters to all users without purchase.

-- 1. Add the new column (default false)
ALTER TABLE public.shop_items
ADD COLUMN IF NOT EXISTS is_default boolean DEFAULT false;

-- 2. Mark existing base characters as default
UPDATE public.shop_items
SET is_default = true
WHERE id IN ('man', 'woman') OR category = 'gender';

-- Ensure Menina is created just in case she is missing, so the default works
INSERT INTO public.shop_items (id, name, description, price_gold, price_nous, category, rarity, target_gender, is_visible, is_default, preview_url, asset_key)
VALUES (
    'woman', 
    'Menina', 
    'A personagem feminina do Noesis.', 
    0, 
    0, 
    'gender', 
    'common', 
    'woman', 
    true, 
    true, 
    '/avatars/woman/girl.png',
    null
)
ON CONFLICT (id) DO UPDATE SET is_default = true;

-- Ensure Menino is also in the shop_items so the frontend can pull it dynamically
INSERT INTO public.shop_items (id, name, description, price_gold, price_nous, category, rarity, target_gender, is_visible, is_default, preview_url, asset_key)
VALUES (
    'man', 
    'Menino', 
    'O personagem masculino do Noesis.', 
    0, 
    0, 
    'gender', 
    'common', 
    'man', 
    true, 
    true, 
    '/avatars/man/boy.png',
    null
)
ON CONFLICT (id) DO UPDATE SET is_default = true;
