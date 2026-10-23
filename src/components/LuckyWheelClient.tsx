"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { Settings, History, RotateCcw, Volume2, VolumeX, CheckCircle, AlertTriangle, Gift, ArrowRight, Sparkles, Plus, Trash2, Check, RefreshCw } from "lucide-react";
import { showToast } from "@/components/Toast";
import { formatCurrency } from "@/lib/utils";
import {
  WheelOption,
  DEFAULT_WHEEL_OPTIONS,
  PRESET_WHEEL_COLORS,
  PRESET_WHEEL_ICONS,
} from "@/lib/wheelConstants";

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

function adjustBrightness(hex: string, percent: number): string {
  const cleanHex = hex.replace("#", "");
  const num = parseInt(cleanHex.length === 3 ? cleanHex.split("").map((c) => c + c).join("") : cleanHex, 16);
  if (isNaN(num)) return hex;
  const amt = Math.round(2.55 * percent);
  const R = Math.min(255, Math.max(0, (num >> 16) + amt));
  const G = Math.min(255, Math.max(0, ((num >> 8) & 0x00ff) + amt));
  const B = Math.min(255, Math.max(0, (num & 0x0000ff) + amt));
  return "#" + ((1 << 24) + (R << 16) + (G << 8) + B).toString(16).slice(1);
}

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

  // Cấu hình options gốc từ DB
  const [baseOptions, setBaseOptions] = useState<WheelOption[]>(DEFAULT_WHEEL_OPTIONS);
  const [isSavingSettings, setIsSavingSettings] = useState<boolean>(false);

  // Vòng quay linh hoạt: nếu <= 6 ô thì nhân đôi thành 2N ô đối xứng, nếu > 6 ô thì hiển thị N ô
  const wheelSlices = baseOptions.length <= 6 ? [...baseOptions, ...baseOptions] : [...baseOptions];

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

  // Lấy cấu hình vòng quay từ Database
  const fetchWheelSettings = useCallback(async () => {
    try {
      const res = await fetch("/api/wheel/settings");
      const data = await res.json();
      if (data.success && Array.isArray(data.options) && data.options.length > 0) {
        setBaseOptions(data.options);
      } else {
        setBaseOptions(DEFAULT_WHEEL_OPTIONS);
      }
    } catch (e) {
      console.error("Lỗi tải cấu hình vòng quay:", e);
      setBaseOptions(DEFAULT_WHEEL_OPTIONS);
    }
  }, []);

  useEffect(() => {
    fetchMembers();
    fetchHistory();
    fetchWheelSettings();
  }, [fetchMembers, fetchHistory, fetchWheelSettings]);

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

    // 1. Viền ngoài kim loại đa tầng sang trọng (Champagne Gold Metallic Rim)
    const rimGrad = ctx.createLinearGradient(0, 0, size, size);
    rimGrad.addColorStop(0, "#d97706");
    rimGrad.addColorStop(0.25, "#fef08a");
    rimGrad.addColorStop(0.5, "#b45309");
    rimGrad.addColorStop(0.75, "#fde047");
    rimGrad.addColorStop(1, "#78350f");

    ctx.save();
    ctx.beginPath();
    ctx.arc(center, center, radius + 11, 0, 2 * Math.PI);
    ctx.fillStyle = rimGrad;
    ctx.shadowColor = "rgba(0, 0, 0, 0.7)";
    ctx.shadowBlur = 10;
    ctx.fill();
    ctx.restore();

    // Rãnh sâu đen Obsidian viền trong
    ctx.beginPath();
    ctx.arc(center, center, radius + 4.5, 0, 2 * Math.PI);
    ctx.fillStyle = "#090d16";
    ctx.fill();

    // Viền kim loại mảnh viền ngoài múi
    ctx.beginPath();
    ctx.arc(center, center, radius + 1, 0, 2 * Math.PI);
    ctx.strokeStyle = "rgba(250, 204, 21, 0.6)";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // 2. Vẽ từng múi với Radial Gradient 3D
    wheelSlices.forEach((slice, i) => {
      const startAngle = i * sliceAngle;
      const endAngle = startAngle + sliceAngle;
      const midAngle = startAngle + sliceAngle / 2;

      ctx.save();
      ctx.beginPath();
      ctx.moveTo(center, center);
      ctx.arc(center, center, radius, startAngle, endAngle);
      ctx.closePath();

      // Gradient 3D từ tâm ra rìa tạo chiều sâu
      const edgeX = center + radius * Math.cos(midAngle);
      const edgeY = center + radius * Math.sin(midAngle);
      const sliceGrad = ctx.createLinearGradient(center, center, edgeX, edgeY);
      
      sliceGrad.addColorStop(0, adjustBrightness(slice.color, -28));
      sliceGrad.addColorStop(0.65, slice.color);
      sliceGrad.addColorStop(1, adjustBrightness(slice.color, 18));

      ctx.fillStyle = sliceGrad;
      ctx.fill();

      // Viền múi mạ vàng tinh xảo
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = "rgba(250, 204, 21, 0.4)";
      ctx.stroke();

      // Vẽ chữ & Icon
      ctx.translate(center, center);
      ctx.rotate(midAngle);
      ctx.textAlign = "right";
      ctx.fillStyle = "#f8fafc";
      ctx.font = "bold 11px system-ui, -apple-system, sans-serif";
      ctx.shadowColor = "rgba(0,0,0,0.9)";
      ctx.shadowBlur = 5;

      const labelText = slice.label.length > 15 ? slice.label.slice(0, 13) + ".." : slice.label;
      ctx.fillText(`${slice.icon} ${labelText}`, radius - 15, 4);

      ctx.restore();
    });

    // 3. Đèn LED ngọc trai phát sáng quanh viền (Glowing Jewel Pins)
    const dotCount = 24;
    for (let d = 0; d < dotCount; d++) {
      const dotAngle = (d * (2 * Math.PI)) / dotCount;
      const dotX = center + (radius + 7.5) * Math.cos(dotAngle);
      const dotY = center + (radius + 7.5) * Math.sin(dotAngle);

      ctx.save();
      ctx.beginPath();
      ctx.arc(dotX, dotY, 2.8, 0, 2 * Math.PI);
      ctx.fillStyle = d % 2 === 0 ? "#ffffff" : "#fef08a";
      ctx.shadowColor = "rgba(250, 204, 21, 0.85)";
      ctx.shadowBlur = 4;
      ctx.fill();
      ctx.restore();
    }

    // 4. Tâm vòng quay (Center Hub) sang trọng 3D
    // Vành ngoài vàng bóng
    const hubGrad = ctx.createLinearGradient(center - 28, center - 28, center + 28, center + 28);
    hubGrad.addColorStop(0, "#fde047");
    hubGrad.addColorStop(0.5, "#ca8a04");
    hubGrad.addColorStop(1, "#854d0e");

    ctx.save();
    ctx.beginPath();
    ctx.arc(center, center, 27, 0, 2 * Math.PI);
    ctx.fillStyle = hubGrad;
    ctx.shadowColor = "rgba(0,0,0,0.7)";
    ctx.shadowBlur = 8;
    ctx.fill();
    ctx.restore();

    // Vành trong đá đen Obsidian
    ctx.beginPath();
    ctx.arc(center, center, 22, 0, 2 * Math.PI);
    ctx.fillStyle = "#090d16";
    ctx.fill();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = "rgba(250, 204, 21, 0.5)";
    ctx.stroke();

    // Lõi trung tâm vàng kim
    const innerHub = ctx.createRadialGradient(center, center, 2, center, center, 13);
    innerHub.addColorStop(0, "#fef08a");
    innerHub.addColorStop(0.7, "#eab308");
    innerHub.addColorStop(1, "#a16207");

    ctx.beginPath();
    ctx.arc(center, center, 13, 0, 2 * Math.PI);
    ctx.fillStyle = innerHub;
    ctx.fill();

    // Chữ SPIN mạ vàng sắc nét
    ctx.fillStyle = "#0f172a";
    ctx.font = "900 10px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("SPIN", center, center + 0.5);
  }, [baseOptions, wheelSlices]);

  // Thuật toán quay theo Tỉ lệ ảo
  const handleSpin = async () => {
    if (isSpinning) return;

    if (!selectedMember) {
      showToast.error("Chọn ai quay đã bạn ơi!");
      return;
    }

    if (!currentUser) {
      showToast.error("Đăng nhập đã rồi quẩy nha 🤙!");
      return;
    }

    const isSelf = loggedInMemberId ? selectedMember.id === loggedInMemberId : false;
    if (!isAdmin && !isSelf) {
      showToast.error("Quay nick mình thui, đừng táy máy nick bạn bè 😆");
      return;
    }

    if (selectedMember.unpaidCount > 0) {
      showToast.error(`Còn nợ hèo ${selectedMember.unpaidCount} trận kìa, đóng xong mới quay được nha 💸`);
      return;
    }

    if (selectedMember.spinsAvailable <= 0) {
      showToast.error("Hết lượt òi! Trận sau đá tốt + nộp đủ là có lượt ngay nha 🔥");
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
          showToast.success("Ngon lành cành đào! Đã lưu phần thưởng rồi nhé 🎉");
        } else {
          showToast.error(data.error || "Lỗi khi lưu kết quả quay");
        }
      } catch (err) {
        console.error("Lỗi gọi API quay:", err);
      }
    }, 4500);
  };

  // Lưu cấu hình Admin vào Database
  const handleSaveSettings = async () => {
    try {
      setIsSavingSettings(true);
      const res = await fetch("/api/wheel/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ options: baseOptions }),
      });
      const data = await res.json();
      if (data.success) {
        setBaseOptions(data.options);
        showToast.success("Lưu cấu hình vào Database chuẩn đét rồi nhé! 🔥");
        setActiveTab("wheel");
      } else {
        showToast.error(data.error || "Lỗi lưu cấu hình");
      }
    } catch (e) {
      showToast.error("Không lưu được cài đặt vào DB");
    } finally {
      setIsSavingSettings(false);
    }
  };

  const handleResetSettings = async () => {
    if (!confirm("Khôi phục toàn bộ cài đặt vòng quay về mặc định ban đầu?")) return;
    try {
      setIsSavingSettings(true);
      const res = await fetch("/api/wheel/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ options: DEFAULT_WHEEL_OPTIONS }),
      });
      const data = await res.json();
      if (data.success) {
        setBaseOptions(data.options);
        showToast.success("Đã reset về mặc định chuẩn xịn! 🔄");
      }
    } catch (e) {
      setBaseOptions(DEFAULT_WHEEL_OPTIONS);
    } finally {
      setIsSavingSettings(false);
    }
  };

  const handleAddOption = () => {
    if (baseOptions.length >= 16) {
      showToast.error("Tối đa 16 phần thưởng trên vòng quay thôi nhé!");
      return;
    }
    const preset = PRESET_WHEEL_COLORS[baseOptions.length % PRESET_WHEEL_COLORS.length];
    const newOpt: WheelOption = {
      id: Date.now().toString(),
      label: `Phần thưởng ${baseOptions.length + 1}`,
      icon: PRESET_WHEEL_ICONS[baseOptions.length % PRESET_WHEEL_ICONS.length] || "🎁",
      color: preset.color,
      weight: 5,
      rewardType: "NONE",
    };
    setBaseOptions((prev) => [...prev, newOpt]);
    showToast.success("Đã thêm 1 ô phần thưởng mới!");
  };

  const handleRemoveOption = (id: string) => {
    if (baseOptions.length <= 3) {
      showToast.error("Vòng quay cần tối thiểu 3 phần thưởng!");
      return;
    }
    setBaseOptions((prev) => prev.filter((o) => o.id !== id));
    showToast.info("Đã xóa 1 ô phần thưởng!");
  };

  const updateOption = (index: number, field: keyof WheelOption, value: any) => {
    setBaseOptions((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const isGuest = !currentUser;
  const isSelf = loggedInMemberId ? selectedMember?.id === loggedInMemberId : false;
  const canOperateSpin = isAdmin || (!!currentUser && isSelf);
  const isUnpaid = selectedMember ? selectedMember.unpaidCount > 0 : false;
  const isOutOfSpins = selectedMember ? selectedMember.spinsAvailable <= 0 : false;
  const isSpinDisabled = isSpinning || !selectedMember || isGuest || !canOperateSpin || isUnpaid || isOutOfSpins;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px", maxWidth: "880px", margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
        <div>
          <h1 style={{ fontSize: "1.6rem", fontWeight: 900, color: "var(--card-foreground)", display: "flex", alignItems: "center", gap: "8px" }}>
            Vòng Quay May Mắn 🎡✨
          </h1>
          <p style={{ fontSize: "0.82rem", color: "var(--muted-foreground)" }}>
            Sạch hèo là có quà · Quẩy ngay nhận Voucher 5k & Free sân cực cháy 🔥
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
            {/* Vầng sáng vàng kim mờ ảo phía sau vòng quay */}
            <div
              style={{
                position: "absolute",
                width: "280px",
                height: "280px",
                borderRadius: "50%",
                background: "radial-gradient(circle, rgba(234,179,8,0.15) 0%, transparent 70%)",
                top: "24px",
                pointerEvents: "none",
              }}
            />

            {/* Kim chỉ (Pointer) sang trọng mạ vàng góc 12h */}
            <div
              style={{
                position: "absolute",
                top: "12px",
                zIndex: 25,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                pointerEvents: "none",
                filter: "drop-shadow(0 6px 12px rgba(0,0,0,0.8)) drop-shadow(0 2px 6px rgba(234,179,8,0.5))",
              }}
            >
              {/* Chốt ngọc Emerald viền vàng trên đỉnh */}
              <div
                style={{
                  width: "16px",
                  height: "16px",
                  borderRadius: "50%",
                  background: "radial-gradient(circle at 35% 35%, #86efac, #16a34a 60%, #14532d 100%)",
                  border: "2px solid #fef08a",
                  boxShadow: "0 0 10px rgba(34,197,94,0.7)",
                  zIndex: 2,
                }}
              />
              {/* Mũi kim mạ vàng 3D sắc nét vuốt xuống */}
              <div
                style={{
                  width: 0,
                  height: 0,
                  marginTop: "-5px",
                  borderLeft: "11px solid transparent",
                  borderRight: "11px solid transparent",
                  borderTop: "26px solid #eab308",
                  position: "relative",
                }}
              >
                {/* Lõi phản quang của kim */}
                <div
                  style={{
                    position: "absolute",
                    top: "-26px",
                    left: "-5px",
                    width: 0,
                    height: 0,
                    borderLeft: "5px solid transparent",
                    borderRight: "5px solid transparent",
                    borderTop: "20px solid #fef08a",
                  }}
                />
              </div>
            </div>

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
                  {members.map((m) => {
                    const isMself = loggedInMemberId ? m.id === loggedInMemberId : false;
                    return (
                      <option key={m.id} value={m.id}>
                        {m.name} {m.jerseyNumber ? `(#${m.jerseyNumber})` : ""} {isMself ? "(Bạn)" : ""} - {m.unpaidCount > 0 ? `Nợ ${m.unpaidCount} trận` : `${m.spinsAvailable} lượt`}
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Thông báo điều kiện thanh toán */}
              {selectedMember && (
                <div style={{ fontSize: "0.76rem", borderRadius: "8px", lineHeight: 1.4 }}>
                  {selectedMember.unpaidCount > 0 ? (
                    <div
                      style={{
                        background: "rgba(239,68,68,0.12)",
                        border: "1px solid rgba(239,68,68,0.3)",
                        borderRadius: "8px",
                        padding: "8px 12px",
                        color: "#f87171",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        gap: "8px",
                        flexWrap: "wrap",
                      }}
                    >
                      <div style={{ fontWeight: 700, display: "flex", alignItems: "center", gap: "6px" }}>
                        <AlertTriangle size={14} color="#f87171" /> Chưa nộp {selectedMember.unpaidCount} trận ({formatCurrency(selectedMember.totalDebt)})
                      </div>
                      <Link
                        href={`/payments/${selectedMember.id}`}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "4px",
                          color: "#facc15",
                          fontWeight: 700,
                          textDecoration: "none",
                          background: "rgba(250,204,21,0.15)",
                          padding: "3px 8px",
                          borderRadius: "6px",
                          whiteSpace: "nowrap",
                        }}
                      >
                        Nộp hèo ngay 💸 <ArrowRight size={12} />
                      </Link>
                    </div>
                  ) : selectedMember.spinsAvailable > 0 ? (
                    <div
                      style={{
                        background: "rgba(34,197,94,0.12)",
                        border: "1px solid rgba(34,197,94,0.3)",
                        borderRadius: "8px",
                        padding: "8px 12px",
                        color: "#4ade80",
                      }}
                    >
                      <div style={{ fontWeight: 700, display: "flex", alignItems: "center", gap: "6px" }}>
                        <CheckCircle size={14} color="#4ade80" /> Sạch hèo rùi · Còn {selectedMember.spinsAvailable} lượt quẩy 🎟️
                      </div>
                    </div>
                  ) : null}
                </div>
              )}

              {/* Nút Quay */}
              <button
                type="button"
                onClick={handleSpin}
                disabled={isSpinDisabled}
                className="btn btn-primary"
                style={{
                  padding: "12px",
                  fontSize: "1rem",
                  fontWeight: 900,
                  borderRadius: "10px",
                  background: isSpinDisabled
                    ? "rgba(255,255,255,0.08)"
                    : "linear-gradient(135deg, #facc15, #eab308)",
                  color: isSpinDisabled ? "var(--muted-foreground)" : "#0f172a",
                  boxShadow: isSpinDisabled
                    ? "none"
                    : "0 4px 20px rgba(234,179,8,0.4)",
                  border: "none",
                  cursor: isSpinDisabled ? "not-allowed" : "pointer",
                }}
              >
                {isSpinning
                  ? "ĐANG QUAY LẮC LƯ..."
                  : isGuest
                  ? "ĐĂNG NHẬP ĐỂ QUẨY 🤙"
                  : !canOperateSpin
                  ? "QUAY NICK MÌNH THUI 😆"
                  : isUnpaid
                  ? "CHƯA NỘP HÈO 💸"
                  : !isOutOfSpins && selectedMember
                  ? `🎰 QUAY LUN (${selectedMember.spinsAvailable} lượt)`
                  : "HẾT LƯỢT RÙI, TRẬN SAU GỠ 🔥"}
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

      {/* TAB 2: CÀI ĐẶT TỈ LỆ ẢO & PHẦN THƯỞNG (ADMIN SETTING - LƯU DATABASE) */}
      {activeTab === "settings" && (
        <div className="glass-card" style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "16px", borderRadius: "16px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
            <div>
              <h2 style={{ fontSize: "1.1rem", fontWeight: 800, color: "var(--card-foreground)", display: "flex", alignItems: "center", gap: "6px" }}>
                ⚙️ Cài Đặt Vòng Quay (Lưu Database)
              </h2>
              <div style={{ fontSize: "0.75rem", color: "var(--muted-foreground)" }}>
                Lưu vào Database là toàn đội (cả máy tính & điện thoại) đều ăn ngay lập tức!
              </div>
            </div>

            <div style={{ display: "flex", gap: "8px" }}>
              <button
                type="button"
                onClick={handleResetSettings}
                disabled={isSavingSettings}
                className="btn btn-secondary"
                style={{ padding: "7px 14px", fontSize: "0.78rem", display: "flex", alignItems: "center", gap: "4px" }}
              >
                <RotateCcw size={14} /> Mặc định
              </button>
              <button
                type="button"
                onClick={handleSaveSettings}
                disabled={isSavingSettings}
                className="btn btn-primary"
                style={{ padding: "7px 18px", fontSize: "0.82rem", fontWeight: 800, display: "flex", alignItems: "center", gap: "6px" }}
              >
                {isSavingSettings ? <RefreshCw size={14} className="animate-spin" /> : null}
                {isSavingSettings ? "Đang lưu DB..." : "Lưu vào Database 💾"}
              </button>
            </div>
          </div>

          {/* Danh sách options dạng Card hiện đại */}
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {baseOptions.map((opt, idx) => (
              <div
                key={opt.id}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "10px",
                  padding: "14px",
                  borderRadius: "12px",
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  position: "relative",
                  borderLeft: `5px solid ${opt.color}`,
                }}
              >
                {/* Header card: Số thứ tự + Preview + Xóa */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span style={{ fontSize: "0.75rem", fontWeight: 800, background: "rgba(255,255,255,0.08)", padding: "2px 8px", borderRadius: "4px", color: "var(--muted-foreground)" }}>
                      #{idx + 1}
                    </span>
                    <span style={{ fontSize: "0.9rem", fontWeight: 800, color: "#f8fafc" }}>
                      {opt.icon} {opt.label}
                    </span>
                    <span
                      style={{
                        fontSize: "0.68rem",
                        padding: "2px 6px",
                        borderRadius: "4px",
                        fontWeight: 700,
                        background:
                          opt.rewardType === "FREE_MATCH"
                            ? "rgba(239,68,68,0.2)"
                            : opt.rewardType === "DISCOUNT_5K"
                            ? "rgba(34,197,94,0.2)"
                            : opt.rewardType === "FREE_DRINK"
                            ? "rgba(245,158,11,0.2)"
                            : "rgba(255,255,255,0.06)",
                        color:
                          opt.rewardType === "FREE_MATCH"
                            ? "#f87171"
                            : opt.rewardType === "DISCOUNT_5K"
                            ? "#4ade80"
                            : opt.rewardType === "FREE_DRINK"
                            ? "#fbbf24"
                            : "var(--muted-foreground)",
                      }}
                    >
                      {opt.rewardType === "FREE_MATCH"
                        ? "🎰 Free sân"
                        : opt.rewardType === "DISCOUNT_5K"
                        ? "💵 Giảm 5k"
                        : opt.rewardType === "FREE_DRINK"
                        ? "🥤 Bao nước"
                        : "🎈 Quà vui"}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleRemoveOption(opt.id)}
                    title="Xóa ô này"
                    style={{
                      width: "28px",
                      height: "28px",
                      borderRadius: "6px",
                      border: "none",
                      background: "rgba(239, 68, 68, 0.15)",
                      color: "#f87171",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      cursor: "pointer",
                    }}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>

                {/* Hàng 1: Icon + Tên quà + Loại phần thưởng */}
                <div style={{ display: "grid", gridTemplateColumns: "70px 1fr 160px", gap: "8px", alignItems: "center" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "0.68rem", color: "var(--muted-foreground)", marginBottom: "2px" }}>Icon</label>
                    <input
                      type="text"
                      value={opt.icon}
                      onChange={(e) => updateOption(idx, "icon", e.target.value)}
                      style={{
                        width: "100%",
                        padding: "6px",
                        textAlign: "center",
                        fontSize: "1.1rem",
                        borderRadius: "6px",
                        background: "rgba(0,0,0,0.3)",
                        border: "1px solid var(--border)",
                        color: "white",
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "0.68rem", color: "var(--muted-foreground)", marginBottom: "2px" }}>Tên phần thưởng</label>
                    <input
                      type="text"
                      value={opt.label}
                      onChange={(e) => updateOption(idx, "label", e.target.value)}
                      style={{
                        width: "100%",
                        padding: "7px 10px",
                        fontSize: "0.82rem",
                        borderRadius: "6px",
                        background: "rgba(0,0,0,0.3)",
                        border: "1px solid var(--border)",
                        color: "white",
                        fontWeight: 600,
                      }}
                      placeholder="Tên phần thưởng..."
                    />
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "0.68rem", color: "var(--muted-foreground)", marginBottom: "2px" }}>Loại hiệu lực</label>
                    <select
                      value={opt.rewardType || "NONE"}
                      onChange={(e) => updateOption(idx, "rewardType", e.target.value as any)}
                      style={{
                        width: "100%",
                        padding: "7px 8px",
                        fontSize: "0.78rem",
                        borderRadius: "6px",
                        background: "#0f172a",
                        border: "1px solid var(--border)",
                        color: opt.rewardType && opt.rewardType !== "NONE" ? "#4ade80" : "white",
                        fontWeight: 600,
                      }}
                    >
                      <option value="NONE">🎈 Quà vui vẻ / Tinh thần</option>
                      <option value="DISCOUNT_5K">💵 Giảm 5k tiền sân</option>
                      <option value="FREE_MATCH">🎰 Free 100% tiền sân</option>
                      <option value="FREE_DRINK">🥤 Duy bao nước</option>
                    </select>
                  </div>
                </div>

                {/* Hàng chọn emoji nhanh */}
                <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                  <span style={{ fontSize: "0.68rem", color: "var(--muted-foreground)" }}>Gợi ý icon:</span>
                  {PRESET_WHEEL_ICONS.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => updateOption(idx, "icon", emoji)}
                      style={{
                        background: opt.icon === emoji ? "rgba(250,204,21,0.25)" : "rgba(255,255,255,0.06)",
                        border: opt.icon === emoji ? "1px solid #facc15" : "1px solid rgba(255,255,255,0.1)",
                        borderRadius: "4px",
                        padding: "2px 6px",
                        fontSize: "0.85rem",
                        cursor: "pointer",
                      }}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>

                {/* Hàng 2: Chọn bảng màu Preset sang trọng + Tỉ lệ % */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px", paddingTop: "4px", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                  {/* Bảng màu Preset cao cấp */}
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                    <span style={{ fontSize: "0.68rem", color: "var(--muted-foreground)" }}>Màu sắc:</span>
                    {PRESET_WHEEL_COLORS.map((c) => (
                      <button
                        key={c.color}
                        type="button"
                        onClick={() => updateOption(idx, "color", c.color)}
                        title={c.label}
                        style={{
                          width: "20px",
                          height: "20px",
                          borderRadius: "50%",
                          background: c.color,
                          border: opt.color.toLowerCase() === c.color.toLowerCase() ? "2px solid #facc15" : "1px solid rgba(255,255,255,0.2)",
                          cursor: "pointer",
                          transform: opt.color.toLowerCase() === c.color.toLowerCase() ? "scale(1.2)" : "scale(1)",
                          transition: "all 0.15s",
                        }}
                      />
                    ))}
                    <input
                      type="color"
                      value={opt.color}
                      onChange={(e) => updateOption(idx, "color", e.target.value)}
                      title="Màu tùy chỉnh"
                      style={{
                        width: "22px",
                        height: "22px",
                        border: "none",
                        borderRadius: "50%",
                        background: "transparent",
                        cursor: "pointer",
                      }}
                    />
                  </div>

                  {/* Tỉ lệ % ảo */}
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <span style={{ fontSize: "0.72rem", color: "var(--muted-foreground)" }}>Tỉ lệ trúng:</span>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      step="0.1"
                      value={opt.weight}
                      onChange={(e) => updateOption(idx, "weight", parseFloat(e.target.value) || 0)}
                      style={{
                        width: "60px",
                        padding: "4px 6px",
                        textAlign: "center",
                        fontSize: "0.82rem",
                        fontWeight: 700,
                        borderRadius: "6px",
                        background: "rgba(0,0,0,0.3)",
                        border: "1px solid rgba(250,204,21,0.3)",
                        color: "#facc15",
                      }}
                    />
                    <span style={{ fontSize: "0.78rem", fontWeight: 800, color: "#facc15" }}>%</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Nút Thêm Ô Phần Thưởng Mới */}
          <button
            type="button"
            onClick={handleAddOption}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "6px",
              padding: "12px",
              borderRadius: "10px",
              background: "rgba(34, 197, 94, 0.12)",
              border: "1px dashed rgba(34, 197, 94, 0.4)",
              color: "#4ade80",
              fontWeight: 800,
              fontSize: "0.85rem",
              cursor: "pointer",
              transition: "all 0.2s",
            }}
          >
            <Plus size={16} /> Thêm Ô Phần Thưởng Mới
          </button>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", background: "rgba(250,204,21,0.08)", borderRadius: "8px", border: "1px solid rgba(250,204,21,0.2)" }}>
            <span style={{ fontSize: "0.8rem", color: "#fef08a" }}>
              💡 Tổng tỉ lệ: {Number(baseOptions.reduce((sum, o) => sum + Number(o.weight || 0), 0).toFixed(2))}% (Hệ thống tự động chuẩn hóa tỉ lệ theo trọng số)
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

            <div style={{ fontSize: "0.85rem", fontWeight: 800, color: "#facc15", textTransform: "uppercase", letterSpacing: "1px", display: "flex", alignItems: "center", gap: "4px" }}>
              <Sparkles size={16} /> CHÁY QUÁ BẠN ƠI! 🎉
            </div>

            <h3 style={{ fontSize: "1.45rem", fontWeight: 900, color: "#ffffff" }}>
              {winningPrize.label}
            </h3>

            <div style={{ fontSize: "0.85rem", color: "var(--muted-foreground)", lineHeight: 1.5 }}>
              Chúc mừng <strong>{selectedMember.name}</strong> đã ẵm được quà!
              {(winningPrize.rewardType === "DISCOUNT_5K" || winningPrize.discountAmount) && (
                <div style={{ marginTop: "6px", color: "#4ade80", fontWeight: 700 }}>
                  🎟️ Đã nạp Voucher giảm 5.000đ vào ví! Trận sau trừ tiền lun nha!
                </div>
              )}
              {(winningPrize.rewardType === "FREE_MATCH" || winningPrize.isFreeMatch) && (
                <div style={{ marginTop: "6px", color: "#facc15", fontWeight: 800 }}>
                  🎰 NỔ HŨ JACKPOT! Trận tới được đá chùa Free 100% tiền sân!
                </div>
              )}
              {(winningPrize.rewardType === "FREE_DRINK" || winningPrize.isFreeDrink) && (
                <div style={{ marginTop: "6px", color: "#fbbf24", fontWeight: 700 }}>
                  🥤 Ra sân nhớ réo Duy bao nước liền tay nhe!
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
              Húp Quà Lun 🎁
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
