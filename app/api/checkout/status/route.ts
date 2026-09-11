import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { fulfillCheckoutSession, releaseCheckoutReservation } from "@/lib/checkout-fulfillment";
import { getSupabaseAdmin } from "@/lib/supabase";

const SESSION_PATTERN = /^cs_(test_|live_)?[A-Za-z0-9]+$/;

function json(body: Record<string, unknown>, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store, max-age=0" },
  });
}

function maskEmail(email: string | null | undefined): string | null {
  if (!email) return null;
  const at = email.lastIndexOf("@");
  if (at <= 0) return null;
  const local = email.slice(0, at);
  const domain = email.slice(at + 1);
  return `${local.slice(0, 1)}${"*".repeat(Math.min(Math.max(local.length - 1, 2), 5))}@${domain}`;
}

export async function POST(req: NextRequest) {
  let sessionId = "";
  try {
    const body = (await req.json()) as { sessionId?: unknown };
    sessionId = typeof body.sessionId === "string" ? body.sessionId.trim() : "";
  } catch {
    return json({ status: "invalid", message: "Peticio no valida" }, 400);
  }

  if (!SESSION_PATTERN.test(sessionId)) {
    return json({ status: "invalid", message: "Sessio de pagament no valida" }, 400);
  }

  let session: Stripe.Checkout.Session;
  try {
    session = await stripe.checkout.sessions.retrieve(sessionId);
  } catch (error) {
    console.error("[Status] Sessio no trobada:", error);
    return json({ status: "invalid", message: "No hem trobat aquesta sessio" }, 404);
  }

  if (session.status === "expired") {
    try {
      await releaseCheckoutReservation(session.id);
    } catch (error) {
      console.error("[Status] No s'ha pogut alliberar la reserva caducada:", error);
    }
    return json({ status: "failed", message: "La sessio ha caducat sense completar el pagament" });
  }

  const meta = session.metadata ?? {};
  if (session.payment_status !== "paid") {
    let reservationReleased = false;
    try {
      const supabase = getSupabaseAdmin();
      const { data: reservation } = await supabase
        .from("checkout_reservations")
        .select("status")
        .eq("stripe_session_id", session.id)
        .maybeSingle();
      reservationReleased = reservation?.status === "released";
    } catch (error) {
      console.error("[Status] No s'ha pogut consultar la reserva:", error);
    }

    if (reservationReleased) {
      return json({ status: "failed", message: "El pagament no s'ha completat i la reserva s'ha alliberat" });
    }

    return json({
      status: "processing",
      message:
        session.status === "complete"
          ? "Stripe encara esta processant el metode de pagament"
          : "El pagament encara no s'ha completat",
      purchaseType: meta.purchase_type ?? null,
      itemTitle: meta.item_title ?? null,
    });
  }

  let fulfillmentStatus: "complete" | "processing" = "processing";
  try {
    await fulfillCheckoutSession(session);
  } catch (error) {
    // El cobrament de Stripe continua sent valid. El webhook ho reintentara i
    // la pantalla ho explica sense convertir un pagament real en un fals error.
    console.error("[Status] Pagat, pero el registre encara no s'ha completat:", error);
  }

  let purchase: Record<string, unknown> | null = null;
  try {
    const supabase = getSupabaseAdmin();
    const result = await supabase
      .from("purchases")
      .select("purchase_type,quantity,size,email_sent,event:events(title,date,location),product:products(name),tier:membership_tiers(name)")
      .eq("stripe_session_id", session.id)
      .maybeSingle();
    if (result.error) console.error("[Status] No s'ha pogut llegir la compra:", result.error);
    else purchase = result.data as Record<string, unknown> | null;
  } catch (error) {
    console.error("[Status] Supabase no esta disponible:", error);
  }
  if (purchase) fulfillmentStatus = "complete";

  const event = purchase?.event as unknown as
    | { title?: string; date?: string; location?: string }
    | null
    | undefined;
  const product = purchase?.product as unknown as { name?: string } | null | undefined;
  const tier = purchase?.tier as unknown as { name?: string } | null | undefined;
  const type = (purchase?.purchase_type as string | undefined) ?? meta.purchase_type ?? "event";

  return json({
    status: "paid",
    fulfillmentStatus,
    purchaseType: type,
    itemTitle: event?.title ?? product?.name ?? tier?.name ?? meta.item_title ?? "Compra CF Juneda",
    quantity: type === "event" ? (purchase?.quantity as number | undefined) ?? Number(meta.quantity || 1) : null,
    size: type === "merch" ? (purchase?.size as string | undefined) ?? meta.size ?? null : null,
    eventDate: type === "event" ? event?.date ?? meta.event_date ?? null : null,
    eventLocation: type === "event" ? event?.location ?? meta.event_location ?? null : null,
    amountTotal: (session.amount_total ?? 0) / 100,
    customerEmail: maskEmail(session.customer_details?.email ?? session.customer_email),
    emailSent: purchase?.email_sent === true,
  });
}
