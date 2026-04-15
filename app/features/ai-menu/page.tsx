import type { Metadata } from "next";
import Link from "next/link";

const SITE_URL =
  process.env.NEXT_PUBLIC_BASE_URL ?? "https://www.my-fridgeai.com";

export const metadata: Metadata = {
  title: "AI献立生成 | My-fridgeai",
  description:
    "冷蔵庫の中身から、今日の献立をAIが自動提案。食材の組み合わせ、味のバランス、調理のしやすさまで考慮して、毎日の献立づくりをもっと軽くします。",
  openGraph: {
    title: "AI献立生成 | My-fridgeai",
    description: "冷蔵庫の中身から、今日の献立をAIが自動提案。",
    url: `${SITE_URL}/features/ai-menu`,
  },
  alternates: {
    canonical: `${SITE_URL}/features/ai-menu`,
  },
};

export default function AIMenuFeaturePage() {
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
        {/* News Badge (Subtle enhancement) */}
        <div className="max-w-7xl mx-auto px-6 pt-12 text-center pointer-events-none">
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[var(--semantic-indigo-bg)] text-[var(--semantic-indigo)] text-sm font-semibold animate-in fade-in slide-in-from-top-4 duration-700">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--semantic-indigo)] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--semantic-indigo)]"></span>
            </span>
            AIが進化しました
          </span>
        </div>

        {/* Hero Section */}
        <section className="relative overflow-hidden pt-10 pb-24 md:pt-16 md:pb-32">
          {/* Background Decorative Elements */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full -z-10 pointer-events-none opacity-20 dark:opacity-10">
            <div className="absolute top-0 left-1/4 w-96 h-96 bg-[var(--semantic-indigo)] rounded-full mix-blend-multiply filter blur-3xl animate-blob"></div>
            <div className="absolute top-0 right-1/4 w-96 h-96 bg-blue-300 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-2000"></div>
            <div className="absolute bottom-0 left-1/3 w-96 h-96 bg-purple-300 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-4000"></div>
          </div>

          <div className="max-w-6xl mx-auto px-6 text-center animate-in fade-in slide-in-from-bottom-8 duration-1000">
            <div className="w-24 h-24 bg-gradient-to-br from-[var(--semantic-indigo)] to-[var(--semantic-blue)] rounded-[2.5rem] flex items-center justify-center text-5xl mx-auto mb-10 shadow-2xl shadow-[var(--semantic-indigo-bg)] dark:shadow-none hover:rotate-6 transition-transform duration-300 cursor-default">
              🍛
            </div>
            <h1 className="text-5xl md:text-7xl font-extrabold text-[var(--color-text-primary)] mb-8 leading-[1.15] tracking-tight">
              冷蔵庫の中身から、<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[var(--semantic-indigo)] to-[var(--semantic-blue)]">
                最高の献立
              </span>
              をAIが自動提案
            </h1>
            <p className="text-xl md:text-2xl text-[var(--color-text-secondary)] max-w-3xl mx-auto leading-relaxed mb-12">
              食材の組み合わせ、味のバランス、調理のしやすさまで考慮して、<br className="hidden md:block" />
              毎日の献立づくりをもっと軽く、もっと楽しく。
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/login"
                className="w-full sm:w-auto px-10 py-5 bg-[var(--semantic-indigo)] hover:bg-indigo-700 text-white font-bold text-lg rounded-2xl transition-all shadow-xl shadow-indigo-100 dark:shadow-none hover:-translate-y-1 active:scale-[0.98]"
              >
                まずは無料で試してみる
              </Link>
              <Link
                href="/how-it-works"
                className="w-full sm:w-auto px-10 py-5 bg-[var(--surface-bg)] hover:bg-[var(--surface-border)] text-[var(--color-text-primary)] font-bold text-lg rounded-2xl border border-[var(--surface-border)] transition-all flex items-center justify-center gap-2"
              >
                使い方を詳しく見る
              </Link>
            </div>
          </div>
        </section>

        {/* Highlights Section */}
        <section className="bg-[var(--surface-bg)] py-24 md:py-32">
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center mb-16 space-y-4">
              <h2 className="text-sm font-bold text-[var(--semantic-indigo)] uppercase tracking-widest">効率・利便性</h2>
              <p className="text-3xl md:text-5xl font-extrabold text-[var(--color-text-primary)]">AI献立生成の4つの特徴</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              {[
                { title: "在庫連動", icon: "📦", desc: "冷蔵庫のリアルタイム在庫を解析し、最適な食材を選び出します。" },
                { title: "複数案提示", icon: "✨", desc: "気分に合わせて選べる3つの異なるアプローチをご提案。" },
                { title: "栄養バランス", icon: "⚖️", desc: "単なるレシピ出しではなくバランスの取れた献立を設計。" },
                { title: "好みへの最適化", icon: "❤️", desc: "使い続けるほど、あなたの好みに合った提案が可能に。" },
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
                tag: "負担の軽減",
                title: "「何を作ろう」の負担をなくす",
                desc: "毎日の料理で最も負担になりやすいのは、調理そのものよりも意思決定です。My-fridgeaiは、そのコストを最小限に抑えます。",
                icon: "🧠",
                side: "left"
              },
              {
                id: "02",
                tag: "自由な選択",
                title: "気分や時間に合わせた2案＋サジェスト提示",
                desc: "バランス最適案・特化案（時短/節約/健康/創作）＋第3の方向性を提案。時間がない日も、しっかり作りたい日も、AIが寄り添います。",
                icon: "💡",
                side: "right"
              },
              {
                id: "03",
                tag: "健康を支える",
                title: "実用性と栄養、その両立",
                desc: "手持ちの食材、調理器具、調理時間、味の傾向を踏まえて提案。栄養バランスも整う、持続可能な食生活をサポートします。",
                icon: "🥗",
                side: "left"
              }
            ].map((section) => (
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
                  <div className="absolute inset-0 bg-gradient-to-br from-[var(--semantic-indigo)] to-[var(--semantic-blue)] opacity-0 group-hover:opacity-10 transition-opacity duration-700"></div>
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
              <h2 className="text-sm font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">使い方の流れ</h2>
              <p className="text-3xl md:text-5xl font-extrabold text-[var(--color-text-primary)]">4ステップで体験</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 relative">
              {[
                { step: 1, title: "食材を登録", desc: "レシートやスキャンで、冷蔵庫の今を登録。" },
                { step: 2, title: "条件を設定", desc: "「時短で」「薄味で」など今日の希望をセット。" },
                { step: 3, title: "AIが生成", desc: "数秒でAIがあなた専用の2案＋サジェストを作成します。" },
                { step: 4, title: "調理・完食", desc: "一番食べたい案を選んで調理をスタート。" },
              ].map((item) => (
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
          <div className="relative p-12 md:p-24 rounded-[4rem] bg-gradient-to-br from-[var(--semantic-indigo)] to-[var(--semantic-blue)] overflow-hidden text-center text-white shadow-2xl">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl"></div>
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-400 opacity-20 rounded-full translate-y-1/2 -translate-x-1/2 blur-3xl"></div>
            
            <div className="relative z-10 space-y-10 animate-in fade-in zoom-in duration-1000">
              <h2 className="text-4xl md:text-6xl font-black leading-tight">
                「今日は何を作ろう」を、<br className="md:hidden" />考えなくていい。
              </h2>
              <p className="text-xl md:text-2xl text-indigo-100 max-w-3xl mx-auto font-medium leading-relaxed">
                My-fridgeaiを今すぐ始めて、毎日の料理をもっとインテリジェントに。
                あなたのキッチンが、もっと自由に。
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-6 pt-6">
                <Link
                  href="/login"
                  className="w-full sm:w-auto px-12 py-6 bg-white text-[var(--semantic-indigo)] hover:bg-indigo-50 font-black text-xl rounded-2xl transition-all shadow-xl hover:-translate-y-1"
                >
                  AI献立を体験する
                </Link>
                <Link
                  href="/features"
                  className="w-full sm:w-auto px-12 py-6 bg-white/10 hover:bg-white/20 text-white font-black text-xl rounded-2xl border border-white/20 transition-all backdrop-blur-sm"
                >
                  他の機能も見る
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Related Pages (Standardized) */}
        <section className="max-w-7xl mx-auto px-6 pb-32">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { title: "機能一覧", href: "/features", icon: "🛠️", desc: "全機能の概要を見る" },
              { title: "よくある質問", href: "/faq", icon: "❓", desc: "操作方法でお困りの方はこちら" },
              { title: "トップページ", href: "/", icon: "🏠", desc: "My-fridgeaiの理念を知る" },
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
