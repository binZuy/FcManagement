import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Mail, Phone, Hash, CheckCircle } from "lucide-react";
import { RecordStatus } from "@prisma/client";
import { UnpaidSection } from "@/components/UnpaidSection";

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
            include: { match: true },
          },
          sepayTx: true,
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!member) notFound();

  // Tách biệt record chưa đóng (bao gồm cả đóng 1 phần) và đã đóng xong
  const unpaidRecords = member.paymentRecords.filter(
    (r) => r.status !== RecordStatus.WAIVED && (r.amountRequired - r.amountPaid) > 0
  );
  const paidRecords = member.paymentRecords
    .filter(
      (r) => r.status === RecordStatus.WAIVED || (r.amountRequired - r.amountPaid) <= 0
    )
    .slice(0, 20);

  const totalPaidCount = member.paymentRecords.filter(
    (r) => (r.amountRequired - r.amountPaid) <= 0
  ).length;
  const totalPaidAmount = member.paymentRecords
    .filter((r) => r.status === RecordStatus.PAID)
    .reduce((sum, r) => sum + r.amountPaid, 0);
  const totalDebtAmount = unpaidRecords.reduce(
    (sum, r) => sum + (r.amountRequired - r.amountPaid),
    0
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "28px" }}>
      {/* Back button */}
      <Link
        href="/payments"
        className="btn btn-secondary"
        style={{ alignSelf: "flex-start" }}
      >
        <ArrowLeft size={16} />
        Quay lại danh sách
      </Link>

      {/* Member Profile Card */}
      <div className="glass-card" style={{ padding: "28px" }}>
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: "24px",
            flexWrap: "wrap",
          }}
        >
          {member.user.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={member.user.image}
              alt={member.user.name ?? ""}
              style={{
                width: 72,
                height: 72,
                borderRadius: "50%",
                border: `3px solid ${totalDebtAmount > 0 ? "#fb923c" : "#4ade80"}`,
                objectFit: "cover",
              }}
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
                border: `3px solid ${totalDebtAmount > 0 ? "#fb923c" : "#4ade80"}`,
              }}
            >
              {member.user.name?.[0]?.toUpperCase() ?? "?"}
            </div>
          )}
          <div style={{ flex: 1 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                flexWrap: "wrap",
                marginBottom: "6px",
              }}
            >
              <h1
                style={{
                  fontSize: "1.35rem",
                  fontWeight: 800,
                  color: "var(--card-foreground)",
                }}
              >
                {member.user.name}
              </h1>
              {member.jerseyNumber && (
                <span
                  style={{
                    padding: "2px 10px",
                    background: "rgba(34,197,94,0.15)",
                    color: "var(--primary)",
                    borderRadius: "999px",
                    fontSize: "0.8rem",
                    fontWeight: 700,
                  }}
                >
                  #{member.jerseyNumber}
                </span>
              )}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  color: "var(--muted-foreground)",
                  fontSize: "0.82rem",
                }}
              >
                <Mail size={13} />
                {member.user.email}
              </div>
              {member.user.phone && (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    color: "var(--muted-foreground)",
                    fontSize: "0.82rem",
                  }}
                >
                  <Phone size={13} />
                  {member.user.phone}
                </div>
              )}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  color: "var(--muted-foreground)",
                  fontSize: "0.82rem",
                }}
              >
                <Hash size={13} />
                Mã chuyển khoản:{" "}
                <strong style={{ color: "var(--primary)" }}>
                  {process.env.NEXT_PUBLIC_TRANSFER_PREFIX ?? "FCKX"} {member.code}
                </strong>
              </div>
            </div>
          </div>
        </div>

        {/* Member Payments Quick Stats */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
            gap: "12px",
            marginTop: "24px",
            paddingTop: "24px",
            borderTop: "1px solid var(--border)",
          }}
        >
          {[
            { label: "Tổng số trận", value: member.paymentRecords.length },
            { label: "Đã đóng hoàn thành", value: `${totalPaidCount} trận` },
            {
              label: "Tổng số tiền đã đóng",
              value: formatCurrency(totalPaidAmount),
            },
            {
              label: "Cần thanh toán hiện tại",
              value: formatCurrency(totalDebtAmount),
              color: totalDebtAmount > 0 ? "#f87171" : "#4ade80",
            },
          ].map((stat, i) => (
            <div key={i} style={{ textAlign: "center" }}>
              <div
                style={{
                  fontSize: "1.15rem",
                  fontWeight: 800,
                  color: stat.color ?? "var(--card-foreground)",
                }}
              >
                {stat.value}
              </div>
              <div
                style={{
                  fontSize: "0.72rem",
                  color: "var(--muted-foreground)",
                  marginTop: "2px",
                }}
              >
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </div>

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
          <span>💡 HƯỚNG DẪN NỘP TIỀN NHANH CHÓNG</span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "12px", fontSize: "0.82rem", color: "var(--card-foreground)" }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: "8px" }}>
            <span style={{ width: 22, height: 22, borderRadius: "50%", background: "rgba(34,197,94,0.2)", color: "#22c55e", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, flexShrink: 0, fontSize: "0.75rem" }}>1</span>
            <div>
              <strong>Bước 1: Chọn khoản tiền</strong>
              <div style={{ color: "var(--muted-foreground)", fontSize: "0.78rem" }}>Tick chọn các trận cần đóng ở danh sách bên dưới (hoặc bấm <i>Chọn tất cả</i>).</div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "flex-start", gap: "8px" }}>
            <span style={{ width: 22, height: 22, borderRadius: "50%", background: "rgba(34,197,94,0.2)", color: "#22c55e", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, flexShrink: 0, fontSize: "0.75rem" }}>2</span>
            <div>
              <strong>Bước 2: Tạo mã VietQR</strong>
              <div style={{ color: "var(--muted-foreground)", fontSize: "0.78rem" }}>Bấm nút <strong>"Tạo QR Chuyển khoản"</strong> để hiển thị mã quét có sẵn số tiền và cú pháp.</div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "flex-start", gap: "8px" }}>
            <span style={{ width: 22, height: 22, borderRadius: "50%", background: "rgba(34,197,94,0.2)", color: "#22c55e", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, flexShrink: 0, fontSize: "0.75rem" }}>3</span>
            <div>
              <strong>Bước 3: Quét mã & Chuyển khoản</strong>
              <div style={{ color: "var(--muted-foreground)", fontSize: "0.78rem" }}>Dùng App ngân hàng quét mã QR. Hệ thống tự động nhận tiền và gạch nợ ngay lập tức!</div>
            </div>
          </div>
        </div>
      </div>

      {/* UnpaidSection Component với QR Dialog — Full Width */}
      <UnpaidSection
        memberId={member.id}
        memberCode={member.code}
        memberName={member.user.name ?? "Thành viên"}
        unpaidRecords={unpaidRecords.map((r) => ({
          id: r.id,
          amountRequired: r.amountRequired,
          amountPaid: r.amountPaid,
          status: r.status,
          note: r.note,
          session: {
            title: r.session.title,
            code: r.session.code,
            dueDate: r.session.dueDate,
          },
        }))}
        isAdmin={isAdmin}
      />
    </div>
  );
}
