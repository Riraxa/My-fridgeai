// app/auth/passkey/add-device/page.tsx
"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useTheme } from "@/app/components/ThemeProvider";
import { motion } from "framer-motion";
import { fadeInUp, springTransition, buttonTap } from "@/app/components/motion";

/**
 * 新端末登録ページ（本人確認）
 *
 * このページはログインではなく、新端末登録のための本人確認を行う。
 * メールアドレスとパスワードで本人確認し、確認メールを送信する。
 */

export default function AddDevicePage() {
  const router = useRouter();
  const { theme } = useTheme();
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{
    type: "error" | "success";
    text: string;
  } | null>(null);
  const [emailSent, setEmailSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);

    if (!email.trim()) {
      setMsg({ type: "error", text: "メールアドレスを入力してください。" });
      return;
    }
    if (!password) {
      setMsg({ type: "error", text: "パスワードを入力してください。" });
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/add-device/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok || !data.ok) {
        setMsg({
          type: "error",
          text: data.message || "エラーが発生しました。",
        });
        return;
      }

      setEmailSent(true);
      setMsg({ type: "success", text: data.message });
    } catch (err) {
      console.error("[add-device] error:", err);
      setMsg({
        type: "error",
        text: "通信エラーが発生しました。再度お試しください。",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      className="min-h-screen flex items-center justify-center pt-12 pb-8"
      initial="hidden"
      animate="show"
      variants={fadeInUp}
    >
      <div className="w-full max-w-md mx-auto p-6">
        {/* ヘッダー */}
        <div className="flex flex-col items-center gap-2 mb-8">
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
        </div>

        {!emailSent ? (
          <>
            {/* 説明 */}
            <div className="text-center mb-8">
              <h1 className="text-xl font-semibold text-primary mb-3">
                新しい端末の登録
              </h1>
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 text-sm text-yellow-800 dark:text-yellow-200">
                <p className="mb-2 font-medium">
                  ⚠️ これはログインではありません
                </p>
                <p>新しい端末を登録するための本人確認を行います。</p>
              </div>
            </div>

            {/* フォーム */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <input
                  type="email"
                  placeholder="メールアドレス"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full input rounded-lg border px-4 py-3 text-sm"
                  autoComplete="email"
                  required
                />
              </div>

              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="パスワード"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full input rounded-lg border px-4 py-3 pr-12 text-sm"
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  aria-label={
                    showPassword ? "パスワードを隠す" : "パスワードを表示する"
                  }
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:text-accent transition-colors"
                >
                  {showPassword ? (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={1.5}
                      stroke="currentColor"
                      className="w-5 h-5"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                    </svg>
                  ) : (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={1.5}
                      stroke="currentColor"
                      className="w-5 h-5"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88"
                      />
                    </svg>
                  )}
                </button>
              </div>

              {msg && (
                <div
                  className={`text-sm p-3 rounded-lg text-center ${
                    msg.type === "error"
                      ? "text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20"
                      : "text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/20"
                  }`}
                >
                  {msg.text}
                </div>
              )}

              <motion.button
                type="submit"
                disabled={loading}
                whileTap={buttonTap.whileTap}
                whileHover={buttonTap.whileHover}
                transition={springTransition}
                className="w-full font-semibold py-3 rounded-full text-white transition-all"
                style={{ background: "var(--accent)" }}
              >
                {loading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin inline-block mr-2"></span>
                    確認中…
                  </>
                ) : (
                  "確認メールを送信"
                )}
              </motion.button>
            </form>

            <div className="flex items-center justify-between mt-6">
              <button
                type="button"
                className="text-sm underline"
                onClick={(e) => {
                  e.preventDefault();
                  router.push("/reset-password/request");
                }}
              >
                パスワードをお忘れですか？
              </button>
              <Link href="/login" className="text-sm underline">
                ← ログインに戻る
              </Link>
            </div>
          </>
        ) : (
          /* メール送信完了画面 */
          <div className="text-center space-y-6">
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center mx-auto"
              style={{
                background:
                  "color-mix(in srgb, var(--accent) 15%, transparent)",
              }}
            >
              <svg
                width="40"
                height="40"
                viewBox="0 0 24 24"
                fill="none"
                style={{ color: "var(--accent)" }}
              >
                <path
                  d="M3 8L10.89 13.26C11.2187 13.4793 11.6049 13.5963 12 13.5963C12.3951 13.5963 12.7813 13.4793 13.11 13.26L21 8M5 19H19C19.5304 19 20.0391 18.7893 20.4142 18.4142C20.7893 18.0391 21 17.5304 21 17V7C21 6.46957 20.7893 5.96086 20.4142 5.58579C20.0391 5.21071 19.5304 5 19 5H5C4.46957 5 3.96086 5.21071 3.58579 5.58579C3.21071 5.96086 3 6.46957 3 7V17C3 17.5304 3.21071 18.0391 3.58579 18.4142C3.96086 18.7893 4.46957 19 5 19Z"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>

            <h2 className="text-xl font-semibold text-primary">
              確認メールを送信しました
            </h2>

            <p className="text-secondary text-sm leading-relaxed">
              {email} 宛に確認メールを送信しました。
              <br />
              メール内のリンクをクリックして、パスキーの登録を完了してください。
            </p>

            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 text-sm">
              <div className="flex items-center gap-2 mb-3">
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  className="text-blue-600 dark:text-blue-400"
                >
                  <path
                    d="M3 8L10.89 13.26C11.2187 13.4793 11.6049 13.5963 12 13.5963C12.3951 13.5963 12.7813 13.4793 13.11 13.26L21 8M5 19H19C19.5304 19 20.0391 18.7893 20.4142 18.4142C20.7893 18.0391 21 17.5304 21 17V7C21 6.46957 20.7893 5.96086 20.4142 5.58579C20.0391 5.21071 19.5304 5 19 5H5C4.46957 5 3.96086 5.21071 3.58579 5.58579C3.21071 5.96086 3 6.46957 3 7V17C3 17.5304 3.21071 18.0391 3.58579 18.4142C3.96086 18.7893 4.46957 19 5 19Z"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <h3 className="font-medium text-blue-900 dark:text-blue-100">
                  メールが届かない場合
                </h3>
              </div>
              <ul className="space-y-2 text-blue-800 dark:text-blue-200">
                <li className="flex items-start gap-2">
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    className="text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0"
                  >
                    <path
                      d="M9 12L11 14L15 10M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  <span className="text-sm">迷惑メールフォルダを確認してください</span>
                </li>
                <li className="flex items-start gap-2">
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    className="text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0"
                  >
                    <path
                      d="M9 12L11 14L15 10M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  <span className="text-sm">メールアドレスが正しいか確認してください</span>
                </li>
                <li className="flex items-start gap-2">
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    className="text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0"
                  >
                    <path
                      d="M9 12L11 14L15 10M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  <span className="text-sm">しばらく待ってから再送をお試しください</span>
                </li>
              </ul>
            </div>

            <button
              onClick={() => {
                setEmailSent(false);
                setMsg(null);
                setPassword("");
              }}
              className="text-sm text-secondary underline hover:text-primary transition-colors"
            >
              別のメールアドレスで試す
            </button>
          </div>
        )}

        <div className="text-center text-xs text-muted mt-8">© My-fridgeai</div>
      </div>
    </motion.div>
  );
}
