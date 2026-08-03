import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { generateMemberCode } from "@/lib/utils";
import { MemberStatus, Position, Role } from "@prisma/client";

// GET /api/members — List all members
export async function GET(request: NextRequest) {


  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") as MemberStatus | null;
  const position = searchParams.get("position") as Position | null;

  const members = await prisma.member.findMany({
    where: {
      ...(status ? { status } : {}),
      ...(position ? { position } : {}),
    },
    include: {
      user: {
        select: { id: true, name: true, email: true, image: true, phone: true, role: true },
      },
    },
    orderBy: [{ status: "asc" }, { user: { name: "asc" } }],
  });

  return NextResponse.json({ data: members });
}

// POST /api/members — Create new member (ADMIN only)
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.role !== Role.ADMIN) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const { name, email, phone, jerseyNumber, position, joinDate, note } = body;

  if (!name || !email) {
    return NextResponse.json(
      { error: "Name and email are required" },
      { status: 400 }
    );
  }

  // Add email to whitelist if not already
  await prisma.allowedEmail.upsert({
    where: { email },
    update: { label: name },
    create: { email, label: name },
  });

  // Create or find user
  let user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    user = await prisma.user.create({
      data: { name, email, phone, role: Role.MEMBER },
    });
  } else {
    await prisma.user.update({
      where: { id: user.id },
      data: { name, phone },
    });
  }

  // Check if member already exists
  const existingMember = await prisma.member.findUnique({
    where: { userId: user.id },
  });
  if (existingMember) {
    return NextResponse.json(
      { error: "Member already exists for this user" },
      { status: 409 }
    );
  }

  // Generate unique member code
  let code = generateMemberCode(name);
  const existingCode = await prisma.member.findUnique({ where: { code } });
  if (existingCode) {
    code = code + Math.floor(Math.random() * 99);
  }

  const member = await prisma.member.create({
    data: {
      userId: user.id,
      code,
      jerseyNumber: jerseyNumber ? parseInt(jerseyNumber) : undefined,
      position: position as Position | undefined,
      joinDate: joinDate ? new Date(joinDate) : new Date(),
      note,
    },
    include: { user: true },
  });

  return NextResponse.json({ data: member }, { status: 201 });
}
