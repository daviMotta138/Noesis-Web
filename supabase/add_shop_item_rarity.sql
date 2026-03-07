-- Add rarity column to shop_items table
ALTER TABLE shop_items 
ADD COLUMN IF NOT EXISTS rarity TEXT DEFAULT 'comum';

-- Update existing items with some sensible default rarities
UPDATE shop_items SET rarity = 'incomum' WHERE category = 'shirt' OR category = 'pants' OR category = 'shoes';
UPDATE shop_items SET rarity = 'raro' WHERE category = 'headwear' OR category = 'accessory' OR id = 'shield_3';
UPDATE shop_items SET rarity = 'epico' WHERE category = 'hair' OR category = 'item' OR id = 'shield_5' OR id = 'shield_10';
UPDATE shop_items SET rarity = 'lendario' WHERE category = 'effect' OR category = 'pet';

-- Provide a comment
COMMENT ON COLUMN shop_items.rarity IS 'Fortnite style rarity: comum (gray), incomum (green), raro (blue), epico (purple), lendario (gold)';
