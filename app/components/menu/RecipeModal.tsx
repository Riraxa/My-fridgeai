// app/components/menu/RecipeModal.tsx
"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  X, ArrowLeft, ChefHat, Clock, CheckCircle, 
  AlertTriangle, Lightbulb, Lock 
} from "lucide-react";

interface RecipeDetail {
  title: string;
  description?: string;
  ingredients: Array<{
    name: string;
    total_quantity: string;
    unit: string;
    optional?: boolean;
  }>;
  steps: string[];
  tips?: string[];
  storage?: string;
  time_minutes?: number;
  difficulty?: string;
  servings?: number;
}

interface RecipeModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedMenuType: string | null;
  selectedMenuData: any;
  loadingRecipe: boolean;
  recipeDetails: RecipeDetail[];
  currentDishIndex: number;
  setCurrentDishIndex: (index: number) => void;
  errorRecipe: string | null;
  handleSelectMenu: (type: string, data: any) => void;
  handleConfirmCook: () => void;
  loadingCook: boolean;
  // Context settings (read only during loading)
  strictMode: boolean;
  servingsCount: number;
  enableBudget: boolean;
  budget: string;
}

export const RecipeModal: React.FC<RecipeModalProps> = ({
  isOpen,
  onClose,
  selectedMenuType,
  selectedMenuData,
  loadingRecipe,
  recipeDetails,
  currentDishIndex,
  setCurrentDishIndex,
  errorRecipe,
  handleSelectMenu,
  handleConfirmCook,
  loadingCook,
  strictMode,
  servingsCount,
  enableBudget,
  budget,
}) => {
  const currentRecipe = recipeDetails[currentDishIndex];
  const totalDishes = selectedMenuData?.dishes?.length || 1;

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="fixed inset-0 z-10"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
        />
        <motion.div
          className="fixed inset-x-0 bottom-0 max-h-[90vh] bg-[var(--card-bg)] border border-[var(--surface-border)] rounded-t-3xl shadow-2xl overflow-hidden flex flex-col relative z-30"
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="recipe-modal-title"
        >
          {/* Header */}
          <div className="sticky top-0 bg-[var(--card-bg)] border-b border-[var(--surface-border)] px-4 py-3 flex items-center z-10">
            <button
              onClick={onClose}
              className="absolute left-4 p-2 text-[var(--color-text-secondary)] hover:bg-[var(--surface-bg)] rounded-full transition"
              aria-label="戻る"
            >
              <ArrowLeft size={20} />
            </button>
            <div className="flex-1 text-center px-12">
              <h2 id="recipe-modal-title" className="font-bold text-lg text-[var(--color-text-primary)] truncate">
                {selectedMenuData?.title ?? "レシピ詳細"}
              </h2>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4 pb-32">
            {loadingRecipe ? (
              <div className="mt-8 max-w-lg mx-auto">
                <div className="mb-6 p-4 bg-[var(--surface-bg)] rounded-xl border border-[var(--surface-border)]">
                  <div className="flex items-center gap-2 mb-3 text-[var(--color-text-secondary)]">
                    <Lock size={16} className="text-[var(--accent)]" />
                    <span className="text-xs font-medium uppercase tracking-wider">設定内容</span>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-[var(--color-text-muted)]">モード:</span>
                      <span className="font-medium text-[var(--color-text-primary)]">
                        {strictMode ? "冷蔵庫内の食材のみで生成" : "一部許可モード"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[var(--color-text-muted)]">人数:</span>
                      <span className="font-medium text-[var(--color-text-primary)]">{servingsCount}人前</span>
                    </div>
                    {enableBudget && Number(budget) > 0 && (
                      <div className="flex items-center gap-2">
                        <span className="text-[var(--color-text-muted)]">予算:</span>
                        <span className="font-medium text-[var(--color-text-primary)]">{budget}円/人</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="relative mb-6 flex justify-center">
                  <motion.div
                    animate={{ x: [0, 5, -5, 0] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                  >
                    <ChefHat size={48} className="text-[var(--accent)] opacity-80" />
                  </motion.div>
                </div>

                <div className="max-w-xs mx-auto space-y-4">
                  <h4 className="text-lg font-bold text-[var(--color-text-primary)] text-center">
                    レシピを取得中...
                  </h4>
                  <div className="space-y-4">
                    <div className="relative h-1.5 w-full bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                      <motion.div
                        className="absolute top-0 left-0 h-full bg-[var(--accent)]"
                        initial={{ width: "0%" }}
                        animate={{ width: `${(recipeDetails.length + 1) / totalDishes * 100}%` }}
                        transition={{ duration: 0.5 }}
                      />
                    </div>
                  </div>
                  <p className="text-center text-[var(--color-text-muted)] text-xs">
                    プロのシェフが手順をていねいに解説しています
                  </p>
                </div>
              </div>
            ) : recipeDetails.length > 0 ? (
              <>
                {recipeDetails.length > 1 && (
                  <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
                    {recipeDetails.map((r, idx) => (
                      <button
                        key={idx}
                        onClick={() => setCurrentDishIndex(idx)}
                        className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition ${currentDishIndex === idx
                          ? "bg-[var(--accent)] text-white"
                          : "bg-[var(--surface-bg)] text-[var(--color-text-secondary)] hover:bg-[color-mix(in_srgb,var(--accent)_10%,transparent)]"
                          }`}
                      >
                        {r.title}
                      </button>
                    ))}
                  </div>
                )}

                {currentRecipe && (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-xl font-bold text-[var(--color-text-primary)] mb-2">
                        {currentRecipe.title}
                      </h3>
                      {currentRecipe.description && (
                        <p className="text-[var(--color-text-secondary)] text-sm">
                          {currentRecipe.description}
                        </p>
                      )}
                      <div className="flex gap-4 mt-3 text-sm text-[var(--color-text-secondary)]">
                        <span className="flex items-center gap-1">
                          <Clock size={14} />
                          {recipeDetails.reduce((sum, r) => sum + (r.time_minutes || 0), 0)}分（合計）
                        </span>
                        <span>難易度: {currentRecipe.difficulty}</span>
                        <span>{currentRecipe.servings}人前</span>
                      </div>
                    </div>

                    <div className="bg-[var(--surface-bg)] rounded-xl p-4 border border-[var(--surface-border)]">
                      <h4 className="font-bold text-[var(--color-text-primary)] mb-3">材料</h4>
                      <ul className="space-y-2">
                        {currentRecipe.ingredients.map((ing, idx) => (
                          <li key={idx} className="flex justify-between text-sm border-b border-[var(--surface-border)] pb-1">
                            <span className="text-[var(--color-text-primary)]">
                              {ing.name}{ing.optional && <span className="text-xs text-[var(--color-text-muted)] ml-1">(お好みで)</span>}
                            </span>
                            <span className="text-[var(--color-text-secondary)]">
                              {ing.total_quantity}{ing.unit}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div>
                      <h4 className="font-bold text-[var(--color-text-primary)] mb-3">作り方</h4>
                      <ol className="space-y-4">
                        {currentRecipe.steps.map((step, idx) => (
                          <li key={idx} className="flex gap-3">
                            <span className="flex-shrink-0 w-7 h-7 rounded-full bg-[color-mix(in_srgb,var(--accent)_20%,transparent)] text-[var(--accent)] text-sm font-bold flex items-center justify-center">
                              {idx + 1}
                            </span>
                            <p className="text-[var(--color-text-primary)] text-sm leading-relaxed pt-0.5">{step}</p>
                          </li>
                        ))}
                      </ol>
                    </div>

                    {currentRecipe.tips && currentRecipe.tips.length > 0 && (
                      <div className="bg-[color-mix(in_srgb,#f59e0b_10%,transparent)] border border-[color-mix(in_srgb,#f59e0b_20%,transparent)] rounded-xl p-4">
                        <h4 className="font-bold text-amber-700 dark:text-amber-300 mb-2 flex items-center gap-1">
                          <Lightbulb size={16} />コツ・ポイント
                        </h4>
                        <ul className="space-y-1">
                          {currentRecipe.tips.map((tip, idx) => (
                            <li key={idx} className="text-sm text-amber-700 dark:text-amber-300 flex items-start gap-2">
                              <span className="text-amber-500">•</span>{tip}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {currentRecipe.storage && (
                      <div className="text-sm text-[var(--color-text-secondary)] bg-[var(--surface-bg)] rounded-lg p-3 border border-[var(--surface-border)]">
                        <span className="font-medium text-[var(--color-text-primary)]">保存方法:</span> {currentRecipe.storage}
                      </div>
                    )}
                  </div>
                )}
              </>
            ) : errorRecipe ? (
              <div className="text-center py-20 px-6">
                <AlertTriangle size={40} className="mx-auto mb-4 text-red-500" />
                <p className="text-[var(--color-text-primary)] font-medium mb-4">{errorRecipe}</p>
                <div className="flex flex-col gap-3">
                  <button
                    onClick={() => handleSelectMenu(selectedMenuType as string, selectedMenuData)}
                    className="w-full py-3 bg-[var(--accent)] text-white rounded-xl font-bold shadow-md hover:opacity-90 transition"
                  >再取得する</button>
                  <button
                    onClick={onClose}
                    className="w-full py-3 bg-[var(--surface-bg)] text-[var(--color-text-secondary)] rounded-xl font-bold border border-[var(--surface-border)] hover:bg-[var(--surface-border)] transition"
                  >戻る</button>
                </div>
              </div>
            ) : (
              <div className="text-center py-20 text-[var(--color-text-secondary)]">
                レシピを取得できませんでした
              </div>
            )}
          </div>

          {!loadingRecipe && !errorRecipe && recipeDetails.length > 0 && (
            <div className="sticky bottom-0 bg-[var(--card-bg)] border-t border-[var(--surface-border)] p-4 pb-safe relative z-20">
              <button
                onClick={handleConfirmCook}
                disabled={loadingCook}
                className={`w-full py-4 rounded-xl font-bold shadow-lg transition flex items-center justify-center gap-2 ${loadingCook
                  ? "bg-[var(--surface-bg)] cursor-not-allowed text-[var(--color-text-muted)]"
                  : "bg-green-600 text-white hover:bg-green-700"
                  }`}
              >
                {loadingCook ? (
                  <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></div>
                ) : (
                  <CheckCircle size={20} />
                )}
                {loadingCook ? "処理中..." : "調理完了！完成"}
              </button>
              <p className="text-center text-[10px] text-[var(--color-text-muted)] mt-2">
                使用した食材が在庫から差し引かれます
              </p>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
