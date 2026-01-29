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
      refetchInterval={0} // 自動リフレッシュを無効化
      refetchOnWindowFocus={false} // ウィンドウフォーカス時のリフレッシュを無効化
    >
      {children}
    </SessionProvider>
  );
}
