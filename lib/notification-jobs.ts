import { getSupabaseAdmin } from "@/lib/supabase";
import { notifyPurchase, type NotifyEmail, type NotifyRow, type NotifyType } from "@/lib/notify";
import { formatIban } from "@/lib/identitat";

type Job = { id: string; resource_type: "purchase" | "soci"; resource_id: string; attempts: number; created_at: string };
type Delivery = { type: NotifyType; sheet: string; row: NotifyRow; email: NotifyEmail | null; legacyMatch: boolean };

async function deliveryFor(job: Job): Promise<Delivery> {
  const db = getSupabaseAdmin();
  if (job.resource_type === "soci") {
    const { data: s, error } = await db.from("soci_registrations").select("*").eq("id", job.resource_id).single();
    if (error || !s) throw new Error("No s'ha pogut carregar l'alta");
    return {
      type: "soci", sheet: "Altes Socis", legacyMatch: s.sheet_synced || Date.parse(s.created_at) < Date.parse(job.created_at) - 60000,
      row: { nom:s.nom, email:s.email, telefon:s.telefon, dni:s.dni, iban:formatIban(s.iban),
        tipusSoci:s.tier_name, temporada:s.season, observacions:s.notes || "—", preu:s.price_eur ?? 0,
        metode:"Domiciliació bancària", estat:s.status === "cancelled" ? "Anul·lat" : s.status === "active" ? "Domiciliat" : "Pendent de domiciliar",
        data:new Date(s.created_at).toLocaleString("ca-ES",{timeZone:"Europe/Madrid"}), },
      email:s.status === "pending" && s.notification_email_allowed && !s.sheet_synced ? {to:s.email,buyerName:s.nom,tierName:s.tier_name,season:s.season,quotaAnual:s.price_eur} : null,
    };
  }
  const { data:p, error } = await db.from("purchases").select("*, event:events(title,date,location,sheet_id), product:products(name), tier:membership_tiers(name,season)").eq("id",job.resource_id).single();
  if (error || !p) throw new Error("No s'ha pogut carregar la compra");
  const total = (Math.round(Number(p.amount_eur)*100)+Math.round(Number(p.fee_eur)*100))/100;
  const row: NotifyRow = { nom:p.buyer_name,email:p.buyer_email,telefon:p.buyer_phone,preu:total,
    metode:p.payment_method === "cash" ? "Efectiu" : p.payment_method === "bizum" ? "Bizum" : "Stripe",
    estat:p.payment_status === "refunded" ? "Reemborsat" : p.refunded_cents > 0 ? "Reemborsament parcial" : "Pagat ✅",
    data:new Date(p.created_at).toLocaleString("ca-ES",{timeZone:"Europe/Madrid"}), };
  let email: NotifyEmail | null = p.notification_email_allowed && !p.email_sent && p.payment_status === "completed" && p.buyer_email
    ? {to:p.buyer_email,buyerName:p.buyer_name,total} : null;
  let sheet = "Socis";
  if (p.purchase_type === "event") {
    if (!p.event) throw new Error("Esdeveniment de la compra no disponible");
    sheet=p.event.sheet_id || p.event.title;
    Object.assign(row,{tiquets:p.quantity,dietetica:p.dietary});
    if (email) email={...email,eventTitle:p.event.title,eventDate:p.event.date,eventLocation:p.event.location,quantity:p.quantity,dietary:p.dietary};
  } else if (p.purchase_type === "merch") {
    sheet="Botiga";
    Object.assign(row,{producte:p.product?.name ?? "Producte",talla:p.size,personalitzacio:p.custom_number ? `#${p.custom_number}` : "Cap"});
    if (email) email={...email,productName:p.product?.name ?? "Producte",size:p.size,customization:p.custom_number ? `#${p.custom_number}` : undefined};
  } else {
    Object.assign(row,{tipusSoci:p.tier?.name,temporada:p.tier?.season});
    if (email) email={...email,tierName:p.tier?.name,season:p.tier?.season};
  }
  return {type:p.purchase_type,sheet,row,email,legacyMatch:p.sheet_synced || Date.parse(p.created_at) < Date.parse(job.created_at)-60000};
}

export async function deliverNotifications(limit=1): Promise<number> {
  const db=getSupabaseAdmin();
  const {data,error}=await db.rpc("claim_notification_jobs",{p_limit:limit});
  if(error) throw new Error("No s'han pogut consultar les sincronitzacions pendents");
  let completed=0;
  for(const job of (data ?? []) as Job[]) {
    try {
      const delivery=await deliveryFor(job);
      const result=await notifyPurchase({sourceId:`${job.resource_type}:${job.resource_id}`,...delivery});
      if(!result?.ok) throw new Error(result?.error ?? "Sincronització pendent");
      const updates: Record<string,boolean>={sheet_synced:true};
      if(job.resource_type === "purchase" && result.correuEnviat) updates.email_sent=true;
      const saved=await db.from(job.resource_type === "purchase" ? "purchases" : "soci_registrations").update(updates).eq("id",job.resource_id);
      if(saved.error) throw new Error("No s'ha pogut confirmar la sincronització");
      const resultUpdate=await db.from("notification_jobs").update({status:result.emailStatus === "review" ? "review" : "complete",last_error:result.emailStatus === "review" ? "Cal revisar el correu; no es reenviarà automàticament" : null,lease_until:null,updated_at:new Date().toISOString()})
        .eq("id",job.id).eq("status","processing").eq("attempts",job.attempts);
      if(resultUpdate.error) throw new Error("No s'ha pogut confirmar la tasca");
      completed++;
    } catch(error) {
      await db.from("notification_jobs").update({status:job.attempts>=8 ? "review" : "pending",last_error:error instanceof Error ? error.message.slice(0,180) : "Sincronització pendent",
        lease_until:null,next_attempt_at:new Date(Date.now()+Math.min(3600,30*2**job.attempts)*1000).toISOString(),updated_at:new Date().toISOString()})
        .eq("id",job.id).eq("status","processing").eq("attempts",job.attempts);
    }
  }
  return completed;
}
