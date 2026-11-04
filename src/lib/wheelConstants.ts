export interface WheelOption {
  id: string;
  label: string;
  icon: string;
  color: string;
  weight: number; // Tỉ lệ % trúng ảo
  rewardType: "NONE" | "DISCOUNT_2K" | "DISCOUNT_5K" | "DISCOUNT_10K" | "FREE_MATCH" | "FREE_DRINK" | "MOTM_NEXT_MATCH";
  discountAmount?: number;
  isFreeMatch?: boolean;
  isFreeDrink?: boolean;
}

export const DEFAULT_WHEEL_OPTIONS: WheelOption[] = [
  { id: "1", label: "Cùng đội với Binzuy", icon: "👑", color: "#1e3a8a", weight: 28.2, rewardType: "NONE" },
  { id: "2", label: "MOTM 1 trận", icon: "⭐", color: "#d97706", weight: 28.2, rewardType: "MOTM_NEXT_MATCH" },
  { id: "3", label: "Đen thế lần sau nhé", icon: "⚽", color: "#1e293b", weight: 28.2, rewardType: "NONE" },
  { id: "4", label: "Voucher 2k tiền sân", icon: "🪙", color: "#0d9488", weight: 10, rewardType: "DISCOUNT_2K", discountAmount: 2000 },
  { id: "5", label: "Voucher 5k tiền sân", icon: "💵", color: "#065f46", weight: 5, rewardType: "DISCOUNT_5K", discountAmount: 5000 },
  { id: "6", label: "Voucher 10k tiền sân", icon: "🎁", color: "#991b1b", weight: 0.25, rewardType: "DISCOUNT_10K", discountAmount: 10000 },
  { id: "7", label: "Free nước 1 trận", icon: "🥤", color: "#312e81", weight: 0.1, rewardType: "FREE_DRINK", isFreeDrink: true },
  { id: "8", label: "Free tiền sân 1 trận", icon: "🎰", color: "#b45309", weight: 0.05, rewardType: "FREE_MATCH", isFreeMatch: true },
];

export const PRESET_WHEEL_COLORS = [
  { label: "Sapphire Đêm", color: "#1e3a8a" },
  { label: "Lục Bảo Sân Cỏ", color: "#065f46" },
  { label: "Hổ Phách Hoàng Gia", color: "#b45309" },
  { label: "Đỏ Ruby Quyền Lực", color: "#991b1b" },
  { label: "Tím Chàm Midnight", color: "#312e81" },
  { label: "Đen Obsidian Than", color: "#1e293b" },
  { label: "Ngọc Bích Mint", color: "#059669" },
  { label: "Đồng Gold Ánh Kim", color: "#d97706" },
  { label: "Rượu Vang Đỏ", color: "#831843" },
  { label: "Xanh Navy Đại Dương", color: "#0f172a" },
];

export const PRESET_WHEEL_ICONS = ["👑", "💵", "🥤", "🎰", "☕", "⚽", "🎁", "🔥", "🏆", "🍻", "🍕", "⚡"];
