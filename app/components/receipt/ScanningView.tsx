"use client";

import React from "react";
import { Check } from "lucide-react";
import { ScanProgressStep } from "./types";

interface ScanningViewProps {
  scanMessage: string;
  scanningSteps: ScanProgressStep[];
}

export default function ScanningView({ scanMessage, scanningSteps }: ScanningViewProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-8 py-12">
      <div className="relative">
        <div
          className="animate-spin h-20 w-20 border-4 rounded-full"
          style={{ borderColor: "var(--surface-border)", borderTopColor: "var(--accent)" }}
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-accent animate-pulse">
            <rect x="4" y="2" width="24" height="28" rx="2" fill="currentColor" fillOpacity="0.15" stroke="currentColor" strokeWidth="2"/>
            <line x1="10" y1="8" x2="22" y2="8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            <line x1="10" y1="14" x2="18" y2="14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            <line x1="10" y1="20" x2="22" y2="20" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            <circle cx="16" cy="26" r="4" fill="currentColor" fillOpacity="0.3" stroke="currentColor" strokeWidth="2"/>
            <rect x="14" y="24" width="4" height="4" rx="1" fill="currentColor"/>
          </svg>
        </div>
      </div>

      <div className="w-full max-w-xs space-y-4">
        {scanningSteps.map((s, i) => (
          <div key={i} className="flex items-center gap-3 transition-opacity duration-300" style={{ opacity: s.status === "pending" ? 0.4 : 1 }}>
            <div
              className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 transition-colors ${
                s.status === "done" ? "bg-green-500" : s.status === "doing" ? "bg-accent" : "bg-gray-700"
              }`}
            >
              {s.status === "done" ? (
                <Check size={14} className="text-white" />
              ) : s.status === "doing" ? (
                <div className="w-2 h-2 bg-[var(--background)] rounded-full animate-ping" />
              ) : (
                <div className="w-1.5 h-1.5 bg-gray-400 rounded-full" />
              )}
            </div>
            <span className={`text-sm font-medium ${s.status === "doing" ? "text-accent" : "text-gray-300"}`}>{s.label}</span>
          </div>
        ))}
      </div>

      <div className="text-center">
        <p className="text-lg font-bold mb-1">{scanMessage}</p>
        <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
          AI が丁寧にレシートを読み取っています。
          <br />
          少々お待ちください...
        </p>
      </div>
    </div>
  );
}
