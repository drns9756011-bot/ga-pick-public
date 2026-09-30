const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { DatabaseSync } = require('node:sqlite');
const vm = require('node:vm');
const path = require('node:path');

const source = readFileSync(path.join(__dirname, '../functions/api/[[path]].js'), 'utf8');
const handler = source.slice(source.indexOf('async function createSellerApplication('), source.indexOf('async function updateSellerApplication('));

function setup() {
  const db = new DatabaseSync(':memory:');
  db.exec(`CREATE TABLE approved_sellers (id TEXT PRIMARY KEY, seller_id TEXT, phone TEXT);
    CREATE TABLE seller_applications (id TEXT PRIMARY KEY, status TEXT, requested_at TEXT,
    reviewed_at TEXT, review_memo TEXT, seller_id TEXT, password TEXT, channel TEXT,
    branch TEXT, branch_region TEXT, manager TEXT, manager_position TEXT, phone TEXT,
    card_image TEXT, card_image_key TEXT, memo TEXT, consent_json TEXT);`);
  const calls = { uploads: 0, alerts: 0, failAlert: false };
  const context = vm.createContext({
    ensureSellerColumns: async () => {},
    normalizePhone: value => String(value || '').replace(/[^0-9]/g, ''),
    createId: () => 'new-application',
    saveDataUrlToR2: async () => { calls.uploads++; return {}; },
    hashPassword: async () => 'hashed',
    normalizeSellerApplication: row => row,
    traceSellerAdminAlert: async () => {},
    queueSellerApplicationAdminAlert: async () => {
      calls.alerts++;
      if (calls.failAlert) throw new Error('test delivery failure');
      return { ok: true };
    },
    json: (body, status) => ({ body, status }),
  });
  vm.runInContext(handler, context);
  const env = { DB: { prepare(sql) {
    return { bind(...values) {
      return {
        first: async () => db.prepare(sql).get(...values) || null,
        run: async () => db.prepare(sql).run(...values),
      };
    } };
  } } };
  const submit = (extra = {}) => context.createSellerApplication(env, { json: async () => ({
    sellerId: 'test-seller', phone: '01000000000', branch: 'Test', manager: 'Test', password: 'test-password', ...extra,
  }) });
  return { db, calls, submit };
}

for (const status of ['approved', 'rejected']) {
  test(`historical ${status} application without a live account allows reapplication`, async () => {
    const { db, calls, submit } = setup();
    try {
      db.prepare('INSERT INTO seller_applications (id, status, seller_id, phone) VALUES (?, ?, ?, ?)')
        .run('history', status, 'test-seller', '01000000000');
      const result = await submit();
      assert.equal(result.status, 201);
      assert.equal(result.body.row.status, 'pending');
      assert.equal(db.prepare('SELECT status FROM seller_applications WHERE id = ?').get('history').status, status);
      assert.equal(calls.alerts, 1);
    } finally { db.close(); }
  });
}

for (const table of ['approved_sellers', 'seller_applications']) {
  for (const match of ['id', 'phone']) {
    test(`${table} blocks duplicate by ${match} before upload and notification`, async () => {
      const { db, calls, submit } = setup();
      try {
        const sellerId = match === 'id' ? 'test-seller' : 'another-seller';
        const phone = match === 'phone' ? '010-0000-0000' : '01099999999';
        if (table === 'approved_sellers') {
          db.prepare('INSERT INTO approved_sellers VALUES (?, ?, ?)').run('existing', sellerId, phone);
        } else {
          db.prepare('INSERT INTO seller_applications (id, status, seller_id, phone) VALUES (?, ?, ?, ?)')
            .run('existing', 'pending', sellerId, phone);
        }
        const result = await submit({ id: 'existing' });
        assert.equal(result.status, 409);
        assert.equal(calls.uploads, 0);
        assert.equal(calls.alerts, 0);
      } finally { db.close(); }
    });
  }
}

test('notification failure preserves the saved pending application', async () => {
  const { db, calls, submit } = setup();
  try {
    calls.failAlert = true;
    const result = await submit();
    assert.equal(result.status, 201);
    assert.equal(result.body.adminAlert.ok, false);
    assert.equal(db.prepare('SELECT status FROM seller_applications').get().status, 'pending');
  } finally { db.close(); }
});
