import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { formatDate } from "@/lib/utils";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Mail, Phone, Calendar, CreditCard, ChevronRight, Quote } from "lucide-react";
import { EditProfileModal } from "@/components/EditProfileModal";

const POSITION_LABELS: Record<string, { label: string; icon: string }> = {
  GOALKEEPER: { label: "Thủ môn", icon: "🧤" },
  DEFENDER: { label: "Hậu vệ", icon: "🛡️" },
  MIDFIELDER: { label: "Tiền vệ", icon: "⚙️" },
  FORWARD: { label: "Tiền đạo", icon: "⚽" },
};

const ATTEND_LABELS: Record<string, { label: string; color: string }> = {
  ATTENDED: { label: "Có mặt", color: "#4ade80" },
  ABSENT: { label: "Vắng mặt", color: "#f87171" },
  LATE: { label: "Muộn", color: "#facc15" },
  EXCUSED: { label: "Xin phép", color: "#a5b4fc" },
};

// Hàm che Email: chỉ giữ chữ đầu và chữ cuối trước @
function maskEmail(email: string | null): string {
  if (!email) return "—";
  const [name, domain] = email.split("@");
  if (!domain || name.length <= 1) return "***";
  const first = name[0];
  const last = name[name.length - 1];
  return `${first}***${last}@${domain}`;
}

// Hàm che SĐT: chỉ giữ số đầu và số cuối
function maskPhone(phone: string | null): string {
  if (!phone) return "—";
  if (phone.length <= 2) return "***";
  const first = phone[0];
  const last = phone[phone.length - 1];
  return `${first}***${last}`;
}

type Params = { params: Promise<{ id: string }> };

export default async function MemberDetailPage({ params }: Params) {
  const { id } = await params;
  const session = await auth();

  const isAuthenticated = !!session?.user;
  const isAdmin = session?.user?.role === "ADMIN";

  const member = await prisma.member.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, name: true, email: true, image: true, phone: true } },
      attendances: {
        select: {
          id: true,
          status: true,
          match: { select: { id: true, title: true, matchDate: true, result: true, location: true } },
        },
        orderBy: { match: { matchDate: "desc" } },
      },
      paymentRecords: {
        where: { status: { in: ["PENDING", "OVERDUE"] } },
        select: { status: true },
      },
    },
  });

  if (!member) notFound();

  const isOwner = session?.user?.id === member.userId;
  const canEdit = isAdmin || isOwner;

  // Đếm số trận chưa đóng
  const unpaidCount = member.paymentRecords.filter((r) =>
    ["PENDING", "OVERDUE"].includes(r.status)
  ).length;

  // Tính thông số thi đấu
  const totalAttended = member.attendances.filter((a) => a.status === "ATTENDED").length;

  // Tính số ngày chưa quay trở lại đá (kể từ trận đá gần nhất)
  const lastAttended = member.attendances.find((a) => a.status === "ATTENDED");
  let daysSinceLastMatchStr = "—";
  if (lastAttended) {
    const lastDate = new Date(lastAttended.match.matchDate);
    const now = new Date();
    const diffTime = Math.max(0, now.getTime() - lastDate.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    daysSinceLastMatchStr = diffDays === 0 ? "Hôm nay" : `${diffDays} ngày`;
  }

  // Tỷ lệ thắng
  const attendedMatchesWithResult = member.attendances.filter(
    (a) => a.status === "ATTENDED" && a.match.result
  );
  const winCount = attendedMatchesWithResult.filter((a) => a.match.result === "WIN").length;
  const winRate =
    attendedMatchesWithResult.length > 0
      ? Math.round((winCount / attendedMatchesWithResult.length) * 100)
      : 0;

  const posConfig = member.position ? POSITION_LABELS[member.position] : null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* Top action bar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
        <Link href="/members" className="btn btn-secondary" style={{ padding: "6px 12px", fontSize: "0.82rem" }}>
          <ArrowLeft size={16} />
          Quay lại danh sách
        </Link>

        {/* Nút Sửa Profile dành cho Chính chủ hoặc Admin */}
        {canEdit && (
          <EditProfileModal
            memberId={member.id}
            initialName={member.user.name ?? ""}
            initialPhone={member.user.phone ?? ""}
            initialJerseyNumber={member.jerseyNumber}
            initialPosition={member.position}
            initialNote={member.note}
          />
        )}
      </div>

      {/* Header Profile Thẻ Cầu Thủ */}
      <div
        className="glass-card"
        style={{
          padding: "24px",
          background: "linear-gradient(135deg, rgba(17,24,39,0.9), rgba(30,41,59,0.8))",
          border: "1px solid rgba(34,197,94,0.2)",
          borderRadius: "16px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "20px", flexWrap: "wrap" }}>
          {member.user.image ? (
            <img
              src={member.user.image}
              alt=""
              style={{
                width: 80,
                height: 80,
                borderRadius: "50%",
                border: "3px solid var(--primary)",
                objectFit: "cover",
                flexShrink: 0,
                boxShadow: "0 4px 15px rgba(34,197,94,0.3)",
              }}
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

          <div style={{ flex: 1, minWidth: "220px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap", marginBottom: "6px" }}>
              <h1 style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--card-foreground)" }}>
                {member.user.name}
              </h1>
              {member.jerseyNumber && (
                <span
                  style={{
                    padding: "3px 10px",
                    background: "rgba(34,197,94,0.15)",
                    color: "var(--primary)",
                    borderRadius: "999px",
                    fontSize: "0.82rem",
                    fontWeight: 700,
                    border: "1px solid rgba(34,197,94,0.3)",
                  }}
                >
                  #{member.jerseyNumber}
                </span>
              )}
              {posConfig && (
                <span
                  style={{
                    padding: "3px 10px",
                    background: "rgba(96,165,250,0.15)",
                    color: "#60a5fa",
                    borderRadius: "999px",
                    fontSize: "0.82rem",
                    fontWeight: 600,
                  }}
                >
                  {posConfig.icon} {posConfig.label}
                </span>
              )}
            </div>

            {/* Email & SĐT (Đã che chỉ giữ chữ đầu và chữ cuối nếu chưa đăng nhập) */}
            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "var(--muted-foreground)", fontSize: "0.82rem" }}>
                <Mail size={14} style={{ flexShrink: 0 }} />
                <span>
                  {isAuthenticated ? (member.user.email ?? "—") : maskEmail(member.user.email)}
                </span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "var(--muted-foreground)", fontSize: "0.82rem" }}>
                <Phone size={14} style={{ flexShrink: 0 }} />
                <span>
                  {isAuthenticated ? (member.user.phone ?? "Chưa cập nhật") : maskPhone(member.user.phone)}
                </span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "var(--muted-foreground)", fontSize: "0.82rem" }}>
                <Calendar size={14} style={{ flexShrink: 0 }} />
                <span>Gia nhập: {formatDate(member.joinDate)}</span>
              </div>

              {!isAuthenticated && (
                <div style={{ fontSize: "0.72rem", color: "#facc15", marginTop: "2px" }}>
                  🔒 Bạn đang xem ở chế độ Khách. Đăng nhập để xem đầy đủ SĐT & Email.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Khẩu hiệu / Bio */}
        {member.note && (
          <div
            style={{
              marginTop: "16px",
              padding: "10px 14px",
              borderRadius: "10px",
              background: "rgba(30,41,59,0.5)",
              borderLeft: "3px solid var(--primary)",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              fontSize: "0.82rem",
              fontStyle: "italic",
              color: "#cbd5e1",
            }}
          >
            <Quote size={14} color="var(--primary)" style={{ flexShrink: 0 }} />
            <span>"{member.note}"</span>
          </div>
        )}

        {/* 4 Chỉ số phong độ thi đấu */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
            gap: "10px",
            marginTop: "20px",
            paddingTop: "20px",
            borderTop: "1px solid var(--border)",
          }}
        >
          <div style={{ textAlign: "center", background: "rgba(30,41,59,0.4)", padding: "10px", borderRadius: "8px" }}>
            <div style={{ fontSize: "1.25rem", fontWeight: 800, color: "var(--primary)" }}>{totalAttended}</div>
            <div style={{ fontSize: "0.72rem", color: "var(--muted-foreground)", marginTop: "2px" }}>Trận đã đá</div>
          </div>

          <div style={{ textAlign: "center", background: "rgba(30,41,59,0.4)", padding: "10px", borderRadius: "8px" }}>
            <div style={{ fontSize: "1.25rem", fontWeight: 800, color: "#facc15" }}>{winRate}%</div>
            <div style={{ fontSize: "0.72rem", color: "var(--muted-foreground)", marginTop: "2px" }}>Tỷ lệ thắng</div>
          </div>

          <div style={{ textAlign: "center", background: "rgba(30,41,59,0.4)", padding: "10px", borderRadius: "8px" }}>
            <div style={{ fontSize: "1.1rem", fontWeight: 800, color: "#fb923c", paddingTop: "2px" }}>
              {daysSinceLastMatchStr}
            </div>
            <div style={{ fontSize: "0.72rem", color: "var(--muted-foreground)", marginTop: "2px" }}>Chưa đá lại</div>
          </div>

          <div style={{ textAlign: "center", background: "rgba(30,41,59,0.4)", padding: "10px", borderRadius: "8px" }}>
            <div style={{ fontSize: "1rem", fontWeight: 800, color: "#a78bfa", paddingTop: "2px" }}>
              {posConfig ? posConfig.label : "Chưa xếp"}
            </div>
            <div style={{ fontSize: "0.72rem", color: "var(--muted-foreground)", marginTop: "2px" }}>Vị trí thi đấu</div>
          </div>
        </div>
      </div>

      {/* 💳 NÚT ĐIỀU HƯỚNG ĐẾN MÀN HÌNH THANH TOÁN (Chỉ hiển thị khi CÒN trận chưa đóng) */}
      {unpaidCount > 0 && (
        <Link href={`/payments/${member.id}`} style={{ textDecoration: "none" }}>
          <div
            className="glass-card hover-card"
            style={{
              padding: "18px 22px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              borderRadius: "14px",
              border: "1px solid rgba(248,113,113,0.3)",
              background: "rgba(239,68,68,0.04)",
              transition: "all 0.2s ease",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: "12px",
                  background: "rgba(239,68,68,0.15)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <CreditCard size={22} color="#f87171" />
              </div>
              <div>
                <div style={{ fontWeight: 800, fontSize: "1rem", color: "var(--card-foreground)" }}>
                  Tiền bóng (Còn {unpaidCount} trận chưa đóng 😣💸)
                </div>
                <div style={{ fontSize: "0.75rem", color: "var(--muted-foreground)", marginTop: "2px" }}>
                  Xem chi tiết các trận tại đây
                </div>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#f87171", fontWeight: 700, fontSize: "0.85rem" }}>
              <span>Thanh toán</span>
              <ChevronRight size={18} />
            </div>
          </div>
        </Link>
      )}

      {/* KHỐI LỊCH SỬ THAM GIA TRẬN ĐẤU */}
      <div className="glass-card" style={{ padding: "24px" }}>
        <h2 style={{ fontSize: "1.05rem", fontWeight: 700, marginBottom: "16px", color: "var(--card-foreground)", display: "flex", alignItems: "center", gap: "8px" }}>
          <Calendar size={18} /> Lịch sử tham gia thi đấu ({member.attendances.length} trận)
        </h2>

        <div style={{ display: "flex", flexDirection: "column", gap: "8px", maxHeight: "500px", overflowY: "auto" }}>
          {member.attendances.length === 0 && (
            <p style={{ color: "var(--muted-foreground)", fontSize: "0.85rem", textAlign: "center", padding: "30px 0" }}>
              Chưa đi đá trận nào ư? ⚽🏃‍♂Ra sân đê!
            </p>
          )}

          {member.attendances.map((a) => {
            const st = ATTEND_LABELS[a.status] ?? { label: a.status, color: "white" };
            return (
              <Link key={a.id} href={`/matches/${a.match.id}`} style={{ textDecoration: "none" }}>
                <div
                  className="hover-card"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    padding: "12px 14px",
                    borderRadius: "10px",
                    background: "rgba(30,41,59,0.4)",
                    border: "1px solid rgba(255,255,255,0.04)",
                  }}
                >
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: st.color, flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--card-foreground)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {a.match.title}
                    </div>
                    <div style={{ fontSize: "0.75rem", color: "var(--muted-foreground)", marginTop: "2px" }}>
                      {formatDate(a.match.matchDate)} {a.match.location ? `· 📍 ${a.match.location}` : ""}
                    </div>
                  </div>
                  <span style={{ fontSize: "0.75rem", color: st.color, fontWeight: 700, flexShrink: 0 }}>
                    {st.label}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
