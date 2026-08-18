import fs from "node:fs/promises";

const [inputPath, outputPath] = process.argv.slice(2);
if (!inputPath || !outputPath) throw new Error("Usage: node build_subscription_seed.mjs <catalog.json> <seed.sql>");

const payload = JSON.parse(await fs.readFile(inputPath, "utf8"));
const setId = `subscription-set-${String(payload.sourceDate || "current").replaceAll("-", "")}`;
const now = new Date().toISOString();
const quote = (value) => `'${String(value ?? "").replaceAll("'", "''")}'`;
const statements = [
  `CREATE TABLE IF NOT EXISTS subscription_product_sets (id TEXT PRIMARY KEY, status TEXT NOT NULL DEFAULT 'staging', source_name TEXT NOT NULL DEFAULT '', source_date TEXT NOT NULL DEFAULT '', product_count INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL, activated_at TEXT DEFAULT '');`,
  `CREATE TABLE IF NOT EXISTS subscription_products (id TEXT PRIMARY KEY, set_id TEXT NOT NULL, brand TEXT NOT NULL, category TEXT NOT NULL, source_category TEXT NOT NULL DEFAULT '', model TEXT NOT NULL, name TEXT NOT NULL, monthly_fee_72 INTEGER NOT NULL, care_type TEXT DEFAULT '', care_detail TEXT DEFAULT '', visit_cycle TEXT DEFAULT '', image_url TEXT DEFAULT '', options_json TEXT NOT NULL DEFAULT '[]', sort_order INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL);`,
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_subscription_products_set_model ON subscription_products(set_id, model);`,
  `CREATE INDEX IF NOT EXISTS idx_subscription_products_set_category ON subscription_products(set_id, category, sort_order);`,
  `CREATE INDEX IF NOT EXISTS idx_subscription_product_sets_status ON subscription_product_sets(status, activated_at DESC);`,
  `DELETE FROM subscription_products WHERE set_id = ${quote(setId)};`,
  `DELETE FROM subscription_product_sets WHERE id = ${quote(setId)};`,
  `INSERT INTO subscription_product_sets (id, status, source_name, source_date, product_count, created_at, activated_at) VALUES (${quote(setId)}, 'staging', '구독 상품 데이터', ${quote(payload.sourceDate)}, ${Number(payload.items.length)}, ${quote(now)}, '');`,
];

payload.items.forEach((item, index) => {
  statements.push(
    `INSERT INTO subscription_products (id, set_id, brand, category, source_category, model, name, monthly_fee_72, care_type, care_detail, visit_cycle, image_url, options_json, sort_order, created_at) VALUES (` +
    `${quote(`${setId}-${String(index + 1).padStart(4, "0")}`)}, ${quote(setId)}, ${quote(item.brand)}, ${quote(item.category)}, ${quote(item.sourceCategory)}, ${quote(item.model)}, ${quote(item.name)}, ${Number(item.monthlyFee72)}, ${quote(item.careType)}, ${quote(item.careDetail)}, ${quote(item.visitCycle)}, ${quote(item.imageUrl)}, ${quote(JSON.stringify(item.options || []))}, ${index}, ${quote(now)});`
  );
});

statements.push(
  `UPDATE subscription_product_sets SET status = 'archived' WHERE status = 'active';`,
  `UPDATE subscription_product_sets SET status = 'active', activated_at = ${quote(now)} WHERE id = ${quote(setId)};`,
  `DELETE FROM subscription_products WHERE set_id IN (SELECT id FROM subscription_product_sets WHERE status = 'archived');`,
  `DELETE FROM subscription_product_sets WHERE status = 'archived';`
);

await fs.writeFile(outputPath, `${statements.join("\n")}\n`, "utf8");
console.log(`Built ${outputPath} with ${payload.items.length} products.`);
