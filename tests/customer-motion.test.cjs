const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const vm = require('node:vm');
const source = readFileSync('public/customer-motion.js', 'utf8');

test('reduced motion leaves content untouched and creates no observer', () => {
  vm.runInNewContext(source, { window: { matchMedia: () => ({ matches: true }) } });
});

test('scroll motion observes only public presentation elements and plays once', () => {
  let callback, change, observed = 0, unobserved = 0, cancelled = 0, disconnected = 0;
  const preference = { matches: false, addEventListener: (_, fn) => { change = fn; } };
  const element = { animate: (frames, timing) => {
    assert.equal(frames.at(-1).opacity, 1);
    assert.equal(timing.duration, 420);
    return { finished: new Promise(() => {}), cancel: () => cancelled++ };
  } };
  class Observer {
    constructor(fn) { callback = fn; }
    observe() { observed++; }
    unobserve() { unobserved++; }
    disconnect() { disconnected++; }
  }
  vm.runInNewContext(source, {
    window: { matchMedia: () => preference, IntersectionObserver: Observer },
    IntersectionObserver: Observer,
    document: { querySelectorAll: selector => {
      assert.ok(selector.split(', ').every(part => part.startsWith('#homePage ')));
      return [element];
    } },
  });
  assert.equal(observed, 1);
  callback([{ isIntersecting: false, target: element }]);
  assert.equal(unobserved, 0);
  callback([{ isIntersecting: true, target: element }]);
  assert.equal(unobserved, 1);
  preference.matches = true;
  change();
  assert.equal(cancelled, 1);
  assert.equal(disconnected, 1);
});
