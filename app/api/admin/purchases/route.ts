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

const ESTATS_PAGAMENT = new Set(["pending", "completed", "refunded", "failed"]);

// PATCH /api/admin/purchases — update a purchase (mark paid, add notes, etc.)
//
// Nomes s'accepten les tres columnes que la Junta ha de poder corregir a ma.
// Abans el cos de la peticio anava sencer a l'UPDATE, aixi que qualsevol camp
// era escrivible: `amount_eur`, `fee_eur` o `stripe_session_id` inclosos. Un
// import el fixa Stripe i no s'ha de poder reescriure des del panell, i una
// crida mal construida podia corrompre files sense que ningu se n'adones.
export async function PATCH(req: NextRequest) {
  if (!isAdminAuthenticated(req)) return NextResponse.json({ error: "No autoritzat" }, { status: 401 });

  const body = await req.json();
  const { id } = body;
  if (typeof id !== "string" || !id) return NextResponse.json({ error: "ID requerit" }, { status: 400 });

  const updates: Record<string, unknown> = {};
  if (body.payment_status !== undefined) {
    if (!ESTATS_PAGAMENT.has(body.payment_status)) {
      return NextResponse.json({ error: "Estat de pagament no vàlid" }, { status: 400 });
    }
    updates.payment_status = body.payment_status;
  }
  if (body.sheet_synced !== undefined) updates.sheet_synced = body.sheet_synced === true;
  if (body.email_sent !== undefined) updates.email_sent = body.email_sent === true;

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "Cap camp editable a la petició" }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.from("purchases").update(updates).eq("id", id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
