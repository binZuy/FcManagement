import { NextRequest, NextResponse } from "next/server";
import { processSepayTransaction, verifySepaySignature, type SepayPayload } from "@/lib/sepay";

// SePay calls this endpoint when a bank transaction is detected
export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();

    // Verify HMAC-SHA256 signature / Secret Token if secret is configured
    const webhookSecret = process.env.SEPAY_WEBHOOK_SECRET;
    if (webhookSecret) {
      const signature =
        request.headers.get("x-sepay-signature") ||
        request.headers.get("authorization") ||
        request.headers.get("x-sepay-secret") ||
        "";
      const timestamp = request.headers.get("x-sepay-timestamp") || "";

      if (!verifySepaySignature(rawBody, signature, webhookSecret, timestamp)) {
        console.error("[SePay Webhook] Invalid signature / secret token");
        return NextResponse.json(
          { success: false, message: "Invalid signature" },
          { status: 401 }
        );
      }
    }

    let payload: SepayPayload;
    try {
      payload = JSON.parse(rawBody) as SepayPayload;
    } catch {
      return NextResponse.json(
        { success: false, message: "Invalid JSON" },
        { status: 400 }
      );
    }

    // Only process money-in transactions
    if (payload.transferType !== "in") {
      return NextResponse.json({ success: true, message: "Skipped (not a deposit)" });
    }

    const result = await processSepayTransaction(payload);

    return NextResponse.json({
      success: true,
      matched: result.matched,
      memberCode: result.memberCode,
      sessionCode: result.sessionCode,
      bundleCode: result.bundleCode,
    });
  } catch (err) {
    console.error("[SePay Webhook] Critical error:", err);
    return NextResponse.json(
      { success: false, message: "Internal error" },
      { status: 500 }
    );
  }
}

