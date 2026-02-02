"use client";

import Link from "next/link";

export default function TermsPage() {
  return (
    <main className="max-w-3xl mx-auto p-6 text-gray-800 dark:text-gray-100">
      <h1 className="text-3xl font-bold mb-6">利用規約</h1>
      <p className="mb-4 legal-text">
        この利用規約（以下「本規約」）は、運営者が提供する「My-fridgeai」（以下「本サービス」）の利用条件を定めるものです。ユーザーの皆様には、本規約に同意いただいた上で、本サービスをご利用いただきます。
      </p>

      <h2 className="text-xl font-semibold mt-6 mb-2">第1条（定義）</h2>
      <p className="mb-4 legal-text">
        本規約において使用する用語は、次の各号に定める意味を有するものとします。
      </p>
      <ul className="mb-4 legal-text list-disc pl-6">
        <li>「運営者」とは、本サービスの開発・運営者を指します</li>
        <li>「ユーザー」とは、本サービスを利用するすべての個人を指します</li>
        <li>
          「本サービス」とは、運営者が提供するAI献立提案アプリ「My-fridgeai」を指します
        </li>
        <li>
          「コンテンツ」とは、本サービスを通じて提供される情報、データ、プログラム等すべてを指します
        </li>
      </ul>

      <h2 className="text-xl font-semibold mt-6 mb-2">第2条（適用）</h2>
      <p className="mb-4 legal-text">
        本規約は、ユーザーと運営者との間の本サービスの利用に関わる一切の関係に適用されるものとします。ユーザーが本サービスを利用することにより、本規約の全ての記載内容について同意したものとみなします。
      </p>

      <h2 className="text-xl font-semibold mt-6 mb-2">第3条（利用登録）</h2>
      <p className="mb-4 legal-text">
        本サービスの利用を希望する方は、本規約に同意の上、運営者が定める方法により利用登録を行うものとします。運営者は、登録申請者に以下の事由があると判断した場合、登録を拒否することがあります。
      </p>
      <ul className="mb-4 legal-text list-disc pl-6">
        <li>虚偽の事項を申請した場合</li>
        <li>過去に本規約に違反した者である場合</li>
        <li>その他、運営者が登録を不適当と判断した場合</li>
      </ul>

      <h2 className="text-xl font-semibold mt-6 mb-2">
        第4条（ユーザーの責任）
      </h2>
      <p className="mb-4 legal-text">
        ユーザーは、自己の責任において本サービスを利用するものとします。ユーザーは、以下の事項を遵守しなければなりません。
      </p>
      <ul className="mb-4 legal-text list-disc pl-6">
        <li>本人確認情報を最新かつ正確な状態に保つこと</li>
        <li>パスワードを第三者に開示しないこと</li>
        <li>アカウントの管理を適切に行うこと</li>
        <li>本サービスの利用に関わる一切の行為について責任を負うこと</li>
      </ul>

      <h2 className="text-xl font-semibold mt-6 mb-2">第5条（禁止事項）</h2>
      <p className="mb-4 legal-text">
        ユーザーは、本サービスの利用にあたり、以下の行為を行ってはならないものとします。
      </p>
      <ul className="mb-4 legal-text list-disc pl-6">
        <li>法令または公序良俗に違反する行為</li>
        <li>犯罪行為に関連する行為</li>
        <li>運営者、他のユーザー、または第三者の知的財産権を侵害する行為</li>
        <li>本サービスのサーバーに負荷をかける行為</li>
        <li>本サービスの機能を不正に利用する行為</li>
        <li>虚偽の情報を登録・提供する行為</li>
        <li>その他、運営者が不適当と判断する行為</li>
      </ul>

      <h2 className="text-xl font-semibold mt-6 mb-2">第6条（知的財産権）</h2>
      <p className="mb-4 legal-text">
        本サービスに関連するすべてのコンテンツの知的財産権は、運営者または正当な権利者に帰属します。ユーザーは、運営者の事前の書面による許諾なく、本サービスのコンテンツを複製、転用、販売等の目的で利用することはできません。
      </p>

      <h2 className="text-xl font-semibold mt-6 mb-2">
        第7条（サービスの変更・停止）
      </h2>
      <p className="mb-4 legal-text">
        運営者は、以下のいずれかの事由があると判断した場合、ユーザーに事前に通知することなく本サービスの全部または一部の提供を停止、変更、または終了することができるものとします。
      </p>
      <ul className="mb-4 legal-text list-disc pl-6">
        <li>本サービスの保守・点検を行う場合</li>
        <li>
          コンピュータシステムの障害等により本サービスの提供が困難になった場合
        </li>
        <li>
          天災地変、戦争、暴動等不可抗力により本サービスの提供が困難になった場合
        </li>
        <li>その他、運営者が本サービスの停止等を必要と判断した場合</li>
      </ul>

      <h2 className="text-xl font-semibold mt-6 mb-2">第8条（保証の否認）</h2>
      <p className="mb-4 legal-text">
        運営者は、本サービスに事実上または法律上の瑕疵（安全性、信頼性、正確性、完全性、有効性、特定の目的への適合性、セキュリティ等に関する欠陥）がないことを明示的にも黙示的にも保証しておりません。運営者は、ユーザーが本サービスを利用したことにより生じたいかなる損害についても、一切の責任を負わないものとします。
      </p>

      <h2 className="text-xl font-semibold mt-6 mb-2">第9条（免責事項）</h2>
      <p className="mb-4 legal-text">
        運営者は、以下の場合に生じた損害について、一切の責任を負わないものとします。
      </p>
      <ul className="mb-4 legal-text list-disc pl-6">
        <li>本サービスの利用によりユーザーに生じた直接・間接の損害</li>
        <li>本サービスの提供が中断・停止等により生じた損害</li>
        <li>ユーザーの登録情報の漏洩、消失等により生じた損害</li>
        <li>第三者による不正アクセス等により生じた損害</li>
        <li>ユーザー間の紛争により生じた損害</li>
      </ul>

      <h2 className="text-xl font-semibold mt-6 mb-2">
        第10条（有料サービス）
      </h2>
      <p className="mb-4 legal-text">
        本サービスには無料プランと有料プラン（Proプラン）が存在します。有料プランの利用にあたっては、別途定める利用規約および料金プランが適用されます。支払い済みの料金は、原則として返金されません。
      </p>

      <h2 className="text-xl font-semibold mt-6 mb-2">第11条（規約の変更）</h2>
      <p className="mb-4 legal-text">
        運営者は、必要と判断した場合には、本規約を変更することができるものとします。変更後の規約は、本サービス上に公示した時点から効力を生じるものとします。ユーザーが変更後の規約に同意しない場合は、本サービスの利用を中止し、アカウントを削除することができます。
      </p>

      <h2 className="text-xl font-semibold mt-6 mb-2">第12条（契約の終了）</h2>
      <p className="mb-4 legal-text">
        運営者は、ユーザーが以下のいずれかに該当する場合、事前に通知することなく本サービスの利用を停止し、または登録を抹消することができるものとします。
      </p>
      <ul className="mb-4 legal-text list-disc pl-6">
        <li>本規約に違反した場合</li>
        <li>登録事項に虚偽の事実が発見された場合</li>
        <li>運営者からの連絡に対し一定期間応答がない場合</li>
        <li>その他、運営者が利用を不適当と判断した場合</li>
      </ul>

      <h2 className="text-xl font-semibold mt-6 mb-2">
        第13条（準拠法・裁判管轄）
      </h2>
      <p className="mb-4 legal-text">
        本規約の解釈にあたっては、日本法を準拠法とします。本サービスに関して紛争が生じた場合には、運営者の本店所在地を管轄する裁判所を専属的合意管轄とします。
      </p>

      <p className="text-right text-sm text-gray-600 dark:text-gray-400 mt-8">
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
