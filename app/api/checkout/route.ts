import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { getSupabaseAdmin } from "@/lib/supabase";
import { serviceFeeCents } from "@/lib/fees";
import { getSiteUrl } from "@/lib/site-url";
import { limitRequest, readJson, RequestError, sameOrigin } from "@/lib/request-security";
import { MAX_TICKETS_PER_ORDER } from "@/lib/event-status";

// Sessions de Stripe creades per IP durant la vida d'una reserva (31 min). Es
// compten nomes les que arriben a reservar inventari, no els errors de
// formulari. El marxandatge va d'una en una unitat, per aixo en permet mes.
const HOLD_WINDOW_SECONDS = 31 * 60;
const MAX_HOLDS = { event: 3, merch: 6 } as const;

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function validPrice(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

function metadataValue(value: unknown): string {
  return typeof value === "string" ? value.trim().slice(0, 500) : "";
}

type InventoryReservation =
  | { type: "event"; eventId: string; quantity: number }
  | { type: "merch"; productId: string; size: string; quantity: number };

async function expireUnusedSession(sessionId: string) {
  try {
    await stripe.checkout.sessions.expire(sessionId);
  } catch (error) {
    // La sessio no s'ha retornat mai al comprador i caducara igualment. Aquest
    // error secundari no ha d'amagar el motiu real pel qual no hi ha reserva.
    console.error(`[Checkout] No s'ha pogut caducar ${sessionId}:`, error);
  }
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

// Validacio deliberadament laxa: nomes descarta el que Stripe rebutjaria amb
// `email_invalid`, per donar un missatge en catala al comprador en lloc d'un
// error opac de passarel·la. Qui decideix si una adreca existeix es el correu
// de confirmacio, no una expressio regular.
function validEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@.]+\.[^\s@]+$/.test(value);
}

export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return NextResponse.json({ error: "Origen no autoritzat" }, { status: 403 });
  try {
    const limited = await limitRequest(req, "checkout", 15, 15 * 60);
    if (limited) return limited;
    const body = await readJson(req);
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
      typeof type !== "string" || !["event", "merch"].includes(type) ||
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
    let reservation: InventoryReservation | null = null;
    let metadata: Record<string, string> = {
      type,
      buyer_email: metadataValue(email),
      buyer_name: metadataValue(guestName),
      buyer_phone: metadataValue(phone),
    };

    // Event ticket. Supabase is the price and availability source of truth.
    if (type === "event") {
      const ticketQuantity = Number(quantity);
      if (!eventId || !Number.isInteger(ticketQuantity) || ticketQuantity < 1 || ticketQuantity > MAX_TICKETS_PER_ORDER) {
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
        item_title: metadataValue(eventRow.title),
        event_date: metadataValue(eventRow.date),
        event_location: metadataValue(eventRow.location),
      };
      reservation = { type: "event", eventId: eventRow.id, quantity: ticketQuantity };
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
        custom_number: customization ? metadataValue(customNumber) : "",
        purchase_type: "merch",
        item_title: metadataValue(product.name),
      };
      reservation = { type: "merch", productId: product.id, size, quantity: 1 };
    }

    metadata = {
      ...metadata,
      net_eur: (netCents / 100).toFixed(2),
      fee_eur: (feeCents / 100).toFixed(2),
    };

    if (!reservation) throw new Error("No s'ha pogut determinar l'inventari del checkout");
    // Sostre de reserves obertes per IP: sense ell, un bucle de peticions valides
    // deixaria l'esdeveniment sense places durant mitja hora, i de nou despres.
    const holdLimited = await limitRequest(
      req, `checkout-hold-${reservation.type}`, MAX_HOLDS[reservation.type], HOLD_WINDOW_SECONDS,
    );
    if (holdLimited) return holdLimited;

    // Stripe exigeix un minim de 30 minuts. En reservem 31 per absorbir els
    // segons que passen entre calcular la data i crear la sessio.
    const expiresAt = Math.floor(Date.now() / 1000) + 31 * 60;
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
      expires_at: expiresAt,
    });

    // La URL nomes surt del servidor quan la reserva atomica ja ha restat
    // places/estoc. Si dos compradors intenten agafar l'ultima unitat, nomes
    // una de les dues transaccions pot retornar true.
    const supabase = getSupabaseAdmin();
    const reservationResult =
      reservation.type === "event"
        ? await supabase.rpc("reserve_event_checkout", {
            p_session_id: session.id,
            p_event_id: reservation.eventId,
            p_quantity: reservation.quantity,
            p_expires_at: new Date(expiresAt * 1000).toISOString(),
          })
        : await supabase.rpc("reserve_merch_checkout", {
            p_session_id: session.id,
            p_product_id: reservation.productId,
            p_size: reservation.size,
            p_quantity: reservation.quantity,
            p_expires_at: new Date(expiresAt * 1000).toISOString(),
          });

    if (reservationResult.error) {
      await expireUnusedSession(session.id);
      throw new Error(`No s'ha pogut reservar l'inventari: ${reservationResult.error.message}`);
    }
    if (reservationResult.data !== true) {
      await expireUnusedSession(session.id);
      return NextResponse.json(
        {
          error:
            reservation.type === "event"
              ? "Ja no hi ha prou places disponibles"
              : "Aquesta talla s'acaba d'esgotar",
        },
        { status: 409 },
      );
    }

    if (!session.url) {
      await expireUnusedSession(session.id);
      await supabase.rpc("release_checkout_reservation", { p_session_id: session.id });
      throw new Error("Stripe no ha retornat cap URL de pagament");
    }

    return NextResponse.json({ url: session.url });
  } catch (err) {
    if (err instanceof RequestError) return NextResponse.json({ error: err.message }, { status: err.status });
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
