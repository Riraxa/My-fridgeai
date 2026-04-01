import SupportForm from "@/app/components/SupportForm";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function SupportPage() {
  return (
    <div className="px-4 py-8">
      {/* 戻るボタン */}
      <Link
        href="/settings/account"
        className="inline-flex items-center justify-center w-10 h-10 rounded-full transition-all hover:scale-[1.05] active:scale-[0.95]"
        style={{
          background: 'var(--surface-bg)',
          border: '1px solid var(--surface-border)',
          color: 'var(--color-text-secondary)',
        }}
        aria-label="アカウント設定に戻る"
      >
        <ArrowLeft size={18} />
      </Link>
      <SupportForm />
    </div>
  );
}
