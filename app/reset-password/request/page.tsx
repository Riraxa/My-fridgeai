// app/reset-password/request/page.tsx
"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "@/app/components/ThemeProvider";
import { motion } from "framer-motion";
import { fadeInUp, springTransition, buttonTap } from "@/app/components/motion";
import Image from "next/image";

export default function ResetRequestPage() {
  const router = useRouter();
  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  React.useEffect(() => setMounted(true), []);

  async function handleSubmit(e?: React.FormEvent) {
    if (e) e.preventDefault();
    setMsg(null);
    if (!email) {
      setMsg("メールアドレスを入力してください");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/password-reset/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMsg(j?.message || "送信に失敗しました");
      } else {
        setMsg(
          "確認メールを送信しました。メールを確認してください（届いていない場合は迷惑メールもご確認ください）。",
        );
      }
    } catch (err) {
      console.error(err);
      setMsg("メール送信中にエラーが発生しました。");
    } finally {
      setLoading(false);
    }
  }

  return (
    <motion.div
      className="min-h-screen flex items-center justify-start pt-12 pb-8"
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
                  ? "/my-fridgeai-logo-white.png"
                  : "/my-fridgeai-logo.png"
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
                  : "/fridge-illustration.png"
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

          <h2 className="mt-2 text-center text-lg font-semibold text-primary">
            パスワードをリセット
          </h2>
          <p className="text-center text-sm text-secondary">
            登録済みのメールアドレスを入力すると、再設定用のリンクをお送りします。
          </p>
        </div>

        {/* main */}
        <div className="w-full mt-4">
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <input
              type="email"
              placeholder="メールアドレス"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full input rounded-lg border px-3 py-2 text-sm"
              required
            />
            {msg && (
              <div
                className={`text-sm p-3 rounded-lg ${
                  msg.includes("確認メールを送信しました")
                    ? "text-green-700 dark:text-green-300 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800"
                    : "text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800"
                }`}
              >
                {msg}
              </div>
            )}
            <div className="flex gap-2">
              <motion.button
                type="submit"
                disabled={loading}
                className="flex-1 bg-black dark:bg-white dark:text-black text-white font-semibold py-3 rounded-full"
                whileTap={buttonTap.whileTap}
                whileHover={buttonTap.whileHover}
                transition={springTransition}
              >
                {loading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin inline-block mr-2"></span>
                    送信中…
                  </>
                ) : (
                  "再設定リンクを送る"
                )}
              </motion.button>
              <motion.button
                type="button"
                className="flex-1 surface-btn font-semibold py-3 rounded-full"
                onClick={() => router.back()}
                whileTap={buttonTap.whileTap}
                whileHover={buttonTap.whileHover}
                transition={springTransition}
              >
                戻る
              </motion.button>
            </div>
          </form>
        </div>

        <div className="w-full text-center text-xs text-muted mt-4">
          © My-fridgeai
        </div>
      </div>
    </motion.div>
  );
}
