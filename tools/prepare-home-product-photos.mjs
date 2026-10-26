import { createRequire } from 'node:module';
import { mkdir, readFile, writeFile } from 'node:fs/promises';

const require = createRequire(import.meta.url);
const sharp = require(process.env.SHARP_MODULE || 'C:/Users/LG/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const assets = new URL('../public/assets/home-product-photos/', import.meta.url);
const catalog = JSON.parse(await readFile(new URL('../public/assets/samsung-category-photos/sources.json', import.meta.url), 'utf8'));
const names = ['tv', 'refrigerator', 'laundry', 'airdresser', 'air-purifier', 'kimchi'];
const items = [];
const styles = ['/* Official photos remain unchanged; crop only their transparent canvas in the layout. */'];
await mkdir(assets, { recursive: true });
for (const name of names) {
  const item = catalog.items.find(item => item.file === `${name}.png`);
  const source = item.source.replace('Q90_330_330', 'Q80_660_660');
  const response = await fetch(source, { signal: AbortSignal.timeout(30000) });
  if (!response.ok) throw new Error(`${name}: HTTP ${response.status}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  const { data, info } = await sharp(bytes).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let left = info.width, right = -1, top = info.height, bottom = -1;
  for (let y = 0; y < info.height; y++) {
    for (let x = 0; x < info.width; x++) {
      if (data[(y * info.width + x) * 4 + 3] < 16) continue;
      left = Math.min(left, x); right = Math.max(right, x);
      top = Math.min(top, y); bottom = Math.max(bottom, y);
    }
  }
  if (right < left || bottom < top) throw new Error(`${name}: empty photo`);
  const width = right - left + 1, height = bottom - top + 1;
  const pct = value => (value * 100).toFixed(5) + '%';
  await writeFile(new URL(item.file, assets), bytes);
  items.push({ ...item, source, bytes: bytes.length, bounds: { left, top, width, height }, canvas: { width: info.width, height: info.height } });
  styles.push(`.appliance-photo--${name} { --photo-aspect: ${width} / ${height}; --photo-width: ${pct(info.width / width)}; --photo-height: ${pct(info.height / height)}; --photo-left: ${pct(-left / width)}; --photo-top: ${pct(-top / height)}; }`);
  console.log(name, bytes.length, { left, top, width, height });
}
await writeFile(new URL('sources.json', assets), JSON.stringify({ note: 'Unmodified official product photographs. CSS removes transparent margins only. Illustrative arrangements, not historical quote model identification.', items }, null, 2) + '\n');
await writeFile(new URL('../../home-product-photos.css', assets), styles.join('\n') + '\n');
