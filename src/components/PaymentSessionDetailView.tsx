"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle, Loader2, CheckSquare, Square } from "lucide-react";
import { MarkPaidButton } from "@/components/MarkPaidButton";
import { showToast } from "@/components/Toast";
import { formatCurrency, formatDateTime } from "@/lib/utils";

interface DisplayItem {
  id: string;
  name: string;
  isGuest: boolean;
  guestNote: string | null;
  code: string;
  image: string | null;
  amountRequired: number;
  amountPaid: number;
  status: string;
  paidAt: Date | string | null;
  paymentMethod: string | null;
  sepayTx: any;
}

interface PaymentSessionDetailViewProps {
  displayItems: DisplayItem[];
  isAdmin: boolean;
  RECORD_STATUS: Record<string, { label: string; cls: string; color: string; bg: string }>;
}

export function PaymentSessionDetailView({
  displayItems,
  isAdmin,
  RECORD_STATUS,
}: PaymentSessionDetailViewProps) {
  const router = useRouter();

  // List of unpaid items
  const unpaidItems = displayItems.filter(
    (item) => item.status !== "PAID" && item.status !== "WAIVED"
  );

  // Selected item IDs for bulk action
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
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

  const selectAllUnpaid = () => {
    setSelectedIds(new Set(unpaidItems.map((item) => item.id)));
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
  };

  const selectedTotalAmount = displayItems
    .filter((item) => selectedIds.has(item.id))
    .reduce((sum, item) => sum + item.amountRequired, 0);

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

      showToast.success(`Đã xác nhận thu tiền ${recordIdsArray.length} khoản thành công! 🎉`);
      setSelectedIds(new Set());
      router.refresh();
    } catch (err: any) {
      showToast.error("Lỗi khi thu tiền: " + (err.message || err));
    } finally {
      setIsBulkLoading(false);
    }
  };

  return (
    <div className="glass-card" style={{ padding: "20px" }}>
      {/* Header section & Bulk Actions */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "12px",
          marginBottom: "16px",
        }}
      >
        <h2 style={{ fontSize: "1.05rem", fontWeight: 700, color: "var(--card-foreground)" }}>
          Danh sách khoản đóng ({displayItems.length} khoản)
        </h2>

        {/* Bulk Actions for Admin */}
        {isAdmin && unpaidItems.length > 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={selectAllUnpaid}
              style={{
                padding: "5px 10px",
                borderRadius: "6px",
                background: "rgba(34, 197, 94, 0.12)",
                border: "1px solid rgba(34, 197, 94, 0.3)",
                color: "#4ade80",
                fontSize: "0.75rem",
                fontWeight: 600,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "4px",
              }}
            >
              <CheckSquare size={13} /> Chọn tất cả chưa thu ({unpaidItems.length})
            </button>

            {selectedIds.size > 0 && (
              <>
                <button
                  type="button"
                  onClick={clearSelection}
                  style={{
                    padding: "5px 10px",
                    borderRadius: "6px",
                    background: "rgba(255, 255, 255, 0.05)",
                    border: "1px solid rgba(255, 255, 255, 0.1)",
                    color: "var(--muted-foreground)",
                    fontSize: "0.75rem",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  <Square size={13} /> Bỏ chọn
                </button>

                <button
                  type="button"
                  onClick={handleBulkMarkPaid}
                  disabled={isBulkLoading}
                  style={{
                    padding: "6px 12px",
                    borderRadius: "6px",
                    background: isBulkConfirming
                      ? "rgba(234, 179, 8, 0.9)"
                      : "var(--primary)",
                    color: isBulkConfirming ? "#000" : "white",
                    border: "none",
                    fontSize: "0.78rem",
                    fontWeight: 800,
                    cursor: isBulkLoading ? "not-allowed" : "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    transition: "all 0.15s ease",
                  }}
                >
                  {isBulkLoading ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <CheckCircle size={14} />
                  )}
                  {isBulkLoading
                    ? "Đang xử lý..."
                    : isBulkConfirming
                    ? `Xác nhận thu ${selectedIds.size} khoản (${formatCurrency(selectedTotalAmount)})?`
                    : `Thu tiền ${selectedIds.size} khoản đã chọn (${formatCurrency(selectedTotalAmount)})`}
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {/* 💻 DESKTOP TABLE */}
      <div className="desktop-only-table">
        <table className="data-table" style={{ width: "100%" }}>
          <thead>
            <tr>
              {isAdmin && unpaidItems.length > 0 && <th style={{ width: "36px" }}></th>}
              <th>Thành viên / Đối tượng</th>
              <th>Số tiền</th>
              <th>Trạng thái</th>
              <th>Ngày đóng</th>
              <th>Hình thức</th>
              {isAdmin && <th>Thao tác</th>}
            </tr>
          </thead>
          <tbody>
            {displayItems.map((record) => {
              const st = RECORD_STATUS[record.status] ?? RECORD_STATUS.PENDING;
              const isUnpaid = record.status !== "PAID" && record.status !== "WAIVED";
              const isSelected = selectedIds.has(record.id);

              return (
                <tr
                  key={record.id}
                  style={{
                    background: isSelected ? "rgba(34, 197, 94, 0.05)" : undefined,
                  }}
                >
                  {isAdmin && unpaidItems.length > 0 && (
                    <td>
                      {isUnpaid && (
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelect(record.id)}
                          style={{
                            width: "16px",
                            height: "16px",
                            accentColor: "var(--primary)",
                            cursor: "pointer",
                          }}
                        />
                      )}
                    </td>
                  )}
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      {record.image ? (
                        <img src={record.image} alt="" style={{ width: 34, height: 34, borderRadius: "50%" }} />
                      ) : (
                        <div
                          style={{
                            width: 34,
                            height: 34,
                            borderRadius: "50%",
                            background: record.isGuest ? "#fb923c" : "var(--gradient-primary)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: "13px",
                            fontWeight: 700,
                            color: "white",
                          }}
                        >
                          {record.isGuest ? "👥" : record.name?.[0]?.toUpperCase()}
                        </div>
                      )}
                      <div>
                        <div
                          style={{
                            fontSize: "0.88rem",
                            fontWeight: 700,
                            color: record.isGuest ? "#fb923c" : "var(--card-foreground)",
                          }}
                        >
                          {record.name}
                        </div>
                        <div style={{ fontSize: "0.72rem", color: "var(--muted-foreground)" }}>
                          {record.isGuest ? record.guestNote : `Mã: ${record.code}`}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div style={{ fontWeight: 800, color: "var(--card-foreground)", fontSize: "0.9rem" }}>
                      {formatCurrency(record.amountRequired)}
                    </div>
                    {record.amountPaid > 0 && record.amountPaid !== record.amountRequired && (
                      <div style={{ fontSize: "0.72rem", color: "#4ade80" }}>
                        Đã đóng: {formatCurrency(record.amountPaid)}
                      </div>
                    )}
                  </td>
                  <td>
                    <span
                      style={{
                        padding: "3px 10px",
                        borderRadius: "999px",
                        fontSize: "0.72rem",
                        fontWeight: 700,
                        color: st.color,
                        background: st.bg,
                      }}
                    >
                      {st.label}
                    </span>
                  </td>
                  <td style={{ color: "var(--muted-foreground)", fontSize: "0.8rem" }}>
                    {record.paidAt ? formatDateTime(record.paidAt) : "—"}
                  </td>
                  <td style={{ fontSize: "0.8rem", color: "var(--muted-foreground)" }}>
                    {record.paymentMethod === "BANK_TRANSFER"
                      ? record.sepayTx
                        ? `🔗 SePay (${record.sepayTx.gateway})`
                        : "💳 Chuyển khoản"
                      : record.paymentMethod === "CASH"
                      ? "💵 Tiền mặt"
                      : "—"}
                  </td>
                  {isAdmin && (
                    <td>
                      {isUnpaid ? (
                        <MarkPaidButton
                          recordId={record.id}
                          amountRequired={record.amountRequired}
                        />
                      ) : (
                        <span style={{ fontSize: "0.75rem", color: "#4ade80", fontWeight: 600 }}>
                          ✓ Đã thu
                        </span>
                      )}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* 📱 MOBILE COMPACT CARDS */}
      <div className="mobile-only-cards" style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        {displayItems.map((record) => {
          const st = RECORD_STATUS[record.status] ?? RECORD_STATUS.PENDING;
          const isUnpaid = record.status !== "PAID" && record.status !== "WAIVED";
          const isSelected = selectedIds.has(record.id);

          return (
            <div
              key={record.id}
              onClick={() => {
                if (isAdmin && isUnpaid) toggleSelect(record.id);
              }}
              style={{
                padding: "12px 14px",
                borderRadius: "10px",
                background: isSelected ? "rgba(34, 197, 94, 0.08)" : "rgba(30,41,59,0.3)",
                border: isSelected
                  ? "1px solid rgba(34, 197, 94, 0.4)"
                  : record.isGuest
                  ? "1px solid rgba(251,146,60,0.3)"
                  : "1px solid var(--border)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "10px",
                cursor: isAdmin && isUnpaid ? "pointer" : "default",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "10px", flex: 1, minWidth: 0 }}>
                {isAdmin && isUnpaid && (
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={(e) => {
                      e.stopPropagation();
                      toggleSelect(record.id);
                    }}
                    style={{
                      width: "18px",
                      height: "18px",
                      accentColor: "var(--primary)",
                      cursor: "pointer",
                      flexShrink: 0,
                    }}
                  />
                )}
                {record.image ? (
                  <img src={record.image} alt="" style={{ width: 36, height: 36, borderRadius: "50%", flexShrink: 0 }} />
                ) : (
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: "50%",
                      background: record.isGuest ? "#fb923c" : "var(--gradient-primary)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "14px",
                      fontWeight: 800,
                      color: "white",
                      flexShrink: 0,
                    }}
                  >
                    {record.isGuest ? "👥" : record.name?.[0]?.toUpperCase()}
                  </div>
                )}

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontWeight: 700,
                      fontSize: "0.88rem",
                      color: record.isGuest ? "#fb923c" : "var(--card-foreground)",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {record.name}
                  </div>
                  <div
                    style={{
                      fontSize: "0.72rem",
                      color: record.isGuest ? "#fb923c" : "var(--muted-foreground)",
                      fontWeight: record.isGuest ? 600 : 400,
                    }}
                  >
                    {record.isGuest ? record.guestNote : `Mã: ${record.code}`}
                  </div>
                </div>
              </div>

              <div style={{ textAlign: "right", flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "4px" }}>
                <div style={{ fontWeight: 800, fontSize: "0.9rem", color: "var(--card-foreground)" }}>
                  {formatCurrency(record.amountRequired)}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <span
                    style={{
                      display: "inline-block",
                      padding: "2px 8px",
                      borderRadius: "999px",
                      fontSize: "0.68rem",
                      fontWeight: 700,
                      color: st.color,
                      background: st.bg,
                    }}
                  >
                    {st.label}
                  </span>
                  {isAdmin && isUnpaid && (
                    <div onClick={(e) => e.stopPropagation()}>
                      <MarkPaidButton
                        recordId={record.id}
                        amountRequired={record.amountRequired}
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
