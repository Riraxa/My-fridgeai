export function buildVerificationEmail(verificationUrl: string) {
  const subject = "【My-fridgeai】メールアドレスの確認";
  const plain = `
My-fridgeai へのご登録ありがとうございます。
以下のリンクにアクセスして、メールアドレスの確認を完了してください。

${verificationUrl}

※このリンクの有効期限は24時間です。
※お心当たりのない場合は、このメールを破棄してください。
  `.trim();

  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #333;">メールアドレスの確認</h2>
      <p>My-fridgeai へのご登録ありがとうございます。</p>
      <p>以下のボタンをクリックして、ご登録のメールアドレスを確認してください。</p>
      <div style="margin: 30px 0;">
        <a href="${verificationUrl}" style="background-color: #f97316; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
          メールアドレスを確認する
        </a>
      </div>
      <p style="color: #666; font-size: 0.9em;">
        ※このリンクの有効期限は24時間です。<br>
        ※ボタンが機能しない場合は、以下のURLをブラウザにコピー＆ペーストしてください。<br>
        <span style="color: #0066cc; word-break: break-all;">${verificationUrl}</span>
      </p>
      <hr style="border: 1px solid #eee; margin: 30px 0;" />
      <p style="color: #999; font-size: 0.8em; text-align: center;">
        My-fridgeai サポートチーム<br>
        このメールはお心当たりのない場合は破棄してください。
      </p>
    </div>
  `;

  return { subject, plain, html };
}
