//app/components/ProThankYouModal.tsx
"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/app/components/ui/dialog";
import { Button } from "@/app/components/ui/button";

interface ProThankYouModalProps {
  open: boolean;
  onClose: () => void;
}

export default function ProThankYouModal({
  open,
  onClose,
}: ProThankYouModalProps) {
  const handleOK = () => {
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-md card">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-center text-orange-500">
            ありがとうございます！！
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4 text-center">
          <div className="space-y-4">
            <div className="text-5xl">🎉</div>
            <p className="font-bold text-lg">
              登録完了。Pro特典が有効になりました。
            </p>
            <p>
              このアプリは、高校生が一人でコツコツ作っています。
              <br />
              いただいたPro登録は、サーバー代と、
              <br />
              より良い機能開発に使わせていただきます。
              <br />
              ありがとうございます！
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            onClick={handleOK}
            className="w-full border-2 border-gray-300 hover:border-gray-400"
          >
            閉じる
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
