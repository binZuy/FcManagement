import { signIn } from "@/lib/auth";
import { Metadata } from "next";
import Link from "next/link";
import { Home } from "lucide-react";

export const metadata: Metadata = {
  title: "Đăng nhập — FC Manager",
};

export default function LoginPage() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--gradient-hero)",
        padding: "24px",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Background decoration */}
      <div
        style={{
          position: "absolute",
          width: "600px",
          height: "600px",
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(34,197,94,0.08) 0%, transparent 70%)",
          top: "-200px",
          right: "-200px",
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "absolute",
          width: "400px",
          height: "400px",
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(34,197,94,0.05) 0%, transparent 70%)",
          bottom: "-100px",
          left: "-100px",
          pointerEvents: "none",
        }}
      />

      <div
        className="glass-card glow-green animate-fade-in"
        style={{
          maxWidth: "420px",
          width: "100%",
          padding: "48px 40px",
          textAlign: "center",
          position: "relative",
        }}
      >
        {/* Logo */}
        <div
          style={{
            width: "72px",
            height: "72px",
            borderRadius: "20px",
            background: "var(--gradient-primary)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 24px",
            fontSize: "32px",
            boxShadow: "0 8px 20px rgba(34,197,94,0.3)",
          }}
        >
          ⚽
        </div>

        <h1
          style={{
            fontSize: "1.65rem",
            fontWeight: 800,
            color: "var(--card-foreground)",
            marginBottom: "6px",
          }}
        >
          FC Manager
        </h1>
        <p
          style={{
            color: "var(--muted-foreground)",
            fontSize: "0.88rem",
            marginBottom: "32px",
            lineHeight: 1.5,
          }}
        >
          Hệ thống quản lý đội bóng
        </p>

        <form
          action={async () => {
            "use server";
            await signIn("google", { redirectTo: "/" });
          }}
        >
          <button
            type="submit"
            className="btn-login-google"
            style={{
              width: "100%",
              padding: "14px 24px",
              borderRadius: "var(--radius)",
              background: "white",
              color: "#1f2937",
              border: "none",
              fontSize: "0.9rem",
              fontWeight: 700,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "12px",
              transition: "all 0.2s",
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
            Đăng nhập với Google
          </button>
        </form>

        {/* Nút về Dashboard phía dưới */}
        <div style={{ marginTop: "24px", paddingTop: "20px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          <Link
            href="/"
            style={{
              color: "var(--primary)",
              fontSize: "0.85rem",
              fontWeight: 600,
              textDecoration: "none",
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <Home size={15} />
            <span>Tiếp tục xem với vai trò Khách ➔</span>
          </Link>
        </div>

        <p
          style={{
            marginTop: "20px",
            fontSize: "0.75rem",
            color: "var(--muted-foreground)",
            lineHeight: 1.5,
          }}
        >
          Chỉ các email được Admin cấp quyền mới có thể đăng nhập
        </p>
      </div>
    </div>
  );
}
