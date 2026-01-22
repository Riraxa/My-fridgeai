// app/api/household/join/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
  });
  if (!token?.sub) {
    return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
  }

  const userId = token.sub;
  const { token: inviteToken } = await req.json();

  if (!inviteToken) {
    return NextResponse.json(
      { error: "招待トークンが必要です。" },
      { status: 400 },
    );
  }

  try {
    const invite = await prisma.householdInvite.findUnique({
      where: { token: inviteToken },
      include: { household: true },
    });

    if (!invite || invite.revoked || invite.expiresAt < new Date()) {
      return NextResponse.json(
        { error: "無効または期限切れの招待リンクです。" },
        { status: 400 },
      );
    }

    // 既にメンバーかチェック
    const existing = await prisma.householdMember.findUnique({
      where: {
        householdId_userId: {
          householdId: invite.householdId,
          userId,
        },
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: "既に参加済みです。" },
        { status: 400 },
      );
    }

    // メンバー追加
    await prisma.householdMember.create({
      data: {
        householdId: invite.householdId,
        userId,
        role: "MEMBER",
      },
    });

    return NextResponse.json({
      success: true,
      householdId: invite.householdId,
    });
  } catch (e) {
    console.error("Join error:", e);
    return NextResponse.json(
      { error: "グループへの参加に失敗しました。" },
      { status: 500 },
    );
  }
}
