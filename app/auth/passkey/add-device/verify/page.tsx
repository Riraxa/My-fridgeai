// app/auth/passkey/add-device/verify/page.tsx
"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { useTheme } from "@/app/components/ThemeProvider";
import { motion } from "framer-motion";
import { fadeInUp } from "@/app/components/motion";

/**
 * メールリンクからのトークン検証ページ
 *
 * トークンを検証し、成功したらパスキー強制登録画面へ遷移する。
 * セッションは発行しない。パスキー登録完了時のみセッションを発行する。
 */

function VerifyTokenContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams?.get("token") ?? null;

  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [status, setStatus] = useState<"loading" | "success" | "error">(
    "loading",
  );
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setErrorMsg("無効なリンクです。");
      return;
    }

    const verifyToken = async () => {
      try {
        const res = await fetch("/api/auth/add-device/confirm", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });

        const data = await res.json();

        if (!res.ok || !data.ok) {
          setStatus("error");
          setErrorMsg(data.message || "リンクが無効または期限切れです。");
          return;
        }

        // パスキー登録画面へ遷移（強制モード）
        // setupToken と email をクエリパラメータで渡す
        const params = new URLSearchParams({
          force: "true",
          mode: "add_device",
          setupToken: data.setupToken,
          email: data.email,
        });

        router.replace(`/auth/passkey/setup?${params.toString()}`);
      } catch (err) {
        console.error("[verify-token] error:", err);
        setStatus("error");
        setErrorMsg("通信エラーが発生しました。再度お試しください。");
      }
    };

    verifyToken();
  }, [token, router]);

  return (
    <motion.div
      className="min-h-screen flex items-center justify-center pt-12 pb-8"
      initial="hidden"
      animate="show"
      variants={fadeInUp}
    >
      <div className="w-full max-w-md mx-auto p-6 text-center">
        {/* ロゴ */}
        <div className="mb-8">
          {mounted ? (
            <Image
              src={
                theme === "dark"
                  ? "/my-fridgeai-logo-white.png"
                  : "/my-fridgeai-logo.png"
              }
              alt="My-fridgeai"
              width={180}
              height={52}
              priority
              className="mx-auto"
            />
          ) : (
            <div style={{ width: 180, height: 52 }} className="mx-auto" />
          )}
        </div>

        {status === "loading" && (
          <div className="space-y-4">
            <div
              className="w-12 h-12 rounded-full border-4 border-t-transparent mx-auto"
              style={{
                borderColor: "var(--accent)",
                borderTopColor: "transparent",
                animation: "spin 900ms linear infinite",
              }}
            />
            <p className="text-secondary">確認中...</p>
          </div>
        )}

        {status === "error" && (
          <div className="space-y-6">
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center mx-auto"
              style={{ background: "rgba(239, 68, 68, 0.1)" }}
            >
              <svg
                width="40"
                height="40"
                viewBox="0 0 24 24"
                fill="none"
                className="text-red-500"
              >
                <path
                  d="M12 9V13M12 17H12.01M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>

            <div>
              <h2 className="text-xl font-semibold text-primary mb-2">
                エラー
              </h2>
              <p className="text-secondary text-sm">{errorMsg}</p>
            </div>

            <div className="space-y-3">
              <a
                href="/auth/passkey/add-device"
                className="block w-full font-semibold py-3 rounded-full text-white text-center transition-all"
                style={{ background: "var(--accent)" }}
              >
                やり直す
              </a>
              <a
                href="/login"
                className="block text-sm text-secondary underline hover:text-primary transition-colors"
              >
                ログインに戻る
              </a>
            </div>
          </div>
        )}

        <div className="text-center text-xs text-muted mt-8">© My-fridgeai</div>
      </div>
    </motion.div>
  );
}

export default function VerifyTokenPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div
            className="w-12 h-12 rounded-full border-4 border-t-transparent animate-spin"
            style={{
              borderColor: "var(--accent)",
              borderTopColor: "transparent",
            }}
          />
        </div>
      }
    >
      <VerifyTokenContent />
    </Suspense>
  );
}
