//app/layout.tsx
import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import SessionWrapper from "./SessionWrapper";
import { ThemeProvider } from "@/app/components/ThemeProvider";
import { FridgeProvider } from "@/app/components/FridgeProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap", // フォントのスワップを最適化
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "My-fridgeai",
  description: "AI冷蔵庫管理アプリで食材の無駄をゼロに。賞味期限通知、在庫管理、献立自動提案まで。バーコード読み取りで簡単登録。食品ロス削減と毎日の料理をサポートする無料アプリ。",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon.png", sizes: "32x32", type: "image/png" },
      { url: "/icon.png", sizes: "16x16", type: "image/png" },
      { url: "/icon.png", sizes: "192x192", type: "image/png" },
    ],
    shortcut: "/favicon.ico",
    apple: "/icon.png",
  },
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "My-fridgeai",
  },
  verification: {
    google: "MC63axKn7PuRNgUa2LEQ-Ua70QSvtiCVRW9RgloHW0g",
  },
  // ページ遷移のパフォーマンス最適化
  other: {
    "theme-color": "#ff914d",
    "application/ld+json": JSON.stringify({
      "@context": "https://schema.org",
      "@type": "WebApplication",
      "name": "My-fridgeai",
      "description": "AIで食材管理・献立作成ができるアプリ。冷蔵庫の食材を管理し、賞味期限が近い食材を優先して献立を提案。",
      "url": "https://www.my-fridgeai.com",
      "applicationCategory": "LifestyleApplication",
      "operatingSystem": "Web",
      "offers": {
        "@type": "Offer",
        "price": "0",
        "priceCurrency": "JPY"
      },
      "author": {
        "@type": "Organization",
        "name": "My-fridgeai"
      },
      "featureList": [
        "食材管理",
        "献立作成",
        "賞味期限アラート",
        "食品ロス削減"
      ]
    }),
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja" data-scroll-behavior="smooth">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <SessionWrapper>
          <ThemeProvider>
            <FridgeProvider>
              {" "}
              {/* ✅ ここで全体を包む！ */}
              {children}
              <NavBarContainer />
            </FridgeProvider>
          </ThemeProvider>
        </SessionWrapper>
      </body>
    </html>
  );
}

import NavBarContainer from "@/app/components/NavBarContainer";
