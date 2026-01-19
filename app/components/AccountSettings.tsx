// app/components/AccountSettings.tsx
"use client";

import { useSession, signOut, signIn } from "next-auth/react";
import type { Session } from "next-auth";
import { useTheme } from "@/app/components/ThemeProvider";
import { Button } from "@/app/components/ui/button";
import PasskeyManager from "./PasskeyManager";
import { useEffect, useRef, useState } from "react";
import ProModal from "@/app/components/ProModal";

// スケルトンUIコンポーネント
function SettingsSkeleton() {
  return (
    <div className="space-y-8 max-w-2xl mx-auto pb-24 px-4">
      {/* Pro Plan Section Skeleton */}
      <div className="p-4 border-2 border-orange-400/30 rounded-xl animate-pulse">
        <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded mb-3 w-32"></div>
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded mb-2"></div>
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
      </div>

      {/* User Info Skeleton */}
      <div>
        <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded mb-4 w-24"></div>
        <div className="card">
          <div className="space-y-4">
            <div>
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded mb-2 w-12"></div>
              <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-32"></div>
            </div>
            <div>
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded mb-2 w-20"></div>
              <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-48"></div>
            </div>
          </div>
        </div>
      </div>

      {/* Theme Settings Skeleton */}
      <div>
        <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded mb-4 w-24"></div>
        <div className="card">
          <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded mb-2 w-24"></div>
          <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded w-32"></div>
        </div>
      </div>

      {/* Security Skeleton */}
      <div>
        <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded mb-4 w-24"></div>
        <div className="card">
          <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
      </div>
    </div>
  );
}

export default function AccountSettings() {
  const { data: session, status } = useSession();
  const { theme, setTheme } = useTheme();
  const [showProModal, setShowProModal] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [cachedSession, setCachedSession] = useState<Session | null>(null);
  const didSyncSession = useRef(false);

  // セッションデータをキャッシュして、読み込み中も前回のデータを表示
  useEffect(() => {
    if (session && !cachedSession) {
      setCachedSession(session);
    } else if (session && cachedSession) {
      setCachedSession(session);
    }
  }, [session, cachedSession]);

  // 表示用のセッションデータ（キャッシュされたデータか現在のセッション）
  const displaySession = session || cachedSession;

  useEffect(() => {
    if (status === "authenticated" && !didSyncSession.current) {
      didSyncSession.current = true;
      setIsSyncing(true);
      // バックグラウンドで請求情報を同期
      void (async () => {
        try {
          await fetch("/api/billing/sync", { method: "POST" });
        } catch {
          // ignore sync errors here
        } finally {
          setIsSyncing(false);
        }
      })();
    }
  }, [status]);

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

  // ローディング時はスケルトン表示（ただしキャッシュがあれば即時表示）
  if (status === "loading" && !cachedSession) return <SettingsSkeleton />;
  if (!displaySession?.user) return <div>ログインしてください</div>;

  // 型安全に boolean 化
  const isPro = (displaySession.user as any)?.plan === "PRO";

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
                <div className="flex items-center gap-2">
                  {isSyncing && (
                    <div className="flex items-center gap-1 text-xs text-gray-500">
                      <div className="w-3 h-3 border border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                      同期中
                    </div>
                  )}
                  {displaySession?.user &&
                  (displaySession.user as any).cancelAtPeriodEnd ? (
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
              </div>
              <p
                className="text-base leading-relaxed"
                style={{ color: "var(--color-text-secondary)" }}
              >
                {displaySession?.user &&
                (displaySession.user as any).cancelAtPeriodEnd
                  ? "Proプランは解約済みです。"
                  : "ご支援ありがとうございます！あなたのサポートが開発の力になります。"}
              </p>
              {displaySession?.user &&
                (displaySession.user as any).cancelAtPeriodEnd &&
                (displaySession.user as any).stripeCurrentPeriodEnd && (
                  <p
                    className="text-sm font-medium mt-2"
                    style={{ color: "var(--accent)" }}
                  >
                    機能は{" "}
                    {new Date(
                      (displaySession.user as any).stripeCurrentPeriodEnd,
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
                {displaySession?.user &&
                (displaySession.user as any).cancelAtPeriodEnd
                  ? "解約のキャンセル"
                  : "プランの解約"}{" "}
                などの手続きを行えます。
              </p>
              <div className="flex justify-center">
                <Button
                  variant={
                    displaySession?.user &&
                    (displaySession.user as any).cancelAtPeriodEnd
                      ? "default"
                      : "destructive"
                  }
                  onClick={handleCancelSubscription}
                  disabled={isPortalLoading}
                  className="w-full sm:w-auto border-2 hover:scale-[1.02] transition-all"
                  style={
                    displaySession?.user &&
                    (displaySession.user as any).cancelAtPeriodEnd
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
                    : displaySession?.user &&
                        (displaySession.user as any).cancelAtPeriodEnd
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
                <h3
                  className="font-bold text-lg mb-1"
                  style={{ color: "var(--accent)" }}
                >
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
                className="font-bold shadow-md whitespace-nowrap"
                style={{
                  background: "var(--accent)",
                  color: "#fff",
                  border: "none",
                }}
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
              <label
                className="block text-sm"
                style={{ color: "var(--color-text-secondary)" }}
              >
                名前
              </label>
              <div className="font-medium">
                {displaySession.user.name || "未設定"}
              </div>
            </div>
            <div>
              <label
                className="block text-sm"
                style={{ color: "var(--color-text-secondary)" }}
              >
                メールアドレス
              </label>
              <div className="font-medium">{displaySession.user.email}</div>
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
        <h2
          className="text-xl font-bold mb-4"
          style={{ color: "var(--color-text-primary)" }}
        >
          危険な設定 / ログアウト
        </h2>

        {/* Danger は card ベースにして注意色のボーダーを保持 */}
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
              <p
                className="mt-2 text-sm"
                style={{ color: "var(--color-text-muted)" }}
              >
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
