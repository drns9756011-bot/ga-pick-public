const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const read = file => readFileSync(path.join(__dirname, '../public', file), 'utf8');

function loader() {
  const timers = new Map();
  const classes = new Set();
  let removed = false;
  let retries = 0;
  let retry;
  let nextTimer = 0;
  const overlay = {
    setAttribute() {}, innerHTML: '', remove() { removed = true; },
    querySelector() { return { addEventListener(_, fn) { retry = fn; } }; },
  };
  const window = {};
  const context = vm.createContext({
    window, location: { reload() { retries++; } },
    document: {
      createElement: () => overlay, body: { append() {} },
      documentElement: { classList: { add: value => classes.add(value), remove: value => classes.delete(value) } },
      addEventListener() {},
    },
    setTimeout(fn) { timers.set(++nextTimer, fn); return nextTimer; },
    clearTimeout(id) { timers.delete(id); },
  });
  vm.runInContext(read('customer-ready.js'), context);
  return { api: window.PickPageReady, timers, classes, overlay, removed: () => removed, retry: () => retry(), retries: () => retries };
}

test('loading screen closes only when ready and cancels its timeout', () => {
  const page = loader();
  assert.ok(page.classes.has('customer-is-loading'));
  assert.equal(page.removed(), false);
  page.api.ready();
  assert.equal(page.removed(), true);
  assert.equal(page.timers.size, 0);
  assert.equal(page.classes.has('customer-is-loading'), false);
});

test('timeout replaces spinner with retry and late readiness cannot dismiss the error', () => {
  const page = loader();
  [...page.timers.values()][0]();
  assert.match(page.overlay.innerHTML, /다시 시도/);
  page.api.ready();
  assert.equal(page.removed(), false);
  page.retry();
  assert.equal(page.retries(), 1);
});

test('every customer route loads the common readiness controller before application scripts', () => {
  for (const file of ['index.html','quote/index.html','my-quote/index.html','brand/index.html','subscription/index.html','shopping/index.html','privacy/index.html']) {
    const html = read(file);
    assert.match(html, /customer-ready.css/);
    assert.ok(html.indexOf('customer-ready.js') < html.indexOf('</head>'));
    const firstDeferred = html.match(/<script defer src="([^"]+)"/);
    assert.ok(firstDeferred[1].includes('customer-ready.js'), file);
  }
});

test('cached catalog avoids another request and readiness waits for first product images', async () => {
  const source = read('commerce/commerce.js');
  const start = source.indexOf('async function initCommerce()');
  const fn = source.slice(start, source.indexOf('\ninitCommerce();', start));
  const events = [];
  const context = vm.createContext({
    commercePage: 'subscription', readSubscriptionCache: () => ({}),
    applySubscriptionPayload: () => true,
    loadSubscriptionProducts: () => { throw new Error('cache ignored'); },
    renderCategories() {}, renderProducts() { events.push('render'); },
    filteredItems: () => [{ imageUrl: 'atlas:/assets/atlas.webp#0,1' }],
    window: { PickPageReady: {
      async images(urls) { assert.equal(urls[0], '/assets/atlas.webp'); events.push('images'); },
      ready() { events.push('ready'); }, fail() { events.push('fail'); },
    } },
  });
  vm.runInContext(fn, context);
  await context.initCommerce();
  assert.deepEqual(events, ['render','images','ready']);
});

test('shopping empty state has no preparation copy or promotional button', () => {
  const source = read('commerce/commerce.js');
  let cleared = false;
  const grid = { innerHTML: 'old', replaceChildren() { cleared = true; } };
  const context = vm.createContext({ productGrid: grid });
  vm.runInContext(source.slice(source.indexOf('function renderEmpty('), source.indexOf('function renderProducts(')), context);
  context.renderEmpty(false);
  assert.equal(cleared, true);
  assert.doesNotMatch(source, /쇼핑 상품을 준비|공식 상품 정보와 쿠팡 파트너스 링크가 확인된/);
});
