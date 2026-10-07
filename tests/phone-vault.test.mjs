import { test } from "node:test";
import assert from "node:assert/strict";
import { webcrypto } from "node:crypto";
import { protectCustomerPhone, customerPhoneHash, readCustomerPhone, customerPhoneWithinSevenDays, customerPhoneRetained, customerPhoneAccessExpiresAt, customerPersonalExpiresAt, fullyMaskCustomerPhone } from "../functions/phone-vault.js";

globalThis.crypto ||= webcrypto;
const env = { CUSTOMER_PHONE_KEY: Buffer.alloc(32, 37).toString("base64") };

test("phone is keyed and encrypted; internal notifications retain unselected phones until day thirty", async () => {
  const protectedPhone = await protectCustomerPhone(env, "010-1234-5678");
  assert.equal(protectedPhone.hash, await customerPhoneHash(env, "01012345678"));
  assert.equal(protectedPhone.ciphertext.includes("01012345678"), false);
  assert.equal(await readCustomerPhone(env, {
    created_at: new Date().toISOString(), phone_ciphertext: protectedPhone.ciphertext,
  }), "01012345678");
  assert.equal(await readCustomerPhone(env, {
    created_at: new Date(Date.now() - 8 * 86400000).toISOString(), phone_ciphertext: protectedPhone.ciphertext,
  }), "01012345678");
  assert.equal(await readCustomerPhone(env, {
    created_at: new Date(Date.now() - 31 * 86400000).toISOString(), phone_ciphertext: protectedPhone.ciphertext,
  }), "");
  assert.equal(customerPhoneWithinSevenDays({ created_at: "" }), false);
  assert.equal(fullyMaskCustomerPhone("01012345678"), "***-****-****");
});

test("selected phone access uses selection time and never exceeds registration plus thirty days", () => {
  const now = Date.parse("2026-10-07T12:00:00Z");
  const day = 86400000;
  const row = {
    created_at: new Date(now - 20 * day).toISOString(),
    selected_bid_id: "bid-1", selected_at: new Date(now - 6 * day).toISOString(),
  };
  assert.equal(customerPhoneWithinSevenDays(row, now), true);
  assert.equal(customerPhoneAccessExpiresAt(row), new Date(now + day).toISOString());
  assert.equal(customerPhoneWithinSevenDays(row, now + day - 1), true);
  assert.equal(customerPhoneWithinSevenDays(row, now + day), false);
  assert.equal(customerPhoneRetained(row, now + day), false);
  const late = { ...row, created_at: new Date(now - 29 * day).toISOString(), selected_at: new Date(now).toISOString() };
  assert.equal(customerPhoneAccessExpiresAt(late), new Date(now + day).toISOString());
  assert.equal(customerPhoneWithinSevenDays(late, now + day), false);
  assert.equal(customerPersonalExpiresAt(late), new Date(now + day).toISOString());
});

test("unselected phones stay private and legacy selections do not gain a fresh deadline", () => {
  const now = Date.parse("2026-10-07T12:00:00Z");
  const row = { created_at: new Date(now - 20 * 86400000).toISOString() };
  assert.equal(customerPhoneRetained(row, now), true);
  assert.equal(customerPhoneWithinSevenDays(row, now), false);
  assert.equal(customerPhoneAccessExpiresAt(row), "");
  assert.equal(customerPhoneWithinSevenDays({ ...row, selected_bid_id: "legacy" }, now), false);
  assert.equal(customerPhoneRetained({ ...row, selected_at: "invalid" }, now), false);
  assert.equal(customerPhoneWithinSevenDays({ ...row, selected_bid_id: "bid", selected_at: new Date(now + 1000).toISOString() }, now), false);
  assert.equal(customerPhoneRetained({ ...row, selected_at: new Date(now - 8 * 86400000).toISOString() }, now), false);
});

test("missing encryption secret fails closed", async () => {
  await assert.rejects(protectCustomerPhone({}, "01012345678"), /CUSTOMER_PHONE_KEY/);
});
