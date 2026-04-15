// app/home/components/TodayRecommendation.tsx
"use client";

import React, { useEffect, useState } from "react";
import { ChefHat, Clock, Flame, ShoppingBag, Sparkles, ChevronRight } from "lucide-react";
import { useRouter } from "next/navigation";

interface Recommendation {
  title: string;
  reason: string;
  missingIngredients: string[];
  usedIngredients: string[];
  cookingTimeMinutes: number;
  difficulty: "簡単" | "普通" | "難しい";
}

const STORAGE_KEY = "todayRecommendation";
const STORAGE_TIMESTAMP_KEY = "todayRecommendationTs";
const CACHE_TTL_MS = 60 * 60 * 1000; // 1時間

export default function TodayRecommendation() {
  const router = useRouter();
  const [recommendation, setRecommendation] = useState<Recommendation | null>(null);
  const [loading, setLoading] = useState(true);

  // sessionStorageから復元
  useEffect(() => {
    try {
      const cached = sessionStorage.getItem(STORAGE_KEY);
      const ts = sessionStorage.getItem(STORAGE_TIMESTAMP_KEY);
      if (cached && ts) {
        const age = Date.now() - parseInt(ts, 10);
        if (age < CACHE_TTL_MS) {
          setRecommendation(JSON.parse(cached));
          setLoading(false);
        }
      }
    } catch {
      // storage access error (e.g. private mode)
    }
  }, []);

  useEffect(() => {
    const fetchRecommendation = async () => {
      try {
        const res = await fetch("/api/recommend/today");
        if (res.ok) {
          const data = await res.json();
          if (data.recommendation) {
            setRecommendation(data.recommendation);
            // sessionStorageに保存
            try {
              sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data.recommendation));
              sessionStorage.setItem(STORAGE_TIMESTAMP_KEY, Date.now().toString());
            } catch {
              // ignore storage errors
            }
          }
        }
      } catch (error) {
        console.error("Failed to fetch today's recommendation:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchRecommendation();
  }, []);

  if (loading) {
    return (
      <div className="w-full h-40 rounded-3xl bg-[var(--surface-bg)] animate-pulse flex flex-col justify-center items-center opacity-70">
        <Sparkles className="text-[var(--accent)] mb-2" />
        <span className="text-sm font-medium text-[var(--color-text-muted)]">
          今日の最適解を探しています...
        </span>
      </div>
    );
  }

  if (!recommendation) {
    return null; // データがない場合は何も表示しない
  }

  return (
    <div
      className="relative overflow-hidden rounded-[2rem] p-6 shadow-xl w-full"
      style={{
        background: "linear-gradient(135deg, rgba(255, 140, 61, 0.1) 0%, rgba(255, 140, 61, 0.02) 100%)",
        border: "1px solid color-mix(in srgb, var(--accent) 30%, transparent)",
      }}
    >
      <div className="flex items-center gap-2 mb-3">
        <div className="bg-[var(--accent)] text-white p-1.5 rounded-full shadow-md">
          <ChefHat size={16} />
        </div>
        <h2 className="text-sm font-bold text-[var(--color-text-secondary)] tracking-wider">
          今日のオススメ
        </h2>
      </div>

      <div className="mb-4">
        <h3 className="text-2xl font-black text-[var(--color-text-primary)] mb-2 leading-tight">
          {recommendation.title}
        </h3>
        <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">
          {recommendation.reason}
        </p>
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        <div className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-[var(--surface-bg)] border border-[var(--surface-border)] text-[var(--color-text-secondary)]">
          <Clock size={12} />
          {recommendation.cookingTimeMinutes}分
        </div>
        <div className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-[var(--surface-bg)] border border-[var(--surface-border)] text-[var(--color-text-secondary)]">
          <Flame size={12} />
          {recommendation.difficulty}
        </div>
        {recommendation.missingIngredients.length > 0 && (
          <div className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-red-50 dark:bg-rose-950/30 border border-red-200 dark:border-rose-900/50 text-red-600 dark:text-rose-400">
            <ShoppingBag size={12} />
            不足 {recommendation.missingIngredients.length}品
          </div>
        )}
      </div>

      <div className="flex gap-3">
        <button
          onClick={() => router.push("/menu/generate")}
          className="flex-1 continue-btn font-bold py-3 text-sm shadow-lg flex items-center justify-center gap-2"
        >
          作り方を見る
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}
