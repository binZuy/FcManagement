"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  CalendarDays,
  Wallet,
  ArrowLeftRight,
  Settings,
  ShieldCheck,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { signOut } from "next-auth/react";
import { useState } from "react";

const navItems = [
  { href: "/", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/members", icon: Users, label: "Thành viên" },
  { href: "/matches", icon: CalendarDays, label: "Trận bóng" },
  { href: "/payments", icon: Wallet, label: "Thu tiền" },
  { href: "/transactions", icon: ArrowLeftRight, label: "Lịch sử giao dịch" },
];

const adminItems = [
  { href: "/admin/allowed-emails", icon: ShieldCheck, label: "Quản lý truy cập" },
];

interface SidebarProps {
  userRole: string;
  userName?: string | null;
  userImage?: string | null;
  userEmail?: string | null;
}

export function Sidebar({ userRole, userName, userImage, userEmail }: SidebarProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  const SidebarContent = () => (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        padding: "16px",
      }}
    >
      {/* Logo */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "12px",
          padding: "8px 8px 24px",
          borderBottom: "1px solid var(--border)",
          marginBottom: "8px",
        }}
      >
        <div
          style={{
            width: "40px",
            height: "40px",
            borderRadius: "12px",
            background: "var(--gradient-primary)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "20px",
            flexShrink: 0,
          }}
        >
          ⚽
        </div>
        <div>
          <div style={{ fontWeight: 700, fontSize: "1rem", color: "var(--card-foreground)" }}>
            FC Manager
          </div>
          <div style={{ fontSize: "0.7rem", color: "var(--muted-foreground)" }}>
            Quản lý Đội Bóng
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, display: "flex", flexDirection: "column", gap: "2px" }}>
        {navItems.map(({ href, icon: Icon, label }) => (
          <Link
            key={href}
            href={href}
            className={`nav-item ${isActive(href) ? "active" : ""}`}
            onClick={() => setMobileOpen(false)}
          >
            <Icon size={18} />
            {label}
          </Link>
        ))}

        {userRole === "ADMIN" && (
          <>
            <div
              style={{
                fontSize: "0.7rem",
                fontWeight: 600,
                color: "var(--muted-foreground)",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                padding: "16px 14px 4px",
              }}
            >
              Admin
            </div>
            {adminItems.map(({ href, icon: Icon, label }) => (
              <Link
                key={href}
                href={href}
                className={`nav-item ${isActive(href) ? "active" : ""}`}
                onClick={() => setMobileOpen(false)}
              >
                <Icon size={18} />
                {label}
              </Link>
            ))}
          </>
        )}
      </nav>

      {/* User info + logout */}
      <div
        style={{
          borderTop: "1px solid var(--border)",
          paddingTop: "16px",
          display: "flex",
          flexDirection: "column",
          gap: "8px",
        }}
      >
        {userRole === "GUEST" ? (
          <Link
            href="/login"
            className="nav-item"
            style={{ width: "100%", justifyContent: "center", background: "var(--primary)", color: "var(--primary-foreground)" }}
          >
            Đăng nhập / Đăng ký
          </Link>
        ) : (
          <>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                padding: "8px",
              }}
            >
              {userImage ? (
                <img
                  src={userImage}
                  alt={userName ?? ""}
                  style={{ width: 36, height: 36, borderRadius: "50%", border: "2px solid var(--primary)" }}
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
                    fontSize: "16px",
                    fontWeight: 700,
                    color: "white",
                  }}
                >
                  {userName?.[0]?.toUpperCase() ?? "U"}
                </div>
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: "0.85rem",
                    fontWeight: 600,
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
            </div>
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="nav-item"
              style={{ width: "100%", background: "none", border: "none" }}
            >
              <LogOut size={18} />
              Đăng xuất
            </button>
          </>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        style={{
          width: "240px",
          flexShrink: 0,
          borderRight: "1px solid var(--border)",
          background: "var(--card)",
          height: "100vh",
          position: "sticky",
          top: 0,
          overflowY: "auto",
        }}
        className="hidden md:block"
      >
        <SidebarContent />
      </aside>

      {/* Mobile menu button */}
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        style={{
          position: "fixed",
          top: "16px",
          left: "16px",
          zIndex: 50,
          width: "40px",
          height: "40px",
          borderRadius: "10px",
          background: "var(--card)",
          border: "1px solid var(--border)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          color: "var(--foreground)",
        }}
        className="md:hidden"
      >
        {mobileOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Mobile sidebar overlay */}
      {mobileOpen && (
        <>
          <div
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.7)",
              zIndex: 40,
            }}
            onClick={() => setMobileOpen(false)}
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
            <SidebarContent />
          </aside>
        </>
      )}
    </>
  );
}
