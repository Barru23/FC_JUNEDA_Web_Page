import Stripe from "stripe";
import { getSupabaseAdmin } from "@/lib/supabase";

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
  if (session.currency !== "eur" || totalPaidEur <= 0) throw new Error("Invalid currency or paid amount");
  const feeEur = parseMoney(meta.fee_eur) ?? 0;
  const amountEur = parseMoney(meta.net_eur) ?? Math.max(totalPaidEur - feeEur, 0);
  if (Math.round((amountEur + feeEur) * 100) !== session.amount_total) throw new Error("Payment metadata does not match the amount charged");
  const paymentId =
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : session.payment_intent?.id ?? "";
  const paymentMethod = "stripe"; // Reconciled later from the actual charge, not the available methods.
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

  // A database trigger durably queues delivery in the same transaction.
  return { purchaseId: row.purchase_id, created: row.was_created };
}

export async function releaseCheckoutReservation(sessionId: string): Promise<void> {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.rpc("release_checkout_reservation", {
    p_session_id: sessionId,
  });
  if (error) throw new Error(`No s'ha pogut alliberar la reserva ${sessionId}: ${error.message}`);
}
