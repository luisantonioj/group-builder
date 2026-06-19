import { NextRequest, NextResponse } from "next/server";
import { requireOrgSession } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await requireOrgSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const eventId = req.nextUrl.searchParams.get("eventId");
  try {
    const groups = await prisma.group.findMany({
      where: {
        event: { orgId: session.orgId },
        ...(eventId ? { eventId } : {}),
      },
      include: { candidates: { select: { id: true, fullName: true, gender: true } } },
      orderBy: { order: "asc" },
    });
    return NextResponse.json(
      { data: groups },
      {
        headers: {
          "Cache-Control": "no-store, max-age=0, must-revalidate",
        },
      }
    );
  } catch {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }
}

export async function POST(req: NextRequest) {
  const session = await requireOrgSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();

  // Verify the event belongs to this org
  try {
    const event = await prisma.event.findFirst({
      where: { id: body.eventId, orgId: session.orgId },
    });
    if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 });

    const group = await prisma.group.create({ data: body });
    return NextResponse.json({ data: group }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to create group" }, { status: 500 });
  }
}
