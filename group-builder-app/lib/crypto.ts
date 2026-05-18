import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12; // 96 bits — recommended for GCM
const TAG_LENGTH = 16; // 128 bits
const ENCODING = "base64";

function getKey(): Buffer {
  const hex = process.env.ENCRYPTION_KEY;
  if (!hex || hex.length !== 64) {
    if (process.env.NODE_ENV === "development") {
      // Dev fallback — never use in production
      return Buffer.alloc(32, "dev-key-not-for-production");
    }
    throw new Error("ENCRYPTION_KEY must be a 64-char hex string");
  }
  return Buffer.from(hex, "hex");
}

// Encrypts a plaintext string. Returns "iv:tag:ciphertext" base64 encoded.
export function encrypt(plaintext: string): string {
  const key = getKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv) as crypto.CipherGCM;

  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();

  return [
    iv.toString(ENCODING),
    tag.toString(ENCODING),
    encrypted.toString(ENCODING),
  ].join(":");
}

// Decrypts a "iv:tag:ciphertext" string back to plaintext.
export function decrypt(combined: string): string {
  const key = getKey();
  const parts = combined.split(":");
  if (parts.length !== 3) throw new Error("Invalid ciphertext format");

  const iv = Buffer.from(parts[0], ENCODING);
  const tag = Buffer.from(parts[1], ENCODING);
  const encrypted = Buffer.from(parts[2], ENCODING);

  const decipher = crypto.createDecipheriv(
    ALGORITHM,
    key,
    iv
  ) as crypto.DecipherGCM;
  decipher.setAuthTag(tag);

  return decipher.update(encrypted) + decipher.final("utf8");
}

// HMAC-SHA256 for duplicate detection on contact numbers (no decryption needed).
export function hmac(value: string): string {
  const secret = process.env.HMAC_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === "development") {
      return crypto
        .createHmac("sha256", "dev-hmac-secret")
        .update(value)
        .digest("hex");
    }
    throw new Error("HMAC_SECRET is not set");
  }
  return crypto.createHmac("sha256", secret).update(value).digest("hex");
}
