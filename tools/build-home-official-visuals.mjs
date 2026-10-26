import { createRequire } from 'node:module';
import { writeFile } from 'node:fs/promises';
const require = createRequire(import.meta.url);
const sharp = require(process.env.SHARP_MODULE || 'C:/Users/LG/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const assets = new URL('../public/assets/', import.meta.url);
const urls = {
  lgFridge: 'https://www.lge.co.kr/kr/images/refrigerators/md10615853/gallery/medium01.jpg',
  samsungFridge: 'https://images.samsung.com/kdp/goods/2026/08/14/14409efd-ae3d-4e64-b64b-16a5931d5efe.png?$Q90_900_900_F_PNG$',
  samsungLaundry: 'https://images.samsung.com/kdp/goods/2026/03/27/89e139a0-86d3-426c-85f6-fbc2cffb7f53.png?$Q90_900_900_F_PNG$',
  samsungTv: 'https://images.samsung.com/kdp/goods/2026/07/08/ae1a7540-53c7-4f5d-9834-aedd4561d596.png?$Q90_900_900_F_PNG$',
  samsungKimchi: 'https://images.samsung.com/kdp/goods/2025/07/31/2706a214-c15f-42ae-9e5e-085186642504.png?$Q90_900_900_F_PNG$',
  lgLogo: 'https://bestshop.lge.co.kr/kr/bestshop/images/renewal/common/logo_lge_new.svg',
  bestshopLogo: 'https://bestshop.lge.co.kr/kr/bestshop/images/renewal/common/logo_bestshop_new.svg',
  samsungStoreLogo: 'https://www.samsungstore.com/images/new/gnb/logo_samsungstore.png',
};
const buffers = {};
for (const [name, url] of Object.entries(urls)) {
  const response = await fetch(url, { signal: AbortSignal.timeout(30000) });
  if (!response.ok) throw new Error(`${name}: HTTP ${response.status}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  buffers[name] = bytes;
  const info = await sharp(bytes).metadata();
  console.log(name, info.width, info.height);
}
for (const name of ['lgLogo', 'bestshopLogo', 'samsungStoreLogo']) {
  await sharp(buffers[name], { density: 160 }).resize({ width: 600, withoutEnlargement: true }).webp({ quality: 90 }).toFile(new URL(`official-${name}-20261026.webp`, assets).pathname.replace(/^\/(?:([A-Z]):)/, '$1:'));
}
for (const [name, items] of [
  ['home-appliances-official-20261026', [['samsungTv', 40, 350, 560], ['lgFridge', 610, 240, 520], ['samsungLaundry', 940, 250, 520]]],
  ['case-newlywed-official-20261026', [['samsungTv', 25, 225, 380], ['lgFridge', 430, 150, 330], ['samsungLaundry', 710, 150, 330]]],
  ['case-moving-official-20261026', [['samsungFridge', 40, 150, 340], ['samsungKimchi', 425, 180, 330], ['samsungLaundry', 805, 150, 330]]],
]) {
  const hero = name.startsWith('home');
  const width = hero ? 1800 : 1200, height = hero ? 820 : 560;
  const layers = [];
  for (const [key, left, top, size] of items) {
    const input = await sharp(buffers[key]).flatten({ background: '#fff' }).trim({ threshold: 12 }).resize(size, height - top - 25, { fit: 'inside' }).png().toBuffer();
    const meta = await sharp(input).metadata();
    layers.push({ input, left, top: height - meta.height - 25 });
  }
  const composition = await sharp({ create: { width, height, channels: 3, background: '#fff' } }).composite(layers).png().toBuffer();
  await sharp(composition).trim({ threshold: 8 }).extend({ top: 28, bottom: 20, left: 24, right: 24, background: '#fff' }).webp({ quality: 88 }).toFile(new URL(`${name}.webp`, assets).pathname.replace(/^\/(?:([A-Z]):)/, '$1:'));
}
await writeFile(new URL('home-official-visuals.sources.json', assets), JSON.stringify({ checkedOn: '2026-10-26', note: 'Official product photographs, resized and arranged without generative alterations. Illustrative product groups, not the models of historical customer quotes.', models: { lgFridge: 'M876GBB131', samsungFridge: 'RM70H63R1A', samsungLaundry: 'WF2522HDEEE', samsungTv: 'KQ85LSH03E-WT', samsungKimchi: 'RK70F42M2A' }, sources: urls }, null, 2));
