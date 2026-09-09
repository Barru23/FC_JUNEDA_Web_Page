import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Un projecte mal configurat o inaccessible (URL erronia, credencials de
// mostra, una caiguda de Supabase) ha de fallar rapid en comptes de quedar
// penjat. El `db.timeout` de postgrest-js limita cada peticio I (a diferencia
// d'un AbortSignal fet a ma sobre un `fetch` propi) es reconeix internament
// com una cancel·lacio deliberada, aixi que no dispara el reintent amb
// backoff que porta de serie (3 reintents per error de xarxa). El
// `retry: false` de sobre es el mateix cinturo, per si de cas.
const SUPABASE_TIMEOUT_MS = 5000;

// Client de servidor amb permisos totals. Nomes a rutes d'API.
//
// No hi ha cap client anonim: cap component del navegador parla amb Supabase
// directament, tot passa per les rutes d'/api. Aixo vol dir que
// NEXT_PUBLIC_SUPABASE_ANON_KEY no cal enlloc, i que aqui NO hi pot haver cap
// recurs a la clau publica: si la clau de servei no hi es, degradar-se a la
// clau anonima nomes produeix un "permission denied" incomprensible mig
// desplegament enlla. Millor dir clarament que falta.
export function getSupabaseAdmin(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!url) throw new Error("NEXT_PUBLIC_SUPABASE_URL no esta configurada");
  if (!serviceKey) throw new Error("SUPABASE_SERVICE_ROLE_KEY no esta configurada");

  return createClient(url, serviceKey, {
    auth: { persistSession: false },
    db: { timeout: SUPABASE_TIMEOUT_MS, retry: false },
  });
}

// ─── Database Types ───────────────────────────────────────────────────────────

export type DbEvent = {
  id: string;
  slug: string | null;
  title: string;
  description: string | null;
  event_type: "dinner" | "lunch" | "party" | "other";
  date: string;
  location: string;
  menu: string | null;
  image_url: string | null;
  price_eur: number;
  total_spots: number;
  spots_remaining: number;
  booking_fee_eur: number;
  sheet_id: string | null;
  status: "active" | "sold_out" | "cancelled" | "past";
  created_at: string;
};

export type DbProduct = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  price_eur: number;
  sizes: string[];
  swatches: string[];
  customizable: boolean;
  image_url: string | null;
  stock: Record<string, number>;
  status: "active" | "out_of_stock" | "hidden";
  created_at: string;
};

export type DbMembershipTier = {
  id: string;
  slug: string;
  name: string;
  price_eur: number;
  season: string;
  benefits: string | null;
  status: "active" | "inactive";
};

export type DbPurchase = {
  id: string;
  stripe_session_id: string;
  stripe_payment_id: string | null;
  purchase_type: "event" | "merch" | "membership";
  buyer_name: string;
  buyer_email: string;
  buyer_phone: string | null;
  event_id: string | null;
  quantity: number;
  dietary: string | null;
  guest_names: string[] | null;
  product_id: string | null;
  size: string | null;
  custom_name: string | null;
  custom_number: string | null;
  tier_id: string | null;
  amount_eur: number;
  fee_eur: number;
  payment_method: string | null;
  payment_status: "pending" | "completed" | "refunded" | "failed";
  sheet_synced: boolean;
  email_sent: boolean;
  created_at: string;
  // Joined fields
  event?: Pick<DbEvent, "title" | "date" | "location">;
  product?: Pick<DbProduct, "name" | "price_eur">;
  tier?: Pick<DbMembershipTier, "name" | "price_eur">;
};

export type DashboardStats = {
  total_revenue: number;
  event_revenue: number;
  merch_revenue: number;
  membership_revenue: number;
  tickets_sold: number;
  merch_orders: number;
  active_members: number;
  recent_purchases: DbPurchase[];
};
