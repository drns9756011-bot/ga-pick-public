const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const read = file => fs.readFileSync(`public/${file}`, 'utf8');
const escapeHTML = value => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('"', '&quot;');
const app = read('app.js');
const renderer = app.slice(app.indexOf('function renderHomeCaseCard('), app.indexOf('function renderHomeFeeds()'));
const context = vm.createContext({ escapeHTML, formatPrice: value => Number(value).toLocaleString('ko-KR') + '원', homeQuoteTitle: request => request.items });
vm.runInContext(renderer, context);

test('case imagery preserves live prices, channels, difference and expandable comparison', () => {
  const request = { price: 10000000, region: '부산 부산진구', purchasePurpose: '웨딩,혼수 특별혜택', items: 'TV, 냉장고, 세탁기', phone: 'private-phone' };
  const quoteBids = [{ price: 7480000, channel: '삼성스토어' }, { price: 7900000, channel: '전자랜드(LG)' }];
  const html = context.renderHomeCaseCard({ request, quoteBids, bidCount: 7 });
  for (const value of ['7,480,000원', '2,520,000원 낮은 견적', '삼성스토어', '전자랜드(LG)', '7개 제안 비교', '<details', 'pick-case-offer-price']) assert.ok(html.includes(value), value);
  assert.doesNotMatch(html, /private-phone|<figcaption|가전 구성 예시|pick-case-bid-list/);
  assert.match(html, /appliance-lineup--newlywed/);
  assert.match(context.renderHomeCaseCard({ request: { ...request, items: '김치냉장고' }, quoteBids }), /appliance-lineup--moving/);
  assert.match(html, /이미지는 실제 견적 모델과 다를 수 있습니다/);
  quoteBids[0].channel = '<script>bad</script>';
  assert.doesNotMatch(context.renderHomeCaseCard({ request, quoteBids }), /<script>/);
  assert.equal(context.renderHomeCaseCard({ request, quoteBids: [] }), '');
});

test('individual official photos have measured transparent bounds and distinct compositions', () => {
  const manifest = JSON.parse(read('assets/home-product-photos/sources.json'));
  assert.equal(manifest.items.length, 6);
  for (const item of manifest.items) {
    assert.equal(new URL(item.source).hostname, 'images.samsung.com');
    const bytes = fs.readFileSync(`public/assets/home-product-photos/${item.file}`);
    assert.equal(bytes.length, item.bytes);
    assert.equal(bytes.toString('ascii', 1, 4), 'PNG');
    assert.ok(item.bounds.width > 0 && item.bounds.height > 0);
    assert.ok(item.bounds.left + item.bounds.width <= item.canvas.width);
    assert.ok(item.bounds.top + item.bounds.height <= item.canvas.height);
    assert.match(read('home-product-photos.css'), new RegExp(`appliance-photo--${item.file.replace('.png', '')}`));
  }
  assert.ok(manifest.items.reduce((total, item) => total + item.bytes, 0) < 600000);
  for (const page of ['index.html','quote/index.html','my-quote/index.html']) {
    const hero = read(page).split('<div class="pq-hero-scene"')[1].split('pq-hero-inner')[0];
    assert.equal((hero.match(/class="appliance-photo /g) || []).length, 5);
    assert.doesNotMatch(hero, /home-appliances-official/);
    assert.match(read(page), /home-product-photos.css\?v=20261027-appliance-layout/);
  }
});

test('case offers use isolated rows instead of legacy mobile grid positioning', () => {
  const css = read('home-showcase.css');
  assert.match(css, /\.pick-case-offers > li \{ display: grid; gap: 8px; min-width: 0; padding: 14px 0; border-top:/);
  assert.match(css, /\.pick-case-offer-price \{[^}]+white-space: nowrap/);
  assert.match(css, /\.pick-case-offer-head > em \{[^}]+flex: none/);
  assert.doesNotMatch(css, /\.pick-case-visual \.pick-case-bid-list|\.pick-case-media figcaption/);
});

test('new imagery is sourced from official domains and all required assets are lightweight', () => {
  const manifest = JSON.parse(read('assets/home-official-visuals.sources.json'));
  for (const source of Object.values(manifest.sources)) assert.ok(['www.lge.co.kr', 'images.samsung.com', 'bestshop.lge.co.kr', 'www.samsungstore.com'].includes(new URL(source).hostname));
  for (const file of ['home-appliances-official-20261026.webp','case-newlywed-official-20261026.webp','case-moving-official-20261026.webp','official-lgLogo-20261026.webp','official-bestshopLogo-20261026.webp','official-samsungStoreLogo-20261026.webp']) {
    const data = fs.readFileSync(`public/assets/${file}`);
    assert.equal(data.toString('ascii',8,12), 'WEBP');
    assert.ok(data.length < 160000, file);
  }
  const brand = read('brand/index.html');
  assert.match(brand, /official-samsungStoreLogo.*alt="삼성스토어"/);
  assert.match(brand, /official-bestshopLogo.*alt="BEST SHOP"/);
  assert.doesNotMatch(brand, /src="\/assets\/(?:lg|samsung)-electronics-logo/);
});

test('every successful wizard navigation resets the page to top on both device types', () => {
  const source = read('customer-wizard.js');
  const block = source.slice(source.indexOf('  let stepScrollGeneration'), source.indexOf('  function validateCurrentStep()'));
  for (const mobile of [false, true]) {
    const calls = [], frames = [], state = { stepIndex: 0 };
    let valid = true, renders = 0, blurs = 0;
    class Element { blur() { blurs++; } }
    const ctx = vm.createContext({ state, window: { scrollX: 80, scrollTo: options => calls.push(options) }, requestAnimationFrame: fn => frames.push(fn), isMobileWizardViewport: () => mobile, document: { activeElement: new Element() }, HTMLElement: Element, visibleSteps: () => [1,2,3], validateCurrentStep: () => valid, render: () => renders++ });
    vm.runInContext(block, ctx);
    ctx.move(1);
    while (frames.length) frames.shift()();
    assert.equal(state.stepIndex, 1);
    assert.equal(renders, 1);
    assert.equal(blurs, mobile ? 1 : 0);
    assert.ok(calls.every(item => item.top === 0 && item.left === 80));
    assert.equal(calls.length, 3);
    valid = false;
    ctx.move(1);
    assert.equal(calls.length, 3);
    assert.equal(state.stepIndex, 1);
  }
});
