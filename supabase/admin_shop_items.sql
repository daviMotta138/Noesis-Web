-- Drop depending table first
DROP TABLE IF EXISTS user_items CASCADE;
DROP TABLE IF EXISTS shop_items CASCADE;

-- Recreate shop_items with TEXT ID and flexible categories
CREATE TABLE shop_items (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    category TEXT NOT NULL,
    price_nous INTEGER NOT NULL DEFAULT 100,
    price_brl NUMERIC(8,2),
    asset_key TEXT,
    preview_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE shop_items ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "shop_select" ON shop_items FOR SELECT USING (true);
CREATE POLICY "shop_insert_admin" ON shop_items FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
);
CREATE POLICY "shop_update_admin" ON shop_items FOR UPDATE USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
);
CREATE POLICY "shop_delete_admin" ON shop_items FOR DELETE USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
);

-- Pre-populate with UI defaults
INSERT INTO shop_items (id, name, description, category, price_nous, asset_key, preview_url) VALUES 
('shield_1', 'Escudo', 'Protege 1 ofensiva', 'shield', 150, '', ''),
('shield_3', 'Dose Tripla', 'Pacote com 3 escudos', 'shield', 400, '', ''),
('shield_5', 'Kit Sobrevivência', 'Pacote com 5 escudos', 'shield', 650, '', ''),
('shield_10', 'Muralha', 'Pacote com 10 escudos', 'shield', 1200, '', ''),
('bone-azul', 'Boné Azul', 'Estiloso', 'headwear', 200, 'bone-azul', '/avatars/man/bone-azul-store.png'),
('4', 'Cabelo Cacheado', 'Cachos exuberantes', 'hair', 200, '', ''),
('6', 'Camisa Roxa', 'Elegância', 'shirt', 150, '', ''),
('8', 'Óculos Red.', 'Intelectual', 'accessory', 180, '', ''),
('9', 'Coroa Dourada', 'Para mestres', 'accessory', 500, '', ''),
('10', 'Tênis Branco', 'Atleta', 'shoes', 120, '', ''),
('aura_1', 'Aura Chamas', 'Efeito Visual', 'effect', 2000, '', ''),
('12', 'Espada Mág.', 'Poder puro', 'item', 350, '', ''),
('13', 'Grimório', 'Sabedoria', 'item', 350, '', ''),
('14', 'Cajado', 'Controle', 'item', 400, '', ''),
('pet_1', 'Mascote Coruja', 'Companheiro', 'pet', 1500, '', '')
ON CONFLICT (id) DO UPDATE SET 
  name = EXCLUDED.name, 
  price_nous = EXCLUDED.price_nous,
  category = EXCLUDED.category;

-- ─── Storage Bucket for Shop Assets ─────────────────────────
INSERT INTO storage.buckets (id, name, public) 
VALUES ('shop_assets', 'shop_assets', true)
ON CONFLICT (id) DO NOTHING;

-- RLS for shop_assets bucket
CREATE POLICY "Public Access for shop_assets"
ON storage.objects FOR SELECT
USING (bucket_id = 'shop_assets');

CREATE POLICY "Admin Insert for shop_assets"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'shop_assets' 
  AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
);

CREATE POLICY "Admin Update for shop_assets"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'shop_assets'
  AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
);

CREATE POLICY "Admin Delete for shop_assets"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'shop_assets'
  AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
);
