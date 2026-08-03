import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { RecordStatus, MatchStatus, PaymentStatus } from "@prisma/client";
import Link from "next/link";
import {
  Users,
  CalendarDays,
  Wallet,
  TrendingUp,
  Clock,
  CheckCircle,
  AlertCircle,
} from "lucide-react";

async function getDashboardStats() {
  const [
    totalMembers,
    activeMembers,
    openPaymentSessions,
    recentTransactions,
    pendingRecords,
  ] = await Promise.all([
    prisma.member.count(),
    prisma.member.count({ where: { status: "ACTIVE" } }),
    prisma.paymentSession.findMany({
      where: { status: PaymentStatus.OPEN },
      include: {
        _count: { select: { paymentRecords: true } },
        paymentRecords: {
          select: { status: true, amountRequired: true, amountPaid: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    prisma.sepayTransaction.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    prisma.paymentRecord.findMany({
      where: { status: RecordStatus.PENDING },
      include: {
        member: { include: { user: { select: { name: true } } } },
        session: { select: { title: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
  ]);

  return { totalMembers, activeMembers, openPaymentSessions, recentTransactions, pendingRecords };
}

export default async function DashboardPage() {
  const stats = await getDashboardStats();

  const totalOwed = stats.openPaymentSessions.reduce(
    (sum, s) => sum + s.paymentRecords.reduce((r, p) => r + p.amountRequired, 0),
    0
  );
  const totalCollected = stats.openPaymentSessions.reduce(
    (sum, s) =>
      sum +
      s.paymentRecords
        .filter((p) => p.status === RecordStatus.PAID)
        .reduce((r, p) => r + p.amountPaid, 0),
    0
  );

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
          Tổng quan hoạt động đội bóng
        </p>
      </div>

      {/* Stats grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "16px",
        }}
      >
        {[
          {
            label: "Thành viên Active",
            value: stats.activeMembers,
            sub: `/ ${stats.totalMembers} tổng`,
            icon: Users,
            color: "#22c55e",
            href: "/members",
          },
          {
            label: "Tổng đã thu",
            value: formatCurrency(totalCollected),
            sub: "Các phiên đang mở",
            icon: CheckCircle,
            color: "#4ade80",
            href: "/payments",
          },
          {
            label: "Còn cần thu",
            value: formatCurrency(totalOwed - totalCollected),
            sub: "Chưa đóng tiền",
            icon: AlertCircle,
            color: "#facc15",
            href: "/payments",
          },
          {
            label: "Phiên đang mở",
            value: stats.openPaymentSessions.length,
            sub: "phiên thu tiền",
            icon: Wallet,
            color: "#a78bfa",
            href: "/payments",
          },
        ].map((stat, i) => (
          <Link key={i} href={stat.href} style={{ textDecoration: "none" }}>
            <div
              className="stat-card animate-fade-in"
              style={{ animationDelay: `${i * 0.05}s` }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  marginBottom: "12px",
                }}
              >
                <div
                  style={{
                    width: "44px",
                    height: "44px",
                    borderRadius: "12px",
                    background: `${stat.color}20`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <stat.icon size={22} color={stat.color} />
                </div>
              </div>
              <div
                style={{
                  fontSize: "1.5rem",
                  fontWeight: 800,
                  color: "var(--card-foreground)",
                  marginBottom: "4px",
                }}
              >
                {stat.value}
              </div>
              <div style={{ fontSize: "0.8rem", color: "var(--muted-foreground)" }}>
                {stat.label}
              </div>
              <div style={{ fontSize: "0.75rem", color: stat.color, marginTop: "2px" }}>
                {stat.sub}
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Payment sessions progress */}
      {stats.openPaymentSessions.length > 0 && (
        <div className="glass-card" style={{ padding: "24px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              marginBottom: "20px",
            }}
          >
            <TrendingUp size={20} color="var(--primary)" />
            <h2
              style={{
                fontSize: "1rem",
                fontWeight: 700,
                color: "var(--card-foreground)",
              }}
            >
              Phiên thu tiền đang mở
            </h2>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {stats.openPaymentSessions.map((session) => {
              const total = session.paymentRecords.length;
              const paid = session.paymentRecords.filter(
                (r) => r.status === RecordStatus.PAID
              ).length;
              const pct = total > 0 ? Math.round((paid / total) * 100) : 0;
              const totalAmount = session.paymentRecords.reduce(
                (s, r) => s + r.amountRequired,
                0
              );
              const paidAmount = session.paymentRecords
                .filter((r) => r.status === RecordStatus.PAID)
                .reduce((s, r) => s + r.amountPaid, 0);

              return (
                <Link
                  key={session.id}
                  href={`/payments/${session.id}`}
                  style={{ textDecoration: "none" }}
                >
                  <div
                    className="payment-session-card"
                    style={{
                      padding: "16px",
                      borderRadius: "10px",
                      background: "rgba(30, 41, 59, 0.5)",
                      border: "1px solid var(--border)",
                      transition: "border-color 0.2s",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        marginBottom: "8px",
                      }}
                    >
                      <span
                        style={{
                          fontSize: "0.875rem",
                          fontWeight: 600,
                          color: "var(--card-foreground)",
                        }}
                      >
                        {session.title}
                      </span>
                      <span
                        style={{ fontSize: "0.8rem", color: "var(--primary)" }}
                      >
                        {paid}/{total} người đã đóng
                      </span>
                    </div>
                    <div className="progress-bar">
                      <div
                        className="progress-fill"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        marginTop: "6px",
                        fontSize: "0.75rem",
                        color: "var(--muted-foreground)",
                      }}
                    >
                      <span>{pct}% hoàn thành</span>
                      <span>
                        {formatCurrency(paidAmount)} / {formatCurrency(totalAmount)}
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Recent SePay transactions */}
      {stats.recentTransactions.length > 0 && (
        <div className="glass-card" style={{ padding: "24px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              marginBottom: "20px",
            }}
          >
            <Clock size={20} color="var(--primary)" />
            <h2
              style={{
                fontSize: "1rem",
                fontWeight: 700,
                color: "var(--card-foreground)",
              }}
            >
              Giao dịch SePay gần nhất
            </h2>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {stats.recentTransactions.map((tx) => (
              <div
                key={tx.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  padding: "12px 14px",
                  borderRadius: "8px",
                  background: "rgba(30, 41, 59, 0.4)",
                }}
              >
                <div
                  className="pulse-dot"
                  style={{
                    width: "8px",
                    height: "8px",
                    borderRadius: "50%",
                    background: tx.isMatched ? "var(--primary)" : "#facc15",
                    flexShrink: 0,
                  }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: "0.8rem",
                      color: "var(--card-foreground)",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {tx.content ?? "Không có nội dung"}
                  </div>
                  <div
                    style={{ fontSize: "0.7rem", color: "var(--muted-foreground)" }}
                  >
                    {formatDateTime(tx.transactionDate)} · {tx.gateway}
                  </div>
                </div>
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  <div
                    style={{
                      fontSize: "0.875rem",
                      fontWeight: 700,
                      color: "#4ade80",
                    }}
                  >
                    +{formatCurrency(tx.transferAmount)}
                  </div>
                  <div
                    style={{
                      fontSize: "0.7rem",
                      color: tx.isMatched ? "var(--primary)" : "#facc15",
                    }}
                  >
                    {tx.isMatched ? "Đã khớp" : "Chưa khớp"}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pending payments */}
      {stats.pendingRecords.length > 0 && (
        <div className="glass-card" style={{ padding: "24px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              marginBottom: "20px",
            }}
          >
            <AlertCircle size={20} color="#facc15" />
            <h2
              style={{
                fontSize: "1rem",
                fontWeight: 700,
                color: "var(--card-foreground)",
              }}
            >
              Thành viên chưa đóng tiền
            </h2>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            {stats.pendingRecords.map((record) => (
              <div
                key={record.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  padding: "10px 14px",
                  borderRadius: "8px",
                  background: "rgba(30, 41, 59, 0.4)",
                }}
              >
                <div
                  style={{
                    width: "32px",
                    height: "32px",
                    borderRadius: "50%",
                    background: "rgba(250, 204, 21, 0.15)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "0.8rem",
                    fontWeight: 700,
                    color: "#facc15",
                    flexShrink: 0,
                  }}
                >
                  {record.member.user.name?.[0]?.toUpperCase() ?? "?"}
                </div>
                <div style={{ flex: 1 }}>
                  <div
                    style={{ fontSize: "0.85rem", color: "var(--card-foreground)" }}
                  >
                    {record.member.user.name}
                  </div>
                  <div
                    style={{ fontSize: "0.75rem", color: "var(--muted-foreground)" }}
                  >
                    {record.session.title}
                  </div>
                </div>
                <div
                  style={{
                    fontSize: "0.875rem",
                    fontWeight: 700,
                    color: "#facc15",
                  }}
                >
                  {formatCurrency(record.amountRequired)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
