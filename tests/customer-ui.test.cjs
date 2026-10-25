const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync, statSync } = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.join(__dirname, '../public');
const read = (file) => readFileSync(path.join(root, file), 'utf8');
const shells = ['index.html', 'quote/index.html', 'my-quote/index.html'];
const catalogs = ['brand/index.html', 'subscription/index.html', 'shopping/index.html'];
const home = (html) => html.slice(html.indexOf('<section class="page is-active" id="homePage"'), html.indexOf('<section class="page" id="customerPage"')).replace(/\s(?:fetchpriority="high"|loading="lazy")/g, '');

test('Neo QLED filter does not confuse Serif or OLED models sharing the KQ prefix', () => {
  const source = read('customer-wizard.js');
  const start = source.indexOf('  function filterModelsByProductOptions(');
  const end = source.indexOf('  function isAllowedRecommendationModel(', start);
  const candidates = [
    { modelName: 'KQ65QNH70AFXKR', title: '2026 Neo QLED QNH70 (163cm)' },
    { modelName: 'KQ65LSD01AFXKR', title: '2024 The Serif (163cm)' },
    { modelName: 'KQ65SH90AFXKR', title: 'OLED 65인치' },
    { modelName: 'KQ85QNH70AFXKR', title: '2026 Neo QLED QNH70 (214cm)' },
  ];
  const context = vm.createContext({
    candidates, normalizeProductKey: (value) => value, selectedBrandKey: () => '삼성전자',
    isAllowedRecommendationModel: () => true, modelBody: (model) => model.modelName,
    modelSearchText: (model) => model.title, compactModelName: (value) => String(value).toUpperCase().replace(/\s/g, ''),
    extractTvInches: (code) => Number(code.match(/^KQ(\d{2})/)?.[1]),
  });
  vm.runInContext(source.slice(start, end), context);
  const result = vm.runInContext('filterModelsByProductOptions("TV", candidates, "", {type:"NEO QLED",size:"65인치"})', context);
  assert.deepEqual(Array.from(result, (model) => model.modelName), ['KQ65QNH70AFXKR']);
});

test('recommendation batches both cleaner types without any price requests', async () => {
  const source = read('customer-wizard.js');
  const start = source.indexOf('  async function buildAiModelRecommendations()');
  const end = source.indexOf('  function filterModelsByProductOptions(', start);
  const options = { type: ['무선 청소기', '로봇 청소기'], cordlessDetail: '기본형', robotDetail: '직배수형' };
  const candidates = [
    { modelName: 'A730WC.AKRG', type: '무선 청소기' },
    { modelName: 'N95THO.CKOR', type: '로봇 청소기' },
  ];
  let requests = 0;
  const context = vm.createContext({
    state: { selectedProducts: ['청소기'], aiContext: { situation: '이사', budgetRange: '5000000', family: ['2인'], priorities: ['가격'], note: 'private note must not be sent' } },
    normalizeProductKey: (product) => product, optionStateFor: () => options, optionBrandFor: () => '',
    productBudgetWeight: () => 1, parseBudgetWon: Number, selectedBrandKey: () => 'LG전자',
    loadOfficialCatalog: async () => candidates, filterModelsByProductOptions: (_, models, type) => models.filter((model) => model.type === type),
    rankModelCandidates: (_, models) => models, compactModelName: (name) => name || '',
    fetchWithTimeout: async (url, init) => {
      requests += 1;
      assert.equal(url, '/api/ai-model-recommendations');
      const body = JSON.parse(init.body);
      assert.equal(body.groups.length, 2);
      assert.equal(body.groups[0].options, '무선 청소기 · 기본형');
      assert.equal(body.groups[1].options, '로봇 청소기 · 직배수형');
      assert.ok(!init.body.includes('private note'));
      return { ok: true, json: async () => ({ ok: true, engine: 'workers-ai', groups: [
        { group: 0, models: [candidates[0]], reason: '무선 추천' },
        { group: 1, models: [candidates[1]], reason: '로봇 추천' },
      ] }) };
    },
  });
  vm.runInContext(source.slice(start, end), context);
  const groups = await vm.runInContext('buildAiModelRecommendations()', context);
  assert.equal(requests, 1);
  assert.equal(groups[0].models[0].modelName, candidates[0].modelName);
  assert.equal(groups[0].models[0].naverLowestPrice, undefined);
  assert.doesNotMatch(source, /fetchLowestPrice|naver-shopping|네이버 최저|renderRecommendationTotal|applyAutoLowestPrice/);
  assert.equal(groups[1].displayProduct, '로봇 청소기');
  assert.equal(groups[0].engine, 'workers-ai');
});

test('failed inference clears output, offers retry, and does not masquerade as AI success', async () => {
  const source = read('customer-wizard.js');
  const start = source.indexOf('  async function runAiRecommendation()');
  const end = source.indexOf('  function showAiRecommendationLoading()', start);
  const state = { recommending: false, recommendationError: '', recommendationGroups: [] };
  const fields = { aiModelRecommendations: { value: 'old output' }, price: { value: '100' } };
  const context = vm.createContext({
    state, fields, console: { warn() {} }, buildAiModelRecommendations: async () => { throw new Error('offline'); },
    showAiRecommendationLoading() {}, hideAiRecommendationLoading() {}, render() {}, syncAllFields() {},
  });
  vm.runInContext(source.slice(start, end), context);
  await vm.runInContext('runAiRecommendation()', context);
  assert.equal(state.recommending, false);
  assert.ok(state.recommendationError);
  assert.equal(fields.aiModelRecommendations.value, '');
  assert.equal(fields.price.value, '0');
  assert.ok(source.includes('!state.recommendationError'));
  assert.ok(source.includes('data-retry-ai'));
  assert.ok(!source.includes('chooseRecommendedModel('));
  assert.ok(!source.includes('fallbackRecommendationText('));
  for (const shell of shells) {
    assert.ok(read(shell).includes('/customer-wizard.js?v=20261025-space-flow'));
    assert.doesNotMatch(read(shell), /네이버 최저/);
  }
});

test('all route shells contain the same redesigned home and form anchors', () => {
  const baseline = home(read(shells[0]));
  assert.ok(baseline.includes('data-home-quote-start'));
  assert.ok(baseline.includes('data-home-quote-mode="with_quote"'));
  assert.ok(baseline.includes('data-home-quote-mode="without_quote"'));
  assert.match(baseline, /pq-hero-scene/);
  assert.ok(baseline.includes('/assets/pickquote-appliance-space-20261025.webp'));
  assert.doesNotMatch(baseline, /pq-benefit-strip|pq-privacy/);
  assert.ok(baseline.includes('/brand?brand=LG'));
  assert.ok(baseline.includes('/brand?brand=Samsung'));
  assert.ok(baseline.indexOf('id="homeCaseStudy"') < baseline.indexOf('class="pq-process-band"'));
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
    assert.ok(html.includes('/customer-ui.css?v=20261025-space'), file);
    assert.ok(html.includes('href="/assets/suit-variable.woff2"'), file);
    assert.ok(html.includes('customer-refresh'), file);
    assert.doesNotMatch(html, /adsbygoogle|PICK SUBSCRIPTION|PICK SHOPPING/);
    assert.doesNotMatch(html, /page-guide\.js/);
  }
  for (const asset of ['appliances-lg.webp', 'appliances-samsung.webp']) {
    assert.ok(statSync(path.join(root, 'assets', asset)).size < 50000, asset);
  }
  assert.ok(statSync(path.join(root, 'assets/suit-variable.woff2')).size < 700000);
  assert.ok(statSync(path.join(root, 'assets/pickquote-appliance-space-20261025.webp')).size < 160000);
  assert.ok(statSync(path.join(root, 'assets/suit-LICENSE.txt')).size > 1000);
  assert.match(read('customer-ui.css'), /src: url\("\/assets\/suit-variable\.woff2"\)/);
  for (const file of ['styles.css', 'brand/brand.css', 'commerce/commerce.css']) {
    assert.doesNotMatch(read(file), /@import.*https:/, file);
  }
});

test('shopping empty states never report a subscription API failure', () => {
  const source = read('commerce/commerce.js');
  const start = source.indexOf('function renderProducts()');
  const end = source.indexOf('  productGrid.innerHTML = items.map', start);
  const emptyRender = source.slice(start, end) + '}';
  for (const [page, products, expected] of [
    ['shopping', [], '쇼핑 상품을 준비하고 있습니다.'],
    ['shopping', [{}], '조건에 맞는 쇼핑 상품이 없습니다.'],
    ['subscription', [], '구독 상품을 불러오지 못했습니다.'],
    ['subscription', [{}], '조건에 맞는 구독 상품이 없습니다.'],
  ]) {
    let rendered;
    const context = vm.createContext({ productGrid: {}, filteredItems: () => [], visibleCount: 24,
      commercePage: page, commerceItems: products, renderEmpty: (_, message) => { rendered = message; }, updateCatalogMeta() {} });
    vm.runInContext(emptyRender + '; renderProducts();', context);
    assert.equal(rendered, expected);
  }
});

test('customer typography uses readable body, controls, and supporting text', () => {
  const css = read('customer-ui.css');
  assert.match(css, /font-size: 17px; font-weight: 450; line-height: 1\.65/);
  assert.match(css, /--pick-muted: #626b70/);
  assert.match(css, /\.pq-primary \{[^}]*font-size: 18px; font-weight: 650/);
  assert.match(css, /\.pq-hero-note \{[^}]*font-size: 14px/);
  assert.match(css, /\.pq-hero-followup \{[^}]*flex-wrap: wrap/);
  assert.doesNotMatch(css, /font-size: (?:10|11)px/);
});

test('reference-led layout uses square entries, a category rail, and one focused quote form', () => {
  const css = read('customer-ui.css');
  assert.match(css, /\.pq-hero-copy \{[^}]*text-align: left/);
  assert.match(css, /\.pq-entry \{[^}]*aspect-ratio: 1/);
  assert.match(css, /\.commerce-main \{[^}]*grid-template-columns: 190px minmax\(0,1fr\)/);
  assert.match(css, /grid-auto-flow: column; grid-auto-columns: 190px/);
  assert.doesNotMatch(css, /pq-step-compare|pq-step-select|pq-entry-room|hero-mobile-scene/);
  for (const file of shells) {
    const html = read(file);
    const lookup = html.slice(html.indexOf('id="lookupPage"'), html.indexOf('id="sellerLoginPage"'));
    assert.equal((html.match(/class="lookup-intro"/g) || []).length, 0);
    assert.ok(lookup.includes('id="lookupForm"'));
    assert.equal((html.match(/<details class="preview-card" hidden>/g) || []).length, 1);
    assert.doesNotMatch(home(html), /pickquote-showroom|pq-step-compare|pq-step-select/);
  }
  assert.ok(read('privacy/index.html').includes('/customer-ui.css?v=20261025-space'));
});

test('home quote choice uses the existing wizard and resumes matching drafts', () => {
  const source = read('customer-wizard.js');
  let choice = 'without_quote';
  let clears = 0;
  let renders = 0;
  const fields = { quoteType: { value: '' }, price: { value: '1500' }, customer: { value: 'draft' } };
  const state = { stepIndex: 0, recommendationMode: 'ai', selectedProducts: ['TV'], productOptions: { TV: {} } };
  const context = vm.createContext({
    fields, state,
    quoteTypes: [{ value: 'with_quote' }, { value: 'without_quote' }],
    form: { querySelector: () => null },
    clearAiRecommendation: () => { clears++; },
    clearMessage: () => {},
    syncAllFields: () => {},
    render: () => { renders++; },
  });
  vm.runInContext(source.slice(source.indexOf('  function selectQuoteType('), source.indexOf('  function resetWizardState(')), context);
  context.startHomeQuote({ currentTarget: { dataset: { homeQuoteMode: choice } } });
  assert.equal(fields.quoteType.value, 'without_quote');
  assert.equal(state.stepIndex, 1);
  assert.equal(fields.customer.value, 'draft');
  assert.deepEqual(state.selectedProducts, ['TV']);
  state.stepIndex = 4;
  fields.price.value = '2000';
  context.startHomeQuote({ currentTarget: { dataset: { homeQuoteMode: choice } } });
  assert.equal(state.stepIndex, 4);
  assert.equal(fields.price.value, '2000');
  choice = 'with_quote';
  context.startHomeQuote({ currentTarget: { dataset: { homeQuoteMode: choice } } });
  assert.equal(state.stepIndex, 1);
  assert.equal(state.selectedProducts.length, 0);
  assert.equal(Object.keys(state.productOptions).length, 0);
  assert.equal(clears, 1);
  assert.equal(fields.customer.value, 'draft');
  choice = 'invalid';
  context.startHomeQuote({ currentTarget: { dataset: { homeQuoteMode: choice } } });
  assert.equal(fields.quoteType.value, 'with_quote');
  assert.equal(renders, 3);
});

test('preview is revealed only for an attached image in the quote-present path', () => {
  const source = read('customer-wizard.js');
  const start = source.indexOf('  function syncPreviewVisibility()');
  const end = source.indexOf('  function formatPhoneInput(', start);
  let withQuote = false;
  let image = null;
  const panel = { hidden: true, open: false };
  const context = vm.createContext({
    isWithQuote: () => withQuote,
    imagePreview: { closest: () => panel, querySelector: () => image },
  });
  vm.runInContext(source.slice(start, end), context);
  const sync = () => vm.runInContext('syncPreviewVisibility()', context);
  sync();
  assert.equal(panel.hidden, true);
  withQuote = true;
  sync();
  assert.equal(panel.hidden, true);
  image = {};
  sync();
  assert.equal(panel.hidden, false);
  assert.equal(panel.open, true);
  panel.open = false;
  sync();
  assert.equal(panel.open, false);
  withQuote = false;
  sync();
  assert.equal(panel.hidden, true);
  assert.equal(panel.open, false);
  image = null;
  withQuote = true;
  sync();
  assert.equal(panel.hidden, true);
});

test('product choices precede verification and all customer routes share the new action palette', () => {
  const source = read('customer-wizard.js');
  const steps = source.slice(source.indexOf('  const steps = ['), source.indexOf('  installWizard();'));
  assert.ok(steps.indexOf('key: "products"') < steps.indexOf('key: "personal"'));
  assert.ok(steps.indexOf('key: "ai"') < steps.indexOf('key: "personal"'));
  assert.ok(steps.indexOf('key: "personal"') < steps.indexOf('key: "quoteInfo"'));
  const css = read('customer-ui.css');
  assert.match(css, /--primary: #3067e2/);
  assert.match(css, /--brand-green: #3067e2/);
  assert.match(css, /--commerce-navy: #3067e2/);
  assert.doesNotMatch(css, /#123b67|#254d40|#2854ed|#e7f1ec|#254c3d/);
  assert.match(css, /@media \(max-width: 1100px\)[\s\S]*?\.pick-case-content article \{ display: block/);
  assert.match(css, /grid-template-columns: 48px minmax\(0,1fr\) max-content/);
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

test('the two home actions bind independently and do not require a hidden radio state', () => {
  const source = read('customer-wizard.js');
  assert.ok(source.includes('querySelectorAll("[data-home-quote-start]")'));
  assert.ok(source.includes('event?.currentTarget?.dataset.homeQuoteMode'));
  assert.doesNotMatch(source, /name="homeQuoteMode"/);
  for (const file of shells) {
    assert.equal((home(read(file)).match(/data-home-quote-start/g) || []).length, 2);
    assert.doesNotMatch(home(read(file)), /pickquote-home-photo|pq-quote-mode/);
  }
});

test('selection context shows escaped product choices, never personal details', () => {
  const source = read('customer-wizard.js');
  const start = source.indexOf('  function renderSelectionContext(');
  const end = source.indexOf('  function isMobileWizardViewport(', start);
  const context = vm.createContext({
    fields: { purpose: { value: '이사' }, brand: { value: '<LG>' }, phone: { value: 'private' } },
    state: { selectedProducts: ['TV', '냉장고'] },
    escapeHtml: (value) => value.replaceAll('<', '&lt;').replaceAll('>', '&gt;'),
  });
  vm.runInContext(source.slice(start, end), context);
  assert.equal(context.renderSelectionContext('quoteType'), '');
  const html = context.renderSelectionContext('options');
  assert.ok(html.includes('이사'));
  assert.ok(html.includes('&lt;LG&gt;'));
  assert.ok(html.includes('TV, 냉장고'));
  assert.doesNotMatch(html, /<LG>|private/);
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
  const source = read('brand/brand.js');
  assert.match(source, /new URLSearchParams\(window.location.search\)\.get\("brand"\)/);
  assert.match(source, /new Map\(\[\["LG", "LG전자"\], \["Samsung", "삼성전자"\]\]\)/);
  assert.ok(source.includes('button.setAttribute("aria-pressed", String(selected))'));
});
