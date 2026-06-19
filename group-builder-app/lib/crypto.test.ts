// Set development env for test fallbacks
process.env.NODE_ENV = "development";

import test, { describe, it } from "node:test";
import assert from "node:assert";
import { encrypt, decrypt, hmac } from "./crypto";

describe("PII Field Encryption & Hashing", () => {
  const secretData = "Candidate Contact Number: +639171234567";

  it("should encrypt and successfully decrypt back to original text", () => {
    const ciphertext = encrypt(secretData);
    assert.notEqual(ciphertext, secretData);
    assert.strictEqual(ciphertext.split(":").length, 3); // iv:tag:ciphertext

    const decrypted = decrypt(ciphertext);
    assert.strictEqual(decrypted, secretData);
  });

  it("should generate a consistent HMAC hash for duplicate detection", () => {
    const value1 = hmac("+639171234567");
    const value2 = hmac("+639171234567");
    const value3 = hmac("+639179876543");

    assert.strictEqual(value1, value2);
    assert.notEqual(value1, value3);
    assert.strictEqual(value1.length, 64); // SHA-256 hex string length
  });
});
