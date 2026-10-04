import { test } from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { getOfficialCatalog, modelCode, parseLgProducts, parseSamsungProducts, verifyOfficialModels } from "../functions/official-models.js";
import { onRequest } from "../functions/api/[[path]].js";

function d1(db) {
  return {
    prepare(sql) {
      let params = [];
      return {
        bind(...values) { params = values; return this; },
        async first() { return db.prepare(sql).get(...params) || null; },
        async run() { return db.prepare(sql).run(...params); },
      };
    },
  };
}

function lgCard(code, badge = "") {
  const data = JSON.stringify({ model_sku: code, model_name: "LG 공식 제품", price: "1,200,000" })
    .replaceAll('"', "&quot;");
  return `<div data-ec-product="${data}"><span>${badge}</span><a href="/vacuum-cleaners/${modelCode(code).toLowerCase()}"><img src="/image.jpg"></a></div>`;
}

test("official parsers keep exact models and exclude dotcom-only and bundles", () => {
  const lg = parseLgProducts(lgCard("A730WC.AKRG") + lgCard("N95THO.CKOR", "닷컴 ONLY"), "청소기");
  assert.deepEqual(lg.map((model) => model.modelName), ["A730WC.AKRG"]);
  assert.equal(lg[0].normalPrice, 1200000);
  assert.equal(modelCode("A730WC.AKRG"), "A730WC");

  const samsung = parseSamsungProducts(`<script type="application/ld+json">${JSON.stringify({
    "@type": "ItemList", itemListElement: [
      { item: { "@type": "Product", url: "https://www.samsung.com/sec/tvs/neo-qled/KQ65QNH80AFXKR/", name: "Neo QLED", offers: { price: 1990000 } } },
      { item: { "@type": "Product", url: "https://www.samsung.com/sec/tvs/package-ku85mh75/KU85MH75-6/", name: "패키지", offers: { price: 3399000 } } },
    ],
  })}</script>`, "TV");
  assert.deepEqual(samsung.map((model) => model.modelName), ["KQ65QNH80AFXKR"]);
});

test("official LG verification requires the exact SKU while Naver uses the base code", async () => {
  const db = new DatabaseSync(":memory:");
  let requests = 0;
  const fetcher = async (url) => {
    requests += 1;
    assert.match(url, /^https:\/\/www\.lge\.co\.kr\/search\?/);
    return new Response(lgCard("A730WC.AKRG"), { status: 200 });
  };
  const env = { DB: d1(db) };
  const catalog = await getOfficialCatalog(env, "LG전자", "청소기", fetcher);
  assert.equal(catalog.models.length, 1);
  const rejected = await verifyOfficialModels(env, "LG전자", "청소기", ["A730WC.DIFFERENT"], fetcher);
  assert.deepEqual(rejected, []);
  const verified = await verifyOfficialModels(env, "LG전자", "청소기", ["A730WC.AKRG"], fetcher);
  assert.deepEqual(verified.map((model) => model.modelName), ["A730WC.AKRG"]);
  assert.equal(requests, 3);
  db.close();
});

test("Naver lowest-price request excludes the model suffix", async () => {
  const originalFetch = globalThis.fetch;
  let queried = "";
  globalThis.fetch = async (url) => {
    queried = new URL(url).searchParams.get("query");
    return new Response(JSON.stringify({ items: [] }), { status: 200, headers: { "Content-Type": "application/json" } });
  };
  try {
    const response = await onRequest({
      env: { DB: {}, NAVER_SHOPPING_CLIENT_ID: "test-id", NAVER_SHOPPING_CLIENT_SECRET: "test-secret" },
      request: new Request("https://example.com/api/naver-shopping-lowest?query=A730WC.AKRG"),
      params: { path: ["naver-shopping-lowest"] },
    });
    assert.equal(response.status, 200);
    assert.equal(queried, "A730WC");
  } finally {
    globalThis.fetch = originalFetch;
  }
});
