// app/auth/passkey/setup/page.tsx
"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import Image from "next/image";
import { useTheme } from "@/app/components/ThemeProvider";
import { motion } from "framer-motion";
import { fadeInUp, buttonTap, springTransition } from "@/app/components/motion";

/**
 * パスキー強制登録画面（新端末登録フロー用）
 *
 * mode=add_device の場合:
 * - キャンセル不可（キャンセル時は強制ログアウト）
 * - パスキー登録完了するまで他ページへ遷移不可
 * - 登録完了時のみセッションを発行
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
  const publicKey = opts.publicKey ? { ...opts.publicKey } : { ...opts };

  if (!publicKey.challenge) throw new Error("server returned no challenge");

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

function PasskeySetupContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const force = searchParams?.get("force") === "true";
  const mode = searchParams?.get("mode");
  const setupToken = searchParams?.get("setupToken");
  const email = searchParams?.get("email");

  const isAddDeviceMode = mode === "add_device" && force && setupToken && email;

  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "error"; text: string } | null>(
    null,
  );

  useEffect(() => {
    setMounted(true);
  }, []);

  // 新端末登録モードでない場合はログインへリダイレクト
  useEffect(() => {
    if (!isAddDeviceMode) {
      router.replace("/login");
    }
  }, [isAddDeviceMode, router]);

  // ブラウザバック防止
  useEffect(() => {
    if (isAddDeviceMode) {
      const handleBeforeUnload = (e: BeforeUnloadEvent) => {
        e.preventDefault();
        e.returnValue = "";
      };

      window.addEventListener("beforeunload", handleBeforeUnload);

      // ブラウザ履歴を操作して戻れないようにする
      window.history.pushState(null, "", window.location.href);
      const handlePopState = () => {
        window.history.pushState(null, "", window.location.href);
      };
      window.addEventListener("popstate", handlePopState);

      return () => {
        window.removeEventListener("beforeunload", handleBeforeUnload);
        window.removeEventListener("popstate", handlePopState);
      };
    }
  }, [isAddDeviceMode]);

  async function handleRegister() {
    if (!email || !setupToken) return;

    setMsg(null);
    setLoading(true);

    try {
      // 1. 登録オプションを取得
      const optsRes = await fetch("/api/auth/webauthn/register-options", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const optsData = await optsRes.json();

      if (!optsRes.ok || !optsData?.ok) {
        throw new Error(
          optsData?.message || "登録オプションの取得に失敗しました",
        );
      }

      // 2. WebAuthn API を呼び出し
      const publicKey = preformatCreateOptions(optsData.options);
      const cred: any = await navigator.credentials.create({
        publicKey,
      } as any);

      if (!cred) {
        setLoading(false);
        return; // ユーザーがキャンセル
      }

      // 3. サーバーに登録
      const serialized = serializeAttestation(cred);
      const regRes = await fetch("/api/auth/webauthn/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, attestationResponse: serialized }),
      });
      const regData = await regRes.json();

      if (!regRes.ok || !regData?.ok) {
        throw new Error(regData?.message || "パスキーの登録に失敗しました");
      }

      // 4. 登録完了 API を呼び出し（ここでセッション発行用トークンを取得）
      const completeRes = await fetch("/api/auth/add-device/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ setupToken, email }),
      });
      const completeData = await completeRes.json();

      if (!completeRes.ok || !completeData?.ok) {
        throw new Error(completeData?.message || "登録完了処理に失敗しました");
      }

      // 5. NextAuth でセッションを発行
      const signInRes = await signIn("credentials", {
        redirect: false,
        token: completeData.token,
        callbackUrl: "/home",
      });

      if (signInRes?.ok) {
        setMsg({
          type: "ok",
          text: "パスキーを登録しました。ホームへ移動します…",
        });
        setTimeout(() => {
          router.replace("/home");
        }, 1500);
      } else {
        throw new Error("セッションの発行に失敗しました");
      }
    } catch (err: any) {
      // ユーザーがキャンセルした場合、または既に登録済みのパスキーの場合はエラーメッセージを表示しない
      if (
        err?.name === "NotAllowedError" ||
        err?.name === "InvalidStateError" ||
        err?.message?.includes("cancelled") ||
        err?.message?.includes("already registered")
      ) {
        setLoading(false);
        return;
      }

      console.error("[passkey-setup] error:", err);
      setMsg({
        type: "error",
        text:
          err?.message ||
          "パスキーの登録に失敗しました。最初からやり直してください。",
      });
    } finally {
      setLoading(false);
    }
  }

  const handleCancel = () => {
    // 強制ログアウト（実際にはセッションがないので単にリダイレクト）
    router.replace("/login?message=passkey_registration_cancelled");
  };

  if (!isAddDeviceMode) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div
          className="w-12 h-12 rounded-full border-4 border-t-transparent animate-spin"
          style={{
            borderColor: "var(--accent)",
            borderTopColor: "transparent",
          }}
        />
      </div>
    );
  }

  return (
    <motion.div
      className="min-h-screen flex items-center justify-center pt-12 pb-8"
      initial="hidden"
      animate="show"
      variants={fadeInUp}
    >
      <div className="w-full max-w-md mx-auto p-6">
        {/* ロゴ */}
        <div className="flex justify-center mb-8">
          {mounted ? (
            <Image
              src={
                theme === "dark"
                  ? "/my-fridgeai-logo-white.png"
                  : "/my-fridgeai-logo.png"
              }
              alt="My-fridgeai"
              width={180}
              height={52}
              priority
            />
          ) : (
            <div style={{ width: 180, height: 52 }} />
          )}
        </div>

        <div className="space-y-8">
          <div className="text-center">
            <h2 className="text-xl font-semibold text-primary mb-4">
              パスキーを登録してください
            </h2>
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 text-sm text-blue-800 dark:text-blue-200">
              <p className="font-medium mb-2">🔐 新しい端末でのログイン</p>
              <p>
                この端末でサービスを利用するには、パスキーの登録が必要です。
              </p>
            </div>
          </div>

          {/* パスキーアイコン */}
          <div className="text-center">
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center mx-auto"
              style={{
                background:
                  "color-mix(in srgb, var(--accent) 15%, transparent)",
              }}
            >
              <svg
                width="40"
                height="40"
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
          </div>

          {msg && (
            <div
              className={`text-sm p-3 rounded-lg text-center ${
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
              disabled={loading}
              whileTap={buttonTap.whileTap}
              whileHover={buttonTap.whileHover}
              transition={springTransition}
              className="w-full font-semibold py-4 rounded-full text-white transition-all text-lg"
              style={{ background: "var(--accent)" }}
            >
              {loading ? (
                <>
                  <span className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin inline-block mr-2"></span>
                  登録中…
                </>
              ) : (
                "パスキーを登録する"
              )}
            </motion.button>

            <p className="text-xs text-center text-muted">
              ※ パスキーを登録しないとサービスを利用できません
            </p>
          </div>

          {/* キャンセルボタン（警告表示） */}
          <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={handleCancel}
              disabled={loading}
              className="w-full text-sm text-red-500 hover:text-red-600 transition-colors py-2"
            >
              キャンセルして戻る
            </button>
            <p className="text-xs text-center text-muted mt-1">
              ※ キャンセルするとログアウトされます
            </p>
          </div>
        </div>

        <div className="text-center text-xs text-muted mt-8">© My-fridgeai</div>
      </div>
    </motion.div>
  );
}

export default function PasskeySetupPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div
            className="w-12 h-12 rounded-full border-4 border-t-transparent animate-spin"
            style={{
              borderColor: "var(--accent)",
              borderTopColor: "transparent",
            }}
          />
        </div>
      }
    >
      <PasskeySetupContent />
    </Suspense>
  );
}
