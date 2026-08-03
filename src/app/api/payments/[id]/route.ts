import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { Role, RecordStatus, PayMethod } from "@prisma/client";

type Params = { params: Promise<{ id: string }> };

// GET /api/payments/:id — Payment session detail
export async function GET(_req: NextRequest, { params }: Params) {


  const { id } = await params;

  const paySession = await prisma.paymentSession.findUnique({
    where: { id },
    include: {
      match: true,
      paymentRecords: {
        include: {
          member: {
            include: { user: { select: { name: true, email: true, image: true } } },
          },
          sepayTx: true,
        },
        orderBy: [{ status: "asc" }, { member: { user: { name: "asc" } } }],
      },
    },
  });

  if (!paySession) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  // Calculate summary
  const total = paySession.paymentRecords.reduce(
    (sum, r) => sum + r.amountRequired,
    0
  );
  const paid = paySession.paymentRecords
    .filter((r) => r.status === RecordStatus.PAID)
    .reduce((sum, r) => sum + r.amountPaid, 0);

  return NextResponse.json({
    data: paySession,
    summary: {
      total,
      paid,
      remaining: total - paid,
      paidCount: paySession.paymentRecords.filter(
        (r) => r.status === RecordStatus.PAID
      ).length,
      totalCount: paySession.paymentRecords.length,
    },
  });
}

// PATCH /api/payments/:id — Update payment record (manual cash payment)
export async function PATCH(request: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.role !== Role.ADMIN) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id: sessionId } = await params;
  const body = await request.json();
  const { memberId, status, paymentMethod, amountPaid, note } = body;

  const record = await prisma.paymentRecord.findUnique({
    where: { sessionId_memberId: { sessionId, memberId } },
  });

  if (!record) {
    return NextResponse.json({ error: "Record not found" }, { status: 404 });
  }

  const updated = await prisma.paymentRecord.update({
    where: { id: record.id },
    data: {
      status: status as RecordStatus,
      paymentMethod: paymentMethod as PayMethod | undefined,
      amountPaid: amountPaid !== undefined ? parseFloat(amountPaid) : undefined,
      paidAt: status === RecordStatus.PAID ? new Date() : null,
      note,
    },
  });

  return NextResponse.json({ data: updated });
}
