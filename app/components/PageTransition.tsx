// app/components/PageTransition.tsx
"use client";
import { motion } from "framer-motion";

interface PageTransitionProps {
  children: React.ReactNode;
  className?: string;
}

// ページ遷移用の統一アニメーションコンポーネント
export default function PageTransition({
  children,
  className = "",
}: PageTransitionProps) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{
        duration: 0.3,
        ease: "easeOut",
      }}
    >
      {children}
    </motion.div>
  );
}

// ヘッダー用のアニメーション
export function HeaderTransition({
  children,
  className = "",
}: PageTransitionProps) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.25,
        ease: "easeOut",
        delay: 0.05,
      }}
    >
      {children}
    </motion.div>
  );
}

// メインコンテンツ用のアニメーション
export function ContentTransition({
  children,
  className = "",
}: PageTransitionProps) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.3,
        ease: "easeOut",
        delay: 0.1,
      }}
    >
      {children}
    </motion.div>
  );
}

// リストアイテム用のスタガーアニメーション
export function StaggeredTransition({
  children,
  className = "",
  staggerDelay = 0.05,
}: PageTransitionProps & { staggerDelay?: number }) {
  return (
    <motion.div
      className={className}
      initial="hidden"
      animate="show"
      variants={{
        hidden: { opacity: 0 },
        show: {
          opacity: 1,
          transition: {
            staggerChildren: staggerDelay,
            delayChildren: 0.1,
          },
        },
      }}
    >
      {children}
    </motion.div>
  );
}

export function StaggeredItem({
  children,
  className = "",
}: PageTransitionProps) {
  return (
    <motion.div
      className={className}
      variants={{
        hidden: { opacity: 0, y: 8 },
        show: { opacity: 1, y: 0 },
      }}
      transition={{
        duration: 0.25,
        ease: "easeOut",
      }}
    >
      {children}
    </motion.div>
  );
}

// ローディングスケルトン用のアニメーション
export function SkeletonTransition({
  children,
  className = "",
}: PageTransitionProps) {
  return (
    <motion.div
      className={className}
      animate={{ opacity: [0.6, 1, 0.6] }}
      transition={{
        duration: 1.5,
        ease: "easeInOut",
        repeat: Infinity,
      }}
    >
      {children}
    </motion.div>
  );
}

// ナビゲーションタブ用のスムーズアニメーション
export function TabTransition({
  children,
  className = "",
}: PageTransitionProps) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0.8 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0.8 }}
      transition={{
        duration: 0.15,
        ease: "easeOut",
      }}
    >
      {children}
    </motion.div>
  );
}
