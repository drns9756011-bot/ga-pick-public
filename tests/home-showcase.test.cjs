const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync, statSync } = require('node:fs');
const read = file => readFileSync(`public/${file}`, 'utf8');

test('showcase preserves quote starts and places evidence before brand discovery', () => {
  for (const file of ['index.html', 'quote/index.html', 'my-quote/index.html']) {
    const html = read(file);
    assert.match(html, /home-showcase.css\?v=20261027-bold-actions/);
    assert.match(html, /class="pq-home pq-launch"/);
    assert.match(html, /data-home-quote-mode="with_quote"/);
    assert.match(html, /data-home-quote-mode="without_quote"/);
    assert.equal((html.match(/id="homeCaseStudy"/g) || []).length, 1);
    assert.ok(html.indexOf('id="homeCaseStudy"') < html.indexOf('pq-section pq-discover'));
    assert.match(html, /href="\/subscription"/);
    assert.match(html, /href="\/shopping"/);
  }
  assert.ok(statSync('public/assets/home-appliances-official-20261026.webp').size < 160000);
});

test('showcase is scoped to home and keeps readable mobile controls and safe area', () => {
  const css = read('home-showcase.css');
  assert.match(css, /body\.customer-refresh \.pq-launch \.pq-primary:not\(\.pq-primary-secondary\) \{[^}]*font-weight: 800/);
  assert.match(css, /\.pq-launch \.pq-primary-secondary \{[^}]*font-weight: 800/);
  assert.match(css, /:has\(#homePage.is-active \.pq-launch\) \.topbar/);
  assert.match(css, /env\(safe-area-inset-top,0px\)/);
  assert.match(css, /object-fit: contain/);
  assert.match(css, /min-height: 48px/);
  assert.doesNotMatch(css, /letter-spacing:\s*-/);
  assert.match(css, /transform-origin: center bottom/);
  assert.match(read('customer-motion.js'), /scene.style.transform = `scale\(/);
});

test('wide desktop retains its composition without clipping narrower windows', () => {
  const css = read('home-showcase.css');
  assert.match(css, /\.pq-hero h1 \{ width: 100%; max-width: none; margin-inline: auto/);
  assert.match(css, /@media \(min-width: 1101px\)/);
  assert.doesNotMatch(css, /min-width: 1200px/);
  assert.match(css, /\.pq-hero-inner \{ width: 1000px/);
  assert.match(css, /@media\(max-width:760px\)/);
});

test('mobile section copy and secondary action share a centered alignment', () => {
  const css = read('home-showcase.css');
  assert.match(css, /\.pq-primary-secondary \{ justify-content: center; text-align: center/);
  assert.match(css, /\.pq-section-head \{ flex-direction: column; align-items: center; justify-content: center; text-align: center/);
  assert.match(css, /\.pq-process-grid article \{ align-items: center; text-align: center/);
  assert.match(css, /\.pq-faq > h2 \{ grid-column: 1 \/ -1/);
});

test('subscription and shopping titles share the brand column centers at every breakpoint', () => {
  const css = read('home-showcase.css');
  const responsive = read('customer-responsive.css');
  assert.match(css, /\.pq-more-paths a \{ display: grid; grid-template-columns: minmax\(0,1fr\); justify-items: center; align-content: start/);
  assert.doesNotMatch(css, /\.pq-more-paths a \{[^}]*flex-/);
  for (const gap of [16,24]) {
    assert.ok(responsive.includes(`.pq-launch .pq-entry-grid,.pq-launch .pq-more-paths { gap: ${gap}px; }`));
  }
  for (const selector of ['pq-entry-grid','pq-more-paths']) {
    assert.match(css, new RegExp(`\\.pq-launch \\.${selector} \\{[^}]*gap: 44px`));
  }
});
