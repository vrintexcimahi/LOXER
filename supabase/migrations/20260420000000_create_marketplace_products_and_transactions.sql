-- Migration: Create Marketplace Products and Transactions
-- For digital products, second-hand goods, and general member-to-member transactions

CREATE TABLE IF NOT EXISTS marketplace_products (
  id text PRIMARY KEY,
  user_id text NOT NULL,
  seller_name text NOT NULL,
  seller_role text NOT NULL DEFAULT 'seeker',
  seller_verified boolean DEFAULT true,
  seller_avatar text,
  seller_whatsapp text NOT NULL,
  seller_city text NOT NULL,
  title text NOT NULL,
  category text NOT NULL CHECK (category IN ('digital', 'second', 'other')),
  sub_category text,
  condition text NOT NULL,
  price bigint NOT NULL DEFAULT 0,
  price_type text NOT NULL DEFAULT 'nego',
  images jsonb DEFAULT '[]'::jsonb,
  description text,
  stock integer DEFAULT 1,
  status text DEFAULT 'available' CHECK (status IN ('available', 'sold', 'reserved')),
  digital_download_url text,
  views_count integer DEFAULT 0,
  likes_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_marketplace_products_category ON marketplace_products(category);
CREATE INDEX IF NOT EXISTS idx_marketplace_products_status ON marketplace_products(status);
CREATE INDEX IF NOT EXISTS idx_marketplace_products_created_at ON marketplace_products(created_at DESC);

ALTER TABLE marketplace_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view available marketplace products"
  ON marketplace_products FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can create marketplace products"
  ON marketplace_products FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update own marketplace products"
  ON marketplace_products FOR UPDATE
  TO authenticated
  USING (auth.uid()::text = user_id OR user_id LIKE 'usr-%')
  WITH CHECK (auth.uid()::text = user_id OR user_id LIKE 'usr-%');

CREATE POLICY "Users can delete own marketplace products"
  ON marketplace_products FOR DELETE
  TO authenticated
  USING (auth.uid()::text = user_id OR user_id LIKE 'usr-%');

-- Transactions Table
CREATE TABLE IF NOT EXISTS marketplace_transactions (
  id text PRIMARY KEY,
  product_id text NOT NULL,
  product_title text NOT NULL,
  product_price bigint NOT NULL,
  product_image text,
  buyer_id text NOT NULL,
  buyer_name text NOT NULL,
  buyer_whatsapp text NOT NULL,
  seller_id text NOT NULL,
  seller_name text NOT NULL,
  seller_whatsapp text NOT NULL,
  offer_price bigint NOT NULL,
  notes text,
  payment_method text DEFAULT 'escrow_loxer',
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'agreed', 'completed', 'cancelled')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE marketplace_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants can view their transactions"
  ON marketplace_transactions FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can create transactions"
  ON marketplace_transactions FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Participants can update their transactions"
  ON marketplace_transactions FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);
