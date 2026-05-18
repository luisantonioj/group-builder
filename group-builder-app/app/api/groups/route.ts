import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const batchId = req.nextUrl.searchParams.get("batchId");
  try {
    const groups = await prisma.group.findMany({
      where: batchId ? { batchId } : undefined,
      include: { candidates: { select: { id: true, fullName: true, gender: true } } },
      orderBy: { name: "asc" },
    });
    return NextResponse.json({ data: groups });
  } catch {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  try {
    const group = await prisma.group.create({ data: body });
    return NextResponse.json({ data: group }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to create group" }, { status: 500 });
  }
}
