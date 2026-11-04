import { PrismaClient, Role } from "@prisma/client";
import { config } from "dotenv";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

config({ path: ".env.local" });

const connectionString = process.env.DIRECT_URL ?? process.env.DATABASE_URL!;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  // THAY EMAIL CỦA BẠN VÀO ĐÂY
  const ADMIN_EMAIL = process.env.ADMIN_EMAIL;

  if (!ADMIN_EMAIL) {
    console.error("❌ Lỗi: Chưa cấu hình biến ADMIN_EMAIL trong file .env.local");
    process.exit(1);
  }

  console.log("🚀 Bắt đầu dọn dẹp và seed dữ liệu...");

  // Xóa bản ghi lỗi placeholder
  await prisma.allowedEmail.deleteMany({ where: { email: "[EMAIL_ADDRESS]" } });
  await prisma.user.deleteMany({ where: { email: "[EMAIL_ADDRESS]" } });

  // Xóa bản ghi User của admin (nếu đã lỡ tạo ở lần seed trước) để NextAuth tạo mới sạch sẽ
  await prisma.user.deleteMany({ where: { email: ADMIN_EMAIL } });

  // Thêm email admin vào whitelist
  const allowed = await prisma.allowedEmail.upsert({
    where: { email: ADMIN_EMAIL },
    update: {
      label: "Đội trưởng (Admin)",
    },
    create: {
      email: ADMIN_EMAIL,
      label: "Đội trưởng (Admin)",
    },
  });

  console.log(`✅ Đã thêm email ${allowed.email} vào whitelist.`);

  // Seed cấu hình mặc định cho Vòng Quay May Mắn vào SystemSetting
  const defaultWheelOptions = [
    { id: "1", label: "Cùng đội với Binzuy", icon: "👑", color: "#1e3a8a", weight: 28.2, rewardType: "NONE" },
    { id: "2", label: "MOTM 1 trận", icon: "⭐", color: "#d97706", weight: 28.2, rewardType: "MOTM_NEXT_MATCH" },
    { id: "3", label: "Đen thế lần sau nhé", icon: "⚽", color: "#1e293b", weight: 28.2, rewardType: "NONE" },
    { id: "4", label: "Voucher 2k tiền sân", icon: "🪙", color: "#0d9488", weight: 10, rewardType: "DISCOUNT_2K", discountAmount: 2000 },
    { id: "5", label: "Voucher 5k tiền sân", icon: "💵", color: "#065f46", weight: 5, rewardType: "DISCOUNT_5K", discountAmount: 5000 },
    { id: "6", label: "Voucher 10k tiền sân", icon: "🎁", color: "#991b1b", weight: 0.25, rewardType: "DISCOUNT_10K", discountAmount: 10000 },
    { id: "7", label: "Free nước 1 trận", icon: "🥤", color: "#312e81", weight: 0.1, rewardType: "FREE_DRINK", isFreeDrink: true },
    { id: "8", label: "Free tiền sân 1 trận", icon: "🎰", color: "#b45309", weight: 0.05, rewardType: "FREE_MATCH", isFreeMatch: true },
  ];

  await prisma.systemSetting.upsert({
    where: { key: "WHEEL_OPTIONS" },
    update: {}, // Không đè cấu hình nếu admin đã chỉnh sửa trong app
    create: {
      key: "WHEEL_OPTIONS",
      value: defaultWheelOptions,
    },
  });

  console.log("✅ Đã seed cấu hình phần thưởng vòng quay vào database.");
}

main()
  .catch((e) => {
    console.error("❌ Lỗi khi seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    pool.end();
  });
