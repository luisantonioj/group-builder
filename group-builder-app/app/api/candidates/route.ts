import { NextRequest, NextResponse } from "next/server";
import { requireOrgSession } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { hmac } from "@/lib/crypto";
import { z } from "zod";
import { deriveCoInviteeConnections } from "@/lib/conflict-detection";
import type { Candidate } from "@/types";

const CreateSchema = z.object({
  id: z.string().optional(),
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
  isConfirmed: z.boolean().default(false),
  groupId: z.string().nullable().optional(),
  roomId: z.string().nullable().optional(),
  eventId: z.string(),
});

export async function GET(req: NextRequest) {
  const session = await requireOrgSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const eventId  = searchParams.get("eventId");
  const page     = parseInt(searchParams.get("page")     ?? "1");
  const pageSize = parseInt(searchParams.get("pageSize") ?? "100");

  try {
    const where = {
      event: { orgId: session.orgId },
      ...(eventId ? { eventId } : {}),
    };
    const [candidates, total] = await Promise.all([
      prisma.candidate.findMany({
        where,
        orderBy: { fullName: "asc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.candidate.count({ where }),
    ]);
    return NextResponse.json({ data: candidates, total, page, pageSize });
  } catch {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }
}

export async function POST(req: NextRequest) {
  const session = await requireOrgSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = CreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const data = parsed.data;

  // Verify the event belongs to this org
  let event;
  try {
    event = await prisma.event.findFirst({
      where: { id: data.eventId, orgId: session.orgId },
    });
    if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 });
  } catch {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  const contactHash = data.contact ? hmac(data.contact) : undefined;

  // Check for duplicate within the same org
  if (contactHash) {
    const existing = await prisma.candidate.findFirst({
      where: { contactHash, event: { orgId: session.orgId } },
    });
    if (existing) {
      return NextResponse.json({ error: "Duplicate contact number detected", existing }, { status: 409 });
    }
  }

  try {
    const candidate = await prisma.candidate.create({
      data: {
        ...data,
        yeBatch: event.name,
        contactHash,
        birthdayEnc:      data.birthday      ?? null,
        addressEnc:       data.address       ?? null,
        facebookEnc:      data.facebook      ?? null,
        contactEnc:       data.contact       ?? null,
        fatherNameEnc:    data.fatherName    ?? null,
        fatherContactEnc: data.fatherContact ?? null,
        motherNameEnc:    data.motherName    ?? null,
        motherContactEnc: data.motherContact ?? null,
        allergiesEnc:     data.allergies     ?? null,
        shepherdNotesEnc: data.shepherdNotes ?? null,
      },
    });
    // Co-invitee scan: connect this new candidate with others sharing the same inviter
    if (candidate.inviterName) {
      const allCandidates = await prisma.candidate.findMany({ where: { eventId: data.eventId } });
      const coConns = deriveCoInviteeConnections(allCandidates as unknown as Candidate[]);
      for (const conn of coConns) {
        try {
          await prisma.connection.upsert({
            where: { fromId_toId: { fromId: conn.fromId, toId: conn.toId } },
            update: {},
            create: {
              fromId: conn.fromId,
              toId: conn.toId,
              relationshipType: conn.relationshipType,
              source: "AUTO",
              note: conn.note,
              confirmed: conn.confirmed,
            },
          });
        } catch {
          // skip constraint errors
        }
      }
    }

    return NextResponse.json({ data: candidate }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to create candidate" }, { status: 500 });
  }
}
