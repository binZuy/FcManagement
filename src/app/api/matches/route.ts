import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { MatchType, MatchStatus, Role } from "@prisma/client";

// GET /api/matches — List matches
export async function GET(request: NextRequest) {


  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") as MatchStatus | null;

  const matches = await prisma.matchSession.findMany({
    where: { ...(status ? { status } : {}) },
    include: {
      _count: { select: { attendances: true } },
    },
    orderBy: { matchDate: "desc" },
  });

  return NextResponse.json({ data: matches });
}

// POST /api/matches — Create new match (ADMIN only)
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.role !== Role.ADMIN) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const {
    title,
    matchDate,
    location,
    matchType,
    opponentName,
    teamAName,
    teamBName,
    feeWinner,
    feeLose,
    feeDraw,
    feeDefault,
    note,
  } = body;

  if (!title || !matchDate) {
    return NextResponse.json(
      { error: "Title and matchDate are required" },
      { status: 400 }
    );
  }

  // Auto generate code: TS + MMYYYY
  const date = new Date(matchDate);
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  let code = `TS${month}${year}`;

  // Check uniqueness, append counter if needed
  const existing = await prisma.matchSession.findUnique({ where: { code } });
  if (existing) {
    const count = await prisma.matchSession.count({
      where: { code: { startsWith: `TS${month}${year}` } },
    });
    code = `TS${month}${year}-${count + 1}`;
  }

  const match = await prisma.matchSession.create({
    data: {
      code,
      title,
      matchDate: new Date(matchDate),
      location,
      matchType: matchType as MatchType ?? MatchType.INTERNAL,
      opponentName,
      teamAName: teamAName ?? "Đội A",
      teamBName: teamBName ?? "Đội B",
      feeWinner: feeWinner ? parseFloat(feeWinner) : undefined,
      feeLose: feeLose ? parseFloat(feeLose) : undefined,
      feeDraw: feeDraw ? parseFloat(feeDraw) : undefined,
      feeDefault: feeDefault ? parseFloat(feeDefault) : undefined,
      note,
    },
  });

  return NextResponse.json({ data: match }, { status: 201 });
}
