// lib/mail/passkeyTemplates.ts
// パスキー登録用の控えめメールテンプレート

export function buildPasskeyVerificationEmail(verifyUrl: string) {
  const subject = "【My-fridgeai】新しい端末でのパスキー登録確認";
  
  const plain = [
    "My-fridgeai をご利用いただきありがとうございます。",
    "",
    "新しい端末から、あなたのアカウントにパスキーを追加登録しようとしています。",
    "以下のリンクをクリックして、パスキーの登録を完了してください。",
    verifyUrl,
    "",
    "※このリンクの有効期限は15分です。",
    "※この操作に心当たりがない場合は、本メールを破棄してください。",
    "",
    "— My-fridgeai",
  ].join("\n");

  const html = `
  <div style="font-family:Inter, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial; color:#111; line-height:1.5;">
    <div style="max-width:680px;margin:0 auto;padding:24px;">
      <header style="display:flex;align-items:center;gap:12px;margin-bottom:18px;">
        <img src="https://my-fridgeai.com/icon.png" alt="My-fridgeai" style="width:48px;height:48px;border-radius:8px;" />
        <div>
          <h1 style="margin:0;font-size:18px;">My-fridgeai</h1>
          <div style="color:#666;font-size:13px;">新しい端末でのパスキー登録確認</div>
        </div>
      </header>

      <p>My-fridgeai をご利用いただきありがとうございます。新しい端末から、あなたのアカウントにパスキーを追加登録しようとしています。</p>

      <p style="text-align:center;margin:28px 0;">
        <a href="${verifyUrl}" style="background:#111;color:#fff;padding:12px 20px;border-radius:10px;text-decoration:none;display:inline-block;">
          パスキー登録を続行する
        </a>
      </p>

      <p style="color:#666;font-size:13px;">リンクをクリックできない場合は、以下のURLをコピーしてブラウザに貼り付けてください。</p>
      <p style="word-break:break-all;color:#0b5fff">${verifyUrl}</p>

      <hr style="border:none;border-top:1px solid #eee;margin:20px 0;" />
      <p style="color:#888;font-size:12px;">※このリンクの有効期限は15分です。</p>
      <p style="color:#888;font-size:12px;">※この操作に心当たりがない場合は、本メールを破棄してください。</p>
      <p style="color:#888;font-size:12px;">このメールには返信できません。ご不明点はサポートまでご連絡ください。</p>
    </div>
  </div>
  `;

  return { subject, plain, html };
}

export function buildPasskeyCompletionEmail(deviceInfo: string, formattedDate: string, ipAddress: string) {
  const subject = "【My-fridgeai】新しい端末が登録されました";
  
  const plain = [
    "新しい端末が登録されました。",
    "",
    "あなたのアカウントに新しい端末が登録されました。",
    "",
    `日時: ${formattedDate}`,
    `端末: ${deviceInfo}`,
    `IPアドレス: ${ipAddress}`,
    "",
    "この操作に心当たりがない場合は、すぐにサポートまでご連絡ください。",
    "",
    "— My-fridgeai",
  ].join("\n");

  const html = `
  <div style="font-family:Inter, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial; color:#111; line-height:1.5;">
    <div style="max-width:680px;margin:0 auto;padding:24px;">
      <header style="display:flex;align-items:center;gap:12px;margin-bottom:18px;">
        <img src="https://my-fridgeai.com/icon.png" alt="My-fridgeai" style="width:48px;height:48px;border-radius:8px;" />
        <div>
          <h1 style="margin:0;font-size:18px;">My-fridgeai</h1>
          <div style="color:#666;font-size:13px;">新しい端末が登録されました</div>
        </div>
      </header>

      <h2 style="color:#333; margin-top:0;">新しい端末が登録されました</h2>
      <p>あなたのアカウントに新しい端末が登録されました。</p>
      
      <div style="background:#f9f9f9;padding:20px;border-radius:8px;border:1px solid #eee;margin:20px 0;">
        <p style="margin:0 0 8px 0;"><strong>日時:</strong> ${formattedDate}</p>
        <p style="margin:0 0 8px 0;"><strong>端末:</strong> ${deviceInfo}</p>
        <p style="margin:0;"><strong>IPアドレス:</strong> ${ipAddress}</p>
      </div>
      
      <p style="color:#e74c3c;font-weight:bold;margin-top:24px;">この操作に心当たりがない場合は、すぐにサポートまでご連絡ください。</p>

      <hr style="border:none;border-top:1px solid #eee;margin:20px 0;" />
      <p style="color:#888;font-size:12px;">このメールには返信できません。ご不明点はサポートまでご連絡ください。</p>
    </div>
  </div>
  `;

  return { subject, plain, html };
}
