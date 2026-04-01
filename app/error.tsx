"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();

  useEffect(() => {
    // エラーログを記録
    console.error("Application error:", error);
    
    // 致命的なエラーの場合は自動クリーンアップ
    if (isCriticalError(error)) {
      performEmergencyCleanup();
    }
  }, [error]);

  const isCriticalError = (error: Error): boolean => {
    const criticalPatterns = [
      /chunk/i,
      /loading/i,
      /network error/i,
      /hydration/i,
      /404/i,
      /500/i,
    ];
    
    return criticalPatterns.some(pattern => 
      pattern.test(error.message) || 
      pattern.test(error.stack || "")
    );
  };

  const performEmergencyCleanup = () => {
    try {
      const keysToKeep = ['theme', 'user-preferences'];
      
      Object.keys(localStorage).forEach(key => {
        if (!keysToKeep.includes(key)) {
          localStorage.removeItem(key);
        }
      });
      
      sessionStorage.clear();
    } catch (cleanupError) {
      console.error("Cleanup failed:", cleanupError);
    }
  };

  const handleClearCache = () => {
    performEmergencyCleanup();
    window.location.reload();
  };

  const handleGoHome = () => {
    performEmergencyCleanup();
    router.push("/home");
  };

  return (
    <div className="min-h-screen bg-[var(--background)] flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-[var(--surface-bg)] border border-[var(--surface-border)] rounded-2xl p-6 text-center shadow-lg">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        
        <h1 className="text-xl font-bold text-[var(--color-text-primary)] mb-2">
          アプリケーションエラー
        </h1>
        
        <p className="text-[var(--color-text-secondary)] mb-4 text-sm leading-relaxed">
          予期しないエラーが発生しました。申し訳ありません。
        </p>

        {process.env.NODE_ENV === "development" && (
          <details className="mb-4 text-left">
            <summary className="text-xs text-gray-500 cursor-pointer mb-2">
              エラー詳細（開発モード）
            </summary>
            <pre className="text-xs bg-gray-100 p-2 rounded overflow-auto max-h-32">
              {error.message}
              {error.stack && `\n\n${error.stack}`}
            </pre>
          </details>
        )}

        <div className="space-y-2">
          <button
            onClick={reset}
            className="w-full px-4 py-2 bg-[var(--accent)] text-white rounded-lg hover:opacity-90 transition-opacity text-sm font-medium"
          >
            再試行
          </button>
          
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={handleClearCache}
              className="px-4 py-2 bg-[var(--surface-border)] text-[var(--color-text-primary)] rounded-lg hover:bg-[var(--surface-bg)] transition-colors text-sm"
            >
              キャッシュをクリア
            </button>
            
            <button
              onClick={handleGoHome}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors text-sm"
            >
              ホームに戻る
            </button>
          </div>
        </div>

        <p className="text-xs text-[var(--color-text-muted)] mt-4">
          エラーが続く場合は、ブラウザを再起動するか、管理者にお問い合わせください。
        </p>
      </div>
    </div>
  );
}
