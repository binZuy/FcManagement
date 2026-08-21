import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { ArrowLeftRight, UserCheck, HelpCircle } from "lucide-react";

export default async function TransactionsPage() {
  await auth();

  const [transactions, members] = await Promise.all([
    prisma.sepayTransaction.findMany({
      orderBy: { transactionDate: "desc" },
      take: 100,
      include: {
        paymentRecord: {
          include: {
            member: {
              include: { user: { select: { name: true, email: true, image: true } } },
            },
          },
        },
        paymentBundle: {
          include: {
            member: {
              include: { user: { select: { name: true, email: true, image: true } } },
            },
          },
        },
      },
    }),
    prisma.member.findMany({
      include: {
        user: { select: { name: true, email: true, image: true } },
      },
    }),
  ]);

  // Tạo map tìm nhanh member theo id và code
  const memberById = new Map(members.map((m) => [m.id, m]));
  const memberByCode = new Map(members.map((m) => [m.code.toUpperCase(), m]));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "28px" }}>
      <div>
        <h1 style={{ fontSize: "1.75rem", fontWeight: 800, color: "var(--card-foreground)", marginBottom: "4px" }}>
          Lịch sử giao dịch chuyển khoản
        </h1>
        <p style={{ color: "var(--muted-foreground)", fontSize: "0.9rem" }}>
          Danh sách biến động số dư chuyển khoản tự động qua cổng SePay
        </p>
      </div>

      <div className="glass-card" style={{ overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table className="data-table" style={{ width: "100%" }}>
            <thead>
              <tr>
                <th>Thành viên chuyển khoản</th>
                <th>Số tiền</th>
                <th>Trạng thái khớp</th>
                <th>Nội dung chuyển khoản</th>
                <th>Cổng thanh toán</th>
                <th>Thời gian</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((tx) => {
                const member =
                  tx.paymentRecord?.member ||
                  tx.paymentBundle?.member ||
                  (tx.matchedMemberId ? memberById.get(tx.matchedMemberId) : null) ||
                  (tx.matchedMemberCode ? memberByCode.get(tx.matchedMemberCode.toUpperCase()) : null);

                const memberName = member?.user?.name;
                const memberImage = member?.user?.image;
                const memberCode = member?.code || tx.matchedMemberCode;

                return (
                  <tr key={tx.id}>
                    {/* Cột 1: Ưu tiên hiển thị TÊN người đã CK */}
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        {memberImage ? (
                          <img
                            src={memberImage}
                            alt=""
                            style={{ width: 36, height: 36, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }}
                          />
                        ) : memberName ? (
                          <div
                            style={{
                              width: 36,
                              height: 36,
                              borderRadius: "50%",
                              background: "var(--gradient-primary)",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontSize: "14px",
                              fontWeight: 800,
                              color: "white",
                              flexShrink: 0,
                            }}
                          >
                            {memberName[0]?.toUpperCase()}
                          </div>
                        ) : (
                          <div
                            style={{
                              width: 36,
                              height: 36,
                              borderRadius: "50%",
                              background: "rgba(255, 255, 255, 0.08)",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              flexShrink: 0,
                            }}
                          >
                            <HelpCircle size={18} style={{ color: "var(--muted-foreground)" }} />
                          </div>
                        )}

                        <div>
                          <div style={{ fontWeight: 700, fontSize: "0.9rem", color: "var(--card-foreground)" }}>
                            {memberName ?? (memberCode ? `Mã: ${memberCode}` : "Chưa xác định TV")}
                          </div>
                          {memberCode && (
                            <div style={{ fontSize: "0.75rem", color: "var(--primary)", fontWeight: 600 }}>
                              Mã TV: {memberCode}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Cột 2: Số tiền */}
                    <td>
                      <span style={{ fontWeight: 800, color: "#4ade80", fontSize: "0.95rem" }}>
                        +{formatCurrency(tx.transferAmount)}
                      </span>
                    </td>

                    {/* Cột 3: Trạng thái khớp */}
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <div
                          style={{
                            width: 8,
                            height: 8,
                            borderRadius: "50%",
                            background: tx.isMatched ? "var(--primary)" : "#facc15",
                          }}
                        />
                        <span
                          style={{
                            fontSize: "0.78rem",
                            color: tx.isMatched ? "var(--primary)" : "#facc15",
                            fontWeight: 700,
                          }}
                        >
                          {tx.isMatched ? "Đã khớp" : "Chưa khớp"}
                        </span>
                      </div>
                      {tx.matchedSessionCode && (
                        <div style={{ fontSize: "0.72rem", color: "var(--muted-foreground)", marginTop: "2px" }}>
                          Phiên: {tx.matchedSessionCode}
                        </div>
                      )}
                      {tx.matchedBundleCode && (
                        <div style={{ fontSize: "0.72rem", color: "var(--muted-foreground)", marginTop: "2px" }}>
                          Bundle: {tx.matchedBundleCode}
                        </div>
                      )}
                    </td>

                    {/* Cột 4: Nội dung CK */}
                    <td style={{ maxWidth: "240px" }}>
                      <div
                        style={{
                          fontSize: "0.8rem",
                          color: "var(--muted-foreground)",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                        title={tx.content ?? ""}
                      >
                        {tx.content ?? "—"}
                      </div>
                    </td>

                    {/* Cột 5: Ngân hàng cổng (Ẩn số tài khoản admin) */}
                    <td>
                      <div style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--card-foreground)" }}>
                        {tx.gateway}
                      </div>
                    </td>

                    {/* Cột 6: Thời gian */}
                    <td style={{ fontSize: "0.8rem", color: "var(--muted-foreground)", whiteSpace: "nowrap" }}>
                      {formatDateTime(tx.transactionDate)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {transactions.length === 0 && (
          <div style={{ padding: "60px 24px", textAlign: "center" }}>
            <ArrowLeftRight size={48} style={{ margin: "0 auto 16px", opacity: 0.3, display: "block" }} />
            <div style={{ fontWeight: 600, color: "var(--muted-foreground)" }}>Chưa có giao dịch nào</div>
            <p style={{ color: "var(--muted-foreground)", fontSize: "0.85rem", marginTop: "8px" }}>
              Giao dịch sẽ xuất hiện ở đây sau khi SePay Webhook được cấu hình và có chuyển khoản vào tài khoản ngân hàng
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

