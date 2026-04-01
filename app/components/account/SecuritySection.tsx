"use client";

import { signOut, signIn } from "next-auth/react";
import { Button } from "@/app/components/ui/button";
import { useNativeConfirm } from "@/app/hooks/useOSDetection";

export default function SecuritySection() {
  const { confirm: nativeConfirm } = useNativeConfirm();

  const handleDeleteAccount = async () => {
    const confirmed = nativeConfirm(
      "本当にアカウントを削除しますか？この操作は取り消せません。\n注意: セキュリティのため、直近でログインしていない場合は削除に失敗することがあります。",
      "アカウント削除の確認"
    );

    if (!confirmed) return;

    try {
      const res = await fetch("/api/account/delete", { method: "POST" });
      
      let data: any = {};
      try {
        data = await res.json();
      } catch {
        // ignore JSON parse errors
      }

      if (!res.ok) {
        if (res.status === 403 || res.status === 401) {
          alert("セキュリティのため、再認証が必要です。ログイン画面へ移動します。");
          await signIn();
          return;
        }
        throw new Error(data?.error ?? "削除エラー");
      }

      alert("アカウントを削除しました。");
      await signOut({ callbackUrl: "/" });
    } catch (err) {
      alert(`エラー: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  return (
    <section className="pt-8 border-t dark:border-gray-700">
      <h2 className="text-xl font-bold mb-4" style={{ color: "var(--color-text-primary)" }}>
        アカウント管理 / ログアウト
      </h2>

      <div className="card border border-red-100 dark:border-red-900">
        <div className="space-y-4">
          <Button
            onClick={() => signOut({ callbackUrl: "/" })}
            className="w-full"
            style={{
              background: "var(--surface-bg)",
              color: "var(--color-text-primary)",
              border: "1px solid var(--surface-border)",
            }}
          >
            ログアウト
          </Button>

          <div className="pt-4 border-t border-red-200 dark:border-red-800">
            <Button
              onClick={handleDeleteAccount}
              className="w-full bg-red-600 text-white hover:bg-red-700"
            >
              アカウントを削除する
            </Button>
            <p className="mt-2 text-sm" style={{ color: "var(--color-text-muted)" }}>
              アカウントを削除すると、すべてのデータが永久に失われます。
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
