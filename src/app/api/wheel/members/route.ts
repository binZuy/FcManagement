import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { RecordStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const members = await prisma.member.findMany({
      where: { status: "ACTIVE" },
      include: {
        user: { select: { name: true, image: true, email: true } },
        paymentRecords: {
          select: {
            id: true,
            status: true,
            amountRequired: true,
            amountPaid: true,
          },
        },
        rewards: {
          where: { isUsed: false },
          orderBy: { createdAt: "desc" },
        },
      },
      orderBy: { user: { name: "asc" } },
    });

    const result = await Promise.all(
      members.map(async (m) => {
        const unpaidRecords = m.paymentRecords.filter(
          (r) => r.status !== RecordStatus.WAIVED && (r.amountRequired - r.amountPaid) > 0
        );
        const unpaidCount = unpaidRecords.length;
        const totalDebt = unpaidRecords.reduce((sum, r) => sum + (r.amountRequired - r.amountPaid), 0);

        let spins = m.spinsAvailable;

        // Nếu thành viên đã đóng đủ tiền hoàn toàn, nhưng spins = 0 và chưa từng quay lần nào -> tặng 1 lượt khởi đầu
        if (unpaidCount === 0 && spins === 0) {
          const totalRewardsCount = await prisma.memberReward.count({ where: { memberId: m.id } });
          if (totalRewardsCount === 0 && m.paymentRecords.length > 0) {
            await prisma.member.update({
              where: { id: m.id },
              data: { spinsAvailable: 1 },
            });
            spins = 1;
          }
        }

        return {
          id: m.id,
          name: m.user.name || "Cầu thủ",
          code: m.code,
          image: m.user.image,
          jerseyNumber: m.jerseyNumber,
          unpaidCount,
          totalDebt,
          spinsAvailable: spins,
          canSpin: unpaidCount === 0 && spins > 0,
          rewards: m.rewards.map((rw) => ({
            id: rw.id,
            prizeId: rw.prizeId,
            label: rw.label,
            icon: rw.icon,
            discountAmount: rw.discountAmount,
            isFreeMatch: rw.isFreeMatch,
            isFreeDrink: rw.isFreeDrink,
            createdAt: rw.createdAt,
          })),
        };
      })
    );

    return NextResponse.json({ success: true, members: result });
  } catch (error: any) {
    console.error("Lỗi lấy danh sách thành viên vòng quay:", error);
    return NextResponse.json({ error: error.message || "Lỗi server" }, { status: 500 });
  }
}
