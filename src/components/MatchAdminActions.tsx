"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { Edit3, Trash2, X, Save, AlertTriangle, Loader2 } from "lucide-react";
import { showToast } from "@/components/Toast";
import { formatDateTimeLocal } from "@/lib/utils";

interface MatchAdminActionsProps {
  match: {
    id: string;
    title: string;
    matchDate: string | Date;
    matchType: string;
    opponentName?: string | null;
    location?: string | null;
    status: string;
  };
}

export function MatchAdminActions({ match }: MatchAdminActionsProps) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const [formData, setFormData] = useState({
    title: match.title ?? "",
    matchDate: formatDateTimeLocal(match.matchDate),
    matchType: match.matchType ?? "INTERNAL",
    opponentName: match.opponentName ?? "",
    location: match.location ?? "",
    status: match.status ?? "UPCOMING",
  });

  const handleOpenEdit = () => {
    setFormData({
      title: match.title ?? "",
      matchDate: formatDateTimeLocal(match.matchDate),
      matchType: match.matchType ?? "INTERNAL",
      opponentName: match.opponentName ?? "",
      location: match.location ?? "",
      status: match.status ?? "UPCOMING",
    });
    setShowEditModal(true);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch(`/api/matches/${match.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: formData.title,
          matchDate: new Date(formData.matchDate).toISOString(),
          matchType: formData.matchType,
          opponentName: formData.matchType === "FRIENDLY" ? formData.opponentName : null,
          location: formData.location,
          status: formData.status,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Lỗi cập nhật thông tin trận");

      showToast.success("Đã cập nhật thông tin trận đấu!");
      setShowEditModal(false);
      router.refresh();
    } catch (err: any) {
      showToast.error(err.message || "Không thể cập nhật trận đấu");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteMatch = async () => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/matches/${match.id}`, {
        method: "DELETE",
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Không thể xóa trận đấu");

      showToast.success("Đã xóa trận đấu thành công!");
      setShowDeleteModal(false);
      router.push("/matches");
      router.refresh();
    } catch (err: any) {
      showToast.error(err.message || "Lỗi xóa trận đấu");
      setDeleting(false);
    }
  };

  return (
    <>
      {/* Nút thao tác Admin */}
      <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
        <button
          onClick={handleOpenEdit}
          className="btn btn-secondary"
          style={{ padding: "6px 12px", fontSize: "0.82rem", fontWeight: 700 }}
          title="Chỉnh sửa thời gian, loại trận, tên trận"
        >
          <Edit3 size={15} />
          <span>Sửa thông tin</span>
        </button>

        <button
          onClick={() => setShowDeleteModal(true)}
          className="btn"
          style={{
            padding: "6px 12px",
            fontSize: "0.82rem",
            fontWeight: 700,
            background: "rgba(239, 68, 68, 0.15)",
            color: "#f87171",
            border: "1px solid rgba(239, 68, 68, 0.3)",
          }}
          title="Xóa trận đấu nếu bị tạo trùng"
        >
          <Trash2 size={15} />
          <span>Xóa trận</span>
        </button>
      </div>

      {/* MODAL EDIT MATCH INFO */}
      {showEditModal && mounted && createPortal(
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0, 0, 0, 0.8)",
            backdropFilter: "blur(8px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 99999,
            padding: "16px",
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget && !saving) setShowEditModal(false);
          }}
        >
          <div
            className="glass-card animate-fade-in"
            style={{
              width: "100%",
              maxWidth: "520px",
              padding: "24px",
              borderRadius: "16px",
              background: "#0f172a",
              border: "1px solid var(--border)",
              boxShadow: "0 25px 50px rgba(0, 0, 0, 0.7)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "18px" }}>
              <h2 style={{ fontSize: "1.2rem", fontWeight: 800, color: "var(--card-foreground)" }}>
                Sửa thông tin trận đấu
              </h2>
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                style={{ background: "none", border: "none", color: "var(--muted-foreground)", cursor: "pointer" }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <div>
                <label className="form-label">Tên trận đấu *</label>
                <input
                  type="text"
                  required
                  className="form-input"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "12px" }}>
                <div>
                  <label className="form-label">Thời gian bắt đầu *</label>
                  <input
                    type="datetime-local"
                    required
                    className="form-input"
                    value={formData.matchDate}
                    onChange={(e) => setFormData({ ...formData, matchDate: e.target.value })}
                  />
                </div>

                <div>
                  <label className="form-label">Trạng thái</label>
                  <select
                    className="form-input"
                    style={{ background: "#1e293b" }}
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  >
                    <option value="UPCOMING">Sắp diễn ra</option>
                    <option value="DONE">Đã xong</option>
                    <option value="CANCELLED">Đã hủy</option>
                  </select>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "12px" }}>
                <div>
                  <label className="form-label">Loại trận đấu *</label>
                  <select
                    className="form-input"
                    style={{ background: "#1e293b" }}
                    value={formData.matchType}
                    onChange={(e) => setFormData({ ...formData, matchType: e.target.value })}
                  >
                    <option value="INTERNAL">Nội bộ (Chia 2 đội)</option>
                    <option value="FRIENDLY">Giao hữu (Đá với đội đối thủ)</option>
                  </select>
                </div>

                {formData.matchType === "FRIENDLY" && (
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
              </div>

              <div>
                <label className="form-label">Địa điểm sân bóng</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="VD: Sân bóng nhân tạo A"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "12px" }}>
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="btn btn-secondary"
                  style={{ padding: "8px 16px", fontSize: "0.85rem" }}
                  disabled={saving}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="btn btn-primary"
                  style={{ padding: "8px 18px", fontWeight: 700, fontSize: "0.85rem" }}
                >
                  {saving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                  {saving ? "Đang lưu..." : "Lưu thay đổi"}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* MODAL CONFIRM DELETE MATCH */}
      {showDeleteModal && mounted && createPortal(
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0, 0, 0, 0.8)",
            backdropFilter: "blur(8px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 99999,
            padding: "16px",
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget && !deleting) setShowDeleteModal(false);
          }}
        >
          <div
            className="glass-card animate-fade-in"
            style={{
              width: "100%",
              maxWidth: "440px",
              padding: "24px",
              borderRadius: "16px",
              background: "#0f172a",
              border: "1px solid rgba(239, 68, 68, 0.3)",
              boxShadow: "0 25px 50px rgba(0, 0, 0, 0.7)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "12px", color: "#f87171", marginBottom: "14px" }}>
              <div
                style={{
                  width: "42px",
                  height: "42px",
                  borderRadius: "50%",
                  background: "rgba(239, 68, 68, 0.15)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <AlertTriangle size={22} color="#f87171" />
              </div>
              <h2 style={{ fontSize: "1.15rem", fontWeight: 800, color: "var(--card-foreground)" }}>
                Xác nhận xóa trận đấu?
              </h2>
            </div>

            <p style={{ color: "var(--muted-foreground)", fontSize: "0.88rem", lineHeight: 1.5, marginBottom: "20px" }}>
              Bạn đang thực hiện xóa trận <strong>"{match.title}"</strong>. Hành động này không thể hoàn tác và sẽ xóa toàn bộ dữ liệu điểm danh liên quan.
            </p>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                className="btn btn-secondary"
                style={{ padding: "8px 16px", fontSize: "0.85rem" }}
                disabled={deleting}
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleDeleteMatch}
                disabled={deleting}
                className="btn"
                style={{
                  padding: "8px 18px",
                  fontWeight: 700,
                  fontSize: "0.85rem",
                  background: "#ef4444",
                  color: "white",
                  border: "none",
                }}
              >
                {deleting ? <Loader2 className="animate-spin" size={16} /> : <Trash2 size={16} />}
                {deleting ? "Đang xóa..." : "Xóa trận đấu"}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
