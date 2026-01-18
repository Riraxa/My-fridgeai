//app/settings/layout.tsx
"use client";

import Tabs from "@/app/components/Tabs";
import NavBar from "@/app/components/NavBar";
import ProThankYouModal from "@/app/components/ProThankYouModal";
import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Suspense } from "react";

function SettingsLayoutContent({ children }: { children: React.ReactNode }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [showThankYouModal, setShowThankYouModal] = useState(false);

  useEffect(() => {
    const proStatus = searchParams.get("pro");
    if (proStatus === "success") {
      setShowThankYouModal(true);
    } else if (proStatus === "cancel") {
      alert("Pro登録をキャンセルしました。");
      router.replace("/settings/account");
    }
  }, [searchParams, router]);

  return (
    <div className="relative min-h-screen pb-20">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-6">設定</h1>
        <Tabs />
        {children}
      </div>
      <NavBar />
      <ProThankYouModal
        open={showThankYouModal}
        onClose={() => setShowThankYouModal(false)}
      />
    </div>
  );
}

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense fallback={null}>
      <SettingsLayoutContent>{children}</SettingsLayoutContent>
    </Suspense>
  );
}
