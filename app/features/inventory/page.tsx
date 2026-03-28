import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";

const SITE_URL =
  process.env.NEXT_PUBLIC_BASE_URL ?? "https://www.my-fridgeai.com";

export const metadata: Metadata = {
  title: "冷蔵庫食材管理 | My-fridgeai",
  description:
    "賞味期限、在庫数、登録日をひと目で確認。食材を「持っているだけ」で終わらせず、使い切るための管理へ。",
  openGraph: {
    title: "冷蔵庫食材管理 | My-fridgeai",
    description: "賞味期限、在庫数、登録日をひと目で確認。",
    url: `${SITE_URL}/features/inventory`,
  },
  alternates: {
    canonical: `${SITE_URL}/features/inventory`,
  },
};

export default function InventoryFeaturePage() {
  return (
    <div className="min-h-screen bg-[var(--background)] font-sans selection:bg-[var(--semantic-blue-bg)] selection:text-[var(--semantic-blue)]">
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
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[var(--semantic-blue-bg)] text-[var(--semantic-blue)] text-sm font-semibold animate-in fade-in slide-in-from-top-4 duration-700">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--semantic-blue)] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--semantic-blue)]"></span>
            </span>
            管理がより正確になりました
          </span>
        </div>

        {/* Hero Section */}
        <section className="relative overflow-hidden pt-10 pb-24 md:pt-16 md:pb-32">
          {/* Background Decorative Elements */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full -z-10 pointer-events-none opacity-20 dark:opacity-10">
            <div className="absolute top-0 left-1/4 w-96 h-96 bg-[var(--semantic-blue)] rounded-full mix-blend-multiply filter blur-3xl animate-blob"></div>
            <div className="absolute top-0 right-1/4 w-96 h-96 bg-cyan-300 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-2000"></div>
            <div className="absolute bottom-0 left-1/3 w-96 h-96 bg-blue-300 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-4000"></div>
          </div>

          <div className="max-w-6xl mx-auto px-6 text-center animate-in fade-in slide-in-from-bottom-8 duration-1000">
            <div className="w-24 h-24 bg-gradient-to-br from-[var(--semantic-blue)] to-[var(--semantic-indigo)] rounded-[2.5rem] flex items-center justify-center text-5xl mx-auto mb-10 shadow-2xl shadow-[var(--semantic-blue-bg)] dark:shadow-none hover:rotate-6 transition-transform duration-300 cursor-default">
              🧊
            </div>
            <h1 className="text-5xl md:text-7xl font-extrabold text-[var(--color-text-primary)] mb-8 leading-[1.15] tracking-tight">
              冷蔵庫の中身を、<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[var(--semantic-blue)] to-[var(--semantic-indigo)]">
                ムダのない食卓
              </span>
              スマート管理
            </h1>
            <p className="text-xl md:text-2xl text-[var(--color-text-secondary)] max-w-3xl mx-auto leading-relaxed mb-12">
              賞味期限、在庫数、登録日を完璧に把握。<br className="hidden md:block" />
              食材を「持っているだけ」で終わらせず、使い切るための管理体験を。
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/login"
                className="w-full sm:w-auto px-10 py-5 bg-[var(--semantic-blue)] hover:bg-blue-700 text-white font-bold text-lg rounded-2xl transition-all shadow-xl shadow-blue-100 dark:shadow-none hover:-translate-y-1 active:scale-[0.98]"
              >
                冷蔵庫の中身を登録する
              </Link>
              <Link
                href="/how-it-works"
                className="w-full sm:w-auto px-10 py-5 bg-[var(--surface-bg)] hover:bg-[var(--surface-border)] text-[var(--color-text-primary)] font-bold text-lg rounded-2xl border border-[var(--surface-border)] transition-all flex items-center justify-center gap-2"
              >
                管理のコツを見る
              </Link>
            </div>
          </div>
        </section>

        {/* Highlights Section */}
        <section className="bg-[var(--surface-bg)] py-24 md:py-32">
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center mb-16 space-y-4">
              <h2 className="text-sm font-bold text-[var(--semantic-blue)] uppercase tracking-widest">可視化・管理</h2>
              <p className="text-3xl md:text-5xl font-extrabold text-[var(--color-text-primary)]">在庫管理の4つの強み</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              {[
                { title: "直感的な一覧", icon: "📋", desc: "アイコンと期限表示で、今すぐ使うべき食材がすぐ分かります。" },
                { title: "賞味期限アラート", icon: "⏰", desc: "期限が近い食材を自動で強調。廃棄ゼロを目指せます。" },
                { title: "在庫数カウント", icon: "🔢", desc: "「あと少し」も正確に記録。買いすぎの重複を防ぎます。" },
                { title: "家族で同期", icon: "👨‍👩‍👧‍👦", desc: "誰かが買っても使っても、全員のリストが即座に更新。" },
              ].map((item, i) => (
                <div key={i} className="group p-10 bg-[var(--background)] border border-[var(--surface-border)] rounded-[2.5rem] hover:shadow-2xl hover:shadow-blue-50 dark:hover:shadow-none transition-all duration-300 hover:-translate-y-2">
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
                tag: "透明性",
                title: "「見えない」をなくし、ロスを減らす",
                desc: "冷蔵庫の奥で眠っている食材はありませんか？すべての在庫を可視化することで、使い忘れによる廃棄を劇的に削減します。",
                icon: "🔍",
                side: "left"
              },
              {
                id: "02",
                tag: "最適化",
                title: "期限優先のスマートな調理順",
                desc: "期限が迫っている順に並び替え。何から使うべきか迷う時間をゼロにし、常に新鮮な状態で食材を活用できます。",
                icon: "📉",
                side: "right"
              },
              {
                id: "03",
                tag: "共同管理",
                title: "家族全員が「在庫管理者」に",
                desc: "「卵あったっけ？」の確認はもう不要。スマホを開けば、家族全員が同じ最新の情報を共有できます。",
                icon: "🤝",
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
                <div className="flex-1 relative w-full aspect-square md:aspect-auto md:h-[400px] bg-gradient-to-br from-[var(--surface-bg)] to-[var(--background)] rounded-[3rem] border border-[var(--surface-border)] flex items-center justify-center text-[10rem] shadow-inner group overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-[var(--semantic-blue)] to-[var(--semantic-indigo)] opacity-0 group-hover:opacity-10 transition-opacity duration-700"></div>
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
              <h2 className="text-sm font-bold text-blue-600 dark:text-blue-400 uppercase tracking-widest">ご利用ガイド</h2>
              <p className="text-3xl md:text-5xl font-extrabold text-[var(--color-text-primary)]">4ステップで管理開始</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 relative">
              {[
                { step: 1, title: "食材を入力", desc: "名称、個数、期限をセット。スキャン併用も可能。" },
                { step: 2, title: "一覧で確認", desc: "今の冷蔵庫の中身がカテゴリー別に並びます。" },
                { step: 3, title: "期限順に使う", desc: "アラートを参考に、期限の近いものから調理。" },
                { step: 4, title: "在庫を更新", desc: "使ったらマイナス。常に正確な状態をキープ。" },
              ].map((item, index) => (
                <div key={item.step} className="relative p-10 bg-[var(--background)] rounded-[2.5rem] border border-[var(--surface-border)] group hover:shadow-xl transition-all">
                  <div className="w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-xl mb-8 group-hover:scale-110 group-hover:bg-blue-500 transition-all">
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
          <div className="relative p-12 md:p-24 rounded-[4rem] bg-gradient-to-br from-[var(--semantic-blue)] to-[var(--semantic-indigo)] overflow-hidden text-center text-white shadow-2xl">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl"></div>
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-400 opacity-20 rounded-full translate-y-1/2 -translate-x-1/2 blur-3xl"></div>
            
            <div className="relative z-10 space-y-10 animate-in fade-in zoom-in duration-1000">
              <h2 className="text-4xl md:text-6xl font-black leading-tight">
                「何があったっけ？」を、<br className="md:hidden" />もう言わない。
              </h2>
              <p className="text-xl md:text-2xl text-blue-100 max-w-3xl mx-auto font-medium leading-relaxed">
                My-fridgeaiで冷蔵庫をスマート化しましょう。
                正確な管理が、節約と豊かな食生活の第一歩です。
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-6 pt-6">
                <Link
                  href="/login"
                  className="w-full sm:w-auto px-12 py-6 bg-white text-[var(--semantic-blue)] hover:bg-blue-50 font-black text-xl rounded-2xl transition-all shadow-xl hover:-translate-y-1"
                >
                  在庫管理を始める
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
              { title: "機能一覧", href: "/features", icon: "🛠️", desc: "効率化を支える主要機能" },
              { title: "レシート登録", href: "/features/receipt-scan", icon: "📸", desc: "買い物後の入力を一瞬で" },
              { title: "トップに戻る", href: "/", icon: "🏠", desc: "My-fridgeai ホーム" },
            ].map((link, i) => (
              <Link
                key={i}
                href={link.href}
                className="p-8 bg-[var(--background)] border border-[var(--surface-border)] rounded-3xl flex items-center gap-6 group hover:shadow-xl hover:shadow-blue-50 dark:hover:shadow-none transition-all duration-300"
              >
                <div className="w-14 h-14 bg-[var(--surface-bg)] rounded-2xl flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
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
