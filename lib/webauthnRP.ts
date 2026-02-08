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

  if (process.env.NODE_ENV === "production") {
    console.log("[WebAuthn RP] Configured:", {
      origin: url.origin,
      rpID: url.hostname,
    });
  }

  return {
    origin: url.origin,
    rpID: url.hostname,
  };
}
