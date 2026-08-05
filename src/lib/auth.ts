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

      // 1. Nếu là ADMIN_EMAIL thì luôn luôn được phép đăng nhập (không cần seed trước)
      if (process.env.ADMIN_EMAIL && user.email === process.env.ADMIN_EMAIL) {
        return true;
      }

      // 2. Kiểm tra email trong whitelist đối với các thành viên khác
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
          include: { member: true },
        });

        if (dbUser && isAdminEmail && dbUser.role !== "ADMIN") {
          dbUser = await prisma.user.update({
            where: { id: user.id },
            data: { role: "ADMIN" },
            include: { member: true },
          });
        }

        // TỰ ĐỘNG TẠO MEMBER PROFILE NẾU CHƯA CÓ (áp dụng cho Admin và AllowedEmails)
        if (dbUser && !dbUser.member) {
          const { generateMemberCode } = await import("@/lib/utils");
          const baseCode = generateMemberCode(dbUser.name || "MB");
          const randSuffix = Math.floor(100 + Math.random() * 900);
          const memberCode = `${baseCode}${randSuffix}`;

          await prisma.member.create({
            data: {
              userId: dbUser.id,
              code: memberCode,
            }
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
