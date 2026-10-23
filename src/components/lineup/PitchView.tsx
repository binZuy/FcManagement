"use client";

import { FormationSlot, PitchPlayer, ROLE_COLORS } from "./types";

interface PitchViewProps {
  teamAName: string;
  teamBName: string;
  currentSlots: FormationSlot[];
  startersA: PitchPlayer[];
  benchA: PitchPlayer[];
  startersB: PitchPlayer[];
  benchB: PitchPlayer[];
  onSelectPlayer: (data: {
    player: PitchPlayer;
    currentTeam: "TEAM_A" | "TEAM_B" | "UNASSIGNED";
    slotIndex?: number;
    isStarter?: boolean;
  }) => void;
  onSelectEmptySlot: (data: {
    teamSide: "TEAM_A" | "TEAM_B";
    slotIndex: number;
    slot: FormationSlot;
  }) => void;
}

export function PitchView({
  teamAName,
  teamBName,
  currentSlots,
  startersA,
  benchA,
  startersB,
  benchB,
  onSelectPlayer,
  onSelectEmptySlot,
}: PitchViewProps) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "100%", gap: "14px" }}>
      {/* KHUNG SÂN CỎ 3D */}
      <div
        style={{
          width: "100%",
          maxWidth: "520px",
          height: "740px",
          position: "relative",
          borderRadius: "16px",
          overflow: "hidden",
          border: "3px solid rgba(255, 255, 255, 0.75)",
          boxShadow: "0 16px 45px rgba(0,0,0,0.7), inset 0 0 50px rgba(0,0,0,0.35)",
          background: `repeating-linear-gradient(
            to bottom,
            #15803d 0px,
            #15803d 44px,
            #16a34a 44px,
            #16a34a 88px
          )`,
        }}
      >
        {/* Đường biên trong */}
        <div
          style={{
            position: "absolute",
            inset: "12px",
            border: "2px solid rgba(255,255,255,0.75)",
            pointerEvents: "none",
          }}
        />

        {/* Vạch giữa sân */}
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "12px",
            right: "12px",
            height: "2px",
            background: "rgba(255,255,255,0.75)",
            pointerEvents: "none",
          }}
        />

        {/* Vòng tròn trung tâm */}
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            width: "110px",
            height: "110px",
            transform: "translate(-50%, -50%)",
            borderRadius: "50%",
            border: "2px solid rgba(255,255,255,0.75)",
            pointerEvents: "none",
          }}
        />
        {/* Chấm phát bóng giữa sân */}
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            width: "8px",
            height: "8px",
            transform: "translate(-50%, -50%)",
            borderRadius: "50%",
            background: "rgba(255,255,255,0.9)",
            pointerEvents: "none",
          }}
        />

        {/* Vòng cấm địa trên (Đội A) */}
        <div
          style={{
            position: "absolute",
            top: "12px",
            left: "50%",
            transform: "translateX(-50%)",
            width: "190px",
            height: "90px",
            border: "2px solid rgba(255,255,255,0.75)",
            borderTop: "none",
            pointerEvents: "none",
          }}
        />
        {/* Cầu môn trên */}
        <div
          style={{
            position: "absolute",
            top: "12px",
            left: "50%",
            transform: "translateX(-50%)",
            width: "90px",
            height: "36px",
            border: "2px solid rgba(255,255,255,0.75)",
            borderTop: "none",
            pointerEvents: "none",
          }}
        />

        {/* Vòng cấm địa dưới (Đội B) */}
        <div
          style={{
            position: "absolute",
            bottom: "12px",
            left: "50%",
            transform: "translateX(-50%)",
            width: "190px",
            height: "90px",
            border: "2px solid rgba(255,255,255,0.75)",
            borderBottom: "none",
            pointerEvents: "none",
          }}
        />
        {/* Cầu môn dưới */}
        <div
          style={{
            position: "absolute",
            bottom: "12px",
            left: "50%",
            transform: "translateX(-50%)",
            width: "90px",
            height: "36px",
            border: "2px solid rgba(255,255,255,0.75)",
            borderBottom: "none",
            pointerEvents: "none",
          }}
        />

        {/* TAG TÊN ĐỘI CHÌM TRÊN MẶT SÂN */}
        <div
          style={{
            position: "absolute",
            top: "22px",
            left: "18px",
            fontSize: "0.72rem",
            fontWeight: 900,
            color: "rgba(255,255,255,0.45)",
            letterSpacing: "1px",
            pointerEvents: "none",
          }}
        >
          🔵 {teamAName.toUpperCase()}
        </div>
        <div
          style={{
            position: "absolute",
            bottom: "22px",
            right: "18px",
            fontSize: "0.72rem",
            fontWeight: 900,
            color: "rgba(255,255,255,0.45)",
            letterSpacing: "1px",
            pointerEvents: "none",
          }}
        >
          🟡 {teamBName.toUpperCase()}
        </div>

        {/* ── CÁC VỊ TRÍ ĐỘI A (NỬA TRÊN SÂN) ── */}
        {currentSlots.map((slot, sIdx) => {
          const player = startersA[sIdx];
          const isGK = slot.role === "GK";
          return (
            <div
              key={`a-${slot.id}`}
              style={{
                position: "absolute",
                left: `${slot.x}%`,
                top: `${slot.yA}%`,
                transform: "translate(-50%, -50%)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                cursor: "pointer",
                zIndex: 20,
              }}
              onClick={() => {
                if (player) {
                  onSelectPlayer({
                    player,
                    currentTeam: "TEAM_A",
                    slotIndex: sIdx,
                    isStarter: true,
                  });
                } else {
                  onSelectEmptySlot({
                    teamSide: "TEAM_A",
                    slotIndex: sIdx,
                    slot,
                  });
                }
              }}
            >
              {player ? (
                <>
                  <div
                    style={{
                      width: "42px",
                      height: "42px",
                      borderRadius: "50%",
                      background: isGK
                        ? "linear-gradient(135deg, #10b981, #047857)"
                        : "linear-gradient(135deg, #2563eb, #1e40af)",
                      border: isGK ? "2.5px solid #6ee7b7" : "2.5px solid #93c5fd",
                      boxShadow: isGK
                        ? "0 4px 12px rgba(16,185,129,0.7)"
                        : "0 4px 12px rgba(0,0,0,0.6)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "white",
                      fontWeight: 900,
                      fontSize: "0.85rem",
                      position: "relative",
                    }}
                  >
                    {player.image ? (
                      <img
                        src={player.image}
                        alt=""
                        style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" }}
                      />
                    ) : (
                      player.jerseyNumber ? `#${player.jerseyNumber}` : player.name[0]
                    )}

                    {player.jerseyNumber && player.image && (
                      <span
                        style={{
                          position: "absolute",
                          bottom: -4,
                          right: -4,
                          background: isGK ? "#047857" : "#1e40af",
                          color: "white",
                          fontSize: "0.58rem",
                          padding: "1px 4px",
                          borderRadius: "4px",
                          fontWeight: 800,
                        }}
                      >
                        #{player.jerseyNumber}
                      </span>
                    )}

                    <span
                      style={{
                        position: "absolute",
                        top: -6,
                        left: "50%",
                        transform: "translateX(-50%)",
                        background: ROLE_COLORS[slot.role]?.bg || "rgba(0,0,0,0.6)",
                        color: ROLE_COLORS[slot.role]?.text || "#fff",
                        border: `1px solid ${ROLE_COLORS[slot.role]?.border || "#fff"}`,
                        fontSize: "0.55rem",
                        fontWeight: 900,
                        padding: "0 4px",
                        borderRadius: "4px",
                        lineHeight: "13px",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {isGK ? "🧤 GK" : slot.label}
                    </span>
                  </div>

                  <span
                    style={{
                      fontSize: "0.7rem",
                      fontWeight: 800,
                      color: "white",
                      textShadow: "0 2px 4px rgba(0,0,0,0.95)",
                      background: "rgba(15,23,42,0.85)",
                      padding: "1px 6px",
                      borderRadius: "4px",
                      marginTop: "3px",
                      maxWidth: "75px",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {player.name.split(" ").slice(-1)[0]}
                  </span>
                </>
              ) : (
                <div
                  style={{
                    width: "38px",
                    height: "38px",
                    borderRadius: "50%",
                    border: "2px dashed rgba(255,255,255,0.5)",
                    background: "rgba(0,0,0,0.2)",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "rgba(255,255,255,0.7)",
                    fontSize: "0.65rem",
                    fontWeight: 800,
                  }}
                >
                  <span>+</span>
                  <span style={{ fontSize: "0.52rem", marginTop: "-2px" }}>{slot.label}</span>
                </div>
              )}
            </div>
          );
        })}

        {/* ── CÁC VỊ TRÍ ĐỘI B (NỬA DƯỚI SÂN) ── */}
        {currentSlots.map((slot, sIdx) => {
          const player = startersB[sIdx];
          const isGK = slot.role === "GK";
          return (
            <div
              key={`b-${slot.id}`}
              style={{
                position: "absolute",
                left: `${slot.x}%`,
                top: `${slot.yB}%`,
                transform: "translate(-50%, -50%)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                cursor: "pointer",
                zIndex: 20,
              }}
              onClick={() => {
                if (player) {
                  onSelectPlayer({
                    player,
                    currentTeam: "TEAM_B",
                    slotIndex: sIdx,
                    isStarter: true,
                  });
                } else {
                  onSelectEmptySlot({
                    teamSide: "TEAM_B",
                    slotIndex: sIdx,
                    slot,
                  });
                }
              }}
            >
              {player ? (
                <>
                  <div
                    style={{
                      width: "42px",
                      height: "42px",
                      borderRadius: "50%",
                      background: isGK
                        ? "linear-gradient(135deg, #10b981, #047857)"
                        : "linear-gradient(135deg, #eab308, #ca8a04)",
                      border: isGK ? "2.5px solid #6ee7b7" : "2.5px solid #fef08a",
                      boxShadow: isGK
                        ? "0 4px 12px rgba(16,185,129,0.7)"
                        : "0 4px 12px rgba(0,0,0,0.6)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: isGK ? "white" : "#0f172a",
                      fontWeight: 900,
                      fontSize: "0.85rem",
                      position: "relative",
                    }}
                  >
                    {player.image ? (
                      <img
                        src={player.image}
                        alt=""
                        style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" }}
                      />
                    ) : (
                      player.jerseyNumber ? `#${player.jerseyNumber}` : player.name[0]
                    )}

                    {player.jerseyNumber && player.image && (
                      <span
                        style={{
                          position: "absolute",
                          bottom: -4,
                          right: -4,
                          background: isGK ? "#047857" : "#ca8a04",
                          color: "white",
                          fontSize: "0.58rem",
                          padding: "1px 4px",
                          borderRadius: "4px",
                          fontWeight: 800,
                        }}
                      >
                        #{player.jerseyNumber}
                      </span>
                    )}

                    <span
                      style={{
                        position: "absolute",
                        top: -6,
                        left: "50%",
                        transform: "translateX(-50%)",
                        background: ROLE_COLORS[slot.role]?.bg || "rgba(0,0,0,0.6)",
                        color: ROLE_COLORS[slot.role]?.text || "#fff",
                        border: `1px solid ${ROLE_COLORS[slot.role]?.border || "#fff"}`,
                        fontSize: "0.55rem",
                        fontWeight: 900,
                        padding: "0 4px",
                        borderRadius: "4px",
                        lineHeight: "13px",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {isGK ? "🧤 GK" : slot.label}
                    </span>
                  </div>

                  <span
                    style={{
                      fontSize: "0.7rem",
                      fontWeight: 800,
                      color: isGK ? "#6ee7b7" : "#fef08a",
                      textShadow: "0 2px 4px rgba(0,0,0,0.95)",
                      background: "rgba(15,23,42,0.85)",
                      padding: "1px 6px",
                      borderRadius: "4px",
                      marginTop: "3px",
                      maxWidth: "75px",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {player.name.split(" ").slice(-1)[0]}
                  </span>
                </>
              ) : (
                <div
                  style={{
                    width: "38px",
                    height: "38px",
                    borderRadius: "50%",
                    border: "2px dashed rgba(255,255,255,0.5)",
                    background: "rgba(0,0,0,0.2)",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "rgba(255,255,255,0.7)",
                    fontSize: "0.65rem",
                    fontWeight: 800,
                  }}
                >
                  <span>+</span>
                  <span style={{ fontSize: "0.52rem", marginTop: "-2px" }}>{slot.label}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* KHU VỰC GHẾ DỰ BỊ SÂN 7 (KHI ĐỘI CÓ > 7 CẦU THỦ) */}
      {(benchA.length > 0 || benchB.length > 0) && (
        <div style={{ width: "100%", maxWidth: "520px", display: "flex", flexDirection: "column", gap: "10px" }}>
          {/* Dự bị Đội A */}
          {benchA.length > 0 && (
            <div style={{ background: "rgba(37,99,235,0.08)", border: "1px solid rgba(59,130,246,0.25)", borderRadius: "10px", padding: "10px 14px" }}>
              <div style={{ fontSize: "0.75rem", fontWeight: 800, color: "#60a5fa", marginBottom: "6px", display: "flex", alignItems: "center", gap: "6px" }}>
                🪑 Ghế dự bị {teamAName} ({benchA.length} người) - Chạm để thay vào sân:
              </div>
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                {benchA.map((p, idx) => (
                  <button
                    key={p.memberId}
                    type="button"
                    onClick={() => onSelectPlayer({ player: p, currentTeam: "TEAM_A", isStarter: false, slotIndex: 7 + idx })}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      padding: "4px 8px",
                      borderRadius: "6px",
                      background: "rgba(15,23,42,0.6)",
                      border: p.isGuest ? "1px solid rgba(168,85,247,0.4)" : "1px solid rgba(59,130,246,0.3)",
                      color: "#f8fafc",
                      fontSize: "0.76rem",
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    {p.isGuest ? (
                      <span style={{ fontSize: "0.65rem", padding: "1px 5px", borderRadius: "4px", background: "rgba(168,85,247,0.25)", color: "#c084fc", fontWeight: 800 }}>
                        👥 Khách
                      </span>
                    ) : (
                      <span style={{ color: "#60a5fa", fontSize: "0.7rem" }}>{p.jerseyNumber ? `#${p.jerseyNumber}` : "•"}</span>
                    )}
                    <span>{p.name}</span>
                    <span style={{ fontSize: "0.65rem", color: "#93c5fd" }}>🔄</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Dự bị Đội B */}
          {benchB.length > 0 && (
            <div style={{ background: "rgba(234,179,8,0.08)", border: "1px solid rgba(250,204,21,0.25)", borderRadius: "10px", padding: "10px 14px" }}>
              <div style={{ fontSize: "0.75rem", fontWeight: 800, color: "#facc15", marginBottom: "6px", display: "flex", alignItems: "center", gap: "6px" }}>
                🪑 Ghế dự bị {teamBName} ({benchB.length} người) - Chạm để thay vào sân:
              </div>
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                {benchB.map((p, idx) => (
                  <button
                    key={p.memberId}
                    type="button"
                    onClick={() => onSelectPlayer({ player: p, currentTeam: "TEAM_B", isStarter: false, slotIndex: 7 + idx })}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      padding: "4px 8px",
                      borderRadius: "6px",
                      background: "rgba(15,23,42,0.6)",
                      border: p.isGuest ? "1px solid rgba(168,85,247,0.4)" : "1px solid rgba(250,204,21,0.3)",
                      color: "#f8fafc",
                      fontSize: "0.76rem",
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    {p.isGuest ? (
                      <span style={{ fontSize: "0.65rem", padding: "1px 5px", borderRadius: "4px", background: "rgba(168,85,247,0.25)", color: "#c084fc", fontWeight: 800 }}>
                        👥 Khách
                      </span>
                    ) : (
                      <span style={{ color: "#facc15", fontSize: "0.7rem" }}>{p.jerseyNumber ? `#${p.jerseyNumber}` : "•"}</span>
                    )}
                    <span>{p.name}</span>
                    <span style={{ fontSize: "0.65rem", color: "#fef08a" }}>🔄</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
