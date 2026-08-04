import { auth } from "@/lib/auth";
import { DashboardLayoutClient } from "@/components/DashboardLayoutClient";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  return (
    <DashboardLayoutClient
      userRole={session?.user?.role ?? "GUEST"}
      userName={session?.user?.name}
      userImage={session?.user?.image}
      userEmail={session?.user?.email}
    >
      {children}
    </DashboardLayoutClient>
  );
}
