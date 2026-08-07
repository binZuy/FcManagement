import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  pool: Pool | undefined;
};

function createPrismaClient() {
  // Luôn dùng DATABASE_URL (Connection Pooler) cho app runtime, KHÔNG dùng DIRECT_URL
  const connectionString = process.env.DATABASE_URL!;
  
  const pool =
    globalForPrisma.pool ??
    new Pool({
      connectionString,
      max: 1, // Giới hạn tối đa 1 connection cho mỗi serverless container trên Vercel
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    });

  globalForPrisma.pool = pool;
  const adapter = new PrismaPg(pool);

  const devLog: ("query" | "error" | "warn")[] =
    process.env.DEBUG_PRISMA_QUERY === "1"
      ? ["query", "error", "warn"]
      : ["error", "warn"];

  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? devLog : ["error"],
  });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

globalForPrisma.prisma = prisma;

