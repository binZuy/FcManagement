"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { Settings, History, RotateCcw, Volume2, VolumeX, CheckCircle, AlertTriangle, Gift, ArrowRight, Sparkles } from "lucide-react";
import { showToast } from "@/components/Toast";
import { formatCurrency } from "@/lib/utils";

export interface WheelOption {
  id: string;
  label: string;
  icon: string;
  color: string;
  weight: number; // Tỉ lệ % trúng ảo
}

export interface WheelMember {
  id: string;
  name: string;
  code: string;
  image?: string | null;
  jerseyNumber?: number | null;
  unpaidCount: number;
  totalDebt: number;
  spinsAvailable: number;
  canSpin: boolean;
  rewards: Array<{
    id: string;
    prizeId: string;
    label: string;
    icon: string;
    discountAmount: number;
    isFreeMatch: boolean;
    isFreeDrink: boolean;
    createdAt: string;
  }>;
}

export interface SpinHistoryItem {
  id: string;
  name: string;
  image?: string | null;
  prize: string;
  prizeId: string;
  discountAmount?: number;
  isFreeMatch?: boolean;
  createdAt: string;
}

export const DEFAULT_OPTIONS: WheelOption[] = [
  { id: "1", label: "Được cùng đội với binzuy", icon: "👑", color: "#3b82f6", weight: 35 },
  { id: "2", label: "Được mời nước Duy", icon: "☕", color: "#8b5cf6", weight: 20 },
  { id: "3", label: "Đen thế lần sau nhé", icon: "😂", color: "#64748b", weight: 35 },
  { id: "4", label: "discount 5k", icon: "💵", color: "#10b981", weight: 4.5 },
  { id: "5", label: "được Duy mời nước", icon: "🥤", color: "#f59e0b", weight: 4.4 },
  { id: "6", label: "jackpot free tiền sân trận sau", icon: "🎰", color: "#ef4444", weight: 0.1 },
];

interface LuckyWheelClientProps {
  currentUser: {
    name?: string | null;
    role: string;
  } | null;
  loggedInMemberId?: string | null;
}

export function LuckyWheelClient({ currentUser, loggedInMemberId }: LuckyWheelClientProps) {
  const isAdmin = currentUser?.role === "ADMIN";

  const [activeTab, setActiveTab] = useState<"wheel" | "settings">("wheel");
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);

  // Danh sách thành viên FC từ API
  const [members, setMembers] = useState<WheelMember[]>([]);
  const [selectedMemberId, setSelectedMemberId] = useState<string>("");
  const [isLoadingMembers, setIsLoadingMembers] = useState<boolean>(true);

  // Cấu hình 6 options gốc
  const [baseOptions, setBaseOptions] = useState<WheelOption[]>(DEFAULT_OPTIONS);

  // Vòng quay 12 ô (6 options x 2 vòng)
  const wheelSlices = [...baseOptions, ...baseOptions];

  // Trạng thái quay
  const [isSpinning, setIsSpinning] = useState<boolean>(false);
  const [rotation, setRotation] = useState<number>(0);
  const [winningPrize, setWinningPrize] = useState<WheelOption | null>(null);
  const [showWinnerModal, setShowWinnerModal] = useState<boolean>(false);
  const [history, setHistory] = useState<SpinHistoryItem[]>([]);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  // Lấy dữ liệu thành viên từ API
  const fetchMembers = useCallback(async () => {
    try {
      setIsLoadingMembers(true);
      const res = await fetch("/api/wheel/members");
      const data = await res.json();
      if (data.success && Array.isArray(data.members)) {
        setMembers(data.members);
        // Chọn thành viên mặc định
        setSelectedMemberId((prev) => {
          if (prev) return prev;
          if (loggedInMemberId) {
            const found = data.members.find((m: WheelMember) => m.id === loggedInMemberId);
            if (found) return found.id;
          }
          const savedId = typeof window !== "undefined" ? localStorage.getItem("fc_selected_member_id") : null;
          if (savedId && data.members.some((m: WheelMember) => m.id === savedId)) {
            return savedId;
          }
          return data.members[0]?.id || "";
        });
      }
    } catch (e) {
      console.error("Lỗi tải danh sách thành viên:", e);
    } finally {
      setIsLoadingMembers(false);
    }
  }, [loggedInMemberId]);

  // Lấy lịch sử quay công khai
  const fetchHistory = useCallback(async () => {
    try {
      const res = await fetch("/api/wheel/spin");
      const data = await res.json();
      if (data.success && Array.isArray(data.history)) {
        setHistory(data.history);
      }
    } catch (e) {
      console.error("Lỗi tải lịch sử quay:", e);
    }
  }, []);

  useEffect(() => {
    fetchMembers();
    fetchHistory();

    // Load options (v3)
    const savedOptions = localStorage.getItem("fc_wheel_options_v3");
    if (savedOptions) {
      try {
        setBaseOptions(JSON.parse(savedOptions));
      } catch (e) {
        console.error(e);
      }
    }
  }, [fetchMembers, fetchHistory]);

  const handleSelectMember = (memberId: string) => {
    setSelectedMemberId(memberId);
    if (typeof window !== "undefined") {
      localStorage.setItem("fc_selected_member_id", memberId);
    }
  };

  const selectedMember = members.find((m) => m.id === selectedMemberId);

  // Âm thanh Web Audio API
  const playTickSound = () => {
    if (!soundEnabled || typeof window === "undefined") return;
    try {
      if (!audioCtxRef.current) {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContextClass) {
          audioCtxRef.current = new AudioContextClass();
        }
      }
      const ctx = audioCtxRef.current;
      if (!ctx) return;
      if (ctx.state === "suspended") ctx.resume();

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(700, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(150, ctx.currentTime + 0.04);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.04);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.05);
    } catch (e) {}
  };

  const playFanfareSound = () => {
    if (!soundEnabled || typeof window === "undefined") return;
    try {
      if (!audioCtxRef.current) {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContextClass) {
          audioCtxRef.current = new AudioContextClass();
        }
      }
      const ctx = audioCtxRef.current;
      if (!ctx) return;
      if (ctx.state === "suspended") ctx.resume();

      [440, 554, 659, 880].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.2, ctx.currentTime + idx * 0.1);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + idx * 0.1 + 0.3);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + idx * 0.1);
        osc.stop(ctx.currentTime + idx * 0.1 + 0.35);
      });
    } catch (e) {}
  };

  // Vẽ Canvas Vòng Quay 12 múi
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const size = canvas.width;
    const center = size / 2;
    const radius = center - 14;
    const sliceAngle = (2 * Math.PI) / wheelSlices.length;

    ctx.clearRect(0, 0, size, size);

    // Vẽ viền kim loại vàng bên ngoài
    ctx.beginPath();
    ctx.arc(center, center, radius + 10, 0, 2 * Math.PI);
    ctx.fillStyle = "#ca8a04";
    ctx.fill();

    ctx.beginPath();
    ctx.arc(center, center, radius + 6, 0, 2 * Math.PI);
    ctx.fillStyle = "#facc15";
    ctx.fill();

    ctx.beginPath();
    ctx.arc(center, center, radius + 3, 0, 2 * Math.PI);
    ctx.fillStyle = "#0f172a";
    ctx.fill();

    // Vẽ 12 ô màu xen kẽ
    wheelSlices.forEach((slice, i) => {
      const startAngle = i * sliceAngle;
      const endAngle = startAngle + sliceAngle;

      ctx.beginPath();
      ctx.moveTo(center, center);
      ctx.arc(center, center, radius, startAngle, endAngle);
      ctx.closePath();

      ctx.fillStyle = slice.color;
      ctx.fill();

      ctx.lineWidth = 1.5;
      ctx.strokeStyle = "rgba(255, 255, 255, 0.25)";
      ctx.stroke();

      // Vẽ chữ & Icon
      ctx.save();
      ctx.translate(center, center);
      ctx.rotate(startAngle + sliceAngle / 2);
      ctx.textAlign = "right";
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 11px system-ui, -apple-system, sans-serif";
      ctx.shadowColor = "rgba(0,0,0,0.8)";
      ctx.shadowBlur = 4;

      const labelText = slice.label.length > 15 ? slice.label.slice(0, 13) + ".." : slice.label;
      ctx.fillText(`${slice.icon} ${labelText}`, radius - 14, 4);

      ctx.restore();
    });

    // Vẽ tâm vòng quay (Hub)
    ctx.beginPath();
    ctx.arc(center, center, 28, 0, 2 * Math.PI);
    ctx.fillStyle = "#0f172a";
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = "#facc15";
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(center, center, 14, 0, 2 * Math.PI);
    ctx.fillStyle = "#eab308";
    ctx.fill();

    ctx.fillStyle = "#0f172a";
    ctx.font = "bold 10px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("SPIN", center, center);

    // Vẽ các chấm đèn LED nhỏ quanh viền
    const dotCount = 24;
    for (let d = 0; d < dotCount; d++) {
      const dotAngle = (d * (2 * Math.PI)) / dotCount;
      const dotX = center + (radius + 8) * Math.cos(dotAngle);
      const dotY = center + (radius + 8) * Math.sin(dotAngle);

      ctx.beginPath();
      ctx.arc(dotX, dotY, 3, 0, 2 * Math.PI);
      ctx.fillStyle = d % 2 === 0 ? "#ffffff" : "#fef08a";
      ctx.fill();
    }
  }, [baseOptions, wheelSlices]);

  // Thuật toán quay theo Tỉ lệ ảo
  const handleSpin = async () => {
    if (isSpinning) return;

    if (!selectedMember) {
      showToast.error("Vui lòng chọn thành viên FC trước khi quay!");
      return;
    }

    if (selectedMember.unpaidCount > 0) {
      showToast.error(`Thành viên này còn nợ ${selectedMember.unpaidCount} trận. Phải thanh toán hết bill mới được quay!`);
      return;
    }

    if (selectedMember.spinsAvailable <= 0) {
      showToast.error("Bạn đã hết lượt quay! Hãy đá trận tiếp theo và thanh toán đủ để nhận thêm lượt nhé!");
      return;
    }

    // Chọn giải thưởng theo tỉ lệ %
    const totalWeight = baseOptions.reduce((sum, opt) => sum + Number(opt.weight || 0), 0);
    let randomNum = Math.random() * (totalWeight > 0 ? totalWeight : 100);
    let chosenOption = baseOptions[0];

    for (const opt of baseOptions) {
      if (randomNum < opt.weight) {
        chosenOption = opt;
        break;
      }
      randomNum -= opt.weight;
    }

    // Tìm vị trí của chosenOption trên 12 ô
    const matchingIndices: number[] = [];
    wheelSlices.forEach((slice, idx) => {
      if (slice.id === chosenOption.id) matchingIndices.push(idx);
    });
    const targetSliceIndex = matchingIndices[Math.floor(Math.random() * matchingIndices.length)];

    // Tính góc quay
    const sliceDegrees = 360 / wheelSlices.length;
    const baseTargetAngle = 270 - (targetSliceIndex * sliceDegrees + sliceDegrees / 2);
    const extraSpins = 360 * (5 + Math.floor(Math.random() * 3));
    const finalAngle = rotation + extraSpins + ((baseTargetAngle - (rotation % 360) + 360) % 360);

    setIsSpinning(true);
    setWinningPrize(null);
    setRotation(finalAngle);

    // Âm thanh tick...tick khi kim quét
    let tickCount = 0;
    const tickInterval = setInterval(() => {
      tickCount++;
      playTickSound();
      if (tickCount > 35) clearInterval(tickInterval);
    }, 120);

    // Kết thúc vòng quay (sau 4.5 giây)
    setTimeout(async () => {
      setIsSpinning(false);
      setWinningPrize(chosenOption);
      setShowWinnerModal(true);
      playFanfareSound();

      // Gửi API trừ lượt quay & lưu voucher thưởng vào DB
      try {
        const res = await fetch("/api/wheel/spin", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            memberId: selectedMember.id,
            prizeId: chosenOption.id,
            label: chosenOption.label,
            icon: chosenOption.icon,
          }),
        });

        const data = await res.json();
        if (data.success) {
          // Cập nhật số lượt quay của member local
          setMembers((prev) =>
            prev.map((m) =>
              m.id === selectedMember.id
                ? {
                    ...m,
                    spinsAvailable: data.spinsRemaining,
                    rewards: [data.reward, ...m.rewards],
                  }
                : m
            )
          );
          fetchHistory();
        } else {
          showToast.error(data.error || "Lỗi khi lưu kết quả quay");
        }
      } catch (err) {
        console.error("Lỗi gọi API quay:", err);
      }
    }, 4500);
  };

  // Lưu cấu hình Admin
  const handleSaveSettings = () => {
    localStorage.setItem("fc_wheel_options_v3", JSON.stringify(baseOptions));
    showToast.success("Đã lưu thiết lập tỉ lệ vòng quay!");
    setActiveTab("wheel");
  };

  const handleResetSettings = () => {
    setBaseOptions(DEFAULT_OPTIONS);
    localStorage.removeItem("fc_wheel_options_v3");
    showToast.success("Đã khôi phục thiết lập mặc định!");
  };

  const updateOption = (index: number, field: keyof WheelOption, value: any) => {
    setBaseOptions((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px", maxWidth: "880px", margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
        <div>
          <h1 style={{ fontSize: "1.6rem", fontWeight: 900, color: "var(--card-foreground)", display: "flex", alignItems: "center", gap: "8px" }}>
            Vòng Quay May Mắn 🎡✨
          </h1>
          <p style={{ fontSize: "0.82rem", color: "var(--muted-foreground)" }}>
            Thanh toán sạch nợ nhận ngay 1 lượt quay · Cơ hội nhận Voucher 5k & Free sân!
          </p>
        </div>

        {/* Tab switcher & Sound button */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <button
            type="button"
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="btn btn-secondary"
            style={{ padding: "6px 10px", fontSize: "0.8rem" }}
            title={soundEnabled ? "Tắt âm thanh" : "Bật âm thanh"}
          >
            {soundEnabled ? <Volume2 size={16} color="#22c55e" /> : <VolumeX size={16} color="#94a3b8" />}
          </button>

          <div style={{ display: "flex", background: "rgba(255,255,255,0.06)", borderRadius: "8px", padding: "3px" }}>
            <button
              onClick={() => setActiveTab("wheel")}
              style={{
                padding: "6px 14px",
                borderRadius: "6px",
                border: "none",
                background: activeTab === "wheel" ? "var(--primary)" : "transparent",
                color: activeTab === "wheel" ? "#052e16" : "var(--card-foreground)",
                fontWeight: 700,
                fontSize: "0.8rem",
                cursor: "pointer",
              }}
            >
              🎰 Vòng Quay
            </button>
            <button
              onClick={() => setActiveTab("settings")}
              style={{
                padding: "6px 14px",
                borderRadius: "6px",
                border: "none",
                background: activeTab === "settings" ? "var(--primary)" : "transparent",
                color: activeTab === "settings" ? "#052e16" : "var(--card-foreground)",
                fontWeight: 700,
                fontSize: "0.8rem",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "4px",
              }}
            >
              <Settings size={14} /> Cài Đặt {isAdmin && "(Admin)"}
            </button>
          </div>
        </div>
      </div>

      {/* TAB 1: MÀN HÌNH QUAY THƯỞNG */}
      {activeTab === "wheel" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "20px", alignItems: "start" }}>
          {/* Cột trái: Vòng quay đồ họa & Selector */}
          <div
            className="glass-card"
            style={{
              padding: "24px 16px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              position: "relative",
              borderRadius: "18px",
              background: "radial-gradient(circle, rgba(30,41,59,0.8) 0%, rgba(15,23,42,0.95) 100%)",
              border: "1px solid rgba(250,204,21,0.3)",
              boxShadow: "0 10px 40px rgba(0,0,0,0.5)",
              overflow: "hidden",
            }}
          >
            {/* Kim chỉ (Pointer) ở góc 12h */}
            <div
              style={{
                position: "absolute",
                top: "16px",
                zIndex: 20,
                width: 0,
                height: 0,
                borderLeft: "16px solid transparent",
                borderRight: "16px solid transparent",
                borderTop: "32px solid #ef4444",
                filter: "drop-shadow(0 4px 6px rgba(0,0,0,0.6))",
              }}
            />
            <div
              style={{
                position: "absolute",
                top: "14px",
                zIndex: 21,
                width: "12px",
                height: "12px",
                borderRadius: "50%",
                background: "#fef08a",
                border: "2px solid #ef4444",
              }}
            />

            {/* Canvas Wheel */}
            <div style={{ width: "300px", height: "300px", position: "relative", marginTop: "12px" }}>
              <canvas
                ref={canvasRef}
                width={300}
                height={300}
                style={{
                  width: "100%",
                  height: "100%",
                  borderRadius: "50%",
                  transform: `rotate(${rotation}deg)`,
                  transition: isSpinning ? "transform 4.5s cubic-bezier(0.15, 0.95, 0.35, 1)" : "none",
                }}
              />
            </div>

            {/* Chọn Thành Viên FC Nhận Thưởng */}
            <div style={{ marginTop: "22px", width: "100%", maxWidth: "320px", display: "flex", flexDirection: "column", gap: "10px" }}>
              <div>
                <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 700, color: "#facc15", marginBottom: "4px" }}>
                  👤 Chọn thành viên nhận thưởng:
                </label>
                <select
                  value={selectedMemberId}
                  onChange={(e) => handleSelectMember(e.target.value)}
                  disabled={isSpinning || isLoadingMembers}
                  className="form-input"
                  style={{
                    width: "100%",
                    padding: "9px 12px",
                    borderRadius: "8px",
                    background: "#0f172a",
                    borderColor: selectedMember?.unpaidCount === 0 ? "#4ade80" : "var(--border)",
                    color: "white",
                    fontSize: "0.85rem",
                    fontWeight: 700,
                  }}
                >
                  {isLoadingMembers && <option value="">Đang tải danh sách thành viên...</option>}
                  {!isLoadingMembers && members.length === 0 && <option value="">Chưa có thành viên nào</option>}
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} {m.jerseyNumber ? `(#${m.jerseyNumber})` : ""} - {m.unpaidCount > 0 ? `⚠️ Nợ ${m.unpaidCount} trận` : `✅ Đủ điều kiện (${m.spinsAvailable} lượt)`}
                    </option>
                  ))}
                </select>
              </div>

              {/* Thông báo điều kiện thanh toán */}
              {selectedMember && (
                <div style={{ fontSize: "0.76rem", borderRadius: "8px", padding: "8px 10px", lineHeight: 1.4 }}>
                  {selectedMember.unpaidCount > 0 ? (
                    <div style={{ background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: "6px", padding: "8px", color: "#f87171" }}>
                      <div style={{ fontWeight: 800, display: "flex", alignItems: "center", gap: "4px", marginBottom: "2px" }}>
                        <AlertTriangle size={14} color="#f87171" /> Còn nợ {selectedMember.unpaidCount} trận ({formatCurrency(selectedMember.totalDebt)})
                      </div>
                      <div>Cần thanh toán sạch toàn bộ bill để nhận 1 lượt quay nhé!</div>
                      <Link
                        href={`/payments/${selectedMember.id}`}
                        style={{ display: "inline-flex", alignItems: "center", gap: "4px", color: "#facc15", fontWeight: 700, marginTop: "4px", textDecoration: "none" }}
                      >
                        Thanh toán ngay <ArrowRight size={12} />
                      </Link>
                    </div>
                  ) : selectedMember.spinsAvailable > 0 ? (
                    <div style={{ background: "rgba(34,197,94,0.12)", border: "1px solid rgba(34,197,94,0.3)", borderRadius: "6px", padding: "8px", color: "#4ade80" }}>
                      <div style={{ fontWeight: 800, display: "flex", alignItems: "center", gap: "4px" }}>
                        <CheckCircle size={14} color="#4ade80" /> Đã sạch nợ · Có {selectedMember.spinsAvailable} lượt quay khả dụng 🎟️
                      </div>
                    </div>
                  ) : (
                    <div style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "6px", padding: "8px", color: "var(--muted-foreground)" }}>
                      <div>💡 Đã sạch nợ nhưng đã dùng hết lượt quay. Hãy tham gia trận sau và đóng đủ để nhận thêm lượt!</div>
                    </div>
                  )}
                </div>
              )}

              {/* Nút Quay */}
              <button
                type="button"
                onClick={handleSpin}
                disabled={isSpinning || !selectedMember || selectedMember.unpaidCount > 0 || selectedMember.spinsAvailable <= 0}
                className="btn btn-primary"
                style={{
                  padding: "12px",
                  fontSize: "1rem",
                  fontWeight: 900,
                  borderRadius: "10px",
                  background:
                    isSpinning || !selectedMember || selectedMember.unpaidCount > 0 || selectedMember.spinsAvailable <= 0
                      ? "rgba(255,255,255,0.08)"
                      : "linear-gradient(135deg, #facc15, #eab308)",
                  color: isSpinning || !selectedMember || selectedMember.unpaidCount > 0 || selectedMember.spinsAvailable <= 0 ? "var(--muted-foreground)" : "#0f172a",
                  boxShadow:
                    isSpinning || !selectedMember || selectedMember.unpaidCount > 0 || selectedMember.spinsAvailable <= 0
                      ? "none"
                      : "0 4px 20px rgba(234,179,8,0.4)",
                  border: "none",
                  cursor: isSpinning || !selectedMember || selectedMember.unpaidCount > 0 || selectedMember.spinsAvailable <= 0 ? "not-allowed" : "pointer",
                }}
              >
                {isSpinning
                  ? "ĐANG QUAY..."
                  : selectedMember?.unpaidCount && selectedMember.unpaidCount > 0
                  ? "CÒN NỢ BILL - CHƯA ĐƯỢC QUAY"
                  : selectedMember?.spinsAvailable && selectedMember.spinsAvailable > 0
                  ? `🎰 QUAY NGAY (${selectedMember.spinsAvailable} lượt)`
                  : "HẾT LƯỢT QUAY"}
              </button>
            </div>
          </div>

          {/* Cột phải: Kho Voucher của Thành viên & Lịch sử quay toàn đội */}
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {/* Kho Voucher & Quà của Thành Viên Đang Chọn */}
            {selectedMember && (
              <div
                className="glass-card"
                style={{
                  padding: "16px",
                  borderRadius: "14px",
                  background: "linear-gradient(135deg, rgba(34,197,94,0.08), rgba(15,23,42,0.8))",
                  border: "1px solid rgba(34,197,94,0.25)",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                  <span style={{ fontSize: "0.85rem", fontWeight: 800, color: "var(--card-foreground)", display: "flex", alignItems: "center", gap: "6px" }}>
                    <Gift size={16} color="#4ade80" /> Kho Quà & Voucher: {selectedMember.name}
                  </span>
                  <span style={{ fontSize: "0.72rem", background: "rgba(34,197,94,0.15)", color: "#4ade80", padding: "2px 8px", borderRadius: "999px", fontWeight: 700 }}>
                    {selectedMember.rewards?.length || 0} phần thưởng
                  </span>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "6px", maxHeight: "160px", overflowY: "auto" }}>
                  {selectedMember.rewards && selectedMember.rewards.length > 0 ? (
                    selectedMember.rewards.map((rw) => (
                      <div
                        key={rw.id}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          padding: "6px 10px",
                          borderRadius: "6px",
                          background: "rgba(255,255,255,0.03)",
                          border: "1px solid rgba(255,255,255,0.06)",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <span>{rw.icon}</span>
                          <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "#f8fafc" }}>{rw.label}</span>
                        </div>
                        <span style={{ fontSize: "0.68rem", color: "#4ade80", fontWeight: 700 }}>Khả dụng</span>
                      </div>
                    ))
                  ) : (
                    <div style={{ fontSize: "0.75rem", color: "var(--muted-foreground)", textAlign: "center", padding: "12px 0" }}>
                      Chưa có voucher nào. Hãy quay thưởng để trúng Discount 5k & Free sân!
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Bảng Lịch sử quay FC (Toàn đội) */}
            <div
              className="glass-card"
              style={{
                padding: "16px",
                borderRadius: "14px",
                display: "flex",
                flexDirection: "column",
                gap: "10px",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "0.85rem", fontWeight: 800, color: "var(--card-foreground)", display: "flex", alignItems: "center", gap: "6px" }}>
                  <History size={15} color="var(--primary)" /> Lịch Sử Quay Gần Đây ({history.length})
                </span>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "8px", maxHeight: "280px", overflowY: "auto" }}>
                {history.map((item) => (
                  <div
                    key={item.id}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "8px 10px",
                      borderRadius: "8px",
                      background: "rgba(255,255,255,0.03)",
                      border: "1px solid rgba(255,255,255,0.05)",
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 700, fontSize: "0.82rem", color: "#f8fafc" }}>
                        {item.name}
                      </div>
                      <div style={{ fontSize: "0.68rem", color: "var(--muted-foreground)" }}>
                        {new Date(item.createdAt).toLocaleDateString("vi-VN", { hour: "2-digit", minute: "2-digit" })}
                      </div>
                    </div>
                    <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "#facc15", background: "rgba(250,204,21,0.12)", padding: "2px 8px", borderRadius: "6px" }}>
                      {item.prize}
                    </span>
                  </div>
                ))}

                {history.length === 0 && (
                  <div style={{ textAlign: "center", padding: "24px 0", color: "var(--muted-foreground)", fontSize: "0.8rem" }}>
                    Chưa có ai quay thưởng hôm nay. Hãy là người mở bát! 🎯
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: CÀI ĐẶT TỈ LỆ ẢO & PHẦN THƯỞNG (ADMIN SETTING) */}
      {activeTab === "settings" && (
        <div className="glass-card" style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "16px", borderRadius: "16px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
            <div>
              <h2 style={{ fontSize: "1.1rem", fontWeight: 800, color: "var(--card-foreground)" }}>
                ⚙️ Thiết Lập 6 Ô Phần Thưởng & Tỉ Lệ Trúng Ảo
              </h2>
              <div style={{ fontSize: "0.75rem", color: "var(--muted-foreground)" }}>
                6 phần thưởng sẽ được nhân đôi thành 12 ô trên vòng quay tròn đối xứng
              </div>
            </div>

            <div style={{ display: "flex", gap: "8px" }}>
              <button
                type="button"
                onClick={handleResetSettings}
                className="btn btn-secondary"
                style={{ padding: "6px 12px", fontSize: "0.78rem", display: "flex", alignItems: "center", gap: "4px" }}
              >
                <RotateCcw size={14} /> Mặc định
              </button>
              <button
                type="button"
                onClick={handleSaveSettings}
                className="btn btn-primary"
                style={{ padding: "6px 16px", fontSize: "0.82rem", fontWeight: 700 }}
              >
                Lưu cài đặt
              </button>
            </div>
          </div>

          {/* Danh sách 6 options */}
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {baseOptions.map((opt, idx) => (
              <div
                key={opt.id}
                style={{
                  display: "grid",
                  gridTemplateColumns: "50px 1fr 90px 100px",
                  gap: "10px",
                  alignItems: "center",
                  padding: "10px 12px",
                  borderRadius: "10px",
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid var(--border)",
                }}
              >
                {/* Icon Emoji */}
                <input
                  type="text"
                  value={opt.icon}
                  onChange={(e) => updateOption(idx, "icon", e.target.value)}
                  style={{
                    padding: "6px",
                    textAlign: "center",
                    fontSize: "1.2rem",
                    borderRadius: "6px",
                    background: "rgba(0,0,0,0.3)",
                    border: "1px solid var(--border)",
                    color: "white",
                  }}
                  title="Biểu tượng Emoji"
                />

                {/* Tên quà */}
                <input
                  type="text"
                  value={opt.label}
                  onChange={(e) => updateOption(idx, "label", e.target.value)}
                  style={{
                    padding: "8px 10px",
                    fontSize: "0.82rem",
                    borderRadius: "6px",
                    background: "rgba(0,0,0,0.3)",
                    border: "1px solid var(--border)",
                    color: "white",
                    fontWeight: 600,
                  }}
                  placeholder="Tên phần thưởng..."
                />

                {/* Màu sắc */}
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <input
                    type="color"
                    value={opt.color}
                    onChange={(e) => updateOption(idx, "color", e.target.value)}
                    style={{
                      width: "32px",
                      height: "32px",
                      border: "none",
                      borderRadius: "6px",
                      background: "transparent",
                      cursor: "pointer",
                    }}
                  />
                  <span style={{ fontSize: "0.7rem", color: "var(--muted-foreground)" }}>Màu</span>
                </div>

                {/* Tỉ lệ % trúng ảo */}
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      step="0.1"
                      value={opt.weight}
                      onChange={(e) => updateOption(idx, "weight", parseFloat(e.target.value) || 0)}
                      style={{
                        width: "60px",
                        padding: "6px 8px",
                        textAlign: "center",
                        fontSize: "0.82rem",
                        fontWeight: 700,
                        borderRadius: "6px",
                        background: "rgba(0,0,0,0.3)",
                        border: "1px solid rgba(250,204,21,0.3)",
                        color: "#facc15",
                      }}
                    />
                    <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "#facc15" }}>%</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px", background: "rgba(250,204,21,0.08)", borderRadius: "8px", border: "1px solid rgba(250,204,21,0.2)" }}>
            <span style={{ fontSize: "0.8rem", color: "#fef08a" }}>
              💡 Tổng tỉ lệ ảo: {Number(baseOptions.reduce((sum, o) => sum + Number(o.weight || 0), 0).toFixed(2))}% (Hệ thống tự động chuẩn hóa tỉ lệ theo trọng số)
            </span>
          </div>
        </div>
      )}

      {/* POPUP CHÚC MỪNG CHIẾN THẮNG (CONGRATS MODAL) */}
      {showWinnerModal && winningPrize && selectedMember && (
        <div
          onClick={() => setShowWinnerModal(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.85)",
            backdropFilter: "blur(6px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 100,
            padding: "20px",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)",
              border: "2px solid #facc15",
              borderRadius: "20px",
              padding: "32px 24px",
              maxWidth: "400px",
              width: "100%",
              textAlign: "center",
              boxShadow: "0 20px 60px rgba(250,204,21,0.3)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "14px",
              position: "relative",
            }}
          >
            <div style={{ fontSize: "4.5rem", lineHeight: 1 }}>{winningPrize.icon}</div>

            <div style={{ fontSize: "0.82rem", fontWeight: 800, color: "#facc15", textTransform: "uppercase", letterSpacing: "1px", display: "flex", alignItems: "center", gap: "4px" }}>
              <Sparkles size={16} /> Kết Quả Quay Thưởng!
            </div>

            <h3 style={{ fontSize: "1.45rem", fontWeight: 900, color: "#ffffff" }}>
              {winningPrize.label}
            </h3>

            <div style={{ fontSize: "0.85rem", color: "var(--muted-foreground)", lineHeight: 1.5 }}>
              Chúc mừng <strong>{selectedMember.name}</strong> đã trúng phần thưởng!
              {winningPrize.id === "4" && (
                <div style={{ marginTop: "6px", color: "#4ade80", fontWeight: 700 }}>
                  🎟️ Voucher giảm 5.000đ đã được lưu vào tài khoản để trừ tiền sân trận sau!
                </div>
              )}
              {winningPrize.id === "6" && (
                <div style={{ marginTop: "6px", color: "#ef4444", fontWeight: 700 }}>
                  🎰 JACKPOT! Bạn được miễn phí 100% tiền sân trận tiếp theo!
                </div>
              )}
              {winningPrize.id === "5" && (
                <div style={{ marginTop: "6px", color: "#f59e0b", fontWeight: 700 }}>
                  🥤 Trận sau nhớ tìm Duy để được mời nước nhé!
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => setShowWinnerModal(false)}
              className="btn btn-primary"
              style={{
                marginTop: "10px",
                padding: "10px 28px",
                fontSize: "0.95rem",
                fontWeight: 800,
                borderRadius: "10px",
                background: "linear-gradient(135deg, #facc15, #eab308)",
                color: "#0f172a",
                border: "none",
                cursor: "pointer",
              }}
            >
              Nhận Quà & Đóng
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
