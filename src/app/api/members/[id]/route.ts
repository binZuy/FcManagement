import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { Position, Role } from "@prisma/client";

// PATCH /api/members/[id] — Chỉnh sửa thông tin profile thành viên
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
    }

    const { id } = await params;
    const member = await prisma.member.findUnique({
      where: { id },
      select: { id: true, userId: true },
    });

    if (!member) {
      return NextResponse.json({ error: "Thành viên không tồn tại" }, { status: 404 });
    }

    const isAdmin = session.user.role === Role.ADMIN;
    const isOwner = session.user.id === member.userId;

    if (!isAdmin && !isOwner) {
      return NextResponse.json(
        { error: "Bạn chỉ có thể chỉnh sửa profile của chính mình" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { name, phone, jerseyNumber, position, note } = body as {
      name?: string;
      phone?: string;
      jerseyNumber?: number | null;
      position?: Position | null;
      note?: string | null;
    };

    // Cập nhật User & Member
    await prisma.member.update({
      where: { id },
      data: {
        jerseyNumber: jerseyNumber !== undefined ? (jerseyNumber ? Number(jerseyNumber) : null) : undefined,
        position: position !== undefined ? (position || null) : undefined,
        note: note !== undefined ? note : undefined,
        user: {
          update: {
            name: name !== undefined ? name : undefined,
            phone: phone !== undefined ? phone : undefined,
          },
        },
      },
    });

    return NextResponse.json({ success: true, message: "Cập nhật profile thành công!" });
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? "Lỗi máy chủ" }, { status: 500 });
  }
}
