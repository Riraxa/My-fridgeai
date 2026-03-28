"use client";

import Link from "next/link";
import { useState } from "react";

const steps = [
  {
    number: 1,
    title: "食材を登録",
    description: "冷蔵庫にある食材を登録します。バーコードスキャンやレシート撮影で、入力の手間を最小限に抑えられます。",
    details: [
      "バーコードスキャン: 商品を「ピッ」とするだけ",
      "レシート読み取り: 複数の食材を一括登録",
      "手動入力: 自由な名前で登録"
    ],
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
    color: "bg-[var(--semantic-blue-bg)] text-[var(--semantic-blue)]"
  },
  {
    number: 2,
    title: "AIが献立を生成",
    description: "登録された食材情報をもとに、AIが最適な献立を3案提案します。栄養バランスや好みを考慮します。",
    details: [
      "食材の組み合わせを考慮",
      "栄養バランスを考慮",
      "好みの味付けに対応",
      "調理時間の考慮"
    ],
    icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>,
    color: "bg-[var(--semantic-indigo-bg)] text-[var(--semantic-indigo)]"
  },
  {
    number: 3,
    title: "料理を作る",
    description: "提案されたレシピを確認して、すぐに料理を開始できます。調理手順や必要な材料も表示されます。",
    details: [
      "レシピの詳細表示",
      "調理手順のステップガイド",
      "必要な材料の一覧",
      "調理時間の目安"
    ],
    icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>,
    color: "bg-[var(--semantic-orange-bg)] text-[var(--semantic-orange)]"
  },
  {
    number: 4,
    title: "食材を管理",
    description: "使った食材は自動で在庫から減少し、冷蔵庫の状況をリアルタイムで確認できます。賞味期限の通知も設定可能です。",
    details: [
      "在庫数の自動更新",
      "賞味期限の通知",
      "冷蔵庫の状況確認",
      "家族での共有"
    ],
    icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>,
    color: "bg-[var(--semantic-green-bg)] text-[var(--semantic-green)]"
  },
  {
    number: 5,
    title: "食材ロスを削減",
    description: "賞味期限が近い食材を優先的に使う献立を提案したり、通知機能で使い忘れを防ぎます。食品ロスの削減に貢献します。",
    details: [
      "賞味期限の優先消費",
      "使い忘れ防止の通知",
      "食品ロス削減の統計",
      "環境にやさしい取り組み"
    ],
    icon: "🌱",
    color: "bg-[var(--semantic-red-bg)] text-[var(--semantic-red)]"
  }
];

export default function HowItWorksClient() {
  const [currentStep, setCurrentStep] = useState<number | null>(null);

  return (
    <div className="min-h-screen bg-[var(--background)] font-sans">
      {/* Header */}
      <header className="bg-[var(--background)] border-b border-[var(--surface-border)]">
        <div className="max-w-6xl mx-auto px-6 py-8">
          <Link href="/" className="inline-flex items-center gap-2 text-[var(--color-text-secondary)] hover:text-slate-900 dark:hover:text-white transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            トップに戻る
          </Link>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-16">
        {/* Hero Section */}
        <section className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold text-[var(--color-text-primary)] mb-6">
            My-fridgeaiの使い方
          </h1>
          <p className="text-xl text-[var(--color-text-secondary)] max-w-3xl mx-auto leading-relaxed">
            5つの簡単ステップで、冷蔵庫の食材管理から献立作成まで。
            AIが毎日の料理をもっと楽しくします。
          </p>
        </section>

        {/* Steps Overview */}
        <section className="mb-20">
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6">
            {steps.map((step) => (
              <button
                key={step.number}
                onClick={() => setCurrentStep(currentStep === step.number ? null : step.number)}
                className={`relative p-6 bg-[var(--background)] border-2 rounded-2xl transition-all duration-300 ${
                  currentStep === step.number
                    ? 'border-indigo-500 shadow-lg shadow-indigo-500/20'
                    : 'border-[var(--surface-border)] hover:border-indigo-300 dark:hover:border-indigo-700 hover:shadow-md'
                }`}
              >
                <div className="flex flex-col items-center text-center">
                  <div className={`w-16 h-16 ${step.color} rounded-2xl flex items-center justify-center text-3xl mb-4 group-hover:scale-110 transition-transform`}>
                    {step.icon}
                  </div>
                  <div className="text-center">
                    <div className="flex items-center justify-center mb-2">
                      <span className={`w-8 h-8 ${step.color} rounded-full flex items-center justify-center text-white font-bold text-sm`}>
                        Step {step.number}
                      </span>
                    </div>
                    <h3 className="text-xl font-bold text-[var(--color-text-primary)] mb-3">
                      {step.title}
                    </h3>
                    <p className="text-[var(--color-text-secondary)] leading-relaxed">
                      {step.description}
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </section>

        {/* Step Details */}
        {currentStep && (
          <section className="mb-20 bg-[var(--surface-bg)] rounded-3xl p-8 md:p-12">
            <div className="max-w-4xl mx-auto">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl font-bold text-[var(--color-text-primary)]">
                  Step {currentStep}: {steps.find(s => s.number === currentStep)?.title}
                </h2>
                <button
                  onClick={() => setCurrentStep(null)}
                  className="text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] dark:hover:text-slate-300 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-6">
                    詳細な手順
                  </h3>
                  <ul className="space-y-4">
                    {steps.find(s => s.number === currentStep)?.details.map((detail, index) => (
                      <li key={index} className="flex items-start gap-3">
                        <svg className="w-5 h-5 text-indigo-500 dark:text-indigo-400 flex-shrink-0 mt-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <span className="text-[var(--color-text-secondary)]">
                          {detail}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
                
                <div>
                  <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-6">
                    ポイント
                  </h3>
                  <div className="space-y-4">
                    <div className="p-4 bg-[var(--semantic-indigo-bg)] rounded-xl">
                      <h4 className="font-semibold text-[var(--semantic-indigo)] mb-2">
                        💡 ヒント
                      </h4>
                      <p className="text-[var(--color-text-secondary)]">
                        {currentStep === 1 && "バーコードスキャン機能を使うと、国内の数万点の食品データから自動で賞味期限を推定します。まとめ買いには連続スキャンが便利です。"}
                        {currentStep === 2 && "好みの設定で、より自分に合った献立が提案されます。"}
                        {currentStep === 3 && "調理時間が短いレシピから試してみましょう。"}
                        {currentStep === 4 && "定期的に在庫確認をする習慣をつけましょう。"}
                        {currentStep === 5 && "賞味期限が近いものから使う献立を優先的に選びましょう。"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              
              
            </div>
          </section>
        )}

        {/* CTA Section */}
        <section className="text-center mb-20">
          <h2 className="text-2xl font-bold text-[var(--color-text-primary)] mb-6">
            さあ、My-fridgeaiを使ってみる
          </h2>
          <p className="text-[var(--color-text-secondary)] mb-8 max-w-2xl mx-auto">
            5つのステップで簡単に始められます。
            今すぐ無料で登録して、AI献立生成を体験しましょう。
          </p>
          <Link
            href="/login"
            className="inline-flex items-center px-10 py-5 bg-[var(--semantic-indigo)] hover:opacity-90 text-[#ffffff] font-bold text-lg rounded-full transition-all shadow-xl hover:-translate-y-0.5"
          >
            My-fridgeaiを使ってみる
            <svg className="w-5 h-5 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </section>

        {/* Related Links */}
        <section className="mb-20">
          <h2 className="text-2xl font-bold text-[var(--color-text-primary)] mb-8 text-center">
            関連ページ
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Link
              href="/features"
              className="flex items-center gap-4 p-6 bg-[var(--background)] border border-[var(--surface-border)] rounded-2xl hover:shadow-lg transition-shadow"
            >
              <div className="w-12 h-12 bg-[var(--semantic-indigo-bg)] rounded-xl flex items-center justify-center text-xl"><svg className="w-6 h-6 text-[var(--semantic-indigo)]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg></div>
              <div>
                <h3 className="font-semibold text-[var(--color-text-primary)] mb-1">
                  機能紹介
                </h3>
                <p className="text-[var(--color-text-secondary)] text-sm">
                  主要機能の詳細を確認
                </p>
              </div>
            </Link>
            
            <Link
              href="/features/ingredients-recipes"
              className="flex items-center gap-4 p-6 bg-[var(--background)] border border-[var(--surface-border)] rounded-2xl hover:shadow-lg transition-shadow"
            >
              <div className="w-12 h-12 bg-[var(--semantic-orange-bg)] rounded-xl flex items-center justify-center text-xl"><svg className="w-6 h-6 text-[var(--semantic-orange)]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg></div>
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
              <div className="w-12 h-12 bg-[var(--semantic-purple-bg)] rounded-xl flex items-center justify-center text-xl"><svg className="w-6 h-6 text-[var(--semantic-purple)]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg></div>
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
