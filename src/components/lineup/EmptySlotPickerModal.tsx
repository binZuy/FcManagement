"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, UserPlus, Users } from "lucide-react";
import { FormationSlot, PitchPlayer } from "./types";

interface EmptySlotPickerModalProps {
  activeEmptySlot: {
    teamSide: "TEAM_A" | "TEAM_B";
    slotIndex: number;
    slot: FormationSlot;
  };
  benchPlayers: PitchPlayer[];
  unassignedPlayers: PitchPlayer[];
  onClose: () => void;
  onPromoteFromBench: (teamKey: "TEAM_A" | "TEAM_B", memberId: string, slotIndex: number) => void;
  onAssignFromUnassigned: (player: PitchPlayer, targetTeam: "TEAM_A" | "TEAM_B") => void;
}

export function EmptySlotPickerModal({
  activeEmptySlot,
  benchPlayers,
  unassignedPlayers,
  onClose,
  onPromoteFromBench,
  onAssignFromUnassigned,
}: EmptySlotPickerModalProps) {
  const [mounted, setMounted] = useState(false);
  const { teamSide, slotIndex, slot } = activeEmptySlot;
  const isTeamA = teamSide === "TEAM_A";

  useEffect(() => {
    setMounted(true);
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, []);

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
          maxWidth: "420px",
          maxHeight: "85dvh",
          padding: "20px",
          borderRadius: "16px",
          background: "#0f172a",
          border: isTeamA
            ? "1.5px solid rgba(59,130,246,0.4)"
            : "1.5px solid rgba(250,204,21,0.4)",
          display: "flex",
          flexDirection: "column",
          gap: "12px",
          boxShadow: "0 20px 60px rgba(0,0,0,0.85)",
          overflow: "hidden",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
          <div style={{ fontWeight: 800, fontSize: "0.95rem", color: "#f8fafc", display: "flex", alignItems: "center", gap: "6px" }}>
            <UserPlus size={16} color={isTeamA ? "#60a5fa" : "#facc15"} />
            <span>Vào vị trí {slot.fullLabel} ({slot.label})</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{ background: "transparent", border: "none", color: "var(--muted-foreground)", cursor: "pointer", padding: "4px" }}
          >
            <X size={18} />
          </button>
        </div>

        <div style={{ fontSize: "0.74rem", color: "var(--muted-foreground)", flexShrink: 0 }}>
          Chọn cầu thủ đưa vào đá chính cho {isTeamA ? "Đội A (Áo Xanh)" : "Đội B (Áo Vàng)"}:
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "8px", overflowY: "auto", flex: 1, paddingRight: "4px" }}>
          {/* Cầu thủ từ ghế dự bị của đội */}
          {benchPlayers.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <div style={{ fontSize: "0.72rem", fontWeight: 800, color: isTeamA ? "#60a5fa" : "#facc15", display: "flex", alignItems: "center", gap: "4px" }}>
                <span>Dự bị ({benchPlayers.length}):</span>
              </div>
              {benchPlayers.map((p) => (
                <button
                  key={p.memberId}
                  type="button"
                  onClick={() => {
                    onPromoteFromBench(teamSide, p.memberId, slotIndex);
                    onClose();
                  }}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "9px 12px",
                    borderRadius: "8px",
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    color: "#f8fafc",
                    fontSize: "0.82rem",
                    fontWeight: 700,
                    cursor: "pointer",
                    textAlign: "left",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", overflow: "hidden", whiteSpace: "nowrap" }}>
                    {p.image ? (
                      <img src={p.image} alt="" style={{ width: 24, height: 24, borderRadius: "50%", objectFit: "cover" }} />
                    ) : (
                      <span style={{ color: isTeamA ? "#60a5fa" : "#facc15", fontSize: "0.72rem" }}>
                        {p.jerseyNumber ? `#${p.jerseyNumber}` : "•"}
                      </span>
                    )}
                    <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name}</span>
                    {p.isGuest && (
                      <span style={{ fontSize: "0.6rem", padding: "1px 4px", borderRadius: "3px", background: "rgba(168,85,247,0.25)", color: "#c084fc", fontWeight: 800 }}>
                        Khách
                      </span>
                    )}
                  </div>
                  <span style={{ fontSize: "0.74rem", color: isTeamA ? "#60a5fa" : "#facc15", fontWeight: 800, whiteSpace: "nowrap" }}>
                    Vào sân
                  </span>
                </button>
              ))}
            </div>
          )}

          {/* Cầu thủ từ danh sách chưa chia */}
          {unassignedPlayers.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginTop: benchPlayers.length > 0 ? "8px" : "0" }}>
              <div style={{ fontSize: "0.72rem", fontWeight: 800, color: "var(--muted-foreground)", display: "flex", alignItems: "center", gap: "4px" }}>
                <span>Chưa chia đội ({unassignedPlayers.length}):</span>
              </div>
              {unassignedPlayers.map((p) => (
                <button
                  key={p.memberId}
                  type="button"
                  onClick={() => {
                    onAssignFromUnassigned(p, teamSide);
                    onClose();
                  }}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "9px 12px",
                    borderRadius: "8px",
                    background: "rgba(255,255,255,0.03)",
                    border: "1px solid rgba(255,255,255,0.06)",
                    color: "#cbd5e1",
                    fontSize: "0.82rem",
                    cursor: "pointer",
                    textAlign: "left",
                  }}
                >
                  <span>{p.name}</span>
                  <span style={{ fontSize: "0.74rem", color: "var(--muted-foreground)", whiteSpace: "nowrap" }}>
                    Vào đội
                  </span>
                </button>
              ))}
            </div>
          )}

          {benchPlayers.length === 0 && unassignedPlayers.length === 0 && (
            <div style={{ textAlign: "center", padding: "24px 0", color: "var(--muted-foreground)", fontSize: "0.82rem" }}>
              Không còn cầu thủ dự bị nào. Bạn có thể bấm nút "+ Thêm người" ở phía trên.
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
