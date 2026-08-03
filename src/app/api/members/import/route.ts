import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { generateMemberCode } from "@/lib/utils";
import { Position, Role } from "@prisma/client";

// POST /api/members/import
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.role !== Role.ADMIN) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const { members } = body as {
    members: Array<{
      name: string;
      phone?: string;
      jerseyNumber?: number;
      position?: Position;
      code?: string;
    }>;
  };

  if (!Array.isArray(members) || members.length === 0) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const results = [];
  let successCount = 0;
  let failCount = 0;

  for (const item of members) {
    try {
      if (!item.name) {
        throw new Error("Tên là bắt buộc");
      }

      // 1. Create User
      const user = await prisma.user.create({
        data: {
          name: item.name,
          phone: item.phone,
          role: Role.MEMBER,
        },
      });

      // 2. Generate or use Code
      let memberCode = item.code || generateMemberCode(item.name);
      
      // Ensure code is unique
      let existingCode = await prisma.member.findUnique({ where: { code: memberCode } });
      while (existingCode) {
        memberCode = memberCode + Math.floor(Math.random() * 99).toString();
        existingCode = await prisma.member.findUnique({ where: { code: memberCode } });
      }

      // 3. Create Member
      const member = await prisma.member.create({
        data: {
          userId: user.id,
          code: memberCode,
          jerseyNumber: item.jerseyNumber ? Number(item.jerseyNumber) : undefined,
          position: item.position || undefined,
        },
      });

      results.push({ name: item.name, status: "success", member });
      successCount++;
    } catch (error: any) {
      results.push({ name: item.name, status: "error", error: error.message });
      failCount++;
    }
  }

  return NextResponse.json({
    data: {
      total: members.length,
      successCount,
      failCount,
      results,
    },
  }, { status: 201 });
}
