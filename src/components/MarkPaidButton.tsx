"use client";

import { useState } from "react";
import { CheckCircle, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

export function MarkPaidButton({ recordId, amountRequired }: { recordId: string; amountRequired: number }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleMarkPaid = async () => {
    if (!confirm("Xác nhận đã thu đủ tiền cho khoản này?")) return;
    
    setLoading(true);
    try {
      const res = await fetch(`/api/payments/records/${recordId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "PAID", amountPaid: amountRequired }),
      });
      if (!res.ok) throw new Error("Lỗi khi cập nhật");
      
      router.refresh();
    } catch (error) {
      alert("Có lỗi xảy ra: " + error);
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleMarkPaid}
      disabled={loading}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "4px",
        padding: "4px 8px",
        borderRadius: "4px",
        background: "rgba(74,222,128,0.2)",
        color: "#4ade80",
        border: "1px solid rgba(74,222,128,0.3)",
        cursor: loading ? "not-allowed" : "pointer",
        fontSize: "0.75rem",
        fontWeight: 700,
        opacity: loading ? 0.7 : 1,
      }}
      title="Đánh dấu đã thanh toán"
    >
      {loading ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
      Thu
    </button>
  );
}
