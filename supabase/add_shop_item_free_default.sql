-- Add is_free_default column to shop_items
ALTER TABLE shop_items ADD COLUMN IF NOT EXISTS is_free_default BOOLEAN DEFAULT false;

-- Add comment explaining the column
COMMENT ON COLUMN shop_items.is_free_default IS 'If true, this item is available to all users by default without purchase.';
