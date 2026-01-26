// app/components/StablePageWrapper.tsx
"use client";
import { useEffect, useState, ReactNode } from "react";

interface StablePageWrapperProps {
  children: ReactNode;
  fallback?: ReactNode;
  loadingComponent?: ReactNode;
}

// 設定画面の同期中と同じ仕組み：形を崩さずに裏で更新
export default function StablePageWrapper({
  children,
  fallback,
  loadingComponent,
}: StablePageWrapperProps) {
  const [isReady, setIsReady] = useState(false);
  const [displayContent, setDisplayContent] = useState<ReactNode>(fallback);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // 初回マウント時は即表示
    if (!isReady && children) {
      setDisplayContent(children);
      setIsReady(true);
      return;
    }

    // データ更新時は現在の表示を維持
    if (children && children !== displayContent) {
      setIsLoading(true);
      // 少し遅延して更新（ちらつき防止）
      const timer = setTimeout(() => {
        setDisplayContent(children);
        setIsLoading(false);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [children, displayContent, isReady]);

  return (
    <div className="relative">
      {displayContent}
      {isLoading && loadingComponent && (
        <div className="absolute top-4 right-4 z-10">{loadingComponent}</div>
      )}
    </div>
  );
}
