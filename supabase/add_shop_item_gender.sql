-- Add target_gender column to shop_items table
ALTER TABLE shop_items 
ADD COLUMN IF NOT EXISTS target_gender TEXT DEFAULT 'all';

-- Update existing default clothes to 'man'
UPDATE shop_items 
SET target_gender = 'man' 
WHERE category IN ('shirt', 'pants', 'shoes', 'coat', 'outfits', 'headwear');

-- Insert the 'woman' (Menina) character into the shop natively
INSERT INTO shop_items (id, name, description, category, price_nous, asset_key, preview_url, rarity, target_gender) 
VALUES 
('woman', 'Menina', 'Personagem Feminino', 'gender', 0, '/avatars/woman/girl.png', '/avatars/woman/girl.png', 'epico', 'woman')
ON CONFLICT (id) DO NOTHING;

-- Provide a comment
COMMENT ON COLUMN shop_items.target_gender IS 'Gender filter for clothes: man, woman, or all (for both)';
