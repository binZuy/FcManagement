"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
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
  onRemoveFromMatch?: (player: PitchPlayer) => void;
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
  onRemoveFromMatch,
}: PlayerActionSheetProps) {
  const [mounted, setMounted] = useState(false);
  const { player, currentTeam, isStarter } = selectedPlayer;
  const isTeamAssigned = currentTeam === "TEAM_A" || currentTeam === "TEAM_B";

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
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: "1rem", color: "#f8fafc" }}>
              {player.name} {player.jerseyNumber ? `(#${player.jerseyNumber})` : ""}
            </div>
            <div style={{ fontSize: "0.74rem", color: "var(--muted-foreground)", marginTop: "2px" }}>
              {currentTeam === "TEAM_A" ? teamAName : currentTeam === "TEAM_B" ? teamBName : "Chưa chia"}
              {isStarter ? " · Đá chính" : " · Dự bị"}
              {player.isGuest && (
                <span style={{ display: "block", color: "#c084fc", fontWeight: 700, marginTop: "2px" }}>
                  Bạn {player.hostName || "thành viên"}
                </span>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{ background: "transparent", border: "none", color: "var(--muted-foreground)", cursor: "pointer", padding: "4px" }}
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
                textAlign: "center",
              }}
            >
              Làm thủ môn (GK)
            </button>
          )}

          {/* Đổi chỗ với cầu thủ khác trong đội */}
          {isTeamAssigned && (
            <div>
              <div style={{ fontSize: "0.72rem", fontWeight: 800, color: "var(--muted-foreground)", marginBottom: "4px" }}>
                Đổi vị trí:
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
                      {p.name.split(" ").slice(-1)[0]}
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
                textAlign: "center",
              }}
            >
              Vào đá chính
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
                textAlign: "center",
              }}
            >
              Xuống dự bị
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
                textAlign: "center",
              }}
            >
              Sang {teamAName}
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
                textAlign: "center",
              }}
            >
              Sang {teamBName}
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
                textAlign: "center",
              }}
            >
              Cho ra dự bị chung
            </button>
          )}

          {onRemoveFromMatch && (
            <button
              type="button"
              onClick={() => onRemoveFromMatch(player)}
              style={{
                padding: "8px",
                borderRadius: "8px",
                border: "1px solid rgba(239,68,68,0.3)",
                background: "rgba(239,68,68,0.1)",
                color: "#f87171",
                fontWeight: 700,
                fontSize: "0.78rem",
                cursor: "pointer",
                textAlign: "center",
              }}
            >
              Xóa khỏi trận (Vắng)
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
