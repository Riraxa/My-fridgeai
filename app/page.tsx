//app/page.tsx
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import AuthCheck from "./AuthCheck";

const SITE_URL =
  process.env.NEXT_PUBLIC_BASE_URL ?? "https://www.my-fridgeai.com";

export const metadata: Metadata = {
  title: "AI献立アプリ My-fridgeai | 冷蔵庫の食材から献立を自動生成",
  description:
    "My-fridgeaiは冷蔵庫の食材を管理し、AIが献立を自動生成するスマート食材管理アプリです。レシート読み取りで食材を自動登録し、今ある食材から作れる料理を提案します。食材ロス削減や献立の悩みを解決します。",
  openGraph: {
    title: "AI献立アプリ My-fridgeai | 冷蔵庫の食材から献立を自動生成",
    description:
      "My-fridgeaiは冷蔵庫の食材を管理し、AIが献立を自動生成するスマート食材管理アプリです。レシート読み取りで食材を自動登録し、今ある食材から作れる料理を提案します。",
    url: SITE_URL,
    siteName: "My-fridgeai",
    images: [
      {
        url: `${SITE_URL}/og-images/og-top.png`,
        width: 1200,
        height: 630,
        alt: "My-fridgeai",
      },
    ],
    locale: "ja_JP",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "AI献立アプリ My-fridgeai | 冷蔵庫の食材から献立を自動生成",
    description: "My-fridgeaiは冷蔵庫の食材を管理し、AIが献立を自動生成するスマート食材管理アプリです。",
  },
  alternates: {
    canonical: "https://my-fridgeai.com",
  },
};

export default function Page() {
  return (
    <AuthCheck>
      <div className="min-h-screen bg-[var(--background)] font-sans selection:bg-[var(--selection-bg)] selection:text-[var(--selection-text)]">
        {/* Header */}
        <header className="fixed top-0 left-0 right-0 z-50 bg-[var(--surface-bg)] backdrop-blur-md border-b border-[var(--surface-border)]">
          <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2">
              <div className="theme-light-img">
                <Image
                  src="/my-fridgeai-logo-light.png"
                  alt="My-fridgeai 冷蔵庫食材管理アプリロゴ"
                  width={120}
                  height={40}
                  className="w-32 h-12 md:w-40 md:h-14"
                />
              </div>
              <div className="theme-dark-img">
                <Image
                  src="/my-fridgeai-logo-dark.png"
                  alt="My-fridgeai 冷蔵庫食材管理アプリロゴ"
                  width={120}
                  height={40}
                  className="w-32 h-12 md:w-40 md:h-14"
                />
              </div>
            </Link>
            <nav className="hidden lg:flex items-center gap-5 text-sm font-semibold text-[var(--color-text-secondary)]">
              <Link
                href="/features/inventory"
                className="hover:text-[var(--semantic-indigo)] transition-colors whitespace-nowrap"
              >
                在庫管理
              </Link>
              <Link
                href="/features/ai-menu"
                className="hover:text-[var(--semantic-indigo)] transition-colors whitespace-nowrap"
              >
                AI献立
              </Link>
              <Link
                href="/features/reduce-food-waste"
                className="hover:text-[var(--semantic-indigo)] transition-colors whitespace-nowrap"
              >
                食品ロス削減
              </Link>
              <Link
                href="/features/barcode-scan"
                className="hover:text-[var(--semantic-indigo)] transition-colors whitespace-nowrap"
              >
                バーコード読み取り
              </Link>
              <Link
                href="/features/recipe-from-fridge"
                className="hover:text-[var(--semantic-indigo)] transition-colors whitespace-nowrap"
              >
                冷蔵庫レシピ
              </Link>
              <Link
                href="/features/leftover-ingredients-recipes"
                className="hover:text-[var(--semantic-indigo)] transition-colors whitespace-nowrap"
              >
                余り物活用
              </Link>
              <Link
                href="/login"
                className="px-5 py-2.5 bg-[var(--semantic-indigo)] text-[#ffffff] rounded-full hover:opacity-90 transition-all shadow-md whitespace-nowrap"
              >
                ログイン
              </Link>
            </nav>
            <Link
              href="/login"
              className="md:hidden px-4 py-2 bg-[var(--semantic-indigo)] text-[#ffffff] rounded-full text-sm font-bold"
            >
              ログイン
            </Link>
          </div>
        </header>

        <main className="pt-32 pb-20 max-w-6xl mx-auto px-6 animate-in fade-in slide-in-from-bottom-4 duration-1000">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <section className="space-y-8 text-center md:text-left">
              <div className="space-y-4">
                <div className="inline-block px-4 py-1.5 bg-[var(--semantic-indigo-bg)] text-[var(--semantic-indigo)] text-sm font-bold rounded-full mb-2">
                  AIが創る、ムダのない食卓
                </div>
                <h1 className="text-4xl md:text-6xl font-extrabold leading-[1.1] tracking-tight text-[var(--color-text-primary)]">
                  My-fridgeai
                </h1>
                <h2 className="text-2xl md:text-3xl font-bold text-[var(--color-text-secondary)] leading-relaxed">
                  冷蔵庫の食材からAIが献立を作るアプリ
                </h2>
                <p className="text-lg md:text-xl text-[var(--color-text-secondary)] max-w-lg mx-auto md:mx-0 leading-relaxed">
                  賞味期限が近い食材を優先して、今日作れる献立を3案提示。
                  食材ロスを最小限にし、毎日の家事をスマートに。
                </p>
              </div>

              <div className="flex flex-wrap justify-center md:justify-start gap-4">
                <Link
                  href="/login"
                  className="px-10 py-5 rounded-full bg-[var(--semantic-indigo)] hover:opacity-90 text-[#ffffff] font-extrabold text-lg transition-all shadow-xl hover:-translate-y-0.5"
                >
                  今すぐ無料で始める
                </Link>
                <Link
                  href="/features"
                  className="px-10 py-5 rounded-full border-2 border-[var(--surface-border)] hover:border-[var(--semantic-indigo)] text-[var(--color-text-primary)] font-bold text-lg transition-all"
                >
                  機能を見る
                </Link>
                <Link
                  href="/how-it-works"
                  className="px-10 py-5 rounded-full border-2 border-[var(--surface-border)] hover:border-[var(--semantic-indigo)] text-[var(--color-text-primary)] font-bold text-lg transition-all"
                >
                  使い方を見る
                </Link>
              </div>
            </section>

            <section className="relative aspect-square scale-90 md:scale-100 pointer-events-none">
              <div className="theme-light-img">
                <Image
                  src="/fridge-illustration-light.png"
                  alt="My-fridgeai 冷蔵庫食材管理アプリ画面"
                  fill
                  className="object-contain"
                  priority
                />
              </div>
              <div className="theme-dark-img">
                <Image
                  src="/fridge-illustration-dark.png"
                  alt="My-fridgeai 冷蔵庫食材管理アプリ画面"
                  fill
                  className="object-contain"
                  priority
                />
              </div>
            </section>
          </div>

          {/* LPコンテンツセクション */}
          <section className="mt-32 max-w-4xl mx-auto">
            <div className="prose prose-lg dark:prose-invert max-w-none">
              <h2 className="text-3xl font-bold text-center mb-12 text-[var(--color-text-primary)]">
                毎日の献立を考えるのは意外と大変です
              </h2>

              <div className="space-y-8 text-[var(--color-text-secondary)] leading-relaxed text-lg">
                <p>
                  「今日は何を作ろう？」
                  <br />
                  「冷蔵庫に何が残っているだろう？」
                </p>

                <p>
                  こうした悩みは多くの家庭で毎日のように発生します。
                </p>

                <p>
                  さらに、冷蔵庫の中身を正確に把握できず、同じ食材を買ってしまったり、使い切れずに食材を捨ててしまうことも少なくありません。
                </p>

                <h3 className="text-2xl font-semibold mt-12 mb-6 text-[var(--semantic-indigo)]">
                  My-fridgeaiで解決
                </h3>

                <p>
                  My-fridgeaiは、この問題を解決するために作られた<strong>AI食材管理アプリ</strong>です。
                </p>

                <p>
                  My-fridgeaiでは、冷蔵庫の食材をアプリで管理できます。
                  スーパーのレシートを読み取ったり、<strong>バーコードをスキャン</strong>することで、購入した食材を<strong>自動で登録</strong>することが可能です。
                </p>

                <p>
                  新しく導入された「ハイブリッド推定エンジン」により、バーコードから商品名だけでなく、科学的な知見に基づいた<strong>正確な賞味期限</strong>を瞬時にセットします。
                </p>

                <p>
                  これにより、面倒な手入力を減らし、日常の買い物と食材管理を自然につなげることができます。
                </p>

                <h3 className="text-2xl font-semibold mt-12 mb-6 text-[var(--semantic-indigo)]">
                  AIが献立を提案
                </h3>

                <p>
                  登録された食材をもとに、<strong>AIが今ある食材から作れる料理を提案</strong>します。
                </p>

                <div className="bg-[var(--surface-bg)] p-6 rounded-xl my-8">
                  <p className="font-semibold mb-4">例えば、</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="font-medium text-[var(--semantic-indigo)] mb-2">冷蔵庫にある食材：</p>
                      <ul className="space-y-1">
                        <li>• 卵</li>
                        <li>• 玉ねぎ</li>
                        <li>• 牛肉</li>
                      </ul>
                    </div>
                    <div>
                      <p className="font-medium text-[var(--semantic-green)] mb-2">AIが提案する料理：</p>
                      <ul className="space-y-1">
                        <li>• 牛丼</li>
                        <li>• オムライス</li>
                        <li>• ハンバーグ</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <p>
                  さらに、食材の在庫をもとに献立を考えることで、使い残しを減らし、<strong>食材ロスを減らす</strong>ことができます。
                </p>

                <h3 className="text-2xl font-semibold mt-12 mb-6 text-[var(--semantic-indigo)]">
                  冷蔵庫の中身を「見える化」
                </h3>

                <p>
                  My-fridgeaiは、冷蔵庫の中身を「見える化」し、AIが献立をサポートすることで、毎日の料理をもっと簡単にします。
                </p>

                <p>
                  また、家庭内で冷蔵庫の情報を共有することもできます。
                </p>

                <p>
                  家族が食材を使った場合でも、在庫が更新されるため、誰でも冷蔵庫の状況を確認できます。
                </p>

                <div
                  className="p-8 rounded-xl mt-12 text-center"
                  style={{ backgroundColor: "color-mix(in srgb, var(--accent) 15%, transparent)" }}
                >
                  <h3 className="text-2xl font-bold mb-4 text-[var(--accent)]">
                    My-fridgeaiは、食材管理・献立作成・家庭共有を一つにまとめた<strong>スマートキッチンアプリ</strong>です。
                  </h3>
                </div>
              </div>
            </div>
          </section>
        </main>

        <footer className="bg-[var(--surface-bg)] border-t border-[var(--surface-border)] py-20">
          <div className="max-w-6xl mx-auto px-6 grid grid-cols-1 md:grid-cols-4 gap-12">
            <div className="col-span-1 md:col-span-2 space-y-4">
              <div className="flex items-center gap-2">
                <div className="theme-light-img">
                  <Image
                    src="/my-fridgeai-logo-light.png"
                    alt="My-fridgeai 冷蔵庫食材管理アプリロゴ"
                    width={120}
                    height={40}
                    className="w-40 h-12"
                  />
                </div>
                <div className="theme-dark-img">
                  <Image
                    src="/my-fridgeai-logo-dark.png"
                    alt="My-fridgeai 冷蔵庫食材管理アプリロゴ"
                    width={120}
                    height={40}
                    className="w-40 h-12"
                  />
                </div>
              </div>
              <p className="text-[var(--color-text-muted)] max-w-sm">
                冷蔵庫の食材を管理し、AIが最適な献立を提案。
                「もったいない」をテクノロジーで解決します。
              </p>
            </div>
            <div className="space-y-4">
              <h4 className="font-bold text-[var(--color-text-primary)]">メイン機能</h4>
              <ul className="space-y-2 text-sm text-[var(--color-text-muted)]">
                <li>
                  <Link
                    href="/features/ai-menu"
                    className="hover:text-[var(--semantic-indigo)] transition-colors"
                  >
                    AI献立生成
                  </Link>
                </li>
                <li>
                  <Link
                    href="/features/inventory"
                    className="hover:text-[var(--semantic-indigo)] transition-colors"
                  >
                    冷蔵庫食材管理
                  </Link>
                </li>
                <li>
                  <Link
                    href="/features/receipt-scan"
                    className="hover:text-[var(--semantic-indigo)] transition-colors"
                  >
                    レシート自動登録
                  </Link>
                </li>
                <li>
                  <Link
                    href="/features/ingredients-recipes"
                    className="hover:text-[var(--semantic-indigo)] transition-colors"
                  >
                    食材からレシピ検索
                  </Link>
                </li>
                <li>
                  <Link
                    href="/features/reduce-food-waste"
                    className="hover:text-[var(--semantic-indigo)] transition-colors"
                  >
                    食材ロス削減
                  </Link>
                </li>
              </ul>
            </div>
            <div className="space-y-4">
              <h4 className="font-bold text-[var(--color-text-primary)]">サポート</h4>
              <ul className="space-y-2 text-sm text-[var(--color-text-muted)]">
                <li>
                  <Link
                    href="/terms"
                    className="hover:text-[var(--semantic-indigo)] transition-colors"
                  >
                    利用規約
                  </Link>
                </li>
                <li>
                  <Link
                    href="/privacy"
                    className="hover:text-[var(--semantic-indigo)] transition-colors"
                  >
                    プライバシーポリシー
                  </Link>
                </li>
                <li>
                  <Link
                    href="/tokusho"
                    className="hover:text-[var(--semantic-indigo)] transition-colors"
                  >
                    特定商取引法に基づく表記
                  </Link>
                </li>
              </ul>
            </div>
          </div>
          <div className="max-w-6xl mx-auto px-6 mt-20 pt-8 border-t border-[var(--surface-border)] text-center text-sm text-[var(--color-text-muted)]">
            © {new Date().getFullYear()} My-fridgeai. All rights reserved.
          </div>
        </footer>
      </div>
    </AuthCheck>
  );
}
