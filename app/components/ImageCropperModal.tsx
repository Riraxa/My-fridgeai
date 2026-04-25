"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/app/components/ui/button";
import { X, Check } from "lucide-react";
import { useBodyScrollLock } from "@/app/hooks/useBodyScrollLock";
import {
  calculateDisplaySize,
  calculateSourceRect,
  constrainPosition,
  CROP_SIZE,
  MAX_SCALE,
  MIN_SCALE,
} from "./image-cropper-utils";

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

  useEffect(() => {
    if (imageSrc && imageRef.current) {
      const img = imageRef.current;
      if (img.src !== imageSrc) {
        img.src = imageSrc;
      }
    }
  }, [imageSrc]);

  useBodyScrollLock(isOpen);

  useEffect(() => {
    const img = imageRef.current;
    if (img && img.complete && img.naturalWidth > 0) {
      const imgWidth = img.naturalWidth;
      const imgHeight = img.naturalHeight;
      setImageSize(calculateDisplaySize(imgWidth, imgHeight, CROP_SIZE));
      
      // 初期スケールと位置をリセット
      setScale(1.0);
      setPosition({ x: 0, y: 0 });
    } else if (img) {
      img.onload = () => {
        const imgWidth = img.naturalWidth;
        const imgHeight = img.naturalHeight;
        setImageSize(calculateDisplaySize(imgWidth, imgHeight, CROP_SIZE));
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
    setPosition(constrainPosition({ x: newX, y: newY }, imageSize, scale, CROP_SIZE));
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
        
        setPosition(constrainPosition({ x: newX, y: newY }, imageSize, scale, CROP_SIZE));
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
      
      setPosition(constrainPosition(position, imageSize, newScale, CROP_SIZE));
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

    ctx.imageSmoothingEnabled = true;
    if ("imageSmoothingQuality" in ctx) {
      (ctx as CanvasRenderingContext2D).imageSmoothingQuality = "high";
    }

    canvas.width = CROP_SIZE * 2; // 高解像度で書き出し
    canvas.height = CROP_SIZE * 2;

    // 丸いマスクを作成
    ctx.beginPath();
    ctx.arc(CROP_SIZE, CROP_SIZE, CROP_SIZE, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();

    // 画像を描画
    const img = imageRef.current;
    
    const { sourceX, sourceY, sourceWidth, sourceHeight } = calculateSourceRect(
      imageSize,
      scale,
      position,
      img.naturalWidth,
      CROP_SIZE,
    );
    
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

    const croppedImage = canvas.toDataURL("image/png");
    onCrop(croppedImage);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 modal-overlay flex items-center justify-center p-4">
      <div className="modal-backdrop" onClick={onClose} />
      <div
        className="relative modal-card image-cropper-modal w-full max-w-[382px]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4">
          <h3
            className="text-lg font-semibold"
            style={{ color: "var(--color-text-primary)" }}
          >
            アイコンを調整
          </h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            style={{ color: "var(--color-text-secondary)" }}
          >
            <X size={20} />
          </Button>
        </div>

        <div className="relative mb-4 flex justify-center">
          <div
            ref={containerRef}
            className="relative rounded-full overflow-hidden cursor-move"
            style={{
              width: CROP_SIZE,
              height: CROP_SIZE,
              background: "var(--surface-bg)",
              border: "1px solid var(--surface-border)",
            }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onTouchStart={(e) => {
              e.stopPropagation();
              handleTouchStart(e);
            }}
            onTouchMove={(e) => {
              e.stopPropagation();
              e.preventDefault();
              handleTouchMove(e);
            }}
            onTouchEnd={() => {
              handleTouchEnd();
            }}
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
            className="absolute rounded-full pointer-events-none"
            style={{ 
              width: CROP_SIZE, 
              height: CROP_SIZE,
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              border: "4px solid var(--surface-bg)",
            }}
          />
        </div>

        <div
          className="text-center text-sm mb-4"
          style={{ color: "var(--color-text-muted)" }}
        >
          ピンチで拡大縮小、ドラッグで位置調整
        </div>

        <div className="flex gap-3">
          <Button 
            variant="outline" 
            onClick={onClose} 
            className="cancel-btn flex-1 h-11 font-semibold"
          >
            キャンセル
          </Button>
          <Button 
            onClick={handleCrop} 
            className="continue-btn flex-1 h-11 font-bold"
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
