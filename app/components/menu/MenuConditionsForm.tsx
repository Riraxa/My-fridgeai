// app/components/menu/MenuConditionsForm.tsx
"use client";

import React, { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { 
  Users, Zap, Brain, HelpCircle, CircleDollarSign, Settings
} from "lucide-react";
import { Toggle } from "@/app/components/ui/toggle";

interface MenuConditionsFormProps {
  servings: number;
  setServings: (val: number) => void;
  budget: string;
  setBudget: (val: string) => void;
  enableBudget: boolean;
  setEnableBudget: (val: boolean) => void;
  generationMode: string;
  setGenerationMode: (val: any) => void;
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
  generationMode,
  setGenerationMode,
  loading,
  generated,
  onGenerate,
  isPro = false,
}) => {
  if (generated) return null;

  // 生成中はコンパクトなサマリーを表示
  if (loading) {
    return (
      <div className="card rounded-2xl p-4 shadow-sm border border-[var(--surface-border)] mb-6 bg-[var(--surface-bg)]/50">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
          <div className="flex items-center gap-2">
            <Users size={16} className="text-[var(--accent)]" />
            <span className="text-[var(--color-text-secondary)]">人数：</span>
            <span className="font-medium text-[var(--color-text-primary)]">{servings}人前</span>
          </div>
          <div className="flex items-center gap-2">
            <Brain size={16} className="text-[var(--accent)]" />
            <span className="text-[var(--color-text-secondary)]">モード：</span>
            <span className="font-medium text-[var(--color-text-primary)]">
              {generationMode === "strict" ? "冷蔵庫内のみ" : 
               generationMode === "flexible" ? "買い足しあり" :
               generationMode === "quick" ? "短時間調理" : "使い切り"}
            </span>
          </div>
          {isPro && enableBudget && (
            <div className="flex items-center gap-2">
              <span className="text-orange-500 text-xs font-bold">¥</span>
              <span className="text-[var(--color-text-secondary)]">予算：</span>
              <span className="font-medium text-[var(--color-text-primary)]">{budget}円/人</span>
            </div>
          )}
        </div>
      </div>
    );
  }

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
        <BudgetSection
          isPro={isPro}
          budget={budget}
          setBudget={setBudget}
          enableBudget={enableBudget}
          setEnableBudget={setEnableBudget}
        />

        {/* 生成ロジック */}
        <div className="flex items-center justify-between py-3 border-b border-[var(--surface-border)]">
          <div className="flex items-center gap-2 text-sm text-[var(--color-text-secondary)]">
            <Brain size={16} />
            生成ロジック
          </div>
          <HelpTooltip />
        </div>
        
        <div className="grid grid-cols-2 gap-2 pl-2">
          {[
            { id: "strict", label: "冷蔵庫内のみ", sub: "制約：強" },
            { id: "flexible", label: "買い足しあり", sub: "制約：弱" },
            { id: "quick", label: "時短優先", sub: "20分以内" },
            { id: "use-up", label: "使い切り", sub: "廃棄ゼロ" },
          ].map((m) => {
            const isActive = generationMode === m.id;
            return (
              <button
                key={m.id}
                onClick={() => setGenerationMode(m.id)}
                className={`flex flex-col items-center py-2 px-1 rounded-xl border transition ${
                  isActive
                    ? "bg-[var(--accent-faded)] border-[var(--accent)] text-[var(--accent)] shadow-sm"
                    : "bg-[var(--surface-bg)] border-[var(--surface-border)] text-[var(--color-text-muted)] hover:border-[var(--accent-faded)]"
                }`}
              >
                <span className="text-xs font-bold">{m.label}</span>
                <span className="text-[10px] opacity-70">{m.sub}</span>
              </button>
            );
          })}
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

// BudgetSection: 予算設定コンポーネント（Pro機能）
interface BudgetSectionProps {
  isPro?: boolean;
  budget: string;
  setBudget: (val: string) => void;
  enableBudget: boolean;
  setEnableBudget: (val: boolean) => void;
}

const BudgetSection: React.FC<BudgetSectionProps> = ({
  isPro = false,
  budget,
  setBudget,
  enableBudget,
  setEnableBudget,
}) => {
  const router = useRouter();

  return (
    <div className={`rounded-lg p-3 bg-[var(--surface-bg)] border border-[var(--surface-border)] relative overflow-hidden ${!isPro ? 'min-h-[200px]' : ''}`}>
      {/* フリープラン向け：ぼかしオーバーレイ */}
      {!isPro && (
        <div className="absolute inset-0 bg-[var(--background)]/70 backdrop-blur-[3px] z-10 flex flex-col items-center justify-center p-4 text-center">
          <div className="bg-[var(--semantic-blue)] text-white p-2.5 rounded-2xl mb-2 shadow-lg">
            <CircleDollarSign size={24} />
          </div>
          <h3 className="text-sm font-bold mb-1 text-[var(--color-text-primary)]">
            1食あたりの予算設定
          </h3>
          <p className="text-xs text-[var(--color-text-muted)] mb-3 px-2">
            予算を設定すると、AIがコストを考慮した献立を提案します。
          </p>
          <div className="flex flex-col w-full px-2">
            <button
              onClick={() => router.push("/settings/account")}
              className="bg-[var(--semantic-blue)] text-white px-8 py-3 rounded-2xl font-bold shadow-lg shadow-blue-100 hover:scale-105 active:scale-95 transition"
            >
              Proにアップグレード
            </button>
          </div>
        </div>
      )}

      <div inert={!isPro || undefined} className={!isPro ? "pointer-events-none" : ""}>
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
              const newValue = !enableBudget;
              setEnableBudget(newValue);
              if (newValue) setBudget("500");
              else setBudget("");
            }}
          />
        </div>

        {enableBudget && (
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

        {enableBudget && (
          <p className="text-xs text-[var(--color-text-muted)] mt-2">
            ※あくまで目安として考慮されます
          </p>
        )}
      </div>
    </div>
  );
};

// HelpTooltip: タッチデバイス対応のヘルプコンポーネント
const HelpTooltip: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // 外側クリックで閉じる
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("touchstart", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [isOpen]);

  // トグル開閉
  const handleToggle = (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    setIsOpen((prev) => !prev);
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={handleToggle}
        onTouchEnd={(e) => {
          e.preventDefault();
          handleToggle(e);
        }}
        className="flex items-center justify-center p-1 rounded-full hover:bg-[var(--surface-bg)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] transition"
        aria-label="生成ロジックの説明"
        aria-expanded={isOpen}
        aria-haspopup="dialog"
      >
        <HelpCircle size={16} className="text-[var(--color-text-muted)]" />
      </button>

      {/* Popover: モバイル対応の位置・サイズ調整 */}
      {isOpen && (
        <div
          role="dialog"
          aria-label="生成ロジックの説明"
          className="absolute bottom-full right-0 mb-2 w-72 sm:w-64 p-4 bg-gray-800 text-white text-xs rounded-xl shadow-2xl z-50 animate-in fade-in slide-in-from-bottom-2 duration-200"
          style={{ maxWidth: "calc(100vw - 2rem)" }}
        >
          <div className="flex justify-between items-start gap-2">
            <p className="leading-relaxed">
              「冷蔵庫内のみ」は手持ちだけで完結させる厳しい制約です。「買い足しあり」は足りない食材をAIが2〜3品補い、予算設定がある場合は節約レシピになります。「時短優先」は20分以内の献立、「使い切り」は期限間近の食材を最大消費します。
            </p>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="flex-shrink-0 text-gray-400 hover:text-white text-lg leading-none"
              aria-label="閉じる"
            >
              ×
            </button>
          </div>
          {/* 吹き出しの矢印 */}
          <div className="absolute bottom-[-6px] right-3 w-3 h-3 bg-gray-800 rotate-45" />
        </div>
      )}
    </div>
  );
};
