"use client";

import { QRPaymentDialog } from "@/components/QRPaymentDialog";
import { MarkPaidButton } from "@/components/MarkPaidButton";
import { AlertCircle } from "lucide-react";

interface UnpaidRecord {
  id: string;
  amountRequired: number;
  amountPaid: number;
  status: string;
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

function formatDate(date: Date | string): string {
  return new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(date));
}

export function UnpaidSection({
  memberId,
  memberCode,
  memberName,
  unpaidRecords,
  isAdmin,
}: UnpaidSectionProps) {
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
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "12px",
          marginBottom: "16px",
        }}
      >
        <h2
          style={{
            fontSize: "1.05rem",
            fontWeight: 700,
            color: totalDebt > 0 ? "#f87171" : "var(--card-foreground)",
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <AlertCircle size={18} />
          Các trận/khoản chưa đóng ({unpaidRecords.length})
        </h2>

        {/* QR Button - hiển thị khi có khoản chưa đóng */}
        {unpaidRecords.length > 0 && (
          <QRPaymentDialog
            memberId={memberId}
            memberCode={memberCode}
            memberName={memberName}
            unpaidRecords={unpaidRecords}
          />
        )}
      </div>

      {/* Records list */}
      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
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
          return (
            <div
              key={r.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                padding: "12px",
                borderRadius: "10px",
                background: "rgba(239,68,68,0.04)",
                border: "1px solid rgba(239,68,68,0.08)",
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: "0.85rem",
                    fontWeight: 700,
                    color: "var(--card-foreground)",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {r.session.title}
                </div>
                <div
                  style={{
                    fontSize: "0.75rem",
                    color: "var(--muted-foreground)",
                    marginTop: "4px",
                    display: "flex",
                    gap: "8px",
                    flexWrap: "wrap",
                  }}
                >
                  <span style={{ color: cfg.color, fontWeight: 600 }}>
                    {cfg.label}
                  </span>
                  <span>•</span>
                  <span>Yêu cầu: {formatCurrency(r.amountRequired)}</span>
                  {r.session.dueDate && (
                    <>
                      <span>•</span>
                      <span>Hạn: {formatDate(r.session.dueDate)}</span>
                    </>
                  )}
                </div>
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
                  style={{ fontSize: "0.9rem", fontWeight: 800, color: "#f87171" }}
                >
                  {formatCurrency(outstanding)}
                </div>
                {isAdmin && (
                  <MarkPaidButton
                    recordId={r.id}
                    amountRequired={r.amountRequired}
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
