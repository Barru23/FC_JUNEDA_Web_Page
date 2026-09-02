// ─── Type Definitions ─────────────────────────────────────────────────────────
// These types mirror the Supabase DB schema.
// The static sample arrays below are kept as fallbacks during development
// but the site fetches live data from Supabase via the API routes.

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

export type Product = {
  id: string;
  name: string;
  sizes: string[];
  price: number;
  swatches: string[];
  customizable: boolean;
  image?: string;
  stock?: Record<string, number>;
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

export type Position = "Porters" | "Defenses" | "Migcampistes" | "Davanters" | "Cos Tècnic" | "Cos Tecnic";

export type Player = {
  id: string;
  name: string;
  number: number;
  position: Position;
  bio: string;
};

// SAMPLE player data — substituir per la plantilla real.
export const players: Player[] = [
  { id: "p9",  name: "Marc Rovira", number: 9,  position: "Davanters",    bio: "Golejador nat, capita de l atac des de fa tres temporades." },
  { id: "p1",  name: "Jordi Sole",  number: 1,  position: "Porters",      bio: "Porter titular, reflexos clau en el joc aeri." },
  { id: "p4",  name: "Pau Ferrer",  number: 4,  position: "Defenses",     bio: "Central contundent, lider de la defensa." },
  { id: "p8",  name: "Adria Costa", number: 8,  position: "Migcampistes", bio: "Motor del mig del camp, visio de joc excepcional." },
  { id: "p11", name: "Nil Bosch",   number: 11, position: "Davanters",    bio: "Extrem rapid, especialista en centres precisos." },
  { id: "p6",  name: "Toni Vidal",  number: 6,  position: "Cos Tecnic",   bio: "Segon entrenador, responsable de la preparacio fisica." },
];
