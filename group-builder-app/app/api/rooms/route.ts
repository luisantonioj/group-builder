import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const batchId = req.nextUrl.searchParams.get("batchId");
  try {
    const rooms = await prisma.room.findMany({
      where: batchId ? { batchId } : undefined,
      include: { candidates: { select: { id: true, fullName: true, gender: true, groupId: true } } },
      orderBy: { name: "asc" },
    });
    return NextResponse.json({ data: rooms });
  } catch {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  try {
    const room = await prisma.room.create({ data: body });
    return NextResponse.json({ data: room }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to create room" }, { status: 500 });
  }
}
