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
  const router = useRouter(); // To clear query params
  const [isPro, setIsPro] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (open) {
      // ユーザーセッションと状態を更新・再確認
      const checkStatus = async () => {
        setLoading(true);
        // next-authのセッション更新を試みる
        const session = await update();

        // 追加でユーザーAPIがあればそこから最新のisProを取るのが確実
        // 今回はとりあえずセッション更新を信頼しつつ、少し待機して再チェックするロジックも想定
        // (簡易実装として session.user.isPro が更新されていることを期待)

        // ※ next-auth の update() はサーバーから新しいセッション情報を取得する

        // もし別途APIで確認するならここで fetch("/api/user/me") など

        if (session?.user?.isPro) {
          setIsPro(true);
        }
        setLoading(false);
      };

      checkStatus();
    }
  }, [open, update]);

  const handleClose = () => {
    // クエリパラメータを削除して閉じる
    router.replace("/settings");
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-center text-orange-500">
            ありがとうございます！！
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4 text-center">
          {isPro ? (
            // Pro反映済み
            <div className="space-y-4">
              <div className="text-5xl">🎉</div>
              <p className="font-bold text-lg">
                登録完了。Pro特典が有効になりました。
              </p>
            </div>
          ) : (
            // まだ反映待ち or ローディング
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
                <p className="text-sm text-gray-500 animate-pulse">
                  設定画面を更新しています...
                </p>
              )}
              {!loading && !isPro && (
                <p className="text-sm text-orange-600 bg-orange-50 p-2 rounded">
                  登録を受け取りました。反映まで数十秒かかることがあります。
                  <br />
                  ページを更新してください。
                </p>
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
