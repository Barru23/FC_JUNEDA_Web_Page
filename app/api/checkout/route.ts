import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { getSupabaseAdmin } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { type, eventId, productId, tierId, quantity, guestName, dietary, size, customName, customNumber, email, phone } = body;

    if (!type || !email) {
      return NextResponse.json({ error: "Falten camps obligatoris" }, { status: 400 });
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

    let lineItems: { price_data: { currency: string; product_data: { name: string; description?: string }; unit_amount: number }; quantity: number }[] = [];
    let metadata: Record<string, string> = { type, buyer_email: email, buyer_name: guestName ?? "", buyer_phone: phone ?? "" };

    // ─── Event Ticket ─────────────────────────────────────────────────────────
    if (type === "event") {
      if (!eventId || !quantity) return NextResponse.json({ error: "Falten dades de l'esdeveniment" }, { status: 400 });

      let eventTitle = "Tiquet Esdeveniment CF Juneda";
      let eventDate = "Proximament";
      let eventLocation = "Juneda";
      let priceEur = 18.00;
      let bookingFeeEur = 0.75;

      try {
        const supabase = getSupabaseAdmin();
        const { data: event } = await supabase.from("events").select("*").eq("id", eventId).single();
        if (event) {
          eventTitle = event.title;
          eventDate = event.date;
          eventLocation = event.location;
          priceEur = event.price_eur;
          bookingFeeEur = event.booking_fee_eur ?? 0.75;
          if (event.spots_remaining < quantity) {
            return NextResponse.json({ error: "No hi ha prou places disponibles" }, { status: 409 });
          }
        }
      } catch (err) {
        console.warn("[Checkout] Supabase query fallback for event:", err);
      }

      lineItems = [
        {
          price_data: {
            currency: "eur",
            product_data: { name: eventTitle, description: `${quantity} tiquet(s) · ${eventDate} · ${eventLocation}` },
            unit_amount: Math.round(priceEur * 100),
          },
          quantity,
        },
      ];

      if (bookingFeeEur > 0) {
        lineItems.push({
          price_data: {
            currency: "eur",
            product_data: { name: "Despeses de gestió online", description: "Taxa de gestió per compra en línia" },
            unit_amount: Math.round(bookingFeeEur * 100),
          },
          quantity: 1,
        });
      }

      metadata = { ...metadata, event_id: eventId, quantity: String(quantity), dietary: dietary ?? "", purchase_type: "event" };
    }

    // ─── Merchandise ──────────────────────────────────────────────────────────
    else if (type === "merch") {
      if (!size) return NextResponse.json({ error: "Falten dades del producte" }, { status: 400 });

      let productName = "1a Equipació Oficial CF Juneda";
      let productPrice = 39.90;
      let productDbId: string | undefined;
      const productSlug = productId ?? "1a-equipacio";

      try {
        const supabase = getSupabaseAdmin();
        const { data: product } = await supabase.from("products").select("*").eq("slug", productSlug).single();
        if (product) {
          productName = product.name;
          productPrice = product.price_eur;
          productDbId = product.id;
        }
      } catch (err) {
        console.warn("[Checkout] Supabase query fallback for product:", err);
      }

      const customization = customName ? `${customName}${customNumber ? ` #${customNumber}` : ""}` : undefined;
      lineItems = [{
        price_data: {
          currency: "eur",
          product_data: { name: productName, description: [size, customization].filter(Boolean).join(" · ") || undefined },
          unit_amount: Math.round(productPrice * 100),
        },
        quantity: 1,
      }];

      metadata = { ...metadata, product_id: productDbId ?? "", product_slug: productSlug, size, custom_number: customNumber ?? "", purchase_type: "merch" };
    }

    // ─── Membership ───────────────────────────────────────────────────────────
    else if (type === "membership") {
      let tierName = "Soci/Sòcia CF Juneda";
      let tierPrice = 25.00;
      let season = "2025/26";
      let tierDbId: string | undefined;
      const tierSlug = tierId ?? "soci-general";

      try {
        const supabase = getSupabaseAdmin();
        const { data: tier } = await supabase.from("membership_tiers").select("*").eq("slug", tierSlug).single();
        if (tier) {
          tierName = tier.name;
          tierPrice = tier.price_eur;
          season = tier.season;
          tierDbId = tier.id;
        }
      } catch (err) {
        console.warn("[Checkout] Supabase query fallback for tier:", err);
      }

      lineItems = [{
        price_data: {
          currency: "eur",
          product_data: { name: `${tierName} — Temporada ${season}`, description: "Quota de soci Club Futbol Juneda" },
          unit_amount: Math.round(tierPrice * 100),
        },
        quantity: 1,
      }];

      metadata = { ...metadata, tier_id: tierDbId ?? "", tier_slug: tierSlug, purchase_type: "membership" };
    }

    else {
      return NextResponse.json({ error: "Tipus de compra no vàlid" }, { status: 400 });
    }

    // Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: lineItems,
      customer_email: email,
      payment_method_types: ["card"],
      success_url: `${siteUrl}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/#${type === "event" ? "esdeveniments" : type === "merch" ? "botiga" : "socis"}`,
      metadata,
      locale: "auto",
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("[Checkout] Error:", err);
    return NextResponse.json({ error: "Error intern del servidor al processar el pagament" }, { status: 500 });
  }
}
