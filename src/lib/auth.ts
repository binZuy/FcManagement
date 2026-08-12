import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";
import { generateMemberCode } from "@/lib/utils";

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "database" },
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID!,
      clientSecret: process.env.AUTH_GOOGLE_SECRET!,
    }),
  ],
  callbacks: {
    async signIn({ user }) {
      if (!user.email) return false;
      // Cho phép tất cả tài khoản Google đăng nhập
      return true;
    },
    async session({ session, user, token }: any) {
      if (session?.user) {
        // Lấy userId hoặc email an toàn từ user object (Database strategy) hoặc token/session
        const userId = user?.id || (token?.sub as string) || (token?.id as string) || session.user.id;
        const userEmail = session.user.email || user?.email || (token?.email as string);

        let dbUser = null;
        if (userId) {
          dbUser = await prisma.user.findUnique({
            where: { id: userId },
            include: { member: true },
          });
        }
        if (!dbUser && userEmail) {
          dbUser = await prisma.user.findUnique({
            where: { email: userEmail },
            include: { member: true },
          });
        }

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
          session.user.role = dbUser.role; // Gán đúng role ADMIN / MEMBER từ DB
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
