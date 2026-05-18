import { PrismaClient } from "@prisma/client";
import { encrypt, decrypt } from "./crypto";

// Singleton pattern for Prisma — avoids connection exhaustion in Next.js dev HMR
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

const basePrisma = globalForPrisma.prisma || new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = basePrisma;
}

// ─── Encrypted fields on Candidate ────────────────────────────────────────────
// These are stored as "enc_<field>" in the DB and transparently en/decrypted.

const ENCRYPTED_FIELDS = [
  "birthday",
  "address",
  "facebook",
  "contact",
  "fatherName",
  "fatherContact",
  "motherName",
  "motherContact",
  "allergies",
  "shepherdNotes",
] as const;

type EncryptedField = (typeof ENCRYPTED_FIELDS)[number];

function encryptCandidateFields(data: Record<string, unknown>) {
  const out: Record<string, unknown> = { ...data };
  for (const field of ENCRYPTED_FIELDS) {
    if (field in data && data[field] != null) {
      const encKey = `${field}Enc` as string;
      out[encKey] = encrypt(String(data[field]));
      delete out[field];
    }
  }
  return out;
}

function decryptCandidateFields(record: Record<string, unknown>) {
  const out: Record<string, unknown> = { ...record };
  for (const field of ENCRYPTED_FIELDS) {
    const encKey = `${field}Enc` as string;
    if (encKey in record && record[encKey] != null) {
      try {
        out[field] = decrypt(String(record[encKey]));
      } catch {
        out[field] = null;
      }
      delete out[encKey];
    } else {
      out[field] = null;
    }
  }
  return out;
}

// Extend PrismaClient with middleware for transparent encryption
basePrisma.$use(async (params, next) => {
  if (params.model === "Candidate") {
    if (
      params.action === "create" ||
      params.action === "update" ||
      params.action === "upsert"
    ) {
      if (params.args.data) {
        params.args.data = encryptCandidateFields(params.args.data);
      }
    }
  }

  const result = await next(params);

  if (params.model === "Candidate") {
    if (Array.isArray(result)) {
      return result.map((r) =>
        decryptCandidateFields(r as Record<string, unknown>)
      );
    }
    if (result && typeof result === "object") {
      return decryptCandidateFields(result as Record<string, unknown>);
    }
  }

  return result;
});

export const prisma = basePrisma;
