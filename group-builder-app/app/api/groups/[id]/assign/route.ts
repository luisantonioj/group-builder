import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { buildAdjacencyMap, detectGroupConflicts } from "@/lib/conflict-detection";
import type { Candidate } from "@/types";

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

    // Check for conflicts after assignment
    const connections = await prisma.connection.findMany({ where: { batchId: group.batchId } as unknown as Parameters<typeof prisma.connection.findMany>[0]["where"] });
    const adjacency = buildAdjacencyMap(connections as unknown as Parameters<typeof buildAdjacencyMap>[0]);
    const allCandidates = await prisma.candidate.findMany({ where: { batchId: group.batchId } });
    const conflicts = detectGroupConflicts(
      [{ id: group.id, candidates: allCandidates.filter((c) => c.groupId === group.id) as unknown as Candidate[] }],
      adjacency
    );

    return NextResponse.json({ data: { assigned: true, conflicts } });
  } catch {
    return NextResponse.json({ error: "Failed to assign" }, { status: 500 });
  }
}
