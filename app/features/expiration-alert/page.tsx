/**
 * Page: /features/expiration-alert
 * - public
 * - SEO keywords: 賞味期限, アラート, 食材ロス
 */

import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

const SITE_URL =
  process.env.NEXT_PUBLIC_BASE_URL ?? "https://www.my-fridgeai.com";

export const metadata: Metadata = {
  title: "賞味期限管理・食品ロス | My-fridgeai",
  description:
    "賞味期限3日前から自動通知！メールとアプリ内で食材の賞味期限を管理。Vercel Cronで毎日チェックし、食品ロスを削減する賞味期限管理アプリ。",
  openGraph: {
    title: "賞味期限アラート機能 | My-fridgeai",
    description:
      "メールとアプリ内で通知。Proは優先通知、Freeでもアラートを受け取れます。",
    url: `${SITE_URL}/features/expiration-alert`,
    images: [`${SITE_URL}/og-images/og-top.png`],
  },
};

export default function ExpirationAlertPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 font-sans">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md border-b border-slate-100 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="block dark:hidden">
              <Image
                src="/my-fridgeai-logo-light.png"
                alt="My-fridgeai Logo"
                width={120}
                height={40}
                className="w-32 h-12 md:w-40 md:h-14"
              />
            </div>
            <div className="hidden dark:block">
              <Image
                src="/my-fridgeai-logo-dark.png"
                alt="My-fridgeai Logo"
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
            <Link href="/features/expiration-alert" className="text-indigo-600">
              賞味期限通知
            </Link>
            <Link
              href="/login"
              className="px-5 py-2.5 bg-indigo-600 text-white rounded-full hover:bg-indigo-700 transition-all shadow-md"
            >
              ログイン
            </Link>
          </nav>
        </div>
      </header>

      <main className="pt-32 pb-20 max-w-4xl mx-auto px-6">
        <div className="space-y-16">
          <header className="space-y-6 text-center">
            <div className="inline-block px-4 py-1.5 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-sm font-bold rounded-full">
              食材を腐らせない
            </div>
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              賞味期限アラートで
              <br />
              <span className="text-indigo-600">食材ロスを削減</span>
            </h1>
            <p className="text-xl text-slate-600 dark:text-slate-400 leading-relaxed max-w-2xl mx-auto">
              「気づいた時には手遅れ」という悲劇をゼロに。AIが毎日あなたの冷蔵庫を24時間体制で監視します。
            </p>
          </header>

          <section className="bg-orange-50 dark:bg-slate-900 p-10 md:p-16 rounded-[3rem] border border-orange-100 dark:border-slate-800 shadow-sm relative overflow-hidden">
            <div className="flex flex-col md:flex-row gap-12 items-center relative z-10">
              <div className="flex-1 space-y-6">
                <h2 className="text-3xl font-bold text-orange-900 dark:text-white">
                  毎朝7:00の自動スキャン
                </h2>
                <p className="text-orange-900/70 dark:text-slate-400 leading-relaxed text-lg">
                  Vercel Cron
                  テクノロジーを使用し、毎朝サーバー側で在庫データを一斉チェック。
                  賞味期限が3日以内に迫っている食材を見つけた場合、即座に向き合い方を提案します。
                </p>
              </div>
              <div className="w-full md:w-72 bg-white dark:bg-slate-800 p-8 rounded-3xl shadow-xl ring-1 ring-black/5 flex flex-col items-center text-center">
                <div className="w-16 h-1 bg-slate-200 dark:bg-slate-700 rounded-full mb-6" />
                <div className="text-red-500 mb-4 animate-bounce">
                  <svg
                    className="w-12 h-12"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                    />
                  </svg>
                </div>
                <div className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-1">
                  Expiration Alert
                </div>
                <div className="text-lg font-bold dark:text-white">
                  期限が迫っています
                </div>
                <div className="mt-4 px-4 py-2 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-full text-xs font-bold">
                  鶏肉：あと2日
                </div>
              </div>
            </div>
            {/* Decoration background */}
            <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 w-64 h-64 bg-orange-200/20 rounded-full blur-3xl pointer-events-none" />
          </section>

          <section className="space-y-12">
            <h2 className="text-3xl font-bold dark:text-white text-center">
              柔軟な通知設定
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="p-10 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[2.5rem] shadow-sm">
                <h3 className="text-2xl font-bold mb-6 dark:text-white">
                  標準通知 (Free)
                </h3>
                <ul className="space-y-4">
                  {[
                    "アプリ内ベル通知でお知らせ",
                    "週1回の在庫管理サマリー",
                    "基本的な期限検出",
                  ].map((text) => (
                    <li
                      key={text}
                      className="flex gap-3 text-slate-600 dark:text-slate-400"
                    >
                      <svg
                        className="w-5 h-5 text-indigo-500 flex-shrink-0"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                          clipRule="evenodd"
                        />
                      </svg>
                      {text}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="p-10 bg-indigo-600 rounded-[2.5rem] shadow-2xl shadow-indigo-200 dark:shadow-none relative overflow-hidden">
                <div className="relative z-10">
                  <h3 className="text-2xl font-bold mb-6 text-white flex items-center gap-2">
                    優先通知 (Pro)
                    <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full border border-white/30">
                      RECOMMENDED
                    </span>
                  </h3>
                  <ul className="space-y-4">
                    {["期限5日目からの先行アラート"].map((text) => (
                      <li key={text} className="flex gap-3 text-indigo-100">
                        <svg
                          className="w-5 h-5 text-indigo-300 flex-shrink-0"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                            clipRule="evenodd"
                          />
                        </svg>
                        {text}
                      </li>
                    ))}
                  </ul>
                </div>
                {/* Decoration */}
                <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 w-48 h-48 bg-white/10 rounded-full blur-2xl font-serif" />
              </div>
            </div>
          </section>

          <footer className="pt-12 text-center">
            <Link
              href="/login"
              className="px-12 py-5 bg-indigo-600 text-white font-extrabold rounded-full hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 dark:shadow-none hover:-translate-y-1"
            >
              食材ロス削減を今すぐ開始
            </Link>
          </footer>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-slate-50 dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 py-12">
        <div className="max-w-4xl mx-auto px-6 text-center space-y-4">
          <div className="flex items-center justify-center gap-2">
            <div className="block dark:hidden">
              <Image
                src="/my-fridgeai-logo-light.png"
                alt="My-fridgeai Logo"
                width={120}
                height={40}
                className="w-40 h-12"
              />
            </div>
            <div className="hidden dark:block">
              <Image
                src="/my-fridgeai-logo-dark.png"
                alt="My-fridgeai Logo"
                width={120}
                height={40}
                className="w-40 h-12"
              />
            </div>
          </div>
          <p className="text-sm text-slate-500">
            © {new Date().getFullYear()} My-fridgeai. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
