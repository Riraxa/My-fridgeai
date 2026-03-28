/**
 * Page: /features/reduce-food-waste
 * - public
 */
import type { Metadata } from "next";
import Link from "next/link";

const SITE_URL =
  process.env.NEXT_PUBLIC_BASE_URL ?? "https://www.my-fridgeai.com";

export const metadata: Metadata = {
  title: "食品ロスを削減する方法｜家計と地球を守るMy-fridgeaiの活用術",
  description:
    "家庭でできる食品ロス削減の具体的な方法を解説。My-fridgeaiのAI献立提案や在庫管理を活用して、年間約6万円の無駄をなくし、持続可能な食生活を実現するヒントを紹介します。",
  openGraph: {
    title: "食品ロスを削減する方法｜家計と地球を守るMy-fridgeaiの活用術",
    description:
      "食品ロス削減は、家計にも地球にも優しい選択。My-fridgeaiで食材を最後まで使い切る方法を解説します。",
    url: `${SITE_URL}/features/reduce-food-waste`,
    images: [`${SITE_URL}/og-images/og-top.png`],
  },
  alternates: {
    canonical: `${SITE_URL}/features/reduce-food-waste`,
  },
  other: {
    "application/ld+json": JSON.stringify({
      "@context": "https://schema.org",
      "@type": "Article",
      "headline": "食品ロスを削減する方法｜家計と地球を守るMy-fridgeaiの活用術",
      "author": {
        "@type": "Organization",
        "name": "My-fridgeai"
      },
      "datePublished": "2024-03-20",
      "dateModified": "2024-03-20",
      "articleBody": "家庭でできる食品ロス削減の具体的な方法と、My-fridgeaiを活用したスマートな解決策を解説します。",
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

export default function FoodWasteFeaturePage() {
  return (
    <div className="min-h-screen bg-[var(--background)] font-sans selection:bg-amber-100 selection:text-amber-700">
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
            年間約6万円の節約に貢献
          </span>
        </div>

        {/* Hero Section */}
        <section className="relative overflow-hidden pt-10 pb-24 md:pt-16 md:pb-32">
          {/* Background Decorative Elements */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full -z-10 pointer-events-none opacity-20 dark:opacity-10">
            <div className="absolute top-0 left-1/4 w-96 h-96 bg-amber-300 rounded-full mix-blend-multiply filter blur-3xl animate-blob"></div>
            <div className="absolute top-0 right-1/4 w-96 h-96 bg-orange-300 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-2000"></div>
            <div className="absolute bottom-0 left-1/3 w-96 h-96 bg-yellow-200 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-4000"></div>
          </div>

          <div className="max-w-6xl mx-auto px-6 text-center animate-in fade-in slide-in-from-bottom-8 duration-1000">
            <div className="w-24 h-24 bg-gradient-to-br from-[var(--semantic-orange)] to-[var(--semantic-red)] rounded-[2.5rem] flex items-center justify-center text-5xl mx-auto mb-10 shadow-2xl shadow-[var(--semantic-orange-bg)] dark:shadow-none hover:rotate-6 transition-transform duration-300 cursor-default">
              🌎
            </div>
            <h1 className="text-5xl md:text-7xl font-extrabold text-[var(--color-text-primary)] mb-8 leading-[1.15] tracking-tight">
              「もったいない」を、<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[var(--semantic-orange)] to-[var(--semantic-red)]">
                賢く、おいしく解決する
              </span>
            </h1>
            <p className="text-xl md:text-2xl text-[var(--color-text-secondary)] max-w-3xl mx-auto leading-relaxed mb-12">
              食品ロス削減は、家計にも地球にも優しい選択。<br className="hidden md:block" />
              My-fridgeaiは、食材を最後まで使い切るための最適なパートナーです。
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/login"
                className="w-full sm:w-auto px-10 py-5 bg-[var(--semantic-orange)] hover:bg-orange-700 text-white font-bold text-lg rounded-2xl transition-all shadow-xl shadow-[var(--semantic-orange-bg)] dark:shadow-none hover:-translate-y-1 active:scale-[0.98]"
              >
                フードロス削減を始める
              </Link>
              <Link
                href="/statistics"
                className="w-full sm:w-auto px-10 py-5 bg-[var(--surface-bg)] hover:bg-[var(--surface-border)] text-[var(--color-text-primary)] font-bold text-lg rounded-2xl border border-[var(--surface-border)] transition-all flex items-center justify-center gap-2"
              >
                削減実績を見る
              </Link>
            </div>
          </div>
        </section>

        {/* Highlights Section */}
        <section className="bg-[var(--surface-bg)] py-24 md:py-32">
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center mb-16 space-y-4">
              <h2 className="text-sm font-bold text-[var(--semantic-orange)] uppercase tracking-widest">地球への想い</h2>
              <p className="text-3xl md:text-5xl font-extrabold text-[var(--color-text-primary)]">ロスを減らす3つのアプローチ</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {[
                { title: "使い切り献立提案", icon: "🍳", desc: "半端に残った食材を主役にするレシピをAIが提案。余らせる隙を与えません。" },
                { title: "期限切れ予測アラート", icon: "🔔", desc: "単なる期限表示ではなく、使うべきタイミングをプッシュ通知でお知らせ。" },
                { title: "買い物最適化", icon: "🛒", desc: "在庫に基づき「今買うべきでないもの」を提示。入り口からロスを断ちます。" },
              ].map((item, i) => (
                <div key={i} className="group p-10 bg-[var(--background)] border border-[var(--surface-border)] rounded-[2.5rem] hover:shadow-2xl hover:shadow-amber-50 dark:hover:shadow-none transition-all duration-300 hover:-translate-y-2 text-center">
                  <div className="w-16 h-16 bg-[var(--semantic-orange-bg)] rounded-3xl flex items-center justify-center text-3xl mb-8 mx-auto group-hover:scale-110 transition-transform duration-300">
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
                tag: "家計への貢献",
                title: "年間約6.5万円の「隠れた支出」を削減",
                desc: "日本の家庭では、年間で一人あたり約1万円以上の食材を捨てていると言われています。My-fridgeaiなら、この「もったいない支出」を直接的な節約に変えられます。",
                icon: "💰",
                side: "left",
                color: "var(--semantic-orange)"
              },
              {
                id: "02",
                tag: "持続可能性",
                title: "地球に負担をかけない食生活",
                desc: "廃棄される食材の生産・輸送にかかるエネルギーは甚大です。家庭での完食を増やすことは、最も身近で効果的なエコ活動の一つになります。",
                icon: "🌿",
                side: "right"
              },
              {
                id: "03",
                tag: "創造的な料理",
                title: "残り物が「ごちそう」に変わる喜び",
                desc: "冷蔵庫の余り物をパズルのように組み合わせて作る料理は、クリエイティブで充実感のある体験。AIの提案が、あなたのレパートリーを無限に広げます。",
                icon: "✨",
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
                <div className="flex-1 relative w-full aspect-square md:aspect-auto md:h-[400px] bg-gradient-to-br from-amber-50 to-[var(--background)] rounded-[3rem] border border-[var(--surface-border)] flex items-center justify-center text-[10rem] shadow-inner group overflow-hidden">
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
              <h2 className="text-sm font-bold text-[var(--semantic-orange)] uppercase tracking-widest">仕組みと手順</h2>
              <p className="text-3xl md:text-5xl font-extrabold text-[var(--color-text-primary)]">4つのゼロを目指すステップ</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 relative">
              {[
                { step: 1, title: "見える化", desc: "レシートスキャンで在庫を登録。何があるか一目で把握。" },
                { step: 2, title: "意識する", desc: "期限切れが近い食材が強調表示。優先順位を明確に。" },
                { step: 3, title: "AIと解決", desc: "余り物を入力してAI献立。食材に命を吹き込みます。" },
                { step: 4, title: "成果を喜ぶ", desc: "減らせたロスを可視化。節約額や貢献度をチェック。" },
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
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-yellow-400 opacity-20 rounded-full translate-y-1/2 -translate-x-1/2 blur-3xl"></div>
            
            <div className="relative z-10 space-y-10 animate-in fade-in zoom-in duration-1000">
              <h2 className="text-4xl md:text-6xl font-black leading-tight">
                「捨てる」を、「食べる」に変えよう。
              </h2>
              <p className="text-xl md:text-2xl text-amber-100 max-w-3xl mx-auto font-medium leading-relaxed">
                あなたの冷蔵庫が、未来を変える第一歩になります。
                My-fridgeaiで、スマートなエシカルライフを始めませんか？
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-6 pt-6">
                <Link
                  href="/login"
                  className="w-full sm:w-auto px-12 py-6 bg-white text-[var(--semantic-orange)] hover:bg-orange-50 font-black text-xl rounded-2xl transition-all shadow-xl hover:-translate-y-1"
                >
                  無料で削減を開始
                </Link>
                <Link
                  href="/features/ai-menu"
                  className="w-full sm:w-auto px-12 py-6 bg-white/10 hover:bg-white/20 text-white font-black text-xl rounded-2xl border border-white/20 transition-all backdrop-blur-sm"
                >
                  AI献立機能を詳しく
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Related Pages */}
        <section className="max-w-7xl mx-auto px-6 pb-32">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { title: "機能一覧", href: "/features", icon: "🛠️", desc: "家事を支えるテクノロジー" },
              { title: "余った食材レシピ", href: "/features/leftover-ingredients-recipes", icon: "🥗", desc: "ロス削減の強力な味方" },
              { title: "在庫管理", href: "/features/inventory", icon: "📋", desc: "ロスを防ぐ基本のキ" },
            ].map((link, i) => (
              <Link
                key={i}
                href={link.href}
                className="p-8 bg-[var(--background)] border border-[var(--surface-border)] rounded-3xl flex items-center gap-6 group hover:shadow-xl hover:shadow-amber-50 dark:hover:shadow-none transition-all duration-300"
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
