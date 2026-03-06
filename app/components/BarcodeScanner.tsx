//app/components/BarcodeScanner.tsx
"use client";

import React, { useRef, useEffect, useState } from "react";
import { BrowserMultiFormatReader } from "@zxing/browser";
import { useFridge } from "./FridgeProvider";
import { X, ScanLine } from "lucide-react"; // Import Icons

export default function BarcodeScanner({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose?: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const codeReaderRef = useRef<
    (BrowserMultiFormatReader & { reset?: () => void }) | null
  >(null);

  const [supported, setSupported] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [loading, setLoading] = useState(false);

  const { setBarcodeOpen, openAddModal } = useFridge();

  useEffect(() => {
    if (!visible) return;

    let active = true;

    const init = async () => {
      let attempts = 0;
      while (!videoRef.current && attempts < 10) {
        await new Promise((resolve) => setTimeout(resolve, 50));
        attempts++;
      }

      try {
        if (
          location.protocol !== "https:" &&
          location.hostname !== "localhost"
        ) {
          throw new Error("カメラを使用するにはHTTPS接続が必要です");
        }

        if (!videoRef.current) {
          throw new Error(
            "ビデオ要素の準備に失敗しました。ページを再読み込みしてください。",
          );
        }

        const reader = new BrowserMultiFormatReader();
        codeReaderRef.current = reader;

        // Force back camera (environment)
        const constraints = {
          video: {
            facingMode: { ideal: "environment" },
          },
        };

        setSupported(true);

        // decodeFromConstraints handles device selection better for "environment" preference
        await reader.decodeFromConstraints(
          constraints,
          videoRef.current,
          async (result, _err) => {
            if (!active) return;

            if (result) {
              const code = result.getText();
              console.log("バーコード検出:", code);

              // Only process one code at a time
              if (loading) return;

              setLoading(true);

              try {
                const res = await fetch("/api/barcode/lookup", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ barcode: code }),
                  credentials: "include",
                });

                const data = await res.json();

                if (res.ok && data.product) {
                  const { product } = data;

                  // 賞味期限計算
                  const expirationDate = product.expirationDays
                    ? new Date(
                      Date.now() +
                      product.expirationDays * 24 * 60 * 60 * 1000,
                    )
                      .toISOString()
                      .split("T")[0]
                    : null;

                  // AddItemModalをプリフィルで開く
                  openAddModal({
                    name: product.name,
                    category: product.category || "その他",
                    expirationDate,
                    barcode: code,
                    source: product.source,
                    ingredientType: product.ingredientType || "raw",
                  });

                  stopScanner();
                  setBarcodeOpen(false);
                  onClose?.();
                } else {
                  // Not found -> Do NOT add automatically. Just warn user.
                  alert(
                    data.error ||
                    "商品情報が見つかりませんでした。手動で入力してください。",
                  );
                  setLoading(false);
                }
              } catch (_err) {
                console.error("Barcode API error:", _err);
                alert("通信エラーが発生しました。もう一度お試しください。");
                setLoading(false);
              }
              // Removed onDetected callback to prevent external auto-add logic
            }
          },
        );

        setTimeout(() => {
          if (videoRef.current && videoRef.current.readyState >= 2) {
            setCameraReady(true);
          } else {
            // Sometimes it takes longer, but usually if it's playing it's fine.
            if (videoRef.current && !videoRef.current.paused) {
              setCameraReady(true);
            } else {
              // Fallback check
              setError("カメラストリームの開始に失敗しました");
              setSupported(false);
            }
          }
        }, 3000);
      } catch (e: any) {
        console.error("バーコードスキャナ初期化失敗:", e);

        let errorMessage = e?.message ?? "カメラ初期化に失敗しました";
        // Customize error messages
        if (
          e?.name === "NotAllowedError" ||
          e?.name === "PermissionDeniedError"
        ) {
          errorMessage =
            "カメラへのアクセスが拒否されました。設定で許可してください。";
        } else if (e?.name === "NotFoundError") {
          errorMessage =
            "カメラが見つかりませんでした。カメラが接続されているか確認してください。";
        } else if (e?.name === "NotReadableError" || e?.name === "AbortError") {
          errorMessage =
            "カメラが使用できません。他のアプリがカメラを使用している可能性があります。";
        } else if (e?.name === "OverconstrainedError") {
          errorMessage =
            "ご利用のカメラはサポートされていません。別のカメラをお試しください。";
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
  }, [visible, onClose, setBarcodeOpen, openAddModal, loading]);

  const stopScanner = () => {
    const reader = codeReaderRef.current;
    reader?.reset?.();
    codeReaderRef.current = null;
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black text-white">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-4 bg-black/80 backdrop-blur-sm z-20">
        <div className="flex items-center gap-2 font-bold text-lg">
          <ScanLine size={24} />
          <span>バーコード</span>
        </div>
        <button
          onClick={onClose}
          className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition"
        >
          <X size={24} />
        </button>
      </div>

      <div className="relative flex-1 bg-black overflow-hidden flex items-center justify-center">
        {supported === false ? (
          <div className="text-center p-6">
            <p className="mb-4 text-red-400">
              {error ?? "このブラウザではバーコードが読み取れません"}
            </p>
            <button
              onClick={onClose}
              className="px-6 py-2 rounded-full bg-white text-black font-medium"
            >
              閉じる
            </button>
          </div>
        ) : (
          <div className="relative w-full h-full flex flex-col">
            <video
              ref={videoRef}
              className="absolute inset-0 w-full h-full object-cover"
              muted
              playsInline
              autoPlay
            />

            {/* Dark overlay with cutout */}
            <div className="absolute inset-0 bg-black/50 z-10">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-48 bg-transparent box-shadow-cutout rounded-lg overflow-hidden border-2 border-white/50 shadow-[0_0_0_9999px_rgba(0,0,0,0.5)]">
                {/* Corner Markers */}
                <div className="absolute top-0 left-0 w-4 h-4 border-t-4 border-l-4 border-white"></div>
                <div className="absolute top-0 right-0 w-4 h-4 border-t-4 border-r-4 border-white"></div>
                <div className="absolute bottom-0 left-0 w-4 h-4 border-b-4 border-l-4 border-white"></div>
                <div className="absolute bottom-0 right-0 w-4 h-4 border-b-4 border-r-4 border-white"></div>

                {/* Laser Line Animation */}
                <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-transparent via-red-500/20 to-transparent animate-scan-line"></div>
                <div className="absolute top-1/2 left-0 w-full h-[2px] bg-red-500 shadow-[0_0_4px_rpba(255,0,0,0.8)] animate-scan-line-move"></div>
              </div>

              {/* Tips Text below the box */}
              <div className="absolute top-[calc(50%+6rem)] left-0 w-full text-center text-sm text-white/80 px-4">
                バーコードを枠内に合わせてください
              </div>
            </div>

            {/* Loading Overlay within camera area */}
            {loading && (
              <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/80 backdrop-blur-sm">
                <div className="text-center">
                  <div className="animate-spin h-10 w-10 border-4 border-white border-t-transparent rounded-full mx-auto mb-4"></div>
                  <p className="text-lg font-medium">商品情報を取得中...</p>
                </div>
              </div>
            )}

            {(supported === null || !cameraReady) && !loading && (
              <div className="absolute inset-0 z-20 flex items-center justify-center bg-black">
                <p className="animate-pulse">
                  {supported === null
                    ? "カメラを初期化しています…"
                    : "カメラを起動しています..."}
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer Instructions */}
      <div className="bg-black/90 p-4 pb-8 z-20 text-center">
        <p className="text-xs text-gray-400 mb-2">
          商品が見つからない場合は、画面右上の「＋」ボタンから手動で追加してください。
        </p>
      </div>

      <style jsx>{`
        .animate-scan-line {
          animation: scan 2s linear infinite;
        }
        @keyframes scan {
          0% {
            transform: translateY(-100%);
          }
          100% {
            transform: translateY(100%);
          }
        }
      `}</style>
    </div>
  );
}
