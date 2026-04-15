// app/components/motion.tsx
"use client";

import type { Variants, Transition } from "framer-motion";

// ✅ 酔いにくいシンプルなトランジション
export const springTransition: Transition = {
  type: "spring",
  stiffness: 300,
  damping: 30,
};

// ✅ 酔いにくいフェードイン（微スライドのみ）
export const fadeInUp: Variants = {
  hidden: { opacity: 0, x: 4 },
  show: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.15, ease: "easeOut" },
  },
};


// ✅ 控えめなボタンアニメーション
export const buttonTap = {
  whileTap: { scale: 0.98, transition: { duration: 0.1 } },
  whileHover: { scale: 1.015, transition: { duration: 0.15 } },
};
