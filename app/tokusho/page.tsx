"use client";

import Link from "next/link";

export default function TokushoPage() {
    return (
        <main className="max-w-3xl mx-auto p-6 text-gray-900 dark:text-gray-100">
            <h1 className="text-3xl font-bold mb-6">特定商取引法に基づく表記</h1>

            <div className="space-y-8">
                <section>
                    <h2 className="text-xl font-bold mb-3 border-b pb-2">販売業者の名称</h2>
                    <p className="legal-text">
                        My-fridgeai
                    </p>
                </section>

                <section>
                    <h2 className="text-xl font-bold mb-3 border-b pb-2">代表者または運営統括責任者名</h2>
                    <p className="legal-text">
                        築地 奏空
                    </p>
                </section>

                <section>
                    <h2 className="text-xl font-bold mb-3 border-b pb-2">所在地</h2>
                    <p className="legal-text">
                        請求があり次第提供致しますので、必要な方はお問い合わせフォームよりご連絡ください。
                    </p>
                </section>

                <section>
                    <h2 className="text-xl font-bold mb-3 border-b pb-2">電話番号</h2>
                    <p className="legal-text">
                        請求があり次第提供致しますので、必要な方はお問い合わせフォームよりご連絡ください。
                    </p>
                </section>

                <section>
                    <h2 className="text-xl font-bold mb-3 border-b pb-2">メールアドレス</h2>
                    <p className="legal-text">
                        support@my-fridgeai.com
                    </p>
                </section>

                <section>
                    <h2 className="text-xl font-bold mb-3 border-b pb-2">販売価格</h2>
                    <p className="legal-text">
                        詳細ページまたは購入手続き画面に表示されます。
                    </p>
                </section>

                <section>
                    <h2 className="text-xl font-bold mb-3 border-b pb-2">商品代金以外の必要料金</h2>
                    <p className="legal-text">
                        サイトの閲覧、コンテンツのダウンロード、お問い合わせ等の際の電子メールの送受信時などに、所定の通信料が発生いたします。
                    </p>
                </section>

                <section>
                    <h2 className="text-xl font-bold mb-3 border-b pb-2">お支払い方法</h2>
                    <ul className="legal-text list-disc pl-6">
                        <li>クレジットカード決済</li>
                    </ul>
                </section>

                <section>
                    <h2 className="text-xl font-bold mb-3 border-b pb-2">代金の支払時期</h2>
                    <p className="legal-text">
                        ご利用のカード会社ごとに異なります。
                    </p>
                </section>

                <section>
                    <h2 className="text-xl font-bold mb-3 border-b pb-2">商品引渡し時期</h2>
                    <p className="legal-text">
                        決済完了後、直ちにご利用いただけます。
                    </p>
                </section>

                <section>
                    <h2 className="text-xl font-bold mb-3 border-b pb-2">返品・キャンセルについて</h2>
                    <div className="legal-text space-y-2">
                        <p>
                            <strong>返品について</strong><br />
                            デジタルコンテンツという性質上、返品等の対応は致しかねます。
                        </p>
                        <p>
                            <strong>中途解約について</strong><br />
                            サービス内の設定画面より、いつでも次回の更新を停止（解約）することができます。<br />
                            更新停止後も、支払い済みの期間終了まではサービスをご利用いただけます。<br />
                            日割り計算による返金は行っておりません。
                        </p>
                    </div>
                </section>

                <section>
                    <h2 className="text-xl font-bold mb-3 border-b pb-2">動作環境</h2>
                    <p className="legal-text">
                        推奨ブラウザ：Google Chrome 最新版, Safari 最新版, Microsoft Edge 最新版
                    </p>
                </section>
            </div>

            <div className="mt-8">
                <Link
                    href="/settings/account"
                    className="underline text-blue-600 hover:text-blue-800 dark:text-blue-400 hover:dark:text-blue-300"
                >
                    ← 設定に戻る
                </Link>
            </div>
        </main>
    );
}
