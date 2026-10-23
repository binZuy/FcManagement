"use client";

import { X } from "lucide-react";
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
  const { teamSide, slotIndex, slot } = activeEmptySlot;

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.7)",
        backdropFilter: "blur(4px)",
        zIndex: 100,
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
        padding: "16px",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="glass-card"
        style={{
          width: "100%",
          maxWidth: "420px",
          padding: "20px",
          borderRadius: "16px",
          background: "#0f172a",
          border: "1px solid var(--border)",
          display: "flex",
          flexDirection: "column",
          gap: "12px",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontWeight: 800, fontSize: "0.95rem", color: "#f8fafc" }}>
            Chọn cầu thủ cho vị trí {slot.fullLabel} ({slot.label})
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{ background: "transparent", border: "none", color: "var(--muted-foreground)", cursor: "pointer" }}
          >
            <X size={18} />
          </button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "6px", maxHeight: "280px", overflowY: "auto" }}>
          {/* Cầu thủ từ ghế dự bị của đội */}
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
                padding: "8px 12px",
                borderRadius: "8px",
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.1)",
                color: "#f8fafc",
                fontSize: "0.82rem",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              <span>{p.name}</span>
              <span style={{ fontSize: "0.7rem", color: "var(--primary)" }}>Từ ghế dự bị ➔</span>
            </button>
          ))}

          {/* Cầu thủ từ danh sách chưa chia */}
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
                padding: "8px 12px",
                borderRadius: "8px",
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.06)",
                color: "#cbd5e1",
                fontSize: "0.82rem",
                cursor: "pointer",
              }}
            >
              <span>{p.name}</span>
              <span style={{ fontSize: "0.7rem", color: "var(--muted-foreground)" }}>Chưa chia ➔</span>
            </button>
          ))}

          {benchPlayers.length === 0 && unassignedPlayers.length === 0 && (
            <div style={{ textAlign: "center", padding: "20px 0", color: "var(--muted-foreground)", fontSize: "0.8rem" }}>
              Không còn cầu thủ dự bị nào. Bạn có thể bấm "+ Thêm người" ở góc trên.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
