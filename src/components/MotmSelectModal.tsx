"use client";

import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { Star, Upload, Trash2, X, Check, Loader2, Image as ImageIcon } from "lucide-react";
import { showToast } from "@/components/Toast";

interface AttendanceMember {
  memberId: string;
  member: {
    id: string;
    code: string;
    jerseyNumber?: number | null;
    user: {
      name: string | null;
      image: string | null;
    };
  };
}

interface MotmSelectModalProps {
  matchId: string;
  currentMotmId?: string | null;
  currentMotmNote?: string | null;
  currentPhotos?: string[];
  attendances: AttendanceMember[];
}

export function MotmSelectModal({
  matchId,
  currentMotmId,
  currentMotmNote,
  currentPhotos = [],
  attendances,
}: MotmSelectModalProps) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const [selectedMemberId, setSelectedMemberId] = useState<string>(currentMotmId || "");
  const [motmNote, setMotmNote] = useState<string>(currentMotmNote || "");
  const [photos, setPhotos] = useState<string[]>(currentPhotos || []);
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleOpen = () => {
    setSelectedMemberId(currentMotmId || "");
    setMotmNote(currentMotmNote || "");
    setPhotos(currentPhotos || []);
    setIsOpen(true);
  };

  // Upload file ảnh trực tiếp từ máy / điện thoại
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const formData = new FormData();
        formData.append("file", file);

        const res = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || "Lỗi tải ảnh");
        }

        const data = await res.json();
        if (data.url) {
          setPhotos((prev) => [...prev, data.url]);
        }
      }
      showToast.success("Tải ảnh thành công!");
    } catch (err: any) {
      showToast.error(err.message || "Lỗi khi tải ảnh");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const res = await fetch(`/api/matches/${matchId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          motmMemberId: selectedMemberId || null,
          motmNote: motmNote.trim() || null,
          photos: photos,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Lỗi lưu MOTM");
      }

      showToast.success("Đã cập nhật MOTM & Ảnh kỷ niệm! ⭐");
      setIsOpen(false);
      router.refresh();
    } catch (err: any) {
      showToast.error(err.message || "Lỗi");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      {/* NÚT CHỌN MOTM RIÊNG BIỆT (TỐI ƯU MOBILE: CHỈ HIỆN ICON TRÊN MOBILE) */}
      <button
        type="button"
        onClick={handleOpen}
        className="btn"
        style={{
          padding: "6px 12px",
          fontSize: "0.82rem",
          fontWeight: 700,
          background: currentMotmId
            ? "linear-gradient(135deg, rgba(234,179,8,0.2), rgba(202,138,4,0.15))"
            : "rgba(255,255,255,0.06)",
          color: currentMotmId ? "#facc15" : "var(--card-foreground)",
          border: currentMotmId ? "1px solid rgba(250,204,21,0.4)" : "1px solid var(--border)",
          display: "inline-flex",
          alignItems: "center",
          gap: "6px",
          boxShadow: currentMotmId ? "0 0 12px rgba(250,204,21,0.2)" : "none",
        }}
        title="Bình chọn MOTM (Cầu thủ xuất sắc nhất trận) & Lưu ảnh kỷ niệm"
      >
        <Star size={16} color="#facc15" fill={currentMotmId ? "#facc15" : "none"} />
        <span className="btn-label-desktop">
          {currentMotmId ? "Đã có MOTM ⭐" : "Chọn MOTM"}
        </span>
      </button>

      {/* MODAL BÌNH CHỌN MOTM & ẢNH KỶ NIỆM */}
      {isOpen && mounted && createPortal(
        <div
          onClick={() => setIsOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.75)",
            backdropFilter: "blur(6px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 100,
            padding: "16px",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "#0f172a",
              border: "1px solid rgba(250,204,21,0.3)",
              borderRadius: "18px",
              padding: "22px",
              width: "100%",
              maxWidth: "460px",
              maxHeight: "90vh",
              overflowY: "auto",
              display: "flex",
              flexDirection: "column",
              gap: "16px",
              boxShadow: "0 20px 50px rgba(0,0,0,0.7)",
            }}
          >
            {/* Modal Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: "rgba(250,204,21,0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Star size={18} color="#facc15" fill="#facc15" />
                </div>
                <div>
                  <h3 style={{ fontSize: "1.1rem", fontWeight: 800, color: "#facc15" }}>
                    Vinh Danh MOTM ⭐
                  </h3>
                  <div style={{ fontSize: "0.72rem", color: "var(--muted-foreground)" }}>
                    Chọn Cầu thủ xuất sắc nhất & Tải ảnh kỷ niệm trận đấu
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsOpen(false)}
                style={{ background: "transparent", border: "none", color: "var(--muted-foreground)", cursor: "pointer" }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              {/* Chọn cầu thủ MOTM */}
              <div>
                <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 700, color: "var(--card-foreground)", marginBottom: "6px" }}>
                  Cầu thủ xuất sắc nhất trận:
                </label>
                <select
                  value={selectedMemberId}
                  onChange={(e) => setSelectedMemberId(e.target.value)}
                  className="form-input"
                  style={{
                    background: "#1e293b",
                    borderColor: selectedMemberId ? "#facc15" : "var(--border)",
                    width: "100%",
                  }}
                >
                  <option value="">-- Bỏ chọn / Chưa có MOTM --</option>
                  {attendances.map((att) => (
                    <option key={att.member.id} value={att.member.id}>
                      ⭐ {att.member.user.name || att.member.code} {att.member.jerseyNumber ? `(#${att.member.jerseyNumber})` : ""} - Mã: {att.member.code}
                    </option>
                  ))}
                </select>
              </div>

              {/* Lời bình MOTM */}
              <div>
                <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 700, color: "var(--card-foreground)", marginBottom: "6px" }}>
                  Lời bình / Lý do vinh danh:
                </label>
                <input
                  type="text"
                  value={motmNote}
                  onChange={(e) => setMotmNote(e.target.value)}
                  placeholder="VD: Hattrick xuất thần, Gánh team phút cuối..."
                  className="form-input"
                  style={{ width: "100%" }}
                />
              </div>

              {/* UPLOAD ẢNH KỶ NIỆM (Tải file từ điện thoại / máy tính) */}
              <div style={{ borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: "12px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px", flexWrap: "wrap", gap: "8px" }}>
                  <label style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--card-foreground)", display: "flex", alignItems: "center", gap: "6px" }}>
                    <ImageIcon size={15} color="var(--primary)" /> Ảnh kỷ niệm trận đấu ({photos.length}):
                  </label>

                  {/* Input file ẩn bằng CSS clipping an toàn cho mobile */}
                  <input
                    id="motm-photo-upload"
                    type="file"
                    onChange={handleFileChange}
                    accept="image/*"
                    multiple
                    disabled={isUploading}
                    style={{
                      position: "absolute",
                      width: "1px",
                      height: "1px",
                      padding: 0,
                      margin: "-1px",
                      overflow: "hidden",
                      clip: "rect(0, 0, 0, 0)",
                      whiteSpace: "nowrap",
                      border: 0,
                    }}
                  />

                  {/* Dùng label htmlFor để mobile click trực tiếp mở thư viện ảnh 100% */}
                  <label
                    htmlFor="motm-photo-upload"
                    className="btn btn-secondary"
                    style={{
                      padding: "5px 12px",
                      fontSize: "0.78rem",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                      cursor: isUploading ? "not-allowed" : "pointer",
                      opacity: isUploading ? 0.6 : 1,
                    }}
                  >
                    {isUploading ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />}
                    <span>{isUploading ? "Đang tải ảnh..." : "Chọn ảnh từ máy"}</span>
                  </label>
                </div>

                {/* Danh sách ảnh thumbnails */}
                {photos.length > 0 ? (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "8px", maxHeight: "160px", overflowY: "auto" }}>
                    {photos.map((p, idx) => (
                      <div key={idx} style={{ position: "relative", height: "70px", borderRadius: "8px", overflow: "hidden", border: "1px solid rgba(255,255,255,0.15)" }}>
                        <img src={p} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        <button
                          type="button"
                          onClick={() => setPhotos((prev) => prev.filter((_, i) => i !== idx))}
                          style={{
                            position: "absolute", top: 2, right: 2, background: "rgba(0,0,0,0.75)", border: "none", color: "#f87171", borderRadius: "4px", padding: "2px", cursor: "pointer"
                          }}
                          title="Xóa ảnh"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ textAlign: "center", padding: "16px", background: "rgba(255,255,255,0.02)", borderRadius: "8px", border: "1px dashed rgba(255,255,255,0.1)", fontSize: "0.75rem", color: "var(--muted-foreground)" }}>
                    Chưa có ảnh nào · Bấm "Tải ảnh từ máy" để lưu giữ khoảnh khắc đẹp!
                  </div>
                )}
              </div>

              {/* Submit Buttons */}
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", marginTop: "8px" }}>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="btn btn-secondary"
                  style={{ padding: "8px 14px", fontSize: "0.82rem" }}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSaving || isUploading}
                  className="btn btn-primary"
                  style={{ padding: "8px 16px", fontSize: "0.82rem", fontWeight: 800, display: "flex", alignItems: "center", gap: "6px" }}
                >
                  {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                  {isSaving ? "Đang lưu..." : "Lưu MOTM"}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
