// app/SessionWrapper.tsx
"use client";

import { SessionProvider } from "next-auth/react";

export default function SessionWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SessionProvider
      basePath="/api/auth"
      refetchInterval={5 * 60} // 5分ごとにリフレッシュ（セッション安定性のため）
      refetchOnWindowFocus={true} // ウィンドウフォーカス時のリフレッシュを有効化
    >
      {children}
    </SessionProvider>
  );
}
