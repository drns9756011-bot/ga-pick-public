const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.join(__dirname, '../public');
const source = fs.readFileSync(path.join(root, 'customer-wizard.js'), 'utf8');
const start = source.indexOf('  const productOptions =');
const options = source.slice(start, source.indexOf('];', start) + 2);
const render = source.slice(source.indexOf('  function productPhotoMarkup('), source.indexOf('  function renderProducts('));

test('all 13 Samsung categories have valid local PNGs and official provenance', () => {
  const context = vm.createContext({ fields: { brand: { value: '삼성전자' } } });
  vm.runInContext(options + render + ';globalThis.products = productOptions;', context);
  const manifest = JSON.parse(fs.readFileSync(path.join(root, 'assets/samsung-category-photos/sources.json'), 'utf8'));
  assert.equal(context.products.length, 13);
  for (const product of context.products) {
    const html = context.productPhotoMarkup(product);
    assert.match(html, /<img /);
    assert.doesNotMatch(html, /subscription-product-atlases/);
    const file = product.samsungPhoto + '.png';
    const bytes = fs.readFileSync(path.join(root, 'assets/samsung-category-photos', file));
    assert.equal(bytes.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
    assert.equal(bytes.readUInt32BE(16), 330);
    assert.equal(bytes.readUInt32BE(20), 330);
    assert.ok(manifest.items.some(item => item.file === file && item.source.startsWith('https://images.samsung.com/')));
  }
});

test('switching Samsung to LG and back never retains the previous brand photo', () => {
  const fields = { brand: { value: '삼성전자' } };
  const context = vm.createContext({ fields });
  vm.runInContext(options + render + ';globalThis.products = productOptions;', context);
  for (const brand of ['삼성전자', 'LG전자', '비교견적', '삼성전자']) {
    fields.brand.value = brand;
    for (const product of context.products) {
      const html = context.productPhotoMarkup(product);
      assert.equal(html.includes('/samsung-category-photos/'), brand === '삼성전자');
      assert.equal(html.includes('/subscription-product-atlases/'), brand !== '삼성전자');
    }
  }
});
