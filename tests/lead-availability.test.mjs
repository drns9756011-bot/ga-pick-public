import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { ensureLeadSchema } from '../functions/assigned-leads.js';
import { ensureLeadWaitingSchema } from '../functions/lead-availability.js';
import { onRequest } from '../functions/api/[[path]].js';

async function setup() {
  const db = new DatabaseSync(':memory:');
  db.exec(`CREATE TABLE approved_sellers(seller_id TEXT PRIMARY KEY,status TEXT,manager TEXT,branch TEXT,channel TEXT);
    CREATE TABLE seller_sessions(token_hash TEXT,seller_id TEXT,expires_at TEXT,created_at TEXT);`);
  const now = new Date().toISOString(), future = new Date(Date.now() + 86400000).toISOString();
  db.prepare('INSERT INTO approved_sellers VALUES(?,?,?,?,?)').run('seller', 'approved', 'private-name', 'private-branch', 'LG');
  db.prepare('INSERT INTO seller_sessions VALUES(?,?,?,?)').run(createHash('sha256').update('test-session').digest('hex'), 'seller', future, now);
  const DB = { prepare(sql) { let args = []; return {
    bind(...values) { args = values; return this; },
    async run() {
      assert.doesNotMatch(sql, /CREATE TRIGGER/i, 'D1 trigger installation belongs to the migration');
      return { meta: { changes: db.prepare(sql).run(...args).changes } };
    },
    async first() { return db.prepare(sql).get(...args) || null; },
    async all() { return { results: db.prepare(sql).all(...args) }; },
  }; }, async batch(statements) { const out = []; for (const s of statements) out.push(await s.run()); return out; } };
  const env = { DB }; await ensureLeadSchema(env); await ensureLeadWaitingSchema(env);
  const lead = (id, expiry = future) => db.prepare('INSERT INTO assigned_leads VALUES(?,?,?,?,?,?,?,?,?,?)')
    .run(id, 'private-name', `private-hash-${id}`, 'private-ciphertext', 'private-region', 'TV', 'private-source', 'private-proof', now, expiry);
  const assign = (id, seller, revoked = '') => db.prepare('INSERT INTO lead_assignments(id,lead_id,seller_id,consent_ref,assigned_at,updated_at,revoked_at) VALUES(?,?,?,?,?,?,?)')
    .run(`${id}-${seller}`, id, seller, 'private-proof', now, now, revoked);
  const request = async (headers = { 'X-Seller-Session': 'test-session' }, query = '') => {
    const response = await onRequest({ env, request: new Request(`https://test/api/lead-availability${query}`, { headers }), params: { path: ['lead-availability'] } });
    return { status: response.status, data: await response.json(), cache: response.headers.get('Cache-Control') };
  };
  return { db, lead, assign, request };
}

test('unpaid approved sellers can see an aggregate only, never personal data', async () => {
  const s = await setup();
  try {
    s.lead('a'); const result = await s.request();
    assert.equal(result.status, 200); assert.equal(result.data.availableCount, 1);
    assert.deepEqual(Object.keys(result.data).sort(), ['assignedCount', 'availableCount', 'checkedAt', 'hasPurchased', 'ok', 'unassignedCount', 'waitingCount']);
    assert.doesNotMatch(JSON.stringify(result.data), /private-/);
    assert.equal(result.cache, 'no-store');
  } finally { s.db.close(); }
});

test('confirmed waiting inventory is seeded once and transfers to real registrations without double counting', async () => {
  const s = await setup();
  const migration = readFileSync(new URL('../migrations/20261027-waiting-db-stock.sql', import.meta.url), 'utf8');
  try {
    s.db.exec(migration);
    assert.equal(s.db.prepare('SELECT count(*) AS n FROM assigned_leads').get().n, 0);
    assert.equal((await s.request()).data.waitingCount, 20);
    s.lead('registered');
    let result = (await s.request()).data;
    assert.equal(result.waitingCount, 19); assert.equal(result.availableCount, 1);
    s.db.exec("INSERT OR IGNORE INTO assigned_leads SELECT * FROM assigned_leads WHERE id='registered'");
    assert.equal((await s.request()).data.waitingCount, 19);
    s.db.exec("DELETE FROM assigned_leads WHERE id='registered'");
    s.db.exec(migration);
    result = (await s.request()).data;
    assert.equal(result.waitingCount, 19); assert.equal(result.availableCount, 0);
  } finally { s.db.close(); }
});

test('only verified live purchases and accessible assignments affect the current sellers counts', async () => {
  const s = await setup();
  try {
    const now = new Date().toISOString(), future = new Date(Date.now() + 86400000).toISOString();
    const order = (id, seller, status, mode) => s.db.prepare('INSERT INTO lead_orders(id,seller_id,quantity,amount,mode,status,callback_hash,created_at,expires_at) VALUES(?,?,5,40000,?,?,?,?,?)')
      .run(id, seller, mode, status, 'test-only', now, future);
    order('pending', 'seller', 'pending', 'live'); order('sandbox', 'seller', 'paid', 'sandbox'); order('other-order', 'other', 'paid', 'live');
    let result = (await s.request()).data;
    assert.equal(result.hasPurchased, false); assert.equal(result.unassignedCount, 0);
    order('confirmed', 'seller', 'paid', 'live');
    result = (await s.request()).data;
    assert.equal(result.hasPurchased, true); assert.equal(result.unassignedCount, 5); assert.equal(result.assignedCount, 0);
    s.lead('mine'); s.assign('mine', 'seller');
    s.db.prepare('INSERT INTO lead_credit_usage VALUES(?,?,?)').run('mine-seller', 'confirmed', now);
    result = (await s.request()).data;
    assert.equal(result.assignedCount, 1); assert.equal(result.unassignedCount, 4);
    s.db.prepare("UPDATE lead_orders SET status='cancelled' WHERE id='confirmed'").run();
    result = (await s.request()).data;
    assert.equal(result.hasPurchased, false); assert.equal(result.assignedCount, 0); assert.equal(result.unassignedCount, 0);
  } finally { s.db.close(); }
});

test('counts unique eligible customers, excluding expiry, full capacity and all past recipients', async () => {
  const s = await setup();
  try {
    for (const id of ['new', 'shared', 'full', 'mine', 'revoked']) s.lead(id);
    s.lead('expired', new Date(Date.now() - 1000).toISOString());
    s.assign('shared', 'other');
    for (const seller of ['one','two','three']) s.assign('full', seller, seller === 'one' ? 'revoked' : '');
    s.assign('mine', 'seller'); s.assign('revoked', 'seller', 'revoked');
    assert.equal((await s.request()).data.availableCount, 2);
    s.assign('new', 'seller'); assert.equal((await s.request()).data.availableCount, 1);
    s.db.prepare("DELETE FROM assigned_leads WHERE id='shared'").run();
    assert.equal((await s.request()).data.availableCount, 0);
  } finally { s.db.close(); }
});

test('authentication and approval are mandatory; submitted identity cannot change the count', async () => {
  const s = await setup();
  try {
    s.lead('mine'); s.assign('mine', 'seller');
    assert.equal((await s.request({})).status, 401);
    assert.equal((await s.request({ 'X-Admin-Token': 'not-a-seller-session' })).status, 401);
    assert.equal((await s.request(undefined, '?sellerId=other')).data.availableCount, 0);
    s.db.prepare("UPDATE approved_sellers SET status='rejected'").run();
    assert.equal((await s.request()).status, 401);
  } finally { s.db.close(); }
});
