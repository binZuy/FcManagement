import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { LuckyWheelClient } from "@/components/LuckyWheelClient";

export const dynamic = "force-dynamic";

export default async function LuckyWheelPage() {
  const session = await auth();

  let loggedInMemberId: string | null = null;
  if (session?.user?.id) {
    const member = await prisma.member.findUnique({
      where: { userId: session.user.id },
      select: { id: true },
    });
    loggedInMemberId = member?.id ?? null;
  }

  const currentUser = session?.user
    ? {
        name: session.user.name,
        role: session.user.role || "MEMBER",
      }
    : null;

  return (
    <LuckyWheelClient
      currentUser={currentUser}
      loggedInMemberId={loggedInMemberId}
    />
  );
}
