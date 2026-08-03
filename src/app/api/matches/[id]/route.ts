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
import { calculateMemberFee } from "@/lib/fee-calculator";

type Params = { params: Promise<{ id: string }> };

// GET /api/matches/:id — Match detail with attendances
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
    return NextResponse.json({ error: "Match not found" }, { status: 404 });
  }

  return NextResponse.json({ data: match });
}

// PUT /api/matches/:id — Update match, set result, trigger fee calculation
export async function PUT(request: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.role !== Role.ADMIN) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json();
  const { result, status, title, location, note, feeWinner, feeLose, feeDraw, feeDefault, feeTotal, drinksFeeTotal } = body;

  console.log("PUT Match Session Payload:", { id, result, status, feeTotal });

  const match = await prisma.matchSession.findUnique({
    where: { id },
    include: { attendances: true },
  });
  if (!match) {
    return NextResponse.json({ error: "Match not found" }, { status: 404 });
  }

  // Update match
  const updated = await prisma.matchSession.update({
    where: { id },
    data: {
      title,
      location,
      note,
      status: status as MatchStatus | undefined,
      result: (result === "" ? null : result) as MatchResult | null | undefined,
      feeTotal: feeTotal !== undefined ? parseFloat(feeTotal) : undefined,
      feeWinner: feeWinner !== undefined ? parseFloat(feeWinner) : undefined,
      feeLose: feeLose !== undefined ? parseFloat(feeLose) : undefined,
      feeDraw: feeDraw !== undefined ? parseFloat(feeDraw) : undefined,
      feeDefault: feeDefault !== undefined ? parseFloat(feeDefault) : undefined,
      drinksFeeTotal: drinksFeeTotal !== undefined ? parseFloat(drinksFeeTotal) : undefined,
    },
  });

  console.log("PUT Match Session Updated in DB:", { id: updated.id, result: updated.result, status: updated.status });

  const activeAttendances = match.attendances.filter(
    (a) => a.status === AttendStatus.ATTENDED || a.status === AttendStatus.LATE
  );

  // Calculate base fee if feeTotal is provided
  let baseFeePerPerson = 0;
  if (updated.feeTotal && updated.feeTotal > 0) {
    const matchHeads = activeAttendances.reduce((acc, a) => acc + 1 + (a.guestCount || 0), 0);
    if (matchHeads > 0) {
      baseFeePerPerson = updated.feeTotal / matchHeads;
    }
  }

  // Calculate drinks fee per person
  let drinksFeePerPerson = 0;
  if (updated.drinksFeeTotal && updated.drinksFeeTotal > 0) {
    const drinkHeads = activeAttendances
      .reduce((acc, a) => acc + (a.isDrinks ? 1 : 0) + (a.drinksGuestCount || 0), 0);
    if (drinkHeads > 0) {
      drinksFeePerPerson = updated.drinksFeeTotal / drinkHeads;
    }
  }

  // If result is set, update fee_assigned for each attended member
  if (match.attendances.length > 0) {
    await Promise.all(
      activeAttendances.map((attendance) => {
        // Determine this member's result based on team side
        let memberResult: MatchResult | null = null;
        if (result && attendance.teamSide === TeamSide.TEAM_A) {
          memberResult = result as MatchResult;
        } else if (result && attendance.teamSide === TeamSide.TEAM_B) {
          // Opposite result for team B
          if (result === MatchResult.WIN) memberResult = MatchResult.LOSE;
          else if (result === MatchResult.LOSE) memberResult = MatchResult.WIN;
          else memberResult = MatchResult.DRAW;
        } else {
          memberResult = result as MatchResult | null;
        }

        let fee = attendance.feeAssigned;
        if (result) {
          if (updated.feeTotal && updated.feeTotal > 0) {
            fee = baseFeePerPerson * (1 + (attendance.guestCount || 0));
          } else {
            const singleFee = calculateMemberFee(
              {
                matchType: match.matchType,
                feeWinner: updated.feeWinner,
                feeLose: updated.feeLose,
                feeDraw: updated.feeDraw,
                feeDefault: updated.feeDefault,
              },
              memberResult
            );
            fee = singleFee * (1 + (attendance.guestCount || 0));
          }
        }

        const memberDrinkHeads = (attendance.isDrinks ? 1 : 0) + (attendance.drinksGuestCount || 0);
        const drinksFee = memberDrinkHeads * drinksFeePerPerson;

        return prisma.matchAttendance.update({
          where: { id: attendance.id },
          data: { matchResultForMember: memberResult, feeAssigned: fee, drinksFeeAssigned: drinksFee },
        });
      })
    );
  }

  return NextResponse.json({ data: updated });
}

// POST /api/matches/:id/finalize — Create PaymentSession from match result
export async function POST(request: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.role !== Role.ADMIN) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json();
  const { dueDate } = body;

  console.log("POST Finalize Request for Match:", id);

  const match = await prisma.matchSession.findUnique({
    where: { id },
    include: {
      attendances: {
        where: {
          status: { in: [AttendStatus.ATTENDED, AttendStatus.LATE] },
        },
      },
    },
  });

  if (!match) {
    return NextResponse.json({ error: "Match not found" }, { status: 404 });
  }

  console.log("POST Finalize Match Status from DB:", { result: match.result, status: match.status });

  if (!match.result) {
    return NextResponse.json(
      { error: "Match result must be set before creating payment session" },
      { status: 400 }
    );
  }

  // Create PaymentSession
  const paySession = await prisma.paymentSession.create({
    data: {
      code: match.code,
      title: `Tiền sân: ${match.title}`,
      type: PaymentType.MATCH_FEE,
      matchId: match.id,
      dueDate: dueDate ? new Date(dueDate) : undefined,
      status: PaymentStatus.OPEN,
    },
  });

  // Create PaymentRecord for each attended member
  const records = match.attendances.map((a) => {
    const baseFee = a.feeAssigned ?? match.feeDefault ?? 0;
    const drinksFee = a.drinksFeeAssigned ?? 0;
    return {
      sessionId: paySession.id,
      memberId: a.memberId,
      amountRequired: baseFee + drinksFee,
      status: RecordStatus.PENDING,
    };
  });

  await prisma.paymentRecord.createMany({ data: records });

  return NextResponse.json({ data: paySession }, { status: 201 });
}
