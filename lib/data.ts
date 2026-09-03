// ─── Type Definitions ─────────────────────────────────────────────────────────
// These types mirror the Supabase DB schema; the site fetches live data via
// the API routes in app/api/.

export type ClubEvent = {
  id: string;
  title: string;
  date: string;
  location: string;
  menu: string;
  price: number;
  spotsLeft: number;
  totalSpots?: number;
  status?: string;
  bookingFee?: number;
};

export type MembershipTier = {
  id: string;
  name: string;
  price_eur: number;
  season: string;
  benefits: string | null;
  status: string;
};

export type Purchase = {
  id: string;
  stripe_session_id: string;
  purchase_type: "event" | "merch" | "membership";
  buyer_name: string;
  buyer_email: string;
  buyer_phone?: string;
  event_id?: string;
  product_id?: string;
  tier_id?: string;
  quantity?: number;
  dietary?: string;
  size?: string;
  custom_name?: string;
  custom_number?: string;
  amount_eur: number;
  payment_method?: string;
  payment_status: "pending" | "completed" | "refunded" | "failed";
  sheet_synced: boolean;
  email_sent: boolean;
  created_at: string;
  // Joined relations
  event?: { title: string; date: string; location: string };
  product?: { name: string };
  tier?: { name: string };
};

export type DashboardStats = {
  total_revenue: number;
  event_revenue: number;
  merch_revenue: number;
  membership_revenue: number;
  tickets_sold: number;
  merch_orders: number;
  active_members: number;
  recent_purchases: Purchase[];
};

