"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/app/components/ui/button";
import { toast } from "sonner"; // Using sonner as seen in package.json

export default function JoinForm({ token }: { token: string }) {
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleJoin = async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/household/join", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ token }),
            });
            const data = await res.json();

            if (!res.ok) {
                toast.error(data.error || "参加に失敗しました");
            } else {
                toast.success("家族グループに参加しました！");
                router.push("/settings/family");
                router.refresh();
            }
        } catch (_e) {
            toast.error("ネットワークエラーが発生しました");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="card border p-6 rounded-lg text-center space-y-4" style={{ background: "var(--surface-bg)", borderColor: "var(--surface-border)" }}>
            <p style={{ color: "var(--color-text-secondary)" }}>
                招待リンクから家族グループに参加しますか？
            </p>
            <Button onClick={handleJoin} disabled={loading} className="w-full">
                {loading ? "参加中..." : "参加する"}
            </Button>
        </div>
    );
}
