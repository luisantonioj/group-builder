import { NextRequest, NextResponse } from "next/server";
import { requireOrgSession } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await requireOrgSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = params;
  const body = await req.json() as { confirmed?: boolean };

  // Verify the connection belongs to this org
  const conn = await prisma.connection.findFirst({
    where: { id, from: { event: { orgId: session.orgId } } },
  });
  if (!conn) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const updated = await prisma.connection.update({
    where: { id },
    data: { confirmed: body.confirmed ?? true },
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
