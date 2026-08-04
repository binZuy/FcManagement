"use client";

import { useState } from "react";
import { Edit3, X, Loader2, Save, User, Phone, Shield, MessageSquare, Hash } from "lucide-react";

interface EditProfileModalProps {
  memberId: string;
  initialName: string;
  initialPhone: string;
  initialJerseyNumber: number | null;
  initialPosition: string | null;
  initialNote: string | null;
}

const POSITIONS = [
  { value: "GOALKEEPER", label: "Thủ môn 🧤" },
  { value: "DEFENDER", label: "Hậu vệ 🛡️" },
  { value: "MIDFIELDER", label: "Tiền vệ ⚙️" },
  { value: "FORWARD", label: "Tiền đạo ⚽" },
];

export function EditProfileModal({
  memberId,
  initialName,
  initialPhone,
  initialJerseyNumber,
  initialPosition,
  initialNote,
}: EditProfileModalProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState(initialName || "");
  const [phone, setPhone] = useState(initialPhone || "");
  const [jerseyNumber, setJerseyNumber] = useState<string>(initialJerseyNumber ? String(initialJerseyNumber) : "");
  const [position, setPosition] = useState(initialPosition || "");
  const [note, setNote] = useState(initialNote || "");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/members/${memberId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          phone,
          jerseyNumber: jerseyNumber ? parseInt(jerseyNumber, 10) : null,
          position: position || null,
          note,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Lỗi cập nhật profile");

      setOpen(false);
      window.location.reload();
    } catch (err: any) {
      setError(err.message ?? "Có lỗi xảy ra");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="btn btn-secondary"
        style={{
          padding: "6px 12px",
          fontSize: "0.8rem",
          fontWeight: 600,
          display: "inline-flex",
          alignItems: "center",
          gap: "6px",
          borderRadius: "8px",
          background: "rgba(34,197,94,0.1)",
          border: "1px solid rgba(34,197,94,0.3)",
          color: "#4ade80",
          cursor: "pointer",
        }}
      >
        <Edit3 size={14} />
        Sửa Profile
      </button>

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
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          <div
            style={{
              background: "#111827",
              border: "1px solid rgba(34,197,94,0.2)",
              borderRadius: "16px",
              width: "100%",
              maxWidth: "460px",
              overflow: "hidden",
              boxShadow: "0 25px 50px rgba(0,0,0,0.5)",
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: "16px 20px",
                borderBottom: "1px solid rgba(255,255,255,0.08)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                background: "rgba(34,197,94,0.05)",
              }}
            >
              <h3 style={{ fontSize: "1rem", fontWeight: 800, color: "#f1f5f9", display: "flex", alignItems: "center", gap: "8px" }}>
                <Edit3 size={18} color="#22c55e" /> Chỉnh sửa thông tin cá nhân
              </h3>
              <button
                onClick={() => setOpen(false)}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "#94a3b8",
                  cursor: "pointer",
                  padding: "4px",
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmit} style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "14px" }}>
              {error && (
                <div style={{ padding: "10px", borderRadius: "8px", background: "rgba(239,68,68,0.1)", color: "#f87171", fontSize: "0.8rem" }}>
                  {error}
                </div>
              )}

              <div>
                <label className="form-label">Tên hiển thị</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="form-input"
                  required
                />
              </div>

              <div>
                <label className="form-label">Số điện thoại</label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="form-input"
                  placeholder="0981234567"
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div>
                  <label className="form-label">Số áo thi đấu</label>
                  <input
                    type="number"
                    min="1"
                    max="99"
                    value={jerseyNumber}
                    onChange={(e) => setJerseyNumber(e.target.value)}
                    className="form-input"
                    placeholder="VD: 10"
                  />
                </div>

                <div>
                  <label className="form-label">Vị trí sở trường</label>
                  <select
                    value={position}
                    onChange={(e) => setPosition(e.target.value)}
                    className="form-input"
                    style={{ background: "#1e293b" }}
                  >
                    <option value="">-- Chưa chọn --</option>
                    {POSITIONS.map((p) => (
                      <option key={p.value} value={p.value}>
                        {p.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="form-label">Ghi chú / Khẩu hiệu cá nhân (Bio)</label>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="form-input"
                  rows={3}
                  placeholder="VD: Quyết tâm đá nhiệt tình, thắng thua là chuyện nhỏ!"
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "10px" }}>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="btn btn-secondary"
                  style={{ padding: "8px 14px", fontSize: "0.82rem" }}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="btn btn-primary"
                  style={{ padding: "8px 16px", fontSize: "0.82rem", fontWeight: 700 }}
                >
                  {loading ? <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} /> : <Save size={16} />}
                  Lưu thay đổi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
