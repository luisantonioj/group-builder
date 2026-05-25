import { NextRequest, NextResponse } from "next/server";
import { requireOrgSession } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await requireOrgSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const batchId = req.nextUrl.searchParams.get("batchId");
  try {
    const groups = await prisma.group.findMany({
      where: {
        batch: { orgId: session.orgId },
        ...(batchId ? { batchId } : {}),
      },
      include: { candidates: { select: { id: true, fullName: true, gender: true } } },
      orderBy: { name: "asc" },
    });
    return NextResponse.json({ data: groups });
  } catch {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }
}

export async function POST(req: NextRequest) {
  const session = await requireOrgSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();

  // Verify the batch belongs to this org
  try {
    const batch = await prisma.batch.findFirst({
      where: { id: body.batchId, orgId: session.orgId },
    });
    if (!batch) return NextResponse.json({ error: "Batch not found" }, { status: 404 });

    const group = await prisma.group.create({ data: body });
    return NextResponse.json({ data: group }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to create group" }, { status: 500 });
  }
}
