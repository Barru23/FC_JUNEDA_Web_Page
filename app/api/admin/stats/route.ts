import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { isAdminAuthenticated } from "@/lib/admin-auth";

export async function GET(req: NextRequest) {
  if (!isAdminAuthenticated(req)) {
    return NextResponse.json({ error: "No autoritzat" }, { status: 401 });
  }

  try {
    const supabase = getSupabaseAdmin();

    // Revenue totals
    const { data: revData } = await supabase
      .from("purchases")
      .select("purchase_type, amount_eur")
      .eq("payment_status", "completed");

    const totals = (revData ?? []).reduce(
      (acc, p) => {
        acc.total += p.amount_eur;
        if (p.purchase_type === "event") acc.event += p.amount_eur;
        if (p.purchase_type === "merch") acc.merch += p.amount_eur;
        if (p.purchase_type === "membership") acc.membership += p.amount_eur;
        return acc;
      },
      { total: 0, event: 0, merch: 0, membership: 0 }
    );

    // Counts
    const { count: ticketCount } = await supabase
      .from("purchases")
      .select("*", { count: "exact", head: true })
      .eq("purchase_type", "event")
      .eq("payment_status", "completed");

    const { count: merchCount } = await supabase
      .from("purchases")
      .select("*", { count: "exact", head: true })
      .eq("purchase_type", "merch")
      .eq("payment_status", "completed");

    const { count: memberCount } = await supabase
      .from("purchases")
      .select("*", { count: "exact", head: true })
      .eq("purchase_type", "membership")
      .eq("payment_status", "completed");

    // Recent purchases (last 10)
    const { data: recent } = await supabase
      .from("purchases")
      .select("*, event:events(title,date), product:products(name), tier:membership_tiers(name)")
      .order("created_at", { ascending: false })
      .limit(10);

    return NextResponse.json({
      total_revenue: totals.total,
      event_revenue: totals.event,
      merch_revenue: totals.merch,
      membership_revenue: totals.membership,
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
      tickets_sold: 0,
      merch_orders: 0,
      active_members: 0,
      recent_purchases: [],
    });
  }
}
