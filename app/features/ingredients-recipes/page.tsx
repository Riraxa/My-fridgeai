import type { Metadata } from "next";
import Link from "next/link";
import { Search, Utensils, Zap, Heart, BookOpen } from "lucide-react";

const SITE_URL =
  process.env.NEXT_PUBLIC_BASE_URL ?? "https://www.my-fridgeai.com";

export const metadata: Metadata = {
  title: "食材からレシピ検索 | My-fridgeai",
  description:
    "冷蔵庫にある食材をもとに、作れる料理をAIが検索・提案。献立の悩みを解消し、新しい料理の発見をサポートします。",
  openGraph: {
    title: "食材からレシピ検索 | My-fridgeai",
    description: "冷蔵庫にある食材をもとに、作れる料理をAIが検索・提案。",
    url: `${SITE_URL}/features/ingredients-recipes`,
  },
  alternates: {
    canonical: `${SITE_URL}/features/ingredients-recipes`,
  },
};

export default function IngredientsRecipesPage() {
  return (
    <div className="min-h-screen bg-[var(--background)] font-sans selection:bg-orange-100 selection:text-orange-700">
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
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[var(--semantic-orange-bg)] text-[var(--semantic-orange)] text-sm font-semibold animate-in fade-in slide-in-from-top-4 duration-700 border border-[var(--surface-border)]">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--semantic-orange)] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--semantic-orange)]"></span>
            </span>
            レシピ検索機能がパワーアップ
          </span>
        </div>

        {/* Hero Section */}
        <section className="relative overflow-hidden pt-10 pb-24 md:pt-16 md:pb-32">
          {/* Background Decorative Elements */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full -z-10 pointer-events-none opacity-20 dark:opacity-10">
            <div className="absolute top-0 left-1/4 w-96 h-96 bg-orange-300 rounded-full mix-blend-multiply filter blur-3xl animate-blob"></div>
            <div className="absolute top-0 right-1/4 w-96 h-96 bg-amber-300 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-2000"></div>
            <div className="absolute bottom-0 left-1/3 w-96 h-96 bg-yellow-200 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-4000"></div>
          </div>

          <div className="max-w-6xl mx-auto px-6 text-center animate-in fade-in slide-in-from-bottom-8 duration-1000">
            <div className="w-24 h-24 bg-gradient-to-br from-[var(--semantic-orange)] to-[var(--semantic-red)] rounded-[2.5rem] flex items-center justify-center text-5xl mx-auto mb-10 shadow-2xl shadow-[var(--semantic-orange-bg)] dark:shadow-none hover:rotate-6 transition-transform duration-300 cursor-default">
              🥗
            </div>
            <h1 className="text-5xl md:text-7xl font-extrabold text-[var(--color-text-primary)] mb-8 leading-[1.15] tracking-tight">
              食材からレシピ検索
            </h1>
            <p className="text-xl md:text-2xl text-[var(--color-text-secondary)] max-w-3xl mx-auto leading-relaxed mb-12">
              冷蔵庫にある食材をもとに、作れる料理をAIが検索・提案。<br className="hidden md:block" />
              献立の悩みを解消し、新しい料理の発見をサポートします。
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/login"
                className="w-full sm:w-auto px-10 py-5 bg-[var(--semantic-orange)] hover:bg-orange-700 text-white font-bold text-lg rounded-2xl transition-all shadow-xl shadow-[var(--semantic-orange-bg)] dark:shadow-none hover:-translate-y-1 active:scale-[0.98]"
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
              <h2 className="text-sm font-bold text-[var(--semantic-orange)] uppercase tracking-widest">効率・利便性</h2>
              <p className="text-3xl md:text-5xl font-extrabold text-[var(--color-text-primary)]">AIレシピ検索の4つの特徴</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              {[
                { title: "食材別のレシピ検索", icon: "🥬", desc: "主役となる食材を指定するだけで、幅広い調理法をご提案。" },
                { title: "組み合わせ料理の提案", icon: "🍱", desc: "複数の食材を組み合わせた、今の在庫で「最高に美味しい」一皿を特定。" },
                { title: "調理法の提案", icon: "👨‍🍳", desc: "焼く、煮る、揚げる。同じ食材でも全く違う味わいを楽しめる提案。" },
                { title: "新しい料理の発見", icon: "✨", desc: "自分では思いつかなかったような、AIならではの創作アイデアも。" },
              ].map((item, i) => (
                <div key={i} className="group p-10 bg-[var(--background)] border border-[var(--surface-border)] rounded-[2.5rem] hover:shadow-2xl hover:shadow-orange-100 dark:hover:shadow-none transition-all duration-300 hover:-translate-y-2">
                  <div className="w-16 h-16 bg-[var(--semantic-orange-bg)] rounded-3xl flex items-center justify-center text-3xl mb-8 group-hover:scale-110 transition-transform duration-300">
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
                icon: "🔍",
                side: "left"
              },
              {
                id: "02",
                tag: "自由な選択",
                title: "気分や時間に合わせた提案",
                desc: "通常案・時短案・代替案のように複数パターンを提案。時間がない日も、しっかり作りたい日も、AIが寄り添います。",
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
            ].map((section, idx) => (
              <div key={section.id} className={`flex flex-col ${section.side === 'right' ? 'md:flex-row-reverse' : 'md:flex-row'} items-center gap-16 md:gap-24`}>
                <div className="flex-1 space-y-8">
                  <div className="flex items-center gap-4">
                    <span className="text-6xl font-black text-[var(--surface-border)]">{section.id}</span>
                    <div className="h-[2px] w-12 bg-[var(--semantic-orange)]"></div>
                    <span className="text-[var(--semantic-orange)] font-bold tracking-widest uppercase">{section.tag}</span>
                  </div>
                  <h2 className="text-4xl md:text-5xl font-extrabold text-[var(--color-text-primary)] leading-[1.25]">
                    {section.title}
                  </h2>
                  <p className="text-xl text-[var(--color-text-secondary)] leading-loose">
                    {section.desc}
                  </p>
                </div>
                <div className="flex-1 relative w-full aspect-square md:aspect-auto md:h-[400px] bg-gradient-to-br from-[var(--semantic-orange-bg)] to-[var(--background)] rounded-[3rem] border border-[var(--surface-border)] flex items-center justify-center text-[10rem] shadow-inner group overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-[var(--semantic-orange)] to-[var(--semantic-red)] opacity-0 group-hover:opacity-10 transition-opacity duration-700"></div>
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
              <h2 className="text-sm font-bold text-[var(--semantic-orange)] uppercase tracking-widest">使い方の流れ</h2>
              <p className="text-3xl md:text-5xl font-extrabold text-[var(--color-text-primary)]">4ステップで体験</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 relative">
              {[
                { step: 1, title: "食材を選択", desc: "冷蔵庫の中にある使いたい食材をアプリ上でチェック。" },
                { step: 2, title: "条件を設定", desc: "今の気分や、使いたい調理器具などの条件をセット。" },
                { step: 3, title: "AIが生成", desc: "AIが最適なレシピと調理のポイントをあわせて提案。" },
                { step: 4, title: "調理・完食", desc: "新しい発見とともに、美味しい時間を過ごしましょう。" },
              ].map((item, index) => (
                <div key={item.step} className="relative p-10 bg-[var(--background)] border border-[var(--surface-border)] rounded-[2.5rem] group hover:shadow-xl transition-all">
                  <div className="w-12 h-12 bg-[var(--semantic-orange)] text-white rounded-full flex items-center justify-center font-bold text-xl mb-8 group-hover:scale-110 group-hover:bg-orange-500 transition-all">
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
          <div className="relative p-12 md:p-24 rounded-[4rem] bg-gradient-to-br from-[var(--semantic-orange)] to-[var(--semantic-red)] overflow-hidden text-center text-white shadow-2xl">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl"></div>
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-orange-400 opacity-20 rounded-full translate-y-1/2 -translate-x-1/2 blur-3xl"></div>
            
            <div className="relative z-10 space-y-10 animate-in fade-in zoom-in duration-1000">
              <h2 className="text-4xl md:text-6xl font-black leading-tight">
                「今日は何を作ろう」を、<br className="md:hidden" />考えなくていい。
              </h2>
              <p className="text-xl md:text-2xl text-orange-100 max-w-3xl mx-auto font-medium leading-relaxed">
                My-fridgeaiを今すぐ始めて、毎日の料理をもっとインテリジェントに。
                あなたのキッチンが、もっと自由に。
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-6 pt-6">
                <Link
                  href="/login"
                  className="w-full sm:w-auto px-12 py-6 bg-white text-[var(--semantic-orange)] hover:bg-orange-50 font-black text-xl rounded-2xl transition-all shadow-xl hover:-translate-y-1"
                >
                  レシピ検索を体験する
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

        {/* Related Pages */}
        <section className="max-w-7xl mx-auto px-6 pb-32">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { title: "機能一覧", href: "/features", icon: "🛠️", desc: "全ての機能を確認する" },
              { title: "AI献立生成", href: "/features/ai-menu", icon: "🍛", desc: "自動で1週間の献立を作成" },
              { title: "在庫管理", href: "/features/inventory", icon: "📋", desc: "冷蔵庫の中身をスマートに管理" },
            ].map((link, i) => (
              <Link
                key={i}
                href={link.href}
                className="p-8 bg-[var(--background)] border border-[var(--surface-border)] rounded-3xl flex items-center gap-6 group hover:shadow-xl hover:shadow-orange-50 dark:hover:shadow-none transition-all duration-300"
              >
                <div className="w-14 h-14 bg-[var(--semantic-orange-bg)] rounded-2xl flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
                  {link.icon}
                </div>
                <div>
                  <h3 className="font-bold text-[var(--color-text-primary)] mb-1 group-hover:text-[var(--semantic-orange)] transition-colors">{link.title}</h3>
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
