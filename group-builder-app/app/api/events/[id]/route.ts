import { NextRequest, NextResponse } from "next/server";
import { requireOrgSession } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await requireOrgSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const event = await prisma.event.findFirst({
      where: { id: params.id, orgId: session.orgId },
    });
    if (!event) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(
      { data: event },
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

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await requireOrgSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (session.userRole !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json() as {
    name?: string;
    isActive?: boolean;
    featureVisualizer?: boolean;
    featureRoomAssignment?: boolean;
  };

  try {
    const existing = await prisma.event.findFirst({
      where: { id: params.id, orgId: session.orgId },
    });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const updated = await prisma.event.update({
      where: { id: params.id },
      data: {
        ...(body.name !== undefined            ? { name: body.name.trim() }                   : {}),
        ...(body.isActive !== undefined        ? { isActive: body.isActive }                  : {}),
        ...(body.featureVisualizer !== undefined     ? { featureVisualizer: body.featureVisualizer }   : {}),
        ...(body.featureRoomAssignment !== undefined ? { featureRoomAssignment: body.featureRoomAssignment } : {}),
      },
    });
    return NextResponse.json({ data: updated });
  } catch {
    return NextResponse.json({ error: "Failed to update event" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await requireOrgSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (session.userRole !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const existing = await prisma.event.findFirst({
      where: { id: params.id, orgId: session.orgId },
    });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    await prisma.event.delete({ where: { id: params.id } });
    return NextResponse.json({ message: "Deleted" });
  } catch {
    return NextResponse.json({ error: "Failed to delete event" }, { status: 500 });
  }
}
