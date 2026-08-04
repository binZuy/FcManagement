import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { BundleStatus, RecordStatus } from "@prisma/client";

/**
 * Generate a random 6-character alphanumeric bundle code
 */
function generateBundleCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // Loại I, O, 0, 1 dễ nhầm
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

/**
 * Generate VietQR URL
 * https://img.vietqr.io/image/{bankBin}-{accountNo}-{template}.png?amount=...&addInfo=...&accountName=...
 */
function generateVietQRUrl(params: {
  bankBin: string;
  accountNo: string;
  accountName: string;
  amount: number;
  addInfo: string;
}): string {
  const { bankBin, accountNo, accountName, amount, addInfo } = params;
  const base = `https://img.vietqr.io/image/${bankBin}-${accountNo}-compact2.png`;
  const query = new URLSearchParams({
    amount: String(Math.round(amount)),
    addInfo,
    accountName,
  });
  return `${base}?${query.toString()}`;
}

// POST /api/payments/bundles — Tạo bundle thanh toán mới
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { memberId, recordIds } = body as {
      memberId: string;
      recordIds: string[];
    };

    if (!memberId || !Array.isArray(recordIds) || recordIds.length === 0) {
      return NextResponse.json(
        { error: "memberId và recordIds[] không được trống" },
        { status: 400 }
      );
    }

    // 1. Lấy thông tin member
    const member = await prisma.member.findUnique({
      where: { id: memberId },
      select: { id: true, code: true },
    });
    if (!member) {
      return NextResponse.json({ error: "Member không tồn tại" }, { status: 404 });
    }

    // 2. Validate records: phải thuộc member, status PENDING/OVERDUE
    const records = await prisma.paymentRecord.findMany({
      where: {
        id: { in: recordIds },
        memberId,
        status: { in: [RecordStatus.PENDING, RecordStatus.OVERDUE] },
      },
      select: { id: true, amountRequired: true, amountPaid: true, status: true },
    });

    if (records.length !== recordIds.length) {
      return NextResponse.json(
        { error: "Một số khoản không hợp lệ hoặc đã thanh toán" },
        { status: 400 }
      );
    }

    // 3. Cancel tất cả bundle PENDING cũ của member này
    const oldBundles = await prisma.paymentBundle.findMany({
      where: { memberId, status: BundleStatus.PENDING },
      select: { id: true },
    });

    if (oldBundles.length > 0) {
      await prisma.paymentBundle.updateMany({
        where: { id: { in: oldBundles.map((b) => b.id) } },
        data: { status: BundleStatus.CANCELLED },
      });
    }

    // 4. Tính tổng tiền (dùng amountRequired - amountPaid)
    const totalAmount = records.reduce(
      (sum, r) => sum + (r.amountRequired - r.amountPaid),
      0
    );

    // 5. Generate unique bundle code (thử tối đa 5 lần nếu trùng)
    let bundleCode = "";
    for (let attempt = 0; attempt < 5; attempt++) {
      const candidate = generateBundleCode();
      const existing = await prisma.paymentBundle.findUnique({
        where: { bundleCode: candidate },
      });
      if (!existing) {
        bundleCode = candidate;
        break;
      }
    }
    if (!bundleCode) {
      return NextResponse.json(
        { error: "Không thể tạo mã bundle, thử lại" },
        { status: 500 }
      );
    }

    // 6. Nội dung chuyển khoản: FCKX [MemberCode]-[BundleCode]
    const prefix = process.env.NEXT_PUBLIC_TRANSFER_PREFIX ?? "FCKX";
    const qrContent = `${prefix} ${member.code}-${bundleCode}`;

    // 7. VietQR URL
    const bankBin = process.env.NEXT_PUBLIC_BANK_BIN ?? "";
    const accountNo = process.env.NEXT_PUBLIC_ACCOUNT_NO ?? "";
    const accountName = process.env.NEXT_PUBLIC_ACCOUNT_NAME ?? "";

    const qrUrl = bankBin && accountNo
      ? generateVietQRUrl({ bankBin, accountNo, accountName, amount: totalAmount, addInfo: qrContent })
      : null;

    // 8. Tạo bundle + items trong 1 transaction
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // +30 phút

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
      include: {
        items: { include: { record: { include: { session: true } } } },
      },
    });

    return NextResponse.json({
      success: true,
      bundle: {
        id: bundle.id,
        bundleCode: bundle.bundleCode,
        totalAmount: bundle.totalAmount,
        status: bundle.status,
        expiresAt: bundle.expiresAt,
        items: bundle.items.map((item) => ({
          recordId: item.recordId,
          sessionTitle: item.record.session.title,
          amount: item.record.amountRequired - item.record.amountPaid,
        })),
      },
      qrContent,
      qrUrl,
    });
  } catch (err) {
    console.error("[PaymentBundle POST] Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
