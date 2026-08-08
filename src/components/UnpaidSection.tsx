"use client";

import { useState } from "react";
import { QRPaymentDialog } from "@/components/QRPaymentDialog";
import { MarkPaidButton } from "@/components/MarkPaidButton";
import { AlertCircle, CheckSquare, Square } from "lucide-react";
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

interface UnpaidSectionProps {
  memberId: string;
  memberCode: string;
  memberName: string;
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
  unpaidRecords,
  isAdmin,
}: UnpaidSectionProps) {
  // Mặc định tick chọn TẤT CẢ các khoản chưa đóng
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    new Set(unpaidRecords.map((r) => r.id))
  );

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

  // Tính tổng tiền các khoản đã tick
  const selectedTotal = unpaidRecords
    .filter((r) => selectedIds.has(r.id))
    .reduce((sum, r) => sum + (r.amountRequired - r.amountPaid), 0);

  const totalDebt = unpaidRecords.reduce(
    (sum, r) => sum + (r.amountRequired - r.amountPaid),
    0
  );

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
          gap: "10px",
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
          Các trận chưa đóng ({unpaidRecords.length})
        </h2>

        {/* Nút Tạo QR — full-width trên mobile */}
        {unpaidRecords.length > 0 && (
          <div style={{ width: "100%" }}>
            <QRPaymentDialog
              memberId={memberId}
              memberCode={memberCode}
              memberName={memberName}
              selectedRecordIds={Array.from(selectedIds)}
              selectedTotalAmount={selectedTotal}
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
              Chọn tất cả
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
                background: isSelected ? "rgba(34,197,94,0.06)" : "rgba(239,68,68,0.04)",
                border: isSelected ? "1px solid rgba(34,197,94,0.3)" : "1px solid rgba(239,68,68,0.08)",
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
                  border: isSelected ? "2px solid #22c55e" : "2px solid #334155",
                  background: isSelected ? "#22c55e" : "transparent",
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
                    color: (r.note?.startsWith("Bạn") || r.note?.startsWith("Khách")) ? "#fb923c" : "var(--card-foreground)",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {r.session.title}{r.note ? <span style={{ color: "#fb923c", fontWeight: 600 }}> ({r.note.replace("Khách đi cùng", "Bạn").replace("Bạn đi cùng", "Bạn").replace("+", "")})</span> : ""}
                </div>
                {/* Chỉ hiển thị hạn nộp nếu có — bỏ status & yêu cầu vì thừa */}
                {r.session.dueDate && (
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
                  style={{ fontSize: "0.9rem", fontWeight: 800, color: isSelected ? "#22c55e" : "#f87171" }}
                >
                  {formatCurrency(outstanding)}
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
