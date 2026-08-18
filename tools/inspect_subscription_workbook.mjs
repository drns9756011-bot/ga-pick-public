import fs from "node:fs/promises";
import path from "node:path";
import { FileBlob, SpreadsheetFile } from "@oai/artifact-tool";

const inputPath = process.argv[2];
const outputDir = process.argv[3];

if (!inputPath || !outputDir) {
  throw new Error("Usage: node inspect_subscription_workbook.mjs <input.xlsx> <output-dir>");
}

await fs.mkdir(outputDir, { recursive: true });
const workbook = await SpreadsheetFile.importXlsx(await FileBlob.load(inputPath));
const sheetSummary = await workbook.inspect({
  kind: "sheet",
  include: "id,name",
  maxChars: 20000,
});

await fs.writeFile(path.join(outputDir, "sheets.ndjson"), sheetSummary.ndjson, "utf8");

const sheets = [];
for (let index = 0; index < workbook.worksheets.items.length; index += 1) {
  const sheet = workbook.worksheets.getItemAt(index);
  const used = sheet.getUsedRange(true);
  const values = used ? used.values : [];
  sheets.push({
    index,
    name: sheet.name,
    address: used?.address ?? null,
    rowCount: values.length,
    columnCount: values.reduce((max, row) => Math.max(max, row.length), 0),
    sample: values.slice(0, 30).map((row) => row.slice(0, 30)),
  });

  const preview = await workbook.render({
    sheetName: sheet.name,
    autoCrop: "all",
    scale: 0.35,
    format: "png",
  });
  const safeName = `${String(index + 1).padStart(2, "0")}-${sheet.name.replace(/[\\/:*?\"<>|]/g, "_")}.png`;
  await fs.writeFile(path.join(outputDir, safeName), new Uint8Array(await preview.arrayBuffer()));
}

await fs.writeFile(path.join(outputDir, "summary.json"), JSON.stringify(sheets, null, 2), "utf8");
console.log(JSON.stringify(sheets.map(({ index, name, address, rowCount, columnCount }) => ({ index, name, address, rowCount, columnCount })), null, 2));
