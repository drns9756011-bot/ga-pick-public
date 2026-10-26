const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync, statSync } = require('node:fs');
const read = file => readFileSync(`public/${file}`, 'utf8');

test('showcase preserves quote starts and places evidence before brand discovery', () => {
  for (const file of ['index.html', 'quote/index.html', 'my-quote/index.html']) {
    const html = read(file);
    assert.match(html, /home-showcase.css\?v=20261026-launch/);
    assert.match(html, /class="pq-home pq-launch"/);
    assert.match(html, /data-home-quote-mode="with_quote"/);
    assert.match(html, /data-home-quote-mode="without_quote"/);
    assert.equal((html.match(/id="homeCaseStudy"/g) || []).length, 1);
    assert.ok(html.indexOf('id="homeCaseStudy"') < html.indexOf('pq-section pq-discover'));
    assert.match(html, /href="\/subscription"/);
    assert.match(html, /href="\/shopping"/);
  }
  assert.ok(statSync('public/assets/appliance-showcase-20261026.webp').size < 160000);
});

test('showcase is scoped to home and keeps readable mobile controls and safe area', () => {
  const css = read('home-showcase.css');
  assert.match(css, /:has\(#homePage.is-active \.pq-launch\) \.topbar/);
  assert.match(css, /env\(safe-area-inset-top,0px\)/);
  assert.match(css, /object-fit: contain/);
  assert.match(css, /min-height: 48px/);
  assert.doesNotMatch(css, /letter-spacing:\s*-/);
  assert.match(css, /transform-origin: center bottom/);
  assert.match(read('customer-motion.js'), /scene.style.transform = `scale\(/);
});
