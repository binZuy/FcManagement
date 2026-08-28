import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function PATCH(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  try {
    const params = await props.params;
    const session = await auth();
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: rawId } = params;
    const body = await req.json();
    const { status, amountPaid } = body;

    const realId = rawId.split("_")[0];
    const isSelf = rawId.endsWith("_self");
    const isGuest = rawId.endsWith("_guest");

    const record = await prisma.paymentRecord.findUnique({
      where: { id: realId },
      include: {
        session: {
          include: { match: { include: { attendances: true } } }
        }
      }
    });

    if (!record) {
      return NextResponse.json({ error: "Record not found" }, { status: 404 });
    }

    let finalAmountPaid = amountPaid ?? record.amountRequired;
    let finalStatus = status ?? "PAID";

    if (isSelf) {
      const att = record.session.match?.attendances.find((a) => a.memberId === record.memberId);
      if (att && (att.guestCount > 0 || (att.isDrinks && att.drinksGuestCount > 0))) {
        const totalHeads = 1 + att.guestCount;
        const drinkHeads = att.isDrinks ? 1 + (att.drinksGuestCount || 0) : 0;
        const baseFeePerHead = (att.feeAssigned ?? 0) / (totalHeads || 1);
        const drinksFeePerHead = drinkHeads > 0 ? (att.drinksFeeAssigned ?? 0) / (drinkHeads || 1) : 0;
        const memberSelfFee = Math.round(baseFeePerHead + (att.isDrinks ? drinksFeePerHead : 0));

        finalAmountPaid = Math.min(record.amountRequired, memberSelfFee);
        finalStatus = finalAmountPaid >= record.amountRequired ? "PAID" : "PENDING";
      }
    } else if (isGuest) {
      finalAmountPaid = record.amountRequired;
      finalStatus = "PAID";
    }

    const updatedRecord = await prisma.paymentRecord.update({
      where: { id: realId },
      data: {
        status: finalStatus,
        amountPaid: finalAmountPaid,
        paidAt: finalStatus === "PAID" ? new Date() : undefined,
      },
    });

    return NextResponse.json(updatedRecord);
  } catch (error: any) {
    console.error("Error updating payment record:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
