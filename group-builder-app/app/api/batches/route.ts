import { NextRequest, NextResponse } from "next/server";
import { requireOrgSession } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await requireOrgSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const batches = await prisma.batch.findMany({
      where: { orgId: session.orgId },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ data: batches });
  } catch {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }
}

export async function POST(req: NextRequest) {
  const session = await requireOrgSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (session.userRole !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json() as { name: string; isActive?: boolean };
  if (!body.name?.trim()) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  try {
    const batch = await prisma.batch.create({
      data: {
        name:     body.name.trim(),
        isActive: body.isActive ?? false,
        orgId:    session.orgId,
      },
    });
    return NextResponse.json({ data: batch }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to create batch" }, { status: 500 });
  }
}
