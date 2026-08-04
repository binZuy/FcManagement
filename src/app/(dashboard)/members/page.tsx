import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import Link from "next/link";
import { UserPlus } from "lucide-react";
import { MembersList } from "@/components/MembersList";

export default async function MembersPage() {
  const session = await auth();
  const isAdmin = session?.user?.role === "ADMIN";

  const members = await prisma.member.findMany({
    include: {
      user: { select: { name: true, email: true, image: true, phone: true } },
      _count: {
        select: {
          attendances: true,
          paymentRecords: { where: { status: "PAID" } },
        },
      },
    },
    orderBy: [{ status: "asc" }, { user: { name: "asc" } }],
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "28px" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "16px" }}>
        <div>
          <h1 style={{ fontSize: "1.75rem", fontWeight: 800, color: "var(--card-foreground)", marginBottom: "4px" }}>
            Thành viên
          </h1>
          <p style={{ color: "var(--muted-foreground)", fontSize: "0.9rem" }}>
            {members.filter((m) => m.status === "ACTIVE").length} thành viên đang hoạt động
          </p>
        </div>
        {isAdmin && (
          <div style={{ display: "flex", gap: "12px" }}>
            <Link href="/members/import" className="btn btn-secondary">
              Import CSV
            </Link>
            <Link href="/members/new" className="btn btn-primary">
              <UserPlus size={18} />
              Thêm thành viên
            </Link>
          </div>
        )}
      </div>

      {/* Client-side search and scrollable table list */}
      <MembersList initialMembers={members} isAdmin={isAdmin} />
    </div>
  );
}
