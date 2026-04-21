// app/components/BarcodeScanner.tsx
// GENERATED_BY_AI: 2026-04-18 — UX大幅進化版
"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";
import { 
  X, 
  Check, 
  Camera, 
  List, 
  RefreshCw, 
  AlertCircle, 
  SearchX,
  Plus,
  Edit3,
  Package,
  Sparkles,
  ScanLine
} from "lucide-react";

// 拡張された商品データ型
interface ScannedProduct {
  name: string;
  brand?: string;
  category?: string;
  categoryConfidence?: number;
  barcode: string;
  image?: string;
  quantity?: string;
  amount?: number;
  unit?: string;
  recommendedExpiry?: string;
  expirySource?: 'api' | 'inferred' | 'default';
  isNotFound?: boolean;
}

interface BarcodeScannerProps {
  onResults: (items: ScannedProduct[]) => void;
  onClose: () => void;
}

// スキャン結果通知の型
type ScanNotification = {
  id: string;
  type: 'success' | 'notfound' | 'error';
  message: string;
  product?: ScannedProduct;
  barcode?: string;
};

export default function BarcodeScanner({ onResults, onClose }: BarcodeScannerProps) {
  const [scannedItems, setScannedItems] = useState<ScannedProduct[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastScanned, setLastScanned] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [notifications, setNotifications] = useState<ScanNotification[]>([]);
  const [showRipple, setShowRipple] = useState(false);
  const [manualInputBarcode, setManualInputBarcode] = useState<string | null>(null);
  
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const notificationTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const SCAN_REGION_ID = "barcode-scanner-region";

  // 通知を追加
  const addNotification = useCallback((notification: Omit<ScanNotification, 'id'>) => {
    const id = Math.random().toString(36).substring(7);
    const newNotification = { ...notification, id };
    
    setNotifications(prev => [newNotification, ...prev].slice(0, 1)); // 読み取りやすさのため最大1件に制限
    
    // 3秒後に自動消去
    const timer = setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 3000);
    
    notificationTimersRef.current.set(id, timer);
    
    return id;
  }, []);

  // 通知を削除
  const removeNotification = useCallback((id: string) => {
    const timer = notificationTimersRef.current.get(id);
    if (timer) {
      clearTimeout(timer);
      notificationTimersRef.current.delete(id);
    }
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  // リップルエフェクト表示
  const triggerRipple = useCallback(() => {
    setShowRipple(true);
    setTimeout(() => setShowRipple(false), 600);
  }, []);

  // クリーンアップ
  useEffect(() => {
    return () => {
      notificationTimersRef.current.forEach((timer: ReturnType<typeof setTimeout>) => clearTimeout(timer));
      notificationTimersRef.current.clear();
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
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
        return { 
          name: `不明な商品`, 
          isNotFound: true, 
          barcode,
          category: 'その他',
          categoryConfidence: 0,
        };
      }
    } catch (err) {
      console.error("Lookup failed", err);
      return { 
        name: `検索エラー`, 
        isNotFound: true, 
        barcode,
        category: 'その他',
        categoryConfidence: 0,
      };
    } finally {
      setLoading(false);
    }
  };

  const handleScanSuccess = async (decodedText: string) => {
    // デバウンス: 同じバーコードを連続読み取り防止
    if (decodedText === lastScanned) return;
    
    // 振動フィードバック（対応デバイス）
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(50);
    }
    
    setLastScanned(decodedText);
    setLoading(true);

    const product = await lookupBarcode(decodedText);
    setLoading(false);

    if (product.isNotFound) {
      // 不明商品: オーバーレイ通知
      addNotification({
        type: 'notfound',
        message: `「${decodedText.slice(-6)}」は見つかりませんでした`,
        barcode: decodedText,
      });
      
      // 手動入力オプションを表示
      setManualInputBarcode(decodedText);
      
      // 2秒後に再スキャン許可
      debounceTimerRef.current = setTimeout(() => {
        setLastScanned(null);
      }, 2000);
      return;
    }

    // 商品が見つかった場合
    triggerRipple();
    addNotification({
      type: 'success',
      message: product.name,
      product,
    });

    // 連続モードとしてスキャンを継続
    setScannedItems((prev) => [...prev, product]);
    debounceTimerRef.current = setTimeout(() => {
      setLastScanned(null);
    }, 1500);
  };

  // 手動入力ハンドラー
  const handleManualInput = () => {
    if (manualInputBarcode) {
      stopScanner();
      onResults([{
        name: '',
        barcode: manualInputBarcode,
        isNotFound: true,
        category: 'その他',
        categoryConfidence: 0,
      }]);
    }
  };

  // 不明商品をスキップ
  const skipNotFound = () => {
    setManualInputBarcode(null);
    setLastScanned(null);
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

      let active = true;
      const detectLoop = async () => {
        if (active && !video.paused) {
          try {
            const barcodes = await barcodeDetector.detect(video);
            if (barcodes.length > 0) {
              await handleScanSuccess(barcodes[0].rawValue);
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
          active = false;
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
      formatsToSupport: [
        Html5QrcodeSupportedFormats.EAN_13,
        Html5QrcodeSupportedFormats.EAN_8,
        Html5QrcodeSupportedFormats.UPC_A,
        Html5QrcodeSupportedFormats.UPC_E,
        Html5QrcodeSupportedFormats.CODE_128,
        Html5QrcodeSupportedFormats.QR_CODE
      ],
    });
    // @ts-ignore
    scannerRef.current = html5QrCode;

    html5QrCode.start(
      { facingMode: "environment" },
      {
        fps: 20,
        qrbox: { width: 256, height: 160 }, // UIのw-64 (256px), h-40 (160px) に合わせる
        aspectRatio: 1.6, // UIの枠に合わせる
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

  const handleRemoveItem = (index: number) => {
    setScannedItems(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-black text-white">
      {/* 
        ライブラリ（html5-qrcode）が生成するデフォルトの白枠とシェーディングを非表示にする
        自前のオレンジ枠（w-64 h-40）を使用するため
      */}
      <style jsx global>{`
        #qr-shaded-region {
          display: none !important;
        }
        #barcode-scanner-region video {
          object-fit: cover !important;
        }
      `}</style>
      
      {/* Header */}
      <div className="flex justify-between items-center px-4 py-3 bg-black/80 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-[var(--accent)]/20 rounded-lg">
            <ScanLine size={20} className="text-[var(--accent)]" />
          </div>
          <div>
            <h2 className="text-base font-bold">バーコードスキャン</h2>
            {scannedItems.length > 0 && (
              <p className="text-xs text-white/60">{scannedItems.length}件 スキャン済み</p>
            )}
          </div>
        </div>
        <button 
          onClick={onClose} 
          className="p-2 hover:bg-white/10 rounded-full transition-colors"
        >
          <X size={24} />
        </button>
      </div>

      {/* Scanner Region */}
      <div className="relative flex-1 overflow-hidden">
        <div id={SCAN_REGION_ID} className="w-full h-full" />
        
        {/* スキャンガイドオーバーレイ */}
        {isScanning && !error && (
          <div className="absolute inset-0 pointer-events-none">
            {/* スキャンエリアフレーム */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-40">
              {/* 四隅の角括弧 */}
              <div className="absolute top-0 left-0 w-8 h-8 border-l-4 border-t-4 border-[var(--accent)] rounded-tl-lg" />
              <div className="absolute top-0 right-0 w-8 h-8 border-r-4 border-t-4 border-[var(--accent)] rounded-tr-lg" />
              <div className="absolute bottom-0 left-0 w-8 h-8 border-l-4 border-b-4 border-[var(--accent)] rounded-bl-lg" />
              <div className="absolute bottom-0 right-0 w-8 h-8 border-r-4 border-b-4 border-[var(--accent)] rounded-br-lg" />
              
              {/* レーザーラインアニメーション */}
              <motion.div
                className="absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-[var(--accent)] to-transparent shadow-lg"
                initial={{ top: "0%" }}
                animate={{ top: ["0%", "100%", "0%"] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                style={{ boxShadow: '0 0 10px var(--accent), 0 0 20px var(--accent)' }}
              />
            </div>
            
            {/* ガイドテキスト */}
            <div className="absolute bottom-32 left-0 right-0 text-center">
              <p className="text-sm text-white/80 bg-black/40 inline-block px-4 py-2 rounded-full backdrop-blur-sm">
                バーコードを枠内に合わせてください
              </p>
            </div>
          </div>
        )}
        
        {/* スキャン準備中 */}
        {!isScanning && !loading && !error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-900">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="flex flex-col items-center"
            >
              <div className="w-20 h-20 rounded-2xl bg-[var(--accent)]/10 flex items-center justify-center mb-4">
                <ScanLine size={40} className="text-[var(--accent)]" />
              </div>
              <p className="text-sm font-medium text-white/80">カメラを起動中...</p>
            </motion.div>
          </div>
        )}
        
        {/* ローディング */}
        {loading && (
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="w-16 h-16 rounded-full border-4 border-[var(--accent)] border-t-transparent"
              style={{ animation: 'spin 1s linear infinite' }}
            />
          </div>
        )}
        
        {/* エラー表示 */}
        {error && (
          <div className="absolute inset-0 bg-black/90 flex flex-col items-center justify-center text-center p-6">
            <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mb-4">
              <AlertCircle className="text-red-500" size={32} />
            </div>
            <p className="text-sm text-white/80 mb-6">{error}</p>
            <button 
              onClick={startScanner} 
              className="px-6 py-3 bg-[var(--accent)] text-white rounded-xl font-bold hover:opacity-90 transition"
            >
              カメラを再起動
            </button>
          </div>
        )}
        
        {/* リップルエフェクト */}
        <AnimatePresence>
          {showRipple && (
            <motion.div
              initial={{ scale: 0, opacity: 1 }}
              animate={{ scale: 3, opacity: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 rounded-full border-4 border-[var(--accent)] pointer-events-none"
            />
          )}
        </AnimatePresence>
      </div>

      {/* 通知オーバーレイ */}
      <div className="absolute top-20 left-4 right-4 flex flex-col gap-2 pointer-events-none">
        <AnimatePresence>
          {notifications.map((notification) => (
            <motion.div
              key={notification.id}
              initial={{ y: -50, opacity: 0, scale: 0.9 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: -20, opacity: 0, scale: 0.9 }}
              className={`pointer-events-auto rounded-xl px-4 py-3 shadow-lg backdrop-blur-sm ${
                notification.type === 'success' 
                  ? 'bg-green-500/90 text-white' 
                  : notification.type === 'notfound'
                  ? 'bg-amber-500/90 text-white'
                  : 'bg-red-500/90 text-white'
              }`}
            >
              <div className="flex items-center gap-3">
                {notification.type === 'success' ? (
                  <Check size={20} className="flex-shrink-0" />
                ) : notification.type === 'notfound' ? (
                  <SearchX size={20} className="flex-shrink-0" />
                ) : (
                  <AlertCircle size={20} className="flex-shrink-0" />
                )}
                <span className="text-sm font-medium flex-1 truncate">
                  {notification.message}
                </span>
                <button
                  onClick={() => removeNotification(notification.id)}
                  className="p-1 hover:bg-white/20 rounded-full transition"
                >
                  <X size={14} />
                </button>
              </div>
              {notification.product && (
                <div className="mt-2 pt-2 border-t border-white/20 flex items-center gap-2 text-xs">
                  <Package size={12} />
                  <span>{notification.product.category}</span>
                  {notification.product.recommendedExpiry && (
                    <>
                      <span className="opacity-50">•</span>
                      <span>賞味期限: {notification.product.recommendedExpiry}</span>
                    </>
                  )}
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* 不明商品時の手動入力オプション */}
      <AnimatePresence>
        {manualInputBarcode && (
          <motion.div
            initial={{ y: 100 }}
            animate={{ y: 0 }}
            exit={{ y: 100 }}
            className="absolute bottom-0 left-0 right-0 bg-zinc-900 border-t border-white/10 p-4"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center">
                <SearchX size={20} className="text-amber-500" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">この商品は登録されていません</p>
                <p className="text-xs text-white/50">バーコード: {manualInputBarcode}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={skipNotFound}
                className="flex-1 py-3 rounded-xl bg-white/5 text-white font-medium hover:bg-white/10 transition"
              >
                スキップ
              </button>
              <button
                onClick={handleManualInput}
                className="flex-1 py-3 rounded-xl bg-[var(--accent)] text-white font-bold hover:opacity-90 transition flex items-center justify-center gap-2"
              >
                <Edit3 size={16} />
                手動入力
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Controls */}
      {!manualInputBarcode && scannedItems.length > 0 && (
        <div className="bg-black/80 backdrop-blur-sm p-4 space-y-3">
          {/* 商品リスト */}
          <div className="flex items-center justify-between px-1">
            <span className="text-sm text-white/60">スキャン済み商品</span>
            <span className="text-sm font-bold bg-[var(--accent)]/20 text-[var(--accent)] px-2 py-0.5 rounded-full">
              {scannedItems.length}件
            </span>
          </div>
          
          <div className="max-h-32 overflow-y-auto space-y-1.5 scrollbar-thin">
            {scannedItems.map((item, idx) => (
              <motion.div
                key={idx}
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                className="flex items-center gap-3 bg-white/5 rounded-lg px-3 py-2"
              >
                <div className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0">
                  <Check size={12} className="text-green-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{item.name}</p>
                  <p className="text-xs text-white/50">{item.category}</p>
                </div>
                <button
                  onClick={() => handleRemoveItem(idx)}
                  className="p-1.5 hover:bg-red-500/20 rounded-full transition group"
                >
                  <X size={14} className="text-white/40 group-hover:text-red-400" />
                </button>
              </motion.div>
            ))}
          </div>
          
          {/* 完了ボタン */}
          <button
            onClick={handleFinish}
            className="w-full py-3.5 bg-[var(--accent)] text-white font-bold rounded-xl shadow-lg shadow-[var(--accent)]/20 transition flex items-center justify-center gap-2"
          >
            <Sparkles size={18} />
            まとめて追加 ({scannedItems.length}件)
          </button>
        </div>
      )}
    </div>
  );
}
