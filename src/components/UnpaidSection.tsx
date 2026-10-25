"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { QRPaymentDialog } from "@/components/QRPaymentDialog";
import { MarkPaidButton } from "@/components/MarkPaidButton";
import { showToast } from "@/components/Toast";
import { AlertCircle, CheckSquare, Square, CheckCircle, Loader2 } from "lucide-react";
import { formatDate } from "@/lib/utils";

interface UnpaidRecord {
  id: string;
  amountRequired: number;
  amountPaid: number;
  status: string;
  note?: string | null;
  session: {
    title: string;
    code: string;
    dueDate: Date | null;
  };
}

export interface ActiveReward {
  id: string;
  label: string;
  icon: string;
  discountAmount: number;
  isFreeMatch: boolean;
  isFreeDrink: boolean;
}

interface UnpaidSectionProps {
  memberId: string;
  memberCode: string;
  memberName: string;
  activeRewards?: ActiveReward[];
  unpaidRecords: UnpaidRecord[];
  isAdmin: boolean;
}

const RECORD_STATUS: Record<string, { label: string; color: string }> = {
  PENDING: { label: "Chưa đóng", color: "#facc15" },
  OVERDUE: { label: "Quá hạn", color: "#f87171" },
};

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(amount);
}

export function UnpaidSection({
  memberId,
  memberCode,
  memberName,
  activeRewards = [],
  unpaidRecords,
  isAdmin,
}: UnpaidSectionProps) {
  const router = useRouter();

  // Mặc định tick chọn TẤT CẢ các khoản chưa đóng
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    new Set(unpaidRecords.map((r) => r.id))
  );
  const [appliedRewardId, setAppliedRewardId] = useState<string | null>(null);
  const [isBulkLoading, setIsBulkLoading] = useState(false);
  const [isBulkConfirming, setIsBulkConfirming] = useState(false);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => setSelectedIds(new Set(unpaidRecords.map((r) => r.id)));
  const clearAll = () => setSelectedIds(new Set());

  const handleBulkMarkPaid = async () => {
    if (selectedIds.size === 0) return;

    if (!isBulkConfirming) {
      setIsBulkConfirming(true);
      setTimeout(() => setIsBulkConfirming(false), 3500);
      return;
    }

    setIsBulkConfirming(false);
    setIsBulkLoading(true);

    try {
      const recordIdsArray = Array.from(selectedIds);
      const res = await fetch("/api/payments/records/bulk-paid", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recordIds: recordIdsArray }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || "Lỗi khi cập nhật");
      }

      showToast.success(`Đã thu thành công ${recordIdsArray.length} khoản! 🎉`);
      setSelectedIds(new Set());
      router.refresh();
    } catch (err: any) {
      showToast.error("Lỗi khi thu tiền: " + (err.message || err));
    } finally {
      setIsBulkLoading(false);
    }
  };

  // Tính tổng tiền các khoản đã tick
  const selectedRecords = unpaidRecords.filter((r) => selectedIds.has(r.id));
  const selectedTotal = selectedRecords.reduce((sum, r) => sum + (r.amountRequired - r.amountPaid), 0);

  // Phân loại voucher: voucher giảm tiền sân vs đặc quyền giao lưu
  const discountableRewards = activeRewards.filter((rw) => rw.discountAmount > 0 || rw.isFreeMatch);
  const perkRewards = activeRewards.filter((rw) => !rw.discountAmount && !rw.isFreeMatch);

  // Tính discount nếu có voucher được áp dụng
  const appliedReward = discountableRewards.find((rw) => rw.id === appliedRewardId);
  let discountAmount = 0;
  if (appliedReward && selectedRecords.length > 0) {
    if (appliedReward.isFreeMatch) {
      discountAmount = selectedRecords[0] ? (selectedRecords[0].amountRequired - selectedRecords[0].amountPaid) : 0;
    } else if (appliedReward.discountAmount > 0) {
      discountAmount = appliedReward.discountAmount;
    }
  }

  const finalTotalAmount = Math.max(0, selectedTotal - discountAmount);

  const totalDebt = unpaidRecords.reduce(
    (sum, r) => sum + (r.amountRequired - r.amountPaid),
    0
  );

  const matchCount = unpaidRecords.filter((r) => r.session.code !== "LATE_PENALTY").length;
  const hasPenalty = unpaidRecords.some((r) => r.session.code === "LATE_PENALTY");

  return (
    <div
      className="glass-card"
      style={{
        padding: "24px",
        border:
          totalDebt > 0
            ? "1px solid rgba(248,113,113,0.25)"
            : "1px solid var(--border)",
      }}
    >
      {/* Header row */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "12px",
          marginBottom: "16px",
        }}
      >
        <h2
          style={{
            fontSize: "1rem",
            fontWeight: 700,
            color: totalDebt > 0 ? "#f87171" : "var(--card-foreground)",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            margin: 0,
          }}
        >
          <AlertCircle size={17} />
          {hasPenalty
            ? `Các khoản chưa đóng (${matchCount} trận + 1 khoản phạt)`
            : `Các trận chưa đóng (${unpaidRecords.length})`}
        </h2>

        {/* Banner Voucher Giảm Giá Tiền Sân (nếu thành viên có) */}
        {discountableRewards.length > 0 && unpaidRecords.length > 0 && (
          <div
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "10px 14px",
              borderRadius: "10px",
              background: "linear-gradient(135deg, rgba(34,197,94,0.12), rgba(15,23,42,0.85))",
              border: "1px solid rgba(34,197,94,0.35)",
              flexWrap: "wrap",
              gap: "8px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px", flex: 1, minWidth: "220px" }}>
              <span style={{ fontSize: "1.3rem" }}>🎟️</span>
              <div>
                <div style={{ fontSize: "0.82rem", fontWeight: 700, color: "#4ade80" }}>
                  {appliedReward
                    ? `Đang áp dụng: ${appliedReward.icon} ${appliedReward.label} (-${formatCurrency(discountAmount)})`
                    : `Bạn có ${discountableRewards.length} Voucher giảm tiền sân!`}
                </div>
                <div style={{ fontSize: "0.72rem", color: "var(--muted-foreground)" }}>
                  {appliedReward
                    ? `Được trừ thẳng ${formatCurrency(discountAmount)} khi quét mã QR thanh toán`
                    : "Áp dụng voucher để trừ tiền sân trực tiếp vào mã QR"}
                </div>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              {discountableRewards.length > 1 ? (
                <select
                  value={appliedRewardId ?? ""}
                  onChange={(e) => setAppliedRewardId(e.target.value || null)}
                  className="form-input"
                  style={{
                    padding: "4px 8px",
                    borderRadius: "6px",
                    background: "#0f172a",
                    borderColor: "rgba(34,197,94,0.4)",
                    color: "white",
                    fontSize: "0.75rem",
                    fontWeight: 600,
                  }}
                >
                  <option value="">-- Không dùng voucher --</option>
                  {discountableRewards.map((rw) => (
                    <option key={rw.id} value={rw.id}>
                      {rw.icon} {rw.label} {rw.discountAmount > 0 ? `(-${formatCurrency(rw.discountAmount)})` : "(Free sân)"}
                    </option>
                  ))}
                </select>
              ) : (
                <button
                  type="button"
                  onClick={() => setAppliedRewardId(appliedRewardId ? null : discountableRewards[0].id)}
                  style={{
                    padding: "5px 12px",
                    borderRadius: "6px",
                    background: appliedRewardId ? "#22c55e" : "rgba(34,197,94,0.2)",
                    color: appliedRewardId ? "#ffffff" : "#4ade80",
                    border: "1px solid rgba(34,197,94,0.4)",
                    fontSize: "0.75rem",
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  {appliedRewardId ? "✓ Đã áp dụng" : "Dùng Voucher"}
                </button>
              )}
            </div>
          </div>
        )}

        {/* Banner Đặc quyền / Quà tặng thành viên (nước, MOTM, ...) */}
        {perkRewards.length > 0 && (
          <div
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "8px 12px",
              borderRadius: "8px",
              background: "rgba(234,179,8,0.08)",
              border: "1px solid rgba(234,179,8,0.25)",
              flexWrap: "wrap",
            }}
          >
            <span style={{ fontSize: "0.95rem" }}>⭐</span>
            <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "#facc15" }}>
              Đặc quyền đang có:
            </span>
            <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
              {perkRewards.map((p) => (
                <span
                  key={p.id}
                  style={{
                    padding: "2px 8px",
                    borderRadius: "999px",
                    background: "rgba(234,179,8,0.18)",
                    border: "1px solid rgba(234,179,8,0.35)",
                    fontSize: "0.72rem",
                    fontWeight: 700,
                    color: "#fef08a",
                  }}
                >
                  {p.icon} {p.label}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Nút Tạo QR — full-width trên mobile */}
        {unpaidRecords.length > 0 && (
          <div style={{ width: "100%" }}>
            <QRPaymentDialog
              memberId={memberId}
              memberCode={memberCode}
              memberName={memberName}
              selectedRecordIds={Array.from(selectedIds)}
              selectedTotalAmount={finalTotalAmount}
              rewardId={appliedRewardId}
            />
          </div>
        )}
      </div>

      {/* Select Toolbar */}
      {unpaidRecords.length > 0 && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "9px 12px",
            borderRadius: "8px",
            background: "rgba(30, 41, 59, 0.4)",
            border: "1px solid rgba(255,255,255,0.06)",
            marginBottom: "14px",
            flexWrap: "wrap",
            gap: "6px",
          }}
        >
          <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
            <button
              onClick={selectAll}
              style={{
                padding: "4px 9px",
                borderRadius: "6px",
                background: "rgba(34,197,94,0.12)",
                color: "#4ade80",
                border: "1px solid rgba(34,197,94,0.2)",
                cursor: "pointer",
                fontSize: "0.72rem",
                fontWeight: 600,
              }}
            >
              Tất cả
            </button>
            <button
              onClick={clearAll}
              style={{
                padding: "4px 9px",
                borderRadius: "6px",
                background: "rgba(255,255,255,0.04)",
                color: "#94a3b8",
                border: "1px solid rgba(255,255,255,0.08)",
                cursor: "pointer",
                fontSize: "0.72rem",
                fontWeight: 600,
              }}
            >
              Bỏ chọn
            </button>
            {isAdmin && selectedIds.size > 0 && (
              <button
                type="button"
                onClick={handleBulkMarkPaid}
                disabled={isBulkLoading}
                style={{
                  padding: "4px 10px",
                  borderRadius: "6px",
                  background: isBulkConfirming
                    ? "rgba(234, 179, 8, 0.9)"
                    : "var(--primary)",
                  color: isBulkConfirming ? "#000" : "white",
                  border: "none",
                  cursor: isBulkLoading ? "not-allowed" : "pointer",
                  fontSize: "0.72rem",
                  fontWeight: 800,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                  transition: "all 0.15s ease",
                }}
              >
                {isBulkLoading ? (
                  <Loader2 size={13} className="animate-spin" />
                ) : (
                  <CheckCircle size={13} />
                )}
                {isBulkLoading
                  ? "Đang xử lý..."
                  : isBulkConfirming
                  ? `Xác nhận thu ${selectedIds.size}?`
                  : `Đã chọn ${selectedIds.size}`}
              </button>
            )}
          </div>

          <div style={{ fontSize: "0.78rem", color: "var(--muted-foreground)", whiteSpace: "nowrap" }}>
            Đã chọn: <strong style={{ color: "#f1f5f9" }}>{selectedIds.size}</strong>/{unpaidRecords.length} · Tổng:{" "}
            <strong style={{ color: selectedIds.size > 0 ? "#22c55e" : "var(--muted-foreground)" }}>
              {formatCurrency(selectedTotal)}
            </strong>
          </div>
        </div>
      )}

      {/* Records list với Checkbox trực tiếp */}
      <div style={{ display: "flex", flexDirection: "column", gap: "10px", maxHeight: "400px", overflowY: "auto" }}>
        {unpaidRecords.length === 0 && (
          <div style={{ textAlign: "center", padding: "36px 0", color: "#4ade80" }}>
            <AlertCircle
              size={32}
              style={{ margin: "0 auto 12px", opacity: 0.5, display: "block" }}
              color="#4ade80"
            />
            <span style={{ fontWeight: 600, fontSize: "0.9rem" }}>
              Thành viên này đã đóng đủ mọi khoản!
            </span>
          </div>
        )}

        {unpaidRecords.map((r) => {
          const cfg = RECORD_STATUS[r.status] ?? { label: r.status, color: "white" };
          const outstanding = r.amountRequired - r.amountPaid;
          const isSelected = selectedIds.has(r.id);
          const isPenalty = r.session.code === "LATE_PENALTY";

          const cleanTitle = isPenalty
            ? "🚨 Phạt nộp chậm (quá hạn ≥ 4 trận)"
            : r.session.title.replace(/^Tiền sân:\s*/i, "").replace(/^Tiền sân\s*-\s*/i, "");
          const isOnlyGuestDebt = !isPenalty && r.amountPaid > 0 && !!r.note;

          return (
            <div
              key={r.id}
              onClick={() => toggleSelect(r.id)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                padding: "12px 14px",
                borderRadius: "10px",
                background: isPenalty
                  ? isSelected
                    ? "rgba(239,68,68,0.12)"
                    : "rgba(239,68,68,0.04)"
                  : isSelected
                  ? "rgba(34,197,94,0.06)"
                  : "rgba(239,68,68,0.04)",
                border: isPenalty
                  ? isSelected
                    ? "1px solid rgba(239,68,68,0.45)"
                    : "1px solid rgba(239,68,68,0.2)"
                  : isSelected
                  ? "1px solid rgba(34,197,94,0.3)"
                  : "1px solid rgba(239,68,68,0.08)",
                cursor: "pointer",
                transition: "all 0.15s",
                userSelect: "none",
              }}
            >
              {/* Checkbox trực tiếp trên danh sách */}
              <div
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: "5px",
                  border: isPenalty
                    ? isSelected
                      ? "2px solid #ef4444"
                      : "2px solid #7f1d1d"
                    : isSelected
                    ? "2px solid #22c55e"
                    : "2px solid #334155",
                  background: isPenalty
                    ? isSelected
                      ? "#ef4444"
                      : "transparent"
                    : isSelected
                    ? "#22c55e"
                    : "transparent",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  transition: "all 0.15s",
                }}
              >
                {isSelected && (
                  <svg width="11" height="9" viewBox="0 0 11 9" fill="none">
                    <path d="M1 4.5L4 7.5L10 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: "0.85rem",
                    fontWeight: 700,
                    color: isPenalty ? "#f87171" : isOnlyGuestDebt ? "#fb923c" : "var(--card-foreground)",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {cleanTitle}
                </div>

                {isPenalty ? (
                  <div style={{ fontSize: "0.75rem", color: "#f87171", fontWeight: 600, marginTop: "2px" }}>
                    {r.note ?? "Khoản phạt nộp chậm theo quy chế đóng quỹ FC KTX"}
                  </div>
                ) : (isOnlyGuestDebt || r.note) ? (
                  <div style={{ fontSize: "0.75rem", color: "#fb923c", fontWeight: 600, marginTop: "2px" }}>
                    {isOnlyGuestDebt ? (
                      "• Bạn"
                    ) : r.note ? (
                      `• ${r.note.replace("Khách đi cùng", "Bạn").replace("Bạn đi cùng", "Bạn").replace("+", "")}`
                    ) : null}
                  </div>
                ) : null}

                {/* Chỉ hiển thị hạn nộp nếu có — bỏ status & yêu cầu vì thừa */}
                {!isPenalty && r.session.dueDate && (
                  <div style={{ fontSize: "0.72rem", color: "var(--muted-foreground)", marginTop: "3px" }}>
                    Hạn: {formatDate(r.session.dueDate)}
                  </div>
                )}
              </div>

              <div
                style={{
                  textAlign: "right",
                  flexShrink: 0,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "flex-end",
                  gap: "6px",
                }}
              >
                <div
                  style={{
                    fontSize: "0.9rem",
                    fontWeight: 800,
                    color: isPenalty
                      ? "#f87171"
                      : isSelected
                      ? "#22c55e"
                      : "#f87171",
                  }}
                >
                  {isPenalty ? `+${formatCurrency(outstanding)}` : formatCurrency(outstanding)}
                </div>
                {isAdmin && (
                  <div onClick={(e) => e.stopPropagation()}>
                    <MarkPaidButton
                      recordId={r.id}
                      amountRequired={r.amountRequired}
                    />
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
