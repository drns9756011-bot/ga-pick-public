const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const read = file => readFileSync(path.join(root, file), 'utf8');
const css = read('public/customer-catalog-responsive.css');

// Structural contract checks, not browser layout or native-device emulation.
function parse(source, media = '') {
  source = source.replace(/\/\*[\s\S]*?\*\//g, '');
  const rules = [];
  let cursor = 0;
  while (cursor < source.length) {
    const open = source.indexOf('{', cursor);
    if (open < 0) {
      assert.equal(source.slice(cursor).trim(), '', 'unexpected trailing CSS');
      break;
    }
    const selector = source.slice(cursor, open).trim().replace(/\s+/g, ' ');
    let depth = 1;
    let close = open + 1;
    while (close < source.length && depth) {
      if (source[close] === '{') depth++;
      if (source[close] === '}') depth--;
      close++;
    }
    assert.equal(depth, 0, `unclosed block: ${selector}`);
    const content = source.slice(open + 1, close - 1);
    if (selector.startsWith('@media')) {
      rules.push(...parse(content, selector));
    } else {
      const declarations = {};
      for (const declaration of content.split(';').filter(item => item.trim())) {
        const colon = declaration.indexOf(':');
        assert.ok(colon > 0, declaration);
        declarations[declaration.slice(0, colon).trim()] = declaration.slice(colon + 1).trim().replace(/\s+/g, ' ');
      }
      rules.push({ selector, media, declarations });
    }
    cursor = close;
  }
  return rules;
}
const rules = parse(css);
function active(media, width) {
  return [...media.matchAll(/(min|max)-width:\s*([\d.]+)px/g)]
    .every(([, bound, number]) => bound === 'min' ? width >= +number : width <= +number);
}
function value(selector, property, width) {
  let result;
  for (const rule of rules) {
    if (rule.selector === selector && active(rule.media, width) && property in rule.declarations) {
      result = rule.declarations[property];
    }
  }
  return result;
}
const grids = 'body.customer-refresh :is(.commerce-product-grid, .brand-hall-grid)';

test('CSS is balanced, scoped to customer catalogue, and viewport-only', () => {
  assert.ok(rules.length > 60);
  assert.doesNotMatch(css, /pointer|hover:|is-mobile-device|@import|url\(|100vw/);
  for (const rule of rules) {
    assert.ok(rule.selector.startsWith('body.customer-refresh '), rule.selector);
    assert.doesNotMatch(rule.selector, /topbar|footer|mobile-nav|wizard|#customerPage|\.home-/);
    assert.doesNotMatch(rule.declarations['min-width'] || '', /^(?:[5-9]\d|\d{3,})px$/);
  }
});

for (const width of [320, 344, 360, 375, 379, 379.99, 380, 390, 414, 540, 700, 760, 760.5, 761, 768, 820, 853, 899, 900, 1024, 1100, 1100.5, 1101, 1280, 1440, 1920]) {
  test(`grid contract at ${width}px (phone/Fold/tablet/PC boundaries)`, () => {
    const columns = value(grids, 'grid-template-columns', width);
    if (width < 380) assert.equal(columns, 'minmax(0, 1fr)');
    else if (width <= 760) assert.equal(columns, 'repeat(2, minmax(0, 1fr))');
    else if (width <= 1100) {
      assert.equal(columns, 'repeat(auto-fill, minmax(min(100%, 260px), 1fr))');
      const available = width - 48;
      const count = Math.floor((available + 20) / (260 + 20));
      assert.ok(count >= 2 && count <= 3);
      assert.ok(count * 260 + (count - 1) * 20 <= available);
    } else assert.equal(columns, undefined, 'desktop grid must inherit existing styles');
  });
}

test('Fold inner and tablets have no catalogue sidebar or fixed-width tools', () => {
  for (const width of [761, 820, 853, 900, 1024, 1100]) {
    assert.equal(value('body.customer-refresh .commerce-main', 'grid-template-columns', width), 'minmax(0, 1fr)');
    assert.equal(value('body.customer-refresh .commerce-category-grid', 'flex-wrap', width), 'wrap');
    assert.equal(value('body.customer-refresh .commerce-category-grid', 'position', width), 'static');
  }
  assert.match(css, /\.commerce-tools:not\(:has\(#commerceSort\)\)/);
  assert.match(css, /\.commerce-tools input \{ grid-column: 1 \/ -1/);
});

test('logo selectors stay two parallel columns even below 380px', () => {
  const selector = 'body.customer-refresh .pq-brand-selectors';
  for (const width of [320, 344, 379.99, 380, 760, 853, 1100, 1440]) {
    assert.equal(value(selector, 'grid-template-columns', width), 'repeat(2, minmax(0, 1fr))');
  }
  assert.match(read('public/brand/index.html'), /class="pq-retail-logo"/);
  assert.match(css, /\.pq-retail-logo img \{ width: auto; max-width: 100%/);
});

test('all four modals use keyboard viewport height, safe areas and independent scrolling', () => {
  for (const name of ['brand-detail', 'brand-consult', 'commerce-product', 'subscription-consultation']) {
    const overlay = rules.find(rule => !rule.media && rule.selector.includes(`.${name}-modal`) && rule.declarations['--catalog-modal-height']);
    assert.ok(overlay, name);
    assert.equal(overlay.declarations.height, 'var(--customer-viewport-height, 100dvh)');
    assert.equal(overlay.declarations['max-height'], 'var(--customer-viewport-height, 100dvh)');
    assert.match(overlay.declarations['--catalog-modal-height'], /safe-area-inset-top/);
    assert.match(overlay.declarations['--catalog-modal-height'], /safe-area-inset-bottom/);
    assert.match(overlay.declarations.padding, /safe-area-inset-left/);
    assert.match(overlay.declarations.padding, /safe-area-inset-right/);
    const dialog = rules.find(rule => rule.selector.includes(`.${name}-dialog`) && rule.declarations['overflow-y']);
    assert.equal(dialog.declarations['overflow-y'], 'auto');
    assert.equal(dialog.declarations['overscroll-behavior'], 'contain');
    assert.equal(dialog.declarations['max-height'], 'var(--catalog-modal-height)');
    assert.ok(rules.some(rule => rule.selector.includes(`.${name}-modal`) && rule.selector.endsWith('[hidden]') && rule.declarations.display === 'none !important'));
  }
});

test('controls, Korean wrapping, contrast and flat detail sections are explicit', () => {
  assert.ok(rules.some(rule => rule.selector.endsWith(':is(input, select, textarea)') && rule.declarations['font-size'] === '16px'));
  assert.ok(rules.some(rule => rule.selector.endsWith(':is(button, a, summary)') && rule.declarations['min-height'] === '44px'));
  assert.ok(rules.some(rule => rule.declarations['word-break'] === 'keep-all' && rule.declarations['overflow-wrap'] === 'anywhere'));
  const close = rules.find(rule => rule.selector === 'body.customer-refresh .brand-detail-close');
  assert.equal(close.declarations.color, '#fff');
  const sections = rules.find(rule => rule.selector.includes('.commerce-detail-sections > section') && rule.declarations['box-shadow']);
  assert.equal(sections.declarations.border, '0');
  assert.equal(sections.declarations.background, 'none');
  assert.equal(sections.declarations['border-radius'], '0');
});

test('existing API-bound selectors and hidden states are left intact', () => {
  const brand = read('public/brand/index.html');
  const commerce = read('public/commerce/commerce.js');
  for (const name of ['brand-detail-dialog', 'brand-detail-close']) assert.ok(brand.includes(name), name);
  for (const name of ['commerce-product-dialog', 'subscription-consultation-dialog', 'commerceDetailOption', 'commerceAffiliateCard']) assert.ok(commerce.includes(name), name);
  assert.doesNotMatch(css, /data-card-option|data-verified|subscription-code-field\s*\{[^}]*display:/);
});

test('viewport height contract reserves safe areas in portrait, landscape and keyboard states', () => {
  const selector = rules.find(rule => rule.declarations['--catalog-modal-height']);
  assert.equal(selector.declarations['--catalog-modal-height'],
    'calc(var(--customer-viewport-height, 100dvh) - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px) - var(--catalog-modal-gap) - var(--catalog-modal-gap))');
  for (const [width, height, top, bottom] of [
    [320, 568, 0, 0], [390, 844, 47, 34], [844, 390, 0, 21],
    [390, 320, 47, 34], [344, 882, 0, 24], [853, 690, 0, 24],
    [768, 1024, 24, 20], [1024, 768, 24, 20], [1440, 900, 0, 0],
  ]) {
    const gap = width <= 760 ? 8 : 16;
    const scrollportLimit = height - top - bottom - gap * 2;
    assert.ok(scrollportLimit > 0);
    assert.equal(scrollportLimit + top + bottom + gap * 2, height);
  }
});
