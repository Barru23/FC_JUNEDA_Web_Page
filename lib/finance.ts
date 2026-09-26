export type BalanceEntry = { type: string; amount_cents: number; fee_cents: number; net_cents: number };
export function financeTotals(entries: BalanceEntry[]) {
  const result = { gross_cents:0, fees_cents:0, refunds_cents:0, other_cents:0, net_cents:0, payments:0 };
  for(const e of entries) {
    if(["payout","payout_cancel","payout_failure"].includes(e.type)) continue;
    result.net_cents += Number(e.net_cents);
    result.fees_cents += Number(e.fee_cents);
    if(["charge","payment"].includes(e.type)) { result.gross_cents += Number(e.amount_cents); result.payments++; }
    else if(["refund","payment_refund"].includes(e.type)) result.refunds_cents -= Number(e.amount_cents);
    else result.other_cents += Number(e.amount_cents);
  }
  return result;
}

export function madridMidnight(date: string, nextDay = false): string {
  if(!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error("Data no vàlida");
  const day=new Date(`${date}T00:00:00Z`);
  if(Number.isNaN(day.valueOf()) || day.toISOString().slice(0,10)!==date) throw new Error("Data no vàlida");
  if(nextDay) day.setUTCDate(day.getUTCDate()+1);
  const target=day.valueOf();
  let time=target;
  const formatter=new Intl.DateTimeFormat("en-GB",{timeZone:"Europe/Madrid",year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",second:"2-digit",hourCycle:"h23"});
  for(let n=0;n<3;n++) {
    const p=Object.fromEntries(formatter.formatToParts(time).map(x=>[x.type,x.value]));
    const wall=Date.UTC(+p.year,+p.month-1,+p.day,+p.hour,+p.minute,+p.second);
    time+=target-wall;
  }
  return new Date(time).toISOString();
}
