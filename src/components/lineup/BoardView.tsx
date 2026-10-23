"use client";

import { X } from "lucide-react";
import { FormationSlot, PitchPlayer, ROLE_COLORS } from "./types";

interface BoardViewProps {
  teamAName: string;
  teamBName: string;
  teamA: PitchPlayer[];
  teamB: PitchPlayer[];
  startersA: PitchPlayer[];
  benchA: PitchPlayer[];
  startersB: PitchPlayer[];
  benchB: PitchPlayer[];
  currentSlots: FormationSlot[];
  onMovePlayer: (
    player: PitchPlayer,
    fromTeam: "TEAM_A" | "TEAM_B" | "UNASSIGNED",
    toTeam: "TEAM_A" | "TEAM_B" | "UNASSIGNED"
  ) => void;
  onPromoteToStarter: (teamKey: "TEAM_A" | "TEAM_B", memberId: string) => void;
}

export function BoardView({
  teamAName,
  teamBName,
  teamA,
  teamB,
  startersA,
  benchA,
  startersB,
  benchB,
  currentSlots,
  onMovePlayer,
  onPromoteToStarter,
}: BoardViewProps) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "14px" }}>
      {/* CỘT ĐỘI A */}
      <div
        style={{
          background: "rgba(37,99,235,0.08)",
          border: "1.5px solid rgba(59,130,246,0.3)",
          borderRadius: "12px",
          padding: "14px",
          display: "flex",
          flexDirection: "column",
          gap: "8px",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
          <span style={{ fontWeight: 800, color: "#60a5fa", fontSize: "0.9rem" }}>
            🔵 {teamAName} ({teamA.length} người)
          </span>
          <span style={{ fontSize: "0.7rem", color: "var(--muted-foreground)" }}>
            {startersA.length} chính · {benchA.length} dự bị
          </span>
        </div>

        {/* Đá chính */}
        <div style={{ fontSize: "0.72rem", fontWeight: 800, color: "#93c5fd", textTransform: "uppercase" }}>
          ⭐ Đội hình chính Sân 7:
        </div>
        {startersA.map((p, idx) => {
          const slot = currentSlots[idx];
          const isGK = idx === 0;
          return (
            <div
              key={p.memberId}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "8px 10px",
                borderRadius: "8px",
                background: isGK ? "rgba(16,185,129,0.15)" : "rgba(15,23,42,0.6)",
                border: isGK ? "1px solid rgba(16,185,129,0.4)" : "1px solid rgba(59,130,246,0.2)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span
                  style={{
                    fontSize: "0.65rem",
                    padding: "1px 5px",
                    borderRadius: "4px",
                    fontWeight: 900,
                    background: isGK ? "#10b981" : ROLE_COLORS[slot?.role]?.bg || "#3b82f6",
                    color: isGK ? "#052e16" : "#fff",
                  }}
                >
                  {isGK ? "🧤 GK" : slot?.label || "HV"}
                </span>
                <span style={{ fontWeight: 700, fontSize: "0.85rem", color: "#f8fafc" }}>
                  {p.name} {p.jerseyNumber ? `(#${p.jerseyNumber})` : ""}
                </span>
              </div>

              <div style={{ display: "flex", gap: "4px" }}>
                <button
                  type="button"
                  onClick={() => onMovePlayer(p, "TEAM_A", "TEAM_B")}
                  className="btn btn-secondary"
                  style={{ padding: "3px 8px", fontSize: "0.72rem", color: "#facc15" }}
                  title={`Chuyển sang ${teamBName}`}
                >
                  Qua B 👉
                </button>
                <button
                  type="button"
                  onClick={() => onMovePlayer(p, "TEAM_A", "UNASSIGNED")}
                  style={{ background: "transparent", border: "none", color: "var(--muted-foreground)", cursor: "pointer", padding: "2px" }}
                  title="Cho ra ngoài"
                >
                  <X size={14} />
                </button>
              </div>
            </div>
          );
        })}

        {/* Ghế dự bị Đội A */}
        {benchA.length > 0 && (
          <>
            <div style={{ fontSize: "0.72rem", fontWeight: 800, color: "var(--muted-foreground)", textTransform: "uppercase", marginTop: "6px" }}>
              🪑 Ghế dự bị:
            </div>
            {benchA.map((p) => (
              <div
                key={p.memberId}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "6px 10px",
                  borderRadius: "6px",
                  background: "rgba(15,23,42,0.4)",
                  border: "1px dashed rgba(255,255,255,0.15)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  {p.isGuest ? (
                    <span style={{ fontSize: "0.62rem", padding: "1px 5px", borderRadius: "4px", background: "rgba(168,85,247,0.25)", color: "#c084fc", fontWeight: 800 }}>
                      👥 Khách
                    </span>
                  ) : (
                    <span style={{ fontSize: "0.68rem", color: "var(--muted-foreground)" }}>Dự bị</span>
                  )}
                  <span style={{ fontWeight: 600, fontSize: "0.82rem", color: "#cbd5e1" }}>{p.name}</span>
                </div>
                <div style={{ display: "flex", gap: "4px" }}>
                  <button
                    type="button"
                    onClick={() => onPromoteToStarter("TEAM_A", p.memberId)}
                    className="btn btn-secondary"
                    style={{ padding: "2px 6px", fontSize: "0.68rem", color: "#4ade80" }}
                  >
                    Lên chính ⬆️
                  </button>
                  <button
                    type="button"
                    onClick={() => onMovePlayer(p, "TEAM_A", "TEAM_B")}
                    className="btn btn-secondary"
                    style={{ padding: "2px 6px", fontSize: "0.68rem", color: "#facc15" }}
                  >
                    Qua B 👉
                  </button>
                </div>
              </div>
            ))}
          </>
        )}

        {teamA.length === 0 && (
          <div style={{ textAlign: "center", padding: "20px 0", color: "var(--muted-foreground)", fontSize: "0.78rem" }}>
            Chưa có ai ở Đội A. Bấm chuyển người hoặc Random!
          </div>
        )}
      </div>

      {/* CỘT ĐỘI B */}
      <div
        style={{
          background: "rgba(234,179,8,0.08)",
          border: "1.5px solid rgba(250,204,21,0.3)",
          borderRadius: "12px",
          padding: "14px",
          display: "flex",
          flexDirection: "column",
          gap: "8px",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
          <span style={{ fontWeight: 800, color: "#facc15", fontSize: "0.9rem" }}>
            🟡 {teamBName} ({teamB.length} người)
          </span>
          <span style={{ fontSize: "0.7rem", color: "var(--muted-foreground)" }}>
            {startersB.length} chính · {benchB.length} dự bị
          </span>
        </div>

        {/* Đá chính */}
        <div style={{ fontSize: "0.72rem", fontWeight: 800, color: "#fef08a", textTransform: "uppercase" }}>
          ⭐ Đội hình chính Sân 7:
        </div>
        {startersB.map((p, idx) => {
          const slot = currentSlots[idx];
          const isGK = idx === 0;
          return (
            <div
              key={p.memberId}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "8px 10px",
                borderRadius: "8px",
                background: isGK ? "rgba(16,185,129,0.15)" : "rgba(15,23,42,0.6)",
                border: isGK ? "1px solid rgba(16,185,129,0.4)" : "1px solid rgba(250,204,21,0.2)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span
                  style={{
                    fontSize: "0.65rem",
                    padding: "1px 5px",
                    borderRadius: "4px",
                    fontWeight: 900,
                    background: isGK ? "#10b981" : ROLE_COLORS[slot?.role]?.bg || "#eab308",
                    color: isGK ? "#052e16" : "#fff",
                  }}
                >
                  {isGK ? "🧤 GK" : slot?.label || "HV"}
                </span>
                <span style={{ fontWeight: 700, fontSize: "0.85rem", color: "#f8fafc" }}>
                  {p.name} {p.jerseyNumber ? `(#${p.jerseyNumber})` : ""}
                </span>
              </div>

              <div style={{ display: "flex", gap: "4px" }}>
                <button
                  type="button"
                  onClick={() => onMovePlayer(p, "TEAM_B", "TEAM_A")}
                  className="btn btn-secondary"
                  style={{ padding: "3px 8px", fontSize: "0.72rem", color: "#60a5fa" }}
                  title={`Chuyển sang ${teamAName}`}
                >
                  👈 Qua A
                </button>
                <button
                  type="button"
                  onClick={() => onMovePlayer(p, "TEAM_B", "UNASSIGNED")}
                  style={{ background: "transparent", border: "none", color: "var(--muted-foreground)", cursor: "pointer", padding: "2px" }}
                  title="Cho ra ngoài"
                >
                  <X size={14} />
                </button>
              </div>
            </div>
          );
        })}

        {/* Ghế dự bị Đội B */}
        {benchB.length > 0 && (
          <>
            <div style={{ fontSize: "0.72rem", fontWeight: 800, color: "var(--muted-foreground)", textTransform: "uppercase", marginTop: "6px" }}>
              🪑 Ghế dự bị:
            </div>
            {benchB.map((p) => (
              <div
                key={p.memberId}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "6px 10px",
                  borderRadius: "6px",
                  background: "rgba(15,23,42,0.4)",
                  border: "1px dashed rgba(255,255,255,0.15)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  {p.isGuest ? (
                    <span style={{ fontSize: "0.62rem", padding: "1px 5px", borderRadius: "4px", background: "rgba(168,85,247,0.25)", color: "#c084fc", fontWeight: 800 }}>
                      👥 Khách
                    </span>
                  ) : (
                    <span style={{ fontSize: "0.68rem", color: "var(--muted-foreground)" }}>Dự bị</span>
                  )}
                  <span style={{ fontWeight: 600, fontSize: "0.82rem", color: "#cbd5e1" }}>{p.name}</span>
                </div>
                <div style={{ display: "flex", gap: "4px" }}>
                  <button
                    type="button"
                    onClick={() => onPromoteToStarter("TEAM_B", p.memberId)}
                    className="btn btn-secondary"
                    style={{ padding: "2px 6px", fontSize: "0.68rem", color: "#4ade80" }}
                  >
                    Lên chính ⬆️
                  </button>
                  <button
                    type="button"
                    onClick={() => onMovePlayer(p, "TEAM_B", "TEAM_A")}
                    className="btn btn-secondary"
                    style={{ padding: "2px 6px", fontSize: "0.68rem", color: "#60a5fa" }}
                  >
                    👈 Qua A
                  </button>
                </div>
              </div>
            ))}
          </>
        )}

        {teamB.length === 0 && (
          <div style={{ textAlign: "center", padding: "20px 0", color: "var(--muted-foreground)", fontSize: "0.78rem" }}>
            Chưa có ai ở Đội B. Bấm chuyển người hoặc Random!
          </div>
        )}
      </div>
    </div>
  );
}
