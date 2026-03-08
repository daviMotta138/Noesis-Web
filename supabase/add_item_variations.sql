-- Add variations column to shop_items table
ALTER TABLE shop_items 
ADD COLUMN IF NOT EXISTS variations JSONB DEFAULT '[]'::jsonb;

COMMENT ON COLUMN shop_items.variations IS 'Optional array of item variations: [{ id, label, asset_key, preview_url, is_premium }]';
