import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { RecordStatus, PayMethod } from "@prisma/client";

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
 * Parse nội dung chuyển khoản theo cú pháp: FCM [MemberCode] [SessionCode]
 * Ví dụ: "FCM NVA TS082026"
 */
export function parseSepayContent(content: string): {
  memberCode: string | null;
  sessionCode: string | null;
} {
  const upper = content.toUpperCase().trim();
  const match = upper.match(/FCM\s+([A-Z]+)\s+([A-Z0-9]+)/);
  if (!match) return { memberCode: null, sessionCode: null };
  return { memberCode: match[1], sessionCode: match[2] };
}

/**
 * Process a SePay webhook payload:
 * 1. Save raw transaction
 * 2. Try to auto-match to a PaymentRecord
 * 3. Update PaymentRecord status if matched
 */
export async function processSepayTransaction(
  payload: SepayPayload
): Promise<{ matched: boolean; memberCode?: string; sessionCode?: string }> {
  const { memberCode, sessionCode } = parseSepayContent(
    payload.content ?? ""
  );

  // 1. Save raw transaction (upsert to avoid duplicates)
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
      rawPayload: payload as any,
    },
  });

  // 2. Try to match
  if (!memberCode || !sessionCode) {
    return { matched: false };
  }

  // Find member by code
  const member = await prisma.member.findUnique({
    where: { code: memberCode },
  });
  if (!member) return { matched: false, memberCode, sessionCode };

  // Find payment session by code
  const session = await prisma.paymentSession.findUnique({
    where: { code: sessionCode },
  });
  if (!session) return { matched: false, memberCode, sessionCode };

  // Find payment record
  const record = await prisma.paymentRecord.findUnique({
    where: { sessionId_memberId: { sessionId: session.id, memberId: member.id } },
  });
  if (!record || record.status === RecordStatus.PAID) {
    return { matched: false, memberCode, sessionCode };
  }

  // 3. Mark as paid
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
      },
    }),
  ]);

  return { matched: true, memberCode, sessionCode };
}
