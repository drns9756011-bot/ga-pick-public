import test from 'node:test';
import assert from 'node:assert/strict';
import { publicCaseBids, HOME_CASES_SQL } from '../functions/home-cases.js';

test('public bids retain matching channels after sorting and limiting', () => {
  assert.deepEqual(publicCaseBids(JSON.stringify([
    { price: 900, channel: '삼성스토어' },
    { price: 700, channel: '롯데하이마트' },
    { price: 800, channel: 'LG전자 BEST SHOP' },
    { price: 1000, channel: '전자랜드(LG)' },
  ])), [
    { price: 700, channel: '롯데하이마트' },
    { price: 800, channel: 'LG전자 BEST SHOP' },
    { price: 900, channel: '삼성스토어' },
  ]);
});

test('unrecognized channel text and private seller fields are not published', () => {
  assert.deepEqual(publicCaseBids(JSON.stringify([
    { price: 800, channel: '삼성스토어 특정지점 010-1234-5678', manager: 'private', seller_id: 'private' },
    { price: 900 },
    { price: 0, channel: '롯데하이마트' },
  ])), [{ price: 800, channel: '판매 채널' }, { price: 900, channel: '판매 채널' }]);
});

test('deduplication selects the cheapest offer before aggregation', () => {
  assert.match(HOME_CASES_SQL, /ROW_NUMBER\(\) OVER/);
  assert.match(HOME_CASES_SQL, /ORDER BY price, id/);
  assert.match(HOME_CASES_SQL, /WHERE seller_rank = 1/);
});
