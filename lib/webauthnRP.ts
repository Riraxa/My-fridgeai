// lib/webauthnRP.ts
export function getWebAuthnRP() {
  const base =
    process.env.NEXT_PUBLIC_BASE_URL ??
    process.env.VERCEL_URL ??
    "http://localhost:3000";

  const url = base.startsWith("http")
    ? new URL(base)
    : new URL(`https://${base}`);

  // デバッグ用に環境情報をログ出力（本番環境では不要なら削除）
  if (process.env.NODE_ENV === "development") {
    console.log("[WebAuthn RP] Base URL:", base);
    console.log("[WebAuthn RP] Final origin:", url.origin);
    console.log("[WebAuthn RP] Final rpID:", url.hostname);
  }

  return {
    origin: url.origin,
    rpID: url.hostname,
  };
}
