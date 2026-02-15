// app/settings/family/page.tsx
"use client";

import { useSession } from "next-auth/react";
import FamilyManagement from "@/app/components/FamilyManagement";

export default function FamilyPage() {
  const { data: session, status } = useSession();

  if (status === "loading") return <div>読み込み中...</div>;
  if (!session?.user) return <div>ログインが必要です</div>;

  const userPlan = (session.user as any).plan || "FREE";

  return (
    <div className="space-y-8 max-w-2xl mx-auto pb-24 px-4">
      <div className="card">
        <FamilyManagement userPlan={userPlan} />
      </div>
    </div>
  );
}
