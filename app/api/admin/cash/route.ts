import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { appendPurchaseRow } from "@/lib/sheets";

// POST /api/admin/cash — record a manual cash payment
export async function POST(req: NextRequest) {
  if (!isAdminAuthenticated(req)) return NextResponse.json({ error: "No autoritzat" }, { status: 401 });

  const body = await req.json();
  const { purchase_type, buyer_name, buyer_email, buyer_phone, event_id, product_id, tier_id, quantity, dietary, size, amount_eur } = body;

  if (!purchase_type || !buyer_name || !amount_eur) {
    return NextResponse.json({ error: "Falten camps obligatoris" }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  const sessionId = `CASH-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
  const now = new Date().toLocaleString("ca-ES", { timeZone: "Europe/Madrid" });

  const { data: purchase, error } = await supabase.from("purchases").insert({
    stripe_session_id: sessionId,
    purchase_type,
    buyer_name,
    buyer_email: buyer_email ?? "",
    buyer_phone: buyer_phone ?? null,
    event_id: event_id ?? null,
    product_id: product_id ?? null,
    tier_id: tier_id ?? null,
    quantity: quantity ?? 1,
    dietary: dietary ?? null,
    size: size ?? null,
    amount_eur,
    fee_eur: 0,
    payment_method: "cash",
    payment_status: "completed",
  }).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Sync to the relevant sheet
  try {
    if (purchase_type === "event" && event_id) {
      const { data: evt } = await supabase.from("events").select("sheet_id").eq("id", event_id).single();
      if (evt?.sheet_id) {
        await appendPurchaseRow(evt.sheet_id, {
          nom: buyer_name, email: buyer_email ?? "", telefon: buyer_phone,
          tiquets: quantity ?? 1, dietetica: dietary, preu: amount_eur,
          metode: "Efectiu 💵", estat: "Pagat ✅", data: now,
        }, "event");
        await supabase.from("purchases").update({ sheet_synced: true }).eq("id", purchase.id);
      }
    } else if (purchase_type === "merch") {
      const masterSheetId = process.env.GOOGLE_MASTER_SHEET_ID;
      if (masterSheetId) {
        const { data: prod } = await supabase.from("products").select("name").eq("id", product_id).single();
        await appendPurchaseRow(`${masterSheetId}::Botiga`, {
          nom: buyer_name, email: buyer_email ?? "", telefon: buyer_phone,
          producte: prod?.name, talla: size, preu: amount_eur,
          metode: "Efectiu 💵", estat: "Pagat ✅", data: now,
        }, "merch");
        await supabase.from("purchases").update({ sheet_synced: true }).eq("id", purchase.id);
      }
    } else if (purchase_type === "membership") {
      const masterSheetId = process.env.GOOGLE_MASTER_SHEET_ID;
      if (masterSheetId) {
        const { data: tier } = await supabase.from("membership_tiers").select("name, season").eq("id", tier_id).single();
        await appendPurchaseRow(`${masterSheetId}::Socis`, {
          nom: buyer_name, email: buyer_email ?? "", telefon: buyer_phone,
          tipusSoci: tier?.name, temporada: tier?.season, preu: amount_eur,
          metode: "Efectiu 💵", estat: "Pagat ✅", data: now,
        }, "membership");
        await supabase.from("purchases").update({ sheet_synced: true }).eq("id", purchase.id);
      }
    }
  } catch (sheetErr) { console.warn("[Cash] Sheet sync failed:", sheetErr); }

  return NextResponse.json(purchase, { status: 201 });
}
