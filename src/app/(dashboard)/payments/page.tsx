import { prisma } from "@/lib/prisma";
import { formatCurrency } from "@/lib/utils";
import Link from "next/link";
import { Wallet, Users, CheckCircle, AlertCircle, ChevronRight } from "lucide-react";
import { RecordStatus } from "@prisma/client";

export default async function PaymentsPage() {
  const members = await prisma.member.findMany({
    include: {
      user: { select: { name: true, email: true, image: true } },
      paymentRecords: {
        select: { status: true, amountRequired: true, amountPaid: true },
      },
    },
  });

  const memberStats = members.map((m) => {
    // Unpaid records are those that are not PAID and not WAIVED
    const unpaidRecords = m.paymentRecords.filter(
      (r) => r.status !== RecordStatus.PAID && r.status !== RecordStatus.WAIVED
    );
    const unpaidCount = unpaidRecords.length;
    const debt = unpaidRecords.reduce((sum, r) => sum + (r.amountRequired - r.amountPaid), 0);

    return {
      ...m,
      unpaidCount,
      debt,
    };
  });

  // Sắp xếp: còn nợ lên đầu (nợ nhiều hơn đứng trước), đã xong xuống cuối
  const sortedMembers = memberStats.sort((a, b) => {
    if (a.debt > 0 && b.debt > 0) {
      return b.debt - a.debt;
    }
    if (a.debt > 0 && b.debt === 0) return -1;
    if (a.debt === 0 && b.debt > 0) return 1;
    return (a.user.name ?? "").localeCompare(b.user.name ?? "");
  });

  const totalOwed = memberStats.reduce((sum, m) => sum + m.debt, 0);
  const membersWithDebt = memberStats.filter((m) => m.debt > 0).length;
  const doneMembers = memberStats.filter((m) => m.debt === 0).length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "28px" }}>
      {/* Header & Stats */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "16px" }}>
        <div>
          <h1 style={{ fontSize: "1.75rem", fontWeight: 800, color: "var(--card-foreground)", marginBottom: "4px" }}>
            Quản lý Thu tiền theo thành viên
          </h1>
          <p style={{ color: "var(--muted-foreground)", fontSize: "0.9rem" }}>
            Theo dõi chi tiết các khoản chưa đóng của từng thành viên
          </p>
        </div>
      </div>

      {/* Overview Stats Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "16px" }}>
        <div className="stat-card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
            <span style={{ fontSize: "0.85rem", color: "var(--muted-foreground)" }}>Tổng nợ chưa thu</span>
            <Wallet size={20} color="#f87171" />
          </div>
          <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "#f87171" }}>
            {formatCurrency(totalOwed)}
          </div>
          <div style={{ fontSize: "0.75rem", color: "var(--muted-foreground)", marginTop: "4px" }}>
            Từ {membersWithDebt} thành viên chưa đóng đủ
          </div>
        </div>

        <div className="stat-card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
            <span style={{ fontSize: "0.85rem", color: "var(--muted-foreground)" }}>Chưa hoàn thành</span>
            <AlertCircle size={20} color="#facc15" />
          </div>
          <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "#facc15" }}>
            {membersWithDebt}
          </div>
          <div style={{ fontSize: "0.75rem", color: "var(--muted-foreground)", marginTop: "4px" }}>
            Thành viên còn khoản nợ cần thu
          </div>
        </div>

        <div className="stat-card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
            <span style={{ fontSize: "0.85rem", color: "var(--muted-foreground)" }}>Đã đóng đủ (Done)</span>
            <CheckCircle size={20} color="#4ade80" />
          </div>
          <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "#4ade80" }}>
            {doneMembers}
          </div>
          <div style={{ fontSize: "0.75rem", color: "var(--muted-foreground)", marginTop: "4px" }}>
            Thành viên đã hoàn thành tất cả các khoản
          </div>
        </div>
      </div>

      {/* Members List */}
      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        {sortedMembers.length === 0 && (
          <div className="glass-card" style={{ padding: "60px 24px", textAlign: "center" }}>
            <Users size={48} style={{ margin: "0 auto 16px", opacity: 0.3, display: "block" }} />
            <div style={{ fontWeight: 600, color: "var(--muted-foreground)" }}>Chưa có thành viên nào</div>
          </div>
        )}
        {sortedMembers.map((member) => {
          const hasDebt = member.debt > 0;
          return (
            <Link key={member.id} href={`/payments/${member.id}`} style={{ textDecoration: "none" }}>
              <div
                className="glass-card animate-fade-in hover-card"
                style={{
                  padding: "16px 20px",
                  transition: "border-color 0.2s",
                  border: hasDebt ? "1px solid rgba(248,113,113,0.15)" : "1px solid var(--border)",
                  background: hasDebt ? "rgba(239,68,68,0.02)" : undefined
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                    {member.user.image ? (
                      <img
                        src={member.user.image}
                        alt=""
                        style={{ width: 44, height: 44, borderRadius: "50%", border: hasDebt ? "2px solid #fb923c" : "2px solid #4ade80" }}
                      />
                    ) : (
                      <div
                        style={{
                          width: 44,
                          height: 44,
                          borderRadius: "50%",
                          background: hasDebt ? "rgba(251,146,60,0.1)" : "rgba(74,222,128,0.1)",
                          color: hasDebt ? "#fb923c" : "#4ade80",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: "16px",
                          fontWeight: 700,
                          border: hasDebt ? "2px solid #fb923c" : "2px solid #4ade80"
                        }}
                      >
                        {member.user.name?.[0]?.toUpperCase()}
                      </div>
                    )}
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                        <span style={{ fontWeight: 700, fontSize: "1.05rem", color: "var(--card-foreground)" }}>
                          {member.user.name}
                        </span>
                        {member.jerseyNumber && (
                          <span style={{ fontSize: "0.75rem", color: "var(--muted-foreground)", background: "rgba(255,255,255,0.06)", padding: "1px 6px", borderRadius: "4px" }}>
                            #{member.jerseyNumber}
                          </span>
                        )}
                        <span style={{
                          padding: "2px 8px",
                          borderRadius: "999px",
                          fontSize: "0.7rem",
                          fontWeight: 600,
                          color: hasDebt ? "#fb923c" : "#4ade80",
                          background: hasDebt ? "rgba(251,146,60,0.12)" : "rgba(34,197,94,0.12)",
                        }}>
                          {hasDebt ? "Còn nợ" : "Đã xong"}
                        </span>
                      </div>
                      <div style={{ fontSize: "0.78rem", color: "var(--muted-foreground)", marginTop: "4px" }}>
                        Mã CK: <strong style={{ color: "var(--primary)" }}>FCM {member.code}</strong>
                        {hasDebt && ` · Nợ ${member.unpaidCount} trận`}
                      </div>
                    </div>
                  </div>
                  
                  <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: "1.15rem", fontWeight: 800, color: hasDebt ? "#f87171" : "#4ade80" }}>
                        {hasDebt ? formatCurrency(member.debt) : "Đã đóng đủ"}
                      </div>
                      <div style={{ fontSize: "0.72rem", color: "var(--muted-foreground)", marginTop: "2px" }}>
                        {hasDebt ? "tổng nợ" : "không nợ nần"}
                      </div>
                    </div>
                    <ChevronRight size={18} style={{ color: "var(--muted-foreground)", opacity: 0.5 }} />
                  </div>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
