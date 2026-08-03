import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";
import { RecordStatus } from "@prisma/client";

const RECORD_STATUS: Record<string, { label: string; cls: string }> = {
  PENDING: { label: "Chưa đóng", cls: "badge-pending" },
  PAID: { label: "Đã đóng", cls: "badge-paid" },
  OVERDUE: { label: "Quá hạn", cls: "badge-overdue" },
  WAIVED: { label: "Miễn", cls: "badge-waived" },
};

type Params = { params: Promise<{ id: string }> };

export default async function PaymentDetailPage({ params }: Params) {
  const { id } = await params;
  const session = await prisma.paymentSession.findUnique({
    where: { id },
    include: {
      match: true,
      paymentRecords: {
        include: {
          member: { include: { user: { select: { name: true, email: true, image: true } } } },
          sepayTx: true,
        },
        orderBy: [{ status: "asc" }, { member: { user: { name: "asc" } } }],
      },
    },
  });

  if (!session) notFound();

  const total = session.paymentRecords.reduce((s, r) => s + r.amountRequired, 0);
  const paid = session.paymentRecords.filter((r) => r.status === RecordStatus.PAID).reduce((s, r) => s + r.amountPaid, 0);
  const paidCount = session.paymentRecords.filter((r) => r.status === RecordStatus.PAID).length;
  const pct = session.paymentRecords.length > 0 ? Math.round((paidCount / session.paymentRecords.length) * 100) : 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "28px" }}>
      <Link href="/payments" className="btn btn-secondary" style={{ alignSelf: "flex-start" }}>
        <ArrowLeft size={16} />
        Quay lại
      </Link>

      {/* Session header */}
      <div className="glass-card" style={{ padding: "28px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "16px", marginBottom: "24px" }}>
          <div>
            <h1 style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--card-foreground)", marginBottom: "6px" }}>
              {session.title}
            </h1>
            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
              <span style={{
                padding: "3px 10px", borderRadius: "999px", fontSize: "0.72rem", fontWeight: 600,
                color: session.status === "OPEN" ? "#4ade80" : "#94a3b8",
                background: session.status === "OPEN" ? "rgba(34,197,94,0.12)" : "rgba(148,163,184,0.12)",
              }}>
                {session.status === "OPEN" ? "Đang mở" : "Đã đóng"}
              </span>
              <span style={{ fontSize: "0.8rem", color: "var(--muted-foreground)" }}>
                Mã: <strong style={{ color: "var(--primary)" }}>{session.code}</strong>
              </span>
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "#4ade80" }}>
              {formatCurrency(paid)}
            </div>
            <div style={{ fontSize: "0.85rem", color: "var(--muted-foreground)" }}>
              đã thu / {formatCurrency(total)}
            </div>
          </div>
        </div>

        <div className="progress-bar" style={{ height: 10, marginBottom: 8 }}>
          <div className="progress-fill" style={{ width: `${pct}%` }} />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", color: "var(--muted-foreground)" }}>
          <span>{paidCount}/{session.paymentRecords.length} thành viên đã đóng</span>
          <span style={{ color: pct === 100 ? "var(--primary)" : undefined }}>{pct}%</span>
        </div>

        {/* VietQR info box */}
        <div
          style={{
            marginTop: "20px",
            padding: "14px 18px",
            borderRadius: "10px",
            background: "rgba(34,197,94,0.06)",
            border: "1px solid rgba(34,197,94,0.2)",
          }}
        >
          <div style={{ fontSize: "0.8rem", color: "var(--primary)", fontWeight: 600, marginBottom: "4px" }}>
            💡 Cú pháp chuyển khoản cho thành viên
          </div>
          <div style={{ fontFamily: "monospace", fontSize: "0.85rem", color: "var(--card-foreground)", letterSpacing: "0.05em" }}>
            FCM [MÃ_THÀNH_VIÊN] {session.code}
          </div>
          <div style={{ fontSize: "0.75rem", color: "var(--muted-foreground)", marginTop: "4px" }}>
            Ví dụ: <code style={{ color: "var(--primary)" }}>FCM NVA {session.code}</code> → Tự động xác nhận Nguyễn Văn A đã đóng tiền
          </div>
        </div>
      </div>

      {/* Payment records table */}
      <div className="glass-card" style={{ overflow: "hidden" }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Thành viên</th>
              <th>Số tiền</th>
              <th>Trạng thái</th>
              <th>Ngày đóng</th>
              <th>Nguồn</th>
            </tr>
          </thead>
          <tbody>
            {session.paymentRecords.map((record) => {
              const st = RECORD_STATUS[record.status] ?? RECORD_STATUS.PENDING;
              return (
                <tr key={record.id}>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      {record.member.user.image ? (
                        <img src={record.member.user.image} alt="" style={{ width: 32, height: 32, borderRadius: "50%" }} />
                      ) : (
                        <div style={{ width: 32, height: 32, borderRadius: "50%", background: "var(--gradient-primary)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "13px", fontWeight: 700, color: "white" }}>
                          {record.member.user.name?.[0]?.toUpperCase()}
                        </div>
                      )}
                      <div>
                        <div style={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--card-foreground)" }}>{record.member.user.name}</div>
                        <div style={{ fontSize: "0.7rem", color: "var(--muted-foreground)" }}>{record.member.user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div style={{ fontWeight: 700, color: "var(--card-foreground)" }}>
                      {formatCurrency(record.amountRequired)}
                    </div>
                    {record.amountPaid > 0 && record.amountPaid !== record.amountRequired && (
                      <div style={{ fontSize: "0.75rem", color: "#4ade80" }}>
                        Đã đóng: {formatCurrency(record.amountPaid)}
                      </div>
                    )}
                  </td>
                  <td>
                    <span className={st.cls} style={{ padding: "4px 10px", borderRadius: "999px", fontSize: "0.75rem", fontWeight: 600 }}>
                      {st.label}
                    </span>
                  </td>
                  <td style={{ color: "var(--muted-foreground)", fontSize: "0.8rem" }}>
                    {record.paidAt ? formatDateTime(record.paidAt) : "—"}
                  </td>
                  <td style={{ fontSize: "0.8rem", color: "var(--muted-foreground)" }}>
                    {record.paymentMethod === "BANK_TRANSFER"
                      ? record.sepayTx
                        ? `🔗 SePay (${record.sepayTx.gateway})`
                        : "💳 CK thủ công"
                      : record.paymentMethod === "CASH"
                      ? "💵 Tiền mặt"
                      : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
