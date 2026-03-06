// app/AuthCheck.tsx
"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function AuthCheck({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    // パスキーエラー時はログイン画面に留まる
    const params = new URLSearchParams(window.location.search);
    if (params.get("error") === "PASSKEY_ONLY") return;

    if (status === "authenticated") {
      router.replace("/home");
    }
  }, [status, session, router]);

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        読み込み中…
      </div>
    );
  }

  if (status === "authenticated") {
    return null; // リダイレクト中
  }

  return <>{children}</>;
}
