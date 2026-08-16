import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";

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
          });
        }
        if (!dbUser && userEmail) {
          dbUser = await prisma.user.findUnique({
            where: { email: userEmail },
          });
        }

        if (dbUser) {
          session.user.id = dbUser.id;
          session.user.role = dbUser.role; // Gán đúng role ADMIN / MEMBER từ DB (mặc định là MEMBER)
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
