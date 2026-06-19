import { NextRequest, NextResponse } from "next/server";
import { requireOrgSession } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await requireOrgSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const eventId = req.nextUrl.searchParams.get("eventId");
  try {
    const connections = await prisma.connection.findMany({
      where: {
        from: { event: { orgId: session.orgId } },
        ...(eventId ? { from: { eventId, event: { orgId: session.orgId } } } : {}),
      },
      include: {
        from: { select: { id: true, fullName: true, gender: true, eventId: true } },
        to:   { select: { id: true, fullName: true, gender: true, eventId: true } },
      },
    });
    return NextResponse.json({ data: connections });
  } catch {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }
}

export async function POST(req: NextRequest) {
  const session = await requireOrgSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  try {
    // Verify both candidates belong to this org
    const [fromCand, toCand] = await Promise.all([
      prisma.candidate.findFirst({ where: { id: body.fromId, event: { orgId: session.orgId } } }),
      prisma.candidate.findFirst({ where: { id: body.toId,   event: { orgId: session.orgId } } }),
    ]);
    if (!fromCand || !toCand) {
      return NextResponse.json({ error: "Candidate not found" }, { status: 404 });
    }

    const [fromId, toId] = [body.fromId, body.toId].sort();

    // Check for existing connection in canonical order
    const existing = await prisma.connection.findFirst({
      where: { fromId, toId },
    });
    if (existing) {
      return NextResponse.json({ data: existing }, { status: 200 });
    }

    const conn = await prisma.connection.create({
      data: {
        ...body,
        fromId,
        toId,
      },
    });
    return NextResponse.json({ data: conn }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to create connection" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const session = await requireOrgSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await req.json() as { id: string };
  try {
    // Verify the connection belongs to this org before deleting
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
