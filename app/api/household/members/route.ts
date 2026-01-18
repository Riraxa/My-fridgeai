// app/api/household/members/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token)
    return NextResponse.json({ error: "認証が必要です" }, { status: 401 });

  const userId = token.sub as string;

  try {
    // ユーザーが所属しているグループを探す
    const membership = await prisma.householdMember.findFirst({
      where: { userId },
      select: { householdId: true },
    });

    if (!membership) {
      return NextResponse.json({ members: [] });
    }

    const members = await prisma.householdMember.findMany({
      where: { householdId: membership.householdId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            plan: true,
            image: true,
          },
        },
      },
    });

    return NextResponse.json({
      members: members.map((m) => ({
        userId: m.userId,
        name: m.user.name,
        email: m.user.email,
        role: m.role,
        plan: m.user.plan,
        image: m.user.image,
      })),
    });
  } catch (e) {
    console.error("Members fetch error:", e);
    return NextResponse.json(
      { error: "メンバーの一覧取得に失敗しました。" },
      { status: 500 },
    );
  }
}
