// src/components/lineup/types.ts

export interface PitchPlayer {
  memberId: string;
  name: string;
  image?: string | null;
  jerseyNumber?: number | null;
  position?: string | null;
  guestCount?: number;
  teamSide?: "TEAM_A" | "TEAM_B" | null;
  status?: string;
  isGuest?: boolean;
  hostMemberId?: string;
  hostName?: string;
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

// ── Sơ đồ chiến thuật Sân 7 (7-a-side) ───────────────────────────
export type Formation7Id = "2-3-1" | "3-2-1" | "2-2-2";

export interface FormationSlot {
  id: string;
  role: "GK" | "DF" | "MF" | "FW";
  label: string; // "GK", "HV", "TV", "TĐ"
  fullLabel: string;
  x: number; // % 0-100
  yA: number; // % for Team A (top half: goal at ~8%, half-line at 50%)
  yB: number; // % for Team B (bottom half: half-line at 50%, goal at ~92%)
}

export const FORMATIONS_7: Record<
  Formation7Id,
  { name: string; tag: string; description: string; slots: FormationSlot[] }
> = {
  "2-3-1": {
    name: "2-3-1",
    tag: "Chuẩn Sân 7",
    description: "1 GK · 2 Hậu vệ · 3 Tiền vệ · 1 Tiền đạo",
    slots: [
      { id: "gk", role: "GK", label: "GK", fullLabel: "Thủ môn", x: 50, yA: 9, yB: 91 },
      { id: "lb", role: "DF", label: "HV", fullLabel: "Hậu vệ trái", x: 26, yA: 20, yB: 80 },
      { id: "rb", role: "DF", label: "HV", fullLabel: "Hậu vệ phải", x: 74, yA: 20, yB: 80 },
      { id: "lm", role: "MF", label: "TV", fullLabel: "Tiền vệ trái", x: 18, yA: 32, yB: 68 },
      { id: "cm", role: "MF", label: "TV", fullLabel: "Tiền vệ trung tâm", x: 50, yA: 31, yB: 69 },
      { id: "rm", role: "MF", label: "TV", fullLabel: "Tiền vệ phải", x: 82, yA: 32, yB: 68 },
      { id: "st", role: "FW", label: "TĐ", fullLabel: "Tiền đạo cắm", x: 50, yA: 43, yB: 57 },
    ],
  },
  "3-2-1": {
    name: "3-2-1",
    tag: "Phòng ngự",
    description: "1 GK · 3 Hậu vệ · 2 Tiền vệ · 1 Tiền đạo",
    slots: [
      { id: "gk", role: "GK", label: "GK", fullLabel: "Thủ môn", x: 50, yA: 9, yB: 91 },
      { id: "lb", role: "DF", label: "HV", fullLabel: "Hậu vệ trái", x: 20, yA: 20, yB: 80 },
      { id: "cb", role: "DF", label: "HV", fullLabel: "Hậu vệ thòng", x: 50, yA: 20, yB: 80 },
      { id: "rb", role: "DF", label: "HV", fullLabel: "Hậu vệ phải", x: 80, yA: 20, yB: 80 },
      { id: "lm", role: "MF", label: "TV", fullLabel: "Tiền vệ trái", x: 30, yA: 32, yB: 68 },
      { id: "rm", role: "MF", label: "TV", fullLabel: "Tiền vệ phải", x: 70, yA: 32, yB: 68 },
      { id: "st", role: "FW", label: "TĐ", fullLabel: "Tiền đạo cắm", x: 50, yA: 43, yB: 57 },
    ],
  },
  "2-2-2": {
    name: "2-2-2",
    tag: "2 Tiền đạo",
    description: "1 GK · 2 Hậu vệ · 2 Tiền vệ · 2 Tiền đạo",
    slots: [
      { id: "gk", role: "GK", label: "GK", fullLabel: "Thủ môn", x: 50, yA: 9, yB: 91 },
      { id: "lb", role: "DF", label: "HV", fullLabel: "Hậu vệ trái", x: 26, yA: 20, yB: 80 },
      { id: "rb", role: "DF", label: "HV", fullLabel: "Hậu vệ phải", x: 74, yA: 20, yB: 80 },
      { id: "lm", role: "MF", label: "TV", fullLabel: "Tiền vệ trái", x: 30, yA: 32, yB: 68 },
      { id: "rm", role: "MF", label: "TV", fullLabel: "Tiền vệ phải", x: 70, yA: 32, yB: 68 },
      { id: "ls", role: "FW", label: "TĐ", fullLabel: "Tiền đạo trái", x: 32, yA: 43, yB: 57 },
      { id: "rs", role: "FW", label: "TĐ", fullLabel: "Tiền đạo phải", x: 68, yA: 43, yB: 57 },
    ],
  },
};

export const ROLE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  GK: { bg: "rgba(234, 179, 8, 0.25)", text: "#facc15", border: "#eab308" },
  DF: { bg: "rgba(59, 130, 246, 0.25)", text: "#60a5fa", border: "#3b82f6" },
  MF: { bg: "rgba(168, 85, 247, 0.25)", text: "#c084fc", border: "#a855f7" },
  FW: { bg: "rgba(239, 68, 68, 0.25)", text: "#f87171", border: "#ef4444" },
};

// Sắp xếp ưu tiên theo vị trí đăng ký (Thủ môn lên đầu slot 0, rồi Hậu vệ, Tiền vệ, Tiền đạo)
// Khách/Bạn đi cùng (isGuest) có điểm cao nhất (10) để mặc định NẰM Ở GHẾ DỰ BỊ!
export function autoSortSân7(players: PitchPlayer[]): PitchPlayer[] {
  const getScore = (p: PitchPlayer) => {
    if (p.isGuest) return 10;
    if (p.position === "GOALKEEPER") return 1;
    if (p.position === "DEFENDER") return 2;
    if (p.position === "MIDFIELDER") return 3;
    if (p.position === "FORWARD") return 4;
    return 5;
  };
  return [...players].sort((a, b) => getScore(a) - getScore(b));
}
