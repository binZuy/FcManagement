import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import {
  AttendStatus,
  MatchResult,
  MatchStatus,
  Role,
  TeamSide,
  RecordStatus,
  PaymentType,
  PaymentStatus,
} from "@prisma/client";
import { calcFeePerHeadInternal } from "@/lib/fee-calculator";

type Params = { params: Promise<{ id: string }> };

// GET /api/matches/:id
export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params;

  const match = await prisma.matchSession.findUnique({
    where: { id },
    include: {
      attendances: {
        include: {
          member: { include: { user: { select: { name: true, image: true } } } },
        },
        orderBy: { member: { user: { name: "asc" } } },
      },
      paymentSessions: {
        include: { _count: { select: { paymentRecords: true } } },
      },
    },
  });

  if (!match) {
    return NextResponse.json({ error: "Trận đấu không tồn tại" }, { status: 404 });
  }

  return NextResponse.json({ data: match });
}

// Helper: tính fee per head cho 1 attendance, tích hợp cả INTERNAL lẫn EXTERNAL
function resolveFeePH(params: {
  matchType: string;
  result: string | null;
  feeSplitMethod: string;
  feeTotal: number | null;
  feeDefault: number | null;
  feeWinner: number | null;
  feeLose: number | null;
  feeDraw: number | null;
  teamSide: string | null;
  totalHeads: number;
  winningHeads: number;
  losingHeads: number;
}): number {
  const { matchType, result, feeSplitMethod, feeTotal, feeDefault, feeWinner, feeLose, feeDraw,
          teamSide, totalHeads, winningHeads, losingHeads } = params;
  if (!result) return 0;

  if (feeTotal && feeTotal > 0) {
    if (matchType === "INTERNAL") {
      // Dùng calcFeePerHeadInternal từ fee-calculator (kèo lấy từ constants.ts)
      return calcFeePerHeadInternal({
        feeSplitMethod: feeSplitMethod || "EQUAL",
        feeTotal,
        result,
        teamSide,
        totalHeads,
        winningHeads,
        losingHeads,
      });
    } else {
      // EXTERNAL – chia đều
      return totalHeads > 0 ? feeTotal / totalHeads : 0;
    }
  }

  // Dùng feeDefault / feeWinner / feeLose / feeDraw
  if (feeDefault || feeWinner || feeLose || feeDraw) {
    if (matchType === "EXTERNAL") {
      if (result === "WIN") return feeWinner ?? feeDefault ?? 0;
      if (result === "LOSE") return feeLose ?? feeDefault ?? 0;
      if (result === "DRAW") return feeDraw ?? feeDefault ?? 0;
    }
    return feeDefault ?? 0;
  }

  return 0;
}

// Handler cập nhật match + tính feeAssigned cho từng attendance
async function handleUpdateMatch(request: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  if (session.user.role !== Role.ADMIN) return NextResponse.json({ error: "Không có quyền" }, { status: 403 });

  const { id } = await params;
  const body = await request.json();
  const { result, status, title, location, note, feeWinner, feeLose, feeDraw, feeDefault, feeTotal, drinksFeeTotal, feeSplitMethod } = body;

  const match = await prisma.matchSession.findUnique({
    where: { id },
    include: { attendances: true },
  });
  if (!match) return NextResponse.json({ error: "Không tìm thấy trận đấu" }, { status: 404 });

  let finalStatus: MatchStatus = match.status;
  if (status) finalStatus = status as MatchStatus;

  const updated = await prisma.matchSession.update({
    where: { id },
    data: {
      title, location, note,
      status: finalStatus,
      result: (result === "" ? null : result) as MatchResult | null | undefined,
      feeTotal: feeTotal != null ? parseFloat(feeTotal) : undefined,
      feeWinner: feeWinner != null ? parseFloat(feeWinner) : undefined,
      feeLose: feeLose != null ? parseFloat(feeLose) : undefined,
      feeDraw: feeDraw != null ? parseFloat(feeDraw) : undefined,
      feeDefault: feeDefault != null ? parseFloat(feeDefault) : undefined,
      drinksFeeTotal: drinksFeeTotal != null ? parseFloat(drinksFeeTotal) : undefined,
      feeSplitMethod: feeSplitMethod ?? undefined,
    },
  });

  const active = match.attendances.filter(a => a.status === AttendStatus.ATTENDED || a.status === AttendStatus.LATE);
  const totalHeads = active.reduce((s, a) => s + 1 + (a.guestCount || 0), 0);
  const winningTeamSide = result === "WIN" ? TeamSide.TEAM_A : result === "LOSE" ? TeamSide.TEAM_B : null;
  const winningHeads = winningTeamSide ? active.filter(a => a.teamSide === winningTeamSide).reduce((s, a) => s + 1 + (a.guestCount || 0), 0) : 0;
  const losingHeads = winningTeamSide ? active.filter(a => a.teamSide !== winningTeamSide).reduce((s, a) => s + 1 + (a.guestCount || 0), 0) : 0;

  const drinkHeads = active.reduce((s, a) => s + (a.isDrinks ? 1 : 0) + (a.drinksGuestCount || 0), 0);
  const drinksFeePerHead = drinkHeads > 0 && updated.drinksFeeTotal ? updated.drinksFeeTotal / drinkHeads : 0;

  if (active.length > 0) {
    await Promise.all(active.map(a => {
      let memberResult: MatchResult | null = null;
      if (result) {
        if (a.teamSide === TeamSide.TEAM_A) memberResult = result as MatchResult;
        else if (a.teamSide === TeamSide.TEAM_B) {
          if (result === "WIN") memberResult = MatchResult.LOSE;
          else if (result === "LOSE") memberResult = MatchResult.WIN;
          else memberResult = MatchResult.DRAW;
        } else memberResult = result as MatchResult;
      }

      const fpH = resolveFeePH({
        matchType: match.matchType,
        result,
        feeSplitMethod: feeSplitMethod || "EQUAL",
        feeTotal: updated.feeTotal,
        feeDefault: updated.feeDefault,
        feeWinner: updated.feeWinner,
        feeLose: updated.feeLose,
        feeDraw: updated.feeDraw,
        teamSide: a.teamSide,
        totalHeads,
        winningHeads,
        losingHeads,
      });

      const feeAssigned = fpH * (1 + (a.guestCount || 0));
      const drinksFeeAssigned = ((a.isDrinks ? 1 : 0) + (a.drinksGuestCount || 0)) * drinksFeePerHead;

      return prisma.matchAttendance.update({
        where: { id: a.id },
        data: { matchResultForMember: memberResult, feeAssigned, drinksFeeAssigned },
      });
    }));
  }

  return NextResponse.json({ data: updated });
}

export async function PUT(request: NextRequest, ctx: Params) {
  return handleUpdateMatch(request, ctx);
}

export async function PATCH(request: NextRequest, ctx: Params) {
  return handleUpdateMatch(request, ctx);
}

// POST /api/matches/:id — Tạo / Đồng bộ PaymentSession từ kết quả trận
export async function POST(request: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  if (session.user.role !== Role.ADMIN) return NextResponse.json({ error: "Không có quyền" }, { status: 403 });

  const { id } = await params;

  // Lấy match với tất cả attendance hiện tại (đã được upsert)
  const match = await prisma.matchSession.findUnique({
    where: { id },
    include: {
      attendances: {
        where: { status: { in: [AttendStatus.ATTENDED, AttendStatus.LATE] } },
      },
      paymentSessions: { include: { paymentRecords: true } },
    },
  });

  if (!match) return NextResponse.json({ error: "Không tìm thấy trận đấu" }, { status: 404 });

  await prisma.matchSession.update({ where: { id }, data: { status: MatchStatus.DONE } });

  // Tạo phiên thu tiền nếu chưa có
  let paySession = match.paymentSessions[0];
  if (!paySession) {
    paySession = await prisma.paymentSession.create({
      data: {
        code: match.code,
        title: `Tiền sân: ${match.title}`,
        type: PaymentType.MATCH_FEE,
        matchId: match.id,
        status: PaymentStatus.OPEN,
      },
    }) as any;
    (paySession as any).paymentRecords = [];
  }

  const active = match.attendances;
  if (active.length === 0) {
    return NextResponse.json({ data: paySession, warning: "Chưa có thành viên điểm danh" }, { status: 200 });
  }

  // Tính lại fee từ đầu để đồng nhất (không phụ thuộc feeAssigned cũ)
  const totalHeads = active.reduce((s, a) => s + 1 + (a.guestCount || 0), 0);
  const winningTeamSide = match.result === "WIN" ? "TEAM_A" : match.result === "LOSE" ? "TEAM_B" : null;
  const winningHeads = winningTeamSide ? active.filter(a => a.teamSide === winningTeamSide).reduce((s, a) => s + 1 + (a.guestCount || 0), 0) : 0;
  const losingHeads = winningTeamSide ? active.filter(a => a.teamSide !== winningTeamSide).reduce((s, a) => s + 1 + (a.guestCount || 0), 0) : 0;

  const drinkHeads = active.reduce((s, a) => s + (a.isDrinks ? 1 : 0) + (a.drinksGuestCount || 0), 0);
  const drinksFeePerHead = drinkHeads > 0 && match.drinksFeeTotal ? match.drinksFeeTotal / drinkHeads : 0;

  const existingRecords: any[] = (paySession as any).paymentRecords ?? [];

  for (const a of active) {
    const fpH = resolveFeePH({
      matchType: match.matchType,
      result: match.result,
      feeSplitMethod: match.feeSplitMethod || "EQUAL",
      feeTotal: match.feeTotal,
      feeDefault: match.feeDefault,
      feeWinner: match.feeWinner,
      feeLose: match.feeLose,
      feeDraw: match.feeDraw,
      teamSide: a.teamSide,
      totalHeads,
      winningHeads,
      losingHeads,
    });

    // Tiền bản thân
    const selfFee = fpH + (a.isDrinks ? drinksFeePerHead : 0);
    // Tiền bạn đi cùng
    const guestFee = (a.guestCount || 0) * fpH + (a.drinksGuestCount || 0) * drinksFeePerHead;
    // Tổng tiền = bản thân + bạn đi cùng (vì unique constraint chỉ cho 1 record/member)
    const totalFee = Math.round(selfFee + guestFee);

    // note để UI biết breakdown: "Bạn: 3 người" hoặc null
    const noteText = (a.guestCount || 0) > 0
      ? `Bạn: ${a.guestCount} người (+${Math.round(guestFee).toLocaleString("vi-VN")}đ)`
      : null;

    // Cập nhật attendance để đồng bộ
    await prisma.matchAttendance.update({
      where: { id: a.id },
      data: {
        feeAssigned: fpH * (1 + (a.guestCount || 0)),
        drinksFeeAssigned: ((a.isDrinks ? 1 : 0) + (a.drinksGuestCount || 0)) * drinksFeePerHead,
      },
    });

    // Tìm record hiện tại (unique: sessionId + memberId)
    const existingRecord = existingRecords.find(r => r.memberId === a.memberId);

    if (existingRecord) {
      if (existingRecord.status !== "PAID") {
        await prisma.paymentRecord.update({
          where: { id: existingRecord.id },
          data: {
            amountRequired: totalFee,
            status: totalFee === 0 ? RecordStatus.WAIVED : existingRecord.status,
            note: noteText,
          },
        });
      }
    } else {
      await prisma.paymentRecord.create({
        data: {
          sessionId: paySession.id,
          memberId: a.memberId,
          amountRequired: totalFee,
          status: totalFee === 0 ? RecordStatus.WAIVED : RecordStatus.PENDING,
          note: noteText,
        },
      });
    }
  }

  return NextResponse.json({ data: paySession }, { status: 200 });
}
