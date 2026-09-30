const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const app = readFileSync(path.join(__dirname, '../public/app.js'), 'utf8');
const backend = readFileSync(path.join(__dirname, '../functions/api/[[path]].js'), 'utf8');
const context = vm.createContext({ sameId: (left, right) => String(left) === String(right) });
vm.runInContext(app.slice(app.indexOf('function formatSellerDisplayName('), app.indexOf('function starText(')), context);
vm.runInContext(backend.slice(backend.indexOf('function hideBidIdentityBeforeSelection('), backend.indexOf('function normalizeReview(')), context);

const bid = {
  id: 'bid-1', seller: '채널 경산점', channel: '전자랜드', branch: '경산점',
  manager: '홍길동', managerPosition: '팀장', phone: '01012345678', cardImage: 'https://example.com/card',
};

test('before selection only the channel is available for customer display', () => {
  const masked = context.hideBidIdentityBeforeSelection(bid);
  assert.equal(masked.seller, '전자랜드');
  for (const field of ['branch', 'manager', 'managerPosition', 'phone', 'cardImage']) {
    assert.equal(masked[field], '');
  }
  const display = context.getCustomerBidIdentity({ selectedBidId: null }, bid);
  assert.equal(display.sellerDisplayName, '전자랜드');
  assert.equal(display.branch, '');
  assert.equal(display.managerDisplayName, '');
});

test('selected seller contact details are available to the customer', () => {
  const display = context.getCustomerBidIdentity({ selectedBidId: 'bid-1' }, bid);
  assert.equal(display.isRevealed, true);
  assert.equal(display.branch, '경산점');
  assert.equal(display.managerDisplayName, '홍길동 팀장');
});
