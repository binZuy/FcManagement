import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { formatCurrency, formatDate } from "@/lib/utils";
import Link from "next/link";
import { Users, UserPlus, Search } from "lucide-react";

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

export default async function MembersPage() {
  const session = await auth();
  const isAdmin = session?.user?.role === "ADMIN";

  const members = await prisma.member.findMany({
    include: {
      user: { select: { name: true, email: true, image: true, phone: true } },
      _count: {
        select: {
          attendances: true,
          paymentRecords: { where: { status: "PAID" } },
        },
      },
    },
    orderBy: [{ status: "asc" }, { user: { name: "asc" } }],
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "28px" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "16px" }}>
        <div>
          <h1 style={{ fontSize: "1.75rem", fontWeight: 800, color: "var(--card-foreground)", marginBottom: "4px" }}>
            Thành viên
          </h1>
          <p style={{ color: "var(--muted-foreground)", fontSize: "0.9rem" }}>
            {members.filter((m) => m.status === "ACTIVE").length} thành viên đang hoạt động
          </p>
        </div>
        {isAdmin && (
          <div style={{ display: "flex", gap: "12px" }}>
            <Link href="/members/import" className="btn btn-secondary">
              Import CSV
            </Link>
            <Link href="/members/new" className="btn btn-primary">
              <UserPlus size={18} />
              Thêm thành viên
            </Link>
          </div>
        )}
      </div>

      {/* Members table */}
      <div className="glass-card" style={{ overflow: "hidden" }}>
        <table className="data-table">
          <thead>
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
            {members.map((member) => {
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
                          {member.user.email} · #{member.code}
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

        {members.length === 0 && (
          <div
            style={{
              padding: "60px 24px",
              textAlign: "center",
              color: "var(--muted-foreground)",
            }}
          >
            <Users size={48} style={{ margin: "0 auto 16px", opacity: 0.3 }} />
            <div style={{ fontWeight: 600 }}>Chưa có thành viên nào</div>
            {isAdmin && (
              <Link href="/members/new" className="btn btn-primary" style={{ marginTop: "16px" }}>
                <UserPlus size={16} />
                Thêm thành viên đầu tiên
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
