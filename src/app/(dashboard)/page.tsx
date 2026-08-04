import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { RecordStatus, MatchStatus } from "@prisma/client";
import Link from "next/link";
import {
  Users,
  CalendarDays,
  Trophy,
  Activity,
  MapPin,
  Clock,
  CheckCircle,
  AlertCircle,
  ChevronRight,
  Flame,
  Award,
} from "lucide-react";

async function getDashboardData() {
  const [
    totalMembers,
    activeMembers,
    totalMatches,
    matchesDone,
    matchesWithResult,
    upcomingMatch,
    topMembers,
    openPaymentSessions,
  ] = await Promise.all([
    prisma.member.count(),
    prisma.member.count({ where: { status: "ACTIVE" } }),
    prisma.matchSession.count(),
    prisma.matchSession.count({ where: { status: MatchStatus.DONE } }),
    prisma.matchSession.findMany({
      where: { status: MatchStatus.DONE, result: { not: null } },
      select: { result: true },
    }),
    prisma.matchSession.findFirst({
      where: { status: MatchStatus.UPCOMING },
      include: {
        attendances: {
          include: { member: { include: { user: { select: { name: true, image: true } } } } },
        },
      },
      orderBy: { matchDate: "asc" },
    }),
    prisma.member.findMany({
      where: { status: "ACTIVE" },
      include: {
        user: { select: { name: true, image: true } },
        _count: {
          select: {
            attendances: { where: { status: "ATTENDED" } },
          },
        },
      },
      orderBy: {
        attendances: { _count: "desc" },
      },
      take: 3,
    }),
    prisma.paymentSession.findMany({
      where: { status: "OPEN" },
      include: {
        paymentRecords: {
          select: { status: true, amountRequired: true, amountPaid: true },
        },
      },
    }),
  ]);

  // Win rate calculation
  const wins = matchesWithResult.filter((m) => m.result === "WIN").length;
  const totalPlayedWithResult = matchesWithResult.length;
  const winRate = totalPlayedWithResult > 0 ? Math.round((wins / totalPlayedWithResult) * 100) : 0;

  // Avg matches per month estimate
  const avgMatchesPerMonth = Math.round(totalMatches > 0 ? totalMatches / 3 : 0) || totalMatches;

  return {
    totalMembers,
    activeMembers,
    totalMatches,
    matchesDone,
    winRate,
    wins,
    totalPlayedWithResult,
    avgMatchesPerMonth,
    upcomingMatch,
    topMembers,
    openPaymentSessions,
  };
}

export default async function DashboardPage() {
  const session = await auth();
  const isAdmin = session?.user?.role === "ADMIN";
  const data = await getDashboardData();

  // Admin financial stats calculation
  const totalOwed = data.openPaymentSessions.reduce(
    (sum, s) => sum + s.paymentRecords.reduce((r, p) => r + p.amountRequired, 0),
    0
  );
  const totalCollected = data.openPaymentSessions.reduce(
    (sum, s) =>
      sum +
      s.paymentRecords
        .filter((p) => p.status === RecordStatus.PAID)
        .reduce((r, p) => r + p.amountPaid, 0),
    0
  );
  const totalRemaining = Math.max(0, totalOwed - totalCollected);

  const topMedals = [
    { rank: "🥇 Top 1", color: "#facc15", bg: "rgba(250, 204, 21, 0.15)", border: "#facc15" },
    { rank: "🥈 Top 2", color: "#94a3b8", bg: "rgba(148, 163, 184, 0.15)", border: "#94a3b8" },
    { rank: "🥉 Top 3", color: "#fb923c", bg: "rgba(251, 146, 60, 0.15)", border: "#fb923c" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "32px" }}>
      {/* Header */}
      <div>
        <h1
          style={{
            fontSize: "1.75rem",
            fontWeight: 800,
            color: "var(--card-foreground)",
            marginBottom: "4px",
          }}
        >
          Dashboard ⚽
        </h1>
        <p style={{ color: "var(--muted-foreground)", fontSize: "0.9rem" }}>
          Tổng quan hoạt động và hiệu suất thi đấu của FC
        </p>
      </div>

      {/* Stats grid (Cho tất cả thành viên) */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "16px",
        }}
      >
        <div className="stat-card animate-fade-in">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: "rgba(34, 197, 94, 0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Users size={22} color="#22c55e" />
            </div>
          </div>
          <div style={{ fontSize: "1.6rem", fontWeight: 800, color: "var(--card-foreground)", marginBottom: "4px" }}>
            {data.activeMembers}
          </div>
          <div style={{ fontSize: "0.8rem", color: "var(--muted-foreground)" }}>Số thành viên</div>
          <div style={{ fontSize: "0.75rem", color: "#22c55e", marginTop: "2px" }}>
            {data.totalMembers} tổng thành viên
          </div>
        </div>

        <div className="stat-card animate-fade-in" style={{ animationDelay: "0.05s" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: "rgba(96, 165, 250, 0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <CalendarDays size={22} color="#60a5fa" />
            </div>
          </div>
          <div style={{ fontSize: "1.6rem", fontWeight: 800, color: "var(--card-foreground)", marginBottom: "4px" }}>
            {data.totalMatches}
          </div>
          <div style={{ fontSize: "0.8rem", color: "var(--muted-foreground)" }}>Tổng số trận</div>
          <div style={{ fontSize: "0.75rem", color: "#60a5fa", marginTop: "2px" }}>
            {data.matchesDone} trận đã đá xong
          </div>
        </div>

        <div className="stat-card animate-fade-in" style={{ animationDelay: "0.1s" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: "rgba(250, 204, 21, 0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Trophy size={22} color="#facc15" />
            </div>
          </div>
          <div style={{ fontSize: "1.6rem", fontWeight: 800, color: "var(--card-foreground)", marginBottom: "4px" }}>
            {data.winRate}%
          </div>
          <div style={{ fontSize: "0.8rem", color: "var(--muted-foreground)" }}>Tỷ lệ thắng</div>
          <div style={{ fontSize: "0.75rem", color: "#facc15", marginTop: "2px" }}>
            {data.wins}/{data.totalPlayedWithResult} trận thắng
          </div>
        </div>

        <div className="stat-card animate-fade-in" style={{ animationDelay: "0.15s" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: "rgba(167, 139, 250, 0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Activity size={22} color="#a78bfa" />
            </div>
          </div>
          <div style={{ fontSize: "1.6rem", fontWeight: 800, color: "var(--card-foreground)", marginBottom: "4px" }}>
            {data.avgMatchesPerMonth}
          </div>
          <div style={{ fontSize: "0.8rem", color: "var(--muted-foreground)" }}>Số trận / tháng</div>
          <div style={{ fontSize: "0.75rem", color: "#a78bfa", marginTop: "2px" }}>
            Tần suất ra sân trung bình
          </div>
        </div>

        {/* ADMIN FINANCIAL OVERVIEW (Chỉ Admin mới hiển thị) */}
        {isAdmin && (
          <>
            <div className="stat-card animate-fade-in" style={{ animationDelay: "0.2s", border: "1px solid rgba(34,197,94,0.3)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: "rgba(34, 197, 94, 0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <CheckCircle size={22} color="#4ade80" />
                </div>
              </div>
              <div style={{ fontSize: "1.4rem", fontWeight: 800, color: "#4ade80", marginBottom: "4px" }}>
                {formatCurrency(totalCollected)}
              </div>
              <div style={{ fontSize: "0.8rem", color: "var(--muted-foreground)" }}>[Admin] Đã thu</div>
              <div style={{ fontSize: "0.75rem", color: "#4ade80", marginTop: "2px" }}>
                Các phiên đang mở
              </div>
            </div>

            <div className="stat-card animate-fade-in" style={{ animationDelay: "0.25s", border: "1px solid rgba(248,113,113,0.3)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: "rgba(239, 68, 68, 0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <AlertCircle size={22} color="#f87171" />
                </div>
              </div>
              <div style={{ fontSize: "1.4rem", fontWeight: 800, color: "#f87171", marginBottom: "4px" }}>
                {formatCurrency(totalRemaining)}
              </div>
              <div style={{ fontSize: "0.8rem", color: "var(--muted-foreground)" }}>[Admin] Tổng khoản cần thu</div>
              <div style={{ fontSize: "0.75rem", color: "#f87171", marginTop: "2px" }}>
                Số tiền cần đóng
              </div>
            </div>
          </>
        )}
      </div>

      {/* Main Dashboard Sections */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: "24px" }}>

        {/* SECTION 1: TRẬN ĐẤU SẮP TỚI */}
        <div className="glass-card" style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(96,165,250,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Flame size={20} color="#60a5fa" />
              </div>
              <div>
                <h2 style={{ fontSize: "1.1rem", fontWeight: 800, color: "var(--card-foreground)" }}>
                  Trận đấu sắp tới
                </h2>
                <div style={{ fontSize: "0.75rem", color: "var(--muted-foreground)" }}>
                  Lịch đá gần nhất của đội
                </div>
              </div>
            </div>

            <Link href="/matches" className="btn btn-secondary" style={{ padding: "6px 12px", fontSize: "0.8rem" }}>
              Xem tất cả <ChevronRight size={14} />
            </Link>
          </div>

          {data.upcomingMatch ? (
            <div
              style={{
                borderRadius: "14px",
                background: "linear-gradient(135deg, rgba(30,41,59,0.8), rgba(15,23,42,0.9))",
                border: "1px solid rgba(96,165,250,0.3)",
                padding: "20px",
                display: "flex",
                flexDirection: "column",
                gap: "16px",
                boxShadow: "0 10px 25px rgba(0,0,0,0.3)",
              }}
            >
              {/* Match Title & Tag */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px" }}>
                <div>
                  <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "#60a5fa", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                    {data.upcomingMatch.matchType === "INTERNAL" ? "Trận Nội Bộ" : `Giao Hữu vs ${data.upcomingMatch.opponentName}`}
                  </span>
                  <h3 style={{ fontSize: "1.25rem", fontWeight: 800, color: "#f1f5f9", marginTop: "2px" }}>
                    {data.upcomingMatch.title}
                  </h3>
                </div>
                <span
                  style={{
                    padding: "4px 10px",
                    borderRadius: "999px",
                    fontSize: "0.75rem",
                    fontWeight: 700,
                    background: "rgba(96,165,250,0.15)",
                    color: "#60a5fa",
                    border: "1px solid rgba(96,165,250,0.3)",
                  }}
                >
                  Sắp diễn ra
                </span>
              </div>

              {/* Match Details */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", background: "rgba(0,0,0,0.2)", padding: "14px", borderRadius: "10px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <Clock size={18} color="#60a5fa" />
                  <div>
                    <div style={{ fontSize: "0.7rem", color: "var(--muted-foreground)" }}>Thời gian thi đấu</div>
                    <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "#f1f5f9" }}>
                      {formatDateTime(data.upcomingMatch.matchDate)}
                    </div>
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <MapPin size={18} color="#22c55e" />
                  <div>
                    <div style={{ fontSize: "0.7rem", color: "var(--muted-foreground)" }}>Địa điểm (Sân)</div>
                    <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "#f1f5f9", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {data.upcomingMatch.location ?? "Chưa xếp sân"}
                    </div>
                  </div>
                </div>
              </div>

              {/* Attendance & Action */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <div style={{ display: "flex" }}>
                    {data.upcomingMatch.attendances.slice(0, 4).map((att, idx) => (
                      <div
                        key={idx}
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: "50%",
                          background: "#22c55e",
                          border: "2px solid #0f172a",
                          marginLeft: idx > 0 ? "-8px" : "0",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: "0.7rem",
                          fontWeight: 700,
                          color: "white",
                          overflow: "hidden"
                        }}
                      >
                        {att.member.user.image ? (
                          <img src={att.member.user.image} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        ) : (
                          att.member.user.name?.[0]?.toUpperCase()
                        )}
                      </div>
                    ))}
                  </div>
                  <span style={{ fontSize: "0.8rem", color: "var(--muted-foreground)", fontWeight: 600 }}>
                    {data.upcomingMatch.attendances.length} anh em đã đăng ký
                  </span>
                </div>

                <Link
                  href={`/matches/${data.upcomingMatch.id}`}
                  className="btn btn-primary"
                  style={{ padding: "8px 16px", fontSize: "0.85rem", fontWeight: 700 }}
                >
                  Xem chi tiết & Điểm danh
                </Link>
              </div>
            </div>
          ) : (
            <div
              style={{
                padding: "36px 20px",
                textAlign: "center",
                background: "rgba(30,41,59,0.3)",
                borderRadius: "14px",
                border: "1px dashed rgba(255,255,255,0.1)",
              }}
            >
              <div style={{ fontSize: "2rem", marginBottom: "8px" }}>😴⚽</div>
              <div style={{ fontWeight: 700, color: "var(--card-foreground)", fontSize: "0.95rem" }}>
                Chưa có kèo bóng nào sắp tới ư 🏃‍♂️🔥?
              </div>
            </div>
          )}
        </div>

        {/* SECTION 2: TOP 3 THÀNH VIÊN ĐÁ CHĂM CHỈ NHẤT */}
        <div className="glass-card" style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "20px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(250,204,21,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Award size={20} color="#facc15" />
            </div>
            <div>
              <h2 style={{ fontSize: "1.1rem", fontWeight: 800, color: "var(--card-foreground)" }}>
                Top 3 Chuyên Cần 🏆
              </h2>
              <div style={{ fontSize: "0.75rem", color: "var(--muted-foreground)" }}>
                Thành viên đi đá chăm chỉ nhất FC
              </div>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {data.topMembers.map((member, idx) => {
              const medal = topMedals[idx] ?? topMedals[2];
              return (
                <Link
                  key={member.id}
                  href={`/members/${member.id}`}
                  style={{ textDecoration: "none" }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "14px",
                      padding: "14px 16px",
                      borderRadius: "12px",
                      background: medal.bg,
                      border: `1px solid ${medal.border}40`,
                      transition: "transform 0.2s ease",
                    }}
                  >
                    {/* Rank Badge */}
                    <div
                      style={{
                        fontSize: "0.9rem",
                        fontWeight: 900,
                        color: medal.color,
                        minWidth: "60px",
                        flexShrink: 0,
                      }}
                    >
                      {medal.rank}
                    </div>

                    {/* Avatar */}
                    {member.user.image ? (
                      <img
                        src={member.user.image}
                        alt=""
                        style={{
                          width: 42,
                          height: 42,
                          borderRadius: "50%",
                          border: `2px solid ${medal.color}`,
                          objectFit: "cover",
                        }}
                      />
                    ) : (
                      <div
                        style={{
                          width: 42,
                          height: 42,
                          borderRadius: "50%",
                          background: "var(--gradient-primary)",
                          color: "white",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: "1rem",
                          fontWeight: 800,
                          border: `2px solid ${medal.color}`,
                          flexShrink: 0,
                        }}
                      >
                        {member.user.name?.[0]?.toUpperCase() ?? "?"}
                      </div>
                    )}

                    {/* Member Details */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 800, fontSize: "0.95rem", color: "var(--card-foreground)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {member.user.name}
                      </div>
                      <div style={{ fontSize: "0.75rem", color: "var(--muted-foreground)", marginTop: "2px" }}>
                        Mã FC: <strong style={{ color: "var(--primary)" }}>{member.code}</strong>
                        {member.jerseyNumber && ` · #${member.jerseyNumber}`}
                      </div>
                    </div>

                    {/* Match count badge */}
                    <div style={{ textAlign: "right", flexShrink: 0 }}>
                      <div style={{ fontSize: "1.1rem", fontWeight: 900, color: medal.color }}>
                        {member._count.attendances}
                      </div>
                      <div style={{ fontSize: "0.68rem", color: "var(--muted-foreground)" }}>
                        trận đã đá
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}

            {data.topMembers.length === 0 && (
              <div style={{ textAlign: "center", padding: "30px 0", color: "var(--muted-foreground)", fontSize: "0.85rem" }}>
                Chưa có dữ liệu chuyên cần
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
