import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { readAll } from "@/lib/read-all";
import { purchaseTotals } from "@/lib/purchase-totals";

export async function GET(req: NextRequest) {
  if (!(await isAdminAuthenticated(req))) return NextResponse.json({error:"No autoritzat"},{status:401});
  try {
    const db=getSupabaseAdmin();
    const [rows,recent,pending,review]=await Promise.all([
      readAll<{purchase_type:string;amount_eur:number;fee_eur:number;quantity:number}>((from,to)=>db.from("purchases").select("purchase_type,amount_eur,fee_eur,quantity").eq("payment_status","completed").order("id").range(from,to)),
      db.from("purchases").select("*, event:events(title,date), product:products(name), tier:membership_tiers(name)").order("created_at",{ascending:false}).limit(10),
      db.from("notification_jobs").select("id",{count:"exact",head:true}).in("status",["pending","processing"]),
      db.from("notification_jobs").select("id",{count:"exact",head:true}).eq("status","review"),
    ]);
    if(recent.error || pending.error || review.error) throw new Error("Database unavailable");
    return NextResponse.json({...purchaseTotals(rows),recent_purchases:recent.data ?? [],notifications_pending:pending.count ?? 0,notifications_review:review.count ?? 0},{headers:{"Cache-Control":"no-store"}});
  } catch {return NextResponse.json({error:"No s'han pogut carregar les dades del panell"},{status:503});}
}
