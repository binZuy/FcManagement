import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { RecordStatus, PayMethod, BundleStatus } from "@prisma/client";

/**
 * Verify SePay HMAC-SHA256 signature
 */
export function verifySepaySignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  const expected = crypto
    .createHmac("sha256", secret)
    .update(payload)
    .digest("hex");
  return crypto.timingSafeEqual(
    Buffer.from(signature, "hex"),
    Buffer.from(expected, "hex")
  );
}

export interface SepayPayload {
  id: number;
  gateway: string;
  transactionDate: string;
  accountNumber: string;
  subAccount: string | null;
  code: string | null;
  content: string;
  transferType: string;
  description: string;
  transferAmount: number;
  referenceCode: string;
  accumulated: number;
  subAccumulated: number;
}

/**
 * Kết quả parse nội dung chuyển khoản
 * Hỗ trợ 2 format:
 *  - Bundle (mới):  "FCKX NVA-A1B2C3"   → { memberCode: "NVA", bundleCode: "A1B2C3" }
 *  - Legacy (cũ):  "FCM NVA TS082026"   → { memberCode: "NVA", sessionCode: "TS082026" }
 */
export interface ParsedContent {
  memberCode: string | null;
  bundleCode: string | null;    // format mới: bundle
  sessionCode: string | null;   // format cũ: session trực tiếp
}

/**
 * Parse nội dung chuyển khoản
 */
export function parseSepayContent(content: string): ParsedContent {
  const upper = content.toUpperCase().trim();

  // Pattern 1 (mới - bundle): "FCKX NVA-A1B2C3"
  // Prefix linh hoạt (FCK, FCKX, FcKTX...), sau đó space, rồi CODE-BUNDLECODE
  const bundleMatch = upper.match(/^[A-Z]+\s+([A-Z]+)-([A-Z0-9]{4,8})(?:\s|$)/);
  if (bundleMatch) {
    return {
      memberCode: bundleMatch[1],
      bundleCode: bundleMatch[2],
      sessionCode: null,
    };
  }

  // Pattern 2 (cũ - legacy): "FCM NVA TS082026"
  const legacyMatch = upper.match(/FCM\s+([A-Z]+)\s+([A-Z0-9]+)/);
  if (legacyMatch) {
    return {
      memberCode: legacyMatch[1],
      bundleCode: null,
      sessionCode: legacyMatch[2],
    };
  }

  return { memberCode: null, bundleCode: null, sessionCode: null };
}

/**
 * Xử lý giao dịch Sepay webhook:
 * 1. Lưu raw transaction
 * 2. Thử match bundle (mới) hoặc session (legacy)
 * 3. Cập nhật trạng thái thanh toán
 */
export async function processSepayTransaction(
  payload: SepayPayload
): Promise<{
  matched: boolean;
  matchType?: "bundle" | "session";
  memberCode?: string;
  bundleCode?: string;
  sessionCode?: string;
}> {
  const { memberCode, bundleCode, sessionCode } = parseSepayContent(
    payload.content ?? ""
  );

  // 1. Lưu raw transaction (upsert để tránh trùng)
  const tx = await prisma.sepayTransaction.upsert({
    where: { sepayId: String(payload.id) },
    update: {},
    create: {
      sepayId: String(payload.id),
      gateway: payload.gateway,
      accountNumber: payload.accountNumber,
      transferAmount: payload.transferAmount,
      content: payload.content,
      referenceCode: payload.referenceCode,
      transactionDate: new Date(payload.transactionDate),
      isMatched: false,
      matchedMemberCode: memberCode,
      matchedSessionCode: sessionCode,
      matchedBundleCode: bundleCode,
      rawPayload: payload as any,
    },
  });

  // ── Path A: Match theo Bundle (format mới) ─────────────────────────────────
  if (memberCode && bundleCode) {
    const bundle = await prisma.paymentBundle.findFirst({
      where: {
        bundleCode,
        member: { code: memberCode },
        status: BundleStatus.PENDING,
      },
      include: {
        items: { include: { record: true } },
      },
    });

    if (!bundle) {
      console.warn(`[SePay] Bundle không tìm thấy: memberCode=${memberCode}, bundleCode=${bundleCode}`);
      return { matched: false, memberCode, bundleCode };
    }

    // Kiểm tra hết hạn
    if (bundle.expiresAt && bundle.expiresAt < new Date()) {
      await prisma.paymentBundle.update({
        where: { id: bundle.id },
        data: { status: BundleStatus.EXPIRED },
      });
      console.warn(`[SePay] Bundle hết hạn: ${bundleCode}`);
      return { matched: false, memberCode, bundleCode };
    }

    // Đánh dấu tất cả records trong bundle = PAID + bundle = PAID
    await prisma.$transaction([
      // Mark từng record
      ...bundle.items.map((item) =>
        prisma.paymentRecord.update({
          where: { id: item.record.id },
          data: {
            status: RecordStatus.PAID,
            amountPaid: item.record.amountRequired,
            paidAt: new Date(),
            paymentMethod: PayMethod.BANK_TRANSFER,
          },
        })
      ),
      // Mark bundle = PAID
      prisma.paymentBundle.update({
        where: { id: bundle.id },
        data: {
          status: BundleStatus.PAID,
          paidAt: new Date(),
          sepayTxId: tx.sepayId,
        },
      }),
      // Update transaction = matched
      prisma.sepayTransaction.update({
        where: { id: tx.id },
        data: {
          isMatched: true,
          matchedMemberId: bundle.memberId,
          matchedBundleCode: bundleCode,
        },
      }),
    ]);

    console.log(`[SePay] ✅ Bundle matched: ${memberCode}-${bundleCode}, ${bundle.items.length} records PAID`);
    return { matched: true, matchType: "bundle", memberCode, bundleCode };
  }

  // ── Path B: Match theo Session (legacy format) ─────────────────────────────
  if (memberCode && sessionCode) {
    const member = await prisma.member.findUnique({
      where: { code: memberCode },
    });
    if (!member) return { matched: false, memberCode, sessionCode };

    const session = await prisma.paymentSession.findUnique({
      where: { code: sessionCode },
    });
    if (!session) return { matched: false, memberCode, sessionCode };

    const record = await prisma.paymentRecord.findUnique({
      where: { sessionId_memberId: { sessionId: session.id, memberId: member.id } },
    });
    if (!record || record.status === RecordStatus.PAID) {
      return { matched: false, memberCode, sessionCode };
    }

    await prisma.$transaction([
      prisma.paymentRecord.update({
        where: { id: record.id },
        data: {
          status: RecordStatus.PAID,
          amountPaid: payload.transferAmount,
          paidAt: new Date(),
          paymentMethod: PayMethod.BANK_TRANSFER,
          sepayTxId: tx.sepayId,
        },
      }),
      prisma.sepayTransaction.update({
        where: { id: tx.id },
        data: {
          isMatched: true,
          matchedMemberId: member.id,
          matchedSessionCode: sessionCode,
        },
      }),
    ]);

    console.log(`[SePay] ✅ Session matched: ${memberCode} / ${sessionCode}`);
    return { matched: true, matchType: "session", memberCode, sessionCode };
  }

  return { matched: false };
}
