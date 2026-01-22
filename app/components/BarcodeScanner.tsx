//app/components/BarcodeScanner.tsx
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
  const codeReaderRef = useRef<
    (BrowserMultiFormatReader & { reset?: () => void }) | null
  >(null);

  const [supported, setSupported] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [loading, setLoading] = useState(false); // 🆕 API呼び出し中

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

              // 🆕 カメラを一時停止してAPI呼び出し
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
                  });

                  stopScanner();
                  setBarcodeOpen(false);
                  onClose?.();
                } else {
                  // エラーハンドリング
                  alert(
                    data.error ||
                      "商品情報が見つかりませんでした。手動で入力してください。",
                  );
                  setLoading(false);
                }
              } catch (err) {
                console.error("Barcode API error:", err);
                alert("通信エラーが発生しました。もう一度お試しください。");
                setLoading(false);
              }

              // 既存のコールバック（互換性維持）
              if (onDetected) await onDetected(code);
            }

            if (err && err.name !== "NotFoundException") {
              console.warn("バーコード読み取りエラー:", err);
            }
          },
        );

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
  }, [visible, onDetected, onClose, setBarcodeOpen, openAddModal]);

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
            {/* バーコードガイドオーバーレイ */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-32 h-32 border-2 border-white/30 rounded-lg flex items-center justify-center">
                <div className="w-full h-4 bg-white/20 rounded-sm"></div>
              </div>
            </div>

            {/* ローディング表示 🆕 */}
            {loading && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/70">
                <div className="text-center">
                  <div className="animate-spin h-8 w-8 border-4 border-white border-t-transparent rounded-full mx-auto mb-2"></div>
                  <p className="text-sm">商品情報を取得中...</p>
                </div>
              </div>
            )}

            {(supported === null || !cameraReady) && !loading && (
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
