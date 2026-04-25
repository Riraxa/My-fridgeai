"use client";

import React, { useState, useRef, useEffect } from "react";
import { Plus, Pen, Camera, Receipt } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

interface AddActionMenuProps {
  onManualAdd: () => void;
  onImageSelected: (file: File) => void;
  onReceiptScan?: () => void;
  hidden?: boolean;
}

export default function AddActionMenu({
  onManualAdd,
  onImageSelected,
  onReceiptScan,
  hidden = false,
}: AddActionMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onImageSelected(file);
    }
    setIsOpen(false);
    // Reset the input so the same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleManualClick = () => {
    setIsOpen(false);
    onManualAdd();
  };

  const handleCameraClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleReceiptClick = () => {
    setIsOpen(false);
    onReceiptScan?.();
  };

  if (hidden) return null;

  return (
    <div className="fixed bottom-24 right-6 z-50 flex flex-col items-end" ref={menuRef}>
      <input
        type="file"
        accept="image/*"
        capture="environment"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
      />

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="flex flex-col gap-3 mb-4 items-end"
          >
            <button
              onClick={handleManualClick}
              className="flex items-center gap-3 bg-[var(--surface-bg)] text-[var(--color-text-primary)] border border-[var(--surface-border)] shadow-lg px-4 py-2 rounded-full hover:bg-[var(--surface-border)] transition-colors"
            >
              <span className="text-sm font-medium">手動追加</span>
              <div className="w-8 h-8 rounded-full bg-[var(--accent)] text-white flex items-center justify-center">
                <Pen size={16} />
              </div>
            </button>
            <button
              onClick={handleCameraClick}
              className="flex items-center gap-3 bg-[var(--surface-bg)] text-[var(--color-text-primary)] border border-[var(--surface-border)] shadow-lg px-4 py-2 rounded-full hover:bg-[var(--surface-border)] transition-colors"
            >
              <span className="text-sm font-medium">画像認識</span>
              <div className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center">
                <Camera size={16} />
              </div>
            </button>
            <button
              onClick={handleReceiptClick}
              className="flex items-center gap-3 bg-[var(--surface-bg)] text-[var(--color-text-primary)] border border-[var(--surface-border)] shadow-lg px-4 py-2 rounded-full hover:bg-[var(--surface-border)] transition-colors"
            >
              <span className="text-sm font-medium">レシート</span>
              <div className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center">
                <Receipt size={16} />
              </div>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-16 h-16 rounded-full flex items-center justify-center shadow-2xl transition-all hover:scale-105 active:scale-95 overflow-hidden relative"
        style={{
          background: "var(--accent)",
          color: "#fff",
        }}
      >
        <motion.div
          animate={{ rotate: isOpen ? 45 : 0 }}
          transition={{ type: "spring", stiffness: 260, damping: 20 }}
        >
          <Plus size={32} />
        </motion.div>
      </button>
    </div>
  );
}
