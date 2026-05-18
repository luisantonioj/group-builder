import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hmac } from "@/lib/crypto";
import { z } from "zod";

const CreateSchema = z.object({
  fullName: z.string().min(1),
  lastName: z.string().min(1),
  firstName: z.string().min(1),
  gender: z.enum(["MALE", "FEMALE"]),
  age: z.number().int().nullable().optional(),
  school: z.string().nullable().optional(),
  inviterName: z.string().nullable().optional(),
  howHeard: z.string().nullable().optional(),
  yeBatch: z.string(),
  birthday: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
  facebook: z.string().nullable().optional(),
  contact: z.string().nullable().optional(),
  fatherName: z.string().nullable().optional(),
  fatherContact: z.string().nullable().optional(),
  motherName: z.string().nullable().optional(),
  motherContact: z.string().nullable().optional(),
  allergies: z.string().nullable().optional(),
  shepherdNotes: z.string().nullable().optional(),
  groupId: z.string().nullable().optional(),
  roomId: z.string().nullable().optional(),
  batchId: z.string(),
});

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const batchId = searchParams.get("batchId");
  const page = parseInt(searchParams.get("page") ?? "1");
  const pageSize = parseInt(searchParams.get("pageSize") ?? "100");

  try {
    const [candidates, total] = await Promise.all([
      prisma.candidate.findMany({
        where: batchId ? { batchId } : undefined,
        orderBy: { fullName: "asc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.candidate.count({ where: batchId ? { batchId } : undefined }),
    ]);
    return NextResponse.json({ data: candidates, total, page, pageSize });
  } catch {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = CreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const data = parsed.data;
  const contactHash = data.contact ? hmac(data.contact) : undefined;

  // Check for duplicate
  if (contactHash) {
    const existing = await prisma.candidate.findFirst({ where: { contactHash } });
    if (existing) {
      return NextResponse.json({ error: "Duplicate contact number detected", existing }, { status: 409 });
    }
  }

  try {
    const candidate = await prisma.candidate.create({
      data: {
        ...data,
        contactHash,
        // Encrypted fields passed as plaintext — Prisma middleware encrypts them
        birthdayEnc: data.birthday ?? null,
        addressEnc: data.address ?? null,
        facebookEnc: data.facebook ?? null,
        contactEnc: data.contact ?? null,
        fatherNameEnc: data.fatherName ?? null,
        fatherContactEnc: data.fatherContact ?? null,
        motherNameEnc: data.motherName ?? null,
        motherContactEnc: data.motherContact ?? null,
        allergiesEnc: data.allergies ?? null,
        shepherdNotesEnc: data.shepherdNotes ?? null,
      },
    });
    return NextResponse.json({ data: candidate }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to create candidate" }, { status: 500 });
  }
}
