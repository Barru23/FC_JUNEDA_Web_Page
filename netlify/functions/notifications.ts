import { getSupabaseAdmin } from "../../lib/supabase";
import { deliverNotifications } from "../../lib/notification-jobs";

export default async () => {
  const { data, error } = await getSupabaseAdmin().from("maintenance_state").select("enabled").eq("name", "reconcile").single();
  if (error) throw new Error("No s'ha pogut consultar la configuració de sincronització");
  if (data.enabled) await deliverNotifications(1);
  return new Response(null, { status: 204 });
};
export const config = { schedule: "* * * * *" };
