import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { isAdminAuthenticated } from "@/lib/admin-auth";

// GET /api/admin/purchases — list with optional filters
export async function GET(req: NextRequest) {
  if (!isAdminAuthenticated(req)) return NextResponse.json({ error: "No autoritzat" }, { status: 401 });

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

    const { data, error } = await query;
    if (error) {
      console.warn("[Admin Purchases] Query fallback:", error.message);
      return NextResponse.json([]);
    }
    return NextResponse.json(data ?? []);
  } catch (err) {
    console.warn("[Admin Purchases] Catch fallback:", err);
    return NextResponse.json([]);
  }
}

// PATCH /api/admin/purchases — update a purchase (mark paid, add notes, etc.)
export async function PATCH(req: NextRequest) {
  if (!isAdminAuthenticated(req)) return NextResponse.json({ error: "No autoritzat" }, { status: 401 });

  const body = await req.json();
  const { id, ...updates } = body;
  if (!id) return NextResponse.json({ error: "ID requerit" }, { status: 400 });

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.from("purchases").update(updates).eq("id", id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
