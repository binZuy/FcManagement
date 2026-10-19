import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { RecordStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

// GET /api/wheel/spin — Lấy lịch sử quay gần đây công khai của toàn bộ FC
export async function GET() {
  try {
    const history = await prisma.memberReward.findMany({
      take: 30,
      orderBy: { createdAt: "desc" },
      include: {
        member: {
          include: {
            user: { select: { name: true, image: true } },
          },
        },
      },
    });

    const formatted = history.map((h) => ({
      id: h.id,
      name: h.member.user.name || h.member.code,
      image: h.member.user.image,
      prize: `${h.icon} ${h.label}`,
      prizeId: h.prizeId,
      discountAmount: h.discountAmount,
      isFreeMatch: h.isFreeMatch,
      isUsed: h.isUsed,
      createdAt: h.createdAt,
    }));

    return NextResponse.json({ success: true, history: formatted });
  } catch (error: any) {
    console.error("Lỗi lấy lịch sử quay:", error);
    return NextResponse.json({ error: error.message || "Lỗi server" }, { status: 500 });
  }
}

// POST /api/wheel/spin — Thực hiện trừ lượt quay và lưu phần thưởng
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { memberId, prizeId, label, icon } = body;

    if (!memberId || !prizeId || !label) {
      return NextResponse.json({ error: "Thiếu thông tin người quay hoặc phần thưởng" }, { status: 400 });
    }

    const member = await prisma.member.findUnique({
      where: { id: memberId },
      include: {
        user: { select: { name: true } },
        paymentRecords: {
          select: {
            status: true,
            amountRequired: true,
            amountPaid: true,
          },
        },
      },
    });

    if (!member) {
      return NextResponse.json({ error: "Không tìm thấy thành viên" }, { status: 404 });
    }

    // 1. Kiểm tra thành viên có nợ trận đấu nào không
    const unpaidCount = member.paymentRecords.filter(
      (r) => r.status !== RecordStatus.WAIVED && (r.amountRequired - r.amountPaid) > 0
    ).length;

    if (unpaidCount > 0) {
      return NextResponse.json(
        { error: `Thành viên còn nợ ${unpaidCount} trận. Phải thanh toán hết sạch bill mới được quay!` },
        { status: 400 }
      );
    }

    // 2. Kiểm tra số lượt quay còn lại
    if (member.spinsAvailable <= 0) {
      return NextResponse.json(
        { error: "Thành viên đã hết lượt quay! Hãy tham gia trận tiếp theo và thanh toán đủ để nhận thêm lượt nhé!" },
        { status: 400 }
      );
    }

    // 3. Trừ 1 lượt quay và tạo bản ghi Reward
    const discountAmount = prizeId === "4" ? 5000 : 0;
    const isFreeMatch = prizeId === "6";
    const isFreeDrink = prizeId === "5";

    const [updatedMember, newReward] = await prisma.$transaction([
      prisma.member.update({
        where: { id: memberId },
        data: {
          spinsAvailable: { decrement: 1 },
        },
      }),
      prisma.memberReward.create({
        data: {
          memberId,
          prizeId,
          label,
          icon: icon || "🎁",
          discountAmount,
          isFreeMatch,
          isFreeDrink,
          isUsed: false,
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      spinsRemaining: updatedMember.spinsAvailable,
      reward: newReward,
    });
  } catch (error: any) {
    console.error("Lỗi khi xử lý vòng quay:", error);
    return NextResponse.json({ error: error.message || "Lỗi server" }, { status: 500 });
  }
}
