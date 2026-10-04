const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { DatabaseSync } = require('node:sqlite');
const path = require('node:path');
const vm = require('node:vm');

const source = readFileSync(path.join(__dirname, '../functions/api/[[path]].js'), 'utf8');
const start = source.indexOf('async function markAnonymousConsultationRead(');
const end = source.indexOf('async function getAnonymousPolicyCases(', start);
const context = vm.createContext({
  ensureAnonymousConsultationTables: async () => {},
  getAuthenticatedSeller: async () => ({ seller_id: 'seller-1' }),
  hasCustomerAccess: async () => false,
  normalizeAnonymousMessage: (value) => String(value).toLowerCase(),
  scanAnonymousMessage: () => ({ blocked: false, reason: '' }),
  anonymousSafeBlockMessage: () => 'blocked',
  json: (body, status = 200) => ({ body, status }),
});
vm.runInContext(source.slice(start, end), context);

function d1(db) {
  return {
    prepare(sql) {
      let params = [];
      return {
        bind(...values) { params = values; return this; },
        async first() { return db.prepare(sql).get(...params) || null; },
        async all() { return { results: db.prepare(sql).all(...params) }; },
        async run() { return db.prepare(sql).run(...params); },
      };
    },
  };
}

test('chat retry stores one message and reading does not reorder the room', async () => {
  const db = new DatabaseSync(':memory:');
  try {
    db.exec(`CREATE TABLE anonymous_consultations (id TEXT PRIMARY KEY, quote_id TEXT, bid_id TEXT, seller_id TEXT, status TEXT, updated_at TEXT, seller_read_at TEXT, customer_read_at TEXT);
      CREATE TABLE anonymous_consultation_messages (id TEXT PRIMARY KEY, consultation_id TEXT, sender_role TEXT, sender_id TEXT, body TEXT, normalized_body TEXT, blocked INTEGER, block_reason TEXT, created_at TEXT);
      CREATE TABLE customer_quotes (id TEXT PRIMARY KEY, selected_bid_id TEXT, quote_expires_at TEXT);
      INSERT INTO anonymous_consultations VALUES ('room-1', 'quote-1', 'bid-1', 'seller-1', 'open', '2026-10-01T00:00:00.000Z', '', '');
      INSERT INTO customer_quotes VALUES ('quote-1', '', '2030-01-01T00:00:00.000Z');
      INSERT INTO anonymous_consultation_messages VALUES ('customer-1', 'room-1', 'customer', '', '배송은 언제인가요?', '배송은 언제인가요?', 0, '', '2026-10-01T00:00:00.000Z');`);
    const env = { DB: d1(db) };
    const message = { consultationId: 'room-1', role: 'seller', senderId: 'seller-1', message: '다음 주 배송 가능합니다.', clientMessageId: 'anon-msg-test-retry-12345678' };
    const request = { json: async () => message };
    const first = await context.postAnonymousConsultationMessage(env, request);
    const retry = await context.postAnonymousConsultationMessage(env, request);
    assert.equal(first.status, 201);
    assert.equal(retry.status, 200);
    assert.equal(first.body.row.id, retry.body.row.id);
    assert.equal(db.prepare("SELECT COUNT(*) AS total FROM anonymous_consultation_messages WHERE sender_role = 'seller'").get().total, 1);

    const concurrent = { ...message, message: '설치 일정도 조율 가능합니다.', clientMessageId: 'anon-msg-test-concurrent-12345678' };
    const attempts = await Promise.all([
      context.postAnonymousConsultationMessage(env, { json: async () => concurrent }),
      context.postAnonymousConsultationMessage(env, { json: async () => concurrent }),
    ]);
    assert.deepEqual(attempts.map((item) => item.status).sort(), [200, 201]);
    assert.equal(db.prepare("SELECT COUNT(*) AS total FROM anonymous_consultation_messages WHERE sender_role = 'seller'").get().total, 2);

    const updatedAt = db.prepare("SELECT updated_at FROM anonymous_consultations WHERE id = 'room-1'").get().updated_at;
    const read = await context.markAnonymousConsultationRead(env, { json: async () => ({ role: 'seller' }) }, 'room-1');
    assert.equal(read.body.ok, true);
    assert.equal(db.prepare("SELECT updated_at FROM anonymous_consultations WHERE id = 'room-1'").get().updated_at, updatedAt);
  } finally {
    db.close();
  }
});

test('customer chat responses hide the internal seller id', async () => {
  const db = new DatabaseSync(':memory:');
  try {
    db.exec(`CREATE TABLE anonymous_consultations (id TEXT PRIMARY KEY, quote_id TEXT, bid_id TEXT, seller_id TEXT, status TEXT, customer_read_at TEXT, seller_read_at TEXT);
      CREATE TABLE anonymous_consultation_messages (id TEXT PRIMARY KEY, consultation_id TEXT, sender_role TEXT, body TEXT, blocked INTEGER, block_reason TEXT, created_at TEXT);
      INSERT INTO anonymous_consultations VALUES ('room-1', 'quote-1', 'bid-1', 'private-seller-id', 'open', '', '');`);
    const readContext = vm.createContext({
      URL,
      ensureAnonymousConsultationTables: async () => {},
      getAuthenticatedSeller: async () => null,
      hasValidAdminToken: () => false,
      hasCustomerAccess: async () => true,
      blockPastStoreIdentityQuestions: async () => {},
      json: (body, status = 200) => ({ body, status }),
    });
    const readStart = source.indexOf('async function getAnonymousConsultation(');
    vm.runInContext(source.slice(readStart, start), readContext);
    const result = await readContext.getAnonymousConsultation({ DB: d1(db) }, { url: 'https://example.com/api/anonymous-consultations?id=room-1' });
    assert.equal(result.body.ok, true);
    assert.equal(Object.hasOwn(result.body.consultation, 'sellerId'), false);
  } finally {
    db.close();
  }
});

test('simultaneous customer opens create one chat room', async () => {
  const db = new DatabaseSync(':memory:');
  try {
    db.exec(`CREATE TABLE anonymous_consultations (id TEXT PRIMARY KEY, quote_id TEXT, bid_id TEXT, seller_id TEXT, started_by TEXT, status TEXT, created_at TEXT, updated_at TEXT);
      CREATE UNIQUE INDEX idx_room_bid ON anonymous_consultations(quote_id, bid_id);`);
    let counter = 0;
    const createContext = vm.createContext({
      ensureAnonymousConsultationTables: async () => {},
      getAnonymousContext: async () => ({ quoteId: 'quote-1', bidId: 'bid-1', quote: { selected_bid_id: '', quote_expires_at: '2030-01-01T00:00:00.000Z' }, bid: { seller_id: 'private-seller-id' } }),
      hasCustomerAccess: async () => true,
      createId: () => `room-${++counter}`,
      json: (body, status = 200) => ({ body, status }),
    });
    const createStart = source.indexOf('async function createAnonymousConsultation(');
    const createEnd = source.indexOf('async function getAnonymousConsultation(', createStart);
    vm.runInContext(source.slice(createStart, createEnd), createContext);
    const request = { json: async () => ({ quoteId: 'quote-1', bidId: 'bid-1' }) };
    const [a, b] = await Promise.all([
      createContext.createAnonymousConsultation({ DB: d1(db) }, request),
      createContext.createAnonymousConsultation({ DB: d1(db) }, request),
    ]);
    assert.equal(a.body.id, b.body.id);
    assert.equal(db.prepare('SELECT COUNT(*) AS total FROM anonymous_consultations').get().total, 1);
    assert.equal(Object.hasOwn(a.body, 'sellerId'), false);
  } finally {
    db.close();
  }
});
