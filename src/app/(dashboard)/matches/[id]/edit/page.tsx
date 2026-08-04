"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, CheckCircle, Save, Users, Trophy, Coffee, Search, CheckSquare, Square, UserCheck, Loader2 } from "lucide-react";
import { showToast } from "@/components/Toast";

// Custom Counter Component to replace ugly browser spinners
function Counter({ value, onChange, min = 0, max = 99, disabled = false }: {
  value: number;
  onChange: (val: number) => void;
  min?: number;
  max?: number;
  disabled?: boolean;
}) {
  return (
    <div style={{ 
      display: "inline-flex", 
      alignItems: "center", 
      gap: "4px", 
      background: "rgba(255,255,255,0.03)", 
      border: "1px solid var(--border)", 
      borderRadius: "6px", 
      padding: "2px 4px", 
      height: "30px", 
      userSelect: "none",
      opacity: disabled ? 0.4 : 1
    }}>
      <button
        type="button"
        disabled={disabled || value <= min}
        onClick={() => onChange(Math.max(min, value - 1))}
        style={{
          width: "22px", height: "22px", borderRadius: "4px",
          border: "none", background: value <= min ? "transparent" : "rgba(255,255,255,0.08)",
          color: "var(--card-foreground)", display: "flex", alignItems: "center", justifyContent: "center",
          cursor: disabled || value <= min ? "not-allowed" : "pointer", fontSize: "0.85rem", fontWeight: 700,
          opacity: value <= min ? 0.3 : 1
        }}
      >
        -
      </button>
      <span style={{
        minWidth: "18px", textAlign: "center", fontWeight: 700,
        color: "var(--card-foreground)", fontSize: "0.8rem"
      }}>
        {value}
      </span>
      <button
        type="button"
        disabled={disabled || value >= max}
        onClick={() => onChange(Math.min(max, value + 1))}
        style={{
          width: "22px", height: "22px", borderRadius: "4px",
          border: "none", background: value >= max ? "transparent" : "rgba(255,255,255,0.08)",
          color: "var(--card-foreground)", display: "flex", alignItems: "center", justifyContent: "center",
          cursor: disabled || value >= max ? "not-allowed" : "pointer", fontSize: "0.85rem", fontWeight: 700,
          opacity: value >= max ? 0.3 : 1
        }}
      >
        +
      </button>
    </div>
  );
}

type Params = { params: Promise<{ id: string }> };

export default function MatchEditPage({ params }: Params) {
  const { id } = use(params);
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [savingAttendance, setSavingAttendance] = useState(false);
  const [savingFinalize, setSavingFinalize] = useState(false);
  
  // Match state
  const [match, setMatch] = useState<any>(null);
  
  // Edit state
  const [result, setResult] = useState<string>("");
  const [feeTotal, setFeeTotal] = useState<string>("");
  const [drinksFeeTotal, setDrinksFeeTotal] = useState<string>("");
  const [feeSplitMethod, setFeeSplitMethod] = useState<string>("EQUAL");
  
  // Attendance state
  const [attendances, setAttendances] = useState<Record<string, any>>({});
  const [allMembers, setAllMembers] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>("");

  useEffect(() => {
    async function fetchData() {
      try {
        const [matchRes, membersRes] = await Promise.all([
          fetch(`/api/matches/${id}`),
          fetch(`/api/members`)
        ]);
        
        if (!matchRes.ok || !membersRes.ok) throw new Error("Lỗi tải dữ liệu");
        
        const matchData = await matchRes.json();
        const membersData = await membersRes.json();
        
        const m = matchData.data;
        setMatch(m);
        setResult(m.result ?? "");
        setFeeTotal(m.feeTotal ? String(m.feeTotal) : "");
        setDrinksFeeTotal(m.drinksFeeTotal ? String(m.drinksFeeTotal) : "");
        setFeeSplitMethod(m.feeSplitMethod ?? "EQUAL");
        
        setAllMembers(membersData.data ?? []);
        
        // Populate existing attendances map
        const attMap: Record<string, any> = {};
        
        // Đã tham gia từ trước
        m.attendances.forEach((att: any) => {
          attMap[att.memberId] = {
            id: att.id,
            memberId: att.memberId,
            status: att.status,
            teamSide: att.teamSide,
            guestCount: att.guestCount ?? 0,
            isDrinks: att.isDrinks ?? (att.status === "ATTENDED"),
            drinksGuestCount: att.drinksGuestCount ?? 0,
          };
        });

        // Những ai chưa từng điểm danh -> mặc định ABSENT
        (membersData.data ?? []).forEach((mem: any) => {
          if (!attMap[mem.id]) {
            attMap[mem.id] = {
              memberId: mem.id,
              status: "ABSENT",
              teamSide: null,
              guestCount: 0,
              isDrinks: false,
              drinksGuestCount: 0,
            };
          }
        });
        
        setAttendances(attMap);
      } catch (err: any) {
        alert(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [id]);

  if (loading) {
    return (
      <div style={{ padding: "60px 0", textAlign: "center", color: "var(--muted-foreground)" }}>
        Đang tải dữ liệu điểm danh...
      </div>
    );
  }

  const isInternal = match?.matchType === "INTERNAL";

  // 1-Click Select All Attendance
  const handleSelectAllAttended = () => {
    const updated = { ...attendances };
    allMembers.forEach((m) => {
      updated[m.id] = {
        ...(updated[m.id] ?? { memberId: m.id, guestCount: 0, drinksGuestCount: 0 }),
        status: "ATTENDED",
        isDrinks: true,
      };
    });
    setAttendances(updated);
  };

  // 1-Click Deselect All Attendance
  const handleDeselectAll = () => {
    const updated = { ...attendances };
    allMembers.forEach((m) => {
      updated[m.id] = {
        ...(updated[m.id] ?? { memberId: m.id, guestCount: 0, drinksGuestCount: 0 }),
        status: "ABSENT",
        guestCount: 0,
        isDrinks: false,
      };
    });
    setAttendances(updated);
  };

  // 1-Click Select All Drinks
  const handleSelectAllDrinks = () => {
    const updated = { ...attendances };
    allMembers.forEach((m) => {
      if (updated[m.id]?.status === "ATTENDED") {
        updated[m.id] = {
          ...updated[m.id],
          isDrinks: true,
        };
      }
    });
    setAttendances(updated);
  };

  // 1-Click Deselect All Drinks
  const handleDeselectAllDrinks = () => {
    const updated = { ...attendances };
    allMembers.forEach((m) => {
      if (updated[m.id]) {
        updated[m.id] = {
          ...updated[m.id],
          isDrinks: false,
        };
      }
    });
    setAttendances(updated);
  };

  // Lọc theo tìm kiếm từ khóa
  const filteredMembersList = allMembers.filter((m) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase().trim();
    const name = m.user.name?.toLowerCase() ?? "";
    const code = m.code?.toLowerCase() ?? "";
    return name.includes(q) || code.includes(q);
  });

  // Đếm số lượng
  const totalAttendedCount = Object.values(attendances).filter((a) => a.status === "ATTENDED").length;
  const totalGuestsCount = Object.values(attendances).reduce((sum, a) => sum + (a.status === "ATTENDED" ? (a.guestCount || 0) : 0), 0);
  const totalDrinksCount = Object.values(attendances).filter((a) => a.status === "ATTENDED" && a.isDrinks).length;

  // 1. LUỒNG 1: CHỈ LƯU ĐIỂM DANH (Giữ nguyên trạng thái UPCOMING, chưa tạo phiên tính tiền)
  const handleSaveAttendanceOnly = async () => {
    setSavingAttendance(true);
    try {
      const attendancesArray = Object.values(attendances).map((att) => ({
        memberId: att.memberId,
        status: att.status,
        teamSide: att.teamSide || null,
        guestCount: att.guestCount || 0,
        isDrinks: att.isDrinks || false,
        drinksGuestCount: att.drinksGuestCount || 0,
      }));

      await fetch(`/api/matches/${id}/attendance`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ attendances: attendancesArray }),
      });

      // Lưu kết quả/tiền nháp nhưng KHÔNG đổi status thành DONE
      await fetch(`/api/matches/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          result: result || null,
          feeTotal: feeTotal ? parseFloat(feeTotal) : null,
          drinksFeeTotal: drinksFeeTotal ? parseFloat(drinksFeeTotal) : null,
          feeSplitMethod: isInternal ? feeSplitMethod : "EQUAL",
        }),
      });

      showToast.success("Đã lưu thông tin điểm danh thành công!");
      router.refresh();
    } catch (err: any) {
      showToast.error("Lỗi khi lưu điểm danh: " + err.message);
    } finally {
      setSavingAttendance(false);
    }
  };

  // 2. LUỒNG 2: CHỐT SỔ & TẠO PHIÊN THU TIỀN (Trận đấu hoàn thành DONE)
  const handleFinalizeMatch = async () => {
    // Validation 1: Bắt buộc điểm danh ít nhất 1 người
    if (totalAttendedCount === 0) {
      showToast.error("Vui lòng điểm danh ít nhất 1 thành viên có mặt trước khi đóng trận!");
      return;
    }

    // Validation 2: Bắt buộc chọn kết quả trận đấu
    if (!result) {
      showToast.error("Vui lòng chọn Kết quả trận đấu (Thắng / Thua / Hòa) trước khi đóng trận!");
      return;
    }

    // Validation 3: Bắt buộc nhập tổng tiền sân
    if (!feeTotal || parseFloat(feeTotal) <= 0) {
      showToast.error("Vui lòng nhập Tổng tiền sân trước khi đóng trận!");
      return;
    }

    // Validation 4: Bắt buộc nhập tiền nước nếu có thành viên uống nước
    if (totalDrinksCount > 0 && (!drinksFeeTotal || parseFloat(drinksFeeTotal) <= 0)) {
      showToast.error(`Có ${totalDrinksCount} thành viên ở lại uống nước, vui lòng nhập Tổng hóa đơn tiền nước!`);
      return;
    }

    setSavingFinalize(true);
    try {
      // a. Cập nhật danh sách điểm danh
      const attendancesArray = Object.values(attendances).map((att) => ({
        memberId: att.memberId,
        status: att.status,
        teamSide: att.teamSide || null,
        guestCount: att.guestCount || 0,
        isDrinks: att.isDrinks || false,
        drinksGuestCount: att.drinksGuestCount || 0,
      }));

      await fetch(`/api/matches/${id}/attendance`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ attendances: attendancesArray }),
      });

      // b. Cập nhật kết quả trận & đặt status = DONE
      const updatePayload: any = {
        status: "DONE",
        result: result || null,
        feeTotal: feeTotal ? parseFloat(feeTotal) : null,
        drinksFeeTotal: drinksFeeTotal ? parseFloat(drinksFeeTotal) : null,
        feeSplitMethod: isInternal ? feeSplitMethod : "EQUAL",
      };

      const res = await fetch(`/api/matches/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatePayload),
      });

      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.error ?? "Lỗi cập nhật trận đấu");
      }

      // c. TẠO PHIÊN THU TIỀN (Finalize PaymentSession)
      await fetch(`/api/matches/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      showToast.success("Đóng trận & Tạo phiên thu tiền thành công! 🎉");
      router.push(`/matches/${id}`);
      router.refresh();
    } catch (err: any) {
      showToast.error("Lỗi khi đóng trận: " + err.message);
    } finally {
      setSavingFinalize(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px", maxWidth: "920px", margin: "0 auto" }}>
      {/* Header action bar với 2 NÚT RÚT GỌN NẰM CÙNG 1 DÒNG CẢ MOBILE VÀ WEB */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "8px" }}>
        <Link href={`/matches/${id}`} className="btn btn-secondary" style={{ padding: "6px 10px", fontSize: "0.78rem" }}>
          <ArrowLeft size={15} /> Quay lại
        </Link>

        <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
          {/* Nút 1: Điểm danh */}
          <button
            onClick={handleSaveAttendanceOnly}
            disabled={savingAttendance || savingFinalize}
            className="btn btn-secondary"
            style={{ padding: "6px 10px", fontWeight: 700, fontSize: "0.78rem", whiteSpace: "nowrap" }}
          >
            {savingAttendance ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            {savingAttendance ? "Đang lưu..." : "Điểm danh"}
          </button>

          {/* Nút 2: Đóng trận */}
          <button
            onClick={handleFinalizeMatch}
            disabled={savingAttendance || savingFinalize}
            className="btn btn-primary"
            style={{ padding: "6px 12px", fontWeight: 800, fontSize: "0.78rem", whiteSpace: "nowrap" }}
          >
            {savingFinalize ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
            {savingFinalize ? "Đang xử lý..." : "Đóng trận"}
          </button>
        </div>
      </div>

      <h1 style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--card-foreground)" }}>
        Cập nhật trận đấu: {match?.title}
      </h1>

      {/* BƯỚC 1: KẾT QUẢ & TIỀN SÂN */}
      <div className="glass-card" style={{ padding: "20px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
          <Trophy size={20} color="var(--primary)" />
          <h2 style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--card-foreground)" }}>Bước 1: Kết quả & Tiền sân</h2>
        </div>
        
        {isInternal ? (
          /* TRẬN NỘI BỘ LAYOUT */
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "14px" }}>
            <div>
              <label style={{ display: "block", marginBottom: "6px", fontSize: "0.85rem", color: "var(--muted-foreground)", fontWeight: 600 }}>Kết quả trận đấu</label>
              <select 
                value={result} 
                onChange={e => setResult(e.target.value)}
                className="form-input"
                style={{ background: "#1e293b" }}
              >
                <option value="">-- Chưa chọn kết quả --</option>
                <option value="WIN">Đội A thắng 🏆</option>
                <option value="LOSE">Đội B thắng 🏆</option>
                <option value="DRAW">Hòa 🤝</option>
              </select>
            </div>

            <div>
              <label style={{ display: "block", marginBottom: "6px", fontSize: "0.85rem", color: "var(--muted-foreground)", fontWeight: 600 }}>Tổng tiền sân (cả trận)</label>
              <input 
                type="number" 
                value={feeTotal} 
                onChange={e => setFeeTotal(e.target.value)} 
                className="form-input" 
                placeholder="VD: 600000"
              />
            </div>

            <div>
              <label style={{ display: "block", marginBottom: "6px", fontSize: "0.85rem", color: "var(--muted-foreground)", fontWeight: 600 }}>Cách chia tiền sân</label>
              <select 
                value={feeSplitMethod} 
                onChange={e => setFeeSplitMethod(e.target.value)}
                className="form-input"
                style={{ background: "#1e293b" }}
                disabled={result === "DRAW" || !result}
              >
                <option value="EQUAL">Chia đều (50/50)</option>
                <option value="LOSER_100">Đội thua chịu 100%</option>
                <option value="LOSER_70_WINNER_30">Đội thua 70% - Đội thắng 30%</option>
                <option value="LOSER_60_WINNER_40">Đội thua 60% - Đội thắng 40%</option>
              </select>
            </div>
          </div>
        ) : (
          /* TRẬN GIAO HỮU LAYOUT */
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "14px" }}>
            <div>
              <label style={{ display: "block", marginBottom: "6px", fontSize: "0.85rem", color: "var(--muted-foreground)", fontWeight: 600 }}>Kết quả trận đấu</label>
              <select 
                value={result} 
                onChange={e => setResult(e.target.value)}
                className="form-input"
                style={{ background: "#1e293b" }}
              >
                <option value="">-- Chưa có kết quả --</option>
                <option value="WIN">Thắng (Win) 🏆</option>
                <option value="LOSE">Thua (Lose) 😢</option>
                <option value="DRAW">Hòa (Draw) 🤝</option>
              </select>
            </div>
            
            <div>
              <label style={{ display: "block", marginBottom: "6px", fontSize: "0.85rem", color: "var(--muted-foreground)", fontWeight: 600 }}>Tổng tiền sân (Đội nhà đóng)</label>
              <input 
                type="number" 
                value={feeTotal} 
                onChange={e => setFeeTotal(e.target.value)} 
                className="form-input" 
                placeholder="VD: 800000"
              />
            </div>
          </div>
        )}
      </div>

      {/* BƯỚC 2: ĐIỂM DANH SIÊU TỐC (QUICK CHECKLIST) */}
      <div className="glass-card" style={{ padding: "20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px", marginBottom: "16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <UserCheck size={20} color="var(--primary)" />
            <h2 style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--card-foreground)" }}>
              Bước 2: Điểm danh thành viên ({totalAttendedCount} TV {totalGuestsCount > 0 ? `+ ${totalGuestsCount} bạn` : ""})
            </h2>
          </div>

          {/* 1-Click Quick Action Buttons */}
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={handleSelectAllAttended}
              style={{
                padding: "6px 12px",
                borderRadius: "8px",
                background: "rgba(34,197,94,0.15)",
                border: "1px solid rgba(34,197,94,0.3)",
                color: "#4ade80",
                fontSize: "0.78rem",
                fontWeight: 700,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "4px",
              }}
            >
              <CheckSquare size={14} /> Có mặt tất cả
            </button>
            <button
              type="button"
              onClick={handleDeselectAll}
              style={{
                padding: "6px 12px",
                borderRadius: "8px",
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.1)",
                color: "var(--muted-foreground)",
                fontSize: "0.78rem",
                fontWeight: 600,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "4px",
              }}
            >
              <Square size={14} /> Bỏ chọn tất cả
            </button>
          </div>
        </div>

        {/* Ô Tìm kiếm nhanh */}
        <div style={{ position: "relative", marginBottom: "14px" }}>
          <input 
            type="text" 
            placeholder="Tìm theo tên hoặc mã thành viên..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="form-input"
            style={{
              paddingLeft: "36px",
              background: "rgba(30,41,59,0.4)",
              fontSize: "0.85rem",
            }}
          />
          <Search
            size={16}
            style={{
              position: "absolute",
              left: "12px",
              top: "50%",
              transform: "translateY(-50%)",
              color: "var(--muted-foreground)",
              pointerEvents: "none",
            }}
          />
        </div>

        {/* LIST CHECKLIST ĐIỂM DANH */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))",
            gap: "10px",
            maxHeight: "480px",
            overflowY: "auto",
            paddingRight: "4px",
          }}
        >
          {filteredMembersList.map((member) => {
            const att = attendances[member.id] ?? { status: "ABSENT", guestCount: 0, teamSide: null, isDrinks: false };
            const isAttended = att.status === "ATTENDED";

            return (
              <div
                key={member.id}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "8px",
                  padding: "12px",
                  borderRadius: "10px",
                  background: isAttended ? "rgba(34,197,94,0.08)" : "rgba(30,41,59,0.3)",
                  border: isAttended ? "1px solid rgba(34,197,94,0.3)" : "1px solid var(--border)",
                  transition: "all 0.15s ease",
                }}
              >
                {/* Hàng 1: Checkbox Có mặt + Tên + Mã */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px" }}>
                  <label
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      cursor: "pointer",
                      flex: 1,
                      minWidth: 0,
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={isAttended}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setAttendances({
                          ...attendances,
                          [member.id]: {
                            ...att,
                            status: checked ? "ATTENDED" : "ABSENT",
                            isDrinks: checked ? true : false,
                          },
                        });
                      }}
                      style={{
                        width: "18px",
                        height: "18px",
                        accentColor: "var(--primary)",
                        cursor: "pointer",
                        flexShrink: 0,
                      }}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontWeight: 700,
                          fontSize: "0.88rem",
                          color: isAttended ? "var(--card-foreground)" : "var(--muted-foreground)",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {member.user.name}
                      </div>
                      <div style={{ fontSize: "0.72rem", color: "var(--muted-foreground)" }}>
                        Mã: <span style={{ color: "var(--primary)", fontWeight: 600 }}>{member.code}</span>
                      </div>
                    </div>
                  </label>

                  {/* Badge Trạng thái */}
                  <span
                    style={{
                      fontSize: "0.68rem",
                      fontWeight: 700,
                      padding: "2px 8px",
                      borderRadius: "999px",
                      color: isAttended ? "#4ade80" : "var(--muted-foreground)",
                      background: isAttended ? "rgba(34,197,94,0.15)" : "rgba(255,255,255,0.05)",
                      flexShrink: 0,
                    }}
                  >
                    {isAttended ? "Có mặt" : "Vắng"}
                  </span>
                </div>

                {/* Hàng 2: Số Khách đi cùng & Phân đội */}
                {isAttended && (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: "8px",
                      paddingTop: "8px",
                      borderTop: "1px solid rgba(255,255,255,0.06)",
                      marginTop: "2px",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <span style={{ fontSize: "0.75rem", color: "var(--muted-foreground)", fontWeight: 600 }}>
                       + Bạn đá:
                      </span>
                      <Counter
                        value={att.guestCount || 0}
                        onChange={(val) =>
                          setAttendances({
                            ...attendances,
                            [member.id]: { ...att, guestCount: val },
                          })
                        }
                      />
                    </div>

                    {isInternal && (
                      <select
                        value={att.teamSide ?? "TEAM_A"}
                        onChange={(e) =>
                          setAttendances({
                            ...attendances,
                            [member.id]: { ...att, teamSide: e.target.value },
                          })
                        }
                        style={{
                          background: "#1e293b",
                          color: "var(--card-foreground)",
                          border: "1px solid var(--border)",
                          borderRadius: "6px",
                          padding: "2px 6px",
                          fontSize: "0.75rem",
                          fontWeight: 600,
                        }}
                      >
                        <option value="TEAM_A">Đội A</option>
                        <option value="TEAM_B">Đội B</option>
                      </select>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* BƯỚC 3: TIỀN NƯỚC (TÙY CHỌN) */}
      <div className="glass-card" style={{ padding: "20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px", marginBottom: "14px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <Coffee size={20} color="var(--primary)" />
            <h2 style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--card-foreground)" }}>
              Bước 3: Tiền nước ({totalDrinksCount} TV uống nước)
            </h2>
          </div>

          {/* Action Buttons Tiền nước 1-Click */}
          {totalAttendedCount > 0 && (
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={handleSelectAllDrinks}
                style={{
                  padding: "4px 10px",
                  borderRadius: "6px",
                  background: "rgba(34,197,94,0.12)",
                  border: "1px solid rgba(34,197,94,0.3)",
                  color: "#4ade80",
                  fontSize: "0.75rem",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                ☑️ Chọn tất cả uống nước
              </button>
              <button
                type="button"
                onClick={handleDeselectAllDrinks}
                style={{
                  padding: "4px 10px",
                  borderRadius: "6px",
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  color: "var(--muted-foreground)",
                  fontSize: "0.75rem",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                ❌ Bỏ chọn uống nước
              </button>
            </div>
          )}
        </div>
        
        <div style={{ marginBottom: "14px" }}>
          <label style={{ display: "block", marginBottom: "6px", fontSize: "0.85rem", color: "var(--muted-foreground)", fontWeight: 600 }}>
            Tổng hóa đơn tiền nước cả đội
          </label>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <input 
              type="number" 
              value={drinksFeeTotal} 
              onChange={e => setDrinksFeeTotal(e.target.value)} 
              className="form-input" 
              placeholder="VD: 300000"
              style={{ maxWidth: "260px" }}
            />
          </div>
        </div>

        <div style={{ fontSize: "0.8rem", color: "var(--muted-foreground)", marginBottom: "10px", fontWeight: 500 }}>
          Danh sách thành viên uống nước:
        </div>
        
        {totalAttendedCount === 0 ? (
          <div style={{ textAlign: "center", padding: "16px 10px", background: "rgba(30,41,59,0.2)", borderRadius: "8px", color: "var(--muted-foreground)", fontSize: "0.82rem" }}>
            Vui lòng đánh dấu thành viên Có mặt ở Bước 2 trước.
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: "10px", background: "rgba(30,41,59,0.3)", padding: "12px", borderRadius: "8px", maxHeight: "300px", overflowY: "auto" }}>
            {allMembers
              .filter((m) => attendances[m.id]?.status === "ATTENDED")
              .map((member) => {
                const att = attendances[member.id];
                return (
                  <div key={member.id} style={{ display: "flex", flexDirection: "column", gap: "6px", background: "rgba(30,41,59,0.5)", padding: "10px", borderRadius: "8px", border: "1px solid var(--border)" }}>
                    <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
                      <input 
                        type="checkbox" 
                        checked={att?.isDrinks ?? false}
                        onChange={e => setAttendances({
                          ...attendances,
                          [member.id]: { ...att, isDrinks: e.target.checked }
                        })}
                        style={{ width: "16px", height: "16px", accentColor: "var(--primary)" }}
                      />
                      <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--card-foreground)" }}>
                        {member.user.name}
                      </span>
                    </label>

                    {att?.isDrinks && (
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: "4px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                        <span style={{ fontSize: "0.72rem", color: "var(--muted-foreground)" }}>Khách uống nước cùng:</span>
                        <Counter 
                          value={att?.drinksGuestCount ?? 0}
                          onChange={val => setAttendances({
                            ...attendances,
                            [member.id]: { ...att, drinksGuestCount: val }
                          })}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
          </div>
        )}
      </div>

      {/* Footer Submit Bar với 2 nút rút gọn nằm cùng 1 dòng */}
      <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", alignItems: "center", marginBottom: "20px" }}>
        <button
          onClick={handleSaveAttendanceOnly}
          disabled={savingAttendance || savingFinalize}
          className="btn btn-secondary"
          style={{ padding: "8px 14px", fontWeight: 700, fontSize: "0.82rem", whiteSpace: "nowrap" }}
        >
          {savingAttendance ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          {savingAttendance ? "Đang lưu..." : "Điểm danh"}
        </button>

        <button
          onClick={handleFinalizeMatch}
          disabled={savingAttendance || savingFinalize}
          className="btn btn-primary"
          style={{ padding: "8px 16px", fontWeight: 800, fontSize: "0.82rem", whiteSpace: "nowrap" }}
        >
          {savingFinalize ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />}
          {savingFinalize ? "Đang xử lý..." : "Đóng trận"}
        </button>
      </div>
    </div>
  );
}
