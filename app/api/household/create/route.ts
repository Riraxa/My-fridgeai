import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getUserPlan } from "@/lib/billing";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "認証が必要です" }, { status: 401 });

  const userId = session.user.id;
  const plan = await getUserPlan(userId);

  if (plan !== "PRO") {
    return NextResponse.json(
      {
        error: "家族グループの作成にはProプランへのアップグレードが必要です。",
      },
      { status: 403 },
    );
  }

  // 既にOwnerとして作成済みかチェック
  const existing = await prisma.household.findFirst({
    where: { ownerId: userId },
  });

  if (existing) {
    return NextResponse.json(
      { error: "既に家族グループを作成済みです。" },
      { status: 400 },
    );
  }

  try {
    const household = await prisma.household.create({
      data: {
        ownerId: userId,
        members: {
          create: {
            userId: userId,
            role: "OWNER",
          },
        },
      },
    });

    return NextResponse.json({ household });
  } catch (e) {
    console.error("Household creation error:", e);
    return NextResponse.json(
      { error: "グループの作成に失敗しました。" },
      { status: 500 },
    );
  }
}
