import { NextRequest, NextResponse } from "next/server";
import { requireOrgSession } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await requireOrgSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const degree = req.nextUrl.searchParams.get("degree") === "2" ? 2 : 1;

  try {
    const direct = await prisma.connection.findMany({
      where: { OR: [{ fromId: params.id }, { toId: params.id }] },
      include: {
        from: { select: { id: true, fullName: true, gender: true } },
        to: { select: { id: true, fullName: true, gender: true } },
      },
    });

    if (degree === 1) return NextResponse.json({ data: direct });

    // Second-degree: find neighbors of neighbors
    const directIds = direct.map((c) => (c.fromId === params.id ? c.toId : c.fromId));
    const secondDegree = await prisma.connection.findMany({
      where: {
        OR: [{ fromId: { in: directIds } }, { toId: { in: directIds } }],
        NOT: {
          OR: [{ fromId: params.id }, { toId: params.id }],
        },
      },
    });

    return NextResponse.json({ data: { direct, secondDegree } });
  } catch {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }
}
