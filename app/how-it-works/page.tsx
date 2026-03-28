/**
 * Page: /how-it-works
 * - public
 * - SEO keywords: 使い方, 使い方, My-fridgeai 使い方, AI献立アプリ 使い方
 */

import type { Metadata } from "next";
import HowItWorksClient from "./HowItWorksClient";

const SITE_URL =
  process.env.NEXT_PUBLIC_BASE_URL ?? "https://www.my-fridgeai.com";

export const metadata: Metadata = {
  title: "My-fridgeaiの使い方 | 冷蔵庫AI献立アプリ",
  description:
    "My-fridgeaiの使い方をステップ形式で解説。冷蔵庫の食材登録、AI献立生成、レシピ提案などの機能を分かりやすく説明します。",
  openGraph: {
    title: "My-fridgeaiの使い方 | 冷蔵庫AI献立アプリ",
    description:
      "My-fridgeaiの使い方をステップ形式で分かりやすく解説。食材登録から献立作成まで。",
    url: `${SITE_URL}/how-it-works`,
    images: [`${SITE_URL}/og-images/og-top.png`],
  },
  alternates: {
    canonical: `${SITE_URL}/how-it-works`,
  },
};

export default function HowItWorksPage() {
  return <HowItWorksClient />;
}
