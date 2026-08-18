import fs from "node:fs/promises";
import path from "node:path";

const outputDir = process.argv[2] || ".tmp/lge-search-chunks";
const pageUrl = "https://www.lge.co.kr/search/result?search=43QNED70BKS";
await fs.mkdir(outputDir, { recursive: true });

const html = await (await fetch(pageUrl)).text();
const scriptUrls = [...html.matchAll(/<script[^>]+src="([^"]+)"/g)]
  .map((match) => new URL(match[1], pageUrl).href)
  .filter((url) => url.includes("/_next/static/chunks/"));

const findings = [];
for (const [index, url] of [...new Set(scriptUrls)].entries()) {
  const response = await fetch(url);
  const source = await response.text();
  const filename = `${String(index + 1).padStart(3, "0")}-${path.basename(new URL(url).pathname)}`;
  await fs.writeFile(path.join(outputDir, filename), source, "utf8");

  const strings = [...source.matchAll(/(["'`])((?:\\.|(?!\1)[\s\S]){4,300}?)\1/g)]
    .map((match) => match[2])
    .filter((value) => /(api|search|collection|product|subscribe)/i.test(value))
    .filter((value) => /[/?]/.test(value));
  if (strings.length) findings.push({ url, strings: [...new Set(strings)].slice(0, 300) });
}

await fs.writeFile(path.join(outputDir, "findings.json"), JSON.stringify(findings, null, 2), "utf8");
console.log(`Downloaded ${scriptUrls.length} chunks; ${findings.length} contained likely endpoint strings.`);
