// hooks/useNativeSelect.ts
"use client";
import { useOSDetection } from "./useOSDetection";

export function useNativeSelect() {
  const os = useOSDetection();

  const getSelectClassName = (baseClass?: string) => {
    const defaultClasses =
      "w-full px-3 py-2 border rounded-md outline-none transition-all appearance-none cursor-pointer";

    switch (os) {
      case "ios":
        return `${defaultClasses} ios-select ${baseClass || ""}`;
      case "android":
        return `${defaultClasses} android-select ${baseClass || ""}`;
      case "windows":
        return `${defaultClasses} windows-select ${baseClass || ""}`;
      default:
        return `${defaultClasses} ${baseClass || ""}`;
    }
  };

  return { getSelectClassName, os };
}
