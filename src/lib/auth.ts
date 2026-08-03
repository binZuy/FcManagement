import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import type { Role } from "@prisma/client";

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID!,
      clientSecret: process.env.AUTH_GOOGLE_SECRET!,
    }),
  ],
  callbacks: {
    async signIn({ user }) {
      if (!user.email) return false;

      // 1. Kiểm tra email trong whitelist
      const allowed = await prisma.allowedEmail.findUnique({
        where: { email: user.email },
      });

      if (!allowed) {
        return "/unauthorized";
      }

      return true;
    },
    async session({ session, user }) {
      if (session.user) {
        // 2. Nếu email đăng nhập khớp với ADMIN_EMAIL, tự động nâng quyền lên ADMIN trong DB
        const isAdminEmail = user.email === process.env.ADMIN_EMAIL;
        
        let dbUser = await prisma.user.findUnique({
          where: { id: user.id },
          select: { id: true, role: true },
        });

        if (dbUser && isAdminEmail && dbUser.role !== "ADMIN") {
          dbUser = await prisma.user.update({
            where: { id: user.id },
            data: { role: "ADMIN" },
            select: { id: true, role: true },
          });
        }

        if (dbUser) {
          session.user.id = dbUser.id;
          session.user.role = dbUser.role as Role;
        }
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
    error: "/unauthorized",
  },
});
