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
  Zap,
  Download,
  Smartphone,
} from "lucide-react";

interface QRPaymentDialogProps {
  memberId: string;
  memberCode: string;
  memberName: string;
  selectedRecordIds: string[];
  selectedTotalAmount: number;
}

type DialogStep = "qr" | "success";

const POLL_INTERVAL_MS = 5000;
const BUNDLE_TTL_MS = 30 * 60 * 1000;

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

/**
 * Build VietQR image URL hoàn toàn trên client — không cần server tính
 * Vì tất cả biến đều là NEXT_PUBLIC_* nên client sử dụng được trực tiếp
 */
function buildClientQRUrl(bankBin: string, accountNo: string, accountName: string, amount: number, addInfo: string): string {
  const base = `https://img.vietqr.io/image/${bankBin}-${accountNo}-compact2.png`;
  const q = new URLSearchParams({
    amount: String(Math.round(amount)),
    addInfo,
    accountName,
  });
  return `${base}?${q.toString()}`;
}

const POPULAR_BANKS = [
  { code: "vcb", name: "Vietcombank", color: "#4ade80", bg: "rgba(34,197,94,0.14)", border: "rgba(34,197,94,0.3)" },
  { code: "mb", name: "MB Bank", color: "#60a5fa", bg: "rgba(96,165,250,0.14)", border: "rgba(96,165,250,0.3)" },
  { code: "tcb", name: "Techcombank", color: "#f87171", bg: "rgba(239,68,68,0.14)", border: "rgba(239,68,68,0.3)" },
  { code: "bidv", name: "BIDV", color: "#38bdf8", bg: "rgba(56,189,248,0.14)", border: "rgba(56,189,248,0.3)" },
  { code: "vpb", name: "VPBank", color: "#4ade80", bg: "rgba(34,197,94,0.14)", border: "rgba(34,197,94,0.3)" },
  { code: "tpb", name: "TPBank", color: "#c084fc", bg: "rgba(192,132,252,0.14)", border: "rgba(192,132,252,0.3)" },
  { code: "icb", name: "VietinBank", color: "#60a5fa", bg: "rgba(96,165,250,0.14)", border: "rgba(96,165,250,0.3)" },
  { code: "agb", name: "Agribank", color: "#f87171", bg: "rgba(239,68,68,0.14)", border: "rgba(239,68,68,0.3)" },
  { code: "acb", name: "ACB", color: "#38bdf8", bg: "rgba(56,189,248,0.14)", border: "rgba(56,189,248,0.3)" },
  { code: "stb", name: "Sacombank", color: "#60a5fa", bg: "rgba(96,165,250,0.14)", border: "rgba(96,165,250,0.3)" },
  { code: "vib", name: "VIB", color: "#38bdf8", bg: "rgba(56,189,248,0.14)", border: "rgba(56,189,248,0.3)" },
  { code: "momo", name: "MoMo", color: "#f472b6", bg: "rgba(244,114,182,0.14)", border: "rgba(244,114,182,0.3)" },
];

export function QRPaymentDialog({
  memberId,
  memberCode,
  memberName,
  selectedRecordIds,
  selectedTotalAmount,
}: QRPaymentDialogProps) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<DialogStep>("qr");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [showBankPicker, setShowBankPicker] = useState(false);

  const [bundleId, setBundleId] = useState<string | null>(null);
  const [bundleCode, setBundleCode] = useState<string | null>(null);
  const [bundleStatus, setBundleStatus] = useState<string | null>(null);
  const [qrContent, setQrContent] = useState<string>("");
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [totalAmount, setTotalAmount] = useState(0);
  const [expiresAt, setExpiresAt] = useState<Date | null>(null);
  const [countdown, setCountdown] = useState(BUNDLE_TTL_MS);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const STORAGE_KEY = `active_qr_bundle_${memberId}`;
  const BANK_BIN = process.env.NEXT_PUBLIC_BANK_BIN ?? "";
  const ACCOUNT_NO = process.env.NEXT_PUBLIC_ACCOUNT_NO ?? "";

  const cleanup = useCallback(() => {
    if (pollRef.current) clearInterval(pollRef.current);
    if (countdownRef.current) clearInterval(countdownRef.current);
  }, []);

  const handleClose = useCallback(async () => {
    cleanup();
    try { localStorage.removeItem(STORAGE_KEY); } catch { }
    if (bundleId && step === "qr" && bundleStatus === "PENDING") {
      try { await fetch(`/api/payments/bundles/${bundleId}`, { method: "DELETE" }); } catch { }
    }
    setOpen(false);
    setStep("qr");
    setError(null);
    setBundleId(null);
    setBundleCode(null);
    setBundleStatus(null);
    setQrContent("");
    setQrUrl(null);
    setExpiresAt(null);
    setSaveStatus("idle");
  }, [bundleId, step, bundleStatus, cleanup, STORAGE_KEY]);

  const checkStatusNow = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/payments/bundles/${id}`);
      const data = await res.json();
      const status = data.bundle?.status;
      if (status) setBundleStatus(status);
      if (status === "PAID") {
        cleanup();
        try { localStorage.removeItem(STORAGE_KEY); } catch {}
        setStep("success");
        setTimeout(() => window.location.reload(), 2500);
      } else if (status === "EXPIRED" || status === "CANCELLED") {
        cleanup();
        try { localStorage.removeItem(STORAGE_KEY); } catch {}
        setError("Mã QR đã hết hạn hoặc bị hủy. Vui lòng đóng và tạo lại.");
      } else if (data.bundle) {
        setBundleId(data.bundle.id);
        setBundleCode(data.bundle.bundleCode);
        const content = data.qrContent || `${process.env.NEXT_PUBLIC_TRANSFER_PREFIX ?? "FCKX"} ${data.bundle.member?.code || ""}-${data.bundle.bundleCode}`;
        setQrContent(content);

        const bankBin = BANK_BIN || process.env.NEXT_PUBLIC_BANK_BIN || "";
        const accountNo = ACCOUNT_NO || process.env.NEXT_PUBLIC_ACCOUNT_NO || "";
        const clientQrUrl = (bankBin && accountNo)
          ? buildClientQRUrl(bankBin, accountNo, process.env.NEXT_PUBLIC_ACCOUNT_NAME ?? "", data.bundle.totalAmount, content)
          : null;
        setQrUrl(clientQrUrl);
        setTotalAmount(data.bundle.totalAmount);
        setExpiresAt(new Date(data.bundle.expiresAt));
      }
    } catch { }
  }, [cleanup, STORAGE_KEY]);

  const startPolling = useCallback((id: string) => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(() => checkStatusNow(id), POLL_INTERVAL_MS);
  }, [checkStatusNow]);

  useEffect(() => {
    try {
      const savedBundleId = localStorage.getItem(STORAGE_KEY);
      if (savedBundleId) {
        setOpen(true);
        setStep("qr");
        setLoading(true);
        checkStatusNow(savedBundleId).finally(() => setLoading(false));
        startPolling(savedBundleId);
      }
    } catch { }
  }, [STORAGE_KEY, checkStatusNow, startPolling]);

  useEffect(() => {
    if (!open || !bundleId || step !== "qr") return;
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible" && bundleId) checkStatusNow(bundleId);
    };
    window.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleVisibilityChange);
    return () => {
      window.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleVisibilityChange);
    };
  }, [open, bundleId, step, checkStatusNow]);

  useEffect(() => {
    if (!open || step !== "qr" || !expiresAt) return;
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
  }, [open, step, expiresAt]);

  const handleOpenAndGenerateQR = async () => {
    if (selectedRecordIds.length === 0) return;
    setOpen(true);
    setStep("qr");
    setLoading(true);
    setError(null);
    setSaveStatus("idle");
    try {
      const res = await fetch("/api/payments/bundles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberId, recordIds: selectedRecordIds }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Có lỗi xảy ra khi tạo QR");
      setBundleId(data.bundle.id);
      setBundleCode(data.bundle.bundleCode);
      setBundleStatus(data.bundle.status ?? "PENDING");
      setQrContent(data.qrContent);
      // Client tự build QR URL ngay — không đợi server trả về
      const clientQrUrl = (BANK_BIN && ACCOUNT_NO)
        ? buildClientQRUrl(BANK_BIN, ACCOUNT_NO, process.env.NEXT_PUBLIC_ACCOUNT_NAME ?? "", data.bundle.totalAmount, data.qrContent)
        : null;
      setQrUrl(clientQrUrl);
      setTotalAmount(data.bundle.totalAmount);
      setExpiresAt(new Date(data.bundle.expiresAt));
      try { localStorage.setItem(STORAGE_KEY, data.bundle.id); } catch {}
      startPolling(data.bundle.id);
    } catch (err: any) {
      setError(err.message ?? "Co loi xay ra");
    } finally {
      setLoading(false);
    }
  };

  const handleCopyContent = async () => {
    try {
      await navigator.clipboard.writeText(qrContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { }
  };

const BANK_APP_MAP: Record<string, string> = {
  "970422": "mb",        // MBBank
  "970436": "vcb",       // Vietcombank
  "970415": "icb",       // VietinBank
  "970418": "bidv",      // BIDV
  "970407": "tcb",       // Techcombank
  "970432": "vpb",       // VPBank
  "970416": "acb",       // ACB
  "970423": "tpb",       // TPBank
  "970437": "hdb",       // HDBank
  "970403": "stb",       // Sacombank
  "970441": "vib",       // VIB
  "970443": "shb",       // SHB
  "970431": "exb",       // Eximbank
  "970426": "msb",       // MSB
  "970405": "agb",       // Agribank
  "970429": "scb",       // SCB
  "970448": "ocb",       // OCB
  "970440": "seab",      // SeABank
  "970449": "lpb",       // LPBank
};

  const handleSaveQR = async () => {
    if (!qrUrl) return;
    setSaveStatus("saving");
    const fileName = `QR_ThanhToan_${memberCode}_${bundleCode || "FC"}.png`;
    try {
      const blob = await new Promise<Blob>((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => {
          const canvas = document.createElement("canvas");
          canvas.width = img.naturalWidth || 300;
          canvas.height = img.naturalHeight || 300;
          const ctx = canvas.getContext("2d");
          if (!ctx) { reject(new Error("no ctx")); return; }
          ctx.drawImage(img, 0, 0);
          canvas.toBlob((b) => { if (b) resolve(b); else reject(new Error("toBlob failed")); }, "image/png");
        };
        img.onerror = () => reject(new Error("img load failed"));
        img.src = qrUrl;
      });

      const file = new File([blob], fileName, { type: "image/png" });
      const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

      // Trên Mobile: ưu tiên mở Share sheet
      if (
        isMobile &&
        typeof navigator.share === "function" &&
        typeof navigator.canShare === "function" &&
        navigator.canShare({ files: [file] })
      ) {
        try {
          await navigator.share({
            files: [file],
            title: "QR Thanh Toán FC",
          });
          setSaveStatus("saved");
          setTimeout(() => setSaveStatus("idle"), 3000);
          return;
        } catch { /* ignore user cancel */ }
      }

      // Trên Máy tính (Web): tải file trực tiếp, không mở Share dialog thừa
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 3000);

      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 3000);
    } catch {
      window.open(qrUrl, "_blank");
      setSaveStatus("error");
      setTimeout(() => setSaveStatus("idle"), 3000);
    }
  };

  const handleSelectBankApp = (appCode: string) => {
    if (!BANK_BIN || !ACCOUNT_NO) return;
    const encodedContent = encodeURIComponent(qrContent);
    const encodedName = encodeURIComponent(process.env.NEXT_PUBLIC_ACCOUNT_NAME || "FC Management");
    const url = `https://dl.vietqr.io/pay?app=${appCode}&ba=${ACCOUNT_NO}@${BANK_BIN}&am=${totalAmount}&tn=${encodedContent}&bn=${encodedName}`;
    window.open(url, "_blank", "noopener,noreferrer");
    setShowBankPicker(false);
  };

  const handleOpenBankApp = () => {
    setShowBankPicker(true);
  };

  const isExpired = countdown <= 0;
  const saveLabel = saveStatus === "idle" ? "Lưu ảnh QR"
    : saveStatus === "saving" ? "Đang lưu..."
    : saveStatus === "saved" ? "Đã lưu!"
    : "Nhấn giữ ảnh để lưu";

  return (
    <>
      <button
        onClick={handleOpenAndGenerateQR}
        disabled={selectedRecordIds.length === 0}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "8px",
          padding: "10px 20px",
          background: selectedRecordIds.length === 0
            ? "rgba(34,197,94,0.12)"
            : "linear-gradient(135deg, #16a34a, #22c55e)",
          color: selectedRecordIds.length === 0 ? "var(--muted-foreground)" : "white",
          border: "none",
          borderRadius: "10px",
          fontSize: "0.88rem",
          fontWeight: 700,
          cursor: selectedRecordIds.length === 0 ? "not-allowed" : "pointer",
          transition: "all 0.2s",
          boxShadow: selectedRecordIds.length > 0 ? "0 4px 15px rgba(34,197,94,0.3)" : "none",
          whiteSpace: "nowrap",
        }}
      >
        <Zap size={15} />
        {selectedRecordIds.length > 0
          ? `Tạo QR (${formatCurrency(selectedTotalAmount)})`
          : "Chọn trận cần đóng"}
      </button>

      {open && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.82)",
            backdropFilter: "blur(8px)",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "12px",
          }}
          onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
        >
          <div
            style={{
              background: "#0f172a",
              border: "1px solid rgba(34,197,94,0.25)",
              borderRadius: "16px",
              width: "100%",
              maxWidth: "360px",
              maxHeight: "90dvh",
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
              boxShadow: "0 20px 60px rgba(0,0,0,0.6)",
            }}
          >
            {/* Header */}
            <div
              style={{
                padding: "14px 18px",
                borderBottom: "1px solid rgba(255,255,255,0.06)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                background: "rgba(34,197,94,0.04)",
                flexShrink: 0,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div style={{ width: 34, height: 34, borderRadius: "10px", background: "rgba(34,197,94,0.15)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <QrCode size={17} color="#22c55e" />
                </div>
                <div>
                  <div style={{ fontWeight: 700, color: "#f1f5f9", fontSize: "0.9rem" }}>
                    {step === "qr" ? "Quét QR để thanh toán" : "Thanh toán thành công!"}
                  </div>
                  <div style={{ fontSize: "0.72rem", color: "#64748b", marginTop: "1px" }}>
                    {memberName} · {memberCode}
                  </div>
                </div>
              </div>
              <button
                onClick={handleClose}
                style={{ width: 32, height: 32, borderRadius: "8px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", color: "#94a3b8", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Scrollable Content */}
            <div style={{ flex: 1, overflowY: "auto", padding: "18px 14px" }}>
              {loading ? (
                <div style={{ padding: "40px 0", display: "flex", flexDirection: "column", alignItems: "center", gap: "12px", color: "#94a3b8" }}>
                  <Loader2 size={32} style={{ animation: "spin 1s linear infinite", color: "#22c55e" }} />
                  <span style={{ fontSize: "0.88rem", fontWeight: 600 }}>Đang khởi tạo mã QR...</span>
                </div>
              ) : error ? (
                <div style={{ padding: "20px", borderRadius: "12px", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", color: "#f87171", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: "10px" }}>
                  <AlertCircle size={28} />
                  <span style={{ fontSize: "0.85rem" }}>{error}</span>
                  <button onClick={handleOpenAndGenerateQR} style={{ padding: "6px 14px", borderRadius: "6px", background: "rgba(239,68,68,0.2)", border: "1px solid rgba(239,68,68,0.3)", color: "#f87171", cursor: "pointer", fontSize: "0.8rem", fontWeight: 700 }}>
                    Thử lại
                  </button>
                </div>
              ) : step === "qr" ? (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "14px" }}>
                  {/* Countdown */}
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", padding: "5px 14px", borderRadius: "999px", background: isExpired ? "rgba(239,68,68,0.1)" : "rgba(234,179,8,0.1)", border: isExpired ? "1px solid rgba(239,68,68,0.25)" : "1px solid rgba(234,179,8,0.25)" }}>
                    <Clock size={13} color={isExpired ? "#f87171" : "#facc15"} />
                    <span style={{ fontSize: "0.78rem", fontWeight: 700, color: isExpired ? "#f87171" : "#facc15" }}>
                      {isExpired ? "QR đã hết hạn" : `Hết hạn sau: ${formatCountdown(countdown)}`}
                    </span>
                  </div>

                  {/* QR Image */}
                  {qrUrl ? (
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "10px", width: "100%" }}>
                      <div style={{ padding: "10px", background: "white", borderRadius: "14px", boxShadow: "0 0 0 1px rgba(34,197,94,0.3), 0 8px 30px rgba(0,0,0,0.4)" }}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={qrUrl}
                          alt="QR thanh toán"
                          crossOrigin="anonymous"
                          style={{ width: 190, height: 190, display: "block" }}
                          onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                        />
                      </div>
                      <span style={{ fontSize: "0.68rem", color: "#64748b" }}>(Mẹo: Có thể nhấn giữ vào ảnh để lưu nhanh)</span>

                      {/* 2-column action buttons */}
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", width: "100%", maxWidth: "300px" }}>
                        <button
                          onClick={handleOpenBankApp}
                          disabled={!BANK_BIN || !ACCOUNT_NO}
                          style={{
                            display: "flex", alignItems: "center", justifyContent: "center", gap: "5px",
                            padding: "9px 6px", borderRadius: "10px",
                            background: (!BANK_BIN || !ACCOUNT_NO) ? "rgba(34,197,94,0.05)" : "rgba(34,197,94,0.14)",
                            border: "1px solid rgba(34,197,94,0.3)",
                            color: (!BANK_BIN || !ACCOUNT_NO) ? "#475569" : "#4ade80",
                            fontSize: "0.76rem", fontWeight: 700,
                            cursor: (!BANK_BIN || !ACCOUNT_NO) ? "not-allowed" : "pointer",
                          }}
                        >
                          <Smartphone size={13} />
                          Mở App NH
                        </button>
                        <button
                          onClick={handleSaveQR}
                          disabled={saveStatus === "saving"}
                          style={{
                            display: "flex", alignItems: "center", justifyContent: "center", gap: "5px",
                            padding: "9px 6px", borderRadius: "10px",
                            background: saveStatus === "saved" ? "rgba(34,197,94,0.15)" : saveStatus === "error" ? "rgba(239,68,68,0.1)" : "rgba(255,255,255,0.07)",
                            border: saveStatus === "saved" ? "1px solid rgba(34,197,94,0.4)" : saveStatus === "error" ? "1px solid rgba(239,68,68,0.3)" : "1px solid rgba(255,255,255,0.12)",
                            color: saveStatus === "saved" ? "#4ade80" : saveStatus === "error" ? "#f87171" : "#e2e8f0",
                            fontSize: "0.76rem", fontWeight: 700,
                            cursor: saveStatus === "saving" ? "wait" : "pointer",
                          }}
                        >
                          {saveStatus === "saving" ? <Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} /> : <Download size={13} />}
                          {saveLabel}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div style={{ width: 180, height: 180, borderRadius: "14px", background: "rgba(30,41,59,0.6)", border: "2px dashed rgba(239,68,68,0.3)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "8px", color: "#64748b" }}>
                      <AlertCircle size={32} color="#f87171" />
                      <span style={{ fontSize: "0.72rem", textAlign: "center", padding: "0 12px", color: "#f87171" }}>Chưa cấu hình thông tin ngân hàng trên server</span>
                    </div>
                  )}

                  {/* Amount */}
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: "0.72rem", color: "#64748b", marginBottom: "2px" }}>Số tiền cần chuyển</div>
                    <div style={{ fontSize: "1.6rem", fontWeight: 900, color: "#22c55e", letterSpacing: "-0.5px" }}>
                      {formatCurrency(totalAmount)}
                    </div>
                  </div>

                  {/* Transfer Content */}
                  <div style={{ width: "100%" }}>
                    <div style={{ fontSize: "0.7rem", color: "#64748b", marginBottom: "5px", textAlign: "center" }}>
                      Nội dung chuyển khoản (bắt buộc đúng)
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "9px 12px", borderRadius: "10px", background: "rgba(34,197,94,0.06)", border: "1px solid rgba(34,197,94,0.2)" }}>
                      <code style={{ flex: 1, fontSize: "0.92rem", fontWeight: 800, color: "#22c55e", fontFamily: "monospace", letterSpacing: "1px", wordBreak: "break-all" }}>
                        {qrContent}
                      </code>
                      <button
                        onClick={handleCopyContent}
                        style={{ padding: "5px 9px", borderRadius: "6px", background: copied ? "rgba(34,197,94,0.2)" : "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: copied ? "#22c55e" : "#94a3b8", cursor: "pointer", display: "flex", alignItems: "center", gap: "4px", fontSize: "0.7rem", fontWeight: 600, flexShrink: 0 }}
                      >
                        {copied ? <CheckCircle size={12} /> : <Copy size={12} />}
                        {copied ? "Đã copy" : "Copy"}
                      </button>
                    </div>
                  </div>

                  {/* Waiting */}
                  {!isExpired && (
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "8px 14px", borderRadius: "8px", background: "rgba(234,179,8,0.05)", border: "1px solid rgba(234,179,8,0.15)", width: "100%", justifyContent: "center" }}>
                      <Loader2 size={13} color="#facc15" style={{ animation: "spin 1s linear infinite" }} />
                      <span style={{ fontSize: "0.76rem", color: "#facc15" }}>Đang chờ nhận thanh toán...</span>
                    </div>
                  )}

                  <div style={{ fontSize: "0.66rem", color: "#334155", textAlign: "center" }}>
                    Bundle: <code style={{ color: "#475569" }}>{bundleCode}</code> · {selectedRecordIds.length} khoản
                  </div>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "20px", padding: "20px 0", textAlign: "center" }}>
                  <div style={{ width: 80, height: 80, borderRadius: "50%", background: "rgba(34,197,94,0.15)", border: "2px solid rgba(34,197,94,0.4)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <CheckCircle size={40} color="#22c55e" />
                  </div>
                  <div>
                    <div style={{ fontSize: "1.3rem", fontWeight: 800, color: "#f1f5f9", marginBottom: "8px" }}>🎉 Đã nhận thanh toán!</div>
                    <div style={{ fontSize: "0.9rem", color: "#4ade80", fontWeight: 700, marginBottom: "4px" }}>{formatCurrency(totalAmount)}</div>
                    <div style={{ fontSize: "0.8rem", color: "#64748b" }}>{selectedRecordIds.length} khoản đã PAID</div>
                  </div>
                  <div style={{ fontSize: "0.75rem", color: "#475569" }}>Trang sẽ tự động làm mới...</div>
                  <Loader2 size={18} color="#334155" style={{ animation: "spin 1s linear infinite" }} />
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal chọn App Ngân Hàng */}
      {showBankPicker && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.85)",
            backdropFilter: "blur(8px)",
            zIndex: 10000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "16px",
          }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowBankPicker(false); }}
        >
          <div
            style={{
              background: "#0f172a",
              border: "1px solid rgba(34,197,94,0.3)",
              borderRadius: "18px",
              width: "100%",
              maxWidth: "380px",
              maxHeight: "85dvh",
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
              boxShadow: "0 25px 60px rgba(0,0,0,0.7)",
            }}
          >
            {/* Header */}
            <div
              style={{
                padding: "16px 18px",
                borderBottom: "1px solid rgba(255,255,255,0.08)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                background: "rgba(34,197,94,0.06)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <Smartphone size={20} color="#22c55e" />
                <div>
                  <div style={{ fontWeight: 800, color: "#f1f5f9", fontSize: "0.95rem" }}>
                    Chọn App Ngân Hàng của bạn
                  </div>
                  <div style={{ fontSize: "0.72rem", color: "#94a3b8", marginTop: "2px" }}>
                    Tự động điền số tiền & nội dung khi mở app
                  </div>
                </div>
              </div>
              <button
                onClick={() => setShowBankPicker(false)}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: "8px",
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.1)",
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

            {/* Grid Ngân hàng */}
            <div style={{ flex: 1, overflowY: "auto", padding: "14px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
              {POPULAR_BANKS.map((b) => (
                <button
                  key={b.code}
                  onClick={() => handleSelectBankApp(b.code)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    padding: "12px 14px",
                    borderRadius: "12px",
                    background: b.bg,
                    border: `1px solid ${b.border}`,
                    color: "white",
                    cursor: "pointer",
                    textAlign: "left",
                    transition: "all 0.15s ease",
                  }}
                >
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: b.color, flexShrink: 0 }} />
                  <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "#f1f5f9", flex: 1 }}>{b.name}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </>
  );
}
