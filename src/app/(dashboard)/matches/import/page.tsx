"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Upload, FileSpreadsheet, AlertCircle, CheckCircle2 } from "lucide-react";
import Papa from "papaparse";

const TEMPLATE_HEADERS = ["Tên trận", "Ngày (YYYY-MM-DD)", "Loại trận (INTERNAL/EXTERNAL)", "Đối thủ", "Kết quả (WIN/LOSE/DRAW)", "Mã Đội A", "Mã Đội B", "Tổng tiền sân", "Tổng tiền nước"];

export default function MatchesImportPage() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<any[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const downloadTemplate = () => {
    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + TEMPLATE_HEADERS.join(",") + "\n";
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
      complete: (results) => {
        if (results.errors.length > 0) {
          setError("Lỗi đọc file CSV. Vui lòng kiểm tra lại định dạng.");
          return;
        }
        
        // Map keys exactly matching our template
        const mapped = results.data.map((row: any) => ({
          title: row["Tên trận"]?.trim() || "",
          matchDate: row["Ngày (YYYY-MM-DD)"]?.trim() || "",
          matchType: row["Loại trận (INTERNAL/EXTERNAL)"]?.trim() || undefined,
          opponentName: row["Đối thủ"]?.trim() || undefined,
          result: row["Kết quả (WIN/LOSE/DRAW)"]?.trim() || undefined,
          teamA_codes: row["Mã Đội A"]?.trim() || "",
          teamB_codes: row["Mã Đội B"]?.trim() || "",
          feeTotal: row["Tổng tiền sân"] ? parseFloat(row["Tổng tiền sân"]) : undefined,
          drinksFeeTotal: row["Tổng tiền nước"] ? parseFloat(row["Tổng tiền nước"]) : undefined,
        })).filter((row) => row.title && row.matchDate);

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

      setSuccess(`Import thành công ${data.data.successCount}/${data.data.total} trận bóng.`);
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
        Quay lại
      </Link>

      <div className="glass-card" style={{ padding: "32px" }}>
        <h1 style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--card-foreground)", marginBottom: "16px" }}>
          Import Lịch sử Trận
        </h1>
        
        <p style={{ color: "var(--muted-foreground)", marginBottom: "24px", lineHeight: 1.6 }}>
          Điền dữ liệu trận bóng và mã điểm danh (cách nhau dấu phẩy) vào file mẫu để import.
        </p>

        <div style={{ display: "flex", gap: "12px", marginBottom: "32px" }}>
          <button onClick={downloadTemplate} className="btn btn-secondary">
            <FileSpreadsheet size={18} />
            Tải File Mẫu (Template)
          </button>
        </div>

        <label 
          style={{ 
            display: "block",
            cursor: "pointer",
            border: "2px dashed var(--border)", 
            borderRadius: "12px", 
            padding: "40px", 
            textAlign: "center",
            background: "rgba(30, 41, 59, 0.3)",
            marginBottom: "24px",
            transition: "background 0.2s ease"
          }}
        >
          <Upload size={32} style={{ margin: "0 auto 12px", color: "var(--primary)" }} />
          <div style={{ fontWeight: 600, color: "var(--card-foreground)", marginBottom: "8px" }}>
            {file ? file.name : "Click vào đây để chọn file CSV"}
          </div>
          <input 
            type="file" 
            accept=".csv" 
            onChange={handleFileChange}
            style={{ display: "none" }} 
          />
        </label>

        {error && (
          <div style={{ padding: "12px 16px", borderRadius: "8px", background: "rgba(239,68,68,0.1)", color: "#ef4444", display: "flex", alignItems: "center", gap: "8px", marginBottom: "24px" }}>
            <AlertCircle size={18} />
            {error}
          </div>
        )}

        {success && (
          <div style={{ padding: "12px 16px", borderRadius: "8px", background: "rgba(34,197,94,0.1)", color: "#4ade80", display: "flex", alignItems: "center", gap: "8px", marginBottom: "24px" }}>
            <CheckCircle2 size={18} />
            {success}
          </div>
        )}

        {preview.length > 0 && !success && (
          <div>
            <h3 style={{ fontSize: "1rem", fontWeight: 700, marginBottom: "12px", color: "var(--card-foreground)" }}>
              Dữ liệu tìm thấy ({preview.length} trận)
            </h3>
            <div style={{ maxHeight: "300px", overflowY: "auto", border: "1px solid var(--border)", borderRadius: "8px", marginBottom: "24px" }}>
              <table className="data-table" style={{ margin: 0 }}>
                <thead>
                  <tr>
                    <th>Tên trận</th>
                    <th>Ngày</th>
                    <th>Đội A</th>
                    <th>Đội B</th>
                    <th>Phí (Sân/Nước)</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.map((p, i) => (
                    <tr key={i}>
                      <td>{p.title}</td>
                      <td>{p.matchDate}</td>
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

            <button 
              onClick={handleUpload}
              disabled={isUploading} 
              className="btn btn-primary" 
              style={{ width: "100%", padding: "12px", fontSize: "1rem" }}
            >
              {isUploading ? "Đang import..." : `Xác nhận Import ${preview.length} trận`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
