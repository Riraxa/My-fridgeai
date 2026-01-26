// components/NavBar.tsx
"use client";
import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { Home, ChefHat, ShoppingCart, Settings } from "lucide-react";
import { usePathname } from "next/navigation";
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

  const navItems = [
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
  ];

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
                className={`group relative flex items-center justify-center w-full transition-colors duration-200 ${
                  currentActiveIndex === index
                    ? "bg-black/90 rounded-full px-2 py-1"
                    : ""
                }`}
              >
                <div className="relative flex flex-col items-center">
                  {/* アイコン */}
                  <div
                    className={`transition-colors duration-200 ${
                      currentActiveIndex === index
                        ? "text-white"
                        : "text-gray-600 group-hover:text-gray-800"
                    }`}
                  >
                    {item.icon}
                  </div>

                  {/* ラベル */}
                  <span
                    className={`text-xs font-medium transition-colors duration-200 mt-1 whitespace-nowrap ${
                      currentActiveIndex === index
                        ? "text-white font-bold"
                        : "opacity-60 group-hover:opacity-80 text-gray-600"
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

        {/* ホームインジケーター用の安全領域 */}
        <div className="h-safe-area-inset-bottom bg-inherit" />
      </div>
    </nav>
  );
}
