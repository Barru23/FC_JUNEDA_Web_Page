import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { getSupabaseAdmin } from "@/lib/supabase";
import { readAll } from "@/lib/read-all";
import { financeTotals, madridMidnight, type BalanceEntry } from "@/lib/finance";

export async function GET(req: NextRequest) {
  if(!(await isAdminAuthenticated(req))) return NextResponse.json({error:"No autoritzat"},{status:401});
  let from:string,to:string;
  try {
    from=madridMidnight(req.nextUrl.searchParams.get("from") ?? "");
    to=madridMidnight(req.nextUrl.searchParams.get("to") ?? "",true);
    if(from>=to || Date.parse(to)-Date.parse(from)>367*86400000) throw new Error();
  } catch { return NextResponse.json({error:"Selecciona un període vàlid de fins a un any"},{status:400}); }
  try {
    const db=getSupabaseAdmin();
    const [entries,state]=await Promise.all([
      readAll<BalanceEntry>((start,end)=>db.from("stripe_balance_entries").select("type,amount_cents,fee_cents,net_cents").eq("currency","eur").gte("created_at",from).lt("created_at",to).order("id").range(start,end)),
      db.from("maintenance_state").select("cursor,last_success_at,last_error,enabled").eq("name","reconcile").single(),
    ]);
    if(state.error) throw state.error;
    return NextResponse.json({...financeTotals(entries),timezone:"Europe/Madrid",from,to,
      reconciled_at:state.data.cursor?.balance_complete_at ?? null,
      enabled:state.data.enabled,last_success_at:state.data.last_success_at,last_error:state.data.last_error,
    },{headers:{"Cache-Control":"no-store"}});
  } catch {return NextResponse.json({error:"No s'han pogut carregar els moviments de Stripe"},{status:503});}
}
