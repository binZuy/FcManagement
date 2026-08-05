import { MatchResult, MatchType } from "@prisma/client";
import { FeeSplitMethod, FEE_SPLIT_METHOD, FEE_SPLIT_RATIOS } from "./constants";

export interface FeeConfig {
  matchType: MatchType;
  feeWinner?: number | null;
  feeLose?: number | null;
  feeDraw?: number | null;
  feeDefault?: number | null;
}

/**
 * Calculate fee for a member based on match result and their team's result
 * (dùng cho trận EXTERNAL hoặc feeWinner/feeLose riêng lẻ)
 */
export function calculateMemberFee(
  config: FeeConfig,
  memberResult: MatchResult | null
): number {
  if (config.matchType === MatchType.INTERNAL) {
    // Nội bộ không chia đội hoặc chưa có kết quả → dùng phí mặc định
    if (!memberResult || !config.feeWinner) {
      return config.feeDefault ?? 0;
    }
  }

  // Có kết quả cụ thể
  switch (memberResult) {
    case MatchResult.WIN:
      return config.feeWinner ?? config.feeDefault ?? 0;
    case MatchResult.LOSE:
      return config.feeLose ?? config.feeDefault ?? 0;
    case MatchResult.DRAW:
      return config.feeDraw ?? config.feeDefault ?? 0;
    default:
      return config.feeDefault ?? 0;
  }
}

/**
 * Tính tiền sân mỗi suất dựa trên phương pháp chia kèo (trận INTERNAL).
 *
 * Để thêm kèo mới (VD: 75-25), chỉ cần thêm vào FEE_SPLIT_METHOD và
 * FEE_SPLIT_RATIOS trong src/lib/constants.ts — không cần sửa hàm này.
 *
 * @param params.feeSplitMethod  - kèo chia tiền (lưu DB cột feeSplitMethod)
 * @param params.feeTotal        - tổng tiền sân cả trận
 * @param params.result          - kết quả trận ("WIN" | "LOSE" | "DRAW" | null)
 * @param params.teamSide        - đội của thành viên ("TEAM_A" | "TEAM_B" | null)
 * @param params.totalHeads      - tổng suất tính tiền (thành viên + khách)
 * @param params.winningHeads    - suất phía đội thắng
 * @param params.losingHeads     - suất phía đội thua
 */
export function calcFeePerHeadInternal(params: {
  feeSplitMethod: string;
  feeTotal: number;
  result: string | null;
  teamSide: string | null;
  totalHeads: number;
  winningHeads: number;
  losingHeads: number;
}): number {
  const { feeSplitMethod, feeTotal, result, teamSide, totalHeads, winningHeads, losingHeads } =
    params;

  if (!result || feeTotal <= 0) return 0;

  // Nếu hòa hoặc kèo EQUAL → chia đều
  if (result === "DRAW" || feeSplitMethod === FEE_SPLIT_METHOD.EQUAL) {
    return totalHeads > 0 ? feeTotal / totalHeads : 0;
  }

  const method = feeSplitMethod as FeeSplitMethod;
  const ratios = FEE_SPLIT_RATIOS[method] ?? null;

  if (!ratios) {
    // fallback: chia đều nếu không nhận ra kèo
    return totalHeads > 0 ? feeTotal / totalHeads : 0;
  }

  // Xác định đội thắng: result="WIN" → TEAM_A thắng; result="LOSE" → TEAM_B thắng
  const winningTeamSide = result === "WIN" ? "TEAM_A" : "TEAM_B";
  const isWinner = teamSide === winningTeamSide;

  if (isWinner) {
    return winningHeads > 0 ? (feeTotal * ratios.winnerRatio) / winningHeads : 0;
  } else {
    return losingHeads > 0 ? (feeTotal * ratios.loserRatio) / losingHeads : 0;
  }
}

/**
 * Get human-readable label for match result
 */
export function getResultLabel(result: MatchResult | null): string {
  switch (result) {
    case MatchResult.WIN:
      return "Thắng";
    case MatchResult.LOSE:
      return "Thua";
    case MatchResult.DRAW:
      return "Hòa";
    default:
      return "Chưa có kết quả";
  }
}
