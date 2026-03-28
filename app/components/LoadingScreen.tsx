// app/components/LoadingScreen.tsx
"use client";
import { motion } from "framer-motion";
import { ChefHat } from "lucide-react";

interface LoadingScreenProps {
  message?: string;
}

export default function LoadingScreen({
  message = "読み込み中...",
}: LoadingScreenProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--background)]">
      <motion.div
        className="flex flex-col items-center gap-4"
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.8 }}
        transition={{
          duration: 0.3,
          ease: [0.25, 0.1, 0.25, 1.0],
        }}
      >
        {/* ローディングアイコン */}
        <motion.div
          className="relative"
          animate={{ rotate: 360 }}
          transition={{
            duration: 2,
            ease: "linear",
            repeat: Infinity,
          }}
        >
          <ChefHat
            size={48}
            className="text-[var(--accent)]"
            style={{ filter: "drop-shadow(0 4px 6px rgba(0, 0, 0, 0.1))" }}
          />
        </motion.div>

        {/* パルスする背景円 */}
        <motion.div
          className="absolute w-16 h-16 rounded-full border-2 border-[var(--accent)]"
          animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.1, 0.3] }}
          transition={{
            duration: 2,
            ease: "easeInOut",
            repeat: Infinity,
          }}
        />

        {/* メッセージ */}
        <motion.div
          className="text-center"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: 0.4,
            ease: [0.25, 0.1, 0.25, 1.0],
            delay: 0.2,
          }}
        >
          <p
            className="text-sm font-medium"
            style={{ color: "var(--color-text-primary)" }}
          >
            {message}
          </p>

          {/* ドットアニメーション */}
          <div className="flex justify-center gap-1 mt-2">
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: "var(--accent)" }}
                animate={{
                  scale: [1, 1.3, 1],
                  opacity: [0.5, 1, 0.5],
                }}
                transition={{
                  duration: 1.5,
                  ease: "easeInOut",
                  repeat: Infinity,
                  delay: i * 0.2,
                }}
              />
            ))}
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}

// スケルトンローディング用
export function SkeletonLoader() {
  return (
    <div className="animate-pulse space-y-4">
      {/* ヘッダースケルトン */}
      <div className="h-12 bg-gray-200 rounded-lg mb-6" />

      {/* カードスケルトン */}
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-[var(--background)] p-4 rounded-lg shadow-sm">
            <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
            <div className="h-3 bg-gray-200 rounded w-1/2" />
          </div>
        ))}
      </div>
    </div>
  );
}
