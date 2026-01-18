// app/api/household/create/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";
import { getUserPlan } from "@/lib/billing";

export async function POST(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token)
    return NextResponse.json({ error: "認証が必要です" }, { status: 401 });

  const userId = token.sub as string;
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
