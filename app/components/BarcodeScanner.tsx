// app/components/BarcodeScanner.tsx
// GENERATED_BY_AI: 2026-03-24 Antigravity — 不明商品UX改善
"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import { Html5QrcodeScanner, Html5Qrcode } from "html5-qrcode";
import { X, Check, Camera, List, RefreshCw, AlertCircle, SearchX } from "lucide-react";

interface ScannedProduct {
  name: string;
  brand?: string;
  category?: string;
  barcode: string;
  isNotFound?: boolean;
}

interface BarcodeScannerProps {
  onResults: (items: ScannedProduct[]) => void;
  onClose: () => void;
}

export default function BarcodeScanner({ onResults, onClose }: BarcodeScannerProps) {
  const [isContinuous, setIsContinuous] = useState(false);
  const [scannedItems, setScannedItems] = useState<ScannedProduct[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastScanned, setLastScanned] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [notFoundMessage, setNotFoundMessage] = useState<string | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const notFoundTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const SCAN_REGION_ID = "barcode-scanner-region";

  // 不明商品通知を表示して3秒後に自動消去
  const showNotFound = useCallback((barcode: string) => {
    // 既存タイマーをクリア
    if (notFoundTimerRef.current) {
      clearTimeout(notFoundTimerRef.current);
    }
    setNotFoundMessage(`この商品はデータベースに登録されていません (${barcode})`);
    notFoundTimerRef.current = setTimeout(() => {
      setNotFoundMessage(null);
      setLastScanned(null); // 同じバーコードの再スキャンを許可
    }, 3000);
  }, []);

  // クリーンアップ
  useEffect(() => {
    return () => {
      if (notFoundTimerRef.current) {
        clearTimeout(notFoundTimerRef.current);
      }
    };
  }, []);

  const lookupBarcode = async (barcode: string): Promise<ScannedProduct> => {
    setLoading(true);
    try {
      const resp = await fetch(`/api/barcode/lookup?barcode=${barcode}`);
      const result = await resp.json();

      if (result.success) {
        return result.data as ScannedProduct;
      } else {
        return { name: `不明な商品 (${barcode})`, isNotFound: true, barcode };
      }
    } catch (err) {
      console.error("Lookup failed", err);
      return { name: `エラー (${barcode})`, isNotFound: true, barcode };
    } finally {
      setLoading(false);
    }
  };

  const handleScanSuccess = async (decodedText: string) => {
    if (decodedText === lastScanned) return;
    setLastScanned(decodedText);

    const product = await lookupBarcode(decodedText);

    if (product.isNotFound) {
      // 不明商品: 通知を表示してスキャン続行
      showNotFound(decodedText);
      // 単一モードでもスキャナーを停止しない（続行可能にする）
      return;
    }

    // 商品が見つかった場合
    setNotFoundMessage(null); // 通知をクリア
    if (!isContinuous) {
      stopScanner();
      onResults([product]);
    } else {
      setScannedItems((prev) => [...prev, product]);
      // Short delay before allowing same scan again
      setTimeout(() => setLastScanned(null), 3000);
    }
  };

  const startScanner = async () => {
    // 1. Barcode Detection API (ブラウザ標準) が使えるか確認
    if ("BarcodeDetector" in window) {
      try {
        // @ts-ignore
        const formats = await window.BarcodeDetector.getSupportedFormats();
        if (formats.includes("ean_13")) {
          startNativeScanner();
          return;
        }
      } catch (e) {
        console.warn("BarcodeDetector supported formats check failed, falling back to Html5Qrcode");
      }
    }

    // 2. Fallback: Html5Qrcode (JSライブラリ)
    startHtml5Scanner();
  };

  // 高性能なブラウザ標準スキャナー
  const startNativeScanner = async () => {
    try {
      // @ts-ignore
      const barcodeDetector = new window.BarcodeDetector({ formats: ["ean_13", "ean_8", "upc_a", "upc_e", "code_128"] });
      setIsScanning(true);
      setError(null);

      // ビデオストリームの取得とループ処理
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      const video = document.createElement("video");
      video.srcObject = stream;
      video.setAttribute("playsinline", "true");
      await video.play();

      // UIにビデオを表示
      const container = document.getElementById(SCAN_REGION_ID);
      if (container) {
        container.innerHTML = "";
        video.className = "w-full h-full object-cover";
        container.appendChild(video);
      }

      const detectLoop = async () => {
        if (!scannerRef.current && !video.paused) { // scannerRef.currentがnullの時をスキャン中とみなす（簡易実装）
          try {
            const barcodes = await barcodeDetector.detect(video);
            if (barcodes.length > 0) {
              await handleScanSuccess(barcodes[0].rawValue);
              if (!isContinuous) {
                stream.getTracks().forEach(t => t.stop());
                return;
              }
            }
          } catch (e) {
            console.error("Detection error", e);
          }
          requestAnimationFrame(detectLoop);
        }
      };
      
      // 停止用の参照を保持
      // @ts-ignore
      scannerRef.current = { 
        stop: async () => { 
          stream.getTracks().forEach(t => t.stop());
          video.pause();
          setIsScanning(false);
          if (container) container.innerHTML = "";
        },
        isScanning: true
      };

      detectLoop();
    } catch (err) {
      console.error("Native scanner failed", err);
      startHtml5Scanner(); // 失敗したらフォールバック
    }
  };

  const startHtml5Scanner = () => {
    // 認識する形式を絞って精度と速度を向上させる設定をコンストラクタに渡す
    const html5QrCode = new Html5Qrcode(SCAN_REGION_ID, {
      verbose: false,
      // @ts-ignore
      formatsToSupport: [0, 1, 6, 7], // EAN_13, EAN_8, UPC_A, UPC_E
    });
    // @ts-ignore
    scannerRef.current = html5QrCode;

    html5QrCode.start(
      { facingMode: "environment" },
      {
        fps: 15,
        qrbox: { width: 250, height: 150 },
      },
      handleScanSuccess,
      (errorMessage) => {
        // Quietly fail for frame errors
      }
    ).then(() => {
      setIsScanning(true);
      setError(null);
    }).catch((err: any) => {
      console.error("Scanner failed to start", err);
      setError("カメラの起動に失敗しました。以前の許可設定を確認してください。");
    });
  };

  const stopScanner = () => {
    if (scannerRef.current && (scannerRef.current as any).isScanning) {
      (scannerRef.current as any).stop().then(() => {
        setIsScanning(false);
        scannerRef.current = null;
      }).catch((err: any) => console.error("Failed to stop", err));
    }
  };

  useEffect(() => {
    startScanner();
    return () => {
      stopScanner();
    };
  }, []);

  const handleFinish = () => {
    stopScanner();
    onResults(scannedItems);
  };

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-black text-white p-4">
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-bold">バーコードスキャン</h2>
        <button onClick={onClose} className="p-2 bg-[var(--background)]/10 rounded-full">
          <X size={24} />
        </button>
      </div>

      {/* 不明商品通知バー */}
      {notFoundMessage && (
        <div
          className="mb-3 flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium animate-notify-slide-down"
          style={{
            background: "linear-gradient(135deg, #f59e0b22, #f59e0b11)",
            border: "1px solid #f59e0b44",
            color: "#fbbf24",
          }}
        >
          <SearchX size={20} className="flex-shrink-0" />
          <span>{notFoundMessage}</span>
        </div>
      )}

      {/* Scanner Region */}
      <div className="relative flex-1 bg-zinc-900 rounded-2xl overflow-hidden mb-6 flex items-center justify-center">
        <div id={SCAN_REGION_ID} className="w-full h-full" />
        
        {/* スキャン準備中のアイコン表示 */}
        {!isScanning && !loading && !error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-zinc-400">
            <svg width="80" height="80" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg" className="mb-4">
              {/* スキャナー本体 */}
              <rect x="8" y="32" width="64" height="32" rx="4" fill="currentColor" fillOpacity="0.1" stroke="currentColor" strokeWidth="3"/>
              {/* スキャンビーム */}
              <rect x="16" y="16" width="48" height="8" rx="2" fill="currentColor" fillOpacity="0.6"/>
              <rect x="16" y="72" width="48" height="8" rx="2" fill="currentColor" fillOpacity="0.3"/>
              {/* バーコード */}
              <rect x="24" y="40" width="4" height="16" fill="currentColor"/>
              <rect x="32" y="40" width="6" height="16" fill="currentColor"/>
              <rect x="42" y="40" width="4" height="16" fill="currentColor"/>
              <rect x="48" y="40" width="2" height="16" fill="currentColor"/>
              <rect x="52" y="40" width="4" height="16" fill="currentColor"/>
              {/* 光線効果 */}
              <line x1="40" y1="24" x2="40" y2="36" stroke="currentColor" strokeWidth="4" strokeLinecap="round" opacity="0.8"/>
            </svg>
            <p className="text-sm font-medium">バーコードをカメラに合わせてください</p>
          </div>
        )}
        
        {loading && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <RefreshCw className="animate-spin text-white" size={32} />
          </div>
        )}
        {error && (
          <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center text-center p-4">
            <AlertCircle className="text-red-500 mb-2" size={48} />
            <p className="text-sm">{error}</p>
            <button onClick={startScanner} className="mt-4 px-4 py-2 bg-[var(--background)] text-black rounded-lg font-bold">
              再試行
            </button>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="space-y-4 pb-8">
        <div className="flex gap-2 p-1 bg-[var(--background)]/10 rounded-xl">
          <button
            onClick={() => setIsContinuous(false)}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg transition ${!isContinuous ? "bg-[var(--background)] text-black font-bold" : "text-white/60"
              }`}
          >
            <Camera size={18} />
            単一
          </button>
          <button
            onClick={() => setIsContinuous(true)}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg transition ${isContinuous ? "bg-[var(--background)] text-black font-bold" : "text-white/60"
              }`}
          >
            <List size={18} />
            連続
          </button>
        </div>

        {isContinuous && (
          <div className="flex flex-col items-center">
            <div className="w-full mb-4 flex gap-2 overflow-x-auto no-scrollbar py-2">
              {scannedItems.length === 0 ? (
                <p className="text-zinc-500 text-sm text-center w-full py-4">スキャンの準備ができました</p>
              ) : (
                scannedItems.map((item, idx) => (
                  <div key={idx} className="bg-[var(--background)]/10 border border-white/20 rounded-lg px-3 py-2 flex items-center gap-2 whitespace-nowrap">
                    <Check className="text-green-500" size={14} />
                    <span className="text-xs">{item.name}</span>
                  </div>
                ))
              )}
            </div>
            <button
              onClick={handleFinish}
              disabled={scannedItems.length === 0}
              className="w-full py-4 bg-[var(--accent)] text-white font-bold rounded-2xl shadow-xl disabled:opacity-50 disabled:grayscale transition"
            >
              スキャンを終了して追加 ({scannedItems.length})
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
