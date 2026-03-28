"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";
import { useRouter } from "next/navigation";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
  retryCount: number;
}

class ErrorBoundary extends Component<Props, State> {
  public override state: State = {
    hasError: false,
    retryCount: 0,
  };

  private maxRetries = 3;

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, retryCount: 0 };
  }

  public override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
    this.setState({ errorInfo });
    
    // エラー情報を外部に送信（オプション）
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // 致命的なエラーの場合は自動的にクリーンアップ
    if (this.isCriticalError(error)) {
      this.performEmergencyCleanup();
    }
  }

  private isCriticalError(error: Error): boolean {
    // 致命的なエラーを判定
    const criticalPatterns = [
      /chunk.*failed/i,
      /loading.*chunk/i,
      /network.*error/i,
      /hydration/i,
      /404/i,
      /500/i,
    ];
    
    return criticalPatterns.some(pattern => 
      pattern.test(error.message) || 
      pattern.test(error.stack || "")
    );
  }

  private performEmergencyCleanup = () => {
    try {
      // 安全なストレージクリーンアップ
      const keysToKeep = ['theme', 'user-preferences'];
      
      // localStorageのクリーンアップ（重要なキーは保持）
      Object.keys(localStorage).forEach(key => {
        if (!keysToKeep.includes(key)) {
          localStorage.removeItem(key);
        }
      });
      
      // sessionStorageは完全にクリア
      sessionStorage.clear();
      
      console.log("Emergency cleanup completed");
    } catch (cleanupError) {
      console.error("Cleanup failed:", cleanupError);
    }
  };

  private handleRetry = () => {
    if (this.state.retryCount < this.maxRetries) {
      this.setState(prevState => ({
        hasError: false,
        error: undefined,
        errorInfo: undefined,
        retryCount: prevState.retryCount + 1,
      }));
    } else {
      // 最大リトライ回数を超えたらクリーンアップしてホームに
      this.performEmergencyCleanup();
      window.location.href = "/home";
    }
  };

  private handleClearCache = () => {
    this.performEmergencyCleanup();
    window.location.reload();
  };

  private handleGoHome = () => {
    this.performEmergencyCleanup();
    window.location.href = "/home";
  };

  public override render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="min-h-screen bg-[var(--background)] flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-[var(--surface-bg)] border border-[var(--surface-border)] rounded-2xl p-6 text-center shadow-lg">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            
            <h2 className="text-xl font-bold text-[var(--color-text-primary)] mb-2">
              エラーが発生しました
            </h2>
            
            <p className="text-[var(--color-text-secondary)] mb-4 text-sm leading-relaxed">
              {this.state.error?.message ?? "不明なエラーが発生しました"}
            </p>

            {process.env.NODE_ENV === "development" && this.state.errorInfo && (
              <details className="mb-4 text-left">
                <summary className="text-xs text-gray-500 cursor-pointer mb-2">
                  エラー詳細（開発モード）
                </summary>
                <pre className="text-xs bg-gray-100 p-2 rounded overflow-auto max-h-32">
                  {this.state.errorInfo.componentStack}
                </pre>
              </details>
            )}

            <div className="space-y-2">
              <button
                onClick={this.handleRetry}
                className="w-full px-4 py-2 bg-[var(--accent)] text-white rounded-lg hover:opacity-90 transition-opacity text-sm font-medium"
                disabled={this.state.retryCount >= this.maxRetries}
              >
                {this.state.retryCount >= this.maxRetries ? "リトライ上限" : `再試行 (${this.state.retryCount + 1}/${this.maxRetries})`}
              </button>
              
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={this.handleClearCache}
                  className="px-4 py-2 bg-[var(--surface-border)] text-[var(--color-text-primary)] rounded-lg hover:bg-[var(--surface-bg)] transition-colors text-sm"
                >
                  キャッシュをクリア
                </button>
                
                <button
                  onClick={this.handleGoHome}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors text-sm"
                >
                  ホームに戻る
                </button>
              </div>
            </div>

            <p className="text-xs text-[var(--color-text-muted)] mt-4">
              エラーが続く場合は、ページを再読み込みするか、キャッシュをクリアしてください。
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
