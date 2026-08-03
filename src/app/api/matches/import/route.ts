import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { MatchType, MatchResult, Role, MatchStatus, AttendStatus } from "@prisma/client";

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
      attendanceCodes?: string;
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
      const codes = item.attendanceCodes 
        ? item.attendanceCodes.split(",").map(c => c.trim()).filter(Boolean)
        : [];
      
      const attendees = await prisma.member.findMany({
        where: { code: { in: codes } }
      });

      // Create match and attendances in transaction
      const match = await prisma.$transaction(async (tx) => {
        const m = await tx.matchSession.create({
          data: {
            code,
            title: item.title,
            matchDate: date,
            matchType: item.matchType || MatchType.INTERNAL,
            opponentName: item.opponentName || undefined,
            result: item.result || undefined,
            status: item.result ? MatchStatus.DONE : MatchStatus.UPCOMING,
          },
        });

        if (attendees.length > 0) {
          await tx.matchAttendance.createMany({
            data: attendees.map(member => ({
              matchId: m.id,
              memberId: member.id,
              status: AttendStatus.ATTENDED,
            }))
          });
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
