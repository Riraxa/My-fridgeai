// components/NavBar.tsx
"use client";
import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { Home, ChefHat, ShoppingCart, Settings } from "lucide-react";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import TabTransition from "@/app/components/PageTransition";

export default function NavBar() {
  const pathname = usePathname();
  const [isIOS, setIsIOS] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);
  const [isWindows, setIsWindows] = useState(false);
  const [currentActiveIndex, setCurrentActiveIndex] = useState(-1);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  useEffect(() => {
    // OS検出
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIOSDevice = /iphone|ipad|ipod/.test(userAgent);
    const isAndroidDevice = /android/.test(userAgent);
    const isWindowsDevice = /win/.test(userAgent);

    setIsIOS(isIOSDevice);
    setIsAndroid(isAndroidDevice);
    setIsWindows(isWindowsDevice);
  }, []);

  const navItems = useMemo(
    () => [
      {
        to: "/home",
        icon: <Home size={20} />,
        label: "ホーム",
      },
      {
        to: "/menu/generate",
        icon: <ChefHat size={20} />,
        label: "献立",
      },
      {
        to: "/shopping-list",
        icon: <ShoppingCart size={20} />,
        label: "買い物",
      },
      {
        to: "/settings",
        icon: <Settings size={20} />,
        label: "設定",
      },
    ],
    [],
  );

  // パスが変更されたときにアクティブインデックスを更新
  useEffect(() => {
    const newIndex = navItems.findIndex((item) => {
      if (item.to === "/home") {
        return pathname === "/" || pathname?.startsWith("/home");
      }
      return pathname?.startsWith(item.to);
    });

    if (newIndex !== -1 && newIndex !== currentActiveIndex) {
      setCurrentActiveIndex(newIndex);
      if (isInitialLoad) {
        setIsInitialLoad(false);
      }
    }
  }, [pathname, navItems, currentActiveIndex, isInitialLoad]);

  // OSに応じたクラス名を決定 - useMemoで最適化
  const navBarClass = useMemo(() => {
    const baseClass = "fixed inset-x-0 bottom-0 z-50 ";
    if (isIOS) {
      return baseClass + "ios-tab-bar-modern";
    } else if (isAndroid) {
      return baseClass + "android-tab-bar-modern";
    } else if (isWindows) {
      return baseClass + "windows-tab-bar-modern";
    } else {
      return baseClass + "modern-tab-bar";
    }
  }, [isIOS, isAndroid, isWindows]);

  return (
    <nav className={navBarClass}>
      <div className="max-w-md mx-auto px-4 pb-4">
        {/* 透明感のあるカプセル型ナビゲーション */}
        <div className="bg-white/60 backdrop-blur-2xl rounded-full border border-white/50 shadow-lg px-3">
          <div className="flex items-center justify-between py-2 relative min-w-[350px] px-3">
            {navItems.map((item, index) => (
              <Link
                key={item.to}
                href={item.to}
                className="group relative flex items-center justify-center w-full transition-all duration-300 py-1 no-tap-highlight"
              >
                {currentActiveIndex === index && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute inset-0 bg-black/90 rounded-full z-0 shadow-[0_4px_12px_rgba(0,0,0,0.2)]"
                    transition={{
                      type: "spring",
                      stiffness: 380,
                      damping: 30,
                      mass: 0.8,
                    }}
                  />
                )}
                <motion.div
                  className="relative flex flex-col items-center z-10"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.92 }}
                  transition={{ type: "spring", stiffness: 400, damping: 17 }}
                >
                  {/* アイコン */}
                  <motion.div
                    animate={{
                      y: currentActiveIndex === index ? -2 : 0,
                    }}
                    className={`transition-colors duration-300 ${currentActiveIndex === index
                        ? "text-white"
                        : "text-gray-500 group-hover:text-gray-800"
                      }`}
                  >
                    {item.icon}
                  </motion.div>

                  {/* ラベル */}
                  <span
                    className={`text-[10px] sm:text-xs font-medium transition-all duration-300 mt-1 whitespace-nowrap ${currentActiveIndex === index
                        ? "text-white font-bold opacity-100"
                        : "opacity-40 group-hover:opacity-70 text-gray-600"
                      }`}
                    style={{
                      minWidth: "50px",
                      textAlign: "center",
                      display: "block",
                    }}
                  >
                    {item.label}
                  </span>
                </motion.div>
              </Link>
            ))}
          </div>
        </div>

        {/* ホームインジケーター用の安全領域 */}
        <div className="h-safe-area-inset-bottom bg-inherit" />
      </div>
    </nav>
  );
}
