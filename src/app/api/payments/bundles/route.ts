import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { BundleStatus, RecordStatus } from "@prisma/client";

/**
 * Tao bundle code: 3 ky tu timestamp base36 + 4 ky tu random
 * Xac suat trung cuc thap, khong can check DB them lan nao
 */
function generateBundleCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const ts = Date.now().toString(36).slice(-3).toUpperCase();
  let rand = "";
  for (let i = 0; i < 4; i++) {
    rand += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return ts + rand;
}

// POST /api/payments/bundles
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { memberId, recordIds } = body as {
      memberId: string;
      recordIds: string[];
    };

    if (!memberId || !Array.isArray(recordIds) || recordIds.length === 0) {
      return NextResponse.json(
        { error: "memberId va recordIds[] khong duoc trong" },
        { status: 400 }
      );
    }

    // Buoc 1: Song song: lay member + validate records
    const [member, records] = await Promise.all([
      prisma.member.findUnique({
        where: { id: memberId },
        select: { id: true, code: true },
      }),
      prisma.paymentRecord.findMany({
        where: {
          id: { in: recordIds },
          memberId,
          status: { in: [RecordStatus.PENDING, RecordStatus.OVERDUE] },
        },
        select: { id: true, amountRequired: true, amountPaid: true },
      }),
    ]);

    if (!member) {
      return NextResponse.json({ error: "Member khong ton tai" }, { status: 404 });
    }
    if (records.length !== recordIds.length) {
      return NextResponse.json(
        { error: "Mot so khoan khong hop le hoac da thanh toan" },
        { status: 400 }
      );
    }

    // Buoc 2: Song song: don items cu + cancel bundle PENDING cu
    await Promise.all([
      prisma.paymentBundleItem.deleteMany({
        where: {
          recordId: { in: recordIds },
          bundle: { status: { not: BundleStatus.PAID } },
        },
      }),
      prisma.paymentBundle.updateMany({
        where: { memberId, status: BundleStatus.PENDING },
        data: { status: BundleStatus.CANCELLED },
      }),
    ]);

    // Buoc 3: Tinh toan (pure JS)
    const totalAmount = records.reduce(
      (sum, r) => sum + (r.amountRequired - r.amountPaid),
      0
    );
    const bundleCode = generateBundleCode();
    const prefix = process.env.NEXT_PUBLIC_TRANSFER_PREFIX ?? "FCKX";
    const qrContent = `${prefix} ${member.code}-${bundleCode}`;
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

    // Buoc 4: Tao bundle + items (1 DB call duy nhat)
    const bundle = await prisma.paymentBundle.create({
      data: {
        memberId,
        bundleCode,
        totalAmount,
        expiresAt,
        items: {
          create: records.map((r) => ({ recordId: r.id })),
        },
      },
      select: {
        id: true,
        bundleCode: true,
        totalAmount: true,
        status: true,
        expiresAt: true,
      },
    });

    // qrUrl khong tra ve - client tu build tu NEXT_PUBLIC_* env vars
    return NextResponse.json({
      success: true,
      bundle: {
        id: bundle.id,
        bundleCode: bundle.bundleCode,
        totalAmount: bundle.totalAmount,
        status: bundle.status,
        expiresAt: bundle.expiresAt,
      },
      qrContent,
    });
  } catch (err) {
    console.error("[PaymentBundle POST] Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}