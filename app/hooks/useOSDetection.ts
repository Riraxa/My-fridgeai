// hooks/useOSDetection.ts
"use client";
import { useState, useEffect } from "react";

export type OS = "ios" | "android" | "windows" | "macos" | "linux" | "unknown";

export function useOSDetection(): OS {
  const [os, setOs] = useState<OS>("unknown");

  useEffect(() => {
    const userAgent = window.navigator.userAgent.toLowerCase();
    const platform = window.navigator.platform.toLowerCase();

    if (/iphone|ipad|ipod/.test(userAgent)) {
      setOs("ios");
    } else if (/android/.test(userAgent)) {
      setOs("android");
    } else if (/win/.test(userAgent) || /win/.test(platform)) {
      setOs("windows");
    } else if (/mac/.test(userAgent) || /mac/.test(platform)) {
      setOs("macos");
    } else if (/linux/.test(userAgent) || /linux/.test(platform)) {
      setOs("linux");
    } else {
      setOs("unknown");
    }
  }, []);

  return os;
}

// OS標準の確認ダイアログを表示するフック
export function useNativeConfirm() {
  const os = useOSDetection();

  const confirm = (message: string, title?: string): boolean => {
    switch (os) {
      case "ios":
        // iOSの標準アラートスタイル
        return window.confirm(`${title ? title + "\n\n" : ""}${message}`);
      case "android":
        // Androidの標準アラートスタイル
        return window.confirm(`${title ? title + "\n\n" : ""}${message}`);
      case "windows":
        // Windowsの標準アラートスタイル
        return window.confirm(`${title ? title + "\n\n" : ""}${message}`);
      default:
        // デフォルト
        return window.confirm(`${title ? title + "\n\n" : ""}${message}`);
    }
  };

  return { confirm, os };
}
