import { NextRequest, NextResponse } from "next/server";
import { requireOrgSession } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await requireOrgSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { candidateId } = await req.json() as { candidateId: string };
  if (!candidateId) return NextResponse.json({ error: "candidateId required" }, { status: 400 });

  try {
    const room = await prisma.room.findFirst({
      where: { id: params.id, event: { orgId: session.orgId } },
      include: { candidates: true },
    });
    if (!room) return NextResponse.json({ error: "Room not found" }, { status: 404 });
    if (room.candidates.length >= room.capacity) {
      return NextResponse.json({ error: "Room is at full capacity" }, { status: 409 });
    }

    const candidate = await prisma.candidate.findFirst({
      where: { id: candidateId, event: { orgId: session.orgId } },
    });
    if (!candidate) return NextResponse.json({ error: "Candidate not found" }, { status: 404 });

    // Hard gender constraint
    if (room.gender !== "MIXED" && candidate.gender !== room.gender) {
      return NextResponse.json({ error: "Gender mismatch — candidate cannot be assigned to this room" }, { status: 409 });
    }

    await prisma.candidate.update({ where: { id: candidateId }, data: { roomId: params.id } });
    return NextResponse.json({ data: { assigned: true } });
  } catch {
    return NextResponse.json({ error: "Failed to assign" }, { status: 500 });
  }
}
