"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  QrCode,
  X,
  Copy,
  CheckCircle,
  Loader2,
  Clock,
  AlertCircle,
  ChevronRight,
  Zap,
} from "lucide-react";

interface UnpaidRecord {
  id: string;
  amountRequired: number;
  amountPaid: number;
  status: string;
  session: {
    title: string;
    code: string;
  };
}

interface QRPaymentDialogProps {
  memberId: string;
  memberCode: string;
  memberName: string;
  unpaidRecords: UnpaidRecord[];
}

type DialogStep = "select" | "qr" | "success";

const POLL_INTERVAL_MS = 5000; // 5 giây poll 1 lần
const BUNDLE_TTL_MS = 30 * 60 * 1000; // 30 phút

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(amount);
}

function formatCountdown(ms: number): string {
  if (ms <= 0) return "Hết hạn";
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export function QRPaymentDialog({
  memberId,
  memberCode,
  memberName,
  unpaidRecords,
}: QRPaymentDialogProps) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<DialogStep>("select");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Bundle state
  const [bundleId, setBundleId] = useState<string | null>(null);
  const [bundleCode, setBundleCode] = useState<string | null>(null);
  const [qrContent, setQrContent] = useState<string>("");
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [totalAmount, setTotalAmount] = useState(0);
  const [expiresAt, setExpiresAt] = useState<Date | null>(null);
  const [countdown, setCountdown] = useState(BUNDLE_TTL_MS);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Tính tổng tiền từ các record đã chọn
  const selectedTotal = unpaidRecords
    .filter((r) => selectedIds.has(r.id))
    .reduce((sum, r) => sum + (r.amountRequired - r.amountPaid), 0);

  // Cleanup khi đóng dialog
  const cleanup = useCallback(() => {
    if (pollRef.current) clearInterval(pollRef.current);
    if (countdownRef.current) clearInterval(countdownRef.current);
  }, []);

  const handleClose = useCallback(async () => {
    cleanup();

    // Cancel bundle nếu đang PENDING
    if (bundleId && step === "qr") {
      try {
        await fetch(`/api/payments/bundles/${bundleId}`, { method: "DELETE" });
      } catch {
        // Bỏ qua lỗi cancel
      }
    }

    setOpen(false);
    setStep("select");
    setSelectedIds(new Set());
    setError(null);
    setBundleId(null);
    setBundleCode(null);
    setQrContent("");
    setQrUrl(null);
    setExpiresAt(null);
  }, [bundleId, step, cleanup]);

  // Countdown timer
  useEffect(() => {
    if (step !== "qr" || !expiresAt) return;

    const tick = () => {
      const remaining = expiresAt.getTime() - Date.now();
      setCountdown(Math.max(0, remaining));
      if (remaining <= 0) {
        if (countdownRef.current) clearInterval(countdownRef.current);
        if (pollRef.current) clearInterval(pollRef.current);
      }
    };
    tick();
    countdownRef.current = setInterval(tick, 1000);
    return () => { if (countdownRef.current) clearInterval(countdownRef.current); };
  }, [step, expiresAt]);

  // Polling bundle status
  const startPolling = useCallback((id: string) => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/payments/bundles/${id}`);
        const data = await res.json();
        const status = data.bundle?.status;
        if (status === "PAID") {
          clearInterval(pollRef.current!);
          if (countdownRef.current) clearInterval(countdownRef.current);
          setStep("success");
          // Reload trang sau 2.5 giây
          setTimeout(() => window.location.reload(), 2500);
        } else if (status === "EXPIRED" || status === "CANCELLED") {
          clearInterval(pollRef.current!);
          setError("QR đã hết hạn hoặc bị huỷ. Vui lòng tạo lại.");
          setStep("select");
        }
      } catch {
        // Bỏ qua lỗi mạng tạm thời
      }
    }, POLL_INTERVAL_MS);
  }, []);

  // Toggle chọn record
  const toggleRecord = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => setSelectedIds(new Set(unpaidRecords.map((r) => r.id)));
  const clearAll = () => setSelectedIds(new Set());

  // Tạo bundle và chuyển sang bước QR
  const handleCreateQR = async () => {
    if (selectedIds.size === 0) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/payments/bundles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberId, recordIds: Array.from(selectedIds) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Lỗi tạo bundle");

      setBundleId(data.bundle.id);
      setBundleCode(data.bundle.bundleCode);
      setQrContent(data.qrContent);
      setQrUrl(data.qrUrl);
      setTotalAmount(data.bundle.totalAmount);
      setExpiresAt(new Date(data.bundle.expiresAt));
      setStep("qr");
      startPolling(data.bundle.id);
    } catch (err: any) {
      setError(err.message ?? "Có lỗi xảy ra");
    } finally {
      setLoading(false);
    }
  };

  const handleCopyContent = async () => {
    try {
      await navigator.clipboard.writeText(qrContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  const isExpired = countdown <= 0;

  if (unpaidRecords.length === 0) return null;

  return (
    <>
      {/* Trigger Button */}
      <button
        onClick={() => setOpen(true)}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "8px",
          padding: "10px 20px",
          background: "linear-gradient(135deg, #16a34a, #22c55e)",
          color: "white",
          border: "none",
          borderRadius: "10px",
          fontSize: "0.9rem",
          fontWeight: 700,
          cursor: "pointer",
          transition: "all 0.2s",
          boxShadow: "0 4px 15px rgba(34,197,94,0.3)",
        }}
        onMouseOver={(e) => {
          (e.currentTarget as HTMLButtonElement).style.transform = "translateY(-1px)";
          (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 6px 20px rgba(34,197,94,0.45)";
        }}
        onMouseOut={(e) => {
          (e.currentTarget as HTMLButtonElement).style.transform = "translateY(0)";
          (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 4px 15px rgba(34,197,94,0.3)";
        }}
      >
        <Zap size={16} />
        Tạo QR Thanh Toán
      </button>

      {/* Modal Overlay */}
      {open && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.75)",
            backdropFilter: "blur(6px)",
            zIndex: 1000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "16px",
            animation: "fadeIn 0.2s ease",
          }}
          onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
        >
          <div
            style={{
              background: "#111827",
              border: "1px solid rgba(34,197,94,0.2)",
              borderRadius: "16px",
              width: "100%",
              maxWidth: step === "qr" ? "440px" : "560px",
              maxHeight: "90vh",
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
              boxShadow: "0 25px 60px rgba(0,0,0,0.5), 0 0 0 1px rgba(34,197,94,0.1)",
            }}
          >
            {/* ── Header ── */}
            <div
              style={{
                padding: "20px 24px",
                borderBottom: "1px solid rgba(255,255,255,0.06)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                background: "rgba(34,197,94,0.04)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: "10px",
                    background: "rgba(34,197,94,0.15)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <QrCode size={18} color="#22c55e" />
                </div>
                <div>
                  <div style={{ fontWeight: 700, color: "#f1f5f9", fontSize: "0.95rem" }}>
                    {step === "select" && "Chọn khoản thanh toán"}
                    {step === "qr" && "Quét QR để thanh toán"}
                    {step === "success" && "Thanh toán thành công!"}
                  </div>
                  <div style={{ fontSize: "0.75rem", color: "#64748b", marginTop: "2px" }}>
                    {memberName} · {memberCode}
                  </div>
                </div>
              </div>
              <button
                onClick={handleClose}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: "8px",
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  color: "#94a3b8",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <X size={16} />
              </button>
            </div>

            {/* ── Content ── */}
            <div style={{ flex: 1, overflowY: "auto", padding: "24px" }}>

              {/* ── STEP 1: Chọn trận ── */}
              {step === "select" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  {/* Controls */}
                  <div style={{ display: "flex", gap: "8px", marginBottom: "4px" }}>
                    <button
                      onClick={selectAll}
                      style={{
                        padding: "5px 12px",
                        borderRadius: "6px",
                        background: "rgba(34,197,94,0.12)",
                        color: "#4ade80",
                        border: "1px solid rgba(34,197,94,0.2)",
                        cursor: "pointer",
                        fontSize: "0.78rem",
                        fontWeight: 600,
                      }}
                    >
                      Chọn tất cả
                    </button>
                    <button
                      onClick={clearAll}
                      style={{
                        padding: "5px 12px",
                        borderRadius: "6px",
                        background: "rgba(255,255,255,0.04)",
                        color: "#64748b",
                        border: "1px solid rgba(255,255,255,0.08)",
                        cursor: "pointer",
                        fontSize: "0.78rem",
                        fontWeight: 600,
                      }}
                    >
                      Bỏ chọn
                    </button>
                    <span style={{ marginLeft: "auto", fontSize: "0.78rem", color: "#94a3b8", alignSelf: "center" }}>
                      Đã chọn: {selectedIds.size}/{unpaidRecords.length}
                    </span>
                  </div>

                  {/* Record list */}
                  {unpaidRecords.map((r) => {
                    const outstanding = r.amountRequired - r.amountPaid;
                    const isSelected = selectedIds.has(r.id);
                    return (
                      <div
                        key={r.id}
                        onClick={() => toggleRecord(r.id)}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "12px",
                          padding: "14px 16px",
                          borderRadius: "10px",
                          background: isSelected
                            ? "rgba(34,197,94,0.08)"
                            : "rgba(30,41,59,0.5)",
                          border: isSelected
                            ? "1px solid rgba(34,197,94,0.35)"
                            : "1px solid rgba(255,255,255,0.06)",
                          cursor: "pointer",
                          transition: "all 0.15s",
                          userSelect: "none",
                        }}
                      >
                        {/* Checkbox */}
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

                        {/* Info */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div
                            style={{
                              fontSize: "0.85rem",
                              fontWeight: 600,
                              color: isSelected ? "#f1f5f9" : "#94a3b8",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                              transition: "color 0.15s",
                            }}
                          >
                            {r.session.title}
                          </div>
                          <div style={{ fontSize: "0.72rem", color: "#475569", marginTop: "2px" }}>
                            Mã: {r.session.code} · {r.status === "OVERDUE" ? "⚠️ Quá hạn" : "Chưa đóng"}
                          </div>
                        </div>

                        {/* Amount */}
                        <div
                          style={{
                            fontSize: "0.9rem",
                            fontWeight: 800,
                            color: isSelected ? "#22c55e" : "#f87171",
                            flexShrink: 0,
                          }}
                        >
                          {formatCurrency(outstanding)}
                        </div>
                      </div>
                    );
                  })}

                  {error && (
                    <div
                      style={{
                        padding: "10px 14px",
                        borderRadius: "8px",
                        background: "rgba(239,68,68,0.08)",
                        border: "1px solid rgba(239,68,68,0.2)",
                        color: "#f87171",
                        fontSize: "0.82rem",
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                      }}
                    >
                      <AlertCircle size={14} />
                      {error}
                    </div>
                  )}
                </div>
              )}

              {/* ── STEP 2: QR ── */}
              {step === "qr" && (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "20px" }}>
                  {/* Countdown */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      padding: "8px 16px",
                      borderRadius: "999px",
                      background: isExpired ? "rgba(239,68,68,0.1)" : "rgba(234,179,8,0.1)",
                      border: isExpired ? "1px solid rgba(239,68,68,0.25)" : "1px solid rgba(234,179,8,0.25)",
                    }}
                  >
                    <Clock size={14} color={isExpired ? "#f87171" : "#facc15"} />
                    <span style={{ fontSize: "0.8rem", fontWeight: 700, color: isExpired ? "#f87171" : "#facc15" }}>
                      {isExpired ? "QR đã hết hạn" : `Hết hạn sau: ${formatCountdown(countdown)}`}
                    </span>
                  </div>

                  {/* QR Image */}
                  {qrUrl ? (
                    <div
                      style={{
                        padding: "12px",
                        background: "white",
                        borderRadius: "16px",
                        boxShadow: "0 0 0 1px rgba(34,197,94,0.3), 0 8px 30px rgba(0,0,0,0.4)",
                      }}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={qrUrl}
                        alt="QR thanh toán"
                        style={{ width: 220, height: 220, display: "block" }}
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).style.display = "none";
                        }}
                      />
                    </div>
                  ) : (
                    <div
                      style={{
                        width: 220,
                        height: 220,
                        borderRadius: "16px",
                        background: "rgba(30,41,59,0.6)",
                        border: "2px dashed rgba(34,197,94,0.2)",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "8px",
                        color: "#64748b",
                      }}
                    >
                      <QrCode size={40} />
                      <span style={{ fontSize: "0.78rem", textAlign: "center" }}>
                        Chưa cấu hình thông tin ngân hàng
                      </span>
                    </div>
                  )}

                  {/* Amount */}
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: "0.78rem", color: "#64748b", marginBottom: "4px" }}>
                      Số tiền cần chuyển
                    </div>
                    <div style={{ fontSize: "1.8rem", fontWeight: 900, color: "#22c55e", letterSpacing: "-0.5px" }}>
                      {formatCurrency(totalAmount)}
                    </div>
                  </div>

                  {/* Transfer Content */}
                  <div style={{ width: "100%" }}>
                    <div style={{ fontSize: "0.75rem", color: "#64748b", marginBottom: "6px", textAlign: "center" }}>
                      Nội dung chuyển khoản (bắt buộc đúng)
                    </div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        padding: "12px 16px",
                        borderRadius: "10px",
                        background: "rgba(34,197,94,0.06)",
                        border: "1px solid rgba(34,197,94,0.2)",
                      }}
                    >
                      <code
                        style={{
                          flex: 1,
                          fontSize: "1rem",
                          fontWeight: 800,
                          color: "#22c55e",
                          fontFamily: "monospace",
                          letterSpacing: "1px",
                          wordBreak: "break-all",
                        }}
                      >
                        {qrContent}
                      </code>
                      <button
                        onClick={handleCopyContent}
                        style={{
                          padding: "6px 10px",
                          borderRadius: "6px",
                          background: copied ? "rgba(34,197,94,0.2)" : "rgba(255,255,255,0.06)",
                          border: "1px solid rgba(255,255,255,0.1)",
                          color: copied ? "#22c55e" : "#94a3b8",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          gap: "4px",
                          fontSize: "0.75rem",
                          fontWeight: 600,
                          transition: "all 0.15s",
                          flexShrink: 0,
                        }}
                      >
                        {copied ? <CheckCircle size={13} /> : <Copy size={13} />}
                        {copied ? "Đã copy" : "Copy"}
                      </button>
                    </div>
                  </div>

                  {/* Waiting indicator */}
                  {!isExpired && (
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        padding: "10px 16px",
                        borderRadius: "8px",
                        background: "rgba(234,179,8,0.05)",
                        border: "1px solid rgba(234,179,8,0.15)",
                        width: "100%",
                        justifyContent: "center",
                      }}
                    >
                      <Loader2 size={14} color="#facc15" style={{ animation: "spin 1s linear infinite" }} />
                      <span style={{ fontSize: "0.8rem", color: "#facc15" }}>
                        Đang chờ nhận thanh toán...
                      </span>
                    </div>
                  )}

                  {/* Bundle info */}
                  <div style={{ fontSize: "0.7rem", color: "#334155", textAlign: "center" }}>
                    Bundle: <code style={{ color: "#475569" }}>{bundleCode}</code> · Bao gồm {selectedIds.size} khoản
                  </div>
                </div>
              )}

              {/* ── STEP 3: Success ── */}
              {step === "success" && (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: "20px",
                    padding: "20px 0",
                    textAlign: "center",
                  }}
                >
                  <div
                    style={{
                      width: 80,
                      height: 80,
                      borderRadius: "50%",
                      background: "rgba(34,197,94,0.15)",
                      border: "2px solid rgba(34,197,94,0.4)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      animation: "pulse-green 2s infinite",
                    }}
                  >
                    <CheckCircle size={40} color="#22c55e" />
                  </div>
                  <div>
                    <div style={{ fontSize: "1.3rem", fontWeight: 800, color: "#f1f5f9", marginBottom: "8px" }}>
                      🎉 Đã nhận thanh toán!
                    </div>
                    <div style={{ fontSize: "0.9rem", color: "#4ade80", fontWeight: 700, marginBottom: "4px" }}>
                      {formatCurrency(totalAmount)}
                    </div>
                    <div style={{ fontSize: "0.8rem", color: "#64748b" }}>
                      {selectedIds.size} khoản đã được đánh dấu PAID
                    </div>
                  </div>
                  <div style={{ fontSize: "0.75rem", color: "#475569" }}>
                    Trang sẽ tự động làm mới...
                  </div>
                  <Loader2 size={18} color="#334155" style={{ animation: "spin 1s linear infinite" }} />
                </div>
              )}
            </div>

            {/* ── Footer ── */}
            {step === "select" && (
              <div
                style={{
                  padding: "16px 24px",
                  borderTop: "1px solid rgba(255,255,255,0.06)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "12px",
                  background: "rgba(0,0,0,0.2)",
                }}
              >
                <div>
                  <div style={{ fontSize: "0.75rem", color: "#64748b" }}>Tổng cần thanh toán</div>
                  <div style={{ fontSize: "1.2rem", fontWeight: 800, color: selectedIds.size > 0 ? "#22c55e" : "#334155" }}>
                    {formatCurrency(selectedTotal)}
                  </div>
                </div>
                <button
                  onClick={handleCreateQR}
                  disabled={selectedIds.size === 0 || loading}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    padding: "12px 24px",
                    borderRadius: "10px",
                    background:
                      selectedIds.size === 0 || loading
                        ? "rgba(34,197,94,0.1)"
                        : "linear-gradient(135deg, #16a34a, #22c55e)",
                    color: selectedIds.size === 0 || loading ? "#334155" : "white",
                    border: "none",
                    cursor: selectedIds.size === 0 || loading ? "not-allowed" : "pointer",
                    fontSize: "0.9rem",
                    fontWeight: 700,
                    transition: "all 0.2s",
                    boxShadow:
                      selectedIds.size > 0 && !loading
                        ? "0 4px 15px rgba(34,197,94,0.35)"
                        : "none",
                  }}
                >
                  {loading ? (
                    <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} />
                  ) : (
                    <QrCode size={16} />
                  )}
                  {loading ? "Đang tạo..." : "Tạo QR"}
                  {!loading && selectedIds.size > 0 && <ChevronRight size={15} />}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </>
  );
}
