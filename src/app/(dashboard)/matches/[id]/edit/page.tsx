"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, CheckCircle, Save, Users, Trophy, Coffee, Search } from "lucide-react";

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
      gap: "6px", 
      background: "rgba(255,255,255,0.03)", 
      border: "1px solid var(--border)", 
      borderRadius: "8px", 
      padding: "2px 4px", 
      height: "32px", 
      userSelect: "none",
      opacity: disabled ? 0.4 : 1
    }}>
      <button
        type="button"
        disabled={disabled || value <= min}
        onClick={() => onChange(Math.max(min, value - 1))}
        style={{
          width: "24px", height: "24px", borderRadius: "6px",
          border: "none", background: value <= min ? "transparent" : "rgba(255,255,255,0.08)",
          color: "var(--card-foreground)", display: "flex", alignItems: "center", justifyContent: "center",
          cursor: disabled || value <= min ? "not-allowed" : "pointer", fontSize: "0.9rem", fontWeight: 700,
          opacity: value <= min ? 0.3 : 1, transition: "background 0.2s"
        }}
      >
        -
      </button>
      <span style={{
        minWidth: "20px", textAlign: "center", fontWeight: 700,
        color: "var(--card-foreground)", fontSize: "0.85rem"
      }}>
        {value}
      </span>
      <button
        type="button"
        disabled={disabled || value >= max}
        onClick={() => onChange(Math.min(max, value + 1))}
        style={{
          width: "24px", height: "24px", borderRadius: "6px",
          border: "none", background: value >= max ? "transparent" : "rgba(255,255,255,0.08)",
          color: "var(--card-foreground)", display: "flex", alignItems: "center", justifyContent: "center",
          cursor: disabled || value >= max ? "not-allowed" : "pointer", fontSize: "0.9rem", fontWeight: 700,
          opacity: value >= max ? 0.3 : 1, transition: "background 0.2s"
        }}
      >
        +
      </button>
    </div>
  );
}

// Sub-component for suggestion item to handle hover state cleanly
function SuggestionItem({ member, onClick }: { member: any; onClick: () => void }) {
  const [hover, setHover] = useState(false);
  return (
    <div 
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        padding: "10px 16px",
        cursor: "pointer",
        fontSize: "0.88rem",
        color: "var(--card-foreground)",
        borderBottom: "1px solid rgba(255,255,255,0.04)",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        background: hover ? "rgba(255, 255, 255, 0.08)" : "transparent",
        transition: "background 0.2s"
      }}
    >
      <span><strong>{member.user.name}</strong> ({member.code})</span>
      <span style={{ fontSize: "0.75rem", color: "var(--primary)", fontWeight: 600 }}>+ Thêm điểm danh</span>
    </div>
  );
}

type Params = { params: Promise<{ id: string }> };

export default function MatchEditPage({ params }: Params) {
  const { id } = use(params);
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Match state
  const [match, setMatch] = useState<any>(null);
  
  // Edit state
  const [result, setResult] = useState<string>("");
  const [feeWinner, setFeeWinner] = useState<string>("");
  const [feeLose, setFeeLose] = useState<string>("");
  const [feeDraw, setFeeDraw] = useState<string>("");
  const [feeDefault, setFeeDefault] = useState<string>("");
  const [feeTotal, setFeeTotal] = useState<string>("");
  const [drinksFeeTotal, setDrinksFeeTotal] = useState<string>("");
  const [feeSplitMethod, setFeeSplitMethod] = useState<string>("EQUAL");
  
  // Attendance state
  const [attendances, setAttendances] = useState<Record<string, any>>({});
  const [allMembers, setAllMembers] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>("");

  useEffect(() => {
    Promise.all([
      fetch(`/api/matches/${id}`).then(res => res.json()),
      fetch(`/api/matches/${id}/attendance`).then(res => res.json())
    ]).then(([matchRes, attRes]) => {
      const m = matchRes.data;
      setMatch(m);
      setResult(m.result || "");
      setFeeWinner(m.feeWinner?.toString() || "");
      setFeeLose(m.feeLose?.toString() || "");
      setFeeDraw(m.feeDraw?.toString() || "");
      setFeeDefault(m.feeDefault?.toString() || "");
      setFeeTotal(m.feeTotal?.toString() || "");
      setDrinksFeeTotal(m.drinksFeeTotal?.toString() || "");

      const members = attRes.data.allMembers;
      setAllMembers(members);

      const attMap: Record<string, any> = {};
      
      // Default all members to ABSENT
      members.forEach((member: any) => {
        attMap[member.id] = {
          memberId: member.id,
          status: "ABSENT",
          teamSide: null,
          isDrinks: false,
          guestCount: 0,
          drinksGuestCount: 0
        };
      });

      // Override with existing attendance
      attRes.data.attendances.forEach((a: any) => {
        attMap[a.memberId] = {
          memberId: a.memberId,
          status: a.status,
          teamSide: a.teamSide,
          isDrinks: a.isDrinks || false,
          guestCount: a.guestCount || 0,
          drinksGuestCount: a.drinksGuestCount || 0
        };
      });

      setAttendances(attMap);
      setLoading(false);
    });
  }, [id]);

  const handleSave = async (finalize: boolean) => {
    setSaving(true);
    try {
      // 1. Save Attendance
      // We send all attendances to the server so it knows who is absent too
      await fetch(`/api/matches/${id}/attendance`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ attendances: Object.values(attendances) })
      });

      // 2. Save Match details
      await fetch(`/api/matches/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          result: result || undefined,
          status: result ? "DONE" : "UPCOMING",
          feeWinner: feeWinner || undefined,
          feeLose: feeLose || undefined,
          feeDraw: feeDraw || undefined,
          feeDefault: feeDefault || undefined,
          feeTotal: feeTotal || undefined,
          drinksFeeTotal: drinksFeeTotal || undefined,
          feeSplitMethod: feeSplitMethod,
        })
      });

      // 3. Finalize if requested
      if (finalize && result) {
        const res = await fetch(`/api/matches/${id}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({})
        });
        if (!res.ok) {
          const d = await res.json();
          alert("Lỗi khi tạo phiên thu tiền: " + d.error);
        }
      }

      router.push(`/matches/${id}`);
      router.refresh();
    } catch (e) {
      console.error(e);
      alert("Đã có lỗi xảy ra");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div>Đang tải...</div>;

  const isInternal = match?.matchType === "INTERNAL";

  // Filter members who are active (not ABSENT) to display in the main table
  const activeAttendancesList = allMembers.filter(member => {
    const att = attendances[member.id];
    return att && att.status !== "ABSENT";
  });

  // Suggest members who are currently ABSENT and match the search query
  const absentSuggestions = allMembers.filter(member => {
    const att = attendances[member.id];
    const isAbsent = !att || att.status === "ABSENT";
    if (!isAbsent) return false;
    if (!searchQuery) return false;
    
    const nameMatch = member.user.name?.toLowerCase().includes(searchQuery.toLowerCase());
    const codeMatch = member.code?.toLowerCase().includes(searchQuery.toLowerCase());
    return nameMatch || codeMatch;
  });

  const addMemberToAttendance = (memberId: string) => {
    const att = attendances[memberId];
    setAttendances({
      ...attendances,
      [memberId]: {
        ...att,
        status: "ATTENDED"
      }
    });
    setSearchQuery("");
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px", maxWidth: "900px", margin: "0 auto", paddingBottom: "40px" }}>
      <Link href={`/matches/${id}`} className="btn btn-secondary" style={{ alignSelf: "flex-start" }}>
        <ArrowLeft size={16} /> Quay lại
      </Link>

      <h1 style={{ fontSize: "1.75rem", fontWeight: 800, color: "var(--card-foreground)" }}>
        Chốt sổ trận đấu: {match?.title}
      </h1>

      {/* STEP 1: KẾT QUẢ & TIỀN SÂN */}
      <div className="glass-card" style={{ padding: "24px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
          <Trophy size={20} color="var(--primary)" />
          <h2 style={{ fontSize: "1.2rem", fontWeight: 700, color: "var(--card-foreground)" }}>Bước 1: Kết quả & Tiền sân</h2>
        </div>
        
        {isInternal ? (
          /* TRẬN NỘI BỘ LAYOUT */
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px" }}>
            <div>
              <label style={{ display: "block", marginBottom: "8px", fontSize: "0.9rem", color: "var(--muted-foreground)", fontWeight: 600 }}>Kết quả trận đấu</label>
              <select 
                value={result} 
                onChange={e => setResult(e.target.value)}
                className="form-input"
              >
                <option value="">-- Chưa có kết quả --</option>
                <option value="WIN">Đội A thắng</option>
                <option value="LOSE">Đội B thắng</option>
                <option value="DRAW">Hòa (Draw)</option>
              </select>
            </div>
            
            <div>
              <label style={{ display: "block", marginBottom: "8px", fontSize: "0.9rem", color: "var(--muted-foreground)", fontWeight: 600 }}>Tổng tiền sân cả trận</label>
              <input 
                type="number" 
                value={feeTotal} 
                onChange={e => setFeeTotal(e.target.value)} 
                className="form-input" 
                placeholder="VD: 800000"
              />
            </div>

            <div>
              <label style={{ display: "block", marginBottom: "8px", fontSize: "0.9rem", color: "var(--muted-foreground)", fontWeight: 600 }}>Cách chia tiền sân</label>
              <select 
                value={feeSplitMethod} 
                onChange={e => setFeeSplitMethod(e.target.value)}
                className="form-input"
                disabled={result === "DRAW" || !result}
              >
                <option value="EQUAL">Chia đều (50/50)</option>
                <option value="LOSER_100">Đội thua chịu 100%</option>
                <option value="LOSER_70_WINNER_30">Đội thua chịu 70% - Đội thắng 30%</option>
                <option value="LOSER_60_WINNER_40">Đội thua chịu 60% - Đội thắng 40%</option>
              </select>
            </div>

            <div>
              <label style={{ display: "block", marginBottom: "8px", fontSize: "0.9rem", color: "var(--muted-foreground)", fontWeight: 600 }}>Hoặc Phí cố định mỗi người</label>
              <input 
                type="number" 
                value={feeDefault} 
                onChange={e => setFeeDefault(e.target.value)} 
                className="form-input" 
                placeholder="VD: 50000"
              />
            </div>
          </div>
        ) : (
          /* TRẬN GIAO HỮU LAYOUT */
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
            <div>
              <label style={{ display: "block", marginBottom: "8px", fontSize: "0.9rem", color: "var(--muted-foreground)", fontWeight: 600 }}>Kết quả trận đấu</label>
              <select 
                value={result} 
                onChange={e => setResult(e.target.value)}
                className="form-input"
              >
                <option value="">-- Chưa có kết quả --</option>
                <option value="WIN">Thắng (Win)</option>
                <option value="LOSE">Thua (Lose)</option>
                <option value="DRAW">Hòa (Draw)</option>
              </select>
            </div>
            
            <div>
              <label style={{ display: "block", marginBottom: "8px", fontSize: "0.9rem", color: "var(--muted-foreground)", fontWeight: 600 }}>Tổng tiền sân (Hệ thống tự chia đều)</label>
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

      {/* STEP 2: ĐIỂM DANH */}
      <div className="glass-card" style={{ padding: "24px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
          <Users size={20} color="var(--primary)" />
          <h2 style={{ fontSize: "1.2rem", fontWeight: 700, color: "var(--card-foreground)" }}>Bước 2: Điểm danh</h2>
        </div>

        {/* Member Search input */}
        <div style={{ position: "relative", marginBottom: "20px" }}>
          <div style={{ display: "flex", alignItems: "center", background: "rgba(255,255,255,0.03)", border: "1px solid var(--border)", borderRadius: "8px", padding: "0 14px" }}>
            <Search size={18} style={{ color: "var(--muted-foreground)", marginRight: "10px" }} />
            <input 
              type="text" 
              placeholder="Gõ tên hoặc mã cầu thủ để thêm điểm danh (Ví dụ: Nguyễn Văn A, NVA)..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{
                background: "transparent",
                border: "none",
                outline: "none",
                width: "100%",
                padding: "10px 0",
                fontSize: "0.9rem",
                color: "var(--card-foreground)"
              }}
            />
          </div>
          
          {/* Autocomplete dropdown */}
          {searchQuery && (
            <div style={{
              position: "absolute",
              top: "100%",
              left: 0,
              right: 0,
              background: "rgba(30, 41, 59, 0.95)",
              border: "1px solid var(--border)",
              borderRadius: "8px",
              marginTop: "4px",
              maxHeight: "220px",
              overflowY: "auto",
              zIndex: 999,
              boxShadow: "0 10px 25px -5px rgba(0,0,0,0.5)",
              backdropFilter: "blur(10px)"
            }}>
              {absentSuggestions.length === 0 ? (
                <div style={{ padding: "12px 16px", color: "var(--muted-foreground)", fontSize: "0.85rem" }}>
                  Không tìm thấy thành viên nào chưa điểm danh
                </div>
              ) : (
                absentSuggestions.map(member => (
                  <SuggestionItem
                    key={member.id}
                    member={member}
                    onClick={() => addMemberToAttendance(member.id)}
                  />
                ))
              )}
            </div>
          )}
        </div>
        
        {/* Attendance Table */}
        <div style={{ overflowX: "auto" }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Cầu thủ</th>
                <th>Trạng thái</th>
                <th style={{ width: "120px" }}>Số khách</th>
                {isInternal && <th>Phân đội</th>}
              </tr>
            </thead>
            <tbody>
              {activeAttendancesList.length === 0 ? (
                <tr>
                  <td colSpan={isInternal ? 4 : 3} style={{ textAlign: "center", padding: "36px 12px", color: "var(--muted-foreground)" }}>
                    <Users size={32} style={{ margin: "0 auto 10px", opacity: 0.3, display: "block" }} />
                    Chưa có thành viên nào trong danh sách điểm danh.<br/>
                    Hãy sử dụng ô tìm kiếm ở trên để thêm người chơi tham gia trận đấu.
                  </td>
                </tr>
              ) : (
                activeAttendancesList.map(member => {
                  const att = attendances[member.id];
                  return (
                    <tr key={member.id}>
                      <td style={{ fontWeight: 600 }}>{member.user.name}</td>
                      <td>
                        <select 
                          value={att?.status ?? "ABSENT"} 
                          onChange={e => setAttendances({...attendances, [member.id]: {...att, status: e.target.value}})}
                          className="form-input"
                          style={{ padding: "4px 8px", width: "auto" }}
                        >
                          <option value="ATTENDED">Có mặt</option>
                          <option value="LATE">Muộn</option>
                          <option value="EXCUSED">Xin phép</option>
                          <option value="ABSENT">Vắng (Ẩn khỏi bảng)</option>
                        </select>
                      </td>
                      <td>
                        <Counter 
                          value={att?.guestCount ?? 0}
                          onChange={val => setAttendances({
                            ...attendances, 
                            [member.id]: {
                              ...att, 
                              guestCount: val,
                              // Update drinksGuestCount if it exceeds new guestCount
                              drinksGuestCount: Math.min(val, att?.drinksGuestCount ?? 0)
                            }
                          })}
                        />
                      </td>
                      {isInternal && (
                        <td>
                          <select 
                            value={att?.teamSide || ""} 
                            onChange={e => setAttendances({...attendances, [member.id]: {...att, teamSide: e.target.value || null}})}
                            className="form-input"
                            style={{ padding: "4px 8px", width: "auto" }}
                          >
                            <option value="">- Chọn đội -</option>
                            <option value="TEAM_A">
                              {result === "WIN" ? "Đội A (Thắng)" : result === "LOSE" ? "Đội A (Thua)" : "Đội A"}
                            </option>
                            <option value="TEAM_B">
                              {result === "WIN" ? "Đội B (Thua)" : result === "LOSE" ? "Đội B (Thắng)" : "Đội B"}
                            </option>
                          </select>
                        </td>
                      )}
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* STEP 3: TIỀN NƯỚC */}
      <div className="glass-card" style={{ padding: "24px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
          <Coffee size={20} color="var(--primary)" />
          <h2 style={{ fontSize: "1.2rem", fontWeight: 700, color: "var(--card-foreground)" }}>Bước 3: Tiền nước (Tùy chọn)</h2>
        </div>
        
        <div style={{ marginBottom: "20px" }}>
          <label style={{ display: "block", marginBottom: "6px", fontSize: "0.9rem", color: "var(--muted-foreground)", fontWeight: 600 }}>Tổng hóa đơn tiền nước cả đội</label>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <input 
              type="number" 
              value={drinksFeeTotal} 
              onChange={e => setDrinksFeeTotal(e.target.value)} 
              className="form-input" 
              placeholder="VD: 300000"
              style={{ maxWidth: "300px" }}
            />
          </div>
          <div style={{ fontSize: "0.78rem", color: "var(--primary)", marginTop: "6px", fontWeight: 500 }}>
            💡 Số tiền nước này là TỔNG HÓA ĐƠN. Hệ thống sẽ tự động chia đều cho các thành viên tích chọn uống nước ở dưới.
          </div>
        </div>

        <div style={{ fontSize: "0.9rem", color: "var(--muted-foreground)", marginBottom: "12px", fontWeight: 500 }}>
          Đánh dấu những thành viên ở lại uống nước và số khách uống đi kèm:
        </div>
        
        {activeAttendancesList.length === 0 ? (
          <div style={{ textAlign: "center", padding: "20px 10px", background: "rgba(30,41,59,0.2)", borderRadius: "8px", color: "var(--muted-foreground)", fontSize: "0.85rem" }}>
            Vui lòng thêm thành viên điểm danh ở Bước 2 trước.
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "12px", background: "rgba(30,41,59,0.3)", padding: "16px", borderRadius: "8px" }}>
            {activeAttendancesList.map(member => {
              const att = attendances[member.id];
              return (
                <div key={member.id} style={{ display: "flex", flexDirection: "column", gap: "8px", background: "rgba(30,41,59,0.5)", padding: "12px", borderRadius: "8px", border: "1px solid var(--border)" }}>
                  <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
                    <input 
                      type="checkbox" 
                      checked={att?.isDrinks ?? false} 
                      onChange={e => setAttendances({...attendances, [member.id]: {...att, isDrinks: e.target.checked}})}
                      style={{ width: "16px", height: "16px", accentColor: "var(--primary)" }}
                    />
                    <span style={{ fontSize: "0.9rem", color: "var(--card-foreground)", fontWeight: 600 }}>{member.user.name}</span>
                  </label>
                  
                  {att?.isDrinks && att.guestCount > 0 && (
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", paddingLeft: "24px" }}>
                      <span style={{ fontSize: "0.78rem", color: "var(--muted-foreground)" }}>Khách uống:</span>
                      <Counter 
                        value={att?.drinksGuestCount ?? 0}
                        max={att.guestCount}
                        onChange={val => setAttendances({...attendances, [member.id]: {...att, drinksGuestCount: val}})}
                      />
                      <span style={{ fontSize: "0.75rem", color: "var(--muted-foreground)" }}>/ {att.guestCount}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ACTIONS */}
      <div style={{ display: "flex", gap: "16px", justifyContent: "flex-end" }}>
        <button onClick={() => handleSave(false)} disabled={saving} className="btn btn-secondary" style={{ padding: "10px 20px" }}>
          <Save size={18} /> Lưu Nháp
        </button>
        <button onClick={() => handleSave(true)} disabled={saving || !result} className="btn btn-primary" style={{ padding: "10px 24px" }}>
          <CheckCircle size={18} /> Hoàn tất & Tính tiền
        </button>
      </div>
    </div>
  );
}
