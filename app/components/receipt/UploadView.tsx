"use client";

import React, { useRef } from "react";
import { Camera, Upload } from "lucide-react";

interface UploadViewProps {
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export default function UploadView({ onFileChange }: UploadViewProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="flex flex-col items-center justify-center h-full gap-6 py-12">
      <div className="flex flex-col items-center justify-center">
        <svg
          width="96"
          height="96"
          viewBox="0 0 96 96"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="mb-6"
        >
          {/* レシートの背景 */}
          <rect
            x="20"
            y="16"
            width="56"
            height="64"
            rx="4"
            fill="var(--accent)"
            fillOpacity="0.15"
            stroke="var(--accent)"
            strokeWidth="2"
          />
          {/* レシートの線 */}
          <line x1="28" y1="28" x2="68" y2="28" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" />
          <line x1="28" y1="36" x2="60" y2="36" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" />
          <line x1="28" y1="44" x2="64" y2="44" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" />
          <line x1="28" y1="52" x2="56" y2="52" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" />
          {/* スキャンアイコン */}
          <circle cx="48" cy="64" r="8" fill="var(--accent)" fillOpacity="0.3" stroke="var(--accent)" strokeWidth="2" />
          <rect x="44" y="60" width="8" height="8" rx="1" fill="var(--accent)" />
          {/* スキャン線 */}
          <rect x="16" y="24" width="64" height="2" fill="var(--accent)" fillOpacity="0.6" rx="1" />
        </svg>
      </div>
      <div className="text-center">
        <h2 className="text-xl font-bold mb-2">レシートをスキャン</h2>
        <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
          レシートの写真を撮影またはアップロードすると、
          <br />
          食材を自動で読み取り、在庫に追加できます。
        </p>
      </div>

      <div className="flex flex-col gap-3 w-full max-w-xs">
        <button
          onClick={() => cameraInputRef.current?.click()}
          className="flex items-center justify-center gap-3 w-full py-4 rounded-2xl font-bold text-white transition active:scale-95"
          style={{ background: "var(--accent)" }}
        >
          <Camera size={22} />
          カメラで撮影
        </button>
        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center justify-center gap-3 w-full py-4 rounded-2xl font-medium transition active:scale-95"
          style={{
            background: "var(--surface-bg)",
            border: "1px solid var(--surface-border)",
            color: "var(--color-text-primary)",
          }}
        >
          <Upload size={22} />
          画像をアップロード
        </button>
      </div>

      <input
        ref={cameraInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        capture="environment"
        onChange={onFileChange}
        className="hidden"
      />
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={onFileChange}
        className="hidden"
      />
    </div>
  );
}
