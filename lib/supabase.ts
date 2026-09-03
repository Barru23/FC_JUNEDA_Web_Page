import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder-project.supabase.co";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-anon-key";

// Client-side client (limited permissions via Row Level Security)
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Server-side admin client (full permissions — use only in API routes)
export function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder-project.supabase.co";
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-service-key";

  return createClient(url, serviceKey, {
    auth: { persistSession: false },
  });
}

// ─── Database Types ───────────────────────────────────────────────────────────

export type DbEvent = {
  id: string;
  title: string;
  description: string | null;
  event_type: "dinner" | "lunch" | "party" | "other";
  date: string;
  location: string;
  menu: string | null;
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
