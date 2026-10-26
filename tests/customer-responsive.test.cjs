const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const read = file => fs.readFileSync(`public/${file}`, 'utf8');

test('all customer pages share the final responsive contract and dialog lifecycle', () => {
  for (const page of ['index.html','quote/index.html','my-quote/index.html','brand/index.html','subscription/index.html','shopping/index.html','privacy/index.html']) {
    const html = read(page);
    for (const file of ['customer-responsive.css','customer-catalog-responsive.css','customer-dialogs.js']) assert.ok(html.includes(`/${file}?v=20261026-device-audit`), `${page}: ${file}`);
    assert.ok(html.indexOf('customer-responsive.css') > html.indexOf('customer-mobile.css'));
    assert.ok(html.indexOf('customer-catalog-responsive.css') > html.indexOf('customer-responsive.css'));
  }
});

test('viewport breakpoints do not misclassify foldables and hybrid input tablets', () => {
  for (const file of ['customer-mobile.css','customer-ui.css','home-showcase.css','customer-responsive.css','customer-catalog-responsive.css']) {
    const css = read(file);
    assert.doesNotMatch(css, /pointer:\s*coarse/);
    assert.doesNotMatch(css, /min-width:\s*1200px/);
  }
  const css = read('customer-responsive.css');
  assert.match(css, /max-width: 1100px/);
  assert.match(css, /min-width: 761px/);
  assert.match(css, /max-width: 760px/);
  assert.match(css, /grid-template-columns: repeat\(2,minmax\(0,1fr\)\)/);
  assert.match(css, /\.pick-case-feature > strong \{ font-size: 20px; white-space: nowrap/);
  assert.match(css, /wizard-choice-card:focus-within/);
  assert.match(css, /input\[type=radio\].*width: 1px; height: 1px/);
});

test('keyboard and safe areas reserve usable space without disabling browser zoom', () => {
  const css = read('customer-responsive.css');
  for (const side of ['top','bottom','left','right']) assert.ok(css.includes(`safe-area-inset-${side}`));
  assert.match(css, /var\(--customer-viewport-height,100dvh\)/);
  assert.match(css, /mobile-keyboard-open.*wizard-actions \{ position: static/);
  const js = read('customer-mobile.js');
  assert.doesNotMatch(js, /scale === 1|pointer: coarse/);
  assert.match(js, /viewport.height \* scale/);
  assert.match(js, /--customer-viewport-top/);
});

test('changing subscription options preserves focus and dialog scroll', () => {
  const js = read('commerce/commerce.js');
  assert.match(js, /restoreFocusId = ''/);
  assert.match(js, /activeCardIndex, 'commerceDetailOption'/);
  assert.match(js, /Number\(event.target.value \|\| 0\), 'commerceAffiliateCard'/);
  assert.match(js, /focusTarget\?\.focus\(\{ preventScroll: true \}\)/);
  assert.match(js, /dialog.scrollTop = previousScroll/);
});
