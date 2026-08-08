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
      include: {
        session: {
          include: { match: { include: { attendances: true } } }
        }
      }
    });

    if (records.length === 0) {
      return NextResponse.json({ error: "Không tìm thấy dữ liệu khoản đóng" }, { status: 404 });
    }

    await Promise.all(
      records.map((r) => {
        const hasSelf = recordIds.includes(r.id + "_self");
        const hasGuest = recordIds.includes(r.id + "_guest");
        const hasPlain = recordIds.includes(r.id);

        let targetAmountPaid = r.amountRequired;
        let targetStatus: RecordStatus = RecordStatus.PAID;

        // Nếu chỉ tick thu phần Thành viên (_self) mà không tick phần Bạn (_guest) và không tick bản ghi gốc
        if (hasSelf && !hasGuest && !hasPlain) {
          const att = r.session.match?.attendances.find((a) => a.memberId === r.memberId);
          if (att && (att.guestCount > 0 || att.drinksGuestCount > 0)) {
            const totalHeads = 1 + att.guestCount;
            const drinkHeads = (att.isDrinks ? 1 : 0) + att.drinksGuestCount;
            const baseFeePerHead = (att.feeAssigned ?? 0) / (totalHeads || 1);
            const drinksFeePerHead = drinkHeads > 0 ? (att.drinksFeeAssigned ?? 0) / (drinkHeads || 1) : 0;
            const memberSelfFee = Math.round(baseFeePerHead + (att.isDrinks ? drinksFeePerHead : 0));

            targetAmountPaid = Math.min(r.amountRequired, memberSelfFee);
            if (targetAmountPaid < r.amountRequired) {
              targetStatus = RecordStatus.PENDING;
            }
          }
        }

        return prisma.paymentRecord.update({
          where: { id: r.id },
          data: {
            status: targetStatus,
            amountPaid: targetAmountPaid,
            paymentMethod: PayMethod.CASH,
            paidAt: new Date(),
          },
        });
      })
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
