import { NextRequest, NextResponse } from "next/server";
import { requireOrgSession } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { deriveCoInviteeConnections } from "@/lib/conflict-detection";
import type { Candidate } from "@/types";

export async function POST(req: NextRequest) {
  const session = await requireOrgSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { eventId } = await req.json() as { eventId: string };
  if (!eventId) return NextResponse.json({ error: "eventId required" }, { status: 400 });

  const event = await prisma.event.findFirst({ where: { id: eventId, orgId: session.orgId } });
  if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 });

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
          confirmed: conn.confirmed,
        },
      });
    } catch {
      // skip constraint errors
    }
  }

  return NextResponse.json({ detected: coConns.length });
}
