/**
 * Page: /features/recipe-from-fridge
 * - public
 */
import type { Metadata } from "next";
import Link from "next/link";

const SITE_URL =
  process.env.NEXT_PUBLIC_BASE_URL ?? "https://www.my-fridgeai.com";

export const metadata: Metadata = {
  title: "冷蔵庫の食材で料理を作る方法｜今あるもので絶品レシピを作るコツ",
  description:
    "「冷蔵庫に何もない」を「これで作れる！」に変える。My-fridgeaiのAI献立提案を活用して、今ある食材だけで美味しい料理を作る具体的な方法と時短テクニックを解説します。",
  openGraph: {
    title: "冷蔵庫の食材で料理を作る方法｜今あるもので絶品レシピを作るコツ",
    description:
      "買い物に行かなくても、冷蔵庫の中身で満足できる献立を。AIが提案する「今ある食材活用術」を紹介します。",
    url: `${SITE_URL}/features/recipe-from-fridge`,
    images: [`${SITE_URL}/og-images/og-top.png`],
  },
  alternates: {
    canonical: `${SITE_URL}/features/recipe-from-fridge`,
  },
};

export default function RecipeFromFridgePage() {
  return (
    <div className="min-h-screen bg-[var(--background)] font-sans selection:bg-cyan-100 selection:text-cyan-700">
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
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[var(--semantic-blue-bg)] text-[var(--semantic-blue)] text-sm font-semibold animate-in fade-in slide-in-from-top-4 duration-700 border border-[var(--surface-border)]">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--semantic-blue)] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--semantic-blue)]"></span>
            </span>
            「何作ろう？」の悩みから解放
          </span>
        </div>

        {/* Hero Section */}
        <section className="relative overflow-hidden pt-10 pb-24 md:pt-16 md:pb-32">
          {/* Background Decorative Elements */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full -z-10 pointer-events-none opacity-20 dark:opacity-10">
            <div className="absolute top-0 left-1/4 w-96 h-96 bg-cyan-300 rounded-full mix-blend-multiply filter blur-3xl animate-blob"></div>
            <div className="absolute top-0 right-1/4 w-96 h-96 bg-blue-300 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-2000"></div>
            <div className="absolute bottom-0 left-1/3 w-96 h-96 bg-sky-200 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-4000"></div>
          </div>

          <div className="max-w-6xl mx-auto px-6 text-center animate-in fade-in slide-in-from-bottom-8 duration-1000">
            <div className="w-24 h-24 bg-gradient-to-br from-[var(--semantic-blue)] to-[var(--semantic-purple)] rounded-[2.5rem] flex items-center justify-center text-5xl mx-auto mb-10 shadow-2xl shadow-[var(--semantic-blue-bg)] dark:shadow-none hover:rotate-6 transition-transform duration-300 cursor-default">
              🧊
            </div>
            <h1 className="text-5xl md:text-7xl font-extrabold text-[var(--color-text-primary)] mb-8 leading-[1.15] tracking-tight">
              冷蔵庫を開けるのが、<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[var(--semantic-blue)] to-[var(--semantic-purple)]">
                ワクワクする体験に。
              </span>
            </h1>
            <p className="text-xl md:text-2xl text-[var(--color-text-secondary)] max-w-3xl mx-auto leading-relaxed mb-12">
              買い物に行かなくても、家にある食材で最高の一皿を。<br className="hidden md:block" />
              AIがあなたの冷蔵庫の可能性を、無限に引き出します。
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/login"
                className="w-full sm:w-auto px-10 py-5 bg-[var(--semantic-blue)] hover:bg-blue-700 text-white font-bold text-lg rounded-2xl transition-all shadow-xl shadow-[var(--semantic-blue-bg)] dark:shadow-none hover:-translate-y-1 active:scale-[0.98]"
              >
                今すぐ献立を作る
              </Link>
              <Link
                href="/features/ai-menu"
                className="w-full sm:w-auto px-10 py-5 bg-[var(--surface-bg)] hover:bg-[var(--surface-border)] text-[var(--color-text-primary)] font-bold text-lg rounded-2xl border border-[var(--surface-border)] transition-all flex items-center justify-center gap-2"
              >
                AIの仕組みを知る
              </Link>
            </div>
          </div>
        </section>

        {/* Highlights Section */}
        <section className="bg-[var(--surface-bg)] py-24 md:py-32">
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center mb-16 space-y-4">
              <h2 className="text-sm font-bold text-[var(--semantic-blue)] uppercase tracking-widest">創造性と発見</h2>
              <p className="text-3xl md:text-5xl font-extrabold text-[var(--color-text-primary)]">「あるもの」を活かす魔法</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {[
                { title: "在庫連動提案", icon: "📱", desc: "登録されている食材から、買い足し不要で作れるレシピを優先して提案します。" },
                { title: "カテゴリー活用", icon: "🍱", desc: "メイン・副菜・汁物のバランスを考慮。冷蔵庫全体を一つの食卓として捉えます。" },
                { title: "アレンジのヒント", icon: "💡", desc: "「この食材がなければこれで代用」といった、料理の応用法までアドバイス。" },
              ].map((item, i) => (
                <div key={i} className="group p-10 bg-[var(--background)] border border-[var(--surface-border)] rounded-[2.5rem] hover:shadow-2xl hover:shadow-cyan-50 dark:hover:shadow-none transition-all duration-300 hover:-translate-y-2 text-center">
                  <div className="w-16 h-16 bg-[var(--semantic-blue-bg)] rounded-3xl flex items-center justify-center text-3xl mb-8 mx-auto group-hover:scale-110 transition-transform duration-300">
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
                tag: "圧倒的な手軽さ",
                title: "検索の手間を捨てて、料理を楽しむ",
                desc: "レシピサイトで何度も検索し直す必要はありません。My-fridgeaiならボタン一つで、あなたの冷蔵庫に眠る「隠れた名作」を見つけ出します。",
                icon: "🍳",
                side: "left"
              },
              {
                id: "02",
                tag: "家計への優しさ",
                title: "買い物頻度を下げて、自由に使える時間を増やす",
                desc: "「何もないから買い物に行かなきゃ」という思い込みを解消。家にあるもので済ませる日を増やすだけで、節約と時間の確保が同時に叶います。",
                icon: "⌛",
                side: "right"
              },
              {
                id: "03",
                tag: "豊かな食の体験",
                title: "マンネリ化した食卓からの卒業",
                desc: "「いつもの材料」でも「いつもと違う味」を。世界各国の料理データを学習したAIが、思いもよらなかった食材の組み合わせを提案します。",
                icon: "🌈",
                side: "left"
              }
            ].map((section, idx) => (
              <div key={section.id} className={`flex flex-col ${section.side === 'right' ? 'md:flex-row-reverse' : 'md:flex-row'} items-center gap-16 md:gap-24`}>
                <div className="flex-1 space-y-8">
                  <div className="flex items-center gap-4">
                    <span className="text-6xl font-black text-[var(--surface-border)]">{section.id}</span>
                    <div className="h-[2px] w-12 bg-[var(--semantic-blue)]"></div>
                    <span className="text-[var(--semantic-blue)] font-bold tracking-widest uppercase">{section.tag}</span>
                  </div>
                  <h2 className="text-4xl md:text-5xl font-extrabold text-[var(--color-text-primary)] leading-[1.25]">
                    {section.title}
                  </h2>
                  <p className="text-xl text-[var(--color-text-secondary)] leading-loose">
                    {section.desc}
                  </p>
                </div>
                <div className="flex-1 relative w-full aspect-square md:aspect-auto md:h-[400px] bg-gradient-to-br from-[var(--semantic-blue-bg)] to-[var(--background)] rounded-[3rem] border border-[var(--surface-border)] flex items-center justify-center text-[10rem] shadow-inner group overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-[var(--semantic-blue)] to-[var(--semantic-purple)] opacity-0 group-hover:opacity-10 transition-opacity duration-700"></div>
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
              <h2 className="text-sm font-bold text-[var(--semantic-blue)] uppercase tracking-widest">ご利用ガイド</h2>
              <p className="text-3xl md:text-5xl font-extrabold text-[var(--color-text-primary)]">最短10秒で献立決定</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 relative">
              {[
                { step: 1, title: "アプリを開く", desc: "ダッシュボードで現在の在庫をパッと確認。" },
                { step: 2, title: "AIを呼ぶ", desc: "「献立を考える」ボタンをタップするだけ。" },
                { step: 3, title: "候補から選ぶ", desc: "提案された3〜5つの案から、今日の気分を選択。" },
                { step: 4, title: "調理スタート", desc: "レシピを見ながら作るだけ。買い物は不要です。" },
              ].map((item, index) => (
                <div key={item.step} className="relative p-10 bg-[var(--background)] border border-[var(--surface-border)] rounded-[2.5rem] group hover:shadow-xl transition-all">
                  <div className="w-12 h-12 bg-[var(--semantic-blue)] text-white rounded-full flex items-center justify-center font-bold text-xl mb-8 group-hover:scale-110 group-hover:bg-blue-500 transition-all">
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
          <div className="relative p-12 md:p-24 rounded-[4rem] bg-gradient-to-br from-[var(--semantic-blue)] to-[var(--semantic-purple)] overflow-hidden text-center text-white shadow-2xl">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl"></div>
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-400 opacity-20 rounded-full translate-y-1/2 -translate-x-1/2 blur-3xl"></div>
            
            <div className="relative z-10 space-y-10 animate-in fade-in zoom-in duration-1000">
              <h2 className="text-4xl md:text-6xl font-black leading-tight">
                「何もない」は、思い込みかもしれません。
              </h2>
              <p className="text-xl md:text-2xl text-cyan-100 max-w-3xl mx-auto font-medium leading-relaxed">
                あなたの冷蔵庫にある食材たちが、主役になるのを待っています。
                My-fridgeaiを今すぐ体験しましょう。
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-6 pt-6">
                <Link
                  href="/login"
                  className="w-full sm:w-auto px-12 py-6 bg-white text-[var(--semantic-blue)] hover:bg-blue-50 font-black text-xl rounded-2xl transition-all shadow-xl hover:-translate-y-1"
                >
                  無料で献立を作る
                </Link>
                <Link
                  href="/features"
                  className="w-full sm:w-auto px-12 py-6 bg-white/10 hover:bg-white/20 text-white font-black text-xl rounded-2xl border border-white/20 transition-all backdrop-blur-sm"
                >
                  機能一覧に戻る
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Related Pages */}
        <section className="max-w-7xl mx-auto px-6 pb-32">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { title: "在庫管理", href: "/features/inventory", icon: "📋", desc: "アプリの基本は在庫から" },
              { title: "レシート登録", href: "/features/receipt-scan", icon: "📸", desc: "在庫登録をもっと楽に" },
              { title: "よくある質問", href: "/faq", icon: "❓", desc: "困った時の解決ヒント" },
            ].map((link, i) => (
              <Link
                key={i}
                href={link.href}
                className="p-8 bg-[var(--background)] border border-[var(--surface-border)] rounded-3xl flex items-center gap-6 group hover:shadow-xl hover:shadow-cyan-50 dark:hover:shadow-none transition-all duration-300"
              >
                <div className="w-14 h-14 bg-[var(--semantic-blue-bg)] rounded-2xl flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
                  {link.icon}
                </div>
                <div>
                  <h3 className="font-bold text-[var(--color-text-primary)] mb-1 group-hover:text-[var(--semantic-blue)] transition-colors">{link.title}</h3>
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
