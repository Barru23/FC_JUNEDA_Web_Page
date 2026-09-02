import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { getSupabaseAdmin } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const sessionId = searchParams.get("session_id");

  if (!sessionId) {
    return NextResponse.json({ error: "session_id requerit" }, { status: 400 });
  }

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.payment_status !== "paid") {
      return NextResponse.json({ status: "pending" });
    }

    // Try to find the purchase in DB (may not exist yet if webhook hasn't fired)
    const supabase = getSupabaseAdmin();
    const { data: purchase } = await supabase
      .from("purchases")
      .select("*, event:events(title,date,location), product:products(name), tier:membership_tiers(name)")
      .eq("stripe_session_id", sessionId)
      .single();

    return NextResponse.json({
      status: "paid",
      purchase,
      metadata: session.metadata,
      customerEmail: session.customer_email,
      amountTotal: (session.amount_total ?? 0) / 100,
    });
  } catch (err) {
    console.error("[Status] Error:", err);
    return NextResponse.json({ error: "Sessió no trobada" }, { status: 404 });
  }
}
