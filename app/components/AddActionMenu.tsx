// app/components/AddActionMenu.tsx
"use client";

import React, { useState } from "react";
import { Plus, Scan, Keyboard, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface AddActionMenuProps {
  onManualAdd: () => void;
  onBarcodeScan: () => void;
  onReceiptScan: () => void;
  hidden?: boolean;
}

export default function AddActionMenu({
  onManualAdd,
  onBarcodeScan,
  onReceiptScan,
  hidden = false,
}: AddActionMenuProps) {
  const [isOpen, setIsOpen] = useState(false);

  const toggleMenu = () => setIsOpen(!isOpen);

  const actions = [
    {
      icon: (
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* レシート用紙 */}
          <rect x="3" y="2" width="14" height="16" rx="1" fill="currentColor" fillOpacity="0.1" stroke="currentColor" strokeWidth="1.5"/>
          {/* テキストライン */}
          <line x1="6" y1="5" x2="14" y2="5" stroke="currentColor" strokeWidth="1" strokeLinecap="round"/>
          <line x1="6" y1="8" x2="12" y2="8" stroke="currentColor" strokeWidth="1" strokeLinecap="round"/>
          <line x1="6" y1="11" x2="14" y2="11" stroke="currentColor" strokeWidth="1" strokeLinecap="round"/>
          <line x1="6" y1="14" x2="10" y2="14" stroke="currentColor" strokeWidth="1" strokeLinecap="round"/>
          {/* スキャンアイコン */}
          <circle cx="10" cy="16.5" r="2" fill="currentColor" fillOpacity="0.3" stroke="currentColor" strokeWidth="1.5"/>
          <rect x="9" y="15.5" width="2" height="2" rx="0.5" fill="currentColor"/>
        </svg>
      ),
      label: "レシート",
      onClick: () => {
        onReceiptScan();
        setIsOpen(false);
      },
      color: "var(--color-text-primary)",
      delay: 0.1,
    },
    {
      icon: (
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* スキャナー本体 */}
          <rect x="2" y="8" width="16" height="8" rx="1" fill="currentColor" fillOpacity="0.1" stroke="currentColor" strokeWidth="1.5"/>
          {/* スキャンビーム */}
          <rect x="4" y="4" width="12" height="2" rx="1" fill="currentColor" fillOpacity="0.6"/>
          <rect x="4" y="18" width="12" height="2" rx="1" fill="currentColor" fillOpacity="0.3"/>
          {/* バーコード */}
          <rect x="6" y="10" width="1" height="4" fill="currentColor"/>
          <rect x="8" y="10" width="1.5" height="4" fill="currentColor"/>
          <rect x="10.5" y="10" width="1" height="4" fill="currentColor"/>
          <rect x="12" y="10" width="0.5" height="4" fill="currentColor"/>
          <rect x="13" y="10" width="1" height="4" fill="currentColor"/>
          {/* 光線効果 */}
          <line x1="10" y1="6" x2="10" y2="9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.8"/>
        </svg>
      ),
      label: "バーコード",
      onClick: () => {
        onBarcodeScan();
        setIsOpen(false);
      },
      color: "var(--color-text-secondary)",
      delay: 0.2,
    },
    {
      icon: <Keyboard size={20} />,
      label: "手動入力",
      onClick: () => {
        onManualAdd();
        setIsOpen(false);
      },
      color: "var(--color-text-secondary)",
      delay: 0.3,
    },
  ];

  return (
    <>
      {hidden ? null : (
        <div className="fixed bottom-24 right-6 z-50 flex flex-col items-end gap-3">
      <AnimatePresence>
        {isOpen && (
          <div className="flex flex-col items-end gap-3 mb-2">
            {actions.map((action, i) => (
              <motion.div
                key={action.label}
                initial={{ opacity: 0, scale: 0.5, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.5, y: 20 }}
                transition={{ duration: 0.2, delay: i * 0.05 }}
                className="flex items-center gap-3"
              >
                <span className="bg-slate-900/80 text-white text-xs font-bold px-3 py-1.5 rounded-lg backdrop-blur-sm shadow-xl">
                  {action.label}
                </span>
                <button
                  onClick={action.onClick}
                  className="w-12 h-12 rounded-full flex items-center justify-center shadow-xl transition-transform hover:scale-110 active:scale-95 border border-[var(--surface-border)]"
                  style={{
                    background: "var(--surface-bg)",
                    color: action.color,
                  }}
                >
                  {action.icon}
                </button>
              </motion.div>
            ))}
          </div>
        )}
      </AnimatePresence>

      <button
        onClick={toggleMenu}
        className="w-16 h-16 rounded-full flex items-center justify-center shadow-2xl transition-all hover:scale-105 active:scale-95 overflow-hidden relative"
        style={{
          background: "var(--accent)",
          color: "#fff",
        }}
      >
        <motion.div
          animate={{ rotate: isOpen ? 45 : 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
        >
          <Plus size={32} />
        </motion.div>
        
        {/* Subtle ripple effect anchor */}
        <span className="absolute inset-0 bg-[var(--background)]/20 opacity-0 hover:opacity-100 transition-opacity" />
      </button>

      {/* Backdrop for click-away */}
      {isOpen && (
        <div 
          className="fixed inset-0 -z-10" 
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
      )}
    </>
  );
}
