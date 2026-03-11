import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(_req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
  }

  const userId = session.user.id;

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
