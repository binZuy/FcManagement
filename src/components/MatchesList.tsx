"use client";

import { useState } from "react";
import Link from "next/link";
import { List, Search, MapPin, ChevronLeft, ChevronRight, CalendarDays, X, Calendar } from "lucide-react";
import { formatDateToYYYYMMDD } from "@/lib/utils";

interface MatchData {
  id: string;
  code: string;
  title: string;
  matchDate: string | Date;
  location: string | null;
  matchType: string;
  opponentName: string | null;
  feeDefault: number | null;
  status: string;
  result: string | null;
  _count: {
    attendances: number;
  };
}

interface MatchesListProps {
  initialMatches: MatchData[];
}

const MATCH_TYPE_LABELS: Record<string, string> = {
  INTERNAL: "Nội bộ",
  FRIENDLY: "Giao hữu",
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

const ITEMS_PER_PAGE = 8; // Số trận hiển thị trên mỗi trang

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(amount);
}

export function MatchesList({ initialMatches }: MatchesListProps) {
  const [search, setSearch] = useState("");
  const [selectedDate, setSelectedDate] = useState(""); // yyyy-MM-dd
  const [filterType, setFilterType] = useState("ALL");
  const [currentPage, setCurrentPage] = useState(1);

  // Lọc theo từ khóa, ngày cụ thể, loại trận
  const filteredMatches = initialMatches.filter((match) => {
    const query = search.toLowerCase().trim();
    const titleMatch = match.title.toLowerCase().includes(query);
    const locationMatch = match.location?.toLowerCase().includes(query) || false;
    const opponentMatch = match.opponentName?.toLowerCase().includes(query) || false;
    const searchMatch = titleMatch || locationMatch || opponentMatch;

    // Lọc ngày cụ thể
    let dateMatch = true;
    if (selectedDate) {
      const matchDateStr = formatDateToYYYYMMDD(match.matchDate);
      dateMatch = matchDateStr === selectedDate;
    }

    // Lọc loại trận
    const typeMatch =
      filterType === "ALL" ||
      match.matchType === filterType ||
      (filterType === "FRIENDLY" && match.matchType === "EXTERNAL");

    return searchMatch && dateMatch && typeMatch;
  });

  // Phân trang
  const totalPages = Math.ceil(filteredMatches.length / ITEMS_PER_PAGE) || 1;
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedMatches = filteredMatches.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      {/* Filters & Search Toolbar Responsive */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "10px",
        }}
      >
        {/* Tìm kiếm từ khóa + Chọn ngày thi đấu cụ thể */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px", flex: 1, minWidth: "260px", flexWrap: "wrap" }}>
          <div style={{ position: "relative", flex: 1, minWidth: "180px" }}>
            <input
              type="text"
              placeholder="Tìm trận, đối thủ, sân..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              className="form-input"
              style={{
                paddingLeft: "34px",
                paddingRight: search ? "28px" : "10px",
                background: "rgba(30, 41, 59, 0.4)",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                borderRadius: "8px",
                fontSize: "0.82rem",
                height: "36px",
              }}
            />
            <Search
              size={15}
              style={{
                position: "absolute",
                left: "10px",
                top: "50%",
                transform: "translateY(-50%)",
                color: "var(--muted-foreground)",
                pointerEvents: "none",
              }}
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                style={{
                  position: "absolute",
                  right: "8px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "transparent",
                  border: "none",
                  color: "var(--muted-foreground)",
                  cursor: "pointer",
                }}
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Ô Chọn ngày thi đấu cụ thể (DatePicker) */}
          <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => {
                setSelectedDate(e.target.value);
                setCurrentPage(1);
              }}
              style={{
                background: selectedDate ? "rgba(34,197,94,0.12)" : "rgba(30, 41, 59, 0.4)",
                color: selectedDate ? "#4ade80" : "var(--card-foreground)",
                border: selectedDate ? "1px solid rgba(34,197,94,0.3)" : "1px solid var(--border)",
                borderRadius: "8px",
                padding: "4px 8px",
                fontSize: "0.78rem",
                fontWeight: 600,
                outline: "none",
                height: "36px",
                cursor: "pointer",
              }}
              title="Lọc theo ngày cụ thể"
            />
            {selectedDate && (
              <button
                onClick={() => setSelectedDate("")}
                style={{
                  padding: "4px 8px",
                  borderRadius: "6px",
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  color: "var(--muted-foreground)",
                  fontSize: "0.72rem",
                  cursor: "pointer",
                  height: "36px",
                }}
                title="Bỏ lọc ngày"
              >
                Xóa ngày
              </button>
            )}
          </div>
        </div>

        {/* Bộ lọc loại trận (Nội bộ / Giao hữu) */}
        <div style={{ display: "flex", gap: "4px", background: "rgba(30,41,59,0.5)", padding: "3px", borderRadius: "8px" }}>
          {[
            { key: "ALL", label: "Tất cả" },
            { key: "INTERNAL", label: "Nội bộ" },
            { key: "FRIENDLY", label: "Giao hữu" },
          ].map((opt) => (
            <button
              key={opt.key}
              onClick={() => {
                setFilterType(opt.key);
                setCurrentPage(1);
              }}
              style={{
                padding: "5px 10px",
                borderRadius: "6px",
                border: "none",
                background: filterType === opt.key ? "var(--primary)" : "transparent",
                color: filterType === opt.key ? "white" : "var(--muted-foreground)",
                fontSize: "0.78rem",
                fontWeight: 600,
                cursor: "pointer",
                transition: "all 0.2s",
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Matches List Scroll Container */}
      <div style={{ display: "flex", flexDirection: "column", gap: "10px", maxHeight: "60vh", overflowY: "auto", paddingRight: "2px" }}>
        {paginatedMatches.length === 0 && (
          <div className="glass-card" style={{ padding: "50px 20px", textAlign: "center" }}>
            <CalendarDays size={42} style={{ margin: "0 auto 12px", opacity: 0.3, display: "block" }} />
            <div style={{ fontWeight: 600, color: "var(--muted-foreground)", fontSize: "0.9rem" }}>
              Không tìm thấy trận đấu nào phù hợp
            </div>
          </div>
        )}
        {paginatedMatches.map((match) => {
          const statusCfg = STATUS_CONFIG[match.status] ?? STATUS_CONFIG.UPCOMING;
          const resultCfg = match.result ? RESULT_CONFIG[match.result] : null;
          return (
            <Link key={match.id} href={`/matches/${match.id}`} style={{ textDecoration: "none" }}>
              <div
                className="glass-card hover-card animate-fade-in"
                style={{
                  padding: "14px 16px",
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  flexWrap: "wrap",
                  transition: "all 0.2s",
                }}
              >
                <div
                  style={{
                    width: 46,
                    height: 46,
                    borderRadius: "10px",
                    background: "rgba(34,197,94,0.1)",
                    border: "1px solid rgba(34,197,94,0.2)",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <div style={{ fontSize: "0.95rem", fontWeight: 800, color: "var(--primary)", lineHeight: 1 }}>
                    {new Date(match.matchDate).getDate()}
                  </div>
                  <div style={{ fontSize: "0.6rem", color: "var(--muted-foreground)", textTransform: "uppercase", marginTop: "2px" }}>
                    {new Date(match.matchDate).toLocaleString("vi-VN", { month: "short" })}
                  </div>
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", marginBottom: "4px" }}>
                    <span style={{ fontWeight: 700, fontSize: "0.9rem", color: "var(--card-foreground)" }}>
                      {match.title}
                    </span>
                    <span style={{
                      padding: "2px 8px",
                      borderRadius: "999px",
                      fontSize: "0.65rem",
                      fontWeight: 600,
                      color: statusCfg.color,
                      background: statusCfg.bg,
                    }}>
                      {statusCfg.label}
                    </span>
                    <span style={{
                      padding: "2px 8px",
                      borderRadius: "999px",
                      fontSize: "0.65rem",
                      color: "var(--muted-foreground)",
                      background: "rgba(30,41,59,0.8)",
                    }}>
                      {MATCH_TYPE_LABELS[match.matchType]}
                      {match.opponentName ? ` vs ${match.opponentName}` : ""}
                    </span>
                  </div>
                  <div style={{ display: "flex", gap: "14px", flexWrap: "wrap", fontSize: "0.75rem", color: "var(--muted-foreground)" }}>
                    {match.location && <span><MapPin size={12} style={{ display: "inline", verticalAlign: "middle", marginRight: 2 }} /> {match.location}</span>}
                    <span>👥 {match._count.attendances} người tham gia</span>
                    {match.feeDefault && (
                      <span>💰 {formatCurrency(match.feeDefault)}</span>
                    )}
                  </div>
                </div>

                {resultCfg && (
                  <div
                    style={{
                      fontSize: "0.82rem",
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

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "10px", marginTop: "6px" }}>
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            style={{
              padding: "5px 10px",
              borderRadius: "6px",
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.08)",
              color: currentPage === 1 ? "var(--muted-foreground)" : "var(--card-foreground)",
              cursor: currentPage === 1 ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              gap: "4px",
              fontSize: "0.78rem",
            }}
          >
            <ChevronLeft size={14} /> Trước
          </button>
          <span style={{ fontSize: "0.8rem", color: "var(--muted-foreground)" }}>
            Trang {currentPage} / {totalPages}
          </span>
          <button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            style={{
              padding: "5px 10px",
              borderRadius: "6px",
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.08)",
              color: currentPage === totalPages ? "var(--muted-foreground)" : "var(--card-foreground)",
              cursor: currentPage === totalPages ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              gap: "4px",
              fontSize: "0.78rem",
            }}
          >
            Sau <ChevronRight size={14} />
          </button>
        </div>
      )}
    </div>
  );
}
