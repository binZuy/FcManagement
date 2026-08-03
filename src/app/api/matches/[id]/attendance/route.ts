import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { AttendStatus, Role, TeamSide } from "@prisma/client";

type Params = { params: Promise<{ id: string }> };

// GET /api/matches/:id/attendance — Get attendance list
export async function GET(_req: NextRequest, { params }: Params) {


  const { id } = await params;

  // Get all active members for the dropdown
  const [attendances, allMembers] = await Promise.all([
    prisma.matchAttendance.findMany({
      where: { matchId: id },
      include: {
        member: {
          include: { user: { select: { name: true, email: true, image: true } } },
        },
      },
    }),
    prisma.member.findMany({
      where: { status: "ACTIVE" },
      include: { user: { select: { name: true, email: true, image: true } } },
      orderBy: { user: { name: "asc" } },
    }),
  ]);

  return NextResponse.json({ data: { attendances, allMembers } });
}

// POST /api/matches/:id/attendance — Bulk upsert attendance
export async function POST(request: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.role !== Role.ADMIN) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id: matchId } = await params;
  const body = await request.json();

  // attendances: Array of { memberId, status, teamSide, note }
  const { attendances } = body as {
    attendances: Array<{
      memberId: string;
      status: AttendStatus;
      teamSide?: TeamSide;
      isDrinks?: boolean;
      guestCount?: number;
      drinksGuestCount?: number;
      note?: string;
    }>;
  };

  if (!Array.isArray(attendances)) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  try {
    // Upsert each attendance record
    await Promise.all(
      attendances.map((a) =>
        prisma.matchAttendance.upsert({
          where: { matchId_memberId: { matchId, memberId: a.memberId } },
          update: {
            status: a.status,
            teamSide: a.teamSide || null,
            isDrinks: a.isDrinks ?? false,
            guestCount: a.guestCount ?? 0,
            drinksGuestCount: a.drinksGuestCount ?? 0,
            note: a.note,
          },
          create: {
            matchId,
            memberId: a.memberId,
            status: a.status,
            teamSide: a.teamSide || null,
            isDrinks: a.isDrinks ?? false,
            guestCount: a.guestCount ?? 0,
            drinksGuestCount: a.drinksGuestCount ?? 0,
            note: a.note,
          },
        })
      )
    );

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Attendance save error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
