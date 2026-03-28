/**
 * Page: /features/barcode-scan
 * - public
 * - SEO keywords: バーコードスキャン 食材管理, 時短 料理, 賞味期限 推定, My-fridgeai 使い方
 */
import type { Metadata } from "next";
import Link from "next/link";

const SITE_URL =
  process.env.NEXT_PUBLIC_BASE_URL ?? "https://www.my-fridgeai.com";

export const metadata: Metadata = {
  title: "バーコードスキャンで食材管理を効率化する方法｜時短と正確性を両立するコツ",
  description:
    "My-fridgeaiの新機能バーコードスキャンとハイブリッド推定エンジンについて解説。国内数万点の商品データから賞味期限を自動取得し、食品管理を劇的に効率化する方法を紹介します。",
  openGraph: {
    title: "バーコードスキャンで食材管理を効率化する方法｜時短と正確性を両立するコツ",
    description:
      "バーコードスキャンとハイブリッド推定エンジンで、食材管理を劇的に効率化。買い物後の登録作業を最小限にする方法を解説します。",
    url: `${SITE_URL}/features/barcode-scan`,
    images: [`${SITE_URL}/og-images/og-top.png`],
  },
  alternates: {
    canonical: `${SITE_URL}/features/barcode-scan`,
  },
  other: {
    "application/ld+json": JSON.stringify({
      "@context": "https://schema.org",
      "@type": "Article",
      "headline": "バーコードスキャンで食材管理を効率化する方法｜時短と正確性を両立するコツ",
      "author": {
        "@type": "Organization",
        "name": "My-fridgeai"
      },
      "datePublished": "2026-03-15",
      "dateModified": "2026-03-15",
      "articleBody": "バーコードスキャンとハイブリッド推定エンジンで、食材管理を劇的に効率化する方法を解説します。",
      "image": `${SITE_URL}/og-images/og-top.png`,
      "publisher": {
        "@type": "Organization",
        "name": "My-fridgeai",
        "logo": {
          "@type": "ImageObject",
          "url": `${SITE_URL}/my-fridgeai-logo-light.png`
        }
      }
    }),
  },
};

export default function BarcodeScanningReleasePage() {
  return (
    <div className="min-h-screen bg-[var(--background)] font-sans selection:bg-[var(--semantic-indigo-bg)] selection:text-[var(--semantic-indigo)]">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-[var(--background)]/80 backdrop-blur-md border-b border-[var(--surface-border)]">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center">
          <Link href="/features" className="inline-flex items-center gap-2 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors group">
            <div className="p-2 rounded-full group-hover:bg-[var(--surface-bg)] transition-colors">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </div>
            <span className="font-medium">機能一覧に戻る</span>
          </Link>
        </div>
      </header>

      <main className="pt-20">
        {/* News Badge */}
        <div className="max-w-7xl mx-auto px-6 pt-12 text-center pointer-events-none">
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[var(--semantic-indigo-bg)] text-[var(--semantic-indigo)] text-sm font-semibold animate-in fade-in slide-in-from-top-4 duration-700">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--semantic-indigo)] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--semantic-indigo)]"></span>
            </span>
            ハイブリッド推定エンジン搭載
          </span>
        </div>

        {/* Hero Section */}
        <section className="relative overflow-hidden pt-10 pb-24 md:pt-16 md:pb-32">
          {/* Background Decorative Elements */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full -z-10 pointer-events-none opacity-20 dark:opacity-10">
            <div className="absolute top-0 left-1/4 w-96 h-96 bg-[var(--semantic-indigo)] rounded-full mix-blend-multiply filter blur-3xl animate-blob"></div>
            <div className="absolute top-0 right-1/4 w-96 h-96 bg-indigo-300 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-2000"></div>
            <div className="absolute bottom-0 left-1/3 w-96 h-96 bg-purple-300 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-4000"></div>
          </div>

          <div className="max-w-6xl mx-auto px-6 text-center animate-in fade-in slide-in-from-bottom-8 duration-1000">
            <div className="w-24 h-24 bg-gradient-to-br from-[var(--semantic-indigo)] to-[var(--semantic-purple)] rounded-[2.5rem] flex items-center justify-center text-5xl mx-auto mb-10 shadow-2xl shadow-[var(--semantic-indigo-bg)] dark:shadow-none hover:rotate-6 transition-transform duration-300 cursor-default">
              🏷️
            </div>
            <h1 className="text-5xl md:text-7xl font-extrabold text-[var(--color-text-primary)] mb-8 leading-[1.15] tracking-tight">
              バーコードスキャンで、<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[var(--semantic-indigo)] to-[var(--semantic-purple)]">
                食材管理を劇的に効率化
              </span>
            </h1>
            <p className="text-xl md:text-2xl text-[var(--color-text-secondary)] max-w-3xl mx-auto leading-relaxed mb-12">
              国内数万点の商品データを瞬時に検索。<br className="hidden md:block" />
              買い物後の登録作業を最小限にし、時短と正確性を両立します。
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/login"
                className="w-full sm:w-auto px-10 py-5 bg-[var(--semantic-indigo)] hover:bg-indigo-700 text-white font-bold text-lg rounded-2xl transition-all shadow-xl shadow-indigo-100 dark:shadow-none hover:-translate-y-1 active:scale-[0.98]"
              >
                バーコードをスキャンする
              </Link>
              <Link
                href="/how-it-works"
                className="w-full sm:w-auto px-10 py-5 bg-[var(--surface-bg)] hover:bg-[var(--surface-border)] text-[var(--color-text-primary)] font-bold text-lg rounded-2xl border border-[var(--surface-border)] transition-all flex items-center justify-center gap-2"
              >
                対応商品をチェック
              </Link>
            </div>
          </div>
        </section>

        {/* Highlights Section */}
        <section className="bg-[var(--surface-bg)] py-24 md:py-32">
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center mb-16 space-y-4">
              <h2 className="text-sm font-bold text-[var(--semantic-indigo)] uppercase tracking-widest">最先端の技術</h2>
              <p className="text-3xl md:text-5xl font-extrabold text-[var(--color-text-primary)]">スマート管理を支える技術</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              {[
                { title: "数万点の商品DB", icon: "📦", desc: "国内の主要食品データを網羅。かざすだけで名前を特定します。" },
                { title: "ハイブリッド推定", icon: "🧠", desc: "AIとDBのハイブリッド。賞味期限も最適値を自動セットします。" },
                { title: "超高速Fuse.js検索", icon: "⚡", desc: "電波の悪い場所でも動作。オフラインに近い速度で検索可能です。" },
                { title: "連続スキャン", icon: "🔄", desc: "まとめ買いも怖くない。次々と連続で登録できる専用モード。" },
              ].map((item, i) => (
                <div key={i} className="group p-10 bg-[var(--background)] border border-[var(--surface-border)] rounded-[2.5rem] hover:shadow-2xl hover:shadow-indigo-100 dark:hover:shadow-none transition-all duration-300 hover:-translate-y-2">
                  <div className="w-16 h-16 bg-[var(--surface-bg)] rounded-3xl flex items-center justify-center text-3xl mb-8 group-hover:scale-110 transition-transform duration-300">
                    {item.icon}
                  </div>
                  <h3 className="text-2xl font-bold text-[var(--color-text-primary)] mb-4">{item.title}</h3>
                  <p className="text-[var(--color-text-secondary)] leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Core Value Sections */}
        <section className="py-24 md:py-40 max-w-7xl mx-auto px-6">
          <div className="space-y-32">
            {[
              {
                id: "01",
                tag: "効率化・時短",
                title: "入力の手間を90%以上削減",
                desc: "買い物袋から食材を取り出しながら、一つずつ名前や賞味期限を打ち込むのは非常に手間がかかります。スマホをかざすだけで瞬時に登録が完了します。",
                icon: "⏱️",
                side: "left"
              },
              {
                id: "02",
                tag: "家事の知恵",
                title: "科学的データに基づく期限管理",
                desc: "「これ、いつまでだっけ？」と迷う必要はもうありません。ハイブリッド推定エンジンが、世界標準の保存目安を自動でセットします。",
                icon: "🧪",
                side: "right"
              },
              {
                id: "03",
                tag: "管理の習慣化",
                title: "毎日の管理が「楽しみ」に変わる",
                desc: "面倒だった記録作業が、バーコードを読み取る「快感」へ。ゲーミフィケーションのような操作感で、食材管理の習慣化をサポートします。",
                icon: "🎮",
                side: "left"
              }
            ].map((section, idx) => (
              <div key={section.id} className={`flex flex-col ${section.side === 'right' ? 'md:flex-row-reverse' : 'md:flex-row'} items-center gap-16 md:gap-24`}>
                <div className="flex-1 space-y-8">
                  <div className="flex items-center gap-4">
                    <span className="text-6xl font-black text-[var(--surface-border)]">{section.id}</span>
                    <div className="h-[2px] w-12 bg-[var(--semantic-indigo)]"></div>
                    <span className="text-[var(--semantic-indigo)] font-bold tracking-widest uppercase">{section.tag}</span>
                  </div>
                  <h2 className="text-4xl md:text-5xl font-extrabold text-[var(--color-text-primary)] leading-[1.25]">
                    {section.title}
                  </h2>
                  <p className="text-xl text-[var(--color-text-secondary)] leading-loose">
                    {section.desc}
                  </p>
                </div>
                <div className="flex-1 relative w-full aspect-square md:aspect-auto md:h-[400px] bg-gradient-to-br from-[var(--surface-bg)] to-[var(--background)] rounded-[3rem] border border-[var(--surface-border)] flex items-center justify-center text-[10rem] shadow-inner group overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-[var(--semantic-indigo)] to-[var(--semantic-purple)] opacity-0 group-hover:opacity-10 transition-opacity duration-700"></div>
                  <span className="group-hover:scale-125 transition-transform duration-700">{section.icon}</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* How to use Stepper */}
        <section className="bg-[var(--surface-bg)] py-24 md:py-32 relative overflow-hidden border-y border-[var(--surface-border)]">
          <div className="absolute inset-0 bg-black/5 dark:bg-black/20 pointer-events-none"></div>
          <div className="max-w-7xl mx-auto px-6 relative z-10">
            <div className="text-center mb-20 space-y-4">
              <h2 className="text-sm font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">ご利用方法</h2>
              <p className="text-3xl md:text-5xl font-extrabold text-[var(--color-text-primary)]">4ステップでサクサク登録</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 relative">
              {[
                { step: 1, title: "かざすだけ", desc: "商品のバーコードをカメラの枠に収めます。" },
                { step: 2, title: "瞬時に特定", desc: "DBから商品名、画像、基本情報を取得します。" },
                { step: 3, title: "期限をセット", desc: "推定エンジンが最適な賞味期限を提案。" },
                { step: 4, title: "完了！", desc: "あとは冷蔵庫に入れるだけ。管理が始まります。" },
              ].map((item, index) => (
                <div key={item.step} className="relative p-10 bg-[var(--background)] border border-[var(--surface-border)] rounded-[2.5rem] group hover:shadow-xl transition-all">
                  <div className="w-12 h-12 bg-indigo-600 text-white rounded-full flex items-center justify-center font-bold text-xl mb-8 group-hover:scale-110 group-hover:bg-indigo-500 transition-all">
                    {item.step}
                  </div>
                  <h4 className="text-2xl font-bold mb-4">{item.title}</h4>
                  <p className="text-[var(--color-text-secondary)] leading-relaxed font-medium">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="max-w-7xl mx-auto px-6 py-24 md:py-40">
          <div className="relative p-12 md:p-24 rounded-[4rem] bg-gradient-to-br from-[var(--semantic-indigo)] to-[var(--semantic-purple)] overflow-hidden text-center text-white shadow-2xl">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl"></div>
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-400 opacity-20 rounded-full translate-y-1/2 -translate-x-1/2 blur-3xl"></div>
            
            <div className="relative z-10 space-y-10 animate-in fade-in zoom-in duration-1000">
              <h2 className="text-4xl md:text-6xl font-black leading-tight">
                登録を、「一瞬の楽しみ」に。
              </h2>
              <p className="text-xl md:text-2xl text-indigo-100 max-w-3xl mx-auto font-medium leading-relaxed">
                バーコードスキャンとハイブリッド推定エンジンで、食材管理は新しいステージへ。
                My-fridgeaiを今すぐ体験しましょう。
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-6 pt-6">
                <Link
                  href="/login"
                  className="w-full sm:w-auto px-12 py-6 bg-white text-[var(--semantic-indigo)] hover:bg-indigo-50 font-black text-xl rounded-2xl transition-all shadow-xl hover:-translate-y-1"
                >
                  無料で使ってみる
                </Link>
                <Link
                  href="/features"
                  className="w-full sm:w-auto px-12 py-6 bg-white/10 hover:bg-white/20 text-white font-black text-xl rounded-2xl border border-white/20 transition-all backdrop-blur-sm"
                >
                  他の機能を見る
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Related Pages */}
        <section className="max-w-7xl mx-auto px-6 pb-32">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { title: "機能一覧", href: "/features", icon: "🛠️", desc: "My-fridgeaiの全貌" },
              { title: "レシート登録", href: "/features/receipt-scan", icon: "📸", desc: "買い物全体をまとめてスキャン" },
              { title: "FAQ", href: "/faq", icon: "❓", desc: "操作に関する疑問はこちら" },
            ].map((link, i) => (
              <Link
                key={i}
                href={link.href}
                className="p-8 bg-[var(--background)] border border-[var(--surface-border)] rounded-3xl flex items-center gap-6 group hover:shadow-xl hover:shadow-indigo-50 dark:hover:shadow-none transition-all duration-300"
              >
                <div className="w-14 h-14 bg-[var(--surface-bg)] rounded-2xl flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
                  {link.icon}
                </div>
                <div>
                  <h3 className="font-bold text-[var(--color-text-primary)] mb-1 group-hover:text-[var(--semantic-indigo)] transition-colors">{link.title}</h3>
                  <p className="text-sm text-[var(--color-text-secondary)]">{link.desc}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
