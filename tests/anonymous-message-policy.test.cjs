const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { DatabaseSync } = require('node:sqlite');

const source = readFileSync(path.join(__dirname, '../functions/api/[[path]].js'), 'utf8');
const context = vm.createContext({});
vm.runInContext(source.slice(source.indexOf('function normalizeAnonymousMessage('), source.indexOf('function anonymousSafeBlockMessage(')), context);

for (const message of [
  '어디어디점인가요?', '어디 점인가요?', '어느 지점인가요?',
  '무슨 점이에요?', '어떤 매장인가요?', '지점이 어디인가요?',
  '매장은 어디예요?', '지점명 알려주세요', '매장 이름 알려주세요',
  '매장 위치가 궁금해요', '몇 호점인가요?', '어느 지역 지점인가요?',
  '어.디.어.디.점인가요?', '어\u200b디점인가요?',
  '경산점 인가요?', '경산점인가요?', '혹시 경산점 맞나요?',
  '수성점이에요?', '경 산 점 인가요?', '동대구점이신가요?',
]) {
  for (const role of ['customer', 'seller']) {
    test(`${role}: blocks store identification: ${message}`, () => {
      const result = context.scanAnonymousMessage(message, role);
      assert.equal(result.blocked, true);
      assert.equal(result.type, role === 'seller' ? 'SELLER_IDENTITY' : 'CONTACT_ROUTE');
    });
  }
}

for (const message of [
  '추가 할인 가능한가요?', '토요일 배송 가능한가요?', '설치비 포함인가요?',
  '어떤 제품이 더 좋은가요?', '두 제품의 차이점이 뭔가요?',
  '이 제품의 장점과 단점은 무엇인가요?', '어느 제품이 저렴한가요?',
  '그게 이 제품의 단점인가요?', '이것이 차이점인가요?', '배송 시점인가요?',
]) {
  test(`allows ordinary product and purchase questions: ${message}`, () => {
    assert.equal(context.scanAnonymousMessage(message, 'customer').blocked, false);
  });
}

test('existing contact protections still apply', () => {
  for (const message of ['010-0000-0000', 'https://example.com', 'test@example.com', '카톡으로 연락해주세요']) {
    assert.equal(context.scanAnonymousMessage(message, 'customer').blocked, true);
  }
});

test('previously sent store question is blocked in its room and seller list', async () => {
  const db = new DatabaseSync(':memory:');
  try {
    db.exec(`CREATE TABLE anonymous_consultations (id TEXT PRIMARY KEY, seller_id TEXT);
      CREATE TABLE anonymous_consultation_messages (id TEXT PRIMARY KEY, consultation_id TEXT, body TEXT, blocked INTEGER DEFAULT 0, block_reason TEXT DEFAULT '');
      INSERT INTO anonymous_consultations VALUES ('room', 'seller');
      INSERT INTO anonymous_consultation_messages VALUES ('store', 'room', '경산점 인가요?', 0, '');
      INSERT INTO anonymous_consultation_messages VALUES ('product', 'room', '배송 시점인가요?', 0, '');`);
    const env = { DB: { prepare(sql) {
      return { bind(...values) {
        return {
          all: async () => ({ results: db.prepare(sql).all(...values) }),
          run: async () => db.prepare(sql).run(...values),
        };
      } };
    } } };
    await context.blockPastStoreIdentityQuestions(env, { consultationId: 'room' });
    assert.equal(db.prepare("SELECT blocked FROM anonymous_consultation_messages WHERE id = 'store'").get().blocked, 1);
    assert.equal(db.prepare("SELECT blocked FROM anonymous_consultation_messages WHERE id = 'product'").get().blocked, 0);
    await context.blockPastStoreIdentityQuestions(env, { sellerId: 'seller' });
    assert.equal(db.prepare("SELECT COUNT(*) AS total FROM anonymous_consultation_messages WHERE blocked = 1").get().total, 1);
  } finally { db.close(); }
});
