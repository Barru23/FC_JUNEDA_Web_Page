type PurchaseAmount={purchase_type:string;amount_eur:number;fee_eur:number|null;quantity:number|null};
export function purchaseTotals(rows:PurchaseAmount[]) {
  const sum={total:0,event:0,merch:0,membership:0,fees:0,tickets:0,merchOrders:0,members:0};
  for(const p of rows) {
    const cents=Math.round(Number(p.amount_eur)*100);
    sum.total+=cents;sum.fees+=Math.round(Number(p.fee_eur ?? 0)*100);
    if(p.purchase_type==="event"){sum.event+=cents;sum.tickets+=Number(p.quantity ?? 1);}
    if(p.purchase_type==="merch"){sum.merch+=cents;sum.merchOrders++;}
    if(p.purchase_type==="membership"){sum.membership+=cents;sum.members++;}
  }
  return {total_revenue:sum.total/100,event_revenue:sum.event/100,merch_revenue:sum.merch/100,
    membership_revenue:sum.membership/100,fees_collected:sum.fees/100,tickets_sold:sum.tickets,
    merch_orders:sum.merchOrders,active_members:sum.members};
}
