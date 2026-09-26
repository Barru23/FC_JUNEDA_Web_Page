-- Apply after supabase-schema.sql, before deploying the September 26 release.
-- Additive migration. No business records are deleted or reopened.
BEGIN;

CREATE TABLE IF NOT EXISTS request_limits (
  key_hash TEXT PRIMARY KEY,
  hits INT NOT NULL,
  window_end TIMESTAMPTZ NOT NULL
);
CREATE TABLE IF NOT EXISTS admin_sessions (
  token_hash TEXT PRIMARY KEY,
  credential_version TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS notification_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resource_type TEXT NOT NULL CHECK (resource_type IN ('purchase', 'soci')),
  resource_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','processing','complete','review')),
  attempts INT NOT NULL DEFAULT 0,
  next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  lease_until TIMESTAMPTZ,
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(resource_type, resource_id)
);
CREATE INDEX IF NOT EXISTS idx_notification_due ON notification_jobs(next_attempt_at) WHERE status IN ('pending','processing');
CREATE TABLE IF NOT EXISTS maintenance_state (
  name TEXT PRIMARY KEY,
  enabled BOOLEAN NOT NULL DEFAULT FALSE,
  last_started_at TIMESTAMPTZ,
  last_success_at TIMESTAMPTZ,
  last_error TEXT,
  lease_until TIMESTAMPTZ,
  cursor JSONB NOT NULL DEFAULT '{}'::JSONB
);
INSERT INTO maintenance_state(name) VALUES ('reconcile') ON CONFLICT DO NOTHING;
CREATE TABLE IF NOT EXISTS stripe_balance_entries (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  reporting_category TEXT NOT NULL,
  currency TEXT NOT NULL,
  amount_cents BIGINT NOT NULL,
  fee_cents BIGINT NOT NULL,
  net_cents BIGINT NOT NULL,
  source_id TEXT,
  created_at TIMESTAMPTZ NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_stripe_balance_created ON stripe_balance_entries(created_at);

ALTER TABLE purchases ADD COLUMN IF NOT EXISTS notification_email_allowed BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE purchases ADD COLUMN IF NOT EXISTS stripe_fee_cents INT;
ALTER TABLE purchases ADD COLUMN IF NOT EXISTS stripe_net_cents INT;
ALTER TABLE purchases ADD COLUMN IF NOT EXISTS refunded_cents INT NOT NULL DEFAULT 0;
ALTER TABLE purchases ADD COLUMN IF NOT EXISTS financial_checked_at TIMESTAMPTZ;
ALTER TABLE soci_registrations ADD COLUMN IF NOT EXISTS notification_email_allowed BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE checkout_reservations ADD COLUMN IF NOT EXISTS checked_at TIMESTAMPTZ;
ALTER TABLE checkout_reservations ADD COLUMN IF NOT EXISTS last_error TEXT;

ALTER TABLE request_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE stripe_balance_entries ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON request_limits, admin_sessions, notification_jobs, maintenance_state, stripe_balance_entries FROM PUBLIC, anon, authenticated;
GRANT ALL ON request_limits, admin_sessions, notification_jobs, maintenance_state, stripe_balance_entries TO service_role;

CREATE OR REPLACE FUNCTION consume_request_limit(p_key TEXT, p_limit INT, p_seconds INT)
RETURNS TABLE(allowed BOOLEAN, retry_after INT)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_hits INT; v_end TIMESTAMPTZ;
BEGIN
  IF length(p_key) <> 64 OR p_limit < 1 OR p_seconds < 1 OR p_seconds > 86400 THEN
    RAISE EXCEPTION 'invalid rate limit';
  END IF;
  DELETE FROM request_limits WHERE key_hash IN (
    SELECT key_hash FROM request_limits WHERE window_end < NOW() - INTERVAL '1 day' LIMIT 100
  );
  INSERT INTO request_limits(key_hash, hits, window_end)
    VALUES (p_key, 1, NOW() + make_interval(secs => p_seconds))
  ON CONFLICT(key_hash) DO UPDATE SET
    hits = CASE WHEN request_limits.window_end <= NOW() THEN 1 ELSE request_limits.hits + 1 END,
    window_end = CASE WHEN request_limits.window_end <= NOW() THEN NOW() + make_interval(secs => p_seconds) ELSE request_limits.window_end END
  RETURNING hits, window_end INTO v_hits, v_end;
  RETURN QUERY SELECT v_hits <= p_limit, GREATEST(1, CEIL(EXTRACT(EPOCH FROM v_end - NOW()))::INT);
END;
$$;

-- Queue only new/changed records. Existing historical rows are not mailed.
CREATE OR REPLACE FUNCTION enqueue_record_notification()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_type TEXT;
BEGIN
  v_type := CASE WHEN TG_TABLE_NAME = 'purchases' THEN 'purchase' ELSE 'soci' END;
  INSERT INTO notification_jobs(resource_type, resource_id) VALUES(v_type, NEW.id)
  ON CONFLICT(resource_type, resource_id) DO UPDATE
    SET status = 'pending', next_attempt_at = NOW(), updated_at = NOW(), last_error = NULL;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS purchase_notification_insert ON purchases;
CREATE TRIGGER purchase_notification_insert AFTER INSERT ON purchases
  FOR EACH ROW EXECUTE FUNCTION enqueue_record_notification();
DROP TRIGGER IF EXISTS soci_notification_insert ON soci_registrations;
CREATE TRIGGER soci_notification_insert AFTER INSERT ON soci_registrations
  FOR EACH ROW EXECUTE FUNCTION enqueue_record_notification();
DROP TRIGGER IF EXISTS soci_notification_status ON soci_registrations;
CREATE TRIGGER soci_notification_status AFTER UPDATE OF status ON soci_registrations
  FOR EACH ROW WHEN (OLD.status IS DISTINCT FROM NEW.status) EXECUTE FUNCTION enqueue_record_notification();

CREATE OR REPLACE FUNCTION claim_notification_jobs(p_limit INT DEFAULT 5)
RETURNS SETOF notification_jobs LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN QUERY
  UPDATE notification_jobs j SET status = 'processing', attempts = j.attempts + 1,
    lease_until = NOW() + INTERVAL '2 minutes', updated_at = NOW()
  WHERE j.id IN (
    SELECT id FROM notification_jobs
    WHERE (status = 'pending' AND next_attempt_at <= NOW())
       OR (status = 'processing' AND lease_until < NOW())
    ORDER BY next_attempt_at FOR UPDATE SKIP LOCKED LIMIT LEAST(GREATEST(p_limit, 1), 10)
  ) RETURNING j.*;
END;
$$;

CREATE OR REPLACE FUNCTION claim_maintenance()
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE maintenance_state SET lease_until = NOW() + INTERVAL '2 minutes', last_started_at = NOW()
  WHERE name = 'reconcile' AND enabled AND (lease_until IS NULL OR lease_until < NOW());
  RETURN FOUND;
END;
$$;

-- Capacity changes preserve places already occupied/reserved, even while
-- another checkout is running. Administrators do not overwrite availability.
CREATE OR REPLACE FUNCTION update_event_details(p_id UUID, p_details JSONB)
RETURNS events LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_event events; v_total INT; v_status TEXT;
BEGIN
  SELECT * INTO STRICT v_event FROM events WHERE id = p_id FOR UPDATE;
  v_total := (p_details->>'total_spots')::INT;
  v_status := p_details->>'status';
  IF v_total IS NULL OR v_total < 1 OR v_total < v_event.total_spots - v_event.spots_remaining
    OR v_status IS NULL OR v_status NOT IN ('active','sold_out','closed','cancelled','past')
    OR NULLIF(trim(p_details->>'title'),'') IS NULL OR (p_details->>'price_eur')::NUMERIC <= 0 THEN
    RAISE EXCEPTION 'invalid event or capacity below occupied places';
  END IF;
  UPDATE events SET title=p_details->>'title', description=p_details->>'description',
    event_type=p_details->>'event_type', date=p_details->>'date', location=p_details->>'location',
    menu=p_details->>'menu', image_url=p_details->>'image_url', price_eur=(p_details->>'price_eur')::NUMERIC,
    total_spots=v_total, spots_remaining=v_total-(v_event.total_spots-v_event.spots_remaining),
    status=CASE WHEN v_status='active' AND v_total=v_event.total_spots-v_event.spots_remaining THEN 'sold_out' ELSE v_status END
  WHERE id=p_id RETURNING * INTO v_event;
  RETURN v_event;
END;
$$;

-- A cash sale reserves and finalizes inside the same database transaction.
CREATE OR REPLACE FUNCTION register_cash_purchase(p_id TEXT, p_type TEXT, p_buyer_name TEXT,
  p_buyer_email TEXT, p_buyer_phone TEXT, p_event_id UUID, p_product_id UUID,
  p_size TEXT, p_quantity INT, p_amount NUMERIC, p_dietary TEXT)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_reserved BOOLEAN; v_id UUID;
BEGIN
  IF p_id NOT LIKE 'CASH-%' OR p_type NOT IN ('event','merch') OR p_quantity IS NULL
    OR p_quantity < 1 OR p_quantity > 200 OR p_amount IS NULL OR p_amount <= 0
    OR NULLIF(trim(p_buyer_name),'') IS NULL THEN RAISE EXCEPTION 'invalid cash sale'; END IF;
  SELECT id INTO v_id FROM purchases WHERE stripe_session_id=p_id;
  IF FOUND THEN RETURN v_id; END IF;
  IF p_type='event' THEN
    v_reserved:=reserve_event_checkout(p_id,p_event_id,p_quantity,NOW()+INTERVAL '1 minute');
  ELSE
    IF p_quantity <> 1 THEN RAISE EXCEPTION 'one merchandise unit per sale'; END IF;
    v_reserved:=reserve_merch_checkout(p_id,p_product_id,p_size,1,NOW()+INTERVAL '1 minute');
  END IF;
  IF NOT v_reserved THEN RAISE EXCEPTION 'inventory unavailable or sales closed'; END IF;
  SELECT purchase_id INTO v_id FROM finalize_checkout_purchase(p_id,'',p_type,p_buyer_name,
    p_buyer_email,p_buyer_phone,p_event_id,p_quantity,p_dietary,p_product_id,p_size,'',NULL,p_amount,0,'cash');
  UPDATE purchases SET notification_email_allowed=FALSE WHERE id=v_id;
  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION consume_request_limit(TEXT,INT,INT), enqueue_record_notification(),
  claim_notification_jobs(INT), claim_maintenance(), update_event_details(UUID,JSONB),
  register_cash_purchase(TEXT,TEXT,TEXT,TEXT,TEXT,UUID,UUID,TEXT,INT,NUMERIC,TEXT) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION consume_request_limit(TEXT,INT,INT), enqueue_record_notification(),
  claim_notification_jobs(INT), claim_maintenance(), update_event_details(UUID,JSONB),
  register_cash_purchase(TEXT,TEXT,TEXT,TEXT,TEXT,UUID,UUID,TEXT,INT,NUMERIC,TEXT) TO service_role;

NOTIFY pgrst, 'reload schema';
COMMIT;
