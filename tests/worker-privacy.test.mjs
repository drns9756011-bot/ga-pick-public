import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { webcrypto } from "node:crypto";
import { onRequest } from "../functions/api/[[path]].js";
import { protectCustomerPhone } from "../functions/phone-vault.js";

globalThis.crypto ||= webcrypto;

function d1(db) {
  return {
    prepare(sql) {
      let params = [];
      return {
        bind(...values) { params = values; return this; },
        async first() { return db.prepare(sql).get(...params) || null; },
        async all() { return { results: db.prepare(sql).all(...params) }; },
        async run() {
          const result = db.prepare(sql).run(...params);
          return { meta: { changes: result.changes } };
        },
      };
    },
    async batch(statements) { return Promise.all(statements.map((statement) => statement.run())); },
  };
}

async function call(env, path, method = "GET", body, headers = {}) {
  const response = await onRequest({
    env,
    request: new Request(`https://ga-pick.com/api/${path}`, {
      method,
      headers: { ...(body ? { "Content-Type": "application/json" } : {}), ...headers },
      ...(body ? { body: JSON.stringify(body) } : {}),
    }),
    params: { path: path.split("?")[0].split("/") },
  });
  return { status: response.status, body: await response.json() };
}

test("worker gates quote phone by seller session, selection, and seven-day window", async () => {
  const db = new DatabaseSync(":memory:");
  db.exec(readFileSync(new URL("../schema.sql", import.meta.url), "utf8"));
  const env = { DB: d1(db), CUSTOMER_PHONE_KEY: Buffer.alloc(32, 17).toString("base64"), ADMIN_API_TOKEN: "admin-test-token" };
  const now = new Date();
  const selectedPhone = await protectCustomerPhone(env, "01011112222");
  const otherPhone = await protectCustomerPhone(env, "01033334444");
  const expiredPhone = await protectCustomerPhone(env, "01055556666");
  db.prepare(`INSERT INTO approved_sellers
    (id, seller_id, password, channel, branch, branch_region, manager, phone, approved_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`).run("seller-1", "seller1", "test-pass", "전자랜드", "중앙점", "서울", "매니저", "01099998888", now.toISOString());
  db.prepare(`INSERT INTO approved_sellers
    (id, seller_id, password, channel, branch, branch_region, manager, phone, approved_at)
    VALUES ('seller-master', 'pickgj', 'master-test-pass', '전자랜드', '중앙점', '서울', '마스터', '01099990000', ?)`)
    .run(now.toISOString());
  const insertQuote = db.prepare(`INSERT INTO customer_quotes
    (id, quote_number, customer, phone, phone_hash, phone_ciphertext, items, created_at, quote_expires_at, selected_bid_id)
    VALUES (?, ?, ?, '', ?, ?, 'TV', ?, ?, ?)`);
  insertQuote.run("q-selected", "Q-1", "선택고객", selectedPhone.hash, selectedPhone.ciphertext,
    new Date(now.getTime() - 20 * 86400000).toISOString(), new Date(now.getTime() + 86400000).toISOString(), "b-selected");
  db.prepare("UPDATE customer_quotes SET selected_at = ? WHERE id = 'q-selected'").run(new Date(now.getTime() - 86400000).toISOString());
  insertQuote.run("q-other", "Q-2", "미선택고객", otherPhone.hash, otherPhone.ciphertext,
    new Date(now.getTime() - 86400000).toISOString(), new Date(now.getTime() + 86400000).toISOString(), "");
  insertQuote.run("q-expired", "Q-3", "만료고객", expiredPhone.hash, expiredPhone.ciphertext,
    new Date(now.getTime() - 8 * 86400000).toISOString(), new Date(now.getTime() + 86400000).toISOString(), "b-expired");
  db.prepare(`INSERT INTO bids (id, quote_id, seller_id, seller, price, created_at) VALUES (?, ?, ?, '전자랜드', 100, ?)`)
    .run("b-selected", "q-selected", "seller1", now.toISOString());
  db.prepare(`INSERT INTO bids (id, quote_id, seller_id, seller, price, created_at) VALUES (?, ?, ?, '전자랜드', 100, ?)`)
    .run("b-expired", "q-expired", "seller1", now.toISOString());
  db.prepare(`INSERT INTO quote_images (id, quote_id, image_type, object_key, url, created_at)
    VALUES ('selected-thumb', 'q-selected', 'thumbnail', 'quote-thumbnails/q-selected-thumb.png',
      '/api/files/quote-thumbnails/q-selected-thumb.png', ?)`)
    .run(now.toISOString());
  db.prepare("UPDATE customer_quotes SET thumbnail_image_key = ?, thumbnail_image = ? WHERE id = 'q-selected'")
    .run("quote-thumbnails/q-selected-thumb.png", "/api/files/quote-thumbnails/q-selected-thumb.png");
  const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=", "base64");
  env.FILES = { async get() { return { arrayBuffer: async () => png, httpMetadata: { contentType: "image/png" } }; } };

  assert.equal((await call(env, "customer-quotes")).status, 401);
  assert.equal((await call(env, "bids?quoteId=q-selected")).status, 401);
  assert.equal((await call(env, "bid-selection", "POST", { requestId: "q-other", bidId: "b-selected" })).status, 403);
  const login = await call(env, "seller-login", "POST", { sellerId: "seller1", password: "test-pass" });
  assert.equal(login.status, 200);
  assert.ok(login.body.sessionToken);
  const quotes = await call(env, "customer-quotes", "GET", null, { "X-Seller-Session": login.body.sessionToken });
  assert.equal(quotes.status, 200);
  const byId = Object.fromEntries(quotes.body.rows.map((row) => [row.id, row]));
  assert.equal(byId["q-selected"].phone, "01011112222");
  assert.equal(byId["q-selected"].selectedAt, new Date(now.getTime() - 86400000).toISOString());
  assert.equal(byId["q-selected"].phoneAccessExpiresAt, new Date(now.getTime() + 6 * 86400000).toISOString());
  assert.equal(byId["q-other"].phone, "***-****-****");
  assert.equal(byId["q-other"].customer, "고객님");
  assert.equal(byId["q-expired"].phone, "***-****-****");
  const master = await call(env, "seller-login", "POST", { sellerId: "pickgj", password: "master-test-pass" });
  const masterQuotes = await call(env, "customer-quotes", "GET", null, { "X-Seller-Session": master.body.sessionToken });
  assert.equal(masterQuotes.body.rows.find((row) => row.id === "q-selected").phone, "***-****-****");
  db.prepare("UPDATE customer_quotes SET selected_at = ? WHERE id = 'q-selected'").run(new Date(now.getTime() - 8 * 86400000).toISOString());
  const expiredAccess = await call(env, "customer-quotes", "GET", null, { "X-Seller-Session": login.body.sessionToken });
  assert.equal(expiredAccess.body.rows.find((row) => row.id === "q-selected").phone, "***-****-****");
  assert.match(byId["q-selected"].image, /signature=[a-f0-9]{64}/);
  const imagePath = "files/quote-thumbnails/q-selected-thumb.png";
  const unsignedImage = await onRequest({ env, request: new Request(`https://ga-pick.com/api/${imagePath}`), params: { path: imagePath.split("/") } });
  assert.equal(unsignedImage.status, 403);
  const signedImage = await onRequest({
    env,
    request: new Request(`https://ga-pick.com${byId["q-selected"].image}`),
    params: { path: imagePath.split("/") },
  });
  assert.equal(signedImage.status, 200);

  db.prepare(`INSERT INTO anonymous_consultations
    (id, quote_id, bid_id, seller_id, status, created_at, updated_at)
    VALUES ('chat-1', 'q-selected', 'b-selected', 'seller1', 'open', ?, ?)`)
    .run(now.toISOString(), now.toISOString());
  assert.equal((await call(env, "anonymous-consultations?sellerId=seller1")).status, 403);
  assert.equal((await call(env, "anonymous-consultations?id=chat-1")).status, 403);
  assert.equal((await call(env, "anonymous-consultations/chat-1/read", "POST", { role: "seller" })).status, 403);
  assert.equal((await call(env, "anonymous-consultation-messages", "POST", {
    consultationId: "chat-1", role: "seller", senderId: "seller1", message: "안녕하세요",
  })).status, 403);
  assert.equal((await call(env, "anonymous-consultations?sellerId=seller1", "GET", null,
    { "X-Seller-Session": login.body.sessionToken })).status, 200);

  const deletedObjects = [];
  env.FILES = { async delete(key) { deletedObjects.push(key); } };
  insertQuote.run("q-old", "Q-4", "삭제고객", "", "",
    new Date(now.getTime() - 31 * 86400000).toISOString(), new Date(now.getTime() + 86400000).toISOString(), "b-old");
  db.prepare(`INSERT INTO quote_images (id, quote_id, object_key, url, created_at)
    VALUES ('image-old', 'q-old', 'private/old-image', '/api/files/private/old-image', ?)`)
    .run(new Date(now.getTime() - 31 * 86400000).toISOString());
  db.prepare(`INSERT INTO alimtalk_queue (id, type, title, body, related_id, target_phone, created_at)
    VALUES ('notice-old', 'customer-quote', 'test', 'test', 'q-old', '01077778888', ?)`)
    .run(new Date(now.getTime() - 31 * 86400000).toISOString());
  db.prepare(`INSERT INTO bids (id, quote_id, seller_id, seller, price, created_at)
    VALUES ('b-old', 'q-old', 'seller1', '전자랜드', 100, ?)`).run(now.toISOString());
  db.prepare(`INSERT INTO anonymous_consultations (id, quote_id, bid_id, seller_id, status, created_at, updated_at)
    VALUES ('chat-old', 'q-old', 'b-old', 'seller1', 'closed', ?, ?)`).run(now.toISOString(), now.toISOString());
  db.prepare(`INSERT INTO anonymous_consultation_messages
    (id, consultation_id, sender_role, sender_id, body, normalized_body, created_at)
    VALUES ('message-old', 'chat-old', 'customer', 'q-old', 'private message', 'private message', ?)`).run(now.toISOString());
  db.exec(`CREATE TABLE IF NOT EXISTS customer_access_tokens
    (token_hash TEXT NOT NULL, quote_id TEXT NOT NULL, expires_at TEXT NOT NULL, PRIMARY KEY (token_hash, quote_id))`);
  db.prepare(`INSERT INTO customer_access_tokens (token_hash, quote_id, expires_at)
    VALUES ('test-hash', 'q-old', ?)`).run(new Date(now.getTime() + 86400000).toISOString());
  db.prepare(`INSERT INTO alimtalk_queue
    (id, type, title, body, related_id, target_role, target_phone, variables_json, solapi_response_json, created_at)
    VALUES ('notice-selected', 'seller-bid-selected', 'test', '01011112222', 'q-selected', 'seller', '01099998888', ?, ?, ?)`)
    .run(JSON.stringify({ '#{고객연락처}': '010-1111-2222' }), JSON.stringify({ latestMessage: { text: '01011112222' } }), now.toISOString());
  const notices = await call(env, 'alimtalk', 'GET', null, { 'X-Admin-Token': env.ADMIN_API_TOKEN });
  assert.equal(notices.status, 200);
  assert.doesNotMatch(JSON.stringify(notices.body), /01011112222|010-1111-2222/);
  db.prepare(`INSERT INTO alimtalk_queue (id, type, title, body, related_id, target_phone, created_at)
    VALUES ('notice-orphan', 'customer-quote-received', 'test', 'test', 'deleted-quote', '01077778888', ?)`)
    .run(now.toISOString());
  db.prepare(`INSERT INTO brand_consultations
    (id, package_id, seller_id, customer_name, customer_phone, created_at, updated_at)
    VALUES ('brand-old', 'package-1', 'seller1', '브랜드고객', '01077778888', ?, ?)`)
    .run(new Date(now.getTime() - 400 * 86400000).toISOString(), now.toISOString());
  const maintenance = await call(env, "maintenance/quote-privacy", "POST", {}, { "X-Admin-Token": env.ADMIN_API_TOKEN });
  assert.equal(maintenance.status, 200);
  assert.equal(db.prepare("SELECT id FROM customer_quotes WHERE id = 'q-old'").get(), undefined);
  assert.equal(db.prepare("SELECT id FROM bids WHERE quote_id = 'q-old'").get(), undefined);
  assert.equal(db.prepare("SELECT id FROM anonymous_consultations WHERE quote_id = 'q-old'").get(), undefined);
  assert.equal(db.prepare("SELECT id FROM anonymous_consultation_messages WHERE consultation_id = 'chat-old'").get(), undefined);
  assert.equal(db.prepare("SELECT token_hash FROM customer_access_tokens WHERE quote_id = 'q-old'").get(), undefined);
  assert.equal(db.prepare("SELECT id FROM quote_images WHERE quote_id = 'q-old'").get(), undefined);
  assert.equal(db.prepare("SELECT id FROM alimtalk_queue WHERE related_id = 'q-old'").get(), undefined);
  assert.equal(db.prepare("SELECT id FROM alimtalk_queue WHERE id = 'notice-orphan'").get(), undefined);
  assert.equal(db.prepare("SELECT phone_ciphertext FROM customer_quotes WHERE id = 'q-selected'").get().phone_ciphertext, "");
  assert.equal(db.prepare("SELECT phone_hash FROM customer_quotes WHERE id = 'q-selected'").get().phone_hash, selectedPhone.hash);
  assert.equal(db.prepare("SELECT id FROM alimtalk_queue WHERE related_id = 'q-selected'").get(), undefined);
  assert.equal(db.prepare("SELECT phone_ciphertext FROM customer_quotes WHERE id = 'q-expired'").get().phone_ciphertext, "");
  assert.equal(db.prepare("SELECT phone_ciphertext FROM customer_quotes WHERE id = 'q-other'").get().phone_ciphertext, otherPhone.ciphertext);
  assert.equal(db.prepare("SELECT personal_expires_at FROM customer_quotes WHERE id = 'q-other'").get().personal_expires_at, new Date(now.getTime() + 29 * 86400000).toISOString());
  assert.ok(db.prepare("SELECT id FROM brand_consultations WHERE id = 'brand-old'").get());
  assert.deepEqual(deletedObjects, ["private/old-image"]);
  db.close();
});

test("late selection starts a server clock once, rejects other bids, and cannot resurrect erased numbers", async () => {
  const db = new DatabaseSync(":memory:");
  db.exec(readFileSync(new URL("../schema.sql", import.meta.url), "utf8"));
  const env = { DB: d1(db), CUSTOMER_PHONE_KEY: Buffer.alloc(32, 17).toString("base64"), ADMIN_API_TOKEN: "admin-test-token" };
  const now = Date.now();
  const protectedPhone = await protectCustomerPhone(env, "01012345678");
  db.prepare(`INSERT INTO customer_quotes
    (id, quote_number, customer, phone, phone_hash, phone_ciphertext, items, created_at, personal_expires_at)
    VALUES ('q-late', 'Q-LATE', '테스트고객', '', ?, ?, 'TV', ?, ?)`)
    .run(protectedPhone.hash, protectedPhone.ciphertext, new Date(now - 25 * 86400000).toISOString(), new Date(now + 365 * 86400000).toISOString());
  for (const id of ['bid-first', 'bid-other']) {
    db.prepare(`INSERT INTO bids (id, quote_id, seller_id, seller, price, created_at)
      VALUES (?, 'q-late', 'seller1', '전자랜드', 100, ?)`).run(id, new Date(now).toISOString());
  }
  const lookup = await call(env, `customer-quotes?scope=lookup&customer=${encodeURIComponent('테스트고객')}&phone=01012345678`);
  assert.equal(lookup.status, 200);
  assert.equal(lookup.body.rows[0].phone, '***-****-****');
  const headers = { 'X-Customer-Access': lookup.body.accessToken };
  const selected = await call(env, 'bid-selection', 'POST', { requestId: 'q-late', bidId: 'bid-first', selectedAt: '2099-01-01T00:00:00Z' }, headers);
  assert.equal(selected.status, 200);
  assert.ok(Date.parse(selected.body.row.selectedAt) >= now);
  assert.equal(selected.body.row.phoneAccessExpiresAt, new Date(now + 5 * 86400000).toISOString());
  assert.equal(selected.body.row.personalExpiresAt, new Date(now + 5 * 86400000).toISOString());
  const repeated = await call(env, 'bid-selection', 'POST', { requestId: 'q-late', bidId: 'bid-first' }, headers);
  assert.equal(repeated.status, 200);
  assert.equal(repeated.body.row.selectedAt, selected.body.row.selectedAt);
  assert.equal((await call(env, 'bid-selection', 'POST', { requestId: 'q-late', bidId: 'bid-other' }, headers)).status, 400);
  assert.equal((await call(env, 'customer-quotes/q-late', 'PATCH', { selectedBidId: 'bid-other', items: 'TV' }, { 'X-Admin-Token': env.ADMIN_API_TOKEN })).status, 400);
  db.prepare("UPDATE customer_quotes SET selected_at = ?, phone_ciphertext = '' WHERE id = 'q-late'")
    .run(new Date(now - 8 * 86400000).toISOString());
  const expiredRepeat = await call(env, 'bid-selection', 'POST', { requestId: 'q-late', bidId: 'bid-first' }, headers);
  assert.equal(expiredRepeat.status, 200);
  assert.equal(db.prepare("SELECT phone_ciphertext FROM customer_quotes WHERE id = 'q-late'").get().phone_ciphertext, '');
  assert.equal((await call(env, 'customer-quotes/q-late', 'PATCH', { phone: '01012345678' }, { 'X-Admin-Token': env.ADMIN_API_TOKEN })).status, 410);
  db.prepare("UPDATE customer_quotes SET selected_bid_id = '' WHERE id = 'q-late'").run();
  const reselected = await call(env, 'bid-selection', 'POST', { requestId: 'q-late', bidId: 'bid-other' }, headers);
  assert.equal(reselected.status, 200);
  assert.equal(reselected.body.row.selectedAt, new Date(now - 8 * 86400000).toISOString());
  assert.equal(db.prepare("SELECT phone_ciphertext FROM customer_quotes WHERE id = 'q-late'").get().phone_ciphertext, '');
  assert.equal(reselected.body.row.phoneAccessExpiresAt, new Date(now - 86400000).toISOString());
  db.close();
});
