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
  description: "AIで食材管理・献立作成ができるアプリ",
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
  verification: {
    google: "MC63axKn7PuRNgUa2LEQ-Ua70QSvtiCVRW9RgloHW0g",
  },
  // ページ遷移のパフォーマンス最適化
  other: {
    "theme-color": "#ff914d",
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
            </FridgeProvider>
          </ThemeProvider>
        </SessionWrapper>
      </body>
    </html>
  );
}
