// app/components/menu/GenerationStatus.tsx
"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChefHat, AlertTriangle } from "lucide-react";

interface GenerationStatusProps {
  loading: boolean;
  isStreaming: boolean;
  generated: any;
  thoughtStream: string[];
  currentThoughtIndex: number;
  shuffledMessages: string[];
  error: string | null;
  onRetry: () => void;
}

export const GenerationStatus: React.FC<GenerationStatusProps> = ({
  loading,
  isStreaming,
  generated,
  thoughtStream,
  currentThoughtIndex,
  shuffledMessages,
  error,
  onRetry,
}) => {
  if (!loading && !error) return null;

  return (
    <div className="mt-8 mb-12 max-w-xl mx-auto text-center px-4">
      {loading && !error && (
        <div className="space-y-8">
          <div className="relative mb-6 flex justify-center">
            <motion.div
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              style={{ filter: "drop-shadow(0 0 20px var(--accent))" }}
            >
              <ChefHat size={56} className="text-[var(--accent)]" />
            </motion.div>
          </div>

          {/* AI Thought Stream UI */}
          <div className="modal-card rounded-xl p-6 mb-6 text-left border border-[var(--surface-border)] bg-[var(--surface-bg)] shadow-lg overflow-hidden relative">
            <div className="flex items-center gap-2 mb-4 pb-2 border-b border-[var(--surface-border)]">
              <div className="flex gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-red-400/80" />
                <div className="w-2.5 h-2.5 rounded-full bg-amber-400/80" />
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-400/80" />
              </div>
              <span className="text-[10px] font-mono text-[var(--color-text-muted)] ml-2 uppercase tracking-widest">
                AI Thought Stream
              </span>
            </div>

            <div className="space-y-3 font-mono">
              {thoughtStream.length > 0 ? (
                thoughtStream.map((thought, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -5 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex gap-3 text-xs leading-relaxed"
                  >
                    <span className="text-[var(--accent)] shrink-0">›</span>
                    <span className="text-[var(--color-text-primary)]">{thought}</span>
                  </motion.div>
                ))
              ) : (
                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentThoughtIndex}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -5 }}
                    transition={{ duration: 0.3 }}
                    className="flex items-center gap-2 text-xs text-[var(--color-text-muted)]"
                  >
                    <span className="text-[var(--accent)]">›</span>
                    <span>{shuffledMessages[currentThoughtIndex] ?? "献立を生成中..."}</span>
                  </motion.div>
                </AnimatePresence>
              )}
              
              {isStreaming && (
                <div className="flex gap-3 text-xs">
                  <span className="text-[var(--accent)] shrink-0">›</span>
                  <motion.span 
                    animate={{ opacity: [1, 0] }}
                    transition={{ duration: 0.8, repeat: Infinity }}
                    className="w-1.5 h-4 bg-[var(--accent)] inline-block"
                  />
                </div>
              )}
            </div>
          </div>

          <div className="space-y-4 px-4 text-center">
            <div className="relative h-1.5 w-full bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
              <motion.div
                className="absolute top-0 left-0 h-full bg-[var(--accent)]"
                initial={{ width: "0%" }}
                animate={{ width: generated ? "100%" : (isStreaming ? "70%" : "90%") }}
                transition={{ duration: 1 }}
              />
            </div>
            <p className="text-[10px] text-[var(--color-text-muted)] uppercase tracking-tighter">
              {isStreaming ? "AI Generating Plan..." : "Finalizing Recipe Details..."}
            </p>
          </div>
        </div>
      )}

      {error && (
        <div className="mt-4 text-[var(--semantic-red)] bg-red-50 dark:bg-red-950/20 p-3 rounded flex items-center gap-2 justify-center border border-red-100 dark:border-red-900/30">
          <AlertTriangle size={16} />
          {error}
          <button onClick={onRetry} className="ml-2 underline text-sm">再試行</button>
        </div>
      )}
    </div>
  );
};
