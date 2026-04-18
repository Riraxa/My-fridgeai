/**
 * Page: /contact
 * - public
 * - SEO keywords: お問い合わせ, サポート, 連絡先, My-fridgeai サポート
 */

import type { Metadata } from "next";
import Link from "next/link";
import ContactForm from "@/app/components/ContactForm";

const SITE_URL =
  process.env.NEXT_PUBLIC_BASE_URL ?? "https://www.my-fridgeai.com";

export const metadata: Metadata = {
  title: "お問い合わせ | My-fridgeai",
  description:
    "My-fridgeaiへのお問い合わせページです。バグ報告、機能要望、その他ご質問など、お気軽にお問い合わせください。",
  openGraph: {
    title: "お問い合わせ | My-fridgeai",
    description:
      "My-fridgeaiへのお問い合わせ。バグ報告、機能要望、その他ご質問をお受け付けしています。",
    url: `${SITE_URL}/contact`,
    images: [`${SITE_URL}/og-images/og-top.png`],
  },
  alternates: {
    canonical: `${SITE_URL}/contact`,
  },
};

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-[var(--background)]">
      {/* Header */}
      <header className="bg-[var(--background)] border-b border-[var(--surface-border)]">
        <div className="max-w-6xl mx-auto px-6 py-8">
          <Link href="/" className="inline-flex items-center gap-2 text-[var(--color-text-secondary)] hover:text-slate-900 dark:hover:text-white transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            トップに戻る
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-16">
        {/* Hero Section */}
        <section className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-[var(--color-text-primary)] mb-6">
            お問い合わせ
          </h1>
          <p className="text-xl text-[var(--color-text-secondary)] max-w-3xl mx-auto leading-relaxed">
            My-fridgeaiについてのご質問、バグ報告、機能要望など、
            お気軽にお問い合わせください。
          </p>
        </section>

        {/* Contact Form */}
        <section className="mb-12">
          <ContactForm />
        </section>

        {/* FAQ Link */}
        <section className="text-center">
          <p className="text-[var(--color-text-secondary)] mb-4">
            よくあるご質問はこちらをご確認ください
          </p>
          <Link
            href="/faq"
            className="inline-flex items-center px-6 py-3 border border-slate-300 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors"
          >
            よくある質問を見る
            <svg className="w-4 h-4 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </section>
      </main>
    </div>
  );
}
