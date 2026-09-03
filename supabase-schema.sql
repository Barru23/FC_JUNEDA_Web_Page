-- ============================================================
-- CF Juneda - Supabase Database Schema
-- Run this in: Supabase Dashboard -> SQL Editor -> New Query
-- ============================================================

-- Events (Sopars, Dinars, Festes)
CREATE TABLE IF NOT EXISTS events (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title           TEXT NOT NULL,
  description     TEXT,
  event_type      TEXT NOT NULL DEFAULT 'dinner',
  date            TEXT NOT NULL,
  location        TEXT NOT NULL,
  menu            TEXT,
  price_eur       DECIMAL(8,2) NOT NULL,
  total_spots     INT NOT NULL,
  spots_remaining INT NOT NULL,
  booking_fee_eur DECIMAL(8,2) DEFAULT 0.75,
  sheet_id        TEXT,
  status          TEXT DEFAULT 'active',
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Products (Merchandise)
CREATE TABLE IF NOT EXISTS products (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug          TEXT,
  name          TEXT NOT NULL,
  description   TEXT,
  price_eur     DECIMAL(8,2) NOT NULL,
  sizes         TEXT[] DEFAULT ARRAY[]::TEXT[],
  swatches      TEXT[] DEFAULT ARRAY[]::TEXT[],
  customizable  BOOLEAN DEFAULT false,
  image_url     TEXT,
  stock         JSONB DEFAULT '{}'::JSONB,
  status        TEXT DEFAULT 'active',
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Membership Tiers (Socis)
CREATE TABLE IF NOT EXISTS membership_tiers (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug        TEXT,
  name        TEXT NOT NULL,
  price_eur   DECIMAL(8,2) NOT NULL,
  season      TEXT NOT NULL DEFAULT '2026/27',
  benefits    TEXT,
  status      TEXT DEFAULT 'active'
);

-- Unified Purchases Table
CREATE TABLE IF NOT EXISTS purchases (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_session_id TEXT UNIQUE NOT NULL,
  stripe_payment_id TEXT,
  purchase_type     TEXT NOT NULL,
  buyer_name        TEXT NOT NULL,
  buyer_email       TEXT NOT NULL,
  buyer_phone       TEXT,
  event_id          UUID REFERENCES events(id),
  quantity          INT DEFAULT 1,
  dietary           TEXT,
  guest_names       TEXT[],
  product_id        UUID REFERENCES products(id),
  size              TEXT,
  custom_name       TEXT,
  custom_number     TEXT,
  tier_id           UUID REFERENCES membership_tiers(id),
  amount_eur        DECIMAL(8,2) NOT NULL,
  fee_eur           DECIMAL(8,2) DEFAULT 0,
  payment_method    TEXT,
  payment_status    TEXT DEFAULT 'pending',
  sheet_synced      BOOLEAN DEFAULT false,
  email_sent        BOOLEAN DEFAULT false,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- Migration: stable slug identifiers
-- The app addresses products and tiers by a human-readable slug, never by
-- the generated UUID. Safe to re-run on a database created before slug
-- existed.
-- ============================================================
ALTER TABLE products         ADD COLUMN IF NOT EXISTS slug TEXT;
ALTER TABLE membership_tiers ADD COLUMN IF NOT EXISTS slug TEXT;

-- Backfill rows seeded before the column existed, matched on their name.
UPDATE products SET slug = '1a-equipacio' WHERE slug IS NULL AND name LIKE '1a Equipaci%';
UPDATE products SET slug = '2a-equipacio' WHERE slug IS NULL AND name LIKE '2a Equipaci%';
UPDATE products SET slug = 'bufanda'      WHERE slug IS NULL AND name LIKE 'Bufanda%';
UPDATE membership_tiers SET slug = 'soci-general' WHERE slug IS NULL AND name LIKE 'Soci%';

-- Anything still unslugged (rows the Junta added by hand) gets a
-- deterministic slug from its id, so the unique index below always succeeds.
UPDATE products         SET slug = 'producte-' || left(id::text, 8) WHERE slug IS NULL;
UPDATE membership_tiers SET slug = 'soci-'     || left(id::text, 8) WHERE slug IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_products_slug ON products(slug);
CREATE UNIQUE INDEX IF NOT EXISTS idx_tiers_slug    ON membership_tiers(slug);

ALTER TABLE products         ALTER COLUMN slug SET NOT NULL;
ALTER TABLE membership_tiers ALTER COLUMN slug SET NOT NULL;

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_purchases_event   ON purchases(event_id) WHERE purchase_type = 'event';
CREATE INDEX IF NOT EXISTS idx_purchases_type    ON purchases(purchase_type);
CREATE INDEX IF NOT EXISTS idx_purchases_status  ON purchases(payment_status);
CREATE INDEX IF NOT EXISTS idx_purchases_created ON purchases(created_at DESC);

-- Seed: Default membership tier
INSERT INTO membership_tiers (slug, name, price_eur, season, benefits, status)
VALUES ('soci-general', 'Soci/Sòcia CF Juneda', 25.00, '2025/26', 'Accés a tots els partits, descomptes a la botiga, newsletter del club', 'active')
ON CONFLICT (slug) DO NOTHING;

-- Seed: Sample events (replace with real data)
INSERT INTO events (title, description, event_type, date, location, menu, price_eur, total_spots, spots_remaining, booking_fee_eur, status)
VALUES
  ('Sopar de Temporada 2025/26', 'El sopar anual del club per celebrar la temporada', 'dinner', '28 de setembre de 2025', 'Pavelló Municipal de Juneda', 'Menú 3 plats + postres + vi', 18.00, 150, 150, 0.75, 'active'),
  ('Dinar de Final de Lliga', 'Celebra la final de la lliga amb tot el club', 'lunch', '14 de juny de 2026', 'Casal del Club', 'Menú tradicional català', 22.00, 100, 100, 0.75, 'active')
ON CONFLICT DO NOTHING;

-- Seed: Default products
INSERT INTO products (slug, name, description, price_eur, sizes, swatches, customizable, status, stock)
VALUES
  ('1a-equipacio', '1a Equipació Vermella 2025/26', 'La samarreta oficial del primer equip per a la temporada 2025/26. Vermell amb detalls blaus i grocs.', 39.90, ARRAY['S','M','L','XL','NEN/A'], ARRAY['#E10600','#0A0A0B','#FBBF24'], true, 'active', '{"S": 10, "M": 15, "L": 12, "XL": 8, "NEN/A": 10}'::JSONB),
  ('2a-equipacio', '2a Equipació Blava 2025/26', 'Equipació alternativa del club, fons blau marí amb detalls grocs.', 39.90, ARRAY['S','M','L','XL','NEN/A'], ARRAY['#0F172A','#FBBF24'], true, 'active', '{"S": 8, "M": 12, "L": 10, "XL": 6, "NEN/A": 8}'::JSONB),
  ('bufanda', 'Bufanda Oficial CF Juneda', 'Bufanda oficial del club, vermella i negra.', 14.90, ARRAY['Única'], ARRAY['#E10600','#0A0A0B'], false, 'active', '{"Única": 50}'::JSONB)
ON CONFLICT (slug) DO NOTHING;

-- Row Level Security: public can read active events and products
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE membership_tiers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read active events" ON events;
DROP POLICY IF EXISTS "Public can read active products" ON products;
DROP POLICY IF EXISTS "Public can read active tiers" ON membership_tiers;
DROP POLICY IF EXISTS "Service role full access purchases" ON purchases;

CREATE POLICY "Public can read active events" ON events FOR SELECT USING (status = 'active');
CREATE POLICY "Public can read active products" ON products FOR SELECT USING (status = 'active');
CREATE POLICY "Public can read active tiers" ON membership_tiers FOR SELECT USING (status = 'active');
CREATE POLICY "Service role full access purchases" ON purchases USING (true) WITH CHECK (true);
