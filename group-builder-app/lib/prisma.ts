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

// Extend PrismaClient with extensions for transparent encryption
const extendedPrisma = basePrisma.$extends({
  query: {
    candidate: {
      async create({ args, query }) {
        if (args.data) {
          args.data = encryptCandidateFields(args.data as Record<string, unknown>) as any;
        }
        const result = await query(args);
        return decryptCandidateFields(result as Record<string, unknown>) as any;
      },
      async createMany({ args, query }) {
        if (Array.isArray(args.data)) {
          args.data = args.data.map((d) => encryptCandidateFields(d as Record<string, unknown>)) as any;
        } else if (args.data) {
          args.data = encryptCandidateFields(args.data as Record<string, unknown>) as any;
        }
        return query(args);
      },
      async update({ args, query }) {
        if (args.data) {
          args.data = encryptCandidateFields(args.data as Record<string, unknown>) as any;
        }
        const result = await query(args);
        return decryptCandidateFields(result as Record<string, unknown>) as any;
      },
      async updateMany({ args, query }) {
        if (args.data) {
          args.data = encryptCandidateFields(args.data as Record<string, unknown>) as any;
        }
        return query(args);
      },
      async upsert({ args, query }) {
        if (args.create) {
          args.create = encryptCandidateFields(args.create as Record<string, unknown>) as any;
        }
        if (args.update) {
          args.update = encryptCandidateFields(args.update as Record<string, unknown>) as any;
        }
        const result = await query(args);
        return decryptCandidateFields(result as Record<string, unknown>) as any;
      },
      async delete({ args, query }) {
        const result = await query(args);
        return result ? decryptCandidateFields(result as Record<string, unknown>) as any : null;
      },
      async findMany({ args, query }) {
        const result = await query(args);
        return (result as Record<string, unknown>[]).map((r) =>
          decryptCandidateFields(r)
        ) as any;
      },
      async findFirst({ args, query }) {
        const result = await query(args);
        return result ? decryptCandidateFields(result as Record<string, unknown>) as any : null;
      },
      async findUnique({ args, query }) {
        const result = await query(args);
        return result ? decryptCandidateFields(result as Record<string, unknown>) as any : null;
      },
    },
  },
});

export const prisma = extendedPrisma as unknown as PrismaClient;

