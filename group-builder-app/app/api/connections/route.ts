import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const batchId = req.nextUrl.searchParams.get("batchId");
  try {
    const connections = await prisma.connection.findMany({
      include: {
        from: { select: { id: true, fullName: true, gender: true, batchId: true } },
        to: { select: { id: true, fullName: true, gender: true, batchId: true } },
      },
    });
    const filtered = batchId
      ? connections.filter((c) => c.from.batchId === batchId || c.to.batchId === batchId)
      : connections;
    return NextResponse.json({ data: filtered });
  } catch {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  try {
    const conn = await prisma.connection.create({ data: body });
    return NextResponse.json({ data: conn }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to create connection" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await req.json() as { id: string };
  try {
    await prisma.connection.delete({ where: { id } });
    return NextResponse.json({ message: "Deleted" });
  } catch {
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}
