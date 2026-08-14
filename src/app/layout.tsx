import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "FC Manager — Quản lý Đội Bóng",
  description: "Hệ thống quản lý đội bóng: thành viên, lịch thi đấu, thu tiền tự động qua SePay",
  icons: {
    icon: "/football.png",
    shortcut: "/football.png",
    apple: "/football.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi" className="dark">
      <body className={`${inter.variable} font-sans antialiased`}>
        {children}
      </body>
    </html>
  );
}
