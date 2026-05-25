import { NextRequest, NextResponse } from "next/server";
import { requireOrgSession } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await requireOrgSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const events = await prisma.event.findMany({
      where: { orgId: session.orgId },
      include: { _count: { select: { candidates: true } } },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ data: events });
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

  const body = await req.json() as {
    name: string;
    isActive?: boolean;
    featureVisualizer?: boolean;
    featureRoomAssignment?: boolean;
  };
  if (!body.name?.trim()) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  try {
    const event = await prisma.event.create({
      data: {
        name:                 body.name.trim(),
        isActive:             body.isActive             ?? false,
        featureVisualizer:    body.featureVisualizer    ?? true,
        featureRoomAssignment: body.featureRoomAssignment ?? true,
        orgId:                session.orgId,
      },
    });
    return NextResponse.json({ data: event }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to create event" }, { status: 500 });
  }
}
