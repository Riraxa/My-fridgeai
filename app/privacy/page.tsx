"use client";

import Link from "next/link";

export default function PrivacyPage() {
  return (
    <main className="max-w-3xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">プライバシーポリシー</h1>

      <p className="mb-4 legal-text">
        運営者は、本サービス「My-fridgeai」における個人情報の取扱いについて、以下のとおりプライバシーポリシーを定めます。ユーザーの皆様の個人情報を適切に取り扱い、保護することを運営者の重要な責務と認識しています。
      </p>

      <h2 className="text-xl font-semibold mt-6 mb-2">
        第1条（個人情報の定義）
      </h2>
      <p className="mb-4 legal-text">
        本ポリシーにおいて「個人情報」とは、生存する個人に関する情報であって、氏名、生年月日、メールアドレス、その他の記述等により特定の個人を識別できるものをいいます。
      </p>

      <h2 className="text-xl font-semibold mt-6 mb-2">
        第2条（収集する個人情報）
      </h2>
      <p className="mb-4 legal-text">
        運営者は、本サービスの利用にあたり、以下の個人情報を収集することがあります。
      </p>
      <ul className="mb-4 legal-text list-disc pl-6">
        <li>【登録情報】メールアドレス、パスワード（ハッシュ化済み）、氏名</li>
        <li>
          【サービス利用情報】食材情報（名称、数量、賞味期限、バーコード）、料理履歴、献立生成履歴
        </li>
        <li>
          【設定情報】アレルギー情報、食事制限、料理スキル、キッチン設備、通知設定
        </li>
        <li>
          【決済情報】クレジットカード情報（Stripe経由で安全に処理）、請求先情報
        </li>
        <li>
          【アクセス情報】IPアドレス、ブラウザ情報、アクセスログ、Cookie情報
        </li>
        <li>【認証情報】セッション情報、認証トークン、デバイス情報</li>
      </ul>

      <h2 className="text-xl font-semibold mt-6 mb-2">第3条（利用目的）</h2>
      <p className="mb-4 legal-text">
        運営者は、収集した個人情報を以下の目的のために利用します。
      </p>
      <ul className="mb-4 legal-text list-disc pl-6">
        <li>
          【サービス提供】AI献立提案、在庫管理、賞味期限通知等の本サービス機能の提供
        </li>
        <li>【ユーザー管理】アカウント認証、本人確認、セキュリティ維持</li>
        <li>
          【パーソナライズ】ユーザー設定に基づく献立提案の最適化、通知機能の提供
        </li>
        <li>【決済処理】有料プランの料金請求、決済処理、請求書発行</li>
        <li>【サービス改善】利用状況分析、機能改善、新機能開発</li>
        <li>
          【サポート対応】ユーザーからの問い合わせ対応、トラブルシューティング
        </li>
        <li>【法務対応】法令遵守、紛争解決、行政機関への対応</li>
      </ul>

      <h2 className="text-xl font-semibold mt-6 mb-2">第4条（第三者提供）</h2>
      <p className="mb-4 legal-text">
        運営者は、以下の場合を除き、ユーザーの同意なく第三者に個人情報を提供することはありません。
      </p>
      <ul className="mb-4 legal-text list-disc pl-6">
        <li>【法令に基づく場合】法令の定めに従い開示を求められた場合</li>
        <li>【人の生命保護】人の生命、身体または財産の保護に必要な場合</li>
        <li>【公衆衛生】公衆衛生の向上または児童の健全育成に必要な場合</li>
        <li>
          【業務委託】サービス提供に必要な業務を委託先（Stripe、OpenAI等）に委託する場合
        </li>
      </ul>
      <p className="mb-4 legal-text">
        業務委託先との間では、機密保持契約を締結し、適切な安全管理措置を講じます。
      </p>

      <h2 className="text-xl font-semibold mt-6 mb-2">
        第5条（データの安全確保）
      </h2>
      <p className="mb-4 legal-text">
        運営者は、個人情報の正確性と安全性を確保するため、以下の措置を講じます。
      </p>
      <ul className="mb-4 legal-text list-disc pl-6">
        <li>
          【技術的対策】SSL/TLSによる通信暗号化、データの暗号化保存、アクセス制御
        </li>
        <li>
          【組織的対策】従業者の監督教育、秘密保持義務の課し、アクセス権限の管理
        </li>
        <li>【物理的対策】サーバーの物理的セキュリティ、入退室管理</li>
        <li>【監査】定期的なセキュリティ監査、脆弱性診断の実施</li>
      </ul>

      <h2 className="text-xl font-semibold mt-6 mb-2">
        第6条（Cookieとアクセス解析）
      </h2>
      <p className="mb-4 legal-text">
        本サービスでは、以下の目的でCookieを使用することがあります。
      </p>
      <ul className="mb-4 legal-text list-disc pl-6">
        <li>【セッション管理】ログイン状態の維持、セキュリティ強化</li>
        <li>【ユーザー体験】表示設定の記憶、利便性の向上</li>
        <li>【アクセス解析】Google Analytics等による利用状況の分析</li>
      </ul>
      <p className="mb-4 legal-text">
        ユーザーはブラウザの設定によりCookieを無効にすることができますが、一部機能が制限される場合があります。
      </p>

      <h2 className="text-xl font-semibold mt-6 mb-2">
        第7条（外部サービス連携）
      </h2>
      <p className="mb-4 legal-text">
        本サービスでは、以下の外部サービスと連携することがあります。
      </p>
      <ul className="mb-4 legal-text list-disc pl-6">
        <li>
          【Stripe】決済処理。カード情報は直接Stripeに送信され、運営者のサーバーを経由しません
        </li>
        <li>【OpenAI】AI献立生成。食材情報等が匿名化されて送信されます</li>
        <li>【Google】アクセス解析、認証機能</li>
        <li>【Resend】メール通知機能</li>
      </ul>
      <p className="mb-4 legal-text">
        各サービスの個人情報取扱いについては、それぞれのプライバシーポリシーをご確認ください。
      </p>

      <h2 className="text-xl font-semibold mt-6 mb-2">
        第8条（データ保持期間）
      </h2>
      <p className="mb-4 legal-text">個人情報の保持期間は以下のとおりです。</p>
      <ul className="mb-4 legal-text list-disc pl-6">
        <li>【利用中】サービス利用期間中は継続して保持します</li>
        <li>
          【退会後】アカウント削除後30日間は保持し、その後完全に削除します
        </li>
        <li>【法定期間】法令で定められた期間は保持します</li>
        <li>【特定期間】業務目的に必要な期間のみ保持します</li>
      </ul>

      <h2 className="text-xl font-semibold mt-6 mb-2">
        第9条（ユーザーの権利）
      </h2>
      <p className="mb-4 legal-text">
        ユーザーは、ご自身の個人情報について以下の権利を有します。
      </p>
      <ul className="mb-4 legal-text list-disc pl-6">
        <li>【開示請求権】ご自身の個人情報の開示を請求する権利</li>
        <li>【訂正請求権】誤った情報の訂正を請求する権利</li>
        <li>【削除請求権】不要な情報の削除を請求する権利</li>
        <li>【利用停止請求権】情報の利用停止を請求する権利</li>
      </ul>
      <p className="mb-4 legal-text">
        これらの請求については、本ポリシー末尾の連絡先よりご連絡ください。
      </p>

      <h2 className="text-xl font-semibold mt-6 mb-2">
        第10条（プライバシーポリシーの変更）
      </h2>
      <p className="mb-4 legal-text">
        運営者は、必要に応じて本ポリシーを変更することがあります。変更後のポリシーは、本サービス上に公示した時点から効力を生じます。重要な変更がある場合は、ユーザーに通知いたします。
      </p>

      <h2 className="text-xl font-semibold mt-6 mb-2">
        第11条（お問い合わせ）
      </h2>
      <p className="mb-4 legal-text">
        個人情報の取扱いに関するお問い合わせは、以下の連絡先までご連絡ください。
      </p>
      <ul className="mb-4 legal-text list-disc pl-6">
        <li>【メール】アプリ内の「お問い合わせ」フォームよりご連絡ください</li>
        <li>【担当部署】プライバシー問題担当部署</li>
        <li>【対応期間】原則として30日以内に回答いたします</li>
      </ul>

      <h2 className="text-xl font-semibold mt-6 mb-2">第12条（準拠法）</h2>
      <p className="mb-4 legal-text">
        本ポリシーの解釈および適用については、日本法を準拠法とします。
      </p>

      <p
        className="text-right text-sm mt-8"
        style={{ color: "var(--color-text-muted)" }}
      >
        改定日：2026年2月2日
      </p>

      <div className="mt-8">
        <Link
          href="/"
          className="underline text-blue-600 hover:text-blue-800 dark:text-blue-400 hover:dark:text-blue-300"
        >
          ← トップに戻る
        </Link>
      </div>
    </main>
  );
}
