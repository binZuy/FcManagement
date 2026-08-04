"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Save, Loader2 } from "lucide-react";
import { MatchType } from "@prisma/client";

export default function NewMatchPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    title: "",
    matchDate: new Date().toISOString().slice(0, 16),
    location: "",
    matchType: "INTERNAL" as MatchType,
    opponentName: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/matches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          matchDate: new Date(formData.matchDate).toISOString(),
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Không thể tạo trận đấu");

      router.push(`/matches/${json.data.id}`);
      router.refresh();
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: "600px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "20px" }}>
      <Link href="/matches" className="btn btn-secondary" style={{ alignSelf: "flex-start", padding: "6px 12px", fontSize: "0.82rem" }}>
        <ArrowLeft size={16} /> Quay lại danh sách
      </Link>

      <div className="glass-card" style={{ padding: "20px" }}>
        <h1 style={{ fontSize: "1.4rem", fontWeight: 800, marginBottom: "20px", color: "var(--card-foreground)" }}>
          Tạo trận bóng mới
        </h1>

        {error && (
          <div style={{ padding: "10px 14px", background: "rgba(239, 68, 68, 0.15)", color: "#f87171", borderRadius: "8px", marginBottom: "16px", fontSize: "0.85rem" }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div>
            <label className="form-label">Tên trận đấu *</label>
            <input
              type="text"
              required
              className="form-input"
              placeholder="VD: Đá tập thứ 7"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "14px" }}>
            <div>
              <label className="form-label">Thời gian *</label>
              <input
                type="datetime-local"
                required
                className="form-input"
                value={formData.matchDate}
                onChange={(e) => setFormData({ ...formData, matchDate: e.target.value })}
              />
            </div>
            <div>
              <label className="form-label">Loại trận *</label>
              <select
                className="form-input"
                style={{ background: "#1e293b" }}
                value={formData.matchType}
                onChange={(e) => setFormData({ ...formData, matchType: e.target.value as MatchType })}
              >
                <option value="INTERNAL">Nội bộ (Chia đội)</option>
                <option value="EXTERNAL">Giao hữu (Đá với đội khác)</option>
              </select>
            </div>
          </div>

          {formData.matchType === "EXTERNAL" && (
            <div>
              <label className="form-label">Tên đối thủ</label>
              <input
                type="text"
                className="form-input"
                placeholder="VD: FC Bạn"
                value={formData.opponentName}
                onChange={(e) => setFormData({ ...formData, opponentName: e.target.value })}
              />
            </div>
          )}

          <div>
            <label className="form-label">Địa điểm sân bóng</label>
            <input
              type="text"
              className="form-input"
              placeholder="VD: Sân cỏ nhân tạo A"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
            />
          </div>

          <div style={{ marginTop: "8px", display: "flex", justifyContent: "flex-end" }}>
            <button type="submit" disabled={loading} className="btn btn-primary" style={{ padding: "10px 20px", fontWeight: 700 }}>
              {loading ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
              {loading ? "Đang tạo..." : "Tạo trận đấu"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
