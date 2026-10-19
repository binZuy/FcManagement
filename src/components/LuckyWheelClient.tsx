"use client";

import { useState, useEffect, useRef } from "react";
import { Settings, History, RotateCcw, Volume2, VolumeX } from "lucide-react";
import { showToast } from "@/components/Toast";
import { formatCurrency } from "@/lib/utils";

interface WheelOption {
  id: string;
  label: string;
  icon: string;
  color: string;
  weight: number; // Tỉ lệ % trúng ảo
}

interface SpinHistoryItem {
  id: string;
  name: string;
  prize: string;
  timestamp: string;
}

const DEFAULT_OPTIONS: WheelOption[] = [
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
  totalPoolAmount: number;
}

export function LuckyWheelClient({ currentUser, totalPoolAmount }: LuckyWheelClientProps) {
  const isAdmin = currentUser?.role === "ADMIN";

  const [activeTab, setActiveTab] = useState<"wheel" | "settings">("wheel");
  const [userName, setUserName] = useState<string>(currentUser?.name || "");
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);

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

  // Load state từ localStorage
  useEffect(() => {
    // Load options (v3)
    const savedOptions = localStorage.getItem("fc_wheel_options_v3");
    if (savedOptions) {
      try {
        setBaseOptions(JSON.parse(savedOptions));
      } catch (e) {
        console.error(e);
      }
    }

    // Load user name nếu chưa có
    if (!currentUser?.name) {
      const savedName = localStorage.getItem("fc_guest_name");
      if (savedName) setUserName(savedName);
    }

    // Load history
    const savedHistory = localStorage.getItem("fc_wheel_history");
    if (savedHistory) {
      try {
        setHistory(JSON.parse(savedHistory));
      } catch (e) {
        console.error(e);
      }
    }
  }, [currentUser]);

  // Âm thanh Web Audio API (Tạo tiếng tick kim quay như Streamer)
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
      osc.frequency.setValueAtTime(800, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.05);

      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.05);

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

    // Vẽ các múi
    wheelSlices.forEach((slice, i) => {
      const startAngle = i * sliceAngle;
      const endAngle = startAngle + sliceAngle;

      ctx.beginPath();
      ctx.moveTo(center, center);
      ctx.arc(center, center, radius, startAngle, endAngle);
      ctx.closePath();
      ctx.fillStyle = slice.color;
      ctx.fill();

      // Viền múi
      ctx.strokeStyle = "rgba(255,255,255,0.25)";
      ctx.lineWidth = 2;
      ctx.stroke();

      // Vẽ text & icon
      ctx.save();
      ctx.translate(center, center);
      ctx.rotate(startAngle + sliceAngle / 2);
      ctx.textAlign = "right";
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 13px system-ui, sans-serif";
      ctx.shadowColor = "rgba(0,0,0,0.8)";
      ctx.shadowBlur = 4;

      ctx.fillText(`${slice.icon} ${slice.label}`, radius - 20, 5);
      ctx.restore();
    });

    // Vẽ tâm vòng quay
    ctx.beginPath();
    ctx.arc(center, center, 32, 0, 2 * Math.PI);
    ctx.fillStyle = "#0f172a";
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.strokeStyle = "#facc15";
    ctx.stroke();

    ctx.fillStyle = "#facc15";
    ctx.font = "bold 12px sans-serif";
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

  // Thuật toán quay theo Tỉ lệ ảo (Weighted Probability)
  const handleSpin = () => {
    if (isSpinning) return;
    const trimmedName = userName.trim();
    if (!trimmedName) {
      showToast.error("Vui lòng nhập tên của bạn trước khi quay!");
      return;
    }

    if (!currentUser?.name) {
      localStorage.setItem("fc_guest_name", trimmedName);
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

    // Tìm vị trí của chosenOption trên 12 ô (chọn ngẫu nhiên 1 trong 2 ô tương ứng)
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

    // Giả lập âm thanh tick...tick khi kim quét
    let tickCount = 0;
    const tickInterval = setInterval(() => {
      tickCount++;
      playTickSound();
      if (tickCount > 35) clearInterval(tickInterval);
    }, 120);

    // Kết thúc vòng quay (sau 4.5 giây)
    setTimeout(() => {
      setIsSpinning(false);
      setWinningPrize(chosenOption);
      setShowWinnerModal(true);
      playFanfareSound();

      // Lưu lịch sử
      const newHistoryItem: SpinHistoryItem = {
        id: Date.now().toString(),
        name: trimmedName,
        prize: `${chosenOption.icon} ${chosenOption.label}`,
        timestamp: new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }),
      };

      const updatedHistory = [newHistoryItem, ...history.slice(0, 19)];
      setHistory(updatedHistory);
      localStorage.setItem("fc_wheel_history", JSON.stringify(updatedHistory));
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
    <div style={{ display: "flex", flexDirection: "column", gap: "20px", maxWidth: "860px", margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
        <div>
          <h1 style={{ fontSize: "1.6rem", fontWeight: 900, color: "var(--card-foreground)", display: "flex", alignItems: "center", gap: "8px" }}>
            Vòng Quay May Mắn 🎡✨
          </h1>
          <p style={{ fontSize: "0.82rem", color: "var(--muted-foreground)" }}>
            Quay thưởng giải trí cho anh em FC · Nộp sớm có quà, nộp trễ góp quỹ!
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
                gap: "4px"
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
          {/* Cột trái: Vòng quay đồ họa */}
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
              overflow: "hidden"
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
                background: "#facc15",
                boxShadow: "0 0 8px #facc15",
              }}
            />

            {/* Canvas Vòng Quay */}
            <div
              style={{
                transform: `rotate(${rotation}deg)`,
                transition: isSpinning ? "transform 4.5s cubic-bezier(0.15, 0.95, 0.35, 1)" : "none",
                display: "inline-block",
                padding: "8px",
              }}
            >
              <canvas
                ref={canvasRef}
                width={330}
                height={330}
                style={{
                  maxWidth: "100%",
                  height: "auto",
                  borderRadius: "50%",
                  boxShadow: "0 0 25px rgba(250,204,21,0.25)",
                }}
              />
            </div>

            {/* Input tên & Nút quay */}
            <div style={{ marginTop: "20px", width: "100%", maxWidth: "280px", display: "flex", flexDirection: "column", gap: "10px" }}>
              <div>
                <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: "var(--muted-foreground)", marginBottom: "4px" }}>
                  Người quay:
                </label>
                <input
                  type="text"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  placeholder="Nhập tên của bạn..."
                  disabled={isSpinning}
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    borderRadius: "8px",
                    background: "rgba(0,0,0,0.3)",
                    border: "1px solid var(--border)",
                    color: "var(--card-foreground)",
                    fontSize: "0.85rem",
                    fontWeight: 700,
                  }}
                />
              </div>

              <button
                type="button"
                onClick={handleSpin}
                disabled={isSpinning}
                className="btn btn-primary"
                style={{
                  padding: "12px",
                  fontSize: "1.05rem",
                  fontWeight: 900,
                  borderRadius: "10px",
                  background: isSpinning
                    ? "rgba(255,255,255,0.1)"
                    : "linear-gradient(135deg, #facc15, #eab308)",
                  color: "#0f172a",
                  boxShadow: isSpinning ? "none" : "0 4px 20px rgba(234,179,8,0.4)",
                  border: "none",
                  cursor: isSpinning ? "not-allowed" : "pointer",
                }}
              >
                {isSpinning ? "ĐANG QUAY..." : "🎰 QUAY NGAY"}
              </button>
            </div>
          </div>

          {/* Cột phải: Thông tin Quỹ + Lịch sử quay */}
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {/* Card Quỹ Thưởng */}
            <div
              className="glass-card"
              style={{
                padding: "16px",
                borderRadius: "14px",
                background: "linear-gradient(135deg, rgba(234,179,8,0.12), rgba(15,23,42,0.85))",
                border: "1px solid rgba(234,179,8,0.3)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontSize: "0.8rem", fontWeight: 700, color: "#facc15" }}>
                    🎁 Quỹ thưởng
                  </div>
                  <div style={{ fontSize: "1.4rem", fontWeight: 900, color: "#fef08a", marginTop: "2px" }}>
                    {formatCurrency(totalPoolAmount)}
                  </div>
                </div>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: "rgba(250,204,21,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.3rem" }}>
                  💰
                </div>
              </div>
            </div>

            {/* Bảng Lịch sử quay */}
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
                {history.length > 0 && (
                  <button
                    onClick={() => {
                      if (confirm("Xóa lịch sử quay?")) {
                        setHistory([]);
                        localStorage.removeItem("fc_wheel_history");
                      }
                    }}
                    style={{ background: "transparent", border: "none", color: "var(--muted-foreground)", fontSize: "0.7rem", cursor: "pointer" }}
                  >
                    Xóa
                  </button>
                )}
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
                        {item.timestamp}
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
      {showWinnerModal && winningPrize && (
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
              background: "linear-gradient(145deg, #1e293b, #0f172a)",
              border: "2px solid #facc15",
              borderRadius: "20px",
              padding: "28px",
              width: "100%",
              maxWidth: "380px",
              textAlign: "center",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "14px",
              boxShadow: "0 0 50px rgba(250,204,21,0.4)",
              animation: "zoomIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)",
            }}
          >
            <div style={{ fontSize: "3.5rem" }}>
              {winningPrize.icon}
            </div>

            <div>
              <span style={{ fontSize: "0.75rem", fontWeight: 800, color: "#facc15", textTransform: "uppercase", letterSpacing: "1px" }}>
                Chúc mừng {userName}! 🎉
              </span>
              <h2 style={{ fontSize: "1.5rem", fontWeight: 900, color: "#f8fafc", marginTop: "4px" }}>
                {winningPrize.label}
              </h2>
            </div>

            <p style={{ fontSize: "0.82rem", color: "#cbd5e1" }}>
              Chụp màn hình lại và thông báo với thủ quỹ ở trận tới để nhận phần quà này nhé! ⚽🔥
            </p>

            <button
              type="button"
              onClick={() => setShowWinnerModal(false)}
              className="btn btn-primary"
              style={{
                marginTop: "10px",
                width: "100%",
                padding: "10px",
                fontWeight: 800,
                fontSize: "0.95rem",
                borderRadius: "10px",
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
