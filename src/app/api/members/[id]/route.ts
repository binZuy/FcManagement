import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { MemberStatus, Position, Role } from "@prisma/client";

type Params = { params: Promise<{ id: string }> };

// GET /api/members/:id — Member detail with full history
export async function GET(_req: NextRequest, { params }: Params) {


  const { id } = await params;

  const member = await prisma.member.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, name: true, email: true, image: true, phone: true } },
      attendances: {
        include: { match: true },
        orderBy: { match: { matchDate: "desc" } },
        take: 20,
      },
      paymentRecords: {
        include: { session: true, sepayTx: true },
        orderBy: { createdAt: "desc" },
        take: 20,
      },
    },
  });

  if (!member) {
    return NextResponse.json({ error: "Member not found" }, { status: 404 });
  }

  return NextResponse.json({ data: member });
}

// PUT /api/members/:id — Update member (ADMIN only)
export async function PUT(request: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.role !== Role.ADMIN) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json();
  const { name, phone, jerseyNumber, position, status, note } = body;

  const member = await prisma.member.findUnique({
    where: { id },
    include: { user: true },
  });
  if (!member) {
    return NextResponse.json({ error: "Member not found" }, { status: 404 });
  }

  const [updatedMember] = await prisma.$transaction([
    prisma.member.update({
      where: { id },
      data: {
        jerseyNumber: jerseyNumber !== undefined ? parseInt(jerseyNumber) : undefined,
        position: position as Position | undefined,
        status: status as MemberStatus | undefined,
        note,
      },
      include: { user: true },
    }),
    prisma.user.update({
      where: { id: member.userId },
      data: { name, phone },
    }),
  ]);

  return NextResponse.json({ data: updatedMember });
}

// DELETE /api/members/:id — Soft delete (set INACTIVE)
export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.role !== Role.ADMIN) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  await prisma.member.update({
    where: { id },
    data: { status: MemberStatus.INACTIVE },
  });

  return NextResponse.json({ success: true });
}
