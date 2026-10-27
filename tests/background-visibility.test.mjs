import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

test('backgrounding never covers the page and returning clears stale covers', () => {
  const source = readFileSync(new URL('../public/app.js', import.meta.url), 'utf8');
  const block = source.slice(source.indexOf('document.addEventListener("visibilitychange", () => {'), source.indexOf('function renderRequests()'));
  const events = {}, document = { hidden: true, addEventListener: (name, fn) => { events[name] = fn; } };
  let shown = 0, hidden = 0;
  vm.runInNewContext(block, { document, window: { addEventListener: (name, fn) => { events[name] = fn; } }, showSecurityBlanket: () => shown++, hideSecurityBlanket: () => hidden++ });
  events.visibilitychange();
  events.blur?.();
  assert.equal(shown, 0);
  assert.equal(events.blur, undefined);
  document.hidden = false;
  events.visibilitychange();
  events.focus();
  assert.equal(hidden, 2);
  events.beforeprint();
  assert.equal(shown, 1);
  events.afterprint();
  assert.equal(hidden, 3);
});
