import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import {
  fulfillCheckoutSession,
  releaseCheckoutReservation,
} from "@/lib/checkout-fulfillment";

// A l'App Router, req.text() conserva el cos cru que Stripe necessita per
// verificar la signatura. No s'ha de parsejar com a JSON abans d'aquest punt.
export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature = req.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim();

  if (!signature || !webhookSecret) {
    return NextResponse.json({ error: "Webhook no configurat" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (error) {
    console.error("[Webhook] Signatura no valida");
    return NextResponse.json({ error: "Signatura no valida" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        // Els metodes immediats ja arriben com a paid. Els asincrons emeten
        // async_payment_succeeded mes tard; no confirmem ni alliberem abans.
        if (session.payment_status === "paid") await fulfillCheckoutSession(session);
        break;
      }
      case "checkout.session.async_payment_succeeded":
        await fulfillCheckoutSession(event.data.object as Stripe.Checkout.Session);
        break;
      case "checkout.session.async_payment_failed":
      case "checkout.session.expired":
        await releaseCheckoutReservation(
          (event.data.object as Stripe.Checkout.Session).id,
        );
        break;
      default:
        break;
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    // Un 5xx fa que Stripe ho reintenti. Les operacions de base de dades son
    // idempotents, de manera que cada reintent es segur.
    console.error(`[Webhook] Error processant ${event.type}:`, error);
    return NextResponse.json({ error: "No s'ha pogut processar" }, { status: 500 });
  }
}
