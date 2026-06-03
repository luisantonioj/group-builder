import { NextRequest, NextResponse } from "next/server";
import { requireOrgSession } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await requireOrgSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = params;
  const body = await req.json();

  // Verify the connection belongs to this org
  const conn = await prisma.connection.findFirst({
    where: { id, from: { event: { orgId: session.orgId } } },
  });
  if (!conn) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { id: _, from, to, createdAt, ...updateData } = body;

  const updated = await prisma.connection.update({
    where: { id },
    data: updateData,
    include: {
      from: { select: { id: true, fullName: true, gender: true } },
      to:   { select: { id: true, fullName: true, gender: true } },
    },
  });

  return NextResponse.json({
    data: {
      ...updated,
      fromName: updated.from.fullName,
      toName:   updated.to.fullName,
    },
  });
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await requireOrgSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = params;

  try {
    const conn = await prisma.connection.findFirst({
      where: { id, from: { event: { orgId: session.orgId } } },
    });
    if (!conn) return NextResponse.json({ error: "Not found" }, { status: 404 });

    await prisma.connection.delete({ where: { id } });
    return NextResponse.json({ message: "Deleted" });
  } catch {
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}
