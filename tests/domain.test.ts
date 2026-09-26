import test from "node:test";
import assert from "node:assert/strict";
import { financeTotals, madridMidnight } from "../lib/finance";
import { purchaseTotals } from "../lib/purchase-totals";
import { buildCsv } from "../lib/csv";
import { salesOpen } from "../lib/event-status";
import { reservationAction } from "../lib/reconciliation";
import { readJson, sameOrigin } from "../lib/request-security";
import { NextRequest } from "next/server";

test('closed event cannot sell with remaining capacity',()=>{
  assert.equal(salesOpen('closed',117),false);assert.equal(salesOpen('sold_out',117),false);assert.equal(salesOpen('active',0),false);assert.equal(salesOpen('active',117),true);
});
test('reservation recovery waits for asynchronous or unknown payment states',()=>{
  assert.equal(reservationAction({status:'complete',payment_status:'unpaid'}),'wait');
  assert.equal(reservationAction({status:'open',payment_status:'unpaid'}),'wait');
  assert.equal(reservationAction({status:'expired',payment_status:'unpaid'}),'release');
  assert.equal(reservationAction({status:'complete',payment_status:'paid'}),'confirm');
  assert.equal(reservationAction({status:null,payment_status:'unpaid'}),'wait');
});
test('accounting reconciles refunds, actual fees and excludes bank payouts',()=>{
  assert.deepEqual(financeTotals([
    {type:'charge',amount_cents:128345,fee_cents:3704,net_cents:124641},
    {type:'refund',amount_cents:-440,fee_cents:0,net_cents:-440},
    {type:'payout',amount_cents:-71984,fee_cents:0,net_cents:-71984},
  ]),{gross_cents:128345,fees_cents:3704,refunds_cents:440,other_cents:0,net_cents:124201,payments:1});
});
test('ticket quantities and customer management fees are distinct from commissions',()=>{
  const totals=purchaseTotals([{purchase_type:'event',amount_eur:30,fee_eur:.75,quantity:2},{purchase_type:'event',amount_eur:15,fee_eur:.5,quantity:1}]);
  assert.equal(totals.tickets_sold,3);assert.equal(totals.total_revenue,45);assert.equal(totals.fees_collected,1.25);
});
test('Madrid date filters include the full day through DST transitions',()=>{
  assert.equal(madridMidnight('2026-09-17'),'2026-09-16T22:00:00.000Z');
  assert.equal(madridMidnight('2026-10-25'),'2026-10-24T22:00:00.000Z');
  assert.equal(madridMidnight('2026-10-25',true),'2026-10-25T23:00:00.000Z');
  assert.throws(()=>madridMidnight('2026-02-31'));
});
test('CSV neutralizes formulas without changing numeric money values',()=>{
  assert.match(buildCsv(['Text','Amount'],[['=1+1',15.5]]),/'=1\+1;15,5/);
});
test('mutations require the configured origin and bounded JSON bodies',async()=>{
  process.env.NEXT_PUBLIC_SITE_URL='https://club.example';
  assert.equal(sameOrigin(new NextRequest('https://club.example/api/socis',{headers:{origin:'https://evil.example'}})),false);
  assert.equal(sameOrigin(new NextRequest('https://club.example/api/socis',{headers:{origin:'https://club.example'}})),true);
  await assert.rejects(()=>readJson(new NextRequest('https://club.example/api/socis',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({note:'x'.repeat(9000)})})),/massa gran/);
  await assert.rejects(()=>readJson(new NextRequest('https://club.example/api/socis',{method:'POST',headers:{'content-type':'application/json'},body:'null'})),/no vàlida/);
});
