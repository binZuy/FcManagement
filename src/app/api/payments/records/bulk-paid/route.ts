import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { Role, RecordStatus, PayMethod } from "@prisma/client";

// POST /api/payments/records/bulk-paid — Bulk mark records as paid
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session || session.user.role !== Role.ADMIN) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { recordIds } = body as { recordIds: string[] };

    if (!Array.isArray(recordIds) || recordIds.length === 0) {
      return NextResponse.json({ error: "Chưa chọn khoản thu nào" }, { status: 400 });
    }

    // Clean composite IDs (strip '_self' or '_guest' suffixes)
    const realIds = Array.from(new Set(recordIds.map((id) => id.split("_")[0])));

    const records = await prisma.paymentRecord.findMany({
      where: { id: { in: realIds } },
    });

    if (records.length === 0) {
      return NextResponse.json({ error: "Không tìm thấy dữ liệu khoản đóng" }, { status: 404 });
    }

    await Promise.all(
      records.map((r) =>
        prisma.paymentRecord.update({
          where: { id: r.id },
          data: {
            status: RecordStatus.PAID,
            amountPaid: r.amountRequired,
            paymentMethod: PayMethod.CASH,
            paidAt: new Date(),
          },
        })
      )
    );

    return NextResponse.json({
      success: true,
      count: records.length,
    });
  } catch (error: any) {
    console.error("Bulk mark paid error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
