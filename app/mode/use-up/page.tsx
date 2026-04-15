// app/mode/use-up/page.tsx
"use client";

import React, { useEffect, useState } from "react";
import PageTransition, { HeaderTransition, ContentTransition } from "@/app/components/PageTransition";
import { ArrowLeft, ChefHat, Leaf, Clock, Zap } from "lucide-react";
import { useRouter } from "next/navigation";

export default function UseUpModePage() {
  const router = useRouter();
  const [recommendation, setRecommendation] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRecommendation = async () => {
      try {
        const res = await fetch("/api/menu/use-up");
        if (res.ok) {
          const data = await res.json();
          setRecommendation(data.recommendation);
        }
      } catch (error) {
        console.error("Failed to fetch use-up recipe:", error);
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
          <div className="bg-emerald-100 text-emerald-600 p-2 rounded-full">
            <Leaf size={18} />
          </div>
          <h1 className="font-bold text-lg text-[var(--color-text-primary)]">使い切りモード</h1>
        </div>
      </HeaderTransition>

      <ContentTransition>
        {loading ? (
          <div className="flex flex-col items-center justify-center p-12 text-[var(--color-text-muted)] gap-4 animate-pulse">
            <ChefHat size={48} className="text-emerald-500 animate-bounce" />
            <p>期限間近の食材を救済するレシピを熟考中...</p>
          </div>
        ) : recommendation ? (
          <div className="bg-[var(--card-bg)] border border-[var(--surface-border)] rounded-3xl p-6 shadow-xl">
            <h2 className="text-2xl font-black mb-3 text-[var(--color-text-primary)] leading-tight">
              {recommendation.title}
            </h2>
            <p className="text-sm text-[var(--color-text-secondary)] mb-6 leading-relaxed bg-[var(--surface-lighter)] p-4 rounded-xl border-l-4 border-emerald-500">
              <span className="font-bold block mb-1">💡 救済ポイント</span>
              {recommendation.reason}
            </p>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-[var(--surface-lighter)] p-3 rounded-xl border border-[var(--surface-border)]">
                <span className="text-xs text-[var(--color-text-secondary)] block mb-1">調理時間</span>
                <div className="flex items-center gap-1.5 font-bold text-sm">
                  <Clock size={16} className="text-amber-500" />
                  {recommendation.cookingTimeMinutes}分
                </div>
              </div>
              <div className="bg-[var(--surface-lighter)] p-3 rounded-xl border border-[var(--surface-border)]">
                <span className="text-xs text-[var(--color-text-secondary)] block mb-1">難易度</span>
                <div className="flex items-center gap-1.5 font-bold text-sm">
                  <Zap size={16} className="text-blue-500" />
                  {recommendation.difficulty}
                </div>
              </div>
            </div>

            <div className="mb-6">
              <h3 className="font-bold text-sm mb-3 flex items-center gap-2">
                <Leaf size={16} className="text-emerald-500" />
                救出対象の食材
              </h3>
              <ul className="flex flex-wrap gap-2">
                {recommendation.mainUsedIngredients.map((ing: string, i: number) => (
                  <li key={i} className="text-sm px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full font-medium">
                    {ing}
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="font-bold text-sm mb-3">作り方</h3>
              <ol className="space-y-3">
                {recommendation.steps.map((step: string, index: number) => (
                  <li key={index} className="flex gap-3 text-sm">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[var(--accent)] text-white flex items-center justify-center font-bold text-xs mt-0.5">
                      {index + 1}
                    </span>
                    <span className="text-[var(--color-text-primary)] leading-relaxed pt-0.5">{step}</span>
                  </li>
                ))}
              </ol>
            </div>
            
            <button
              onClick={() => router.push("/home")}
              className="mt-8 w-full continue-btn font-bold py-3 text-sm shadow-md flex items-center justify-center gap-2"
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
