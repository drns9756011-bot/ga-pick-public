const SAMSUNG_CATEGORIES = {
  TV: "/sec/tvs/all-tvs/",
  "라이프스타일 TV": "/sec/moving_style/all-moving_style/",
  "냉장고": "/sec/refrigerators/all-refrigerators/",
  "김치냉장고": "/sec/kimchi-refrigerators/all-kimchi-refrigerators/",
  "세탁기/건조기": "/sec/washers-and-dryers/all-washers-and-dryers/",
  "의류관리기": "/sec/airdresser/all-airdresser/",
  "에어컨": "/sec/air-conditioners/all-air-conditioners/",
  "청소기": "/sec/vacuum-cleaners/all-vacuum-cleaners/",
  "식기세척기": "/sec/dishwashers/all-dishwashers/",
  "공기청정기": "/sec/air-cleaner/all-air-cleaner/",
  "인덕션/전기레인지": "/sec/electric-range/all-electric-range/",
  "오븐 / 전자레인지": ["/sec/micro-wave-ovens/all-micro-wave-ovens/", "/sec/qooker-multi-ovens/all-qooker-multi-ovens/"],
  "정수기": "/sec/water-purifier/all-water-purifier/",
};

const LG_SEARCH_TERMS = {
  TV: ["OLED", "QNED", "Micro RGB"],
  "라이프스타일 TV": ["스탠바이미"],
  "냉장고": ["냉장고"],
  "김치냉장고": ["김치냉장고"],
  "세탁기/건조기": ["워시타워", "세탁기", "건조기"],
  "의류관리기": ["스타일러"],
  "에어컨": ["에어컨"],
  "청소기": ["청소기", "로봇청소기"],
  "식기세척기": ["식기세척기"],
  "공기청정기": ["공기청정기"],
  "인덕션/전기레인지": ["인덕션"],
  "오븐 / 전자레인지": ["전자레인지", "오븐"],
  "정수기": ["정수기"],
};

const LG_PRODUCT_PATHS = {
  TV: ["tvs"],
  "라이프스타일 TV": ["stan-by-me"],
  "냉장고": ["refrigerators", "convertible-refrigerators"],
  "김치냉장고": ["kimchi-refrigerators", "convertible-refrigerators"],
  "세탁기/건조기": ["wash-tower", "washing-machines", "dryers", "washer-dryers"],
  "의류관리기": ["lg-styler"],
  "에어컨": ["air-conditioners"],
  "청소기": ["vacuum-cleaners"],
  "식기세척기": ["dishwashers"],
  "공기청정기": ["air-purifier"],
  "인덕션/전기레인지": ["electric-ranges"],
  "오븐 / 전자레인지": ["microwaves-and-ovens"],
  "정수기": ["water-purifiers"],
};

const CACHE_MS = 6 * 60 * 60 * 1000;
const EXCLUSIVE = /닷컴\s*(?:ONLY|전용)|온라인\s*전용/i;

export function modelCode(value) {
  return String(value || "").trim().toUpperCase().split(".")[0].replace(/[^A-Z0-9-]/g, "");
}

function modelSku(value) {
  return String(value || "").trim().toUpperCase().replace(/[^A-Z0-9.-]/g, "");
}

function allowedModel(model, brand) {
  if (!model?.modelName || !model?.officialUrl || EXCLUSIVE.test(`${model.title || ""} ${model.badges || ""}`)) return false;
  try {
    const url = new URL(model.officialUrl);
    return url.protocol === "https:" && url.hostname === (brand === "LG전자" ? "www.lge.co.kr" : "www.samsung.com");
  } catch {
    return false;
  }
}

export function parseSamsungProducts(html, product) {
  const found = new Map();
  const scripts = String(html).matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);
  for (const [, raw] of scripts) {
    let data;
    try { data = JSON.parse(raw); } catch { continue; }
    const lists = Array.isArray(data) ? data : [data];
    for (const list of lists) {
      for (const entry of list?.itemListElement || []) {
        const item = entry?.item;
        if (!item || item["@type"] !== "Product") continue;
        const officialUrl = item.url || item["@id"] || "";
        const path = (() => { try { return new URL(officialUrl).pathname; } catch { return ""; } })();
        if (/\/package-|\/accessor|\/parts\//i.test(path)) continue;
        const modelName = decodeURIComponent(path.split("/").filter(Boolean).at(-1) || "").toUpperCase();
        if (!/^[A-Z0-9-]{5,40}$/.test(modelName)) continue;
        const price = Number(item.offers?.price || 0);
        const model = {
          modelName,
          brand: "삼성전자",
          productGroup: product,
          category: product,
          title: String(item.name || ""),
          normalPrice: price > 0 ? price : 0,
          officialUrl,
          source: "samsung.com",
        };
        if (allowedModel(model, "삼성전자")) found.set(modelSku(modelName), model);
      }
    }
  }
  return [...found.values()];
}

function decodeAttribute(value) {
  return String(value).replace(/&quot;/g, '"').replace(/&amp;/g, "&").replace(/&#39;|&#x27;/g, "'");
}

export function parseLgProducts(html, product) {
  const source = String(html);
  const matches = [...source.matchAll(/data-ec-product="([^"]+)"/g)];
  const found = new Map();
  for (let index = 0; index < matches.length; index += 1) {
    const match = matches[index];
    let data;
    try { data = JSON.parse(decodeAttribute(match[1])); } catch { continue; }
    const modelName = String(data.model_sku || "").trim().toUpperCase();
    if (!modelCode(modelName)) continue;
    const after = source.slice(match.index + match[0].length, Math.min(matches[index + 1]?.index || source.length, match.index + 14000));
    const link = after.match(/<a\b[^>]*href="(\/[^"?#]+)(?:[?#][^"]*)?"[^>]*>\s*<img\b/i);
    if (!link) continue;
    const price = Number(String(data.price || data.discounted_price || "").replace(/,/g, ""));
    const model = {
      modelName,
      brand: "LG전자",
      productGroup: product,
      category: product,
      title: String(data.model_name || ""),
      normalPrice: Number.isFinite(price) && price > 0 ? price : 0,
      officialUrl: new URL(link[1], "https://www.lge.co.kr").href,
      badges: after.slice(0, 3000).match(EXCLUSIVE)?.[0] || "",
      source: "lge.co.kr",
    };
    const section = new URL(model.officialUrl).pathname.split("/")[1];
    if (allowedModel(model, "LG전자") && LG_PRODUCT_PATHS[product]?.includes(section)) found.set(modelSku(modelName), model);
  }
  return [...found.values()];
}

async function fetchOfficialHtml(url, fetcher = fetch) {
  const response = await fetcher(url, { signal: AbortSignal.timeout(10000), headers: { Accept: "text/html" } });
  if (!response.ok || new URL(response.url || url).origin !== new URL(url).origin) throw new Error("공식몰 조회 실패");
  const html = await response.text();
  if (html.length > 2_000_000) throw new Error("공식몰 응답 크기 초과");
  return html;
}

async function ensureCache(env) {
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS official_model_cache (
    cache_key TEXT PRIMARY KEY, payload_json TEXT NOT NULL, checked_at INTEGER NOT NULL
  )`).run();
}

async function cached(env, key, loader) {
  await ensureCache(env);
  const previous = await env.DB.prepare("SELECT payload_json, checked_at FROM official_model_cache WHERE cache_key = ?").bind(key).first();
  if (previous && Date.now() - Number(previous.checked_at) < CACHE_MS) {
    try { return { models: JSON.parse(previous.payload_json), checkedAt: Number(previous.checked_at) }; } catch { /* refresh */ }
  }
  const models = await loader();
  const checkedAt = Date.now();
  await env.DB.prepare(`INSERT INTO official_model_cache (cache_key, payload_json, checked_at)
    VALUES (?, ?, ?) ON CONFLICT(cache_key) DO UPDATE SET payload_json = excluded.payload_json, checked_at = excluded.checked_at`)
    .bind(key, JSON.stringify(models), checkedAt).run();
  return { models, checkedAt };
}

export async function getOfficialCatalog(env, brand, product, fetcher = fetch) {
  const isLg = brand === "LG전자";
  const path = isLg ? LG_SEARCH_TERMS[product] : SAMSUNG_CATEGORIES[product];
  if (!path || !["LG전자", "삼성전자"].includes(brand)) return { models: [], checkedAt: 0 };
  return cached(env, `catalog:${brand}:${product}`, async () => {
    if (isLg) {
      const pages = await Promise.allSettled(path.map((term) => fetchOfficialHtml(
        `https://www.lge.co.kr/search?keyword=${encodeURIComponent(term)}&tab=product`, fetcher
      )));
      const successful = pages.filter((page) => page.status === "fulfilled").map((page) => page.value);
      if (!successful.length) throw new Error("LG 공식 검색에 실패했습니다.");
      return [...new Map(successful.flatMap((html) => parseLgProducts(html, product))
        .map((model) => [modelSku(model.modelName), model])).values()];
    }
    const paths = Array.isArray(path) ? path : [path];
    const pages = await Promise.allSettled(paths.map((entry) => fetchOfficialHtml(new URL(entry, "https://www.samsung.com").href, fetcher)));
    const successful = pages.filter((page) => page.status === "fulfilled").map((page) => page.value);
    if (!successful.length) throw new Error("삼성 공식 분류 조회에 실패했습니다.");
    return [...new Map(successful.flatMap((html) => parseSamsungProducts(html, product))
      .map((model) => [modelSku(model.modelName), model])).values()];
  });
}

export async function verifyOfficialModels(env, brand, product, requested, fetcher = fetch) {
  const skus = [...new Set(requested.map(modelSku).filter((sku) => /^[A-Z0-9-]{5,40}(?:\.[A-Z0-9-]{2,20})?$/.test(sku)))].slice(0, 8);
  if (!skus.length || !["LG전자", "삼성전자"].includes(brand)) return [];
  const { models: listed } = brand === "LG전자"
    ? await getOfficialCatalog(env, brand, product, fetcher).catch(() => ({ models: [] }))
    : await getOfficialCatalog(env, brand, product, fetcher);
  const bySku = new Map(listed.map((model) => [modelSku(model.modelName), model]));
  if (brand === "삼성전자") return skus.map((sku) => bySku.get(sku)).filter(Boolean);
  const missing = skus.filter((sku) => !bySku.has(sku));
  await Promise.allSettled(missing.map(async (sku) => {
    const result = await cached(env, `model:LG전자:${product}:${sku}`, async () => {
      const code = modelCode(sku);
      const url = `https://www.lge.co.kr/search?keyword=${encodeURIComponent(code)}&tab=product`;
      const html = await fetchOfficialHtml(url, fetcher);
      return parseLgProducts(html, product).filter((model) => modelSku(model.modelName) === sku);
    });
    if (result.models[0]) bySku.set(sku, result.models[0]);
  }));
  return skus.map((sku) => bySku.get(sku)).filter(Boolean);
}
