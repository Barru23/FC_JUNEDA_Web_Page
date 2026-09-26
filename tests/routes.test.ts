import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { NextRequest } from "next/server";
import { POST as signup } from "../app/api/socis/route";
import { POST as login } from "../app/api/admin/login/route";
import { isAdminAuthenticated, revokeAdminSession } from "../lib/admin-auth";
import { clientAddress } from "../lib/request-security";

process.env.NEXT_PUBLIC_SUPABASE_URL="https://database.example";
process.env.SUPABASE_SERVICE_ROLE_KEY="unit-test-service-key";
process.env.NEXT_PUBLIC_SITE_URL="https://club.example";
process.env.ADMIN_PASSWORD="local-test-password";
const json=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers:{"Content-Type":"application/json"}});
const request=(path:string,body:unknown,origin="https://club.example")=>new NextRequest(`https://club.example${path}`,{method:"POST",headers:{origin,"Content-Type":"application/json"},body:JSON.stringify(body)});
const member={nom:"Test local",email:"test@example.com",telefon:"600000000",dni:"12345678Z",iban:"ES9121000418450200051332",tierSlug:"soci",acceptaMandat:true,acceptaCondicions:true};

test("membership rejects invented tiers, oversized fields, bots and missing consent without inserting",async t=>{
  let inserts=0;
  t.mock.method(globalThis,"fetch",async(input:RequestInfo|URL,init?:RequestInit)=>{
    const url=String(input);
    assert.ok(url.startsWith("https://database.example/"));
    if(url.includes("consume_request_limit")) return json([{allowed:true,retry_after:0}]);
    if(url.includes("membership_tiers")) return json([]);
    if(init?.method==="POST") inserts++;
    return json(null);
  });
  assert.equal((await signup(request('/api/socis',{...member,tierSlug:'soci-gratis-vip'}))).status,409);
  assert.equal((await signup(request('/api/socis',{...member,nom:'B'.repeat(500)}))).status,400);
  assert.equal((await signup(request('/api/socis',{...member,website:'bot.example'}))).status,400);
  assert.equal((await signup(request('/api/socis',{...member,acceptaMandat:false}))).status,400);
  assert.equal((await signup(request('/api/socis',member,'https://evil.example'))).status,403);
  assert.equal(inserts,0);
});

test("membership uses the database fee and records consent; duplicate DNI remains a conflict",async t=>{
  let duplicate=false;
  let saved:Record<string,unknown>|undefined;
  t.mock.method(globalThis,"fetch",async(input:RequestInfo|URL,init?:RequestInit)=>{
    const url=String(input);assert.ok(url.startsWith("https://database.example/"));
    if(url.includes("consume_request_limit")) return json([{allowed:true,retry_after:0}]);
    if(url.includes("membership_tiers")) {assert.ok(url.includes('status=eq.active'));return json([{id:'tier',name:'Soci',price_eur:90,season:'2026/27'}]);}
    assert.ok(url.includes('soci_registrations'));
    saved=JSON.parse(String(init?.body));return duplicate ? json({code:'23505'},409) : json(null,201);
  });
  const result=await signup(request('/api/socis',{...member,price_eur:0}));
  assert.equal(result.status,200);assert.equal(saved?.price_eur,90);assert.ok(saved?.mandate_accepted_at);assert.equal(saved?.status,'pending');
  assert.equal((await result.text()).includes(member.iban),false);
  duplicate=true;assert.equal((await signup(request('/api/socis',member))).status,409);
});

test("rate limiting fails closed and returns retry information",async t=>{
  t.mock.method(globalThis,"fetch",async()=>json([{allowed:false,retry_after:91}]));
  const limited=await signup(request('/api/socis',member));
  assert.equal(limited.status,429);assert.equal(limited.headers.get('retry-after'),'91');
  t.mock.restoreAll();t.mock.method(globalThis,"fetch",async()=>json({code:'error'},503));
  assert.equal((await signup(request('/api/socis',member))).status,503);
});

test("admin cookie contains a revocable random token, never the password; changing the password invalidates sessions",async t=>{
  let stored:Record<string,string>|undefined;
  t.mock.method(globalThis,"fetch",async(input:RequestInfo|URL,init?:RequestInit)=>{
    const url=new URL(String(input));assert.equal(url.hostname,'database.example');
    if(url.pathname.includes('consume_request_limit'))return json([{allowed:true,retry_after:0}]);
    if(init?.method==='POST'){stored=JSON.parse(String(init.body));return json(null,201);}
    if(init?.method==='DELETE'){stored=undefined;return json(null);}
    return json(stored && url.searchParams.get('credential_version')===`eq.${stored.credential_version}` ? [{token_hash:stored.token_hash}] : []);
  });
  const response=await login(request('/api/admin/login',{password:process.env.ADMIN_PASSWORD}));
  assert.equal(response.status,200);
  const cookie=response.headers.get('set-cookie')!;
  assert.match(cookie,/HttpOnly/i);assert.match(cookie,/SameSite=strict/i);assert.equal(cookie.includes(process.env.ADMIN_PASSWORD!),false);
  const token=/admin_session=([a-f0-9]{64})/.exec(cookie)![1];
  assert.equal(stored?.token_hash,createHash('sha256').update(token).digest('hex'));assert.notEqual(stored?.token_hash,token);
  const req=new NextRequest('https://club.example/api/admin/stats',{headers:{cookie:`admin_session=${token}`}});
  assert.equal(await isAdminAuthenticated(req),true);
  assert.equal(await isAdminAuthenticated(new NextRequest(req.url,{headers:{cookie:`admin_session=${process.env.ADMIN_PASSWORD}`}})),false);
  const old=process.env.ADMIN_PASSWORD;process.env.ADMIN_PASSWORD='changed';assert.equal(await isAdminAuthenticated(req),false);process.env.ADMIN_PASSWORD=old;
  await revokeAdminSession(req);assert.equal(await isAdminAuthenticated(req),false);
});

test("IP protection uses the platform connection address and ignores forwarded-for",()=>{
  process.env.SITE_ID='test-site';
  const req=new NextRequest('https://club.example',{headers:{'x-nf-client-connection-ip':'203.0.113.10','x-forwarded-for':'198.51.100.20'}});
  assert.equal(clientAddress(req),'203.0.113.10');delete process.env.SITE_ID;
  assert.equal(clientAddress(req),'local');
});
