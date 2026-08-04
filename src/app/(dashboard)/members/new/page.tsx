"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Save, Loader2 } from "lucide-react";
import { Position } from "@prisma/client";

export default function NewMemberPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    jerseyNumber: "",
    position: "UNKNOWN" as Position | "UNKNOWN",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          jerseyNumber: formData.jerseyNumber ? parseInt(formData.jerseyNumber) : undefined,
          position: formData.position === "UNKNOWN" ? undefined : formData.position,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Không thể tạo thành viên");

      router.push(`/members/${json.data.id}`);
      router.refresh();
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: "600px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "20px" }}>
      <Link href="/members" className="btn btn-secondary" style={{ alignSelf: "flex-start", padding: "6px 12px", fontSize: "0.82rem" }}>
        <ArrowLeft size={16} /> Quay lại danh sách
      </Link>

      <div className="glass-card" style={{ padding: "20px" }}>
        <h1 style={{ fontSize: "1.4rem", fontWeight: 800, marginBottom: "20px", color: "var(--card-foreground)" }}>
          Thêm thành viên mới
        </h1>

        {error && (
          <div style={{ padding: "10px 14px", background: "rgba(239, 68, 68, 0.15)", color: "#f87171", borderRadius: "8px", marginBottom: "16px", fontSize: "0.85rem" }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div>
            <label className="form-label">Họ và tên *</label>
            <input
              type="text"
              required
              className="form-input"
              placeholder="VD: Nguyễn Văn A"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
          </div>

          <div>
            <label className="form-label">Email (Dùng để đăng nhập) *</label>
            <input
              type="email"
              required
              className="form-input"
              placeholder="VD: nva@gmail.com"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
            <p style={{ fontSize: "0.72rem", color: "var(--muted-foreground)", marginTop: "4px" }}>
              Email này sẽ được tự động thêm vào danh sách cho phép (Whitelist).
            </p>
          </div>

          <div>
            <label className="form-label">Số điện thoại</label>
            <input
              type="tel"
              className="form-input"
              placeholder="VD: 0987654321"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "14px" }}>
            <div>
              <label className="form-label">Số áo</label>
              <input
                type="number"
                min="1"
                max="99"
                className="form-input"
                placeholder="VD: 10"
                value={formData.jerseyNumber}
                onChange={(e) => setFormData({ ...formData, jerseyNumber: e.target.value })}
              />
            </div>
            <div>
              <label className="form-label">Vị trí thi đấu</label>
              <select
                className="form-input"
                style={{ background: "#1e293b" }}
                value={formData.position}
                onChange={(e) => setFormData({ ...formData, position: e.target.value as any })}
              >
                <option value="UNKNOWN">Chưa xác định</option>
                <option value="GOALKEEPER">Thủ môn</option>
                <option value="DEFENDER">Hậu vệ</option>
                <option value="MIDFIELDER">Tiền vệ</option>
                <option value="FORWARD">Tiền đạo</option>
              </select>
            </div>
          </div>

          <div style={{ marginTop: "8px", display: "flex", justifyContent: "flex-end" }}>
            <button type="submit" disabled={loading} className="btn btn-primary" style={{ padding: "10px 20px", fontWeight: 700 }}>
              {loading ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
              {loading ? "Đang lưu..." : "Thêm thành viên"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
