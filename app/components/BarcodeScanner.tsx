// app/components/BarcodeScanner.tsx
"use client";

import React, { useRef, useEffect, useState } from "react";
import { BrowserMultiFormatReader } from "@zxing/browser";
import { useFridge } from "./FridgeProvider";

export default function BarcodeScanner({
  visible,
  onDetected,
  onClose,
}: {
  visible: boolean;
  onDetected?: (code: string) => void;
  onClose?: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // reset() が型定義に無い問題 → 型拡張で安全に扱う
  const codeReaderRef = useRef<
    (BrowserMultiFormatReader & { reset?: () => void }) | null
  >(null);

  const [supported, setSupported] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cameraReady, setCameraReady] = useState(false);

  const { setBarcodeOpen } = useFridge();

  useEffect(() => {
    if (!visible) return;

    let active = true;

    const init = async () => {
      // video要素がDOMに確実に追加されるまで待機
      let attempts = 0;
      while (!videoRef.current && attempts < 10) {
        await new Promise((resolve) => setTimeout(resolve, 50));
        attempts++;
      }

      try {
        // HTTPSチェック
        if (
          location.protocol !== "https:" &&
          location.hostname !== "localhost"
        ) {
          throw new Error("カメラを使用するにはHTTPS接続が必要です");
        }

        // video要素の存在確認
        if (!videoRef.current) {
          throw new Error(
            "ビデオ要素の準備に失敗しました。ページを再読み込みしてください。",
          );
        }

        const reader = new BrowserMultiFormatReader();
        codeReaderRef.current = reader;

        const devices = await BrowserMultiFormatReader.listVideoInputDevices();
        if (!devices || devices.length === 0) {
          throw new Error("カメラが見つかりません");
        }

        setSupported(true);

        const selectedDeviceId = devices[0].deviceId;

        await reader.decodeFromVideoDevice(
          selectedDeviceId,
          videoRef.current,
          async (result, err) => {
            if (!active) return;

            if (result) {
              const code = result.getText();
              console.log("バーコード検出:", code);

              if (onDetected) await onDetected(code);

              stopScanner();
              setBarcodeOpen(false);
              onClose?.();
            }

            if (err && err.name !== "NotFoundException") {
              console.warn("バーコード読み取りエラー:", err);
            }
          },
        );

        // カメラストリームが開始されたことを確認
        setTimeout(() => {
          if (videoRef.current && videoRef.current.readyState >= 2) {
            setCameraReady(true);
          } else {
            setError("カメラストリームの開始に失敗しました");
            setSupported(false);
          }
        }, 3000);
      } catch (e: any) {
        console.error("バーコードスキャナ初期化失敗:", e);

        // より詳細なエラーメッセージ
        let errorMessage = e?.message ?? "カメラ初期化に失敗しました";
        if (e?.name === "NotAllowedError") {
          errorMessage =
            "カメラへのアクセスが拒否されました。ブラウザの設定でカメラアクセスを許可してください。";
        } else if (e?.name === "NotFoundError") {
          errorMessage = "カメラデバイスが見つかりません。";
        } else if (e?.name === "NotReadableError") {
          errorMessage = "カメラが他のアプリケーションで使用されています。";
        }

        setError(errorMessage);
        setSupported(false);
      }
    };

    init();

    return () => {
      active = false;
      stopScanner();
    };
  }, [visible, onDetected, onClose, setBarcodeOpen]);

  // reset() は型定義に存在しないためカスタム型で処理
  const stopScanner = () => {
    const reader = codeReaderRef.current;
    reader?.reset?.();
    codeReaderRef.current = null;
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md rounded-2xl overflow-hidden bg-black p-6 text-white">
        {supported === false ? (
          <div>
            <p>{error ?? "このブラウザではバーコードが読み取れません"}</p>
            <button
              onClick={onClose}
              className="mt-4 rounded-full bg-white px-4 py-2 text-black"
            >
              閉じる
            </button>
          </div>
        ) : (
          <div className="relative">
            <video
              ref={videoRef}
              className="w-full h-64 object-cover"
              muted
              playsInline
              autoPlay
            />
            {(supported === null || !cameraReady) && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                <p>
                  {supported === null
                    ? "カメラを初期化しています…"
                    : "カメラを起動しています..."}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
