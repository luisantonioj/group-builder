import { NextRequest, NextResponse } from "next/server";
import { requireOrgSession } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { hmac } from "@/lib/crypto";

import { encrypt } from "@/lib/crypto";

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

    // Pick only valid database fields to prevent Prisma errors
    const data: any = {};
    if (body.fullName !== undefined)    data.fullName = body.fullName;
    if (body.gender !== undefined)      data.gender = body.gender;
    if (body.age !== undefined)         data.age = body.age;
    if (body.school !== undefined)      data.school = body.school;
    if (body.inviterName !== undefined) data.inviterName = body.inviterName;
    if (body.howHeard !== undefined)    data.howHeard = body.howHeard;
    if (body.isConfirmed !== undefined) data.isConfirmed = body.isConfirmed;
    if (body.isPresent !== undefined)   data.isPresent = body.isPresent;
    if (body.groupId !== undefined)     data.groupId = body.groupId;
    if (body.roomId !== undefined)      data.roomId = body.roomId;

    // Handle encrypted fields
    if (body.birthday !== undefined)      data.birthdayEnc = body.birthday ? encrypt(body.birthday) : null;
    if (body.address !== undefined)       data.addressEnc = body.address ? encrypt(body.address) : null;
    if (body.facebook !== undefined)      data.facebookEnc = body.facebook ? encrypt(body.facebook) : null;
    if (body.allergies !== undefined)     data.allergiesEnc = body.allergies ? encrypt(body.allergies) : null;
    if (body.shepherdNotes !== undefined) data.shepherdNotesEnc = body.shepherdNotes ? encrypt(body.shepherdNotes) : null;
    
    if (body.fatherName !== undefined)    data.fatherNameEnc = body.fatherName ? encrypt(body.fatherName) : null;
    if (body.fatherContact !== undefined) data.fatherContactEnc = body.fatherContact ? encrypt(body.fatherContact) : null;
    if (body.motherName !== undefined)    data.motherNameEnc = body.motherName ? encrypt(body.motherName) : null;
    if (body.motherContact !== undefined) data.motherContactEnc = body.motherContact ? encrypt(body.motherContact) : null;

    if (body.contact !== undefined) {
      data.contactEnc = body.contact ? encrypt(body.contact) : null;
      data.contactHash = body.contact ? hmac(body.contact) : null;
    }

    const updated = await prisma.candidate.update({
      where: { id: params.id },
      data,
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
