import { test } from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { catalogEvidence, getOfficialCatalog, modelCode, parseLgProducts, parseSamsungProducts, parseOfficialLgDetail, verifyOfficialModels, readBoundedJson, validateRecommendationRequest, recommendOfficialModels, validateAiChoices } from "../functions/official-models.js";
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
  const data = JSON.stringify({ model_sku: code, model_name: "LG 코드제로 무선 청소기", price: "1,200,000" })
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

test("both brands require exact catalog membership, not just an official product URL", () => {
  assert.ok(catalogEvidence("LG전자", "A730WC.AKRG")?.pages.length);
  assert.ok(catalogEvidence("삼성전자", "KQ65QNH80AFXKR")?.pages.length);
  assert.equal(catalogEvidence("LG전자", "A730WC2.AKRG"), null);
  assert.equal(catalogEvidence("삼성전자", "KQ65QNH80AFXKR2"), null);
  assert.equal(catalogEvidence("toString", "A730WC"), null);
});

test("LG catalog model and retail SKU are linked only by an explicit official Product record", () => {
  const listing = { modelName: "OLED65C6SW.AKRG", title: "LG 올레드 벽걸이형", officialUrl: "https://www.lge.co.kr/tvs/oled65c6sna-wall" };
  const detail = (sku, model) => `<script type="application/ld+json">${JSON.stringify({ "@type": "Product", sku, model, description: "65인치 벽걸이형", additionalProperty: [{ name: "해상도", value: "4K UHD" }] })}</script>`;
  const verified = parseOfficialLgDetail(detail(listing.modelName, "OLED65C6SNA"), listing);
  assert.equal(verified.modelName, "OLED65C6SNA");
  assert.equal(verified.storeSku, listing.modelName);
  assert.match(verified.title, /65인치/);
  assert.equal(parseOfficialLgDetail(detail("DIFFERENT-SKU", "OLED65C6SNA"), listing), null);
  assert.equal(parseOfficialLgDetail(detail(listing.modelName, "NOTINCATALOG"), listing), null);
});

test("cached official models are rechecked against the catalog and exclusive badges", async () => {
  const db = new DatabaseSync(":memory:");
  const env = { DB: d1(db) };
  const result = await getOfficialCatalog(env, "LG전자", "청소기", async () => new Response(
    lgCard("A730WC.AKRG") + lgCard("NOTINCATALOG") + lgCard("N95THO.CKOR", "ONLINE ONLY")
  ));
  assert.deepEqual(result.models.map((model) => model.modelName), ["A730WC.AKRG"]);
  assert.ok(result.models[0].catalog.pages.length);
  const cached = await getOfficialCatalog(env, "LG전자", "청소기", () => { throw new Error("must use cache"); });
  assert.deepEqual(cached.models, result.models);
  db.close();
});

const aiRequest = () => ({
  brand: "LG전자", context: { situation: "신축 입주", family: ["2인"], priorities: ["가격"] },
  groups: [{ product: "청소기", models: ["A730WC.AKRG"], options: "무선 청소기", targetPrice: 1200000 }],
});

test("AI batch request validates bounds and model format", () => {
  assert.equal(validateRecommendationRequest(aiRequest()), true);
  assert.equal(validateRecommendationRequest({ ...aiRequest(), brand: "other" }), false);
  assert.equal(validateRecommendationRequest({ ...aiRequest(), groups: Array(17).fill(aiRequest().groups[0]) }), false);
  assert.equal(validateRecommendationRequest({ ...aiRequest(), groups: [{ ...aiRequest().groups[0], product: "constructor" }] }), false);
  assert.equal(validateRecommendationRequest({ ...aiRequest(), groups: [{ ...aiRequest().groups[0], models: ["https://evil.test"] }] }), false);
});

test("Workers AI is actually called and only authoritative catalog candidates are returned", async () => {
  const db = new DatabaseSync(":memory:");
  let calls = 0;
  const body = aiRequest();
  body.context.phone = "010-0000-0000";
  body.context.note = "Do not send customer notes";
  const env = { DB: d1(db), AI: { async run(model, input) {
    calls += 1;
    assert.equal(model, "@cf/meta/llama-3.3-70b-instruct-fp8-fast");
    assert.equal(input.response_format.type, "json_schema");
    assert.doesNotMatch(JSON.stringify(input), /010-0000-0000|Do not send customer notes/);
    const prompt = JSON.parse(input.messages[1].content);
    assert.equal(prompt.groups[0].candidates[0].modelName, "A730WC.AKRG");
    assert.ok(prompt.groups[0].candidates[0].catalog.pages.length);
    return { response: { choices: [{ group: 0, candidate: "g0m0", reason: "공식 자료의 무선 청소기 후보입니다." }] } };
  } } };
  const result = await recommendOfficialModels(env, body, async () => new Response(lgCard("A730WC.AKRG")));
  assert.equal(calls, 1);
  assert.equal(result.engine, "workers-ai");
  assert.equal(result.groups[0].models[0].modelName, "A730WC.AKRG");
  assert.equal(result.groups[0].models[0].normalPrice, 1200000);
  db.close();
});

test("Samsung recommendations use the same AI and catalog gate", async () => {
  const db = new DatabaseSync(":memory:");
  const html = `<script type="application/ld+json">${JSON.stringify({ itemListElement: [
    { item: { "@type": "Product", url: "https://www.samsung.com/sec/tvs/neo-qled/KQ65QNH80AFXKR/", name: "Neo QLED 163cm", offers: { price: 1990000 } } },
    { item: { "@type": "Product", url: "https://www.samsung.com/sec/tvs/KQ65QNH80AFXKR2/", name: "목록 밖 모델" } },
  ] })}</script>`;
  const result = await recommendOfficialModels({ DB: d1(db), AI: { async run(_, input) {
    assert.equal(JSON.parse(input.messages[1].content).groups[0].candidates.length, 1);
    return { response: JSON.stringify({ choices: [{ group: 0, candidate: "g0m0", reason: "공식 카탈로그에 있는 Neo QLED입니다." }] }) };
  } } }, { brand: "삼성전자", groups: [{ product: "TV", models: ["KQ65QNH80AFXKR", "KQ65QNH80AFXKR2"], options: "Neo QLED", targetPrice: 2000000 }] }, async () => new Response(html));
  assert.equal(result.groups[0].models[0].modelName, "KQ65QNH80AFXKR");
  db.close();
});

test("AI cannot invent a model or select a candidate from a different group", () => {
  const groups = [{ candidates: [{ id: "g0m0", model: { modelName: "verified" } }] }, { candidates: [] }];
  const choice = { group: 0, candidate: "g0m0", reason: "추천" };
  assert.throws(() => validateAiChoices({ choices: [{ ...choice, candidate: "invented" }, { group: 1, candidate: "", reason: "확인 필요" }] }, groups));
  assert.throws(() => validateAiChoices({ choices: [choice, { ...choice, group: 1 }] }, groups));
  assert.throws(() => validateAiChoices({ choices: [choice, choice] }, groups));
  const empty = validateAiChoices({ choices: [choice, { group: 1, candidate: "", reason: "옵션 확인이 필요합니다." }] }, groups);
  assert.deepEqual(empty[1].models, []);
});

test("server rejects AI choices with a wrong TV size or cleaner type", () => {
  const choose = (model, product, options) => validateAiChoices({ choices: [{ group: 0, candidate: "g0m0", reason: "추천" }] }, [
    { product, options, candidates: [{ id: "g0m0", model }] },
  ])[0];
  assert.deepEqual(choose({ modelName: "OLED65C6SNA", title: "LG 올레드 벽걸이형" }, "TV", "OLED · 77인치").models, []);
  assert.deepEqual(choose({ modelName: "OLED65C6SNA", title: "LG 올레드 벽걸이형" }, "TV", "OLED · 65인치 · 스탠드").models, []);
  assert.equal(choose({ modelName: "OLED65C6SNA", title: "LG 올레드 벽걸이형" }, "TV", "OLED · 65인치 · 벽걸이").models.length, 1);
  assert.deepEqual(choose({ modelName: "TEST123", title: "Bespoke 제트 봇 로봇 청소기" }, "청소기", "무선 청소기").models, []);
  assert.deepEqual(choose({ modelName: "TEST123", title: "Bespoke AI 제트 무선 청소기" }, "청소기", "로봇 청소기").models, []);
});

test("no catalog candidates means no inference and no false AI success label", async () => {
  const db = new DatabaseSync(":memory:");
  const env = { DB: d1(db), AI: { run() { throw new Error("must not infer"); } } };
  const result = await recommendOfficialModels(env, { ...aiRequest(), groups: [{ ...aiRequest().groups[0], models: ["NOTINCATALOG"] }] }, async () => new Response(lgCard("NOTINCATALOG")));
  assert.equal(result.engine, "catalog-unavailable");
  assert.deepEqual(result.groups[0].models, []);
  db.close();
});

test("Ollama uses authenticated server-side structured output without exposing its key", async () => {
  const db = new DatabaseSync(":memory:");
  const env = { DB: d1(db), OLLAMA_BASE_URL: "https://llm.example.test", OLLAMA_MODEL: "test-model", OLLAMA_API_KEY: "test-only" };
  const fetcher = async (url, init) => {
    if (url.startsWith("https://www.lge.co.kr")) return new Response(lgCard("A730WC.AKRG"));
    assert.equal(url, "https://llm.example.test/api/chat");
    assert.equal(init.headers.Authorization, "Bearer test-only");
    const payload = JSON.parse(init.body);
    assert.equal(payload.stream, false);
    assert.equal(payload.format.type, "object");
    return Response.json({ message: { content: JSON.stringify({ choices: [{ group: 0, candidate: "g0m0", reason: "공식 모델 후보" }] }) } });
  };
  const result = await recommendOfficialModels(env, aiRequest(), fetcher);
  assert.equal(result.engine, "ollama");
  assert.doesNotMatch(JSON.stringify(result), /test-only/);
  await assert.rejects(() => recommendOfficialModels({ ...env, OLLAMA_BASE_URL: "http://localhost:11434" }, aiRequest(), fetcher));
  db.close();
});

test("oversized streamed requests and responses are rejected", async () => {
  await assert.rejects(() => readBoundedJson(new Request("https://example.test", { method: "POST", body: JSON.stringify({ data: "x".repeat(17000) }) }), 16384));
  await assert.rejects(() => readBoundedJson(Response.json({ message: "x".repeat(66000) }), 65536));
});

test("recommendation API fails closed without a limiter and rejects cross-origin or throttled calls", async () => {
  const request = (headers = {}) => new Request("https://example.test/api/ai-model-recommendations", { method: "POST", headers: { "Content-Type": "application/json", ...headers }, body: JSON.stringify(aiRequest()) });
  const call = (env, req) => onRequest({ env: { DB: {}, ...env }, request: req, params: { path: ["ai-model-recommendations"] } });
  assert.equal((await call({}, request())).status, 503);
  assert.equal((await call({}, request({ Origin: "https://evil.test" }))).status, 403);
  const throttled = await call({ AI_RECOMMENDATION_LIMITER: { limit: async () => ({ success: false }) } }, request());
  assert.equal(throttled.status, 429);
  assert.equal(throttled.headers.get("Retry-After"), "60");
});
