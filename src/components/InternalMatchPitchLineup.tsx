"use client";

import { useState, useTransition, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Shuffle,
  ArrowLeftRight,
  Save,
  Plus,
  RefreshCw,
} from "lucide-react";
import { showToast } from "@/components/Toast";
import {
  PitchPlayer,
  InternalMatchPitchLineupProps,
  Formation7Id,
  FormationSlot,
  FORMATIONS_7,
  autoSortSân7,
} from "./lineup/types";
import { PitchView } from "./lineup/PitchView";
import { BoardView } from "./lineup/BoardView";
import { PlayerActionSheet } from "./lineup/PlayerActionSheet";
import { EmptySlotPickerModal } from "./lineup/EmptySlotPickerModal";
import { AddMemberModal } from "./lineup/AddMemberModal";

// Re-export types for consumers
export type { PitchPlayer, InternalMatchPitchLineupProps };

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
  const [formation, setFormation] = useState<Formation7Id>("2-3-1");
  const [isEditingNames, setIsEditingNames] = useState(false);

  // Danh sách phân bổ cầu thủ
  const [teamA, setTeamA] = useState<PitchPlayer[]>(() =>
    autoSortSân7(initialPlayers.filter((p) => p.teamSide === "TEAM_A"))
  );
  const [teamB, setTeamB] = useState<PitchPlayer[]>(() =>
    autoSortSân7(initialPlayers.filter((p) => p.teamSide === "TEAM_B"))
  );
  const [unassigned, setUnassigned] = useState<PitchPlayer[]>(() =>
    initialPlayers.filter((p) => !p.teamSide)
  );

  // Modals & Action Sheet
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState<{
    player: PitchPlayer;
    currentTeam: "TEAM_A" | "TEAM_B" | "UNASSIGNED";
    slotIndex?: number;
    isStarter?: boolean;
  } | null>(null);

  const [activeEmptySlot, setActiveEmptySlot] = useState<{
    teamSide: "TEAM_A" | "TEAM_B";
    slotIndex: number;
    slot: FormationSlot;
  } | null>(null);

  // Chia 7 người đá chính & dự bị
  const startersA = useMemo(() => teamA.slice(0, 7), [teamA]);
  const benchA = useMemo(() => teamA.slice(7), [teamA]);

  const startersB = useMemo(() => teamB.slice(0, 7), [teamB]);
  const benchB = useMemo(() => teamB.slice(7), [teamB]);

  const currentSlots = FORMATIONS_7[formation].slots;

  // Chuyển cầu thủ giữa các đội (tự động mang theo bạn đi cùng nếu có)
  const movePlayer = (
    player: PitchPlayer,
    fromTeam: "TEAM_A" | "TEAM_B" | "UNASSIGNED",
    toTeam: "TEAM_A" | "TEAM_B" | "UNASSIGNED",
    moveGuestsToo = true
  ) => {
    if (fromTeam === toTeam) return;

    const fromList = fromTeam === "TEAM_A" ? teamA : fromTeam === "TEAM_B" ? teamB : unassigned;
    const accompanyingGuests = !player.isGuest && moveGuestsToo
      ? fromList.filter((p) => p.isGuest && p.hostMemberId === player.memberId)
      : [];

    const movingIds = new Set([player.memberId, ...accompanyingGuests.map((g) => g.memberId)]);

    if (fromTeam === "TEAM_A") setTeamA((prev) => prev.filter((p) => !movingIds.has(p.memberId)));
    if (fromTeam === "TEAM_B") setTeamB((prev) => prev.filter((p) => !movingIds.has(p.memberId)));
    if (fromTeam === "UNASSIGNED") setUnassigned((prev) => prev.filter((p) => !movingIds.has(p.memberId)));

    const updatedPlayer = { ...player, teamSide: toTeam === "UNASSIGNED" ? null : toTeam };
    const updatedGuests = accompanyingGuests.map((g) => ({
      ...g,
      teamSide: toTeam === "UNASSIGNED" ? null : toTeam,
    }));
    const newItems = [updatedPlayer, ...updatedGuests];

    if (toTeam === "TEAM_A") setTeamA((prev) => autoSortSân7([...prev, ...newItems]));
    if (toTeam === "TEAM_B") setTeamB((prev) => autoSortSân7([...prev, ...newItems]));
    if (toTeam === "UNASSIGNED") setUnassigned((prev) => [...prev, ...newItems]);

    setSelectedPlayer(null);
    setActiveEmptySlot(null);

    if (accompanyingGuests.length > 0) {
      showToast.info(`Đã chuyển ${player.name} cùng ${accompanyingGuests.length} bạn đi cùng! 👥`);
    }
  };

  // Hoán đổi vị trí giữa 2 cầu thủ trong cùng 1 đội
  const swapWithinTeam = (teamKey: "TEAM_A" | "TEAM_B", p1Id: string, p2Id: string) => {
    const setter = teamKey === "TEAM_A" ? setTeamA : setTeamB;
    setter((prev) => {
      const idx1 = prev.findIndex((p) => p.memberId === p1Id);
      const idx2 = prev.findIndex((p) => p.memberId === p2Id);
      if (idx1 === -1 || idx2 === -1) return prev;
      const clone = [...prev];
      const temp = clone[idx1];
      clone[idx1] = clone[idx2];
      clone[idx2] = temp;
      return clone;
    });
    setSelectedPlayer(null);
    showToast.success("Đã đổi vị trí cầu thủ! 🔄");
  };

  // Hoán đổi vị trí linh hoạt (cùng đội hoặc khác đội, đá chính hoặc dự bị)
  const handleSwapPlayers = (p1Id: string, p2Id: string) => {
    if (p1Id === p2Id) return;

    // 1. Cả 2 cùng trong Đội A
    const idxA1 = teamA.findIndex((p) => p.memberId === p1Id);
    const idxA2 = teamA.findIndex((p) => p.memberId === p2Id);
    if (idxA1 !== -1 && idxA2 !== -1) {
      setTeamA((prev) => {
        const clone = [...prev];
        const temp = clone[idxA1];
        clone[idxA1] = clone[idxA2];
        clone[idxA2] = temp;
        return clone;
      });
      const name1 = teamA[idxA1]?.name.split(" ").slice(-1)[0];
      const name2 = teamA[idxA2]?.name.split(" ").slice(-1)[0];
      showToast.success(`Đã đổi vị trí: ${name1} ⇄ ${name2}! 🔄`);
      return;
    }

    // 2. Cả 2 cùng trong Đội B
    const idxB1 = teamB.findIndex((p) => p.memberId === p1Id);
    const idxB2 = teamB.findIndex((p) => p.memberId === p2Id);
    if (idxB1 !== -1 && idxB2 !== -1) {
      setTeamB((prev) => {
        const clone = [...prev];
        const temp = clone[idxB1];
        clone[idxB1] = clone[idxB2];
        clone[idxB2] = temp;
        return clone;
      });
      const name1 = teamB[idxB1]?.name.split(" ").slice(-1)[0];
      const name2 = teamB[idxB2]?.name.split(" ").slice(-1)[0];
      showToast.success(`Đã đổi vị trí: ${name1} ⇄ ${name2}! 🔄`);
      return;
    }

    // 3. Khác đội: 1 người Đội A, 1 người Đội B
    if (idxA1 !== -1 && idxB2 !== -1) {
      const pA = teamA[idxA1];
      const pB = teamB[idxB2];
      setTeamA((prev) => prev.map((p, i) => (i === idxA1 ? { ...pB, teamSide: "TEAM_A" } : p)));
      setTeamB((prev) => prev.map((p, i) => (i === idxB2 ? { ...pA, teamSide: "TEAM_B" } : p)));
      showToast.success(`Đã đổi ${pA.name} ⇄ ${pB.name} giữa 2 đội! 🔄`);
      return;
    }

    if (idxB1 !== -1 && idxA2 !== -1) {
      const pB = teamB[idxB1];
      const pA = teamA[idxA2];
      setTeamB((prev) => prev.map((p, i) => (i === idxB1 ? { ...pA, teamSide: "TEAM_B" } : p)));
      setTeamA((prev) => prev.map((p, i) => (i === idxA2 ? { ...pB, teamSide: "TEAM_A" } : p)));
      showToast.success(`Đã đổi ${pB.name} ⇄ ${pA.name} giữa 2 đội! 🔄`);
      return;
    }
  };

  // Di chuyển cầu thủ đến slot vị trí cụ thể trên sân
  const handleMoveToSlot = (
    memberId: string,
    teamKey: "TEAM_A" | "TEAM_B",
    targetIndex: number
  ) => {
    const setter = teamKey === "TEAM_A" ? setTeamA : setTeamB;
    setter((prev) => {
      const idx = prev.findIndex((p) => p.memberId === memberId);
      if (idx !== -1) {
        // Trong cùng đội: di chuyển vị trí
        const clone = [...prev];
        const [moved] = clone.splice(idx, 1);
        clone.splice(Math.min(targetIndex, clone.length), 0, moved);
        return clone;
      } else {
        // Từ đội khác hoặc chưa gán
        const otherSetter = teamKey === "TEAM_A" ? setTeamB : setTeamA;
        const player = [...teamA, ...teamB, ...unassigned].find((p) => p.memberId === memberId);
        if (!player) return prev;
        otherSetter((other) => other.filter((p) => p.memberId !== memberId));
        setUnassigned((un) => un.filter((p) => p.memberId !== memberId));
        const clone = [...prev];
        clone.splice(Math.min(targetIndex, clone.length), 0, { ...player, teamSide: teamKey });
        return clone;
      }
    });
    showToast.success("Đã xếp vị trí vào sân! ⭐");
  };

  // Đặt làm Thủ môn (slot 0)
  const setAsGoalkeeper = (teamKey: "TEAM_A" | "TEAM_B", memberId: string) => {
    const setter = teamKey === "TEAM_A" ? setTeamA : setTeamB;
    setter((prev) => {
      const idx = prev.findIndex((p) => p.memberId === memberId);
      if (idx <= 0) return prev;
      const clone = [...prev];
      const [player] = clone.splice(idx, 1);
      clone.unshift(player);
      return clone;
    });
    setSelectedPlayer(null);
    showToast.success("Đã đặt làm Thủ môn chính thức! 🧤");
  };

  // Chuyển xuống ghế dự bị
  const sendToBench = (teamKey: "TEAM_A" | "TEAM_B", memberId: string) => {
    const setter = teamKey === "TEAM_A" ? setTeamA : setTeamB;
    setter((prev) => {
      const idx = prev.findIndex((p) => p.memberId === memberId);
      if (idx === -1) return prev;
      const clone = [...prev];
      const [player] = clone.splice(idx, 1);
      clone.push(player);
      return clone;
    });
    setSelectedPlayer(null);
    showToast.info("Đã chuyển cầu thủ xuống ghế dự bị 🪑");
  };

  // Đưa cầu thủ dự bị lên đá chính
  const promoteToStarter = (teamKey: "TEAM_A" | "TEAM_B", memberId: string, targetIndex = 6) => {
    const setter = teamKey === "TEAM_A" ? setTeamA : setTeamB;
    setter((prev) => {
      const idx = prev.findIndex((p) => p.memberId === memberId);
      if (idx === -1) return prev;
      const clone = [...prev];
      const [player] = clone.splice(idx, 1);
      clone.splice(Math.min(targetIndex, clone.length), 0, player);
      return clone;
    });
    setSelectedPlayer(null);
    showToast.success("Đã đưa cầu thủ vào đội hình chính sân 7! ⭐");
  };

  // Chia ngẫu nhiên cân bằng 50/50 - GIỮ NGUYÊN THÀNH VIÊN & BẠN ĐI CÙNG Ở CHUNG ĐỘI
  const handleRandomSplit = () => {
    const all = [...teamA, ...teamB, ...unassigned];
    if (all.length === 0) {
      showToast.error("Chưa có thành viên nào!");
      return;
    }

    const guestsByHost = new Map<string, PitchPlayer[]>();
    for (const p of all) {
      if (p.isGuest && p.hostMemberId) {
        const list = guestsByHost.get(p.hostMemberId) || [];
        list.push(p);
        guestsByHost.set(p.hostMemberId, list);
      }
    }

    const clusters: PitchPlayer[][] = [];
    const processedIds = new Set<string>();

    for (const p of all) {
      if (!p.isGuest) {
        const myGuests = guestsByHost.get(p.memberId) || [];
        clusters.push([p, ...myGuests]);
        processedIds.add(p.memberId);
        myGuests.forEach((g) => processedIds.add(g.memberId));
      }
    }

    for (const p of all) {
      if (!processedIds.has(p.memberId)) {
        clusters.push([p]);
      }
    }

    for (let i = clusters.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [clusters[i], clusters[j]] = [clusters[j], clusters[i]];
    }

    const newTeamA: PitchPlayer[] = [];
    const newTeamB: PitchPlayer[] = [];

    for (const cluster of clusters) {
      if (newTeamA.length <= newTeamB.length) {
        newTeamA.push(...cluster.map((p) => ({ ...p, teamSide: "TEAM_A" as const })));
      } else {
        newTeamB.push(...cluster.map((p) => ({ ...p, teamSide: "TEAM_B" as const })));
      }
    }

    setTeamA(autoSortSân7(newTeamA));
    setTeamB(autoSortSân7(newTeamB));
    setUnassigned([]);

    showToast.success(`Đã chia đều ${newTeamA.length} vs ${newTeamB.length} người (bạn đi cùng luôn chung đội)! 🎲`);
  };

  // Đổi sân 2 đội
  const handleSwapTeams = () => {
    const tempA = teamA.map((p) => ({ ...p, teamSide: "TEAM_B" as const }));
    const tempB = teamB.map((p) => ({ ...p, teamSide: "TEAM_A" as const }));
    setTeamA(tempB);
    setTeamB(tempA);
    showToast.info("Đã hoán đổi vị trí 2 đội 🔄");
  };

  // Thêm thành viên mới
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
    const newPlayer: PitchPlayer = {
      memberId: member.id,
      name: member.name,
      image: member.image,
      jerseyNumber: member.jerseyNumber,
      position: member.position,
      teamSide: targetTeam === "UNASSIGNED" ? null : targetTeam,
      isGuest: false,
    };

    if (targetTeam === "TEAM_A") setTeamA((prev) => autoSortSân7([...prev, newPlayer]));
    if (targetTeam === "TEAM_B") setTeamB((prev) => autoSortSân7([...prev, newPlayer]));
    if (targetTeam === "UNASSIGNED") setUnassigned((prev) => [...prev, newPlayer]);

    showToast.success(`Đã thêm ${member.name} vào ${targetTeam === "TEAM_A" ? teamAName : targetTeam === "TEAM_B" ? teamBName : "dự bị"}!`);
    setShowAddModal(false);
  };

  // Lưu đội hình vào DB
  const handleSaveTeams = async () => {
    startTransition(async () => {
      try {
        const payload = {
          teamAName,
          teamBName,
          teamA: teamA.map((p) => p.memberId),
          teamB: teamB.map((p) => p.memberId),
          unassigned: unassigned.map((p) => p.memberId),
        };

        const res = await fetch(`/api/matches/${matchId}/teams`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Không thể lưu chia đội");

        showToast.success("Đã lưu đội hình thành công! 🎉");
        router.refresh();
      } catch (err: any) {
        showToast.error(err.message || "Lỗi lưu đội hình");
      }
    });
  };

  const existingMemberIds = useMemo(() => {
    return new Set([...teamA, ...teamB, ...unassigned].map((p) => p.memberId));
  }, [teamA, teamB, unassigned]);

  return (
    <div className="glass-card" style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "16px", borderRadius: "16px" }}>
      {/* HEADER TỔNG QUAN & CONTROLS */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
            <h2 style={{ fontSize: "1.15rem", fontWeight: 900, color: "var(--card-foreground)", display: "flex", alignItems: "center", gap: "6px" }}>
              ⚽ Sơ Đồ Chiến Thuật
            </h2>
            <span style={{ fontSize: "0.72rem", background: "rgba(34,197,94,0.15)", color: "#4ade80", padding: "2px 8px", borderRadius: "999px", fontWeight: 800 }}>
              {teamA.length} vs {teamB.length} người
            </span>
            <span style={{ fontSize: "0.72rem", background: "rgba(59,130,246,0.15)", color: "#60a5fa", padding: "2px 8px", borderRadius: "999px", fontWeight: 800 }}>
              📐 Sơ đồ 2-3-1 (Chuẩn Sân 7)
            </span>
          </div>
          <p style={{ fontSize: "0.75rem", color: "var(--muted-foreground)", marginTop: "3px" }}>
            Chạm cầu thủ hoặc kéo thả để đổi vị trí, thay người vào sân ⚡
          </p>
        </div>

        {/* NÚT THAO TÁC NHANH (TỐI ƯU MOBILE) */}
        <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
          {/* Switcher: Mặt Sân vs Danh Sách */}
          <div style={{ display: "flex", background: "rgba(255,255,255,0.06)", borderRadius: "8px", padding: "2px" }}>
            <button
              type="button"
              onClick={() => setViewMode("pitch")}
              style={{
                padding: "4px 10px",
                borderRadius: "6px",
                border: "none",
                background: viewMode === "pitch" ? "var(--primary)" : "transparent",
                color: viewMode === "pitch" ? "#052e16" : "var(--card-foreground)",
                fontWeight: 800,
                fontSize: "0.76rem",
                cursor: "pointer",
                whiteSpace: "nowrap",
              }}
            >
              🏟️ Sân cỏ
            </button>
            <button
              type="button"
              onClick={() => setViewMode("board")}
              style={{
                padding: "4px 10px",
                borderRadius: "6px",
                border: "none",
                background: viewMode === "board" ? "var(--primary)" : "transparent",
                color: viewMode === "board" ? "#052e16" : "var(--card-foreground)",
                fontWeight: 800,
                fontSize: "0.76rem",
                cursor: "pointer",
                whiteSpace: "nowrap",
              }}
            >
              📋 Danh sách
            </button>
          </div>

          <button
            type="button"
            onClick={handleRandomSplit}
            className="btn btn-secondary"
            style={{ padding: "5px 10px", fontSize: "0.76rem", display: "flex", alignItems: "center", gap: "4px", whiteSpace: "nowrap" }}
            title="Tự động chia ngẫu nhiên 2 đội đều nhau"
          >
            <Shuffle size={13} color="#facc15" /> Random 🎲
          </button>

          <button
            type="button"
            onClick={handleSwapTeams}
            className="btn btn-secondary"
            style={{ padding: "5px 8px", fontSize: "0.76rem" }}
            title="Đổi sân 2 đội"
          >
            <ArrowLeftRight size={13} />
          </button>

          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="btn btn-secondary"
            style={{ padding: "5px 10px", fontSize: "0.76rem", display: "flex", alignItems: "center", gap: "4px", whiteSpace: "nowrap" }}
          >
            <Plus size={13} /> Thêm người
          </button>

          <button
            type="button"
            onClick={handleSaveTeams}
            disabled={isPending}
            className="btn btn-primary"
            style={{ padding: "5px 14px", fontSize: "0.78rem", fontWeight: 800, display: "flex", alignItems: "center", gap: "5px", whiteSpace: "nowrap" }}
          >
            {isPending ? <RefreshCw size={13} className="animate-spin" /> : <Save size={13} />}
            {isPending ? "Đang lưu..." : "Lưu Đội Hình 💾"}
          </button>
        </div>
      </div>

      {/* BANNER TÊN 2 ĐỘI */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "rgba(15,23,42,0.6)", padding: "8px 12px", borderRadius: "10px", border: "1px solid rgba(255,255,255,0.06)", flexWrap: "wrap", gap: "8px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", overflow: "hidden", whiteSpace: "nowrap" }}>
          <div style={{ width: "12px", height: "12px", borderRadius: "4px", background: "#3b82f6", boxShadow: "0 0 8px rgba(59,130,246,0.6)", flexShrink: 0 }} />
          {isEditingNames ? (
            <input
              type="text"
              value={teamAName}
              onChange={(e) => setTeamAName(e.target.value)}
              style={{ padding: "3px 8px", fontSize: "0.8rem", background: "rgba(0,0,0,0.4)", border: "1px solid #3b82f6", borderRadius: "6px", color: "white", fontWeight: 700, maxWidth: "140px" }}
            />
          ) : (
            <span style={{ fontWeight: 800, fontSize: "0.85rem", color: "#60a5fa", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {teamAName} ({teamA.length})
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={() => setIsEditingNames(!isEditingNames)}
          style={{ background: "transparent", border: "none", color: "var(--muted-foreground)", fontSize: "0.72rem", cursor: "pointer", textDecoration: "underline", whiteSpace: "nowrap" }}
        >
          {isEditingNames ? "Xong" : "Đổi tên"}
        </button>

        <div style={{ display: "flex", alignItems: "center", gap: "8px", overflow: "hidden", whiteSpace: "nowrap" }}>
          {isEditingNames ? (
            <input
              type="text"
              value={teamBName}
              onChange={(e) => setTeamBName(e.target.value)}
              style={{ padding: "3px 8px", fontSize: "0.8rem", background: "rgba(0,0,0,0.4)", border: "1px solid #facc15", borderRadius: "6px", color: "white", fontWeight: 700, textAlign: "right", maxWidth: "140px" }}
            />
          ) : (
            <span style={{ fontWeight: 800, fontSize: "0.85rem", color: "#facc15", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {teamBName} ({teamB.length})
            </span>
          )}
          <div style={{ width: "12px", height: "12px", borderRadius: "4px", background: "#facc15", boxShadow: "0 0 8px rgba(250,204,21,0.6)", flexShrink: 0 }} />
        </div>
      </div>

      {/* VIEW 1: SÂN BÓNG 3D */}
      {viewMode === "pitch" && (
        <PitchView
          teamAName={teamAName}
          teamBName={teamBName}
          currentSlots={currentSlots}
          startersA={startersA}
          benchA={benchA}
          startersB={startersB}
          benchB={benchB}
          onSwapPlayers={handleSwapPlayers}
          onMoveToSlot={handleMoveToSlot}
          onSelectPlayer={setSelectedPlayer}
          onSelectEmptySlot={setActiveEmptySlot}
        />
      )}

      {/* VIEW 2: BẢNG DANH SÁCH 2 CỘT */}
      {viewMode === "board" && (
        <BoardView
          teamAName={teamAName}
          teamBName={teamBName}
          teamA={teamA}
          teamB={teamB}
          startersA={startersA}
          benchA={benchA}
          startersB={startersB}
          benchB={benchB}
          currentSlots={currentSlots}
          onMovePlayer={movePlayer}
          onPromoteToStarter={promoteToStarter}
        />
      )}

      {/* DANH SÁCH CHƯA CHIA / VẮNG MẶT */}
      {unassigned.length > 0 && (
        <div style={{ background: "rgba(255,255,255,0.03)", padding: "12px 14px", borderRadius: "10px", border: "1px solid rgba(255,255,255,0.08)" }}>
          <div style={{ fontSize: "0.78rem", fontWeight: 800, color: "var(--muted-foreground)", marginBottom: "8px" }}>
            ⏳ Cầu thủ chưa chia đội / Dự bị chung ({unassigned.length} người) - Bấm để xếp vào sân:
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

      {/* ACTION SHEET DI ĐỘNG (1-TAP) */}
      {selectedPlayer && (
        <PlayerActionSheet
          selectedPlayer={selectedPlayer}
          teamAName={teamAName}
          teamBName={teamBName}
          teammates={selectedPlayer.currentTeam === "TEAM_A" ? teamA : teamB}
          onClose={() => setSelectedPlayer(null)}
          onSetGoalkeeper={setAsGoalkeeper}
          onSwapWithinTeam={swapWithinTeam}
          onPromoteToStarter={promoteToStarter}
          onSendToBench={sendToBench}
          onMovePlayer={movePlayer}
        />
      )}

      {/* POPUP CHỌN CẦU THỦ CHO VỊ TRÍ TRỐNG TRÊN SÂN */}
      {activeEmptySlot && (
        <EmptySlotPickerModal
          activeEmptySlot={activeEmptySlot}
          benchPlayers={activeEmptySlot.teamSide === "TEAM_A" ? benchA : benchB}
          unassignedPlayers={unassigned}
          onClose={() => setActiveEmptySlot(null)}
          onPromoteFromBench={promoteToStarter}
          onAssignFromUnassigned={(p, side) => movePlayer(p, "UNASSIGNED", side)}
        />
      )}

      {/* MODAL THÊM THÀNH VIÊN VÀO TRẬN ĐẤU */}
      {showAddModal && (
        <AddMemberModal
          allFcMembers={allFcMembers}
          existingMemberIds={existingMemberIds}
          onClose={() => setShowAddModal(false)}
          onAddMember={handleAddMemberToTeam}
        />
      )}
    </div>
  );
}
