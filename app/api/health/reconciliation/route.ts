import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

// La conciliacio corre cada 15 minuts: 35 tolera una execucio perduda abans
// d'avisar. Les notificacions es processen de quatre en quatre cada 5 minuts:
// 30 minuts absorbeixen una punta de vendes sense falses alarmes.
const RECONCILE_STALE_MS = 35 * 60 * 1000;
const NOTIFICATION_STALE_MS = 30 * 60 * 1000;

export async function GET() {
  const db=getSupabaseAdmin();
  const [{data,error}, jobs]=await Promise.all([
    db.from("maintenance_state").select("enabled,last_success_at,last_error").eq("name","reconcile").single(),
    db.from("notification_jobs").select("id",{count:"exact",head:true}).or(`status.eq.review,and(status.in.(pending,processing),created_at.lt.${new Date(Date.now()-NOTIFICATION_STALE_MS).toISOString()})`),
  ]);
  const healthy=!error && !jobs.error && !jobs.count && data?.enabled && !data.last_error && data.last_success_at && Date.now()-Date.parse(data.last_success_at)<RECONCILE_STALE_MS;
  return NextResponse.json({ok:!!healthy}, {status:healthy ? 200 : 503,headers:{"Cache-Control":"no-store"}});
}
