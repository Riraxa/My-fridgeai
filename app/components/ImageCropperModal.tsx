"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/app/components/ui/button";
import { X, Check } from "lucide-react";

interface ImageCropperModalProps {
  isOpen: boolean;
  imageSrc: string;
  onClose: () => void;
  onCrop: (croppedImage: string) => void;
}

export default function ImageCropperModal({
  isOpen,
  imageSrc,
  onClose,
  onCrop,
}: ImageCropperModalProps) {
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const lastTouchDistance = useRef<number>(0);

  const CROP_SIZE = 200;
  const MIN_SCALE = 0.5;
  const MAX_SCALE = 3;

  useEffect(() => {
    if (imageSrc && imageRef.current) {
      const img = imageRef.current;
      if (img.src !== imageSrc) {
        img.src = imageSrc;
      }
    }
  }, [imageSrc]);

  useEffect(() => {
    const img = imageRef.current;
    if (img && img.complete && img.naturalWidth > 0) {
      const imgWidth = img.naturalWidth;
      const imgHeight = img.naturalHeight;
      const aspectRatio = imgWidth / imgHeight;
      
      let displayWidth, displayHeight;
      
      // 切り抜き枠（CROP_SIZE x CROP_SIZE）に収まるように表示サイズを調整
      // 短い方の辺を CROP_SIZE に合わせることで、常に枠を覆うようにする
      if (aspectRatio > 1) {
        displayHeight = CROP_SIZE;
        displayWidth = CROP_SIZE * aspectRatio;
      } else {
        displayWidth = CROP_SIZE;
        displayHeight = CROP_SIZE / aspectRatio;
      }
      
      setImageSize({ width: displayWidth, height: displayHeight });
      
      // 初期スケールと位置をリセット
      setScale(1.0);
      setPosition({ x: 0, y: 0 });
    } else if (img) {
      img.onload = () => {
        const imgWidth = img.naturalWidth;
        const imgHeight = img.naturalHeight;
        const aspectRatio = imgWidth / imgHeight;
        
        let displayWidth, displayHeight;
        
        if (aspectRatio > 1) {
          displayHeight = CROP_SIZE;
          displayWidth = CROP_SIZE * aspectRatio;
        } else {
          displayWidth = CROP_SIZE;
          displayHeight = CROP_SIZE / aspectRatio;
        }
        
        setImageSize({ width: displayWidth, height: displayHeight });
        setScale(1.0);
        setPosition({ x: 0, y: 0 });
      };
    }
  }, [imageSrc]);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    
    const newX = e.clientX - dragStart.x;
    const newY = e.clientY - dragStart.y;
    
    // 元の画像からはみ出さないように制限
    const scaledWidth = imageSize.width * scale;
    const scaledHeight = imageSize.height * scale;
    
    // 画像が枠より大きい場合、端まで移動できる
    let maxOffsetX = 0;
    let maxOffsetY = 0;
    
    if (scaledWidth > CROP_SIZE) {
      maxOffsetX = (scaledWidth - CROP_SIZE) / 2;
    }
    
    if (scaledHeight > CROP_SIZE) {
      maxOffsetY = (scaledHeight - CROP_SIZE) / 2;
    }
    
    // 位置を制限
    const constrainedX = Math.max(-maxOffsetX, Math.min(maxOffsetX, newX));
    const constrainedY = Math.max(-maxOffsetY, Math.min(maxOffsetY, newY));
    
    setPosition({
      x: constrainedX,
      y: constrainedY,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      setIsDragging(true);
      const touch = e.touches[0];
      if (touch) {
        setDragStart({ x: touch.clientX - position.x, y: touch.clientY - position.y });
      }
    } else if (e.touches.length === 2) {
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      if (touch1 && touch2) {
        const distance = Math.sqrt(
          Math.pow(touch2.clientX - touch1.clientX, 2) +
          Math.pow(touch2.clientY - touch1.clientY, 2)
        );
        lastTouchDistance.current = distance;
      }
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 1 && isDragging) {
      const touch = e.touches[0];
      if (touch) {
        const newX = touch.clientX - dragStart.x;
        const newY = touch.clientY - dragStart.y;
        
        const scaledWidth = imageSize.width * scale;
        const scaledHeight = imageSize.height * scale;
        
        let maxOffsetX = 0;
        let maxOffsetY = 0;
        
        if (scaledWidth > CROP_SIZE) {
          maxOffsetX = (scaledWidth - CROP_SIZE) / 2;
        }
        
        if (scaledHeight > CROP_SIZE) {
          maxOffsetY = (scaledHeight - CROP_SIZE) / 2;
        }
        
        const constrainedX = Math.max(-maxOffsetX, Math.min(maxOffsetX, newX));
        const constrainedY = Math.max(-maxOffsetY, Math.min(maxOffsetY, newY));
        
        setPosition({
          x: constrainedX,
          y: constrainedY,
        });
      }
    } else if (e.touches.length === 2) {
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      if (touch1 && touch2) {
        const distance = Math.sqrt(
          Math.pow(touch2.clientX - touch1.clientX, 2) +
          Math.pow(touch2.clientY - touch1.clientY, 2)
        );
        
        if (lastTouchDistance.current > 0) {
          const scaleDelta = distance / lastTouchDistance.current;
          const newScale = Math.min(Math.max(scale * scaleDelta, MIN_SCALE), MAX_SCALE);
          setScale(newScale);
        }
        
        lastTouchDistance.current = distance;
      }
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    lastTouchDistance.current = 0;
  };

  // ホイールイベントリスナーを追加
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const wheelHandler = (e: WheelEvent) => {
      e.preventDefault();
      const scaleDelta = e.deltaY > 0 ? 0.9 : 1.1;
      const newScale = Math.min(Math.max(scale * scaleDelta, MIN_SCALE), MAX_SCALE);
      
      // スケール変更時に位置を制限
      const scaledWidth = imageSize.width * newScale;
      const scaledHeight = imageSize.height * newScale;
      
      let maxOffsetX = 0;
      let maxOffsetY = 0;
      
      if (scaledWidth > CROP_SIZE) {
        maxOffsetX = (scaledWidth - CROP_SIZE) / 2;
      }
      
      if (scaledHeight > CROP_SIZE) {
        maxOffsetY = (scaledHeight - CROP_SIZE) / 2;
      }
      
      const constrainedX = Math.max(-maxOffsetX, Math.min(maxOffsetX, position.x));
      const constrainedY = Math.max(-maxOffsetY, Math.min(maxOffsetY, position.y));
      
      setPosition({ x: constrainedX, y: constrainedY });
      setScale(newScale);
    };

    container.addEventListener('wheel', wheelHandler, { passive: false });

    return () => {
      container.removeEventListener('wheel', wheelHandler);
    };
  }, [scale, position, imageSize]);

  const handleCrop = () => {
    if (!canvasRef.current || !imageRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = CROP_SIZE * 2; // 高解像度で書き出し
    canvas.height = CROP_SIZE * 2;

    // 丸いマスクを作成
    ctx.beginPath();
    ctx.arc(CROP_SIZE, CROP_SIZE, CROP_SIZE, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();

    // 画像を描画
    const img = imageRef.current;
    
    // 元の画像と表示画像の比率
    const ratio = img.naturalWidth / imageSize.width;
    
    // スケール後の表示サイズ
    const scaledWidth = imageSize.width * scale;
    const scaledHeight = imageSize.height * scale;
    
    // 表示上の座標：枠の中心を(100, 100)とし、画像の左上座標を計算
    const previewLeft = (CROP_SIZE / 2) + position.x - (scaledWidth / 2);
    const previewTop = (CROP_SIZE / 2) + position.y - (scaledHeight / 2);
    
    // 元画像での切り出し開始位置（左上基準）
    // 枠の左上(0,0)が、画像の左上からどれだけ離れているか。
    const sourceX = (0 - previewLeft) / scale * ratio;
    const sourceY = (0 - previewTop) / scale * ratio;
    
    // 元画像での切り出し幅・高さ
    const sourceWidth = CROP_SIZE / scale * ratio;
    const sourceHeight = CROP_SIZE / scale * ratio;
    
    ctx.drawImage(
      img,
      sourceX,
      sourceY,
      sourceWidth,
      sourceHeight,
      0,
      0,
      CROP_SIZE * 2,
      CROP_SIZE * 2
    );

    const croppedImage = canvas.toDataURL("image/jpeg", 0.9);
    onCrop(croppedImage);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-sm w-full">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">アイコンを調整</h3>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X size={20} />
          </Button>
        </div>

        <div className="relative mb-4 flex justify-center">
          <div
            ref={containerRef}
            className="relative bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden cursor-move"
            style={{ width: CROP_SIZE, height: CROP_SIZE }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            <div
              className="absolute top-1/2 left-1/2"
              style={{
                transform: `translate(-50%, -50%) translate(${position.x}px, ${position.y}px) scale(${scale})`,
                transition: isDragging ? 'none' : 'transform 0.1s ease-out',
                width: imageSize.width,
                height: imageSize.height,
              }}
            >
              <img
                ref={imageRef}
                src={imageSrc}
                alt="Crop preview"
                className="max-w-none block"
                style={{ 
                  width: '100%', 
                  height: '100%',
                  objectFit: 'fill', // コンテナ（imageSize）に合わせる
                }}
                draggable={false}
              />
            </div>
          </div>

          <div
            className="absolute border-4 border-white dark:border-gray-800 rounded-full pointer-events-none"
            style={{ 
              width: CROP_SIZE, 
              height: CROP_SIZE,
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
            }}
          />
        </div>

        <div className="text-center text-sm text-gray-500 dark:text-gray-400 mb-4">
          ピンチで拡大縮小、ドラッグで位置調整
        </div>

        <div className="flex gap-3">
          <Button 
            variant="outline" 
            onClick={onClose} 
            className="flex-1 rounded-full h-11 border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors font-semibold"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            キャンセル
          </Button>
          <Button 
            onClick={handleCrop} 
            className="flex-1 rounded-full h-11 border-none shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all font-bold"
            style={{ 
              background: 'var(--accent)', 
              color: '#fff' 
            }}
          >
            <Check size={18} className="mr-1.5" />
            完了
          </Button>
        </div>

        <canvas ref={canvasRef} className="hidden" />
      </div>
    </div>
  );
}
