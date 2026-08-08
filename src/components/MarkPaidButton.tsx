"use client";

import { useState } from "react";
import { CheckCircle, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { showToast } from "@/components/Toast";

export function MarkPaidButton({
  recordId,
  amountRequired,
}: {
  recordId: string;
  amountRequired: number;
}) {
  const [loading, setLoading] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const router = useRouter();

  const handleMarkPaid = async (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();

    // Xác nhận 2 bước dạng nút bấm (không nảy popup confirm của trình duyệt)
    if (!confirming) {
      setConfirming(true);
      setTimeout(() => setConfirming(false), 3500);
      return;
    }

    setConfirming(false);
    setLoading(true);

    try {
      // Tách recordId thực nếu là ID bóc tách dạng `recordId_self` hoặc `recordId_guest`
      const realRecordId = recordId.split("_")[0];

      const res = await fetch(`/api/payments/records/${realRecordId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "PAID",
          amountPaid: amountRequired,
          paymentMethod: "CASH",
        }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || "Lỗi khi cập nhật");
      }

      showToast.success("Đã xác nhận thu tiền thành công! 🎉");
      router.refresh();
    } catch (error: any) {
      showToast.error("Lỗi khi thu tiền: " + (error.message || error));
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleMarkPaid}
      disabled={loading}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "4px",
        padding: "5px 10px",
        borderRadius: "6px",
        background: confirming
          ? "rgba(234, 179, 8, 0.25)"
          : "rgba(34, 197, 94, 0.15)",
        color: confirming ? "#facc15" : "#4ade80",
        border: confirming
          ? "1px solid rgba(234, 179, 8, 0.4)"
          : "1px solid rgba(34, 197, 94, 0.3)",
        cursor: loading ? "not-allowed" : "pointer",
        fontSize: "0.75rem",
        fontWeight: 700,
        transition: "all 0.15s ease",
        whiteSpace: "nowrap",
      }}
      title={confirming ? "Bấm thêm lần nữa để xác nhận thu tiền" : "Đánh dấu đã thanh toán"}
    >
      {loading ? (
        <Loader2 size={13} className="animate-spin" />
      ) : (
        <CheckCircle size={13} />
      )}
      {loading ? "Đang thu..." : confirming ? "Xác nhận?" : "Thu"}
    </button>
  );
}
