/**
 * Telegram notification helper
 * Build ready — uncomment TELEGRAM_BOT_TOKEN + TELEGRAM_CHAT_ID in .env.local to activate
 */

// export const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN!;
// export const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID!;

// export async function sendTelegramMessage(text: string): Promise<void> {
//   if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
//     console.warn("[Telegram] Bot token or chat ID not configured, skipping notification");
//     return;
//   }
//   const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
//   await fetch(url, {
//     method: "POST",
//     headers: { "Content-Type": "application/json" },
//     body: JSON.stringify({
//       chat_id: TELEGRAM_CHAT_ID,
//       text,
//       parse_mode: "Markdown",
//     }),
//   });
// }

// export function formatPaymentNotification(
//   memberName: string,
//   amount: number,
//   sessionTitle: string
// ): string {
//   const formatted = new Intl.NumberFormat("vi-VN").format(amount);
//   return `✅ *${memberName}* đã đóng *${formatted}đ*\n📋 Phiên: ${sessionTitle}\n⏰ ${new Date().toLocaleString("vi-VN")}`;
// }

// Placeholder export để không lỗi import
export {};
