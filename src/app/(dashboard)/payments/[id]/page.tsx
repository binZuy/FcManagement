import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/utils";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Mail, Phone, Hash, Calendar, AlertCircle, CheckCircle } from "lucide-react";
import { MarkPaidButton } from "@/components/MarkPaidButton";
import { RecordStatus } from "@prisma/client";

const RECORD_STATUS: Record<string, { label: string; cls: string; color: string }> = {
  PENDING: { label: "Chưa đóng", cls: "badge-pending", color: "#facc15" },
  PAID: { label: "Đã đóng", cls: "badge-paid", color: "#4ade80" },
  OVERDUE: { label: "Quá hạn", cls: "badge-overdue", color: "#f87171" },
  WAIVED: { label: "Miễn", cls: "badge-waived", color: "#94a3b8" },
};

type Params = { params: Promise<{ id: string }> };

export default async function MemberPaymentDetailPage({ params }: Params) {
  const { id } = await params;
  const session = await auth();
  const isAdmin = session?.user?.role === "ADMIN";

  const member = await prisma.member.findUnique({
    where: { id },
    include: {
      user: { select: { name: true, email: true, image: true, phone: true } },
      paymentRecords: {
        include: { 
          session: {
            include: { match: true }
          },
          sepayTx: true 
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!member) notFound();

  // Tách biệt record chưa đóng và đã đóng
  const unpaidRecords = member.paymentRecords.filter(
    (r) => r.status !== RecordStatus.PAID && r.status !== RecordStatus.WAIVED
  );
  const paidRecords = member.paymentRecords.filter(
    (r) => r.status === RecordStatus.PAID || r.status === RecordStatus.WAIVED
  ).slice(0, 20); // 20 giao dịch gần nhất làm lịch sử

  const totalPaidCount = member.paymentRecords.filter((r) => r.status === RecordStatus.PAID).length;
  const totalPaidAmount = member.paymentRecords
    .filter((r) => r.status === RecordStatus.PAID)
    .reduce((sum, r) => sum + r.amountPaid, 0);
  const totalDebtAmount = unpaidRecords.reduce((sum, r) => sum + (r.amountRequired - r.amountPaid), 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "28px" }}>
      {/* Back button */}
      <Link href="/payments" className="btn btn-secondary" style={{ alignSelf: "flex-start" }}>
        <ArrowLeft size={16} />
        Quay lại danh sách
      </Link>

      {/* Member Profile Card */}
      <div className="glass-card" style={{ padding: "28px" }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: "24px", flexWrap: "wrap" }}>
          {member.user.image ? (
            <img
              src={member.user.image}
              alt={member.user.name ?? ""}
              style={{ width: 72, height: 72, borderRadius: "50%", border: `3px solid ${totalDebtAmount > 0 ? "#fb923c" : "#4ade80"}`, objectFit: "cover" }}
            />
          ) : (
            <div
              style={{
                width: 72,
                height: 72,
                borderRadius: "50%",
                background: "var(--gradient-primary)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "1.75rem",
                fontWeight: 800,
                color: "white",
                flexShrink: 0,
                border: `3px solid ${totalDebtAmount > 0 ? "#fb923c" : "#4ade80"}`
              }}
            >
              {member.user.name?.[0]?.toUpperCase() ?? "?"}
            </div>
          )}
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap", marginBottom: "6px" }}>
              <h1 style={{ fontSize: "1.35rem", fontWeight: 800, color: "var(--card-foreground)" }}>
                {member.user.name}
              </h1>
              {member.jerseyNumber && (
                <span style={{ padding: "2px 10px", background: "rgba(34,197,94,0.15)", color: "var(--primary)", borderRadius: "999px", fontSize: "0.8rem", fontWeight: 700 }}>
                  #{member.jerseyNumber}
                </span>
              )}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "var(--muted-foreground)", fontSize: "0.82rem" }}>
                <Mail size={13} />
                {member.user.email}
              </div>
              {member.user.phone && (
                <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "var(--muted-foreground)", fontSize: "0.82rem" }}>
                  <Phone size={13} />
                  {member.user.phone}
                </div>
              )}
              <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "var(--muted-foreground)", fontSize: "0.82rem" }}>
                <Hash size={13} />
                Cú pháp chuyển khoản: <strong style={{ color: "var(--primary)" }}>FCM {member.code}</strong>
              </div>
            </div>
          </div>
        </div>

        {/* Member Payments Quick Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: "12px", marginTop: "24px", paddingTop: "24px", borderTop: "1px solid var(--border)" }}>
          {[
            { label: "Tổng số phiên", value: member.paymentRecords.length },
            { label: "Đã đóng hoàn thành", value: `${totalPaidCount} phiên` },
            { label: "Tổng số tiền đã đóng", value: formatCurrency(totalPaidAmount) },
            { label: "Nợ cần thu hiện tại", value: formatCurrency(totalDebtAmount), color: totalDebtAmount > 0 ? "#f87171" : "#4ade80" },
          ].map((stat, i) => (
            <div key={i} style={{ textAlign: "center" }}>
              <div style={{ fontSize: "1.15rem", fontWeight: 800, color: stat.color ?? "var(--card-foreground)" }}>{stat.value}</div>
              <div style={{ fontSize: "0.72rem", color: "var(--muted-foreground)", marginTop: "2px" }}>{stat.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Grid details */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(400px, 1fr))", gap: "24px" }}>
        
        {/* Column 1: Unpaid list */}
        <div className="glass-card" style={{ padding: "24px", border: totalDebtAmount > 0 ? "1px solid rgba(248,113,113,0.25)" : "1px solid var(--border)" }}>
          <h2 style={{ fontSize: "1.05rem", fontWeight: 700, marginBottom: "16px", color: totalDebtAmount > 0 ? "#f87171" : "var(--card-foreground)", display: "flex", alignItems: "center", gap: "8px" }}>
            <AlertCircle size={18} /> Các trận/khoản chưa đóng ({unpaidRecords.length})
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {unpaidRecords.length === 0 && (
              <div style={{ textAlign: "center", padding: "36px 0", color: "#4ade80" }}>
                <CheckCircle size={32} style={{ margin: "0 auto 12px", opacity: 0.8, display: "block" }} />
                <span style={{ fontWeight: 600, fontSize: "0.9rem" }}>Thành viên này đã đóng đủ mọi khoản!</span>
              </div>
            )}
            {unpaidRecords.map((r) => {
              const cfg = RECORD_STATUS[r.status] ?? { label: r.status, color: "white" };
              const outstanding = r.amountRequired - r.amountPaid;
              return (
                <div key={r.id} style={{ display: "flex", alignItems: "center", gap: "12px", padding: "12px", borderRadius: "10px", background: "rgba(239,68,68,0.04)", border: "1px solid rgba(239,68,68,0.08)" }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--card-foreground)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {r.session.title}
                    </div>
                    <div style={{ fontSize: "0.75rem", color: "var(--muted-foreground)", marginTop: "4px", display: "flex", gap: "8px", flexWrap: "wrap" }}>
                      <span style={{ color: cfg.color, fontWeight: 600 }}>{cfg.label}</span>
                      <span>•</span>
                      <span>Yêu cầu: {formatCurrency(r.amountRequired)}</span>
                      {r.session.dueDate && (
                        <>
                          <span>•</span>
                          <span>Hạn: {formatDate(r.session.dueDate)}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div style={{ textAlign: "right", flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "6px" }}>
                    <div style={{ fontSize: "0.9rem", fontWeight: 800, color: "#f87171" }}>
                      {formatCurrency(outstanding)}
                    </div>
                    {isAdmin && (
                      <MarkPaidButton recordId={r.id} amountRequired={r.amountRequired} />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Column 2: Paid History list */}
        <div className="glass-card" style={{ padding: "24px" }}>
          <h2 style={{ fontSize: "1.05rem", fontWeight: 700, marginBottom: "16px", color: "var(--card-foreground)", display: "flex", alignItems: "center", gap: "8px" }}>
            <CheckCircle size={18} color="#4ade80" /> Lịch sử đã thanh toán (Gần nhất)
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {paidRecords.length === 0 && (
              <p style={{ color: "var(--muted-foreground)", fontSize: "0.85rem", textAlign: "center", padding: "36px 0" }}>
                Chưa có lịch sử thanh toán
              </p>
            )}
            {paidRecords.map((r) => {
              const cfg = RECORD_STATUS[r.status] ?? { label: r.status, cls: "" };
              return (
                <div key={r.id} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "10px 12px", borderRadius: "8px", background: "rgba(30,41,59,0.3)" }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--card-foreground)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {r.session.title}
                    </div>
                    <div style={{ fontSize: "0.7rem", color: "var(--muted-foreground)", marginTop: "2px" }}>
                      {r.paidAt ? formatDateTime(r.paidAt) : "Đã hoàn thành"}
                      {r.paymentMethod && (
                        <span> · {r.paymentMethod === "BANK_TRANSFER" ? "Chuyển khoản" : "Tiền mặt"}</span>
                      )}
                    </div>
                  </div>
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <div style={{ fontSize: "0.82rem", fontWeight: 700, color: "#4ade80" }}>
                      {formatCurrency(r.amountPaid)}
                    </div>
                    <span className={cfg.cls} style={{ display: "inline-block", marginTop: "3px", padding: "1px 6px", borderRadius: "999px", fontSize: "0.62rem", fontWeight: 600 }}>
                      {cfg.label}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
}
