// app/settings/SettingsClient.tsx
"use client";

import { useState, useEffect } from "react";
import { signOut, useSession } from "next-auth/react";
import { useSearchParams, useRouter } from "next/navigation";
import { Button } from "@/app/components/ui/button";
import { useTheme } from "@/app/components/ThemeProvider";
import NavBar from "@/app/components/NavBar";
import ProModal from "@/app/components/ProModal";
import ProThankYouModal from "@/app/components/ProThankYouModal";

export default function SettingsClient() {
  const { data: session } = useSession();
  const searchParams = useSearchParams();
  const router = useRouter();

  const [isEditing, setIsEditing] = useState(false);
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [billingHistory] = useState<{ date: string; amount: number }[]>([
    { date: "2025-09-01", amount: 500 },
    { date: "2025-08-10", amount: 500 },
  ]);

  const { theme, setTheme } = useTheme();

  // Modal states
  const [showProModal, setShowProModal] = useState(false);
  const [showThankYouModal, setShowThankYouModal] = useState(false);

  useEffect(() => {
    // searchParams はクライアント専用フックなのでここで安全に使える
    const proStatus = searchParams.get("pro");
    if (proStatus === "success") {
      setShowThankYouModal(true);
      // URL のクエリはユーザー操作後にクリアしたいなら router.replace("/settings")
      // ただし replace は履歴操作なので、反映タイミングに気をつける
      // router.replace("/settings");
    } else if (proStatus === "cancel") {
      alert("Pro登録をキャンセルしました。");
      router.replace("/settings");
    }
  }, [searchParams, router]);

  const handleSaveProfile = () => {
    setIsEditing(false);
    alert("プロフィールを更新しました！");
  };

  const handlePasswordChange = () => {
    alert(`パスワードを変更しました: ${newPassword}`);
    setNewPassword("");
    setShowPasswordChange(false);
  };

  const handleDeleteAccount = async () => {
    if (!confirm("本当にアカウントを削除しますか？この操作は元に戻せません。"))
      return;

    try {
      const res = await fetch("/api/account/delete", {
        method: "POST",
      });

      if (res.ok) {
        alert("アカウントを削除しました");
        signOut({ callbackUrl: "/register" });
      } else {
        const data = await res.json();
        alert(`削除に失敗しました: ${data.error}`);
      }
    } catch (err) {
      console.error(err);
      alert("エラーが発生しました");
    }
  };

  const isPro = (session as any)?.user?.isPro;

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6 pb-32">
      {/* 課金 / Proプランセクション */}
      {isPro ? (
        <div className="card p-4 bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-900/30 dark:to-amber-900/30 border-orange-200 dark:border-orange-800">
          <div className="flex items-center justify-between mb-2">
            <div className="font-bold text-lg text-orange-600 dark:text-orange-400">
              Pro サポーター 🌟
            </div>
            <span className="bg-orange-100 text-orange-700 dark:bg-orange-800 dark:text-orange-200 text-xs px-2 py-1 rounded-full">
              有効
            </span>
          </div>
          <p className="text-sm mb-2 text-gray-700 dark:text-gray-300">
            このアプリは、高校生が一人でコツコツ作っています。
            <br />
            いただいたPro登録は、サーバー代と、より良い機能開発に使わせてください。
            <br />
            ありがとうございます！
          </p>
        </div>
      ) : (
        <div className="card p-4 border-2 border-orange-400 relative overflow-hidden">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex-1">
              <h3 className="font-bold text-lg mb-1 text-orange-600 dark:text-orange-400">
                Proプランで応援する
              </h3>
              <ul className="text-sm space-y-1 text-gray-600 dark:text-gray-300">
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

      {/* プロフィールカード */}
      <div className="card p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="font-bold text-lg">
              {session?.user?.name || "未設定"}
            </div>
            <div className="text-muted">
              {session?.user?.email || "メール未設定"}
            </div>
          </div>
          <Button onClick={() => setIsEditing(!isEditing)}>
            {isEditing ? "キャンセル" : "編集"}
          </Button>
        </div>

        {isEditing && (
          <div className="space-y-3">
            <input
              type="text"
              placeholder="名前を変更"
              defaultValue={session?.user?.name || ""}
              className="input"
            />
            <input
              type="email"
              placeholder="メールを変更"
              defaultValue={session?.user?.email || ""}
              className="input"
            />
            <Button onClick={handleSaveProfile} className="w-full">
              保存
            </Button>
          </div>
        )}
      </div>
      {/* テーマ設定 */}
      <div className="card p-4 space-y-3">
        <div className="font-semibold">画面テーマ</div>
        <select
          value={theme}
          onChange={(e) =>
            setTheme(e.target.value as "system" | "light" | "dark")
          }
          className="input"
        >
          <option value="system">OSに合わせる</option>
          <option value="light">ライト（オレンジ背景＋白枠）</option>
          <option value="dark">ダーク（濃い背景＋薄い枠）</option>
        </select>
      </div>
      {/* アカウント設定 */}
      <div className="card p-4 space-y-3">
        <div className="font-semibold">アカウント設定</div>
        <Button
          onClick={() => setShowPasswordChange(!showPasswordChange)}
          className="w-full"
        >
          パスワードを変更
        </Button>

        {showPasswordChange && (
          <div className="space-y-3 mt-2">
            <input
              type="password"
              placeholder="新しいパスワード"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="input"
            />
            <Button onClick={handlePasswordChange} className="w-full">
              変更を保存
            </Button>
          </div>
        )}

        <Button
          onClick={() => signOut({ callbackUrl: "/register" })}
          className="w-full bg-gray-200"
        >
          ログアウト
        </Button>
      </div>
      {/* 課金履歴 */}
      <div className="card p-4">
        <div className="font-semibold mb-3">課金履歴</div>
        {billingHistory.length === 0 ? (
          <p className="text-muted">履歴はありません</p>
        ) : (
          <ul className="space-y-1">
            {billingHistory.map((b, i) => (
              <li key={i} className="text-sm">
                {b.date} - ¥{b.amount}（プレミアム更新）
              </li>
            ))}
          </ul>
        )}
      </div>
      {/* 危険ゾーン */}
      <div className="rounded-2xl border p-4 bg-red-50 dark:bg-red-900 shadow">
        <div className="font-semibold text-red-600 dark:text-red-300 mb-3">
          アカウント削除
        </div>
        <Button
          onClick={handleDeleteAccount}
          className="w-full bg-red-600 text-white hover:bg-red-700"
        >
          アカウントを削除
        </Button>
      </div>
      {/* ✅ 常時下部タブ表示 */}
      <NavBar />

      <ProModal open={showProModal} onClose={() => setShowProModal(false)} />
      <ProThankYouModal
        open={showThankYouModal}
        onClose={() => setShowThankYouModal(false)}
      />
    </div>
  );
}
