/**
 * Page: /faq
 * - public
 * - SEO keywords: よくある質問, FAQ, My-fridgeai 使い方, AI献立アプリ
 */

import type { Metadata } from "next";
import Link from "next/link";
import FAQClient from "./FAQClient";

const faqs = [
  {
    question: "My-fridgeaiとは何ですか？",
    answer: "My-fridgeaiは、冷蔵庫の食材をAIで賢く管理し、献立を自動提案する「食材管理AIアプリ」です。食品ロスを減らし、毎日の「何を作ろう？」という悩みを解消するために開発されました。",
    category: "機能",
  },
  {
    question: "My-fridgeaiでできる主要な機能を教えてください。",
    answer: "食材の在庫管理、賞味期限の自動通知、AIによる献立生成、レシート読み取り、画像認識での食材登録、買い物リスト作成、そしてProプランでは家族との冷蔵庫共有などが可能です。",
    category: "機能",
  },
  {
    question: "家族で冷蔵庫の情報を共有できますか？",
    answer: "はい、Proプランをご契約いただくことで、ご家族やパートナーと冷蔵庫の状態をリアルタイムで共有できます。誰かが食材を使ったり、買い物をして追加したりした際に即座に同期されます。",
    category: "機能",
  },
  {
    question: "賞味期限の通知はどのように届きますか？",
    answer: "アプリ内のダッシュボードや通知一覧で、期限が近い食材をひと目で確認できます。また、AIが献立を提案する際も、賞味期限が近い食材を優先的に使うように自動で調整されます。",
    category: "機能",
  },
  {
    question: "スーパーのレシートから食材を登録するには？",
    answer: "お手元のレシートをスマートフォンのカメラで撮影するだけで、AIが品目を自動認識して登録します。1点ずつ入力する手間を大幅に削減できます。",
    category: "使い方",
  },
  {
    question: "AI献立生成の使い方は？",
    answer: "冷蔵庫に登録されている食材から、現状で作れる最適な献立をAIが提案します。食材の組み合わせだけでなく、栄養バランスや調理時間の短縮も考慮したアルゴリズムを採用しています。詳細は[機能一覧](/features)をご覧ください。",
    category: "使い方",
  },
  {
    question: "スマートフォンやタブレットで利用できますか？",
    answer: "はい、iOSおよびAndroidのスマートフォン、タブレットのブラウザからすぐにご利用いただけます。アプリをインストールすることなく、ブックマークするだけで同じように動作します。",
    category: "使い方",
  },
  {
    question: "My-fridgeaiは無料で使えますか？",
    answer: "はい、基本的な食材管理やAI献立生成などのコア機能は無料でご利用いただけます。ただし、食材の登録数やAI提案回数に制限があります。",
    category: "料金・プラン",
  },
  {
    question: "無料プランの制限について教えてください。",
    answer: "無料プランでは食材の登録数が100件までとなり、AI献立生成は1日1回までとなっております。また、家族共有機能や1週間分の献立一括作成などはProプラン限定の機能です。",
    category: "料金・プラン",
  },
  {
    question: "Proプランはいつでも解約できますか？",
    answer: "はい、設定画面の「サブスクリプション管理」からいつでも解約予約が可能です。解約後も現在の契約期間終了までは全てのPro機能を引き続きご利用いただけます。Stripeを通じた安全な決済・管理を行っています。",
    category: "料金・プラン",
  },
  {
    question: "賞味期限管理による食材ロス削減の効果は？",
    answer: "無駄な買いすぎを防ぎ、期限切れを未然に察知することで、多くのユーザー様が食費の節約と食品ロスの大幅な削減を実感されています（平均で約30%の削減効果が報告されています）。",
    category: "効果",
  },
  {
    question: "データのセキュリティは安全ですか？",
    answer: "はい。通信は全て暗号化され、データは日本の安全なデータセンターで厳重に管理されています。また、決済情報もStripeによって世界最高水準のセキュリティで保護されています。",
    category: "セキュリティ",
  },
];

export const metadata: Metadata = {
  title: "My-fridgeai よくある質問 | 冷蔵庫AI献立アプリ",
  description:
    "My-fridgeaiのよくある質問ページです。AI献立生成、食材管理、レシート読み取り機能などの使い方や仕組みを詳しく解説しています。",
  openGraph: {
    title: "My-fridgeai よくある質問 | 冷蔵庫AI献立アプリ",
    description:
      "My-fridgeaiの使い方や機能に関するよくある質問をまとめました。AI献立生成、食材管理、レシート読み取りなど。",
    url: `${process.env.NEXT_PUBLIC_BASE_URL ?? "https://www.my-fridgeai.com"}/faq`,
    images: [`${process.env.NEXT_PUBLIC_BASE_URL ?? "https://www.my-fridgeai.com"}/og-images/og-top.png`],
  },
  alternates: {
    canonical: `${process.env.NEXT_PUBLIC_BASE_URL ?? "https://www.my-fridgeai.com"}/faq`,
  },
  other: {
    "application/ld+json": JSON.stringify({
      "@context": "https://schema.org",
      "@type": "FAQPage",
      "mainEntity": faqs.map(faq => ({
        "@type": "Question",
        "name": faq.question,
        "acceptedAnswer": {
          "@type": "Answer",
          "text": faq.answer
        }
      }))
    }),
  },
};

export default function FAQPage() {
  return <FAQClient faqs={faqs} />;
}
