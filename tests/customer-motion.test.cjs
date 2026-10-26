const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const vm = require('node:vm');
const source = readFileSync('public/customer-motion.js', 'utf8');

function harness({ mobile = false, original = '', fail = false } = {}) {
  let callback, change, finish, focused, observed = 0, unobserved = 0, cancelled = 0, disconnected = 0;
  const values = new Map(original ? [['opacity', original]] : []);
  const preference = { matches: false, addEventListener: (_, fn) => { change = fn; } };
  const plays = [];
  const element = {
    style: {
      getPropertyValue: key => values.get(key) || '', getPropertyPriority: () => '',
      setProperty: (key, value) => values.set(key, value), removeProperty: key => values.delete(key),
    },
    contains: target => target === element,
    animate: (frames, timing) => {
      if (fail) throw new Error('unsupported animation');
      plays.push({ frames, timing });
      return { finished: new Promise(resolve => { finish = resolve; }), cancel: () => cancelled++ };
    },
  };
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
    window: { matchMedia: query => query.includes('reduced-motion') ? preference : { matches: mobile }, IntersectionObserver: Observer },
    IntersectionObserver: Observer,
    requestAnimationFrame: () => 1,
    document: {
      querySelector: () => null,
      addEventListener: (name, handler) => { if (name === 'focusin') focused = handler; },
      querySelectorAll: selector => {
        assert.ok(selector.split(', ').every(part => part.startsWith('#homePage ') || ['.pq-catalog-head', '.pq-brand-selectors'].includes(part)));
        return [element];
      },
    },
  });
  return {
    element, preference, plays, values,
    enter: (ratio = .2) => callback([{ isIntersecting: ratio > 0, intersectionRatio: ratio, target: element }]),
    reduce: () => { preference.matches = true; change(); },
    focus: () => focused({ target: element }),
    finish: async () => { finish(); await new Promise(resolve => setImmediate(resolve)); },
    stats: () => ({ observed, unobserved, cancelled, disconnected }),
  };
}

test('reduced motion and unsupported observers leave content untouched', () => {
  vm.runInNewContext(source, { window: { matchMedia: () => ({ matches: true }) } });
  vm.runInNewContext(source, { window: { matchMedia: () => ({ matches: false }) } });
});

test('reveal begins invisible, rises 56px over two seconds, and plays once', async () => {
  const h = harness();
  assert.equal(h.values.get('opacity'), '0');
  h.enter(0); h.enter(.02);
  assert.equal(h.plays.length, 0);
  h.enter(); h.enter();
  assert.equal(h.plays.length, 1);
  assert.equal(h.plays[0].frames[0].opacity, 0);
  assert.equal(h.plays[0].frames[0].transform, 'translateY(56px)');
  assert.equal(h.plays[0].frames.at(-1).opacity, 1);
  assert.equal(h.plays[0].timing.duration, 2000);
  assert.equal(h.plays[0].timing.fill, 'both');
  await h.finish();
  assert.equal(h.values.has('opacity'), false);
  h.enter();
  assert.equal(h.plays.length, 1);
});

test('mobile uses a deliberate 1.8 second reveal', () => {
  const h = harness({ mobile: true }); h.enter();
  assert.equal(h.plays[0].timing.duration, 1800);
});

test('reduced motion restores waiting content and cancels active animation', () => {
  const waiting = harness({ original: '.8' }); waiting.reduce();
  assert.equal(waiting.values.get('opacity'), '.8');
  const playing = harness(); playing.enter(); playing.reduce();
  assert.equal(playing.values.has('opacity'), false);
  assert.equal(playing.stats().cancelled, 1);
  assert.equal(playing.stats().disconnected, 1);
});

test('keyboard focus reveals a waiting or animating link immediately', () => {
  const waiting = harness(); waiting.focus(); waiting.enter();
  assert.equal(waiting.values.has('opacity'), false);
  assert.equal(waiting.plays.length, 0);
  const playing = harness(); playing.enter(); playing.focus();
  assert.equal(playing.values.has('opacity'), false);
  assert.equal(playing.stats().cancelled, 1);
});

test('failed animation cannot leave content hidden', () => {
  const h = harness({ fail: true }); h.enter();
  assert.equal(h.values.has('opacity'), false);
});
