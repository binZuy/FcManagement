"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  CalendarDays,
  Wallet,
  ArrowLeftRight,
  ShieldCheck,
  LogOut,
  X,
} from "lucide-react";
import { signOut } from "next-auth/react";

const navItems = [
  { href: "/", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/members", icon: Users, label: "Thành viên" },
  { href: "/matches", icon: CalendarDays, label: "Trận bóng" },
  { href: "/payments", icon: Wallet, label: "Thu tiền" },
  { href: "/transactions", icon: ArrowLeftRight, label: "Lịch sử" },
];

const adminItems = [
  { href: "/admin/allowed-emails", icon: ShieldCheck, label: "Quản lý truy cập" },
];

interface SidebarProps {
  userRole: string;
  userName?: string | null;
  userImage?: string | null;
  userEmail?: string | null;
  isCollapsed: boolean;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

export function Sidebar({
  userRole,
  userName,
  userImage,
  userEmail,
  isCollapsed,
  mobileOpen,
  onCloseMobile,
}: SidebarProps) {
  const pathname = usePathname();

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  const SidebarContent = ({ collapsed = false }: { collapsed?: boolean }) => (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        padding: collapsed ? "16px 8px" : "16px",
      }}
    >
      {/* Logo — Link trực tiếp về Trang chủ (Home) */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: collapsed ? "8px 4px 20px" : "8px 8px 20px",
          borderBottom: "1px solid var(--border)",
          marginBottom: "12px",
        }}
      >
        <Link
          href="/"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            textDecoration: "none",
            justifyContent: collapsed ? "center" : "flex-start",
            width: "100%",
          }}
          title="Về trang chủ Dashboard"
        >
          <div
            style={{
              width: "38px",
              height: "38px",
              borderRadius: "10px",
              background: "var(--gradient-primary)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "18px",
              flexShrink: 0,
              boxShadow: "0 4px 12px rgba(34,197,94,0.3)",
            }}
          >
            ⚽
          </div>
          {!collapsed && (
            <div>
              <div style={{ fontWeight: 800, fontSize: "1.05rem", color: "var(--card-foreground)", lineHeight: 1.2 }}>
                FC Manager
              </div>
              <div style={{ fontSize: "0.72rem", color: "var(--primary)", fontWeight: 600, marginTop: "2px" }}>
                Quản lý Đội Bóng
              </div>
            </div>
          )}
        </Link>
      </div>

      {/* Nav links */}
      <nav style={{ flex: 1, display: "flex", flexDirection: "column", gap: "4px" }}>
        {navItems.map(({ href, icon: Icon, label }) => {
          const active = isActive(href);
          return (
            <Link
              key={href}
              href={href}
              className={`nav-item ${active ? "active" : ""}`}
              style={{
                justifyContent: collapsed ? "center" : "flex-start",
                padding: collapsed ? "12px" : "10px 14px",
              }}
              onClick={onCloseMobile}
              title={collapsed ? label : undefined}
            >
              <Icon size={20} style={{ flexShrink: 0 }} />
              {!collapsed && <span>{label}</span>}
            </Link>
          );
        })}

        {userRole === "ADMIN" && (
          <>
            {!collapsed && (
              <div
                style={{
                  fontSize: "0.68rem",
                  fontWeight: 700,
                  color: "var(--muted-foreground)",
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  padding: "16px 14px 4px",
                }}
              >
                Admin
              </div>
            )}
            {adminItems.map(({ href, icon: Icon, label }) => {
              const active = isActive(href);
              return (
                <Link
                  key={href}
                  href={href}
                  className={`nav-item ${active ? "active" : ""}`}
                  style={{
                    justifyContent: collapsed ? "center" : "flex-start",
                    padding: collapsed ? "12px" : "10px 14px",
                  }}
                  onClick={onCloseMobile}
                  title={collapsed ? label : undefined}
                >
                  <Icon size={20} style={{ flexShrink: 0 }} />
                  {!collapsed && <span>{label}</span>}
                </Link>
              );
            })}
          </>
        )}
      </nav>

      {/* User profile & logout */}
      <div
        style={{
          borderTop: "1px solid var(--border)",
          paddingTop: "14px",
          display: "flex",
          flexDirection: "column",
          gap: "8px",
        }}
      >
        {userRole === "GUEST" ? (
          <Link
            href="/login"
            className="nav-item"
            style={{
              width: "100%",
              justifyContent: "center",
              background: "var(--gradient-primary)",
              color: "white",
              fontWeight: 700,
              padding: collapsed ? "10px" : "10px 14px",
            }}
            onClick={onCloseMobile}
            title={collapsed ? "Đăng nhập" : undefined}
          >
            <LogOut size={18} />
            {!collapsed && <span>Đăng nhập</span>}
          </Link>
        ) : (
          <>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                padding: collapsed ? "4px" : "6px 8px",
                justifyContent: collapsed ? "center" : "flex-start",
              }}
            >
              {userImage ? (
                <img
                  src={userImage}
                  alt=""
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: "50%",
                    border: "2px solid var(--primary)",
                    objectFit: "cover",
                    flexShrink: 0,
                  }}
                />
              ) : (
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: "50%",
                    background: "var(--gradient-primary)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "15px",
                    fontWeight: 800,
                    color: "white",
                    flexShrink: 0,
                  }}
                >
                  {userName?.[0]?.toUpperCase() ?? "U"}
                </div>
              )}
              {!collapsed && (
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: "0.85rem",
                      fontWeight: 700,
                      color: "var(--card-foreground)",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {userName ?? "Thành viên"}
                  </div>
                  <div
                    style={{
                      fontSize: "0.7rem",
                      color: "var(--muted-foreground)",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {userEmail}
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={() => {
                onCloseMobile();
                signOut({ callbackUrl: "/login" });
              }}
              className="nav-item"
              style={{
                width: "100%",
                background: "none",
                border: "none",
                justifyContent: collapsed ? "center" : "flex-start",
                padding: collapsed ? "10px" : "8px 14px",
              }}
              title={collapsed ? "Đăng xuất" : undefined}
            >
              <LogOut size={18} style={{ flexShrink: 0 }} />
              {!collapsed && <span>Đăng xuất</span>}
            </button>
          </>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* 💻 DESKTOP SIDEBAR */}
      <aside
        style={{
          width: isCollapsed ? "72px" : "240px",
          flexShrink: 0,
          borderRight: "1px solid var(--border)",
          background: "var(--card)",
          height: "100vh",
          position: "sticky",
          top: 0,
          overflowY: "auto",
          transition: "width 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
          zIndex: 30,
        }}
        className="hidden md:block"
      >
        <SidebarContent collapsed={isCollapsed} />
      </aside>

      {/* 📱 MOBILE SIDEBAR DRAWER OVERLAY */}
      {mobileOpen && (
        <>
          <div
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.75)",
              backdropFilter: "blur(4px)",
              zIndex: 45,
            }}
            onClick={onCloseMobile}
          />
          <aside
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              bottom: 0,
              width: "260px",
              background: "var(--card)",
              borderRight: "1px solid var(--border)",
              zIndex: 50,
              overflowY: "auto",
            }}
            className="animate-slide-in"
          >
            <SidebarContent collapsed={false} />
          </aside>
        </>
      )}
    </>
  );
}
