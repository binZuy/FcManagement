import { MatchResult, MatchType } from "@prisma/client";

export interface FeeConfig {
  matchType: MatchType;
  feeWinner?: number | null;
  feeLose?: number | null;
  feeDraw?: number | null;
  feeDefault?: number | null;
}

/**
 * Calculate fee for a member based on match result and their team's result
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
