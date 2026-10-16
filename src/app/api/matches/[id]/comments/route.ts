import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { Role } from "@prisma/client";

type Params = { params: Promise<{ id: string }> };

// GET /api/matches/:id/comments
export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const comments = await prisma.matchComment.findMany({
    where: { matchId: id },
    include: {
      user: { select: { id: true, name: true, image: true, role: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ data: comments });
}

// POST /api/matches/:id/comments
export async function POST(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const session = await auth();
  const body = await req.json().catch(() => ({}));
  const content = (body.content || "").trim();

  if (!content) {
    return NextResponse.json({ error: "Nội dung bình luận không được để trống" }, { status: 400 });
  }

  // Nếu user đã đăng nhập
  const userId = session?.user?.id || null;
  // Nếu là Guest thì lấy guestName, fallback "Ẩn danh"
  const guestName = !userId ? (body.guestName?.trim() || "Ẩn danh") : null;

  const comment = await prisma.matchComment.create({
    data: {
      matchId: id,
      userId,
      guestName,
      content,
    },
    include: {
      user: { select: { id: true, name: true, image: true, role: true } },
    },
  });

  return NextResponse.json({ data: comment }, { status: 201 });
}

// DELETE /api/matches/:id/comments?commentId=...
export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (session?.user?.role !== Role.ADMIN) {
    return NextResponse.json({ error: "Chỉ Admin mới có quyền xóa bình luận" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const commentId = searchParams.get("commentId");

  if (!commentId) {
    return NextResponse.json({ error: "Thiếu commentId" }, { status: 400 });
  }

  await prisma.matchComment.delete({
    where: { id: commentId },
  });

  return NextResponse.json({ success: true });
}
