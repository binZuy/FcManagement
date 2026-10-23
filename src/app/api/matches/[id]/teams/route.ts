import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { AttendStatus, TeamSide } from "@prisma/client";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Vui lòng đăng nhập để sắp xếp đội hình!" }, { status: 401 });
    }

    const { id: matchId } = await params;
    const body = await req.json();
    const { teamA, teamB, unassigned, teamAName, teamBName, removedMemberIds } = body as {
      teamA?: string[]; // memberIds
      teamB?: string[]; // memberIds
      unassigned?: string[]; // memberIds
      teamAName?: string;
      teamBName?: string;
      removedMemberIds?: string[];
    };

    const match = await prisma.matchSession.findUnique({
      where: { id: matchId },
      select: { id: true, matchType: true },
    });

    if (!match) {
      return NextResponse.json({ error: "Không tìm thấy trận đấu" }, { status: 404 });
    }

    // 1. Cập nhật tên đội nếu có
    if (teamAName || teamBName) {
      await prisma.matchSession.update({
        where: { id: matchId },
        data: {
          teamAName: teamAName || undefined,
          teamBName: teamBName || undefined,
        },
      });
    }

    // 2. Cập nhật Đội A (chỉ cập nhật thành viên chính thức trong DB)
    if (Array.isArray(teamA)) {
      for (const memberId of teamA) {
        if (memberId.startsWith("guest_")) continue;
        await prisma.matchAttendance.upsert({
          where: { matchId_memberId: { matchId, memberId } },
          update: { teamSide: TeamSide.TEAM_A, status: AttendStatus.ATTENDED },
          create: {
            matchId,
            memberId,
            teamSide: TeamSide.TEAM_A,
            status: AttendStatus.ATTENDED,
          },
        });
      }
    }

    // 3. Cập nhật Đội B (chỉ cập nhật thành viên chính thức trong DB)
    if (Array.isArray(teamB)) {
      for (const memberId of teamB) {
        if (memberId.startsWith("guest_")) continue;
        await prisma.matchAttendance.upsert({
          where: { matchId_memberId: { matchId, memberId } },
          update: { teamSide: TeamSide.TEAM_B, status: AttendStatus.ATTENDED },
          create: {
            matchId,
            memberId,
            teamSide: TeamSide.TEAM_B,
            status: AttendStatus.ATTENDED,
          },
        });
      }
    }

    // 4. Cập nhật danh sách chưa chia (hoặc dự bị)
    if (Array.isArray(unassigned)) {
       for (const memberId of unassigned) {
         if (memberId.startsWith("guest_")) continue;
         await prisma.matchAttendance.updateMany({
           where: { matchId, memberId },
           data: { teamSide: null },
         });
       }
     }

    // 5. Cập nhật các thành viên bị xóa khỏi trận đấu -> Đặt lại vắng mặt (ABSENT)
    if (Array.isArray(removedMemberIds) && removedMemberIds.length > 0) {
      const validIds = removedMemberIds.filter((id) => !id.startsWith("guest_"));
      if (validIds.length > 0) {
        await prisma.matchAttendance.updateMany({
          where: {
            matchId,
            memberId: { in: validIds },
          },
          data: {
            status: AttendStatus.ABSENT,
            teamSide: null,
          },
        });
      }
    }

    return NextResponse.json({ success: true, message: "Đã lưu chia đội thành công!" });
  } catch (error: any) {
    console.error("Lỗi chia đội nội bộ:", error);
    return NextResponse.json({ error: error.message || "Lỗi server" }, { status: 500 });
  }
}
