"use client";

import { useState, useEffect } from "react";
import { Plus, Trash2, ShieldCheck, Loader2 } from "lucide-react";
import { formatDateTime } from "@/lib/utils";

type AllowedEmail = {
  id: string;
  email: string;
  label: string | null;
  addedAt: string;
};

export default function AdminAllowedEmailsPage() {
  const [emails, setEmails] = useState<AllowedEmail[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [newEmail, setNewEmail] = useState("");
  const [newLabel, setNewLabel] = useState("");
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    fetchEmails();
  }, []);

  const fetchEmails = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/allowed-emails");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to fetch");
      setEmails(json.data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail.trim()) return;

    setAdding(true);
    try {
      const res = await fetch("/api/admin/allowed-emails", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: newEmail.trim(), label: newLabel.trim() }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to add email");

      setNewEmail("");
      setNewLabel("");
      fetchEmails();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setAdding(false);
    }
  };

  const handleRemove = async (email: string) => {
    if (!confirm(`Bạn có chắc muốn xóa quyền của email ${email}?`)) return;

    try {
      const res = await fetch("/api/admin/allowed-emails", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to remove email");

      fetchEmails();
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "28px", maxWidth: "800px", margin: "0 auto" }}>
      <div>
        <h1 style={{ fontSize: "1.75rem", fontWeight: 800, color: "var(--card-foreground)", marginBottom: "4px" }}>
          Quản lý quyền truy cập
        </h1>
        <p style={{ color: "var(--muted-foreground)", fontSize: "0.9rem" }}>
          Chỉ những email được cấp quyền ở đây mới có thể đăng nhập vào hệ thống.
        </p>
      </div>

      <div className="glass-card" style={{ padding: "24px" }}>
        <h2 style={{ fontSize: "1rem", fontWeight: 700, marginBottom: "16px", display: "flex", alignItems: "center", gap: "8px" }}>
          <ShieldCheck size={18} color="var(--primary)" />
          Thêm email mới
        </h2>
        <form onSubmit={handleAdd} style={{ display: "flex", gap: "12px", flexWrap: "wrap", alignItems: "flex-end" }}>
          <div style={{ flex: 2, minWidth: "200px" }}>
            <label className="form-label">Email (Google)</label>
            <input
              type="email"
              required
              placeholder="VD: user@gmail.com"
              className="form-input"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
            />
          </div>
          <div style={{ flex: 1, minWidth: "150px" }}>
            <label className="form-label">Ghi chú (Tùy chọn)</label>
            <input
              type="text"
              placeholder="VD: Anh A"
              className="form-input"
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
            />
          </div>
          <button type="submit" disabled={adding} className="btn btn-primary" style={{ height: "38px" }}>
            {adding ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
            Thêm
          </button>
        </form>
      </div>

      <div className="glass-card" style={{ overflow: "hidden" }}>
        {loading ? (
          <div style={{ padding: "40px", textAlign: "center" }}>
            <Loader2 size={32} className="animate-spin" style={{ margin: "0 auto", color: "var(--primary)" }} />
          </div>
        ) : error ? (
          <div style={{ padding: "40px", textAlign: "center", color: "#f87171" }}>{error}</div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Email</th>
                <th>Ghi chú</th>
                <th>Ngày thêm</th>
                <th style={{ width: 80, textAlign: "center" }}>Xóa</th>
              </tr>
            </thead>
            <tbody>
              {emails.length === 0 && (
                <tr>
                  <td colSpan={4} style={{ textAlign: "center", padding: "40px", color: "var(--muted-foreground)" }}>
                    Chưa có email nào trong danh sách
                  </td>
                </tr>
              )}
              {emails.map((item) => (
                <tr key={item.id}>
                  <td style={{ fontWeight: 600, color: "var(--card-foreground)" }}>
                    {item.email}
                  </td>
                  <td style={{ color: "var(--muted-foreground)" }}>
                    {item.label || "—"}
                  </td>
                  <td style={{ color: "var(--muted-foreground)", fontSize: "0.8rem" }}>
                    {formatDateTime(item.addedAt)}
                  </td>
                  <td style={{ textAlign: "center" }}>
                    <button
                      onClick={() => handleRemove(item.email)}
                      className="btn btn-danger"
                      style={{ padding: "6px", borderRadius: "8px" }}
                      title="Xóa quyền"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
