const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const vm = require('node:vm');
const sandbox = { module: { exports: {} } };
vm.runInNewContext(readFileSync(join(__dirname, '../public/customer-dialogs.js'), 'utf8'), sandbox);
const { install, visible, focusables } = sandbox.module.exports;

// Small DOM double: no dependencies, layout engine, network, or customer data.
function harness() {
  const listeners = new Map();
  const observers = [];
  const doc = {
    addEventListener(type, handler) {
      if (!listeners.has(type)) listeners.set(type, new Set());
      listeners.get(type).add(handler);
    },
    removeEventListener(type, handler) { listeners.get(type)?.delete(handler); },
    querySelectorAll(selector) { return doc.body.querySelectorAll(selector); },
  };
  function dispatch(type, target, options = {}) {
    const event = {
      target, ...options, defaultPrevented: false, stopped: false,
      preventDefault() { this.defaultPrevented = true; },
      stopImmediatePropagation() { this.stopped = true; },
    };
    for (const handler of listeners.get(type) || []) {
      handler(event);
      if (event.stopped) break;
    }
    return event;
  }
  class Element {
    constructor(tag, attrs = {}) {
      this.tagName = tag.toUpperCase();
      this.attrs = new Map(Object.entries(attrs));
      this.children = [];
      this.parentElement = null;
      this.style = {};
      this.checked = false;
      this.form = null;
      this.clicks = 0;
    }
    get isConnected() { return this === doc.body || Boolean(this.parentElement?.isConnected); }
    get hidden() { return this.hasAttribute('hidden'); }
    set hidden(value) { if (value) this.setAttribute('hidden', ''); else this.removeAttribute('hidden'); }
    get name() { return this.getAttribute('name') || ''; }
    get tabIndex() {
      if (this.hasAttribute('tabindex')) return Number(this.getAttribute('tabindex'));
      return /^(BUTTON|INPUT|SELECT|TEXTAREA|SUMMARY)$/.test(this.tagName) || this.hasAttribute('href') ? 0 : -1;
    }
    setAttribute(name, value) { this.attrs.set(name, String(value)); }
    getAttribute(name) { return this.attrs.has(name) ? this.attrs.get(name) : null; }
    hasAttribute(name) { return this.attrs.has(name); }
    removeAttribute(name) { this.attrs.delete(name); }
    append(...children) { for (const child of children) { child.remove(); child.parentElement = this; this.children.push(child); } }
    remove() {
      if (this.parentElement) this.parentElement.children = this.parentElement.children.filter(child => child !== this);
      this.parentElement = null;
    }
    contains(node) { return node === this || this.children.some(child => child.contains(node)); }
    matches(selector) {
      return selector.split(',').some(part => {
        const token = part.trim();
        if (token === ':disabled') return this.hasAttribute('disabled') || Boolean(this.parentElement?.matches('fieldset[disabled]'));
        if (token.startsWith('#')) return this.getAttribute('id') === token.slice(1);
        if (token.startsWith('.')) return (this.getAttribute('class') || '').split(' ').includes(token.slice(1));
        const match = /^(\w+)?(?:\[([\w-]+)(?:="([^"]*)")?\])?$/.exec(token);
        return Boolean(match && (!match[1] || this.tagName === match[1].toUpperCase()) && (!match[2] || (this.hasAttribute(match[2]) && (match[3] === undefined || this.getAttribute(match[2]) === match[3]))));
      });
    }
    closest(selector) { for (let node = this; node; node = node.parentElement) if (node.matches(selector)) return node; return null; }
    querySelectorAll(selector) {
      return this.children.flatMap(child => [...(child.matches(selector) ? [child] : []), ...child.querySelectorAll(selector)]);
    }
    querySelector(selector) { return this.querySelectorAll(selector)[0] || null; }
    getClientRects() { return this.isConnected && !this.style.noRects ? [{}] : []; }
    focus() { doc.activeElement = this; dispatch('focusin', this); }
    click() { this.clicks++; dispatch('click', this); this.onClick?.(); }
  }
  doc.body = new Element('body');
  doc.activeElement = doc.body;
  const win = {
    getComputedStyle: node => ({ display: node.style.display || 'block', visibility: node.style.visibility || 'visible' }),
    MutationObserver: class {
      constructor(callback) { this.callback = callback; observers.push(this); }
      observe(target, options) { this.target = target; this.options = options; }
      disconnect() { this.disconnected = true; }
    },
  };
  const element = (tag, attrs) => new Element(tag, attrs);
  const trigger = element('button');
  doc.body.append(trigger);
  trigger.focus();
  function modal(id = 'consultModal', closeClass = 'brand-consult-close', parent = doc.body) {
    const overlay = element('div', { id, hidden: '' });
    const backdrop = element('div');
    const panel = element('section', { role: 'dialog' });
    const close = element('button', { class: closeClass });
    const heading = element('h2');
    const input = element('input');
    const submit = element('button');
    panel.append(close, heading, input, submit);
    overlay.append(backdrop, panel);
    parent.append(overlay);
    close.onClick = () => { overlay.hidden = true; };
    return { overlay, backdrop, panel, close, heading, input, submit };
  }
  const flush = () => { for (const observer of observers) if (!observer.disconnected) observer.callback([]); };
  return { doc, win, element, trigger, modal, dispatch, flush, observers };
}

test('opening focuses close without input autofocus, isolates ancestor siblings, preserves backdrop clicks', () => {
  const h = harness();
  const shell = h.element('main');
  const content = h.element('article');
  const preserved = h.element('aside', { inert: 'original' });
  h.doc.body.append(shell, preserved);
  shell.append(content);
  const m = h.modal('consultModal', 'brand-consult-close', shell);
  install(h.doc, h.win);
  m.overlay.hidden = false;
  h.flush();
  assert.equal(h.doc.activeElement, m.close);
  assert.equal(content.hasAttribute('inert'), true);
  assert.equal(h.trigger.hasAttribute('inert'), true);
  assert.equal(m.backdrop.hasAttribute('inert'), false);
  m.input.focus();
  assert.equal(h.doc.activeElement, m.close, 'delayed app autofocus is redirected');
  h.dispatch('pointerdown', m.input);
  m.input.focus();
  assert.equal(h.doc.activeElement, m.input, 'user can enter a field normally');
  m.close.click();
  h.flush();
  assert.equal(h.doc.activeElement, h.trigger);
  assert.equal(content.hasAttribute('inert'), false);
  assert.equal(h.trigger.hasAttribute('inert'), false);
  assert.equal(preserved.getAttribute('inert'), 'original');
});

test('Tab wraps both ways, skips disabled/hidden controls, and contains external focus', () => {
  const h = harness();
  const m = h.modal();
  const disabled = h.element('button', { disabled: '' });
  const hidden = h.element('button', { hidden: '' });
  m.panel.append(disabled, hidden);
  install(h.doc, h.win);
  m.overlay.hidden = false;
  h.flush();
  assert.equal(h.dispatch('keydown', m.close, { key: 'Tab', shiftKey: true }).defaultPrevented, true);
  assert.equal(h.doc.activeElement, m.submit);
  assert.equal(h.dispatch('keydown', m.submit, { key: 'Tab' }).defaultPrevented, true);
  assert.equal(h.doc.activeElement, m.close);
  h.trigger.focus();
  assert.equal(h.doc.activeElement, m.close);
});

test('nested Escape clicks only the top close and restores nested then original trigger', () => {
  const h = harness();
  const outer = h.modal();
  const inner = h.modal('privacyPolicyModal', 'privacy-policy-close', outer.panel);
  const controller = install(h.doc, h.win);
  assert.equal(install(h.doc, h.win), controller, 'installation is idempotent');
  outer.overlay.hidden = false;
  h.flush();
  h.dispatch('pointerdown', outer.submit);
  outer.submit.focus();
  inner.overlay.hidden = false;
  h.flush();
  assert.equal(h.doc.activeElement, inner.close);
  assert.equal(outer.submit.hasAttribute('inert'), true);
  const escape = h.dispatch('keydown', inner.close, { key: 'Escape' });
  assert.equal(escape.stopped, true);
  assert.equal(inner.close.clicks, 1);
  assert.equal(outer.close.clicks, 0);
  assert.equal(h.doc.activeElement, outer.submit);
  h.dispatch('keydown', outer.submit, { key: 'Escape' });
  assert.equal(outer.close.clicks, 1);
  assert.equal(h.doc.activeElement, h.trigger);
});

test('rerender keeps surviving focus and recovers when the focused subtree is replaced', () => {
  const h = harness();
  const m = h.modal();
  install(h.doc, h.win);
  m.overlay.hidden = false;
  h.flush();
  h.dispatch('pointerdown', m.input);
  m.input.focus();
  m.heading.append(h.element('span'));
  h.flush();
  assert.equal(h.doc.activeElement, m.input);
  m.input.remove();
  h.flush();
  assert.equal(h.doc.activeElement, m.close);
  const replacement = h.element('section', { role: 'dialog' });
  const heading = h.element('h2');
  replacement.append(heading);
  m.panel.remove();
  m.overlay.append(replacement);
  h.flush();
  assert.equal(h.doc.activeElement, heading);
  assert.equal(heading.getAttribute('tabindex'), '-1');
  const escape = h.dispatch('keydown', heading, { key: 'Escape' });
  assert.equal(escape.stopped, false, 'no invented close behavior');
  assert.equal(m.overlay.hidden, false);
  assert.equal(h.dispatch('keydown', heading, { key: 'Tab' }).defaultPrevented, true);
  m.overlay.remove();
  h.flush();
  assert.equal(h.doc.activeElement, h.trigger);
  assert.equal(heading.hasAttribute('tabindex'), false);
});

test('sibling overlay nesting restores parent focus and keeps existing inert values', () => {
  const h = harness();
  const outer = h.modal();
  const inner = h.modal('privacyPolicyModal', 'privacy-policy-close');
  const preserved = h.element('div', { inert: 'keep' });
  h.doc.body.append(preserved);
  install(h.doc, h.win);
  outer.overlay.hidden = false;
  h.flush();
  outer.submit.focus();
  inner.overlay.hidden = false;
  h.flush();
  assert.equal(h.doc.activeElement, inner.close);
  assert.equal(outer.overlay.hasAttribute('inert'), true);
  h.dispatch('keydown', inner.close, { key: 'Escape' });
  assert.equal(h.doc.activeElement, outer.submit);
  assert.equal(outer.overlay.hasAttribute('inert'), false);
  assert.equal(preserved.getAttribute('inert'), 'keep');
  h.dispatch('keydown', outer.submit, { key: 'Escape' });
  assert.equal(preserved.getAttribute('inert'), 'keep');
});

test('replacement dialog inherits the original trigger when its launching dialog closes', () => {
  const h = harness();
  const detail = h.modal('packageDetailModal', 'brand-detail-close');
  const consult = h.modal();
  install(h.doc, h.win);
  detail.overlay.hidden = false;
  h.flush();
  h.dispatch('click', detail.submit);
  detail.overlay.hidden = true;
  consult.overlay.hidden = false;
  h.flush();
  assert.equal(h.doc.activeElement, consult.close);
  h.dispatch('keydown', consult.close, { key: 'Escape' });
  assert.equal(h.doc.activeElement, h.trigger);
});

test('hidden or disconnected triggers are never restored and disconnect restores inert state', () => {
  for (const detach of [false, true]) {
    const h = harness();
    const m = h.modal();
    const controller = install(h.doc, h.win);
    m.overlay.hidden = false;
    h.flush();
    if (detach) h.trigger.remove();
    else h.trigger.hidden = true;
    m.overlay.hidden = true;
    h.doc.activeElement = h.doc.body;
    h.flush();
    assert.equal(h.doc.activeElement, h.doc.body);
    m.overlay.hidden = false;
    h.flush();
    controller.disconnect();
    assert.equal(h.trigger.hasAttribute('inert'), false);
    assert.equal(h.observers[0].disconnected, true);
  }
});

test('focus helpers filter visibility and radio groups, respecting positive tabindex', () => {
  const h = harness();
  const panel = h.element('section');
  const a = h.element('input', { type: 'radio', name: 'choice' });
  const b = h.element('input', { type: 'radio', name: 'choice' });
  const early = h.element('button', { tabindex: '2' });
  b.checked = true;
  panel.append(a, b, early);
  h.doc.body.append(panel);
  assert.deepEqual(Array.from(focusables(panel, h.win)), [early, b]);
  panel.style.visibility = 'hidden';
  assert.equal(visible(b, h.win), false);
  panel.style.visibility = 'visible';
  panel.setAttribute('inert', '');
  assert.equal(visible(b, h.win), false);
  assert.equal(visible(b, h.win, false), true);
});

test('observer only watches hidden/class and childList, and document scans only named overlays', () => {
  const h = harness();
  const scanned = [];
  const original = h.doc.querySelectorAll;
  h.doc.querySelectorAll = selector => { scanned.push(selector); return original(selector); };
  install(h.doc, h.win);
  h.flush();
  assert.deepEqual(JSON.parse(JSON.stringify(h.observers[0].options)), {
    subtree: true, childList: true, attributes: true, attributeFilter: ['hidden', 'class'],
  });
  assert.ok(scanned.length > 0);
  assert.ok(scanned.every(selector => selector.includes('#consultModal') && !selector.includes('*') && !selector.includes('[role=')));
});
