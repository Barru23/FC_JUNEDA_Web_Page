import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { isAdminAuthenticated } from "@/lib/admin-auth";

export async function GET(req: NextRequest) {
  if (!isAdminAuthenticated(req)) {
    return NextResponse.json({ error: "No autoritzat" }, { status: 401 });
  }

  try {
    const supabase = getSupabaseAdmin();

    // Les dues consultes son independents: amb Promise.all l'espera total es la
    // de la mes lenta i no la suma de totes dues (importa sobretot quan
    // Supabase va lent, perque comparteixen el mateix timeout de fetch — vegeu
    // lib/supabase.ts).
    //
    // Abans n'hi havia cinc: tres eren `count` sobre la mateixa taula i el
    // mateix filtre que la primera. Ara els comptadors surten de les files que
    // ja tenim a la ma, aixi que son tres viatges menys a la base de dades.
    const [revRes, recentRes] = await Promise.all([
      supabase
        .from("purchases")
        .select("purchase_type, amount_eur, fee_eur, quantity")
        .eq("payment_status", "completed"),
      supabase
        .from("purchases")
        .select("*, event:events(title,date), product:products(name), tier:membership_tiers(name)")
        .order("created_at", { ascending: false })
        .limit(10),
    ]);

    // `amount_eur` es l'ingres net del club: la despesa de gestio va a part, a
    // `fee_eur`, perque se'n va integra a Stripe i no es diners del club.
    //
    // Els tiquets es compten sumant `quantity`, no comptant files: una comanda
    // de sis tiquets es una sola fila, i comptar-la com un tiquet deixava la
    // xifra del panell sistematicament per sota de la real.
    const totals = (revRes.data ?? []).reduce(
      (acc, p) => {
        acc.total += p.amount_eur;
        acc.fees += p.fee_eur ?? 0;
        if (p.purchase_type === "event") {
          acc.event += p.amount_eur;
          acc.tickets += Number(p.quantity ?? 1);
        }
        if (p.purchase_type === "merch") {
          acc.merch += p.amount_eur;
          acc.merchOrders += 1;
        }
        if (p.purchase_type === "membership") {
          acc.membership += p.amount_eur;
          acc.members += 1;
        }
        return acc;
      },
      {
        total: 0,
        event: 0,
        merch: 0,
        membership: 0,
        fees: 0,
        tickets: 0,
        merchOrders: 0,
        members: 0,
      }
    );

    return NextResponse.json({
      total_revenue: totals.total,
      event_revenue: totals.event,
      merch_revenue: totals.merch,
      membership_revenue: totals.membership,
      fees_collected: totals.fees,
      tickets_sold: totals.tickets,
      merch_orders: totals.merchOrders,
      active_members: totals.members,
      recent_purchases: recentRes.data ?? [],
    });
  } catch (err) {
    console.warn("[Admin Stats] Supabase query fallback:", err);
    return NextResponse.json({
      total_revenue: 0,
      event_revenue: 0,
      merch_revenue: 0,
      membership_revenue: 0,
      fees_collected: 0,
      tickets_sold: 0,
      merch_orders: 0,
      active_members: 0,
      recent_purchases: [],
    });
  }
}
