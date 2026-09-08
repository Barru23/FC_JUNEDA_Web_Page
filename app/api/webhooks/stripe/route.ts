import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { getSupabaseAdmin } from "@/lib/supabase";
import { appendPurchaseRow } from "@/lib/sheets";
import { sendEventConfirmation, sendMerchConfirmation, sendMembershipWelcome } from "@/lib/email";
import Stripe from "stripe";

// A l'App Router no cal desactivar cap body parser: `req.text()` ja retorna
// els bytes crus que Stripe necessita per verificar la signatura.

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const sig = req.headers.get("stripe-signature");

  if (!sig) return NextResponse.json({ error: "No signature" }, { status: 400 });

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err) {
    console.error("[Webhook] Signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (event.type !== "checkout.session.completed") {
    return NextResponse.json({ received: true });
  }

  const session = event.data.object as Stripe.Checkout.Session;
  const meta = session.metadata ?? {};
  const supabase = getSupabaseAdmin();

  // Idempotency check — ignore if already processed
  const { data: existing } = await supabase
    .from("purchases")
    .select("id")
    .eq("stripe_session_id", session.id)
    .single();
  if (existing) return NextResponse.json({ received: true });

  const purchaseType = meta.purchase_type as "event" | "merch" | "membership" ?? "event";
  const amountEur = (session.amount_total ?? 0) / 100;
  const now = new Date().toLocaleString("ca-ES", { timeZone: "Europe/Madrid" });

  try {
    // ─── Event Purchase ─────────────────────────────────────────────────────────
    if (purchaseType === "event") {
      const eventId = meta.event_id;
      const qty = parseInt(meta.quantity ?? "1", 10);

      // Atomic: decrement spots_remaining (RPC to avoid race conditions)
      const { error: decrErr } = await supabase.rpc("decrement_spots", { event_id: eventId, amount: qty });
      if (decrErr) {
        console.error("[Webhook] Spots decrement failed:", decrErr);
        // Still record the purchase — admin can reconcile
      }

      // Record purchase
      const { data: purchase, error: insertErr } = await supabase.from("purchases").insert({
        stripe_session_id: session.id,
        stripe_payment_id: session.payment_intent as string,
        purchase_type: "event",
        buyer_name: meta.buyer_name,
        buyer_email: meta.buyer_email,
        buyer_phone: meta.buyer_phone ?? null,
        event_id: eventId,
        quantity: qty,
        dietary: meta.dietary ?? null,
        amount_eur: amountEur,
        payment_method: session.payment_method_types?.[0] ?? "card",
        payment_status: "completed",
      }).select().single();

      if (insertErr) { console.error("[Webhook] Insert error:", insertErr); }

      // Fetch event for sheet sync
      const { data: evt } = await supabase.from("events").select("*").eq("id", eventId).single();

      // Sync to Google Sheet
      if (evt?.sheet_id) {
        try {
          await appendPurchaseRow(evt.sheet_id, {
            nom: meta.buyer_name,
            email: meta.buyer_email,
            telefon: meta.buyer_phone,
            tiquets: qty,
            dietetica: meta.dietary,
            preu: amountEur,
            metode: "Targeta (Stripe)",
            estat: "Pagat ✅",
            data: now,
          }, "event");
          if (purchase?.id) {
            await supabase.from("purchases").update({ sheet_synced: true }).eq("id", purchase.id);
          }
        } catch (sheetErr) { console.error("[Webhook] Sheet sync error:", sheetErr); }
      }

      // Send confirmation email
      try {
        if (evt) {
          await sendEventConfirmation({
            to: meta.buyer_email,
            buyerName: meta.buyer_name,
            eventTitle: evt.title,
            eventDate: evt.date,
            eventLocation: evt.location,
            quantity: qty,
            dietary: meta.dietary,
            total: amountEur,
          });
          if (purchase?.id) {
            await supabase.from("purchases").update({ email_sent: true }).eq("id", purchase.id);
          }
        }
      } catch (emailErr) { console.error("[Webhook] Email error:", emailErr); }
    }

    // ─── Merch Purchase ─────────────────────────────────────────────────────────
    else if (purchaseType === "merch") {
      // meta.product_id is the UUID resolved at checkout time; empty string
      // means the lookup failed then, so re-resolve from the slug now rather
      // than pass "" into a UUID column (Postgres 22P02).
      let productId: string | null = meta.product_id || null;
      if (!productId && meta.product_slug) {
        const { data: bySlug } = await supabase.from("products").select("id").eq("slug", meta.product_slug).single();
        productId = bySlug?.id ?? null;
      }

      // Decrement stock for the size
      const { data: product } = productId
        ? await supabase.from("products").select("stock").eq("id", productId).single()
        : { data: null };
      if (product) {
        const stock = product.stock as Record<string, number>;
        const currentStock = stock[meta.size] ?? 0;
        if (currentStock > 0) {
          stock[meta.size] = currentStock - 1;
          await supabase.from("products").update({ stock }).eq("id", productId);
        }
      }

      const { data: purchase, error: merchInsertErr } = await supabase.from("purchases").insert({
        stripe_session_id: session.id,
        stripe_payment_id: session.payment_intent as string,
        purchase_type: "merch",
        buyer_name: meta.buyer_name,
        buyer_email: meta.buyer_email,
        buyer_phone: meta.buyer_phone ?? null,
        product_id: productId,
        size: meta.size,
        custom_number: meta.custom_number ?? null,
        amount_eur: amountEur,
        payment_method: session.payment_method_types?.[0] ?? "card",
        payment_status: "completed",
      }).select().single();

      if (merchInsertErr) { console.error("[Webhook] Merch insert error:", merchInsertErr); }

      // Sync to Botiga sheet
      const masterSheetId = process.env.GOOGLE_MASTER_SHEET_ID;
      if (masterSheetId) {
        try {
          const { data: prod } = productId
            ? await supabase.from("products").select("name").eq("id", productId).single()
            : { data: null };
          await appendPurchaseRow(`${masterSheetId}::Botiga`, {
            nom: meta.buyer_name,
            email: meta.buyer_email,
            telefon: meta.buyer_phone,
            producte: prod?.name ?? meta.product_slug ?? "Producte",
            talla: meta.size,
            personalitzacio: meta.custom_number ? `#${meta.custom_number}` : "Cap",
            preu: amountEur,
            metode: "Targeta (Stripe)",
            estat: "Pagat ✅",
            data: now,
          }, "merch");
          if (purchase?.id) await supabase.from("purchases").update({ sheet_synced: true }).eq("id", purchase.id);
        } catch (sheetErr) { console.error("[Webhook] Merch sheet error:", sheetErr); }
      }

      // Email
      try {
        const { data: prod } = productId
          ? await supabase.from("products").select("name").eq("id", productId).single()
          : { data: null };
        await sendMerchConfirmation({
          to: meta.buyer_email,
          buyerName: meta.buyer_name,
          productName: prod?.name ?? "",
          size: meta.size,
          customization: meta.custom_number ? `#${meta.custom_number}` : undefined,
          total: amountEur,
        });
        if (purchase?.id) await supabase.from("purchases").update({ email_sent: true }).eq("id", purchase.id);
      } catch (emailErr) { console.error("[Webhook] Merch email error:", emailErr); }
    }

    // ─── Membership Purchase ─────────────────────────────────────────────────
    else if (purchaseType === "membership") {
      // meta.tier_id is the UUID resolved at checkout time; empty string
      // means the lookup failed then — re-resolve from the slug now rather
      // than pass "" into a UUID column (Postgres 22P02).
      let tierId: string | null = meta.tier_id || null;
      if (!tierId && meta.tier_slug) {
        const { data: bySlug } = await supabase.from("membership_tiers").select("id").eq("slug", meta.tier_slug).single();
        tierId = bySlug?.id ?? null;
      }

      const { data: purchase } = await supabase.from("purchases").insert({
        stripe_session_id: session.id,
        stripe_payment_id: session.payment_intent as string,
        purchase_type: "membership",
        buyer_name: meta.buyer_name,
        buyer_email: meta.buyer_email,
        buyer_phone: meta.buyer_phone ?? null,
        tier_id: tierId,
        amount_eur: amountEur,
        payment_method: session.payment_method_types?.[0] ?? "card",
        payment_status: "completed",
      }).select().single();

      // Sync to Socis sheet
      const masterSheetId = process.env.GOOGLE_MASTER_SHEET_ID;
      if (masterSheetId) {
        try {
          const { data: tier } = tierId
            ? await supabase.from("membership_tiers").select("name, season").eq("id", tierId).single()
            : { data: null };
          await appendPurchaseRow(`${masterSheetId}::Socis`, {
            nom: meta.buyer_name,
            email: meta.buyer_email,
            telefon: meta.buyer_phone,
            tipusSoci: tier?.name,
            temporada: tier?.season,
            preu: amountEur,
            metode: "Targeta (Stripe)",
            estat: "Pagat ✅",
            data: now,
          }, "membership");
          if (purchase?.id) await supabase.from("purchases").update({ sheet_synced: true }).eq("id", purchase.id);
        } catch (sheetErr) { console.error("[Webhook] Soci sheet error:", sheetErr); }
      }

      // Email
      try {
        const { data: tier } = tierId
          ? await supabase.from("membership_tiers").select("name, season").eq("id", tierId).single()
          : { data: null };
        if (tier) {
          await sendMembershipWelcome({
            to: meta.buyer_email,
            buyerName: meta.buyer_name,
            tierName: tier.name,
            season: tier.season,
            total: amountEur,
          });
          if (purchase?.id) await supabase.from("purchases").update({ email_sent: true }).eq("id", purchase.id);
        }
      } catch (emailErr) { console.error("[Webhook] Soci email error:", emailErr); }
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error("[Webhook] Processing error:", err);
    return NextResponse.json({ error: "Processing failed" }, { status: 500 });
  }
}
