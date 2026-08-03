import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, MapPin, Edit } from "lucide-react";
import { MatchStatus } from "@prisma/client";

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

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "28px" }}>
      <Link href="/matches" className="btn btn-secondary" style={{ alignSelf: "flex-start" }}>
        <ArrowLeft size={16} /> Quay lại
      </Link>

      <div className="glass-card" style={{ padding: "32px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "16px", marginBottom: "20px" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "8px", flexWrap: "wrap" }}>
              <h1 style={{ fontSize: "1.75rem", fontWeight: 800, color: "var(--card-foreground)" }}>
                {match.title}
              </h1>
              <span style={{
                padding: "4px 12px", borderRadius: "999px", fontSize: "0.75rem", fontWeight: 600,
                color: statusCfg.color, background: statusCfg.bg,
              }}>
                {statusCfg.label}
              </span>
            </div>
            <div style={{ display: "flex", gap: "16px", color: "var(--muted-foreground)", fontSize: "0.9rem", flexWrap: "wrap" }}>
              <span>📅 {formatDateTime(match.matchDate)}</span>
              {match.location && <span><MapPin size={14} style={{ display: "inline", verticalAlign: "middle", marginRight: 4 }} />{match.location}</span>}
              {match.feeTotal ? (
                <span>💰 Tổng tiền sân: {formatCurrency(match.feeTotal)}</span>
              ) : match.feeDefault ? (
                <span>💰 Phí dự kiến: {formatCurrency(match.feeDefault)}</span>
              ) : null}
            </div>
          </div>
          {isAdmin && match.status !== MatchStatus.DONE && (
             <Link href={`/matches/${match.id}/edit`} className="btn btn-secondary">
               <Edit size={16} /> Cập nhật KQ & Điểm danh
             </Link>
          )}
        </div>

        <div style={{ display: "flex", gap: "24px", padding: "16px", background: "rgba(30,41,59,0.4)", borderRadius: "12px", marginTop: "24px", flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: "150px" }}>
            <div style={{ fontSize: "0.8rem", color: "var(--muted-foreground)", marginBottom: "4px" }}>Loại trận</div>
            <div style={{ fontWeight: 600, color: "var(--card-foreground)" }}>
              {match.matchType === "INTERNAL" ? "Nội bộ" : `Giao hữu (vs ${match.opponentName})`}
            </div>
          </div>
          <div style={{ flex: 1, minWidth: "150px" }}>
            <div style={{ fontSize: "0.8rem", color: "var(--muted-foreground)", marginBottom: "4px" }}>Kết quả</div>
            <div style={{ fontWeight: 600, color: resultCfg?.color ?? "var(--card-foreground)" }}>
              {resultCfg ? resultCfg.label : "Chưa có"}
            </div>
          </div>
          <div style={{ flex: 1, minWidth: "150px" }}>
            <div style={{ fontSize: "0.8rem", color: "var(--muted-foreground)", marginBottom: "4px" }}>Thành viên tham gia</div>
            <div style={{ fontWeight: 600, color: "var(--card-foreground)" }}>
              {match.attendances.filter(a => a.status === "ATTENDED").length} / {match.attendances.length} người
            </div>
          </div>
        </div>

        {match.paymentSessions.length > 0 && (
          <div style={{ marginTop: "24px", padding: "16px", background: "rgba(34,197,94,0.05)", border: "1px solid rgba(34,197,94,0.2)", borderRadius: "12px" }}>
            <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--primary)", marginBottom: "8px" }}>
              Phiên thu tiền liên kết
            </div>
            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
              {match.paymentSessions.map(ps => (
                <Link key={ps.id} href={`/payments/${ps.id}`} className="btn btn-secondary" style={{ fontSize: "0.8rem", padding: "4px 12px" }}>
                  {ps.title}
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="glass-card" style={{ padding: "24px" }}>
        <h2 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: "20px", color: "var(--card-foreground)" }}>
          Danh sách điểm danh
        </h2>
        {match.attendances.length === 0 ? (
          <p style={{ color: "var(--muted-foreground)", textAlign: "center", padding: "30px 0", fontSize: "0.9rem" }}>
            Chưa có dữ liệu điểm danh. Bạn cần cập nhật điểm danh và kết quả trận.
          </p>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Thành viên</th>
                <th>Trạng thái</th>
                <th>Tiền sân</th>
                <th>Tiền nước</th>
              </tr>
            </thead>
            <tbody>
              {match.attendances.map(a => (
                <tr key={a.id}>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                       {a.member.user.image ? (
                        <img src={a.member.user.image} alt="" style={{ width: 32, height: 32, borderRadius: "50%" }} />
                      ) : (
                        <div style={{ width: 32, height: 32, borderRadius: "50%", background: "var(--gradient-primary)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "13px", fontWeight: 700, color: "white" }}>
                          {a.member.user.name?.[0]?.toUpperCase()}
                        </div>
                      )}
                      <span style={{ fontWeight: 600, color: "var(--card-foreground)" }}>
                        {a.member.user.name} {a.guestCount > 0 && <span style={{ color: "var(--primary)", fontSize: "0.85rem" }}>(+{a.guestCount})</span>}
                      </span>
                    </div>
                  </td>
                  <td>
                    <span style={{
                      padding: "4px 10px", borderRadius: "999px", fontSize: "0.75rem", fontWeight: 600,
                      color: a.status === "ATTENDED" ? "#4ade80" : a.status === "ABSENT" ? "#f87171" : "#facc15",
                      background: a.status === "ATTENDED" ? "rgba(34,197,94,0.15)" : a.status === "ABSENT" ? "rgba(239,68,68,0.15)" : "rgba(250,204,21,0.15)",
                    }}>
                      {a.status === "ATTENDED" ? "Có mặt" : a.status === "ABSENT" ? "Vắng mặt" : a.status === "LATE" ? "Muộn" : "Xin phép"}
                    </span>
                  </td>
                  <td style={{ color: "var(--muted-foreground)" }}>
                    {a.feeAssigned ? formatCurrency(a.feeAssigned) : "—"}
                  </td>
                  <td style={{ color: "var(--muted-foreground)" }}>
                    {a.drinksFeeAssigned ? (
                      <div>
                        {formatCurrency(a.drinksFeeAssigned)}
                        {a.drinksGuestCount > 0 && (
                          <span style={{ fontSize: "0.75rem", color: "var(--muted-foreground)", display: "block" }}>
                            ({a.isDrinks ? "1 TV + " : ""}{a.drinksGuestCount} khách)
                          </span>
                        )}
                      </div>
                    ) : (a.isDrinks || a.drinksGuestCount > 0 ? (
                      <span style={{ color: "var(--primary)" }}>
                        ✔️ Chờ tính
                        {a.drinksGuestCount > 0 && ` (${a.isDrinks ? "1 TV + " : ""}${a.drinksGuestCount} khách)`}
                      </span>
                    ) : "—")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
