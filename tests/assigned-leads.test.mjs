import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { handleLeads, purgeExpiredLeads } from '../functions/assigned-leads.js';
import { onRequest } from '../functions/api/[[path]].js';

function setup() {
  const db = new DatabaseSync(':memory:');
  db.exec(`PRAGMA foreign_keys = ON; CREATE TABLE approved_sellers(seller_id TEXT PRIMARY KEY, status TEXT, manager TEXT, branch TEXT, channel TEXT);
    CREATE TABLE seller_sessions(token_hash TEXT, seller_id TEXT, expires_at TEXT, created_at TEXT);`);
  for (let i = 1; i <= 4; i++) db.prepare('INSERT INTO approved_sellers VALUES(?,?,?,?,?)').run(`s${i}`, 'approved', `매니저${i}`, '서울점', 'LG');
  const DB = { prepare(sql) { let args = []; return {
    bind(...values) { args = values; return this; },
    async run() { return { meta: { changes: db.prepare(sql).run(...args).changes } }; },
    async first() { return db.prepare(sql).get(...args) || null; },
    async all() { return { results: db.prepare(sql).all(...args) }; },
  }; }, async batch(statements) { db.exec('BEGIN'); try { const out = []; for (const statement of statements) out.push(await statement.run()); db.exec('COMMIT'); return out; } catch (e) { db.exec('ROLLBACK'); throw e; } } };
  const env = { DB, CUSTOMER_PHONE_KEY: Buffer.alloc(32, 7).toString('base64'), ADMIN_API_TOKEN: 'test-only' };
  const call = async (path = '', method = 'GET', body, actor = { admin: true }, extra = {}) => {
    const url = `https://test/api/assigned-leads${path}`;
    const response = await handleLeads(env, new Request(url, { method, headers: { 'Content-Type': 'application/json', ...extra }, ...(body ? { body: JSON.stringify(body) } : {}) }), `assigned-leads${path.split('?')[0]}`, actor);
    return { status: response.status, data: await response.json() };
  };
  return { db, env, call };
}
const customer = { name: '테스트 고객', phone: '010-1234-5678', region: '서울', items: '냉장고' };
const payload = { rows: [customer], source: 'test source', consentRef: 'proof-001', consentConfirmed: true };
async function seed(s) { assert.equal((await s.call('', 'POST', payload)).status, 200); return s.db.prepare('SELECT * FROM assigned_leads').get(); }
const assign = (s, id, sellerId) => s.call(`/${id}/assign`, 'POST', { sellerId, consentRef: 'recipient-proof', consentConfirmed: true });

test('register encrypts phone, deduplicates and never leaks ciphertext/hash in lists', async () => {
  const s = setup(); const row = await seed(s);
  assert.ok(row.phone_ciphertext.startsWith('v1:')); assert.equal(row.phone_hash.length, 64);
  assert.ok(!JSON.stringify(row).includes('01012345678'));
  assert.equal(Date.parse(row.expires_at) - Date.parse(row.created_at), 30 * 86400000);
  assert.equal((await s.call('', 'POST', payload)).data.skipped, 1);
  const listed = await s.call(); assert.equal(listed.data.rows.length, 1);
  assert.equal(listed.data.rows[0].phone_ciphertext, undefined); assert.equal(listed.data.rows[0].phone_hash, undefined);
});
test('invalid or unconsented uploads are rejected before any insert', async () => {
  const s = setup();
  assert.equal((await s.call('', 'POST', { ...payload, consentConfirmed: false })).status, 400);
  assert.equal((await s.call('', 'POST', { ...payload, rows: [customer, { ...customer, phone: 'bad' }] })).status, 400);
  assert.equal(s.db.prepare('SELECT count(*) AS n FROM assigned_leads').get().n, 0);
  assert.equal((await s.call('', 'POST', { ...payload, rows: Array(101).fill(customer) })).status, 400);
});
test('only assigned seller sees list and reveals phone; admin requires reauthentication', async () => {
  const s = setup(); const row = await seed(s); await assign(s, row.id, 's1');
  assert.equal((await s.call('', 'GET', null, { sellerId: 's2' })).data.rows.length, 0);
  assert.equal((await s.call(`/${row.id}/phone`, 'POST', {}, { sellerId: 's2' })).status, 404);
  assert.equal((await s.call(`/${row.id}/phone`, 'POST', {}, { sellerId: 's1' })).data.phone, '01012345678');
  assert.equal((await s.call(`/${row.id}/phone`, 'POST', {})).status, 403);
  assert.equal((await s.call(`/${row.id}/phone`, 'POST', {}, { admin: true }, { 'X-Admin-Reauth': 'bad' })).status, 403);
  assert.equal((await s.call(`/${row.id}/phone`, 'POST', {}, { admin: true }, { 'X-Admin-Reauth': 'test-only' })).status, 200);
  assert.equal(s.db.prepare('SELECT count(*) AS n FROM lead_phone_access').get().n, 2);
});
test('capacity three, duplicate idempotency, approved recipient and revocation', async () => {
  const s = setup(); const row = await seed(s);
  assert.equal((await assign(s, row.id, 'missing')).status, 409);
  assert.equal((await assign(s, row.id, 's1')).status, 200);
  assert.equal((await assign(s, row.id, 's1')).status, 409);
  await assign(s, row.id, 's2'); await assign(s, row.id, 's3');
  assert.equal((await assign(s, row.id, 's4')).status, 409);
  const assignment = s.db.prepare('SELECT id FROM lead_assignments WHERE seller_id = ?').get('s1');
  await s.call(`/${row.id}/revoke`, 'POST', { assignmentId: assignment.id });
  assert.equal((await s.call(`/${row.id}/phone`, 'POST', {}, { sellerId: 's1' })).status, 404);
  assert.equal((await assign(s, row.id, 's4')).status, 409);
});
test('manager notes are isolated and stale updates are rejected', async () => {
  const s = setup(); const row = await seed(s); await assign(s, row.id, 's1'); await assign(s, row.id, 's2');
  const change = { status: 'followup', note: '내 상담 메모', nextContactAt: new Date().toISOString(), version: 1 };
  assert.equal((await s.call(`/${row.id}`, 'PATCH', change, { sellerId: 's3' })).status, 409);
  assert.equal((await s.call(`/${row.id}`, 'PATCH', change, { sellerId: 's1' })).status, 200);
  assert.equal((await s.call(`/${row.id}`, 'PATCH', change, { sellerId: 's1' })).status, 409);
  assert.equal((await s.call('', 'GET', null, { sellerId: 's2' })).data.rows[0].note, '');
  assert.equal((await s.call(`/${row.id}`, 'DELETE', null, { sellerId: 's1' })).status, 404);
});
test('expiry permanently deletes customer, hash, assignments, notes and access log', async () => {
  const s = setup(); const row = await seed(s); await assign(s, row.id, 's1');
  await s.call(`/${row.id}/phone`, 'POST', {}, { sellerId: 's1' });
  await purgeExpiredLeads(s.env, row.expires_at);
  for (const table of ['assigned_leads', 'lead_assignments', 'lead_phone_access']) assert.equal(s.db.prepare(`SELECT count(*) AS n FROM ${table}`).get().n, 0);
  assert.equal((await s.call(`/${row.id}/phone`, 'POST', {}, { sellerId: 's1' })).status, 404);
});
test('manual deletion removes every dependent record', async () => {
  const s = setup(); const row = await seed(s); await assign(s, row.id, 's1');
  await s.call(`/${row.id}/phone`, 'POST', {}, { sellerId: 's1' });
  assert.equal((await s.call(`/${row.id}`, 'DELETE')).status, 200);
  for (const table of ['assigned_leads', 'lead_assignments', 'lead_phone_access']) assert.equal(s.db.prepare(`SELECT count(*) AS n FROM ${table}`).get().n, 0);
});
test('public worker authenticates session and never trusts submitted seller id or admin token', async () => {
  const s = setup(); const row = await seed(s); await assign(s, row.id, 's1');
  const call = async headers => {
    const response = await onRequest({ env: s.env, request: new Request('https://test/api/assigned-leads?sellerId=s1', { headers }), params: { path: ['assigned-leads'] } });
    return { status: response.status, data: await response.json() };
  };
  assert.equal((await call({ 'X-Admin-Token': 'test-only' })).status, 401);
  assert.equal((await call({ 'X-Seller-Session': 'invalid' })).status, 401);
  s.db.prepare('INSERT INTO seller_sessions(token_hash,seller_id,expires_at,created_at) VALUES(?,?,?,?)').run(createHash('sha256').update('valid-session').digest('hex'), 's1', new Date(Date.now() + 3600000).toISOString(), new Date().toISOString());
  assert.equal((await call({ 'X-Seller-Session': 'valid-session' })).data.rows.length, 1);
  s.db.prepare("UPDATE approved_sellers SET status = 'rejected' WHERE seller_id = 's1'").run();
  assert.equal((await call({ 'X-Seller-Session': 'valid-session' })).status, 401);
});
test('admin and public share identical module and cron cleanup is wired', () => {
  const adminModule = new URL('../../ga-pick-admin/functions/assigned-leads.js', import.meta.url);
  if (existsSync(adminModule)) assert.equal(readFileSync(new URL('../functions/assigned-leads.js', import.meta.url), 'utf8'), readFileSync(adminModule, 'utf8'));
  assert.match(readFileSync(new URL('../functions/api/[[path]].js', import.meta.url), 'utf8'), /await purgeExpiredLeads\(env\)/);
});
