"use client";

import Link from "next/link";
import { useState } from "react";

interface FAQ {
  question: string;
  answer: string;
  category: string;
}

interface FAQClientProps {
  faqs: FAQ[];
}

export default function FAQClient({ faqs }: FAQClientProps) {
  const [openItems, setOpenItems] = useState<number[]>([]);
  const [searchTerm, setSearchTerm] = useState("");

  const toggleItem = (index: number) => {
    setOpenItems(prev => 
      prev.includes(index) 
        ? prev.filter(i => i !== index)
        : [...prev, index]
    );
  };

  const categories = Array.from(new Set(faqs.map(faq => faq.category)));
  
  const filteredFaqs = faqs.filter(faq => {
    const matchesSearch = searchTerm === "" || 
      faq.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchTerm.toLowerCase()) ||
      faq.category.toLowerCase().includes(searchTerm.toLowerCase());
    
    // If exact category match is needed (for buttons), we check that
    const isCategoryMatch = categories.includes(searchTerm) && faq.category === searchTerm;
    
    return isCategoryMatch || (matchesSearch && !categories.includes(searchTerm));
  });

  return (
    <div className="min-h-screen bg-[var(--background)] font-sans">
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
        <section className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold text-[var(--color-text-primary)] mb-6">
            My-fridgeai よくある質問
          </h1>
          <p className="text-xl text-[var(--color-text-secondary)] max-w-3xl mx-auto leading-relaxed">
            AI献立生成、食材管理、レシート読み取り機能など、
            My-fridgeaiの使い方や仕組みについて詳しく解説します。
          </p>
        </section>

        {/* Search Section */}
        <section className="mb-12">
          <div className="relative">
            <input
              type="text"
              placeholder="質問を検索..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-6 py-4 text-lg border border-[var(--surface-border)] rounded-2xl bg-[var(--card-bg)] focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all shadow-sm"
            />
            <svg 
              className="absolute right-6 top-1/2 -translate-y-1/2 w-6 h-6 text-[var(--color-text-muted)]"
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </section>

        {/* Categories */}
        <section className="mb-12">
          <div className="flex flex-wrap gap-3 justify-center">
            <button
              onClick={() => setSearchTerm("")}
              className={`px-6 py-2.5 rounded-full text-sm font-medium transition-all duration-200 ${
                searchTerm === ""
                  ? "bg-[var(--semantic-indigo)] text-white shadow-md shadow-indigo-500/20"
                  : "bg-[var(--card-bg)] border border-[var(--surface-border)] text-[var(--color-text-secondary)] hover:border-[var(--semantic-indigo)] hover:text-[var(--semantic-indigo)]"
              }`}
            >
              すべて
            </button>
            {categories.map(category => (
              <button
                key={category}
                onClick={() => setSearchTerm(category)}
                className={`px-6 py-2.5 rounded-full text-sm font-medium transition-all duration-200 ${
                  searchTerm === category
                    ? "bg-[var(--semantic-indigo)] text-white shadow-md shadow-indigo-500/20"
                    : "bg-[var(--card-bg)] border border-[var(--surface-border)] text-[var(--color-text-secondary)] hover:border-[var(--semantic-indigo)] hover:text-[var(--semantic-indigo)]"
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        </section>

        {/* FAQ Items */}
        <section className="space-y-6">
          {filteredFaqs.map((faq, index) => (
            <div 
              key={index} 
              className="bg-[var(--card-bg)] border border-[var(--surface-border)] rounded-2xl overflow-hidden shadow-sm"
            >
              <button
                onClick={() => toggleItem(index)}
                className="w-full px-6 py-5 text-left flex items-center justify-between hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="flex-shrink-0 w-8 h-8 bg-[var(--semantic-indigo-bg)] text-[var(--semantic-indigo)] rounded-full flex items-center justify-center text-sm font-semibold">
                    Q{index + 1}
                  </span>
                  <span className="font-semibold text-[var(--color-text-primary)]">
                    {faq.question}
                  </span>
                </div>
                <svg 
                  className={`w-5 h-5 text-[var(--color-text-muted)] transition-transform ${openItems.includes(index) ? 'rotate-180' : ''}`}
                  fill="none" 
                  viewBox="0 0 24 24" 
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              
              {openItems.includes(index) && (
                <div className="px-6 pb-5">
                  <div className="flex gap-3">
                    <span className="flex-shrink-0 w-8 h-8 bg-[var(--semantic-green-bg)] text-[var(--semantic-green)] rounded-full flex items-center justify-center text-sm font-semibold">
                      A
                    </span>
                    <div className="flex-1">
                      <p className="text-[var(--color-text-secondary)] leading-relaxed">
                        {faq.answer}
                      </p>
                      <div className="mt-3">
                        <span className="inline-block px-3 py-1 bg-[var(--background)] border border-[var(--surface-border)] text-[var(--color-text-muted)] text-xs font-medium rounded-full">
                          {faq.category}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </section>

        {/* CTA Section */}
        <section className="mt-20 text-center bg-[var(--surface-bg)] rounded-3xl p-8 md:p-12">
          <h2 className="text-2xl font-bold text-[var(--color-text-primary)] mb-6">
            その他のご質問はこちら
          </h2>
          <p className="text-[var(--color-text-secondary)] mb-8 max-w-2xl mx-auto">
            FAQで解決しない場合は、お気軽にお問い合わせください。
            専任スタッフが丁寧にご対応いたします。
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/contact"
              className="inline-flex items-center px-8 py-4 bg-[var(--semantic-indigo)] hover:opacity-90 text-[#ffffff] font-semibold rounded-full transition-colors"
            >
              お問い合わせフォーム
              <svg className="w-4 h-4 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center px-8 py-4 border-2 border-slate-200 dark:border-slate-700 text-[var(--color-text-secondary)] font-semibold rounded-full hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              無料で始める
            </Link>
          </div>
        </section>

        {/* Related Pages */}
        <section className="mt-20">
          <h2 className="text-2xl font-bold text-[var(--color-text-primary)] mb-8 text-center">
            関連ページ
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Link
              href="/features"
              className="flex items-center gap-4 p-6 bg-[var(--background)] border border-[var(--surface-border)] rounded-2xl hover:shadow-lg transition-shadow group"
            >
              <div className="w-12 h-12 bg-[var(--semantic-indigo-bg)] rounded-xl flex items-center justify-center text-xl group-hover:scale-110 transition-transform">
                <svg className="w-6 h-6 text-[var(--semantic-indigo)]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
              </div>
              <div>
                <h3 className="font-semibold text-[var(--color-text-primary)] mb-1 group-hover:text-[var(--semantic-indigo)] transition-colors">
                  機能一覧
                </h3>
                <p className="text-[var(--color-text-secondary)] text-sm">
                  My-fridgeaiの全機能をご紹介
                </p>
              </div>
            </Link>
            
            <Link
              href="/features"
              className="flex items-center gap-4 p-6 bg-[var(--background)] border border-[var(--surface-border)] rounded-2xl hover:shadow-lg transition-shadow group"
            >
              <div className="w-12 h-12 bg-purple-50 dark:bg-purple-900/30 rounded-xl flex items-center justify-center text-xl group-hover:scale-110 transition-transform">
                <svg className="w-6 h-6 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
              </div>
              <div>
                <h3 className="font-semibold text-[var(--color-text-primary)] mb-1 group-hover:text-purple-600 transition-colors">
                  AI献立機能
                </h3>
                <p className="text-[var(--color-text-secondary)] text-sm">
                  AIによる献立生成の仕組み
                </p>
              </div>
            </Link>

            <Link
              href="/how-it-works"
              className="flex items-center gap-4 p-6 bg-[var(--background)] border border-[var(--surface-border)] rounded-2xl hover:shadow-lg transition-shadow group"
            >
              <div className="w-12 h-12 bg-[var(--semantic-orange-bg)] rounded-xl flex items-center justify-center text-xl group-hover:scale-110 transition-transform">
                <svg className="w-6 h-6 text-[var(--semantic-orange)]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              </div>
              <div>
                <h3 className="font-semibold text-[var(--color-text-primary)] mb-1 group-hover:text-[var(--semantic-orange)] transition-colors">
                  使い方ガイド
                </h3>
                <p className="text-[var(--color-text-secondary)] text-sm">
                  アプリの基本的な使い方
                </p>
              </div>
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
