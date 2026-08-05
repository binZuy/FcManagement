import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { MatchType, MatchResult, Role, MatchStatus, AttendStatus, TeamSide } from "@prisma/client";

// POST /api/matches/import
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.role !== Role.ADMIN) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const { matches } = body as {
    matches: Array<{
      title: string;
      matchDate: string;
      matchType?: MatchType;
      opponentName?: string;
      result?: MatchResult;
      teamA_codes?: string;
      teamB_codes?: string;
      feeTotal?: number;
      drinksFeeTotal?: number;
    }>;
  };

  if (!Array.isArray(matches) || matches.length === 0) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const results = [];
  let successCount = 0;
  let failCount = 0;

  for (const item of matches) {
    try {
      if (!item.title || !item.matchDate) {
        throw new Error("Tên trận và Ngày là bắt buộc");
      }

      // Auto generate code: TS + MMYYYY
      const date = new Date(item.matchDate);
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const year = date.getFullYear();
      let code = `TS${month}${year}`;

      let existing = await prisma.matchSession.findUnique({ where: { code } });
      let counter = 1;
      while (existing) {
        code = `TS${month}${year}-${counter}`;
        existing = await prisma.matchSession.findUnique({ where: { code } });
        counter++;
      }

      // Parse attendance codes
      const codesA = item.teamA_codes ? item.teamA_codes.split(",").map(c => c.trim()).filter(Boolean) : [];
      const codesB = item.teamB_codes ? item.teamB_codes.split(",").map(c => c.trim()).filter(Boolean) : [];
      
      const attendeesA = codesA.length > 0 ? await prisma.member.findMany({ where: { code: { in: codesA } } }) : [];
      const attendeesB = codesB.length > 0 ? await prisma.member.findMany({ where: { code: { in: codesB } } }) : [];

      const mType = item.matchType || MatchType.INTERNAL;
      
      // Calculate opposite result for Team B (if internal)
      let resultB: MatchResult | undefined = undefined;
      if (item.result) {
        if (item.result === MatchResult.WIN) resultB = MatchResult.LOSE;
        else if (item.result === MatchResult.LOSE) resultB = MatchResult.WIN;
        else resultB = MatchResult.DRAW;
      }

      // Create match and attendances in transaction
      const match = await prisma.$transaction(async (tx) => {
        const m = await tx.matchSession.create({
          data: {
            code,
            title: item.title,
            matchDate: date,
            matchType: mType,
            opponentName: item.opponentName || undefined,
            result: item.result || undefined,
            status: item.result ? MatchStatus.DONE : MatchStatus.UPCOMING,
            feeTotal: item.feeTotal || null,
            drinksFeeTotal: item.drinksFeeTotal || null,
          },
        });

        const attendanceData: any[] = [];
        
        // Calculate fees if feeTotal is provided
        const totalHeads = attendeesA.length + attendeesB.length;
        const feePerHead = (item.feeTotal && totalHeads > 0) ? item.feeTotal / totalHeads : 0;
        const drinksFeePerHead = (item.drinksFeeTotal && totalHeads > 0) ? item.drinksFeeTotal / totalHeads : 0;

        // Process Team A
        for (const member of attendeesA) {
          attendanceData.push({
            matchId: m.id,
            memberId: member.id,
            status: AttendStatus.ATTENDED,
            teamSide: mType === MatchType.INTERNAL ? TeamSide.TEAM_A : undefined,
            matchResultForMember: item.result || null,
            feeAssigned: feePerHead,
            drinksFeeAssigned: drinksFeePerHead,
          });
        }

        // Process Team B
        for (const member of attendeesB) {
          attendanceData.push({
            matchId: m.id,
            memberId: member.id,
            status: AttendStatus.ATTENDED,
            teamSide: mType === MatchType.INTERNAL ? TeamSide.TEAM_B : undefined,
            matchResultForMember: mType === MatchType.INTERNAL ? resultB : (item.result || null),
            feeAssigned: feePerHead,
            drinksFeeAssigned: drinksFeePerHead,
          });
        }

        if (attendanceData.length > 0) {
          await tx.matchAttendance.createMany({ data: attendanceData });
        }
        
        return m;
      });

      results.push({ title: item.title, status: "success", match });
      successCount++;
    } catch (error: any) {
      results.push({ title: item.title, status: "error", error: error.message });
      failCount++;
    }
  }

  return NextResponse.json({
    data: {
      total: matches.length,
      successCount,
      failCount,
      results,
    },
  }, { status: 201 });
}
