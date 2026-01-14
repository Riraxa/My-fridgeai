// app/register/page.tsx
"use client";

import React, { useState, useEffect, Suspense } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTheme } from "@/app/components/ThemeProvider";
import { fadeInUp, springTransition, buttonTap } from "@/app/components/motion";

function getErrorMessage(
  errorCode: string | null,
): { type: "ok" | "error"; text: string } | null {
  if (!errorCode) return null;
  switch (errorCode) {
    case "registered_email":
      return {
        type: "error",
        text: "このメールアドレスは既に登録されています。ログインしてください。",
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

/**
 * Register Page (client)
 *
 * Flow:
 * 1) User fills name/email/password
 * 2) POST /api/auth/set-password で user を作成（password をハッシュして保存する server 側処理定義）
 * 3) call signIn("email", { email, redirect:false, callbackUrl: "/passkey-setup" }) to send magic link
 * 4) show friendly message: "確認メールを送信しました"
 */

export default function RegisterPageClient() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <RegisterPageContent />
    </Suspense>
  );
}

function RegisterPageContent() {
  const router = useRouter();
  const search = useSearchParams();
  const errorParam = search?.get ? search.get("error") : null;

  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // form
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // visibility toggles
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // UI state
  const [step, setStep] = useState<"select" | "form">("select");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "error"; text: string } | null>(
    getErrorMessage(errorParam),
  );

  // Show error from URL if present
  useEffect(() => {
    if (errorParam) {
      setMsg(getErrorMessage(errorParam));
    }
  }, [errorParam]);

  // small validators
  function validateEmail(e: string) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
  }

  async function savePassword() {
    const res = await fetch("/api/auth/set-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, name }),
    });

    // 成功時
    if (res.ok) {
      return true;
    }

    // ---- 失敗時 ----
    let payload: any = null;
    try {
      payload = await res.json();
    } catch {
      payload = null;
    }

    // エラーメッセージの抽出（日本語化されたサーバーメッセージを優先）
    const errorMsg = payload?.message || "ユーザー作成に失敗しました";
    throw new Error(errorMsg);
  }

  async function handleSubmit(e?: React.FormEvent) {
    if (e) e.preventDefault();
    setMsg(null);

    // Frontend Validation
    if (!email || !validateEmail(email)) {
      setMsg({
        type: "error",
        text: "有効なメールアドレスを入力してください。",
      });
      return;
    }
    if (!password || password.length < 8) {
      setMsg({ type: "error", text: "パスワードは8文字以上にしてください。" });
      return;
    }
    if (password !== confirmPassword) {
      setMsg({ type: "error", text: "パスワード（確認）が一致しません。" });
      return;
    }

    setLoading(true);
    try {
      // 1) create user record
      await savePassword();

      // 2) send magic link
      const res: any = await signIn("email", {
        email,
        redirect: false,
        callbackUrl: "/passkey-setup",
      });

      if (res?.error) {
        console.warn("[email signIn] error res:", res);
        throw new Error("確認メール送信に失敗しました。");
      }

      setMsg({
        type: "ok",
        text: "確認メールを送信しました。メール内のリンクから登録を完了してください。",
      });
      // 成功後はフォームをクリア、あるいは完了画面へ？今回はメッセージ表示のみ
    } catch (err: any) {
      console.error("register error:", err);
      setMsg({
        type: "error",
        text: err?.message || "アカウント作成に失敗しました。",
      });
    } finally {
      setLoading(false);
    }
  }

  // ---------- Google OAuth (新規登録) ----------
  const handleGoogle = async () => {
    setLoading(true);
    try {
      // Set cookie to indicate signup flow (not login)
      document.cookie =
        "google_auth_type=signup; path=/; max-age=300; SameSite=Lax";
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

  const handleApple = () => {
    // alert("Apple登録は未実装（後で対応予定）");
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
          {/* Logo & Illustration */}
          {mounted ? (
            <Image
              src={
                theme === "dark"
                  ? "/my-fridgeai-logo-white.png"
                  : "/my-fridgeai-logo.png"
              }
              alt="My-FridgeAI"
              width={180}
              height={52}
              priority
              style={{ objectFit: "contain" }}
            />
          ) : (
            <div style={{ width: 180, height: 52 }} />
          )}

          {mounted ? (
            <Image
              src={
                theme === "dark"
                  ? "/fridge-illustration-dark.png"
                  : "/fridge-illustration.png"
              }
              alt="Fridge illustration"
              width={220}
              height={130}
              priority
              style={{ objectFit: "contain" }}
            />
          ) : (
            <div style={{ width: 220, height: 130 }} />
          )}

          <h2 className="mt-2 text-center text-lg font-semibold text-primary">
            Welcome to My-FridgeAI
          </h2>
          <p className="text-center text-secondary mt-0">
            日常の食材管理を、もっとスマートに。
          </p>
        </div>

        {/* Main Content Area: Spacing aligned with Login page assumption (gap-6 or gap-8) */}
        <div className="w-full mt-8 mb-auto">
          {step === "select" ? (
            <div className="flex flex-col gap-4">
              {msg && (
                <div
                  className={`text-sm text-center ${msg.type === "error" ? "text-red-500" : "text-green-600"}`}
                >
                  {msg.text}
                </div>
              )}

              <motion.button
                onClick={() => setStep("form")}
                disabled={loading}
                className="w-full surface-btn font-semibold py-3 rounded-full flex items-center justify-center gap-2"
                whileTap={buttonTap.whileTap}
                whileHover={buttonTap.whileHover}
                transition={springTransition}
              >
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
                    d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"
                  />
                </svg>
                メールアドレスで新規登録
              </motion.button>

              <div className="relative flex py-1 items-center">
                <div className="flex-grow border-t border-gray-300 dark:border-gray-700"></div>
                <span className="flex-shrink-0 mx-4 text-xs text-gray-400">
                  または
                </span>
                <div className="flex-grow border-t border-gray-300 dark:border-gray-700"></div>
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
                onClick={handleApple}
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
                  <path d="M318.7 268.7c-.2-37.3 16.4-65.7 50-86.2-18.8-27.6-47.2-42.7-86.2-45.5-36.3-2.7-76.2 21.3-90.3 21.3-15 0-50-20.4-77.6-19.8-56.8.8-116.5 46.4-116.5 139.3 0 27.5 5 56.1 15 85.8 13.4 38.7 61.9 133.6 112.3 132 23.9-.5 40.8-16.9 76.3-16.9 34.6 0 50.3 16.9 77.6 16.9 50.8-1 94.7-85.3 107.9-124.2-68.4-32.3-68.5-95-68.5-101.8zM257.5 85.4C282 58.6 293.4 24.1 289 0c-26.6 1.1-57.9 18-76.6 39.2-16.8 19.3-31.6 46.9-27.6 74.4 29.1 2.2 58.9-14.8 72.7-28.2z" />
                </svg>
                Appleで新規登録
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
          ) : (
            <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
              <div>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-white dark:bg-gray-800 rounded-lg border px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  placeholder="表示名（任意）"
                />
              </div>

              <div>
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-white dark:bg-gray-800 rounded-lg border px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  placeholder="メールアドレス"
                  type="email"
                  autoComplete="email"
                />
              </div>

              <div className="relative">
                <input
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-white dark:bg-gray-800 rounded-lg border px-4 py-3 pr-10 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  placeholder="パスワード（8文字以上）"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-500 hover:text-gray-700"
                  aria-label={
                    showPassword ? "パスワードを隠す" : "パスワードを表示する"
                  }
                >
                  {showPassword ? (
                    /* Heroicons eye-slash */
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
                  ) : (
                    /* Heroicons eye */
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
                  )}
                </button>
              </div>

              <div className="relative">
                <input
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full bg-white dark:bg-gray-800 rounded-lg border px-4 py-3 pr-10 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  placeholder="パスワード（確認）"
                  type={showConfirm ? "text" : "password"}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-500 hover:text-gray-700"
                  aria-label={
                    showConfirm
                      ? "パスワード（確認）を隠す"
                      : "パスワード（確認）を表示する"
                  }
                >
                  {showConfirm ? (
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
                        d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                    </svg>
                  )}
                </button>
              </div>

              {msg && (
                <div
                  className={`text-sm ${msg.type === "error" ? "text-red-500" : "text-green-600"}`}
                >
                  {msg.text}
                </div>
              )}

              <motion.button
                type="submit"
                disabled={loading}
                className="w-full bg-black dark:bg-white dark:text-black text-white font-semibold py-3 rounded-full flex items-center justify-center gap-2"
                whileTap={buttonTap.whileTap}
                whileHover={buttonTap.whileHover}
                transition={springTransition}
              >
                {loading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></span>
                    処理中…
                  </>
                ) : (
                  "アカウントを作成して確認メールを送信"
                )}
              </motion.button>

              <button
                type="button"
                className="w-full mt-2 text-center text-sm text-secondary hover:text-primary transition-colors"
                onClick={() => setStep("select")}
                disabled={loading}
              >
                キャンセルして戻る
              </button>
            </form>
          )}
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
          <div className="text-xs text-muted mb-6">© My-FridgeAI</div>
        </div>
      </div>
    </motion.div>
  );
}
