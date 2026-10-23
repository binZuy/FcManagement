"use client";

import { useState, useMemo } from "react";
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
  const [searchMember, setSearchMember] = useState("");

  const availableMembers = useMemo(() => {
    return allFcMembers
      .filter((m) => !existingMemberIds.has(m.id))
      .filter((m) => m.name.toLowerCase().includes(searchMember.toLowerCase().trim()));
  }, [allFcMembers, existingMemberIds, searchMember]);

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.8)",
        backdropFilter: "blur(5px)",
        zIndex: 100,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="glass-card"
        style={{
          width: "100%",
          maxWidth: "460px",
          maxHeight: "80vh",
          padding: "20px",
          borderRadius: "16px",
          background: "#0f172a",
          border: "1px solid var(--border)",
          display: "flex",
          flexDirection: "column",
          gap: "14px",
          boxShadow: "0 10px 40px rgba(0,0,0,0.8)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontWeight: 800, fontSize: "1rem", color: "#f8fafc", display: "flex", alignItems: "center", gap: "6px" }}>
            <Plus size={18} color="var(--primary)" /> Thêm Cầu Thủ Vào Đội Hình
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{ background: "transparent", border: "none", color: "var(--muted-foreground)", cursor: "pointer" }}
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
          style={{ padding: "8px 12px", fontSize: "0.85rem", borderRadius: "8px" }}
        />

        <div style={{ display: "flex", flexDirection: "column", gap: "8px", overflowY: "auto", maxHeight: "320px", paddingRight: "4px" }}>
          {availableMembers.map((m) => (
            <div
              key={m.id}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "8px 12px",
                borderRadius: "8px",
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.06)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                {m.image ? (
                  <img src={m.image} alt="" style={{ width: 30, height: 30, borderRadius: "50%", objectFit: "cover" }} />
                ) : (
                  <div style={{ width: 30, height: 30, borderRadius: "50%", background: "var(--primary)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: "11px", color: "#052e16" }}>
                    {m.name[0]}
                  </div>
                )}
                <div>
                  <div style={{ fontWeight: 700, fontSize: "0.85rem", color: "#f8fafc" }}>
                    {m.name} {m.jerseyNumber ? `(#${m.jerseyNumber})` : ""}
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", gap: "6px" }}>
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
                  }}
                >
                  + Vào B
                </button>
              </div>
            </div>
          ))}

          {availableMembers.length === 0 && (
            <div style={{ textAlign: "center", padding: "20px 0", color: "var(--muted-foreground)", fontSize: "0.8rem" }}>
              Không tìm thấy thành viên khả dụng nào.
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={onClose}
          className="btn btn-secondary"
          style={{ width: "100%", padding: "8px", fontSize: "0.85rem", fontWeight: 700 }}
        >
          Đóng
        </button>
      </div>
    </div>
  );
}
