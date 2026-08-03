import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { processSepayTransaction, verifySepaySignature, type SepayPayload } from "@/lib/sepay";

// SePay calls this endpoint when a bank transaction is detected
export async function POST(request: NextRequest) {
  const rawBody = await request.text();

  // Verify HMAC-SHA256 signature if secret is configured
  const webhookSecret = process.env.SEPAY_WEBHOOK_SECRET;
  if (webhookSecret) {
    const signature = request.headers.get("x-sepay-signature") ?? "";
    if (!verifySepaySignature(rawBody, signature, webhookSecret)) {
      console.error("[SePay Webhook] Invalid signature");
      return NextResponse.json({ success: false, message: "Invalid signature" }, { status: 401 });
    }
  }

  let payload: SepayPayload;
  try {
    payload = JSON.parse(rawBody) as SepayPayload;
  } catch {
    return NextResponse.json({ success: false, message: "Invalid JSON" }, { status: 400 });
  }

  // Only process money-in transactions
  if (payload.transferType !== "in") {
    return NextResponse.json({ success: true, message: "Skipped (not a deposit)" });
  }

  try {
    const result = await processSepayTransaction(payload);

    // [TELEGRAM NOTIFICATION - Uncomment to activate]
    // if (result.matched) {
    //   const { sendTelegramMessage, formatPaymentNotification } = await import("@/lib/telegram");
    //   const member = await prisma.member.findUnique({
    //     where: { code: result.memberCode! },
    //     include: { user: true },
    //   });
    //   if (member) {
    //     const msg = formatPaymentNotification(member.user.name ?? "Thành viên", payload.transferAmount, result.sessionCode!);
    //     await sendTelegramMessage(msg);
    //   }
    // }

    return NextResponse.json({
      success: true,
      matched: result.matched,
      memberCode: result.memberCode,
      sessionCode: result.sessionCode,
    });
  } catch (err) {
    console.error("[SePay Webhook] Error processing transaction:", err);
    return NextResponse.json(
      { success: false, message: "Internal error" },
      { status: 500 }
    );
  }
}
