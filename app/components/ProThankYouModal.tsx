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
            本当にありがとうございます
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4 text-center">
          <div className="space-y-4">
            <div className="text-5xl">🎉</div>
            <p className="font-bold text-lg">Pro登録が完了しました。</p>
            <p>
              あなたの選択で、My-FridgeAIは一歩前に進みました。
              <br />
              Pro登録によるご支援は、AIの精度向上や
              <br />
              サーバーの安定化、新機能の開発に使われます。
            </p>
            <p>
              このアプリは、高校生が一人で
              <br />
              「冷蔵庫のムダを減らしたい」という思いだけで
              <br />
              作り続けています。
            </p>
            <p>
              今日からあなたは、
              <br />
              このアプリを一緒に育ててくれる
              <br />
              大切な応援者の一人です。
            </p>
            <p>
              これからもっと便利に、もっと賢くしていきます。
              <br />
              その成長を、ぜひ見守ってください。
              <br />
              改めて、本当にありがとうございます。
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
