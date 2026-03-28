// GENERATED_BY_AI: 2026-03-28 Notification Settings Page
'use client';

import { useState, useEffect } from 'react';
import { Bell, BellOff, Loader2, Check, AlertCircle, Info } from 'lucide-react';
import { usePushNotification } from '@/lib/hooks/usePushNotification';
import { motion } from 'framer-motion';

export default function NotificationSettingsPage() {
  const {
    isSupported,
    isSubscribed,
    isLoading,
    error,
    subscribe,
    unsubscribe,
  } = usePushNotification();

  const [mounted, setMounted] = useState(false);
  const [debugInfo, setDebugInfo] = useState<string>('');
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    setMounted(true);
    // iOS判定
    const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) || 
                (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    setIsIOS(ios);
    // PWA判定（ホーム画面に追加されているか）
    const standalone = window.matchMedia('(display-mode: standalone)').matches || 
                       (window as any).navigator?.standalone === true;
    setIsStandalone(standalone);
    
    // デバッグ情報収集
    const info = [
      `UserAgent: ${navigator.userAgent.slice(0, 50)}...`,
      `Platform: ${navigator.platform}`,
      `ServiceWorker: ${'serviceWorker' in navigator}`,
      `PushManager: ${'PushManager' in window}`,
      `Notification: ${'Notification' in window}`,
      `Permission: ${Notification?.permission || 'N/A'}`,
      `iOS: ${ios}`,
      `Standalone: ${standalone}`,
    ].join('\n');
    setDebugInfo(info);
  }, []);

  if (!mounted) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <Loader2 className="animate-spin text-indigo-500" size={24} />
      </div>
    );
  }

  if (!isSupported) {
    return (
      <main className="pb-24 px-4 w-full">
        <h2 className="text-xl font-bold mb-6" style={{ color: 'var(--color-text-primary)' }}>
          通知設定
        </h2>

        <div
          className="p-6 rounded-3xl shadow-sm"
          style={{
            background: 'var(--surface-bg)',
            border: '1px solid var(--surface-border)',
          }}
        >
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 rounded-2xl bg-amber-100">
              <BellOff size={24} className="text-amber-600" />
            </div>
            <div>
              <h3 className="font-bold text-amber-800">プッシュ通知を使うには</h3>
              <p className="text-sm text-amber-700">このブラウザでは通知を使用するために、追加の手順が必要です</p>
            </div>
          </div>

          <div className="space-y-4 text-sm text-slate-700">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <p className="font-bold mb-2">💡 ホーム画面に追加してください</p>
              <p className="text-slate-600 mb-3">
                プッシュ通知を使用するには、アプリを「ホーム画面に追加」してPWAとして使用する必要があります。
              </p>
              <ol className="list-decimal list-inside space-y-1.5 text-slate-600 ml-1">
                <li>ブラウザのメニュー（⋮ または 共有ボタン）を開く</li>
                <li>「ホーム画面に追加」または「アプリとしてインストール」を選択</li>
                <li>追加されたアイコンからアプリを開く</li>
                <li>再度この画面で「ON」をタップ</li>
              </ol>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <p className="font-bold mb-2">🔧 対応ブラウザ</p>
              <ul className="space-y-1.5 text-slate-600">
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  Google Chrome
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  Microsoft Edge
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  最新版Safari
                </li>
              </ul>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="pb-24 px-4 w-full">
      <h2 className="text-xl font-bold mb-6" style={{ color: 'var(--color-text-primary)' }}>
        通知設定
      </h2>

      <div
        className="p-6 rounded-3xl shadow-sm space-y-6"
        style={{
          background: 'var(--surface-bg)',
          border: '1px solid var(--surface-border)',
        }}
      >
        {/* プッシュ通知セクション */}
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <div className={`p-3 rounded-2xl ${isSubscribed ? 'bg-indigo-100' : 'bg-slate-100'}`}>
              {isSubscribed ? (
                <Bell size={24} className="text-indigo-600" />
              ) : (
                <BellOff size={24} className="text-slate-400" />
              )}
            </div>
            <div>
              <h3 className="font-bold" style={{ color: 'var(--color-text-primary)' }}>
                プッシュ通知
              </h3>
              <p className="text-sm mt-1" style={{ color: 'var(--color-text-secondary)' }}>
                {isSubscribed
                  ? '賞味期限アラートなどの通知を受け取っています'
                  : 'アプリを閉じていても通知を受け取れます'}
              </p>
            </div>
          </div>

          <button
            onClick={isSubscribed ? unsubscribe : subscribe}
            disabled={isLoading}
            className={`relative px-4 py-2 rounded-full text-sm font-bold transition-all duration-200 ${
              isSubscribed
                ? 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-200'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {isLoading ? (
              <Loader2 size={16} className="animate-spin" />
            ) : isSubscribed ? (
              'OFF'
            ) : (
              'ON'
            )}
          </button>
        </div>

        {/* iOSガイダンス */}
        {isIOS && !isStandalone && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-start gap-3 p-4 rounded-2xl bg-amber-50 border border-amber-200"
          >
            <Info size={20} className="text-amber-600 shrink-0 mt-0.5" />
            <div className="text-sm text-amber-800">
              <p className="font-bold mb-1">iOSで通知を使うには</p>
              <p className="mb-2">iOSではプッシュ通知を使用するために、以下の手順が必要です：</p>
              <ol className="list-decimal list-inside space-y-1 ml-2">
                <li>Safariの共有ボタンをタップ</li>
                <li>「ホーム画面に追加」を選択</li>
                <li>ホーム画面に追加されたアイコンから開く</li>
                <li>再度「ON」ボタンを押す</li>
              </ol>
            </div>
          </motion.div>
        )}

        {/* エラー表示 */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-start gap-3 p-4 rounded-2xl bg-red-50 border border-red-100"
          >
            <AlertCircle size={20} className="text-red-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-red-700 font-bold mb-1">エラーが発生しました</p>
              <p className="text-sm text-red-600">{error}</p>
            </div>
          </motion.div>
        )}

        {/* ステータス表示 */}
        <div className="pt-4 border-t" style={{ borderColor: 'var(--surface-border)' }}>
          <div className="flex items-center gap-2 text-sm">
            <div
              className={`w-2 h-2 rounded-full ${
                isSubscribed ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'
              }`}
            />
            <span style={{ color: 'var(--color-text-secondary)' }}>
              現在の状態: {isSubscribed ? '通知を受け取っています' : '通知を受け取っていません'}
            </span>
          </div>
        </div>

        {/* 通知内容の説明 */}
        <div
          className="p-4 rounded-2xl"
          style={{ background: 'var(--background)', border: '1px solid var(--surface-border)' }}
        >
          <h4 className="font-bold text-sm mb-3" style={{ color: 'var(--color-text-primary)' }}>
            受け取れる通知
          </h4>
          <ul className="space-y-2 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
            <li className="flex items-center gap-2">
              <Check size={14} className="text-emerald-500" />
              賞味期限が近づいた食材のアラート
            </li>
            <li className="flex items-center gap-2">
              <Check size={14} className="text-emerald-500" />
              AI献立生成の完了通知
            </li>
            <li className="flex items-center gap-2">
              <Check size={14} className="text-emerald-500" />
              その他アプリからの重要なお知らせ
            </li>
          </ul>
        </div>
      </div>

      {/* 注意事項 */}
      <p className="mt-6 text-xs text-center" style={{ color: 'var(--color-text-muted)' }}>
        ※通知設定はいつでも変更できます。ブラウザの設定からも通知を管理できます。
      </p>
      
      {/* デバッグ情報（開発用） */}
      {process.env.NODE_ENV === 'development' && (
        <details className="mt-4 text-xs" style={{ color: 'var(--color-text-muted)' }}>
          <summary className="cursor-pointer">デバッグ情報</summary>
          <pre className="mt-2 p-2 rounded bg-slate-100 overflow-x-auto whitespace-pre-wrap">
            {debugInfo}
          </pre>
        </details>
      )}
    </main>
  );
}
