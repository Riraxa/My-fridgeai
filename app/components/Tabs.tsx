//app/components/Tabs.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

const tabs = [
  {
    name: "アカウント",
    href: "/settings/account",
    icon: (
      <svg
        className="w-4 h-4"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
        />
      </svg>
    ),
  },
  {
    name: "家族共有",
    href: "/settings/family",
    icon: (
      <svg
        className="w-4 h-4"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
        />
      </svg>
    ),
  },
  {
    name: "サポート",
    href: "/settings/support",
    icon: (
      <svg
        className="w-4 h-4"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
        />
      </svg>
    ),
  },
];

export default function Tabs() {
  const pathname = usePathname();

  return (
    <div className="mb-8">
      <div className="relative">
        {/* アクティブインジケーター */}
        <motion.div
          className="absolute top-0 h-full rounded-full border-2 shadow-lg"
          style={{
            borderColor: "var(--accent)",
            background: "color-mix(in srgb, var(--accent) 8%, transparent)",
          }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
        />

        {/* タブコンテナ */}
        <div className="relative flex gap-2 bg-[var(--surface-bg)] p-1 rounded-xl border border-[var(--surface-border)]">
          {tabs.map((tab, index) => {
            const isActive = pathname === tab.href;
            const activeIndex = tabs.findIndex((t) => pathname === t.href);

            return (
              <Link
                key={tab.name}
                href={tab.href}
                className={cn(
                  "relative flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm transition-all duration-200 flex-1",
                  isActive
                    ? "text-white shadow-md"
                    : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]",
                )}
                style={{
                  color: isActive ? "var(--accent)" : undefined,
                }}
              >
                <motion.div
                  className="flex items-center gap-2"
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  transition={{ duration: 0.15, ease: "easeOut" }}
                >
                  <motion.div
                    animate={{
                      scale: isActive ? 1.05 : 1,
                    }}
                    transition={{ duration: 0.12, ease: "easeOut" }}
                  >
                    {tab.icon}
                  </motion.div>
                  <motion.span
                    animate={{
                      fontWeight: isActive ? 600 : 500,
                    }}
                    transition={{ duration: 0.12, ease: "easeOut" }}
                  >
                    {tab.name}
                  </motion.span>
                </motion.div>

                {/* アクティブ時の背景アニメーション */}
                {isActive && (
                  <motion.div
                    className="absolute inset-0 rounded-lg"
                    style={{
                      background:
                        "color-mix(in srgb, var(--accent) 12%, transparent)",
                    }}
                    layoutId="activeTab"
                    transition={{ duration: 0.2, ease: "easeOut" }}
                  />
                )}
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
