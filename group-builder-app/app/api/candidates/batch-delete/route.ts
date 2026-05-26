import { NextRequest, NextResponse } from "next/server";
import { requireOrgSession } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const session = await requireOrgSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (session.userRole !== "ADMIN" && session.userRole !== "SHEPHERD") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { ids } = await req.json() as { ids: string[] };
  if (!ids?.length) {
    return NextResponse.json({ error: "No IDs provided" }, { status: 400 });
  }

  try {
    // Verify ownership for all candidates before deleting
    const count = await prisma.candidate.count({
      where: {
        id: { in: ids },
        event: { orgId: session.orgId },
      },
    });

    if (count !== ids.length) {
      return NextResponse.json({ error: "Some candidates not found or unauthorized" }, { status: 403 });
    }

    await prisma.candidate.deleteMany({
      where: { id: { in: ids } },
    });

    return NextResponse.json({ message: `Deleted ${ids.length} candidates` });
  } catch {
    return NextResponse.json({ error: "Failed to delete candidates" }, { status: 500 });
  }
}
