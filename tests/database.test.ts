import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";

test("production migration and inventory regressions in isolated PostgreSQL", async t => {
  const db = new PGlite();
  await db.exec("CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;");
  await db.exec(readFileSync("supabase-schema.sql", "utf8"));
  const migration = readFileSync("supabase/migrations/20260926_production_reliability.sql", "utf8");
  await db.exec(migration);
  await db.exec(migration);
  const one = async (sql: string, args: unknown[] = []) => (await db.query<Record<string, any>>(sql, args)).rows[0];
  const event = await one("UPDATE events SET total_spots=200,spots_remaining=200,status='active' RETURNING *");
  const reserve = (id: string, quantity: number) => one("SELECT reserve_event_checkout($1,$2,$3,NOW()+INTERVAL '31 minutes') AS ok", [id,event.id,quantity]);
  const finalize = (id: string, quantity: number) => one("SELECT * FROM finalize_checkout_purchase($1,'pi_test','event','Test','test@example.invalid','',$2,$3,'',NULL,'','',NULL,$4,0.5,'card')",[id,event.id,quantity,15*quantity]);

  await t.test("confirmed payment after closing does not reopen or debit inventory twice", async () => {
    assert.equal((await reserve("cs_test_paid",2)).ok,true);
    await db.query("UPDATE events SET status='closed' WHERE id=$1",[event.id]);
    const paid=await finalize("cs_test_paid",2);
    assert.equal(paid.was_created,true);
    assert.equal((await finalize("cs_test_paid",2)).was_created,false);
    assert.deepEqual(await one("SELECT status,spots_remaining FROM events WHERE id=$1",[event.id]),{status:"closed",spots_remaining:198});
    assert.equal((await one("SELECT count(*)::INT AS n FROM notification_jobs")).n,1);
    assert.equal((await reserve("cs_test_new",1)).ok,false);
  });
  await t.test("expired reservation is released exactly once without reopening a closed event",async()=>{
    await db.query("UPDATE events SET status='active' WHERE id=$1",[event.id]);
    await reserve("cs_test_expired",3);
    await db.query("UPDATE events SET status='closed' WHERE id=$1",[event.id]);
    assert.equal((await one("SELECT release_checkout_reservation('cs_test_expired') AS ok")).ok,true);
    assert.equal((await one("SELECT release_checkout_reservation('cs_test_expired') AS ok")).ok,false);
    assert.deepEqual(await one("SELECT status,spots_remaining FROM events WHERE id=$1",[event.id]),{status:"closed",spots_remaining:198});
    await assert.rejects(()=>finalize("cs_test_expired",3),/released checkout reservation/);
  });
  await t.test("capacity edits preserve reservations and reject overbooking",async()=>{
    const details={...event,total_spots:1,status:"closed"};
    await assert.rejects(()=>one("SELECT update_event_details($1,$2::jsonb)",[event.id,JSON.stringify(details)]),/capacity/);
    details.total_spots=250;
    await one("SELECT update_event_details($1,$2::jsonb)",[event.id,JSON.stringify(details)]);
    assert.equal((await one("SELECT spots_remaining FROM events WHERE id=$1",[event.id])).spots_remaining,248);
  });
  await t.test("rate limits persist and reset only on expiry",async()=>{
    const key="a".repeat(64);
    const consume=()=>one("SELECT * FROM consume_request_limit($1,2,60)",[key]);
    assert.equal((await consume()).allowed,true);
    assert.equal((await consume()).allowed,true);
    assert.equal((await consume()).allowed,false);
    await db.query("UPDATE request_limits SET window_end=NOW()-INTERVAL '1 second'");
    assert.equal((await consume()).allowed,true);
  });
  await t.test("cash sale is atomic, idempotent, and respects closure",async()=>{
    const sql="SELECT register_cash_purchase('CASH-test','event','Test','','',$1,NULL,'',1,15,'') AS id";
    await assert.rejects(()=>one(sql,[event.id]),/closed/);
    await db.query("UPDATE events SET status='active' WHERE id=$1",[event.id]);
    const created=await one(sql,[event.id]);
    assert.deepEqual(await one(sql,[event.id]),created);
    assert.equal((await one("SELECT spots_remaining FROM events WHERE id=$1",[event.id])).spots_remaining,247);
    assert.equal((await one("SELECT notification_email_allowed FROM purchases WHERE id=$1",[created.id])).notification_email_allowed,false);
  });
  await t.test("new tables cannot be read by anonymous visitors",async()=>{
    await db.exec("SET ROLE anon");
    for(const table of ['admin_sessions','request_limits','notification_jobs','maintenance_state','stripe_balance_entries']) {
      await assert.rejects(()=>db.query(`SELECT * FROM ${table}`),/permission denied/);
    }
    await db.exec("RESET ROLE");
  });
  await db.close();
});
