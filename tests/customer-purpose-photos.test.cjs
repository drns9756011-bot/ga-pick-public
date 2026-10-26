const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync('public/customer-wizard.js', 'utf8');
const start = source.indexOf('  const purposeOptions =');
const options = source.slice(start, source.indexOf('];', start) + 2);
const card = source.slice(source.indexOf('  function choiceCard('), source.indexOf('  function chip('));
const context = vm.createContext({ escapeHtml: value => String(value).replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;') });
vm.runInContext(`${options}\n${card}\nglobalThis.options = purposeOptions;`, context);

test('all five purposes have distinct lightweight local WebP photos without changing submitted values', () => {
  assert.equal(context.options.map(item => item.value).join('|'), '웨딩,혼수 특별혜택|신축입주 특별혜택|이사|인테리어|일반');
  assert.equal(new Set(context.options.map(item => item.thumbnail)).size, 5);
  let total = 0;
  for (const item of context.options) {
    const bytes = fs.readFileSync(`public/assets/purpose-${item.thumbnail}-20261026.webp`);
    assert.equal(bytes.toString('ascii', 0, 4), 'RIFF');
    assert.equal(bytes.toString('ascii', 8, 12), 'WEBP');
    assert.ok(bytes.length < 15000);
    total += bytes.length;
    const html = context.choiceCard(item, 'wizardPurposeProxy', item.value);
    assert.match(html, /has-purpose-photo/);
    assert.match(html, /alt="" width="72" height="72"/);
    assert.match(html, /checked data-choice-name="wizardPurposeProxy"/);
    assert.equal(html.includes('<em>특별혜택</em>'), Boolean(item.badge));
  }
  assert.ok(total < 35000);
});

test('non-purpose choices retain their original photo-free layout', () => {
  const html = context.choiceCard({ value: '삼성전자', title: '삼성전자' }, 'wizardBrandProxy', 'LG전자');
  assert.doesNotMatch(html, /<img|has-purpose-photo|checked data-choice/);
});

test('purpose photos have constrained desktop and touch-only mobile sizing', () => {
  const css = fs.readFileSync('public/customer-ui.css', 'utf8');
  assert.match(css, /grid-template-columns: 22px 72px minmax\(0,1fr\) auto/);
  assert.match(css, /grid-template-columns: 22px 56px minmax\(0,1fr\) auto/);
  assert.match(css, /grid-template-columns: 22px 48px minmax\(0,1fr\) auto/);
  assert.match(css, /\.wizard-purpose-photo.*object-fit: cover/);
});
