import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { ArrowLeftRight } from "lucide-react";

export default async function TransactionsPage() {
  await auth();

  const transactions = await prisma.sepayTransaction.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "28px" }}>
      <div>
        <h1 style={{ fontSize: "1.75rem", fontWeight: 800, color: "var(--card-foreground)", marginBottom: "4px" }}>
          Giao dịch SePay
        </h1>
        <p style={{ color: "var(--muted-foreground)", fontSize: "0.9rem" }}>
          Lịch sử toàn bộ giao dịch nhận được từ Webhook SePay
        </p>
      </div>

      <div className="glass-card" style={{ overflow: "hidden" }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Ngân hàng</th>
              <th>Số tiền</th>
              <th>Nội dung CK</th>
              <th>Thời gian</th>
              <th>Khớp</th>
              <th>Thành viên</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((tx) => (
              <tr key={tx.id}>
                <td>
                  <div style={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--card-foreground)" }}>
                    {tx.gateway}
                  </div>
                  {tx.accountNumber && (
                    <div style={{ fontSize: "0.7rem", color: "var(--muted-foreground)" }}>
                      {tx.accountNumber}
                    </div>
                  )}
                </td>
                <td>
                  <span style={{ fontWeight: 700, color: "#4ade80", fontSize: "0.9rem" }}>
                    +{formatCurrency(tx.transferAmount)}
                  </span>
                </td>
                <td style={{ maxWidth: "200px" }}>
                  <div style={{
                    fontSize: "0.8rem",
                    color: "var(--muted-foreground)",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}>
                    {tx.content ?? "—"}
                  </div>
                </td>
                <td style={{ fontSize: "0.8rem", color: "var(--muted-foreground)" }}>
                  {formatDateTime(tx.transactionDate)}
                </td>
                <td>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <div style={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      background: tx.isMatched ? "var(--primary)" : "#facc15",
                    }} />
                    <span style={{
                      fontSize: "0.78rem",
                      color: tx.isMatched ? "var(--primary)" : "#facc15",
                      fontWeight: 600,
                    }}>
                      {tx.isMatched ? "Đã khớp" : "Chưa khớp"}
                    </span>
                  </div>
                  {tx.matchedSessionCode && (
                    <div style={{ fontSize: "0.7rem", color: "var(--muted-foreground)" }}>
                      Phiên: {tx.matchedSessionCode}
                    </div>
                  )}
                </td>
                <td style={{ fontSize: "0.8rem", color: "var(--muted-foreground)" }}>
                  {tx.matchedMemberCode ?? "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {transactions.length === 0 && (
          <div style={{ padding: "60px 24px", textAlign: "center" }}>
            <ArrowLeftRight size={48} style={{ margin: "0 auto 16px", opacity: 0.3, display: "block" }} />
            <div style={{ fontWeight: 600, color: "var(--muted-foreground)" }}>Chưa có giao dịch nào</div>
            <p style={{ color: "var(--muted-foreground)", fontSize: "0.85rem", marginTop: "8px" }}>
              Giao dịch sẽ xuất hiện ở đây sau khi SePay Webhook được cấu hình và có chuyển khoản vào tài khoản Vietcombank
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
