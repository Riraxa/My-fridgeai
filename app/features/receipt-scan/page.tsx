import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";

const SITE_URL =
  process.env.NEXT_PUBLIC_BASE_URL ?? "https://www.my-fridgeai.com";

export const metadata: Metadata = {
  title: "レシート自動登録 | My-fridgeai",
  description:
    "AIがレシートの品目を読み取り、食材として自動で保存。入力の手間を減らし、買い物直後の管理をスムーズにします。",
  openGraph: {
    title: "レシート自動登録 | My-fridgeai",
    description: "AIがレシートの品目を読み取り、食材として自動で保存。",
    url: `${SITE_URL}/features/receipt-scan`,
  },
  alternates: {
    canonical: `${SITE_URL}/features/receipt-scan`,
  },
};

export default function ReceiptScanFeaturePage() {
  return (
    <div className="min-h-screen bg-[var(--background)] font-sans selection:bg-[var(--semantic-green-bg)] selection:text-[var(--semantic-green)]">
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
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[var(--semantic-green-bg)] text-[var(--semantic-green)] text-sm font-semibold animate-in fade-in slide-in-from-top-4 duration-700">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--semantic-green)] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--semantic-green)]"></span>
            </span>
            読み取り精度が向上しました
          </span>
        </div>

        {/* Hero Section */}
        <section className="relative overflow-hidden pt-10 pb-24 md:pt-16 md:pb-32">
          {/* Background Decorative Elements */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full -z-10 pointer-events-none opacity-20 dark:opacity-10">
            <div className="absolute top-0 left-1/4 w-96 h-96 bg-[var(--semantic-green)] rounded-full mix-blend-multiply filter blur-3xl animate-blob"></div>
            <div className="absolute top-0 right-1/4 w-96 h-96 bg-emerald-300 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-2000"></div>
            <div className="absolute bottom-0 left-1/3 w-96 h-96 bg-teal-300 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-4000"></div>
          </div>

          <div className="max-w-6xl mx-auto px-6 text-center animate-in fade-in slide-in-from-bottom-8 duration-1000">
            <div className="w-24 h-24 bg-gradient-to-br from-[var(--semantic-green)] to-[var(--semantic-blue)] rounded-[2.5rem] flex items-center justify-center text-5xl mx-auto mb-10 shadow-2xl shadow-[var(--semantic-green-bg)] dark:shadow-none hover:rotate-6 transition-transform duration-300 cursor-default">
              📸
            </div>
            <h1 className="text-5xl md:text-7xl font-extrabold text-[var(--color-text-primary)] mb-8 leading-[1.15] tracking-tight">
              レシートを撮るだけで、<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[var(--semantic-green)] to-[var(--semantic-blue)]">
                食材登録が完了
              </span>
            </h1>
            <p className="text-xl md:text-2xl text-[var(--color-text-secondary)] max-w-3xl mx-auto leading-relaxed mb-12">
              AIがレシートを解析し、品目と価格を自動で保存。<br className="hidden md:block" />
              買い物後の面倒な入力時間を、家族や自分のための豊かな時間へ。
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/login"
                className="w-full sm:w-auto px-10 py-5 bg-[var(--semantic-green)] hover:bg-emerald-700 text-white font-bold text-lg rounded-2xl transition-all shadow-xl shadow-green-100 dark:shadow-none hover:-translate-y-1 active:scale-[0.98]"
              >
                レシートを撮影してみる
              </Link>
              <Link
                href="/how-it-works"
                className="w-full sm:w-auto px-10 py-5 bg-[var(--surface-bg)] hover:bg-[var(--surface-border)] text-[var(--color-text-primary)] font-bold text-lg rounded-2xl border border-[var(--surface-border)] transition-all flex items-center justify-center gap-2"
              >
                スキャンのコツを見る
              </Link>
            </div>
          </div>
        </section>

        {/* Highlights Section */}
        <section className="bg-[var(--surface-bg)] py-24 md:py-32">
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center mb-16 space-y-4">
              <h2 className="text-sm font-bold text-[var(--semantic-green)] uppercase tracking-widest">自動化・効率化</h2>
              <p className="text-3xl md:text-5xl font-extrabold text-[var(--color-text-primary)]">爆速登録を支える機能</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              {[
                { title: "高速OCR解析", icon: "⚡", desc: "最新の文字認識技術により、複雑なレシートも瞬時に読み取ります。" },
                { title: "食材自動マッチング", icon: "🍱", desc: "品名から食材データベースを検索し、最適な分類を自動で行います。" },
                { title: "価格履歴の保存", icon: "💰", desc: "いくらで買ったかも自動記録。家計管理の基盤になります。" },
                { title: "一括登録対応", icon: "📚", desc: "大量の買い物も、一回の撮影でまとめて在庫に反映可能です。" },
              ].map((item, i) => (
                <div key={i} className="group p-10 bg-[var(--background)] border border-[var(--surface-border)] rounded-[2.5rem] hover:shadow-2xl hover:shadow-green-50 dark:hover:shadow-none transition-all duration-300 hover:-translate-y-2">
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
                tag: "時短をご提供",
                title: "帰宅後の10分を、10秒に",
                desc: "買い物から帰ってきて、食材を冷蔵庫に詰めながらスマホをかざすだけ。手入力のストレスから解放され、家事がもっとスムーズになります。",
                icon: "⏱️",
                side: "left"
              },
              {
                id: "02",
                tag: "正確な解析",
                title: "AIが品目を賢く判別",
                desc: "「豚肉」「牛乳」など、レシート上の省略された品名もAIが文脈から判断。正しい食材名で自動的にリスト化されます。",
                icon: "🤖",
                side: "right"
              },
              {
                id: "03",
                tag: "資産としてのデータ",
                title: "買い物履歴が「価値」に変わる",
                desc: "単なる記録ではなく、自分が何をよく買い、何が無駄になりやすいかを可視化。次の買い物や献立に活きるデータが蓄積されます。",
                icon: "📈",
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
                <div className="flex-1 relative w-full aspect-square md:aspect-auto md:h-[400px] bg-gradient-to-br from-[var(--surface-bg)] to-[var(--background)] rounded-[3rem] border border-[var(--surface-border)] flex items-center justify-center text-[10rem] shadow-inner group overflow-hidden">
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
              <h2 className="text-sm font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">ご利用の流れ</h2>
              <p className="text-3xl md:text-5xl font-extrabold text-[var(--color-text-primary)]">4ステップで登録完了</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 relative">
              {[
                { step: 1, title: "撮影する", desc: "レシート全体が写るようにカメラで撮影。" },
                { step: 2, title: "AIが解析", desc: "数秒で品目と価格を自動的に切り出します。" },
                { step: 3, title: "内容を確認", desc: "解析結果をチェック。必要なら修正も可能。" },
                { step: 4, title: "自動保存", desc: "在庫リストと購入履歴に同時に反映されます。" },
              ].map((item, index) => (
                <div key={item.step} className="relative p-10 bg-[var(--background)] border border-[var(--surface-border)] rounded-[2.5rem] group hover:shadow-xl transition-all">
                  <div className="w-12 h-12 bg-emerald-600 text-white rounded-full flex items-center justify-center font-bold text-xl mb-8 group-hover:scale-110 group-hover:bg-emerald-500 transition-all">
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
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-emerald-400 opacity-20 rounded-full translate-y-1/2 -translate-x-1/2 blur-3xl"></div>
            
            <div className="relative z-10 space-y-10 animate-in fade-in zoom-in duration-1000">
              <h2 className="text-4xl md:text-6xl font-black leading-tight">
                買い物の記録を、<br className="md:hidden" />数秒で終わらせる。
              </h2>
              <p className="text-xl md:text-2xl text-emerald-100 max-w-3xl mx-auto font-medium leading-relaxed">
                My-fridgeaiのレシート登録で、手入力をゼロにしましょう。
                ストレスフリーな食材管理が、ここから始まります。
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-6 pt-6">
                <Link
                  href="/login"
                  className="w-full sm:w-auto px-12 py-6 bg-white text-[var(--semantic-green)] hover:bg-emerald-50 font-black text-xl rounded-2xl transition-all shadow-xl hover:-translate-y-1"
                >
                  今すぐレシートを撮る
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
              { title: "機能一覧", href: "/features", icon: "🛠️", desc: "スマートな生活への近道" },
              { title: "在庫管理", href: "/features/inventory", icon: "📋", desc: "登録した食材を賢く使う" },
              { title: "AI献立生成", href: "/features/ai-menu", icon: "�️", desc: "食材から自動で献立作成" },
            ].map((link, i) => (
              <Link
                key={i}
                href={link.href}
                className="p-8 bg-[var(--background)] border border-[var(--surface-border)] rounded-3xl flex items-center gap-6 group hover:shadow-xl hover:shadow-green-50 dark:hover:shadow-none transition-all duration-300"
              >
                <div className="w-14 h-14 bg-[var(--surface-bg)] rounded-2xl flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
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
