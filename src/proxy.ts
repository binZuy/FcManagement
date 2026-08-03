import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

// Next.js 16 uses "proxy" instead of "middleware"
export const proxy = auth((req) => {
  const isLoggedIn = !!req.auth;
  const pathname = req.nextUrl.pathname;

  const isAdminPath = pathname.startsWith("/admin");

  if (!isLoggedIn && isAdminPath) {
    return NextResponse.redirect(new URL("/login", req.nextUrl));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
