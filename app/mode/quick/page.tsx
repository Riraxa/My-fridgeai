// app/mode/quick/page.tsx
"use client";

import React, { useEffect, useState } from "react";
import PageTransition, { HeaderTransition, ContentTransition } from "@/app/components/PageTransition";
import { ArrowLeft, ChefHat, Zap, Clock, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";

export default function QuickModePage() {
  const router = useRouter();
  const [recommendation, setRecommendation] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRecommendation = async () => {
      try {
        const res = await fetch("/api/menu/quick");
        if (res.ok) {
          const data = await res.json();
          setRecommendation(data.recommendation);
        }
      } catch (error) {
        console.error("Failed to fetch quick recipe:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchRecommendation();
  }, []);

  return (
    <PageTransition className="container mx-auto min-h-screen p-4 pb-32 max-w-2xl">
      <HeaderTransition className="flex items-center gap-3 mb-6">
        <button
          onClick={() => router.push("/home")}
          className="p-2 rounded-full hover:bg-[var(--surface-bg)] transition-colors text-[var(--color-text-secondary)]"
        >
          <ArrowLeft size={20} />
        </button>
        <div className="flex items-center gap-2">
          <div className="bg-amber-100 text-amber-600 p-2 rounded-full">
            <Zap size={18} />
          </div>
          <h1 className="font-bold text-lg text-[var(--color-text-primary)]">クイック決定モード</h1>
        </div>
      </HeaderTransition>

      <ContentTransition>
        {loading ? (
          <div className="flex flex-col items-center justify-center p-12 text-[var(--color-text-muted)] gap-4 animate-pulse">
            <ChefHat size={48} className="text-amber-500 animate-bounce" />
            <p>15分以内で作れる最速レシピを検索中...</p>
          </div>
        ) : recommendation ? (
          <div className="bg-[var(--card-bg)] border border-[var(--surface-border)] rounded-3xl p-6 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500 opacity-5 rounded-bl-full pointer-events-none" />
            
            <h2 className="text-2xl font-black mb-3 text-[var(--color-text-primary)] leading-tight relative z-10">
              {recommendation.title}
            </h2>
            <p className="text-sm text-[var(--color-text-secondary)] mb-6 leading-relaxed bg-[var(--surface-lighter)] p-4 rounded-xl border-l-4 border-amber-500 relative z-10">
              <span className="font-bold block mb-1">⚡ 時短の秘訣</span>
              {recommendation.reason}
            </p>

            <div className="grid grid-cols-2 gap-4 mb-6 relative z-10">
              <div className="bg-[var(--surface-lighter)] p-3 rounded-xl border border-[var(--surface-border)]">
                <span className="text-xs text-[var(--color-text-secondary)] block mb-1">調理時間</span>
                <div className="flex items-center gap-1.5 font-bold text-sm">
                  <Clock size={16} className="text-orange-500" />
                  <span className="text-orange-600">{recommendation.cookingTimeMinutes}分</span>
                </div>
              </div>
              <div className="bg-[var(--surface-lighter)] p-3 rounded-xl border border-[var(--surface-border)]">
                <span className="text-xs text-[var(--color-text-secondary)] block mb-1">手軽さ</span>
                <div className="flex items-center gap-1.5 font-bold text-sm">
                  <Sparkles size={16} className="text-blue-500" />
                  {recommendation.difficulty}
                </div>
              </div>
            </div>

            <div className="mb-6 relative z-10">
              <h3 className="font-bold text-sm mb-3">使用する食材</h3>
              <ul className="flex flex-wrap gap-2">
                {recommendation.usedIngredients.map((ing: string, i: number) => (
                  <li key={i} className="text-sm px-3 py-1 bg-[var(--surface-lighter)] text-[var(--color-text-primary)] border border-[var(--surface-border)] rounded-full font-medium">
                    {ing}
                  </li>
                ))}
              </ul>
            </div>

            <div className="relative z-10">
              <h3 className="font-bold text-sm mb-3">最速ステップ</h3>
              <ol className="space-y-3">
                {recommendation.steps.map((step: string, index: number) => (
                  <li key={index} className="flex gap-3 text-sm">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-amber-500 text-white flex items-center justify-center font-bold text-xs mt-0.5">
                      {index + 1}
                    </span>
                    <span className="text-[var(--color-text-primary)] leading-relaxed pt-0.5">{step}</span>
                  </li>
                ))}
              </ol>
            </div>
            
            <button
              onClick={() => router.push("/home")}
              className="mt-8 w-full continue-btn font-bold py-3 text-sm shadow-md flex items-center justify-center gap-2 relative z-10"
              style={{ background: "var(--accent)" }}
            >
              ホームへ戻る
            </button>
          </div>
        ) : (
          <div className="text-center p-8 text-[var(--color-text-muted)]">
            おすすめが見つかりませんでした。
          </div>
        )}
      </ContentTransition>
    </PageTransition>
  );
}
