import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { BundleStatus, RecordStatus } from "@prisma/client";

/**
 * Tao bundle code: 3 ky tu timestamp base36 + 4 ky tu random
 * Xac suat trung cuc thap, khong can check DB them lan nao
 */
function generateBundleCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
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

    // Buoc 2: Song song: don items cu + cancel bundle PENDING cu va hoan voucher chua thanh toan
    const pendingBundles = await prisma.paymentBundle.findMany({
      where: { memberId, status: BundleStatus.PENDING },
      select: { bundleCode: true },
    });

    if (pendingBundles.length > 0) {
      const oldCodes = pendingBundles.map((b) => `pending_bundle:${b.bundleCode}`);
      await prisma.memberReward.updateMany({
        where: {
          memberId,
          note: { in: oldCodes },
          isUsed: true,
        },
        data: {
          isUsed: false,
          usedAt: null,
          note: null,
        },
      });
    }

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
    const bundleCode = generateBundleCode();
    let discount = 0;
    const { rewardId } = body as { rewardId?: string };
    if (rewardId) {
      const reward = await prisma.memberReward.findFirst({
        where: { id: rewardId, memberId, isUsed: false },
      });
      if (reward) {
        if (reward.isFreeMatch) {
          discount = records[0] ? Math.max(0, records[0].amountRequired - records[0].amountPaid) : 0;
        } else if (reward.discountAmount > 0) {
          discount = reward.discountAmount;
        }
        // Đánh dấu đã dùng voucher gắn với mã bundle này
        await prisma.memberReward.update({
          where: { id: reward.id },
          data: {
            isUsed: true,
            usedAt: new Date(),
            note: `pending_bundle:${bundleCode}`,
          },
        });
      }
    }

    const rawTotalAmount = records.reduce(
      (sum, r) => sum + (r.amountRequired - r.amountPaid),
      0
    );
    const totalAmount = Math.max(0, rawTotalAmount - discount);
    const prefix = process.env.NEXT_PUBLIC_TRANSFER_PREFIX ?? "FCKTX";
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

    const bankBin = process.env.NEXT_PUBLIC_BANK_BIN || "";
    const accountNo = process.env.NEXT_PUBLIC_ACCOUNT_NO || "";
    const accountName = process.env.NEXT_PUBLIC_ACCOUNT_NAME || "";
    let qrUrl: string | null = null;
    if (bankBin && accountNo) {
      const q = new URLSearchParams({
        amount: String(Math.round(totalAmount)),
        addInfo: qrContent,
        accountName,
      });
      qrUrl = `https://img.vietqr.io/image/${bankBin}-${accountNo}-compact2.png?${q.toString()}`;
    }

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
      qrUrl,
      bankBin,
      accountNo,
      accountName,
    });
  } catch (err) {
    console.error("[PaymentBundle POST] Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}