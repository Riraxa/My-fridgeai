//app/components/ProThankYouModal.tsx
"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/app/components/ui/dialog";
import { Button } from "@/app/components/ui/button";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

interface ProThankYouModalProps {
  open: boolean;
  onClose: () => void;
}

export default function ProThankYouModal({
  open,
  onClose,
}: ProThankYouModalProps) {
  const { update } = useSession();
  const router = useRouter();
  const [isPro, setIsPro] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!open) return;

    const checkStatus = async () => {
      setLoading(true);
      const session = await update();
      if (session?.user?.isPro) {
        setIsPro(true);
      }
      setLoading(false);
    };

    checkStatus();
  }, [open, update]);

  const handleClose = () => {
    router.replace("/settings");
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md card">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-center text-orange-500">
            ありがとうございます！！
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4 text-center">
          {isPro ? (
            /* Pro 反映済み */
            <div className="space-y-4">
              <div className="text-5xl">🎉</div>
              <p className="font-bold text-lg">
                登録完了。Pro特典が有効になりました。
              </p>
            </div>
          ) : (
            /* 反映待ち */
            <div className="space-y-4">
              <p>
                このアプリは、高校生が一人でコツコツ作っています。
                <br />
                いただいたPro登録は、サーバー代と、
                <br />
                より良い機能開発に使わせていただきます。
                <br />
                ありがとうございます！
              </p>

              {loading && (
                <p
                  className="text-sm animate-pulse"
                  style={{ color: "var(--color-text-muted)" }}
                >
                  設定画面を更新しています...
                </p>
              )}

              {!loading && !isPro && (
                <div
                  className="text-sm p-3 rounded-md"
                  style={{
                    background:
                      "color-mix(in srgb, var(--accent) 12%, transparent)",
                    color: "var(--accent)",
                  }}
                >
                  登録を受け取りました。反映まで数十秒かかることがあります。
                  <br />
                  ページを更新してください。
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button onClick={handleClose} className="w-full">
            閉じる
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
