import { test } from "node:test";
import assert from "node:assert/strict";
import { webcrypto } from "node:crypto";
import { protectCustomerPhone, customerPhoneHash, readCustomerPhone, customerPhoneWithinSevenDays, fullyMaskCustomerPhone } from "../functions/phone-vault.js";

globalThis.crypto ||= webcrypto;
const env = { CUSTOMER_PHONE_KEY: Buffer.alloc(32, 37).toString("base64") };

test("phone is keyed, encrypted, and readable only before day seven", async () => {
  const protectedPhone = await protectCustomerPhone(env, "010-1234-5678");
  assert.equal(protectedPhone.hash, await customerPhoneHash(env, "01012345678"));
  assert.equal(protectedPhone.ciphertext.includes("01012345678"), false);
  assert.equal(await readCustomerPhone(env, {
    created_at: new Date().toISOString(), phone_ciphertext: protectedPhone.ciphertext,
  }), "01012345678");
  assert.equal(await readCustomerPhone(env, {
    created_at: new Date(Date.now() - 8 * 86400000).toISOString(), phone_ciphertext: protectedPhone.ciphertext,
  }), "");
  assert.equal(customerPhoneWithinSevenDays({ created_at: "" }), false);
  assert.equal(fullyMaskCustomerPhone("01012345678"), "***-****-****");
});

test("missing encryption secret fails closed", async () => {
  await assert.rejects(protectCustomerPhone({}, "01012345678"), /CUSTOMER_PHONE_KEY/);
});
