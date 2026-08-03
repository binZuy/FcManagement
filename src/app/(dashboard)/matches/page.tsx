import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { formatCurrency, formatDate } from "@/lib/utils";
import Link from "next/link";
import { CalendarDays, Plus, List, ChevronLeft, ChevronRight, Calendar as CalendarIcon } from "lucide-react";
import { startOfMonth, endOfMonth, addMonths, subMonths, format, parse, getDaysInMonth, getDay, isSameDay } from "date-fns";

const MATCH_TYPE_LABELS: Record<string, string> = {
  INTERNAL: "Nội bộ",
  EXTERNAL: "Giao hữu",
};

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

export default async function MatchesPage({ searchParams }: { searchParams: Promise<{ view?: string; month?: string }> }) {
  const session = await auth();
  const isAdmin = session?.user?.role === "ADMIN";
  const { view = "list", month } = await searchParams;

  const currentMonthDate = month ? parse(month, "yyyy-MM", new Date()) : new Date();
  const prevMonthStr = format(subMonths(currentMonthDate, 1), "yyyy-MM");
  const nextMonthStr = format(addMonths(currentMonthDate, 1), "yyyy-MM");

  // Fetch matches
  let matches;
  if (view === "calendar") {
    // Only fetch matches for current month in calendar view
    matches = await prisma.matchSession.findMany({
      where: {
        matchDate: {
          gte: startOfMonth(currentMonthDate),
          lte: endOfMonth(currentMonthDate),
        }
      },
      include: { _count: { select: { attendances: true } } },
      orderBy: { matchDate: "asc" },
    });
  } else {
    // Fetch all for list view (or maybe paginate later)
    const rawMatches = await prisma.matchSession.findMany({
      include: { _count: { select: { attendances: true } } },
      orderBy: { matchDate: "desc" },
    });
    matches = rawMatches.sort((a, b) => {
      if (a.status === "UPCOMING" && b.status !== "UPCOMING") return -1;
      if (a.status !== "UPCOMING" && b.status === "UPCOMING") return 1;
      return new Date(b.matchDate).getTime() - new Date(a.matchDate).getTime();
    });
  }

  // Generate calendar grid if needed
  const daysInMonth = getDaysInMonth(currentMonthDate);
  const startDayOfWeek = getDay(startOfMonth(currentMonthDate)); // 0 = Sunday
  // Shift so Monday is 0
  const startOffset = startDayOfWeek === 0 ? 6 : startDayOfWeek - 1; 
  
  const days = Array.from({ length: daysInMonth }, (_, i) => {
    const d = new Date(currentMonthDate.getFullYear(), currentMonthDate.getMonth(), i + 1);
    const dayMatches = matches.filter(m => isSameDay(new Date(m.matchDate), d));
    return { date: d, matches: dayMatches };
  });

  const blanks = Array.from({ length: startOffset }, (_, i) => i);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "28px" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "16px" }}>
        <div>
          <h1 style={{ fontSize: "1.75rem", fontWeight: 800, color: "var(--card-foreground)", marginBottom: "4px" }}>
            Trận bóng
          </h1>
          <p style={{ color: "var(--muted-foreground)", fontSize: "0.9rem" }}>
            Quản lý lịch thi đấu và thông tin trận đấu
          </p>
        </div>
        {isAdmin && (
          <div style={{ display: "flex", gap: "12px" }}>
             <Link href="/matches/import" className="btn btn-secondary">
               Import CSV
             </Link>
            <Link href="/matches/new" className="btn btn-primary">
              <Plus size={18} />
              Tạo trận mới
            </Link>
          </div>
        )}
      </div>

      {/* Toolbar */}
      <div className="glass-card" style={{ padding: "12px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px" }}>
        <div style={{ display: "flex", gap: "8px", background: "rgba(30,41,59,0.5)", padding: "4px", borderRadius: "8px" }}>
          <Link 
            href={`/matches?view=list${month ? `&month=${month}` : ''}`}
            style={{
              padding: "6px 12px",
              borderRadius: "6px",
              background: view === "list" ? "var(--primary)" : "transparent",
              color: view === "list" ? "white" : "var(--muted-foreground)",
              display: "flex", alignItems: "center", gap: "6px",
              fontSize: "0.85rem", fontWeight: 600,
              textDecoration: "none"
            }}
          >
            <List size={16} /> Danh sách
          </Link>
          <Link 
            href={`/matches?view=calendar${month ? `&month=${month}` : ''}`}
            style={{
              padding: "6px 12px",
              borderRadius: "6px",
              background: view === "calendar" ? "var(--primary)" : "transparent",
              color: view === "calendar" ? "white" : "var(--muted-foreground)",
              display: "flex", alignItems: "center", gap: "6px",
              fontSize: "0.85rem", fontWeight: 600,
              textDecoration: "none"
            }}
          >
            <CalendarIcon size={16} /> Lịch
          </Link>
        </div>

        {view === "calendar" && (
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <Link href={`/matches?view=calendar&month=${prevMonthStr}`} className="btn btn-secondary" style={{ padding: "6px" }}>
              <ChevronLeft size={20} />
            </Link>
            <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--card-foreground)", minWidth: "120px", textAlign: "center" }}>
              Tháng {format(currentMonthDate, "MM/yyyy")}
            </div>
            <Link href={`/matches?view=calendar&month=${nextMonthStr}`} className="btn btn-secondary" style={{ padding: "6px" }}>
              <ChevronRight size={20} />
            </Link>
          </div>
        )}
      </div>

      {/* Content */}
      {view === "list" ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {matches.length === 0 && (
            <div className="glass-card" style={{ padding: "60px 24px", textAlign: "center" }}>
              <CalendarDays size={48} style={{ margin: "0 auto 16px", opacity: 0.3, display: "block" }} />
              <div style={{ fontWeight: 600, color: "var(--muted-foreground)" }}>Chưa có trận nào</div>
            </div>
          )}
          {matches.map((match) => {
            const statusCfg = STATUS_CONFIG[match.status] ?? STATUS_CONFIG.UPCOMING;
            const resultCfg = match.result ? RESULT_CONFIG[match.result] : null;
            return (
              <Link key={match.id} href={`/matches/${match.id}`} style={{ textDecoration: "none" }}>
                <div
                  className="glass-card hover-card"
                  style={{
                    padding: "20px 24px",
                    display: "flex",
                    alignItems: "center",
                    gap: "16px",
                    flexWrap: "wrap",
                    transition: "all 0.2s",
                  }}
                >
                  <div
                    style={{
                      width: 56,
                      height: 56,
                      borderRadius: "12px",
                      background: "rgba(34,197,94,0.1)",
                      border: "1px solid rgba(34,197,94,0.2)",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <div style={{ fontSize: "1.1rem", fontWeight: 800, color: "var(--primary)", lineHeight: 1 }}>
                      {new Date(match.matchDate).getDate()}
                    </div>
                    <div style={{ fontSize: "0.65rem", color: "var(--muted-foreground)", textTransform: "uppercase" }}>
                      {new Date(match.matchDate).toLocaleString("vi-VN", { month: "short" })}
                    </div>
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", marginBottom: "4px" }}>
                      <span style={{ fontWeight: 700, fontSize: "1rem", color: "var(--card-foreground)" }}>
                        {match.title}
                      </span>
                      <span style={{
                        padding: "2px 8px",
                        borderRadius: "999px",
                        fontSize: "0.7rem",
                        fontWeight: 600,
                        color: statusCfg.color,
                        background: statusCfg.bg,
                      }}>
                        {statusCfg.label}
                      </span>
                      <span style={{
                        padding: "2px 8px",
                        borderRadius: "999px",
                        fontSize: "0.7rem",
                        color: "var(--muted-foreground)",
                        background: "rgba(30,41,59,0.8)",
                      }}>
                        {MATCH_TYPE_LABELS[match.matchType]}
                        {match.opponentName ? ` vs ${match.opponentName}` : ""}
                      </span>
                    </div>
                    <div style={{ display: "flex", gap: "16px", flexWrap: "wrap", fontSize: "0.8rem", color: "var(--muted-foreground)" }}>
                      {match.location && <span>📍 {match.location}</span>}
                      <span>👥 {match._count.attendances} người tham gia</span>
                      {match.feeDefault && (
                        <span>💰 {formatCurrency(match.feeDefault)}</span>
                      )}
                    </div>
                  </div>

                  {resultCfg && (
                    <div
                      style={{
                        fontSize: "0.9rem",
                        fontWeight: 700,
                        color: resultCfg.color,
                        flexShrink: 0,
                      }}
                    >
                      {resultCfg.label}
                    </div>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="glass-card" style={{ padding: "20px" }}>
          {/* Calendar Header */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "8px", marginBottom: "8px" }}>
            {["T2", "T3", "T4", "T5", "T6", "T7", "CN"].map(d => (
              <div key={d} style={{ textAlign: "center", fontSize: "0.85rem", fontWeight: 700, color: "var(--muted-foreground)", padding: "8px 0" }}>
                {d}
              </div>
            ))}
          </div>
          
          {/* Calendar Grid */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "8px" }}>
            {blanks.map(b => (
              <div key={`blank-${b}`} style={{ minHeight: "100px", background: "rgba(15,23,42,0.3)", borderRadius: "8px" }} />
            ))}
            
            {days.map((day, i) => {
              const isToday = isSameDay(day.date, new Date());
              return (
                <div key={i} style={{ 
                  minHeight: "100px", 
                  background: isToday ? "rgba(34,197,94,0.1)" : "rgba(30,41,59,0.4)", 
                  border: isToday ? "1px solid var(--primary)" : "1px solid transparent",
                  borderRadius: "8px", 
                  padding: "8px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "4px"
                }}>
                  <div style={{ 
                    fontSize: "0.85rem", 
                    fontWeight: isToday ? 800 : 600, 
                    color: isToday ? "var(--primary)" : "var(--card-foreground)",
                    textAlign: "right"
                  }}>
                    {day.date.getDate()}
                  </div>
                  
                  <div style={{ display: "flex", flexDirection: "column", gap: "4px", flex: 1, overflowY: "auto" }}>
                    {day.matches.map(m => {
                      const st = STATUS_CONFIG[m.status] ?? STATUS_CONFIG.UPCOMING;
                      return (
                        <Link key={m.id} href={`/matches/${m.id}`} style={{ textDecoration: "none" }}>
                          <div style={{
                            background: st.bg,
                            padding: "4px 6px",
                            borderRadius: "4px",
                            fontSize: "0.7rem",
                            color: st.color,
                            fontWeight: 600,
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            border: `1px solid ${st.color}40`,
                            cursor: "pointer"
                          }} title={m.title}>
                            {m.title}
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
