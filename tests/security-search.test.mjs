import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { DatabaseSync } from "node:sqlite";
import { onRequest } from "../functions/api/[[path]].js";
import worker from "../src/index.js";
import { SEARCH_PAGES } from "../src/search-config.js";

const read = (path) => readFileSync(new URL("../" + path, import.meta.url), "utf8");

test("search metadata is unique, route-specific, and excludes private forms", () => {
  for (const page of SEARCH_PAGES) {
    const html = read("public/" + page.file);
    assert.equal((html.match(/rel="canonical"/g) || []).length, 1, page.file);
    assert.equal((html.match(/name="description"/g) || []).length, 1, page.file);
    assert.equal((html.match(/property="og:type"/g) || []).length, 1, page.file);
    assert.ok(html.includes("<title>" + page.title + "</title>"), page.file);
    assert.ok(html.includes('href="https://ga-pick.com' + page.path + '"'), page.file);
    assert.ok(html.includes('content="' + (page.index ? "index, follow, max-image-preview:large" : "noindex, nofollow, nosnippet") + '"'), page.file);
    const schema = html.match(/<script type="application\/ld\+json" id="pickSearchStructuredData">([\s\S]*?)<\/script>/);
    if (page.index) {
      assert.ok(schema, page.file);
      const graph = JSON.parse(schema[1])["@graph"];
      assert.ok(graph.some((node) => node.url === "https://ga-pick.com" + page.path));
      assert.ok(!graph.some((node) => node.aggregateRating || node.review), page.file);
    } else {
      assert.equal(schema, null, page.file);
    }
  }
});

test("FAQ structured data matches the visible customer answers", () => {
  const html = read("public/index.html");
  const schema = JSON.parse(html.match(/<script type="application\/ld\+json" id="pickSearchStructuredData">([\s\S]*?)<\/script>/)[1]);
  const faq = schema["@graph"].find((node) => node["@type"] === "FAQPage");
  const section = html.slice(html.indexOf('class="pq-section pq-faq"'), html.indexOf('class="pq-partner"'));
  for (const question of faq.mainEntity) {
    assert.ok(section.includes("<summary>" + question.name + "</summary>"));
    assert.ok(section.includes("<p>" + question.acceptedAnswer.text + "</p>"));
  }
});

test("sitemap and AI-readable public index contain only the public entry pages", () => {
  const sitemap = read("public/sitemap.xml");
  const locations = [...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map((match) => match[1]);
  assert.deepEqual(locations, SEARCH_PAGES.filter((page) => page.index).map((page) => "https://ga-pick.com" + page.path));
  assert.doesNotMatch(sitemap, /\/my-quote|\/quote<|\/seller|\/admin|\/api/);
  assert.match(read("public/robots.txt"), /Disallow: \/api\//);
  assert.match(read("public/robots.txt"), /Allow: \/api\/brand-packages/);
  assert.match(read("public/robots.txt"), /Allow: \/api\/subscription-products/);
  assert.doesNotMatch(read("public/robots.txt"), /Disallow: \/my-quote/);
  for (const location of locations) assert.ok(read("public/llms.txt").includes(location));
});

const assets = {
  async fetch(request) {
    const path = new URL(request.url).pathname;
    try {
      const source = read("public" + path);
      return new Response(source, { headers: { "Content-Type": path.endsWith(".html") ? "text/html" : "text/plain" } });
    } catch { return new Response("Not found", { status: 404 }); }
  },
};

test("worker routes private pages, aliases, crawler files and preview hosts correctly", async () => {
  for (const path of ["/quote", "/my-quote", "/privacy"]) {
    const response = await worker.fetch(new Request("https://ga-pick.com" + path), { ASSETS: assets }, {});
    assert.equal(response.status, 200);
    assert.match(response.headers.get("X-Robots-Tag"), /noindex/);
    assert.match(response.headers.get("Link"), new RegExp(path));
  }
  const home = await worker.fetch(new Request("https://ga-pick.com/"), { ASSETS: assets }, {});
  assert.equal(home.headers.get("X-Robots-Tag"), null);
  assert.match(home.headers.get("Content-Security-Policy"), /frame-ancestors 'none'/);
  const alias = await worker.fetch(new Request("https://ga-pick.com/products?brand=LG"), { ASSETS: assets }, {});
  assert.equal(alias.status, 308);
  assert.equal(alias.headers.get("Location"), "https://ga-pick.com/shopping?brand=LG");
  const blocked = await worker.fetch(new Request("https://ga-pick.com/admin/anonymous-consultation.html"), { ASSETS: assets }, {});
  assert.equal(blocked.status, 404);
  const robots = await worker.fetch(new Request("https://ga-pick.com/robots.txt"), { ASSETS: assets }, {});
  assert.equal(await robots.text(), read("public/robots.txt"));
  const preview = await worker.fetch(new Request("https://preview.workers.dev/"), { ASSETS: assets }, {});
  assert.match(preview.headers.get("X-Robots-Tag"), /noindex/);
});

function fixture(options = {}) {
  const db = new DatabaseSync(":memory:");
  db.exec(read("schema.sql"));
  db.exec(`CREATE TABLE IF NOT EXISTS seller_sessions (token_hash TEXT PRIMARY KEY, seller_id TEXT, created_at TEXT, expires_at TEXT);
    CREATE TABLE IF NOT EXISTS quote_phone_verifications (
      id TEXT PRIMARY KEY, phone_hash TEXT, phone_masked TEXT, code_hash TEXT, token_hash TEXT,
      request_ip_hash TEXT, status TEXT, attempts INTEGER, expires_at TEXT, token_expires_at TEXT,
      requested_at TEXT, verified_at TEXT, consumed_at TEXT DEFAULT ''
    )`);
  const now = new Date().toISOString();
  db.prepare(`INSERT INTO approved_sellers
    (id, seller_id, password, channel, branch, branch_region, manager, phone, approved_at)
    VALUES ('seller-row', 'unit-seller', 'original-password', 'unit-channel', 'unit-branch', 'unit-region', 'unit-manager', '01012340000', ?)`).run(now);
  for (const [token, seller] of [["old-session-1", "unit-seller"], ["old-session-2", "unit-seller"], ["other-session", "other-seller"]]) {
    db.prepare("INSERT INTO seller_sessions VALUES (?, ?, ?, ?)").run(token, seller, now, "2099-01-01T00:00:00.000Z");
  }
  const secret = "unit-test-only-secret";
  const hash = (purpose, value) => createHash("sha256").update(secret + "|" + purpose + "|" + value).digest("hex");
  db.prepare("INSERT INTO quote_phone_verifications VALUES (?, ?, '', '', ?, '', ?, 0, ?, ?, ?, ?, '')")
    .run("proof", hash("phone", options.wrongPhone ? "01099990000" : "01012340000"), hash("token", "unit-proof-token"),
      "verified", now, options.expired ? "2000-01-01T00:00:00.000Z" : options.invalidDate ? "invalid" : "2099-01-01T00:00:00.000Z", now, now);
  let queue = Promise.resolve();
  let failNextCriticalBatch = Boolean(options.failBatch);
  const binding = {
    prepare(sql) {
      let params = [];
      return {
        sql,
        bind(...values) { params = values; return this; },
        async first() { return db.prepare(sql).get(...params) || null; },
        async all() { return { results: db.prepare(sql).all(...params) }; },
        async run() { return { meta: { changes: db.prepare(sql).run(...params).changes } }; },
      };
    },
    batch(statements) {
      const operation = queue.then(async () => {
        db.exec("BEGIN");
        try {
          const results = [];
          for (const statement of statements) {
            if (failNextCriticalBatch && statement.sql.startsWith("DELETE FROM seller_sessions")) {
              failNextCriticalBatch = false;
              throw new Error("unit transaction failure");
            }
            results.push(await statement.run());
          }
          db.exec("COMMIT");
          return results;
        } catch (error) { db.exec("ROLLBACK"); throw error; }
      });
      queue = operation.catch(() => {});
      return operation;
    },
  };
  const env = { DB: binding, PHONE_VERIFICATION_SECRET: secret };
  const reset = async (override = {}) => {
    const response = await onRequest({
      env, params: { path: ["seller-password-reset"] },
      request: new Request("https://unit.invalid/api/seller-password-reset", { method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channel: "unit-channel", branch: "unit-branch", manager: "unit-manager",
          phone: "01012340000", sellerId: "unit-seller", newPassword: "replacement-password",
          phoneVerificationId: "proof", phoneVerificationToken: "unit-proof-token", ...override }),
      }),
    });
    return { status: response.status, body: await response.json() };
  };
  return { db, reset };
}

for (const scenario of [
  { name: "missing proof", override: { phoneVerificationToken: "" } },
  { name: "wrong token", override: { phoneVerificationToken: "incorrect" } },
  { name: "wrong phone", options: { wrongPhone: true } },
  { name: "expired proof", options: { expired: true } },
  { name: "invalid expiry", options: { invalidDate: true } },
]) {
  test("seller password reset rejects " + scenario.name + " without changing credentials or sessions", async () => {
    const { db, reset } = fixture(scenario.options);
    try {
      const result = await reset(scenario.override);
      assert.ok(result.status >= 400);
      assert.equal(db.prepare("SELECT password FROM approved_sellers").get().password, "original-password");
      assert.equal(db.prepare("SELECT COUNT(*) AS count FROM seller_sessions").get().count, 3);
    } finally { db.close(); }
  });
}

test("valid seller recovery consumes proof once and revokes only that seller's sessions", async () => {
  const { db, reset } = fixture();
  try {
    assert.equal((await reset()).status, 200);
    const password = db.prepare("SELECT password FROM approved_sellers").get().password;
    assert.match(password, /^pbkdf2\$/);
    assert.equal(db.prepare("SELECT status FROM quote_phone_verifications").get().status, "consumed");
    assert.deepEqual(db.prepare("SELECT seller_id FROM seller_sessions").all().map((row) => row.seller_id), ["other-seller"]);
    assert.equal((await reset({ newPassword: "replayed-password" })).status, 403);
    assert.equal(db.prepare("SELECT password FROM approved_sellers").get().password, password);
  } finally { db.close(); }
});

test("concurrent recovery requests cannot reuse one proof", async () => {
  const { db, reset } = fixture();
  try {
    const results = await Promise.all([reset(), reset({ newPassword: "second-password" })]);
    assert.equal(results.filter((result) => result.status === 200).length, 1);
  } finally { db.close(); }
});

test("recovery transaction failure rolls back password, proof and session changes", async () => {
  const { db, reset } = fixture({ failBatch: true });
  try {
    assert.equal((await reset()).status, 500);
    assert.equal(db.prepare("SELECT password FROM approved_sellers").get().password, "original-password");
    assert.equal(db.prepare("SELECT status FROM quote_phone_verifications").get().status, "verified");
    assert.equal(db.prepare("SELECT COUNT(*) AS count FROM seller_sessions").get().count, 3);
  } finally { db.close(); }
});
