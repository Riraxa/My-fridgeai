// app/components/menu/MenuConditionsForm.tsx
"use client";

import React from "react";
import { 
  Users, Zap, Brain, HelpCircle
} from "lucide-react";
import { Toggle } from "@/app/components/ui/toggle";

interface MenuConditionsFormProps {
  servings: number;
  setServings: (val: number) => void;
  budget: string;
  setBudget: (val: string) => void;
  enableBudget: boolean;
  setEnableBudget: (val: boolean) => void;
  strictMode: boolean;
  setStrictMode: (val: boolean) => void;
  loading: boolean;
  generated: any;
  onGenerate: () => void;
  isPro?: boolean; // Proプラン判定
}

export const MenuConditionsForm: React.FC<MenuConditionsFormProps> = ({
  servings,
  setServings,
  budget,
  setBudget,
  enableBudget,
  setEnableBudget,
  strictMode,
  setStrictMode,
  loading,
  generated,
  onGenerate,
  isPro = false,
}) => {
  if (generated) return null;

  return (
    <div className="card rounded-2xl p-6 shadow-sm border border-[var(--surface-border)] mb-8">
      <div className="flex items-center gap-2 mb-6">
        <div className="w-8 h-8 rounded-lg bg-[var(--accent-faded)] flex items-center justify-center text-[var(--accent)]">
          <Zap size={18} />
        </div>
        <h2 className="text-lg font-bold text-[var(--color-text-primary)]">
          生成オプション
        </h2>
      </div>

      <div className="space-y-6">
        {/* 人数設定 */}
        <div className="space-y-3">
          <label className="text-sm font-bold text-[var(--color-text-secondary)] flex items-center gap-2">
            <Users size={16} />
            人数
          </label>
          <div className="grid grid-cols-4 gap-2">
            {[1, 2, 3, 4].map((n) => (
              <button
                key={n}
                onClick={() => setServings(n)}
                className={`py-2.5 rounded-xl border text-sm font-medium transition ${
                  servings === n
                    ? "bg-[var(--accent)] border-[var(--accent)] text-white shadow-md"
                    : "bg-[var(--surface-bg)] border-[var(--surface-border)] text-[var(--color-text-secondary)] hover:border-[var(--accent)]"
                }`}
              >
                {n}人前
              </button>
            ))}
          </div>
        </div>

        {/* 予算設定 - Pro機能 */}
        <div className={`rounded-lg p-3 ${isPro ? 'bg-[var(--surface-bg)]' : 'bg-[var(--surface-bg)] opacity-60'} border border-[var(--surface-border)]`}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-orange-100 flex items-center justify-center">
                <span className="text-orange-600 text-xs font-bold">¥</span>
              </div>
              <span className="text-sm font-medium text-[var(--color-text-primary)]">
                1食あたりの予算
              </span>
              {isPro && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-orange-500 text-white font-medium">
                  Pro
                </span>
              )}
            </div>
            {/* トグルスイッチ */}
            <Toggle
              checked={enableBudget}
              onChange={() => {
                if (!isPro) return;
                const newValue = !enableBudget;
                setEnableBudget(newValue);
                if (newValue) setBudget("500");
                else setBudget("");
              }}
              disabled={!isPro}
            />
          </div>
          
          {enableBudget && isPro && (
            <div className="flex items-center gap-2 mt-2">
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={budget}
                onChange={(e) => setBudget(e.target.value.replace(/[^0-9]/g, ""))}
                placeholder="500"
                className="flex-1 px-3 py-2 bg-[var(--background)] border border-[var(--surface-border)] rounded-md outline-none focus:border-orange-500 text-[var(--color-text-primary)] text-base"
              />
              <span className="text-sm text-[var(--color-text-secondary)]">円/人</span>
            </div>
          )}
          
          {enableBudget && isPro && (
            <p className="text-xs text-[var(--color-text-muted)] mt-2">
              ※あくまで目安として考慮されます
            </p>
          )}
          
          {!isPro && enableBudget && (
            <p className="text-xs text-[var(--color-text-muted)] mt-2">
              ※Proプランで詳細な予算設定が可能です
            </p>
          )}
        </div>

        {/* 生成ロジック */}
        <div className="flex items-center justify-between py-3 border-b border-[var(--surface-border)]">
          <div className="flex items-center gap-2 text-sm text-[var(--color-text-secondary)]">
            <Brain size={16} />
            生成ロジック
          </div>
          <div className="group relative">
            <HelpCircle size={14} className="text-[var(--color-text-muted)] cursor-help" />
            <div className="absolute bottom-full right-0 mb-2 w-64 p-3 bg-gray-800 text-white text-[10px] rounded-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition duration-200 z-50">
              「冷蔵庫の食材のみ」は手持ちだけで完結させる厳しい制約です。「一部許可」は足りない食材をAIが2〜3品補って提案します。
            </div>
          </div>
        </div>
        
        <div className="flex gap-2 pl-6">
          <button
            onClick={() => setStrictMode(true)}
            className={`flex-1 py-2 px-3 rounded-lg border text-xs font-medium transition ${
              strictMode
                ? "bg-[var(--accent-faded)] border-[var(--accent)] text-[var(--accent)]"
                : "bg-[var(--surface-bg)] border-[var(--surface-border)] text-[var(--color-text-muted)]"
            }`}
          >
            冷蔵庫内のみ
          </button>
          <button
            onClick={() => setStrictMode(false)}
            className={`flex-1 py-2 px-3 rounded-lg border text-xs font-medium transition ${
              !strictMode
                ? "bg-[var(--accent-faded)] border-[var(--accent)] text-[var(--accent)]"
                : "bg-[var(--surface-bg)] border-[var(--surface-border)] text-[var(--color-text-muted)]"
            }`}
          >
            買い足し一部許可
          </button>
        </div>
      </div>

      <button
        onClick={onGenerate}
        disabled={loading}
        className="w-full mt-8 py-4 bg-[var(--accent)] text-white font-bold rounded-2xl shadow-lg hover:shadow-xl hover:opacity-90 disabled:opacity-50 disabled:shadow-none transition flex items-center justify-center gap-2 group"
      >
        {loading ? (
          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        ) : (
          <Zap size={20} className="group-hover:scale-110 transition" />
        )}
        <span>{loading ? "AI思考中..." : "献立を提案してもらう"}</span>
      </button>
    </div>
  );
};
