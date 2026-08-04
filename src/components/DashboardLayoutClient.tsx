"use client";

import { useState } from "react";
import { Sidebar } from "@/components/Sidebar";
import { Header } from "@/components/Header";
import { ToastContainer } from "@/components/Toast";

interface DashboardLayoutClientProps {
  userRole: string;
  userName?: string | null;
  userImage?: string | null;
  userEmail?: string | null;
  children: React.ReactNode;
}

export function DashboardLayoutClient({
  userRole,
  userName,
  userImage,
  userEmail,
  children,
}: DashboardLayoutClientProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleToggleSidebar = () => {
    // Nếu trên Mobile -> toggle Mobile Drawer
    if (window.innerWidth < 768) {
      setMobileOpen((prev) => !prev);
    } else {
      // Nếu trên Desktop -> toggle Collapse / Expand
      setIsCollapsed((prev) => !prev);
    }
  };

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <ToastContainer />
      <Sidebar
        userRole={userRole}
        userName={userName}
        userImage={userImage}
        userEmail={userEmail}
        isCollapsed={isCollapsed}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
      />
      <main
        style={{
          flex: 1,
          overflowY: "auto",
          minHeight: "100vh",
          padding: "20px",
        }}
        className="main-layout-container"
      >
        <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
          <Header
            userName={userName}
            userImage={userImage}
            userEmail={userEmail}
            userRole={userRole}
            isSidebarCollapsed={isCollapsed}
            onToggleSidebar={handleToggleSidebar}
          />
          {children}
        </div>
      </main>
    </div>
  );
}
