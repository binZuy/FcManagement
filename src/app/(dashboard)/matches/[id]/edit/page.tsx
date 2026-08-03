"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, CheckCircle, Save, Users, Trophy, Coffee } from "lucide-react";

export default function MatchEditPage({ params }: { params: Promise<{ id: string }> }) {
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
  
  // Attendance state
  const [attendances, setAttendances] = useState<Record<string, any>>({});
  const [allMembers, setAllMembers] = useState<any[]>([]);

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
      const attArray = Object.values(attendances).filter(a => a.status !== "ABSENT" || a.isDrinks);
      // We send all attendances to the server so it knows who is absent too, actually sending everything is fine
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

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px", maxWidth: "900px", margin: "0 auto" }}>
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
        
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
          <div>
            <label style={{ display: "block", marginBottom: "8px", fontSize: "0.9rem", color: "var(--muted-foreground)" }}>Kết quả trận đấu</label>
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
          
          {isInternal ? (
            <>
              <div>
                <label style={{ display: "block", marginBottom: "8px", fontSize: "0.9rem", color: "var(--muted-foreground)" }}>Tổng tiền sân (Hệ thống tự chia)</label>
                <input 
                  type="number" 
                  value={feeTotal} 
                  onChange={e => setFeeTotal(e.target.value)} 
                  className="form-input" 
                  placeholder="VD: 800000"
                />
              </div>
              <div>
                <label style={{ display: "block", marginBottom: "8px", fontSize: "0.9rem", color: "var(--muted-foreground)" }}>Hoặc nhập Phí cố định mỗi người</label>
                <input 
                  type="number" 
                  value={feeDefault} 
                  onChange={e => setFeeDefault(e.target.value)} 
                  className="form-input" 
                  placeholder="VD: 50000"
                />
              </div>
            </>
          ) : (
            <>
              <div>
                <label style={{ display: "block", marginBottom: "8px", fontSize: "0.9rem", color: "var(--muted-foreground)" }}>Phí nếu Thắng</label>
                <input type="number" value={feeWinner} onChange={e => setFeeWinner(e.target.value)} className="form-input" placeholder="VD: 40000" />
              </div>
              <div>
                <label style={{ display: "block", marginBottom: "8px", fontSize: "0.9rem", color: "var(--muted-foreground)" }}>Phí nếu Thua</label>
                <input type="number" value={feeLose} onChange={e => setFeeLose(e.target.value)} className="form-input" placeholder="VD: 50000" />
              </div>
            </>
          )}
        </div>
      </div>

      {/* STEP 2: ĐIỂM DANH */}
      <div className="glass-card" style={{ padding: "24px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
          <Users size={20} color="var(--primary)" />
          <h2 style={{ fontSize: "1.2rem", fontWeight: 700, color: "var(--card-foreground)" }}>Bước 2: Điểm danh</h2>
        </div>
        
        <table className="data-table">
          <thead>
            <tr>
              <th>Cầu thủ</th>
              <th>Trạng thái</th>
              <th>Khách (+)</th>
              {isInternal && <th>Đội</th>}
            </tr>
          </thead>
          <tbody>
            {allMembers.map(member => {
              const att = attendances[member.id];
              return (
                <tr key={member.id}>
                  <td>{member.user.name}</td>
                  <td>
                    <select 
                      value={att?.status ?? "ABSENT"} 
                      onChange={e => setAttendances({...attendances, [member.id]: {...att, status: e.target.value}})}
                      className="form-input"
                      style={{ padding: "4px 8px", width: "auto" }}
                    >
                      <option value="ATTENDED">Có mặt</option>
                      <option value="LATE">Muộn</option>
                      <option value="ABSENT">Vắng</option>
                      <option value="EXCUSED">Xin phép</option>
                    </select>
                  </td>
                  <td>
                    <input 
                      type="number"
                      min="0"
                      value={att?.guestCount ?? 0}
                      onChange={e => setAttendances({...attendances, [member.id]: {...att, guestCount: parseInt(e.target.value) || 0}})}
                      className="form-input"
                      style={{ width: "60px", padding: "4px 8px", textAlign: "center" }}
                      disabled={att?.status === "ABSENT" || att?.status === "EXCUSED"}
                    />
                  </td>
                  {isInternal && (
                    <td>
                      <select 
                        value={att?.teamSide || ""} 
                        onChange={e => setAttendances({...attendances, [member.id]: {...att, teamSide: e.target.value || null}})}
                        className="form-input"
                        style={{ padding: "4px 8px", width: "auto" }}
                        disabled={att?.status === "ABSENT" || att?.status === "EXCUSED"}
                      >
                        <option value="">- Chọn đội -</option>
                        <option value="TEAM_A">Đội A</option>
                        <option value="TEAM_B">Đội B</option>
                      </select>
                    </td>
                  )}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* STEP 3: TIỀN NƯỚC */}
      <div className="glass-card" style={{ padding: "24px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
          <Coffee size={20} color="var(--primary)" />
          <h2 style={{ fontSize: "1.2rem", fontWeight: 700, color: "var(--card-foreground)" }}>Bước 3: Tiền nước (Tùy chọn)</h2>
        </div>
        
        <div style={{ marginBottom: "20px" }}>
          <label style={{ display: "block", marginBottom: "8px", fontSize: "0.9rem", color: "var(--muted-foreground)" }}>Tổng hóa đơn tiền nước</label>
          <input 
            type="number" 
            value={drinksFeeTotal} 
            onChange={e => setDrinksFeeTotal(e.target.value)} 
            className="form-input" 
            placeholder="VD: 300000"
            style={{ maxWidth: "300px" }}
          />
        </div>

        <div style={{ fontSize: "0.9rem", color: "var(--muted-foreground)", marginBottom: "8px" }}>
          Đánh dấu những thành viên ở lại uống nước và số khách đi kèm của họ (nếu có) uống nước:
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "12px", background: "rgba(30,41,59,0.3)", padding: "16px", borderRadius: "8px" }}>
          {allMembers.map(member => {
            const att = attendances[member.id];
            // Only show members who attended
            if (att.status === "ABSENT" || att.status === "EXCUSED") return null;
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
                {att.guestCount > 0 && (
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", paddingLeft: "24px" }}>
                    <span style={{ fontSize: "0.8rem", color: "var(--muted-foreground)" }}>Khách uống:</span>
                    <input 
                      type="number"
                      min="0"
                      max={att?.guestCount ?? 0}
                      value={att?.drinksGuestCount ?? 0}
                      onChange={e => setAttendances({...attendances, [member.id]: {...att, drinksGuestCount: Math.min(att?.guestCount ?? 0, parseInt(e.target.value) || 0)}})}
                      className="form-input"
                      style={{ width: "60px", padding: "2px 6px", fontSize: "0.8rem", textAlign: "center" }}
                    />
                    <span style={{ fontSize: "0.8rem", color: "var(--muted-foreground)" }}>/ {att.guestCount} khách</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ACTIONS */}
      <div style={{ display: "flex", gap: "16px", justifyContent: "flex-end" }}>
        <button onClick={() => handleSave(false)} disabled={saving} className="btn btn-secondary">
          <Save size={18} /> Lấy Nháp
        </button>
        <button onClick={() => handleSave(true)} disabled={saving || !result} className="btn btn-primary">
          <CheckCircle size={18} /> Hoàn tất & Tính tiền
        </button>
      </div>
    </div>
  );
}
