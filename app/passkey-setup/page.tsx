// app/passkey-setup/page.tsx
"use client";

import React, { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { fadeInUp, buttonTap, springTransition } from "@/app/components/motion";

/**
 * Passkey Setup (client)
 *
 * - Only reachable after clicking magic link (NextAuth sign-in callback redirect -> sets session)
 * - Server endpoints:
 *   POST /api/auth/webauthn/register-options  { email } -> { ok:true, options }
 *   POST /api/auth/webauthn/register  { email, attestationResponse } -> { ok:true }
 *   POST /api/auth/complete-passkey-setup  { } -> mark passkeySetupCompleted
 *   POST /api/auth/skip-passkey-setup -> mark passkeySetupCompleted
 *
 * If your server endpoint names differ, adapt the fetch URLs accordingly.
 */

/* --- utils: base64url <-> Uint8Array --- */
function base64urlToUint8Array(base64url: string) {
  const base64 = base64url.replace(/-/g, "+").replace(/_/g, "/");
  const pad = base64.length % 4;
  const padded = base64 + (pad ? "=".repeat(4 - pad) : "");
  const binary = atob(padded);
  const len = binary.length;
  const out = new Uint8Array(len);
  for (let i = 0; i < len; i++) out[i] = binary.charCodeAt(i);
  return out;
}

function uint8ArrayToBase64url(buf: ArrayBuffer | Uint8Array) {
  const u8 = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let s = "";
  for (let i = 0; i < u8.length; i++) s += String.fromCharCode(u8[i]);
  const b64 = btoa(s);
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/* prepare the publicKey object for navigator */
function preformatCreateOptions(opts: any) {
  // server might return { publicKey: {...} } or publicKey directly
  const publicKey = opts.publicKey ? { ...opts.publicKey } : { ...opts };

  if (!publicKey.challenge) throw new Error("server returned no challenge");

  // challenge may be base64url string or array
  if (typeof publicKey.challenge === "string") {
    publicKey.challenge = base64urlToUint8Array(publicKey.challenge);
  } else if (Array.isArray(publicKey.challenge)) {
    publicKey.challenge = new Uint8Array(publicKey.challenge);
  }

  if (publicKey.user && publicKey.user.id) {
    if (typeof publicKey.user.id === "string") {
      publicKey.user.id = base64urlToUint8Array(publicKey.user.id);
    } else if (Array.isArray(publicKey.user.id)) {
      publicKey.user.id = new Uint8Array(publicKey.user.id);
    }
  }

  if (Array.isArray(publicKey.excludeCredentials)) {
    publicKey.excludeCredentials = publicKey.excludeCredentials.map(
      (c: any) => {
        const out = { ...c };
        if (typeof out.id === "string") out.id = base64urlToUint8Array(out.id);
        else if (Array.isArray(out.id)) out.id = new Uint8Array(out.id);
        return out;
      },
    );
  }

  return publicKey;
}

/* serialize attestation for server */
function serializeAttestation(credential: any) {
  return {
    id: credential.id,
    rawId: uint8ArrayToBase64url(credential.rawId),
    type: credential.type,
    response: {
      attestationObject: uint8ArrayToBase64url(
        credential.response.attestationObject,
      ),
      clientDataJSON: uint8ArrayToBase64url(credential.response.clientDataJSON),
    },
  };
}

export default function PasskeySetupPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [passkeyRegistering, setPasskeyRegistering] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "error"; text: string } | null>(
    null,
  );

  // guard: must be authenticated (this page is only reachable after clicking magic link)
  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/login");
    }
  }, [status, router]);

  const email = session?.user?.email ?? "";

  async function getRegistrationOptions() {
    const res = await fetch("/api/auth/webauthn/register-options", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const j = await res.json().catch(() => ({}));
    if (!res.ok || !j?.ok)
      throw new Error(j?.message || "Failed to get registration options");
    return j.options;
  }

  async function sendAttestationToServer(attObj: any) {
    const res = await fetch("/api/auth/webauthn/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, attestationResponse: attObj }),
    });
    const j = await res.json().catch(() => ({}));
    if (!res.ok || !j?.ok)
      throw new Error(j?.message || "Failed to register passkey");
    return j;
  }

  async function markCompleteOnServer() {
    // mark passkeySetupCompleted = true
    await fetch("/api/auth/complete-passkey-setup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
  }

  async function markSkipOnServer() {
    await fetch("/api/auth/skip-passkey-setup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
  }

  const handleRegister = async () => {
    setMsg(null);
    setPasskeyRegistering(true);
    try {
      const opts = await getRegistrationOptions();
      console.log("webauthn: server options:", opts);

      const publicKey = preformatCreateOptions(opts);

      const cred: any = (await navigator.credentials.create({
        publicKey,
      } as any)) as any;
      if (!cred) {
        // ユーザーがキャンセルした場合、エラーを投げずに静かに終了
        setPasskeyRegistering(false);
        return;
      }

      const serialized = serializeAttestation(cred);
      console.log("webauthn: attestation serialized", serialized);

      // send to server
      await sendAttestationToServer(serialized);

      // mark completed (server should also have created passkey)
      await markCompleteOnServer();

      setMsg({ type: "ok", text: "パスキーを登録しました。" });
      // navigate home
      router.replace("/home");
    } catch (err: any) {
      console.error("passkey register error:", err);

      // ユーザーがキャンセルした場合はエラーメッセージを表示しない
      if (
        err?.name === "NotAllowedError" ||
        err?.message?.includes("cancelled")
      ) {
        // 静かにキャンセル処理を終了
        return;
      }

      // その他のエラーのみ表示
      const friendly =
        err?.message && typeof err.message === "string"
          ? err.message
          : "パスキー登録中にエラーが発生しました。ブラウザやデバイスの設定をご確認ください。";
      setMsg({ type: "error", text: friendly });
    } finally {
      setPasskeyRegistering(false);
    }
  };

  const handleSkip = async () => {
    setMsg(null);
    setLoading(true);
    try {
      await markSkipOnServer();
      router.replace("/home");
    } catch (err: any) {
      console.error("skip error:", err);
      setMsg({
        type: "error",
        text: "処理に失敗しました。もう一度お試しください。",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      className="min-h-screen flex items-center justify-center pt-12 pb-8"
      initial="hidden"
      animate="show"
      variants={fadeInUp}
    >
      <div className="w-full max-w-md mx-auto p-6">
        <div className="space-y-8">
          <div className="text-center">
            <h2 className="text-xl font-semibold text-primary mb-6">
              セキュリティを強化しましょう
            </h2>
          </div>

          <div className="text-center space-y-6">
            <p className="text-secondary text-sm leading-relaxed max-w-xs mx-auto text-center">
              パスキーを登録すると、次回からパスワード不要で安全にログインできます。推奨設定です。
            </p>

            {/* パスキーアイコン */}
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center mx-auto"
              style={{
                background:
                  "color-mix(in srgb, var(--accent) 15%, transparent)",
              }}
            >
              <svg
                width="32"
                height="32"
                viewBox="0 0 24 24"
                fill="none"
                style={{ color: "var(--accent)" }}
              >
                <path
                  d="M12 2C9.243 2 7 4.243 7 7c0 1.646.804 3.103 2.041 4H5a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-8a2 2 0 0 0-2-2h-4.041C16.196 10.103 17 8.646 17 7c0-2.757-2.243-5-5-5zM9 7c0-1.654 1.346-3 3-3s3 1.346 3 3-1.346 3-3 3-3-1.346-3-3zm0 8a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v4H9v-4z"
                  fill="currentColor"
                />
              </svg>
            </div>

            <p className="text-sm text-muted text-center">
              アカウントが作成されました。続けてパスキーを登録しますか？（推奨）
            </p>
          </div>

          {msg && (
            <div
              className={`text-sm p-3 rounded-lg text-center mb-6 ${
                msg.type === "error"
                  ? "text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20"
                  : "text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/20"
              }`}
            >
              {msg.text}
            </div>
          )}

          <div className="space-y-3">
            <motion.button
              type="button"
              onClick={handleRegister}
              disabled={passkeyRegistering}
              whileTap={buttonTap.whileTap}
              whileHover={buttonTap.whileHover}
              transition={springTransition}
              className="w-full font-semibold py-3 rounded-full text-white transition-all hover:scale-[1.02] active:scale-[0.98]"
              style={{ background: "var(--accent)" }}
            >
              {passkeyRegistering ? "登録中…" : "パスキーを登録する（推奨）"}
            </motion.button>

            <motion.button
              type="button"
              onClick={handleSkip}
              disabled={loading}
              whileTap={buttonTap.whileTap}
              whileHover={buttonTap.whileHover}
              transition={springTransition}
              className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full py-3 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-all"
            >
              今はスキップしてホームへ
            </motion.button>
          </div>
        </div>

        <div className="text-center text-xs text-muted mt-8">© My-FridgeAI</div>
      </div>
    </motion.div>
  );
}
