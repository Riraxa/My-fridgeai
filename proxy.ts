// proxy.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // NextAuth パス
  if (pathname.startsWith("/api/auth")) {
    return NextResponse.next();
  }

  // 静的ファイル・Next.js内部
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/static") ||
    pathname === "/favicon.ico"
  ) {
    return NextResponse.next();
  }

  // 公開ページ
  const publicPaths = [
    "/",
    "/features",
    "/login",
    "/register",
    "/terms",
    "/privacy",
    "/tokusho",
    "/reset-password",
    "/robots.txt",
    "/sitemap.xml",
  ];
  if (publicPaths.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return NextResponse.next();
  }

  // API と保護ページはそのまま通す
  // 認証はクライアント側（/home）で処理
  return NextResponse.next();
}

export const config = {
  matcher: ["/:path*"],
};
