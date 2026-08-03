import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/utils";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Mail, Phone, Hash, Calendar, AlertCircle, CheckCircle } from "lucide-react";
import { MarkPaidButton } from "@/components/MarkPaidButton";

const ATTEND_LABELS: Record<string, { label: string; color: string }> = {
  ATTENDED: { label: "Có mặt", color: "#4ade80" },
  ABSENT: { label: "Vắng mặt", color: "#f87171" },
  LATE: { label: "Muộn", color: "#facc15" },
  EXCUSED: { label: "Xin phép", color: "#a5b4fc" },
};

const RECORD_STATUS: Record<string, { label: string; cls: string; color: string }> = {
  PENDING: { label: "Chưa đóng", cls: "badge-pending", color: "#facc15" },
  PARTIAL: { label: "Đóng thiếu", cls: "badge-pending", color: "#fb923c" },
  PAID: { label: "Đã đóng", cls: "badge-paid", color: "#4ade80" },
  OVERDUE: { label: "Quá hạn", cls: "badge-overdue", color: "#f87171" },
  WAIVED: { label: "Miễn", cls: "badge-waived", color: "#94a3b8" },
};

type Params = { params: Promise<{ id: string }> };

export default async function MemberDetailPage({ params }: Params) {
  const { id } = await params;
  const session = await auth();
  const isAdmin = session?.user?.role === "ADMIN";

  const member = await prisma.member.findUnique({
    where: { id },
    include: {
      user: { select: { name: true, email: true, image: true, phone: true } },
      attendances: {
        include: { match: true },
        orderBy: { match: { matchDate: "desc" } },
        take: 20,
      },
      paymentRecords: {
        include: { session: true },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!member) notFound();

  // Tách biệt record chưa đóng và đã đóng
  const unpaidRecords = member.paymentRecords.filter(r => ["PENDING", "OVERDUE"].includes(r.status));
  const paidRecords = member.paymentRecords.filter(r => ["PAID", "WAIVED"].includes(r.status)).slice(0, 15); // Chỉ lấy 15 giao dịch gần nhất cho lịch sử

  const totalAttended = member.attendances.filter((a) => a.status === "ATTENDED").length;
  const totalPaid = member.paymentRecords.filter((r) => r.status === "PAID").length;
  const totalOwed = member.paymentRecords
    .filter((r) => r.status !== "WAIVED")
    .reduce((s, r) => s + r.amountRequired, 0);
  const totalPaidAmount = member.paymentRecords
    .filter((r) => r.status === "PAID")
    .reduce((s, r) => s + r.amountPaid, 0);
  const currentDebt = Math.max(0, totalOwed - totalPaidAmount);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "28px" }}>
      {/* Back */}
      <Link href="/members" className="btn btn-secondary" style={{ alignSelf: "flex-start" }}>
        <ArrowLeft size={16} />
        Quay lại
      </Link>

      {/* Profile header */}
      <div className="glass-card" style={{ padding: "32px" }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: "24px", flexWrap: "wrap" }}>
          {member.user.image ? (
            <img
              src={member.user.image}
              alt={member.user.name ?? ""}
              style={{ width: 80, height: 80, borderRadius: "50%", border: "3px solid var(--primary)", objectFit: "cover" }}
            />
          ) : (
            <div
              style={{
                width: 80,
                height: 80,
                borderRadius: "50%",
                background: "var(--gradient-primary)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "2rem",
                fontWeight: 800,
                color: "white",
                flexShrink: 0,
              }}
            >
              {member.user.name?.[0]?.toUpperCase() ?? "?"}
            </div>
          )}
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap", marginBottom: "8px" }}>
              <h1 style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--card-foreground)" }}>
                {member.user.name}
              </h1>
              {member.jerseyNumber && (
                <span style={{ padding: "4px 12px", background: "rgba(34,197,94,0.15)", color: "var(--primary)", borderRadius: "999px", fontSize: "0.85rem", fontWeight: 700 }}>
                  #{member.jerseyNumber}
                </span>
              )}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "var(--muted-foreground)", fontSize: "0.85rem" }}>
                <Mail size={14} />
                {member.user.email}
              </div>
              {member.user.phone && (
                <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "var(--muted-foreground)", fontSize: "0.85rem" }}>
                  <Phone size={14} />
                  {member.user.phone}
                </div>
              )}
              <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "var(--muted-foreground)", fontSize: "0.85rem" }}>
                <Calendar size={14} />
                Gia nhập: {formatDate(member.joinDate)}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "var(--muted-foreground)", fontSize: "0.85rem" }}>
                <Hash size={14} />
                Mã CK: <strong style={{ color: "var(--primary)" }}>FCM {member.code}</strong>
              </div>
            </div>
          </div>
        </div>

        {/* Mini stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "12px", marginTop: "24px", paddingTop: "24px", borderTop: "1px solid var(--border)" }}>
          {[
            { label: "Trận đã đá", value: totalAttended },
            { label: "Phiên đã đóng", value: `${totalPaid}/${member.paymentRecords.length}` },
            { label: "Tổng đã đóng", value: formatCurrency(totalPaidAmount) },
            { label: "Tổng nợ hiện tại", value: formatCurrency(currentDebt), color: currentDebt > 0 ? "#f87171" : "#4ade80" },
          ].map((s, i) => (
            <div key={i} style={{ textAlign: "center" }}>
              <div style={{ fontSize: "1.25rem", fontWeight: 800, color: s.color ?? "var(--card-foreground)" }}>{s.value}</div>
              <div style={{ fontSize: "0.75rem", color: "var(--muted-foreground)" }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Tách thành 2 cột trên Desktop, 1 cột trên Mobile */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(400px, 1fr))", gap: "24px" }}>
        
        {/* Left Column: Attendance */}
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          <div className="glass-card" style={{ padding: "24px" }}>
            <h2 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: "16px", color: "var(--card-foreground)", display: "flex", alignItems: "center", gap: "8px" }}>
              <Calendar size={18} /> Lịch sử tham gia
            </h2>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {member.attendances.length === 0 && (
                <p style={{ color: "var(--muted-foreground)", fontSize: "0.85rem", textAlign: "center", padding: "24px 0" }}>
                  Chưa có lịch sử tham gia
                </p>
              )}
              {member.attendances.map((a) => {
                const st = ATTEND_LABELS[a.status] ?? { label: a.status, color: "white" };
                return (
                  <div key={a.id} style={{ display: "flex", alignItems: "center", gap: "12px", padding: "12px", borderRadius: "10px", background: "rgba(30,41,59,0.4)" }}>
                    <div style={{ width: 10, height: 10, borderRadius: "50%", background: st.color, flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--card-foreground)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {a.match.title}
                      </div>
                      <div style={{ fontSize: "0.75rem", color: "var(--muted-foreground)", marginTop: "2px" }}>
                        {formatDate(a.match.matchDate)}
                      </div>
                    </div>
                    <span style={{ fontSize: "0.75rem", color: st.color, fontWeight: 700, flexShrink: 0 }}>
                      {st.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Payments (Unpaid + Paid) */}
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          
          {/* Unpaid section */}
          <div className="glass-card" style={{ padding: "24px", border: unpaidRecords.length > 0 ? "1px solid rgba(248,113,113,0.3)" : "1px solid var(--border)" }}>
            <h2 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: "16px", color: unpaidRecords.length > 0 ? "#f87171" : "var(--card-foreground)", display: "flex", alignItems: "center", gap: "8px" }}>
              <AlertCircle size={18} /> Các khoản chưa đóng
            </h2>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {unpaidRecords.length === 0 && (
                <div style={{ textAlign: "center", padding: "24px 0", color: "#4ade80", fontSize: "0.9rem", fontWeight: 600 }}>
                  Tuyệt vời! Không có khoản nợ nào.
                </div>
              )}
              {unpaidRecords.map((r) => {
                const st = RECORD_STATUS[r.status] ?? { label: r.status, color: "white" };
                const debt = r.amountRequired - r.amountPaid;
                return (
                  <div key={r.id} style={{ display: "flex", alignItems: "center", gap: "12px", padding: "12px", borderRadius: "10px", background: "rgba(239,68,68,0.05)", border: "1px solid rgba(239,68,68,0.1)" }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--card-foreground)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {r.session.title}
                      </div>
                      <div style={{ fontSize: "0.75rem", color: "var(--muted-foreground)", marginTop: "4px", display: "flex", gap: "8px" }}>
                        <span style={{ color: st.color }}>{st.label}</span>
                        <span>•</span>
                        <span>Yêu cầu: {formatCurrency(r.amountRequired)}</span>
                      </div>
                    </div>
                    <div style={{ textAlign: "right", flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "6px" }}>
                      <div style={{ fontSize: "0.9rem", fontWeight: 800, color: "#f87171" }}>
                        {formatCurrency(debt)}
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

          {/* Paid section */}
          <div className="glass-card" style={{ padding: "24px" }}>
            <h2 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: "16px", color: "var(--card-foreground)", display: "flex", alignItems: "center", gap: "8px" }}>
              <CheckCircle size={18} color="#4ade80" /> Lịch sử đã đóng
            </h2>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {paidRecords.length === 0 && (
                <p style={{ color: "var(--muted-foreground)", fontSize: "0.85rem", textAlign: "center", padding: "24px 0" }}>
                  Chưa có lịch sử đóng tiền
                </p>
              )}
              {paidRecords.map((r) => {
                const st = RECORD_STATUS[r.status] ?? { label: r.status, cls: "" };
                return (
                  <div key={r.id} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "10px 12px", borderRadius: "8px", background: "rgba(30,41,59,0.4)" }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--card-foreground)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {r.session.title}
                      </div>
                      <div style={{ fontSize: "0.7rem", color: "var(--muted-foreground)", marginTop: "2px" }}>
                        {r.paidAt ? formatDateTime(r.paidAt) : "Đã hoàn thành"}
                      </div>
                    </div>
                    <div style={{ textAlign: "right", flexShrink: 0 }}>
                      <div style={{ fontSize: "0.8rem", fontWeight: 700, color: "#4ade80" }}>
                        {formatCurrency(r.amountPaid)}
                      </div>
                      <span className={st.cls} style={{ display: "inline-block", marginTop: "4px", padding: "2px 8px", borderRadius: "999px", fontSize: "0.65rem", fontWeight: 600 }}>
                        {st.label}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
