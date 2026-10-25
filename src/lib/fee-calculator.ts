import { MatchResult, MatchType, PaymentType, PaymentStatus, RecordStatus } from "@prisma/client";
import { FeeSplitMethod, FEE_SPLIT_METHOD, FEE_SPLIT_RATIOS } from "./constants";
import { prisma } from "./prisma";

export const LATE_PENALTY_SESSION_CODE = "LATE_PENALTY";

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

/**
 * Tính phí phạt nộp chậm theo quy chế FC:
 * - Khi có >= 4 trận chưa thanh toán:
 *   + Phạt cơ bản khởi điểm: +5.000 VNĐ
 *   + Cứ mỗi ngày trôi qua cộng thêm: +1.000 VNĐ / ngày
 * 
 * @param unpaidRecords - Danh sách các khoản chưa thanh toán (kèm createdAt)
 */
export function calculateLatePenalty(unpaidRecords: { createdAt: Date | string }[]): {
  isPenalized: boolean;
  lateFee: number;
  daysLate: number;
} {
  if (unpaidRecords.length < 4) {
    return { isPenalized: false, lateFee: 0, daysLate: 0 };
  }

  // Sắp xếp các khoản chưa thanh toán cũ nhất trước
  const sorted = [...unpaidRecords].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

  // Bản ghi thứ 4 (index 3) kích hoạt mức phạt
  const fourthRecordDate = new Date(sorted[3].createdAt);
  const now = new Date();
  const diffTime = Math.max(0, now.getTime() - fourthRecordDate.getTime());
  const daysLate = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  const lateFee = 5000 + daysLate * 1000;

  return {
    isPenalized: true,
    lateFee,
    daysLate,
  };
}

/**
 * Tự động tạo hoặc đồng bộ bản ghi phạt nộp chậm (LATE_PENALTY) vào cơ sở dữ liệu:
 * - Khi thành viên nợ >= 4 trận: Tạo hoặc cập nhật PaymentRecord phạt nộp chậm
 * - Khi thành viên nợ < 4 trận: Tự động dọn dẹp bản ghi phạt nộp chậm PENDING nếu có
 */
export async function ensureMemberLatePenaltyRecord(memberId: string) {
  try {
    const member = await prisma.member.findUnique({
      where: { id: memberId },
      include: {
        paymentRecords: {
          where: {
            status: { in: [RecordStatus.PENDING, RecordStatus.OVERDUE] },
          },
          include: {
            session: { select: { id: true, code: true, type: true } },
          },
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!member) return null;

    // Chỉ tính các trận bóng thực tế (bỏ qua bản ghi phạt)
    const matchUnpaidRecords = member.paymentRecords.filter(
      (r) => r.session.code !== LATE_PENALTY_SESSION_CODE
    );

    const penalty = calculateLatePenalty(matchUnpaidRecords);

    let penaltySession = await prisma.paymentSession.findUnique({
      where: { code: LATE_PENALTY_SESSION_CODE },
    });

    if (penalty.isPenalized) {
      if (!penaltySession) {
        penaltySession = await prisma.paymentSession.create({
          data: {
            code: LATE_PENALTY_SESSION_CODE,
            title: "Phạt nộp chậm (quá hạn ≥ 4 trận)",
            description: "Khoản phạt nộp chậm tự động kích hoạt khi có từ 4 trận chưa thanh toán",
            type: PaymentType.CUSTOM,
            status: PaymentStatus.OPEN,
          },
        });
      }

      // Tìm bản ghi phạt nộp chậm hiện tại của member
      const existingPenaltyRecord = await prisma.paymentRecord.findUnique({
        where: {
          sessionId_memberId: {
            sessionId: penaltySession.id,
            memberId: member.id,
          },
        },
      });

      if (!existingPenaltyRecord) {
        await prisma.paymentRecord.create({
          data: {
            sessionId: penaltySession.id,
            memberId: member.id,
            amountRequired: penalty.lateFee,
            amountPaid: 0,
            status: RecordStatus.PENDING,
            note: `Quá hạn ${penalty.daysLate} ngày (kích hoạt từ trận thứ 4)`,
          },
        });
      } else if (
        existingPenaltyRecord.status === RecordStatus.PENDING ||
        existingPenaltyRecord.status === RecordStatus.OVERDUE
      ) {
        if (
          existingPenaltyRecord.amountRequired !== penalty.lateFee ||
          !existingPenaltyRecord.note?.includes(`${penalty.daysLate} ngày`)
        ) {
          await prisma.paymentRecord.update({
            where: { id: existingPenaltyRecord.id },
            data: {
              amountRequired: penalty.lateFee,
              note: `Quá hạn ${penalty.daysLate} ngày (kích hoạt từ trận thứ 4)`,
            },
          });
        }
      }
    } else {
      // Nếu thành viên không còn bị phạt, xóa bản ghi phạt nộp chậm chưa đóng nếu có
      if (penaltySession) {
        await prisma.paymentRecord.deleteMany({
          where: {
            sessionId: penaltySession.id,
            memberId: member.id,
            status: { in: [RecordStatus.PENDING, RecordStatus.OVERDUE] },
          },
        });
      }
    }

    return penalty;
  } catch (error) {
    console.error("Lỗi khi đồng bộ phạt nộp chậm cho thành viên:", error);
    return null;
  }
}

/**
 * Đồng bộ phạt nộp chậm cho toàn bộ thành viên
 */
export async function ensureAllLatePenaltyRecords() {
  try {
    const members = await prisma.member.findMany({
      select: { id: true },
    });
    for (const m of members) {
      await ensureMemberLatePenaltyRecord(m.id);
    }
  } catch (error) {
    console.error("Lỗi khi đồng bộ toàn bộ phạt nộp chậm:", error);
  }
}

