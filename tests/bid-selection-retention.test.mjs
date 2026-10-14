import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { DatabaseSync } from 'node:sqlite';
import { customerPersonalExpiresAt, customerPhoneWithinSevenDays, customerPhoneRetentionExpiresAt } from '../functions/quote-retention.js';
const source = readFileSync(new URL('../functions/api/[[path]].js', import.meta.url), 'utf8');
const day = 86400000;
const now = Date.now();
const iso = (days) => new Date(now + days * day).toISOString();
function setup(functionName, nextName, extra = {}) {
  const db = new DatabaseSync(':memory:');
  db.exec(`CREATE TABLE customer_quotes (id TEXT PRIMARY KEY, created_at TEXT, selected_bid_id TEXT DEFAULT '', selected_at TEXT DEFAULT '', contact_released_bid_ids TEXT DEFAULT '[]', contact_release_scope TEXT, status TEXT, quote_expires_at TEXT, rank_notice_queued_at TEXT);
    CREATE TABLE bids (id TEXT PRIMARY KEY, quote_id TEXT);
    CREATE TABLE reviews (bid_id TEXT);
    CREATE TABLE anonymous_consultations (quote_id TEXT, status TEXT, selected_at TEXT, updated_at TEXT);`);
  db.prepare("INSERT INTO customer_quotes (id, created_at) VALUES ('q', ?)").run(iso(-20));
  db.exec("INSERT INTO bids VALUES ('old', 'q'), ('new', 'q'); INSERT INTO reviews VALUES ('old');");
  const DB = { prepare(sql) { let args = []; return {
    bind(...values) { args = values; return this; },
    async first() { return db.prepare(sql).get(...args); },
    async run() { return { meta: { changes: db.prepare(sql).run(...args).changes } }; },
  }; }, async batch(statements) {
    db.exec('BEGIN'); try { for (const statement of statements) await statement.run(); db.exec('COMMIT'); }
    catch (error) { db.exec('ROLLBACK'); throw error; }
  } };
  const context = vm.createContext({
    json: (body, status = 200) => ({ body, status }),
    normalizeCustomerQuote: (row) => row, getQuoteImages: async () => [],
    getQuoteBids: async () => db.prepare("SELECT * FROM bids WHERE quote_id = 'q'").all(),
    ...extra,
  });
  const start = source.indexOf(`async function ${functionName}(`);
  assert.ok(start >= 0);
  vm.runInContext(source.slice(start, source.indexOf(`async function ${nextName}(`, start)), context);
  return { db, env: { DB }, invoke: context[functionName], row: () => db.prepare("SELECT * FROM customer_quotes WHERE id = 'q'").get() };
}
function selection(extra = {}) {
  let t;
  t = setup('selectBid', 'closeQuoteByCustomer', {
    ensureCustomerQuoteColumns: async () => {}, hasCustomerAccess: async () => true,
    customerPersonalExpiresAt, addDays: (date, days) => new Date(Date.parse(date) + days * day).toISOString(),
    getBidsForQuote: async () => t.db.prepare("SELECT * FROM bids WHERE quote_id = 'q'").all(),
    ensureAnonymousConsultationTables: async () => {}, isTestCustomerName: () => true,
    secureQuoteImageUrls: async (_, row) => row, hideSellerOnlyQuoteFields: (row) => row,
    ...extra,
  });
  return t;
}
const request = (bidId = 'new') => ({ json: async () => ({ requestId: 'q', bidId }) });
test('first selection and reselection preserve privacy deadlines and idempotency', async () => {
  for (const selectedAt of ['', iso(-6), iso(-8), 'invalid']) {
    const t = selection();
    try {
      t.db.prepare("UPDATE customer_quotes SET selected_at = ?").run(selectedAt);
      assert.equal((await t.invoke(t.env, request())).status, 200);
      const row = t.row();
      assert.equal(row.selected_bid_id, 'new');
      if (selectedAt) assert.equal(row.selected_at, selectedAt);
      const deadline = customerPhoneRetentionExpiresAt(row);
      assert.equal((await t.invoke(t.env, request())).status, 200);
      assert.equal(customerPhoneRetentionExpiresAt(t.row()), deadline);
      assert.equal((await t.invoke(t.env, request('old'))).status, 400);
      assert.equal(customerPhoneWithinSevenDays(row, now + 1000), selectedAt === '' || selectedAt === iso(-6));
    } finally { t.db.close(); }
  }
});
test('registration day thirty blocks reselection, and late selection is capped at day thirty', async () => {
  const t = selection();
  try {
    t.db.prepare("UPDATE customer_quotes SET created_at = ?").run(iso(-30));
    assert.equal((await t.invoke(t.env, request())).status, 410);
    t.db.prepare("UPDATE customer_quotes SET created_at = ?").run(iso(-29));
    assert.equal((await t.invoke(t.env, request())).status, 200);
    assert.equal(customerPhoneRetentionExpiresAt(t.row()), iso(1));
  } finally { t.db.close(); }
});
test('a bid deleted between lookup and selection cannot become selected', async () => {
  let t;
  t = selection({ getBidsForQuote: async () => {
    const bids = t.db.prepare("SELECT * FROM bids WHERE quote_id = 'q'").all();
    t.db.exec("DELETE FROM bids WHERE id = 'new'"); return bids;
  } });
  try {
    assert.equal((await t.invoke(t.env, request())).status, 409);
    assert.equal(t.row().selected_bid_id, '');
    assert.equal(t.row().selected_at, '');
  } finally { t.db.close(); }
});
