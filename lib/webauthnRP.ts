// lib/webauthnRP.ts
export function getWebAuthnRP() {
  const base =
    process.env.NEXT_PUBLIC_BASE_URL ??
    process.env.VERCEL_URL ??
    "http://localhost:3000";

  // 本番環境では必ずHTTPSを使用
  const url = base.startsWith("http")
    ? new URL(base)
    : new URL(`https://${base}`);

  // 本番環境でのorigin検証を強化
  if (process.env.NODE_ENV === "production") {
    // 本番環境ではoriginがHTTPSであることを確認
    if (!url.protocol.startsWith("https")) {
      console.error(
        "[WebAuthn RP] ERROR: Production environment requires HTTPS",
      );
      // 強制的にHTTPSに設定
      url.protocol = "https";
    }
  }

  // 本番環境でも重要なデバッグ情報を出力
  console.log("[WebAuthn RP] Environment:", {
    NODE_ENV: process.env.NODE_ENV,
    BASE_URL: process.env.NEXT_PUBLIC_BASE_URL,
    VERCEL_URL: process.env.VERCEL_URL,
    finalBase: base,
    finalOrigin: url.origin,
    finalRpID: url.hostname,
    protocol: url.protocol,
  });

  return {
    origin: url.origin,
    rpID: url.hostname,
  };
}
