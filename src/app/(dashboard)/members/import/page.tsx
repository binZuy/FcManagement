"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Upload, FileSpreadsheet, AlertCircle, CheckCircle2 } from "lucide-react";
import Papa from "papaparse";

const TEMPLATE_HEADERS = ["Họ tên", "Email", "Số điện thoại", "Số áo", "Vị trí", "Mã (Tùy chọn)"];

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
  'Nguyễn Văn A,nguyenvana@gmail.com,0987654321,10,FORWARD,FCM01',
  'Trần Văn B,tranvanb@gmail.com,0912345678,7,MIDFIELDER,FCM02',
];

export default function MembersImportPage() {
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
    link.setAttribute("download", "template_thanh_vien.csv");
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
          setError("File CSV chưa có dữ liệu thành viên.");
          setPreview([]);
          return;
        }

        const mapped = results.data
          .map((row: any) => {
            const name = findVal(row, ["hoten", "name", "thanhvien"]);
            const email = findVal(row, ["email", "mail"]);
            const phone = findVal(row, ["sodienthoai", "sdt", "phone"]);
            const jerseyStr = findVal(row, ["soao", "ao", "jersey"]);
            const position = findVal(row, ["vitri", "position"]);
            const code = findVal(row, ["ma", "code"]);

            return {
              name: name || "",
              email: email || "",
              phone: phone || "",
              jerseyNumber: jerseyStr ? parseInt(jerseyStr.replace(/[^0-9]/g, "")) : undefined,
              position: position || undefined,
              code: code || "",
            };
          })
          .filter((row) => row.name);

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
      const res = await fetch("/api/members/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ members: preview }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Có lỗi xảy ra khi import");
      }

      setSuccess(`Import thành công ${data.data.successCount}/${data.data.total} thành viên.`);
      setFile(null);
      setPreview([]);

      setTimeout(() => {
        router.push("/members");
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
      <Link href="/members" className="btn btn-secondary" style={{ alignSelf: "flex-start" }}>
        <ArrowLeft size={16} />
        Quay lại danh sách thành viên
      </Link>

      <div className="glass-card" style={{ padding: "32px" }}>
        <h1 style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--card-foreground)", marginBottom: "16px" }}>
          Import Thành viên
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
            {file ? `Đã nhận diện ${preview.length} thành viên hợp lệ` : "Định dạng file hỗ trợ: .csv"}
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
                  Xem trước dữ liệu ({preview.length} thành viên hợp lệ)
                </h3>
                <div style={{ maxHeight: "260px", overflowY: "auto", border: "1px solid var(--border)", borderRadius: "8px", marginBottom: "20px" }}>
                  <table className="data-table" style={{ margin: 0 }}>
                    <thead>
                      <tr>
                        <th>Họ tên</th>
                        <th>SĐT</th>
                        <th>Vị trí</th>
                        <th>Số áo</th>
                      </tr>
                    </thead>
                    <tbody>
                      {preview.map((p, i) => (
                        <tr key={i}>
                          <td style={{ fontWeight: 600 }}>{p.name || "—"}</td>
                          <td>{p.phone || "—"}</td>
                          <td>{p.position || "—"}</td>
                          <td>{p.jerseyNumber || "—"}</td>
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
              {isUploading ? "Đang tiến hành import..." : `🚀 Xác nhận Import ${preview.length} thành viên`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
