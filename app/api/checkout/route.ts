import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { getSupabaseAdmin } from "@/lib/supabase";
import { serviceFeeCents } from "@/lib/fees";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function validPrice(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

function metadataValue(value: unknown): string {
  return typeof value === "string" ? value.trim().slice(0, 500) : "";
}

// La despesa de gestio es cobra un cop per comanda, no per unitat: la comissio
// de Stripe tambe es una per transaccio. Va com a line item propi perque el
// comprador la vegi desglossada dins de la propia pagina de Stripe, no nomes al
// resum d'abans de pagar.
//
// El text no ha de lligar-la al mitja de pagament: el RDL 19/2018 (PSD2)
// prohibeix recarregar al consumidor l'us de targeta o Bizum. El que es cobra
// es la gestio de la compra en linia, que s'aplica igual amb qualsevol mitja
// -- que es com ho descriuen tambe les condicions de compra.
function feeLineItem(feeCents: number) {
  return {
    price_data: {
      currency: "eur",
      product_data: {
        name: "Despeses de gestió",
        description: "Gestió de la compra en línia",
      },
      unit_amount: feeCents,
    },
    quantity: 1,
  };
}

// Stripe rebutja amb `url_invalid` qualsevol success_url que no sigui una URL
// publica absoluta -- http://localhost inclos, en mode live. Enlloc de dependre
// nomes de NEXT_PUBLIC_SITE_URL, que es facil d'oblidar en configurar Vercel,
// caiem a les variables que Vercel injecta sol. La barra final es treu perque
// despres hi concatenem "/success".
function getSiteUrl(): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (configured) return configured.replace(/\/+$/, "");

  // Domini de produccio del projecte; en desplegaments de preview, el d'aquell
  // desplegament concret. Vercel les dona sense esquema.
  const vercelHost =
    process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim() || process.env.VERCEL_URL?.trim();
  if (vercelHost) return `https://${vercelHost.replace(/^https?:\/\//, "").replace(/\/+$/, "")}`;

  return "http://localhost:3000";
}

// Validacio deliberadament laxa: nomes descarta el que Stripe rebutjaria amb
// `email_invalid`, per donar un missatge en catala al comprador en lloc d'un
// error opac de passarel·la. Qui decideix si una adreca existeix es el correu
// de confirmacio, no una expressio regular.
function validEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@.]+\.[^\s@]+$/.test(value);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      type,
      eventId,
      productId,
      quantity,
      guestName,
      dietary,
      size,
      customNumber,
      email,
      phone,
    } = body;

    if (
      !["event", "merch"].includes(type) ||
      typeof email !== "string" ||
      !email.trim() ||
      typeof guestName !== "string" ||
      !guestName.trim()
    ) {
      return NextResponse.json({ error: "Falten camps obligatoris" }, { status: 400 });
    }

    if (!validEmail(email.trim())) {
      return NextResponse.json(
        { error: "L'adreça de correu no és vàlida" },
        { status: 400 },
      );
    }

    const siteUrl = getSiteUrl();
    let lineItems: {
      price_data: {
        currency: string;
        product_data: { name: string; description?: string };
        unit_amount: number;
      };
      quantity: number;
    }[] = [];
    // El desglos net/gestio es resol aqui, amb el preu de Supabase a la ma, i
    // viatja a la metadata perque el webhook el pugui desar sense recalcular-lo
    // ni tornar a consultar la base de dades.
    let netCents = 0;
    let feeCents = 0;
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
      if (!validPrice(priceEur)) {
        return NextResponse.json({ error: "El preu de l'esdeveniment no és vàlid" }, { status: 409 });
      }

      const unitCents = Math.round(priceEur * 100);
      netCents = unitCents * ticketQuantity;
      feeCents = serviceFeeCents(netCents);

      lineItems = [
        {
          price_data: {
            currency: "eur",
            product_data: {
              name: eventRow.title,
              description: `${ticketQuantity} tiquet(s) · ${eventRow.date} · ${eventRow.location}`,
            },
            unit_amount: unitCents,
          },
          quantity: ticketQuantity,
        },
        feeLineItem(feeCents),
      ];

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

      netCents = Math.round(productPrice * 100);
      feeCents = serviceFeeCents(netCents);

      lineItems = [
        {
          price_data: {
            currency: "eur",
            product_data: {
              name: product.name,
              description: [size, customization].filter(Boolean).join(" · ") || undefined,
            },
            unit_amount: netCents,
          },
          quantity: 1,
        },
        feeLineItem(feeCents),
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

    metadata = {
      ...metadata,
      net_eur: (netCents / 100).toFixed(2),
      fee_eur: (feeCents / 100).toFixed(2),
    };

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: lineItems,
      customer_email: email.trim(),
      // No fixem `payment_method_types`: així Stripe ofereix tots els mètodes
      // activats al dashboard (targeta, Bizum, Apple Pay, Google Pay) segons
      // el dispositiu del comprador. Declarar-los aquí els sobreescriuria.
      success_url: `${siteUrl}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/#${type === "event" ? "esdeveniments" : "botiga"}`,
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
