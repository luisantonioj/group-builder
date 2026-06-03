import { NextRequest, NextResponse } from "next/server";
import { requireOrgSession } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { hmac } from "@/lib/crypto";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await requireOrgSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const candidate = await prisma.candidate.findFirst({
      where: { id: params.id, event: { orgId: session.orgId } },
    });
    if (!candidate) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ data: candidate });
  } catch {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await requireOrgSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  try {
    // Verify ownership before update
    const existing = await prisma.candidate.findFirst({
      where: { id: params.id, event: { orgId: session.orgId } },
    });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    // Strip read-only, restricted fields, and relations
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { 
      id, eventId, createdAt, updatedAt, timestamp, 
      event, group, room, connectionsFrom, connectionsTo,
      ...updateData 
    } = body;

    // Update contactHash if contact is provided
    if (updateData.contact) {
      updateData.contactHash = hmac(updateData.contact);
    }

    const updated = await prisma.candidate.update({
      where: { id: params.id },
      data: updateData,
    });
    return NextResponse.json({ data: updated });
  } catch (err) {
    console.error("Update candidate error:", err);
    return NextResponse.json({ error: "Failed to update candidate" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await requireOrgSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (session.userRole !== "ADMIN" && session.userRole !== "SHEPHERD") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const existing = await prisma.candidate.findFirst({
      where: { id: params.id, event: { orgId: session.orgId } },
    });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    await prisma.candidate.delete({ where: { id: params.id } });
    return NextResponse.json({ message: "Deleted" });
  } catch {
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}
