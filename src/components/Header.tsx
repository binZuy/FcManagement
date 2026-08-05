"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, ChevronRight, Menu, X, LogOut } from "lucide-react";
import { signOut } from "next-auth/react";

interface HeaderProps {
  userName?: string | null;
  userImage?: string | null;
  userEmail?: string | null;
  userRole?: string;
  isSidebarCollapsed: boolean;
  onToggleSidebar: () => void;
}

const ROUTE_NAMES: Record<string, string> = {
  "": "Trang chủ",
  members: "Thành viên",
  matches: "Trận bóng",
  payments: "Thu tiền",
  transactions: "Lịch sử ",
  admin: "Quản trị",
  "allowed-emails": "Quản lý truy cập",
  new: "Tạo mới",
  import: "Import CSV",
  edit: "Chỉnh sửa",
};

export function Header({
  userName,
  userImage,
  userRole,
  isSidebarCollapsed,
  onToggleSidebar,
}: HeaderProps) {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);

  return (
    <header
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "12px 18px",
        background: "rgba(17, 24, 39, 0.85)",
        backdropFilter: "blur(12px)",
        border: "1px solid var(--border)",
        borderRadius: "12px",
        marginBottom: "20px",
        boxShadow: "0 4px 20px rgba(0, 0, 0, 0.2)",
      }}
    >
      {/* Góc trái: Nút Toggle Sidebar + Nút Home + Breadcrumbs */}
      <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "nowrap", overflow: "hidden", minWidth: 0 }}>

        {/* 1. NÚT TOGGLE MENU SIDEBAR (Thu nhỏ/Mở rộng trên Web & Bật/Tắt Menu trên Mobile) */}
        <button
          onClick={onToggleSidebar}
          style={{
            gap: "6px",
            padding: "6px",
            borderRadius: "8px",
            background: "rgba(30, 41, 59, 0.6)",
            border: "1px solid var(--border)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            color: "var(--foreground)",
            transition: "all 0.2s",
          }}
          title={isSidebarCollapsed ? "Mở rộng Menu Sidebar" : "Thu nhỏ Menu Sidebar"}
          aria-label="Toggle Sidebar"
        >
          <Menu size={15} />
        </button>

        {/* 2. NÚT TRANG CHỦ (Home) */}
        <Link
          href="/"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            padding: "6px",
            borderRadius: "8px",
            background: pathname === "/" ? "rgba(34,197,94,0.15)" : "rgba(30,41,59,0.5)",
            border: pathname === "/" ? "1px solid rgba(34,197,94,0.4)" : "1px solid var(--border)",
            color: pathname === "/" ? "var(--primary)" : "var(--card-foreground)",
            textDecoration: "none",
            fontSize: "0.82rem",
            fontWeight: 700,
            transition: "all 0.2s",
          }}
          title="Trang chủ"
        >
          <Home size={15} color={pathname === "/" ? "#22c55e" : "currentColor"} />
        </Link>

        {/* 3. BREADCRUMBS TÊN TRANG */}
        {segments.length > 0 && (
          <div style={{ display: "flex", alignItems: "center", fontSize: "0.82rem", color: "var(--muted-foreground)", flexWrap: "nowrap", overflow: "hidden" }}>
            <ChevronRight size={14} opacity={0.4} style={{ flexShrink: 0 }} />
            {segments.map((segment, idx) => {
              const url = "/" + segments.slice(0, idx + 1).join("/");
              const isLast = idx === segments.length - 1;

              // Nếu segment là 1 ID dài (độ dài > 12 ký tự) -> đổi tên hiển thị thành 'Chi tiết' hoặc rút gọn
              let displayName = ROUTE_NAMES[segment] ?? segment;
              if (segment.length > 12 && !ROUTE_NAMES[segment]) {
                displayName = "Chi tiết";
              }

              return (
                <div key={url} style={{ display: "flex", alignItems: "center", flexShrink: 0 }}>
                  {isLast ? (
                    <span
                      style={{
                        fontWeight: 700,
                        color: "var(--card-foreground)",
                        maxWidth: "140px",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        display: "inline-block",
                      }}
                    >
                      {displayName}
                    </span>
                  ) : (
                    <Link
                      href={url}
                      style={{ color: "var(--muted-foreground)", textDecoration: "none" }}
                    >
                      {displayName}
                    </Link>
                  )}
                  {!isLast && <ChevronRight size={14} opacity={0.4} style={{ flexShrink: 0 }} />}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Góc phải: Thông tin User / Đăng nhập */}
      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        {userRole === "GUEST" ? (
          <Link
            href="/login"
            className="btn btn-primary"
            style={{ padding: "6px", fontSize: "0.7rem", fontWeight: 700 }}
          >
            Đăng nhập
          </Link>
        ) : (
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            {userImage ? (
              <img
                src={userImage}
                alt=""
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: "50%",
                  border: "2px solid var(--primary)",
                  objectFit: "cover",
                }}
              />
            ) : (
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: "50%",
                  background: "var(--gradient-primary)",
                  color: "white",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "13px",
                  fontWeight: 800,
                }}
              >
                {userName?.[0]?.toUpperCase() ?? "U"}
              </div>
            )}
            <span
              style={{
                fontSize: "0.85rem",
                fontWeight: 700,
                color: "var(--card-foreground)",
              }}
              className="hidden sm:inline"
            >
              {userName}
            </span>
          </div>
        )}
      </div>
    </header>
  );
}
