import { getSupabaseAdmin } from "../../lib/supabase";
import { deliverNotifications } from "../../lib/notification-jobs";

export default async () => {
  const { data, error } = await getSupabaseAdmin().from("maintenance_state").select("enabled").eq("name", "reconcile").single();
  if (error) throw new Error("No s'ha pogut consultar la configuració de sincronització");
  // Cada cinc minuts i fins a quatre tasques per execucio: una cinquena part de
  // les invocacions d'abans (cada una consumeix credits de Netlify). Quatre
  // crides a l'Apps Script caben amb marge dins dels 30 s d'una funcio
  // programada i dels 2 minuts de reserva de cada tasca.
  if (data.enabled) await deliverNotifications(4);
  return new Response(null, { status: 204 });
};
export const config = { schedule: "*/5 * * * *" };
