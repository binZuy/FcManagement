"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Upload, FileSpreadsheet, AlertCircle, CheckCircle2 } from "lucide-react";
import Papa from "papaparse";
import { formatDateToYYYYMMDD } from "@/lib/utils";

const TEMPLATE_HEADERS = ["Tên trận", "Ngày (YYYY-MM-DD)", "Loại trận (INTERNAL/FRIENDLY)", "Đối thủ", "Kết quả (WIN/LOSE/DRAW)", "Mã Đội A", "Mã Đội B", "Tổng tiền sân", "Tổng tiền nước"];

function normalizeStr(str: string): string {
  return (str || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function findVal(row: Record<string, any>, possibleKeys: string[]): string | undefined {
  const keys = Object.keys(row);
  for (const pKey of possibleKeys) {
    const normPKey = normalizeStr(pKey);
    const foundKey = keys.find((k) => normalizeStr(k).includes(normPKey));
    if (foundKey && row[foundKey] !== undefined && row[foundKey] !== null) {
      const val = String(row[foundKey]).trim();
      if (val) return val;
    }
  }
  return undefined;
}

const TEMPLATE_SAMPLE_ROWS = [
  'Trận nội bộ tuần 32,2026-08-01,INTERNAL,,WIN,"FCM01,FCM02","FCM03,FCM04",500000,50000',
  'Giao hữu FC Ha Noi,2026-08-05,FRIENDLY,FC Ha Noi,LOSE,"FCM01,FCM02",,600000,',
];

export default function MatchesImportPage() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<any[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const downloadTemplate = () => {
    const lines = [TEMPLATE_HEADERS.join(","), ...TEMPLATE_SAMPLE_ROWS];
    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + lines.join("\n") + "\n";
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "template_tran_bong.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError("");
    setSuccess("");
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);

    Papa.parse(selectedFile, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => h.trim(),
      complete: (results) => {
        if (results.errors.length > 0 && results.data.length === 0) {
          setError("File CSV không hợp lệ.");
          return;
        }

        if (results.data.length === 0) {
          setError("File CSV chưa có dữ liệu trận đấu.");
          setPreview([]);
          return;
        }

        const mapped = results.data
          .map((row: any) => {
            let title = findVal(row, ["tentran", "tran", "title", "name"]);
            let matchDate = findVal(row, ["ngay", "date", "time"]);
            const matchType = findVal(row, ["loaitran", "type"]);
            const opponentName = findVal(row, ["doithu", "opponent"]);
            const result = findVal(row, ["ketqua", "result"]);
            const teamA_codes = findVal(row, ["doia", "madoia", "teama"]) || "";
            const teamB_codes = findVal(row, ["doib", "madoib", "teamb"]) || "";
            const feeTotalStr = findVal(row, ["tongtiensan", "tiensan", "san", "feetotal"]);
            const drinksFeeTotalStr = findVal(row, ["tongtiennuoc", "tiennuoc", "nuoc", "drinksfeetotal"]);

            if (!title && matchDate) title = `Trận ngày ${matchDate}`;
            if (title && !matchDate) matchDate = formatDateToYYYYMMDD(new Date());

            return {
              title: title || "",
              matchDate: matchDate || "",
              matchType: matchType || undefined,
              opponentName: opponentName || undefined,
              result: result || undefined,
              teamA_codes,
              teamB_codes,
              feeTotal: feeTotalStr ? parseFloat(feeTotalStr.replace(/[^0-9.]/g, "")) : undefined,
              drinksFeeTotal: drinksFeeTotalStr ? parseFloat(drinksFeeTotalStr.replace(/[^0-9.]/g, "")) : undefined,
            };
          })
          .filter((row) => row.title && row.matchDate);

        if (mapped.length === 0) {
          setError("Không tìm thấy dữ liệu hợp lệ trong file CSV.");
        }
        setPreview(mapped);
      },
    });
  };

  const handleUpload = async () => {
    if (preview.length === 0) {
      setError("Không có dữ liệu hợp lệ để import.");
      return;
    }

    setIsUploading(true);
    setError("");

    try {
      const res = await fetch("/api/matches/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ matches: preview }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Có lỗi xảy ra khi import");
      }

      setSuccess(`Import thành công ${data.data.successCount}/${data.data.total} trận.`);
      setFile(null);
      setPreview([]);

      setTimeout(() => {
        router.push("/matches");
        router.refresh();
      }, 2000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px", maxWidth: "800px", margin: "0 auto" }}>
      <Link href="/matches" className="btn btn-secondary" style={{ alignSelf: "flex-start" }}>
        <ArrowLeft size={16} />
        Quay lại danh sách trận
      </Link>

      <div className="glass-card" style={{ padding: "32px" }}>
        <h1 style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--card-foreground)", marginBottom: "16px" }}>
          Import Lịch sử Trận đấu
        </h1>

        <p style={{ color: "var(--muted-foreground)", marginBottom: "24px", lineHeight: 1.6 }}>
          Chọn file CSV hoặc tải File mẫu bên dưới để xem định dạng dữ liệu chuẩn.
        </p>

        <div style={{ display: "flex", gap: "12px", marginBottom: "32px" }}>
          <button onClick={downloadTemplate} className="btn btn-secondary">
            <FileSpreadsheet size={18} />
            Tải File Mẫu (CSV Template)
          </button>
        </div>

        <label
          style={{
            display: "block",
            cursor: "pointer",
            border: "2px dashed var(--border)",
            borderRadius: "12px",
            padding: "36px",
            textAlign: "center",
            background: file ? "rgba(34, 197, 94, 0.05)" : "rgba(30, 41, 59, 0.3)",
            borderColor: file ? "rgba(34, 197, 94, 0.4)" : "var(--border)",
            marginBottom: "24px",
            transition: "all 0.2s ease",
          }}
        >
          <Upload size={32} style={{ margin: "0 auto 12px", color: file ? "#4ade80" : "var(--primary)" }} />
          <div style={{ fontWeight: 700, color: file ? "#4ade80" : "var(--card-foreground)", fontSize: "1rem", marginBottom: "6px" }}>
            {file ? `Đã chọn: ${file.name}` : "Click vào đây để chọn file CSV"}
          </div>
          <div style={{ fontSize: "0.8rem", color: "var(--muted-foreground)" }}>
            {file ? `Đã nhận diện ${preview.length} trận hợp lệ` : "Định dạng file hỗ trợ: .csv"}
          </div>
          <input
            type="file"
            accept=".csv"
            onChange={handleFileChange}
            style={{ display: "none" }}
          />
        </label>

        {error && (
          <div style={{ padding: "12px 16px", borderRadius: "8px", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", color: "#f87171", display: "flex", alignItems: "center", gap: "8px", marginBottom: "24px" }}>
            <AlertCircle size={18} />
            {error}
          </div>
        )}

        {success && (
          <div style={{ padding: "12px 16px", borderRadius: "8px", background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.3)", color: "#4ade80", display: "flex", alignItems: "center", gap: "8px", marginBottom: "24px" }}>
            <CheckCircle2 size={18} />
            {success}
          </div>
        )}

        {/* Nút Import luôn hiển thị khi chọn file */}
        {file && !success && (
          <div style={{ marginTop: "12px" }}>
            {preview.length > 0 && (
              <div style={{ marginBottom: "20px" }}>
                <h3 style={{ fontSize: "1rem", fontWeight: 700, marginBottom: "12px", color: "var(--card-foreground)" }}>
                  Xem trước dữ liệu ({preview.length} trận bóng hợp lệ)
                </h3>
                <div style={{ maxHeight: "260px", overflowY: "auto", border: "1px solid var(--border)", borderRadius: "8px", marginBottom: "20px" }}>
                  <table className="data-table" style={{ margin: 0 }}>
                    <thead>
                      <tr>
                        <th>Tên trận</th>
                        <th>Ngày</th>
                        <th>Đội A</th>
                        <th>Đội B</th>
                        <th>Phí sân / nước</th>
                      </tr>
                    </thead>
                    <tbody>
                      {preview.map((p, i) => (
                        <tr key={i}>
                          <td style={{ fontWeight: 600 }}>{p.title || "—"}</td>
                          <td>{p.matchDate || "—"}</td>
                          <td style={{ fontSize: "0.8rem", color: "var(--muted-foreground)" }}>
                            {p.teamA_codes || "—"}
                          </td>
                          <td style={{ fontSize: "0.8rem", color: "var(--muted-foreground)" }}>
                            {p.teamB_codes || "—"}
                          </td>
                          <td style={{ fontSize: "0.8rem", color: "var(--muted-foreground)" }}>
                            {p.feeTotal ? `${p.feeTotal.toLocaleString()}đ` : "—"} / {p.drinksFeeTotal ? `${p.drinksFeeTotal.toLocaleString()}đ` : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <button
              onClick={handleUpload}
              disabled={isUploading || preview.length === 0}
              className="btn btn-primary"
              style={{
                width: "100%",
                padding: "14px",
                fontSize: "1.05rem",
                fontWeight: 800,
                opacity: preview.length === 0 ? 0.5 : 1,
                cursor: preview.length === 0 ? "not-allowed" : "pointer",
              }}
            >
              {isUploading ? "Đang tiến hành import..." : `🚀 Xác nhận Import ${preview.length} trận đấu`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
