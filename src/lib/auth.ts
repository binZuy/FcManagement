import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";
import { generateMemberCode } from "@/lib/utils";

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
      // Mở hết quyền đăng nhập cho mọi email
      return true;
    },
    async session({ session, user }) {
      if (session.user) {
        let dbUser = await prisma.user.findUnique({
          where: { id: user.id },
          include: { member: true },
        });

        if (dbUser) {
          // Tự động tạo hồ sơ Member nếu chưa có
          if (!dbUser.member) {
            let code = generateMemberCode(dbUser.name ?? "FC");
            if (!code) code = "FC";
            const existingCode = await prisma.member.findUnique({ where: { code } });
            if (existingCode) code = code + Math.floor(Math.random() * 99);
            await prisma.member.create({
              data: {
                userId: dbUser.id,
                code,
                status: "ACTIVE",
              },
            });
          }

          session.user.id = dbUser.id;
          session.user.role = Role.MEMBER;
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
