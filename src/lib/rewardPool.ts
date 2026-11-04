import { prisma } from "@/lib/prisma";

const REWARD_POOL_KEY = "REWARD_POOL";

/**
 * Lấy số dư hiện tại của Quỹ thưởng (khởi tạo 0 nếu chưa có)
 */
export async function getRewardPoolBalance(): Promise<number> {
  try {
    const setting = await prisma.systemSetting.findUnique({
      where: { key: REWARD_POOL_KEY },
    });
    if (!setting) return 0;
    const val = Number((setting.value as any)?.balance ?? setting.value);
    return isNaN(val) ? 0 : Math.max(0, val);
  } catch (error) {
    console.error("Lỗi getRewardPoolBalance:", error);
    return 0;
  }
}

/**
 * Cộng thêm tiền vào Quỹ thưởng (ví dụ: khi có người nộp phạt LATE_PENALTY)
 */
export async function addToRewardPool(amount: number, reason?: string): Promise<number> {
  if (amount <= 0) return await getRewardPoolBalance();
  try {
    const current = await getRewardPoolBalance();
    const newBalance = current + amount;
    await prisma.systemSetting.upsert({
      where: { key: REWARD_POOL_KEY },
      update: {
        value: { balance: newBalance, lastUpdatedReason: reason || "add", updatedAt: new Date().toISOString() },
      },
      create: {
        key: REWARD_POOL_KEY,
        value: { balance: newBalance, lastUpdatedReason: reason || "add", updatedAt: new Date().toISOString() },
      },
    });
    return newBalance;
  } catch (error) {
    console.error("Lỗi addToRewardPool:", error);
    return 0;
  }
}

/**
 * Trừ bớt tiền trong Quỹ thưởng (ví dụ: khi thành viên trúng Voucher discount)
 */
export async function deductFromRewardPool(amount: number, reason?: string): Promise<number> {
  if (amount <= 0) return await getRewardPoolBalance();
  try {
    const current = await getRewardPoolBalance();
    const newBalance = Math.max(0, current - amount);
    await prisma.systemSetting.upsert({
      where: { key: REWARD_POOL_KEY },
      update: {
        value: { balance: newBalance, lastUpdatedReason: reason || "deduct", updatedAt: new Date().toISOString() },
      },
      create: {
        key: REWARD_POOL_KEY,
        value: { balance: newBalance, lastUpdatedReason: reason || "deduct", updatedAt: new Date().toISOString() },
      },
    });
    return newBalance;
  } catch (error) {
    console.error("Lỗi deductFromRewardPool:", error);
    return 0;
  }
}

