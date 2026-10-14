import { stripe } from "@/lib/stripe";
import { getSupabaseAdmin } from "@/lib/supabase";
import { fulfillCheckoutSession, releaseCheckoutReservation } from "@/lib/checkout-fulfillment";
import { reconcilePurchasePayment, syncBalancePage } from "@/lib/stripe-accounting";

export function reservationAction(session: { status: string | null; payment_status: string }): "confirm" | "release" | "wait" {
  if(session.payment_status === "paid") return "confirm";
  if(session.status === "expired" && session.payment_status === "unpaid") return "release";
  return "wait";
}

// La funcio programada corre cada 15 minuts: els lots son el triple dels que hi
// havia quan corria cada 5, per revisar el mateix nombre de reserves i pagaments
// per hora. El termini de 22 s talla el bucle abans del limit de la funcio.
const RESERVATIONS_PER_RUN = 15;
const PAYMENTS_PER_RUN = 6;

export async function reconcile(): Promise<{ skipped?: boolean; checked: number; errors: number }> {
  const db=getSupabaseAdmin();
  const claim=await db.rpc("claim_maintenance");
  if(claim.error) throw new Error("No s'ha pogut iniciar la conciliació");
  if(!claim.data) return {skipped:true,checked:0,errors:0};
  const deadline=Date.now()+22000;
  let checked=0,errors=0;
  try {
    const state=await db.from("maintenance_state").select("cursor").eq("name","reconcile").single();
    if(state.error) throw state.error;
    const cursor=await syncBalancePage(state.data.cursor ?? {});
    const cursorUpdate=await db.from("maintenance_state").update({cursor}).eq("name","reconcile");
    if(cursorUpdate.error) throw cursorUpdate.error;
    const pending=await db.from("checkout_reservations").select("stripe_session_id")
      .eq("status","reserved").order("checked_at",{ascending:true,nullsFirst:true}).limit(RESERVATIONS_PER_RUN);
    if(pending.error) throw pending.error;
    for(const row of pending.data ?? []) {
      if(Date.now()>deadline-8000) break;
      let failure:string|null=null;
      try {
        const session=await stripe.checkout.sessions.retrieve(row.stripe_session_id);
        const action=reservationAction(session);
        if(action === "confirm") await fulfillCheckoutSession(session);
        if(action === "release") await releaseCheckoutReservation(session.id);
        checked++;
      } catch { errors++; failure="No s'ha pogut conciliar aquesta reserva amb Stripe"; }
      const saved=await db.from("checkout_reservations").update({checked_at:new Date().toISOString(),last_error:failure}).eq("stripe_session_id",row.stripe_session_id);
      if(saved.error) throw saved.error;
    }
    if(Date.now()<deadline-8000) {
      const unpaidFees=await db.from("purchases").select("id,stripe_payment_id")
        .like("stripe_payment_id","pi_%").order("financial_checked_at",{ascending:true,nullsFirst:true}).limit(PAYMENTS_PER_RUN);
      if(unpaidFees.error) throw unpaidFees.error;
      for(const p of unpaidFees.data ?? []) {
        if(Date.now()>deadline-7000) break;
        try { await reconcilePurchasePayment(p.id,p.stripe_payment_id); }
        catch { errors++; await db.from("purchases").update({financial_checked_at:new Date().toISOString()}).eq("id",p.id); }
      }
    }
    // Checkout only returns a payment URL after persisting its reservation.
    // Rotating through every reserved row also recovers absent webhooks,
    // independently of whether the buyer returns to /success.
    const saved=await db.from("maintenance_state").update({lease_until:null,last_success_at:new Date().toISOString(),last_error:errors ? `${errors} operacions pendents de revisió` : null}).eq("name","reconcile");
    if(saved.error) throw saved.error;
    // Bounded by expiring records; no member or payment data is deleted here.
    await db.from("admin_sessions").delete().lt("expires_at",new Date().toISOString());
    return {checked,errors};
  } catch {
    await db.from("maintenance_state").update({lease_until:null,last_error:"La conciliació no s'ha pogut completar"}).eq("name","reconcile");
    throw new Error("La conciliació no s'ha pogut completar");
  }
}
