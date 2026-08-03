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
