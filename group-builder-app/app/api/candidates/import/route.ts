import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hmac } from "@/lib/crypto";
import { fuzzyMatchInviter } from "@/lib/fuzzy-match";
import type { ImportRow, ColumnMapping } from "@/types";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json() as { rows: ImportRow[]; mapping: ColumnMapping; batchId: string };
  const { rows, mapping, batchId } = body;

  if (!rows?.length || !batchId) {
    return NextResponse.json({ error: "rows and batchId required" }, { status: 400 });
  }

  const existingCandidates = await prisma.candidate.findMany({ where: { batchId } });
  const results = { created: 0, skipped: 0, duplicates: [] as string[] };

  for (const row of rows) {
    // Map columns using the shepherd-defined mapping
    const fullName = String(row[mapping["fullName"] ?? "fullName"] ?? "").trim();
    const gender = String(row[mapping["gender"] ?? "gender"] ?? "").toUpperCase();
    const contact = String(row[mapping["contact"] ?? "contact"] ?? "").trim() || null;

    if (!fullName) continue;

    const contactHash = contact ? hmac(contact) : null;

    // Duplicate detection
    if (contactHash) {
      const existing = existingCandidates.find((c) => c.contactHash === contactHash);
      if (existing) {
        results.duplicates.push(fullName);
        results.skipped++;
        continue;
      }
    }

    // Parse name
    const nameParts = fullName.split(",").map((s) => s.trim());
    const lastName = nameParts[0] ?? fullName;
    const firstName = nameParts[1] ?? "";

    // Resolve inviter
    const inviterRaw = String(row[mapping["inviterName"] ?? "inviterName"] ?? "").trim() || null;

    try {
      const candidate = await prisma.candidate.create({
        data: {
          fullName,
          lastName,
          firstName,
          gender: gender === "F" || gender === "FEMALE" ? "FEMALE" : "MALE",
          age: row[mapping["age"] ?? "age"] ? Number(row[mapping["age"] ?? "age"]) : null,
          school: String(row[mapping["school"] ?? "school"] ?? "").trim() || null,
          inviterName: inviterRaw,
          howHeard: String(row[mapping["howHeard"] ?? "howHeard"] ?? "").trim() || null,
          yeBatch: batchId,
          birthdayEnc: String(row[mapping["birthday"] ?? "birthday"] ?? "").trim() || null,
          addressEnc: String(row[mapping["address"] ?? "address"] ?? "").trim() || null,
          facebookEnc: String(row[mapping["facebook"] ?? "facebook"] ?? "").trim() || null,
          contactEnc: contact,
          contactHash,
          allergiesEnc: String(row[mapping["allergies"] ?? "allergies"] ?? "").trim() || null,
          fatherNameEnc: String(row[mapping["fatherName"] ?? "fatherName"] ?? "").trim() || null,
          fatherContactEnc: String(row[mapping["fatherContact"] ?? "fatherContact"] ?? "").trim() || null,
          motherNameEnc: String(row[mapping["motherName"] ?? "motherName"] ?? "").trim() || null,
          motherContactEnc: String(row[mapping["motherContact"] ?? "motherContact"] ?? "").trim() || null,
          batchId,
        },
      });

      // Auto-create connection from inviter name if matched
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

  return NextResponse.json({ message: "Import complete", ...results });
}
