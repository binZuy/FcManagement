import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/Sidebar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();


  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <Sidebar
        userRole={session?.user?.role ?? "GUEST"}
        userName={session?.user?.name}
        userImage={session?.user?.image}
        userEmail={session?.user?.email}
      />
      <main
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "32px",
          minHeight: "100vh",
        }}
      >
        <div style={{ maxWidth: "1200px", margin: "0 auto" }}>{children}</div>
      </main>
    </div>
  );
}
