import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { DEFAULT_WHEEL_OPTIONS, WheelOption } from "@/lib/wheelConstants";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const setting = await prisma.systemSetting.findUnique({
      where: { key: "WHEEL_OPTIONS" },
    });

    if (setting && Array.isArray(setting.value)) {
      return NextResponse.json({ success: true, options: setting.value });
    }

    return NextResponse.json({ success: true, options: DEFAULT_WHEEL_OPTIONS });
  } catch (error: any) {
    console.error("Lỗi lấy cấu hình vòng quay:", error);
    return NextResponse.json({ success: true, options: DEFAULT_WHEEL_OPTIONS });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Chỉ Admin mới có quyền sửa cấu hình vòng quay!" }, { status: 403 });
    }

    const body = await req.json();
    const { options } = body as { options: WheelOption[] };

    if (!Array.isArray(options) || options.length < 3) {
      return NextResponse.json({ error: "Vòng quay cần tối thiểu 3 phần thưởng!" }, { status: 400 });
    }

    // Chuẩn hóa dữ liệu phần thưởng
    const cleanOptions = options.map((opt, idx) => ({
      id: opt.id || String(idx + 1),
      label: opt.label?.trim() || "Phần thưởng",
      icon: opt.icon?.trim() || "🎁",
      color: opt.color || "#1e3a8a",
      weight: Math.max(0.01, Number(opt.weight) || 1),
      rewardType: opt.rewardType || "NONE",
      discountAmount: opt.rewardType === "DISCOUNT_5K" ? 5000 : 0,
      isFreeMatch: opt.rewardType === "FREE_MATCH",
      isFreeDrink: opt.rewardType === "FREE_DRINK",
    }));

    const updated = await prisma.systemSetting.upsert({
      where: { key: "WHEEL_OPTIONS" },
      create: {
        key: "WHEEL_OPTIONS",
        value: cleanOptions,
      },
      update: {
        value: cleanOptions,
      },
    });

    return NextResponse.json({ success: true, options: updated.value });
  } catch (error: any) {
    console.error("Lỗi lưu cấu hình vòng quay:", error);
    return NextResponse.json({ error: error.message || "Lỗi lưu cấu hình" }, { status: 500 });
  }
}
