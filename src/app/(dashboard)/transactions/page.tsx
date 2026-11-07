import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { TransactionsList, TransactionRowData } from "@/components/TransactionsList";

export default async function TransactionsPage() {
  await auth();

  const [rawTransactions, members] = await Promise.all([
    prisma.sepayTransaction.findMany({
      orderBy: { transactionDate: "desc" },
      take: 150,
      include: {
        paymentRecord: {
          include: {
            session: {
              include: { match: true },
            },
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
            items: {
              include: {
                record: {
                  include: {
                    session: {
                      include: { match: true },
                    },
                  },
                },
              },
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

  // Lấy các bundle code chưa được link qua quan hệ 1-1 sepayTxId
  const unlinkedBundleCodes = Array.from(
    new Set(
      rawTransactions
        .filter((tx) => !tx.paymentBundle && tx.matchedBundleCode)
        .map((tx) => tx.matchedBundleCode!)
    )
  );

  const fallbackBundles = unlinkedBundleCodes.length > 0
    ? await prisma.paymentBundle.findMany({
        where: {
          bundleCode: { in: unlinkedBundleCodes },
        },
        include: {
          member: {
            include: { user: { select: { name: true, email: true, image: true } } },
          },
          items: {
            include: {
              record: {
                include: {
                  session: {
                    include: { match: true },
                  },
                },
              },
            },
          },
        },
      })
    : [];

  const bundleByCode = new Map(fallbackBundles.map((b) => [b.bundleCode.toUpperCase(), b]));

  // Format transactions thành plain objects truyền cho Client Component
  const transactions: TransactionRowData[] = rawTransactions.map((tx) => {
    const bundleData =
      tx.paymentBundle ||
      (tx.matchedBundleCode ? bundleByCode.get(tx.matchedBundleCode.toUpperCase()) : null);

    const member =
      tx.paymentRecord?.member ||
      bundleData?.member ||
      (tx.matchedMemberId ? memberById.get(tx.matchedMemberId) : null) ||
      (tx.matchedMemberCode ? memberByCode.get(tx.matchedMemberCode.toUpperCase()) : null);

    const formattedBundle = bundleData
      ? {
          id: bundleData.id,
          bundleCode: bundleData.bundleCode,
          totalAmount: bundleData.totalAmount,
          status: bundleData.status,
          paidAt: bundleData.paidAt?.toISOString() ?? null,
          createdAt: bundleData.createdAt?.toISOString() ?? null,
          items: bundleData.items.map((item) => ({
            id: item.id,
            recordId: item.recordId,
            sessionCode: item.record.session?.code ?? "—",
            sessionTitle: item.record.session?.title ?? "—",
            sessionType: item.record.session?.type ?? "MATCH_FEE",
            matchId: item.record.session?.match?.id ?? null,
            matchDate: item.record.session?.match?.matchDate?.toISOString() ?? null,
            amountRequired: item.record.amountRequired,
            amountPaid: item.record.amountPaid,
            status: item.record.status,
            note: item.record.note,
          })),
        }
      : null;

    const formattedSession = tx.paymentRecord?.session
      ? {
          code: tx.paymentRecord.session.code,
          title: tx.paymentRecord.session.title,
          type: tx.paymentRecord.session.type,
          matchId: tx.paymentRecord.session.match?.id ?? null,
          matchDate: tx.paymentRecord.session.match?.matchDate?.toISOString() ?? null,
          amountRequired: tx.paymentRecord.amountRequired,
          amountPaid: tx.paymentRecord.amountPaid,
          status: tx.paymentRecord.status,
          note: tx.paymentRecord.note,
        }
      : null;

    return {
      id: tx.id,
      sepayId: tx.sepayId,
      gateway: tx.gateway,
      accountNumber: tx.accountNumber,
      transferAmount: tx.transferAmount,
      content: tx.content,
      referenceCode: tx.referenceCode,
      transactionDate: tx.transactionDate.toISOString(),
      createdAt: tx.createdAt.toISOString(),
      isMatched: tx.isMatched,
      matchedMemberId: tx.matchedMemberId,
      matchedMemberCode: tx.matchedMemberCode,
      matchedSessionCode: tx.matchedSessionCode,
      matchedBundleCode: tx.matchedBundleCode,
      member: member
        ? {
            id: member.id,
            code: member.code,
            name: member.user?.name ?? null,
            image: member.user?.image ?? null,
          }
        : null,
      bundle: formattedBundle,
      session: formattedSession,
    };
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      <div>
        <h1 style={{ fontSize: "1.75rem", fontWeight: 800, color: "var(--card-foreground)", marginBottom: "4px" }}>
          Lịch sử chuyển khoản
        </h1>
        <p style={{ color: "var(--muted-foreground)", fontSize: "0.85rem" }}>
          Danh sách giao dịch nhận tiền qua SePay Webhook và chi tiết các trận đấu theo Bundle
        </p>
      </div>

      <TransactionsList initialTransactions={transactions} />
    </div>
  );
}
