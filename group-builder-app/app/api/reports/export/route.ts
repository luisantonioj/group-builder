import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Generates a JSON export of all data for the batch.
// The frontend can use SheetJS to write this to .xlsx.
// Full PDF generation with pdfkit would be added in a future enhancement.

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = (session.user as { role?: string })?.role;
  if (role === "VIEWER") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const batchId = req.nextUrl.searchParams.get("batchId");
  const format = req.nextUrl.searchParams.get("format") ?? "json";

  try {
    const [candidates, groups, rooms, connections] = await Promise.all([
      prisma.candidate.findMany({ where: batchId ? { batchId } : undefined, orderBy: { fullName: "asc" } }),
      prisma.group.findMany({ where: batchId ? { batchId } : undefined }),
      prisma.room.findMany({ where: batchId ? { batchId } : undefined }),
      prisma.connection.findMany(),
    ]);

    const payload = { candidates, groups, rooms, connections, exportedAt: new Date().toISOString() };

    if (format === "json") {
      return new NextResponse(JSON.stringify(payload, null, 2), {
        headers: {
          "Content-Type": "application/json",
          "Content-Disposition": `attachment; filename="ye-export-${Date.now()}.json"`,
          "Cache-Control": "no-store",
        },
      });
    }

    return NextResponse.json({ error: "Unsupported format — use format=json" }, { status: 400 });
  } catch {
    return NextResponse.json({ error: "Database not configured. Run setup first." }, { status: 503 });
  }
}
