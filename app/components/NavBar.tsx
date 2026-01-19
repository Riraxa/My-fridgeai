// components/NavBar.tsx
"use client";
import React from "react";
import Link from "next/link";
import { Home, ChefHat, ShoppingCart, Settings } from "lucide-react";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { springTransition } from "@/app/components/motion";

export default function NavBar() {
  const pathname = usePathname();

  const navItems = [
    {
      to: "/home",
      active: pathname === "/" || pathname?.startsWith("/home"),
      icon: <Home size={18} />,
      label: "ホーム",
    },
    {
      to: "/menu/generate",
      active: pathname?.startsWith("/menu"),
      icon: <ChefHat size={18} />,
      label: "献立",
    },
    {
      to: "/shopping-list",
      active: pathname?.startsWith("/shopping-list"),
      icon: <ShoppingCart size={18} />,
      label: "買い物",
    },
    {
      to: "/settings",
      active: pathname?.startsWith("/settings"),
      icon: <Settings size={18} />,
      label: "設定",
    },
  ];

  // より具体的なパスから優先的にチェック
  const getActiveIndex = () => {
    if (pathname?.startsWith("/settings")) return 3;
    if (pathname?.startsWith("/shopping-list")) return 2;
    if (pathname?.startsWith("/menu")) return 1;
    if (pathname === "/" || pathname?.startsWith("/home")) return 0;
    return 0;
  };

  const activeIndex = getActiveIndex();

  return (
    <motion.div
      className="fixed inset-x-0 bottom-0 z-40 mx-auto mb-2 w-full max-w-md rounded-2xl border border-gray-200 bg-white/80 p-2 shadow-2xl"
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={springTransition}
    >
      <div className="relative grid grid-cols-4 gap-2">
        {/* アクティブインジケーター */}
        <motion.div
          className="absolute top-0 h-full w-1/4 rounded-2xl bg-gray-900"
          animate={{
            x: `${activeIndex * 100}%`,
          }}
          transition={{ duration: 0.2, ease: "easeOut" }}
        />

        {navItems.map((item, index) => (
          <NavItem
            key={item.to}
            to={item.to}
            icon={item.icon}
            label={item.label}
            active={item.active}
            index={index}
          />
        ))}
      </div>
    </motion.div>
  );
}

function NavItem({
  to,
  icon,
  label,
  active,
  index,
}: {
  to: string;
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  index: number;
}) {
  return (
    <Link href={to}>
      <motion.div
        className="relative flex flex-1 flex-col items-center gap-0.5 rounded-2xl px-3 py-2 text-xs transition z-10"
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        transition={{ duration: 0.15, ease: "easeOut" }}
      >
        <motion.div
          animate={{
            scale: active ? 1.05 : 1,
          }}
          transition={{ duration: 0.15, ease: "easeOut" }}
          style={{
            color: active ? "white" : "rgb(107 114 128)",
          }}
        >
          {icon}
        </motion.div>
        <motion.div
          className="leading-none"
          animate={{
            fontWeight: active ? 600 : 400,
          }}
          transition={{ duration: 0.12, ease: "easeOut" }}
          style={{
            color: active ? "white" : "rgb(107 114 128)",
          }}
        >
          {label}
        </motion.div>
      </motion.div>
    </Link>
  );
}
