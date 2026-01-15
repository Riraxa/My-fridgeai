// middleware.ts
import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { validateJWTToken } from "@/lib/security";
import { addSecurityHeaders } from "@/lib/securityHeaders";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  console.log("🔍 [middleware] Processing path:", pathname);

  /* =========================
     1. 完全に除外するパス
  ========================= */

  if (pathname.startsWith("/api/auth")) {
    console.log("✅ [middleware] /api/auth - allowed");
    return NextResponse.next();
  }

  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/static") ||
    pathname === "/favicon.ico" ||
    pathname.match(/\.(png|jpg|jpeg|svg|ico|css|js)$/)
  ) {
    console.log("✅ [middleware] Static asset - allowed");
    return NextResponse.next();
  }

  if (pathname.startsWith("/api")) {
    console.log("✅ [middleware] /api - allowed");
    return NextResponse.next();
  }

  /* =========================
     2. 公開ページ
  ========================= */

  const publicPaths = [
    "/login",
    "/register",
    "/terms",
    "/privacy",
    "/reset-password",
  ];
  const isPublic = publicPaths.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
  if (isPublic) {
    console.log("✅ [middleware] Public path - allowed");
    return NextResponse.next();
  }

  /* =========================
     3. 認証チェック
  ========================= */

  let token = null;
  try {
    console.log("🔍 [middleware] Attempting getToken...");
    token = await getToken({
      req,
      secret: process.env.NEXTAUTH_SECRET,
      secureCookie: process.env.NODE_ENV === "production",
    });
    console.log("🔍 [middleware] getToken result:", !!token);
  } catch (err) {
    console.error("❌ [middleware] getToken error:", err);
    const response = NextResponse.redirect(new URL("/login", req.url));
    return addSecurityHeaders(response);
  }

  // 追加のJWT検証
  if (token) {
    console.log("🔍 [middleware] Validating token...");
    const tokenValidation = validateJWTToken(token);
    console.log("🔍 [middleware] Token validation:", tokenValidation.valid);
    if (!tokenValidation.valid) {
      console.warn("[middleware] Invalid token:", tokenValidation.error);
      const response = NextResponse.redirect(new URL("/login", req.url));
      return addSecurityHeaders(response);
    }
  }

  if (!token) {
    console.log("❌ [middleware] No token found - redirecting to login");
    const loginUrl = new URL("/login", req.url);
    const response = NextResponse.redirect(loginUrl);
    return addSecurityHeaders(response);
  }

  console.log("✅ [middleware] Token valid - allowing access");
  const response = NextResponse.next();
  return addSecurityHeaders(response);
}

export const config = {
  matcher: ["/((?!api|_next|static|favicon.ico).*)"],
};
