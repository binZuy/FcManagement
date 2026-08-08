import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import Link from "next/link";
import { ArrowLeft, Users, UserCheck } from "lucide-react";
import { notFound } from "next/navigation";
import { RecordStatus } from "@prisma/client";
import { MarkPaidButton } from "@/components/MarkPaidButton";
import { PaymentSessionDetailView } from "@/components/PaymentSessionDetailView";

const RECORD_STATUS: Record<string, { label: string; cls: string; color: string; bg: string }> = {
  PENDING: { label: "Chưa đóng", cls: "badge-pending", color: "#facc15", bg: "rgba(250,204,21,0.12)" },
  PAID: { label: "Đã đóng", cls: "badge-paid", color: "#4ade80", bg: "rgba(34,197,94,0.12)" },
  OVERDUE: { label: "Quá hạn", cls: "badge-overdue", color: "#f87171", bg: "rgba(239,68,68,0.12)" },
  WAIVED: { label: "Miễn đóng", cls: "badge-waived", color: "#94a3b8", bg: "rgba(148,163,184,0.12)" },
};

type Params = { params: Promise<{ id: string }> };

export default async function PaymentDetailPage({ params }: Params) {
  const { id } = await params;
  const userSession = await auth();
  const isAdmin = userSession?.user?.role === "ADMIN";
  const session = await prisma.paymentSession.findUnique({
    where: { id },
    include: {
      match: {
        include: {
          attendances: true,
        },
      },
      paymentRecords: {
        include: {
          member: { include: { user: { select: { name: true, email: true, image: true } } } },
          sepayTx: true,
        },
        orderBy: [{ status: "asc" }, { note: "desc" }, { member: { user: { name: "asc" } } }],
      },
    },
  });

  if (!session) notFound();

  // BÓC TÁCH DÒNG THÀNH VIÊN VÀ DÒNG BẠN NẾU CÓ
  const displayItems: any[] = [];

  session.paymentRecords.forEach((record) => {
    const att = session.match?.attendances.find((a) => a.memberId === record.memberId);
    const guestCount = att?.guestCount || 0;
    const drinksGuestCount = att?.drinksGuestCount || 0;
    const hasGuests = guestCount > 0 || drinksGuestCount > 0;

    if (!hasGuests) {
      // Không có bạn → hiện 1 dòng bình thường
      displayItems.push({
        id: record.id,
        name: record.member.user.name,
        isGuest: false,
        guestNote: null,
        code: record.member.code,
        image: record.member.user.image,
        amountRequired: record.amountRequired,
        amountPaid: record.amountPaid,
        status: record.status,
        paidAt: record.paidAt,
        paymentMethod: record.paymentMethod,
        sepayTx: record.sepayTx,
      });
    } else {
      // Có bạn đi cùng → bóc tách thành 2 dòng
      const totalHeads = 1 + guestCount;
      const drinkHeads = (att?.isDrinks ? 1 : 0) + drinksGuestCount;
      const baseFeePerHead = (att?.feeAssigned ?? 0) / (totalHeads || 1);
      const drinksFeePerHead = drinkHeads > 0 ? (att?.drinksFeeAssigned ?? 0) / (drinkHeads || 1) : 0;

      const memberSelfFee = Math.round(baseFeePerHead + (att?.isDrinks ? drinksFeePerHead : 0));
      const guestTotalFee = Math.round(guestCount * baseFeePerHead + drinksGuestCount * drinksFeePerHead);

      // Dòng 1: Bản thân thành viên
      displayItems.push({
        id: record.id + "_self",
        name: record.member.user.name,
        isGuest: false,
        guestNote: null,
        code: record.member.code,
        image: record.member.user.image,
        amountRequired: memberSelfFee,
        amountPaid: record.status === "PAID" ? memberSelfFee : 0,
        status: memberSelfFee === 0 ? "WAIVED" : record.status,
        paidAt: record.paidAt,
        paymentMethod: record.paymentMethod,
        sepayTx: record.sepayTx,
      });

      // Dòng 2: Bạn đi cùng
      if (guestTotalFee > 0) {
        displayItems.push({
          id: record.id + "_guest",
          name: `Bạn của ${record.member.user.name}`,
          isGuest: true,
          guestNote: `${guestCount} người`,
          code: record.member.code,
          image: null,
          amountRequired: guestTotalFee,
          amountPaid: record.status === "PAID" ? guestTotalFee : 0,
          status: record.status,
          paidAt: record.paidAt,
          paymentMethod: record.paymentMethod,
          sepayTx: record.sepayTx,
        });
      }
    }
  });

  const total = displayItems.reduce((s, r) => s + r.amountRequired, 0);
  const paid = displayItems.filter((r) => r.status === RecordStatus.PAID).reduce((s, r) => s + r.amountPaid, 0);
  const paidCount = displayItems.filter((r) => r.status === RecordStatus.PAID).length;
  const pct = displayItems.length > 0 ? Math.round((paidCount / displayItems.length) * 100) : 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      <Link href="/payments" className="btn btn-secondary" style={{ alignSelf: "flex-start", padding: "6px 12px", fontSize: "0.82rem" }}>
        <ArrowLeft size={16} />
        Quay lại danh sách
      </Link>

      {/* Session Header Card */}
      <div className="glass-card" style={{ padding: "20px 24px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "14px", marginBottom: "16px" }}>
          <div>
            <h1 style={{ fontSize: "1.3rem", fontWeight: 800, color: "var(--card-foreground)", marginBottom: "6px" }}>
              {session.title}
            </h1>
            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "center" }}>
              <span style={{
                padding: "3px 10px", borderRadius: "999px", fontSize: "0.72rem", fontWeight: 700,
                color: session.status === "OPEN" ? "#4ade80" : "#94a3b8",
                background: session.status === "OPEN" ? "rgba(34,197,94,0.12)" : "rgba(148,163,184,0.12)",
              }}>
                {session.status === "OPEN" ? "Đang mở" : "Đã đóng"}
              </span>
              <span style={{ fontSize: "0.8rem", color: "var(--muted-foreground)" }}>
                Mã phiên: <strong style={{ color: "var(--primary)" }}>{session.code}</strong>
              </span>
            </div>
          </div>

          {/* Stat Badge Box */}
          <div
            style={{
              padding: "10px 16px",
              borderRadius: "12px",
              background: "rgba(34,197,94,0.08)",
              border: "1px solid rgba(34,197,94,0.2)",
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-start",
              gap: "2px",
            }}
          >
            <div style={{ fontSize: "0.75rem", color: "var(--muted-foreground)", fontWeight: 600 }}>
              Đã thu / Tổng cần thu:
            </div>
            <div style={{ fontSize: "1.15rem", fontWeight: 800, color: "#4ade80", whiteSpace: "nowrap" }}>
              {formatCurrency(paid)} <span style={{ fontSize: "0.85rem", color: "var(--muted-foreground)", fontWeight: 500 }}>/ {formatCurrency(total)}</span>
            </div>
          </div>
        </div>

        <div className="progress-bar" style={{ height: 8, marginBottom: 8 }}>
          <div className="progress-fill" style={{ width: `${pct}%` }} />
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.78rem", color: "var(--muted-foreground)" }}>
          <span>{paidCount}/{displayItems.length} lượt khoản đóng đã hoàn tất</span>
          <span style={{ color: pct === 100 ? "var(--primary)" : undefined, fontWeight: 700 }}>{pct}%</span>
        </div>
      </div>

      {/* Payment Records Table & Mobile Cards */}
      <PaymentSessionDetailView
        displayItems={displayItems}
        isAdmin={isAdmin}
        RECORD_STATUS={RECORD_STATUS}
      />
    </div>
  );
}
