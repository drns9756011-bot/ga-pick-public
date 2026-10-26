const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '../public/customer-wizard.js'), 'utf8');

// Exercise the production navigation functions without booting the app or using a network.
function productionFunction(name) {
  const start = source.indexOf(`  function ${name}(`);
  assert.notEqual(start, -1, `Missing function: ${name}`);
  const end = source.indexOf('\n  }', start);
  assert.notEqual(end, -1);
  return source.slice(start, end + 4);
}

function control(properties = {}) {
  return Object.assign({
    dataset: {},
    style: {},
    listeners: {},
    attributes: {},
    addEventListener(type, listener) { this.listeners[type] = listener; },
    setAttribute(name, value) { this.attributes[name] = value; },
    focus(options) { this.focusOptions = options; this.focused = true; },
    scrollIntoView(options) { this.scrollOptions = options; },
  }, properties);
}

function harness(overrides = {}) {
  const step = {
    alerts: [],
    prepend(alert) {
      this.alerts.unshift(alert);
      alert.remove = () => { this.alerts.splice(this.alerts.indexOf(alert), 1); };
    },
  };
  const root = {
    choices: [],
    products: [],
    querySelectorAll(selector) {
      if (selector === 'input[data-choice-name]') return this.choices;
      if (selector === '.wizard-product-card') return this.products;
      return [];
    },
    querySelector() { return null; },
  };
  const context = vm.createContext({
    message: control({ textContent: '' }),
    document: {
      createElement() { return control(); },
      querySelector() { return { getBoundingClientRect: () => ({ bottom: 76 }) }; },
    },
    form: {
      querySelector(selector) {
        if (selector === '.wizard-step') return step;
        if (selector === '.wizard-step-message') return step.alerts[0] || null;
        if (selector === '.customer-wizard') return root;
        return null;
      },
    },
    fields: { purpose: { value: '' } },
    state: { selectedProducts: [] },
    syncAllFields() {},
    updatePreview() {},
    clearAiRecommendation() {},
    deleteOptionState() {},
    render() {},
    window: {},
    ...overrides,
  });
  for (const name of ['setMessage', 'clearMessage', 'showStepValidationMessage',
    'validateCurrentStep', 'restoreChoiceFocus', 'cssEscape', 'bindStepEvents',
    'renderProducts', 'move']) {
    vm.runInContext(productionFunction(name), context);
  }
  return { context, step, root };
}

test('failed Next shows and focuses an alert inside the active step, below the header', () => {
  let scrolledToTop = false;
  const { context, step } = harness({
    currentStep: () => ({ validate: () => {
      context.setMessage('Choose a purpose.');
      return false;
    } }),
    scrollWizardToTop() { scrolledToTop = true; },
  });
  context.move(1);
  assert.equal(step.alerts.length, 1);
  const alert = step.alerts[0];
  assert.equal(alert.attributes.role, 'alert');
  assert.equal(alert.tabIndex, -1);
  assert.equal(alert.textContent, context.message.textContent);
  assert.equal(alert.style.scrollMarginTop, '92px');
  assert.equal(alert.focused, true);
  assert.equal(alert.focusOptions.preventScroll, true);
  assert.equal(alert.scrollOptions.block, 'start');
  assert.equal(alert.scrollOptions.behavior, 'instant');
  assert.equal(scrolledToTop, false);
});

test('repeated validation replaces the alert and successful validation clears both messages', () => {
  let valid = false;
  const { context, step } = harness({
    currentStep: () => ({ validate: () => {
      if (!valid) context.setMessage('Choose a product.');
      return valid;
    } }),
  });
  assert.equal(context.validateCurrentStep(), false);
  assert.equal(context.validateCurrentStep(), false);
  assert.equal(step.alerts.length, 1);
  valid = true;
  assert.equal(context.validateCurrentStep(), true);
  assert.equal(step.alerts.length, 0);
  assert.equal(context.message.textContent, '');
});

test('successful Next and Back retain the existing top-reset path', () => {
  const calls = [];
  const { context } = harness({
    state: { stepIndex: 0 },
    currentStep: () => ({ validate: () => true }),
    visibleSteps: () => [{}, {}, {}],
    isMobileWizardViewport: () => false,
    render: () => calls.push('render'),
    scrollWizardToTop: () => calls.push('top'),
  });
  context.move(1);
  assert.equal(context.state.stepIndex, 1);
  context.move(-1);
  assert.equal(context.state.stepIndex, 0);
  assert.deepEqual(calls, ['render', 'top', 'render', 'top']);
});

test('radio selection clears errors and restores the replacement control using escaped keys', () => {
  const input = control({ name: 'wizardPurposeProxy', value: 'quote"\\[key]\n' });
  const replacement = control();
  let selector;
  const { context, step, root } = harness();
  root.choices = [input];
  context.setMessage('Choose a purpose.');
  context.showStepValidationMessage();
  context.render = () => {
    root.choices = [replacement];
    root.querySelector = (value) => { selector = value; return replacement; };
  };
  context.bindStepEvents(root, 'purpose');
  input.listeners.change();
  assert.equal(context.fields.purpose.value, input.value);
  assert.equal(context.message.textContent, '');
  assert.equal(step.alerts.length, 0);
  assert.equal(selector, `input[data-choice-name="${context.cssEscape(input.name)}"][value="${context.cssEscape(input.value)}"]`);
  assert.equal(replacement.focused, true);
  assert.equal(replacement.focusOptions.preventScroll, true);
  assert.equal(input.focused, undefined);
});

test('product toggles keep form state, restore focus, and expose aria-pressed in rendered markup', () => {
  const value = 'product"\\[key]';
  const button = control({ dataset: { product: value } });
  const replacement = control();
  const { context, step, root } = harness({
    productOptions: [{ value }],
    escapeHtml: (text) => String(text).replaceAll('&', '&amp;').replaceAll('"', '&quot;'),
    productPhotoMarkup: () => '',
    productDisplayTitle: (text) => text,
  });
  root.products = [button];
  context.setMessage('Choose a product.');
  context.showStepValidationMessage();
  let selector;
  context.render = () => {
    root.querySelector = (key) => { selector = key; return replacement; };
  };
  context.bindStepEvents(root, 'products');
  assert.match(context.renderProducts(), /aria-pressed="false"/);
  button.listeners.click();
  assert.deepEqual(Array.from(context.state.selectedProducts), [value]);
  assert.equal(context.message.textContent, '');
  assert.equal(step.alerts.length, 0);
  assert.equal(selector, `.wizard-product-card[data-product="${context.cssEscape(value)}"]`);
  assert.equal(replacement.focused, true);
  assert.equal(replacement.focusOptions.preventScroll, true);
  assert.match(context.renderProducts(), /aria-pressed="true"/);
  assert.doesNotMatch(context.renderProducts(), /name=|type="submit"/);
  button.listeners.click();
  assert.equal(context.state.selectedProducts.length, 0);
  assert.match(context.renderProducts(), /aria-pressed="false"/);
});

test('focus recovery tolerates a choice disappearing during a render', () => {
  const { context } = harness();
  assert.doesNotThrow(() => context.restoreChoiceFocus('[data-product="missing"]'));
});
