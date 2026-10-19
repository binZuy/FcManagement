import { prisma } from "@/lib/prisma";
import { RecordStatus } from "@prisma/client";

/**
 * Kiểm tra xem thành viên sau khi thanh toán có còn nợ trận nào không.
 * Nếu đã thanh toán sạch (0 khoản nợ) -> Thưởng 1 lượt quay may mắn!
 */
export async function checkAndAwardCleanPaymentSpin(memberId: string): Promise<boolean> {
  try {
    const unpaidCount = await prisma.paymentRecord.count({
      where: {
        memberId,
        status: { not: RecordStatus.WAIVED },
        amountRequired: { gt: prisma.paymentRecord.fields.amountPaid },
      },
    });

    // Nếu không còn khoản nào chưa đóng
    if (unpaidCount === 0) {
      await prisma.member.update({
        where: { id: memberId },
        data: {
          spinsAvailable: { increment: 1 },
        },
      });
      return true;
    }
  } catch (error) {
    console.error("Lỗi khi kiểm tra & thưởng lượt quay:", error);
  }
  return false;
}
