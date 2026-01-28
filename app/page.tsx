//app/page.tsx
import React from "react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

const SITE_URL =
  process.env.NEXT_PUBLIC_BASE_URL ?? "https://www.my-fridgeai.com";

export const metadata: Metadata = {
  title: "My-FridgeAI｜冷蔵庫の余り物で献立を自動提案するAIアプリ",
  description:
    "冷蔵庫の食材を管理し、賞味期限が近い食材を優先してAIが今日作れる献立を提案。食材ロスを減らし、毎日の料理を楽にします。",
  openGraph: {
    title: "My-FridgeAI｜冷蔵庫の余り物で献立を自動提案するAIアプリ",
    description:
      "賞味期限が近い食材を優先してAIが今日作れる献立を提案。食材ロスを減らし、毎日の料理を楽にします。",
    url: SITE_URL,
    siteName: "My-FridgeAI",
    images: [
      {
        url: `${SITE_URL}/og-images/og-top.png`,
        width: 1200,
        height: 630,
        alt: "My-FridgeAI - 冷蔵庫の余り物で献立を自動提案",
      },
    ],
    locale: "ja_JP",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "My-FridgeAI｜冷蔵庫の余り物で献立を自動提案するAIアプリ",
    description: "賞味期限が近い食材を優先してAIが今日作れる献立を提案。",
  },
};

export default function Page() {
  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 font-sans selection:bg-indigo-100 selection:text-indigo-900">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md border-b border-slate-100 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="block dark:hidden">
              <Image
                src="/my-fridgeai-logo.png"
                alt="My-FridgeAI Logo"
                width={120}
                height={40}
                className="w-32 h-12 md:w-40 md:h-14"
              />
            </div>
            <div className="hidden dark:block">
              <Image
                src="/my-fridgeai-logo-white.png"
                alt="My-FridgeAI Logo"
                width={120}
                height={40}
                className="w-32 h-12 md:w-40 md:h-14"
              />
            </div>
          </Link>
          <nav className="hidden md:flex items-center gap-8 text-sm font-semibold text-slate-600 dark:text-slate-400">
            <Link
              href="/features/fridge-management"
              className="hover:text-indigo-600 transition-colors"
            >
              在庫管理
            </Link>
            <Link
              href="/features/menu-ai"
              className="hover:text-indigo-600 transition-colors"
            >
              AI献立
            </Link>
            <Link
              href="/features/expiration-alert"
              className="hover:text-indigo-600 transition-colors"
            >
              賞味期限通知
            </Link>
            <Link
              href="/login"
              className="px-5 py-2.5 bg-indigo-600 text-white rounded-full hover:bg-indigo-700 transition-all shadow-md hover:shadow-indigo-200"
            >
              ログイン
            </Link>
          </nav>
          <Link
            href="/login"
            className="md:hidden px-4 py-2 bg-indigo-600 text-white rounded-full text-sm font-bold"
          >
            ログイン
          </Link>
        </div>
      </header>

      <main className="pt-32 pb-20 max-w-6xl mx-auto px-6 animate-in fade-in slide-in-from-bottom-4 duration-1000">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          <section className="space-y-8 text-center md:text-left">
            <div className="space-y-4">
              <div className="inline-block px-4 py-1.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 text-sm font-bold rounded-full mb-2">
                AIが創る、ムダのない食卓
              </div>
              <h1 className="text-4xl md:text-6xl font-extrabold leading-[1.1] tracking-tight text-slate-900 dark:text-white">
                冷蔵庫の余り物で
                <br />
                <span className="text-indigo-600 dark:text-indigo-400">
                  献立を自動提案
                </span>
              </h1>
              <p className="text-lg md:text-xl text-slate-600 dark:text-slate-300 max-w-lg mx-auto md:mx-0 leading-relaxed">
                賞味期限が近い食材を優先して、今日作れる献立を3案提示。
                食材ロスを最小限にし、毎日の家事をスマートに。
              </p>
            </div>

            <div className="flex flex-wrap justify-center md:justify-start gap-4">
              <Link
                href="/login"
                className="px-10 py-5 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-lg transition-all shadow-xl shadow-indigo-200 dark:shadow-none hover:-translate-y-0.5"
              >
                今すぐ無料で始める
              </Link>
              <a
                href="#features"
                className="px-10 py-5 rounded-full border-2 border-slate-200 dark:border-slate-800 hover:border-indigo-600 dark:hover:border-indigo-500 text-slate-700 dark:text-slate-200 font-bold text-lg transition-all"
              >
                機能を見る
              </a>
            </div>
          </section>

          <section className="relative aspect-square scale-90 md:scale-100 pointer-events-none">
            <div className="block dark:hidden">
              <Image
                src="/fridge-illustration.png"
                alt="冷蔵庫のイラスト"
                fill
                className="object-contain"
                priority
              />
            </div>
            <div className="hidden dark:block">
              <Image
                src="/fridge-illustration-dark.png"
                alt="冷蔵庫のイラスト"
                fill
                className="object-contain"
                priority
              />
            </div>
          </section>
        </div>

        <section
          id="features"
          className="mt-40 grid grid-cols-1 md:grid-cols-3 gap-8"
        >
          <article className="group p-8 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl shadow-sm hover:shadow-2xl hover:shadow-indigo-500/10 transition-all duration-500 hover:-translate-y-2">
            <div className="w-14 h-14 bg-orange-100 dark:bg-orange-900/30 rounded-2xl flex items-center justify-center mb-8 text-orange-600 dark:text-orange-400 group-hover:scale-110 transition-transform">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-7 w-7"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                />
              </svg>
            </div>
            <h3 className="text-2xl font-bold mb-4 dark:text-white">
              余り物を活かす提案
            </h3>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
              賞味期限や在庫状況をAIが瞬時に分析。冷蔵庫にあるものだけで、ムダなく最高の一皿を提案します。
            </p>
            <Link
              href="/features/menu-ai"
              className="mt-8 inline-flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-bold hover:gap-3 transition-all"
            >
              詳しく見る <span className="text-xl">→</span>
            </Link>
          </article>

          <article className="group p-8 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl shadow-sm hover:shadow-2xl hover:shadow-indigo-500/10 transition-all duration-500 hover:-translate-y-2">
            <div className="w-14 h-14 bg-blue-100 dark:bg-blue-900/30 rounded-2xl flex items-center justify-center mb-8 text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-7 w-7"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"
                />
              </svg>
            </div>
            <h3 className="text-2xl font-bold mb-4 dark:text-white">
              簡単在庫管理
            </h3>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
              バーコードスキャンや手入力で素早く登録。ミリ単位の正確な管理から直感的な管理まで対応。
            </p>
            <Link
              href="/features/fridge-management"
              className="mt-8 inline-flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-bold hover:gap-3 transition-all"
            >
              詳しく見る <span className="text-xl">→</span>
            </Link>
          </article>

          <article className="group p-8 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl shadow-sm hover:shadow-2xl hover:shadow-indigo-500/10 transition-all duration-500 hover:-translate-y-2">
            <div className="w-14 h-14 bg-red-100 dark:bg-red-900/30 rounded-2xl flex items-center justify-center mb-8 text-red-600 dark:text-red-400 group-hover:scale-110 transition-transform">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-7 w-7"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <h3 className="text-2xl font-bold mb-4 dark:text-white">
              賞味期限アラート
            </h3>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
              期限が迫った食材を毎日通知。食材を腐らせてしまう後悔からあなたを解放し、計画的な消費をサポートします。
            </p>
            <Link
              href="/features/expiration-alert"
              className="mt-8 inline-flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-bold hover:gap-3 transition-all"
            >
              詳しく見る <span className="text-xl">→</span>
            </Link>
          </article>
        </section>
      </main>

      <footer className="bg-slate-50 dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 py-20">
        <div className="max-w-6xl mx-auto px-6 grid grid-cols-1 md:grid-cols-4 gap-12">
          <div className="col-span-1 md:col-span-2 space-y-4">
            <div className="flex items-center gap-2">
              <div className="block dark:hidden">
                <Image
                  src="/my-fridgeai-logo.png"
                  alt="My-FridgeAI Logo"
                  width={120}
                  height={40}
                  className="w-40 h-12"
                />
              </div>
              <div className="hidden dark:block">
                <Image
                  src="/my-fridgeai-logo-white.png"
                  alt="My-FridgeAI Logo"
                  width={120}
                  height={40}
                  className="w-40 h-12"
                />
              </div>
            </div>
            <p className="text-slate-500 dark:text-slate-400 max-w-sm">
              冷蔵庫の食材を管理し、AIが最適な献立を提案。
              「もったいない」をテクノロジーで解決します。
            </p>
          </div>
          <div className="space-y-4">
            <h4 className="font-bold dark:text-white">メイン機能</h4>
            <ul className="space-y-2 text-sm text-slate-500 dark:text-slate-400">
              <li>
                <Link
                  href="/features/fridge-management"
                  className="hover:text-indigo-600 transition-colors"
                >
                  在庫管理
                </Link>
              </li>
              <li>
                <Link
                  href="/features/menu-ai"
                  className="hover:text-indigo-600 transition-colors"
                >
                  AI献立生成
                </Link>
              </li>
              <li>
                <Link
                  href="/features/expiration-alert"
                  className="hover:text-indigo-600 transition-colors"
                >
                  賞味期限アラート
                </Link>
              </li>
            </ul>
          </div>
          <div className="space-y-4">
            <h4 className="font-bold dark:text-white">サポート</h4>
            <ul className="space-y-2 text-sm text-slate-500 dark:text-slate-400">
              <li>
                <Link
                  href="/terms"
                  className="hover:text-indigo-600 transition-colors"
                >
                  利用規約
                </Link>
              </li>
              <li>
                <Link
                  href="/privacy"
                  className="hover:text-indigo-600 transition-colors"
                >
                  プライバシーポリシー
                </Link>
              </li>
            </ul>
          </div>
        </div>
        <div className="max-w-6xl mx-auto px-6 mt-20 pt-8 border-t border-slate-200 dark:border-slate-800 text-center text-sm text-slate-400">
          © {new Date().getFullYear()} My-FridgeAI. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
