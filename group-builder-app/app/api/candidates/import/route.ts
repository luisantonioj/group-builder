import { NextRequest, NextResponse } from "next/server";
import { requireOrgSession } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { hmac, encrypt } from "@/lib/crypto";
import { fuzzyMatchInviter } from "@/lib/fuzzy-match";
import { deriveCoInviteeConnections } from "@/lib/conflict-detection";
import type { ImportRow, ColumnMapping, Candidate } from "@/types";

const MAX_ROWS = 500;

// Strip leading formula-injection chars and trim whitespace
function sanitize(val: unknown): string {
  if (val === null || val === undefined) return "";
  return String(val).trim().replace(/^[=+\-@\t\r]+/, "");
}

// Encrypt a field value or return null if empty
function encField(val: unknown): string | null {
  const s = sanitize(val);
  return s ? encrypt(s) : null;
}

export async function POST(req: NextRequest) {
  const session = await requireOrgSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json() as { rows: ImportRow[]; mapping: ColumnMapping; eventId: string };
  const { rows, mapping, eventId } = body;

  if (!rows?.length || !eventId) {
    return NextResponse.json({ error: "rows and eventId required" }, { status: 400 });
  }

  if (rows.length > MAX_ROWS) {
    return NextResponse.json({ error: `Maximum ${MAX_ROWS} rows per import` }, { status: 400 });
  }

  // Verify event belongs to this org
  const event = await prisma.event.findFirst({ where: { id: eventId, orgId: session.orgId } });
  if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 });

  const existingCandidates = await prisma.candidate.findMany({ where: { eventId } });
  const results = { created: 0, skipped: 0, duplicates: [] as string[] };

  for (const row of rows) {
    const col = (field: string) => row[mapping[field] ?? field];

    const fullName = sanitize(col("fullName"));
    const gender = sanitize(col("gender")).toUpperCase();
    const contact = sanitize(col("contact")) || null;

    if (!fullName) continue;

    const contactHash = contact ? hmac(contact) : null;

    if (contactHash) {
      const existing = existingCandidates.find((c) => c.contactHash === contactHash);
      if (existing) {
        results.duplicates.push(fullName);
        results.skipped++;
        continue;
      }
    }

    const nameParts = fullName.split(",").map((s) => s.trim());
    const lastName = nameParts[0] ?? fullName;
    const firstName = nameParts[1] ?? "";

    const inviterRaw = sanitize(col("inviterName")) || null;

    try {
      const candidate = await prisma.candidate.create({
        data: {
          fullName,
          lastName,
          firstName,
          gender: gender === "F" || gender === "FEMALE" ? "FEMALE" : "MALE",
          age: col("age") ? Number(col("age")) || null : null,
          school: sanitize(col("school")) || null,
          inviterName: inviterRaw,
          howHeard: sanitize(col("howHeard")) || null,
          yeBatch: eventId,
          birthdayEnc: encField(col("birthday")),
          addressEnc: encField(col("address")),
          facebookEnc: encField(col("facebook")),
          contactEnc: contact ? encrypt(contact) : null,
          contactHash,
          allergiesEnc: encField(col("allergies")),
          fatherNameEnc: encField(col("fatherName")),
          fatherContactEnc: encField(col("fatherContact")),
          motherNameEnc: encField(col("motherName")),
          motherContactEnc: encField(col("motherContact")),
          eventId,
        },
      });

      if (inviterRaw && inviterRaw.toLowerCase() !== "n/a") {
        const match = fuzzyMatchInviter(inviterRaw, existingCandidates as unknown as Parameters<typeof fuzzyMatchInviter>[1]);
        if (match && match.score > 0.6) {
          await prisma.connection.upsert({
            where: { fromId_toId: { fromId: candidate.id, toId: match.candidate.id } },
            update: {},
            create: {
              fromId: candidate.id,
              toId: match.candidate.id,
              relationshipType: "OTHER",
              source: "AUTO",
              note: `Auto-matched from inviter field: "${inviterRaw}"`,
            },
          });
        }
      }

      results.created++;
    } catch {
      results.skipped++;
    }
  }

  // Co-invitee scan: connect candidates who share the same inviter
  const allCandidates = await prisma.candidate.findMany({ where: { eventId } });
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
        },
      });
    } catch {
      // skip duplicate / constraint errors
    }
  }

  return NextResponse.json({ message: "Import complete", ...results });
}
