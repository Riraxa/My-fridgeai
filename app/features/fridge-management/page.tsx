/**
 * Page: /features/fridge-management
 * - public
 * - SEO keywords: 冷蔵庫管理, 在庫管理, 食材管理
 */

import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

const SITE_URL =
  process.env.NEXT_PUBLIC_BASE_URL ?? "https://www.my-fridgeai.com";

export const metadata: Metadata = {
  title: "食材管理・冷蔵庫管理 | My-fridgeai",
  description:
    "バーコード読み取りで簡単登録！数値管理・ざっくり管理に対応した食材管理アプリ。賞味期限自動管理で食品ロスを削減。冷蔵庫の在庫を効率的に管理。",
  openGraph: {
    title: "冷蔵庫の在庫管理機能 | My-fridgeai",
    description:
      "数値管理／ざっくり管理に対応。バーコードで簡単登録、賞味期限アラートで食材ロスを削減。",
    url: `${SITE_URL}/features/fridge-management`,
    images: [`${SITE_URL}/og-images/og-top.png`],
  },
};

export default function FridgeManagementPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 font-sans">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md border-b border-slate-100 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="block dark:hidden">
              <Image
                src="/my-fridgeai-logo.png"
                alt="My-fridgeai Logo"
                width={120}
                height={40}
                className="w-32 h-12 md:w-40 md:h-14"
              />
            </div>
            <div className="hidden dark:block">
              <Image
                src="/my-fridgeai-logo-white.png"
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
              className="text-indigo-600"
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
            <div className="inline-block px-4 py-1.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-sm font-bold rounded-full">
              スマートな在庫管理
            </div>
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              冷蔵庫の在庫管理
              <br />
              <span className="text-indigo-600">（数値 & レベル）</span>
            </h1>
            <p className="text-xl text-slate-600 dark:text-slate-400 leading-relaxed max-w-2xl mx-auto">
              「きっちり管理」も「ざっくり管理」も。あなたのライフスタイルに寄り添う、柔軟な在庫管理システムです。
            </p>
          </header>

          <section className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="p-10 bg-slate-50 dark:bg-slate-900 rounded-[2.5rem] space-y-6 border border-slate-100 dark:border-slate-800">
              <div className="w-12 h-12 bg-indigo-600 text-white rounded-2xl flex items-center justify-center font-bold text-xl">
                1
              </div>
              <h2 className="text-2xl font-bold dark:text-white">
                バーコードで瞬時に登録
              </h2>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                スマートフォンのカメラでバーコードをスキャン。商品データベースから情報を自動取得し、在庫への追加が数秒で完了します。
              </p>
            </div>
            <div className="p-10 bg-slate-50 dark:bg-slate-900 rounded-[2.5rem] space-y-6 border border-slate-100 dark:border-slate-800">
              <div className="w-12 h-12 bg-indigo-400 text-white rounded-2xl flex items-center justify-center font-bold text-xl">
                2
              </div>
              <h2 className="text-2xl font-bold dark:text-white">
                数値と感覚のハイブリッド
              </h2>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                「牛乳
                200ml」といった詳細管理はもちろん、「たまご：少ない」といった感覚的な管理も可能。忙しい日でも続けられます。
              </p>
            </div>
          </section>

          <section className="space-y-10">
            <h2 className="text-3xl font-bold dark:text-white text-center">
              多機能な在庫ツール
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[
                {
                  title: "バーコードスキャン",
                  desc: "高速読み取りで商品を追加",
                },
                {
                  title: "単位付き数値管理",
                  desc: "g, ml, 個, 枚など自由に設定",
                },
                { title: "3段階レベル管理", desc: "たっぷり / 普通 / 少ない" },
                {
                  title: "賞味期限の自動推定",
                  desc: "過去のデータから期限を予測",
                },
                {
                  title: "カテゴリー別整理",
                  desc: "野菜、肉、調味料などを自動分類",
                },
                { title: "在庫切れ予測", desc: "消費ペースをAIが学習" },
              ].map((item) => (
                <div
                  key={item.title}
                  className="flex gap-4 p-6 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-sm"
                >
                  <div className="flex-shrink-0">
                    <svg
                      className="w-6 h-6 text-green-500"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  </div>
                  <div>
                    <h4 className="font-bold dark:text-white">{item.title}</h4>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      {item.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <footer className="pt-12 text-center">
            <Link
              href="/login"
              className="px-12 py-5 bg-indigo-600 text-white font-extrabold rounded-full hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 dark:shadow-none hover:-translate-y-1"
            >
              無料で在庫管理を始める
            </Link>
          </footer>
        </div>
      </main>

      {/* Footer (Simplified) */}
      <footer className="bg-slate-50 dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 py-12">
        <div className="max-w-4xl mx-auto px-6 text-center space-y-4">
          <div className="flex items-center justify-center gap-2">
            <div className="block dark:hidden">
              <Image
                src="/my-fridgeai-logo.png"
                alt="My-fridgeai Logo"
                width={120}
                height={40}
                className="w-40 h-12"
              />
            </div>
            <div className="hidden dark:block">
              <Image
                src="/my-fridgeai-logo-white.png"
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
