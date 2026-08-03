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

    const { id } = params;
    const body = await req.json();
    const { status, amountPaid } = body;

    const updatedRecord = await prisma.paymentRecord.update({
      where: { id },
      data: {
        status,
        amountPaid,
        paidAt: status === "PAID" ? new Date() : undefined,
      },
    });

    return NextResponse.json(updatedRecord);
  } catch (error: any) {
    console.error("Error updating payment record:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
