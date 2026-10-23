"use client";

import { X } from "lucide-react";
import { PitchPlayer } from "./types";

interface PlayerActionSheetProps {
  selectedPlayer: {
    player: PitchPlayer;
    currentTeam: "TEAM_A" | "TEAM_B" | "UNASSIGNED";
    slotIndex?: number;
    isStarter?: boolean;
  };
  teamAName: string;
  teamBName: string;
  teammates: PitchPlayer[];
  onClose: () => void;
  onSetGoalkeeper: (teamKey: "TEAM_A" | "TEAM_B", memberId: string) => void;
  onSwapWithinTeam: (teamKey: "TEAM_A" | "TEAM_B", p1Id: string, p2Id: string) => void;
  onPromoteToStarter: (teamKey: "TEAM_A" | "TEAM_B", memberId: string) => void;
  onSendToBench: (teamKey: "TEAM_A" | "TEAM_B", memberId: string) => void;
  onMovePlayer: (
    player: PitchPlayer,
    fromTeam: "TEAM_A" | "TEAM_B" | "UNASSIGNED",
    toTeam: "TEAM_A" | "TEAM_B" | "UNASSIGNED"
  ) => void;
}

export function PlayerActionSheet({
  selectedPlayer,
  teamAName,
  teamBName,
  teammates,
  onClose,
  onSetGoalkeeper,
  onSwapWithinTeam,
  onPromoteToStarter,
  onSendToBench,
  onMovePlayer,
}: PlayerActionSheetProps) {
  const { player, currentTeam, isStarter } = selectedPlayer;
  const isTeamAssigned = currentTeam === "TEAM_A" || currentTeam === "TEAM_B";

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.68)",
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
          border: "1px solid rgba(250,204,21,0.4)",
          display: "flex",
          flexDirection: "column",
          gap: "12px",
          boxShadow: "0 10px 40px rgba(0,0,0,0.85)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span style={{ fontSize: "1.4rem" }}>{player.isGuest ? "👥" : "⚽"}</span>
            <div>
              <div style={{ fontWeight: 800, fontSize: "1rem", color: "#f8fafc" }}>
                {player.name} {player.jerseyNumber ? `(#${player.jerseyNumber})` : ""}
              </div>
              <div style={{ fontSize: "0.72rem", color: "var(--muted-foreground)" }}>
                Đang ở: {currentTeam === "TEAM_A" ? teamAName : currentTeam === "TEAM_B" ? teamBName : "Chưa chia"}
                {isStarter ? " · Đang đá chính" : " · Ghế dự bị"}
                {player.isGuest && (
                  <span style={{ display: "block", color: "#c084fc", fontWeight: 700, marginTop: "2px" }}>
                    👥 Bạn đi cùng của {player.hostName || "thành viên"} (Ưu tiên cùng đội)
                  </span>
                )}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{ background: "transparent", border: "none", color: "var(--muted-foreground)", cursor: "pointer" }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Menu hành động */}
        <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "4px" }}>
          {/* Đặt làm Thủ môn */}
          {isTeamAssigned && (
            <button
              type="button"
              onClick={() => onSetGoalkeeper(currentTeam as "TEAM_A" | "TEAM_B", player.memberId)}
              style={{
                padding: "10px",
                borderRadius: "8px",
                border: "none",
                background: "linear-gradient(135deg, #10b981, #047857)",
                color: "white",
                fontWeight: 800,
                fontSize: "0.85rem",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "6px",
              }}
            >
              🧤 Bắt gôn (Đặt làm Thủ Môn GK)
            </button>
          )}

          {/* Đổi chỗ với cầu thủ khác trong đội */}
          {isTeamAssigned && (
            <div>
              <div style={{ fontSize: "0.72rem", fontWeight: 800, color: "var(--muted-foreground)", marginBottom: "4px" }}>
                🔄 Hoán đổi vị trí với đồng đội:
              </div>
              <div style={{ display: "flex", gap: "6px", overflowX: "auto", paddingBottom: "4px" }}>
                {teammates
                  .filter((p) => p.memberId !== player.memberId)
                  .map((p) => (
                    <button
                      key={p.memberId}
                      type="button"
                      onClick={() => onSwapWithinTeam(currentTeam as "TEAM_A" | "TEAM_B", player.memberId, p.memberId)}
                      style={{
                        padding: "6px 10px",
                        borderRadius: "6px",
                        border: "1px solid rgba(255,255,255,0.15)",
                        background: "rgba(255,255,255,0.06)",
                        color: "#f8fafc",
                        fontSize: "0.75rem",
                        fontWeight: 700,
                        whiteSpace: "nowrap",
                        cursor: "pointer",
                      }}
                    >
                      ⇄ {p.name.split(" ").slice(-1)[0]}
                    </button>
                  ))}
              </div>
            </div>
          )}

          {/* Đưa lên đá chính nếu đang ở ghế dự bị */}
          {isTeamAssigned && !isStarter && (
            <button
              type="button"
              onClick={() => onPromoteToStarter(currentTeam as "TEAM_A" | "TEAM_B", player.memberId)}
              style={{
                padding: "10px",
                borderRadius: "8px",
                border: "none",
                background: "linear-gradient(135deg, #0284c7, #0369a1)",
                color: "white",
                fontWeight: 800,
                fontSize: "0.85rem",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "6px",
              }}
            >
              ⭐ Đưa vào sân đá chính
            </button>
          )}

          {/* Xuống ghế dự bị nếu đang đá chính */}
          {isTeamAssigned && isStarter && (
            <button
              type="button"
              onClick={() => onSendToBench(currentTeam as "TEAM_A" | "TEAM_B", player.memberId)}
              style={{
                padding: "9px",
                borderRadius: "8px",
                border: "1px solid rgba(255,255,255,0.15)",
                background: "rgba(255,255,255,0.06)",
                color: "var(--card-foreground)",
                fontWeight: 700,
                fontSize: "0.82rem",
                cursor: "pointer",
              }}
            >
              🪑 Xuống ghế dự bị
            </button>
          )}

          {/* Chuyển sang đội đối phương */}
          {currentTeam !== "TEAM_A" && (
            <button
              type="button"
              onClick={() => onMovePlayer(player, currentTeam, "TEAM_A")}
              style={{
                padding: "10px",
                borderRadius: "8px",
                border: "none",
                background: "linear-gradient(135deg, #2563eb, #1d4ed8)",
                color: "white",
                fontWeight: 800,
                fontSize: "0.85rem",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "6px",
              }}
            >
              🔵 Chuyển sang {teamAName}
            </button>
          )}

          {currentTeam !== "TEAM_B" && (
            <button
              type="button"
              onClick={() => onMovePlayer(player, currentTeam, "TEAM_B")}
              style={{
                padding: "10px",
                borderRadius: "8px",
                border: "none",
                background: "linear-gradient(135deg, #eab308, #ca8a04)",
                color: "#0f172a",
                fontWeight: 800,
                fontSize: "0.85rem",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "6px",
              }}
            >
              🟡 Chuyển sang {teamBName}
            </button>
          )}

          {currentTeam !== "UNASSIGNED" && (
            <button
              type="button"
              onClick={() => onMovePlayer(player, currentTeam, "UNASSIGNED")}
              style={{
                padding: "8px",
                borderRadius: "8px",
                border: "1px solid rgba(255,255,255,0.1)",
                background: "transparent",
                color: "var(--muted-foreground)",
                fontWeight: 600,
                fontSize: "0.78rem",
                cursor: "pointer",
              }}
            >
              ⏳ Cho ra ngoài danh sách (Chưa chia đội)
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
