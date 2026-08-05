import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { RecordStatus, PayMethod, BundleStatus } from "@prisma/client";

/**
 * Verify SePay HMAC-SHA256 signature or Secret Token
 * Standard SePay HMAC spec:
 * - Header X-SePay-Signature: sha256=<hex>
 * - Header X-SePay-Timestamp: <unix_seconds>
 * - Sign String: `${timestamp}.${payload}`
 */
export function verifySepaySignature(
  payload: string,
  signature: string,
  secret: string,
  timestamp?: string
): boolean {
  if (!signature || !secret) return false;

  const cleanSignature = signature
    .replace(/^sha256=/i, "")
    .replace(/^Bearer\s+/i, "")
    .trim();
  const cleanSecret = secret.trim();

  // 1. Direct Secret Token / API Key check
  if (cleanSignature === cleanSecret) {
    return true;
  }

  // 2. HMAC SHA256 validation (with timestamp support)
  try {
    const dataToSign = timestamp ? `${timestamp}.${payload}` : payload;
    const expected = crypto
      .createHmac("sha256", cleanSecret)
      .update(dataToSign)
      .digest("hex");

    const sigBuf = Buffer.from(cleanSignature, "hex");
    const expBuf = Buffer.from(expected, "hex");

    if (sigBuf.length === expBuf.length && crypto.timingSafeEqual(sigBuf, expBuf)) {
      return true;
    }

    // Fallback try without timestamp
    if (timestamp) {
      const fallbackExpected = crypto
        .createHmac("sha256", cleanSecret)
        .update(payload)
        .digest("hex");
      const fallbackExpBuf = Buffer.from(fallbackExpected, "hex");
      if (sigBuf.length === fallbackExpBuf.length && crypto.timingSafeEqual(sigBuf, fallbackExpBuf)) {
        return true;
      }
    }

    return false;
  } catch {
    return false;
  }
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
  subAccumulated?: number;
}

export interface ParsedContent {
  memberCode: string | null;
  bundleCode: string | null;    // format mới: bundle
  sessionCode: string | null;   // format cũ: session trực tiếp
}

/**
 * Parse nội dung chuyển khoản linh hoạt:
 * Hỗ trợ các trường hợp ngân hàng tự thêm tiền tố (VD: "140736621638-FCKTX AWU-GX83...")
 */
export function parseSepayContent(content: string): ParsedContent {
  if (!content) return { memberCode: null, bundleCode: null, sessionCode: null };
  const upper = content.toUpperCase().trim();

  // Pattern 1a (Bundle có gạch ngang): "... FCKTX NVA-A1B2C3 ..." hoặc "... FCK NVA-A1B2C3 ..."
  const bundleDashMatch = upper.match(/(?:FCK|FCKTX|FCM|FC)\s+([A-Z0-9]+)-([A-Z0-9]{4,8})(?:\s|[^A-Z0-9]|$)/);
  if (bundleDashMatch) {
    return {
      memberCode: bundleDashMatch[1],
      bundleCode: bundleDashMatch[2],
      sessionCode: null,
    };
  }

  // Pattern 1b (Bundle không gạch ngang): "... FCKTX NVAA1B2C3 ..." hoặc "... FCKTX A1B2C3 ..."
  const bundleDirectMatch = upper.match(/(?:FCK|FCKTX|FCM|FC)\s+([A-Z0-9]{4,16})(?:\s|[^A-Z0-9]|$)/);
  if (bundleDirectMatch) {
    const rawCode = bundleDirectMatch[1];
    if (rawCode.length >= 7) {
      const bundleCode = rawCode.slice(-6);
      const memberCode = rawCode.slice(0, -6);
      return { memberCode, bundleCode, sessionCode: null };
    } else if (rawCode.length === 6) {
      return { memberCode: null, bundleCode: rawCode, sessionCode: null };
    }
  }

  // Pattern 2 (Legacy session): "... FCM NVA TS082026 ..."
  const legacyMatch = upper.match(/FCM\s+([A-Z0-9]+)\s+([A-Z0-9]+)/);
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
    payload.content ?? payload.description ?? ""
  );

  // Ép kiểu Date an toàn (tránh Invalid Date gây rớt Prisma)
  let txDate = new Date();
  if (payload.transactionDate) {
    const formatted = payload.transactionDate.includes("T")
      ? payload.transactionDate
      : payload.transactionDate.replace(" ", "T");
    const parsed = new Date(formatted);
    if (!isNaN(parsed.getTime())) {
      txDate = parsed;
    }
  }

  // 1. Lưu raw transaction (upsert để tránh trùng)
  const tx = await prisma.sepayTransaction.upsert({
    where: { sepayId: String(payload.id) },
    update: {},
    create: {
      sepayId: String(payload.id),
      gateway: payload.gateway ?? "UNKNOWN",
      accountNumber: payload.accountNumber ?? "",
      transferAmount: payload.transferAmount ?? 0,
      content: payload.content ?? payload.description ?? "",
      referenceCode: payload.referenceCode ?? "",
      transactionDate: txDate,
      isMatched: false,
      matchedMemberCode: memberCode,
      matchedSessionCode: sessionCode,
      matchedBundleCode: bundleCode,
      rawPayload: payload as any,
    },
  });

  // ── Path A: Match theo Bundle (format mới) ─────────────────────────────────
  if (bundleCode) {
    const bundle = await prisma.paymentBundle.findFirst({
      where: {
        bundleCode,
        status: BundleStatus.PENDING,
        ...(memberCode ? { member: { code: memberCode } } : {}),
      },
      include: {
        items: { include: { record: true } },
      },
    });

    if (!bundle) {
      console.warn(`[SePay] Bundle không tìm thấy: memberCode=${memberCode}, bundleCode=${bundleCode}`);
      return { matched: false, memberCode: memberCode ?? undefined, bundleCode };
    }

    // Kiểm tra hết hạn
    if (bundle.expiresAt && bundle.expiresAt < new Date()) {
      await prisma.paymentBundle.update({
        where: { id: bundle.id },
        data: { status: BundleStatus.EXPIRED },
      });
      console.warn(`[SePay] Bundle hết hạn: ${bundleCode}`);
      return { matched: false, memberCode: memberCode ?? undefined, bundleCode };
    }

    // Đánh dấu tất cả records trong bundle = PAID + bundle = PAID
    await prisma.$transaction([
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
      prisma.paymentBundle.update({
        where: { id: bundle.id },
        data: {
          status: BundleStatus.PAID,
          paidAt: new Date(),
          sepayTxId: tx.sepayId,
        },
      }),
      prisma.sepayTransaction.update({
        where: { id: tx.id },
        data: {
          isMatched: true,
          matchedMemberId: bundle.memberId,
          matchedBundleCode: bundleCode,
        },
      }),
    ]);

    console.log(`[SePay] ✅ Bundle matched: ${bundleCode}, ${bundle.items.length} records PAID`);
    return { matched: true, matchType: "bundle", memberCode: memberCode ?? undefined, bundleCode };
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

