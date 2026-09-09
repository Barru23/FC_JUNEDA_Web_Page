import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { isAdminAuthenticated } from "@/lib/admin-auth";

export async function GET(req: NextRequest) {
  if (!isAdminAuthenticated(req)) {
    return NextResponse.json({ error: "No autoritzat" }, { status: 401 });
  }

  try {
    const supabase = getSupabaseAdmin();

    // None of these five queries depend on each other — running them with
    // Promise.all bounds the total wait to the slowest single call instead
    // of their sum (matters most when Supabase is slow/unreachable, since
    // every call shares the same fetch timeout — see lib/supabase.ts).
    const [revRes, ticketRes, merchRes, memberRes, recentRes] = await Promise.all([
      supabase.from("purchases").select("purchase_type, amount_eur, fee_eur").eq("payment_status", "completed"),
      supabase.from("purchases").select("*", { count: "exact", head: true }).eq("purchase_type", "event").eq("payment_status", "completed"),
      supabase.from("purchases").select("*", { count: "exact", head: true }).eq("purchase_type", "merch").eq("payment_status", "completed"),
      supabase.from("purchases").select("*", { count: "exact", head: true }).eq("purchase_type", "membership").eq("payment_status", "completed"),
      supabase.from("purchases").select("*, event:events(title,date), product:products(name), tier:membership_tiers(name)").order("created_at", { ascending: false }).limit(10),
    ]);

    // `amount_eur` es l'ingres net del club: la despesa de gestio va a part, a
    // `fee_eur`, perque se'n va integra a Stripe i no es diners del club.
    const totals = (revRes.data ?? []).reduce(
      (acc, p) => {
        acc.total += p.amount_eur;
        acc.fees += p.fee_eur ?? 0;
        if (p.purchase_type === "event") acc.event += p.amount_eur;
        if (p.purchase_type === "merch") acc.merch += p.amount_eur;
        if (p.purchase_type === "membership") acc.membership += p.amount_eur;
        return acc;
      },
      { total: 0, event: 0, merch: 0, membership: 0, fees: 0 }
    );

    const ticketCount = ticketRes.count;
    const merchCount = merchRes.count;
    const memberCount = memberRes.count;
    const recent = recentRes.data;

    return NextResponse.json({
      total_revenue: totals.total,
      event_revenue: totals.event,
      merch_revenue: totals.merch,
      membership_revenue: totals.membership,
      fees_collected: totals.fees,
      tickets_sold: ticketCount ?? 0,
      merch_orders: merchCount ?? 0,
      active_members: memberCount ?? 0,
      recent_purchases: recent ?? [],
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
