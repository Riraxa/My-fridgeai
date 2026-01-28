import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

/**
 * GET /api/auth/webauthn/passkeys
 * Retrieve all passkeys for authenticated user
 */
export async function GET(req: NextRequest) {
  try {
    const token = await getToken({
      req,
      secret: process.env.NEXTAUTH_SECRET,
      secureCookie: process.env.NODE_ENV === "production",
    });

    if (!token?.sub) {
      return NextResponse.json(
        { ok: false, message: "認証が必要です" },
        { status: 401 },
      );
    }

    // IP Check
    const user = await prisma.user.findUnique({
      where: { id: token.sub },
      select: { allowedIps: true },
    });

    if (user?.allowedIps && user.allowedIps.length > 0) {
      const ip = req.headers.get("x-forwarded-for") || "127.0.0.1";
      if (!user.allowedIps.includes(ip)) {
        return NextResponse.json(
          { ok: false, message: "許可されていないIPからの操作です" },
          { status: 403 },
        );
      }
    }

    const passkeys = await prisma.passkey.findMany({
      where: { userId: token.sub },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        createdAt: true,
        userAgent: true,
        transports: true,
      },
    });

    return NextResponse.json({
      ok: true,
      passkeys,
    });
  } catch (error) {
    console.error("passkeys GET error:", error);
    return NextResponse.json(
      { ok: false, message: "パスキーの取得に失敗しました" },
      { status: 500 },
    );
  }
}
