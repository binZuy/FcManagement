import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { BundleStatus } from "@prisma/client";

type Params = { params: Promise<{ id: string }> };

// GET /api/payments/bundles/[id] — Lấy trạng thái bundle (dùng cho polling)
export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params;

  const bundle = await prisma.paymentBundle.findUnique({
    where: { id },
    include: {
      items: {
        include: {
          record: {
            select: {
              id: true,
              status: true,
              amountRequired: true,
              amountPaid: true,
              session: { select: { title: true, code: true } },
            },
          },
        },
      },
      member: { select: { code: true } },
    },
  });

  if (!bundle) {
    return NextResponse.json({ error: "Bundle không tồn tại" }, { status: 404 });
  }

  // Kiểm tra xem bundle có hết hạn chưa (auto-expire)
  if (
    bundle.status === BundleStatus.PENDING &&
    bundle.expiresAt &&
    bundle.expiresAt < new Date()
  ) {
    await prisma.paymentBundle.update({
      where: { id },
      data: { status: BundleStatus.EXPIRED },
    });
    return NextResponse.json({
      bundle: { ...bundle, status: BundleStatus.EXPIRED },
      expired: true,
    });
  }

  const prefix = process.env.NEXT_PUBLIC_TRANSFER_PREFIX ?? "FCKX";
  const qrContent = `${prefix} ${bundle.member.code}-${bundle.bundleCode}`;

  return NextResponse.json({ bundle, qrContent, expired: false });
}

// DELETE /api/payments/bundles/[id] — Cancel bundle
export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const bundle = await prisma.paymentBundle.findUnique({
    where: { id },
    select: { status: true },
  });

  if (!bundle) {
    return NextResponse.json({ error: "Bundle không tồn tại" }, { status: 404 });
  }

  if (bundle.status !== BundleStatus.PENDING) {
    return NextResponse.json(
      { error: "Chỉ có thể huỷ bundle đang ở trạng thái PENDING" },
      { status: 400 }
    );
  }

  await prisma.paymentBundle.update({
    where: { id },
    data: { status: BundleStatus.CANCELLED },
  });

  return NextResponse.json({ success: true });
}
