import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, MapPin, Edit, Users, UserCheck } from "lucide-react";
import { MatchStatus } from "@prisma/client";
import { MatchAdminActions } from "@/components/MatchAdminActions";

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  UPCOMING: { label: "Sắp diễn ra", color: "#60a5fa", bg: "rgba(96,165,250,0.12)" },
  DONE: { label: "Đã xong", color: "#4ade80", bg: "rgba(34,197,94,0.12)" },
  CANCELLED: { label: "Đã hủy", color: "#f87171", bg: "rgba(239,68,68,0.12)" },
};

const RESULT_CONFIG: Record<string, { label: string; color: string }> = {
  WIN: { label: "Thắng 🏆", color: "#4ade80" },
  LOSE: { label: "Thua 😢", color: "#f87171" },
  DRAW: { label: "Hòa 🤝", color: "#facc15" },
};

const ATTENDANCE_STATUS: Record<string, { label: string; color: string; bg: string }> = {
  ATTENDED: { label: "Có mặt", color: "#4ade80", bg: "rgba(34,197,94,0.15)" },
  ABSENT: { label: "Vắng mặt", color: "#f87171", bg: "rgba(239,68,68,0.15)" },
  LATE: { label: "Muộn", color: "#facc15", bg: "rgba(250,204,21,0.15)" },
  EXCUSED: { label: "Xin phép", color: "#a5b4fc", bg: "rgba(165,180,252,0.15)" },
};

type Params = { params: Promise<{ id: string }> };

export default async function MatchDetailPage({ params }: Params) {
  const { id } = await params;
  const session = await auth();
  const isAdmin = session?.user?.role === "ADMIN";
  const match = await prisma.matchSession.findUnique({
    where: { id },
    include: {
      attendances: {
        include: {
          member: {
            include: { user: { select: { name: true, image: true } } },
          },
        },
        orderBy: { member: { user: { name: "asc" } } },
      },
      paymentSessions: {
        select: { id: true, title: true, status: true },
      },
    },
  });

  if (!match) notFound();

  const statusCfg = STATUS_CONFIG[match.status] ?? STATUS_CONFIG.UPCOMING;
  const resultCfg = match.result ? RESULT_CONFIG[match.result] : null;
  const attendedList = match.attendances.filter((a) => a.status === "ATTENDED");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      <Link href="/matches" className="btn btn-secondary" style={{ alignSelf: "flex-start", padding: "6px 12px", fontSize: "0.82rem" }}>
        <ArrowLeft size={16} /> Quay lại danh sách
      </Link>

      {/* Header Match info */}
      <div className="glass-card" style={{ padding: "24px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "14px", marginBottom: "16px" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px", flexWrap: "wrap" }}>
              <h1 style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--card-foreground)" }}>
                {match.title}
              </h1>
              <span style={{
                padding: "3px 10px", borderRadius: "999px", fontSize: "0.75rem", fontWeight: 700,
                color: statusCfg.color, background: statusCfg.bg,
              }}>
                {statusCfg.label}
              </span>
            </div>
            <div style={{ display: "flex", gap: "14px", color: "var(--muted-foreground)", fontSize: "0.85rem", flexWrap: "wrap" }}>
              <span>📅 {formatDateTime(match.matchDate)}</span>
              {match.location && <span><MapPin size={14} style={{ display: "inline", verticalAlign: "middle", marginRight: 3 }} />{match.location}</span>}
              {match.feeTotal ? (
                <span>💰 Tổng tiền sân: {formatCurrency(match.feeTotal)}</span>
              ) : match.feeDefault ? (
                <span>💰 Phí dự kiến: {formatCurrency(match.feeDefault)}</span>
              ) : null}
            </div>
          </div>
          {isAdmin && (
            <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
              <MatchAdminActions match={match} />
              <Link href={`/matches/${match.id}/edit`} className="btn btn-primary" style={{ padding: "6px 14px", fontSize: "0.82rem", fontWeight: 700 }}>
                <Edit size={16} /> Điểm danh & Cập nhật
              </Link>
            </div>
          )}
        </div>

        {/* Overview Row */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: "12px", padding: "14px", background: "rgba(30,41,59,0.4)", borderRadius: "10px", marginTop: "16px" }}>
          <div>
            <div style={{ fontSize: "0.75rem", color: "var(--muted-foreground)", marginBottom: "2px" }}>Loại trận</div>
            <div style={{ fontWeight: 700, fontSize: "0.9rem", color: "var(--card-foreground)" }}>
              {match.matchType === "INTERNAL" 
                ? "Nội bộ" 
                : match.opponentName 
                  ? `Giao hữu (vs ${match.opponentName})` 
                  : "Giao hữu"}
            </div>
          </div>
          <div>
            <div style={{ fontSize: "0.75rem", color: "var(--muted-foreground)", marginBottom: "2px" }}>Kết quả</div>
            <div style={{ fontWeight: 800, fontSize: "0.9rem", color: resultCfg?.color ?? "var(--card-foreground)" }}>
              {resultCfg ? resultCfg.label : "Chưa có"}
            </div>
          </div>
          <div>
            <div style={{ fontSize: "0.75rem", color: "var(--muted-foreground)", marginBottom: "2px" }}>Thành viên tham gia</div>
            <div style={{ fontWeight: 800, fontSize: "0.9rem", color: "var(--primary)" }}>
              {attendedList.length} / {match.attendances.length} người
            </div>
          </div>
        </div>

        {match.paymentSessions.length > 0 && (
          <div style={{ marginTop: "16px", padding: "12px 14px", background: "rgba(34,197,94,0.05)", border: "1px solid rgba(34,197,94,0.2)", borderRadius: "10px" }}>
            <div style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--primary)", marginBottom: "6px" }}>
              Phiên thu tiền liên kết
            </div>
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              {match.paymentSessions.map(ps => (
                <Link key={ps.id} href={`/payments/session/${ps.id}`} className="btn btn-secondary" style={{ fontSize: "0.78rem", padding: "4px 10px" }}>
                  {ps.title}
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* DANH SÁCH ĐIỂM DANH RESPONSIVE (Web Table & Mobile Cards) */}
      <div className="glass-card" style={{ padding: "20px" }}>
        <h2 style={{ fontSize: "1.05rem", fontWeight: 700, marginBottom: "16px", color: "var(--card-foreground)", display: "flex", alignItems: "center", gap: "8px" }}>
          <UserCheck size={18} color="var(--primary)" /> Danh sách điểm danh ({match.attendances.filter(a => a.status === "ATTENDED" || a.status === "LATE").length} có mặt)
        </h2>

        {match.attendances.length === 0 ? (
          <p style={{ color: "var(--muted-foreground)", textAlign: "center", padding: "30px 0", fontSize: "0.88rem" }}>
            Chưa có dữ liệu điểm danh. Bạn cần cập nhật điểm danh và kết quả trận.
          </p>
        ) : (
          <>
            {/* 💻 DESKTOP TABLE */}
            <div className="desktop-only-table">
              <table className="data-table" style={{ width: "100%" }}>
                <thead>
                  <tr>
                    <th>Thành viên</th>
                    <th>Trạng thái</th>
                    <th>Tổng phải đóng</th>
                  </tr>
                </thead>
                <tbody>
                  {match.attendances
                    .filter((a) => a.status === "ATTENDED" || a.status === "LATE")
                    .map((a) => {
                    const st = ATTENDANCE_STATUS[a.status] ?? { label: a.status, color: "white", bg: "transparent" };
                    return (
                      <tr key={a.id}>
                        <td>
                          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                            {a.member.user.image ? (
                              <img src={a.member.user.image} alt="" style={{ width: 34, height: 34, borderRadius: "50%" }} />
                            ) : (
                              <div style={{ width: 34, height: 34, borderRadius: "50%", background: "var(--gradient-primary)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "13px", fontWeight: 700, color: "white" }}>
                                {a.member.user.name?.[0]?.toUpperCase()}
                              </div>
                            )}
                            <div>
                              <span style={{ fontWeight: 600, color: "var(--card-foreground)", fontSize: "0.88rem" }}>
                                {a.member.user.name}
                              </span>
                              {a.guestCount > 0 && (
                                <span style={{ color: "var(--primary)", fontSize: "0.78rem", marginLeft: "6px", fontWeight: 700 }}>
                                  (+{a.guestCount} khách)
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td>
                          <span style={{ padding: "4px 10px", borderRadius: "999px", fontSize: "0.72rem", fontWeight: 700, color: st.color, background: st.bg }}>
                            {st.label}
                          </span>
                        </td>
                        <td style={{ color: "var(--card-foreground)", fontWeight: 600, fontSize: "0.85rem" }}>
                          {(() => {
                            const total = (a.feeAssigned || 0) + (a.drinksFeeAssigned || 0);
                            if (total === 0) return <span style={{ color: "var(--muted-foreground)" }}>—</span>;
                            return (
                              <div>
                                <span>{formatCurrency(total)}</span>
                                {(a.feeAssigned || 0) > 0 && (a.drinksFeeAssigned || 0) > 0 && (
                                  <span style={{ display: "block", fontSize: "0.7rem", color: "var(--muted-foreground)", fontWeight: 400, marginTop: "2px" }}>
                                    Sân {formatCurrency(a.feeAssigned ?? 0)} · Nước {formatCurrency(a.drinksFeeAssigned ?? 0)}
                                  </span>
                                )}
                              </div>
                            );
                          })()}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* 📱 MOBILE COMPACT CARDS */}
            <div className="mobile-only-cards" style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {match.attendances
                .filter((a) => a.status === "ATTENDED" || a.status === "LATE")
                .map((a) => {
                const st = ATTENDANCE_STATUS[a.status] ?? { label: a.status, color: "white", bg: "transparent" };
                return (
                  <div
                    key={a.id}
                    className="glass-card"
                    style={{
                      padding: "12px 14px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: "10px",
                      background: "rgba(30,41,59,0.3)",
                      borderRadius: "10px",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "10px", flex: 1, minWidth: 0 }}>
                      {a.member.user.image ? (
                        <img src={a.member.user.image} alt="" style={{ width: 36, height: 36, borderRadius: "50%", flexShrink: 0 }} />
                      ) : (
                        <div style={{ width: 36, height: 36, borderRadius: "50%", background: "var(--gradient-primary)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "14px", fontWeight: 800, color: "white", flexShrink: 0 }}>
                          {a.member.user.name?.[0]?.toUpperCase()}
                        </div>
                      )}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 700, color: "var(--card-foreground)", fontSize: "0.88rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {a.member.user.name}
                        </div>
                        <div style={{ fontSize: "0.72rem", color: "var(--muted-foreground)", marginTop: "2px" }}>
                          {(() => {
                            const total = (a.feeAssigned || 0) + (a.drinksFeeAssigned || 0);
                            if (total === 0) return "Chưa tính";
                            return formatCurrency(total);
                          })()}
                          {a.guestCount > 0 && ` · +${a.guestCount} bạn`}
                        </div>
                      </div>
                    </div>

                    <span style={{ padding: "3px 8px", borderRadius: "999px", fontSize: "0.68rem", fontWeight: 700, color: st.color, background: st.bg, flexShrink: 0 }}>
                      {st.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
