// app/components/AddActionMenu.tsx
"use client";

import React from "react";
import { Plus } from "lucide-react";

interface AddActionMenuProps {
  onManualAdd: () => void;
  hidden?: boolean;
}

export default function AddActionMenu({
  onManualAdd,
  hidden = false,
}: AddActionMenuProps) {
  return (
    <>
      {hidden ? null : (
        <div className="fixed bottom-24 right-6 z-50">
          <button
            onClick={onManualAdd}
            className="w-16 h-16 rounded-full flex items-center justify-center shadow-2xl transition-all hover:scale-105 active:scale-95 overflow-hidden relative"
            style={{
              background: "var(--accent)",
              color: "#fff",
            }}
          >
            <Plus size={32} />
          </button>
        </div>
      )}
    </>
  );
}
