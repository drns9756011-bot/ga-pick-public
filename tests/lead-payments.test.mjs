import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { createHash } from 'node:crypto';
import { handleLeadPayments, leadEntitlement } from '../functions/lead-payments.js';
import { ensureLeadSchema, handleLeads } from '../functions/assigned-leads.js';
const sha = s => createHash('sha256').update(s).digest('hex');
async function setup(mode = 'live') {
  const db = new DatabaseSync(':memory:');
  db.exec("PRAGMA foreign_keys=ON;CREATE TABLE approved_sellers(seller_id TEXT PRIMARY KEY,status TEXT,channel TEXT,branch TEXT,manager TEXT);INSERT INTO approved_sellers VALUES('seller','approved','LG','서울','테스트');INSERT INTO approved_sellers VALUES('other','approved','삼성','서울','테스트2');");
  const DB = { prepare(sql) { let args = []; return { bind(...v) { args=v; return this; }, async run() { return {meta:{changes:db.prepare(sql).run(...args).changes}}; }, async first(){return db.prepare(sql).get(...args)||null;},async all(){return {results:db.prepare(sql).all(...args)};} }; }, async batch(ss){ db.exec('BEGIN');try{const out=[];for(const s of ss)out.push(await s.run());db.exec('COMMIT');return out;}catch(e){db.exec('ROLLBACK');throw e;}} };
  const env = { DB, NICEPAY_ENABLED:'true', NICEPAY_MODE:mode, NICEPAY_CLIENT_ID:mode === 'live' ? 'R2_dummy-client' : 'S2_dummy-client', NICEPAY_SECRET_KEY:'dummy-secret', CUSTOMER_PHONE_KEY:Buffer.alloc(32,9).toString('base64') };
  await ensureLeadSchema(env);
  const call = (suffix='',method='GET',body,actor={sellerId:'seller'}) => handleLeadPayments(env,new Request(`https://test/api/lead-payments${suffix}`,{method,headers:{'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})}),`lead-payments${suffix.split('?')[0]}`,actor);
  const create = async () => (await (await call('/orders','POST',{quantity:1,agreed:true,amount:1,sellerId:'other'})).json()).checkout;
  const callback = checkout => call(`/return?${new URL(checkout.returnUrl).searchParams}`,'POST',{authResultCode:'0000',clientId:env.NICEPAY_CLIENT_ID,orderId:checkout.orderId,amount:8000,tid:'transaction123456789',authToken:'test-auth',signature:sha(`test-auth${env.NICEPAY_CLIENT_ID}8000${env.NICEPAY_SECRET_KEY}`)},null);
  const payment = (checkout,status='paid') => { const ediDate=new Date().toISOString();return {resultCode:'0000',orderId:checkout.orderId,tid:'transaction123456789',amount:8000,status,payMethod:'card',currency:'KRW',paidAt:ediDate,ediDate,signature:sha(`transaction1234567898000${ediDate}${env.NICEPAY_SECRET_KEY}`)}; };
  return {db,env,call,create,callback,payment};
}
test('configuration fails closed; orders use server price and authenticated owner',async()=>{
  const s=await setup();assert.equal((await s.call('', 'GET',null,null)).status,401);
  s.env.NICEPAY_ENABLED='false';assert.equal((await s.call('/orders','POST',{quantity:1,agreed:true})).status,503);s.env.NICEPAY_ENABLED='true';
  assert.equal((await s.call('/orders','POST',{quantity:0,agreed:true})).status,400);
  assert.equal((await s.call('/orders','POST',{quantity:1,agreed:false})).status,400);
  const checkout=await s.create();assert.equal(checkout.amount,8000);assert.equal(s.db.prepare('SELECT seller_id FROM lead_orders').get().seller_id,'seller');
  assert.equal((await s.call(`/orders/${checkout.orderId}`,'GET',null,{sellerId:'other'})).status,404);
  assert.equal((await leadEntitlement(s.env,'seller')).access,false);
  const res=await s.call('/return?state=bad','POST',{orderId:checkout.orderId},null);assert.equal(res.status,403);s.db.close();
});
test('verified payment grants credit exactly once; assignment spends once; refund denies access',async()=>{
  const s=await setup(), checkout=await s.create();let charges=0;
  const original=globalThis.fetch;
  globalThis.fetch=async(url,options)=>{if(options.method==='POST')charges++;return Response.json(s.payment(checkout));};
  try {
    assert.equal((await s.callback(checkout)).status,303);assert.equal((await s.callback(checkout)).status,303);assert.equal(charges,1);
    assert.deepEqual(await leadEntitlement(s.env,'seller'),{access:true,remaining:1,unitPrice:8000});
    const request=(path,body,actor={admin:true})=>handleLeads(s.env,new Request(`https://test/api/${path}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}),path,actor);
    await request('assigned-leads',{rows:[{name:'테스트',phone:'01012345678',region:'서울',items:'TV'}],source:'test',consentRef:'test',consentConfirmed:true});
    const lead=s.db.prepare('SELECT id FROM assigned_leads').get().id;
    assert.equal((await request(`assigned-leads/${lead}/assign`,{sellerId:'seller',consentRef:'test',consentConfirmed:true})).status,200);
    assert.equal((await leadEntitlement(s.env,'seller')).remaining,0);
    assert.equal((await request(`assigned-leads/${lead}/assign`,{sellerId:'seller',consentRef:'test',consentConfirmed:true})).status,409);
    assert.equal(s.db.prepare('SELECT count(*) n FROM lead_credit_usage').get().n,1);
    globalThis.fetch=async()=>Response.json(s.payment(checkout,'cancelled'));
    s.db.prepare("UPDATE lead_orders SET checked_at=''").run();
    assert.equal((await s.call('/webhook','POST',{orderId:checkout.orderId,tid:'transaction123456789'},null)).status,200);
    assert.equal((await leadEntitlement(s.env,'seller')).access,false);
    assert.equal((await request(`assigned-leads/${lead}/phone`,{},{sellerId:'seller'})).status,403);
  } finally {globalThis.fetch=original;s.db.close();}
});
test('uncertain approval is reconciled without charging again; sandbox never grants real access',async()=>{
  const s=await setup('sandbox'), checkout=await s.create();const original=globalThis.fetch;let charges=0;
  globalThis.fetch=async()=>{charges++;throw new Error('timeout');};
  try {
    await s.callback(checkout);assert.equal(s.db.prepare('SELECT status FROM lead_orders').get().status,'processing');
    assert.equal((await s.call('/orders','POST',{quantity:1,agreed:true})).status,409);
    globalThis.fetch=async(url,options)=>{assert.equal(options.method,'GET');return Response.json(s.payment(checkout));};
    await s.call(`/orders/${checkout.orderId}`);assert.equal(charges,1);assert.equal(s.db.prepare('SELECT status FROM lead_orders').get().status,'paid');
    assert.equal((await leadEntitlement(s.env,'seller')).access,false);
  } finally {globalThis.fetch=original;s.db.close();}
});
test('forged provider success and callback amount cannot unlock customer DB',async()=>{
  const s=await setup(), checkout=await s.create();const original=globalThis.fetch;
  globalThis.fetch=async()=>Response.json({...s.payment(checkout),orderId:'another-order'});
  try {await s.callback(checkout);assert.equal((await leadEntitlement(s.env,'seller')).access,false);assert.equal(s.db.prepare('SELECT status FROM lead_orders').get().status,'processing');}
  finally{globalThis.fetch=original;s.db.close();}
});
