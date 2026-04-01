//app/components/Tabs.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

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
    name: "料理の好み",
    href: "/settings/preferences",
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
          d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
        />
      </svg>
    ),
  },
];

export default function Tabs() {
  const pathname = usePathname();

  return (
    <div className="mb-8">
      {/* タブコンテナ */}
      <div className="relative flex gap-2 bg-[var(--surface-bg)] p-1 rounded-xl border border-[var(--surface-border)]">
        {tabs.map((tab, _index) => {
          const isActive = pathname === tab.href;

          return (
            <Link
              key={tab.name}
              href={tab.href}
              className={cn(
                "relative flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm transition-all duration-300 flex-1 z-10 no-tap-highlight",
                isActive
                  ? "text-[var(--accent)]"
                  : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]",
              )}
            >
              {isActive && (
                <motion.div
                  layoutId="activeSettingTab"
                  className="absolute inset-0 rounded-lg z-[-1] shadow-sm"
                  style={{
                    background:
                      "color-mix(in srgb, var(--accent) 12%, transparent)",
                  }}
                  transition={{
                    type: "spring",
                    stiffness: 380,
                    damping: 30,
                    mass: 0.8,
                  }}
                />
              )}
              <motion.div
                className="flex items-center gap-2"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.96 }}
              >
                <div
                  style={{
                    transform: isActive ? "scale(1.1) translateY(-1px)" : "scale(1)",
                    transition: "transform 0.2s cubic-bezier(0.2, 0, 0, 1)",
                  }}
                >
                  {tab.icon}
                </div>
                <span
                  className="hidden sm:inline"
                  style={{
                    fontWeight: isActive ? 600 : 500,
                  }}
                >
                  {tab.name}
                </span>
              </motion.div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
