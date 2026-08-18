import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import crypto from "node:crypto";

const root = path.resolve(import.meta.dirname, "..");
const sourceDir = path.join(root, ".tmp", "lplan-image-source");
const catalogPath = path.join(root, "private-data", "subscription-products-20260817-options.json");
const sourceImageDir = path.join(sourceDir, "assets", "product-images");
const outputImageDir = path.join(root, "public", "assets", "subscription-product-images");
const reportPath = path.join(root, "subscription-product-image-match-report.json");

const normalize = (value) => String(value || "").trim().toUpperCase().replace(/\s+/g, "");
const modelBody = (value) => normalize(value).split(".")[0];

function evaluateImageMap(file, windowState) {
  const source = fs.readFileSync(file, "utf8");
  vm.runInNewContext(source, { window: windowState }, { filename: file, timeout: 20_000 });
}

const windowState = { LG_PRODUCT_IMAGES: {}, LG_PRODUCT_IMAGE_FILES: {} };
for (const name of fs.readdirSync(sourceDir).filter((name) => /^product-images-part-\d+\.js$/i.test(name)).sort()) {
  evaluateImageMap(path.join(sourceDir, name), windowState);
}
evaluateImageMap(path.join(sourceDir, "product-images.js"), windowState);
evaluateImageMap(path.join(sourceDir, "product-images-files-n95.js"), windowState);

const missingPath = path.join(sourceDir, "product-images-missing-20260814.js");
const missingSource = `${fs.readFileSync(missingPath, "utf8")}\nwindow.__ALIASES = officialImageAliases;`;
vm.runInNewContext(missingSource, { window: windowState }, { filename: missingPath, timeout: 20_000 });

const imageMap = new Map();
for (const [model, image] of Object.entries(windowState.LG_PRODUCT_IMAGES)) {
  if (typeof image === "string" && image) imageMap.set(normalize(model), image);
}
const aliases = new Map(Object.entries(windowState.__ALIASES || {}).map(([key, value]) => [normalize(key), normalize(value)]));

const bodyCandidates = new Map();
for (const key of imageMap.keys()) {
  const body = modelBody(key);
  if (!bodyCandidates.has(body)) bodyCandidates.set(body, new Set());
  bodyCandidates.get(body).add(key);
}

function resolveAlias(key) {
  const seen = new Set();
  let current = key;
  while (aliases.has(current) && !seen.has(current)) {
    seen.add(current);
    current = aliases.get(current);
  }
  return current;
}

function findImage(model) {
  const exact = normalize(model);
  if (imageMap.has(exact)) return { sourceKey: exact, image: imageMap.get(exact), method: "exact" };

  const aliased = resolveAlias(exact);
  if (aliased !== exact && imageMap.has(aliased)) {
    return { sourceKey: aliased, image: imageMap.get(aliased), method: "alias" };
  }

  const body = modelBody(exact);
  if (imageMap.has(body)) return { sourceKey: body, image: imageMap.get(body), method: "body-exact" };

  const candidates = [...(bodyCandidates.get(body) || [])];
  const uniqueImages = new Map(candidates.map((key) => [imageMap.get(key), key]));
  if (uniqueImages.size === 1) {
    const [[image, sourceKey]] = uniqueImages.entries();
    return { sourceKey, image, method: "body-unique" };
  }
  return null;
}

function materializeImage(image) {
  if (/^https:\/\//i.test(image)) return image;
  if (!/^data:image\//i.test(image) && windowState.LG_PRODUCT_IMAGE_FILES[image]) {
    return materializeImage(windowState.LG_PRODUCT_IMAGE_FILES[image]);
  }
  if (/^data:image\//i.test(image)) {
    const match = image.match(/^data:image\/(jpeg|jpg|png|webp);base64,(.+)$/i);
    if (!match) return null;
    const extension = match[1].toLowerCase() === "jpeg" ? "jpg" : match[1].toLowerCase();
    const contents = Buffer.from(match[2], "base64");
    const filename = `${crypto.createHash("sha1").update(contents).digest("hex")}.${extension}`;
    fs.mkdirSync(outputImageDir, { recursive: true });
    fs.writeFileSync(path.join(outputImageDir, filename), contents);
    return `/assets/subscription-product-images/${filename}`;
  }

  const filename = path.basename(image.replaceAll("\\", "/"));
  const source = path.join(sourceImageDir, filename);
  if (!fs.existsSync(source)) return null;
  fs.mkdirSync(outputImageDir, { recursive: true });
  fs.copyFileSync(source, path.join(outputImageDir, filename));
  return `/assets/subscription-product-images/${filename}`;
}

const catalog = JSON.parse(fs.readFileSync(catalogPath, "utf8"));
const stats = { total: catalog.items.length, exact: 0, alias: 0, "body-exact": 0, "body-unique": 0, matched: 0, unmatched: 0 };
const unmatched = [];
const usedLocalFiles = new Set();

for (const item of catalog.items) {
  const imageModel = item.imageModel || item.options?.[0]?.model || item.model;
  const match = findImage(imageModel);
  const imageUrl = match ? materializeImage(match.image) : null;
  if (!match || !imageUrl) {
    item.imageUrl = "";
    stats.unmatched += 1;
    unmatched.push({ model: item.model, category: item.category, reason: match ? "source-file-missing" : "no-safe-match" });
    continue;
  }

  item.imageUrl = imageUrl;
  stats[match.method] += 1;
  stats.matched += 1;
  if (imageUrl.startsWith("/assets/")) usedLocalFiles.add(path.basename(imageUrl));
}

fs.writeFileSync(catalogPath, `${JSON.stringify(catalog, null, 2)}\n`);
fs.writeFileSync(reportPath, `${JSON.stringify({ generatedAt: new Date().toISOString(), stats, localImageFiles: usedLocalFiles.size, unmatched }, null, 2)}\n`);
console.log(JSON.stringify({ stats, localImageFiles: usedLocalFiles.size, reportPath }, null, 2));
