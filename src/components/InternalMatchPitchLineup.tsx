"use client";

import { useState, useTransition, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Users,
  Shuffle,
  ArrowLeftRight,
  Save,
  Plus,
  X,
  Check,
  ChevronRight,
  Shield,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import { showToast } from "@/components/Toast";

export interface PitchPlayer {
  memberId: string;
  name: string;
  image?: string | null;
  jerseyNumber?: number | null;
  position?: string | null;
  guestCount?: number;
  teamSide?: "TEAM_A" | "TEAM_B" | null;
}

export interface InternalMatchPitchLineupProps {
  matchId: string;
  matchTitle: string;
  initialTeamAName?: string | null;
  initialTeamBName?: string | null;
  initialPlayers: PitchPlayer[];
  allFcMembers: Array<{
    id: string;
    name: string;
    image?: string | null;
    jerseyNumber?: number | null;
    position?: string | null;
  }>;
}

export function InternalMatchPitchLineup({
  matchId,
  matchTitle,
  initialTeamAName,
  initialTeamBName,
  initialPlayers,
  allFcMembers,
}: InternalMatchPitchLineupProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [teamAName, setTeamAName] = useState(initialTeamAName || "Đội A (Áo Xanh)");
  const [teamBName, setTeamBName] = useState(initialTeamBName || "Đội B (Áo Vàng)");
  const [viewMode, setViewMode] = useState<"pitch" | "board">("pitch");
  const [isEditingNames, setIsEditingNames] = useState(false);

  // Danh sách phân bổ cầu thủ
  const [teamA, setTeamA] = useState<PitchPlayer[]>(() =>
    initialPlayers.filter((p) => p.teamSide === "TEAM_A")
  );
  const [teamB, setTeamB] = useState<PitchPlayer[]>(() =>
    initialPlayers.filter((p) => p.teamSide === "TEAM_B")
  );
  const [unassigned, setUnassigned] = useState<PitchPlayer[]>(() =>
    initialPlayers.filter((p) => !p.teamSide)
  );

  // Modal thêm thành viên
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchMember, setSearchMember] = useState("");

  // Cầu thủ đang được chọn để mở Quick Action (cho Mobile 1-chạm)
  const [selectedPlayer, setSelectedPlayer] = useState<{
    player: PitchPlayer;
    currentTeam: "TEAM_A" | "TEAM_B" | "UNASSIGNED";
  } | null>(null);

  // Chuyển cầu thủ sang đội khác
  const movePlayer = (
    player: PitchPlayer,
    fromTeam: "TEAM_A" | "TEAM_B" | "UNASSIGNED",
    toTeam: "TEAM_A" | "TEAM_B" | "UNASSIGNED"
  ) => {
    if (fromTeam === toTeam) return;

    // Xóa khỏi đội cũ
    if (fromTeam === "TEAM_A") setTeamA((prev) => prev.filter((p) => p.memberId !== player.memberId));
    if (fromTeam === "TEAM_B") setTeamB((prev) => prev.filter((p) => p.memberId !== player.memberId));
    if (fromTeam === "UNASSIGNED") setUnassigned((prev) => prev.filter((p) => p.memberId !== player.memberId));

    // Thêm vào đội mới
    const updated = { ...player, teamSide: toTeam === "UNASSIGNED" ? null : toTeam };
    if (toTeam === "TEAM_A") setTeamA((prev) => [...prev, updated]);
    if (toTeam === "TEAM_B") setTeamB((prev) => [...prev, updated]);
    if (toTeam === "UNASSIGNED") setUnassigned((prev) => [...prev, updated]);

    setSelectedPlayer(null);
  };

  // Chia đội ngẫu nhiên (Auto Shuffle & Balance)
  const handleRandomSplit = () => {
    const all = [...teamA, ...teamB, ...unassigned];
    if (all.length === 0) {
      showToast.error("Chưa có thành viên nào trong danh sách!");
      return;
    }

    // Xáo trộn ngẫu nhiên Fisher-Yates
    const shuffled = [...all];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    const half = Math.ceil(shuffled.length / 2);
    const newTeamA = shuffled.slice(0, half).map((p) => ({ ...p, teamSide: "TEAM_A" as const }));
    const newTeamB = shuffled.slice(half).map((p) => ({ ...p, teamSide: "TEAM_B" as const }));

    setTeamA(newTeamA);
    setTeamB(newTeamB);
    setUnassigned([]);

    showToast.success(`Đã chia đều ${newTeamA.length} vs ${newTeamB.length} người cực công bằng! 🎲`);
  };

  // Hoán đổi 2 đội
  const handleSwapTeams = () => {
    const tempA = teamA.map((p) => ({ ...p, teamSide: "TEAM_B" as const }));
    const tempB = teamB.map((p) => ({ ...p, teamSide: "TEAM_A" as const }));
    setTeamA(tempB);
    setTeamB(tempA);
    showToast.info("Đã hoán đổi vị trí 2 đội 🔄");
  };

  // Thêm thành viên mới vào danh sách
  const handleAddMemberToTeam = (
    member: {
      id: string;
      name: string;
      image?: string | null;
      jerseyNumber?: number | null;
      position?: string | null;
    },
    targetTeam: "TEAM_A" | "TEAM_B" | "UNASSIGNED"
  ) => {
    // Kiểm tra xem đã có trong danh sách chưa
    const isAlreadyAdded = [...teamA, ...teamB, ...unassigned].some((p) => p.memberId === member.id);
    if (isAlreadyAdded) {
      showToast.error("Thành viên này đã có trong danh sách trận đấu!");
      return;
    }

    const newPlayer: PitchPlayer = {
      memberId: member.id,
      name: member.name,
      image: member.image,
      jerseyNumber: member.jerseyNumber,
      position: member.position,
      teamSide: targetTeam === "UNASSIGNED" ? null : targetTeam,
    };

    if (targetTeam === "TEAM_A") setTeamA((prev) => [...prev, newPlayer]);
    if (targetTeam === "TEAM_B") setTeamB((prev) => [...prev, newPlayer]);
    if (targetTeam === "UNASSIGNED") setUnassigned((prev) => [...prev, newPlayer]);

    showToast.success(`Đã thêm ${member.name} vào danh sách!`);
  };

  // Lưu cấu hình chia đội vào DB
  const handleSaveTeams = async () => {
    try {
      const res = await fetch(`/api/matches/${matchId}/teams`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teamA: teamA.map((p) => p.memberId),
          teamB: teamB.map((p) => p.memberId),
          unassigned: unassigned.map((p) => p.memberId),
          teamAName,
          teamBName,
        }),
      });

      const data = await res.json();
      if (data.success) {
        showToast.success("Đã lưu đội hình thi đấu thành công! ⚽🔥");
        startTransition(() => {
          router.refresh();
        });
      } else {
        showToast.error(data.error || "Lỗi lưu đội hình");
      }
    } catch (e) {
      console.error(e);
      showToast.error("Không thể lưu chia đội");
    }
  };

  // Lọc danh sách thành viên FC chưa tham gia để thêm mới
  const availableMembers = useMemo(() => {
    const presentIds = new Set([...teamA, ...teamB, ...unassigned].map((p) => p.memberId));
    return allFcMembers
      .filter((m) => !presentIds.has(m.id))
      .filter((m) => m.name.toLowerCase().includes(searchMember.toLowerCase().trim()));
  }, [allFcMembers, teamA, teamB, unassigned, searchMember]);

  return (
    <div className="glass-card" style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "16px", borderRadius: "16px" }}>
      {/* Header chia đội */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <h2 style={{ fontSize: "1.2rem", fontWeight: 900, color: "var(--card-foreground)", display: "flex", alignItems: "center", gap: "6px" }}>
              ⚽ Sơ Đồ Sân Bóng & Chia Đội Nội Bộ
            </h2>
            <span style={{ fontSize: "0.72rem", background: "rgba(34,197,94,0.15)", color: "#4ade80", padding: "2px 8px", borderRadius: "999px", fontWeight: 800 }}>
              {teamA.length + teamB.length} cầu thủ
            </span>
          </div>
          <p style={{ fontSize: "0.78rem", color: "var(--muted-foreground)", marginTop: "2px" }}>
            Bấm vào cầu thủ để chuyển đội · Kéo chia đội hình hoặc dùng nút Random 🎲
          </p>
        </div>

        {/* Nút thao tác nhanh */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
          {/* Switcher View: Sân bóng vs Bảng danh sách */}
          <div style={{ display: "flex", background: "rgba(255,255,255,0.06)", borderRadius: "8px", padding: "3px" }}>
            <button
              type="button"
              onClick={() => setViewMode("pitch")}
              style={{
                padding: "5px 12px",
                borderRadius: "6px",
                border: "none",
                background: viewMode === "pitch" ? "var(--primary)" : "transparent",
                color: viewMode === "pitch" ? "#052e16" : "var(--card-foreground)",
                fontWeight: 700,
                fontSize: "0.78rem",
                cursor: "pointer",
              }}
            >
              🏟️ Mặt Sân
            </button>
            <button
              type="button"
              onClick={() => setViewMode("board")}
              style={{
                padding: "5px 12px",
                borderRadius: "6px",
                border: "none",
                background: viewMode === "board" ? "var(--primary)" : "transparent",
                color: viewMode === "board" ? "#052e16" : "var(--card-foreground)",
                fontWeight: 700,
                fontSize: "0.78rem",
                cursor: "pointer",
              }}
            >
              📋 Danh Sách
            </button>
          </div>

          <button
            type="button"
            onClick={handleRandomSplit}
            className="btn btn-secondary"
            style={{ padding: "6px 12px", fontSize: "0.78rem", display: "flex", alignItems: "center", gap: "4px" }}
            title="Tự động chia ngẫu nhiên 2 đội đều nhau"
          >
            <Shuffle size={14} color="#facc15" /> Random 🎲
          </button>

          <button
            type="button"
            onClick={handleSwapTeams}
            className="btn btn-secondary"
            style={{ padding: "6px 10px", fontSize: "0.78rem" }}
            title="Đổi sân 2 đội"
          >
            <ArrowLeftRight size={14} />
          </button>

          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="btn btn-secondary"
            style={{ padding: "6px 12px", fontSize: "0.78rem", display: "flex", alignItems: "center", gap: "4px" }}
          >
            <Plus size={14} /> Thêm người
          </button>

          <button
            type="button"
            onClick={handleSaveTeams}
            disabled={isPending}
            className="btn btn-primary"
            style={{ padding: "6px 16px", fontSize: "0.82rem", fontWeight: 800, display: "flex", alignItems: "center", gap: "6px" }}
          >
            {isPending ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
            {isPending ? "Đang lưu..." : "Lưu Đội Hình 💾"}
          </button>
        </div>
      </div>

      {/* Tên Đội A vs Đội B */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "rgba(15,23,42,0.6)", padding: "10px 14px", borderRadius: "10px", border: "1px solid rgba(255,255,255,0.06)" }}>
        {/* Đội A */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <div style={{ width: "14px", height: "14px", borderRadius: "4px", background: "#3b82f6", boxShadow: "0 0 8px rgba(59,130,246,0.6)" }} />
          {isEditingNames ? (
            <input
              type="text"
              value={teamAName}
              onChange={(e) => setTeamAName(e.target.value)}
              style={{ padding: "4px 8px", fontSize: "0.82rem", background: "rgba(0,0,0,0.4)", border: "1px solid #3b82f6", borderRadius: "6px", color: "white", fontWeight: 700 }}
            />
          ) : (
            <span style={{ fontWeight: 800, fontSize: "0.9rem", color: "#60a5fa" }}>
              {teamAName} ({teamA.length} người)
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={() => setIsEditingNames(!isEditingNames)}
          style={{ background: "transparent", border: "none", color: "var(--muted-foreground)", fontSize: "0.72rem", cursor: "pointer", textDecoration: "underline" }}
        >
          {isEditingNames ? "Xong" : "Đổi tên đội"}
        </button>

        {/* Đội B */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          {isEditingNames ? (
            <input
              type="text"
              value={teamBName}
              onChange={(e) => setTeamBName(e.target.value)}
              style={{ padding: "4px 8px", fontSize: "0.82rem", background: "rgba(0,0,0,0.4)", border: "1px solid #facc15", borderRadius: "6px", color: "white", fontWeight: 700, textAlign: "right" }}
            />
          ) : (
            <span style={{ fontWeight: 800, fontSize: "0.9rem", color: "#facc15" }}>
              {teamBName} ({teamB.length} người)
            </span>
          )}
          <div style={{ width: "14px", height: "14px", borderRadius: "4px", background: "#facc15", boxShadow: "0 0 8px rgba(250,204,21,0.6)" }} />
        </div>
      </div>

      {/* VIEW 1: SÂN BÓNG 3D TRỰC QUAN (PITCH VIEW) */}
      {viewMode === "pitch" && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "100%" }}>
          <div
            style={{
              width: "100%",
              maxWidth: "520px",
              height: "640px",
              position: "relative",
              borderRadius: "16px",
              overflow: "hidden",
              border: "3px solid rgba(255, 255, 255, 0.75)",
              boxShadow: "0 14px 40px rgba(0,0,0,0.7), inset 0 0 40px rgba(0,0,0,0.3)",
              background: `repeating-linear-gradient(
                to bottom,
                #15803d 0px,
                #15803d 40px,
                #16a34a 40px,
                #16a34a 80px
              )`,
            }}
          >
            {/* Vạch kẻ sân bóng trắng sắc nét */}
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
                width: "180px",
                height: "85px",
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
                height: "35px",
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
                width: "180px",
                height: "85px",
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
                height: "35px",
                border: "2px solid rgba(255,255,255,0.75)",
                borderBottom: "none",
                pointerEvents: "none",
              }}
            />

            {/* NỬA TRÊN: ĐỘI A */}
            <div
              style={{
                position: "absolute",
                top: "20px",
                left: "14px",
                right: "14px",
                height: "280px",
                display: "flex",
                flexWrap: "wrap",
                alignContent: "flex-start",
                justifyContent: "space-around",
                gap: "10px",
                padding: "8px",
              }}
            >
              {teamA.map((p) => (
                <div
                  key={p.memberId}
                  onClick={() => setSelectedPlayer({ player: p, currentTeam: "TEAM_A" })}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    cursor: "pointer",
                    transition: "transform 0.15s",
                    zIndex: 10,
                  }}
                  title="Bấm để chuyển đội"
                >
                  <div
                    style={{
                      width: "42px",
                      height: "42px",
                      borderRadius: "50%",
                      background: "linear-gradient(135deg, #2563eb, #1e40af)",
                      border: "2.5px solid #60a5fa",
                      boxShadow: "0 4px 10px rgba(0,0,0,0.6)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "white",
                      fontWeight: 900,
                      fontSize: "0.85rem",
                      position: "relative",
                    }}
                  >
                    {p.image ? (
                      <img src={p.image} alt="" style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" }} />
                    ) : (
                      p.jerseyNumber ? `#${p.jerseyNumber}` : p.name[0]
                    )}
                    {p.jerseyNumber && p.image && (
                      <span style={{ position: "absolute", bottom: -4, right: -4, background: "#1e40af", color: "#93c5fd", fontSize: "0.6rem", padding: "1px 4px", borderRadius: "4px", fontWeight: 800 }}>
                        #{p.jerseyNumber}
                      </span>
                    )}
                  </div>
                  <span
                    style={{
                      fontSize: "0.72rem",
                      fontWeight: 800,
                      color: "white",
                      textShadow: "0 2px 4px rgba(0,0,0,0.9)",
                      background: "rgba(15,23,42,0.75)",
                      padding: "1px 6px",
                      borderRadius: "4px",
                      marginTop: "3px",
                      maxWidth: "75px",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {p.name.split(" ").slice(-1)[0]}
                  </span>
                </div>
              ))}
            </div>

            {/* NỬA DƯỚI: ĐỘI B */}
            <div
              style={{
                position: "absolute",
                bottom: "20px",
                left: "14px",
                right: "14px",
                height: "280px",
                display: "flex",
                flexWrap: "wrap",
                alignContent: "flex-end",
                justifyContent: "space-around",
                gap: "10px",
                padding: "8px",
              }}
            >
              {teamB.map((p) => (
                <div
                  key={p.memberId}
                  onClick={() => setSelectedPlayer({ player: p, currentTeam: "TEAM_B" })}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    cursor: "pointer",
                    transition: "transform 0.15s",
                    zIndex: 10,
                  }}
                  title="Bấm để chuyển đội"
                >
                  <div
                    style={{
                      width: "42px",
                      height: "42px",
                      borderRadius: "50%",
                      background: "linear-gradient(135deg, #eab308, #ca8a04)",
                      border: "2.5px solid #fef08a",
                      boxShadow: "0 4px 10px rgba(0,0,0,0.6)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#0f172a",
                      fontWeight: 900,
                      fontSize: "0.85rem",
                      position: "relative",
                    }}
                  >
                    {p.image ? (
                      <img src={p.image} alt="" style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" }} />
                    ) : (
                      p.jerseyNumber ? `#${p.jerseyNumber}` : p.name[0]
                    )}
                    {p.jerseyNumber && p.image && (
                      <span style={{ position: "absolute", bottom: -4, right: -4, background: "#ca8a04", color: "#fef08a", fontSize: "0.6rem", padding: "1px 4px", borderRadius: "4px", fontWeight: 800 }}>
                        #{p.jerseyNumber}
                      </span>
                    )}
                  </div>
                  <span
                    style={{
                      fontSize: "0.72rem",
                      fontWeight: 800,
                      color: "#fef08a",
                      textShadow: "0 2px 4px rgba(0,0,0,0.9)",
                      background: "rgba(15,23,42,0.75)",
                      padding: "1px 6px",
                      borderRadius: "4px",
                      marginTop: "3px",
                      maxWidth: "75px",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {p.name.split(" ").slice(-1)[0]}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* VIEW 2: BẢNG 2 CỘT DANH SÁCH (BOARD VIEW - DỄ DÀNG CHO MOBILE) */}
      {viewMode === "board" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "14px" }}>
          {/* Cột Đội A */}
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
                🔵 {teamAName} ({teamA.length})
              </span>
            </div>

            {teamA.map((p) => (
              <div
                key={p.memberId}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "8px 10px",
                  borderRadius: "8px",
                  background: "rgba(15,23,42,0.6)",
                  border: "1px solid rgba(59,130,246,0.2)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ fontWeight: 800, fontSize: "0.78rem", color: "#60a5fa" }}>
                    {p.jerseyNumber ? `#${p.jerseyNumber}` : "•"}
                  </span>
                  <span style={{ fontWeight: 700, fontSize: "0.85rem", color: "#f8fafc" }}>
                    {p.name}
                  </span>
                </div>

                <div style={{ display: "flex", gap: "4px" }}>
                  <button
                    type="button"
                    onClick={() => movePlayer(p, "TEAM_A", "TEAM_B")}
                    className="btn btn-secondary"
                    style={{ padding: "3px 8px", fontSize: "0.72rem", color: "#facc15" }}
                    title={`Chuyển sang ${teamBName}`}
                  >
                    Qua B 👉
                  </button>
                  <button
                    type="button"
                    onClick={() => movePlayer(p, "TEAM_A", "UNASSIGNED")}
                    style={{ background: "transparent", border: "none", color: "var(--muted-foreground)", cursor: "pointer", padding: "2px" }}
                    title="Cho ra ngoài"
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>
            ))}

            {teamA.length === 0 && (
              <div style={{ textAlign: "center", padding: "20px 0", color: "var(--muted-foreground)", fontSize: "0.78rem" }}>
                Chưa có ai ở Đội A. Bấm chuyển người hoặc Random!
              </div>
            )}
          </div>

          {/* Cột Đội B */}
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
                🟡 {teamBName} ({teamB.length})
              </span>
            </div>

            {teamB.map((p) => (
              <div
                key={p.memberId}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "8px 10px",
                  borderRadius: "8px",
                  background: "rgba(15,23,42,0.6)",
                  border: "1px solid rgba(250,204,21,0.2)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ fontWeight: 800, fontSize: "0.78rem", color: "#facc15" }}>
                    {p.jerseyNumber ? `#${p.jerseyNumber}` : "•"}
                  </span>
                  <span style={{ fontWeight: 700, fontSize: "0.85rem", color: "#f8fafc" }}>
                    {p.name}
                  </span>
                </div>

                <div style={{ display: "flex", gap: "4px" }}>
                  <button
                    type="button"
                    onClick={() => movePlayer(p, "TEAM_B", "TEAM_A")}
                    className="btn btn-secondary"
                    style={{ padding: "3px 8px", fontSize: "0.72rem", color: "#60a5fa" }}
                    title={`Chuyển sang ${teamAName}`}
                  >
                    👈 Qua A
                  </button>
                  <button
                    type="button"
                    onClick={() => movePlayer(p, "TEAM_B", "UNASSIGNED")}
                    style={{ background: "transparent", border: "none", color: "var(--muted-foreground)", cursor: "pointer", padding: "2px" }}
                    title="Cho ra ngoài"
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>
            ))}

            {teamB.length === 0 && (
              <div style={{ textAlign: "center", padding: "20px 0", color: "var(--muted-foreground)", fontSize: "0.78rem" }}>
                Chưa có ai ở Đội B. Bấm chuyển người hoặc Random!
              </div>
            )}
          </div>
        </div>
      )}

      {/* DANH SÁCH CHƯA CHIA / DỰ BỊ */}
      {unassigned.length > 0 && (
        <div style={{ background: "rgba(255,255,255,0.03)", padding: "12px 14px", borderRadius: "10px", border: "1px solid rgba(255,255,255,0.08)" }}>
          <div style={{ fontSize: "0.78rem", fontWeight: 800, color: "var(--muted-foreground)", marginBottom: "8px" }}>
            ⏳ Chưa chia đội ({unassigned.length} người) - Bấm để xếp vào sân:
          </div>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            {unassigned.map((p) => (
              <div
                key={p.memberId}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "4px 8px",
                  borderRadius: "6px",
                  background: "rgba(255,255,255,0.06)",
                  fontSize: "0.8rem",
                  color: "#f8fafc",
                }}
              >
                <span>{p.name}</span>
                <button
                  type="button"
                  onClick={() => movePlayer(p, "UNASSIGNED", "TEAM_A")}
                  style={{ background: "#2563eb", border: "none", color: "white", borderRadius: "4px", padding: "2px 6px", fontSize: "0.68rem", fontWeight: 800, cursor: "pointer" }}
                >
                  Vào A
                </button>
                <button
                  type="button"
                  onClick={() => movePlayer(p, "UNASSIGNED", "TEAM_B")}
                  style={{ background: "#ca8a04", border: "none", color: "white", borderRadius: "4px", padding: "2px 6px", fontSize: "0.68rem", fontWeight: 800, cursor: "pointer" }}
                >
                  Vào B
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ACTION SHEET DI ĐỘNG KHI CHỌN 1 CẦU THỦ TRÊN SÂN (1-TAP ACTION) */}
      {selectedPlayer && (
        <div
          onClick={() => setSelectedPlayer(null)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.65)",
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
              maxWidth: "400px",
              padding: "20px",
              borderRadius: "16px",
              background: "#0f172a",
              border: "1px solid rgba(250,204,21,0.4)",
              display: "flex",
              flexDirection: "column",
              gap: "12px",
              boxShadow: "0 10px 40px rgba(0,0,0,0.8)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ fontSize: "1.2rem" }}>⚽</span>
                <div>
                  <div style={{ fontWeight: 800, fontSize: "0.95rem", color: "#f8fafc" }}>
                    {selectedPlayer.player.name}
                  </div>
                  <div style={{ fontSize: "0.72rem", color: "var(--muted-foreground)" }}>
                    Đang ở: {selectedPlayer.currentTeam === "TEAM_A" ? teamAName : selectedPlayer.currentTeam === "TEAM_B" ? teamBName : "Chưa chia"}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedPlayer(null)}
                style={{ background: "transparent", border: "none", color: "var(--muted-foreground)", cursor: "pointer" }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "4px" }}>
              {selectedPlayer.currentTeam !== "TEAM_A" && (
                <button
                  type="button"
                  onClick={() => movePlayer(selectedPlayer.player, selectedPlayer.currentTeam, "TEAM_A")}
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

              {selectedPlayer.currentTeam !== "TEAM_B" && (
                <button
                  type="button"
                  onClick={() => movePlayer(selectedPlayer.player, selectedPlayer.currentTeam, "TEAM_B")}
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

              {selectedPlayer.currentTeam !== "UNASSIGNED" && (
                <button
                  type="button"
                  onClick={() => movePlayer(selectedPlayer.player, selectedPlayer.currentTeam, "UNASSIGNED")}
                  style={{
                    padding: "10px",
                    borderRadius: "8px",
                    border: "1px solid rgba(255,255,255,0.15)",
                    background: "rgba(255,255,255,0.05)",
                    color: "var(--card-foreground)",
                    fontWeight: 700,
                    fontSize: "0.82rem",
                    cursor: "pointer",
                  }}
                >
                  ⏳ Cho ra ngoài (Chưa chia đội)
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL THÊM THÀNH VIÊN VÀO TRẬN ĐẤU */}
      {showAddModal && (
        <div
          onClick={() => setShowAddModal(false)}
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
                onClick={() => setShowAddModal(false)}
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
                      onClick={() => handleAddMemberToTeam(m, "TEAM_A")}
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
                      onClick={() => handleAddMemberToTeam(m, "TEAM_B")}
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
              onClick={() => setShowAddModal(false)}
              className="btn btn-secondary"
              style={{ width: "100%", padding: "8px", fontSize: "0.85rem", fontWeight: 700 }}
            >
              Đóng
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
