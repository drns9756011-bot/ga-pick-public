import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { createHash } from 'node:crypto';
import { onRequest } from '../functions/api/[[path]].js';

test('session restore is read-only; activity renews; idle, revoked and disabled sessions cannot renew', async () => {
  const db = new DatabaseSync(':memory:');
  db.exec(`CREATE TABLE approved_sellers(seller_id TEXT PRIMARY KEY, status TEXT);
    CREATE TABLE seller_sessions(token_hash TEXT PRIMARY KEY, seller_id TEXT, created_at TEXT, expires_at TEXT);
    INSERT INTO approved_sellers VALUES('seller','approved');`);
  const hash = createHash('sha256').update('test-session').digest('hex');
  const now = Date.now();
  db.prepare('INSERT INTO seller_sessions VALUES(?,?,?,?)').run(hash, 'seller', new Date(now - 1800000).toISOString(), new Date(now + 1800000).toISOString());
  const DB = { prepare(sql) { let args = []; return {
    bind(...values) { args = values; return this; },
    async run() { return { meta: { changes: db.prepare(sql).run(...args).changes } }; },
    async first() { return db.prepare(sql).get(...args) || null; },
    async all() { return { results: db.prepare(sql).all(...args) }; },
  }; } };
  const call = (method = 'GET', token = 'test-session') => onRequest({ env: { DB }, request: new Request('https://test/api/seller-session', { method, headers: { 'X-Seller-Session': token } }), params: { path: ['seller-session'] } });
  assert.equal((await call()).status, 200);
  assert.equal(db.prepare('SELECT last_activity_at FROM seller_sessions').get().last_activity_at, '');
  assert.equal((await call('POST')).status, 200);
  const row = db.prepare('SELECT * FROM seller_sessions').get();
  assert.ok(Math.abs(Date.parse(row.expires_at) - Date.parse(row.last_activity_at) - 3600000) < 100);
  db.prepare('UPDATE seller_sessions SET last_activity_at=?').run(new Date(now - 3600001).toISOString());
  assert.equal((await call()).status, 401);
  assert.equal((await call('POST')).status, 401);
  db.prepare('UPDATE seller_sessions SET last_activity_at=?').run(new Date().toISOString());
  db.exec("UPDATE approved_sellers SET status='rejected'");
  assert.equal((await call('POST')).status, 401);
  db.exec("UPDATE approved_sellers SET status='approved'");
  assert.equal((await call('DELETE')).status, 200);
  assert.equal((await call('POST')).status, 401);
  assert.equal((await call('GET', '')).status, 401);
  db.close();
});
