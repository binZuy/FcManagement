import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { formatCurrency, formatDate } from "@/lib/utils";
import Link from "next/link";
import { Wallet, Plus } from "lucide-react";
import { RecordStatus } from "@prisma/client";

export default async function PaymentsPage() {
  const sessions = await prisma.paymentSession.findMany({
    include: {
      match: { select: { title: true, matchDate: true } },
      paymentRecords: {
        select: { status: true, amountRequired: true, amountPaid: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "28px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "16px" }}>
        <div>
          <h1 style={{ fontSize: "1.75rem", fontWeight: 800, color: "var(--card-foreground)", marginBottom: "4px" }}>
            Quản lý Thu tiền
          </h1>
          <p style={{ color: "var(--muted-foreground)", fontSize: "0.9rem" }}>
            {sessions.filter((s) => s.status === "OPEN").length} phiên đang mở
          </p>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        {sessions.length === 0 && (
          <div className="glass-card" style={{ padding: "60px 24px", textAlign: "center" }}>
            <Wallet size={48} style={{ margin: "0 auto 16px", opacity: 0.3, display: "block" }} />
            <div style={{ fontWeight: 600, color: "var(--muted-foreground)" }}>Chưa có phiên thu tiền nào</div>
            <p style={{ color: "var(--muted-foreground)", fontSize: "0.85rem", marginTop: "8px" }}>
              Phiên thu tiền được tạo tự động sau khi nhập kết quả trận
            </p>
          </div>
        )}
        {sessions.map((session) => {
          const total = session.paymentRecords.length;
          const paid = session.paymentRecords.filter((r) => r.status === RecordStatus.PAID).length;
          const pct = total > 0 ? Math.round((paid / total) * 100) : 0;
          const totalAmount = session.paymentRecords.reduce((s, r) => s + r.amountRequired, 0);
          const paidAmount = session.paymentRecords.filter((r) => r.status === RecordStatus.PAID).reduce((s, r) => s + r.amountPaid, 0);
          const isOpen = session.status === "OPEN";

          return (
            <Link key={session.id} href={`/payments/${session.id}`} style={{ textDecoration: "none" }}>
              <div
                className="glass-card animate-fade-in hover-card"
                style={{ padding: "20px 24px", transition: "border-color 0.2s" }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px", flexWrap: "wrap", gap: "8px" }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap", marginBottom: "4px" }}>
                      <span style={{ fontWeight: 700, fontSize: "1rem", color: "var(--card-foreground)" }}>
                        {session.title}
                      </span>
                      <span style={{
                        padding: "3px 10px",
                        borderRadius: "999px",
                        fontSize: "0.72rem",
                        fontWeight: 600,
                        color: isOpen ? "#4ade80" : "#94a3b8",
                        background: isOpen ? "rgba(34,197,94,0.12)" : "rgba(148,163,184,0.12)",
                      }}>
                        {isOpen ? "Đang mở" : "Đã đóng"}
                      </span>
                      <span style={{ padding: "3px 10px", borderRadius: "999px", fontSize: "0.72rem", color: "var(--muted-foreground)", background: "rgba(30,41,59,0.8)" }}>
                        {session.type === "MATCH_FEE" ? "Tiền sân" : session.type === "MONTHLY_FUND" ? "Quỹ tháng" : "Khác"}
                      </span>
                    </div>
                    {session.match && (
                      <div style={{ fontSize: "0.8rem", color: "var(--muted-foreground)" }}>
                        Trận: {session.match.title} · {formatDate(session.match.matchDate)}
                      </div>
                    )}
                    {session.dueDate && (
                      <div style={{ fontSize: "0.8rem", color: "var(--muted-foreground)" }}>
                        Hạn: {formatDate(session.dueDate)}
                      </div>
                    )}
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: "1.1rem", fontWeight: 800, color: "#4ade80" }}>
                      {formatCurrency(paidAmount)}
                    </div>
                    <div style={{ fontSize: "0.75rem", color: "var(--muted-foreground)" }}>
                      / {formatCurrency(totalAmount)}
                    </div>
                  </div>
                </div>

                <div className="progress-bar">
                  <div className="progress-fill" style={{ width: `${pct}%` }} />
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: "8px", fontSize: "0.78rem", color: "var(--muted-foreground)" }}>
                  <span>{paid}/{total} thành viên đã đóng</span>
                  <span style={{ color: pct === 100 ? "var(--primary)" : "var(--muted-foreground)" }}>
                    {pct}%
                  </span>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
