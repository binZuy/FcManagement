"use client";

import { useState } from "react";
import Link from "next/link";
import { Users, Search, X, ChevronRight } from "lucide-react";

interface MemberData {
  id: string;
  code: string;
  jerseyNumber: number | null;
  position: string | null;
  joinDate: string | Date;
  status: string;
  user: {
    name: string | null;
    email: string | null;
    image: string | null;
    phone: string | null;
  };
  _count: {
    attendances: number;
    paymentRecords: number;
  };
}

interface MembersListProps {
  initialMembers: MemberData[];
  isAdmin: boolean;
}

const POSITION_LABELS: Record<string, string> = {
  GOALKEEPER: "Thủ môn",
  DEFENDER: "Hậu vệ",
  MIDFIELDER: "Tiền vệ",
  FORWARD: "Tiền đạo",
};

const STATUS_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  ACTIVE: { label: "Đang hoạt động", color: "#4ade80", bg: "rgba(34,197,94,0.12)" },
  INACTIVE: { label: "Không hoạt động", color: "#94a3b8", bg: "rgba(148,163,184,0.12)" },
  SUSPENDED: { label: "Tạm ngừng", color: "#f87171", bg: "rgba(239,68,68,0.12)" },
};

function formatDate(date: Date | string): string {
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(date));
}

export function MembersList({ initialMembers, isAdmin }: MembersListProps) {
  const [search, setSearch] = useState("");

  const filteredMembers = initialMembers.filter((member) => {
    const query = search.toLowerCase().trim();
    if (!query) return true;

    const name = member.user.name?.toLowerCase() || "";
    const email = member.user.email?.toLowerCase() || "";
    const code = member.code.toLowerCase();
    const phone = member.user.phone || "";

    return (
      name.includes(query) ||
      email.includes(query) ||
      code.includes(query) ||
      phone.includes(query)
    );
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      {/* Search Input */}
      <div style={{ position: "relative", width: "100%", maxWidth: "360px" }}>
        <input
          type="text"
          placeholder="Tìm theo tên, email, mã, sđt..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="form-input"
          style={{
            paddingLeft: "36px",
            paddingRight: search ? "32px" : "12px",
            background: "rgba(30, 41, 59, 0.4)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            borderRadius: "10px",
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
        {search && (
          <button
            onClick={() => setSearch("")}
            style={{
              position: "absolute",
              right: "10px",
              top: "50%",
              transform: "translateY(-50%)",
              background: "transparent",
              border: "none",
              color: "var(--muted-foreground)",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "4px",
            }}
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* 💻 DESKTOP DATA TABLE (Hiển thị trên Web màn hình lớn) */}
      <div
        className="glass-card desktop-only-table"
        style={{
          maxHeight: "65vh",
          overflowY: "auto",
          borderRadius: "12px",
          border: "1px solid rgba(255, 255, 255, 0.06)",
        }}
      >
        <table className="data-table" style={{ width: "100%" }}>
          <thead style={{ position: "sticky", top: 0, zIndex: 10, background: "#111827" }}>
            <tr>
              <th>Thành viên</th>
              <th>Số áo</th>
              <th>Vị trí</th>
              <th>Ngày gia nhập</th>
              <th>Trận đã đá</th>
              <th>Trạng thái</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filteredMembers.map((member) => {
              const st = STATUS_LABELS[member.status] ?? STATUS_LABELS.INACTIVE;
              return (
                <tr key={member.id} className="animate-fade-in">
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                      {member.user.image ? (
                        <img
                          src={member.user.image}
                          alt={member.user.name ?? ""}
                          style={{ width: 36, height: 36, borderRadius: "50%", border: "2px solid var(--border)" }}
                        />
                      ) : (
                        <div
                          style={{
                            width: 36,
                            height: 36,
                            borderRadius: "50%",
                            background: "var(--gradient-primary)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: "14px",
                            fontWeight: 700,
                            color: "white",
                            flexShrink: 0,
                          }}
                        >
                          {member.user.name?.[0]?.toUpperCase() ?? "?"}
                        </div>
                      )}
                      <div>
                        <div style={{ fontWeight: 600, color: "var(--card-foreground)", fontSize: "0.875rem" }}>
                          {member.user.name}
                        </div>
                        <div style={{ fontSize: "0.75rem", color: "var(--muted-foreground)" }}>
                          {member.user.email} · <span style={{ color: "var(--primary)", fontWeight: 600 }}>{member.code}</span>
                        </div>
                      </div>
                    </div>
                  </td>
                  <td style={{ color: "var(--card-foreground)", fontWeight: 700, fontSize: "1rem" }}>
                    {member.jerseyNumber ? `#${member.jerseyNumber}` : "—"}
                  </td>
                  <td style={{ color: "var(--muted-foreground)", fontSize: "0.8rem" }}>
                    {member.position ? POSITION_LABELS[member.position] : "—"}
                  </td>
                  <td style={{ color: "var(--muted-foreground)", fontSize: "0.8rem" }}>
                    {formatDate(member.joinDate)}
                  </td>
                  <td style={{ color: "var(--card-foreground)", fontSize: "0.85rem" }}>
                    {member._count.attendances}
                  </td>
                  <td>
                    <span
                      style={{
                        padding: "4px 10px",
                        borderRadius: "999px",
                        fontSize: "0.75rem",
                        fontWeight: 600,
                        color: st.color,
                        background: st.bg,
                        display: "inline-block",
                      }}
                    >
                      {st.label}
                    </span>
                  </td>
                  <td>
                    <Link
                      href={`/members/${member.id}`}
                      className="btn btn-secondary"
                      style={{ padding: "6px 12px", fontSize: "0.8rem" }}
                    >
                      Xem
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {filteredMembers.length === 0 && (
          <div
            style={{
              padding: "60px 24px",
              textAlign: "center",
              color: "var(--muted-foreground)",
            }}
          >
            <Users size={48} style={{ margin: "0 auto 16px", opacity: 0.3 }} />
            <div style={{ fontWeight: 600 }}>Không tìm thấy thành viên phù hợp</div>
          </div>
        )}
      </div>

      {/* 📱 MOBILE COMPACT CARDS LIST (Hiển thị ngắn gọn gọn gàng trên Điện thoại) */}
      <div
        className="mobile-only-cards"
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "10px",
          maxHeight: "70vh",
          overflowY: "auto",
        }}
      >
        {filteredMembers.map((member) => {
          const st = STATUS_LABELS[member.status] ?? STATUS_LABELS.INACTIVE;
          return (
            <Link
              key={member.id}
              href={`/members/${member.id}`}
              style={{ textDecoration: "none" }}
            >
              <div
                className="glass-card animate-fade-in hover-card"
                style={{
                  padding: "14px 16px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "12px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "12px", minWidth: 0, flex: 1 }}>
                  {member.user.image ? (
                    <img
                      src={member.user.image}
                      alt=""
                      style={{ width: 40, height: 40, borderRadius: "50%", border: "2px solid var(--border)", objectFit: "cover", flexShrink: 0 }}
                    />
                  ) : (
                    <div
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: "50%",
                        background: "var(--gradient-primary)",
                        color: "white",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "15px",
                        fontWeight: 800,
                        flexShrink: 0,
                      }}
                    >
                      {member.user.name?.[0]?.toUpperCase() ?? "?"}
                    </div>
                  )}

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, color: "var(--card-foreground)", fontSize: "0.92rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {member.user.name}
                    </div>
                    <div style={{ fontSize: "0.75rem", color: "var(--muted-foreground)", marginTop: "2px" }}>
                      <span style={{ color: "var(--primary)", fontWeight: 700 }}>{member.code}</span>
                      {member.jerseyNumber && ` · #${member.jerseyNumber}`}
                      {member.position && ` · ${POSITION_LABELS[member.position]}`}
                    </div>
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
                  <span
                    style={{
                      padding: "2px 8px",
                      borderRadius: "999px",
                      fontSize: "0.68rem",
                      fontWeight: 600,
                      color: st.color,
                      background: st.bg,
                    }}
                  >
                    {st.label}
                  </span>
                  <ChevronRight size={18} style={{ color: "var(--muted-foreground)", opacity: 0.6 }} />
                </div>
              </div>
            </Link>
          );
        })}

        {filteredMembers.length === 0 && (
          <div
            className="glass-card"
            style={{
              padding: "40px 16px",
              textAlign: "center",
              color: "var(--muted-foreground)",
            }}
          >
            <Users size={40} style={{ margin: "0 auto 12px", opacity: 0.3 }} />
            <div style={{ fontWeight: 600, fontSize: "0.88rem" }}>Không tìm thấy thành viên nào</div>
          </div>
        )}
      </div>
    </div>
  );
}
