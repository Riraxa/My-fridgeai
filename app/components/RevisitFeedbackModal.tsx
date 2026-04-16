// GENERATED_BY_AI: 2026-04-05 再訪トリガーモーダル
"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, ThumbsUp, ThumbsDown, Minus } from "lucide-react";
import { useRevisitFeedback } from "../hooks/useRevisitFeedback";

export function RevisitFeedbackModal() {
  const { pendingMenus, hasPendingFeedback, isLoading, submitFeedback, dismissFeedback } = useRevisitFeedback();

  if (!hasPendingFeedback || isLoading) return null;

  const currentMenu = pendingMenus[0];
  if (!currentMenu) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={dismissFeedback}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-md w-full shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* ヘッダー */}
          <div className="flex justify-between items-start mb-4">
            <div>
              <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">
                {currentMenu.daysAgo === 1 ? "昨日" : `${currentMenu.daysAgo}日前`}のごはん
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                「{currentMenu.dishName}」どうでしたか？
              </p>
            </div>
            <button
              onClick={dismissFeedback}
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
            >
              <X size={20} className="text-slate-400 dark:text-slate-500" />
            </button>
          </div>

          {/* フィードバックボタン */}
          <div className="grid grid-cols-3 gap-3 mt-6">
            <button
              onClick={() => submitFeedback(currentMenu.menuGenerationId, "want_again")}
              className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-emerald-50 hover:bg-emerald-100 active:scale-95 transition-all"
            >
              <ThumbsUp size={24} className="text-emerald-600" />
              <span className="text-sm font-medium text-emerald-700">また作りたい</span>
            </button>

            <button
              onClick={() => submitFeedback(currentMenu.menuGenerationId, "okay")}
              className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 active:scale-95 transition-all"
            >
              <Minus size={24} className="text-slate-500 dark:text-slate-400" />
              <span className="text-sm font-medium text-slate-600 dark:text-slate-300">まあまあ</span>
            </button>

            <button
              onClick={() => submitFeedback(currentMenu.menuGenerationId, "never_again")}
              className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-rose-50 hover:bg-rose-100 active:scale-95 transition-all"
            >
              <ThumbsDown size={24} className="text-rose-600" />
              <span className="text-sm font-medium text-rose-700">もう作らない</span>
            </button>
          </div>

          {/* 残り件数表示 */}
          {pendingMenus.length > 1 && (
            <p className="text-xs text-center text-slate-400 dark:text-slate-500 mt-4">
              他に {pendingMenus.length - 1} 件の評価が待っています
            </p>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
