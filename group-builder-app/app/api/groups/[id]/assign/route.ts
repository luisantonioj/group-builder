import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { candidateId } = await req.json() as { candidateId: string };
  if (!candidateId) return NextResponse.json({ error: "candidateId required" }, { status: 400 });

  try {
    const group = await prisma.group.findUnique({
      where: { id: params.id },
      include: { candidates: true },
    });
    if (!group) return NextResponse.json({ error: "Group not found" }, { status: 404 });
    if (group.isLocked) return NextResponse.json({ error: "Group is locked" }, { status: 409 });
    if (group.candidates.length >= group.capacity) {
      return NextResponse.json({ error: "Group is at full capacity" }, { status: 409 });
    }

    await prisma.candidate.update({
      where: { id: candidateId },
      data: { groupId: params.id },
    });

    // Detect conflicts by checking connections among the updated group members
    const memberIds = [...group.candidates.map((c) => c.id), candidateId];
    const connections = await prisma.connection.findMany({
      where: {
        fromId: { in: memberIds },
        toId: { in: memberIds },
      },
    });
    const conflictCount = connections.length;

    return NextResponse.json({ data: { assigned: true, conflictCount } });
  } catch {
    return NextResponse.json({ error: "Failed to assign" }, { status: 500 });
  }
}
