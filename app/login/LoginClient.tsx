// GENERATED_BY_AI: 2026-03-25 antigravity
// app/login/LoginClient.tsx
"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { useTheme } from "@/app/components/ThemeProvider";
import { motion } from "framer-motion";
import { fadeInUp, springTransition, buttonTap } from "@/lib/motion";
import { Alert } from "@/app/components/Alert";

function getErrorMessage(errorCode: string | null): string | null {
  if (!errorCode) return null;
  switch (errorCode) {
    case "not_registered":
      return "未登録のGoogleアカウントです。新規登録をしてください。";
    case "no_email_from_provider":
      return "Googleからメールアドレスを取得できませんでした。";
    case "account_inactive":
      return "このアカウントは無効化されています。";
    case "CallbackRouteError":
      return "認証中にエラーが発生しました。もう一度お試しください。";
    default:
      return "エラーが発生しました。もう一度お試しください。";
  }
}

export default function LoginClient() {
  const search = useSearchParams();
  const registered = search?.get ? search.get("registered") : null;
  const errorParam = search?.get ? search.get("error") : null;

  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const [msg, setMsg] = useState<string | null>(
    registered
      ? "登録完了しました。ログインしてください。"
      : getErrorMessage(errorParam),
  );
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (errorParam) {
      setMsg(getErrorMessage(errorParam));
    }
  }, [errorParam]);

  // ---------- Google OAuth ----------
  const handleGoogle = async () => {
    setLoading(true);
    try {
      const isLocalhost = window.location.hostname === "localhost";
      const secureFlag = isLocalhost ? "" : "Secure;";
      document.cookie =
        `google_auth_type=login; path=/; max-age=300; SameSite=Lax; ${secureFlag}`;
      await signIn("google", { callbackUrl: "/home" });
    } catch (err) {
      console.error("[google login] error:", err);
      setMsg("Google認証に失敗しました。もう一度お試しください。");
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      className="h-screen flex items-center justify-center overflow-hidden"
      initial="hidden"
      animate="show"
      variants={fadeInUp}
    >
      <div className="w-full max-w-md h-screen mx-auto flex flex-col justify-center items-center p-6">
        {/* header */}
        <div className="flex flex-col items-center gap-2">
          {mounted ? (
            <Image
              src={
                theme === "dark"
                  ? "/my-fridgeai-logo-dark.png"
                  : "/my-fridgeai-logo-light.png"
              }
              alt="My-fridgeai"
              width={180}
              height={52}
              priority
            />
          ) : (
            <div style={{ width: 180, height: 52 }} />
          )}

          {mounted ? (
            <Image
              src={
                theme === "dark"
                  ? "/fridge-illustration-dark.png"
                  : "/fridge-illustration-light.png"
              }
              alt="Fridge"
              width={220}
              height={130}
              priority
              style={{ objectFit: "contain" }}
            />
          ) : (
            <div style={{ width: 220, height: 130 }} />
          )}

          <h2 className="mt-2 text-center text-xl font-black text-primary">
            Welcome to My-fridgeai
          </h2>
          <p className="text-center text-sm text-secondary font-medium">
            冷蔵庫の管理を、もっとシンプルに。
          </p>
        </div>

        {/* main */}
        <div className="w-full mt-6">
          <div className="flex flex-col gap-3">
            {msg && <Alert type="error" className="mt-2">{msg}</Alert>}

            <motion.button
              onClick={handleGoogle}
              disabled={loading}
              className="w-full surface-btn font-semibold py-3 rounded-full flex items-center justify-center gap-2 transition transform duration-150 ease-out active:translate-y-1 disabled:opacity-60"
              whileTap={buttonTap.whileTap}
              whileHover={buttonTap.whileHover}
              transition={springTransition}
            >
              {/* Google SVG */}
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 533.5 544.3"
                width="18"
                height="18"
                aria-hidden
              >
                <path
                  fill="#4285F4"
                  d="M533.5 278.4c0-17.4-1.6-34.1-4.7-50.4H272v95.4h146.9c-6.4 34.6-25.4 63.9-54.2 83.5v68h87.3c51.1-47.1 81-116.4 81-196.5z"
                />
                <path
                  fill="#34A853"
                  d="M272 544.3c73.2 0 134.6-24.3 179.4-65.7l-87.3-68c-24.2 16.2-55.1 26-92.1 26-70.8 0-130.7-47.7-152.2-111.9H27.9v70.9C72.6 486.4 165.5 544.3 272 544.3z"
                />
                <path
                  fill="#FBBC05"
                  d="M119.8 324.7c-10.6-31.6-10.6-65.7 0-97.3v-70.9H27.9c-39.3 77.8-39.3 168.5 0 246.3l90-78.1z"
                />
                <path
                  fill="#EA4335"
                  d="M272 107.7c38.8 0 73.6 13.4 101.2 39.6l75.9-75.9C406.6 24.3 345.2 0 272 0 166.5 0 74.6 60.6 29.8 149.1l90 70.5c21.5-64.2 81.4-111.9 152.2-111.9z"
                />
              </svg>
              Googleでログイン
            </motion.button>

            <motion.button
              disabled
              className="w-full surface-btn font-semibold py-3 rounded-full border flex items-center justify-center gap-2 disabled:opacity-60"
              whileTap={buttonTap.whileTap}
              whileHover={buttonTap.whileHover}
              transition={springTransition}
            >
              {/* Apple SVG */}
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 384 512"
                width="18"
                height="18"
                fill="currentColor"
                aria-hidden
              >
                <path d="M318.7 268.7c-.2-37.3 16.4-65.7 50-86.2-18.8-27.6-47.2-42.7-86.2-45.5-36.3-2.7-76.2 21.3-90.3 21.3-15 0-50-20.4-77.6-19.8-56.8.8-116.5 46.4-116.5 139.3 0 27.5 5 56.1 15 85.8 13.4 38.7 61.9 133.6 112.3 132 23.9-.5 40.8-16.9 76.3-16.9 34.6 0 50.3 16.9 77.6 16.3 50.8-1 94.7-85.3 107.9-124.2zM257.5 85.4C282 58.6 293.4 24.1 289 0c-26.6 1.1-57.9 18-76.6 39.2-16.8 19.3-31.6 46.9-27.6 74.4 29.1 2.2 58.9-14.8 72.7-28.2z" />
              </svg>
              Appleでログイン（今後対応予定）
            </motion.button>

            <p className="text-xs text-center text-secondary mt-2">
              続行すると
              <Link className="underline ml-1 text-primary" href="/terms">
                利用規約
              </Link>
              と
              <Link className="underline ml-1 text-primary" href="/privacy">
                プライバシーポリシー
              </Link>
              に同意したことになります。
            </p>

            <p className="text-xs text-center text-muted mt-2">
              アカウントをお持ちでない方は
              <Link className="underline ml-1 text-primary" href="/register">
                新規登録
              </Link>
            </p>
          </div>
        </div>

        <div className="w-full text-center text-xs text-muted mt-4">
          © My-fridgeai
        </div>
      </div>
    </motion.div>
  );
}
