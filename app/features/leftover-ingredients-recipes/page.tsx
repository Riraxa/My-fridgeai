/**
 * Page: /features/leftover-ingredients-recipes
 * - public
 */
import type { Metadata } from "next";
import Link from "next/link";

const SITE_URL =
  process.env.NEXT_PUBLIC_BASE_URL ?? "https://www.my-fridgeai.com";

export const metadata: Metadata = {
  title: "余った食材の活用レシピ｜少量の残り物を絶品料理に変えるアイデア",
  description:
    "「中途半端に残った野菜」「少しだけ残ったお肉」。そんな食材を主役にするリメイク料理のコツを詳しく紹介。My-fridgeaiのAIなら、余り物を組み合わせて最適な献立を瞬時に提案します。",
  openGraph: {
    title: "余った食材の活用レシピ｜少量の残り物を絶品料理に変えるアイデア",
    description:
      "余り物を捨てる前に、AIに相談。冷蔵庫の「端っこ」にある食材を活かす、驚きのリメイクアイデアを紹介します。",
    url: `${SITE_URL}/features/leftover-ingredients-recipes`,
    images: [`${SITE_URL}/og-images/og-top.png`],
  },
  alternates: {
    canonical: `${SITE_URL}/features/leftover-ingredients-recipes`,
  },
};

export default function LeftoverIngredientsRecipesPage() {
  return (
    <div className="min-h-screen bg-[var(--background)] font-sans selection:bg-emerald-100 selection:text-emerald-700">
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
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[var(--semantic-green-bg)] text-[var(--semantic-green)] text-sm font-semibold animate-in fade-in slide-in-from-top-4 duration-700 border border-[var(--surface-border)]">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--semantic-green)] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--semantic-green)]"></span>
            </span>
            食材ロスを「ご馳走」へ
          </span>
        </div>

        {/* Hero Section */}
        <section className="relative overflow-hidden pt-10 pb-24 md:pt-16 md:pb-32">
          {/* Background Decorative Elements */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full -z-10 pointer-events-none opacity-20 dark:opacity-10">
            <div className="absolute top-0 left-1/4 w-96 h-96 bg-emerald-300 rounded-full mix-blend-multiply filter blur-3xl animate-blob"></div>
            <div className="absolute top-0 right-1/4 w-96 h-96 bg-teal-300 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-2000"></div>
            <div className="absolute bottom-0 left-1/3 w-96 h-96 bg-lime-200 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-4000"></div>
          </div>

          <div className="max-w-6xl mx-auto px-6 text-center animate-in fade-in slide-in-from-bottom-8 duration-1000">
            <div className="w-24 h-24 bg-gradient-to-br from-[var(--semantic-green)] to-[var(--semantic-blue)] rounded-[2.5rem] flex items-center justify-center text-5xl mx-auto mb-10 shadow-2xl shadow-[var(--semantic-green-bg)] dark:shadow-none hover:rotate-6 transition-transform duration-300 cursor-default">
              🥗
            </div>
            <h1 className="text-5xl md:text-7xl font-extrabold text-[var(--color-text-primary)] mb-8 leading-[1.15] tracking-tight">
              余った食材は、<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[var(--semantic-green)] to-[var(--semantic-blue)]">
                最高のアレンジ素材。
              </span>
            </h1>
            <p className="text-xl md:text-2xl text-[var(--color-text-secondary)] max-w-3xl mx-auto leading-relaxed mb-12">
              「これっぽっちで何が作れる？」の答えをAIが提案。<br className="hidden md:block" />
              冷蔵庫の端っこに残った食材から、驚きのリメイク料理が生まれます。
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/login"
                className="w-full sm:w-auto px-10 py-5 bg-[var(--semantic-green)] hover:bg-emerald-700 text-white font-bold text-lg rounded-2xl transition-all shadow-xl shadow-[var(--semantic-green-bg)] dark:shadow-none hover:-translate-y-1 active:scale-[0.98]"
              >
                余り物を活用する
              </Link>
              <Link
                href="/features/reduce-food-waste"
                className="w-full sm:w-auto px-10 py-5 bg-[var(--surface-bg)] hover:bg-[var(--surface-border)] text-[var(--color-text-primary)] font-bold text-lg rounded-2xl border border-[var(--surface-border)] transition-all flex items-center justify-center gap-2"
              >
                食品ロス削減について
              </Link>
            </div>
          </div>
        </section>

        {/* Highlights Section */}
        <section className="bg-[var(--surface-bg)] py-24 md:py-32">
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center mb-16 space-y-4">
              <h2 className="text-sm font-bold text-[var(--semantic-green)] uppercase tracking-widest">リメイクの技術</h2>
              <p className="text-3xl md:text-5xl font-extrabold text-[var(--color-text-primary)]">最後の一欠片まで、おいしく</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {[
                { title: "少量食材の最適解", icon: "🔍", desc: "「卵1個、玉ねぎ1/4」といった中途半端な分量でも成立するレシピを提案。" },
                { title: "リメイクマジック", icon: "✨", desc: "前日の煮物をカレーに、サラダをオムレツになど、劇的な変身メニューを提示。" },
                { title: "調味料マスター", icon: "🧂", desc: "家にある調味料だけで味の印象をガラリと変える、賢い味付けテクニック。" },
              ].map((item, i) => (
                <div key={i} className="group p-10 bg-[var(--background)] border border-[var(--surface-border)] rounded-[2.5rem] hover:shadow-2xl hover:shadow-emerald-50 dark:hover:shadow-none transition-all duration-300 hover:-translate-y-2 text-center">
                  <div className="w-16 h-16 bg-[var(--semantic-green-bg)] rounded-3xl flex items-center justify-center text-3xl mb-8 mx-auto group-hover:scale-110 transition-transform duration-300">
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
                tag: "食材の有効活用",
                title: "冷蔵庫を「デッドストック」のない空間へ",
                desc: "奥の方で忘れ去られる食材をゼロに。My-fridgeaiなら、期限が近い「少量食材」を通知し、それらを主役にした使い切りメニューを提案します。",
                icon: "📦",
                side: "left"
              },
              {
                id: "02",
                tag: "家事の知恵",
                title: "プロの知恵を、あなたの指先に",
                desc: "和・洋・中、あらゆるジャンルのリメイク術をAIが習得。自分では思いつかないような食材の組み合わせで、毎日飽きない食卓を実現します。",
                icon: "👨‍🍳",
                side: "right"
              },
              {
                id: "03",
                tag: "生活の美学",
                title: "美味しく食べる、一番の社会貢献",
                desc: "「捨てる」罪悪感から、「使い切る」充実感へ。食材を大切にする心豊かな生活を、テクノロジーの力で軽やかにサポートします。",
                icon: "❤️",
                side: "left"
              }
            ].map((section, idx) => (
              <div key={section.id} className={`flex flex-col ${section.side === 'right' ? 'md:flex-row-reverse' : 'md:flex-row'} items-center gap-16 md:gap-24`}>
                <div className="flex-1 space-y-8">
                  <div className="flex items-center gap-4">
                    <span className="text-6xl font-black text-[var(--surface-border)]">{section.id}</span>
                    <div className="h-[2px] w-12 bg-[var(--semantic-green)]"></div>
                    <span className="text-[var(--semantic-green)] font-bold tracking-widest uppercase">{section.tag}</span>
                  </div>
                  <h2 className="text-4xl md:text-5xl font-extrabold text-[var(--color-text-primary)] leading-[1.25]">
                    {section.title}
                  </h2>
                  <p className="text-xl text-[var(--color-text-secondary)] leading-loose">
                    {section.desc}
                  </p>
                </div>
                <div className="flex-1 relative w-full aspect-square md:aspect-auto md:h-[400px] bg-gradient-to-br from-[var(--semantic-green-bg)] to-[var(--background)] rounded-[3rem] border border-[var(--surface-border)] flex items-center justify-center text-[10rem] shadow-inner group overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-[var(--semantic-green)] to-[var(--semantic-blue)] opacity-0 group-hover:opacity-10 transition-opacity duration-700"></div>
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
              <h2 className="text-sm font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">リメイクの流れ</h2>
              <p className="text-3xl md:text-5xl font-extrabold text-[var(--color-text-primary)]">余り物リフレッシュ・ステップ</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 relative">
              {[
                { step: 1, title: "食材を選ぶ", desc: "今の冷蔵庫から「使い切ってしまいたいもの」を複数選択。" },
                { step: 2, title: "AIが診断", desc: "選択された食材同士の相性を考え、最適な料理ジャンルを決定。" },
                { step: 3, title: "魔法をかける", desc: "プロ並みのリメイク術で、見た目も味も新しいレシピを提示。" },
                { step: 4, title: "完食！", desc: "最後の一口までおいしく。冷蔵庫もスッキリ整理されます。" },
              ].map((item, index) => (
                <div key={item.step} className="relative p-10 bg-[var(--background)] border border-[var(--surface-border)] rounded-[2.5rem] group hover:shadow-xl transition-all">
                  <div className="w-12 h-12 bg-[var(--semantic-green)] text-white rounded-full flex items-center justify-center font-bold text-xl mb-8 group-hover:scale-110 group-hover:bg-emerald-500 transition-all">
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
          <div className="relative p-12 md:p-24 rounded-[4rem] bg-gradient-to-br from-[var(--semantic-green)] to-[var(--semantic-blue)] overflow-hidden text-center text-white shadow-2xl">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl"></div>
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-teal-400 opacity-20 rounded-full translate-y-1/2 -translate-x-1/2 blur-3xl"></div>
            
            <div className="relative z-10 space-y-10 animate-in fade-in zoom-in duration-1000">
              <h2 className="text-4xl md:text-6xl font-black leading-tight">
                さよなら、もったいない。<br />
                こんにちは、新しいおいしさ。
              </h2>
              <p className="text-xl md:text-2xl text-emerald-100 max-w-3xl mx-auto font-medium leading-relaxed">
                余った食材の数だけ、驚きのレシピが眠っています。
                My-fridgeaiで、あなたの料理をもっとクリエイティブに。
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-6 pt-6">
                <Link
                  href="/login"
                  className="w-full sm:w-auto px-12 py-6 bg-white text-[var(--semantic-green)] hover:bg-emerald-50 font-black text-xl rounded-2xl transition-all shadow-xl hover:-translate-y-1"
                >
                  無料で使い切る
                </Link>
                <Link
                  href="/features"
                  className="w-full sm:w-auto px-12 py-6 bg-white/10 hover:bg-white/20 text-white font-black text-xl rounded-2xl border border-white/20 transition-all backdrop-blur-sm"
                >
                  他の機能をチェック
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Related Pages */}
        <section className="max-w-7xl mx-auto px-6 pb-32">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { title: "食品ロス削減", href: "/features/reduce-food-waste", icon: "🌎", desc: "地球と家計にやさしい生活" },
              { title: "冷蔵庫からレシピ", href: "/features/recipe-from-fridge", icon: "🧊", desc: "あるもので絶品料理" },
              { title: "機能一覧", href: "/features", icon: "🛠️", desc: "家事を支えるテクノロジー" },
            ].map((link, i) => (
              <Link
                key={i}
                href={link.href}
                className="p-8 bg-[var(--background)] border border-[var(--surface-border)] rounded-3xl flex items-center gap-6 group hover:shadow-xl hover:shadow-emerald-50 dark:hover:shadow-none transition-all duration-300"
              >
                <div className="w-14 h-14 bg-[var(--semantic-green-bg)] rounded-2xl flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
                  {link.icon}
                </div>
                <div>
                  <h3 className="font-bold text-[var(--color-text-primary)] mb-1 group-hover:text-[var(--semantic-green)] transition-colors">{link.title}</h3>
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
