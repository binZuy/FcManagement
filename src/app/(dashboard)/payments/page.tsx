import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { formatCurrency } from "@/lib/utils";
import Link from "next/link";
import { Wallet, Users, CheckCircle, AlertCircle, ChevronRight } from "lucide-react";
import { RecordStatus } from "@prisma/client";

export default async function PaymentsPage() {
  const session = await auth();
  const isAdmin = session?.user?.role === "ADMIN";

  const members = await prisma.member.findMany({
    include: {
      user: { select: { name: true, email: true, image: true } },
      paymentRecords: {
        where: {
          status: { in: [RecordStatus.PENDING, RecordStatus.OVERDUE] },
        },
        select: { status: true, amountRequired: true, amountPaid: true },
      },
    },
  });

  const memberStats = members.map((m) => {
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

  // Chỉ lọc lấy những thành viên có khoản cần thu (debt > 0)
  const debtMembers = memberStats
    .filter((m) => m.debt > 0)
    .sort((a, b) => b.debt - a.debt);

  const totalOwed = memberStats.reduce((sum, m) => sum + m.debt, 0);
  const membersWithDebt = debtMembers.length;
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
            Danh sách thành viên đang có khoản phí cần thanh toán
          </p>
        </div>
      </div>

      {/* Overview Stats Cards (Chỉ Admin mới hiển thị tổng quan tài chính) */}
      {isAdmin && (
        <div className="stats-grid">
          <div className="stat-card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
              <span style={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--muted-foreground)" }}>[Admin] Tổng nợ</span>
              <div style={{ width: 34, height: 34, borderRadius: 8, background: "rgba(239, 68, 68, 0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Wallet size={18} color="#f87171" />
              </div>
            </div>
            <div className="stat-card-value" style={{ background: "linear-gradient(135deg, #f87171 30%, #dc2626 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              {formatCurrency(totalOwed)}
            </div>
            <div style={{ fontSize: "0.72rem", color: "#f87171", marginTop: "4px" }}>
              Tổng tiền cần thu
            </div>
          </div>

          <div className="stat-card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
              <span style={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--muted-foreground)" }}>Cần thu tiền</span>
              <div style={{ width: 34, height: 34, borderRadius: 8, background: "rgba(250, 204, 21, 0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <AlertCircle size={18} color="#facc15" />
              </div>
            </div>
            <div className="stat-card-value" style={{ background: "linear-gradient(135deg, #fef08a 30%, #eab308 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              {membersWithDebt}
            </div>
            <div style={{ fontSize: "0.72rem", color: "#facc15", marginTop: "4px" }}>
              Thành viên chưa đóng đủ
            </div>
          </div>

          <div className="stat-card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
              <span style={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--muted-foreground)" }}>Hoàn thành (Done)</span>
              <div style={{ width: 34, height: 34, borderRadius: 8, background: "rgba(34, 197, 94, 0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <CheckCircle size={18} color="#4ade80" />
              </div>
            </div>
            <div className="stat-card-value" style={{ background: "linear-gradient(135deg, #4ade80 30%, #16a34a 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              {doneMembers}
            </div>
            <div style={{ fontSize: "0.72rem", color: "#4ade80", marginTop: "4px" }}>
              Thành viên không còn nợ
            </div>
          </div>
        </div>
      )}

      {/* Hướng dẫn nộp tiền ngắn gọn */}
      <div
        style={{
          padding: "16px 20px",
          borderRadius: "14px",
          background: "linear-gradient(135deg, rgba(34,197,94,0.08), rgba(15,23,42,0.6))",
          border: "1px solid rgba(34,197,94,0.25)",
          display: "flex",
          flexDirection: "column",
          gap: "10px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px", fontWeight: 800, color: "#4ade80", fontSize: "0.9rem" }}>
          <span>💡 HƯỚNG DẪN NỘP TIỀN NHANH CHÓNG CHO THÀNH VIÊN</span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "12px", fontSize: "0.82rem", color: "var(--card-foreground)" }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: "8px" }}>
            <span style={{ width: 22, height: 22, borderRadius: "50%", background: "rgba(34,197,94,0.2)", color: "#22c55e", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, flexShrink: 0, fontSize: "0.75rem" }}>1</span>
            <div>
              <strong>Bước 1: Tìm tên mình</strong>
              <div style={{ color: "var(--muted-foreground)", fontSize: "0.78rem" }}>Bấm chọn tên bạn trong danh sách bên dưới để xem chi tiết khoản nợ.</div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "flex-start", gap: "8px" }}>
            <span style={{ width: 22, height: 22, borderRadius: "50%", background: "rgba(34,197,94,0.2)", color: "#22c55e", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, flexShrink: 0, fontSize: "0.75rem" }}>2</span>
            <div>
              <strong>Bước 2: Tạo mã VietQR</strong>
              <div style={{ color: "var(--muted-foreground)", fontSize: "0.78rem" }}>Tick chọn các trận cần đóng và bấm <strong>"Tạo QR Chuyển khoản"</strong>.</div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "flex-start", gap: "8px" }}>
            <span style={{ width: 22, height: 22, borderRadius: "50%", background: "rgba(34,197,94,0.2)", color: "#22c55e", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, flexShrink: 0, fontSize: "0.75rem" }}>3</span>
            <div>
              <strong>Bước 3: Quét QR thanh toán</strong>
              <div style={{ color: "var(--muted-foreground)", fontSize: "0.78rem" }}>Mở App ngân hàng quét mã QR. Hệ thống tự động gạch nợ ngay khi nhận tiền!</div>
            </div>
          </div>
        </div>
      </div>

      {/* Members List (Chỉ hiển thị thành viên nợ tiền) */}
      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        {debtMembers.length === 0 && (
          <div className="glass-card" style={{ padding: "60px 24px", textAlign: "center" }}>
            <CheckCircle size={48} style={{ margin: "0 auto 16px", color: "#4ade80", opacity: 0.8, display: "block" }} />
            <div style={{ fontWeight: 700, fontSize: "1.1rem", color: "var(--card-foreground)", marginBottom: "4px" }}>
              Tất cả thành viên đã hoàn thành đóng phí!
            </div>
            <div style={{ fontSize: "0.85rem", color: "var(--muted-foreground)" }}>
              Không có khoản nợ nào cần thu tại thời điểm hiện tại.
            </div>
          </div>
        )}
        {debtMembers.map((member) => {
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
                          {hasDebt ? "Chưa đóng" : "Đã xong"}
                        </span>
                      </div>
                      <div style={{ fontSize: "0.78rem", color: "var(--muted-foreground)", marginTop: "4px" }}>
                        Mã CK: <strong style={{ color: "var(--primary)" }}>{process.env.NEXT_PUBLIC_TRANSFER_PREFIX ?? "FCKX"} {member.code}</strong>
                        {hasDebt && ` · Chưa đóng ${member.unpaidCount} trận`}
                      </div>
                    </div>
                  </div>
                  
                  <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: "1.15rem", fontWeight: 800, color: hasDebt ? "#f87171" : "#4ade80" }}>
                        {hasDebt ? formatCurrency(member.debt) : "Đã hoàn thành"}
                      </div>
                      <div style={{ fontSize: "0.72rem", color: "var(--muted-foreground)", marginTop: "2px" }}>
                        {hasDebt ? "Cần thanh toán" : "Đã đóng đủ"}
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
