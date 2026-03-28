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
  const [navigationError, setNavigationError] = useState<string | null>(null);

  useEffect(() => {
    // OS検出
    try {
      const userAgent = window.navigator.userAgent.toLowerCase();
      const isIOSDevice = /iphone|ipad|ipod/.test(userAgent);
      const isAndroidDevice = /android/.test(userAgent);
      const isWindowsDevice = /win/.test(userAgent);

      setIsIOS(isIOSDevice);
      setIsAndroid(isAndroidDevice);
      setIsWindows(isWindowsDevice);
    } catch (error) {
      console.error("OS detection failed:", error);
      // デフォルト値を設定
      setIsIOS(false);
      setIsAndroid(false);
      setIsWindows(false);
    }
  }, []);

  const safeNavigate = (to: string) => {
    try {
      setNavigationError(null);
      window.location.href = to;
    } catch (error) {
      console.error("Navigation failed:", error);
      setNavigationError("ナビゲーションに失敗しました");
      
      // フォールバック：ホームに強制移動
      setTimeout(() => {
        window.location.href = "/home";
      }, 1000);
    }
  };

  const navItems = useMemo(
    () => [
      {
        to: "/home",
        icon: <Home size={24} />,
        label: "ホーム",
        fallback: "/home"
      },
      {
        to: "/menu/generate",
        icon: <ChefHat size={24} />,
        label: "献立",
        fallback: "/home"
      },
      {
        to: "/shopping-list",
        icon: <ShoppingCart size={24} />,
        label: "買い物",
        fallback: "/home"
      },
      {
        to: "/settings",
        icon: <Settings size={24} />,
        label: "設定",
        fallback: "/home"
      },
    ],
    [],
  );

  // パスが変更されたときにアクティブインデックスを更新
  useEffect(() => {
    try {
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
    } catch (error) {
      console.error("Path analysis failed:", error);
      // エラー時はホームをアクティブに
      setCurrentActiveIndex(0);
    }
  }, [pathname, navItems, currentActiveIndex, isInitialLoad]);

  // OSに応じたクラス名を決定 - useMemoで最適化
  const navBarClass = useMemo(() => {
    // スクリーン全体に広がるのをやめ、GPU加速(nav-fixed-optimized)のみをベースに
    const baseClass = "fixed z-50 nav-fixed-optimized transition-all duration-300";
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

  const handleNavClick = (item: typeof navItems[0], index: number) => {
    try {
      // 現在のアイテムなら何もしない
      if (index === currentActiveIndex) return;
      
      // エラー状態をクリア
      setNavigationError(null);
      
      // 通常のLinkクリックを許可
    } catch (error) {
      console.error("Nav click failed:", error);
      safeNavigate(item.fallback);
    }
  };

  if (navigationError) {
    return (
      <nav
        className={navBarClass}
        style={{
          background: "var(--nav-bg)",
          border: "1px solid var(--nav-border)",
          borderRadius: "40px",
          boxShadow: "0 12px 40px rgba(0,0,0,0.18)",
          left: "16px",
          right: "16px",
          bottom: "calc(env(safe-area-inset-bottom, 16px) + 12px)",
          maxWidth: "500px",
          margin: "0 auto",
          height: "68px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden"
        }}
      >
        <div className="w-full px-4 text-center">
          <p className="text-xs text-red-500">{navigationError}</p>
          <button
            onClick={() => safeNavigate("/home")}
            className="text-xs text-blue-500 underline mt-1"
          >
            ホームに戻る
          </button>
        </div>
      </nav>
    );
  }

  return (
    <nav
      className={navBarClass}
      style={{
        background: "var(--nav-bg)",
        border: "1px solid var(--nav-border)",
        borderRadius: "40px", // 完全に丸いドック形状
        boxShadow: "0 12px 40px rgba(0,0,0,0.18)", // 浮遊感を出す深めの影
        left: "16px", // 左右に余白を持って浮かせる
        right: "16px",
        bottom: "calc(env(safe-area-inset-bottom, 16px) + 12px)", // iPhoneのホームインジケーターを避けて浮かせる
        maxWidth: "500px",
        margin: "0 auto",
        height: "68px", // 高さを固定して安定感を
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden"
      }}
    >
      <div className="w-full px-4">
        <div className="flex items-center justify-between relative">
          {navItems.map((item, index) => (
            <Link
              key={item.to}
              href={item.to}
              onClick={() => handleNavClick(item, index)}
              className="group relative flex items-center justify-center w-full transition-all duration-300 py-2 no-tap-highlight"
              onError={(e) => {
                console.error("Link error:", e);
                safeNavigate(item.fallback);
              }}
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
                  className={`text-[11px] sm:text-[13px] font-bold transition-all duration-300 mt-0.5 whitespace-nowrap ${currentActiveIndex === index
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
