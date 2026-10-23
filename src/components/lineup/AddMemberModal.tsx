"use client";

import { useState, useMemo, useEffect } from "react";
import { createPortal } from "react-dom";
import { Plus, X } from "lucide-react";

interface AddMemberModalProps {
  allFcMembers: Array<{
    id: string;
    name: string;
    image?: string | null;
    jerseyNumber?: number | null;
    position?: string | null;
  }>;
  existingMemberIds: Set<string>;
  onClose: () => void;
  onAddMember: (
    member: {
      id: string;
      name: string;
      image?: string | null;
      jerseyNumber?: number | null;
      position?: string | null;
    },
    targetTeam: "TEAM_A" | "TEAM_B" | "UNASSIGNED"
  ) => void;
}

export function AddMemberModal({
  allFcMembers,
  existingMemberIds,
  onClose,
  onAddMember,
}: AddMemberModalProps) {
  const [mounted, setMounted] = useState(false);
  const [searchMember, setSearchMember] = useState("");

  useEffect(() => {
    setMounted(true);
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  const availableMembers = useMemo(() => {
    return allFcMembers
      .filter((m) => !existingMemberIds.has(m.id))
      .filter((m) => m.name.toLowerCase().includes(searchMember.toLowerCase().trim()));
  }, [allFcMembers, existingMemberIds, searchMember]);

  if (!mounted || typeof document === "undefined") return null;

  return createPortal(
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: "100vw",
        height: "100dvh",
        background: "rgba(0,0,0,0.82)",
        backdropFilter: "blur(6px)",
        WebkitBackdropFilter: "blur(6px)",
        zIndex: 99999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
        boxSizing: "border-box",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: "460px",
          maxHeight: "85dvh",
          padding: "20px",
          borderRadius: "16px",
          background: "#0f172a",
          border: "1.5px solid rgba(59,130,246,0.35)",
          display: "flex",
          flexDirection: "column",
          gap: "14px",
          boxShadow: "0 20px 60px rgba(0,0,0,0.85)",
          overflow: "hidden",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
          <div style={{ fontWeight: 800, fontSize: "1rem", color: "#f8fafc", display: "flex", alignItems: "center", gap: "6px" }}>
            <Plus size={18} color="var(--primary)" /> Thêm Cầu Thủ Vào Đội Hình
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{ background: "transparent", border: "none", color: "var(--muted-foreground)", cursor: "pointer", padding: "4px" }}
          >
            <X size={18} />
          </button>
        </div>

        <input
          type="text"
          value={searchMember}
          onChange={(e) => setSearchMember(e.target.value)}
          placeholder="🔍 Tìm theo tên cầu thủ..."
          className="form-input"
          style={{ padding: "8px 12px", fontSize: "0.85rem", borderRadius: "8px", flexShrink: 0 }}
          autoFocus
        />

        <div style={{ display: "flex", flexDirection: "column", gap: "8px", overflowY: "auto", flex: 1, paddingRight: "4px" }}>
          {availableMembers.map((m) => (
            <div
              key={m.id}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "8px 12px",
                borderRadius: "8px",
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.08)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "8px", overflow: "hidden", whiteSpace: "nowrap" }}>
                {m.image ? (
                  <img src={m.image} alt="" style={{ width: 32, height: 32, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
                ) : (
                  <div style={{ width: 32, height: 32, borderRadius: "50%", background: "var(--primary)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: "12px", color: "#052e16", flexShrink: 0 }}>
                    {m.name[0]}
                  </div>
                )}
                <div style={{ overflow: "hidden", textOverflow: "ellipsis" }}>
                  <div style={{ fontWeight: 700, fontSize: "0.85rem", color: "#f8fafc", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {m.name} {m.jerseyNumber ? `(#${m.jerseyNumber})` : ""}
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", gap: "6px", flexShrink: 0 }}>
                <button
                  type="button"
                  onClick={() => onAddMember(m, "TEAM_A")}
                  style={{
                    padding: "4px 8px",
                    fontSize: "0.72rem",
                    fontWeight: 700,
                    borderRadius: "6px",
                    border: "none",
                    background: "#2563eb",
                    color: "white",
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                  }}
                >
                  + Vào A
                </button>
                <button
                  type="button"
                  onClick={() => onAddMember(m, "TEAM_B")}
                  style={{
                    padding: "4px 8px",
                    fontSize: "0.72rem",
                    fontWeight: 700,
                    borderRadius: "6px",
                    border: "none",
                    background: "#ca8a04",
                    color: "white",
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                  }}
                >
                  + Vào B
                </button>
              </div>
            </div>
          ))}

          {availableMembers.length === 0 && (
            <div style={{ textAlign: "center", padding: "24px 0", color: "var(--muted-foreground)", fontSize: "0.82rem" }}>
              Không tìm thấy thành viên khả dụng nào.
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={onClose}
          className="btn btn-secondary"
          style={{ width: "100%", padding: "8px", fontSize: "0.85rem", fontWeight: 700, flexShrink: 0 }}
        >
          Đóng
        </button>
      </div>
    </div>,
    document.body
  );
}
