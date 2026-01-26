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

  useEffect(() => {
    // OS検出
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIOSDevice = /iphone|ipad|ipod/.test(userAgent);
    const isAndroidDevice = /android/.test(userAgent);

    setIsIOS(isIOSDevice);
    setIsAndroid(isAndroidDevice);
  }, []);

  const navItems = [
    {
      to: "/home",
      active: pathname === "/" || pathname?.startsWith("/home"),
      icon: <Home size={20} />,
      label: "ホーム",
    },
    {
      to: "/menu/generate",
      active: pathname?.startsWith("/menu"),
      icon: <ChefHat size={20} />,
      label: "献立",
    },
    {
      to: "/shopping-list",
      active: pathname?.startsWith("/shopping-list"),
      icon: <ShoppingCart size={20} />,
      label: "買い物",
    },
    {
      to: "/settings",
      active: pathname?.startsWith("/settings"),
      icon: <Settings size={20} />,
      label: "設定",
    },
  ];

  // OSに応じたクラス名を決定 - useMemoで最適化
  const navBarClass = useMemo(() => {
    const baseClass = "fixed inset-x-0 bottom-0 z-50 border-t ";
    if (isIOS) {
      return baseClass + "ios-tab-bar";
    } else if (isAndroid) {
      return baseClass + "android-tab-bar";
    } else {
      return baseClass + "bg-white/95 border-gray-200/50";
    }
  }, [isIOS, isAndroid]);

  return (
    <nav className={navBarClass}>
      <div className="max-w-md mx-auto">
        <div className="grid grid-cols-4 h-16">
          {navItems.map((item) => (
            <Link
              key={item.to}
              href={item.to}
              className={`flex flex-col items-center justify-center gap-1 transition-colors duration-200 relative ${
                item.active
                  ? isIOS
                    ? "text-blue-600"
                    : isAndroid
                      ? "text-blue-700"
                      : "text-blue-600"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <TabTransition>
                <div
                  className={`relative transition-transform duration-200 ${
                    item.active ? "scale-110" : "scale-100"
                  }`}
                >
                  {item.icon}
                  {item.active && (
                    <div
                      className={`absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full ${
                        isIOS
                          ? "bg-blue-600"
                          : isAndroid
                            ? "bg-blue-700"
                            : "bg-blue-600"
                      }`}
                    />
                  )}
                </div>
              </TabTransition>
              <span
                className={`text-xs font-medium transition-all duration-200 ${
                  item.active ? "font-semibold" : "font-normal"
                }`}
              >
                {item.label}
              </span>
            </Link>
          ))}
        </div>

        {/* ホームインジケーター用の安全領域 */}
        <div className="h-safe-area-inset-bottom bg-inherit" />
      </div>
    </nav>
  );
}
