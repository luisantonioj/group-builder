import { NextRequest, NextResponse } from "next/server";
import { requireOrgSession } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await requireOrgSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const room = await prisma.room.findFirst({
      where: { id: params.id, event: { orgId: session.orgId } },
      include: { candidates: { select: { id: true, fullName: true, gender: true, groupId: true } } },
    });
    if (!room) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ data: room });
  } catch {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await requireOrgSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  try {
    // Verify ownership
    const existing = await prisma.room.findFirst({
      where: { id: params.id, event: { orgId: session.orgId } },
    });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { id, eventId, candidates, createdAt, ...updateData } = body;

    const updated = await prisma.room.update({
      where: { id: params.id },
      data: updateData,
    });
    return NextResponse.json({ data: updated });
  } catch {
    return NextResponse.json({ error: "Failed to update room" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await requireOrgSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (session.userRole !== "ADMIN" && session.userRole !== "SHEPHERD") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const existing = await prisma.room.findFirst({
      where: { id: params.id, event: { orgId: session.orgId } },
    });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    // Manually nullify roomId for candidates in this room to avoid constraint errors
    await prisma.candidate.updateMany({
      where: { roomId: params.id },
      data: { roomId: null },
    });

    await prisma.room.delete({ where: { id: params.id } });
    return NextResponse.json({ message: "Deleted" });
  } catch {
    return NextResponse.json({ error: "Failed to delete room" }, { status: 500 });
  }
}
