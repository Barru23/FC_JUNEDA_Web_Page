import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { getSupabaseAdmin } from "@/lib/supabase";
import { getMembershipTier } from "@/lib/memberships";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function validPrice(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

function metadataValue(value: unknown): string {
  return typeof value === "string" ? value.trim().slice(0, 500) : "";
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      type,
      eventId,
      productId,
      tierId,
      quantity,
      guestName,
      dietary,
      size,
      customNumber,
      email,
      phone,
    } = body;

    if (
      !["event", "merch", "membership"].includes(type) ||
      typeof email !== "string" ||
      !email.trim() ||
      typeof guestName !== "string" ||
      !guestName.trim()
    ) {
      return NextResponse.json({ error: "Falten camps obligatoris" }, { status: 400 });
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
    let lineItems: {
      price_data: {
        currency: string;
        product_data: { name: string; description?: string };
        unit_amount: number;
      };
      quantity: number;
    }[] = [];
    let metadata: Record<string, string> = {
      type,
      buyer_email: metadataValue(email),
      buyer_name: metadataValue(guestName),
      buyer_phone: metadataValue(phone),
    };

    // Event ticket. Supabase is the price and availability source of truth.
    if (type === "event") {
      const ticketQuantity = Number(quantity);
      if (!eventId || !Number.isInteger(ticketQuantity) || ticketQuantity < 1 || ticketQuantity > 20) {
        return NextResponse.json({ error: "Dades de l'esdeveniment no vàlides" }, { status: 400 });
      }

      const supabase = getSupabaseAdmin();
      const eventIdentifier = String(eventId);
      const eventColumn = UUID_PATTERN.test(eventIdentifier) ? "id" : "slug";
      const { data: eventRow, error: eventError } = await supabase
        .from("events")
        .select("*")
        .eq(eventColumn, eventIdentifier)
        .maybeSingle();

      if (eventError) throw eventError;
      if (!eventRow) return NextResponse.json({ error: "Esdeveniment no trobat" }, { status: 404 });
      if (eventRow.status !== "active") {
        return NextResponse.json({ error: "Aquest esdeveniment ja no està disponible" }, { status: 409 });
      }
      if (eventRow.spots_remaining < ticketQuantity) {
        return NextResponse.json({ error: "No hi ha prou places disponibles" }, { status: 409 });
      }

      const priceEur = Number(eventRow.price_eur);
      const bookingFeeEur = Number(eventRow.booking_fee_eur ?? 0);
      if (!validPrice(priceEur) || !Number.isFinite(bookingFeeEur) || bookingFeeEur < 0) {
        return NextResponse.json({ error: "El preu de l'esdeveniment no és vàlid" }, { status: 409 });
      }

      lineItems = [
        {
          price_data: {
            currency: "eur",
            product_data: {
              name: eventRow.title,
              description: `${ticketQuantity} tiquet(s) · ${eventRow.date} · ${eventRow.location}`,
            },
            unit_amount: Math.round(priceEur * 100),
          },
          quantity: ticketQuantity,
        },
      ];

      if (bookingFeeEur > 0) {
        lineItems.push({
          price_data: {
            currency: "eur",
            product_data: {
              name: "Despeses de gestió online",
              description: "Taxa de gestió per compra en línia",
            },
            unit_amount: Math.round(bookingFeeEur * 100),
          },
          quantity: 1,
        });
      }

      metadata = {
        ...metadata,
        event_id: eventRow.id,
        quantity: String(ticketQuantity),
        dietary: metadataValue(dietary),
        purchase_type: "event",
      };
    }

    // Merchandise. No client-provided or hardcoded fallback price is accepted.
    else if (type === "merch") {
      if (!productId || typeof size !== "string" || !size) {
        return NextResponse.json({ error: "Falten dades del producte" }, { status: 400 });
      }

      const supabase = getSupabaseAdmin();
      const productIdentifier = String(productId);
      const productColumn = UUID_PATTERN.test(productIdentifier) ? "id" : "slug";
      const { data: product, error: productError } = await supabase
        .from("products")
        .select("*")
        .eq(productColumn, productIdentifier)
        .maybeSingle();

      if (productError) throw productError;
      if (!product) return NextResponse.json({ error: "Producte no trobat" }, { status: 404 });
      if (product.status !== "active") {
        return NextResponse.json({ error: "Aquest producte ja no està disponible" }, { status: 409 });
      }

      const productSizes = Array.isArray(product.sizes) ? product.sizes : [];
      const productStock = (product.stock ?? {}) as Record<string, number>;
      if (!productSizes.includes(size)) {
        return NextResponse.json({ error: "La talla seleccionada no és vàlida" }, { status: 400 });
      }
      if (Number(productStock[size] ?? 0) < 1) {
        return NextResponse.json({ error: "Aquesta talla està esgotada" }, { status: 409 });
      }

      const productPrice = Number(product.price_eur);
      if (!validPrice(productPrice)) {
        return NextResponse.json({ error: "El preu del producte no és vàlid" }, { status: 409 });
      }

      let customization: string | undefined;
      if (product.customizable && customNumber) {
        if (typeof customNumber !== "string" || !/^\d{1,2}$/.test(customNumber)) {
          return NextResponse.json({ error: "El dorsal no és vàlid" }, { status: 400 });
        }
        customization = `#${customNumber}`;
      }

      lineItems = [
        {
          price_data: {
            currency: "eur",
            product_data: {
              name: product.name,
              description: [size, customization].filter(Boolean).join(" · ") || undefined,
            },
            unit_amount: Math.round(productPrice * 100),
          },
          quantity: 1,
        },
      ];

      metadata = {
        ...metadata,
        product_id: product.id,
        product_slug: product.slug,
        size,
        custom_number: customization ? customNumber : "",
        purchase_type: "merch",
      };
    }

    // Memberships keep their existing catalogue fallback, while preferring DB.
    else if (type === "membership") {
      const tierSlug = tierId ?? "soci-general";
      const catalogueTier = getMembershipTier(tierSlug);

      let tierName = catalogueTier?.name ?? "Soci General";
      let tierPrice = catalogueTier?.price_eur ?? 110;
      let season = catalogueTier?.season ?? "2026/27";
      let tierDbId: string | undefined;

      try {
        const supabase = getSupabaseAdmin();
        const { data: tier } = await supabase
          .from("membership_tiers")
          .select("*")
          .eq("slug", tierSlug)
          .single();
        if (tier) {
          tierName = tier.name;
          tierPrice = Number(tier.price_eur);
          season = tier.season;
          tierDbId = tier.id;
        }
      } catch (err) {
        console.warn("[Checkout] Supabase query fallback for tier:", err);
      }

      if (!validPrice(tierPrice)) {
        return NextResponse.json({ error: "El preu de la quota no és vàlid" }, { status: 409 });
      }

      lineItems = [
        {
          price_data: {
            currency: "eur",
            product_data: {
              name: `${tierName} — Temporada ${season}`,
              description: "Quota de soci Club Futbol Juneda",
            },
            unit_amount: Math.round(tierPrice * 100),
          },
          quantity: 1,
        },
      ];

      metadata = {
        ...metadata,
        tier_id: tierDbId ?? "",
        tier_slug: tierSlug,
        purchase_type: "membership",
      };
    }

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: lineItems,
      customer_email: email.trim(),
      // No fixem `payment_method_types`: així Stripe ofereix tots els mètodes
      // activats al dashboard (targeta, Bizum, Apple Pay, Google Pay) segons
      // el dispositiu del comprador. Declarar-los aquí els sobreescriuria.
      success_url: `${siteUrl}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/#${type === "event" ? "esdeveniments" : type === "merch" ? "botiga" : "socis"}`,
      metadata,
      locale: "auto",
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    // Un 500 opac amaga la causa justament quan mes falta fa saber-la: una
    // clau erronia, un compte de Stripe encara sense activar o un metode de
    // pagament no habilitat es diagnostiquen tots amb el codi que retorna
    // Stripe. El registrem sencer i n'exposem nomes el tipus i el codi, que no
    // contenen ni claus ni dades del comprador.
    if (err instanceof Stripe.errors.StripeError) {
      console.error(`[Checkout] Stripe ${err.type} (${err.code ?? "sense codi"}): ${err.message}`);
      return NextResponse.json(
        {
          error: "No s'ha pogut obrir la passarel·la de pagament",
          stripe_type: err.type,
          stripe_code: err.code ?? null,
        },
        { status: 502 },
      );
    }

    console.error("[Checkout] Error:", err);
    return NextResponse.json({ error: "Error intern del servidor al processar el pagament" }, { status: 500 });
  }
}
