// app/api/auth/webauthn/passkeys/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/auth/webauthn/passkeys
 * Returns all passkeys for the current authenticated user
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json(
        { ok: false, message: "認証が必要です" },
        { status: 401 },
      );
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json(
        { ok: false, message: "ユーザーが見つかりません" },
        { status: 404 },
      );
    }

    const passkeys = await prisma.passkey.findMany({
      where: { userId: user.id },
      select: {
        id: true,
        name: true,
        createdAt: true,
        userAgent: true,
        transports: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ ok: true, passkeys });
  } catch (err) {
    console.error("[passkeys][list] error:", err);
    return NextResponse.json(
      { ok: false, message: "サーバーでエラーが発生しました" },
      { status: 500 },
    );
  }
}
