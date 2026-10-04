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
  const insertQuote = db.prepare(`INSERT INTO customer_quotes
    (id, quote_number, customer, phone, phone_hash, phone_ciphertext, items, created_at, quote_expires_at, selected_bid_id)
    VALUES (?, ?, ?, '', ?, ?, 'TV', ?, ?, ?)`);
  insertQuote.run("q-selected", "Q-1", "선택고객", selectedPhone.hash, selectedPhone.ciphertext,
    new Date(now.getTime() - 86400000).toISOString(), new Date(now.getTime() + 86400000).toISOString(), "b-selected");
  insertQuote.run("q-other", "Q-2", "미선택고객", otherPhone.hash, otherPhone.ciphertext,
    new Date(now.getTime() - 86400000).toISOString(), new Date(now.getTime() + 86400000).toISOString(), "");
  insertQuote.run("q-expired", "Q-3", "만료고객", expiredPhone.hash, expiredPhone.ciphertext,
    new Date(now.getTime() - 8 * 86400000).toISOString(), new Date(now.getTime() + 86400000).toISOString(), "b-expired");
  db.prepare(`INSERT INTO bids (id, quote_id, seller_id, seller, price, created_at) VALUES (?, ?, ?, '전자랜드', 100, ?)`)
    .run("b-selected", "q-selected", "seller1", now.toISOString());
  db.prepare(`INSERT INTO bids (id, quote_id, seller_id, seller, price, created_at) VALUES (?, ?, ?, '전자랜드', 100, ?)`)
    .run("b-expired", "q-expired", "seller1", now.toISOString());

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
  assert.equal(byId["q-other"].phone, "***-****-****");
  assert.equal(byId["q-other"].customer, "고객님");
  assert.equal(byId["q-expired"].phone, "***-****-****");

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
  const maintenance = await call(env, "maintenance", "POST", {}, { "X-Admin-Token": env.ADMIN_API_TOKEN });
  assert.equal(maintenance.status, 200);
  assert.equal(db.prepare("SELECT id FROM customer_quotes WHERE id = 'q-old'").get(), undefined);
  assert.equal(db.prepare("SELECT id FROM quote_images WHERE quote_id = 'q-old'").get(), undefined);
  assert.equal(db.prepare("SELECT id FROM alimtalk_queue WHERE related_id = 'q-old'").get(), undefined);
  assert.deepEqual(deletedObjects, ["private/old-image"]);
  db.close();
});
