/**
 * Các hằng số dùng trong toàn bộ ứng dụng
 */

// ─── Phương pháp chia tiền sân (trận nội bộ) ─────────────────────────────────
// Lưu vào DB: bảng match_sessions, cột feeSplitMethod (String)
export const FEE_SPLIT_METHOD = {
  /** Chia đều 50-50 */
  EQUAL: "EQUAL",
  /** Đội thua chịu 100% */
  LOSER_100: "LOSER_100",
  /** Đội thua 70% – Đội thắng 30% */
  LOSER_70_WINNER_30: "LOSER_70_WINNER_30",
  /** Đội thua 60% – Đội thắng 40% */
  LOSER_60_WINNER_40: "LOSER_60_WINNER_40",
  // Thêm kèo mới ở đây, VD: LOSER_75_WINNER_25: "LOSER_75_WINNER_25",
} as const;

export type FeeSplitMethod = (typeof FEE_SPLIT_METHOD)[keyof typeof FEE_SPLIT_METHOD];

/** Label hiển thị trên UI tương ứng với từng kèo */
export const FEE_SPLIT_METHOD_LABELS: Record<FeeSplitMethod, string> = {
  [FEE_SPLIT_METHOD.EQUAL]:              "Chia đều",
  [FEE_SPLIT_METHOD.LOSER_100]:          "Thua 100%",
  [FEE_SPLIT_METHOD.LOSER_70_WINNER_30]: "Thua 70% / Thắng 30%",
  [FEE_SPLIT_METHOD.LOSER_60_WINNER_40]: "Thua 60% / Thắng 40%",
};

/**
 * Tỷ lệ chia tiền theo kèo: { loserRatio, winnerRatio }
 * Dùng để tính: tiền_thua = feeTotal * loserRatio / losingHeads
 *               tiền_thắng = feeTotal * winnerRatio / winningHeads
 * null = chia đều, không phân biệt đội thắng/thua
 */
export const FEE_SPLIT_RATIOS: Record<
  FeeSplitMethod,
  { loserRatio: number; winnerRatio: number } | null
> = {
  [FEE_SPLIT_METHOD.EQUAL]: null,
  [FEE_SPLIT_METHOD.LOSER_100]: { loserRatio: 1.0, winnerRatio: 0.0 },
  [FEE_SPLIT_METHOD.LOSER_70_WINNER_30]: { loserRatio: 0.7, winnerRatio: 0.3 },
  [FEE_SPLIT_METHOD.LOSER_60_WINNER_40]: { loserRatio: 0.6, winnerRatio: 0.4 },
};
