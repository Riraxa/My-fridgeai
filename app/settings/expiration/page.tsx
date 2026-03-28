//app/settings/expiration/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function ExpirationSettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isPro, setIsPro] = useState<boolean | null>(null);

  const [settings, setSettings] = useState({
    expirationCriticalDays: 2,
    expirationWarningDays: 5,
    expirationPriorityWeight: 0.7,
  });

  useEffect(() => {
    async function fetchData() {
      try {
        // Check user plan
        const userRes = await fetch("/api/user/me");
        if (userRes.ok) {
          const userData = await userRes.json();
          setIsPro(userData.user?.plan === "PRO");
        } else {
          setIsPro(false);
        }

        // Fetch settings
        const res = await fetch("/api/settings/expiration");
        const data = await res.json();
        if (data.expirationCriticalDays !== undefined) {
          setSettings({
            expirationCriticalDays: data.expirationCriticalDays,
            expirationWarningDays: data.expirationWarningDays,
            expirationPriorityWeight: data.expirationPriorityWeight,
          });
        }
      } catch (err) {
        console.error(err);
        setIsPro(false);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/settings/expiration", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      if (res.ok) {
        alert("設定を保存しました");
        router.refresh();
      } else {
        alert("保存に失敗しました");
      }
    } catch (e) {
      console.error(e);
      alert("エラーが発生しました");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center pb-32">
        <div className="text-gray-500">読み込み中...</div>
      </div>
    );
  }

  // Not Pro - redirect or show message
  if (!isPro) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-2xl pb-32">
        <h1 className="text-2xl font-bold mb-6 text-gray-900 flex items-center gap-2">
          <span>⚡</span> 賞味期限優先度設定
        </h1>

        <div className="bg-[var(--background)] rounded-xl shadow-sm border p-8 text-center">
          <div className="text-6xl mb-4">🔒</div>
          <h2 className="text-xl font-bold mb-2">Proプラン限定機能です</h2>
          <p className="text-gray-600 mb-6">
            賞味期限の優先度設定は、
            <br />
            Proプランにアップグレードするとご利用いただけます。
          </p>
          <button
            onClick={() => router.push("/settings/account")}
            className="bg-[var(--semantic-indigo)] text-[#ffffff] font-bold py-3 px-8 rounded-full shadow-lg hover:bg-indigo-700 transition-colors"
          >
            Proプランにアップグレード
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl pb-32">
      <h1 className="text-2xl font-bold mb-6 text-gray-900 flex items-center gap-2">
        <span>⚡</span> 賞味期限優先度設定
      </h1>

      <div className="bg-[var(--background)] rounded-xl shadow-sm border p-6 space-y-8">
        {/* Critical Days */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            最優先で消費する期限（残り日数）
          </label>
          <div className="flex items-center gap-4">
            <input
              type="range"
              min="1"
              max="5"
              value={settings.expirationCriticalDays}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  expirationCriticalDays: Number(e.target.value),
                })
              }
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-red-600"
            />
            <span className="text-xl font-bold text-red-600 w-12 text-center">
              {settings.expirationCriticalDays}日
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            これ以下の日数の食材は「最優先」リストに含まれます。
          </p>
        </div>

        {/* Warning Days */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            優先的に消費する期限（残り日数）
          </label>
          <div className="flex items-center gap-4">
            <input
              type="range"
              min={settings.expirationCriticalDays + 1}
              max="14"
              value={settings.expirationWarningDays}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  expirationWarningDays: Number(e.target.value),
                })
              }
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-amber-500"
            />
            <span className="text-xl font-bold text-amber-600 w-12 text-center">
              {settings.expirationWarningDays}日
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            最優先〜この日数の食材は「優先」リストに含まれます。
          </p>
        </div>

        {/* Priority Weight */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            AIによる採用率（優先度）
          </label>
          <div className="flex items-center gap-4">
            <input
              type="range"
              min="0.1"
              max="1.0"
              step="0.1"
              value={settings.expirationPriorityWeight}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  expirationPriorityWeight: Number(e.target.value),
                })
              }
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
            />
            <span className="text-xl font-bold text-indigo-600 w-16 text-center">
              {Math.round(settings.expirationPriorityWeight * 100)}%
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            AIが献立を考える際に、期限切れ間近の食材をどれくらい強制的に使うかを調整します。
            <br />
            高くするほど無理やり使おうとしますが、献立の自然さが下がる可能性があります。
          </p>
        </div>

        <div className="pt-4 border-t">
          <button
            onClick={handleSave}
            disabled={saving}
            className={`w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${saving ? "bg-indigo-400" : "bg-indigo-600 hover:bg-indigo-700"
              } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500`}
          >
            {saving ? "保存中..." : "設定を保存する"}
          </button>
        </div>
      </div>

      <div className="text-center mt-6">
        <a
          href="/menu/generate"
          className="text-indigo-600 hover:text-indigo-800 text-sm"
        >
          ← 献立生成に戻る
        </a>
      </div>
    </div>
  );
}
