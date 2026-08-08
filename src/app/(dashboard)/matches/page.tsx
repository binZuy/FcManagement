import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import Link from "next/link";
import { Plus, List, ChevronLeft, ChevronRight, Calendar as CalendarIcon, RotateCcw } from "lucide-react";
import { startOfMonth, endOfMonth, addMonths, subMonths, format, parse, getDaysInMonth, getDay, isSameDay } from "date-fns";
import { MatchesList } from "@/components/MatchesList";
import { MonthPicker } from "@/components/MonthPicker";
import { formatDateToYYYYMMDD } from "@/lib/utils";

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  UPCOMING: { label: "Sắp diễn ra", color: "#60a5fa", bg: "rgba(96,165,250,0.12)" },
  DONE: { label: "Đã xong", color: "#4ade80", bg: "rgba(34,197,94,0.12)" },
  CANCELLED: { label: "Đã hủy", color: "#f87171", bg: "rgba(239,68,68,0.12)" },
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
    // List view
    const dateQuery = month ? {
      gte: startOfMonth(currentMonthDate),
      lte: endOfMonth(currentMonthDate),
    } : undefined;

    const rawMatches = await prisma.matchSession.findMany({
      where: dateQuery ? { matchDate: dateQuery } : undefined,
      include: { _count: { select: { attendances: true } } },
      orderBy: { matchDate: "desc" },
    });
    
    matches = rawMatches.sort((a, b) => {
      if (a.status === "UPCOMING" && b.status !== "UPCOMING") return -1;
      if (a.status !== "UPCOMING" && b.status === "UPCOMING") return 1;
      return new Date(b.matchDate).getTime() - new Date(a.matchDate).getTime();
    });
  }

  // Generate calendar grid
  const daysInMonth = getDaysInMonth(currentMonthDate);
  const startDayOfWeek = getDay(startOfMonth(currentMonthDate)); // 0 = Sunday
  const startOffset = startDayOfWeek === 0 ? 6 : startDayOfWeek - 1; 
  
  const days = Array.from({ length: daysInMonth }, (_, i) => {
    const d = new Date(currentMonthDate.getFullYear(), currentMonthDate.getMonth(), i + 1);
    const dStr = formatDateToYYYYMMDD(d);
    const dayMatches = matches.filter(m => formatDateToYYYYMMDD(m.matchDate) === dStr);
    return { date: d, matches: dayMatches };
  });

  const blanks = Array.from({ length: startOffset }, (_, i) => i);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <h1 style={{ fontSize: "1.6rem", fontWeight: 800, color: "var(--card-foreground)", marginBottom: "4px" }}>
            Trận bóng
          </h1>
          <p style={{ color: "var(--muted-foreground)", fontSize: "0.85rem" }}>
            Quản lý lịch thi đấu và thông tin trận đấu
          </p>
        </div>
        {isAdmin && (
          <div style={{ display: "flex", gap: "10px" }}>
            <Link href="/matches/import" className="btn btn-secondary" style={{ padding: "6px 12px", fontSize: "0.8rem" }}>
              Import CSV
            </Link>
            <Link href="/matches/new" className="btn btn-primary" style={{ padding: "6px 14px", fontSize: "0.8rem", fontWeight: 700 }}>
              <Plus size={16} />
              Tạo trận mới
            </Link>
          </div>
        )}
      </div>

      {/* Toolbar - Responsive Layout */}
      <div
        className="glass-card"
        style={{
          padding: "12px 16px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "12px",
        }}
      >
        {/* 1. Toggle List/Calendar view */}
        <div style={{ display: "flex", gap: "4px", background: "rgba(30,41,59,0.5)", padding: "3px", borderRadius: "8px" }}>
          <Link 
            href={`/matches?view=list${month ? `&month=${month}` : ''}`}
            style={{
              padding: "5px 10px",
              borderRadius: "6px",
              background: view === "list" ? "var(--primary)" : "transparent",
              color: view === "list" ? "white" : "var(--muted-foreground)",
              display: "flex", alignItems: "center", gap: "6px",
              fontSize: "0.8rem", fontWeight: 600,
              textDecoration: "none"
            }}
          >
            <List size={15} /> Danh sách
          </Link>
          <Link 
            href={`/matches?view=calendar${month ? `&month=${month}` : ''}`}
            style={{
              padding: "5px 10px",
              borderRadius: "6px",
              background: view === "calendar" ? "var(--primary)" : "transparent",
              color: view === "calendar" ? "white" : "var(--muted-foreground)",
              display: "flex", alignItems: "center", gap: "6px",
              fontSize: "0.8rem", fontWeight: 600,
              textDecoration: "none"
            }}
          >
            <CalendarIcon size={15} /> Lịch
          </Link>
        </div>

        {/* 2. Date Navigation & Reset Button liền khối */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          {/* Controls chọn tháng */}
          <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
            <Link
              href={`/matches?view=${view}&month=${prevMonthStr}`}
              className="btn btn-secondary"
              style={{ padding: "5px 8px", height: "32px", borderRadius: "6px" }}
              title="Tháng trước"
            >
              <ChevronLeft size={16} />
            </Link>
            
            <MonthPicker currentMonth={format(currentMonthDate, "yyyy-MM")} view={view} />

            <Link
              href={`/matches?view=${view}&month=${nextMonthStr}`}
              className="btn btn-secondary"
              style={{ padding: "5px 8px", height: "32px", borderRadius: "6px" }}
              title="Tháng sau"
            >
              <ChevronRight size={16} />
            </Link>
          </div>

          {/* Reset Tháng */}
          {month && (
            <Link
              href={`/matches?view=${view}`}
              className="btn btn-secondary"
              style={{
                padding: "4px 10px",
                fontSize: "0.75rem",
                display: "flex",
                alignItems: "center",
                gap: "4px",
                height: "32px",
                borderRadius: "6px",
                background: "rgba(34,197,94,0.12)",
                color: "#4ade80",
                border: "1px solid rgba(34,197,94,0.3)",
              }}
              title="Xem tháng hiện tại"
            >
              <RotateCcw size={13} />
            </Link>
          )}
        </div>
      </div>

      {/* Content */}
      {view === "list" ? (
        <MatchesList initialMatches={matches.map(m => ({
          ...m,
          matchDate: m.matchDate.toISOString()
        }))} />
      ) : (
        /* Calendar View Responsive Container */
        <div className="glass-card" style={{ padding: "16px", overflowX: "auto" }}>
          <div style={{ minWidth: "650px" }}>
            {/* Calendar Header */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "6px", marginBottom: "8px" }}>
              {["T2", "T3", "T4", "T5", "T6", "T7", "CN"].map(d => (
                <div key={d} style={{ textAlign: "center", fontSize: "0.8rem", fontWeight: 700, color: "var(--muted-foreground)", padding: "4px 0" }}>
                  {d}
                </div>
              ))}
            </div>
            
            {/* Calendar Grid */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "6px" }}>
              {blanks.map(b => (
                <div key={`blank-${b}`} style={{ minHeight: "85px", background: "rgba(15,23,42,0.3)", borderRadius: "8px" }} />
              ))}
              
              {days.map((day, i) => {
                const isToday = isSameDay(day.date, new Date());
                const hasMatches = day.matches.length > 0;

                return (
                  <div key={i} style={{ 
                    minHeight: "85px", 
                    background: isToday ? "rgba(34,197,94,0.12)" : "rgba(30,41,59,0.4)", 
                    border: isToday ? "1px solid var(--primary)" : "1px solid transparent",
                    borderRadius: "8px", 
                    padding: "6px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "4px"
                  }}>
                    <div style={{ 
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center"
                    }}>
                      {hasMatches ? (
                        <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--primary)" }} />
                      ) : <span />}
                      <span style={{ 
                        fontSize: "0.8rem", 
                        fontWeight: isToday ? 800 : 600, 
                        color: isToday ? "var(--primary)" : "var(--card-foreground)",
                      }}>
                        {day.date.getDate()}
                      </span>
                    </div>
                    
                    <div style={{ display: "flex", flexDirection: "column", gap: "4px", flex: 1, overflowY: "auto", maxHeight: "65px" }}>
                      {day.matches.map(m => {
                        const st = STATUS_CONFIG[m.status] ?? STATUS_CONFIG.UPCOMING;
                        return (
                          <Link key={m.id} href={`/matches/${m.id}`} style={{ textDecoration: "none" }}>
                            <div style={{
                              background: st.bg,
                              padding: "3px 5px",
                              borderRadius: "4px",
                              fontSize: "0.68rem",
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
        </div>
      )}
    </div>
  );
}
