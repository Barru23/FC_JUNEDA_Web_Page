import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { notifyPurchase } from "@/lib/notify";

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

  // El registre al full de la Junta. Els pagaments en efectiu no envien correu:
  // qui paga en ma ja te el tiquet a la seva i no ha donat necessariament una
  // adreca valida.
  let sheet: string | null = null;
  let row = null as Parameters<typeof notifyPurchase>[0]["row"] | null;
  const base = {
    nom: buyer_name,
    email: buyer_email ?? "",
    telefon: buyer_phone,
    preu: amount_eur,
    metode: "Efectiu 💵",
    estat: "Pagat ✅",
    data: now,
  };

  if (purchase_type === "event" && event_id) {
    const { data: evt } = await supabase.from("events").select("sheet_id, title").eq("id", event_id).single();
    if (evt) {
      sheet = evt.sheet_id || evt.title;
      row = { ...base, tiquets: quantity ?? 1, dietetica: dietary };
    }
  } else if (purchase_type === "merch") {
    const { data: prod } = product_id
      ? await supabase.from("products").select("name").eq("id", product_id).single()
      : { data: null };
    sheet = "Botiga";
    row = { ...base, producte: prod?.name ?? "Producte", talla: size, personalitzacio: "Cap" };
  } else if (purchase_type === "membership") {
    const { data: tier } = tier_id
      ? await supabase.from("membership_tiers").select("name, season").eq("id", tier_id).single()
      : { data: null };
    sheet = "Socis";
    row = { ...base, tipusSoci: tier?.name, temporada: tier?.season };
  }

  if (sheet && row) {
    const result = await notifyPurchase({ type: purchase_type, sheet, row, email: null });
    if (result?.ok) {
      await supabase.from("purchases").update({ sheet_synced: true }).eq("id", purchase.id);
    }
  }

  return NextResponse.json(purchase, { status: 201 });
}
