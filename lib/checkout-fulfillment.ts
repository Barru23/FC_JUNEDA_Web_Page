import Stripe from "stripe";
import { getSupabaseAdmin } from "@/lib/supabase";
import { notifyPurchase } from "@/lib/notify";

type PurchaseType = "event" | "merch" | "membership";

type FinalizeRow = {
  purchase_id: string;
  was_created: boolean;
};

export type FulfillmentResult = {
  purchaseId: string;
  created: boolean;
};

function parseMoney(value: string | undefined): number | null {
  if (typeof value !== "string" || !value.trim()) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

function parseQuantity(value: string | undefined): number {
  const parsed = Number.parseInt(value ?? "1", 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 1;
}

function purchaseType(value: string | undefined): PurchaseType {
  return value === "merch" || value === "membership" ? value : "event";
}

/**
 * Converteix una sessio de Stripe ja cobrada en una compra. La funcio SQL que
 * hi ha al darrere bloqueja la reserva i crea la compra en una sola transaccio,
 * de manera que el webhook i la pagina de retorn poden cridar aixo alhora sense
 * duplicar files, correus ni descomptes d'inventari.
 */
export async function fulfillCheckoutSession(
  session: Stripe.Checkout.Session,
): Promise<FulfillmentResult> {
  if (session.payment_status !== "paid") {
    throw new Error(`La sessio ${session.id} encara no esta pagada`);
  }

  const meta = session.metadata ?? {};
  const type = purchaseType(meta.purchase_type);
  const quantity = type === "merch" ? 1 : parseQuantity(meta.quantity);
  const totalPaidEur = (session.amount_total ?? 0) / 100;
  const feeEur = parseMoney(meta.fee_eur) ?? 0;
  const amountEur = parseMoney(meta.net_eur) ?? Math.max(totalPaidEur - feeEur, 0);
  const paymentId =
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : session.payment_intent?.id ?? "";
  const paymentMethod = session.payment_method_types?.[0] ?? "stripe";
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase.rpc("finalize_checkout_purchase", {
    p_session_id: session.id,
    p_payment_id: paymentId,
    p_purchase_type: type,
    p_buyer_name: meta.buyer_name ?? "Comprador/a",
    p_buyer_email: meta.buyer_email ?? session.customer_email ?? "",
    p_buyer_phone: meta.buyer_phone ?? "",
    p_event_id: meta.event_id || null,
    p_quantity: quantity,
    p_dietary: meta.dietary ?? "",
    p_product_id: meta.product_id || null,
    p_size: meta.size ?? "",
    p_custom_number: meta.custom_number ?? "",
    p_tier_id: meta.tier_id || null,
    p_amount_eur: amountEur,
    p_fee_eur: feeEur,
    p_payment_method: paymentMethod,
  });

  if (error) throw new Error(`No s'ha pogut registrar la compra ${session.id}: ${error.message}`);

  const row = (Array.isArray(data) ? data[0] : data) as FinalizeRow | null;
  if (!row?.purchase_id) throw new Error(`La compra ${session.id} no ha retornat cap identificador`);

  // Un duplicat ja ha estat notificat per la primera crida. Apps Script no es
  // part de la transaccio principal: si cau, Stripe i Supabase continuen
  // reflectint correctament el cobrament i l'admin mostra el correu pendent.
  if (row.was_created) {
    await notifyNewPurchase({
      supabase,
      purchaseId: row.purchase_id,
      type,
      meta,
      quantity,
      totalPaidEur,
    });
  }

  return { purchaseId: row.purchase_id, created: row.was_created };
}

export async function releaseCheckoutReservation(sessionId: string): Promise<void> {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.rpc("release_checkout_reservation", {
    p_session_id: sessionId,
  });
  if (error) throw new Error(`No s'ha pogut alliberar la reserva ${sessionId}: ${error.message}`);
}

async function notifyNewPurchase({
  supabase,
  purchaseId,
  type,
  meta,
  quantity,
  totalPaidEur,
}: {
  supabase: ReturnType<typeof getSupabaseAdmin>;
  purchaseId: string;
  type: PurchaseType;
  meta: Record<string, string>;
  quantity: number;
  totalPaidEur: number;
}) {
  const now = new Date().toLocaleString("ca-ES", { timeZone: "Europe/Madrid" });
  let result: Awaited<ReturnType<typeof notifyPurchase>> = null;

  if (type === "event") {
    const { data: event } = await supabase
      .from("events")
      .select("title,date,location,sheet_id")
      .eq("id", meta.event_id)
      .maybeSingle();

    if (event) {
      result = await notifyPurchase({
        type: "event",
        sheet: event.sheet_id || event.title,
        row: {
          nom: meta.buyer_name,
          email: meta.buyer_email,
          telefon: meta.buyer_phone,
          tiquets: quantity,
          dietetica: meta.dietary,
          preu: totalPaidEur,
          metode: "Stripe",
          estat: "Pagat ✅",
          data: now,
        },
        email: {
          to: meta.buyer_email,
          buyerName: meta.buyer_name,
          eventTitle: event.title,
          eventDate: event.date,
          eventLocation: event.location,
          quantity,
          dietary: meta.dietary,
          total: totalPaidEur,
        },
      });
    }
  } else if (type === "merch") {
    const { data: product } = meta.product_id
      ? await supabase.from("products").select("name").eq("id", meta.product_id).maybeSingle()
      : { data: null };
    const productName = product?.name ?? meta.item_title ?? meta.product_slug ?? "Producte";
    const customization = meta.custom_number ? `#${meta.custom_number}` : undefined;

    result = await notifyPurchase({
      type: "merch",
      sheet: "Botiga",
      row: {
        nom: meta.buyer_name,
        email: meta.buyer_email,
        telefon: meta.buyer_phone,
        producte: productName,
        talla: meta.size,
        personalitzacio: customization ?? "Cap",
        preu: totalPaidEur,
        metode: "Stripe",
        estat: "Pagat ✅",
        data: now,
      },
      email: {
        to: meta.buyer_email,
        buyerName: meta.buyer_name,
        productName,
        size: meta.size,
        customization,
        total: totalPaidEur,
      },
    });
  } else {
    const { data: tier } = meta.tier_id
      ? await supabase
          .from("membership_tiers")
          .select("name,season")
          .eq("id", meta.tier_id)
          .maybeSingle()
      : { data: null };

    result = await notifyPurchase({
      type: "membership",
      sheet: "Socis",
      row: {
        nom: meta.buyer_name,
        email: meta.buyer_email,
        telefon: meta.buyer_phone,
        tipusSoci: tier?.name ?? meta.item_title,
        temporada: tier?.season,
        preu: totalPaidEur,
        metode: "Stripe",
        estat: "Pagat ✅",
        data: now,
      },
      email: {
        to: meta.buyer_email,
        buyerName: meta.buyer_name,
        tierName: tier?.name ?? meta.item_title,
        season: tier?.season,
        total: totalPaidEur,
      },
    });
  }

  if (!result?.ok) return;
  const { error } = await supabase
    .from("purchases")
    .update({ sheet_synced: true, email_sent: result.correuEnviat === true })
    .eq("id", purchaseId);
  if (error) console.error("[Fulfillment] No s'ha pogut marcar la sincronitzacio:", error);
}
