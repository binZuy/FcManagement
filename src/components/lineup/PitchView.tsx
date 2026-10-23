"use client";

import { useState } from "react";
import { FormationSlot, PitchPlayer, ROLE_COLORS } from "./types";

interface PitchViewProps {
  teamAName: string;
  teamBName: string;
  currentSlots: FormationSlot[];
  startersA: PitchPlayer[];
  benchA: PitchPlayer[];
  startersB: PitchPlayer[];
  benchB: PitchPlayer[];
  onSwapPlayers?: (p1Id: string, p2Id: string) => void;
  onMoveToSlot?: (memberId: string, teamKey: "TEAM_A" | "TEAM_B", targetIndex: number) => void;
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
  onSwapPlayers,
  onMoveToSlot,
  onSelectPlayer,
  onSelectEmptySlot,
}: PitchViewProps) {
  // State phục vụ Tap-to-Swap (chạm 1 người -> chạm người khác để đổi vị trí/vào sân)
  const [activeSwapPlayer, setActiveSwapPlayer] = useState<{
    player: PitchPlayer;
    teamSide: "TEAM_A" | "TEAM_B";
    isStarter: boolean;
    slotIndex?: number;
  } | null>(null);

  // State phục vụ Drag and Drop feedback
  const [draggedPlayerId, setDraggedPlayerId] = useState<string | null>(null);
  const [dragOverKey, setDragOverKey] = useState<string | null>(null);

  // Xử lý chạm cầu thủ (trên sân hoặc dự bị)
  const handlePlayerClick = (
    player: PitchPlayer,
    teamSide: "TEAM_A" | "TEAM_B",
    isStarter: boolean,
    slotIndex?: number
  ) => {
    // 1. Nếu chưa chọn ai: Chọn người này làm source để swap / thay người
    if (!activeSwapPlayer) {
      setActiveSwapPlayer({ player, teamSide, isStarter, slotIndex });
      return;
    }

    // 2. Nếu chạm lại chính người đang chọn: Hủy chọn
    if (activeSwapPlayer.player.memberId === player.memberId) {
      setActiveSwapPlayer(null);
      return;
    }

    // 3. Nếu chạm vào người khác: Thực hiện hoán đổi ngay lập tức!
    if (onSwapPlayers) {
      onSwapPlayers(activeSwapPlayer.player.memberId, player.memberId);
    }
    setActiveSwapPlayer(null);
  };

  // Xử lý chạm vào vị trí trống trên sân
  const handleSlotClick = (
    teamSide: "TEAM_A" | "TEAM_B",
    slotIndex: number,
    slot: FormationSlot
  ) => {
    if (activeSwapPlayer) {
      // Đưa cầu thủ đang chọn vào vị trí trống này
      if (onMoveToSlot) {
        onMoveToSlot(activeSwapPlayer.player.memberId, teamSide, slotIndex);
      }
      setActiveSwapPlayer(null);
    } else {
      // Mở modal chọn người vào slot trống
      onSelectEmptySlot({ teamSide, slotIndex, slot });
    }
  };

  // Drag & Drop Handlers
  const handleDragStart = (
    e: React.DragEvent,
    player: PitchPlayer,
    teamSide: "TEAM_A" | "TEAM_B",
    isStarter: boolean,
    slotIndex?: number
  ) => {
    e.dataTransfer.setData(
      "application/json",
      JSON.stringify({ memberId: player.memberId, teamSide, isStarter, slotIndex })
    );
    e.dataTransfer.effectAllowed = "move";
    setDraggedPlayerId(player.memberId);
  };

  const handleDragEnd = () => {
    setDraggedPlayerId(null);
    setDragOverKey(null);
  };

  const handleDragOver = (e: React.DragEvent, key: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (dragOverKey !== key) {
      setDragOverKey(key);
    }
  };

  const handleDropOnPlayer = (e: React.DragEvent, targetPlayer: PitchPlayer) => {
    e.preventDefault();
    setDragOverKey(null);
    setDraggedPlayerId(null);
    try {
      const raw = e.dataTransfer.getData("application/json");
      if (!raw) return;
      const data = JSON.parse(raw);
      if (data.memberId && data.memberId !== targetPlayer.memberId && onSwapPlayers) {
        onSwapPlayers(data.memberId, targetPlayer.memberId);
      }
    } catch (err) {
      console.error("Drop error", err);
    }
  };

  const handleDropOnSlot = (
    e: React.DragEvent,
    teamSide: "TEAM_A" | "TEAM_B",
    slotIndex: number
  ) => {
    e.preventDefault();
    setDragOverKey(null);
    setDraggedPlayerId(null);
    try {
      const raw = e.dataTransfer.getData("application/json");
      if (!raw) return;
      const data = JSON.parse(raw);
      if (data.memberId && onMoveToSlot) {
        onMoveToSlot(data.memberId, teamSide, slotIndex);
      }
    } catch (err) {
      console.error("Drop error", err);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "100%", gap: "10px" }}>
      {/* ── BANNER TRỢ GIÚP CHẠM ĐỂ THAY VÀO SÂN (KHI CÓ CẦU THỦ ĐANG ĐƯỢC CHỌN) ── */}
      {activeSwapPlayer && (
        <div
          style={{
            width: "100%",
            maxWidth: "520px",
            background: "linear-gradient(135deg, rgba(234,179,8,0.25), rgba(245,158,11,0.18))",
            border: "1.5px solid #facc15",
            borderRadius: "10px",
            padding: "8px 12px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "8px",
            boxShadow: "0 4px 18px rgba(250,204,21,0.25)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "6px", overflow: "hidden", whiteSpace: "nowrap" }}>
            <span style={{ fontSize: "1rem" }}>⚡</span>
            <div style={{ overflow: "hidden", textOverflow: "ellipsis" }}>
              <span style={{ fontSize: "0.78rem", fontWeight: 800, color: "#fef08a" }}>
                Đang chọn: <strong style={{ color: "white" }}>{activeSwapPlayer.player.name}</strong>
              </span>
              <span style={{ fontSize: "0.68rem", color: "#fde047", marginLeft: "6px" }}>
                (Chạm cầu thủ khác để đổi vị trí, hoặc chạm vị trí trên sân để vào đá)
              </span>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "6px", flexShrink: 0 }}>
            <button
              type="button"
              onClick={() => {
                onSelectPlayer({
                  player: activeSwapPlayer.player,
                  currentTeam: activeSwapPlayer.teamSide,
                  isStarter: activeSwapPlayer.isStarter,
                  slotIndex: activeSwapPlayer.slotIndex,
                });
              }}
              style={{
                background: "rgba(255,255,255,0.12)",
                border: "1px solid rgba(255,255,255,0.25)",
                color: "#f8fafc",
                fontSize: "0.68rem",
                padding: "2px 6px",
                borderRadius: "4px",
                fontWeight: 700,
                cursor: "pointer",
                whiteSpace: "nowrap",
              }}
            >
              ⚙ Menu
            </button>
            <button
              type="button"
              onClick={() => setActiveSwapPlayer(null)}
              style={{
                background: "rgba(0,0,0,0.5)",
                border: "1px solid rgba(255,255,255,0.2)",
                color: "#f8fafc",
                fontSize: "0.68rem",
                padding: "2px 6px",
                borderRadius: "4px",
                fontWeight: 800,
                cursor: "pointer",
                whiteSpace: "nowrap",
              }}
            >
              Hủy ✖
            </button>
          </div>
        </div>
      )}

      {/* ── 1. DỰ BỊ ĐỘI A (Ở PHÍA TRÊN SÂN - BÊN NỬA ĐỘI A) ── */}
      {benchA.length > 0 && (
        <div
          style={{
            width: "100%",
            maxWidth: "520px",
            background: "rgba(37,99,235,0.1)",
            border: "1.5px solid rgba(59,130,246,0.35)",
            borderRadius: "12px",
            padding: "8px 12px",
            display: "flex",
            flexDirection: "column",
            gap: "6px",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              fontSize: "0.74rem",
              fontWeight: 800,
              color: "#60a5fa",
              whiteSpace: "nowrap",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span>🪑 Dự bị {teamAName}</span>
              <span
                style={{
                  background: "rgba(59,130,246,0.25)",
                  color: "#93c5fd",
                  padding: "1px 6px",
                  borderRadius: "999px",
                  fontSize: "0.68rem",
                }}
              >
                {benchA.length}
              </span>
            </div>
            <span style={{ fontSize: "0.66rem", color: "var(--muted-foreground)", fontWeight: 600 }}>
              Chạm hoặc kéo vào sân để thay người
            </span>
          </div>

          <div
            style={{
              display: "flex",
              gap: "6px",
              flexWrap: "wrap",
              alignItems: "center",
            }}
          >
            {benchA.map((p, idx) => {
              const isSelected = activeSwapPlayer?.player.memberId === p.memberId;
              const isDragging = draggedPlayerId === p.memberId;

              return (
                <div
                  key={p.memberId}
                  draggable
                  onDragStart={(e) => handleDragStart(e, p, "TEAM_A", false, 7 + idx)}
                  onDragEnd={handleDragEnd}
                  onDragOver={(e) => handleDragOver(e, `bench-a-${p.memberId}`)}
                  onDrop={(e) => handleDropOnPlayer(e, p)}
                  onClick={() => handlePlayerClick(p, "TEAM_A", false, 7 + idx)}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "5px",
                    padding: "4px 8px",
                    borderRadius: "8px",
                    background: isSelected
                      ? "rgba(250,204,21,0.25)"
                      : isDragging
                      ? "rgba(59,130,246,0.3)"
                      : "rgba(15,23,42,0.85)",
                    border: isSelected
                      ? "1.5px solid #facc15"
                      : p.isGuest
                      ? "1px solid rgba(168,85,247,0.4)"
                      : "1px solid rgba(59,130,246,0.35)",
                    color: "#f8fafc",
                    fontSize: "0.74rem",
                    fontWeight: 700,
                    cursor: "pointer",
                    userSelect: "none",
                    whiteSpace: "nowrap",
                    boxShadow: isSelected ? "0 0 10px rgba(250,204,21,0.45)" : "none",
                    transition: "all 0.15s ease",
                  }}
                  title="Chạm để thay vào sân hoặc mở tuỳ chọn"
                >
                  {p.image ? (
                    <img
                      src={p.image}
                      alt=""
                      style={{ width: "16px", height: "16px", borderRadius: "50%", objectFit: "cover" }}
                    />
                  ) : (
                    <span style={{ color: "#60a5fa", fontSize: "0.68rem" }}>
                      {p.jerseyNumber ? `#${p.jerseyNumber}` : "•"}
                    </span>
                  )}

                  <span
                    style={{
                      maxWidth: "85px",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {p.name}
                  </span>

                  {p.isGuest && (
                    <span
                      style={{
                        fontSize: "0.58rem",
                        padding: "1px 4px",
                        borderRadius: "3px",
                        background: "rgba(168,85,247,0.25)",
                        color: "#c084fc",
                        fontWeight: 800,
                        whiteSpace: "nowrap",
                      }}
                    >
                      Khách
                    </span>
                  )}

                  <span style={{ fontSize: "0.68rem", opacity: 0.8, color: "#93c5fd" }}>🔄</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── 2. KHUNG SÂN CỎ 3D CHIẾN THUẬT (SƠ ĐỒ 2-3-1) ── */}
      <div
        style={{
          width: "100%",
          maxWidth: "520px",
          height: "clamp(580px, 76vh, 700px)",
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
          userSelect: "none",
        }}
      >
        {/* Đường biên trong sân */}
        <div
          style={{
            position: "absolute",
            inset: "10px",
            border: "2px solid rgba(255,255,255,0.75)",
            pointerEvents: "none",
          }}
        />

        {/* Vạch giữa sân */}
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "10px",
            right: "10px",
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
            width: "100px",
            height: "100px",
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
            top: "10px",
            left: "50%",
            transform: "translateX(-50%)",
            width: "180px",
            height: "82px",
            border: "2px solid rgba(255,255,255,0.75)",
            borderTop: "none",
            pointerEvents: "none",
          }}
        />
        {/* Cầu môn trên */}
        <div
          style={{
            position: "absolute",
            top: "10px",
            left: "50%",
            transform: "translateX(-50%)",
            width: "85px",
            height: "32px",
            border: "2px solid rgba(255,255,255,0.75)",
            borderTop: "none",
            pointerEvents: "none",
          }}
        />

        {/* Vòng cấm địa dưới (Đội B) */}
        <div
          style={{
            position: "absolute",
            bottom: "10px",
            left: "50%",
            transform: "translateX(-50%)",
            width: "180px",
            height: "82px",
            border: "2px solid rgba(255,255,255,0.75)",
            borderBottom: "none",
            pointerEvents: "none",
          }}
        />
        {/* Cầu môn dưới */}
        <div
          style={{
            position: "absolute",
            bottom: "10px",
            left: "50%",
            transform: "translateX(-50%)",
            width: "85px",
            height: "32px",
            border: "2px solid rgba(255,255,255,0.75)",
            borderBottom: "none",
            pointerEvents: "none",
          }}
        />

        {/* TAG TÊN ĐỘI CHÌM TRÊN MẶT SÂN */}
        <div
          style={{
            position: "absolute",
            top: "18px",
            left: "16px",
            fontSize: "0.72rem",
            fontWeight: 900,
            color: "rgba(255,255,255,0.5)",
            letterSpacing: "1px",
            pointerEvents: "none",
            whiteSpace: "nowrap",
          }}
        >
          🔵 {teamAName.toUpperCase()}
        </div>
        <div
          style={{
            position: "absolute",
            bottom: "18px",
            right: "16px",
            fontSize: "0.72rem",
            fontWeight: 900,
            color: "rgba(255,255,255,0.5)",
            letterSpacing: "1px",
            pointerEvents: "none",
            whiteSpace: "nowrap",
          }}
        >
          🟡 {teamBName.toUpperCase()}
        </div>

        {/* ── CÁC VỊ TRÍ ĐỘI A (NỬA TRÊN SÂN) ── */}
        {currentSlots.map((slot, sIdx) => {
          const player = startersA[sIdx];
          const isGK = slot.role === "GK";
          const isSelected = player && activeSwapPlayer?.player.memberId === player.memberId;
          const isDragging = player && draggedPlayerId === player.memberId;
          const isOver = dragOverKey === `slot-a-${slot.id}`;

          return (
            <div
              key={`a-${slot.id}`}
              draggable={!!player}
              onDragStart={(e) => player && handleDragStart(e, player, "TEAM_A", true, sIdx)}
              onDragEnd={handleDragEnd}
              onDragOver={(e) => handleDragOver(e, `slot-a-${slot.id}`)}
              onDrop={(e) => {
                if (player) handleDropOnPlayer(e, player);
                else handleDropOnSlot(e, "TEAM_A", sIdx);
              }}
              onClick={() => {
                if (player) {
                  handlePlayerClick(player, "TEAM_A", true, sIdx);
                } else {
                  handleSlotClick("TEAM_A", sIdx, slot);
                }
              }}
              style={{
                position: "absolute",
                left: `${slot.x}%`,
                top: `${slot.yA}%`,
                transform: "translate(-50%, -50%)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                cursor: "pointer",
                zIndex: isSelected ? 30 : 20,
                transition: "transform 0.15s ease",
              }}
            >
              {player ? (
                <>
                  <div
                    style={{
                      width: "40px",
                      height: "40px",
                      borderRadius: "50%",
                      background: isGK
                        ? "linear-gradient(135deg, #10b981, #047857)"
                        : "linear-gradient(135deg, #2563eb, #1e40af)",
                      border: isSelected
                        ? "3px solid #facc15"
                        : isOver
                        ? "3px dashed #facc15"
                        : isGK
                        ? "2.5px solid #6ee7b7"
                        : "2.5px solid #93c5fd",
                      boxShadow: isSelected
                        ? "0 0 16px rgba(250,204,21,0.85)"
                        : isGK
                        ? "0 4px 12px rgba(16,185,129,0.7)"
                        : "0 4px 12px rgba(0,0,0,0.6)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "white",
                      fontWeight: 900,
                      fontSize: "0.82rem",
                      position: "relative",
                      transform: isSelected ? "scale(1.15)" : "scale(1)",
                      transition: "transform 0.15s ease",
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
                          bottom: -3,
                          right: -3,
                          background: isGK ? "#047857" : "#1e40af",
                          color: "white",
                          fontSize: "0.55rem",
                          padding: "1px 3px",
                          borderRadius: "3px",
                          fontWeight: 800,
                          lineHeight: "10px",
                        }}
                      >
                        #{player.jerseyNumber}
                      </span>
                    )}

                    {/* Tag vai trò chiến thuật */}
                    <span
                      style={{
                        position: "absolute",
                        top: -7,
                        left: "50%",
                        transform: "translateX(-50%)",
                        background: ROLE_COLORS[slot.role]?.bg || "rgba(0,0,0,0.75)",
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

                  {/* Tên cầu thủ (1 dòng duy nhất, không rớt dòng) */}
                  <span
                    style={{
                      fontSize: "0.68rem",
                      fontWeight: 800,
                      color: "white",
                      textShadow: "0 2px 4px rgba(0,0,0,0.95)",
                      background: isSelected ? "rgba(202,138,4,0.9)" : "rgba(15,23,42,0.88)",
                      padding: "1px 5px",
                      borderRadius: "4px",
                      marginTop: "3px",
                      maxWidth: "68px",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      textAlign: "center",
                      display: "block",
                      lineHeight: "13px",
                    }}
                  >
                    {player.name.split(" ").slice(-1)[0]}
                  </span>
                </>
              ) : (
                <div
                  style={{
                    width: "36px",
                    height: "36px",
                    borderRadius: "50%",
                    border: isOver ? "2px dashed #facc15" : "2px dashed rgba(255,255,255,0.55)",
                    background: isOver ? "rgba(250,204,21,0.2)" : "rgba(0,0,0,0.25)",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "rgba(255,255,255,0.8)",
                    fontSize: "0.65rem",
                    fontWeight: 800,
                  }}
                >
                  <span>+</span>
                  <span style={{ fontSize: "0.5rem", marginTop: "-2px" }}>{slot.label}</span>
                </div>
              )}
            </div>
          );
        })}

        {/* ── CÁC VỊ TRÍ ĐỘI B (NỬA DƯỚI SÂN) ── */}
        {currentSlots.map((slot, sIdx) => {
          const player = startersB[sIdx];
          const isGK = slot.role === "GK";
          const isSelected = player && activeSwapPlayer?.player.memberId === player.memberId;
          const isOver = dragOverKey === `slot-b-${slot.id}`;

          return (
            <div
              key={`b-${slot.id}`}
              draggable={!!player}
              onDragStart={(e) => player && handleDragStart(e, player, "TEAM_B", true, sIdx)}
              onDragEnd={handleDragEnd}
              onDragOver={(e) => handleDragOver(e, `slot-b-${slot.id}`)}
              onDrop={(e) => {
                if (player) handleDropOnPlayer(e, player);
                else handleDropOnSlot(e, "TEAM_B", sIdx);
              }}
              onClick={() => {
                if (player) {
                  handlePlayerClick(player, "TEAM_B", true, sIdx);
                } else {
                  handleSlotClick("TEAM_B", sIdx, slot);
                }
              }}
              style={{
                position: "absolute",
                left: `${slot.x}%`,
                top: `${slot.yB}%`,
                transform: "translate(-50%, -50%)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                cursor: "pointer",
                zIndex: isSelected ? 30 : 20,
                transition: "transform 0.15s ease",
              }}
            >
              {player ? (
                <>
                  <div
                    style={{
                      width: "40px",
                      height: "40px",
                      borderRadius: "50%",
                      background: isGK
                        ? "linear-gradient(135deg, #10b981, #047857)"
                        : "linear-gradient(135deg, #eab308, #ca8a04)",
                      border: isSelected
                        ? "3px solid #facc15"
                        : isOver
                        ? "3px dashed #facc15"
                        : isGK
                        ? "2.5px solid #6ee7b7"
                        : "2.5px solid #fef08a",
                      boxShadow: isSelected
                        ? "0 0 16px rgba(250,204,21,0.85)"
                        : isGK
                        ? "0 4px 12px rgba(16,185,129,0.7)"
                        : "0 4px 12px rgba(0,0,0,0.6)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: isGK ? "white" : "#0f172a",
                      fontWeight: 900,
                      fontSize: "0.82rem",
                      position: "relative",
                      transform: isSelected ? "scale(1.15)" : "scale(1)",
                      transition: "transform 0.15s ease",
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
                          bottom: -3,
                          right: -3,
                          background: isGK ? "#047857" : "#ca8a04",
                          color: "white",
                          fontSize: "0.55rem",
                          padding: "1px 3px",
                          borderRadius: "3px",
                          fontWeight: 800,
                          lineHeight: "10px",
                        }}
                      >
                        #{player.jerseyNumber}
                      </span>
                    )}

                    {/* Tag vai trò chiến thuật */}
                    <span
                      style={{
                        position: "absolute",
                        top: -7,
                        left: "50%",
                        transform: "translateX(-50%)",
                        background: ROLE_COLORS[slot.role]?.bg || "rgba(0,0,0,0.75)",
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

                  {/* Tên cầu thủ (1 dòng duy nhất, không rớt dòng) */}
                  <span
                    style={{
                      fontSize: "0.68rem",
                      fontWeight: 800,
                      color: isGK ? "#6ee7b7" : "#fef08a",
                      textShadow: "0 2px 4px rgba(0,0,0,0.95)",
                      background: isSelected ? "rgba(202,138,4,0.9)" : "rgba(15,23,42,0.88)",
                      padding: "1px 5px",
                      borderRadius: "4px",
                      marginTop: "3px",
                      maxWidth: "68px",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      textAlign: "center",
                      display: "block",
                      lineHeight: "13px",
                    }}
                  >
                    {player.name.split(" ").slice(-1)[0]}
                  </span>
                </>
              ) : (
                <div
                  style={{
                    width: "36px",
                    height: "36px",
                    borderRadius: "50%",
                    border: isOver ? "2px dashed #facc15" : "2px dashed rgba(255,255,255,0.55)",
                    background: isOver ? "rgba(250,204,21,0.2)" : "rgba(0,0,0,0.25)",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "rgba(255,255,255,0.8)",
                    fontSize: "0.65rem",
                    fontWeight: 800,
                  }}
                >
                  <span>+</span>
                  <span style={{ fontSize: "0.5rem", marginTop: "-2px" }}>{slot.label}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── 3. DỰ BỊ ĐỘI B (Ở PHÍA DƯỚI SÂN - BÊN NỬA ĐỘI B) ── */}
      {benchB.length > 0 && (
        <div
          style={{
            width: "100%",
            maxWidth: "520px",
            background: "rgba(234,179,8,0.1)",
            border: "1.5px solid rgba(250,204,21,0.35)",
            borderRadius: "12px",
            padding: "8px 12px",
            display: "flex",
            flexDirection: "column",
            gap: "6px",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              fontSize: "0.74rem",
              fontWeight: 800,
              color: "#facc15",
              whiteSpace: "nowrap",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span>🪑 Dự bị {teamBName}</span>
              <span
                style={{
                  background: "rgba(250,204,21,0.25)",
                  color: "#fef08a",
                  padding: "1px 6px",
                  borderRadius: "999px",
                  fontSize: "0.68rem",
                }}
              >
                {benchB.length}
              </span>
            </div>
            <span style={{ fontSize: "0.66rem", color: "var(--muted-foreground)", fontWeight: 600 }}>
              Chạm hoặc kéo vào sân để thay người
            </span>
          </div>

          <div
            style={{
              display: "flex",
              gap: "6px",
              flexWrap: "wrap",
              alignItems: "center",
            }}
          >
            {benchB.map((p, idx) => {
              const isSelected = activeSwapPlayer?.player.memberId === p.memberId;
              const isDragging = draggedPlayerId === p.memberId;

              return (
                <div
                  key={p.memberId}
                  draggable
                  onDragStart={(e) => handleDragStart(e, p, "TEAM_B", false, 7 + idx)}
                  onDragEnd={handleDragEnd}
                  onDragOver={(e) => handleDragOver(e, `bench-b-${p.memberId}`)}
                  onDrop={(e) => handleDropOnPlayer(e, p)}
                  onClick={() => handlePlayerClick(p, "TEAM_B", false, 7 + idx)}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "5px",
                    padding: "4px 8px",
                    borderRadius: "8px",
                    background: isSelected
                      ? "rgba(250,204,21,0.25)"
                      : isDragging
                      ? "rgba(234,179,8,0.3)"
                      : "rgba(15,23,42,0.85)",
                    border: isSelected
                      ? "1.5px solid #facc15"
                      : p.isGuest
                      ? "1px solid rgba(168,85,247,0.4)"
                      : "1px solid rgba(250,204,21,0.35)",
                    color: "#f8fafc",
                    fontSize: "0.74rem",
                    fontWeight: 700,
                    cursor: "pointer",
                    userSelect: "none",
                    whiteSpace: "nowrap",
                    boxShadow: isSelected ? "0 0 10px rgba(250,204,21,0.45)" : "none",
                    transition: "all 0.15s ease",
                  }}
                  title="Chạm để thay vào sân hoặc mở tuỳ chọn"
                >
                  {p.image ? (
                    <img
                      src={p.image}
                      alt=""
                      style={{ width: "16px", height: "16px", borderRadius: "50%", objectFit: "cover" }}
                    />
                  ) : (
                    <span style={{ color: "#facc15", fontSize: "0.68rem" }}>
                      {p.jerseyNumber ? `#${p.jerseyNumber}` : "•"}
                    </span>
                  )}

                  <span
                    style={{
                      maxWidth: "85px",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {p.name}
                  </span>

                  {p.isGuest && (
                    <span
                      style={{
                        fontSize: "0.58rem",
                        padding: "1px 4px",
                        borderRadius: "3px",
                        background: "rgba(168,85,247,0.25)",
                        color: "#c084fc",
                        fontWeight: 800,
                        whiteSpace: "nowrap",
                      }}
                    >
                      Khách
                    </span>
                  )}

                  <span style={{ fontSize: "0.68rem", opacity: 0.8, color: "#fef08a" }}>🔄</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
