import fs from "node:fs/promises";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const inputPath = path.join(root, "private-data", "subscription-products-20260817-options.json");
const outputPath = path.join(root, "functions", "data", "subscription-products-initial.js");
const payload = JSON.parse(await fs.readFile(inputPath, "utf8"));
const privateSeed = {
  sourceDate: String(payload.sourceDate || ""),
  items: payload.items.map((item) => ({
    brand: item.brand,
    category: item.category,
    sourceCategory: item.sourceCategory,
    model: item.model,
    name: item.name,
    monthlyFee72: item.monthlyFee72,
    careType: item.careType,
    careDetail: item.careDetail,
    visitCycle: item.visitCycle,
    imageUrl: item.imageUrl,
    options: Array.isArray(item.options) ? item.options : [],
  })),
};

await fs.mkdir(path.dirname(outputPath), { recursive: true });
await fs.writeFile(
  outputPath,
  `// Generated from the private sanitized catalog. Never place this module under public/.\nexport default ${JSON.stringify(privateSeed)};\n`,
  "utf8",
);
console.log(`Built private Worker seed with ${privateSeed.items.length} products.`);
