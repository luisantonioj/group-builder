import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { z } from "zod";

const RegisterSchema = z.object({
  orgName:  z.string().min(2, "Organization name must be at least 2 characters"),
  name:     z.string().min(2, "Your name must be at least 2 characters"),
  email:    z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

function slugify(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = RegisterSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { orgName, name, email, password } = parsed.data;
  const slug = slugify(orgName);

  if (!slug) {
    return NextResponse.json({ error: "Could not generate a valid organization slug from the name provided" }, { status: 400 });
  }

  try {
    // Check slug uniqueness
    const existing = await prisma.organization.findUnique({ where: { slug } });
    if (existing) {
      return NextResponse.json({ error: "An organization with a similar name already exists. Try a more specific name." }, { status: 409 });
    }

    // Create org, config, and admin user in a transaction
    const result = await prisma.$transaction(async (tx) => {
      const org = await tx.organization.create({
        data: { name: orgName, slug, isBld: false },
      });

      await tx.orgConfig.create({
        data: {
          orgId:            org.id,
          termCandidate:    "Participant",
          termGroup:        "Group",
          termEvent:        "Event",
          termShepherd:     "Facilitator",
          termHeadShepherd: "Admin",
          features: { importExcel: true },
        },
      });

      const passwordHash = await bcrypt.hash(password, 12);
      await tx.user.create({
        data: { email, name, passwordHash, role: "ADMIN", orgId: org.id },
      });

      return { orgSlug: org.slug, orgName: org.name };
    });

    return NextResponse.json(result, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to register organization. Please try again." }, { status: 500 });
  }
}
