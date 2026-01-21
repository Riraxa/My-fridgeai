// app/api/auth/verify-email/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";
import { encode } from "next-auth/jwt";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";

function hashToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const token = url.searchParams.get("token");

    if (!token) {
      // JSON の場合は JSON を返す（フロント呼び出し）
      const accept = req.headers.get("accept") ?? "";
      if (accept.includes("application/json")) {
        return NextResponse.json(
          { ok: false, message: "token required" },
          { status: 400 },
        );
      }
      return NextResponse.redirect(`${BASE_URL}/verify-request?status=invalid`);
    }

    const tokenHash = hashToken(token);

    const ev = await prisma.emailVerification.findFirst({
      where: { tokenHash, used: false, expiresAt: { gt: new Date() } },
      include: { pendingUser: true, user: true },
    });

    if (!ev) {
      const accept = req.headers.get("accept") ?? "";
      if (accept.includes("application/json")) {
        return NextResponse.json(
          { ok: false, message: "invalid_or_expired" },
          { status: 400 },
        );
      }
      const redirectUrl = `${BASE_URL}/verify-request?status=invalid`;
      return NextResponse.redirect(redirectUrl);
    }

    const userEmail = ev.pendingUser?.email || ev.user?.email;
    if (!userEmail) {
      return NextResponse.redirect(`${BASE_URL}/verify-request?status=invalid`);
    }

    // mark used
    await prisma.emailVerification.update({
      where: { id: ev.id },
      data: { used: true },
    });

    if (ev.pendingUser) {
      const pending = ev.pendingUser;
      // 既存ユーザーのチェック
      const existingUser = await prisma.user.findUnique({
        where: { email: pending.email },
      });

      let userId: string;
      let email: string;

      if (existingUser) {
        await prisma.pendingUser.delete({ where: { id: pending.id } });
        await prisma.user.update({
          where: { id: existingUser.id },
          data: { emailVerified: new Date() },
        });
        userId = existingUser.id;
        email = existingUser.email!;
      } else {
        // 新規ユーザー作成
        const newUser = await prisma.user.create({
          data: {
            email: pending.email,
            name: pending.name ?? undefined,
            password: pending.password ?? undefined,
            status: "active",
            emailVerified: new Date(),
          },
        });
        await prisma.pendingUser.delete({ where: { id: pending.id } });
        userId = newUser.id;
        email = newUser.email!;
      }

      // 認証用の一時トークン（verifyToken）を生成・保存
      const authToken = crypto.randomBytes(32).toString("hex");
      await prisma.user.update({
        where: { id: userId },
        data: {
          verifyToken: authToken,
          verifyTokenCreatedAt: new Date(),
        },
      });

      // JSONリクエストの場合はトークンを返してクライアント側で signIn させる
      const accept = req.headers.get("accept") ?? "";
      if (accept.includes("application/json")) {
        return NextResponse.json({
          ok: true,
          token: authToken,
          email: email,
          redirect: "/passkey-setup",
        });
      }

      // confirm ページへリダイレクトして signIn を実行させる
      return NextResponse.redirect(
        `${BASE_URL}/verify-email/confirm?token=${authToken}&email=${encodeURIComponent(email)}`,
      );
    }

    if (ev.user) {
      await prisma.user.update({
        where: { id: ev.userId as string },
        data: { emailVerified: new Date() },
      });

      const authToken = crypto.randomBytes(32).toString("hex");
      await prisma.user.update({
        where: { id: ev.userId as string },
        data: {
          verifyToken: authToken,
          verifyTokenCreatedAt: new Date(),
        },
      });

      const userEmail = ev.user.email ?? "";
      const accept = req.headers.get("accept") ?? "";
      if (accept.includes("application/json")) {
        return NextResponse.json({
          ok: true,
          token: authToken,
          email: userEmail,
          redirect: "/passkey-setup",
        });
      }

      return NextResponse.redirect(
        `${BASE_URL}/verify-email/confirm?token=${authToken}&email=${encodeURIComponent(userEmail)}`,
      );
    }

    // Fallback
    return NextResponse.redirect(`${BASE_URL}/verify-request?status=invalid`);
  } catch (err: any) {
    console.error("[verify-email] error", err);
    return NextResponse.json(
      { ok: false, message: "server error" },
      { status: 500 },
    );
  }
}
