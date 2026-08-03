import { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Không có quyền truy cập — FC Manager",
};

export default function UnauthorizedPage() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--gradient-hero)",
        padding: "24px",
      }}
    >
      <div
        className="glass-card animate-fade-in"
        style={{ maxWidth: "420px", width: "100%", padding: "48px 40px", textAlign: "center" }}
      >
        <div style={{ fontSize: "48px", marginBottom: "16px" }}>🚫</div>
        <h1 style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--card-foreground)", marginBottom: "8px" }}>
          Không có quyền truy cập
        </h1>
        <p style={{ color: "var(--muted-foreground)", fontSize: "0.9rem", lineHeight: 1.6, marginBottom: "32px" }}>
          Email của bạn chưa được Admin cấp quyền truy cập vào hệ thống FC Manager.
          <br /><br />
          Vui lòng liên hệ đội trưởng để được thêm vào danh sách cho phép.
        </p>
        <Link href="/login" className="btn btn-primary" style={{ justifyContent: "center" }}>
          Thử đăng nhập lại
        </Link>
      </div>
    </div>
  );
}
