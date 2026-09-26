import Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { getSupabaseAdmin } from "@/lib/supabase";

export async function reconcilePurchasePayment(purchaseId: string, paymentId: string): Promise<void> {
  const payment = await stripe.paymentIntents.retrieve(paymentId, { expand: ["latest_charge.balance_transaction"] });
  const charge = typeof payment.latest_charge === "object" ? payment.latest_charge : null;
  if (!charge?.paid || !charge.captured) throw new Error("Cobrament encara no confirmat");
  const transaction = typeof charge.balance_transaction === "object" ? charge.balance_transaction : null;
  const db = getSupabaseAdmin();
  const { data: purchase, error: readError } = await db.from("purchases").select("amount_eur,fee_eur,payment_status,payment_method,refunded_cents").eq("id",purchaseId).single();
  if(readError || !purchase || Math.round(Number(purchase.amount_eur)*100)+Math.round(Number(purchase.fee_eur)*100)!==charge.amount) throw new Error("Import de la compra pendent de revisió");
  const status = charge.refunded ? "refunded" : "completed";
  const method = charge.payment_method_details?.type ?? "stripe";
  // Queue before updating so a failed write is retried. The worker reads the
  // current purchase; stable source IDs make repeated sheet updates safe.
  if (purchase.payment_status !== status || purchase.payment_method !== method || purchase.refunded_cents !== charge.amount_refunded) {
    const queued = await db.from("notification_jobs").upsert({resource_type:"purchase",resource_id:purchaseId,status:"pending",next_attempt_at:new Date(Date.now()+60000).toISOString(),updated_at:new Date().toISOString(),last_error:null},{onConflict:"resource_type,resource_id"});
    if (queued.error) throw new Error("No s'ha pogut preparar la sincronització del cobrament");
  }
  const {error}=await db.from("purchases").update({
    payment_method:method,
    payment_status:status,
    refunded_cents:charge.amount_refunded,
    stripe_fee_cents:transaction?.fee ?? null,
    stripe_net_cents:transaction?.net ?? null,
    financial_checked_at:new Date().toISOString(),
  }).eq("id",purchaseId);
  if(error) throw new Error("No s'ha pogut conciliar el cobrament");
}

export function balanceRow(b: Stripe.BalanceTransaction) {
  return {id:b.id,type:b.type,reporting_category:b.reporting_category,currency:b.currency,
    amount_cents:b.amount,fee_cents:b.fee,net_cents:b.net,
    source_id:typeof b.source === "string" ? b.source : b.source?.id ?? null,
    created_at:new Date(b.created*1000).toISOString()};
}

/** One bounded page per run, full history on first run, then a 7-day overlap. */
export async function syncBalancePage(cursor: Record<string, unknown>): Promise<Record<string, unknown>> {
  const after=typeof cursor.balance_after === "string" ? cursor.balance_after : undefined;
  const since=typeof cursor.balance_since === "number" ? cursor.balance_since : undefined;
  const started=typeof cursor.balance_started === "number" ? cursor.balance_started : Math.floor(Date.now()/1000);
  const page=await stripe.balanceTransactions.list({limit:100,...(after ? {starting_after:after}:{}),...(since ? {created:{gte:since}}:{})});
  if(page.data.length) {
    const {error}=await getSupabaseAdmin().from("stripe_balance_entries").upsert(page.data.map(balanceRow),{onConflict:"id"});
    if(error) throw new Error("No s'han pogut conciliar els moviments de Stripe");
  }
  return {...cursor,balance_after:page.has_more ? page.data.at(-1)?.id : null,
    balance_since:page.has_more ? since ?? null : started-7*86400,
    balance_started:page.has_more ? started : null,
    balance_complete_at:page.has_more ? cursor.balance_complete_at ?? null : new Date().toISOString()};
}
