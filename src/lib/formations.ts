// src/lib/formations.ts
// Định nghĩa sơ đồ chiến thuật sân 7 (7 người / đội)
// x, y là % tính từ góc trên-trái của sân (0-100)
// Hướng: y=0 là khung thành đối phương, y=100 là khung thành mình (GK)

export interface PositionSlot {
  id: string;      // Unique id trong formation
  label: string;   // "GK", "LB", "CB", ...
  fullLabel: string; // "Thủ môn", "Hậu vệ trái", ...
  x: number;       // % theo chiều ngang (0=trái, 100=phải)
  y: number;       // % theo chiều dọc (0=khung thành trên, 100=khung thành dưới)
}

export interface FormationConfig {
  id: string;       // "3-2-1"
  name: string;     // "Tấn công"
  description: string;
  slots: PositionSlot[];
}

// Sân được vẽ dọc: GK ở phía dưới (y cao), tiền đạo ở phía trên (y thấp)
export const FORMATIONS: FormationConfig[] = [
  {
    id: "3-2-1",
    name: "3-2-1 Tấn công",
    description: "3 hậu vệ, 2 tiền vệ, 1 tiền đạo",
    slots: [
      { id: "gk",  label: "GK",  fullLabel: "Thủ môn",        x: 50, y: 88 },
      { id: "lb",  label: "LB",  fullLabel: "Hậu vệ trái",    x: 20, y: 70 },
      { id: "cb",  label: "CB",  fullLabel: "Hậu vệ trung tâm", x: 50, y: 70 },
      { id: "rb",  label: "RB",  fullLabel: "Hậu vệ phải",    x: 80, y: 70 },
      { id: "lm",  label: "LM",  fullLabel: "Tiền vệ trái",   x: 30, y: 45 },
      { id: "rm",  label: "RM",  fullLabel: "Tiền vệ phải",   x: 70, y: 45 },
      { id: "st",  label: "ST",  fullLabel: "Tiền đạo",       x: 50, y: 20 },
    ],
  },
  {
    id: "2-3-1",
    name: "2-3-1 Cân bằng",
    description: "2 hậu vệ, 3 tiền vệ, 1 tiền đạo",
    slots: [
      { id: "gk",  label: "GK",  fullLabel: "Thủ môn",        x: 50, y: 88 },
      { id: "lb",  label: "LB",  fullLabel: "Hậu vệ trái",    x: 30, y: 70 },
      { id: "rb",  label: "RB",  fullLabel: "Hậu vệ phải",    x: 70, y: 70 },
      { id: "lm",  label: "LM",  fullLabel: "Tiền vệ trái",   x: 20, y: 48 },
      { id: "cm",  label: "CM",  fullLabel: "Tiền vệ trung",  x: 50, y: 48 },
      { id: "rm",  label: "RM",  fullLabel: "Tiền vệ phải",   x: 80, y: 48 },
      { id: "st",  label: "ST",  fullLabel: "Tiền đạo",       x: 50, y: 20 },
    ],
  },
  {
    id: "2-2-2",
    name: "2-2-2 Cân bằng kép",
    description: "2 hậu vệ, 2 tiền vệ, 2 tiền đạo",
    slots: [
      { id: "gk",  label: "GK",  fullLabel: "Thủ môn",        x: 50, y: 88 },
      { id: "lb",  label: "LB",  fullLabel: "Hậu vệ trái",    x: 30, y: 70 },
      { id: "rb",  label: "RB",  fullLabel: "Hậu vệ phải",    x: 70, y: 70 },
      { id: "lm",  label: "LM",  fullLabel: "Tiền vệ trái",   x: 30, y: 48 },
      { id: "rm",  label: "RM",  fullLabel: "Tiền vệ phải",   x: 70, y: 48 },
      { id: "ls",  label: "LS",  fullLabel: "Tiền đạo trái",  x: 30, y: 20 },
      { id: "rs",  label: "RS",  fullLabel: "Tiền đạo phải",  x: 70, y: 20 },
    ],
  },
  {
    id: "1-3-2",
    name: "1-3-2 Phòng thủ",
    description: "1 hậu vệ trung, 3 hậu vệ, 2 tiền đạo",
    slots: [
      { id: "gk",  label: "GK",  fullLabel: "Thủ môn",        x: 50, y: 88 },
      { id: "sw",  label: "SW",  fullLabel: "Hậu vệ quét",    x: 50, y: 74 },
      { id: "lb",  label: "LB",  fullLabel: "Hậu vệ trái",    x: 20, y: 60 },
      { id: "cb",  label: "CB",  fullLabel: "Hậu vệ trung",   x: 50, y: 60 },
      { id: "rb",  label: "RB",  fullLabel: "Hậu vệ phải",    x: 80, y: 60 },
      { id: "ls",  label: "LS",  fullLabel: "Tiền đạo trái",  x: 30, y: 25 },
      { id: "rs",  label: "RS",  fullLabel: "Tiền đạo phải",  x: 70, y: 25 },
    ],
  },
  {
    id: "3-1-2",
    name: "3-1-2 Kiểm soát",
    description: "3 hậu vệ, 1 tiền vệ trung, 2 tiền đạo",
    slots: [
      { id: "gk",  label: "GK",  fullLabel: "Thủ môn",        x: 50, y: 88 },
      { id: "lb",  label: "LB",  fullLabel: "Hậu vệ trái",    x: 20, y: 70 },
      { id: "cb",  label: "CB",  fullLabel: "Hậu vệ trung",   x: 50, y: 70 },
      { id: "rb",  label: "RB",  fullLabel: "Hậu vệ phải",    x: 80, y: 70 },
      { id: "cm",  label: "CM",  fullLabel: "Tiền vệ trung",  x: 50, y: 48 },
      { id: "ls",  label: "LS",  fullLabel: "Tiền đạo trái",  x: 30, y: 22 },
      { id: "rs",  label: "RS",  fullLabel: "Tiền đạo phải",  x: 70, y: 22 },
    ],
  },
];

export function getFormation(id: string): FormationConfig | undefined {
  return FORMATIONS.find((f) => f.id === id);
}

export function getDefaultFormation(): FormationConfig {
  return FORMATIONS[0];
}
