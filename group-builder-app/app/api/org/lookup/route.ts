import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Public endpoint — no auth required. Returns org display name for a given slug.
// Used only by the login page UX to show "Signing into: [Org Name]".
export async function GET(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get("slug")?.trim();
  if (!slug) return NextResponse.json({ error: "slug required" }, { status: 400 });

  try {
    const org = await prisma.organization.findUnique({
      where: { slug },
      select: { name: true, isBld: true },
    });
    if (!org) return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    return NextResponse.json({ name: org.name, isBld: org.isBld });
  } catch {
    // DB not configured — return demo org info for BLD slug in development
    if (process.env.NODE_ENV === "development" && slug === "bld-youth-ministry") {
      return NextResponse.json({ name: "BLD Youth Ministry", isBld: true });
    }
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }
}
