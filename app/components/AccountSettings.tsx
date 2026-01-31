// app/components/AccountSettings.tsx
"use client";

import { useSession, signOut, signIn } from "next-auth/react";
import type { Session } from "next-auth";
import { useTheme } from "@/app/components/ThemeProvider";
import { Button } from "@/app/components/ui/button";
import PasskeyManager from "./PasskeyManager";
import { useEffect, useRef, useState, useCallback } from "react";
import { Pencil, Save, X, User } from "lucide-react";
import { toast } from "sonner";
import ProModal from "@/app/components/ProModal";
import { useNativeConfirm } from "@/app/hooks/useOSDetection";
import { useNativeSelect } from "@/app/hooks/useNativeSelect";

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
  const { confirm: nativeConfirm } = useNativeConfirm();
  const { getSelectClassName } = useNativeSelect();

  // 編集関連の状態
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState("");
  const [isSavingName, setIsSavingName] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 表示用のセッションデータ（キャッシュされたデータか現在のセッション）
  const displaySession = session || cachedSession;

  // Googleでの既存の認証情報を確認 (OAuthユーザーかどうかの判定用)
  const isGoogleOAuth = (displaySession?.user as any)?.accounts?.some(
    (acc: any) => acc.provider === "google",
  );

  useEffect(() => {
    if (status === "authenticated" && !didSyncSession.current) {
      didSyncSession.current = true;
      setIsSyncing(true);
      // バックグラウンドで請求情報を同期
      void (async () => {
        try {
          // 一時的に新しいエンドポイントをテスト
          await fetch("/api/billing-sync", {
            method: "POST",
            credentials: "include",
            cache: "no-store",
          });
        } catch {
          // ignore sync errors here
        } finally {
          setIsSyncing(false);
        }
      })();
    }
  }, [status]);

  const handleDeleteAccount = async () => {
    const confirmed = nativeConfirm(
      "本当にアカウントを削除しますか？この操作は取り消せません。\n注意: セキュリティのため、直近でログインしていない場合は削除に失敗することがあります。",
      "アカウント削除の確認",
    );

    if (!confirmed) {
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
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      alert(`エラー: ${message}`);
    }
  };

  const handleUpdateProfile = async (data: {
    name?: string;
    image?: string;
  }) => {
    try {
      const res = await fetch("/api/account/update", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) throw new Error("更新に失敗しました。");

      // セッションを更新 (NextAuth v5なら update() が使えるが、v4ならリロードまたは再認証が必要)
      // ここでは、SessionWrapper等で管理されているセッションをリロードするために
      // window.location.reload() を使うか、独自にフェッチする。
      // next-auth/react の useSession().update() は JWT strategy だと token 更新が必要。
      // 今回は簡易的に reload もしくは状態更新で対応。
      window.location.reload();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "エラーが発生しました。",
      );
    }
  };

  const saveName = async () => {
    setIsSavingName(true);
    await handleUpdateProfile({ name: tempName });
    setIsSavingName(false);
    setIsEditingName(false);
  };

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error("画像サイズは2MB以下にしてください。");
      return;
    }

    setIsUploadingImage(true);
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64String = reader.result as string;
      await handleUpdateProfile({ image: base64String });
      setIsUploadingImage(false);
    };
    reader.readAsDataURL(file);
  };

  const [isPortalLoading, setIsPortalLoading] = useState(false);

  const handleCancelSubscription = async () => {
    const message = `本当に解約しますか？

【ご確認事項】
・解約後も現在の請求期間が終了するまでは Pro 機能をご利用いただけます。
・請求期間終了後、自動更新は行われません。
・返金は行われませんのでご了承ください。`;

    const confirmed = nativeConfirm(message, "解約の確認");
    if (!confirmed) return;

    setIsPortalLoading(true);
    try {
      const res = await fetch("/api/billing-portal", {
        method: "POST",
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Portalの起動に失敗しました");
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      alert(`エラー: ${message}`);
    } finally {
      setIsPortalLoading(false);
    }
  };

  // ローディング時はスケルトン表示（ただしキャッシュがあれば即時表示）
  if (status === "loading" && !cachedSession) return <SettingsSkeleton />;
  if (!displaySession?.user) return <div>ログインしてください</div>;

  // 型安全に boolean 化
  const isPro = (displaySession.user as any).plan === "PRO";

  return (
    // 画面中央に寄せるために mx-auto と左右パディングを追加
    <div className="space-y-8 max-w-2xl mx-auto pb-24 px-4">
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
                  <li>✨ 1日の献立生成数が5回にUP</li>
                  <li>📅 1週間分の献立を一括作成</li>
                  <li>🥕 期限切れ食材を優先消費</li>
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

        <div className="card">
          <div className="flex flex-col gap-6">
            <div className="flex items-center gap-4">
              <div className="relative group">
                <div className="w-16 h-16 rounded-full overflow-hidden bg-gray-100 dark:bg-gray-800 flex items-center justify-center border-2 border-gray-200 dark:border-gray-700">
                  {displaySession.user.image ? (
                    <img
                      src={displaySession.user.image}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <User className="w-8 h-8 text-gray-400" />
                  )}
                  {isUploadingImage && (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    </div>
                  )}
                </div>

                {!isGoogleOAuth && (
                  <>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="absolute -bottom-1 -right-1 p-1.5 bg-white dark:bg-gray-900 rounded-full shadow-lg border border-gray-200 dark:border-gray-700 hover:scale-110 transition-transform"
                      title="アイコンを変更"
                    >
                      <Pencil
                        size={12}
                        className="text-gray-600 dark:text-gray-400"
                      />
                    </button>
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleImageChange}
                      className="hidden"
                      accept="image/*"
                    />
                  </>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  {isEditingName ? (
                    <div className="flex items-center gap-2 w-full">
                      <input
                        type="text"
                        value={tempName}
                        onChange={(e) => setTempName(e.target.value)}
                        className="bg-gray-50 dark:bg-gray-800 border dark:border-gray-700 rounded px-2 py-1 flex-1 outline-none text-sm"
                        placeholder="名前を入力"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === "Enter") saveName();
                          if (e.key === "Escape") setIsEditingName(false);
                        }}
                      />
                      <button
                        onClick={saveName}
                        disabled={isSavingName}
                        className="p-1 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded"
                      >
                        <Save size={18} />
                      </button>
                      <button
                        onClick={() => setIsEditingName(false)}
                        className="p-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
                      >
                        <X size={18} />
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="font-bold text-lg truncate">
                        {displaySession.user.name || "未設定"}
                      </div>
                      <button
                        onClick={() => {
                          setTempName(displaySession.user.name || "");
                          setIsEditingName(true);
                        }}
                        className="p-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
                      >
                        <Pencil size={16} />
                      </button>
                    </>
                  )}
                </div>
                <div className="text-sm text-gray-500 truncate">
                  {displaySession.user.email}
                </div>
              </div>
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
            className={getSelectClassName()}
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
