"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="p-6 bg-red-50 border border-red-200 rounded-lg text-center my-4">
          <h2 className="text-lg font-bold text-red-700 mb-2">
            エラーが発生しました
          </h2>
          <p className="text-red-600 mb-4 text-sm">
            {this.state.error?.message || "不明なエラーです"}
          </p>
          <button
            onClick={() => this.setState({ hasError: false })}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 text-sm"
          >
            再試行
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
