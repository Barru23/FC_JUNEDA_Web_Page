import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

export async function GET() {
  const db=getSupabaseAdmin();
  const [{data,error}, jobs]=await Promise.all([
    db.from("maintenance_state").select("enabled,last_success_at,last_error").eq("name","reconcile").single(),
    db.from("notification_jobs").select("id",{count:"exact",head:true}).or(`status.eq.review,and(status.in.(pending,processing),created_at.lt.${new Date(Date.now()-20*60*1000).toISOString()})`),
  ]);
  const healthy=!error && !jobs.error && !jobs.count && data?.enabled && !data.last_error && data.last_success_at && Date.now()-Date.parse(data.last_success_at)<20*60*1000;
  return NextResponse.json({ok:!!healthy}, {status:healthy ? 200 : 503,headers:{"Cache-Control":"no-store"}});
}
