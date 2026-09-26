import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { readJson, RequestError } from "@/lib/request-security";
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export async function POST(req:NextRequest) {
  if(!(await isAdminAuthenticated(req))) return NextResponse.json({error:"No autoritzat"},{status:401});
  try {
    const b=await readJson(req);
    const type=b.purchase_type;
    const quantity=Number(b.quantity ?? 1),amount=Number(b.amount_eur);
    if(!["event","merch"].includes(String(type)) || typeof b.request_id!=="string" || !UUID.test(b.request_id)
      || typeof b.buyer_name!=="string" || !b.buyer_name.trim() || b.buyer_name.length>120
      || !Number.isInteger(quantity) || quantity<1 || quantity>200 || !Number.isFinite(amount) || amount<=0 || amount>999999) throw new RequestError("Dades de cobrament no valides");
    const reference=type==="event" ? b.event_id : b.product_id;
    if(typeof reference!=="string" || !UUID.test(reference)) throw new RequestError("Selecciona un article valid");
    if(type==="merch" && (typeof b.size!=="string" || b.size.length>40 || quantity!==1)) throw new RequestError("Talla o quantitat no valida");
    const db=getSupabaseAdmin();
    const {data,error}=await db.rpc("register_cash_purchase",{p_id:"CASH-"+b.request_id,p_type:type,
      p_buyer_name:b.buyer_name.trim(),p_buyer_email:typeof b.buyer_email==="string" ? b.buyer_email.slice(0,160):"",
      p_buyer_phone:typeof b.buyer_phone==="string" ? b.buyer_phone.slice(0,40):"",
      p_event_id:type==="event" ? reference:null,p_product_id:type==="merch" ? reference:null,
      p_size:type==="merch" ? b.size:"",p_quantity:quantity,p_amount:Math.round(amount*100)/100,
      p_dietary:typeof b.dietary==="string" ? b.dietary.slice(0,500):""});
    if(error) return NextResponse.json({error:"No es pot registrar: comprova les dades, les places i que les vendes estiguin obertes"},{status:409});
    return NextResponse.json({id:data},{status:201});
  } catch(error) {return NextResponse.json({error:error instanceof RequestError ? error.message:"No s'ha pogut registrar el cobrament"},{status:error instanceof RequestError ? error.status:503});}
}
