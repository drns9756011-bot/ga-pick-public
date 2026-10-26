const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const vm = require('node:vm');
const read = file => readFileSync(`public/${file}`, 'utf8');

test('all public customer routes load the same mobile-only polish after base styles', () => {
  for (const page of ['index.html','quote/index.html','my-quote/index.html','brand/index.html','subscription/index.html','shopping/index.html','privacy/index.html']) {
    const html = read(page);
    assert.match(html, /customer-mobile.css\?v=20261026-mobile-audit/);
    assert.match(html, /customer-mobile.js\?v=20261026-mobile-audit/);
    assert.ok(html.indexOf('customer-mobile.css') > html.indexOf('customer-ui.css'), page);
  }
});

test('mobile controls wrap, have touch targets and preserve desktop separation', () => {
  const css = read('customer-mobile.css');
  assert.match(css, /@media \(max-width: 760px\) and \(pointer: coarse\)/);
  assert.match(css, /\.wizard-choice-card strong \{ white-space: normal/);
  assert.match(css, /\.brand-detail-close \{ background: #1d1d1f; color: #fff/);
  assert.match(css, /\.subscription-consultation-close/);
  assert.match(css, /min-height: 48px/);
  assert.match(css, /font-size: 16px/);
  assert.match(css, /safe-area-inset-bottom/);
  assert.match(css, /mobile-keyboard-open #customerPage \.wizard-actions \{ position: static/);
  assert.match(css, /max-width: 379px/);
  assert.doesNotMatch(css, /\.pick-case-content.*grid-template-columns: minmax\(0,1fr\)/);
});

function harness({touch=true, supported=true} = {}) {
  const handlers={}, classes=new Map(), frames=[];
  const viewport={height:800,offsetTop:0,scale:1,addEventListener:(name,fn)=>{handlers[`viewport:${name}`]=fn;}};
  const window={innerHeight:800,matchMedia:()=>({matches:touch,addEventListener(){}}),visualViewport:supported?viewport:null,addEventListener:(name,fn)=>{handlers[`window:${name}`]=fn;}};
  const document={activeElement:null,body:{classList:{toggle:(key,value)=>classes.set(key,value)}},addEventListener:(name,fn)=>{handlers[name]=fn;}};
  vm.runInNewContext(read('customer-mobile.js'), {window,document,requestAnimationFrame:fn=>{frames.push(fn);return frames.length;}});
  const flush=()=>{while(frames.length)frames.shift()();};flush();
  return {window,document,viewport,handlers,classes,flush};
}

test('keyboard-aware spacing follows editable focus and viewport size, not zoom', () => {
  const h=harness();
  h.document.activeElement={tagName:'INPUT',type:'tel'};
  h.handlers.focusin();h.flush();
  assert.equal(h.classes.get('mobile-keyboard-open'),false);
  h.window.innerHeight=500;h.viewport.height=500;h.handlers['viewport:resize']();h.flush();
  assert.equal(h.classes.get('mobile-keyboard-open'),true);
  h.viewport.offsetTop=160;h.handlers['viewport:scroll']();h.flush();
  assert.equal(h.classes.get('mobile-keyboard-open'),true);
  h.viewport.scale=2;h.handlers['viewport:resize']();h.flush();
  assert.equal(h.classes.get('mobile-keyboard-open'),false);
  h.viewport.scale=1;h.document.activeElement=null;h.handlers.focusout();h.flush();
  assert.equal(h.classes.get('mobile-keyboard-open'),false);
});

test('desktop and unsupported browsers keep their existing navigation', () => {
  const h=harness({touch:false});
  h.document.activeElement={tagName:'TEXTAREA'};h.viewport.height=400;h.handlers.focusin();h.flush();
  assert.equal(h.classes.get('mobile-keyboard-open'),false);
  assert.doesNotThrow(()=>harness({supported:false}));
});

test('upload privacy warning is visible beside the actual image picker', () => {
  assert.match(read('customer-wizard.js'), /wizard-upload-notice.*이미지 속 성함·전화번호·상세주소/);
});
