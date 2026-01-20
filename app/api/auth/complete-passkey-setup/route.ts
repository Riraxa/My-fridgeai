import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    // デバッグ情報
    const authHeader = req.headers.get("authorization");
    const cookies = req.cookies;

    console.log("[complete-passkey-setup] Auth debug:", {
      hasAuthHeader: !!authHeader,
      cookieNames: cookies.getAll().map((c) => c.name),
      userAgent: req.headers.get("user-agent")?.substring(0, 50),
    });

    const token = await getToken({
      req,
      secret: process.env.NEXTAUTH_SECRET,
    });

    if (!token?.sub) {
      console.log("[complete-passkey-setup] Token validation failed:", {
        hasToken: !!token,
        tokenKeys: token ? Object.keys(token) : [],
        secretExists: !!process.env.NEXTAUTH_SECRET,
      });
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    // IP Check
    const user = await prisma.user.findUnique({
      where: { id: token.sub },
      select: { allowedIps: true },
    });

    if (user?.allowedIps && user.allowedIps.length > 0) {
      const ip = req.headers.get("x-forwarded-for") || "127.0.0.1";
      // Simple check, in production might need refined IP extraction
      if (!user.allowedIps.includes(ip)) {
        return NextResponse.json(
          { error: "許可されていないIPからの操作です" },
          { status: 403 },
        );
      }
    }

    await prisma.user.update({
      where: { id: token.sub },
      data: { passkeySetupCompleted: true },
    });

    console.info("passkey setup completed", { userId: token.sub });

    return NextResponse.json({ ok: true, message: "パスキー登録完了" });
  } catch (error) {
    console.error("complete-passkey-setup error:", error);
    return NextResponse.json(
      { error: "サーバーエラーが発生しました" },
      { status: 500 },
    );
  }
}
