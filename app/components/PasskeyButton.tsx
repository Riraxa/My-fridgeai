//app/components/PasskeyButton.tsx
"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/app/components/ui/button";

/* ---------- Helpers ---------- */

/** base64url -> Uint8Array (defensive) */
function base64urlToUint8Array(base64url?: string): Uint8Array {
  if (!base64url || typeof base64url !== "string") {
    throw new Error("無効なbase64urlが渡されました");
  }
  const padding = "=".repeat((4 - (base64url.length % 4)) % 4);
  const base64 = (base64url + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; ++i) out[i] = raw.charCodeAt(i);
  return out;
}

/** ArrayBuffer -> base64url */
function arrayBufferToBase64url(buf: ArrayBuffer | Uint8Array): string {
  const u8 = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let s = "";
  for (let i = 0; i < u8.length; i++) s += String.fromCharCode(u8[i]);
  const b64 = btoa(s);
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** Normalize server-provided options into a publicKey object acceptable by the WebAuthn API */
function preformatCreateOptions(opts: any) {
  // server may return { publicKey: {...} } or publicKey directly
  const publicKey = opts?.publicKey
    ? { ...opts.publicKey }
    : { ...(opts ?? {}) };

  if (!publicKey || !publicKey.challenge) {
    throw new Error(
      "サーバーから有効なPublicKeyオプションが返されませんでした",
    );
  }

  // challenge: string (base64url) or Array / ArrayBuffer
  if (typeof publicKey.challenge === "string") {
    publicKey.challenge = base64urlToUint8Array(publicKey.challenge);
  } else if (Array.isArray(publicKey.challenge)) {
    publicKey.challenge = new Uint8Array(publicKey.challenge);
  } // else assume it's already an ArrayBuffer / Uint8Array

  // user.id may be string base64url or array
  if (publicKey.user && publicKey.user.id) {
    if (typeof publicKey.user.id === "string") {
      publicKey.user.id = base64urlToUint8Array(publicKey.user.id);
    } else if (Array.isArray(publicKey.user.id)) {
      publicKey.user.id = new Uint8Array(publicKey.user.id);
    }
  }

  // excludeCredentials: ensure id fields are Uint8Array
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

/* ---------- Component ---------- */

interface PasskeyButtonProps {
  onSuccess?: () => void;
}

export default function PasskeyButton({ onSuccess }: PasskeyButtonProps) {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleRegister = async () => {
    setMessage(null);

    if (!session?.user?.email) {
      setMessage("ログインされているユーザーのメールが取得できませんでした。");
      return;
    }

    if (!("credentials" in navigator)) {
      setMessage(
        "このブラウザはWebAuthnをサポートしていません。別のブラウザでお試しください。",
      );
      return;
    }

    setLoading(true);

    try {
      // 1) get register-options from server
      const resOptions = await fetch("/api/auth/webauthn/register-options", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: session.user.email,
          preferPlatform: true,
        }),
      });

      if (!resOptions.ok) {
        const err = await resOptions.json().catch(() => ({}));
        throw new Error(err?.message || "登録オプションの取得に失敗しました。");
      }

      const json = await resOptions.json().catch(() => ({}));
      const opts = json?.options ?? json;

      if (!opts) throw new Error("サーバーが不正なレスポンスを返しました");

      // 2) normalize options
      const publicKey = preformatCreateOptions(opts);

      // 3) create credential
      const cred = (await navigator.credentials.create({
        publicKey,
      } as any)) as any;
      if (!cred) throw new Error("認証器の作成がキャンセルされました。");

      // 4) serialize attestation for server
      const rawIdBase64 = arrayBufferToBase64url(cred.rawId);

      const attResp =
        (cred.response as AuthenticatorAttestationResponse) || null;
      if (!attResp) throw new Error("認証器の応答が取得できませんでした。");

      const attestationResponse = {
        id: cred.id,
        rawId: rawIdBase64,
        type: cred.type,
        response: {
          attestationObject: attResp.attestationObject
            ? arrayBufferToBase64url(attResp.attestationObject)
            : undefined,
          clientDataJSON: attResp.clientDataJSON
            ? arrayBufferToBase64url(attResp.clientDataJSON)
            : undefined,
        },
        clientExtensionResults:
          typeof cred.getClientExtensionResults === "function"
            ? cred.getClientExtensionResults()
            : {},
      };

      // 5) send attestation to server
      const resRegister = await fetch("/api/auth/webauthn/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: session.user.email,
          attestationResponse,
        }),
      });

      if (!resRegister.ok) {
        const err = await resRegister.json().catch(() => ({}));
        throw new Error(err?.message || "パスキー登録に失敗しました。");
      }

      const regJson = await resRegister.json().catch(() => ({}));
      if (!regJson?.ok && resRegister.ok) {
        // server might return 200 with { ok: false, message: "..." }
        throw new Error(regJson?.message || "登録が完了しませんでした。");
      }

      // 6) complete-passkey-setup (flag the user as setup complete)
      const resComplete = await fetch("/api/auth/complete-passkey-setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      if (!resComplete.ok) {
        const err = await resComplete.json().catch(() => ({}));
        throw new Error(err?.message || "登録完了処理に失敗しました。");
      }

      setMessage("パスキーの登録が完了しました。");
      // Call onSuccess callback if provided
      if (onSuccess) {
        onSuccess();
      }
    } catch (err: any) {
      console.error("Passkey registration error:", err);

      // User cancelled or timed out
      if (err?.name === "NotAllowedError") {
        setMessage("パスキー登録がキャンセルされました。");
        return;
      }

      setMessage(
        "パスキー登録中にエラーが発生しました。もう一度お試しください。",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <Button
        type="button"
        onClick={handleRegister}
        disabled={loading}
        className="
                w-full
                text-center
                bg-orange-500
                text-white
                hover:bg-orange-600
                disabled:opacity-50
                dark:bg-orange-400
                dark:hover:bg-orange-500
            "
      >
        {loading ? "登録中..." : "パスキーを登録する"}
      </Button>

      {message && (
        <p
          className={`mt-2 text-sm ${
            message.startsWith("エラー")
              ? "text-red-600 dark:text-red-400"
              : "text-green-600 dark:text-green-400"
          }`}
        >
          {message}
        </p>
      )}
    </div>
  );
}
