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
    assert.equal(timing.duration, 1100);
    assert.equal(frames[0].opacity, 1);
    assert.equal(frames[0].transform, 'translateY(24px)');
    return { finished: new Promise(() => {}), cancel: () => cancelled++ };
  } };
  class Observer {
    constructor(fn, options) {
      callback = fn;
      assert.equal(options.rootMargin, '-88px 0px -80px 0px');
      assert.equal(options.threshold, 0.08);
    }
    observe() { observed++; }
    unobserve() { unobserved++; }
    disconnect() { disconnected++; }
  }
  vm.runInNewContext(source, {
    window: { matchMedia: query => query.includes('reduced-motion') ? preference : { matches: false }, IntersectionObserver: Observer },
    IntersectionObserver: Observer,
    requestAnimationFrame: () => 1,
    document: { querySelector: () => null, querySelectorAll: selector => {
      assert.ok(selector.split(', ').every(part => part.startsWith('#homePage ') || ['.pq-catalog-head', '.pq-brand-selectors', '.commerce-tools'].includes(part)));
      return [element];
    } },
  });
  assert.equal(observed, 1);
  callback([{ isIntersecting: false, target: element }]);
  assert.equal(unobserved, 0);
  callback([{ isIntersecting: true, intersectionRatio: 0.02, target: element }]);
  assert.equal(unobserved, 0);
  callback([{ isIntersecting: true, intersectionRatio: 0.2, target: element }]);
  assert.equal(unobserved, 1);
  preference.matches = true;
  change();
  assert.equal(cancelled, 1);
  assert.equal(disconnected, 1);
});

test('mobile reveal remains noticeable without extending beyond a second', () => {
  let callback, duration;
  const preference = { matches: false, addEventListener() {} };
  const element = { animate: (_, timing) => {
    duration = timing.duration;
    return { finished: Promise.resolve() };
  } };
  class Observer {
    constructor(fn) { callback = fn; }
    observe() {}
    unobserve() {}
  }
  vm.runInNewContext(source, {
    window: { matchMedia: query => query.includes('reduced-motion') ? preference : { matches: true }, IntersectionObserver: Observer },
    IntersectionObserver: Observer,
    document: { querySelector: () => null, querySelectorAll: () => [element] },
  });
  callback([{ isIntersecting: true, intersectionRatio: 0.2, target: element }]);
  assert.equal(duration, 900);
});
