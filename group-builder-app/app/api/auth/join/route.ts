import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { z } from "zod";

const JoinSchema = z.object({
  orgSlug:  z.string().min(1, "Organization slug is required"),
  name:     z.string().min(2, "Your name must be at least 2 characters"),
  email:    z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = JoinSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { orgSlug, name, email, password } = parsed.data;

  try {
    const org = await prisma.organization.findUnique({ where: { slug: orgSlug } });
    if (!org) {
      return NextResponse.json({ error: "Organization not found. Check the slug and try again." }, { status: 404 });
    }

    // Check email uniqueness within this org
    const existing = await prisma.user.findFirst({ where: { email, orgId: org.id } });
    if (existing) {
      return NextResponse.json({ error: "An account with this email already exists in this organization." }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    await prisma.user.create({
      data: { email, name, passwordHash, role: "SHEPHERD", orgId: org.id },
    });

    return NextResponse.json({ orgSlug: org.slug }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to join organization. Please try again." }, { status: 500 });
  }
}
