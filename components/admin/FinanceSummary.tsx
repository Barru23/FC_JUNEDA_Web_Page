"use client";
import { useEffect, useState } from "react";
type Summary={gross_cents:number;fees_cents:number;refunds_cents:number;other_cents:number;net_cents:number;payments:number;reconciled_at:string|null;enabled:boolean;last_error:string|null;last_success_at:string|null};
const euro=(cents:number)=>new Intl.NumberFormat("ca-ES",{style:"currency",currency:"EUR"}).format(cents/100);
export function FinanceSummary() {
  const today=new Intl.DateTimeFormat("sv-SE",{timeZone:"Europe/Madrid"}).format(new Date());
  const [from,setFrom]=useState(today.slice(0,7)+"-01");
  const [to,setTo]=useState(today);
  const [data,setData]=useState<Summary|null>(null);
  const [error,setError]=useState<string|null>(null);
  const [loading,setLoading]=useState(false);
  useEffect(()=>{
    const controller=new AbortController();
    setLoading(true);setError(null);setData(null);
    fetch(`/api/admin/finance?from=${from}&to=${to}`,{signal:controller.signal,cache:"no-store"})
      .then(async res=>{const body=await res.json();if(res.status===401)window.dispatchEvent(new Event("admin-session-expired"));if(!res.ok)throw new Error(body.error);return body;})
      .then(setData).catch(err=>{if(!controller.signal.aborted)setError(err.message);}).finally(()=>{if(!controller.signal.aborted)setLoading(false);});
    return ()=>controller.abort();
  },[from,to]);
  return <section className="mb-8 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h2 className="font-display font-bold">Cobraments i comissions de Stripe</h2>
      <div className="flex flex-wrap gap-3 text-xs text-white/70">
        <label>Des de <input aria-label="Data inicial dels moviments" type="date" value={from} max={to} onChange={e=>setFrom(e.target.value)} className="rounded border border-white/20 bg-black/40 p-2" /></label>
        <label>Fins a <input aria-label="Data final dels moviments" type="date" value={to} min={from} onChange={e=>setTo(e.target.value)} className="rounded border border-white/20 bg-black/40 p-2" /></label>
      </div>
    </div>
    <p className="mt-2 text-xs text-white/45">Hora de Catalunya · Imports reals del compte Stripe, incloses les proves i devolucions del període. Els abonaments al banc es consulten a Stripe.</p>
    {loading && <p className="mt-3 text-sm text-white/60">Carregant moviments…</p>}
    {error && <p role="alert" className="mt-3 text-sm text-red-300">{error}</p>}
    {data && !data.reconciled_at && <p className="mt-3 text-sm text-amber-300">Moviments pendents de conciliació.</p>}
    {data?.reconciled_at && <>
      <dl className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-5">
        {[["Total cobrat",data.gross_cents],["Comissions Stripe",data.fees_cents],["Devolucions",data.refunds_cents],["Altres moviments",data.other_cents],["Net del període",data.net_cents]].map(([label,value])=><div key={label}><dt className="text-xs text-white/50">{label}</dt><dd className="mt-1 font-display text-lg font-bold">{euro(Number(value))}</dd></div>)}
      </dl>
      <p className="mt-3 text-xs text-white/45">{data.payments} cobraments · Actualitzat: {new Date(data.reconciled_at).toLocaleString("ca-ES",{timeZone:"Europe/Madrid"})}</p>
    </>}
    {data && (!data.enabled || data.last_error || (data.last_success_at && Date.now()-Date.parse(data.last_success_at)>20*60*1000)) && <p className="mt-3 text-xs text-amber-300">{!data.enabled ? "Conciliació automàtica pendent d'activar." : "Cal revisar la conciliació automàtica; els imports poden estar pendents d'actualitzar."}</p>}
  </section>;
}
