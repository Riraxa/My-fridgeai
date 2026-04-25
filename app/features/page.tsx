/**
 * Page: /features
 * - public
 * - SEO keywords: 機能紹介, My-fridgeai 機能, AI献立アプリ 機能
 */

import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";

const SITE_URL =
  process.env.NEXT_PUBLIC_BASE_URL ?? "https://www.my-fridgeai.com";

export const metadata: Metadata = {
  title: "My-fridgeai 機能紹介 | AI冷蔵庫管理アプリ",
  description:
    "My-fridgeaiの機能紹介ページです。AI献立生成、冷蔵庫食材管理、レシート自動登録など、料理を楽にする便利な機能を詳しく解説します。",
  openGraph: {
    title: "My-fridgeai 機能紹介 | AI冷蔵庫管理アプリ",
    description:
      "My-fridgeaiの主要機能を紹介。AI献立生成、食材管理、レシート読み取りなど便利な機能。",
    url: `${SITE_URL}/features`,
    images: [`${SITE_URL}/og-images/og-top.png`],
  },
  alternates: {
    canonical: `${SITE_URL}/features`,
  },
};

const features = [
  {
    id: "ai-meal-generation",
    title: "AI献立生成",
    description: "冷蔵庫にある食材からAIが献立を自動生成します。食材ロスを減らし、毎日の料理の負担を軽減します。",
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    ),
    iconBg: "bg-[var(--semantic-indigo-bg)] text-[var(--semantic-indigo)]",
    details: [
      "冷蔵庫の食材を自動認識",
      "複数案を提案（バランス案＋特化案）",
      "栄養バランスを考慮",
      "好みの味付けに対応"
    ],
    link: "/features/ai-menu"
  },
  {
    id: "fridge-management",
    title: "冷蔵庫食材管理",
    description: "冷蔵庫にある食材を一覧で管理できます。賞味期限の通知や在庫数の確認が簡単にできます。",
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
      </svg>
    ),
    iconBg: "bg-[var(--semantic-blue-bg)] text-[var(--semantic-blue)]",
    details: [
      "食材の一覧表示",
      "賞味期限管理",
      "在庫数の確認",
      "手入力と、レシート読み取り対応"
    ],
    link: "/features/inventory"
  },
  {
    id: "receipt-scanning",
    title: "レシート自動登録",
    description: "スーパー等のレシートをスマホで撮影するだけで、一括登録。AIが品目を賢く判別します。",
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
    iconBg: "bg-[var(--semantic-green-bg)] text-[var(--semantic-green)]",
    details: [
      "レシートの高速読み取り",
      "食材の自動判別",
      "買い物履歴の自動保存"
    ],
    link: "/features/receipt-scan"
  },
  {
    id: "recipe-search",
    title: "食材からレシピ検索",
    description: "冷蔵庫にある食材をもとに、作れる料理をAIが検索・提案します。献立の悩みを解消し、新しい料理の発見をサポートします。",
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
    ),
    iconBg: "bg-[var(--semantic-orange-bg)] text-[var(--semantic-orange)]",
    details: [
      "食材別のレシピ検索",
      "組み合わせ料理の提案",
      "調理法の提案",
      "新しい料理の発見"
    ],
    link: "/features/ingredients-recipes"
  },
  {
    id: "food-loss-reduction",
    title: "食材ロス削減サポート",
    description: "賞味期限が近い食材を優先的に使う献立を提案したり、期限通知で使い忘れを防ぎます。食品ロスの削減に貢献します。",
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    iconBg: "bg-[var(--semantic-red-bg)] text-[var(--semantic-red)]",
    details: [
      "賞味期限通知",
      "使い忘れ防止",
      "食材の優先消費",
      "食品ロス削減"
    ],
    link: "/features/reduce-food-waste"
  },
  {
    id: "recipe-from-fridge",
    title: "冷蔵庫レシピ",
    description: "冷蔵庫にある食材で料理を作る具体的な方法を解説。今ある食材の活用術、献立作成のコツ、簡単レシピを紹介します。",
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
      </svg>
    ),
    iconBg: "bg-[var(--semantic-blue-bg)] text-[var(--semantic-blue)]",
    details: [
      "今ある食材を活用",
      "献立作成のコツ",
      "簡単レシピ紹介"
    ],
    link: "/features/recipe-from-fridge"
  },
  {
    id: "leftover-ingredients",
    title: "余り物活用",
    description: "余った食材の活用レシピを詳しく紹介。リメイク料理、残り物のアレンジ方法、無駄なく使い切るコツを解説します。",
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
      </svg>
    ),
    iconBg: "bg-[var(--semantic-green-bg)] text-[var(--semantic-green)]",
    details: [
      "リメイク料理",
      "残り物アレンジ",
      "使い切るコツ"
    ],
    link: "/features/leftover-ingredients-recipes"
  }
];

export default function FeaturesPage() {
  return (
    <div className="min-h-screen bg-[var(--background)]">
      {/* Header */}
      <header className="bg-[var(--background)] border-b border-[var(--surface-border)]">
        <div className="max-w-6xl mx-auto px-6 py-8">
          <Link href="/" className="inline-flex items-center gap-2 text-[var(--color-text-secondary)] hover:text-slate-900 dark:hover:text-white transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            ホームに戻る
          </Link>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-16">
        {/* Hero Section */}
        <section className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold text-[var(--color-text-primary)] mb-6">
            My-fridgeaiの主な機能
          </h1>
          <p className="text-xl text-[var(--color-text-secondary)] max-w-3xl mx-auto leading-relaxed">
            AI献立生成、冷蔵庫食材管理、レシート自動登録など、
            料理を楽にする便利な機能を詳しく紹介します。
          </p>
        </section>

        {/* Features Grid */}
        <section className="mb-20">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature) => (
              <div
                key={feature.id}
                id={feature.id}
                className="group bg-[var(--background)] border border-[var(--surface-border)] rounded-2xl p-8 hover:shadow-lg hover:shadow-[var(--semantic-indigo)]/10 transition-all duration-300 hover:-translate-y-1"
              >
                <div className="flex items-start gap-6 mb-6">
                  <div className={`w-16 h-16 ${feature.iconBg} rounded-2xl flex items-center justify-center text-3xl group-hover:scale-110 transition-transform`}>
                    {feature.icon}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-2xl font-bold text-[var(--color-text-primary)] mb-4 group-hover:text-[var(--semantic-indigo)] dark:group-hover:text-indigo-400 transition-colors">
                      {feature.title}
                    </h3>
                    <p className="text-[var(--color-text-secondary)] leading-relaxed mb-6">
                      {feature.description}
                    </p>
                    <div className="space-y-2">
                      {feature.details.map((detail, index) => (
                        <div key={index} className="flex items-center gap-3">
                          <svg className="w-5 h-5 text-green-500 dark:text-green-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          <span className="text-[var(--color-text-secondary)] text-sm">
                            {detail}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                
                {/* Learn More Link */}
                {feature.link && (
                  <div className="mt-6">
                    <Link
                      href={feature.link}
                      className="inline-flex items-center text-[var(--semantic-indigo)] font-medium hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors"
                    >
                      詳しく見る
                      <svg className="w-4 h-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </Link>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Benefits Section */}
        <section className="mb-20 bg-[var(--surface-bg)] rounded-3xl p-8 md:p-12">
          <h2 className="text-2xl font-bold text-[var(--color-text-primary)] mb-8 text-center">
            My-fridgeaiが選ばれる理由
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-4 flex items-center gap-2">
                <svg className="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                料理の負担を軽減
              </h3>
              <p className="text-[var(--color-text-secondary)] leading-relaxed">
                AIが献立を考えることで、毎日の料理の悩みから解放されます。
                何を作ろうか考える時間がなくなり、他のことに集中できます。
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-4 flex items-center gap-2">
                <svg className="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                食材ロスを削減
              </h3>
              <p className="text-[var(--color-text-secondary)] leading-relaxed">
                賞味期限管理と献立提案で、使い忘れによる食品ロスを大幅に削減。
                環境にやさしく、家計の節約にも貢献します。
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-4 flex items-center gap-2">
                <svg className="w-6 h-6 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                簡単で使える
              </h3>
              <p className="text-[var(--color-text-secondary)] leading-relaxed">
                レシート読み取りで面倒な入力作業を不要に。
                スマホからすぐに始められ、誰でも簡単に使えます。
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-4 flex items-center gap-2">
                <svg className="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                家族で共有
              </h3>
              <p className="text-[var(--color-text-secondary)] leading-relaxed">
                家族全員で冷蔵庫の状況を共有。
                誰かが食材を使っても、他のメンバーにリアルタイムで通知されます。
              </p>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="text-center">
          <h2 className="text-3xl font-bold text-[var(--color-text-primary)] mb-6">
            さあ、My-fridgeaiを始めてみよう
          </h2>
          <p className="text-xl text-[var(--color-text-secondary)] mb-8 max-w-2xl mx-auto">
            料理の悩みから解放されて、もっと楽しいキッチンライフを送りましょう。
          </p>
          <Link
            href="/login"
            className="inline-flex items-center px-10 py-5 bg-[var(--semantic-indigo)] hover:opacity-90 text-[#ffffff] font-bold text-lg rounded-full transition-all shadow-xl hover:-translate-y-0.5"
          >
            無料で始める
            <svg className="w-5 h-5 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </section>

        {/* Related Links */}
        <section className="mt-20">
          <h2 className="text-2xl font-bold text-[var(--color-text-primary)] mb-8 text-center">
            関連ページ
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Link
              href="/features/ingredients-recipes"
              className="flex items-center gap-4 p-6 bg-[var(--background)] border border-[var(--surface-border)] rounded-2xl hover:shadow-lg transition-shadow"
            >
              <div className="w-12 h-12 bg-[var(--semantic-orange-bg)] rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-[var(--semantic-orange)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-[var(--color-text-primary)] mb-1">
                  食材レシピ
                </h3>
                <p className="text-[var(--color-text-secondary)] text-sm">
                  食材別の料理レシピを紹介
                </p>
              </div>
            </Link>
            <Link
              href="/faq"
              className="flex items-center gap-4 p-6 bg-[var(--background)] border border-[var(--surface-border)] rounded-2xl hover:shadow-lg transition-shadow"
            >
              <div className="w-12 h-12 bg-[var(--semantic-purple-bg)] rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-[var(--semantic-purple)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-[var(--color-text-primary)] mb-1">
                  よくある質問
                </h3>
                <p className="text-[var(--color-text-secondary)] text-sm">
                  使い方や機能に関するFAQ
                </p>
              </div>
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
