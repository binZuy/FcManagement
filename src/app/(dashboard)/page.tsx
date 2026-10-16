import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatDateTime } from "@/lib/utils";
import { MatchStatus, MatchType } from "@prisma/client";
import Link from "next/link";
import {
  MapPin,
  Clock,
  ChevronRight,
  Flame,
  Award,
} from "lucide-react";
import { DashboardInteractive } from "@/components/DashboardInteractive";

async function getDashboardData() {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

  const [
    totalMembers,
    activeMembers,
    totalMatches,
    matchesDone,
    friendlyMatches,
    matchesThisMonth,
    thisMonthMatchesList,
    upcomingMatch,
    lastDoneMatch,
    allMembers,
    topMembers,
  ] = await Promise.all([
    prisma.member.count(),
    prisma.member.count({ where: { status: "ACTIVE" } }),
    prisma.matchSession.count(),
    prisma.matchSession.count({ where: { status: MatchStatus.DONE } }),
    // 1. Chỉ tính tỷ lệ thắng cho các trận GIAO HỮU (Friendly / External)
    prisma.matchSession.findMany({
      where: {
        status: MatchStatus.DONE,
        matchType: { in: [MatchType.FRIENDLY, MatchType.EXTERNAL] },
        result: { not: null },
      },
      select: {
        id: true,
        title: true,
        matchDate: true,
        opponentName: true,
        result: true,
      },
      orderBy: { matchDate: "desc" },
    }),
    // 2. Tính số trận trong tháng hiện tại
    prisma.matchSession.count({
      where: {
        status: MatchStatus.DONE,
        matchDate: { gte: startOfMonth, lte: endOfMonth },
      },
    }),
    // Danh sách trận trong tháng hiện tại
    prisma.matchSession.findMany({
      where: {
        status: MatchStatus.DONE,
        matchDate: { gte: startOfMonth, lte: endOfMonth },
      },
      select: {
        id: true,
        title: true,
        matchDate: true,
        matchType: true,
        result: true,
      },
      orderBy: { matchDate: "desc" },
    }),
    // 3. Trận sắp tới gần nhất
    prisma.matchSession.findFirst({
      where: { status: MatchStatus.UPCOMING },
      include: {
        attendances: {
          include: { member: { include: { user: { select: { name: true, image: true } } } } },
        },
      },
      orderBy: { matchDate: "asc" },
    }),
    // 4. Trận vừa hoàn thành gần nhất (có MOTM, photos, comments)
    prisma.matchSession.findFirst({
      where: { status: MatchStatus.DONE },
      include: {
        motmMember: {
          include: {
            user: { select: { name: true, image: true } },
          },
        },
        comments: {
          include: {
            user: { select: { id: true, name: true, image: true, role: true } },
          },
          orderBy: { createdAt: "desc" },
        },
      },
      orderBy: { matchDate: "desc" },
    }),
    // 5. Danh sách toàn bộ thành viên cho mention @tag
    prisma.member.findMany({
      where: { status: "ACTIVE" },
      select: {
        id: true,
        code: true,
        jerseyNumber: true,
        user: { select: { name: true, image: true } },
      },
      orderBy: { code: "asc" },
    }),
    // 6. Top 3 chuyên cần
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
    }),
  ]);

  // Sort top members by attended count descending
  const sortedTopMembers = [...topMembers]
    .sort((a, b) => b._count.attendances - a._count.attendances)
    .slice(0, 3);

  // Tính Win rate chuẩn cho Giao hữu
  const friendlyWins = friendlyMatches.filter((m) => m.result === "WIN").length;
  const friendlyDraws = friendlyMatches.filter((m) => m.result === "DRAW").length;
  const friendlyLosses = friendlyMatches.filter((m) => m.result === "LOSE").length;
  const friendlyTotal = friendlyMatches.length;
  const winRate = friendlyTotal > 0 ? Math.round((friendlyWins / friendlyTotal) * 100) : 0;

  // Format allMembers for mention
  const formattedMembers = allMembers.map((m) => ({
    id: m.id,
    code: m.code,
    name: m.user.name || m.code,
    image: m.user.image,
    jerseyNumber: m.jerseyNumber,
  }));

  return {
    totalMembers,
    activeMembers,
    totalMatches,
    matchesDone,
    winRate,
    friendlyWins,
    friendlyDraws,
    friendlyLosses,
    friendlyTotal,
    matchesThisMonth,
    friendlyMatchesList: friendlyMatches.map((m) => ({
      ...m,
      matchDate: m.matchDate.toISOString(),
    })),
    thisMonthMatchesList: thisMonthMatchesList.map((m) => ({
      ...m,
      matchDate: m.matchDate.toISOString(),
    })),
    upcomingMatch,
    lastDoneMatch: lastDoneMatch
      ? {
          ...lastDoneMatch,
          matchDate: lastDoneMatch.matchDate.toISOString(),
          comments: lastDoneMatch.comments.map((c) => ({
            ...c,
            createdAt: c.createdAt.toISOString(),
          })),
        }
      : null,
    allMembers: formattedMembers,
    topMembers: sortedTopMembers,
  };
}

export default async function DashboardPage() {
  const session = await auth();
  const data = await getDashboardData();

  const currentUser = session?.user
    ? {
        id: session.user.id || "",
        name: session.user.name,
        image: session.user.image,
        role: session.user.role || "MEMBER",
      }
    : null;

  const topMedals = [
    { rank: "🥇 Top 1", color: "#facc15", bg: "rgba(250, 204, 21, 0.15)", border: "#facc15" },
    { rank: "🥈 Top 2", color: "#94a3b8", bg: "rgba(148, 163, 184, 0.15)", border: "#94a3b8" },
    { rank: "🥉 Top 3", color: "#fb923c", bg: "rgba(251, 146, 60, 0.15)", border: "#fb923c" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* Header */}
      <div>
        <h1
          style={{
            fontSize: "1.6rem",
            fontWeight: 800,
            color: "var(--card-foreground)",
            marginBottom: "4px",
          }}
        >
          Dashboard ⚽
        </h1>
        <p style={{ color: "var(--muted-foreground)", fontSize: "0.85rem" }}>
          Tổng quan hoạt động và hiệu suất thi đấu của FC
        </p>
      </div>

      {/* 4 STAT CARDS COMPACT & MOTM + BÌNH LUẬN INTERACTIVE */}
      <DashboardInteractive
        stats={{
          totalMembers: data.totalMembers,
          activeMembers: data.activeMembers,
          totalMatches: data.totalMatches,
          matchesDone: data.matchesDone,
          winRate: data.winRate,
          friendlyWins: data.friendlyWins,
          friendlyDraws: data.friendlyDraws,
          friendlyLosses: data.friendlyLosses,
          friendlyTotal: data.friendlyTotal,
          matchesThisMonth: data.matchesThisMonth,
          friendlyMatchesList: data.friendlyMatchesList,
          thisMonthMatchesList: data.thisMonthMatchesList,
        }}
        lastDoneMatch={data.lastDoneMatch}
        allMembers={data.allMembers}
        currentUser={currentUser}
      />

      {/* Main Dashboard Sections: Trận sắp tới & Top Chuyên Cần */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 320px), 1fr))",
          gap: "20px",
          width: "100%",
        }}
      >
        {/* SECTION 1: TRẬN ĐẤU SẮP TỚI */}
        <div
          className="glass-card"
          style={{
            padding: "16px",
            display: "flex",
            flexDirection: "column",
            gap: "16px",
            width: "100%",
            overflow: "hidden",
            borderRadius: "16px",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <div
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 10,
                  background: "rgba(96,165,250,0.15)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Flame size={18} color="#60a5fa" />
              </div>
              <div>
                <h2 style={{ fontSize: "1.05rem", fontWeight: 800, color: "var(--card-foreground)" }}>
                  Trận đấu sắp tới
                </h2>
                <div style={{ fontSize: "0.72rem", color: "var(--muted-foreground)" }}>
                  Lịch đá gần nhất của đội
                </div>
              </div>
            </div>

            <Link href="/matches" className="btn btn-secondary" style={{ padding: "6px 12px", fontSize: "0.78rem" }}>
              Xem tất cả <ChevronRight size={14} />
            </Link>
          </div>

          {data.upcomingMatch ? (
            <div
              style={{
                borderRadius: "14px",
                background: "linear-gradient(135deg, rgba(30,41,59,0.8), rgba(15,23,42,0.9))",
                border: "1px solid rgba(96,165,250,0.3)",
                padding: "16px",
                display: "flex",
                flexDirection: "column",
                gap: "14px",
                boxShadow: "0 10px 25px rgba(0,0,0,0.3)",
                width: "100%",
                overflow: "hidden",
              }}
            >
              {/* Match Title & Tag */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px" }}>
                <div>
                  <span
                    style={{
                      fontSize: "0.72rem",
                      fontWeight: 700,
                      color: "#60a5fa",
                      textTransform: "uppercase",
                      letterSpacing: "0.5px",
                    }}
                  >
                    {data.upcomingMatch.matchType === "INTERNAL"
                      ? "Trận Nội Bộ"
                      : data.upcomingMatch.opponentName
                      ? `Giao Hữu vs ${data.upcomingMatch.opponentName}`
                      : "Trận Giao Hữu"}
                  </span>
                  <h3 style={{ fontSize: "1.15rem", fontWeight: 800, color: "#f1f5f9", marginTop: "2px" }}>
                    {data.upcomingMatch.title}
                  </h3>
                </div>
                <span
                  style={{
                    padding: "4px 8px",
                    borderRadius: "999px",
                    fontSize: "0.72rem",
                    fontWeight: 700,
                    background: "rgba(96,165,250,0.15)",
                    color: "#60a5fa",
                    border: "1px solid rgba(96,165,250,0.3)",
                    flexShrink: 0,
                  }}
                >
                  Sắp diễn ra
                </span>
              </div>

              {/* Match Details */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
                  gap: "10px",
                  background: "rgba(0,0,0,0.2)",
                  padding: "10px 12px",
                  borderRadius: "10px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <Clock size={16} color="#60a5fa" />
                  <div>
                    <div style={{ fontSize: "0.68rem", color: "var(--muted-foreground)" }}>Thời gian</div>
                    <div style={{ fontSize: "0.82rem", fontWeight: 700, color: "#f1f5f9" }}>
                      {formatDateTime(data.upcomingMatch.matchDate)}
                    </div>
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <MapPin size={16} color="#22c55e" />
                  <div>
                    <div style={{ fontSize: "0.68rem", color: "var(--muted-foreground)" }}>Địa điểm</div>
                    <div
                      style={{
                        fontSize: "0.82rem",
                        fontWeight: 700,
                        color: "#f1f5f9",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {data.upcomingMatch.location ?? "Chưa xếp sân"}
                    </div>
                  </div>
                </div>
              </div>

              {/* Attendance & Action */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: "10px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <div style={{ display: "flex" }}>
                    {data.upcomingMatch.attendances.slice(0, 4).map((att, idx) => (
                      <div
                        key={idx}
                        style={{
                          width: 26,
                          height: 26,
                          borderRadius: "50%",
                          background: "#22c55e",
                          border: "2px solid #0f172a",
                          marginLeft: idx > 0 ? "-8px" : "0",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: "0.68rem",
                          fontWeight: 700,
                          color: "white",
                          overflow: "hidden",
                        }}
                      >
                        {att.member.user.image ? (
                          <img
                            src={att.member.user.image}
                            alt=""
                            style={{ width: "100%", height: "100%", objectFit: "cover" }}
                          />
                        ) : (
                          att.member.user.name?.[0]?.toUpperCase()
                        )}
                      </div>
                    ))}
                  </div>
                  <span style={{ fontSize: "0.78rem", color: "var(--muted-foreground)", fontWeight: 600 }}>
                    {data.upcomingMatch.attendances.length} anh em tham gia
                  </span>
                </div>

                <Link
                  href={`/matches/${data.upcomingMatch.id}`}
                  className="btn btn-primary"
                  style={{ padding: "6px 14px", fontSize: "0.8rem", fontWeight: 700 }}
                >
                  Điểm danh ngay
                </Link>
              </div>
            </div>
          ) : (
            <div
              style={{
                padding: "28px 16px",
                textAlign: "center",
                background: "rgba(30,41,59,0.3)",
                borderRadius: "14px",
                border: "1px dashed rgba(255,255,255,0.1)",
              }}
            >
              <div style={{ fontSize: "1.8rem", marginBottom: "6px" }}>😴⚽</div>
              <div style={{ fontWeight: 700, color: "var(--card-foreground)", fontSize: "0.9rem" }}>
                Chưa có kèo bóng nào sắp tới!
              </div>
            </div>
          )}
        </div>

        {/* SECTION 2: TOP 3 CHUYÊN CẦN */}
        <div
          className="glass-card"
          style={{
            padding: "16px",
            display: "flex",
            flexDirection: "column",
            gap: "14px",
            borderRadius: "16px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: 10,
                background: "rgba(250,204,21,0.15)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Award size={18} color="#facc15" />
            </div>
            <div>
              <h2 style={{ fontSize: "1.05rem", fontWeight: 800, color: "var(--card-foreground)" }}>
                Top 3 Chuyên Cần 🏆
              </h2>
              <div style={{ fontSize: "0.72rem", color: "var(--muted-foreground)" }}>
                Thành viên đi đá chăm chỉ nhất FC
              </div>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {data.topMembers.map((member, idx) => {
              const medal = topMedals[idx] ?? topMedals[2];
              return (
                <Link key={member.id} href={`/members/${member.id}`} style={{ textDecoration: "none" }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      padding: "10px 12px",
                      borderRadius: "10px",
                      background: medal.bg,
                      border: `1px solid ${medal.border}40`,
                      transition: "transform 0.15s ease",
                    }}
                  >
                    <div
                      style={{
                        fontSize: "0.82rem",
                        fontWeight: 900,
                        color: medal.color,
                        minWidth: "55px",
                        flexShrink: 0,
                      }}
                    >
                      {medal.rank}
                    </div>

                    {member.user.image ? (
                      <img
                        src={member.user.image}
                        alt=""
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: "50%",
                          border: `2px solid ${medal.color}`,
                          objectFit: "cover",
                        }}
                      />
                    ) : (
                      <div
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: "50%",
                          background: "var(--gradient-primary)",
                          color: "white",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: "0.85rem",
                          fontWeight: 800,
                          border: `2px solid ${medal.color}`,
                          flexShrink: 0,
                        }}
                      >
                        {member.user.name?.[0]?.toUpperCase() ?? "?"}
                      </div>
                    )}

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontWeight: 800,
                          fontSize: "0.88rem",
                          color: "var(--card-foreground)",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {member.user.name}
                      </div>
                      <div style={{ fontSize: "0.72rem", color: "var(--muted-foreground)" }}>
                        Mã FC: <strong style={{ color: "var(--primary)" }}>{member.code}</strong>
                        {member.jerseyNumber && ` · #${member.jerseyNumber}`}
                      </div>
                    </div>

                    <div style={{ textAlign: "right", flexShrink: 0 }}>
                      <div style={{ fontSize: "1rem", fontWeight: 900, color: medal.color }}>
                        {member._count.attendances}
                      </div>
                      <div style={{ fontSize: "0.65rem", color: "var(--muted-foreground)" }}>trận</div>
                    </div>
                  </div>
                </Link>
              );
            })}

            {data.topMembers.length === 0 && (
              <div
                style={{
                  textAlign: "center",
                  padding: "20px 0",
                  color: "var(--muted-foreground)",
                  fontSize: "0.8rem",
                }}
              >
                Chưa có dữ liệu chuyên cần
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
