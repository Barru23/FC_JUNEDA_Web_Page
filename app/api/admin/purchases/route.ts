import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { readAll } from "@/lib/read-all";
import type { DbPurchase } from "@/lib/supabase";

// GET /api/admin/purchases — list with optional filters
export async function GET(req: NextRequest) {
  if (!(await isAdminAuthenticated(req))) return NextResponse.json({ error: "No autoritzat" }, { status: 401 });

  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type");
    const eventId = searchParams.get("event_id");
    const status = searchParams.get("status");

    const supabase = getSupabaseAdmin();
    let query = supabase
      .from("purchases")
      .select("*, event:events(title,date,location), product:products(name,price_eur), tier:membership_tiers(name,price_eur)")
      .order("created_at", { ascending: false });

    if (type) query = query.eq("purchase_type", type);
    if (eventId) query = query.eq("event_id", eventId);
    if (status) query = query.eq("payment_status", status);

    const data = await readAll<DbPurchase>((from,to) => query.order("id").range(from,to));
    return NextResponse.json(data, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    console.warn("[Admin Purchases] Catch fallback:", err);
    return NextResponse.json({error:"No s'han pogut carregar les dades"},{status:503});
  }
}

// Payment status comes from Stripe reconciliation or atomic cash registration.
