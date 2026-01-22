// app/api/household/invite/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";
import { generateSecureRandomString } from "@/lib/security";

const INVITE_BASE_URL = `${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/household/join`;

export async function GET(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token?.sub) {
    return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
  }

  const userId = token.sub;

  const household = await prisma.household.findFirst({
    where: { ownerId: userId },
  });

  if (!household) {
    return NextResponse.json({ invite: null });
  }

  // 有効な（revoked=false かつ 期限内）最新の招待を取得
  const activeInvite = await prisma.householdInvite.findFirst({
    where: {
      householdId: household.id,
      revoked: false,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: "desc" },
  });

  if (!activeInvite) {
    return NextResponse.json({ invite: null });
  }

  return NextResponse.json({
    invite: {
      inviteUrl: `${INVITE_BASE_URL}?token=${activeInvite.token}`,
      expiresAt: activeInvite.expiresAt,
    },
  });
}

export async function POST(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token?.sub) {
    return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
  }

  const userId = token.sub;

  // ユーザーがHouseholdのOwnerかチェック
  const household = await prisma.household.findFirst({
    where: { ownerId: userId },
  });

  if (!household) {
    return NextResponse.json(
      { error: "家族グループのOwnerではありません。" },
      { status: 403 },
    );
  }

  try {
    // 既存の招待をすべて無効化 (revoked=true)
    await prisma.householdInvite.updateMany({
      where: { householdId: household.id, revoked: false },
      data: { revoked: true },
    });

    const inviteToken = generateSecureRandomString(32);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7日間有効

    const newInvite = await prisma.householdInvite.create({
      data: {
        householdId: household.id,
        token: inviteToken,
        expiresAt,
        revoked: false,
      },
    });

    // 招待リンクを返す
    const inviteUrl = `${INVITE_BASE_URL}?token=${inviteToken}`;
    return NextResponse.json({ inviteUrl, expiresAt: newInvite.expiresAt });
  } catch (e) {
    console.error("Invite generation error:", e);
    return NextResponse.json(
      { error: "招待リンクの生成に失敗しました。" },
      { status: 500 },
    );
  }
}
