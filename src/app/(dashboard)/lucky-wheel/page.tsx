import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { RecordStatus } from "@prisma/client";
import { calculateLatePenalty } from "@/lib/fee-calculator";
import { LuckyWheelClient } from "@/components/LuckyWheelClient";

export const dynamic = "force-dynamic";

export default async function LuckyWheelPage() {
  const session = await auth();

  // Tính tổng tiền phạt trễ từ các thành viên đang nợ >= 4 trận
  const members = await prisma.member.findMany({
    include: {
      paymentRecords: {
        where: {
          status: { in: [RecordStatus.PENDING, RecordStatus.OVERDUE] },
        },
        select: { createdAt: true, status: true },
      },
    },
  });

  const totalLatePenalties = members.reduce((sum, m) => {
    const penalty = calculateLatePenalty(m.paymentRecords);
    return sum + penalty.lateFee;
  }, 0);

  const totalPoolAmount = 20000 + totalLatePenalties;

  const currentUser = session?.user
    ? {
        name: session.user.name,
        role: session.user.role || "MEMBER",
      }
    : null;

  return (
    <LuckyWheelClient
      currentUser={currentUser}
      totalPoolAmount={totalPoolAmount}
    />
  );
}
