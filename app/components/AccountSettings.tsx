// GENERATED_BY_AI: 2026-03-25 antigravity
// app/components/AccountSettings.tsx
"use client";

import { useSession } from "next-auth/react";
import type { Session } from "next-auth";
import { useTheme } from "@/app/components/ThemeProvider";
import { useState, useEffect, useRef } from "react";
import { useNativeSelect } from "@/app/hooks/useNativeSelect";

import ProfileSection from "./account/ProfileSection";
import SubscriptionSection from "./account/SubscriptionSection";
import SecuritySection from "./account/SecuritySection";

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
  const { data: session, status, update } = useSession();
  const { theme, setTheme } = useTheme();
  const [isSyncing, setIsSyncing] = useState(false);
  const [cachedSession] = useState<Session | null>(null);
  const didSyncSession = useRef(false);
  const { getSelectClassName } = useNativeSelect();

  // 表示用のセッションデータ
  const displaySession = session ?? cachedSession;

  useEffect(() => {
    if (status === "authenticated" && !didSyncSession.current) {
      didSyncSession.current = true;
      setIsSyncing(true);
      void (async () => {
        try {
          await fetch("/api/billing-sync", {
            method: "POST",
            credentials: "include",
            cache: "no-store",
          });
        } catch {
          // ignore sync errors
        } finally {
          setIsSyncing(false);
        }
      })();
    }
  }, [status]);

  if (status === "loading" && !cachedSession) return <SettingsSkeleton />;
  if (!displaySession?.user) return <div>ログインしてください</div>;

  return (
    <div className="space-y-8 max-w-2xl mx-auto pb-24 px-4">
      <SubscriptionSection displaySession={displaySession} isSyncing={isSyncing} />

      <ProfileSection displaySession={displaySession} updateSession={update} />

      {/* Theme Settings */}
      <section>
        <h2 className="text-xl font-bold mb-4">表示設定</h2>
        <div className="card">
          <div className="font-semibold mb-2">画面テーマ</div>
          <select
            value={theme}
            onChange={(e) => setTheme(e.target.value as "system" | "light" | "dark")}
            className={getSelectClassName()}
          >
            <option value="system">OSに合わせる</option>
            <option value="light">ライト</option>
            <option value="dark">ダーク</option>
          </select>
        </div>
      </section>

      {/* Other Settings */}
      <section>
        <h2 className="text-xl font-bold mb-4">その他</h2>
        <div className="card legal-links">
          <a href="/settings/support" className="legal-link">
            <span className="legal-link__label">サポート・お問い合わせ</span>
            <span className="legal-link__arrow">→</span>
          </a>
        </div>
      </section>

      {/* Legal Information */}
      <section>
        <h2 className="text-xl font-bold mb-4">法的事項</h2>
        <div className="card legal-links">
          <a href="/terms" className="legal-link">
            <span className="legal-link__label">利用規約</span>
            <span className="legal-link__arrow">→</span>
          </a>
          <div className="legal-divider"></div>
          <a href="/privacy" className="legal-link">
            <span className="legal-link__label">プライバシーポリシー</span>
            <span className="legal-link__arrow">→</span>
          </a>
          <div className="legal-divider"></div>
          <a href="/tokusho" className="legal-link">
            <span className="legal-link__label">特定商取引法に基づく表記</span>
            <span className="legal-link__arrow">→</span>
          </a>
        </div>
      </section>

      <SecuritySection />
    </div>
  );
}
