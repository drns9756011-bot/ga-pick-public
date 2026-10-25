const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname, '../public/app.js'), 'utf8');

test('IME composition does not submit chat; plain Enter does', () => {
  const start = source.indexOf('      if (event.key === "Enter" && !event.shiftKey && !event.isComposing');
  assert.ok(start > 0);
  const code = source.slice(start, source.indexOf('\n    });', start));
  let sends = 0;
  for (const props of [{isComposing:true}, {keyCode:229}, {shiftKey:true}, {}]) {
    vm.runInNewContext(code, {event:{key:'Enter', preventDefault(){}, currentTarget:{form:{requestSubmit(){sends++;}}}, ...props}});
  }
  assert.equal(sends, 1);
});

test('closed rooms invalidate late sends and retries retain their message id', () => {
  assert.match(source, /sendingVersion !== anonymousRefreshVersion/);
  assert.match(source, /function closeAnonymousConsultation\(\) \{\s*anonymousRefreshVersion \+= 1/);
  assert.match(source, /field.dataset.pendingMessage === message && field.dataset.pendingId/);
});

test('read receipts do not rebuild messages and background polling is suppressed', () => {
  assert.match(source, /const renderKey = JSON.stringify\(rows\)/);
  assert.match(source, /document.hidden \|\| navigator.onLine === false \|\| anonymousSendInFlight/);
  assert.match(source, /addEventListener\("online", resumeChat\)/);
});

test('both roles receive privacy warnings with administrator review', () => {
  assert.ok(source.includes('원스트라이크 아웃 대상'));
  assert.ok(source.includes('매니저는 요청을 받아도 해당 정보를 제공할 수 없습니다'));
  assert.ok(source.includes('실제 조치는 관리자 확인 후 결정'));
});
