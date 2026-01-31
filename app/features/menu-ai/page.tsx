//app/features/menu-ai/page.tsx
/**
 * Page: /features/menu-ai
 * - public
 * - SEO keywords: 献立, AI献立, 余り物 献立
 */

import React from "react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

const SITE_URL =
  process.env.NEXT_PUBLIC_BASE_URL ?? "https://www.my-fridgeai.com";

export const metadata: Metadata = {
  title: "AIで献立を自動生成 | My-fridgeai",
  description:
    "手持ちの食材と賞味期限を考慮して、メイン／代替案A（ジャンル違い）／代替案B（時短15分）を一度に3案生成します。",
  openGraph: {
    title: "AIで献立を自動生成 | My-fridgeai",
    description:
      "在庫とユーザーの調理スキル・設備を考慮した実用的な献立を3案生成。",
    url: `${SITE_URL}/features/menu-ai`,
    images: [`${SITE_URL}/og-images/og-top.png`],
  },
  alternates: {
    canonical: SITE_URL,
  },
};

export default function MenuAiPage() {
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
              className="hover:text-indigo-600 transition-colors"
            >
              在庫管理
            </Link>
            <Link href="/features/menu-ai" className="text-indigo-600">
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
            <div className="inline-block px-4 py-1.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 text-sm font-bold rounded-full">
              献立の悩みをAIで解決
            </div>
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              AIで献立を<span className="text-indigo-600">自動生成</span>
            </h1>
            <p className="text-xl text-slate-600 dark:text-slate-400 leading-relaxed max-w-2xl mx-auto">
              「今日何作ろう？」のストレスをゼロに。冷蔵庫にあるものだけで作れる、最適なレシピを3パターン提供します。
            </p>
          </header>

          <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-8 bg-gradient-to-br from-indigo-50 to-white dark:from-slate-900 dark:to-slate-950 border border-indigo-100 dark:border-slate-800 rounded-3xl shadow-sm">
              <span className="text-3xl mb-4 block">🍳</span>
              <h3 className="text-xl font-bold mb-3 dark:text-white">
                案1：おすすめ
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                栄養バランスと、今すぐ消費すべき食材を完璧に調和させた王道献立。
              </p>
            </div>
            <div className="p-8 bg-gradient-to-br from-violet-50 to-white dark:from-slate-900 dark:to-slate-950 border border-violet-100 dark:border-slate-800 rounded-3xl shadow-sm">
              <span className="text-3xl mb-4 block">🌶️</span>
              <h3 className="text-xl font-bold mb-3 dark:text-white">
                案2：冒険献立
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                案1とは異なるジャンルや味付けで、食卓に変化をもたらす刺激的な提案。
              </p>
            </div>
            <div className="p-8 bg-gradient-to-br from-emerald-50 to-white dark:from-slate-900 dark:to-slate-950 border border-emerald-100 dark:border-slate-800 rounded-3xl shadow-sm">
              <span className="text-3xl mb-4 block">⚡</span>
              <h3 className="text-xl font-bold mb-3 dark:text-white">
                案3：爆速時短
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                仕事終わりでも続けられる。15分以内で完成する、極限まで手間を省いたレシピ。
              </p>
            </div>
          </section>

          <section className="space-y-12">
            <h2 className="text-3xl font-bold dark:text-white text-center">
              こだわりの生成ロジック
            </h2>
            <div className="grid grid-cols-1 gap-8">
              {[
                {
                  icon: "📅",
                  title: "賞味期限を最優先",
                  desc: "数日以内に期限が切れる食材を自動検知し、それらを主役にしたメニューを優先的に組み立てます。",
                },
                {
                  icon: "🧑‍🍳",
                  title: "スキル・設備をカスタマイズ",
                  desc: "「レンジしかない」「魚は捌けない」といったユーザープロファイルに合わせ、手順の難易度をリアルタイムに調節。",
                },
                {
                  icon: "💎",
                  title: "Pro版：さらなる深みへ",
                  desc: "Proプランでは、PFCバランス（タンパク質・脂質・炭水化物）やカロリーを計算した、より健康志向な提案も行います。",
                },
              ].map((item) => (
                <div
                  key={item.title}
                  className="flex flex-col md:flex-row gap-6 p-8 bg-slate-50 dark:bg-slate-900 rounded-[2rem] items-center"
                >
                  <div className="w-16 h-16 bg-white dark:bg-slate-800 rounded-2xl flex items-center justify-center text-3xl shadow-sm">
                    {item.icon}
                  </div>
                  <div className="text-center md:text-left">
                    <h4 className="text-xl font-bold mb-2 dark:text-white">
                      {item.title}
                    </h4>
                    <p className="text-slate-600 dark:text-slate-400 leading-relaxed max-w-xl">
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
              AI献立を今すぐ体験
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
