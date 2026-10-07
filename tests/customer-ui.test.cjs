const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync, statSync } = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.join(__dirname, '../public');
const read = (file) => readFileSync(path.join(root, file), 'utf8');
const shells = ['index.html', 'quote/index.html', 'my-quote/index.html'];
const catalogs = ['brand/index.html', 'subscription/index.html', 'shopping/index.html'];
const home = (html) => html.slice(html.indexOf('<section class="page is-active" id="homePage"'), html.indexOf('<section class="page" id="customerPage"'));

test('all route shells contain the same redesigned home and form anchors', () => {
  const baseline = home(read(shells[0]));
  assert.ok(baseline.includes('class="pq-hero-scene"'));
  for (const file of shells) {
    const html = read(file);
    assert.equal(home(html), baseline);
    for (const id of ['customerPage', 'lookupPage', 'requestForm', 'lookupForm', 'imagePreview', 'homeCaseStudy']) {
      assert.ok(html.includes(`id="${id}"`), `${file}: ${id}`);
    }
    assert.ok(html.includes('data-view="customer"'));
    assert.ok(html.includes('data-view="lookup"'));
  }
});

test('all customer pages load one version of the shared design without ad scripts', () => {
  for (const file of [...shells, ...catalogs]) {
    const html = read(file);
    assert.ok(html.includes('/customer-ui.css?v=20261007-full-redesign'), file);
    assert.ok(html.includes('customer-refresh'), file);
    assert.doesNotMatch(html, /adsbygoogle|PICK SUBSCRIPTION|PICK SHOPPING/);
    assert.doesNotMatch(html, /page-guide\.js/);
  }
  assert.ok(statSync(path.join(root, 'assets/customer-home-room-20261007.webp')).size < 120000);
});

test('catalog controls remain present and the subscription video follows products', () => {
  for (const file of ['subscription/index.html', 'shopping/index.html']) {
    const html = read(file);
    for (const id of ['commerceCategories', 'commerceCatalog', 'commerceSearch', 'commerceBrand', 'commerceProductGrid']) {
      assert.ok(html.includes(`id="${id}"`), `${file}: ${id}`);
    }
    assert.doesNotMatch(html, /class="commerce-hero"/);
  }
  const subscription = read('subscription/index.html');
  assert.ok(subscription.includes('id="commerceSort"'));
  assert.ok(subscription.indexOf('id="commerceProductGrid"') < subscription.indexOf('<details class="subscription-video-section"'));
  assert.ok(subscription.includes('preload="none"'));
  assert.ok(subscription.includes('data-subscription-consult'));
});

test('compact category controls preserve counts, selection state, and escaping', () => {
  const source = read('commerce/commerce.js');
  const grid = { innerHTML: '' };
  const context = vm.createContext({
    categoryGrid: grid,
    getCategoryList: () => ['TV', 'Fridge<special>'],
    activeCategory: 'TV',
    commerceItems: [{ category: 'TV' }, { category: 'TV' }, { category: 'Fridge<special>' }],
  });
  vm.runInContext(source.slice(source.indexOf('function escapeHtml('), source.indexOf('function formatWon(')), context);
  vm.runInContext(source.slice(source.indexOf('function renderCategories('), source.indexOf('function filteredItems(')), context);
  context.renderCategories();
  assert.equal((grid.innerHTML.match(/<button /g) || []).length, 3);
  assert.equal((grid.innerHTML.match(/aria-pressed="true"/g) || []).length, 1);
  assert.match(grid.innerHTML, /data-category="TV" aria-pressed="true"/);
  assert.match(grid.innerHTML, /<small>2<\/small>/);
  assert.match(grid.innerHTML, /Fridge&lt;special&gt;/);
  assert.doesNotMatch(grid.innerHTML, /<b>|<special>/);
});

test('brand selection and consultation anchors remain available', () => {
  const html = read('brand/index.html');
  assert.equal((html.match(/data-showcase-brand=/g) || []).length, 2);
  for (const id of ['brandFilters', 'channelFilter', 'packageGrid', 'packageDetailModal', 'packageDetailContent', 'consultModal', 'consultForm']) {
    assert.ok(html.includes(`id="${id}"`), id);
  }
  assert.ok(html.includes('/assets/lg-electronics-logo.svg'));
  assert.ok(html.includes('/assets/samsung-electronics-logo.svg'));
  assert.doesNotMatch(html, /STORE PACKAGE|PICK GUIDE|class="brand-hall-hero"/);
});
