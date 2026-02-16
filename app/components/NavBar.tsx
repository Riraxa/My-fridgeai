// components/NavBar.tsx
"use client";
import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { Home, ChefHat, ShoppingCart, Settings } from "lucide-react";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";


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
    const baseClass = "fixed inset-x-0 bottom-0 z-50 nav-fixed-optimized";
    if (isIOS) {
      return `${baseClass} ios-tab-bar-modern`;
    } else if (isAndroid) {
      return `${baseClass} android-tab-bar-modern`;
    } else if (isWindows) {
      return `${baseClass} windows-tab-bar-modern`;
    } else {
      return `${baseClass} modern-tab-bar`;
    }
  }, [isIOS, isAndroid, isWindows]);

  return (
    <nav
      className={navBarClass}
      style={{
        background: "var(--nav-bg)",
        borderTop: "1px solid var(--nav-border)",
        borderTopLeftRadius: "28px",
        borderTopRightRadius: "28px",
        boxShadow: "0 -8px 32px rgba(0,0,0,0.06)",
        paddingBottom: "env(safe-area-inset-bottom, 20px)"
      }}
    >
      <div className="max-w-md mx-auto px-6 pt-3">
        {/* 丸みを生かした不動のプレミアム・フッター */}
        <div className="flex items-center justify-between py-2 relative">
          {navItems.map((item, index) => (
            <Link
              key={item.to}
              href={item.to}
              className="group relative flex items-center justify-center w-full transition-all duration-300 py-2 no-tap-highlight"
            >
              {currentActiveIndex === index && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute inset-0 z-0"
                  style={{
                    backgroundColor: 'var(--nav-indicator)',
                    borderRadius: '9999px'
                  }}
                  transition={{
                    type: "spring",
                    stiffness: 380,
                    damping: 30,
                    mass: 0.8,
                  }}
                />
              )}
              <div className="relative flex flex-col items-center z-10">
                {/* アイコン */}
                <div className={`transition-colors duration-300 ${currentActiveIndex === index
                  ? "text-[var(--nav-active-text)]"
                  : "nav-inactive"
                  }`}>
                  {item.icon}
                </div>

                {/* ラベル */}
                <span
                  className={`text-[10px] sm:text-xs font-bold transition-all duration-300 mt-1 whitespace-nowrap ${currentActiveIndex === index
                    ? "text-[var(--nav-active-text)]"
                    : "nav-inactive"
                    }`}
                  style={{
                    minWidth: "50px",
                    textAlign: "center",
                    display: "block",
                  }}
                >
                  {item.label}
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </nav>
  );
}
