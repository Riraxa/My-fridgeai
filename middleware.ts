// GENERATED_BY_AI: 2026-04-04 antigravity
// middleware.ts
import NextAuth from "next-auth";
import { authConfig } from "./lib/auth.config";

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const { nextUrl } = req;
  const isLoggedIn = !!req.auth;

  // 公開ルートの判定
  const isApiAuthRoute = nextUrl.pathname.startsWith("/api/auth");
  const isPublicApiRoute = nextUrl.pathname.startsWith("/api/contact");
  const isPublicRoute = [
    "/",
    "/faq",
    "/contact",
    "/how-it-works",
    "/privacy",
    "/terms",
    "/tokusho",
    "/login",
    "/register",
  ].includes(nextUrl.pathname) || nextUrl.pathname.startsWith("/features");

  // 認証関連ページ（ログイン、新規登録）
  const isAuthRoute = nextUrl.pathname === "/login" || nextUrl.pathname === "/register";

  // Auth系API、公開API、公開ページは何もしない（アクセス許可）
  if (isApiAuthRoute || isPublicApiRoute) {
    return;
  }

  // ログイン済みユーザーが再度ログイン／登録ページに来た場合はホームへ
  if (isAuthRoute) {
    if (isLoggedIn) {
      return Response.redirect(new URL("/home", nextUrl));
    }
    return;
  }

  // 公開ページは誰でもアクセス可能
  if (isPublicRoute) {
    return;
  }

  // ログインしていない場合、ログインページへリダイレクト
  if (!isLoggedIn) {
     let callbackUrl = nextUrl.pathname;
     if (nextUrl.search) {
       callbackUrl += nextUrl.search;
     }

     const encodedCallbackUrl = encodeURIComponent(callbackUrl);
     return Response.redirect(new URL(`/login?callbackUrl=${encodedCallbackUrl}`, nextUrl));
  }

  return; // それ以外（ログイン済みで保護されたページへのアクセス）
});

export const config = {
  matcher: ["/((?!.+\\.[\\w]+$|_next).*)", "/", "/(api|trpc)(.*)"],
};
