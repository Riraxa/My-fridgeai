// app/components/AccountSettings.tsx
"use client";

import { useSession, signOut, signIn } from "next-auth/react";
import { useTheme } from "@/app/components/ThemeProvider";
import { Button } from "@/app/components/ui/button";
import PasskeyManager from "./PasskeyManager";
import { useEffect, useRef, useState } from "react";
import ProModal from "@/app/components/ProModal";

export default function AccountSettings() {
  const { data: session, status, update } = useSession();
  const { theme, setTheme } = useTheme();
  const [showProModal, setShowProModal] = useState(false);
  const didSyncSession = useRef(false);

  useEffect(() => {
    if (status === "authenticated" && !didSyncSession.current) {
      didSyncSession.current = true;
      void (async () => {
        try {
          await fetch("/api/billing/sync", { method: "POST" });
        } catch {
          // ignore sync errors here
        }
        await update();
      })();
    }
  }, [status, update]);

  const handleDeleteAccount = async () => {
    if (
      !confirm(
        "本当にアカウントを削除しますか？この操作は取り消せません。\n注意: セキュリティのため、直近でログインしていない場合は削除に失敗することがあります。",
      )
    ) {
      return;
    }

    try {
      const res = await fetch("/api/account/delete", { method: "POST" });
      // 可能性のある非JSONレスポンスにも耐える
      let data: any = {};
      try {
        data = await res.json();
      } catch {
        // ignore JSON parse errors
      }

      if (!res.ok) {
        if (res.status === 403 || res.status === 401) {
          alert(
            "セキュリティのため、再認証が必要です。ログイン画面へ移動します。",
          );
          await signIn();
          return;
        }
        throw new Error(data?.error || "削除エラー");
      }

      alert("アカウントを削除しました。");
      await signOut({ callbackUrl: "/" });
    } catch (err: any) {
      alert(`エラー: ${err?.message ?? String(err)}`);
    }
  };

  const [isPortalLoading, setIsPortalLoading] = useState(false);

  const handleCancelSubscription = async () => {
    const message = `本当に解約しますか？

【ご確認事項】
・解約後も現在の請求期間が終了するまでは Pro 機能をご利用いただけます。
・請求期間終了後、自動更新は行われません。
・返金は行われませんのでご了承ください。`;

    if (!confirm(message)) return;

    setIsPortalLoading(true);
    try {
      const res = await fetch("/api/billing/portal", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Portalの起動に失敗しました");
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err: any) {
      alert(`エラー: ${err.message}`);
    } finally {
      setIsPortalLoading(false);
    }
  };

  // ローディング時は簡易表示（必要ならスケルトンに差し替えてください）
  if (status === "loading") return <div>読み込み中...</div>;
  if (!session?.user) return <div>ログインしてください</div>;

  // 型安全に boolean 化
  const isPro = (session.user as any)?.plan === "PRO";

  return (
    // 画面中央に寄せるために mx-auto と左右パディングを追加
    <div className="space-y-8 max-w-2xl mx-auto pb-24 px-4 settings-page-enter-active">
      {/* Pro Plan Section */}
      <section>
        {isPro ? (
          <div className="space-y-4">
            <div className="card border-2 border-orange-400/30 bg-gradient-to-br from-orange-50/80 to-amber-50/80 dark:from-orange-900/20 dark:to-amber-900/20">
              <div className="flex items-center justify-between mb-3">
                <div
                  className="font-bold text-lg"
                  style={{ color: "var(--accent)" }}
                >
                  Pro サポーター 🌟
                </div>
                {session?.user && (session.user as any).cancelAtPeriodEnd ? (
                  <span className="text-xs px-3 py-1.5 rounded-full font-semibold bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 border border-gray-200 dark:border-gray-700">
                    解約予約中
                  </span>
                ) : (
                  <span
                    className="text-xs px-3 py-1.5 rounded-full font-semibold"
                    style={{
                      background:
                        "color-mix(in srgb, var(--accent) 15%, transparent)",
                      color: "var(--accent)",
                      border:
                        "1px solid color-mix(in srgb, var(--accent) 30%, transparent)",
                    }}
                  >
                    有効
                  </span>
                )}
              </div>
              <p
                className="text-base leading-relaxed"
                style={{ color: "var(--color-text-secondary)" }}
              >
                {session?.user && (session.user as any).cancelAtPeriodEnd
                  ? "Proプランは解約済みです。"
                  : "ご支援ありがとうございます！あなたのサポートが開発の力になります。"}
              </p>
              {session?.user &&
                (session.user as any).cancelAtPeriodEnd &&
                (session.user as any).stripeCurrentPeriodEnd && (
                  <p className="text-sm font-medium mt-2 text-orange-600 dark:text-orange-400">
                    機能は{" "}
                    {new Date(
                      (session.user as any).stripeCurrentPeriodEnd,
                    ).toLocaleDateString()}{" "}
                    までご利用いただけます。
                  </p>
                )}
            </div>

            <div className="card">
              <h3
                className="font-bold mb-2"
                style={{ color: "var(--color-text-primary)" }}
              >
                サブスクリプション管理
              </h3>
              <p
                className="text-sm mb-4"
                style={{ color: "var(--color-text-secondary)" }}
              >
                お支払い方法の変更や、
                {session?.user && (session.user as any).cancelAtPeriodEnd
                  ? "解約のキャンセル"
                  : "プランの解約"}{" "}
                などの手続きを行えます。
              </p>
              <div className="flex justify-center">
                <Button
                  variant={
                    session?.user && (session.user as any).cancelAtPeriodEnd
                      ? "default"
                      : "destructive"
                  }
                  onClick={handleCancelSubscription}
                  disabled={isPortalLoading}
                  className="w-full sm:w-auto border-2 hover:scale-[1.02] transition-all"
                  style={
                    session?.user && (session.user as any).cancelAtPeriodEnd
                      ? {}
                      : {
                          borderColor: "var(--accent)",
                          background: "var(--accent)",
                          color: "#fff",
                        }
                  }
                >
                  {isPortalLoading
                    ? "読み込み中..."
                    : session?.user && (session.user as any).cancelAtPeriodEnd
                      ? "解約をキャンセルする"
                      : "Proプランを解約する"}
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-4 border-2 border-orange-400 relative overflow-hidden rounded-xl">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex-1">
                <h3 className="font-bold text-lg mb-1 text-orange-600 dark:text-orange-400">
                  Proプランで応援する
                </h3>
                <ul className="text-sm space-y-1 text-muted-foreground">
                  <li>✨ 献立生成が無制限</li>
                  <li>🥕 期限切れ食材を優先消費</li>
                  <li>🥗 栄養バランス改善</li>
                </ul>
              </div>
              <Button
                onClick={() => setShowProModal(true)}
                className="bg-orange-500 hover:bg-orange-600 text-white font-bold shadow-md whitespace-nowrap"
              >
                Proで応援する
              </Button>
            </div>
          </div>
        )}
      </section>

      {/* User Info */}
      <section>
        <h2 className="text-xl font-bold mb-4">アカウント情報</h2>

        {/* ← ここを globals.css の .card に差し替え */}
        <div className="card">
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-500">名前</label>
              <div className="font-medium">{session.user.name || "未設定"}</div>
            </div>
            <div>
              <label className="block text-sm text-gray-500">
                メールアドレス
              </label>
              <div className="font-medium">{session.user.email}</div>
            </div>
          </div>
        </div>
      </section>

      {/* Theme Settings */}
      <section>
        <h2 className="text-xl font-bold mb-4">表示設定</h2>

        {/* ← ここも .card に置換 */}
        <div className="card">
          <div className="font-semibold mb-2">画面テーマ</div>
          <select
            value={theme}
            onChange={(e) =>
              setTheme(e.target.value as "system" | "light" | "dark")
            }
            className="input mt-1"
          >
            <option value="system">OSに合わせる</option>
            <option value="light">ライト</option>
            <option value="dark">ダーク</option>
          </select>
        </div>
      </section>

      {/* Security */}
      <section>
        <h2 className="text-xl font-bold mb-4">セキュリティ</h2>

        {/* ← ここも .card */}
        <div className="card">
          <PasskeyManager />
        </div>
      </section>

      {/* Danger Zone */}
      <section className="pt-8 border-t dark:border-gray-700">
        <h2 className="text-xl font-bold text-red-600 mb-4">
          危険な設定 / ログアウト
        </h2>

        {/* Danger は card ベースにして注意色のボーダーを保持 */}
        <div className="card border border-red-100 dark:border-red-900">
          <div className="space-y-4">
            <Button
              onClick={() => signOut({ callbackUrl: "/" })}
              className="w-full bg-gray-200 text-gray-800 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
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
              <p className="mt-2 text-sm text-gray-500">
                アカウントを削除すると、すべてのデータが永久に失われます。
              </p>
            </div>
          </div>
        </div>
      </section>

      <ProModal open={showProModal} onClose={() => setShowProModal(false)} />
    </div>
  );
}
