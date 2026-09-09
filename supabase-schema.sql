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
  -- Llegat: ja no s'usa. Les despeses de gestio es calculen a lib/fees.ts
  -- a partir del preu, i no son editables des d'/admin.
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

-- ─── RPC: descompte atòmic de places ─────────────────────────────────────────
-- El webhook de Stripe crida aquesta funció quan es confirma un pagament.
-- GREATEST(...,0) evita que spots_remaining quedi negatiu si hi ha hagut una
-- compra simultània; l'UPDATE és atòmic dins de la seva pròpia transacció.
CREATE OR REPLACE FUNCTION decrement_spots(event_id UUID, amount INT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE events
     SET spots_remaining = GREATEST(spots_remaining - amount, 0),
         status = CASE
                    WHEN GREATEST(spots_remaining - amount, 0) = 0 AND status = 'active'
                      THEN 'sold_out'
                    ELSE status
                  END
   WHERE id = decrement_spots.event_id;
END;
$$;

-- Nomes el servidor pot descomptar places. Revoquem el permis per defecte i
-- despres el concedim explicitament al service_role: si nomes el tingues via
-- PUBLIC, el REVOKE l'hi trauria i la crida del webhook fallaria amb
-- "permission denied for function decrement_spots".
REVOKE ALL ON FUNCTION decrement_spots(UUID, INT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION decrement_spots(UUID, INT) TO service_role;

-- Seed: Membership tiers (Campanya 2026/27 - Oficial image.png)
INSERT INTO membership_tiers (slug, name, price_eur, season, benefits, status)
VALUES
  ('soci-general', 'Soci General', 110.00, '2026/27', 'Accés lliure a tots els partits de lliga a casa de la temporada 2026/27, carnet físic i digital oficial, dret a vot a l''Assemblea', 'active'),
  ('soci-infantil', 'Soci Infantil', 30.00, '2026/27', 'Fins a 12 anys. Entrada lliure a tots els partits a casa, carnet infantil personalitzat, sortejos i activitats infantils', 'active'),
  ('soci-jove', 'Soci Jove', 60.00, '2026/27', '13 a 25 anys / estudiants. Accés a tots els partits a casa, carnet jove oficial, animació amb la Grada Jove', 'active'),
  ('soci-protector', 'Soci Protector', 140.00, '2026/27', 'Màxim suport al projecte esportiu. Accés preferent a tots els partits, carnet commemoratiu daurat, menció al club', 'active'),
  ('soci-afiliats-efi', 'Soci Afiliats EFI', 80.00, '2026/27', 'Quota especial per a familiars de jugadors/es de l''Escola de Futbol Intercomarcal (EFI), accés a partits del 1r equip', 'active')
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  price_eur = EXCLUDED.price_eur,
  season = EXCLUDED.season,
  benefits = EXCLUDED.benefits;

-- Legacy events in content/events.json are synced here once. From then on,
-- Supabase is the source of truth for the public catalogue, availability and
-- checkout prices. Events created from /admin do not need a JSON entry.
ALTER TABLE events ADD COLUMN IF NOT EXISTS slug TEXT;
ALTER TABLE events ADD COLUMN IF NOT EXISTS image_url TEXT;
-- Index unic complet, no parcial: un `ON CONFLICT (slug)` no pot fer servir un
-- index amb predicat (`WHERE slug IS NOT NULL`) si la instruccio no repeteix el
-- mateix predicat, i fallava amb 42P10. El predicat tampoc calia: Postgres ja
-- tracta els NULL com a diferents entre si, aixi que diversos esdeveniments
-- sense slug hi segueixen cabent.
DROP INDEX IF EXISTS idx_events_slug;
CREATE UNIQUE INDEX idx_events_slug ON events(slug);

-- Seed: Sample events (replace with real data) — kept in sync with the ids
-- in content/events.json so existing rows don't get duplicated on sync.
INSERT INTO events (slug, title, description, event_type, date, location, menu, price_eur, total_spots, spots_remaining, booking_fee_eur, status)
VALUES
  ('dinar-derbi-2026', 'Dinar Derbi', 'Dinar de club per celebrar el derbi de la temporada. Detalls de menú i preu pendents de confirmació.', 'lunch', 'Diumenge, 27 de setembre de 2026', 'Pendent de confirmar — Pavelló Municipal de Juneda', 'Pendent de confirmar', 20.00, 120, 120, 0.75, 'active')
ON CONFLICT (slug) DO NOTHING;

-- Seed: Default products — catàleg simplificat a la 1a equipació únicament
INSERT INTO products (slug, name, description, price_eur, sizes, swatches, customizable, status, stock)
VALUES
  ('1a-equipacio', '1a Equipació Vermella 2026/27', 'La samarreta oficial del primer equip per a la temporada 2026/27. Vermell amb detalls blaus i grocs.', 39.90, ARRAY['S','M','L','XL','NEN/A'], ARRAY['#E10600','#0A0A0B','#FBBF24'], true, 'active', '{"S": 10, "M": 15, "L": 12, "XL": 8, "NEN/A": 10}'::JSONB)
ON CONFLICT (slug) DO NOTHING;

-- ============================================================
-- Permisos de taula (GRANT)
-- ============================================================
-- L'RLS decideix QUINES FILES veu cada rol, pero nomes despres que el rol
-- tingui permis sobre la TAULA. Si el GRANT falta, PostgREST respon
-- "permission denied for table ..." en lloc d'una llista buida. Segons com
-- s'hagin creat les taules, els privilegis per defecte de Supabase poden no
-- haver-se aplicat, aixi que els concedim explicitament aqui.
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

-- El servidor (service_role) ho gestiona tot i se salta l'RLS.
GRANT ALL PRIVILEGES ON events, products, membership_tiers, purchases
  TO service_role;

-- Els catalegs publics son de nomes lectura per als rols del navegador;
-- les policies de sota els limiten a les files actives.
GRANT SELECT ON events, products, membership_tiers TO anon, authenticated;

-- `purchases` conte dades personals i no s'exposa mai fora del servidor.
REVOKE ALL PRIVILEGES ON purchases FROM anon, authenticated;

-- Que les taules futures d'aquest schema neixin ja amb els permisos bons.
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT ALL PRIVILEGES ON TABLES TO service_role;

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
-- `purchases` conté dades personals (nom, email, telèfon, intoleràncies).
-- El service_role ja se salta l'RLS, així que NO cal cap policy: sense policy,
-- l'RLS activat bloqueja completament el rol `anon` (la clau que viatja al
-- navegador). Una policy `USING (true)` sense `TO service_role` s'aplicaria al
-- rol públic i exposaria tota la taula.
DROP POLICY IF EXISTS "Public read purchases" ON purchases;
