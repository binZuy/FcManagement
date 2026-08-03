import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { Role } from "@prisma/client";

// GET /api/admin/allowed-emails
export async function GET() {
  const session = await auth();
  if (!session?.user || session.user.role !== Role.ADMIN) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const emails = await prisma.allowedEmail.findMany({
    orderBy: { addedAt: "desc" },
  });

  return NextResponse.json({ data: emails });
}

// POST /api/admin/allowed-emails
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== Role.ADMIN) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const { email, label } = body;

  if (!email) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }

  const allowed = await prisma.allowedEmail.upsert({
    where: { email },
    update: { label },
    create: { email, label },
  });

  return NextResponse.json({ data: allowed }, { status: 201 });
}

// DELETE /api/admin/allowed-emails
export async function DELETE(request: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== Role.ADMIN) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const { email } = body;

  await prisma.allowedEmail.delete({ where: { email } });

  return NextResponse.json({ success: true });
}
