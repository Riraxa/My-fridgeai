//app/layout.tsx
import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import SessionWrapper from "./SessionWrapper";
import { ThemeProvider } from "@/app/components/ThemeProvider";
import { FridgeProvider } from "@/app/components/FridgeProvider";
import { Toaster } from "sonner";
import ErrorBoundary from "@/app/components/error-boundary";

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
  description: "AI冷蔵庫管理アプリで食材の無駄をゼロに。賞味期限通知、在庫管理、献立自動提案まで。レシート読み取りで簡単登録。食品ロス削減と毎日の料理をサポートする無料アプリ。",
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
      "@type": "SoftwareApplication",
      "name": "My-fridgeai",
      "applicationCategory": "LifestyleApplication",
      "operatingSystem": "Web",
      "description": "冷蔵庫の食材からAIが献立を生成する食材管理アプリ",
      "url": "https://my-fridgeai.com",
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
        "食品ロス削減",
        "レシート読み取り",
        "AI献立生成"
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
    <html lang="ja" data-scroll-behavior="smooth" suppressHydrationWarning>
      <head>
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Script id="theme-initializer" strategy="beforeInteractive">
          {`
            try {
              if (localStorage.theme === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                document.documentElement.setAttribute('data-theme', 'dark');
              } else {
                document.documentElement.removeAttribute('data-theme');
              }
            } catch (e) {}
          `}
        </Script>
        <ErrorBoundary>
          <SessionWrapper>
            <ThemeProvider>
              <FridgeProvider>
                {" "}
                {/* ✅ ここで全体を包む！ */}
                {children}
                <NavBarContainer />
                <Toaster position="top-center" richColors />
              </FridgeProvider>
            </ThemeProvider>
          </SessionWrapper>
        </ErrorBoundary>
      </body>
    </html>
  );
}

import NavBarContainer from "@/app/components/NavBarContainer";
