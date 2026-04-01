// GENERATED_BY_AI: 2026-03-25 antigravity
// app/register/page.tsx
"use client";

import React, { useState, useEffect, Suspense } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { useTheme } from "@/app/components/ThemeProvider";
import { fadeInUp, springTransition, buttonTap } from "@/lib/motion";
import { Alert } from "@/app/components/Alert";

function getErrorMessage(
  errorCode: string | null,
): { type: "ok" | "error"; text: string } | null {
  if (!errorCode) return null;
  switch (errorCode) {
    case "registered_email":
      return {
        type: "error",
        text: "このGoogleアカウントは既に登録されています。ログインしてください。",
      };
    case "no_email_from_provider":
      return {
        type: "error",
        text: "Googleからメールアドレスを取得できませんでした。",
      };
    case "signup_failed":
      return {
        type: "error",
        text: "Googleでの登録に失敗しました。もう一度お試しください。",
      };
    default:
      return { type: "error", text: "Googleでの登録に失敗しました。" };
  }
}

export default function RegisterPageClient() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <RegisterPageContent />
    </Suspense>
  );
}

function RegisterPageContent() {
  const search = useSearchParams();
  const errorParam = search?.get ? search.get("error") : null;

  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "error"; text: string } | null>(
    getErrorMessage(errorParam),
  );

  useEffect(() => {
    if (errorParam) {
      setMsg(getErrorMessage(errorParam));
    }
  }, [errorParam]);

  const handleGoogle = async () => {
    setLoading(true);
    try {
      document.cookie =
        "google_auth_type=signup; path=/; max-age=300; SameSite=Lax; Secure";
      await signIn("google", { callbackUrl: "/home" });
    } catch (err) {
      console.error("[google signup] error:", err);
      setMsg({
        type: "error",
        text: "Googleでの登録に失敗しました。もう一度お試しください。",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      className="min-h-screen flex items-center justify-start pt-10 pb-8"
      initial="hidden"
      animate="show"
      variants={fadeInUp}
    >
      <div className="w-full max-w-md h-screen mx-auto flex flex-col justify-between items-center -translate-y-6 p-6">
        <div className="flex flex-col items-center gap-2 w-full">
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
              alt="Fridge illustration"
              width={220}
              height={130}
              priority
            />
          ) : (
            <div style={{ width: 220, height: 130 }} />
          )}

          <h2 className="mt-2 text-center text-xl font-black text-primary">
            Welcome to My-fridgeai
          </h2>
          <p className="text-center text-secondary mt-0 font-medium">
            日常の食材管理を、もっとスマートに。
          </p>
        </div>

        <div className="w-full mt-8 mb-auto">
          <div className="flex flex-col gap-4">
            {msg && (
              <Alert type={msg.type === "error" ? "error" : "success"}>
                {msg.text}
              </Alert>
            )}

            {/* Auth method notice */}
            <div
              className="text-xs text-center leading-relaxed px-2 py-3 rounded-xl"
              style={{
                background: "color-mix(in srgb, var(--accent) 8%, transparent)",
                color: "var(--color-text-secondary)",
                border: "1px solid color-mix(in srgb, var(--accent) 20%, transparent)",
              }}
            >
              My-fridgeaiでは、最高水準のセキュリティと利便性を追求するため、
              <strong className="text-primary">Google・Appleアカウント</strong>
              による認証に一本化いたしました。
              <br />
              メールアドレス・パスワード、パスキーによる新規登録はご利用いただけません。
              何卒ご了承ください。
            </div>

            <motion.button
              onClick={handleGoogle}
              disabled={loading}
              className="w-full surface-btn font-semibold py-3 rounded-full flex items-center justify-center gap-2"
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
              Googleで新規登録
            </motion.button>

            <motion.button
              disabled
              className="w-full surface-btn font-semibold py-3 rounded-full border flex items-center justify-center gap-2 disabled:opacity-50"
              whileTap={buttonTap.whileTap}
              whileHover={buttonTap.whileHover}
              transition={springTransition}
            >
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
              Appleで新規登録（今後対応予定）
            </motion.button>

            <p className="text-xs text-center text-secondary mt-2 leading-relaxed">
              続行すると
              <a href="/terms" className="underline ml-1 text-primary">
                利用規約
              </a>
              と
              <a href="/privacy" className="underline ml-1 text-primary">
                プライバシーポリシー
              </a>
              に同意したことになります。
            </p>
          </div>
        </div>

        <div className="w-full flex flex-col items-center gap-4 mt-6">
          <p className="text-sm text-secondary">
            すでにアカウントをお持ちですか？
            <a
              href="/login"
              className="underline ml-1 text-primary font-medium"
            >
              ログイン
            </a>
          </p>
          <div className="text-xs text-muted mb-6">© My-fridgeai</div>
        </div>
      </div>
    </motion.div>
  );
}
