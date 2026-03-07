-- Add disabled_categories column to shop_items
ALTER TABLE public.shop_items
ADD COLUMN disabled_categories TEXT[] DEFAULT '{}'::TEXT[];
